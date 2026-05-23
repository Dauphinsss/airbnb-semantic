import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ONTOLOGY_PATH = path.join(process.cwd(), "ontology", "Airbnb.owl");
const PROP_URI = "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Propiedad";
const AMENIDAD_URI = "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Amenidad";
const PERFIL_URI = "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/PerfilHuesped";
const ZONA_URI = "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/ZonaGeografica";
const ABSTRACT_PROPERTY_TYPES = new Set([
  PROP_URI,
  "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/AlojamientoCompleto",
  "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/AlojamientoHabitacion",
]);

type StringMap = Map<string, string[]>;

type ParsedIndividual = {
  uri: string;
  types: string[];
  objectProps: StringMap;
  dataProps: StringMap;
};

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

type CacheEntry = {
  mtimeMs: number;
  propiedades: IndexedPropiedad[];
};

let cache: CacheEntry | null = null;

export type { Amenidad, Perfil, Propiedad };

function localName(uri: string): string {
  const i = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return uri.slice(i + 1);
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function pushValue(map: StringMap, key: string, value: string) {
  const current = map.get(key);
  if (current) {
    current.push(value);
    return;
  }
  map.set(key, [value]);
}

function firstValue(map: StringMap, key: string): string | undefined {
  return map.get(key)?.[0];
}

function parseNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseClassHierarchy(xml: string): Map<string, string[]> {
  const hierarchy = new Map<string, string[]>();
  const classRegex =
    /<owl:Class rdf:about="([^"]+)">([\s\S]*?)<\/owl:Class>/g;

  for (const match of xml.matchAll(classRegex)) {
    const [, uri, body] = match;
    const parents = [...body.matchAll(/<rdfs:subClassOf rdf:resource="([^"]+)"\s*\/>/g)].map(
      ([, parent]) => parent,
    );
    hierarchy.set(uri, parents);
  }

  return hierarchy;
}

function parseIndividuals(xml: string): Map<string, ParsedIndividual> {
  const individuals = new Map<string, ParsedIndividual>();
  const individualRegex =
    /<owl:NamedIndividual rdf:about="([^"]+)">([\s\S]*?)<\/owl:NamedIndividual>/g;

  for (const match of xml.matchAll(individualRegex)) {
    const [, uri, body] = match;
    const types: string[] = [];
    const objectProps: StringMap = new Map();
    const dataProps: StringMap = new Map();

    for (const objectMatch of body.matchAll(
      /<([A-Za-z0-9:_-]+)\s+rdf:resource="([^"]+)"\s*\/>/g,
    )) {
      const [, rawKey, value] = objectMatch;
      const key = rawKey.includes(":") ? rawKey.split(":").pop()! : rawKey;
      if (key === "type") {
        types.push(value);
        continue;
      }
      pushValue(objectProps, key, value);
    }

    for (const dataMatch of body.matchAll(
      /<([A-Za-z0-9:_-]+)(?:\s+rdf:datatype="[^"]+")?>([^<]*)<\/\1>/g,
    )) {
      const [, rawKey, rawValue] = dataMatch;
      const key = rawKey.includes(":") ? rawKey.split(":").pop()! : rawKey;
      pushValue(dataProps, key, decodeXml(rawValue));
    }

    individuals.set(uri, { uri, types, objectProps, dataProps });
  }

  return individuals;
}

function isSubclassOf(
  child: string,
  ancestor: string,
  hierarchy: Map<string, string[]>,
  memo = new Map<string, boolean>(),
): boolean {
  if (child === ancestor) return true;

  const memoKey = `${child}|${ancestor}`;
  const cached = memo.get(memoKey);
  if (cached !== undefined) return cached;

  const parents = hierarchy.get(child) ?? [];
  const result = parents.some((parent) =>
    isSubclassOf(parent, ancestor, hierarchy, memo),
  );
  memo.set(memoKey, result);
  return result;
}

function mostSpecificType(
  types: string[],
  hierarchy: Map<string, string[]>,
  ancestor: string,
): string | undefined {
  return types.find(
    (type) =>
      isSubclassOf(type, ancestor, hierarchy) && !ABSTRACT_PROPERTY_TYPES.has(type),
  );
}

function buildIndex(propiedad: Propiedad, extras: Array<string | undefined>): string {
  const parts = [
    propiedad.uri,
    propiedad.nombre,
    propiedad.descripcion,
    propiedad.tipo,
    propiedad.ciudad,
    propiedad.zona,
    propiedad.precioNoche?.toString(),
    propiedad.capacidadMaxima?.toString(),
    propiedad.calificacion?.toString(),
    ...propiedad.amenidades.flatMap((amenidad) => [
      amenidad.uri,
      amenidad.nombre,
      amenidad.categoria,
    ]),
    ...propiedad.perfiles.flatMap((perfil) => [
      perfil.uri,
      perfil.nombre,
      perfil.tipoViajero,
    ]),
    ...extras,
  ];

  return normalize(parts.filter(Boolean).join(" "));
}

