"use client";

import { useState, type FormEvent } from "react";
import {
  Search,
  Loader2,
  MapPin,
  Users,
  Star,
  Home as HomeIcon,
  Wifi,
  Snowflake,
  ChefHat,
  Coffee,
  Sparkles,
  ShieldCheck,
  Waves,
  Car,
  Laptop,
  Accessibility,
  Building2,
  Palmtree,
  BedDouble,
  UserRound,
  Tag,
  Heart,
  Briefcase,
  GraduationCap,
  Plane,
  Sun,
} from "lucide-react";

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

const SUGERENCIAS: { label: string; icon: typeof Wifi }[] = [
  { label: "wifi", icon: Wifi },
  { label: "familia", icon: Heart },
  { label: "vacacional", icon: Sun },
  { label: "conectividad", icon: Laptop },
  { label: "centro", icon: MapPin },
  { label: "villa", icon: HomeIcon },
  { label: "apartamento", icon: Building2 },
];

function iconoAmenidad(nombre: string) {
  const n = nombre.toLowerCase();
  if (n.includes("wifi")) return Wifi;
  if (n.includes("aire")) return Snowflake;
  if (n.includes("cocina")) return ChefHat;
  if (n.includes("desayuno")) return Coffee;
  if (n.includes("limpieza")) return Sparkles;
  if (n.includes("piscina")) return Waves;
  if (n.includes("parking") || n.includes("estacionamiento")) return Car;
  if (n.includes("trabajo") || n.includes("espacio")) return Laptop;
  if (n.includes("seguridad")) return ShieldCheck;
  if (n.includes("accesibilidad")) return Accessibility;
  return Tag;
}

function iconoCategoria(categoria: string) {
  const c = categoria.toLowerCase();
  if (c.includes("conectividad")) return Wifi;
  if (c.includes("confort")) return Snowflake;
  if (c.includes("cocina")) return ChefHat;
  if (c.includes("alimentacion")) return Coffee;
  if (c.includes("recreativa")) return Waves;
  if (c.includes("transporte")) return Car;
  if (c.includes("trabajo")) return Laptop;
  if (c.includes("seguridad")) return ShieldCheck;
  if (c.includes("accesibilidad")) return Accessibility;
  if (c.includes("servicio")) return Sparkles;
  return Tag;
}

function iconoTipoViajero(tipo?: string) {
  if (!tipo) return UserRound;
  const t = tipo.toLowerCase();
  if (t.includes("familia")) return Heart;
  if (t.includes("pareja")) return Heart;
  if (t.includes("grupoamigos") || t.includes("grupo")) return Users;
  if (t.includes("negocios")) return Briefcase;
  if (t.includes("estudiantil")) return GraduationCap;
  if (t.includes("individual")) return UserRound;
  return UserRound;
}

function iconoTipoPropiedad(tipo?: string) {
  if (!tipo) return HomeIcon;
  const t = tipo.toLowerCase();
  if (t.includes("apartamento")) return Building2;
  if (t.includes("villa")) return Palmtree;
  if (t.includes("casa")) return HomeIcon;
  if (t.includes("habitacion")) return BedDouble;
  return HomeIcon;
}

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
        <header className="animate-fade-up mb-10">
          <h1 className="flex items-baseline gap-3 text-5xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50">
            <Sparkles className="animate-pulse-glow h-8 w-8 translate-y-1 text-emerald-500" />
            <span>
              Buscador <span className="font-serif italic text-emerald-600 dark:text-emerald-400">semántico</span>
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Escribe lo que buscas: amenidad, perfil, ciudad, tipo de propiedad,
            propósito de viaje o categoría. La búsqueda navega la ontología.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="animate-fade-up flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow focus-within:shadow-md dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Buscar
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="wifi, familia, vacacional, La Paz, villa…"
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={cargando}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 font-medium text-white shadow-sm transition-all duration-200 hover:bg-zinc-700 hover:shadow-md active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {cargando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Buscar
              </>
            )}
          </button>
        </form>

        <div className="animate-fade-up mt-3 flex flex-wrap items-center gap-2" style={{ animationDelay: "80ms" }}>
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            Sugerencias:
          </span>
          {SUGERENCIAS.map(({ label, icon: Icon }, i) => (
            <button
              key={label}
              type="button"
              onClick={() => onSugerencia(label)}
              style={{ animationDelay: `${120 + i * 40}ms` }}
              className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-100 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="animate-fade-up mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {buscado && !cargando && !error && (
          <p key={resultados.length} className="animate-fade-in mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            {resultados.length} resultado
            {resultados.length === 1 ? "" : "s"}
          </p>
        )}

        {cargando && (
          <section className="mt-4 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-fade-up flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-5 w-2/3 rounded" />
                    <div className="skeleton h-3 w-1/3 rounded" />
                  </div>
                  <div className="skeleton h-8 w-16 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-5/6 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="skeleton h-5 w-20 rounded-full" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-5 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          {!cargando && resultados.map((p, i) => {
            const TipoIcon = iconoTipoPropiedad(p.tipo);
            return (
              <article
                key={p.uri}
                style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
                className="animate-fade-up group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {p.nombre}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {p.tipo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-white dark:bg-zinc-50 dark:text-zinc-900">
                          <TipoIcon className="h-3 w-3" />
                          {p.tipo}
                        </span>
                      )}
                      {(p.ciudad || p.zona) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[p.zona, p.ciudad].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {p.precioNoche !== undefined && (
                    <div className="shrink-0 text-right transition-transform duration-300 group-hover:scale-105">
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

                <div className="flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400">
                  {p.capacidadMaxima !== undefined && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      hasta {p.capacidadMaxima} huéspedes
                    </span>
                  )}
                  {p.calificacion !== undefined && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {p.calificacion.toFixed(1)}
                    </span>
                  )}
                </div>

                {p.amenidades.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Amenidades
                    </h3>
                    <div className="mt-2 space-y-2">
                      {agruparPorCategoria(p.amenidades).map(([cat, items]) => {
                        const CatIcon = iconoCategoria(cat);
                        return (
                          <div
                            key={cat}
                            className="flex flex-wrap items-center gap-1.5"
                          >
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                              <CatIcon className="h-3 w-3" />
                              {cat}:
                            </span>
                            {items.map((a) => {
                              const AmIcon = iconoAmenidad(a.nombre);
                              return (
                                <span
                                  key={a.uri}
                                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                >
                                  <AmIcon className="h-3 w-3" />
                                  {a.nombre}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {p.perfiles.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Compatible con
                    </h3>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {p.perfiles.map((perf) => {
                        const PerfIcon = iconoTipoViajero(perf.tipoViajero);
                        return (
                          <li
                            key={perf.uri}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
                            title={perf.tipoViajero}
                          >
                            <PerfIcon className="h-3 w-3" />
                            {perf.nombre}
                            {perf.tipoViajero && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                · {perf.tipoViajero}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </section>

        {buscado && !cargando && !error && resultados.length === 0 && (
          <div className="animate-fade-up mt-12 flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <Plane className="animate-pulse-glow h-10 w-10 opacity-40" />
            <p>No se encontraron propiedades.</p>
          </div>
        )}
      </div>
    </main>
  );
}
