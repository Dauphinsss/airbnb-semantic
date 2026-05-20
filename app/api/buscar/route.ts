import { type NextRequest } from "next/server";

const FUSEKI_ENDPOINT = "http://localhost:3030/airbnb/sparql";
const ONT = "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/";

type SparqlBinding = Record<string, { type: string; value: string }>;
type SparqlResponse = { results: { bindings: SparqlBinding[] } };

export type Amenidad = { uri: string; nombre: string; categoria?: string };
export type Perfil = { uri: string; nombre: string; tipoViajero?: string };
export type Propiedad = {
  uri: string;
  nombre: string;
  descripcion?: string;
  tipo?: string;
  precioNoche?: number;
  capacidadMaxima?: number;
  calificacion?: number;
  ciudad?: string;
  zona?: string;
  amenidades: Amenidad[];
  perfiles: Perfil[];
};

function localName(uri: string): string {
  const i = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return uri.slice(i + 1);
}

function escLit(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function num(b: SparqlBinding, key: string): number | undefined {
  const v = b[key]?.value;
  return v === undefined ? undefined : Number(v);
}

function buildQuery(q: string): string {
  const term = q.trim();
  const filterClause = term
    ? `
  {
    ?p :nombrePropiedad ?nombreLit .
    FILTER(CONTAINS(LCASE(STR(?nombreLit)), "${escLit(term.toLowerCase())}"))
  } UNION {
    ?p :descripcionPropiedad ?descLit .
    FILTER(CONTAINS(LCASE(STR(?descLit)), "${escLit(term.toLowerCase())}"))
  } UNION {
    ?p rdf:type ?clase .
    ?clase rdfs:subClassOf* :Propiedad .
    FILTER(CONTAINS(LCASE(STR(?clase)), "${escLit(term.toLowerCase())}"))
  } UNION {
    ?p :tieneAmenidad ?amMatch .
    {
      FILTER(CONTAINS(LCASE(STR(?amMatch)), "${escLit(term.toLowerCase())}"))
    } UNION {
      ?amMatch :categoriaAmenidad ?catLit .
      FILTER(CONTAINS(LCASE(STR(?catLit)), "${escLit(term.toLowerCase())}"))
    } UNION {
      ?amMatch :nombreAmenidad ?amNomLit .
      FILTER(CONTAINS(LCASE(STR(?amNomLit)), "${escLit(term.toLowerCase())}"))
    }
  } UNION {
    ?p :compatibleCon ?perfMatch .
    {
      FILTER(CONTAINS(LCASE(STR(?perfMatch)), "${escLit(term.toLowerCase())}"))
    } UNION {
      ?perfMatch :tipoViajero ?tvLit .
      FILTER(CONTAINS(LCASE(STR(?tvLit)), "${escLit(term.toLowerCase())}"))
    } UNION {
      ?perfMatch :tienePropositoViaje ?prop .
      ?prop :tipoPropositoViaje ?propTipoLit .
      FILTER(CONTAINS(LCASE(STR(?propTipoLit)), "${escLit(term.toLowerCase())}"))
    }
  } UNION {
    ?p :ubicadaEn ?zonaMatch .
    {
      ?zonaMatch :ciudad ?ciudadLit .
      FILTER(CONTAINS(LCASE(STR(?ciudadLit)), "${escLit(term.toLowerCase())}"))
    } UNION {
      ?zonaMatch :nombreZona ?nzLit .
      FILTER(CONTAINS(LCASE(STR(?nzLit)), "${escLit(term.toLowerCase())}"))
    } UNION {
      ?zonaMatch :tipoZona ?tzLit .
      FILTER(CONTAINS(LCASE(STR(?tzLit)), "${escLit(term.toLowerCase())}"))
    }
  }`
    : "";

  return `PREFIX : <${ONT}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?p ?nombre ?descripcion ?tipo ?precio ?capacidad ?calificacion
                ?ciudad ?nombreZona
                ?amenidad ?nombreAmenidad ?categoria
                ?perfil ?tipoViajero
WHERE {
  ?p rdf:type/rdfs:subClassOf* :Propiedad .
  ?p rdf:type ?tipo .
  ?tipo rdfs:subClassOf* :Propiedad .
  FILTER(?tipo != :Propiedad && ?tipo != :AlojamientoCompleto && ?tipo != :AlojamientoHabitacion)

  OPTIONAL { ?p :nombrePropiedad ?nombre . }
  OPTIONAL { ?p :descripcionPropiedad ?descripcion . }
  OPTIONAL { ?p :precioNoche ?precio . }
  OPTIONAL { ?p :capacidadMaxima ?capacidad . }
  OPTIONAL { ?p :calificacionPromedio ?calificacion . }
  OPTIONAL {
    ?p :ubicadaEn ?zona .
    OPTIONAL { ?zona :ciudad ?ciudad . }
    OPTIONAL { ?zona :nombreZona ?nombreZona . }
  }
  OPTIONAL {
    ?p :tieneAmenidad ?amenidad .
    OPTIONAL { ?amenidad :nombreAmenidad ?nombreAmenidad . }
    OPTIONAL { ?amenidad :categoriaAmenidad ?categoria . }
  }
  OPTIONAL {
    ?p :compatibleCon ?perfil .
    OPTIONAL { ?perfil :tipoViajero ?tipoViajero . }
  }
${filterClause}
}
ORDER BY ?p`;
}

async function runSparql(query: string): Promise<SparqlResponse> {
  const res = await fetch(FUSEKI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-query",
      Accept: "application/sparql-results+json",
    },
    body: query,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Fuseki ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as SparqlResponse;
}

function group(bindings: SparqlBinding[]): Propiedad[] {
  const map = new Map<string, Propiedad>();
  const amenSeen = new Map<string, Set<string>>();
  const perfSeen = new Map<string, Set<string>>();

  for (const b of bindings) {
    const uri = b.p?.value;
    if (!uri) continue;

    let item = map.get(uri);
    if (!item) {
      item = {
        uri,
        nombre: b.nombre?.value ?? localName(uri),
        descripcion: b.descripcion?.value,
        tipo: b.tipo ? localName(b.tipo.value) : undefined,
        precioNoche: num(b, "precio"),
        capacidadMaxima: num(b, "capacidad"),
        calificacion: num(b, "calificacion"),
        ciudad: b.ciudad?.value,
        zona: b.nombreZona?.value,
        amenidades: [],
        perfiles: [],
      };
      map.set(uri, item);
      amenSeen.set(uri, new Set());
      perfSeen.set(uri, new Set());
    }

    const amUri = b.amenidad?.value;
    if (amUri && !amenSeen.get(uri)!.has(amUri)) {
      amenSeen.get(uri)!.add(amUri);
      item.amenidades.push({
        uri: amUri,
        nombre: b.nombreAmenidad?.value ?? localName(amUri),
        categoria: b.categoria?.value,
      });
    }

    const perfUri = b.perfil?.value;
    if (perfUri && !perfSeen.get(uri)!.has(perfUri)) {
      perfSeen.get(uri)!.add(perfUri);
      item.perfiles.push({
        uri: perfUri,
        nombre: localName(perfUri),
        tipoViajero: b.tipoViajero?.value,
      });
    }
  }

  return [...map.values()];
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

  try {
    const data = await runSparql(buildQuery(q));
    const propiedades = group(data.results.bindings);
    return Response.json({ propiedades, total: propiedades.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ error: message, propiedades: [] }, { status: 500 });
  }
}
