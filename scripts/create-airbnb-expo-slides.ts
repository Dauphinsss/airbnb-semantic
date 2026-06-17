import fs from "node:fs";
import path from "node:path";
import pptxgen from "pptxgenjs";
import { lucideDataUri } from "./lib/lucide-svg";

const ROOT = process.cwd();
// Usa fotos optimizadas si existen (cache), si no las originales en public/listings.
const PHOTO_CACHE = path.resolve(ROOT, "outputs/manual-20260617-airbnb/presentations/airbnb-semantic-expo/.cache");
const PHOTO = (name: string) => {
  const cached = path.join(PHOTO_CACHE, name);
  return fs.existsSync(cached) ? cached : path.resolve(ROOT, "public/listings", name);
};

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
pptx.theme = {
  headFontFace: "Montserrat",
  bodyFontFace: "Source Sans Pro",
};

// ── Direccion estetica: "Grafo de conocimiento" ────────────────────────────
// Fondo azul-noche profundo en TODAS las slides (cohesion + proyector).
// El sujeto es un buscador semantico => la metafora es una red de nodos
// conectados con significado, no listas sueltas. El contraste entre tipografia
// display (lenguaje humano) y mono (lenguaje de maquina) es la narrativa.
const C = {
  night: "0B1F2A", // fondo base
  night2: "0E2733", // paneles
  panel: "12303D", // tarjetas elevadas
  panelLine: "1F4654", // bordes de tarjeta
  haze: "16384A", // lineas del grafo
  edge: "2E5A6B", // conectores
  mint: "3DD9B0", // acento principal (nodo activo / semantico)
  mintDim: "2A9B7E",
  coral: "FF6B4A", // PLN / intencion humana
  gold: "F2C14E", // datos / numeros
  blue: "6FB3D6", // online / federado
  text: "EAF4F2", // texto principal
  textDim: "9DB8B6", // texto secundario
  textFaint: "5E7A7C", // captions / footer
  white: "FFFFFF",
  ink: "06151D",
};

const MARGIN_X = 0.75;
const PAGE_W = 13.333;
const PAGE_H = 7.5;
const TITLE_Y = 0.94;
const BODY_Y = 1.92;
const MONO = "Consolas";
const DISPLAY = "Montserrat";
const BODY = "Source Sans Pro";

type Slide = ReturnType<typeof pptx.addSlide>;

// ── Helpers de atmosfera ────────────────────────────────────────────────────

function stage(slide: Slide) {
  slide.background = { color: C.night };
  // Acento de marca: barra superior fina en degradado mint->coral simulado.
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: PAGE_W, h: 0.07, fill: { color: C.mint }, line: { type: "none" } });
  slide.addShape(pptx.ShapeType.rect, { x: PAGE_W * 0.62, y: 0, w: PAGE_W * 0.38, h: 0.07, fill: { color: C.coral }, line: { type: "none" } });
}

// Nodo del grafo: circulo con halo.
function node(slide: Slide, cx: number, cy: number, r: number, color: string, filled = true) {
  if (filled) {
    slide.addShape(pptx.ShapeType.ellipse, { x: cx - r * 1.8, y: cy - r * 1.8, w: r * 3.6, h: r * 3.6, fill: { color, transparency: 82 }, line: { type: "none" } });
  }
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx - r,
    y: cy - r,
    w: r * 2,
    h: r * 2,
    fill: filled ? { color } : { color: C.night },
    line: { color, width: 1.75 },
  });
}

// Arista del grafo entre dos puntos (linea recta, con flip para diagonales).
function edge(slide: Slide, x1: number, y1: number, x2: number, y2: number, color = C.edge, width = 1.25) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  const flipH = (x1 < x2) !== (y1 < y2);
  slide.addShape(pptx.ShapeType.line, { x, y, w: w || 0.001, h: h || 0.001, flipH, line: { color, width, dashType: "solid" } });
}

// ── Helpers de estructura ───────────────────────────────────────────────────

function eyebrow(slide: Slide, n: number, label: string) {
  slide.addText(
    [
      { text: `${String(n).padStart(2, "0")}`, options: { color: C.mint, bold: true } },
      { text: "  /  07   ", options: { color: C.textFaint } },
      { text: label.toUpperCase(), options: { color: C.textDim, bold: true } },
    ],
    { x: MARGIN_X, y: 0.46, w: 10, h: 0.3, margin: 0, fontFace: MONO, fontSize: 11, charSpacing: 2, valign: "middle" },
  );
}

