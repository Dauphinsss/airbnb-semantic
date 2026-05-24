import fs from "node:fs/promises";
import path from "node:path";

const ontologyPath = path.join(process.cwd(), "ontology", "Airbnb.owl");
const locales = ["es", "en", "fr"];

const classLabels = {
  AlojamientoCompleto: { es: "Alojamiento completo", en: "Entire place", fr: "Logement entier" },
  AlojamientoHabitacion: { es: "Alojamiento en habitacion", en: "Room accommodation", fr: "Sejour en chambre" },
  Amenidad: { es: "Amenidad", en: "Amenity", fr: "Equipement" },
  Apartamento: { es: "Apartamento", en: "Apartment", fr: "Appartement" },
  Casa: { es: "Casa", en: "House", fr: "Maison" },
  HabitacionCompartida: { es: "Habitacion compartida", en: "Shared room", fr: "Chambre partagee" },
  HabitacionPrivada: { es: "Habitacion privada", en: "Private room", fr: "Chambre privee" },
  PerfilHuesped: { es: "Perfil de huesped", en: "Guest profile", fr: "Profil de voyageur" },
  Politica: { es: "Politica", en: "Policy", fr: "Politique" },
  Propiedad: { es: "Propiedad", en: "Property", fr: "Logement" },
  PropositoViaje: { es: "Proposito de viaje", en: "Travel purpose", fr: "Motif de voyage" },
  PuntoInteres: { es: "Punto de interes", en: "Point of interest", fr: "Point d'interet" },
  Villa: { es: "Villa", en: "Villa", fr: "Villa" },
  ZonaGeografica: { es: "Zona geografica", en: "Geographic area", fr: "Zone geographique" },
};

const equivalentClasses = {
  Apartamento: "http://dbpedia.org/ontology/Apartment",
  Casa: "http://dbpedia.org/ontology/House",
  Villa: "http://dbpedia.org/ontology/Villa",
  HabitacionPrivada: "http://dbpedia.org/ontology/Room",
  HabitacionCompartida: "http://dbpedia.org/ontology/Room",
};

