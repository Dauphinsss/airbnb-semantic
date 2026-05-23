const NS = "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/";
const FUSEKI_ENDPOINT =
  process.env.FUSEKI_ENDPOINT ?? "http://localhost:3030/airbnb/sparql";

const PREFIXES = `
PREFIX : <${NS}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`.trim();

const CATALOG_QUERY = `
SELECT ?propiedad ?tipo ?nombre ?descripcion ?urlImagen ?precio ?capacidad
       ?calificacion ?ciudad ?zona ?zonaTipo
WHERE {
  ?propiedad a ?tipo .
  ?tipo rdfs:subClassOf* :Propiedad .
  FILTER(?tipo NOT IN (:Propiedad, :AlojamientoCompleto, :AlojamientoHabitacion, owl:NamedIndividual))
  OPTIONAL { ?propiedad :nombrePropiedad     ?nombre }
  OPTIONAL { ?propiedad :descripcionPropiedad ?descripcion }
  OPTIONAL { ?propiedad :urlImagen           ?urlImagen }
  OPTIONAL { ?propiedad :precioNoche         ?precio }
  OPTIONAL { ?propiedad :capacidadMaxima     ?capacidad }
  OPTIONAL { ?propiedad :calificacionPromedio ?calificacion }
  OPTIONAL {
    ?propiedad :ubicadaEn ?z .
    OPTIONAL { ?z :ciudad     ?ciudad }
    OPTIONAL { ?z :nombreZona ?zona }
    OPTIONAL { ?z :tipoZona   ?zonaTipo }
  }
}
ORDER BY ?propiedad
`;

const AMENIDADES_QUERY = `
SELECT ?propiedad ?amenidad ?nombre ?categoria
WHERE {
  ?propiedad a/rdfs:subClassOf* :Propiedad ;
             :tieneAmenidad ?amenidad .
  OPTIONAL { ?amenidad :nombreAmenidad    ?nombre }
  OPTIONAL { ?amenidad :categoriaAmenidad ?categoria }
}
`;

const PERFILES_QUERY = `
SELECT ?propiedad ?perfil ?tipoViajero
       (GROUP_CONCAT(DISTINCT ?propositoTipo; SEPARATOR="||") AS ?propositos)
WHERE {
  ?propiedad a/rdfs:subClassOf* :Propiedad ;
             :compatibleCon ?perfil .
  OPTIONAL { ?perfil :tipoViajero ?tipoViajero }
  OPTIONAL {
    ?perfil :tienePropositoViaje ?p .
    OPTIONAL { ?p :tipoPropositoViaje ?propositoTipo }
  }
}
GROUP BY ?propiedad ?perfil ?tipoViajero
`;

type SparqlBinding = Record<string, { type: string; value: string } | undefined>;
type SparqlResults = { results: { bindings: SparqlBinding[] } };

type Amenidad = { uri: string; nombre: string; categoria?: string };
type Perfil = { uri: string; nombre: string; tipoViajero?: string };
type Propiedad = {
  uri: string;
  nombre: string;
  descripcion?: string;
  urlImagen?: string;
  tipo?: string;
  precioNoche?: number;
  capacidadMaxima?: number;
  calificacion?: number;
  ciudad?: string;
  zona?: string;
  amenidades: Amenidad[];
  perfiles: Perfil[];
};

type IndexedPropiedad = Propiedad & { searchable: string };

export type { Amenidad, Perfil, Propiedad };

