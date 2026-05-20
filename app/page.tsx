"use client";

import { useState, type FormEvent } from "react";

type Amenidad = { uri: string; nombre: string; categoria?: string };
type Perfil = { uri: string; nombre: string; tipoViajero?: string };
type Propiedad = {
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

const SUGERENCIAS = [
  "wifi",
  "familia",
  "vacacional",
  "conectividad",
  "centro",
  "villa",
  "apartamento",
];

function agruparPorCategoria(amenidades: Amenidad[]) {
  const map = new Map<string, Amenidad[]>();
  for (const a of amenidades) {
    const key = a.categoria ?? "Otros";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function Home() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Propiedad[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscado, setBuscado] = useState(false);

  async function buscar(termino: string) {
    setCargando(true);
    setError(null);
    setBuscado(true);

    try {
      const params = new URLSearchParams();
      if (termino.trim()) params.set("q", termino.trim());
      const res = await fetch(`/api/buscar?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error de búsqueda");
      setResultados(data.propiedades ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setResultados([]);
    } finally {
      setCargando(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    buscar(q);
  }

  function onSugerencia(s: string) {
    setQ(s);
    buscar(s);
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Buscador semántico de propiedades
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Escribe lo que buscas: amenidad, perfil, ciudad, tipo de propiedad,
            propósito de viaje o categoría. La búsqueda navega la ontología.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Buscar
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="p. ej. wifi, familia, vacacional, La Paz, villa…"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200"
            />
          </label>

          <button
            type="submit"
            disabled={cargando}
            className="h-10 rounded-lg bg-zinc-900 px-5 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {cargando ? "Buscando…" : "Buscar"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            Sugerencias:
          </span>
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSugerencia(s)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {buscado && !cargando && !error && (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            {resultados.length} resultado
            {resultados.length === 1 ? "" : "s"}
          </p>
        )}

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          {resultados.map((p) => (
            <article
              key={p.uri}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {p.nombre}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {p.tipo && (
                      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-white dark:bg-zinc-50 dark:text-zinc-900">
                        {p.tipo}
                      </span>
                    )}
                    {(p.ciudad || p.zona) && (
                      <span>
                        {[p.zona, p.ciudad].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                </div>

                {p.precioNoche !== undefined && (
                  <div className="text-right">
                    <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      ${p.precioNoche}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      por noche
                    </div>
                  </div>
                )}
              </div>

              {p.descripcion && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {p.descripcion}
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                {p.capacidadMaxima !== undefined && (
                  <span>👥 hasta {p.capacidadMaxima} huéspedes</span>
                )}
                {p.calificacion !== undefined && (
                  <span>★ {p.calificacion.toFixed(1)}</span>
                )}
              </div>

              {p.amenidades.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Amenidades
                  </h3>
                  <div className="mt-2 space-y-2">
                    {agruparPorCategoria(p.amenidades).map(([cat, items]) => (
                      <div key={cat} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                          {cat}:
                        </span>
                        {items.map((a) => (
                          <span
                            key={a.uri}
                            className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          >
                            {a.nombre}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {p.perfiles.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Compatible con
                  </h3>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {p.perfiles.map((perf) => (
                      <li
                        key={perf.uri}
                        className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                        title={perf.tipoViajero}
                      >
                        {perf.nombre}
                        {perf.tipoViajero && (
                          <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                            ({perf.tipoViajero})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </section>

        {buscado && !cargando && !error && resultados.length === 0 && (
          <p className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
            No se encontraron propiedades.
          </p>
        )}
      </div>
    </main>
  );
}
