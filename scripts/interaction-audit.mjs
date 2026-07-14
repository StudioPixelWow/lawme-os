/**
 * Automated dead-affordance interaction audit (Sprint 3.2).
 * Loads the RENDERED Matter Room and fails (exit 1) when any of these hold:
 *   - an enabled control (button / [role=button] / a[href]) changes neither URL
 *     nor DOM (opens no surface) when activated  → dead affordance
 *   - a visible link points to "#" or ""                → fake link
 *   - keyboard activation (Enter on a focused control) does not open a surface
 *   - a console/page error occurs while loading or interacting
 * Requires a running server (default http://localhost:3000) and Playwright.
 *
 *   node scripts/interaction-audit.mjs [url]
 */
// Resolve Playwright: prefer the project/global install; allow an explicit path.
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  const alt = process.env.PLAYWRIGHT_MODULE_PATH;
  if (!alt) {
    console.error("Playwright is required for the interaction audit (npm i -D playwright, or set PLAYWRIGHT_MODULE_PATH).");
    process.exit(2);
  }
  const pw = await import(alt);
  chromium = pw.chromium ?? pw.default?.chromium;
}

const URL = process.argv[2] || "http://localhost:3000/matters/demo";
const EXEC = process.env.PLAYWRIGHT_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("[data-matter-room]");
await page.waitForTimeout(1000);

const badHrefs = await page.$$eval("[data-matter-room] a", (as) =>
  as.filter((a) => ["#", "", null].includes(a.getAttribute("href"))).map((a) => a.textContent.trim()));

const sel = '[data-matter-room] button:not([disabled]), [data-matter-room] a[href], [data-matter-room] [role="button"]:not([disabled])';
const total = (await page.$$(sel)).length;
const dead = [];
for (let i = 0; i < total; i++) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(100);
  const els = await page.$$(sel);
  if (i >= els.length) break;
  const el = els[i];
  const label = ((await el.textContent()) || (await el.getAttribute("aria-label")) || "").trim().slice(0, 50);
  const beforeUrl = page.url();
  const beforeDialog = await page.$('[role="dialog"],[role="alertdialog"]');
  let changed = false;
  try {
    await el.scrollIntoViewIfNeeded();
    await el.click({ timeout: 1500 });
    await page.waitForTimeout(160);
    changed = page.url() !== beforeUrl || (!beforeDialog && !!(await page.$('[role="dialog"],[role="alertdialog"]')));
  } catch { changed = false; }
  if (!changed) dead.push(label || "(no label)");
}
await page.keyboard.press("Escape").catch(() => {});

// keyboard activation
let keyboardOk = false;
try {
  const row = await page.$("[data-score-row]");
  await row.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  keyboardOk = !!(await page.$('[role="dialog"]'));
} catch { /* ignore */ }

await browser.close();

const fail = dead.length > 0 || badHrefs.length > 0 || !keyboardOk || errors.length > 0;
console.log(JSON.stringify({ url: URL, totalControls: total, dead, badHrefs, keyboardActivation: keyboardOk, errors }, null, 2));
console.log(fail ? "\nINTERACTION AUDIT: FAILED" : "\nINTERACTION AUDIT: PASSED");
process.exit(fail ? 1 : 0);
