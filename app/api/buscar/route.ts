import { type NextRequest } from "next/server";
import { normalizeLocale } from "@/lib/i18n";

import { interpretQuery } from "./ai";
import {
  applyStructuredSearch,
  getCatalog,
  sanitizeStructuredFilters,
  searchOntology,
} from "./ontology";
import {
  applyStructuredOnlineSearch,
  dedupeOnlineResults,
  searchOnline,
  searchOnlineSource,
  type OnlineSource,
} from "./online";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasStructuredCriteria(filters: Awaited<ReturnType<typeof interpretQuery>>["filters"]): boolean {
  return (
    (filters.keywords?.length ?? 0) > 0 ||
    (filters.ciudades?.length ?? 0) > 0 ||
    (filters.zonas?.length ?? 0) > 0 ||
    (filters.tiposPropiedad?.length ?? 0) > 0 ||
    (filters.tiposViajero?.length ?? 0) > 0 ||
    (filters.categoriasAmenidad?.length ?? 0) > 0 ||
    (filters.amenidades?.length ?? 0) > 0 ||
    filters.precioMin !== undefined ||
    filters.precioMax !== undefined ||
    filters.capacidadMin !== undefined ||
    filters.calificacionMin !== undefined
  );
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const useAi = request.nextUrl.searchParams.get("ai") !== "0";
  const locale = normalizeLocale(request.nextUrl.searchParams.get("lang"));
  const mode = request.nextUrl.searchParams.get("mode") ?? "offline";
  const source = request.nextUrl.searchParams.get("source") as OnlineSource | null;

  try {
    if (mode === "online") {
      if (source) {
        if (!q) {
          const propiedades = await searchOnlineSource(source, "", locale);
          return Response.json({
            propiedades,
            total: propiedades.length,
            ai: { source: "fallback", filters: null, explanation: null },
          });
        }

        if (!useAi) {
          const propiedades = await searchOnlineSource(source, q, locale);
          return Response.json({
            propiedades,
            total: propiedades.length,
            ai: { source: "fallback", filters: null, explanation: null },
          });
        }

        const [baseCatalog, queryCatalog] = await Promise.all([
          searchOnlineSource(source, source === "wikidata_context" ? q : "", locale),
          searchOnlineSource(source, q, locale),
        ]);

        const catalogo = dedupeOnlineResults([...baseCatalog, ...queryCatalog]);
        const candidatos = dedupeOnlineResults(queryCatalog);
        const ai = await interpretQuery(q, catalogo, locale);
        const propiedades =
          ai.source === "deepseek" && hasStructuredCriteria(ai.filters)
            ? applyStructuredOnlineSearch(ai.filters, candidatos)
            : candidatos;

        return Response.json({
          propiedades,
          total: propiedades.length,
          ai: {
            source: ai.source,
            filters: ai.filters,
            explanation: ai.explanation ?? null,
          },
        });
      }

      if (!q) {
        const propiedades = await searchOnline("", locale);
        return Response.json({
          propiedades,
          total: propiedades.length,
          ai: { source: "fallback", filters: null, explanation: null },
        });
      }

      if (!useAi) {
        const propiedades = await searchOnline(q, locale);
        return Response.json({
          propiedades,
          total: propiedades.length,
          ai: { source: "fallback", filters: null, explanation: null },
        });
      }

      const [baseCatalog, queryCatalog] = await Promise.all([
        searchOnline("", locale),
        searchOnline(q, locale),
      ]);

      const catalogo = dedupeOnlineResults([...baseCatalog, ...queryCatalog]);
      const candidatos = dedupeOnlineResults(queryCatalog);
      const ai = await interpretQuery(q, catalogo, locale);
      const propiedades =
        ai.source === "deepseek" && hasStructuredCriteria(ai.filters)
          ? applyStructuredOnlineSearch(ai.filters, candidatos)
          : candidatos;

      return Response.json({
        propiedades,
        total: propiedades.length,
        ai: {
          source: ai.source,
          filters: ai.filters,
          explanation: ai.explanation ?? null,
        },
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
