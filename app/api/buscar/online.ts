import { type Locale } from "@/lib/i18n";

import { type Amenidad, type Perfil, type Propiedad } from "./ontology";

const DBPEDIA_ENDPOINT = "https://dbpedia.org/sparql";
const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const LINKEDGEODATA_ENDPOINT = "https://linkedgeodata.org/sparql";
const NS = "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/";
const REQUEST_TIMEOUT_MS = 6500;
const WIKIDATA_TIMEOUT_MS = 15000;

type SparqlBinding = Record<string, { type: string; value: string } | undefined>;
type SparqlResults = { results: { bindings: SparqlBinding[] } };
type DbpediaPropiedad = Propiedad & { wikidataItem?: string };
type CommonsApiResponse = {
  query?: {
    pages?: Record<string, { title?: string; imageinfo?: Array<{ url?: string }> }>;
  };
};

function val(binding: SparqlBinding, key: string): string | undefined {
  return binding[key]?.value;
}

function sparqlLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function localName(uri: string): string {
  const i = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return uri.slice(i + 1);
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function boolish(value?: string): boolean {
  if (!value) return false;
  const normalized = normalize(value);
  return ["1", "true", "yes", "si", "wifi", "wlan", "free", "designated", "permissive", "permitted"].includes(normalized);
}

function addAmenity(list: Amenidad[], amenity: Amenidad) {
  if (!list.some((item) => item.uri === amenity.uri)) {
    list.push(amenity);
  }
}

function amenityUri(local: string): string {
  return `${NS}${local}`;
}

function emptyPropiedad(partial: Omit<Propiedad, "amenidades" | "perfiles">): Propiedad {
  return { ...partial, amenidades: [], perfiles: [] };
}

async function runSparql(
  endpoint: string,
  query: string,
  headers?: HeadersInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<SparqlResults> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${endpoint}?query=${encodeURIComponent(query)}&format=json`, {
      headers: {
        Accept: "application/sparql-results+json",
        ...(headers ?? {}),
      },
      next: { revalidate: 1800 },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`SPARQL endpoint failed (${response.status})`);
  }
  return (await response.json()) as SparqlResults;
}

function normalizeImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("http://commons.wikimedia.org") || value.startsWith("http://upload.wikimedia.org")) {
    return `https://${value.slice("http://".length)}`;
  }
  return value;
}

function extractCommonsFilename(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const specialMatch = value.match(/Special:(?:FilePath|Redirect\/file)\/([^?]+)/i);
  if (specialMatch) {
    return decodeURIComponent(specialMatch[1]).replace(/_/g, " ");
  }
  return undefined;
}

async function resolveCommonsFileUrls(filenames: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(filenames.filter(Boolean))];
  const resolved = new Map<string, string>();
  for (let i = 0; i < unique.length; i += 20) {
    const chunk = unique.slice(i, i + 20);
    const titles = chunk.map((name) => `File:${name.replace(/ /g, "_")}`).join("|");
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const response = await fetch(url, { next: { revalidate: 1800 } });
    if (!response.ok) continue;
    const data = (await response.json()) as CommonsApiResponse;
    for (const page of Object.values(data.query?.pages ?? {})) {
      const pageTitle = page.title?.replace(/^File:/, "").replace(/_/g, " ");
      const infoUrl = page.imageinfo?.[0]?.url;
      if (pageTitle && infoUrl) {
        resolved.set(pageTitle, infoUrl);
      }
    }
  }
  return resolved;
}

