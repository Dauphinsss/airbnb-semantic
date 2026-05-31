export const locales = ["es", "en", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export function hasLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return value && hasLocale(value) ? value : defaultLocale;
}

export const uiDictionary = {
  es: {
    metadataTitle: "Buscador semantico · Airbnb",
    metadataDescription: "Buscador semantico de propiedades sobre ontologia RDF y OWL.",
    modeOffline: "Offline (Ontología)",
    modeOnline: "Online (Wikidata)",
    modalTitle: "Recurso Real de Wikidata",
    modalBody: "Este alojamiento ha sido recuperado en tiempo real desde la base de datos semántica libre de Wikidata para demostrar la integración en vivo de la Web Semántica.",
    modalQuestion: "¿Deseas navegar hacia el recurso exacto en Wikidata para verificar su autenticidad?",
    modalBtnConfirm: "Sí, ver en Wikidata",
    modalBtnCancel: "Cerrar",
    headingLead: "Encuentra",
    headingAccent: "tu lugar",
    searchLabel: "Buscar",
    searchPlaceholder: "villa para familia en Santa Cruz con piscina, hasta Bs 120 por noche...",
    searchButton: "Buscar",
    searchingButton: "Buscando...",
    loadingCatalog: "Cargando catalogo",
    listingsLabel: "alojamientos",
    aiFallbackLabel: "Busqueda simple",
    photoBadge: "Foto referencial",
    perNight: "por noche",
    upToGuests: "hasta {count} huespedes",
    amenitiesHeading: "Amenidades",
    profilesHeading: "Compatible con",
    noResults: "No se encontraron propiedades.",
    searchError: "Error de busqueda",
    fallbackError: "Error desconocido",
    filters: {
      maxPrice: "<= {value}/noche",
      minPrice: ">= {value}/noche",
      minGuests: "{count}+ huespedes",
      minRating: "{value}+ estrellas",
    },
    suggestions: ["wifi", "familia", "vacacional", "trabajo remoto", "centro", "villa", "apartamento"],
    imageAltPrefix: "Foto de",
  },
  en: {
    metadataTitle: "Semantic Search · Airbnb",
    metadataDescription: "Semantic property search powered by RDF and OWL ontology.",
    modeOffline: "Offline (Ontology)",
    modeOnline: "Online (Wikidata)",
    modalTitle: "Real Wikidata Resource",
    modalBody: "This stay has been retrieved in real-time from the open Wikidata semantic database to demonstrate live Semantic Web integration.",
    modalQuestion: "Would you like to navigate to the exact Wikidata resource page to verify its authenticity?",
    modalBtnConfirm: "Yes, view on Wikidata",
    modalBtnCancel: "Close",
    headingLead: "Find",
    headingAccent: "your place",
    searchLabel: "Search",
    searchPlaceholder: "villa for a family in Santa Cruz with a pool, up to Bs 120 per night...",
    searchButton: "Search",
    searchingButton: "Searching...",
    loadingCatalog: "Loading catalog",
    listingsLabel: "stays",
    aiFallbackLabel: "Basic search",
    photoBadge: "Reference photo",
    perNight: "per night",
    upToGuests: "up to {count} guests",
    amenitiesHeading: "Amenities",
    profilesHeading: "Great for",
    noResults: "No properties found.",
    searchError: "Search error",
    fallbackError: "Unknown error",
    filters: {
      maxPrice: "<= {value}/night",
      minPrice: ">= {value}/night",
      minGuests: "{count}+ guests",
      minRating: "{value}+ stars",
    },
    suggestions: ["wifi", "family", "vacation", "remote work", "downtown", "villa", "apartment"],
    imageAltPrefix: "Photo of",
  },
  fr: {
    metadataTitle: "Recherche semantique · Airbnb",
    metadataDescription: "Recherche semantique de logements basee sur une ontologie RDF et OWL.",
    modeOffline: "Offline (Ontologie)",
    modeOnline: "Online (Wikidata)",
    modalTitle: "Ressource Wikidata Réelle",
    modalBody: "Cet hébergement a été récupéré en temps réel depuis la base de données sémantique ouverte Wikidata pour démontrer l'intégration du Web Sémantique.",
    modalQuestion: "Souhaitez-vous naviguer vers la page de ressource exacte sur Wikidata pour vérifier son authenticité ?",
    modalBtnConfirm: "Oui, voir sur Wikidata",
    modalBtnCancel: "Fermer",
    headingLead: "Trouvez",
    headingAccent: "votre lieu",
    searchLabel: "Rechercher",
    searchPlaceholder: "villa pour une famille a Santa Cruz avec piscine, jusqu'a 120 Bs par nuit...",
    searchButton: "Rechercher",
    searchingButton: "Recherche...",
    loadingCatalog: "Chargement du catalogue",
    listingsLabel: "logements",
    aiFallbackLabel: "Recherche simple",
    photoBadge: "Photo de reference",
    perNight: "par nuit",
    upToGuests: "jusqu'a {count} voyageurs",
    amenitiesHeading: "Equipements",
    profilesHeading: "Ideal pour",
    noResults: "Aucun logement trouve.",
    searchError: "Erreur de recherche",
    fallbackError: "Erreur inconnue",
    filters: {
      maxPrice: "<= {value}/nuit",
      minPrice: ">= {value}/nuit",
      minGuests: "{count}+ voyageurs",
      minRating: "{value}+ etoiles",
    },
    suggestions: ["wifi", "famille", "vacances", "teletravail", "centre-ville", "villa", "appartement"],
    imageAltPrefix: "Photo de",
  },
} as const;

export const localeLabels: Record<Locale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
};

const amenityCategoryLabels = {
  Accesibilidad: { es: "Accesibilidad", en: "Accessibility", fr: "Accessibilite" },
  Alimentacion: { es: "Alimentacion", en: "Food", fr: "Restauration" },
  Cocina: { es: "Cocina", en: "Kitchen", fr: "Cuisine" },
  Conectividad: { es: "Conectividad", en: "Connectivity", fr: "Connectivite" },
  Confort: { es: "Confort", en: "Comfort", fr: "Confort" },
  Recreativa: { es: "Recreativa", en: "Recreation", fr: "Loisirs" },
  Seguridad: { es: "Seguridad", en: "Security", fr: "Securite" },
  Servicio: { es: "Servicio", en: "Service", fr: "Service" },
  TrabajoRemoto: { es: "Trabajo remoto", en: "Remote work", fr: "Teletravail" },
  Transporte: { es: "Transporte", en: "Transport", fr: "Transport" },
  Otros: { es: "Otros", en: "Other", fr: "Autres" },
} as const;

export function translateAmenityCategory(category: string | undefined, locale: Locale): string | undefined {
  if (!category) return undefined;
  return amenityCategoryLabels[category as keyof typeof amenityCategoryLabels]?.[locale] ?? category;
}

export function formatTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