function buildCatalog(xml: string): IndexedPropiedad[] {
  const hierarchy = parseClassHierarchy(xml);
  const individuals = parseIndividuals(xml);
  const subclassMemo = new Map<string, boolean>();

  const amenidades = new Map<string, Amenidad>();
  const perfiles = new Map<
    string,
    Perfil & { propositos: string[]; propositoTipos: string[] }
  >();
  const zonas = new Map<
    string,
    {
      uri: string;
      ciudad?: string;
      nombreZona?: string;
      tipoZona?: string;
      puntoInteres: string[];
    }
  >();

  for (const entity of individuals.values()) {
    if (entity.types.some((type) => isSubclassOf(type, AMENIDAD_URI, hierarchy, subclassMemo))) {
      amenidades.set(entity.uri, {
        uri: entity.uri,
        nombre: firstValue(entity.dataProps, "nombreAmenidad") ?? localName(entity.uri),
        categoria: firstValue(entity.dataProps, "categoriaAmenidad"),
      });
      continue;
    }

    if (entity.types.some((type) => isSubclassOf(type, PERFIL_URI, hierarchy, subclassMemo))) {
      const propositoUris = entity.objectProps.get("tienePropositoViaje") ?? [];
      const propositoTipos = propositoUris
        .map((uri) => individuals.get(uri))
        .flatMap((proposito) =>
          proposito
            ? [
                firstValue(proposito.dataProps, "tipoPropositoViaje"),
                localName(proposito.uri),
              ]
            : [],
        )
        .filter((value): value is string => Boolean(value));

      perfiles.set(entity.uri, {
        uri: entity.uri,
        nombre: localName(entity.uri),
        tipoViajero: firstValue(entity.dataProps, "tipoViajero"),
        propositos: propositoUris.map(localName),
        propositoTipos,
      });
      continue;
    }

    if (entity.types.some((type) => isSubclassOf(type, ZONA_URI, hierarchy, subclassMemo))) {
      zonas.set(entity.uri, {
        uri: entity.uri,
        ciudad: firstValue(entity.dataProps, "ciudad"),
        nombreZona: firstValue(entity.dataProps, "nombreZona"),
        tipoZona: firstValue(entity.dataProps, "tipoZona"),
        puntoInteres: (entity.objectProps.get("tienePuntoInteres") ?? []).map(localName),
      });
    }
  }

  const propiedades: IndexedPropiedad[] = [];

  for (const entity of individuals.values()) {
    if (!entity.types.some((type) => isSubclassOf(type, PROP_URI, hierarchy, subclassMemo))) {
      continue;
    }

    const tipoUri = mostSpecificType(entity.types, hierarchy, PROP_URI);
    const zona = entity.objectProps.get("ubicadaEn")?.[0];

    const propiedad: Propiedad = {
      uri: entity.uri,
      nombre: firstValue(entity.dataProps, "nombrePropiedad") ?? localName(entity.uri),
      descripcion: firstValue(entity.dataProps, "descripcionPropiedad"),
      urlImagen: firstValue(entity.dataProps, "urlImagen"),
      tipo: tipoUri ? localName(tipoUri) : undefined,
      precioNoche: parseNumber(firstValue(entity.dataProps, "precioNoche")),
      capacidadMaxima: parseNumber(firstValue(entity.dataProps, "capacidadMaxima")),
      calificacion: parseNumber(firstValue(entity.dataProps, "calificacionPromedio")),
      ciudad: zona ? zonas.get(zona)?.ciudad : undefined,
      zona: zona ? zonas.get(zona)?.nombreZona : undefined,
      amenidades: (entity.objectProps.get("tieneAmenidad") ?? [])
        .map((uri) => amenidades.get(uri))
        .filter((item): item is Amenidad => Boolean(item)),
      perfiles: (entity.objectProps.get("compatibleCon") ?? [])
        .map((uri) => perfiles.get(uri))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((perfil) => ({
          uri: perfil.uri,
          nombre: perfil.nombre,
          tipoViajero: perfil.tipoViajero,
        })),
    };

    const perfilExtras = (entity.objectProps.get("compatibleCon") ?? [])
      .map((uri) => perfiles.get(uri))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .flatMap((perfil) => [...perfil.propositos, ...perfil.propositoTipos]);

    const zonaExtras = zona
      ? [
          zonas.get(zona)?.tipoZona,
          localName(zona),
          ...(zonas.get(zona)?.puntoInteres ?? []),
        ]
      : [];

    propiedades.push({
      ...propiedad,
      searchable: buildIndex(propiedad, [
        localName(entity.uri),
        tipoUri ? localName(tipoUri) : undefined,
        ...perfilExtras,
        ...zonaExtras,
      ]),
    });
  }

  return propiedades.sort((a, b) => a.uri.localeCompare(b.uri));
}