async function fetchWikidataImageFiles(wikidataItems: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(wikidataItems.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const values = unique.map((item) => `wd:${item}`).join(" ");
  const query = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?item ?image WHERE {
  VALUES ?item { ${values} }
  ?item wdt:P18 ?image .
}
`.trim();
  const result = await runSparql(WIKIDATA_ENDPOINT, query, {
    "User-Agent": "BuscadorSemantico/1.0 (academic project)",
  }, WIKIDATA_TIMEOUT_MS);
  const files = new Map<string, string>();
  for (const binding of result.results.bindings) {
    const item = val(binding, "item");
    const filename = extractCommonsFilename(val(binding, "image"));
    if (!item || !filename) continue;
    files.set(localName(item), filename);
  }
  return files;
}

async function hydrateRealImageUrls<T extends { urlImagen?: string }>(items: T[]): Promise<T[]> {
  const filenames = items
    .map((item) => extractCommonsFilename(item.urlImagen))
    .filter((name): name is string => Boolean(name));
  if (filenames.length === 0) return items;
  const resolved = await resolveCommonsFileUrls(filenames);
  return items.map((item) => {
    const filename = extractCommonsFilename(item.urlImagen);
    const realUrl = filename ? resolved.get(filename) : undefined;
    return { ...item, urlImagen: realUrl ?? item.urlImagen };
  });
}

function linkedGeoDataResourceToOsmUrl(uri: string): string {
  const match = uri.match(/\/(node|way|relation)(\d+)$/i);
  if (!match) return uri;
  return `https://www.openstreetmap.org/${match[1].toLowerCase()}/${match[2]}`;
}

function localeChain(locale: Locale): string[] {
  return locale === "es" ? ["es", "en", "fr"] : locale === "fr" ? ["fr", "en", "es"] : ["en", "es", "fr"];
}

function localeList(locale: Locale): string {
  return localeChain(locale).join(",");
}

function dbpediaQuery(query: string, locale: Locale): string {
  const langs = localeChain(locale);
  const filters = [
    `LANGMATCHES(LANG(?label), "${langs[0]}")`,
    `LANGMATCHES(LANG(?label), "${langs[1]}")`,
    `LANGMATCHES(LANG(?label), "${langs[2]}")`,
  ].join(" || ");
  const term = normalize(query.trim());
  const textFilter = term
    ? `
  FILTER(
    CONTAINS(LCASE(STR(?label)), "${sparqlLiteral(term)}") ||
    CONTAINS(LCASE(COALESCE(STR(?abstract), "")), "${sparqlLiteral(term)}") ||
    CONTAINS(LCASE(COALESCE(STR(?cityLabel), "")), "${sparqlLiteral(term)}")
  )`
    : "";

  return `
PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?item
       (SAMPLE(?label) AS ?label)
       (SAMPLE(?abstract) AS ?abstract)
       (SAMPLE(?thumbnail) AS ?thumbnail)
       (SAMPLE(?cityLabel) AS ?cityLabel)
       (SAMPLE(?typeLabel) AS ?typeLabel)
       (SAMPLE(?wikidataItem) AS ?wikidataItem)
WHERE {
  ?item a ?type ;
        rdfs:label ?label .
  VALUES ?type { dbo:Hotel dbo:Hostel dbo:Motel dbo:Inn dbo:Lodge dbo:GuestHouse dbo:Resort }
  FILTER(${filters})
  OPTIONAL {
    ?item dbo:abstract ?abstract .
    FILTER(LANGMATCHES(LANG(?abstract), "${langs[0]}") || LANGMATCHES(LANG(?abstract), "${langs[1]}") || LANGMATCHES(LANG(?abstract), "${langs[2]}"))
  }
  OPTIONAL { ?item dbo:thumbnail ?thumbnail }
  OPTIONAL {
    ?item <http://www.w3.org/2002/07/owl#sameAs> ?wikidataItem .
    FILTER(CONTAINS(STR(?wikidataItem), "wikidata.org/entity/"))
  }
  OPTIONAL {
    ?item dbo:city ?city .
    ?city rdfs:label ?cityLabel .
    FILTER(LANGMATCHES(LANG(?cityLabel), "${langs[0]}") || LANGMATCHES(LANG(?cityLabel), "${langs[1]}") || LANGMATCHES(LANG(?cityLabel), "${langs[2]}"))
  }
  OPTIONAL {
    ?type rdfs:label ?typeLabel .
    FILTER(LANGMATCHES(LANG(?typeLabel), "${langs[0]}") || LANGMATCHES(LANG(?typeLabel), "${langs[1]}") || LANGMATCHES(LANG(?typeLabel), "${langs[2]}"))
  }
  ${textFilter}
}
GROUP BY ?item
LIMIT 12
`.trim();
}

function wikidataSearchQuery(searchTerm: string, locale: Locale): string {
  const term = sparqlLiteral(searchTerm.trim());
  const languages = localeList(locale);
  return `
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX mwapi: <https://www.mediawiki.org/ontology#API/>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?item
       (SAMPLE(?itemLabel) AS ?itemLabel)
       (SAMPLE(?description) AS ?description)
       (SAMPLE(?image) AS ?image)
       (SAMPLE(?cityLabel) AS ?cityLabel)
       (SAMPLE(?instanceLabel) AS ?instanceLabel)
WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch" .
    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
    bd:serviceParam mwapi:search "${term}" .
    bd:serviceParam mwapi:language "${languages}" .
    bd:serviceParam mwapi:limit "12" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  OPTIONAL {
    ?item schema:description ?description .
    FILTER(LANG(?description) IN ("${locale}", "en", "fr", "es"))
  }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL {
    ?item wdt:P131 ?city .
    ?city rdfs:label ?cityLabel .
    FILTER(LANG(?cityLabel) IN ("${locale}", "en", "fr", "es"))
  }
  OPTIONAL {
    ?item wdt:P31 ?instance .
    ?instance rdfs:label ?instanceLabel .
    FILTER(LANG(?instanceLabel) = "en")
  }
  FILTER(BOUND(?instanceLabel) && REGEX(LCASE(STR(?instanceLabel)), "hotel|hostel|motel|inn|lodge|resort|villa|guest house|aparthotel|apartment hotel", "i"))
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${languages}". }
}
GROUP BY ?item
LIMIT 12
`.trim();
}

function wikidataDefaultQuery(locale: Locale): string {
  const languages = localeList(locale);
  return `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT DISTINCT ?item ?itemLabel ?image
WHERE {
  ?item wdt:P31 wd:Q27686 .
  OPTIONAL { ?item wdt:P18 ?image }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${languages}". }
}
LIMIT 12
`.trim();
}

function linkedGeoDataQuery(query: string): string {
  const term = normalize(query.trim());
  const textFilter = term
    ? `
  FILTER(
    CONTAINS(LCASE(STR(?label)), "${sparqlLiteral(term)}") ||
    CONTAINS(LCASE(COALESCE(STR(?city), "")), "${sparqlLiteral(term)}") ||
    CONTAINS(LCASE(COALESCE(STR(?street), "")), "${sparqlLiteral(term)}")
  )`
    : "";

  return `
PREFIX lgdo: <http://linkedgeodata.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT DISTINCT ?item ?label ?type ?city ?street ?houseNumber ?website ?phone ?stars
                ?internetAccess ?wifi ?pool ?swimmingPool ?parking ?breakfast ?kitchen ?pet ?pets ?airConditioning
WHERE {
  ?item a ?type ;
        rdfs:label ?label .
  VALUES ?type { lgdo:Hotel lgdo:Hostel lgdo:Motel lgdo:GuestHouse lgdo:Chalet }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/addr%3Acity> ?city }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/addr%3Astreet> ?street }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/addr%3Ahousenumber> ?houseNumber }
  OPTIONAL { ?item foaf:homepage ?website }
  OPTIONAL { ?item foaf:phone ?phone }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/stars> ?stars }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/internet_access> ?internetAccess }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/wifi> ?wifi }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/pool> ?pool }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/swimming_pool> ?swimmingPool }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/parking> ?parking }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/breakfast> ?breakfast }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/kitchen> ?kitchen }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/pet> ?pet }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/pets> ?pets }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/air_conditioning> ?airConditioning }
  ${textFilter}
}
LIMIT 12
`.trim();
}

async function searchDbpedia(query: string, locale: Locale): Promise<Propiedad[]> {
  const result = await runSparql(DBPEDIA_ENDPOINT, dbpediaQuery(query, locale));
  const mapped: Array<DbpediaPropiedad | null> = result.results.bindings.map((binding) => {
    const uri = val(binding, "item");
    if (!uri) return null;
    return {
      ...emptyPropiedad({
      uri,
      nombre: val(binding, "label") ?? localName(uri),
      descripcion: val(binding, "abstract"),
      urlImagen: normalizeImageUrl(val(binding, "thumbnail")),
      tipo: val(binding, "typeLabel") ?? localName(val(binding, "type") ?? uri),
      ciudad: val(binding, "cityLabel"),
      zona: undefined,
      }),
      wikidataItem: val(binding, "wikidataItem") ? localName(val(binding, "wikidataItem") as string) : undefined,
    } satisfies DbpediaPropiedad;
  });

  const filtered = mapped.filter((item): item is DbpediaPropiedad => item !== null);

  const wikidataFiles = await fetchWikidataImageFiles(
    filtered.map((item) => item.wikidataItem).filter((item): item is string => Boolean(item)),
  );

  const enriched = filtered.map((item) => {
    const filename = item.wikidataItem ? wikidataFiles.get(item.wikidataItem) : undefined;
    return filename
      ? { ...item, urlImagen: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename.replace(/ /g, "_"))}` }
      : item;
  });

  const hydrated = await hydrateRealImageUrls(enriched);
  return hydrated.map((item) => {
    const { wikidataItem, ...rest } = item;
    void wikidataItem;
    return rest;
  });
}

async function searchWikidata(query: string, locale: Locale): Promise<Propiedad[]> {
  const queryText = query.trim() ? wikidataSearchQuery(query, locale) : wikidataDefaultQuery(locale);
  const result = await runSparql(WIKIDATA_ENDPOINT, queryText, {
    "User-Agent": "BuscadorSemantico/1.0 (academic project)",
  }, WIKIDATA_TIMEOUT_MS);
  const mapped = result.results.bindings.map((binding) => {
    const uri = val(binding, "item");
    if (!uri) return null;
    return emptyPropiedad({
      uri,
      nombre: val(binding, "itemLabel") ?? localName(uri),
      descripcion: val(binding, "description"),
      urlImagen: normalizeImageUrl(val(binding, "image")),
      tipo: val(binding, "instanceLabel"),
      ciudad: val(binding, "cityLabel"),
      zona: undefined,
    });
  }).filter((item): item is Propiedad => Boolean(item));
  return hydrateRealImageUrls(mapped);
}

function buildLinkedGeoDataAmenities(binding: SparqlBinding, locale: Locale): Amenidad[] {
  const amenidades: Amenidad[] = [];

  if (boolish(val(binding, "wifi")) || boolish(val(binding, "internetAccess"))) {
    addAmenity(amenidades, {
      uri: amenityUri("Wifi"),
      nombre: locale === "fr" ? "Wi-Fi" : locale === "en" ? "Wi-Fi" : "Wifi",
      categoria: "Conectividad",
    });
  }

  if (boolish(val(binding, "pool")) || boolish(val(binding, "swimmingPool"))) {
    addAmenity(amenidades, {
      uri: amenityUri("Piscina"),
      nombre: locale === "fr" ? "Piscine" : locale === "en" ? "Swimming pool" : "Piscina",
      categoria: "Recreativa",
    });
  }

  if (boolish(val(binding, "parking"))) {
    addAmenity(amenidades, {
      uri: amenityUri("ParkingGratis"),
      nombre: locale === "fr" ? "Parking" : locale === "en" ? "Parking" : "Estacionamiento",
      categoria: "Transporte",
    });
  }

  if (boolish(val(binding, "breakfast"))) {
    addAmenity(amenidades, {
      uri: amenityUri("Desayuno"),
      nombre: locale === "fr" ? "Petit-déjeuner" : locale === "en" ? "Breakfast" : "Desayuno",
      categoria: "Alimentacion",
    });
  }

  if (boolish(val(binding, "kitchen"))) {
    addAmenity(amenidades, {
      uri: amenityUri("Cocina"),
      nombre: locale === "fr" ? "Cuisine" : locale === "en" ? "Kitchen" : "Cocina",
      categoria: "Cocina",
    });
  }

  if (boolish(val(binding, "airConditioning"))) {
    addAmenity(amenidades, {
      uri: amenityUri("AireAcondicionado"),
      nombre: locale === "fr" ? "Climatisation" : locale === "en" ? "Air conditioning" : "Aire acondicionado",
      categoria: "Confort",
    });
  }

  return amenidades;
}

async function searchLinkedGeoData(query: string, locale: Locale): Promise<Propiedad[]> {
  const result = await runSparql(LINKEDGEODATA_ENDPOINT, linkedGeoDataQuery(query));
  return result.results.bindings.map((binding) => {
    const uri = val(binding, "item");
    if (!uri) return null;

    const street = val(binding, "street");
    const houseNumber = val(binding, "houseNumber");
    const zona = [street, houseNumber].filter(Boolean).join(" ") || undefined;
    const typeUri = val(binding, "type");
    const property = emptyPropiedad({
      uri: linkedGeoDataResourceToOsmUrl(uri),
      nombre: val(binding, "label") ?? localName(uri),
      descripcion: undefined,
      urlImagen: undefined,
      tipo: typeUri ? localName(typeUri) : undefined,
      ciudad: val(binding, "city"),
      zona,
      capacidadMaxima: undefined,
      calificacion: undefined,
      precioNoche: undefined,
    });

    property.amenidades = buildLinkedGeoDataAmenities(binding, locale);
    return property;
  }).filter((item): item is Propiedad => Boolean(item));
}

function completeness(propiedad: Propiedad): number {
  return [
    propiedad.descripcion,
    propiedad.urlImagen,
    propiedad.tipo,
    propiedad.ciudad,
    propiedad.zona,
    propiedad.precioNoche,
    propiedad.capacidadMaxima,
    propiedad.calificacion,
  ].filter(Boolean).length + propiedad.amenidades.length;
}

function mergePropiedades(base: Propiedad, incoming: Propiedad): Propiedad {
  const amenidades = [...base.amenidades];
  for (const amenidad of incoming.amenidades) {
    addAmenity(amenidades, amenidad);
  }

  const perfiles = [...base.perfiles];
  for (const perfil of incoming.perfiles) {
    if (!perfiles.some((item) => item.uri === perfil.uri)) {
      perfiles.push(perfil);
    }
  }

  return {
    uri: base.uri,
    nombre: base.nombre || incoming.nombre,
    descripcion: base.descripcion ?? incoming.descripcion,
    urlImagen: base.urlImagen ?? incoming.urlImagen,
    tipo: base.tipo ?? incoming.tipo,
    precioNoche: base.precioNoche ?? incoming.precioNoche,
    capacidadMaxima: base.capacidadMaxima ?? incoming.capacidadMaxima,
    calificacion: base.calificacion ?? incoming.calificacion,
    ciudad: base.ciudad ?? incoming.ciudad,
    zona: base.zona ?? incoming.zona,
    amenidades,
    perfiles,
  };
}

function dedupe(propiedades: Propiedad[]): Propiedad[] {
  const byUri = new Map<string, Propiedad>();
  for (const propiedad of propiedades) {
    const current = byUri.get(propiedad.uri);
    if (!current) {
      byUri.set(propiedad.uri, propiedad);
      continue;
    }

    const merged = completeness(current) >= completeness(propiedad)
      ? mergePropiedades(current, propiedad)
      : mergePropiedades(propiedad, current);
    byUri.set(propiedad.uri, merged);
  }

  const byKey = new Map<string, Propiedad>();
  for (const propiedad of byUri.values()) {
    const key = `${normalize(propiedad.nombre)}|${normalize(propiedad.ciudad ?? "")}|${normalize(propiedad.tipo ?? "")}`;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, propiedad);
      continue;
    }

    const merged = completeness(current) >= completeness(propiedad)
      ? mergePropiedades(current, propiedad)
      : mergePropiedades(propiedad, current);
    byKey.set(key, merged);
  }

  return [...byKey.values()].sort((a, b) => {
    if (Boolean(a.urlImagen) !== Boolean(b.urlImagen)) {
      return a.urlImagen ? -1 : 1;
    }
    const diff = completeness(b) - completeness(a);
    if (diff !== 0) return diff;
    const byName = a.nombre.localeCompare(b.nombre);
    if (byName !== 0) return byName;
    return a.uri.localeCompare(b.uri);
  });
}

export async function searchOnline(query: string, locale: Locale): Promise<Propiedad[]> {
  const [dbpedia, wikidata, linkedgeodata] = await Promise.allSettled([
    searchDbpedia(query, locale),
    searchWikidata(query, locale),
    searchLinkedGeoData(query, locale),
  ]);

  const merged = [dbpedia, wikidata, linkedgeodata].flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return dedupe(merged);
}

export type { Perfil };
