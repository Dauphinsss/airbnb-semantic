import { type Locale } from "@/lib/i18n";

import { type Amenidad, type Perfil, type Propiedad, type StructuredFilters } from "./ontology";

const DBPEDIA_ENDPOINT = "https://dbpedia.org/sparql";
const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const LINKEDGEODATA_ENDPOINT = "https://linkedgeodata.org/sparql";
const NS = "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/";
const REQUEST_TIMEOUT_MS = 6500;
const WIKIDATA_TIMEOUT_MS = 15000;
const LODGING_TYPE_PATTERN = "hotel|hostel|motel|lodge|guest.?house|resort|villa|chalet|apartment|aparthotel|apartment hotel|holiday home|cottage|accommodation";
const DBPEDIA_RESULT_LIMIT = 12;
const WIKIDATA_RESULT_LIMIT = 16;
const WIKIDATA_SEARCH_LIMIT = 12;
const LINKEDGEODATA_RESULT_LIMIT = 24;
const ONLINE_RESULT_LIMIT = 24;
const GENERIC_LINKEDGEODATA_TYPES = new Set(["Feature", "Node", "Amenity"]);
const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "avec",
  "con",
  "de",
  "del",
  "des",
  "en",
  "for",
  "in",
  "of",
  "pour",
  "the",
  "un",
  "una",
  "une",
  "y",
]);

type WikidataSeed = { uri: string; nombre: string; urlImagen?: string };

type SparqlBinding = Record<string, { type: string; value: string } | undefined>;
type SparqlResults = { results: { bindings: SparqlBinding[] } };
type DbpediaPropiedad = Propiedad & { wikidataItem?: string };
type OnlineSource = "dbpedia" | "wikidata" | "wikidata_context" | "osm";
type CommonsApiResponse = {
  query?: {
    pages?: Record<string, { title?: string; imageinfo?: Array<{ url?: string }> }>;
  };
};
type WikidataEntitySearchResponse = {
  search?: Array<{ id?: string; description?: string; label?: string }>;
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

function formatTypeLabel(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/[_-]+/g, " ").trim();
}

function presentTypeLabel(value: string | undefined, locale: Locale): string | undefined {
  const label = formatTypeLabel(value);
  if (!label) return undefined;

  const normalized = normalize(label);
  if (/aparthotel|apartment hotel/.test(normalized)) {
    return locale === "fr" ? "Appart-hotel" : locale === "es" ? "Apartahotel" : "Aparthotel";
  }
  if (/apartment|apartamento|appartement/.test(normalized)) {
    return locale === "fr" ? "Appartement" : locale === "es" ? "Apartamento" : "Apartment";
  }
  if (/guest.?house|casa de huespedes|maison d'hotes/.test(normalized)) {
    return locale === "fr" ? "Maison d'hotes" : locale === "es" ? "Casa de huespedes" : "Guest house";
  }
  if (/holiday home|casa vacacional|maison de vacances/.test(normalized)) {
    return locale === "fr" ? "Maison de vacances" : locale === "es" ? "Casa vacacional" : "Holiday home";
  }
  if (/cottage|cabana|cabanas|chalet/.test(normalized)) {
    return locale === "fr" ? "Chalet" : locale === "es" ? "Cabana" : "Chalet";
  }
  if (/accommodation|alojamiento|hebergement/.test(normalized)) {
    return locale === "fr" ? "Hebergement" : locale === "es" ? "Alojamiento" : "Accommodation";
  }
  if (/gostinitsa|otel/.test(normalized)) {
    return "Hotel";
  }
  if (/hostel|hotel|motel|inn|lodge|resort|villa/.test(normalized)) {
    return label;
  }

  return label;
}

function rawAmenityLabel(value: string | undefined, locale: Locale): string | undefined {
  const label = formatTypeLabel(value);
  if (!label) return undefined;

  const normalized = normalize(label);
  if (/restaurant/.test(normalized)) {
    return locale === "fr" ? "Restaurant" : locale === "es" ? "Restaurante" : "Restaurant";
  }
  if (/cafe/.test(normalized)) {
    return locale === "fr" ? "Cafe" : locale === "es" ? "Cafe" : "Cafe";
  }
  if (/bar|pub/.test(normalized)) {
    return locale === "fr" ? "Bar" : locale === "es" ? "Bar" : "Bar";
  }
  if (/fast.?food/.test(normalized)) {
    return locale === "fr" ? "Restauration rapide" : locale === "es" ? "Comida rapida" : "Fast food";
  }
  if (/school/.test(normalized)) {
    return locale === "fr" ? "Ecole" : locale === "es" ? "Escuela" : "School";
  }
  return label;
}