function title(slide: Slide, text: string, y = TITLE_Y, size = 34, accentWord?: string) {
  const runs = accentWord && text.includes(accentWord)
    ? text.split(accentWord).flatMap((part, i, arr) => {
        const out: { text: string; options?: object }[] = [{ text: part, options: { color: C.text } }];
        if (i < arr.length - 1) out.push({ text: accentWord, options: { color: C.mint } });
        return out;
      })
    : [{ text, options: { color: C.text } }];
  slide.addText(runs, {
    x: MARGIN_X,
    y,
    w: 11.8,
    h: 1.0,
    margin: 0,
    fontFace: DISPLAY,
    bold: true,
    fontSize: size,
    charSpacing: 0,
    lineSpacingMultiple: 0.96,
    valign: "top",
  });
}

function lede(slide: Slide, text: string, y = BODY_Y, w = 11.6) {
  slide.addText(text, {
    x: MARGIN_X,
    y,
    w,
    h: 0.7,
    margin: 0,
    fontFace: BODY,
    fontSize: 15.5,
    color: C.textDim,
    lineSpacingMultiple: 1.08,
    valign: "top",
    fit: "shrink",
  });
}

function takeaway(slide: Slide, text: string, accent = C.mint) {
  slide.addShape(pptx.ShapeType.rect, { x: MARGIN_X, y: 6.5, w: 0.06, h: 0.42, fill: { color: accent }, line: { type: "none" } });
  slide.addText(text, {
    x: MARGIN_X + 0.24,
    y: 6.46,
    w: 11.5,
    h: 0.5,
    margin: 0,
    fontFace: DISPLAY,
    fontSize: 13,
    italic: true,
    bold: true,
    color: C.text,
    valign: "middle",
    fit: "shrink",
  });
}

function pageMark(slide: Slide, n: number) {
  slide.addText(`airbnb·semantic`, { x: MARGIN_X, y: 7.08, w: 4, h: 0.2, margin: 0, fontFace: MONO, fontSize: 8.5, color: C.textFaint, charSpacing: 1, valign: "middle" });
  slide.addText(`${String(n).padStart(2, "0")}`, { x: PAGE_W - 1.2, y: 7.08, w: 0.6, h: 0.2, margin: 0, fontFace: MONO, fontSize: 8.5, color: C.textFaint, align: "right", valign: "middle" });
}

function chip(slide: Slide, text: string, x: number, y: number, w: number, color: string, solid = false) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.46, rectRadius: 0.07,
    fill: solid ? { color } : { color: C.panel },
    line: { color, width: 1.25 },
  });
  slide.addText(text, {
    x: x + 0.16, y, w: w - 0.32, h: 0.46, margin: 0,
    fontFace: DISPLAY, fontSize: 11, bold: true,
    color: solid ? C.ink : C.text, valign: "middle", align: "left", fit: "shrink",
  });
}

// Icono vectorial (lucide) embebido como SVG. Tamaño en pulgadas.
function icon(slide: Slide, name: string, x: number, y: number, size: number, color: string, strokeWidth = 2) {
  slide.addImage({ data: lucideDataUri(name, `#${color}`, strokeWidth), x, y, w: size, h: size });
}

// Disco con icono centrado (badge), para usar en listas/tarjetas.
function iconBadge(slide: Slide, name: string, cx: number, cy: number, r: number, color: string, onColor = false) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    fill: onColor ? { color } : { color: C.night2 },
    line: { color, width: 1.25 },
  });
  const s = r * 1.05;
  icon(slide, name, cx - s / 2, cy - s / 2, s, onColor ? C.ink : color, 2);
}

// ── Slides ──────────────────────────────────────────────────────────────────