const exactLabels = {
  AireAcondicionado: { es: "Aire acondicionado", en: "Air conditioning", fr: "Climatisation" },
  Cocina: { es: "Cocina", en: "Kitchen", fr: "Cuisine" },
  Desayuno: { es: "Desayuno", en: "Breakfast", fr: "Petit-dejeuner" },
  EspacioTrabajo: { es: "Espacio de trabajo", en: "Workspace", fr: "Espace de travail" },
  Lavanderia: { es: "Lavanderia", en: "Laundry", fr: "Buanderie" },
  Limpieza: { es: "Limpieza", en: "Cleaning", fr: "Menage" },
  Parking: { es: "Estacionamiento", en: "Parking", fr: "Parking" },
  ParkingGratis: { es: "Estacionamiento gratuito", en: "Free parking", fr: "Parking gratuit" },
  Piscina: { es: "Piscina", en: "Swimming pool", fr: "Piscine" },
  Wifi: { es: "Wifi", en: "Wi-Fi", fr: "Wi-Fi" },
  Gimnasio: { es: "Gimnasio", en: "Gym", fr: "Salle de sport" },
  Jacuzzi: { es: "Jacuzzi", en: "Jacuzzi", fr: "Jacuzzi" },
  Seguridad24h: { es: "Seguridad 24h", en: "24-hour security", fr: "Securite 24h/24" },
  Terraza: { es: "Terraza", en: "Terrace", fr: "Terrasse" },
  Amigos: { es: "Grupo de amigos", en: "Group of friends", fr: "Groupe d'amis" },
  AmigosCongreso: { es: "Amigos en congreso", en: "Friends attending a conference", fr: "Amis participant a un congres" },
  Dual: { es: "Dos huespedes", en: "Two guests", fr: "Deux voyageurs" },
  Ejecutivo: { es: "Ejecutivo", en: "Executive traveler", fr: "Voyageur d'affaires" },
  FamiliaReubicacion: { es: "Familia en reubicacion", en: "Relocating family", fr: "Famille en relocalisation" },
  Familiar: { es: "Familiar", en: "Family", fr: "Famille" },
  GrupoEstudiantil: { es: "Grupo estudiantil", en: "Student group", fr: "Groupe etudiant" },
  Individual: { es: "Individual", en: "Solo traveler", fr: "Voyageur solo" },
  Pareja: { es: "Pareja", en: "Couple", fr: "Couple" },
  ParejaEscapada: { es: "Pareja de escapada", en: "Couple getaway", fr: "Couple en escapade" },
  PoliticaAdultos: { es: "Politica para adultos", en: "Adults-only policy", fr: "Politique reservee aux adultes" },
  PoliticaCorporativa: { es: "Politica corporativa", en: "Corporate policy", fr: "Politique d'entreprise" },
  PoliticaEscapada: { es: "Politica de escapada", en: "Getaway policy", fr: "Politique d'escapade" },
  PoliticaEstricta: { es: "Politica estricta", en: "Strict policy", fr: "Politique stricte" },
  PoliticaEstudiantil: { es: "Politica estudiantil", en: "Student policy", fr: "Politique etudiante" },
  PoliticaEventos: { es: "Politica para eventos", en: "Events policy", fr: "Politique pour evenements" },
  PoliticaFlexible: { es: "Politica flexible", en: "Flexible policy", fr: "Politique flexible" },
  PoliticaModerada: { es: "Politica moderada", en: "Moderate policy", fr: "Politique moderee" },
  PoliticaPetFriendly: { es: "Politica pet friendly", en: "Pet-friendly policy", fr: "Politique acceptant les animaux" },
  PoliticaResidencial: { es: "Politica residencial", en: "Residential policy", fr: "Politique residentielle" },
  ViajeCongreso: { es: "Viaje por congreso", en: "Conference trip", fr: "Voyage pour congres" },
  ViajeEscapada: { es: "Viaje de escapada", en: "Getaway trip", fr: "Voyage d'escapade" },
  ViajeEstudios: { es: "Viaje por estudios", en: "Study trip", fr: "Voyage d'etudes" },
  ViajeFamiliar: { es: "Viaje familiar", en: "Family trip", fr: "Voyage en famille" },
  ViajePasantia: { es: "Viaje por pasantia", en: "Internship trip", fr: "Voyage pour stage" },
  ViajeProyecto: { es: "Viaje por proyecto", en: "Project trip", fr: "Voyage pour projet" },
  ViajeReubicacion: { es: "Viaje por reubicacion", en: "Relocation trip", fr: "Voyage pour relocalisation" },
  ViajeSalud: { es: "Viaje por salud", en: "Medical trip", fr: "Voyage pour raisons medicales" },
  ViajeTrabajo: { es: "Viaje de trabajo", en: "Business trip", fr: "Voyage d'affaires" },
  ViajeVacacional: { es: "Viaje vacacional", en: "Vacation trip", fr: "Voyage de vacances" },
  Zona_CBBA: { es: "Cochabamba", en: "Cochabamba", fr: "Cochabamba" },
  Zona_CBBA_TIQUIPAYA: { es: "Tiquipaya", en: "Tiquipaya", fr: "Tiquipaya" },
  Zona_LP: { es: "La Paz", en: "La Paz", fr: "La Paz" },
  Zona_LP_ACHUMANI: { es: "Achumani", en: "Achumani", fr: "Achumani" },
  Zona_SCZ: { es: "Santa Cruz de la Sierra", en: "Santa Cruz de la Sierra", fr: "Santa Cruz de la Sierra" },
  Zona_SCZ_URUBO: { es: "Urubo", en: "Urubo", fr: "Urubo" },
  Zona_SUCRE: { es: "Sucre", en: "Sucre", fr: "Sucre" },
  Zona_SUCRE_CENTRO: { es: "Centro Historico", en: "Historic Center", fr: "Centre historique" },
  Zona_TARIJA: { es: "Tarija", en: "Tarija", fr: "Tarija" },
  Zona_TARIJA_SANROQUE: { es: "San Roque", en: "San Roque", fr: "San Roque" },
  Zona_CBBA_CENTRO: { es: "Centro", en: "Downtown", fr: "Centre-ville" },
  Zona_CBBA_RECOLETA: { es: "La Recoleta", en: "La Recoleta", fr: "La Recoleta" },
  Zona_CBBA_QUERUQUERU: { es: "Queru Queru", en: "Queru Queru", fr: "Queru Queru" },
  Zona_CBBA_SARCO: { es: "Sarco", en: "Sarco", fr: "Sarco" },
  Zona_LP_CENTRO: { es: "Centro", en: "Downtown", fr: "Centre-ville" },
  Zona_SCZ_CENTRO: { es: "Centro", en: "Downtown", fr: "Centre-ville" },
  Zona_TARIJA_CENTRO: { es: "Centro", en: "Downtown", fr: "Centre-ville" },
  BiocentroGuembe: { es: "Biocentro Guembe", en: "Biocentro Guembe", fr: "Biocentro Guembe" },
  CristoRedentor: { es: "Cristo Redentor", en: "Cristo Redentor", fr: "Cristo Redentor" },
  EstacionIrpavi: { es: "Estacion Irpavi", en: "Irpavi Station", fr: "Station Irpavi" },
  ExpoCruz: { es: "Expocruz", en: "Expocruz", fr: "Expocruz" },
  HospitalCentral: { es: "Hospital Central", en: "Central Hospital", fr: "Hopital central" },
  MercadoCampesinoTarija: { es: "Mercado Campesino", en: "Campesino Market", fr: "Marche Campesino" },
  Plaza25Mayo: { es: "Plaza 25 de Mayo", en: "25 de Mayo Square", fr: "Place du 25 Mai" },
  TerminalCentral: { es: "Terminal Central", en: "Central Bus Terminal", fr: "Gare routiere centrale" },
  UnivalleTiquipaya: { es: "Univalle Tiquipaya", en: "Univalle Tiquipaya", fr: "Univalle Tiquipaya" },
  UniversidadCentro: { es: "Universidad del centro", en: "Downtown University", fr: "Universite du centre" },
  ElPradoCochabamba: { es: "El Prado", en: "El Prado", fr: "El Prado" },
  HupermallCochabamba: { es: "Hupermall", en: "Hupermall", fr: "Hupermall" },
  ICNorteCochabamba: { es: "IC Norte", en: "IC Norte", fr: "IC Norte" },
  PlazaColonCochabamba: { es: "Plaza Colon", en: "Colon Square", fr: "Place Colon" },
  UniversidadMayorSanSimon: { es: "Universidad Mayor de San Simon", en: "Universidad Mayor de San Simon", fr: "Universidad Mayor de San Simon" },
  Plaza24Septiembre: { es: "Plaza 24 de Septiembre", en: "24 de Septiembre Square", fr: "Place du 24 Septembre" },
  PlazaCamachoLaPaz: { es: "Plaza Camacho", en: "Plaza Camacho", fr: "Plaza Camacho" },
};