function rawAmenityCategory(value: string | undefined): Amenidad["categoria"] {
  const normalized = normalize(value ?? "");
  if (/wifi|internet|network|connect/.test(normalized)) return "Conectividad";
  if (/restaurant|fast.?food|cafe|bar|pub|breakfast/.test(normalized)) return "Alimentacion";
  if (/pool|spa|sauna|gym|fitness/.test(normalized)) return "Recreativa";
  if (/parking|garage|transport/.test(normalized)) return "Transporte";
  if (/kitchen|cocina/.test(normalized)) return "Cocina";
  if (/air|conditioning|climat/.test(normalized)) return "Confort";
  if (/wheelchair|accessible|accessib/.test(normalized)) return "Accesibilidad";
  return "Otros";
}

function isLodgingType(value: string | undefined): boolean {
  return Boolean(value) && new RegExp(LODGING_TYPE_PATTERN, "i").test(value as string);
}

function linkedGeoDataTypeAmenity(typeValue: string | undefined, _typeLabel: string | undefined, locale: Locale): string | undefined {
  const local = formatTypeLabel(typeValue);
  if (!local) return undefined;
  if (GENERIC_LINKEDGEODATA_TYPES.has(local)) return undefined;
  if (isLodgingType(local)) return undefined;
  return rawAmenityLabel(local, locale) ?? local;
}

function normalize(value: string): string {
  const transliterated = value
    .replace(/[Аа]/g, "a")
    .replace(/[Бб]/g, "b")
    .replace(/[Вв]/g, "v")
    .replace(/[Гг]/g, "g")
    .replace(/[Дд]/g, "d")
    .replace(/[ЕеЁё]/g, "e")
    .replace(/[Жж]/g, "zh")
    .replace(/[Зз]/g, "z")
    .replace(/[ИиЙй]/g, "i")
    .replace(/[Кк]/g, "k")
    .replace(/[Лл]/g, "l")
    .replace(/[Мм]/g, "m")
    .replace(/[Нн]/g, "n")
    .replace(/[Оо]/g, "o")
    .replace(/[Пп]/g, "p")
    .replace(/[Рр]/g, "r")
    .replace(/[Сс]/g, "s")
    .replace(/[Тт]/g, "t")
    .replace(/[Уу]/g, "u")
    .replace(/[Фф]/g, "f")
    .replace(/[Хх]/g, "h")
    .replace(/[Цц]/g, "ts")
    .replace(/[Чч]/g, "ch")
    .replace(/[Шш]/g, "sh")
    .replace(/[Щщ]/g, "shch")
    .replace(/[Ыы]/g, "y")
    .replace(/[Ээ]/g, "e")
    .replace(/[Юю]/g, "yu")
    .replace(/[Яя]/g, "ya")
    .replace(/[ЪъЬь]/g, "");

  return transliterated.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function tokenizeQuery(value: string): string[] {
  return normalize(value)
    .split(/[^\p{Letter}\p{Number}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token));
}

function matchesAny(value: string | undefined, candidates: string[] | undefined): boolean {
  if (!candidates || candidates.length === 0) return true;
  if (!value) return false;
  const normValue = normalize(value);
  return candidates.some((candidate) => {
    const normCand = normalize(candidate);
    return normValue.includes(normCand) || normCand.includes(normValue);
  });
}

function matchesAnyInList(values: string[], candidates: string[] | undefined): boolean {
  if (!candidates || candidates.length === 0) return true;
  if (values.length === 0) return false;
  const normValues = values.map(normalize);
  return candidates.some((candidate) => {
    const normCand = normalize(candidate);
    return normValues.some((value) => value.includes(normCand) || normCand.includes(value));
  });
}

function countMatchesInList(values: string[], candidates: string[]): number {
  if (candidates.length === 0 || values.length === 0) return 0;
  const normValues = values.map(normalize);
  let count = 0;
  for (const candidate of candidates) {
    const normCand = normalize(candidate);
    if (normValues.some((value) => value.includes(normCand) || normCand.includes(value))) {
      count += 1;
    }
  }
  return count;
}

function hasCandidates(candidates: string[] | undefined): boolean {
  return (candidates?.length ?? 0) > 0;
}

function matchesOnlineQuery(propiedad: Propiedad, query: string): boolean {
  const terms = tokenizeQuery(query.trim());
  if (terms.length === 0) return true;
  const haystack = normalize([
    propiedad.nombre,
    propiedad.descripcion,
    propiedad.tipo,
    propiedad.ciudad,
    propiedad.zona,
    propiedad.codigoPostal,
    propiedad.sitioWeb,
    propiedad.telefono,
    propiedad.horario,
    propiedad.fuente,
    ...propiedad.amenidades.flatMap((amenidad) => [amenidad.nombre, amenidad.categoria]),
  ].filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term));
}