function slide01() {
  const s = pptx.addSlide();
  stage(s);

  // Firma: foto de un alojamiento real a la derecha con un mini-grafo superpuesto,
  // como diciendo "esta propiedad es un nodo en una red de significado".
  const px = 8.15;
  const pw = PAGE_W - px;
  s.addImage({ path: PHOTO("villa.jpg"), x: px, y: 0.07, w: pw, h: PAGE_H - 0.07, sizing: { type: "cover", w: pw, h: PAGE_H - 0.07 } });
  // Velo para fundir la foto con el fondo noche.
  s.addShape(pptx.ShapeType.rect, { x: px, y: 0.07, w: pw, h: PAGE_H - 0.07, fill: { color: C.night, transparency: 35 }, line: { type: "none" } });
  s.addShape(pptx.ShapeType.rect, { x: px, y: 0.07, w: 1.4, h: PAGE_H - 0.07, fill: { color: C.night, transparency: 10 }, line: { type: "none" } });

  // Mini-grafo superpuesto sobre la foto.
  const cx = 10.6;
  const cy = 4.4;
  const ring: [number, number, string][] = [
    [cx - 1.6, cy - 1.5, C.gold],
    [cx + 1.5, cy - 1.2, C.blue],
    [cx + 1.7, cy + 1.0, C.coral],
    [cx - 1.3, cy + 1.4, C.mint],
  ];
  ring.forEach(([x, y]) => edge(s, cx, cy, x, y, C.mint, 1.25));
  ring.forEach(([x, y, col]) => node(s, x, y, 0.11, col));
  node(s, cx, cy, 0.22, C.mint);
  icon(s, "house", cx - 0.13, cy - 0.13, 0.26, C.ink, 2.4);

  s.addText("AIRBNB · SEMANTIC", { x: MARGIN_X, y: 1.5, w: 7, h: 0.3, margin: 0, fontFace: MONO, fontSize: 12, charSpacing: 3, color: C.mint, valign: "middle" });
  s.addText(
    [
      { text: "Buscador\n", options: { color: C.text } },
      { text: "semantico ", options: { color: C.mint } },
      { text: "de\nalojamientos", options: { color: C.text } },
    ],
    { x: MARGIN_X, y: 2.0, w: 7.6, h: 2.5, margin: 0, fontFace: DISPLAY, bold: true, fontSize: 52, lineSpacingMultiple: 0.94, valign: "top" },
  );
  s.addText(
    "Convierte una frase natural en filtros, consulta una ontologia OWL/RDF y ordena propiedades por relevancia semantica.",
    { x: MARGIN_X, y: 4.75, w: 6.7, h: 0.9, margin: 0, fontFace: BODY, fontSize: 15.5, color: C.textDim, lineSpacingMultiple: 1.1, valign: "top" },
  );

  // Pilares con icono.
  const pillars: [string, string, string][] = [
    ["database", "Airbnb.owl", C.mint],
    ["search", "SPARQL + Fuseki", C.text],
    ["brain-circuit", "PLN", C.coral],
    ["coins", "Scoring", C.gold],
  ];
  let pxc = MARGIN_X;
  pillars.forEach(([ic, label, col]) => {
    const w = label.length * 0.105 + 0.7;
    s.addShape(pptx.ShapeType.roundRect, { x: pxc, y: 5.78, w, h: 0.5, rectRadius: 0.1, fill: { color: C.panel }, line: { color: col, width: 1 } });
    icon(s, ic, pxc + 0.18, 5.9, 0.26, col, 2);
    s.addText(label, { x: pxc + 0.52, y: 5.78, w: w - 0.62, h: 0.5, margin: 0, fontFace: DISPLAY, fontSize: 11, bold: true, color: C.text, valign: "middle" });
    pxc += w + 0.18;
  });

  takeaway(s, "No buscamos coincidencias sueltas; buscamos relaciones con significado.", C.coral);
  pageMark(s, 1);
}

