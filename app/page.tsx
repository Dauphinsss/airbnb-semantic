"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import {
  Accessibility,
  BedDouble,
  Briefcase,
  Building2,
  Car,
  ChefHat,
  Coffee,
  GraduationCap,
  Heart,
  Home as HomeIcon,
  Laptop,
  Loader2,
  MapPin,
  Palmtree,
  Plane,
  Search,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Tag,
  UserRound,
  Users,
  Waves,
  Wifi,
} from "lucide-react";

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

type AIFilters = {
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

type AIInfo = {
  source: "deepseek" | "fallback";
  filters: AIFilters | null;
  explanation: string | null;
};

type SearchResponse = {
  propiedades?: Propiedad[];
  ai?: AIInfo | null;
  error?: string;
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

function IconGlyph({
  icon: Icon,
  className,
}: {
  icon: typeof Wifi;
  className: string;
}) {
  return <Icon className={className} />;
}

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
  if (t.includes("familia") || t.includes("pareja")) return Heart;
  if (t.includes("grupoamigos") || t.includes("grupo")) return Users;
  if (t.includes("negocios")) return Briefcase;
  if (t.includes("estudiantil")) return GraduationCap;
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
  for (const amenidad of amenidades) {
    const key = amenidad.categoria ?? "Otros";
    map.set(key, [...(map.get(key) ?? []), amenidad]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function formatoPrecioBolivianos(valor: number) {
  return `Bs ${new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: Number.isInteger(valor) ? 0 : 1,
  }).format(valor)}`;
}

function chipsDeFiltros(filters: AIFilters) {
  const chips = [
    ...(filters.precioMax !== undefined
      ? [`<= ${formatoPrecioBolivianos(filters.precioMax)}/noche`]
      : []),
    ...(filters.precioMin !== undefined
      ? [`>= ${formatoPrecioBolivianos(filters.precioMin)}/noche`]
      : []),
    ...(filters.capacidadMin !== undefined
      ? [`${filters.capacidadMin}+ huespedes`]
      : []),
    ...(filters.calificacionMin !== undefined
      ? [`* ${filters.calificacionMin}+`]
      : []),
    ...(filters.ciudades ?? []),
    ...(filters.zonas ?? []),
    ...(filters.tiposPropiedad ?? []),
    ...(filters.tiposViajero ?? []),
    ...(filters.categoriasAmenidad ?? []),
    ...(filters.amenidades ?? []),
    ...(filters.keywords ?? []),
  ];

  return chips.filter(Boolean);
}

async function obtenerResultados(termino = ""): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (termino.trim()) params.set("q", termino.trim());

  const suffix = params.toString();
  const res = await fetch(`/api/buscar${suffix ? `?${suffix}` : ""}`);
  const data = (await res.json()) as SearchResponse;
  if (!res.ok) throw new Error(data.error ?? "Error de busqueda");
  return data;
}

function SearchBox({
  cargando,
  q,
  setQ,
  onSubmit,
}: {
  cargando: boolean;
  q: string;
  setQ: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 pt-6 pb-2 text-center">
      <header className="animate-fade-up">
        <h1 className="flex items-baseline justify-center gap-3 text-4xl font-semibold text-[var(--color-ink)] md:text-5xl">
          <Sparkles className="animate-pulse-glow h-8 w-8 translate-y-1 text-[var(--color-terracotta)]" />
          <span>
            Encuentra{" "}
            <span className="font-serif font-semibold italic tracking-tight text-[var(--color-cactus)]">
              tu lugar
            </span>
          </span>
        </h1>
      </header>

      <form
        onSubmit={onSubmit}
        className="animate-fade-up flex w-full flex-col gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-4 text-left shadow-sm transition-shadow focus-within:shadow-md sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-[var(--color-muted)]">
            Buscar
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-cactus)]" />
            <input
              type="text"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="villa para familia en Santa Cruz con piscina, hasta Bs 120 por noche..."
              className="w-full rounded-md border border-[var(--color-line)] bg-white/80 py-2 pl-9 pr-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-cactus)] dark:bg-black/20"
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={cargando}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--color-terracotta)] px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[var(--color-terracotta-dark)] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {cargando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Buscar
            </>
          )}
        </button>
      </form>
    </section>
  );
}

