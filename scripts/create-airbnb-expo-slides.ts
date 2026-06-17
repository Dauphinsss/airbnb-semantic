import fs from "node:fs";
import path from "node:path";
import pptxgen from "pptxgenjs";

const OUT =
  process.argv[2] ??
  "outputs/manual-20260617-airbnb/presentations/airbnb-semantic-expo/output/airbnb-semantic-expo-5min.pptx";

const pptx = new pptxgen();
pptx.defineLayout({ name: "AIRBNB_WIDE", width: 13.333, height: 7.5 });
pptx.layout = "AIRBNB_WIDE";
pptx.author = "Airbnb Semantic";
pptx.subject = "Exposicion de 5 minutos";
pptx.title = "Airbnb Semantic Expo 5min";
pptx.company = "Airbnb Semantic";
pptx.lang = "es-BO";
pptx.theme = {
  headFontFace: "Montserrat",
  bodyFontFace: "Source Sans Pro",
  lang: "es-BO",
};

const C = {
  ink: "11201B",
  deep: "16231F",
  paper: "F8F1E6",
  paper2: "FFF9EF",
  green: "2F6F5E",
  sage: "78A88D",
  clay: "C65F3F",
  gold: "E8B94F",
  blue: "6E9DB7",
  mute: "59625D",
  white: "FFFFFF",
};

type Slide = ReturnType<typeof pptx.addSlide>;

function bg(slide: Slide, color = C.paper) {
  slide.background = { color };
}

function footer(slide: Slide, n: number, dark = false) {
  slide.addText(`Airbnb Semantic · ${String(n).padStart(2, "0")}`, {
    x: 0.55,
    y: 7.03,
    w: 3,
    h: 0.18,
    margin: 0,
    fontFace: "Source Sans Pro",
    fontSize: 8,
    color: dark ? "AAB8AE" : "707B74",
  });
}

function kicker(slide: Slide, label: string, dark = false) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 0.56,
    y: 0.49,
    w: 0.09,
    h: 0.09,
    fill: { color: dark ? C.gold : C.clay },
    line: { color: dark ? C.gold : C.clay, transparency: 100 },
  });
  slide.addText(label.toUpperCase(), {
    x: 0.76,
    y: 0.41,
    w: 3.7,
    h: 0.24,
    margin: 0,
    fontFace: "Montserrat",
    bold: true,
    fontSize: 10,
    color: dark ? "D8E6DC" : C.green,
    breakLine: false,
    fit: "shrink",
  });
}

function title(slide: Slide, text: string, dark = false, y = 0.84, size = 33) {
  slide.addText(text, {
    x: 0.55,
    y,
    w: 8.8,
    h: 0.92,
    margin: 0,
    fontFace: "Montserrat",
    bold: true,
    fontSize: size,
    color: dark ? C.paper2 : C.ink,
    fit: "shrink",
    breakLine: false,
  });
}

function body(slide: Slide, text: string, x: number, y: number, w: number, h: number, dark = false) {
  slide.addText(text, {
    x,
    y,
    w,
    h,
    margin: 0,
    fontFace: "Source Sans Pro",
    fontSize: 16,
    color: dark ? "D3DED6" : "39443E",
    breakLine: false,
    fit: "shrink",
  });
}

function pill(slide: Slide, text: string, x: number, y: number, w: number, color: string, textColor = C.white) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h: 0.42,
    fill: { color },
    line: { color, transparency: 100 },
  });
  slide.addText(text, {
    x: x + 0.12,
    y: y + 0.11,
    w: w - 0.24,
    h: 0.2,
    margin: 0,
    fontFace: "Montserrat",
    fontSize: 10.5,
    bold: true,
    color: textColor,
    fit: "shrink",
  });
}

function metric(slide: Slide, value: string, label: string, x: number, y: number, dark = true) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w: 1.55,
    h: 0.95,
    fill: { color: dark ? "1F342E" : C.white },
    line: { color: dark ? "42665A" : "DED7CC", width: 1 },
  });
  slide.addText(value, {
    x: x + 0.15,
    y: y + 0.13,
    w: 1.2,
    h: 0.36,
    margin: 0,
    fontFace: "Montserrat",
    fontSize: 24,
    bold: true,
    color: dark ? C.gold : C.green,
    fit: "shrink",
  });
  slide.addText(label, {
    x: x + 0.15,
    y: y + 0.57,
    w: 1.2,
    h: 0.26,
    margin: 0,
    fontFace: "Source Sans Pro",
    fontSize: 10.5,
    bold: true,
    color: dark ? "D8E6DC" : C.ink,
    fit: "shrink",
  });
}