function slide02() {
  const s = pptx.addSlide();
  stage(s);
  eyebrow(s, 2, "Nuestra ontologia");
  title(s, "Airbnb.owl modela propiedades como una red semantica", TITLE_Y, 30, "red semantica");
  lede(s, "La clase Propiedad es el nucleo: conecta tipo de alojamiento, zona, amenidades, perfiles y politicas.");

  // Grafo real: Propiedad al centro, relaciones como aristas etiquetadas a nodos.
  const cx = 4.35;
  const cy = 4.25;
  const rels: [string, string, number, number, string][] = [
    ["tiene tipo", "Tipo", cx - 2.9, cy - 1.45, C.text],
    ["ubicadaEn", "ZonaGeografica", cx + 3.0, cy - 1.5, C.mint],
    ["tieneAmenidad", "Amenidad", cx + 3.4, cy + 0.1, C.coral],
    ["compatibleCon", "PerfilHuesped", cx + 2.9, cy + 1.6, C.gold],
    ["tienePolitica", "Politica", cx - 1.9, cy + 1.85, C.blue],
  ];
  rels.forEach(([, , x, y]) => edge(s, cx, cy, x, y, C.edge, 1.4));

  // Nodo central Propiedad.
  node(s, cx, cy, 0.62, C.mint);
  s.addText("Propiedad", { x: cx - 0.85, y: cy - 0.18, w: 1.7, h: 0.36, margin: 0, fontFace: DISPLAY, fontSize: 13, bold: true, color: C.ink, align: "center", valign: "middle" });

  const relIcons: Record<string, string> = {
    Tipo: "layers",
    ZonaGeografica: "map-pin",
    Amenidad: "wifi",
    PerfilHuesped: "users",
    Politica: "badge-check",
  };
  rels.forEach(([rel, target, x, y, col]) => {
    // etiqueta de relacion (mono, sobre la arista) cerca del nodo.
    const lx = (cx + x) / 2 - 0.7;
    const ly = (cy + y) / 2 - 0.22;
    s.addText(rel, { x: lx, y: ly, w: 1.6, h: 0.24, margin: 0, fontFace: MONO, fontSize: 8.5, italic: true, color: C.textFaint, align: "center", valign: "middle" });
    // nodo destino con icono + etiqueta tipo chip.
    const chipW = Math.max(1.7, target.length * 0.12 + 0.8);
    s.addShape(pptx.ShapeType.roundRect, { x: x - chipW / 2, y: y - 0.24, w: chipW, h: 0.48, rectRadius: 0.08, fill: { color: C.panel }, line: { color: String(col), width: 1.5 } });
    icon(s, relIcons[target] ?? "circle", x - chipW / 2 + 0.16, y - 0.13, 0.26, String(col), 2);
    s.addText(target, { x: x - chipW / 2 + 0.5, y: y - 0.24, w: chipW - 0.6, h: 0.48, margin: 0, fontFace: DISPLAY, fontSize: 11, bold: true, color: C.text, align: "left", valign: "middle", fit: "shrink" });
  });

  // Panel: subtipos de Tipo, con icono propio.
  s.addText("TIPOS DE PROPIEDAD", { x: 9.5, y: 2.35, w: 3.2, h: 0.25, margin: 0, fontFace: MONO, fontSize: 9.5, charSpacing: 1.5, color: C.textDim, valign: "middle" });
  const tipos: [string, string][] = [
    ["building-2", "Apartamento"],
    ["house", "Casa"],
    ["key", "Villa"],
    ["bed", "Habitacion privada"],
  ];
  tipos.forEach(([ic, t], i) => {
    const y = 2.75 + i * 0.62;
    s.addShape(pptx.ShapeType.roundRect, { x: 9.5, y, w: 3.1, h: 0.46, rectRadius: 0.07, fill: { color: C.panel }, line: { color: C.mint, width: 1.25 } });
    icon(s, ic, 9.66, y + 0.11, 0.24, C.mint, 2);
    s.addText(t, { x: 9.98, y, w: 2.5, h: 0.46, margin: 0, fontFace: DISPLAY, fontSize: 11, bold: true, color: C.text, valign: "middle", fit: "shrink" });
  });

  takeaway(s, "Una casa en Achumani puede tener Wifi, Cocina y Parking, y ser compatible con familias.", C.coral);
  pageMark(s, 2);
}