function SuggestionBar({
  cargando,
  total,
  onSelect,
}: {
  cargando: boolean;
  total: number;
  onSelect: (value: string) => void;
}) {
  return (
    <div
      className="animate-fade-up mt-4 flex flex-col gap-3 border-y border-[var(--color-line)] py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ animationDelay: "80ms" }}
    >
      <span className="text-sm font-semibold text-[var(--color-ink)]">
        {cargando ? "Cargando catalogo" : `${total} alojamientos`}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {SUGERENCIAS.map(({ label, icon: Icon }, index) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(label)}
            style={{ animationDelay: `${120 + index * 40}ms` }}
            className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-1 text-xs font-medium text-[var(--color-muted)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-cactus)] hover:text-[var(--color-cactus)] hover:shadow"
          >
            <IconGlyph icon={Icon} className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AiPanel({ ai }: { ai: AIInfo | null }) {
  if (ai?.source !== "deepseek" || (!ai.explanation && !ai.filters)) {
    return null;
  }

  const chips = ai.filters ? chipsDeFiltros(ai.filters) : [];

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="animate-fade-up rounded-lg border border-[var(--color-line)] bg-[var(--color-cactus-soft)] p-3 text-xs text-[var(--color-ink)]">
        {ai.explanation && <p className="mb-1.5">{ai.explanation}</p>}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="rounded-full bg-white/70 px-2 py-0.5 dark:bg-black/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          style={{ animationDelay: `${index * 60}ms` }}
          className="animate-fade-up flex flex-col gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-3 shadow-sm"
        >
          <div className="skeleton h-40 w-full rounded-md" />
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
  );
}

function ListingCard({
  propiedad,
  index,
}: {
  propiedad: Propiedad;
  index: number;
}) {
  const TipoIcon = iconoTipoPropiedad(propiedad.tipo);
  const imageAlt = [propiedad.tipo, propiedad.zona, propiedad.ciudad]
    .filter(Boolean)
    .join(" en ");

  return (
    <article
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
      className="animate-fade-up group flex flex-col gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-cactus)] hover:shadow-lg"
    >
      <div className="overflow-hidden rounded-md">
        <div className="relative">
          {propiedad.urlImagen ? (
            <Image
              src={propiedad.urlImagen}
              alt={imageAlt ? `Foto de ${imageAlt}` : propiedad.nombre}
              width={1200}
              height={800}
              loading={index < 3 ? "eager" : "lazy"}
              sizes="(min-width: 1280px) 31vw, (min-width: 640px) 48vw, 100vw"
              className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-40 w-full bg-[var(--color-cactus-soft)]" />
          )}
          <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium uppercase text-white backdrop-blur-sm">
            Foto referencial
          </span>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight text-[var(--color-ink)]">
            {propiedad.nombre}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted)]">
            {propiedad.tipo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-sky-soft)] px-2 py-0.5 text-[var(--color-sky)]">
                <IconGlyph icon={TipoIcon} className="h-3 w-3" />
                {propiedad.tipo}
              </span>
            )}
            {(propiedad.ciudad || propiedad.zona) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[propiedad.zona, propiedad.ciudad].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>

        {propiedad.precioNoche !== undefined && (
          <div className="shrink-0 text-right transition-transform duration-300 group-hover:scale-105">
            <div className="text-base font-bold text-[var(--color-terracotta)]">
              {formatoPrecioBolivianos(propiedad.precioNoche)}
            </div>
            <div className="text-[10px] uppercase text-[var(--color-muted)]">
              por noche
            </div>
          </div>
        )}
      </div>

      {propiedad.descripcion && (
        <p className="text-xs leading-5 text-[var(--color-muted)]">
          {propiedad.descripcion}
        </p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
        {propiedad.capacidadMaxima !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            hasta {propiedad.capacidadMaxima} huespedes
          </span>
        )}
        {propiedad.calificacion !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-[var(--color-maize)] text-[var(--color-maize)]" />
            {propiedad.calificacion.toFixed(1)}
          </span>
        )}
      </div>

      {propiedad.amenidades.length > 0 && (
        <Amenidades amenidades={propiedad.amenidades} />
      )}

      {propiedad.perfiles.length > 0 && (
        <Perfiles perfiles={propiedad.perfiles} />
      )}
    </article>
  );
}

