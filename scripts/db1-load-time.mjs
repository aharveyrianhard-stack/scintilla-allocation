/* DB1 — how fast the first screen is on a cold cache: a fresh browser context each time (nothing cached), the tool served the way Vercel
   serves it (the harness), three runs. Prints, per run: when the first screen's frame was drawn (DB1_READY), the browser's first contentful
   paint, and when the live number arrived. The brief asks for the first screen in under 2 s.   node scripts/db1-load-time.mjs */
import { startServer, chromium } from "../tests/_harness.mjs";
const srv = await startServer(), browser = await chromium.launch({ headless: true }), runs = [];
try { for (let i = 0; i < 3; i++) { const ctx = await browser.newContext({ viewport: { width: 1680, height: 1050 } }); const page = await ctx.newPage(); await page.route("**/*", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
    const t0 = Date.now(); await page.goto(srv.url, { waitUntil: "commit" }); await page.waitForFunction(() => window.DB1_READY === true, null, { timeout: 30000 }); const frame = Date.now() - t0;
    await page.waitForFunction(() => document.querySelector("#db1-root[data-version]"), null, { timeout: 150000 }); const number = Date.now() - t0;
    const paint = await page.evaluate(() => { const p = performance.getEntriesByType("paint").find((x) => x.name === "first-contentful-paint"); const n = performance.getEntriesByType("navigation")[0]; return { fcp: p ? Math.round(p.startTime) : null, domContentLoaded: n ? Math.round(n.domContentLoadedEventEnd) : null, transfer: n ? n.transferSize : null }; });
    runs.push({ run: i + 1, frameMs: frame, firstContentfulPaintMs: paint.fcp, domContentLoadedMs: paint.domContentLoaded, numberMs: number }); await ctx.close(); } } finally { await browser.close(); srv.server.close(); }
console.log(JSON.stringify(runs)); const worst = Math.max(...runs.map((r) => r.frameMs)); console.log(`the first screen's frame: worst ${worst} ms of 3 cold runs · the live number: ${runs.map((r) => (r.numberMs / 1000).toFixed(1) + " s").join(", ")}`); process.exit(worst < 2000 ? 0 : 1);