function slide03() {
  const s = pptx.addSlide();
  stage(s);
  eyebrow(s, 3, "Datos + enriquecimiento");
  title(s, "La base local se conecta con vocabulario externo", TITLE_Y, 29, "vocabulario externo");
  lede(s, "DBpedia no reemplaza nuestros datos: agrega equivalencias para que los conceptos locales tengan contexto reconocido.", BODY_Y, 7.4);

  // Metricas grandes estilo "numero protagonista".
  const stats: [string, string][] = [
    ["14", "clases"],
    ["251", "individuos"],
    ["62", "alojamientos"],
    ["749", "rel. amenidades"],
    ["180", "rel. perfiles"],
    ["173", "rel. ubicacion"],
  ];
  const SW = 2.18;
  const SH = 1.15;
  const SX = MARGIN_X;
  const SY = 2.75;
  stats.forEach(([v, l], i) => {
    const x = SX + (i % 3) * (SW + 0.18);
    const y = SY + Math.floor(i / 3) * (SH + 0.22);
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: SW, h: SH, rectRadius: 0.07, fill: { color: C.panel }, line: { color: C.panelLine, width: 1 } });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 0.07, h: SH, fill: { color: i < 3 ? C.mint : C.gold }, line: { type: "none" } });
    s.addText(v, { x: x + 0.22, y: y + 0.14, w: SW - 0.4, h: 0.55, margin: 0, fontFace: DISPLAY, fontSize: 34, bold: true, color: i < 3 ? C.mint : C.gold, valign: "middle" });
    s.addText(l, { x: x + 0.24, y: y + 0.72, w: SW - 0.4, h: 0.3, margin: 0, fontFace: MONO, fontSize: 10, color: C.textDim, valign: "middle", fit: "shrink" });
  });

  // Panel de enlaces semanticos (owl:sameAs / equivalentClass).
  const PX = 7.6;
  s.addShape(pptx.ShapeType.roundRect, { x: PX, y: 2.55, w: PAGE_W - PX - MARGIN_X, h: 3.55, rectRadius: 0.08, fill: { color: C.night2 }, line: { color: C.panelLine, width: 1 } });
  s.addText("ENLACES SEMANTICOS  →  DBpedia", { x: PX + 0.3, y: 2.8, w: 4.8, h: 0.3, margin: 0, fontFace: MONO, fontSize: 10, charSpacing: 1, color: C.blue, valign: "middle" });
  const links: [string, string, string][] = [
    ["Casa", "owl:equivalentClass  House", C.mint],
    ["Villa", "owl:equivalentClass  Villa", C.mint],
    ["Wifi", "owl:sameAs  Wi-Fi", C.coral],
    ["Piscina", "owl:sameAs  Swimming pool", C.coral],
    ["La Paz", "owl:sameAs  La Paz", C.gold],
  ];
  links.forEach(([local, pred, col], i) => {
    const y = 3.32 + i * 0.55;
    node(s, PX + 0.45, y + 0.16, 0.07, String(col), false);
    s.addText(
      [
        { text: `${local}`, options: { color: C.text, bold: true } },
        { text: `   ${pred}`, options: { color: C.textDim } },
      ],
      { x: PX + 0.7, y, w: 4.4, h: 0.34, margin: 0, fontFace: MONO, fontSize: 10.5, valign: "middle", fit: "shrink" },
    );
  });

  takeaway(s, "DBpedia agrega equivalencias; conecta nuestros conceptos con vocabulario reconocido.", C.blue);
  pageMark(s, 3);
}

function slide04() {
  const s = pptx.addSlide();
  stage(s);
  eyebrow(s, 4, "Arquitectura y multilenguaje");
  title(s, "Cada capa cumple una funcion dentro del flujo", TITLE_Y, 30);
  lede(s, "El procesamiento de lenguaje natural es un solo bloque: un modelo de lenguaje en linea interpreta la consulta y devuelve filtros.");

  const layers: [string, string, string, string][] = [
    ["layers", "Aplicacion web", "Next.js · React · Tailwind CSS", C.mint],
    ["network", "Ontologia", "OWL/RDF · Airbnb.owl", C.mint],
    ["database", "Servidor semantico", "Apache Jena Fuseki", C.mint],
    ["search", "Consulta", "SPARQL", C.mint],
    ["brain-circuit", "PLN", "Modelo de lenguaje en linea  →  filtros estructurados", C.coral],
    ["workflow", "Ejecucion", "Bun", C.mint],
  ];
  const RY = 2.65;
  const RH = 0.5;
  const RG = 0.1;
  layers.forEach(([ic, a, b, col], i) => {
    const y = RY + i * (RH + RG);
    const active = a === "PLN";
    s.addShape(pptx.ShapeType.roundRect, { x: MARGIN_X, y, w: 7.7, h: RH, rectRadius: 0.05, fill: { color: active ? C.coral : C.panel }, line: { color: active ? C.coral : C.panelLine, width: 1 } });
    icon(s, ic, MARGIN_X + 0.2, y + 0.13, 0.24, active ? C.ink : col, 2);
    s.addText(a, { x: MARGIN_X + 0.56, y, w: 2.3, h: RH, margin: 0, fontFace: DISPLAY, fontSize: 11.5, bold: true, color: active ? C.ink : C.text, valign: "middle" });
    s.addText(b, { x: MARGIN_X + 2.95, y, w: 4.65, h: RH, margin: 0, fontFace: MONO, fontSize: 10, color: active ? C.ink : C.textDim, valign: "middle", fit: "shrink" });
  });

  // Panel multilenguaje a la derecha.
  const PX = 8.95;
  s.addShape(pptx.ShapeType.roundRect, { x: PX, y: RY, w: PAGE_W - PX - MARGIN_X, h: 3.7, rectRadius: 0.08, fill: { color: C.night2 }, line: { color: C.panelLine, width: 1 } });
  icon(s, "languages", PX + 0.28, RY + 0.2, 0.3, C.blue, 2);
  s.addText("MULTILENGUAJE", { x: PX + 0.66, y: RY + 0.22, w: 3.0, h: 0.28, margin: 0, fontFace: MONO, fontSize: 10, charSpacing: 1.5, color: C.blue, valign: "middle" });
  // rutas por idioma.
  ["/es", "/en", "/fr"].forEach((r, i) => {
    chip(s, r, PX + 0.28 + i * 1.05, RY + 0.62, 0.92, C.blue);
  });
  s.addText("Rutas por idioma en la interfaz.", { x: PX + 0.28, y: RY + 1.22, w: 3.5, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11, color: C.textDim, valign: "top" });
  s.addText(
    [
      { text: "El usuario consulta en lenguaje natural en cualquier idioma. ", options: { color: C.textDim } },
      { text: "El PLN interpreta la intencion y la convierte en filtros comunes.", options: { color: C.text, bold: true } },
    ],
    { x: PX + 0.28, y: RY + 1.7, w: 3.55, h: 1.8, margin: 0, fontFace: BODY, fontSize: 12, lineSpacingMultiple: 1.12, valign: "top" },
  );

  takeaway(s, "El PLN no trae alojamientos; traduce intencion humana a filtros que la API puede usar.", C.coral);
  pageMark(s, 4);
}