function slide01() {
  const s = pptx.addSlide();
  bg(s, C.ink);
  kicker(s, "Solucion final", true);
  title(s, "Buscador semantico de alojamientos", true, 0.92, 38);
  body(
    s,
    "La aplicacion convierte una frase natural en filtros, consulta una ontologia OWL/RDF y ordena propiedades por relevancia semantica.",
    0.58,
    2.05,
    6.65,
    0.7,
    true,
  );
  s.addShape(pptx.ShapeType.rect, { x: 8.1, y: 0.9, w: 3.9, h: 4.6, fill: { color: "1B2D27" }, line: { color: "42665A", width: 1 } });
  ["Airbnb.owl", "SPARQL + Fuseki", "PLN", "Scoring"].forEach((t, i) => {
    pill(s, t, 8.55, 1.35 + i * 0.82, 2.95, i === 2 ? C.clay : C.green);
  });
  s.addText("No buscamos coincidencias sueltas; buscamos relaciones con significado.", {
    x: 0.58,
    y: 5.78,
    w: 8.1,
    h: 0.35,
    margin: 0,
    fontFace: "Montserrat",
    fontSize: 17,
    bold: true,
    color: C.gold,
  });
  footer(s, 1, true);
}

function slide02() {
  const s = pptx.addSlide();
  bg(s);
  kicker(s, "Nuestra ontologia");
  title(s, "Airbnb.owl modela propiedades como una red semantica");
  body(s, "La clase Propiedad es el nucleo: conecta tipo de alojamiento, zona, amenidades, perfiles y politicas.", 0.58, 1.88, 7.7, 0.44);
  s.addShape(pptx.ShapeType.rect, { x: 5.4, y: 2.65, w: 2.2, h: 0.75, fill: { color: C.green }, line: { color: C.green } });
  s.addText("Propiedad", { x: 5.72, y: 2.9, w: 1.55, h: 0.22, margin: 0, fontFace: "Montserrat", fontSize: 18, bold: true, color: C.white });
  ["Apartamento", "Casa", "Villa", "Habitacion privada"].forEach((t, i) => {
    pill(s, t, 0.9, 2.35 + i * 0.72, 2.65, C.white, C.ink);
  });
  [
    ["ubicadaEn", "ZonaGeografica", C.green],
    ["tieneAmenidad", "Amenidad", C.clay],
    ["compatibleCon", "PerfilHuesped", C.gold],
    ["tienePolitica", "Politica", C.sage],
  ].forEach(([a, b, c], i) => {
    s.addText("->", { x: 7.75, y: 2.32 + i * 0.67, w: 0.35, h: 0.25, margin: 0, fontSize: 16, color: C.green, bold: true });
    s.addShape(pptx.ShapeType.rect, { x: 8.25, y: 2.2 + i * 0.67, w: 3.0, h: 0.5, fill: { color: c }, line: { color: c } });
    s.addText(`${a}  ${b}`, { x: 8.4, y: 2.34 + i * 0.67, w: 2.7, h: 0.18, margin: 0, fontFace: "Montserrat", fontSize: 10.5, bold: true, color: c === C.gold ? C.ink : C.white, fit: "shrink" });
  });
  body(s, "Ejemplo oral: una casa en Achumani puede tener Wifi, Cocina y Parking, y ser compatible con familias.", 0.9, 6.12, 10.8, 0.3);
  footer(s, 2);
}

function slide03() {
  const s = pptx.addSlide();
  bg(s, C.deep);
  kicker(s, "Datos + enriquecimiento", true);
  title(s, "La base local se conecta con vocabulario semantico externo", true, 0.86, 31);
  body(s, "DBpedia no reemplaza nuestros datos: agrega equivalencias para que los conceptos locales tengan contexto reconocido.", 0.58, 1.78, 8.4, 0.52, true);
  [
    ["14", "clases"],
    ["251", "individuos"],
    ["62", "alojamientos"],
    ["749", "relaciones de amenidades"],
    ["180", "relaciones con perfiles"],
    ["173", "relaciones de ubicacion"],
  ].forEach(([v, l], i) => metric(s, v, l, 0.78 + (i % 3) * 1.85, 2.65 + Math.floor(i / 3) * 1.18));
  s.addText("Enlaces semanticos", { x: 7.1, y: 2.45, w: 3.0, h: 0.25, margin: 0, fontFace: "Montserrat", fontSize: 17, bold: true, color: C.paper2 });
  [
    "Casa -> DBpedia House",
    "Villa -> DBpedia Villa",
    "Wifi -> DBpedia Wi-Fi",
    "Piscina -> DBpedia Swimming pool",
    "La Paz -> DBpedia La Paz",
  ].forEach((t, i) => pill(s, t, 7.1, 2.95 + i * 0.5, 4.6, i % 2 ? C.green : C.clay));
  footer(s, 3, true);
}