function buildOnlineSearchable(propiedad: Propiedad): string {
  return normalize([
    propiedad.uri,
    propiedad.nombre,
    propiedad.descripcion,
    propiedad.tipo,
    propiedad.ciudad,
    propiedad.zona,
    propiedad.codigoPostal,
    propiedad.sitioWeb,
    propiedad.telefono,
    propiedad.email,
    propiedad.horario,
    propiedad.fuente,
    propiedad.precioNoche?.toString(),
    propiedad.capacidadMaxima?.toString(),
    propiedad.calificacion?.toString(),
    ...propiedad.amenidades.flatMap((amenidad) => [amenidad.nombre, amenidad.categoria]),
    ...propiedad.perfiles.flatMap((perfil) => [perfil.nombre, perfil.tipoViajero]),
  ].filter(Boolean).join(" "));
}

function sanitizeOnlineFilters(filters: StructuredFilters, propiedades: Propiedad[]): StructuredFilters {
  if (!hasCandidates(filters.ciudades) || !hasCandidates(filters.zonas)) {
    return filters;
  }

  const hasCityZoneMatch = propiedades.some(
    (propiedad) =>
      matchesAny(propiedad.ciudad, filters.ciudades) &&
      matchesAny(propiedad.zona, filters.zonas),
  );

  return hasCityZoneMatch ? filters : { ...filters, zonas: [] };
}

