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
    metadataTitle: "Buscador semántico · Airbnb",
    metadataDescription: "Buscador semántico de propiedades sobre ontología RDF y OWL.",
    modeOffline: "Offline (Ontología)",
    modeOnline: "Online (SPARQL Web)",
    modalTitle: "Recurso web semántico",
    modalBody: "Este alojamiento ha sido recuperado en tiempo real desde fuentes abiertas consultadas con SPARQL. Se muestran solo los datos reales disponibles, aunque estén incompletos.",
    modalQuestion: "¿Deseas navegar al recurso exacto para verificar sus datos en la fuente original?",
    modalBtnConfirm: "Sí, abrir recurso",
    modalBtnCancel: "Cerrar",
    headingLead: "Encuentra",
    headingAccent: "tu lugar",
    searchLabel: "Buscar",
    searchPlaceholder: "villa para familia en Santa Cruz con piscina, hasta Bs 120 por noche...",
    searchButton: "Buscar",
    searchingButton: "Buscando...",
    loadingCatalog: "Cargando catálogo",
    listingsLabel: "alojamientos",
    aiFallbackLabel: "Búsqueda simple",
    photoBadge: "Foto referencial",
    perNight: "por noche",
    upToGuests: "hasta {count} huéspedes",
    amenitiesHeading: "Amenidades",
    profilesHeading: "Compatible con",
    noResults: "No se encontraron propiedades.",
    searchError: "Error de búsqueda",
    fallbackError: "Error desconocido",
    filters: {
      maxPrice: "<= {value}/noche",
      minPrice: ">= {value}/noche",
      minGuests: "{count}+ huéspedes",
      minRating: "{value}+ estrellas",
    },
    suggestions: ["wifi", "familia", "vacacional", "trabajo remoto", "centro", "villa", "apartamento"],
    imageAltPrefix: "Foto de",
  },
  en: {
    metadataTitle: "Semantic Search · Airbnb",
    metadataDescription: "Semantic property search powered by RDF and OWL ontology.",
    modeOffline: "Offline (Ontology)",
    modeOnline: "Online (SPARQL Web)",
    modalTitle: "Semantic web resource",
    modalBody: "This stay has been retrieved in real time from open sources queried with SPARQL. It shows only the real data that is actually available, even when incomplete.",
    modalQuestion: "Would you like to open the exact resource and verify it in the original source?",
    modalBtnConfirm: "Yes, open resource",
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
    metadataTitle: "Recherche sémantique · Airbnb",
    metadataDescription: "Recherche sémantique de logements basée sur une ontologie RDF et OWL.",
    modeOffline: "Offline (Ontologie)",
    modeOnline: "Online (SPARQL Web)",
    modalTitle: "Ressource du web sémantique",
    modalBody: "Cet hébergement a été récupéré en temps réel depuis des sources ouvertes interrogées avec SPARQL. Il affiche uniquement les données réellement disponibles, même si elles sont incomplètes.",
    modalQuestion: "Souhaitez-vous ouvrir la ressource exacte pour la vérifier dans sa source d'origine ?",
    modalBtnConfirm: "Oui, ouvrir la ressource",
    modalBtnCancel: "Fermer",
    headingLead: "Trouvez",
    headingAccent: "votre lieu",
    searchLabel: "Rechercher",
    searchPlaceholder: "villa pour une famille à Santa Cruz avec piscine, jusqu'à 120 Bs par nuit...",
    searchButton: "Rechercher",
    searchingButton: "Recherche...",
    loadingCatalog: "Chargement du catalogue",
    listingsLabel: "logements",
    aiFallbackLabel: "Recherche simple",
    photoBadge: "Photo de référence",
    perNight: "par nuit",
    upToGuests: "jusqu'à {count} voyageurs",
    amenitiesHeading: "Équipements",
    profilesHeading: "Idéal pour",
    noResults: "Aucun logement trouvé.",
    searchError: "Erreur de recherche",
    fallbackError: "Erreur inconnue",
    filters: {
      maxPrice: "<= {value}/nuit",
      minPrice: ">= {value}/nuit",
      minGuests: "{count}+ voyageurs",
      minRating: "{value}+ étoiles",
    },
    suggestions: ["wifi", "famille", "vacances", "télétravail", "centre-ville", "villa", "appartement"],
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
