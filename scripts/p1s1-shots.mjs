import pkg from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";
const { chromium } = pkg;

const BASE = "http://localhost:3210/dev/legal-citation";
const OUT = "screenshots/p1s1";
const shots = [
  { file: "01-notice.png", url: `${BASE}?scenario=notice`, w: 900, h: 900 },
  { file: "02-minwage-current.png", url: `${BASE}?scenario=minwage-current`, w: 900, h: 900 },
  { file: "03-minwage-historical.png", url: `${BASE}?scenario=minwage-historical`, w: 900, h: 900 },
  { file: "04-needs-facts.png", url: `${BASE}?scenario=needs-facts`, w: 900, h: 800 },
  { file: "05-out-of-scope.png", url: `${BASE}?scenario=out-of-scope`, w: 900, h: 700 },
  { file: "06-gallery.png", url: BASE, w: 900, h: 1600, full: true },
  { file: "07-mobile.png", url: BASE, w: 390, h: 1400, full: true },
];

const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  await page.goto(s.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${s.file}`, fullPage: s.full === true });
  console.log("shot", s.file);
  await page.close();
}
await browser.close();
console.log("done");