function slide04() {
  const s = pptx.addSlide();
  bg(s);
  kicker(s, "Tecnologias");
  title(s, "Cada capa cumple una funcion dentro del flujo");
  body(s, "El procesamiento de lenguaje natural es un solo bloque: un modelo de lenguaje en linea interpreta la consulta y devuelve filtros.", 0.58, 1.78, 8.9, 0.55);
  [
    ["Aplicacion web", "Next.js · React · Tailwind CSS"],
    ["Ontologia", "OWL/RDF · Airbnb.owl"],
    ["Servidor semantico", "Apache Jena Fuseki"],
    ["Consulta", "SPARQL"],
    ["PLN", "Modelo de lenguaje en linea -> filtros estructurados"],
    ["Ejecucion", "Bun"],
  ].forEach(([a, b], i) => {
    const y = 2.65 + i * 0.58;
    const active = a === "PLN";
    s.addShape(pptx.ShapeType.rect, { x: 1.1, y, w: 10.1, h: 0.42, fill: { color: active ? C.ink : C.white }, line: { color: active ? C.ink : "DED7CC" } });
    s.addText(a, { x: 1.35, y: y + 0.12, w: 2.2, h: 0.16, margin: 0, fontFace: "Montserrat", fontSize: 10.5, bold: true, color: active ? C.white : C.ink });
    s.addText(b, { x: 4.0, y: y + 0.12, w: 6.8, h: 0.16, margin: 0, fontFace: "Source Sans Pro", fontSize: 10.5, color: active ? "D8E6DC" : C.mute, fit: "shrink" });
  });
  s.addText("El PLN no trae alojamientos; traduce intencion humana a filtros que la API puede usar.", { x: 1.1, y: 6.25, w: 9.6, h: 0.25, margin: 0, fontFace: "Montserrat", fontSize: 13.5, bold: true, color: C.clay, fit: "shrink" });
  footer(s, 4);
}

function slide05() {
  const s = pptx.addSlide();
  bg(s);
  kicker(s, "Fuentes de datos");
  title(s, "Una base controlada y fuentes federadas con roles separados");
  body(s, "Separar fuentes evita confundir almacenamiento local, enriquecimiento y busqueda online.", 0.58, 1.78, 8.2, 0.4);
  [
    ["Airbnb.owl", "Fuente local principal", "Alojamientos, clases, individuos, relaciones, precios y perfiles", C.green],
    ["DBpedia", "Enriquecimiento + online", "Equivalencias semanticas y resultados externos en vivo", C.clay],
    ["Wikidata", "Online", "Entidades de alojamientos y contexto relacionado", C.blue],
    ["OpenStreetMap / LinkedGeoData", "Online", "Hoteles, direcciones, contacto, horarios y amenidades disponibles", C.gold],
  ].forEach(([src, role, aporta, color], i) => {
    const y = 2.55 + i * 0.82;
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y, w: 11.3, h: 0.62, fill: { color: i % 2 ? "EFE6D8" : C.white }, line: { color: "DED7CC" } });
    s.addShape(pptx.ShapeType.ellipse, { x: 1.05, y: y + 0.21, w: 0.18, h: 0.18, fill: { color }, line: { color } });
    s.addText(src, { x: 1.42, y: y + 0.15, w: 2.9, h: 0.2, margin: 0, fontFace: "Montserrat", fontSize: 12, bold: true, color: C.ink, fit: "shrink" });
    s.addText(role, { x: 4.55, y: y + 0.16, w: 2.2, h: 0.18, margin: 0, fontFace: "Source Sans Pro", fontSize: 11, bold: true, color: C.green, fit: "shrink" });
    s.addText(aporta, { x: 7.0, y: y + 0.16, w: 4.7, h: 0.18, margin: 0, fontFace: "Source Sans Pro", fontSize: 10.5, color: "3D4841", fit: "shrink" });
  });
  footer(s, 5);
}