export function applyStructuredOnlineSearch(filters: StructuredFilters, propiedades: Propiedad[]): Propiedad[] {
  const deduped = dedupeOnlineResults(propiedades);
  const sanitizedFilters = sanitizeOnlineFilters(filters, deduped);
  const normalizedKeywords = (sanitizedFilters.keywords ?? [])
    .map((keyword) => normalize(keyword.trim()))
    .filter(Boolean);

  const shouldApplyZoneFilter =
    hasCandidates(sanitizedFilters.zonas) &&
    (!hasCandidates(sanitizedFilters.ciudades) ||
      deduped.some(
        (propiedad) =>
          matchesAny(propiedad.ciudad, sanitizedFilters.ciudades) &&
          matchesAny(propiedad.zona, sanitizedFilters.zonas),
      ));

  const hardFiltered = deduped.filter((propiedad) => {
    if (hasCandidates(sanitizedFilters.ciudades) && !matchesAny(propiedad.ciudad, sanitizedFilters.ciudades)) {
      return false;
    }
    if (filters.precioMax !== undefined) {
      if (propiedad.precioNoche === undefined || propiedad.precioNoche > filters.precioMax * 1.25) {
        return false;
      }
    }
    if (filters.precioMin !== undefined) {
      if (propiedad.precioNoche === undefined || propiedad.precioNoche < filters.precioMin) {
        return false;
      }
    }
    if (filters.capacidadMin !== undefined) {
      if (propiedad.capacidadMaxima === undefined || propiedad.capacidadMaxima < filters.capacidadMin) {
        return false;
      }
    }
    return true;
  });

  const strictCategorical = hardFiltered.filter((propiedad) => {
    if (shouldApplyZoneFilter && !matchesAny(propiedad.zona, sanitizedFilters.zonas)) {
      return false;
    }
    if (
      hasCandidates(sanitizedFilters.tiposPropiedad) &&
      !matchesAny(propiedad.tipo, sanitizedFilters.tiposPropiedad)
    ) {
      return false;
    }
    if (hasCandidates(sanitizedFilters.tiposViajero)) {
      const tipos = propiedad.perfiles
        .map((perfil) => perfil.tipoViajero)
        .filter((tipo): tipo is string => Boolean(tipo));
      if (!matchesAnyInList(tipos, sanitizedFilters.tiposViajero)) return false;
    }
    if (hasCandidates(sanitizedFilters.categoriasAmenidad)) {
      const categorias = propiedad.amenidades
        .map((amenidad) => amenidad.categoria)
        .filter((categoria): categoria is string => Boolean(categoria));
      if (!matchesAnyInList(categorias, sanitizedFilters.categoriasAmenidad)) return false;
    }
    if (hasCandidates(sanitizedFilters.amenidades)) {
      const nombres = propiedad.amenidades.map((amenidad) => amenidad.nombre);
      if (!matchesAnyInList(nombres, sanitizedFilters.amenidades)) return false;
    }
    return true;
  });

  const rankingPool = strictCategorical.length > 0 ? strictCategorical : hardFiltered;
  const hasSoftCriteria =
    normalizedKeywords.length > 0 ||
    hasCandidates(sanitizedFilters.zonas) ||
    hasCandidates(sanitizedFilters.tiposPropiedad) ||
    hasCandidates(sanitizedFilters.tiposViajero) ||
    hasCandidates(sanitizedFilters.categoriasAmenidad) ||
    hasCandidates(sanitizedFilters.amenidades) ||
    sanitizedFilters.calificacionMin !== undefined;

  if (!hasSoftCriteria) {
    return rankingPool;
  }

  const scored = rankingPool.map((propiedad) => {
    const searchable = buildOnlineSearchable(propiedad);
    let score = 0;

    for (const keyword of normalizedKeywords) {
      if (searchable.includes(keyword)) score += 1;
    }
    if (shouldApplyZoneFilter && matchesAny(propiedad.zona, sanitizedFilters.zonas)) {
      score += 3;
    }
    if (
      hasCandidates(sanitizedFilters.tiposPropiedad) &&
      matchesAny(propiedad.tipo, sanitizedFilters.tiposPropiedad)
    ) {
      score += 4;
    }
    if (hasCandidates(sanitizedFilters.tiposViajero)) {
      const tipos = propiedad.perfiles
        .map((perfil) => perfil.tipoViajero)
        .filter((tipo): tipo is string => Boolean(tipo));
      score += countMatchesInList(tipos, sanitizedFilters.tiposViajero ?? []) * 2;
    }
    if (hasCandidates(sanitizedFilters.categoriasAmenidad)) {
      const categorias = propiedad.amenidades
        .map((amenidad) => amenidad.categoria)
        .filter((categoria): categoria is string => Boolean(categoria));
      score += countMatchesInList(categorias, sanitizedFilters.categoriasAmenidad ?? []);
    }
    if (hasCandidates(sanitizedFilters.amenidades)) {
      const nombres = propiedad.amenidades.map((amenidad) => amenidad.nombre);
      score += countMatchesInList(nombres, sanitizedFilters.amenidades ?? []) * 3;
    }
    if (sanitizedFilters.calificacionMin !== undefined) {
      score +=
        propiedad.calificacion !== undefined && propiedad.calificacion >= sanitizedFilters.calificacionMin
          ? 2
          : -1;
    }

    return { propiedad, score };
  });

  const positives = scored.filter((item) => item.score > 0);
  return positives.length > 0 ? positives.map((item) => item.propiedad) : rankingPool;
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

function uniqueBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
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
LIMIT ${DBPEDIA_RESULT_LIMIT}
`.trim();
}

function wikidataSearchSeedQuery(searchTerm: string, locale: Locale): string {
  const term = sparqlLiteral(searchTerm.trim());
  const languages = localeList(locale);
  return `
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX mwapi: <https://www.mediawiki.org/ontology#API/>

SELECT DISTINCT ?item ?itemLabel
WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch" .
    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
    bd:serviceParam mwapi:search "${term}" .
    bd:serviceParam mwapi:language "${languages}" .
    bd:serviceParam mwapi:limit "${WIKIDATA_SEARCH_LIMIT}" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${languages}". }
}
LIMIT ${WIKIDATA_SEARCH_LIMIT}
`.trim();
}

function wikidataContextEntityHotelsQuery(entityIds: string[], locale: Locale): string {
  const languages = localeList(locale);
  const values = entityIds.map((item) => `wd:${item}`).join(" ");
  return `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT ?item
       (SAMPLE(?itemLabel) AS ?itemLabel)
       (SAMPLE(?placeLabel) AS ?placeLabel)