function Amenidades({ amenidades }: { amenidades: Amenidad[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-[var(--color-muted)]">
        Amenidades
      </h3>
      <div className="mt-1.5 space-y-1.5">
        {agruparPorCategoria(amenidades).map(([categoria, items]) => {
          const CategoriaIcon = iconoCategoria(categoria);
          return (
            <div
              key={categoria}
              className="flex flex-wrap items-center gap-1"
            >
              <span className="inline-flex items-center gap-1 text-[10px] uppercase text-[var(--color-muted)]">
                <IconGlyph icon={CategoriaIcon} className="h-3 w-3" />
                {categoria}:
              </span>
              {items.map((amenidad) => {
                const AmenidadIcon = iconoAmenidad(amenidad.nombre);
                return (
                  <span
                    key={amenidad.uri}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--color-cactus-soft)] px-2 py-0.5 text-[11px] text-[var(--color-cactus)] transition-colors hover:bg-[var(--color-maize-soft)]"
                  >
                    <IconGlyph icon={AmenidadIcon} className="h-3 w-3" />
                    {amenidad.nombre}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Perfiles({ perfiles }: { perfiles: Perfil[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-[var(--color-muted)]">
        Compatible con
      </h3>
      <ul className="mt-1 flex flex-wrap gap-1">
        {perfiles.map((perfil) => {
          const PerfilIcon = iconoTipoViajero(perfil.tipoViajero);
          return (
            <li
              key={perfil.uri}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-maize-soft)] px-2 py-0.5 text-[11px] text-[var(--color-terracotta-dark)] transition-colors hover:bg-[var(--color-rose-soft)]"
              title={perfil.tipoViajero}
            >
              <IconGlyph icon={PerfilIcon} className="h-3 w-3" />
              {perfil.nombre}
              {perfil.tipoViajero && (
                <span className="text-[var(--color-muted)]">
                  · {perfil.tipoViajero}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Home() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Propiedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<AIInfo | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarCatalogo() {
      try {
        const data = await obtenerResultados();
        if (cancelado) return;
        setResultados(data.propiedades ?? []);
        setAi(data.ai ?? null);
      } catch (err) {
        if (cancelado) return;
        setError(err instanceof Error ? err.message : "Error desconocido");
        setResultados([]);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarCatalogo();

    return () => {
      cancelado = true;
    };
  }, []);

  async function buscar(termino: string) {
    setCargando(true);
    setError(null);
    setAi(null);

    try {
      const data = await obtenerResultados(termino);
      setResultados(data.propiedades ?? []);
      setAi(data.ai ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setResultados([]);
    } finally {
      setCargando(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    buscar(q);
  }

  function onSugerencia(value: string) {
    setQ(value);
    buscar(value);
  }

  return (
    <main className="min-h-screen px-4 py-6 text-[var(--color-ink)] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SearchBox
          cargando={cargando}
          q={q}
          setQ={setQ}
          onSubmit={onSubmit}
        />

        <SuggestionBar
          cargando={cargando}
          total={resultados.length}
          onSelect={onSugerencia}
        />

        {error && (
          <div className="animate-fade-up mt-4 rounded-lg border border-[var(--color-rose)] bg-[var(--color-rose-soft)] p-4 text-[var(--color-ink)]">
            {error}
          </div>
        )}

        {!cargando && !error && <AiPanel ai={ai} />}
        {cargando && <SkeletonGrid />}

        {!cargando && (
          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {resultados.map((propiedad, index) => (
              <ListingCard
                key={propiedad.uri}
                propiedad={propiedad}
                index={index}
              />
            ))}
          </section>
        )}

        {!cargando && !error && resultados.length === 0 && (
          <div className="animate-fade-up mt-12 flex flex-col items-center gap-3 text-[var(--color-muted)]">
            <Plane className="animate-pulse-glow h-10 w-10 opacity-40" />
            <p>No se encontraron propiedades.</p>
          </div>
        )}
      </div>
    </main>
  );
}