const sameAsLinks = {
  AireAcondicionado: "http://dbpedia.org/resource/Air_conditioning",
  Cocina: "http://dbpedia.org/resource/Kitchen",
  Desayuno: "http://dbpedia.org/resource/Breakfast",
  Lavanderia: "http://dbpedia.org/resource/Laundry",
  Limpieza: "http://dbpedia.org/resource/Cleaning",
  Parking: "http://dbpedia.org/resource/Parking",
  ParkingGratis: "http://dbpedia.org/resource/Parking",
  Piscina: "http://dbpedia.org/resource/Swimming_pool",
  Wifi: "http://dbpedia.org/resource/Wi-Fi",
  Zona_LP: "http://dbpedia.org/resource/La_Paz",
  Zona_CBBA: "http://dbpedia.org/resource/Cochabamba",
  Zona_SCZ: "http://dbpedia.org/resource/Santa_Cruz_de_la_Sierra",
  Zona_SUCRE: "http://dbpedia.org/resource/Sucre",
  Zona_TARIJA: "http://dbpedia.org/resource/Tarija,_Bolivia",
};

const translationOverrides = {
  "Casa con piscina en zona norte de Santa Cruz": {
    en: "House with pool in northern Santa Cruz",
    fr: "Maison avec piscine dans le nord de Santa Cruz",
  },
  "Casa patrimonial remodelada en Sucre": {
    en: "Renovated heritage house in Sucre",
    fr: "Maison patrimoniale renovee a Sucre",
  },
  "Casa comoda en San Bernardo": {
    en: "Comfortable house in San Bernardo",
    fr: "Maison confortable a San Bernardo",
  },
  "Casa moderna en Urubo": {
    en: "Modern house in Urubo",
    fr: "Maison moderne a Urubo",
  },
  "Cama en hostel del centro de Tarija": {
    en: "Bed in hostel in central Tarija",
    fr: "Lit dans une auberge du centre de Tarija",
  },
  "Cama en residencia compartida de Cala Cala": {
    en: "Bed in shared residence in Cala Cala",
    fr: "Lit dans une residence partagee a Cala Cala",
  },
  "Cama en casa compartida de Sopocachi": {
    en: "Bed in shared house in Sopocachi",
    fr: "Lit dans une maison partagee a Sopocachi",
  },
  "Cama en condominio compartido de Equipetrol": {
    en: "Bed in shared condominium in Equipetrol",
    fr: "Lit dans un condominium partage a Equipetrol",
  },
  "Casa de alquiler completo en la zona norte de Santa Cruz, con piscina y buen espacio para viajes familiares.": {
    en: "Entire house rental in northern Santa Cruz, with pool and ample space for family trips.",
    fr: "Location de maison entiere dans le nord de Santa Cruz, avec piscine et grand espace pour les voyages en famille.",
  },
  "Casona remodelada en Sucre con cocina y garaje, apropiada para grupos de amigos que buscan una base centrica.": {
    en: "Renovated large house in Sucre with kitchen and garage, suitable for groups of friends looking for a central base.",
    fr: "Grande maison renovee a Sucre avec cuisine et garage, adaptee aux groupes d'amis cherchant une base centrale.",
  },
  "Casa comoda en Tarija con dos dormitorios, ideal para parejas o familias pequenas que valoran privacidad y ventilacion.": {
    en: "Comfortable house in Tarija with two bedrooms, ideal for couples or small families who value privacy and ventilation.",
    fr: "Maison confortable a Tarija avec deux chambres, ideale pour les couples ou les petites familles qui apprecient l'intimite et la ventilation.",
  },
  "Casa moderna en Urubo con piscina y terraza, pensada para escapadas comodas con privacidad.": {
    en: "Modern house in Urubo with pool and terrace, designed for comfortable private getaways.",
    fr: "Maison moderne a Urubo avec piscine et terrasse, concue pour des escapades confortables avec intimite.",
  },
  "Cama en dormitorio compartido del centro de Tarija, adecuada para viajeros solos que priorizan precio y ubicacion.": {
    en: "Bed in shared dormitory in central Tarija, suitable for solo travelers who prioritize price and location.",
    fr: "Lit dans un dortoir partage du centre de Tarija, adapte aux voyageurs seuls qui privilegient le prix et l'emplacement.",
  },
  "Cama en residencia compartida de Cala Cala, util para estudiantes y personas que pasan temporadas cortas en Cochabamba.": {
    en: "Bed in shared residence in Cala Cala, useful for students and people spending short stays in Cochabamba.",
    fr: "Lit dans une residence partagee a Cala Cala, utile pour les etudiants et les personnes passant de courts sejours a Cochabamba.",
  },
  "Cama en casa compartida de Sopocachi con cocina y wifi, pensada para estudiantes o viajeros jovenes.": {
    en: "Bed in shared house in Sopocachi with kitchen and Wi-Fi, designed for students or young travelers.",
    fr: "Lit dans une maison partagee a Sopocachi avec cuisine et Wi-Fi, concu pour les etudiants ou les jeunes voyageurs.",
  },
  "Cama en condominio compartido de Equipetrol, con acceso a piscina y parqueo en una zona activa de Santa Cruz.": {
    en: "Bed in shared condominium in Equipetrol, with access to a pool and parking in an active area of Santa Cruz.",
    fr: "Lit dans un condominium partage a Equipetrol, avec acces a la piscine et au parking dans une zone animee de Santa Cruz.",
  },
  "Habitacion privada con bano en suite en una casona de La Recoleta, pensada para parejas que quieren caminar por el centro de Sucre.": {
    en: "Private room with an en-suite bathroom in a heritage house in La Recoleta, ideal for couples who want to explore central Sucre on foot.",
    fr: "Chambre privee avec salle de bain attenante dans une maison patrimoniale de La Recoleta, ideale pour les couples qui souhaitent decouvrir le centre de Sucre a pied.",
  },
  "Suite premium en centro de Cochabamba": {
    en: "Premium suite in downtown Cochabamba",
    fr: "Suite premium au centre-ville de Cochabamba",
  },
  "Suite apartamento premium en centro de Cochabamba, pensada para parejas o viaje ejecutivo con jacuzzi y seguridad.": {
    en: "Premium suite in downtown Cochabamba, designed for couples or executive stays, with a jacuzzi and strong security.",
    fr: "Suite premium au centre-ville de Cochabamba, concue pour les couples ou les sejours d'affaires, avec jacuzzi et securite renforcee.",
  },
};