WHERE {
  VALUES ?needle { ${values} }
  ?item wdt:P31 wd:Q27686 .
  { ?item wdt:P17 ?needle }
  UNION
  { ?item wdt:P131 ?needle }
  UNION
  { ?item wdt:P276 ?needle }
  OPTIONAL {
    ?item wdt:P131 ?city .
    ?city rdfs:label ?cityLabel .
    FILTER(LANG(?cityLabel) IN ("${locale}", "en", "fr", "es", "de"))
  }
  OPTIONAL {
    ?item wdt:P276 ?location .
    ?location rdfs:label ?locationLabel .
    FILTER(LANG(?locationLabel) IN ("${locale}", "en", "fr", "es", "de"))
  }
  OPTIONAL {
    ?item wdt:P17 ?country .
    ?country rdfs:label ?countryLabel .
    FILTER(LANG(?countryLabel) IN ("${locale}", "en", "fr", "es", "de"))
  }
  BIND(COALESCE(?cityLabel, ?locationLabel, ?countryLabel) AS ?placeLabel)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${languages}". }
}
GROUP BY ?item
LIMIT ${WIKIDATA_SEARCH_LIMIT}
`.trim();
}

async function searchWikidataEntityIds(searchTerm: string, locale: Locale): Promise<string[]> {
  for (const language of localeChain(locale)) {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(searchTerm)}&language=${encodeURIComponent(language)}&limit=6&format=json`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "BuscadorSemantico/1.0 (academic project)" },
    });
    if (!response.ok) continue;
    const data = (await response.json()) as WikidataEntitySearchResponse;
    const preferred = data.search?.find((item) => item.id)?.id;
    if (preferred) return [preferred];
  }
  return [];
}

function wikidataDefaultSeedQuery(locale: Locale): string {
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
LIMIT ${WIKIDATA_RESULT_LIMIT}
`.trim();
}

function wikidataDetailsQuery(itemIds: string[], locale: Locale): string {
  const languages = localeList(locale);
  const values = itemIds.map((item) => `wd:${item}`).join(" ");
  return `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?item
       (SAMPLE(?itemLabel) AS ?itemLabel)
       (SAMPLE(?description) AS ?description)
       (SAMPLE(?image) AS ?image)
       (SAMPLE(?placeLabel) AS ?placeLabel)
       (SAMPLE(?instanceLabel) AS ?instanceLabel)
WHERE {
  VALUES ?item { ${values} }
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
    ?item wdt:P276 ?location .
    ?location rdfs:label ?locationLabel .
    FILTER(LANG(?locationLabel) IN ("${locale}", "en", "fr", "es"))
  }
  OPTIONAL {
    ?item wdt:P17 ?country .
    ?country rdfs:label ?countryLabel .
    FILTER(LANG(?countryLabel) IN ("${locale}", "en", "fr", "es"))
  }
  OPTIONAL {
    ?item wdt:P31 ?instance .
    ?instance rdfs:label ?instanceLabel .
    FILTER(LANG(?instanceLabel) IN ("${locale}", "en", "fr", "es"))
  }
  BIND(COALESCE(?cityLabel, ?locationLabel, ?countryLabel) AS ?placeLabel)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${languages}". }
}
GROUP BY ?item
`.trim();
}

function linkedGeoDataQuery(): string {
  return `
PREFIX lgdo: <http://linkedgeodata.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?item
       (SAMPLE(?label) AS ?label)
       (SAMPLE(?lodgingType) AS ?lodgingType)
       (SAMPLE(?lodgingTypeLabel) AS ?lodgingTypeLabel)
       (SAMPLE(?city) AS ?city)
       (SAMPLE(?country) AS ?country)
       (SAMPLE(?street) AS ?street)
       (SAMPLE(?houseNumber) AS ?houseNumber)
       (SAMPLE(?website) AS ?website)
       (SAMPLE(?phone) AS ?phone)
       (SAMPLE(?postcode) AS ?postcode)
       (SAMPLE(?email) AS ?email)
       (SAMPLE(?openingHours) AS ?openingHours)
       (SAMPLE(?internetAccess) AS ?internetAccess)
       (SAMPLE(?wifi) AS ?wifi)
       (SAMPLE(?pool) AS ?pool)
       (SAMPLE(?swimmingPool) AS ?swimmingPool)
       (SAMPLE(?parking) AS ?parking)
       (SAMPLE(?breakfast) AS ?breakfast)
       (SAMPLE(?kitchen) AS ?kitchen)
       (SAMPLE(?pet) AS ?pet)
       (SAMPLE(?pets) AS ?pets)
       (SAMPLE(?airConditioning) AS ?airConditioning)
       (GROUP_CONCAT(DISTINCT STR(?amenity); SEPARATOR="||") AS ?amenityValues)
       (GROUP_CONCAT(DISTINCT STR(?type); SEPARATOR="||") AS ?typeValues)
