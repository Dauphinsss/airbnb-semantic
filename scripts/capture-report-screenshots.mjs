import { chromium } from "playwright";
import path from "node:path";

const baseUrl = "http://localhost:3000";
const outDir = path.join(process.cwd(), "semantic-tex", "images");

async function waitForResults(page, timeout = 20000) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const hasCards = await page.locator("article").count();
    const hasLoading = await page.locator("text=Cargando catálogo, text=Loading catalog, text=Chargement du catalogue").count();
    if (hasCards > 0 && hasLoading === 0) {
      await page.waitForTimeout(1500);
      return;
    }
    await page.waitForTimeout(1000);
  }
}

async function setMode(page, mode) {
  const label = mode === "online" ? /Online/ : /Offline/;
  await page.getByRole("button", { name: label }).click();
  await page.waitForTimeout(1000);
  await waitForResults(page, mode === "online" ? 25000 : 12000);
}

async function search(page, query, timeout = 25000) {
  const input = page.getByRole("textbox");
  await input.click();
  await input.fill("");
  await input.fill(query);
  await page.getByRole("button", { name: /Buscar|Search|Rechercher/ }).click();
  await waitForResults(page, timeout);
}

async function capture(page, file) {
  await page.screenshot({ path: path.join(outDir, file), fullPage: true });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });

await page.goto(`${baseUrl}/es`, { waitUntil: "networkidle" });
await waitForResults(page);
await capture(page, "ui_inicio_es.png");

await page.goto(`${baseUrl}/en`, { waitUntil: "networkidle" });
await waitForResults(page);
await capture(page, "ui_inicio_en.png");

await page.goto(`${baseUrl}/fr`, { waitUntil: "networkidle" });
await waitForResults(page);
await capture(page, "ui_inicio_fr.png");

await page.goto(`${baseUrl}/es`, { waitUntil: "networkidle" });
await waitForResults(page);
await search(page, "villa para familia en Santa Cruz con piscina y precio alto", 18000);
await capture(page, "ui_busqueda_compleja_es_1.png");

await page.goto(`${baseUrl}/es`, { waitUntil: "networkidle" });
await waitForResults(page);
await search(page, "departamento para trabajo remoto en Cochabamba con Wi-Fi y parking", 18000);
await capture(page, "ui_busqueda_compleja_es_2.png");

await page.goto(`${baseUrl}/en`, { waitUntil: "networkidle" });
await waitForResults(page);
await search(page, "apartment for remote work in Cochabamba with Wi-Fi and parking", 18000);
await capture(page, "ui_busqueda_compleja_en_1.png");

await page.goto(`${baseUrl}/es`, { waitUntil: "networkidle" });
await waitForResults(page);
await setMode(page, "online");
await capture(page, "ui_inicio_online_es.png");

await search(page, "hotel con wifi", 25000);
await capture(page, "ui_busqueda_online_es_1.png");

await search(page, "ITC Ratnadipa", 25000);
await capture(page, "ui_busqueda_online_es_2.png");

await search(page, "Gevora Hotel", 25000);
await capture(page, "ui_busqueda_online_es_3.png");

await browser.close();
