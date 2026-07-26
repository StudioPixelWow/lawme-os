import pkg from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";
const { chromium } = pkg;
const URL = "http://localhost:3213/dev/dino?scenario=matter&view=full";
const OUT = "screenshots/workbench";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

// locate the workspace container by its heading text
const ws = page.locator("[data-testid=\"legal-workspace\"]").last();
await ws.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

async function shotTab(labelHe, file) {
  const btn = page.getByRole("button", { name: new RegExp(labelHe) }).last();
  await btn.click();
  await page.waitForTimeout(350);
  await ws.scrollIntoViewIfNeeded();
  await ws.screenshot({ path: `${OUT}/${file}` });
  console.log("shot", file);
}
// default (steps) view first
await ws.screenshot({ path: `${OUT}/wb-01-steps.png` }); console.log("shot wb-01-steps.png");
await shotTab("ראיות", "wb-02-evidence.png");
await shotTab("שאלות ללקוח", "wb-03-client.png");
await shotTab("סיכונים", "wb-04-risk.png");
await shotTab("ציר זמן", "wb-05-timeline.png");
await shotTab("סוגיות פתוחות", "wb-06-issues.png");
await shotTab("שאלות למעסיק", "wb-07-employer.png");

// full page for context
await page.screenshot({ path: `${OUT}/wb-00-fullpage.png`, fullPage: true });
console.log("shot wb-00-fullpage.png");
await browser.close();
console.log("done");