WHERE {
  {
    SELECT DISTINCT ?item ?lodgingType ?label
    WHERE {
      ?item a ?lodgingType ;
            rdfs:label ?label .
      FILTER(REGEX(LCASE(STR(?lodgingType)), "${LODGING_TYPE_PATTERN}", "i"))
    }
    LIMIT ${LINKEDGEODATA_RESULT_LIMIT}
  }
  OPTIONAL { ?lodgingType rdfs:label ?lodgingTypeLabel }
  OPTIONAL {
    ?item a ?type .
    FILTER(?type != ?lodgingType)
  }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/amenity> ?amenity }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/addr%3Acity> ?city }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/addr%3Acountry> ?country }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/addr%3Astreet> ?street }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/addr%3Ahousenumber> ?houseNumber }
  OPTIONAL { ?item foaf:homepage ?website }
  OPTIONAL { ?item foaf:phone ?phone }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/addr%3Apostcode> ?postcode }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/email> ?email }
  OPTIONAL { ?item <http://linkedgeodata.org/ontology/opening_hours> ?openingHours }
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
}
GROUP BY ?item
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
      tipo: presentTypeLabel(val(binding, "typeLabel") ?? localName(val(binding, "type") ?? uri), locale),
      ciudad: val(binding, "cityLabel"),
      fuente: "DBpedia",
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
  }).filter((item) => matchesOnlineQuery(item, query));
}

async function searchWikidata(query: string, locale: Locale): Promise<Propiedad[]> {
  const seedResult = await runSparql(
    WIKIDATA_ENDPOINT,
    query.trim() ? wikidataSearchSeedQuery(query, locale) : wikidataDefaultSeedQuery(locale),
    { "User-Agent": "BuscadorSemantico/1.0 (academic project)" },
    WIKIDATA_TIMEOUT_MS,
  );

  const seeds = seedResult.results.bindings.map((binding) => {
    const uri = val(binding, "item");
    if (!uri) return null;
    const rawLabel = val(binding, "itemLabel");
    const nombre = rawLabel && !isWikidataId(rawLabel) ? rawLabel : localName(uri);
    return {
      uri,
      nombre,
      urlImagen: normalizeImageUrl(val(binding, "image")),
    } satisfies WikidataSeed;
  }).filter((item): item is WikidataSeed => Boolean(item));

  if (seeds.length === 0) return [];

  return hydrateWikidataSeeds(seeds, query, locale, true);
}

async function searchWikidataContext(query: string, locale: Locale): Promise<Propiedad[]> {
  if (!query.trim()) return [];
  try {
    const entityIds = await searchWikidataEntityIds(query, locale);

    if (entityIds.length === 0) return [];

    const relatedResult = await runSparql(
        WIKIDATA_ENDPOINT,
        wikidataContextEntityHotelsQuery(entityIds, locale),
        { "User-Agent": "BuscadorSemantico/1.0 (academic project)" },
        WIKIDATA_TIMEOUT_MS,
      );

    const seeds = uniqueBy(
      relatedResult.results.bindings.map((binding) => {
        const uri = val(binding, "item");
        if (!uri) return null;
        const rawLabel = val(binding, "itemLabel");
        const nombre = rawLabel && !isWikidataId(rawLabel) ? rawLabel : localName(uri);
        return {
          uri,
          nombre,
          urlImagen: undefined,
        } satisfies WikidataSeed;
      }).filter((item): item is WikidataSeed => Boolean(item)),
      (item) => item.uri,
    );

    if (seeds.length === 0) return [];

    try {
      return await hydrateWikidataSeeds(seeds, query, locale, false);
    } catch {
      const fallbackItems = relatedResult.results.bindings.map((binding) => {
        const uri = val(binding, "item");
        if (!uri) return null;
        const rawLabel = val(binding, "itemLabel");
        const nombre = rawLabel && !isWikidataId(rawLabel) ? rawLabel : localName(uri);
        return emptyPropiedad({
          uri,
          nombre,
          tipo: presentTypeLabel("Hotel", locale),
          ciudad: val(binding, "placeLabel"),
          fuente: "Wikidata",
          zona: undefined,
        });
      }).filter((item): item is Propiedad => Boolean(item));

      const badIds = fallbackItems
        .filter((item) => isWikidataId(item.nombre))
        .map((item) => localName(item.uri));
      if (badIds.length > 0) {
        const resolvedLabels = await resolveWikidataLabels(badIds, locale);
        return fallbackItems.map((item) => {
          if (!isWikidataId(item.nombre)) return item;
          const apiLabel = resolvedLabels.get(localName(item.uri));
          return apiLabel && !isWikidataId(apiLabel)
            ? { ...item, nombre: apiLabel }
            : item;
        });
      }

      return fallbackItems;
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes("(429)") || error.message.includes("aborted"))) {
      return [];
    }
    throw error;
  }
}

