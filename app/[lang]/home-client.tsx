"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
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

import {
  formatTemplate,
  localeLabels,
  locales,
  type Locale,
  translateAmenityCategory,
  uiDictionary,
} from "@/lib/i18n";

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
  codigoPostal?: string;
  sitioWeb?: string;
  telefono?: string;
  email?: string;
  horario?: string;
  fuente?: string;
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

type OnlineSource = "dbpedia" | "wikidata" | "wikidata_context" | "osm";

const SUGGESTION_ICONS = [Wifi, Heart, Sun, Laptop, MapPin, HomeIcon, Building2] as const;
const SEARCH_MODE_EVENT = "search-mode-change";

function readStoredMode(): "offline" | "online" {
  if (typeof window === "undefined") return "offline";
  const saved = window.localStorage.getItem("search-mode");
  return saved === "online" || saved === "offline" ? saved : "offline";
}

function persistSearchMode(mode: "offline" | "online") {
  localStorage.setItem("search-mode", mode);
  window.dispatchEvent(new Event(SEARCH_MODE_EVENT));
}

function subscribeSearchMode(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === "search-mode") {
      onStoreChange();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(SEARCH_MODE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SEARCH_MODE_EVENT, onStoreChange);
  };
}

function localName(uri: string): string {
  const i = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return uri.slice(i + 1);
}

function IconGlyph({
  icon: Icon,
  className,
}: {
  icon: typeof Wifi;
  className: string;
}) {
  return <Icon className={className} />;
}

function iconoAmenidad(amenidad: Amenidad) {
  const key = `${localName(amenidad.uri)} ${amenidad.nombre}`.toLowerCase();
  if (key.includes("wifi")) return Wifi;
  if (key.includes("aire") || key.includes("conditioning")) return Snowflake;
  if (key.includes("cocina") || key.includes("kitchen") || key.includes("cuisine")) return ChefHat;
  if (key.includes("desayuno") || key.includes("breakfast") || key.includes("petit-dejeuner")) return Coffee;
  if (key.includes("limpieza") || key.includes("clean")) return Sparkles;
  if (key.includes("piscina") || key.includes("pool") || key.includes("piscine")) return Waves;
  if (key.includes("parking") || key.includes("estacionamiento")) return Car;
  if (key.includes("trabajo") || key.includes("workspace") || key.includes("teletravail") || key.includes("espace de travail")) return Laptop;
  if (key.includes("seguridad") || key.includes("security") || key.includes("securite")) return ShieldCheck;
  if (key.includes("accesibilidad") || key.includes("accessibility") || key.includes("accessibilite")) return Accessibility;
  return Tag;
}

function iconoCategoria(categoria: string) {
  const c = categoria.toLowerCase();
  if (c.includes("conect") || c.includes("connect")) return Wifi;
  if (c.includes("confort") || c.includes("comfort")) return Snowflake;
  if (c.includes("cocina") || c.includes("kitchen") || c.includes("cuisine")) return ChefHat;
  if (c.includes("aliment") || c.includes("food") || c.includes("restauration")) return Coffee;
  if (c.includes("recre") || c.includes("recreation") || c.includes("loisirs")) return Waves;
  if (c.includes("transport")) return Car;
  if (c.includes("trabajo") || c.includes("remote") || c.includes("teletravail")) return Laptop;
  if (c.includes("seguridad") || c.includes("security") || c.includes("securite")) return ShieldCheck;
  if (c.includes("accesibilidad") || c.includes("accessibility") || c.includes("accessibilite")) return Accessibility;
  return Tag;
}

function iconoTipoViajero(tipo?: string) {
  if (!tipo) return UserRound;
  const t = tipo.toLowerCase();
  if (t.includes("famil") || t.includes("couple") || t.includes("pareja")) return Heart;
  if (t.includes("friend") || t.includes("groupe") || t.includes("grupo") || t.includes("amigos")) return Users;
  if (t.includes("business") || t.includes("ejecut") || t.includes("negocio") || t.includes("affaires")) return Briefcase;
  if (t.includes("student") || t.includes("estudian") || t.includes("etudiant")) return GraduationCap;
  return UserRound;
}

