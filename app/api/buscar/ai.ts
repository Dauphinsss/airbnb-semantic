import type { Propiedad } from "./ontology";
import type { Locale } from "@/lib/i18n";

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
  locale: Locale,
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
  const systemPrompt =
    locale === "en"
      ? `You convert English accommodation queries into structured JSON filters.
Only return a valid JSON object, with no extra text and no markdown.

The JSON must match this exact shape (fields may be empty arrays or omitted when not applicable):
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

IMPORTANT rules:
- Catalog prices are in Bolivian bolivianos (Bs/BOB) per night. Typical ranges:
  * Shared rooms/hostels: 40-200 Bs
  * Standard apartments and houses: 200-600 Bs
  * Premium or luxury villas: 600-3200 Bs
- Be CONSERVATIVE with filters. Only include a field if the user clearly asks for it. If unsure, omit the field or leave the array empty. Never set numeric fields to 0.
- Use ONLY values that exist in the provided vocabulary. If the user mentions something missing, place it in "keywords".
- For "zonas", respect the city. If the user says "downtown Cochabamba", use a zone from zonasPorCiudad.Cochabamba if it exists.
- "cheap/affordable/budget" without a number -> precioMax 350. "very cheap/hostel/backpacker" -> precioMax 150.
- "luxury/premium/expensive" without a number -> precioMin 800.
- Set "capacidadMin" ONLY when the user explicitly mentions a number of guests.
- Set "calificacionMin" ONLY for requests like "top rated", "highly rated", "good rating": 4.5.
- Use "tiposViajero" ONLY when the user clearly indicates a profile such as family, couple, friends, business, student.
- Put in "amenidades" only the amenities explicitly requested by the user.
- Put descriptive terms that do not fit elsewhere into "keywords".
- "explanation" must be a short sentence in English describing the interpretation.

Available vocabulary:
- ciudades: ${JSON.stringify(vocab.ciudades)}
- zonas: ${JSON.stringify(vocab.zonas)}
- zonasPorCiudad: ${JSON.stringify(vocab.zonasPorCiudad)}
- tiposPropiedad: ${JSON.stringify(vocab.tiposPropiedad)}
- tiposViajero: ${JSON.stringify(vocab.tiposViajero)}
- categoriasAmenidad: ${JSON.stringify(vocab.categoriasAmenidad)}
- amenidades: ${JSON.stringify(vocab.amenidades)}`
      : locale === "fr"
        ? `Vous convertissez des recherches de logements en francais en filtres JSON structures.
Retournez uniquement un objet JSON valide, sans texte supplementaire ni markdown.

Le JSON doit respecter exactement cette structure (les champs peuvent etre des tableaux vides ou etre omis si non pertinents) :
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

Regles IMPORTANTES :
- Les prix du catalogue sont en bolivianos (Bs/BOB) par nuit. Fourchettes typiques :
  * Chambres partagees et hostels : 40-200 Bs
  * Appartements et maisons standards : 200-600 Bs
  * Villas premium ou de luxe : 600-3200 Bs
- Soyez CONSERVATEUR avec les filtres. N'incluez un champ que si l'utilisateur le demande clairement. En cas de doute, omettez le champ ou laissez un tableau vide. Ne mettez jamais 0 dans les champs numeriques.
- Utilisez UNIQUEMENT des valeurs presentes dans le vocabulaire fourni. Si un terme n'existe pas, placez-le dans "keywords".
- Pour "zonas", respectez la ville. Si l'utilisateur dit "centre de Cochabamba", utilisez une zone de zonasPorCiudad.Cochabamba si elle existe.
- "bon marche / economique / abordable" sans montant explicite -> precioMax 350. "tres bon marche / hostel / routard" -> precioMax 150.
- "luxe / premium / cher" sans montant -> precioMin 800.
- Renseignez "capacidadMin" UNIQUEMENT si l'utilisateur mentionne explicitement un nombre de voyageurs.
- Renseignez "calificacionMin" UNIQUEMENT pour des requetes comme "tres bien note" ou "top rated" : 4.5.
- Utilisez "tiposViajero" uniquement si le profil est clairement mentionne : famille, couple, amis, affaires, etudiant.
- Placez dans "amenidades" seulement les equipements explicitement demandes.
- Placez dans "keywords" les termes descriptifs qui ne rentrent pas dans les autres champs.
- "explanation" doit etre une phrase breve en francais expliquant l'interpretation.

Vocabulaire disponible :
- ciudades: ${JSON.stringify(vocab.ciudades)}
- zonas: ${JSON.stringify(vocab.zonas)}
- zonasPorCiudad: ${JSON.stringify(vocab.zonasPorCiudad)}
- tiposPropiedad: ${JSON.stringify(vocab.tiposPropiedad)}
- tiposViajero: ${JSON.stringify(vocab.tiposViajero)}
- categoriasAmenidad: ${JSON.stringify(vocab.categoriasAmenidad)}
- amenidades: ${JSON.stringify(vocab.amenidades)}`
      : `Eres un asistente que convierte consultas en español sobre alojamientos en filtros estructurados JSON.
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
- Sé CONSERVADOR con los filtros. Solo incluye un campo si el usuario lo pide CLARAMENTE. Cuando dudes, omite el campo (o ponlo como arreglo vacío). NUNCA pongas 0 en campos numéricos; omítelos.
- Usa SOLO valores existentes en el vocabulario proporcionado. Si la consulta menciona algo no presente, NO inventes; ponlo en "keywords".
- Para "zonas", respeta la ciudad. Si el usuario dice "centro de Cochabamba", usa una zona de zonasPorCiudad.Cochabamba si existe.
- "barato/economico/accesible" sin monto explicito -> precioMax 350. Para "muy barato/hostel/mochilero" -> precioMax 150.
- "lujoso/premium/caro" sin monto -> precioMin 800.
- "capacidadMin" SOLO cuando se mencionan N personas o huespedes de forma explicita.
- "calificacionMin" SOLO si pide "buena calificacion", "bien calificado", "top rated": 4.5.
- "tiposViajero" SOLO si el usuario menciona claramente perfil (familia, pareja, amigos, negocios, estudiante).
- "amenidades" lista solo las que el usuario menciona explicitamente.
- En "keywords" incluye terminos descriptivos que no encajen en otros campos.
- "explanation" es una frase breve en español describiendo que se interpreto.

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