async function hydrateWikidataSeeds(
  seeds: WikidataSeed[],
  query: string,
  locale: Locale,
  applyQueryFilter: boolean,
): Promise<Propiedad[]> {

  const detailsResult = await runSparql(WIKIDATA_ENDPOINT, wikidataDetailsQuery(
    seeds.map((item) => localName(item.uri)),
    locale,
  ), {
    "User-Agent": "BuscadorSemantico/1.0 (academic project)",
  }, WIKIDATA_TIMEOUT_MS);

  const detailsByUri = new Map<string, SparqlBinding>();
  for (const binding of detailsResult.results.bindings) {
    const uri = val(binding, "item");
    if (uri) detailsByUri.set(uri, binding);
  }

  const qIdsWithBadNames = seeds
    .filter((seed) => {
      const detailsLabel = detailsByUri.get(seed.uri) ? val(detailsByUri.get(seed.uri)!, "itemLabel") : undefined;
      const currentName = isWikidataId(seed.nombre)
        ? (detailsLabel && !isWikidataId(detailsLabel) ? detailsLabel : seed.nombre)
        : seed.nombre;
      return isWikidataId(currentName);
    })
    .map((seed) => localName(seed.uri));

  const resolvedLabels = await resolveWikidataLabels(qIdsWithBadNames, locale);

  const mapped = seeds.map((seed) => {
    const binding = detailsByUri.get(seed.uri);
    const detailsLabel = binding ? val(binding, "itemLabel") : undefined;
    let resolvedName = isWikidataId(seed.nombre)
      ? (detailsLabel && !isWikidataId(detailsLabel) ? detailsLabel : localName(seed.uri))
      : seed.nombre;

    if (isWikidataId(resolvedName)) {
      const apiLabel = resolvedLabels.get(resolvedName);
      if (apiLabel && !isWikidataId(apiLabel)) {
        resolvedName = apiLabel;
      }
    }

    return emptyPropiedad({
      uri: seed.uri,
      nombre: resolvedName,
      descripcion: val(binding, "description"),
      urlImagen: seed.urlImagen ?? normalizeImageUrl(val(binding, "image")),
      tipo: presentTypeLabel(val(binding, "instanceLabel") ?? "Hotel", locale),
      ciudad: val(binding, "placeLabel"),
      fuente: "Wikidata",
      zona: undefined,
    });
  }).filter((item) => !query.trim() || isLodgingType(item.tipo));
  const filtered = applyQueryFilter ? mapped.filter((item) => matchesOnlineQuery(item, query)) : mapped;
  try {
    return await hydrateRealImageUrls(filtered);
  } catch {
    return filtered;
  }
}

