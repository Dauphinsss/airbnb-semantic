import type { Propiedad } from "./ontology";

export type AIFilters = {
  keywords: string[];
  ciudades: string[];
  zonas: string[];
  tiposPropiedad: string[];
  tiposViajero: string[];
  categoriasAmenidad: string[];
  amenidades: string[];
  precioMin?: number;
  precioMax?: number;
  capacidadMin?: number;
  calificacionMin?: number;
};

export type AIResult = {
  filters: AIFilters;
  raw?: unknown;
  source: "deepseek" | "fallback";
  explanation?: string;
};

const EMPTY_FILTERS: AIFilters = {
  keywords: [],
  ciudades: [],
  zonas: [],
  tiposPropiedad: [],
  tiposViajero: [],
  categoriasAmenidad: [],
  amenidades: [],
};

function uniqueValues(values: Array<string | undefined>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    if (value) set.add(value);
  }
  return [...set].sort();
}

function buildVocabulary(propiedades: Propiedad[]) {
  const zonasPorCiudad = propiedades.reduce<Record<string, string[]>>(
    (acc, propiedad) => {
      if (!propiedad.ciudad || !propiedad.zona) return acc;
      acc[propiedad.ciudad] ??= [];
      if (!acc[propiedad.ciudad].includes(propiedad.zona)) {
        acc[propiedad.ciudad].push(propiedad.zona);
      }
      return acc;
    },
    {},
  );

  for (const zonas of Object.values(zonasPorCiudad)) {
    zonas.sort();
  }

  return {
    ciudades: uniqueValues(propiedades.map((p) => p.ciudad)),
    zonas: uniqueValues(propiedades.map((p) => p.zona)),
    zonasPorCiudad,
    tiposPropiedad: uniqueValues(propiedades.map((p) => p.tipo)),
    tiposViajero: uniqueValues(
      propiedades.flatMap((p) => p.perfiles.map((perf) => perf.tipoViajero)),
    ),
    categoriasAmenidad: uniqueValues(
      propiedades.flatMap((p) => p.amenidades.map((a) => a.categoria)),
    ),
    amenidades: uniqueValues(
      propiedades.flatMap((p) => p.amenidades.map((a) => a.nombre)),
    ),
  };
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function coerceNumber(value: unknown): number | undefined {
  let parsed: number | undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    parsed = value;
  } else if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) parsed = n;
  }
  if (parsed === undefined || parsed <= 0) return undefined;
  return parsed;
}

function normalizeFilters(parsed: unknown): AIFilters {
  if (!parsed || typeof parsed !== "object") return { ...EMPTY_FILTERS };
  const obj = parsed as Record<string, unknown>;
  return {
    keywords: coerceStringArray(obj.keywords),
    ciudades: coerceStringArray(obj.ciudades),
    zonas: coerceStringArray(obj.zonas),
    tiposPropiedad: coerceStringArray(obj.tiposPropiedad),
    tiposViajero: coerceStringArray(obj.tiposViajero),
    categoriasAmenidad: coerceStringArray(obj.categoriasAmenidad),
    amenidades: coerceStringArray(obj.amenidades),
    precioMin: coerceNumber(obj.precioMin),
    precioMax: coerceNumber(obj.precioMax),
    capacidadMin: coerceNumber(obj.capacidadMin),
    calificacionMin: coerceNumber(obj.calificacionMin),
  };
}

function fallbackFromQuery(query: string): AIResult {
  const keywords = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  return {
    filters: { ...EMPTY_FILTERS, keywords },
    source: "fallback",
  };
}

export async function interpretQuery(
  query: string,
  propiedades: Propiedad[],
  signal?: AbortSignal,
): Promise<AIResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { filters: { ...EMPTY_FILTERS }, source: "fallback" };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return fallbackFromQuery(trimmed);
  }

  const vocab = buildVocabulary(propiedades);
  const systemPrompt = `Eres un asistente que convierte consultas en español sobre alojamientos en filtros estructurados JSON.
Solo debes responder con un objeto JSON válido, sin texto extra ni bloques markdown.

El JSON debe tener este formato exacto (campos pueden ser arreglos vacíos u omitidos cuando no aplique):
{
  "keywords": string[],
  "ciudades": string[],
  "zonas": string[],
  "tiposPropiedad": string[],
  "tiposViajero": string[],
  "categoriasAmenidad": string[],
  "amenidades": string[],
  "precioMin": number,
  "precioMax": number,
  "capacidadMin": number,
  "calificacionMin": number,
  "explanation": string
}

Reglas IMPORTANTES:
- Los precios del catálogo están en bolivianos (Bs/BOB) por noche. Rangos típicos del catálogo:
  * Habitaciones/hostels compartidos: 40-200 Bs
  * Apartamentos y casas medias: 200-600 Bs
  * Premium/villas de lujo: 600-3200 Bs
- Sé CONSERVADOR con los filtros. Solo incluye un campo si el usuario lo pide CLARAMENTE. Cuando dudes, omite el campo (o ponlo como arreglo vacío). NUNCA pongas 0 en campos numéricos — omítelos.
- Usa SOLO valores existentes en el vocabulario proporcionado. Si la consulta menciona algo no presente, NO inventes — ponlo en "keywords".
- Para "zonas", respeta la ciudad. Si el usuario dice "centro de Cochabamba", usa una zona de zonasPorCiudad.Cochabamba si existe; no uses centros de otra ciudad.
- "barato/económico/accesible" sin monto explícito → precioMax 350 (apartamentos cómodos). Para "muy barato/hostel/mochilero" → precioMax 150.
- "lujoso/premium/caro" sin monto → precioMin 800.
- "capacidadMin" SOLO cuando se mencionan N personas/huéspedes explícitos. Para "familia" sin número, NO pongas capacidadMin.
- "calificacionMin" SOLO si pide "buena calificación", "bien calificado", "top rated": 4.5. Si no, omítelo.
- "tiposViajero" SOLO si el usuario menciona claramente perfil (familia/pareja/amigos/negocios/estudiante). En duda, deja vacío.
- "amenidades" lista solo las que el usuario menciona EXPLÍCITAMENTE (wifi, piscina, parking, cocina, etc.).
- En "keywords" incluye términos descriptivos que no encajen en otros campos (ej: "centro", "vista", "moderno", "colonial").
- "explanation" es una frase breve en español describiendo qué se interpretó.

Vocabulario disponible:
- ciudades: ${JSON.stringify(vocab.ciudades)}
- zonas: ${JSON.stringify(vocab.zonas)}
- zonasPorCiudad: ${JSON.stringify(vocab.zonasPorCiudad)}
- tiposPropiedad: ${JSON.stringify(vocab.tiposPropiedad)}
- tiposViajero: ${JSON.stringify(vocab.tiposViajero)}
- categoriasAmenidad: ${JSON.stringify(vocab.categoriasAmenidad)}
- amenidades: ${JSON.stringify(vocab.amenidades)}`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: trimmed },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 500,
      }),
      signal,
    });

    if (!response.ok) {
      return fallbackFromQuery(trimmed);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallbackFromQuery(trimmed);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return fallbackFromQuery(trimmed);
    }

    const filters = normalizeFilters(parsed);
    const explanation =
      parsed && typeof parsed === "object" && typeof (parsed as Record<string, unknown>).explanation === "string"
        ? ((parsed as Record<string, unknown>).explanation as string)
        : undefined;

    return { filters, raw: parsed, source: "deepseek", explanation };
  } catch {
    return fallbackFromQuery(trimmed);
  }
}
