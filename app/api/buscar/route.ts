import { type NextRequest } from "next/server";

import { interpretQuery } from "./ai";
import {
  applyStructuredSearch,
  getCatalog,
  sanitizeStructuredFilters,
  searchOntology,
} from "./ontology";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const useAi = request.nextUrl.searchParams.get("ai") !== "0";

  try {
    if (!q) {
      const propiedades = await searchOntology("");
      return Response.json({
        propiedades,
        total: propiedades.length,
        ai: { source: "fallback", filters: null, explanation: null },
      });
    }

    if (!useAi) {
      const propiedades = await searchOntology(q);
      return Response.json({
        propiedades,
        total: propiedades.length,
        ai: { source: "fallback", filters: null, explanation: null },
      });
    }

    const catalogo = await getCatalog();
    const ai = await interpretQuery(q, catalogo);
    const filters = await sanitizeStructuredFilters(ai.filters);

    const propiedades =
      ai.source === "deepseek"
        ? await applyStructuredSearch(filters)
        : await searchOntology(q);

    return Response.json({
      propiedades,
      total: propiedades.length,
      ai: {
        source: ai.source,
        filters,
        explanation: ai.explanation ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ error: message, propiedades: [] }, { status: 500 });
  }
}