async function resolveWikidataLabels(
  ids: string[],
  locale: Locale,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id) => isWikidataId(id)))];
  if (unique.length === 0) return new Map();

  const resolved = new Map<string, string>();
  for (const lang of localeChain(locale)) {
    if (unique.length === 0) break;
    const idsToTry = unique.filter((id) => !resolved.has(id));
    if (idsToTry.length === 0) break;

    const chunkSize = 50;
    for (let i = 0; i < idsToTry.length; i += chunkSize) {
      const chunk = idsToTry.slice(i, i + chunkSize);
      const idsParam = chunk.join("|");
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(idsParam)}&props=labels&languages=${encodeURIComponent(lang)}&format=json&origin=*`;
      try {
        const response = await fetch(url, {
          cache: "no-store",
          headers: { "User-Agent": "BuscadorSemantico/1.0 (academic project)" },
        });
        if (!response.ok) continue;
        const data = (await response.json()) as {
          entities?: Record<string, { labels?: Record<string, { language?: string; value?: string }> }>;
        };
        for (const id of chunk) {
          const label = data.entities?.[id]?.labels?.[lang]?.value;
          if (label && !isWikidataId(label)) {
            resolved.set(id, label);
          }
        }
      } catch {
        continue;
      }
    }
  }

  return resolved;
}

function isWikidataId(value: string): boolean {
  return /^Q\d+$/.test(value);
}

function buildLinkedGeoDataAmenities(binding: SparqlBinding, locale: Locale): Amenidad[] {
  const amenidades: Amenidad[] = [];
  const amenityValues = (val(binding, "amenityValues") ?? "")
    .split("||")
    .map((value) => value.trim())
    .filter(Boolean);
  const typeValues = (val(binding, "typeValues") ?? "")
    .split("||")
    .map((value) => value.trim())
    .filter(Boolean);

  for (const amenityValue of amenityValues) {
    const rawAmenity = rawAmenityLabel(amenityValue.startsWith("http") ? localName(amenityValue) : amenityValue, locale);
    if (!rawAmenity) continue;
    addAmenity(amenidades, {
      uri: amenityUri(`RawAmenity-${rawAmenity.replace(/\s+/g, "-")}`),
      nombre: rawAmenity,
      categoria: rawAmenityCategory(rawAmenity),
    });
  }

  for (const typeValue of typeValues) {
    const rawTypeAmenity = linkedGeoDataTypeAmenity(typeValue.startsWith("http") ? localName(typeValue) : typeValue, undefined, locale);
    if (!rawTypeAmenity) continue;
    addAmenity(amenidades, {
      uri: amenityUri(`RawType-${rawTypeAmenity.replace(/\s+/g, "-")}`),
      nombre: rawTypeAmenity,
      categoria: rawAmenityCategory(rawTypeAmenity),
    });
  }

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
  const result = await runSparql(LINKEDGEODATA_ENDPOINT, linkedGeoDataQuery());
  return result.results.bindings.map((binding) => {
    const uri = val(binding, "item");
    if (!uri) return null;

    const street = val(binding, "street");
    const houseNumber = val(binding, "houseNumber");
    const zona = [street, houseNumber].filter(Boolean).join(" ") || undefined;
    const typeUri = val(binding, "lodgingType");
    const property = emptyPropiedad({
      uri: linkedGeoDataResourceToOsmUrl(uri),
      nombre: val(binding, "label") ?? localName(uri),
      descripcion: undefined,
      urlImagen: undefined,
      tipo: presentTypeLabel(val(binding, "lodgingTypeLabel") ?? (typeUri ? localName(typeUri) : undefined), locale),
      ciudad: val(binding, "city") ?? val(binding, "country"),
      zona,
      codigoPostal: val(binding, "postcode"),
      sitioWeb: val(binding, "website"),
      telefono: val(binding, "phone"),
      email: val(binding, "email"),
      horario: val(binding, "openingHours"),
      fuente: "OpenStreetMap",
      capacidadMaxima: undefined,
      calificacion: undefined,
      precioNoche: undefined,
    });

    property.amenidades = buildLinkedGeoDataAmenities(binding, locale);
    return property;
  }).filter((item): item is Propiedad => Boolean(item)).filter((item) => matchesOnlineQuery(item, query));
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
    codigoPostal: base.codigoPostal ?? incoming.codigoPostal,
    sitioWeb: base.sitioWeb ?? incoming.sitioWeb,
    telefono: base.telefono ?? incoming.telefono,
    email: base.email ?? incoming.email,
    horario: base.horario ?? incoming.horario,
    fuente: base.fuente ?? incoming.fuente,
    amenidades,
    perfiles,
  };
}

export function dedupeOnlineResults(propiedades: Propiedad[]): Propiedad[] {
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
  }).slice(0, ONLINE_RESULT_LIMIT);
}

export async function searchOnline(query: string, locale: Locale): Promise<Propiedad[]> {
  const tasks = [
    searchDbpedia(query, locale),
    searchWikidata(query, locale),
    searchLinkedGeoData(query, locale),
    ...(query.trim() ? [searchWikidataContext(query, locale)] : []),
  ];

  const settled = await Promise.allSettled(tasks);

  const merged = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return dedupeOnlineResults(merged);
}

export async function searchOnlineSource(source: OnlineSource, query: string, locale: Locale): Promise<Propiedad[]> {
  const propiedades = source === "dbpedia"
    ? await searchDbpedia(query, locale)
    : source === "wikidata"
      ? await searchWikidata(query, locale)
      : source === "wikidata_context"
        ? await searchWikidataContext(query, locale)
      : await searchLinkedGeoData(query, locale);
  return dedupeOnlineResults(propiedades);
}

export type { OnlineSource, Perfil };