async function loadCatalog(): Promise<IndexedPropiedad[]> {
  const ontologyStat = await stat(ONTOLOGY_PATH);
  if (cache && cache.mtimeMs === ontologyStat.mtimeMs) {
    return cache.propiedades;
  }

  const xml = await readFile(ONTOLOGY_PATH, "utf8");
  const propiedades = buildCatalog(xml);
  cache = { mtimeMs: ontologyStat.mtimeMs, propiedades };
  return propiedades;
}

function toPublicPropiedad(propiedad: IndexedPropiedad): Propiedad {
  return {
    uri: propiedad.uri,
    nombre: propiedad.nombre,
    descripcion: propiedad.descripcion,
    urlImagen: propiedad.urlImagen,
    tipo: propiedad.tipo,
    precioNoche: propiedad.precioNoche,
    capacidadMaxima: propiedad.capacidadMaxima,
    calificacion: propiedad.calificacion,
    ciudad: propiedad.ciudad,
    zona: propiedad.zona,
    amenidades: propiedad.amenidades,
    perfiles: propiedad.perfiles,
  };
}

export async function searchOntology(query: string): Promise<Propiedad[]> {
  const propiedades = await loadCatalog();
  const term = normalize(query.trim());

  if (!term) {
    return propiedades.map(toPublicPropiedad);
  }

  return propiedades.filter((propiedad) => propiedad.searchable.includes(term)).map(toPublicPropiedad);
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

function countMatchesInList(
  values: string[],
  candidates: string[],
): number {
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

  if (hasCityZoneMatch) {
    return filters;
  }

  return { ...filters, zonas: [] };
}

export async function sanitizeStructuredFilters(
  filters: StructuredFilters,
): Promise<StructuredFilters> {
  const propiedades = await loadCatalog();
  return sanitizeFiltersForCatalog(filters, propiedades);
}

export async function applyStructuredSearch(
  filters: StructuredFilters,
): Promise<Propiedad[]> {
  const propiedades = await loadCatalog();
  const sanitizedFilters = sanitizeFiltersForCatalog(filters, propiedades);
  const normalizedKeywords = (filters.keywords ?? [])
    .map((k) => normalize(k.trim()))
    .filter(Boolean);

  const precioMaxConMargen =
    sanitizedFilters.precioMax !== undefined ? sanitizedFilters.precioMax * 1.25 : undefined;
  const precioMinConMargen =
    sanitizedFilters.precioMin !== undefined ? sanitizedFilters.precioMin : undefined;

  const shouldApplyZoneFilter =
    hasCandidates(sanitizedFilters.zonas) &&
    (!hasCandidates(sanitizedFilters.ciudades) ||
      propiedades.some(
        (propiedad) =>
          matchesAny(propiedad.ciudad, sanitizedFilters.ciudades) &&
          matchesAny(propiedad.zona, sanitizedFilters.zonas),
      ));

  const hardFiltered = propiedades.filter((propiedad) => {
    if (hasCandidates(sanitizedFilters.ciudades) && !matchesAny(propiedad.ciudad, sanitizedFilters.ciudades)) {
      return false;
    }
    if (precioMaxConMargen !== undefined) {
      if (propiedad.precioNoche === undefined) return false;
      if (propiedad.precioNoche > precioMaxConMargen) return false;
    }
    if (precioMinConMargen !== undefined) {
      if (propiedad.precioNoche === undefined) return false;
      if (propiedad.precioNoche < precioMinConMargen) return false;
    }
    if (sanitizedFilters.capacidadMin !== undefined) {
      if (
        propiedad.capacidadMaxima === undefined ||
        propiedad.capacidadMaxima < sanitizedFilters.capacidadMin
      ) {
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

  type Scored = { propiedad: IndexedPropiedad; score: number };
  const scored: Scored[] = rankingPool.map((propiedad) => {
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
      score +=
        countMatchesInList(tipos, sanitizedFilters.tiposViajero ?? []) * 2;
    }

    if (hasCandidates(sanitizedFilters.categoriasAmenidad)) {
      const cats = propiedad.amenidades
        .map((a) => a.categoria)
        .filter((c): c is string => Boolean(c));
      score += countMatchesInList(
        cats,
        sanitizedFilters.categoriasAmenidad ?? [],
      );
    }

    if (hasCandidates(sanitizedFilters.amenidades)) {
      const nombres = propiedad.amenidades.map((a) => a.nombre);
      score +=
        countMatchesInList(nombres, sanitizedFilters.amenidades ?? []) * 3;
    }

    if (sanitizedFilters.calificacionMin !== undefined) {
      if (
        propiedad.calificacion !== undefined &&
        propiedad.calificacion >= sanitizedFilters.calificacionMin
      ) {
        score += 2;
      } else {
        score -= 1;
      }
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