function xmlEscape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function localName(uri) {
  return uri.slice(uri.lastIndexOf("/") + 1);
}

function extractTag(body, tag) {
  const match = body.match(new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.replace(/&amp;/g, "&").trim();
}

function chunk(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

async function loadApiKey() {
  for (const file of [".env.local", ".env"]) {
    try {
      const content = await fs.readFile(path.join(process.cwd(), file), "utf8");
      const match = content.match(/(^|\n)DEEPSEEK_API_KEY\s*=\s*(.+)\s*($|\n)/);
      if (match) return match[2].trim().replace(/^['"]|['"]$/g, "");
    } catch {
      // Continue.
    }
  }
  return process.env.DEEPSEEK_API_KEY;
}

function buildFallbackTranslations(text) {
  return {
    en: text,
    fr: text,
  };
}

function normalizeTranslationPayload(parsed) {
  if (Array.isArray(parsed)) {
    return parsed.reduce((acc, item) => {
      if (item && typeof item === "object") {
        for (const [key, value] of Object.entries(item)) {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
  }
  return parsed && typeof parsed === "object" ? parsed : {};
}

async function translateTexts(texts) {
  const unique = [...new Set(texts.filter(Boolean))];
  const translations = Object.fromEntries(unique.map((text) => [text, buildFallbackTranslations(text)]));

  const apiKey = await loadApiKey();
  if (!apiKey || unique.length === 0) return translations;

  for (const group of chunk(unique, 16)) {
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 4000,
          messages: [
            {
              role: "system",
              content:
                "You translate Spanish Airbnb ontology labels and descriptions into polished English and French. Preserve Bolivian proper nouns. Return only a JSON object where each original Spanish string maps to an object with keys en and fr.",
            },
            {
              role: "user",
              content: JSON.stringify(group),
            },
          ],
        }),
      });

      if (!response.ok) throw new Error(`DeepSeek failed with ${response.status}`);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Missing DeepSeek content");
      const parsed = normalizeTranslationPayload(JSON.parse(content));
      for (const text of group) {
        const value = parsed[text];
        if (value && typeof value.en === "string" && typeof value.fr === "string") {
          translations[text] = { en: value.en.trim(), fr: value.fr.trim() };
        }
      }
    } catch {
      // Preserve fallback values.
    }
  }

  for (const [text, value] of Object.entries(translationOverrides)) {
    translations[text] = value;
  }

  return translations;
}

function appendLines(body, lines) {
  const trimmed = body.trimEnd();
  const content = lines.map((line) => `        ${line}`).join("\n");
  return `${trimmed}\n${content}\n    `;
}

function labelLines({ labels, comments, sameAs }) {
  const lines = locales.map(
    (locale) => `<rdfs:label xml:lang="${locale}">${xmlEscape(labels[locale])}</rdfs:label>`,
  );
  if (comments) {
    for (const locale of locales) {
      if (comments[locale]) {
        lines.push(`<rdfs:comment xml:lang="${locale}">${xmlEscape(comments[locale])}</rdfs:comment>`);
      }
    }
  }
  if (sameAs) lines.push(`<owl:sameAs rdf:resource="${sameAs}"/>`);
  return lines;
}

function classLines(local, label) {
  const lines = locales.map(
    (locale) => `<rdfs:label xml:lang="${locale}">${xmlEscape(label[locale])}</rdfs:label>`,
  );
  if (equivalentClasses[local]) lines.push(`<owl:equivalentClass rdf:resource="${equivalentClasses[local]}"/>`);
  return lines;
}

async function main() {
  let xml = await fs.readFile(ontologyPath, "utf8");

  xml = xml.replace(/^\s*<(rdfs:label|rdfs:comment) xml:lang="(?:es|en|fr)">.*<\/\1>\r?\n/gm, "");
  xml = xml.replace(/^\s*<owl:sameAs rdf:resource="[^"]+"\/>\r?\n/gm, "");
  xml = xml.replace(/^\s*<owl:equivalentClass rdf:resource="[^"]+"\/>\r?\n/gm, "");

  const propertyTexts = [];
  for (const [, body] of xml.matchAll(/<owl:NamedIndividual rdf:about="[^"]+">([\s\S]*?)<\/owl:NamedIndividual>/g)) {
    const nombre = extractTag(body, "nombrePropiedad");
    const descripcion = extractTag(body, "descripcionPropiedad");
    if (nombre) propertyTexts.push(nombre);
    if (descripcion) propertyTexts.push(descripcion);
  }
  const generatedTranslations = await translateTexts(propertyTexts);

  xml = xml.replace(/<owl:Class rdf:about="([^"]+)"\/>/g, (match, uri) => {
    const local = localName(uri);
    const label = classLabels[local];
    if (!label) return match;
    const lines = classLines(local, label).map((line) => `        ${line}`).join("\n");
    return `<owl:Class rdf:about="${uri}">\n${lines}\n    </owl:Class>`;
  });

  xml = xml.replace(/<owl:Class rdf:about="([^"]+)">([\s\S]*?)<\/owl:Class>/g, (match, uri, body) => {
    const local = localName(uri);
    const label = classLabels[local];
    if (!label) return match;
    return `<owl:Class rdf:about="${uri}">\n${appendLines(body, classLines(local, label))}</owl:Class>`;
  });

  xml = xml.replace(/<owl:NamedIndividual rdf:about="([^"]+)">([\s\S]*?)<\/owl:NamedIndividual>/g, (match, uri, body) => {
    const local = localName(uri);
    const nombrePropiedad = extractTag(body, "nombrePropiedad");
    const descripcionPropiedad = extractTag(body, "descripcionPropiedad");
    const nombreAmenidad = extractTag(body, "nombreAmenidad");
    const nombreZona = extractTag(body, "nombreZona");
    const nombrePunto = extractTag(body, "nombrePunto");

    let payload;
    if (nombrePropiedad) {
      const translated = generatedTranslations[nombrePropiedad] ?? buildFallbackTranslations(nombrePropiedad);
      const translatedComment = descripcionPropiedad
        ? generatedTranslations[descripcionPropiedad] ?? buildFallbackTranslations(descripcionPropiedad)
        : undefined;
      payload = {
        labels: {
          es: nombrePropiedad,
          en: translated.en,
          fr: translated.fr,
        },
        comments: descripcionPropiedad
          ? {
              es: descripcionPropiedad,
              en: translatedComment.en,
              fr: translatedComment.fr,
            }
          : undefined,
        sameAs: sameAsLinks[local],
      };
    } else if (nombreAmenidad) {
      const labels = exactLabels[local] ?? { es: nombreAmenidad, en: nombreAmenidad, fr: nombreAmenidad };
      payload = { labels, sameAs: sameAsLinks[local] };
    } else if (nombreZona) {
      const labels = exactLabels[local] ?? { es: nombreZona, en: nombreZona, fr: nombreZona };
      payload = { labels, sameAs: sameAsLinks[local] };
    } else if (nombrePunto) {
      const labels = exactLabels[local] ?? { es: nombrePunto, en: nombrePunto, fr: nombrePunto };
      payload = { labels };
    } else if (exactLabels[local]) {
      payload = { labels: exactLabels[local], sameAs: sameAsLinks[local] };
    }

    if (!payload) return match;
    return `<owl:NamedIndividual rdf:about="${uri}">\n${appendLines(body, labelLines(payload))}</owl:NamedIndividual>`;
  });

  await fs.writeFile(ontologyPath, xml, "utf8");
}

await main();
