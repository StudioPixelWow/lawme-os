import pkg from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";
const { chromium } = pkg;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:3214/dev/dino?scenario=matter&view=full", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.screenshot({ path: "screenshots/premium/after-07-fullpage.png", fullPage: true });
console.log("shot after-07-fullpage.png");
await b.close();