function iconoTipoPropiedad(tipo?: string) {
  if (!tipo) return HomeIcon;
  const t = tipo.toLowerCase();
  if (t.includes("apart") || t.includes("department") || t.includes("appartement")) return Building2;
  if (t.includes("villa")) return Waves;
  if (t.includes("house") || t.includes("casa") || t.includes("maison")) return HomeIcon;
  if (t.includes("room") || t.includes("habitacion") || t.includes("chambre")) return BedDouble;
  return HomeIcon;
}

function agruparPorCategoria(amenidades: Amenidad[], lang: Locale) {
  const map = new Map<string, Amenidad[]>();
  for (const amenidad of amenidades) {
    const key = translateAmenityCategory(amenidad.categoria, lang) ?? amenidad.categoria ?? "Other";
    map.set(key, [...(map.get(key) ?? []), amenidad]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function formatoPrecioBolivianos(valor: number, lang: Locale) {
  const locale = lang === "en" ? "en-US" : lang === "fr" ? "fr-FR" : "es-BO";
  return `Bs ${new Intl.NumberFormat(locale, {
    maximumFractionDigits: Number.isInteger(valor) ? 0 : 1,
  }).format(valor)}`;
}

function chipsDeFiltros(filters: AIFilters, lang: Locale) {
  const dict = uiDictionary[lang];
  return [
    ...(filters.precioMax !== undefined
      ? [formatTemplate(dict.filters.maxPrice, { value: formatoPrecioBolivianos(filters.precioMax, lang) })]
      : []),
    ...(filters.precioMin !== undefined
      ? [formatTemplate(dict.filters.minPrice, { value: formatoPrecioBolivianos(filters.precioMin, lang) })]
      : []),
    ...(filters.capacidadMin !== undefined
      ? [formatTemplate(dict.filters.minGuests, { count: filters.capacidadMin })]
      : []),
    ...(filters.calificacionMin !== undefined
      ? [formatTemplate(dict.filters.minRating, { value: filters.calificacionMin })]
      : []),
    ...(filters.ciudades ?? []),
    ...(filters.zonas ?? []),
    ...(filters.tiposPropiedad ?? []),
    ...(filters.tiposViajero ?? []),
    ...(filters.categoriasAmenidad ?? []),
    ...(filters.amenidades ?? []),
    ...(filters.keywords ?? []),
  ].filter(Boolean);
}

async function obtenerResultados(
  lang: Locale,
  termino = "",
  mode: "offline" | "online" = "offline",
  source?: OnlineSource,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ lang, mode });
  if (termino.trim()) params.set("q", termino.trim());
  if (source) params.set("source", source);

  const res = await fetch(`/api/buscar?${params.toString()}`);
  const data = (await res.json()) as SearchResponse;
  if (!res.ok) throw new Error(data.error ?? uiDictionary[lang].searchError);
  return data;
}

function completarPropiedad(propiedad: Propiedad): number {
  return [
    propiedad.descripcion,
    propiedad.urlImagen,
    propiedad.tipo,
    propiedad.ciudad,
    propiedad.zona,
    propiedad.precioNoche,
    propiedad.capacidadMaxima,
    propiedad.calificacion,
    propiedad.codigoPostal,
    propiedad.sitioWeb,
    propiedad.telefono,
    propiedad.horario,
  ].filter(Boolean).length + propiedad.amenidades.length;
}

function mergeOnlineResults(current: Propiedad[], incoming: Propiedad[]): Propiedad[] {
  const byUri = new Map(current.map((item) => [item.uri, item]));

  for (const propiedad of incoming) {
    const existing = byUri.get(propiedad.uri);
    if (!existing) {
      byUri.set(propiedad.uri, propiedad);
      continue;
    }

    byUri.set(
      propiedad.uri,
      completarPropiedad(existing) >= completarPropiedad(propiedad)
        ? {
            ...existing,
            ...Object.fromEntries(Object.entries(propiedad).filter(([, value]) => value !== undefined)),
            amenidades: [...existing.amenidades, ...propiedad.amenidades].filter(
              (amenidad, index, list) => list.findIndex((item) => item.uri === amenidad.uri) === index,
            ),
            perfiles: [...existing.perfiles, ...propiedad.perfiles].filter(
              (perfil, index, list) => list.findIndex((item) => item.uri === perfil.uri) === index,
            ),
          }
        : {
            ...propiedad,
            ...Object.fromEntries(Object.entries(existing).filter(([, value]) => value !== undefined)),
            amenidades: [...propiedad.amenidades, ...existing.amenidades].filter(
              (amenidad, index, list) => list.findIndex((item) => item.uri === amenidad.uri) === index,
            ),
            perfiles: [...propiedad.perfiles, ...existing.perfiles].filter(
              (perfil, index, list) => list.findIndex((item) => item.uri === perfil.uri) === index,
            ),
          },
    );
  }

  return [...byUri.values()].sort((a, b) => {
    if (Boolean(a.urlImagen) !== Boolean(b.urlImagen)) return a.urlImagen ? -1 : 1;
    const diff = completarPropiedad(b) - completarPropiedad(a);
    if (diff !== 0) return diff;
    return a.nombre.localeCompare(b.nombre);
  });
}

function SearchBox({
  lang,
  cargando,
  q,
  setQ,
  onSubmit,
  mode,
  onModeChange,
}: {
  lang: Locale;
  cargando: boolean;
  q: string;
  setQ: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  mode: "offline" | "online";
  onModeChange: (newMode: "offline" | "online") => void;
}) {
  const dict = uiDictionary[lang];
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 pt-6 pb-2 text-center">
      <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] border-b border-[var(--color-line)] pb-4">
        {/* Toggle de Modo: Offline vs Online */}
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] p-1 shadow-sm transition-all duration-300">
          <button
            type="button"
            onClick={() => onModeChange("offline")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-300 ${
              mode === "offline"
                ? "bg-[var(--color-cactus)] text-white shadow-sm scale-[1.03]"
                : "text-[var(--color-muted)] hover:text-[var(--color-cactus)]"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>{dict.modeOffline}</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("online")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-300 ${
              mode === "online"
                ? "bg-[var(--color-terracotta)] text-white shadow-sm scale-[1.03]"
                : "text-[var(--color-muted)] hover:text-[var(--color-terracotta)]"
            }`}
          >
            <Waves className="h-3.5 w-3.5 animate-pulse" />
            <span>{dict.modeOnline}</span>
          </button>
        </div>

        {/* Idiomas */}
        <div className="flex flex-wrap gap-2">
          {locales.map((locale) => (
            <Link
              key={locale}
              href={`/${locale}`}
              onClick={() => persistSearchMode(mode)}
              className={`rounded-full border px-3 py-1 transition-colors ${
                locale === lang
                  ? "border-[var(--color-cactus)] bg-[var(--color-cactus-soft)] text-[var(--color-cactus)]"
                  : "border-[var(--color-line)] hover:border-[var(--color-cactus)] hover:text-[var(--color-cactus)]"
              }`}
            >
              {localeLabels[locale]}
            </Link>
          ))}
        </div>
      </div>

      <header className="animate-fade-up">
        <h1 className="flex items-baseline justify-center gap-3 text-4xl font-semibold text-[var(--color-ink)] md:text-5xl">
          <Sparkles className="animate-pulse-glow h-8 w-8 translate-y-1 text-[var(--color-terracotta)]" />
          <span>
            {dict.headingLead}{" "}
            <span className="font-serif font-semibold italic tracking-tight text-[var(--color-cactus)]">
              {dict.headingAccent}
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
            {dict.searchLabel}
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-cactus)]" />
            <input
              type="text"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={dict.searchPlaceholder}
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
              {dict.searchingButton}
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              {dict.searchButton}
            </>
          )}
        </button>
      </form>
    </section>
  );
}

function SuggestionBar({
  lang,
  cargando,
  total,
  onSelect,
}: {
  lang: Locale;
  cargando: boolean;
  total: number;
  onSelect: (value: string) => void;
}) {
  const dict = uiDictionary[lang];
  return (
    <div className="animate-fade-up mt-4 flex flex-col gap-3 border-y border-[var(--color-line)] py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold text-[var(--color-ink)]">
        {cargando ? dict.loadingCatalog : `${total} ${dict.listingsLabel}`}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {dict.suggestions.map((label, index) => {
          const Icon = SUGGESTION_ICONS[index] ?? Tag;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(label)}
              className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-1 text-xs font-medium text-[var(--color-muted)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-cactus)] hover:text-[var(--color-cactus)] hover:shadow"
            >
              <IconGlyph icon={Icon} className="h-3 w-3" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AiPanel({ lang, ai }: { lang: Locale; ai: AIInfo | null }) {
  if (ai?.source !== "deepseek" || (!ai.explanation && !ai.filters)) {
    return null;
  }

  const chips = ai.filters ? chipsDeFiltros(ai.filters, lang) : [];

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
          className="animate-fade-up flex flex-col gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-3 shadow-sm"
        >
          <div className="skeleton h-40 w-full rounded-md" />
          <div className="space-y-2">
            <div className="skeleton h-5 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="skeleton h-3 w-full rounded" />
          </div>
        </div>
      ))}
    </section>
  );
}

function ListingCard({
  lang,
  propiedad,
  index,
  mode,
  onSelectCard,
}: {
  lang: Locale;
  propiedad: Propiedad;
  index: number;
  mode: "offline" | "online";
  onSelectCard: (propiedad: Propiedad) => void;
}) {
  const dict = uiDictionary[lang];
  const TipoIcon = iconoTipoPropiedad(propiedad.tipo);
  const imageAlt = [propiedad.tipo, propiedad.zona, propiedad.ciudad].filter(Boolean).join(" in ");

  return (
    <article
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
      onClick={() => {
        if (mode === "online") {
          onSelectCard(propiedad);
        }
      }}
      className={`animate-fade-up group flex flex-col gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-cactus)] hover:shadow-lg ${
        mode === "online" ? "cursor-pointer" : ""
      }`}
    >
      <div className="overflow-hidden rounded-md">
        <div className="relative">
          <ListingImage
            src={propiedad.urlImagen}
            alt={imageAlt ? `${dict.imageAltPrefix} ${imageAlt}` : propiedad.nombre}
            eager={index < 3}
            unoptimized={mode === "online" || propiedad.uri.startsWith("http://www.wikidata.org")}
          />
          <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium uppercase text-white backdrop-blur-sm">
            {dict.photoBadge}
          </span>
          {mode === "online" && (
            <span className="absolute right-2 top-2 rounded-full bg-[var(--color-terracotta)] px-2 py-0.5 text-[10px] font-semibold uppercase text-white backdrop-blur-sm shadow-sm flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 animate-bounce" />
              <span>SPARQL Live</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight text-[var(--color-ink)]">
            {propiedad.nombre}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted)]">
            {mode === "online" && propiedad.fuente && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-cactus)]">
                {propiedad.fuente}
              </span>
            )}
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
              {formatoPrecioBolivianos(propiedad.precioNoche, lang)}
            </div>
            <div className="text-[10px] uppercase text-[var(--color-muted)]">{dict.perNight}</div>
          </div>
        )}
      </div>

      {propiedad.descripcion && (
        <p className="text-xs leading-5 text-[var(--color-muted)]">{propiedad.descripcion}</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
        {propiedad.capacidadMaxima !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {formatTemplate(dict.upToGuests, { count: propiedad.capacidadMaxima })}
          </span>
        )}
        {propiedad.calificacion !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-[var(--color-maize)] text-[var(--color-maize)]" />
            {propiedad.calificacion.toFixed(1)}
          </span>
        )}
      </div>

      {propiedad.amenidades.length > 0 && <Amenidades lang={lang} amenidades={propiedad.amenidades} />}
      {propiedad.perfiles.length > 0 && <Perfiles lang={lang} perfiles={propiedad.perfiles} />}
    </article>
  );
}

function ListingImage({
  src,
  alt,
  eager,
  unoptimized,
}: {
  src?: string;
  alt: string;
  eager: boolean;
  unoptimized: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-40 w-full items-center justify-center bg-[var(--color-cactus-soft)] px-4 text-center text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
        No real image
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={800}
      loading={eager ? "eager" : "lazy"}
      sizes="(min-width: 1280px) 31vw, (min-width: 640px) 48vw, 100vw"
      unoptimized={unoptimized}
      onError={() => setFailed(true)}
      className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  );
}

function Amenidades({ lang, amenidades }: { lang: Locale; amenidades: Amenidad[] }) {
  const dict = uiDictionary[lang];
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-[var(--color-muted)]">{dict.amenitiesHeading}</h3>
      <div className="mt-1.5 space-y-1.5">
        {agruparPorCategoria(amenidades, lang).map(([categoria, items]) => {
          const CategoriaIcon = iconoCategoria(categoria);
          return (
            <div key={categoria} className="flex flex-wrap items-center gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase text-[var(--color-muted)]">
                <IconGlyph icon={CategoriaIcon} className="h-3 w-3" />
                {categoria}:
              </span>
              {items.map((amenidad) => {
                const AmenidadIcon = iconoAmenidad(amenidad);
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

function Perfiles({ lang, perfiles }: { lang: Locale; perfiles: Perfil[] }) {
  const dict = uiDictionary[lang];
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-[var(--color-muted)]">{dict.profilesHeading}</h3>
      <ul className="mt-1 flex flex-wrap gap-1">
        {perfiles.map((perfil) => {
          const PerfilIcon = iconoTipoViajero(perfil.tipoViajero ?? perfil.nombre);
          return (
            <li
              key={perfil.uri}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-maize-soft)] px-2 py-0.5 text-[11px] text-[var(--color-terracotta-dark)] transition-colors hover:bg-[var(--color-rose-soft)]"
            >
              <IconGlyph icon={PerfilIcon} className="h-3 w-3" />
              <span>
                {perfil.nombre}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function HomeClient({ lang }: { lang: Locale }) {
  const dict = uiDictionary[lang];
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Propiedad[]>([]);
  const [cargando, setResultadosLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<AIInfo | null>(null);

  const mode = useSyncExternalStore<"offline" | "online">(
    subscribeSearchMode,
    readStoredMode,
    () => "offline",
  );
  const [modalPropiedad, setModalPropiedad] = useState<Propiedad | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelado = false;

    async function cargarCatalogo() {
      setResultadosLoading(true);
      setError(null);
      try {
        if (mode === "online") {
          const requestId = ++requestIdRef.current;
          setResultados([]);
          const sources: OnlineSource[] = ["dbpedia", "wikidata", "osm"];
          let pending = sources.length;

          await Promise.allSettled(
            sources.map(async (source) => {
              const data = await obtenerResultados(lang, "", "online", source);
              if (cancelado || requestIdRef.current !== requestId) return;
              setResultados((actual) => mergeOnlineResults(actual, data.propiedades ?? []));
              pending -= 1;
              if (pending === 0) setResultadosLoading(false);
            }),
          );

          if (!cancelado && requestIdRef.current === requestId) {
            setAi({ source: "fallback", filters: null, explanation: null });
            setResultadosLoading(false);
          }
          return;
        }

        const data = await obtenerResultados(lang, "", mode);
        if (cancelado) return;
        setResultados(data.propiedades ?? []);
        setAi(data.ai ?? null);
      } catch (err) {
        if (cancelado) return;
        setError(err instanceof Error ? err.message : dict.fallbackError);
        setResultados([]);
      } finally {
        if (!cancelado) setResultadosLoading(false);
      }
    }

    cargarCatalogo();

    return () => {
      cancelado = true;
    };
  }, [dict.fallbackError, lang, mode]);

  async function buscarConModo(termino: string, targetMode: "offline" | "online") {
    const requestId = ++requestIdRef.current;
    setResultadosLoading(true);
    setError(null);
    setAi(null);
    setResultados([]);

      try {
        if (targetMode === "online") {
        const sources: OnlineSource[] = termino.trim()
          ? ["dbpedia", "wikidata", "osm", "wikidata_context"]
          : ["dbpedia", "wikidata", "osm"];
        await Promise.allSettled(
          sources.map(async (source) => {
            const data = await obtenerResultados(lang, termino, "online", source);
            if (requestIdRef.current !== requestId) return;
            setResultados((actual) => mergeOnlineResults(actual, data.propiedades ?? []));
          }),
        );
        if (requestIdRef.current === requestId) {
          setAi({ source: "fallback", filters: null, explanation: null });
        }
        return;
      }

      const data = await obtenerResultados(lang, termino, targetMode);
      if (requestIdRef.current !== requestId) return;
      setResultados(data.propiedades ?? []);
      setAi(data.ai ?? null);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : dict.fallbackError);
      setResultados([]);
    } finally {
      if (requestIdRef.current === requestId) setResultadosLoading(false);
    }
  }

  async function buscar(termino: string) {
    await buscarConModo(termino, mode);
  }

  function handleModeChange(newMode: "offline" | "online") {
    persistSearchMode(newMode);
  }

  function handleSelectCard(propiedad: Propiedad) {
    setModalPropiedad(propiedad);
  }

  function handleConfirmNavigate() {
    if (modalPropiedad) {
      window.open(modalPropiedad.uri, "_blank", "noopener,noreferrer");
      setModalPropiedad(null);
    }
  }

  function handleCloseModal() {
    setModalPropiedad(null);
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
          lang={lang}
          cargando={cargando}
          q={q}
          setQ={setQ}
          onSubmit={onSubmit}
          mode={mode}
          onModeChange={handleModeChange}
        />

        <SuggestionBar lang={lang} cargando={cargando} total={resultados.length} onSelect={onSugerencia} />

        {error && (
          <div className="animate-fade-up mt-4 rounded-lg border border-[var(--color-rose)] bg-[var(--color-rose-soft)] p-4 text-[var(--color-ink)]">
            {error}
          </div>
        )}

        {!cargando && !error && <AiPanel lang={lang} ai={ai} />}
        {cargando && resultados.length === 0 && <SkeletonGrid />}

        {resultados.length > 0 && (
          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {resultados.map((propiedad, index) => (
              <ListingCard
                key={propiedad.uri}
                lang={lang}
                propiedad={propiedad}
                index={index}
                mode={mode}
                onSelectCard={handleSelectCard}
              />
            ))}
          </section>
        )}

        {!cargando && !error && resultados.length === 0 && (
          <div className="animate-fade-up mt-12 flex flex-col items-center gap-3 text-[var(--color-muted)]">
            <Plane className="animate-pulse-glow h-10 w-10 opacity-40" />
            <p>{dict.noResults}</p>
          </div>
        )}
      </div>

      {modalPropiedad && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-lg scale-[1] rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-2xl transition-all duration-300 animate-scale-up text-left"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center gap-3 border-b border-[var(--color-line)] pb-3">
              <Sparkles className="h-6 w-6 text-[var(--color-terracotta)] animate-pulse" />
              <h2 className="text-xl font-bold text-[var(--color-ink)]">
                {modalPropiedad.nombre}
              </h2>
            </header>
            
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-[var(--color-cactus)] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{modalPropiedad.tipo} · {modalPropiedad.ciudad || "Web"}</span>
              </p>
              {modalPropiedad.fuente && (
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  Fuente: {modalPropiedad.fuente}
                </p>
              )}
              <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                {dict.modalBody}
              </p>
              {(modalPropiedad.zona || modalPropiedad.codigoPostal || modalPropiedad.sitioWeb || modalPropiedad.telefono || modalPropiedad.horario) && (
                <div className="space-y-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-3 text-xs text-[var(--color-muted)]">
                  {modalPropiedad.zona && (
                    <p>
                      <span className="font-semibold text-[var(--color-ink)]">Direccion:</span> {modalPropiedad.zona}
                    </p>
                  )}
                  {modalPropiedad.codigoPostal && (
                    <p>
                      <span className="font-semibold text-[var(--color-ink)]">Codigo postal:</span> {modalPropiedad.codigoPostal}
                    </p>
                  )}
                  {modalPropiedad.horario && (
                    <p>
                      <span className="font-semibold text-[var(--color-ink)]">Horario:</span> {modalPropiedad.horario}
                    </p>
                  )}
                  {modalPropiedad.telefono && (
                    <p>
                      <span className="font-semibold text-[var(--color-ink)]">Telefono:</span> {modalPropiedad.telefono}
                    </p>
                  )}
                  {modalPropiedad.sitioWeb && (
                    <p className="break-all">
                      <span className="font-semibold text-[var(--color-ink)]">Sitio web:</span> {modalPropiedad.sitioWeb}
                    </p>
                  )}
                </div>
              )}
              {modalPropiedad.amenidades.length > 0 && <Amenidades lang={lang} amenidades={modalPropiedad.amenidades} />}
              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cactus-soft)] p-3 text-xs">
                <p className="font-semibold text-[var(--color-ink)] mb-1">
                  {dict.modalQuestion}
                </p>
                <code className="mt-2 block select-all break-all rounded border border-[var(--color-line)] bg-[var(--color-paper)] p-1.5 text-[var(--color-cactus)]">
                  {modalPropiedad.uri}
                </code>
              </div>
            </div>
            
            <footer className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--color-line)] pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-md border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition-all hover:bg-[var(--color-line-soft)] active:scale-[0.98]"
                >
                  {dict.modalBtnCancel}
                </button>
              <button
                type="button"
                onClick={handleConfirmNavigate}
                className="rounded-md bg-[var(--color-terracotta)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-terracotta-dark)] active:scale-[0.98] transition-all"
              >
                {dict.modalBtnConfirm}
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
