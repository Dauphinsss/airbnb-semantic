import { type Locale } from "@/lib/i18n";

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

// Premium Unsplash image fallback pools
const HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
];

const LANDMARK_IMAGES = [
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1472214222541-d510753a4907?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
];

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

export async function searchWikidata(query: string, locale: Locale): Promise<Propiedad[]> {
  const normalizedQ = query.trim().toLowerCase();
  
  // Custom keyword filter clause for standard SPARQL
  const searchFilter = normalizedQ
    ? `FILTER(CONTAINS(LCASE(?itemLabel), "${normalizedQ}") || CONTAINS(LCASE(?adminLabel), "${normalizedQ}") || CONTAINS(LCASE(?typeLabel), "${normalizedQ}"))`
    : "";

  // Query only actual accommodations (hotels, hostels, guest houses, motels, B&Bs, lodgings)
  // OR any other assets that explicitly function as a lodging (have lodging keywords in their name)
  const sparqlQuery = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?item ?itemLabel ?itemDescription ?typeLabel ?image ?coord ?adminLabel WHERE {
  ?item wdt:P17 wd:Q750 . # Located in Bolivia
  ?item wdt:P31 ?type .
  
  OPTIONAL {
    ?item rdfs:label ?lbl .
    FILTER(LANG(?lbl) = "es" || LANG(?lbl) = "en")
  }
  
  FILTER(
    (?type IN (wd:Q27686, wd:Q184852, wd:Q1175650, wd:Q191010, wd:Q2424853, wd:Q3947)) ||
    (
      BOUND(?lbl) &&
      (
        CONTAINS(LCASE(?lbl), "hotel") || 
        CONTAINS(LCASE(?lbl), "hostal") || 
        CONTAINS(LCASE(?lbl), "hostel") || 
        CONTAINS(LCASE(?lbl), "alojamiento") || 
        CONTAINS(LCASE(?lbl), "residence") || 
        CONTAINS(LCASE(?lbl), "lodge") || 
        CONTAINS(LCASE(?lbl), "boutique") ||
        CONTAINS(LCASE(?lbl), "posada") ||
        CONTAINS(LCASE(?lbl), "pension") ||
        CONTAINS(LCASE(?lbl), "apart") ||
        CONTAINS(LCASE(?lbl), "villa") ||
        CONTAINS(LCASE(?lbl), "apartamento") ||
        CONTAINS(LCASE(?lbl), "apartment") ||
        CONTAINS(LCASE(?lbl), "cabana") ||
        CONTAINS(LCASE(?lbl), "cabin") ||
        CONTAINS(LCASE(?lbl), "bungalow") ||
        CONTAINS(LCASE(?lbl), "suite") ||
        CONTAINS(LCASE(?lbl), "studio")
      )
    )
  )
  
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item wdt:P625 ?coord }
  OPTIONAL { 
    ?item wdt:P131 ?admin .
    ?admin rdfs:label ?adminLabel .
    FILTER(LANG(?adminLabel) = "${locale}")
  }
  
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "${locale},es,en,fr" .
  }
  
  ${searchFilter}
}
ORDER BY ?itemLabel
LIMIT 150
  `.trim();

  const url = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparqlQuery)}&format=json`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "AirbnbSemanticSearch/1.0 (steven@example.com) Web-Semantica-Course-Project",
      Accept: "application/sparql-results+json",
    },
    next: { revalidate: 3600 }, // Cache response for 1 hour
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Wikidata SPARQL failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const bindings = data.results.bindings;

  const seenUris = new Set<string>();
  const propiedades: Propiedad[] = [];

  for (const b of bindings) {
    const uri = b.item.value;
    
    // De-duplicate items returned by SPARQL to prevent duplicate keys in React list rendering
    if (seenUris.has(uri)) continue;
    seenUris.add(uri);

    const name = b.itemLabel?.value || uri.split("/").pop() || "";
    const description = b.itemDescription?.value || (locale === "en" ? "Live lodging in Bolivia" : locale === "fr" ? "Hebergement en direct en Bolivie" : "Alojamiento en vivo en Bolivia");
    const rawImage = b.image?.value;
    const secureImage = rawImage ? rawImage.replace(/^http:/, "https:") : undefined;
    const rawType = b.typeLabel?.value || "";
    
    // Capitalize type label nicely
    const tipo = rawType.charAt(0).toUpperCase() + rawType.slice(1);
    
    const adminLabel = b.adminLabel?.value || "";
    // Clean up admin label if it says "Departamento de La Paz" -> "La Paz"
    const ciudad = adminLabel.replace(/^(Departamento de |Provincia de |Municipio de )/i, "");
    
    // Extract numerical part of URI for deterministic mock hashes
    const idNum = parseInt(uri.match(/\d+/)?.[0] ?? "123", 10);
    
    // Fallback Image pool
    let urlImagen = secureImage;
    if (!urlImagen) {
      urlImagen = HOTEL_IMAGES[idNum % HOTEL_IMAGES.length];
    }

    // Deterministic prices, capacities, and ratings
    const precioNoche = 120 + (idNum % 580); // Bs 120 - 700
    const capacidadMaxima = 2 + (idNum % 6); // 2 - 7 guests
    const calificacion = 4.0 + ((idNum % 11) / 10); // 4.0 - 5.0 rating

    // Organic, realistic distribution of mock amenities:
    // 15% have 0 amenities (e.g. basic hostels), 35% have 1-2, 50% have 3-5 premium amenities
    const amenities: Amenidad[] = [];
    const amenityPool = [
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Wifi", nombre: locale === "en" ? "Wi-Fi" : locale === "fr" ? "Wi-Fi" : "Wifi", categoria: "Conectividad" },
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Cocina", nombre: locale === "en" ? "Kitchen" : locale === "fr" ? "Cuisine" : "Cocina", categoria: "Cocina" },
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/AireAcondicionado", nombre: locale === "en" ? "Air conditioning" : locale === "fr" ? "Climatisation" : "Aire acondicionado", categoria: "Confort" },
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/ParkingGratis", nombre: locale === "en" ? "Free parking" : locale === "fr" ? "Parking gratuit" : "Estacionamiento gratuito", categoria: "Transporte" },
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Piscina", nombre: locale === "en" ? "Swimming pool" : locale === "fr" ? "Piscine" : "Piscina", categoria: "Recreativa" },
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Desayuno", nombre: locale === "en" ? "Breakfast" : locale === "fr" ? "Petit-dejeuner" : "Desayuno", categoria: "Alimentacion" },
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/EspacioTrabajo", nombre: locale === "en" ? "Workspace" : locale === "fr" ? "Espace de travail" : "Espacio de trabajo", categoria: "TrabajoRemoto" },
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Seguridad24h", nombre: locale === "en" ? "24-hour security" : locale === "fr" ? "Securite 24h/24" : "Seguridad 24h", categoria: "Seguridad" }
    ];
    const numAmenitiesHash = idNum % 100;
    let numAmenities = 0;
    if (numAmenitiesHash >= 15 && numAmenitiesHash < 50) {
      numAmenities = 1 + (idNum % 2); // 1 or 2
    } else if (numAmenitiesHash >= 50) {
      numAmenities = 3 + (idNum % 3); // 3, 4, or 5
    }

    for (let i = 0; i < numAmenities; i++) {
      const index = (idNum + i * 3) % amenityPool.length;
      if (!amenities.some((a) => a.uri === amenityPool[index].uri)) {
        amenities.push(amenityPool[index]);
      }
    }

    // Deterministic Traveler Profiles
    // If a property has 0 amenities, it usually doesn't have compatible profiles either (very simple stay)
    const perfiles: Perfil[] = [];
    const profilePool = [
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Pareja", nombre: locale === "en" ? "Couple" : locale === "fr" ? "Couple" : "Pareja", tipoViajero: locale === "en" ? "Couple" : locale === "fr" ? "Couple" : "Pareja" },
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Familiar", nombre: locale === "en" ? "Family" : locale === "fr" ? "Famille" : "Familiar", tipoViajero: locale === "en" ? "Family" : locale === "fr" ? "Famille" : "Familiar" },
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Ejecutivo", nombre: locale === "en" ? "Executive traveler" : locale === "fr" ? "Voyageur d'affaires" : "Ejecutivo", tipoViajero: locale === "en" ? "Executive traveler" : locale === "fr" ? "Voyageur d'affaires" : "Ejecutivo" },
      { uri: "http://www.semanticweb.org/steven/ontologies/2026/2/airbnb/Individual", nombre: locale === "en" ? "Solo traveler" : locale === "fr" ? "Voyageur solo" : "Individual", tipoViajero: locale === "en" ? "Solo traveler" : locale === "fr" ? "Voyageur solo" : "Individual" }
    ];
    let numProfiles = 0;
    if (numAmenities > 0) {
      numProfiles = 1 + (idNum % 2); // 1 or 2
    }

    for (let i = 0; i < numProfiles; i++) {
      const index = (idNum + i * 7) % profilePool.length;
      if (!perfiles.some((p) => p.uri === profilePool[index].uri)) {
        perfiles.push(profilePool[index]);
      }
    }

    propiedades.push({
      uri,
      nombre: name,
      descripcion: description,
      urlImagen,
      tipo,
      precioNoche,
      capacidadMaxima,
      calificacion,
      ciudad: ciudad || undefined,
      zona: undefined,
      amenidades: amenities,
      perfiles: perfiles,
    });
  }

  return propiedades;
}
