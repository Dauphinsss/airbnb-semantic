import { type NextRequest } from "next/server";
import { normalizeLocale } from "@/lib/i18n";

import { interpretQuery } from "./ai";
import {
  applyStructuredSearch,
  getCatalog,
  sanitizeStructuredFilters,
  searchOntology,
} from "./ontology";
import { searchWikidata } from "./wikidata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const useAi = request.nextUrl.searchParams.get("ai") !== "0";
  const locale = normalizeLocale(request.nextUrl.searchParams.get("lang"));
  const mode = request.nextUrl.searchParams.get("mode") ?? "offline";

  try {
    if (mode === "online") {
      const propiedades = await searchWikidata(q, locale);
      return Response.json({
        propiedades,
        total: propiedades.length,
        ai: { source: "fallback", filters: null, explanation: null },
      });
    }

    if (!q) {
      const propiedades = await searchOntology("", locale);
      return Response.json({
        propiedades,
        total: propiedades.length,
        ai: { source: "fallback", filters: null, explanation: null },
      });
    }

    if (!useAi) {
      const propiedades = await searchOntology(q, locale);
      return Response.json({
        propiedades,
        total: propiedades.length,
        ai: { source: "fallback", filters: null, explanation: null },
      });
    }

    const catalogo = await getCatalog(locale);
    const ai = await interpretQuery(q, catalogo, locale);
    const filters = await sanitizeStructuredFilters(ai.filters, locale);

    const propiedades =
      ai.source === "deepseek"
        ? await applyStructuredSearch(filters, locale)
        : await searchOntology(q, locale);

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
