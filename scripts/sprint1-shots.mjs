import pkg from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";
const { chromium } = pkg;
const PORT = process.env.PORT || "3211";
const BASE = `http://localhost:${PORT}/dev/dino`;
const OUT = process.env.OUT || "screenshots/sprint1";
const label = process.env.LABEL || "after";
const shots = [
  { file: `${label}-01-matter-compact.png`, url: `${BASE}?scenario=matter`, w: 480, h: 1000 },
  { file: `${label}-02-matter-full.png`, url: `${BASE}?scenario=matter&view=full`, w: 900, h: 1900, full: true },
  { file: `${label}-03-missing.png`, url: `${BASE}?scenario=missing`, w: 480, h: 1000 },
  { file: `${label}-04-general.png`, url: `${BASE}?scenario=general`, w: 480, h: 1000 },
  { file: `${label}-05-loading.png`, url: `${BASE}?scenario=matter&view=loading&stage=2`, w: 480, h: 700 },
  { file: `${label}-06-mobile.png`, url: `${BASE}?scenario=matter`, w: 390, h: 1000 },
];
const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  const resp = await page.goto(s.url, { waitUntil: "networkidle" });
  if (!resp || resp.status() >= 400) { console.log("skip", s.file, resp && resp.status()); await page.close(); continue; }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${s.file}`, fullPage: s.full === true });
  console.log("shot", s.file);
  await page.close();
}
await browser.close();
console.log("done");