function localName(uri: string): string {
  const i = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return uri.slice(i + 1);
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function parseNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function val(binding: SparqlBinding, key: string): string | undefined {
  return binding[key]?.value;
}

async function sparqlSelect(query: string): Promise<SparqlResults> {
  const response = await fetch(FUSEKI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/sparql-results+json",
    },
    body: new URLSearchParams({ query: `${PREFIXES}\n${query}` }),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SPARQL failed (${response.status}): ${text.slice(0, 200)}`);
  }
  return (await response.json()) as SparqlResults;
}

function buildIndex(propiedad: Propiedad, extras: Array<string | undefined>): string {
  const parts: Array<string | undefined> = [
    propiedad.uri,
    propiedad.nombre,
    propiedad.descripcion,
    propiedad.tipo,
    propiedad.ciudad,
    propiedad.zona,
    propiedad.precioNoche?.toString(),
    propiedad.capacidadMaxima?.toString(),
    propiedad.calificacion?.toString(),
    ...propiedad.amenidades.flatMap((a) => [localName(a.uri), a.nombre, a.categoria]),
    ...propiedad.perfiles.flatMap((p) => [localName(p.uri), p.nombre, p.tipoViajero]),
    ...extras,
  ];
  return normalize(parts.filter((p): p is string => Boolean(p)).join(" "));
}

async function loadCatalog(): Promise<IndexedPropiedad[]> {
  const [catalogRes, amenidadesRes, perfilesRes] = await Promise.all([
    sparqlSelect(CATALOG_QUERY),
    sparqlSelect(AMENIDADES_QUERY),
    sparqlSelect(PERFILES_QUERY),
  ]);

  const amenidadesPorPropiedad = new Map<string, Amenidad[]>();
  for (const b of amenidadesRes.results.bindings) {
    const propUri = val(b, "propiedad");
    const amenUri = val(b, "amenidad");
    if (!propUri || !amenUri) continue;
    const list = amenidadesPorPropiedad.get(propUri) ?? [];
    list.push({
      uri: amenUri,
      nombre: val(b, "nombre") ?? localName(amenUri),
      categoria: val(b, "categoria"),
    });
    amenidadesPorPropiedad.set(propUri, list);
  }

  const perfilesPorPropiedad = new Map<string, Perfil[]>();
  const propositosExtra = new Map<string, string[]>();
  for (const b of perfilesRes.results.bindings) {
    const propUri = val(b, "propiedad");
    const perfilUri = val(b, "perfil");
    if (!propUri || !perfilUri) continue;
    const list = perfilesPorPropiedad.get(propUri) ?? [];
    list.push({
      uri: perfilUri,
      nombre: localName(perfilUri),
      tipoViajero: val(b, "tipoViajero"),
    });
    perfilesPorPropiedad.set(propUri, list);

    const propositosRaw = val(b, "propositos");
    if (propositosRaw) {
      const extras = propositosExtra.get(propUri) ?? [];
      extras.push(...propositosRaw.split("||").filter(Boolean));
      propositosExtra.set(propUri, extras);
    }
  }

  const propiedades: IndexedPropiedad[] = [];
  for (const b of catalogRes.results.bindings) {
    const uri = val(b, "propiedad");
    if (!uri) continue;
    const tipoUri = val(b, "tipo");

    const propiedad: Propiedad = {
      uri,
      nombre: val(b, "nombre") ?? localName(uri),
      descripcion: val(b, "descripcion"),
      urlImagen: val(b, "urlImagen"),
      tipo: tipoUri ? localName(tipoUri) : undefined,
      precioNoche: parseNumber(val(b, "precio")),
      capacidadMaxima: parseNumber(val(b, "capacidad")),
      calificacion: parseNumber(val(b, "calificacion")),
      ciudad: val(b, "ciudad"),
      zona: val(b, "zona"),
      amenidades: amenidadesPorPropiedad.get(uri) ?? [],
      perfiles: perfilesPorPropiedad.get(uri) ?? [],
    };

    propiedades.push({
      ...propiedad,
      searchable: buildIndex(propiedad, [
        val(b, "zonaTipo"),
        ...(propositosExtra.get(uri) ?? []),
      ]),
    });
  }

  return propiedades;
}

function toPublicPropiedad(propiedad: IndexedPropiedad): Propiedad {
  const { searchable: _s, ...rest } = propiedad;
  void _s;
  return rest;
}

export async function searchOntology(query: string): Promise<Propiedad[]> {
  const propiedades = await loadCatalog();
  const term = normalize(query.trim());
  if (!term) return propiedades.map(toPublicPropiedad);
  return propiedades
    .filter((p) => p.searchable.includes(term))
    .map(toPublicPropiedad);
}

export async function getCatalog(): Promise<Propiedad[]> {
  const propiedades = await loadCatalog();
  return propiedades.map(toPublicPropiedad);
}

export type StructuredFilters = {
  keywords?: string[];
  ciudades?: string[];
  zonas?: string[];
  tiposPropiedad?: string[];
  tiposViajero?: string[];
  categoriasAmenidad?: string[];
  amenidades?: string[];
  precioMin?: number;
  precioMax?: number;
  capacidadMin?: number;
  calificacionMin?: number;
};

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
    return normValues.some((v) => v.includes(normCand) || normCand.includes(v));
  });
}

function countMatchesInList(values: string[], candidates: string[]): number {
  if (candidates.length === 0 || values.length === 0) return 0;
  const normValues = values.map(normalize);
  let count = 0;
  for (const candidate of candidates) {
    const normCand = normalize(candidate);
    if (normValues.some((v) => v.includes(normCand) || normCand.includes(v))) {
      count += 1;
    }
  }
  return count;
}

function hasCandidates(candidates: string[] | undefined): boolean {
  return (candidates?.length ?? 0) > 0;
}

function sanitizeFiltersForCatalog(
  filters: StructuredFilters,
  propiedades: IndexedPropiedad[],
): StructuredFilters {
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

export async function sanitizeStructuredFilters(
  filters: StructuredFilters,
): Promise<StructuredFilters> {
  const propiedades = await loadCatalog();
  return sanitizeFiltersForCatalog(filters, propiedades);
}

function sparqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildHardFilterQuery(filters: StructuredFilters): string {
  const clauses: string[] = [];

  if (hasCandidates(filters.ciudades)) {
    const conds = filters.ciudades!
      .map((c) => `CONTAINS(LCASE(STR(?ciudad)), "${sparqlString(normalize(c))}")`)
      .join(" || ");
    clauses.push(`?propiedad :ubicadaEn/:ciudad ?ciudad .`);
    clauses.push(`FILTER(${conds})`);
  }

  if (filters.precioMax !== undefined || filters.precioMin !== undefined) {
    clauses.push(`?propiedad :precioNoche ?precio .`);
    if (filters.precioMax !== undefined) {
      const max = filters.precioMax * 1.25;
      clauses.push(`FILTER(?precio <= ${max})`);
    }
    if (filters.precioMin !== undefined) {
      clauses.push(`FILTER(?precio >= ${filters.precioMin})`);
    }
  }

  if (filters.capacidadMin !== undefined) {
    clauses.push(`?propiedad :capacidadMaxima ?capacidad .`);
    clauses.push(`FILTER(?capacidad >= ${filters.capacidadMin})`);
  }

  return `
SELECT DISTINCT ?propiedad WHERE {
  ?propiedad a ?tipoP .
  ?tipoP rdfs:subClassOf* :Propiedad .
  FILTER(?tipoP NOT IN (:Propiedad, :AlojamientoCompleto, :AlojamientoHabitacion, owl:NamedIndividual))
  ${clauses.join("\n  ")}
}
`.trim();
}

async function fetchHardFilteredUris(filters: StructuredFilters): Promise<Set<string>> {
  const query = buildHardFilterQuery(filters);
  const result = await sparqlSelect(query);
  return new Set(
    result.results.bindings
      .map((b) => val(b, "propiedad"))
      .filter((uri): uri is string => Boolean(uri)),
  );
}

export async function applyStructuredSearch(
  filters: StructuredFilters,
): Promise<Propiedad[]> {
  const propiedades = await loadCatalog();
  const sanitizedFilters = sanitizeFiltersForCatalog(filters, propiedades);
  const normalizedKeywords = (filters.keywords ?? [])
    .map((k) => normalize(k.trim()))
    .filter(Boolean);

  const shouldApplyZoneFilter =
    hasCandidates(sanitizedFilters.zonas) &&
    (!hasCandidates(sanitizedFilters.ciudades) ||
      propiedades.some(
        (propiedad) =>
          matchesAny(propiedad.ciudad, sanitizedFilters.ciudades) &&
          matchesAny(propiedad.zona, sanitizedFilters.zonas),
      ));

  // Filtros DUROS en SPARQL: precio, capacidad, ciudad. Fuseki devuelve solo URIs.
  const allowedUris = await fetchHardFilteredUris(sanitizedFilters);
  const hardFiltered = propiedades.filter((p) => allowedUris.has(p.uri));

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
        .map((p) => p.tipoViajero)
        .filter((t): t is string => Boolean(t));
      if (!matchesAnyInList(tipos, sanitizedFilters.tiposViajero)) return false;
    }
    if (hasCandidates(sanitizedFilters.categoriasAmenidad)) {
      const cats = propiedad.amenidades
        .map((a) => a.categoria)
        .filter((c): c is string => Boolean(c));
      if (!matchesAnyInList(cats, sanitizedFilters.categoriasAmenidad)) return false;
    }
    if (hasCandidates(sanitizedFilters.amenidades)) {
      const nombres = propiedad.amenidades.map((a) => a.nombre);
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
    return rankingPool.map(toPublicPropiedad);
  }

  const scored = rankingPool.map((propiedad) => {
    let score = 0;
    for (const kw of normalizedKeywords) {
      if (propiedad.searchable.includes(kw)) score += 1;
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
        .map((p) => p.tipoViajero)
        .filter((t): t is string => Boolean(t));
      score += countMatchesInList(tipos, sanitizedFilters.tiposViajero ?? []) * 2;
    }
    if (hasCandidates(sanitizedFilters.categoriasAmenidad)) {
      const cats = propiedad.amenidades
        .map((a) => a.categoria)
        .filter((c): c is string => Boolean(c));
      score += countMatchesInList(cats, sanitizedFilters.categoriasAmenidad ?? []);
    }
    if (hasCandidates(sanitizedFilters.amenidades)) {
      const nombres = propiedad.amenidades.map((a) => a.nombre);
      score += countMatchesInList(nombres, sanitizedFilters.amenidades ?? []) * 3;
    }
    if (sanitizedFilters.calificacionMin !== undefined) {
      score +=
        propiedad.calificacion !== undefined &&
        propiedad.calificacion >= sanitizedFilters.calificacionMin
          ? 2
          : -1;
    }
    return { propiedad, score };
  });

  const positives = scored.filter((s) => s.score > 0);
  if (positives.length === 0) {
    return rankingPool.map(toPublicPropiedad);
  }

  positives.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aCal = a.propiedad.calificacion ?? 0;
    const bCal = b.propiedad.calificacion ?? 0;
    if (bCal !== aCal) return bCal - aCal;
    return a.propiedad.uri.localeCompare(b.propiedad.uri);
  });

  return positives.map((s) => toPublicPropiedad(s.propiedad));
}