function slide05() {
  const s = pptx.addSlide();
  stage(s);
  eyebrow(s, 5, "Fuentes de datos");
  title(s, "Una base controlada y fuentes federadas con roles separados", TITLE_Y, 28, "roles separados");
  lede(s, "Separar fuentes evita confundir almacenamiento local, enriquecimiento y busqueda online.");

  const sources: [string, string, string, string, string][] = [
    ["database", "Airbnb.owl", "LOCAL", "Alojamientos, clases, individuos, relaciones, precios y perfiles.", C.mint],
    ["sparkles", "DBpedia", "ENRIQUECIMIENTO + ONLINE", "Equivalencias semanticas y resultados externos en vivo.", C.coral],
    ["globe", "Wikidata", "ONLINE", "Entidades de alojamientos y contexto relacionado.", C.blue],
    ["map-pinned", "OpenStreetMap / LinkedGeoData", "ONLINE", "Hoteles, direcciones, contacto, horarios y amenidades.", C.gold],
  ];
  const RY = 2.75;
  const RH = 0.82;
  const RG = 0.18;
  sources.forEach(([ic, src, role, aporta, col], i) => {
    const y = RY + i * (RH + RG);
    s.addShape(pptx.ShapeType.roundRect, { x: MARGIN_X, y, w: PAGE_W - 2 * MARGIN_X, h: RH, rectRadius: 0.07, fill: { color: C.panel }, line: { color: C.panelLine, width: 1 } });
    s.addShape(pptx.ShapeType.rect, { x: MARGIN_X, y, w: 0.09, h: RH, fill: { color: String(col) }, line: { type: "none" } });
    iconBadge(s, ic, MARGIN_X + 0.5, y + RH / 2, 0.24, String(col));
    s.addText(String(src), { x: MARGIN_X + 0.92, y, w: 3.5, h: RH, margin: 0, fontFace: DISPLAY, fontSize: 13.5, bold: true, color: C.text, valign: "middle", fit: "shrink" });
    s.addText(String(role), { x: MARGIN_X + 4.5, y: y + 0.14, w: 3.0, h: 0.26, margin: 0, fontFace: MONO, fontSize: 9, charSpacing: 1, color: String(col), valign: "middle", fit: "shrink" });
    s.addText(String(aporta), { x: MARGIN_X + 4.5, y: y + 0.4, w: 6.9, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11, color: C.textDim, valign: "middle", fit: "shrink" });
  });

  takeaway(s, "Separar fuentes evita confundir almacenamiento local, enriquecimiento y busqueda federada.", C.mint);
  pageMark(s, 5);
}