function slide06() {
  const s = pptx.addSlide();
  bg(s, C.deep);
  kicker(s, "Flujo de busqueda", true);
  title(s, "De frase natural a resultados ordenados", true, 0.86, 36);
  s.addShape(pptx.ShapeType.rect, { x: 0.7, y: 1.82, w: 5.5, h: 0.95, fill: { color: C.paper2 }, line: { color: C.paper2 } });
  s.addText('"villa para familia en Santa Cruz con piscina"', { x: 1.0, y: 2.17, w: 4.95, h: 0.22, margin: 0, fontFace: "Montserrat", fontSize: 15.5, bold: true, color: C.ink, fit: "shrink" });
  s.addShape(pptx.ShapeType.rect, { x: 7.0, y: 1.82, w: 4.55, h: 1.25, fill: { color: "1B2D27" }, line: { color: "42665A" } });
  s.addText("Salida estructurada", { x: 7.25, y: 2.02, w: 2.1, h: 0.18, margin: 0, fontFace: "Montserrat", fontSize: 12, bold: true, color: C.gold });
  s.addText("tipo=Villa\nperfil=Familia\nciudad=Santa Cruz\namenidad=Piscina", { x: 7.25, y: 2.25, w: 3.85, h: 0.6, margin: 0, fontFace: "Roboto Mono", fontSize: 10.5, color: C.paper2, fit: "shrink" });
  ["Frontend", "/api/buscar", "PLN", "Filtros", "SPARQL + Fuseki", "Scoring", "Cards"].forEach((t, i) => {
    const x = 0.6 + i * 1.76;
    const y = i % 2 ? 4.28 : 3.72;
    const color = t === "PLN" ? C.clay : t === "Scoring" ? C.gold : C.green;
    s.addShape(pptx.ShapeType.rect, { x, y, w: 1.25, h: 0.62, fill: { color }, line: { color } });
    s.addText(t, { x: x + 0.1, y: y + 0.22, w: 1.05, h: 0.14, margin: 0, fontFace: "Montserrat", fontSize: 9.2, bold: true, color: color === C.gold ? C.ink : C.white, align: "center", fit: "shrink" });
    if (i < 6) s.addText("->", { x: x + 1.36, y: y + 0.22, w: 0.28, h: 0.18, margin: 0, fontSize: 12, bold: true, color: C.sage });
  });
  body(s, "Primero se extrae intencion; luego se consulta la ontologia; al final el scoring ordena por coincidencia semantica.", 0.8, 6.05, 10.7, 0.35, true);
  footer(s, 6, true);
}

function slide07() {
  const s = pptx.addSlide();
  bg(s);
  kicker(s, "Relevancia y modos");
  title(s, "El scoring le da peso a las coincidencias semanticas");
  body(s, "El orden de resultados no sale de palabras sueltas: combina filtros fuertes, perfil, amenidades, zona y coincidencias de texto.", 0.58, 1.78, 9.4, 0.5);
  [
    ["Tipo de propiedad", 4, C.green],
    ["Zona", 3, C.blue],
    ["Amenidad especifica", 3, C.clay],
    ["Perfil de huesped", 2, C.gold],
    ["Buena calificacion", 2, C.ink],
    ["Palabra clave", 1, C.sage],
  ].forEach(([name, score, color], i) => {
    const y = 2.55 + i * 0.42;
    s.addText(String(name), { x: 0.85, y, w: 2.3, h: 0.16, margin: 0, fontFace: "Source Sans Pro", fontSize: 10.8, bold: true, color: C.ink });
    s.addShape(pptx.ShapeType.rect, { x: 3.15, y: y + 0.03, w: Number(score) * 0.55, h: 0.12, fill: { color: String(color) }, line: { color: String(color) } });
    s.addText(`+${score}`, { x: 5.55, y: y - 0.01, w: 0.35, h: 0.16, margin: 0, fontFace: "Montserrat", fontSize: 10.5, bold: true, color: C.ink });
  });
  [
    ["Offline", "Airbnb.owl\n+ Fuseki\n+ SPARQL", "mas estable y controlado", C.ink, C.gold],
    ["Online", "DBpedia\nWikidata\nOpenStreetMap", "fuentes externas en vivo", C.white, C.green],
  ].forEach(([h, lines, note, fill, accent], i) => {
    const x = 7.0 + i * 2.35;
    s.addShape(pptx.ShapeType.rect, { x, y: 2.45, w: 2.05, h: 2.55, fill: { color: String(fill) }, line: { color: i ? "DED7CC" : C.ink } });
    s.addText(String(h), { x: x + 0.22, y: 2.75, w: 1.6, h: 0.25, margin: 0, fontFace: "Montserrat", fontSize: 18, bold: true, color: i ? C.ink : C.paper2 });
    s.addText(String(lines), { x: x + 0.22, y: 3.35, w: 1.6, h: 0.7, margin: 0, fontFace: "Source Sans Pro", fontSize: 13.5, bold: true, color: String(accent), align: "center", fit: "shrink" });
    s.addText(String(note), { x: x + 0.22, y: 4.25, w: 1.6, h: 0.3, margin: 0, fontFace: "Source Sans Pro", fontSize: 10, color: i ? C.mute : "D8E6DC", align: "center", fit: "shrink" });
  });
  s.addText("Cierre: la relevancia sale de combinar ontologia, PLN, SPARQL y pesos de coincidencia.", { x: 0.85, y: 6.1, w: 10.2, h: 0.28, margin: 0, fontFace: "Montserrat", fontSize: 13.5, bold: true, color: C.clay, fit: "shrink" });
  footer(s, 7);
}

slide01();
slide02();
slide03();
slide04();
slide05();
slide06();
slide07();

fs.mkdirSync(path.dirname(OUT), { recursive: true });
await pptx.writeFile({ fileName: OUT });
console.log(`Generated ${OUT}`);
