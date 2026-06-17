import fs from "node:fs";
import path from "node:path";

// Lee un icono de lucide-react (formato __iconNode) y lo convierte en un SVG
// data-URI con el color de trazo deseado. Asi podemos embeber iconos vectoriales
// nitidos en el .pptx sin depender de fuentes de iconos ni de internet.

const ICON_DIR = path.resolve(process.cwd(), "node_modules/lucide-react/dist/esm/icons");

type IconNode = [string, Record<string, string | number>];

function parseIconNode(source: string): IconNode[] {
  const start = source.indexOf("__iconNode = [");
  if (start === -1) throw new Error("no __iconNode");
  const arrStart = source.indexOf("[", start);
  // Encuentra el cierre balanceado del array.
  let depth = 0;
  let end = arrStart;
  for (let i = arrStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = source.slice(arrStart, end + 1);
  // Parser tolerante: las claves no llevan comillas en el .mjs.
  const json = body.replace(/([{,]\s*)([a-zA-Z0-9_-]+)(\s*:)/g, '$1"$2"$3');
  const raw = JSON.parse(json) as Array<[string, Record<string, string | number>]>;
  return raw;
}

const cache = new Map<string, IconNode[]>();

function loadIcon(name: string): IconNode[] {
  if (cache.has(name)) return cache.get(name)!;
  const file = path.join(ICON_DIR, `${name}.mjs`);
  if (!fs.existsSync(file)) throw new Error(`lucide icon not found: ${name}`);
  const nodes = parseIconNode(fs.readFileSync(file, "utf8"));
  cache.set(name, nodes);
  return nodes;
}

export function lucideDataUri(name: string, color: string, strokeWidth = 2): string {
  const nodes = loadIcon(name);
  const inner = nodes
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== "key")
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `<${tag} ${a}/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