function slide06() {
  const s = pptx.addSlide();
  stage(s);
  eyebrow(s, 6, "Flujo de busqueda");
  title(s, "De frase natural a resultados ordenados", TITLE_Y, 31, "frase natural");

  // Consulta humana (coral) -> salida de maquina (mono).
  const BY = 1.95;
  const BH = 1.2;
  s.addShape(pptx.ShapeType.roundRect, { x: MARGIN_X, y: BY, w: 5.65, h: BH, rectRadius: 0.07, fill: { color: C.panel }, line: { color: C.coral, width: 1.5 } });
  s.addText("LENGUAJE HUMANO", { x: MARGIN_X + 0.26, y: BY + 0.16, w: 4, h: 0.22, margin: 0, fontFace: MONO, fontSize: 9, charSpacing: 1.5, color: C.coral, valign: "middle" });
  s.addText('"villa para familia en Santa Cruz con piscina"', { x: MARGIN_X + 0.26, y: BY + 0.42, w: 5.15, h: 0.68, margin: 0, fontFace: DISPLAY, fontSize: 16, bold: true, color: C.text, valign: "middle", fit: "shrink" });

  // flecha entre cajas
  s.addShape(pptx.ShapeType.rightArrow, { x: 6.55, y: BY + BH / 2 - 0.16, w: 0.7, h: 0.32, fill: { color: C.mint }, line: { type: "none" } });

  s.addShape(pptx.ShapeType.roundRect, { x: 7.45, y: BY, w: PAGE_W - 7.45 - MARGIN_X, h: BH, rectRadius: 0.07, fill: { color: C.night2 }, line: { color: C.mint, width: 1.5 } });
  s.addText("FILTROS ESTRUCTURADOS", { x: 7.7, y: BY + 0.16, w: 4.5, h: 0.22, margin: 0, fontFace: MONO, fontSize: 9, charSpacing: 1.5, color: C.mint, valign: "middle" });
  s.addText(
    [
      { text: "tipo", options: { color: C.textFaint } }, { text: "=Villa   ", options: { color: C.text } },
      { text: "perfil", options: { color: C.textFaint } }, { text: "=Familia\n", options: { color: C.text } },
      { text: "ciudad", options: { color: C.textFaint } }, { text: "=Santa Cruz   ", options: { color: C.text } },
      { text: "amenidad", options: { color: C.textFaint } }, { text: "=Piscina", options: { color: C.text } },
    ],
    { x: 7.7, y: BY + 0.42, w: 4.9, h: 0.68, margin: 0, fontFace: MONO, fontSize: 11.5, bold: true, lineSpacingMultiple: 1.15, valign: "middle", fit: "shrink" },
  );

  // Pipeline de 7 pasos en una linea, con icono por paso.
  const steps: [string, string, string][] = [
    ["search", "Frontend", C.blue],
    ["route", "/api/buscar", C.text],
    ["brain-circuit", "PLN", C.coral],
    ["sliders-horizontal", "Filtros", C.mint],
    ["database", "SPARQL + Fuseki", C.mint],
    ["coins", "Scoring", C.gold],
    ["layers", "Cards", C.blue],
  ];
  const SW = 1.55;
  const SH = 1.0;
  const SY = 3.95;
  const GAP = (PAGE_W - 2 * MARGIN_X - steps.length * SW) / (steps.length - 1);
  steps.forEach(([ic, t, col], i) => {
    const x = MARGIN_X + i * (SW + GAP);
    const isAccent = t === "PLN" || t === "Scoring";
    s.addShape(pptx.ShapeType.roundRect, { x, y: SY, w: SW, h: SH, rectRadius: 0.07, fill: { color: isAccent ? String(col) : C.panel }, line: { color: String(col), width: 1.5 } });
    s.addText(`0${i + 1}`, { x: x + 0.12, y: SY + 0.08, w: 0.6, h: 0.2, margin: 0, fontFace: MONO, fontSize: 8.5, color: isAccent ? C.ink : C.textFaint, valign: "middle" });
    icon(s, ic, x + SW / 2 - 0.16, SY + 0.26, 0.32, isAccent ? C.ink : String(col), 2);
    s.addText(t, { x: x + 0.06, y: SY + 0.62, w: SW - 0.12, h: 0.34, margin: 0, fontFace: DISPLAY, fontSize: 10, bold: true, color: isAccent ? C.ink : C.text, align: "center", valign: "middle", fit: "shrink" });
    if (i < steps.length - 1) {
      const ax = x + SW + GAP / 2 - 0.1;
      s.addShape(pptx.ShapeType.rightArrow, { x: ax, y: SY + SH / 2 - 0.08, w: 0.2, h: 0.16, fill: { color: C.edge }, line: { type: "none" } });
    }
  });

  takeaway(s, "Primero se extrae intencion; luego se consulta la ontologia; al final el scoring ordena.", C.mint);
  pageMark(s, 6);
}

function slide07() {
  const s = pptx.addSlide();
  stage(s);
  eyebrow(s, 7, "Relevancia y modos");
  title(s, "Dos modos, un mismo criterio de relevancia", TITLE_Y, 30, "relevancia");
  lede(s, "El orden no sale de palabras sueltas: combina filtros fuertes, perfil, amenidades, zona y texto.", BODY_Y, 7.3);

  // Scoring: barras horizontales con peso semantico.
  s.addText("PESOS DE SCORING", { x: MARGIN_X, y: 2.65, w: 4, h: 0.26, margin: 0, fontFace: MONO, fontSize: 10, charSpacing: 1.5, color: C.gold, valign: "middle" });
  const BAR_X = 3.55;
  const UNIT = 0.62;
  const RY = 3.1;
  const RH = 0.44;
  const scoring: [string, string, number, string][] = [
    ["layers", "Tipo de propiedad", 4, C.mint],
    ["map-pin", "Zona", 3, C.blue],
    ["wifi", "Amenidad especifica", 3, C.coral],
    ["users", "Perfil de huesped", 2, C.gold],
    ["star", "Buena calificacion", 2, C.text],
    ["tag", "Palabra clave", 1, C.textDim],
  ];
  scoring.forEach(([ic, name, score, col], i) => {
    const y = RY + i * RH;
    icon(s, ic, MARGIN_X, y + 0.04, 0.24, String(col), 2);
    s.addText(String(name), { x: MARGIN_X + 0.34, y, w: 2.55, h: 0.32, margin: 0, fontFace: BODY, fontSize: 11, bold: true, color: C.text, valign: "middle" });
    // track
    s.addShape(pptx.ShapeType.roundRect, { x: BAR_X, y: y + 0.07, w: 4 * UNIT, h: 0.18, rectRadius: 0.03, fill: { color: C.night2 }, line: { type: "none" } });
    s.addShape(pptx.ShapeType.roundRect, { x: BAR_X, y: y + 0.07, w: Number(score) * UNIT, h: 0.18, rectRadius: 0.03, fill: { color: String(col) }, line: { type: "none" } });
    s.addText(`+${score}`, { x: BAR_X + 4 * UNIT + 0.15, y, w: 0.5, h: 0.32, margin: 0, fontFace: MONO, fontSize: 11.5, bold: true, color: String(col), valign: "middle" });
  });

  // Tarjetas Offline / Online.
  const CY = 2.62;
  const CH = 3.5;
  const CW = 2.2;
  const cards: [string, string, string[], string][] = [
    ["OFFLINE", "Control sobre la ontologia propia", ["Airbnb.owl", "Jena Fuseki", "SPARQL"], C.mint],
    ["ONLINE", "Amplia el alcance en vivo", ["DBpedia", "Wikidata", "OpenStreetMap"], C.blue],
  ];
  cards.forEach(([h, sub, items, col], i) => {
    const x = 7.85 + i * (CW + 0.3);
    s.addShape(pptx.ShapeType.roundRect, { x, y: CY, w: CW, h: CH, rectRadius: 0.1, fill: { color: C.panel }, line: { color: String(col), width: 1.5 } });
    s.addShape(pptx.ShapeType.rect, { x: x + 0.0, y: CY, w: CW, h: 0.07, fill: { color: String(col) }, line: { type: "none" } });
    s.addText(String(h), { x: x + 0.26, y: CY + 0.28, w: CW - 0.5, h: 0.4, margin: 0, fontFace: DISPLAY, fontSize: 20, bold: true, color: String(col), valign: "middle" });
    s.addText(String(sub), { x: x + 0.26, y: CY + 0.78, w: CW - 0.5, h: 0.5, margin: 0, fontFace: BODY, fontSize: 10.5, italic: true, color: C.textDim, valign: "top", lineSpacingMultiple: 1.05, fit: "shrink" });
    (items as string[]).forEach((it, j) => {
      const iy = CY + 1.55 + j * 0.52;
      node(s, x + 0.36, iy + 0.13, 0.06, String(col));
      s.addText(it, { x: x + 0.56, y: iy, w: CW - 0.7, h: 0.3, margin: 0, fontFace: MONO, fontSize: 11, color: C.text, valign: "middle", fit: "shrink" });
    });
  });

  takeaway(s, "Offline da control; online amplia el alcance; el scoring ordena ambos con pesos semanticos.", C.gold);
  pageMark(s, 7);
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
