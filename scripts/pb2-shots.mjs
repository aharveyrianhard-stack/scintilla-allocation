/* PB2 (7 Oct 2026) — picture the study page, headless, at 1680 and at 390 wide. Every non-GET request is blocked and counted.
     node scripts/pb2-shots.mjs [outdir]
   Writes one picture of the first screen and one per panel at each width, plus shots.json (what was measured on the page). */
import fs from "node:fs"; import path from "node:path";
import { startServer, chromium, ROOT } from "../tests/_harness.mjs";
const OUT = process.argv[2] || path.join(ROOT, "study/pb2/pictures"); fs.mkdirSync(OUT, { recursive: true });
const srv = await startServer(); const browser = await chromium.launch({ headless: true }); const report = { taken_utc: new Date().toISOString(), widths: {} };
try {
  for (const [w, h] of [[1680, 1050], [390, 844]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1 })).newPage(); const errors = []; let nonGet = 0, failed = [];
    await page.route("**/*", (r) => { if (r.request().method() !== "GET") { nonGet++; return r.abort(); } r.continue(); });
    page.on("pageerror", (e) => errors.push(String(e))); page.on("requestfailed", (r) => failed.push(r.url()));
    await page.goto(srv.url + "study/pb2/PB2.html", { waitUntil: "networkidle", timeout: 120000 });
    const m = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, height: document.documentElement.scrollHeight,
      small: [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11 && e.getClientRects().length).length,
      panels: [...document.querySelectorAll(".panel")].map((p) => p.id), tiles: document.querySelectorAll(".tile").length, tables: document.querySelectorAll("table").length, emptyCells: [...document.querySelectorAll("td")].filter((t) => /undefined|NaN|None|null/.test(t.textContent)).length }));
    await page.screenshot({ path: path.join(OUT, `top-${w}.png`) });
    for (const id of m.panels) { const el = await page.$("#" + id); if (!el) continue;
      if (w > 500) { await el.screenshot({ path: path.join(OUT, `${id.replace("p-", "")}-${w}.png`) }); continue; }
      /* on the phone a whole panel is too tall to read as one picture: the first two screens of it instead */
      const box = await el.boundingBox(); await page.screenshot({ path: path.join(OUT, `${id.replace("p-", "")}-${w}.png`), fullPage: true, clip: { x: 0, y: box.y, width: w, height: Math.min(box.height, 1650) } }); }
    const chart = await page.$(".chart"); if (chart) { await chart.scrollIntoViewIfNeeded(); await chart.screenshot({ path: path.join(OUT, `chart-${w}.png`) }); }
    if (w < 500) { /* a wide table on the phone: it scrolls inside its own frame, the page does not */
      const t = await page.$("#p-layer .wrap"); if (t) { await t.scrollIntoViewIfNeeded(); await t.screenshot({ path: path.join(OUT, `layer-table-${w}.png`) }); } }
    report.widths[w] = { ...m, errors, nonGetBlocked: nonGet, failedRequests: failed };
    console.log(w, JSON.stringify({ ...m, errors: errors.length, nonGet, failed: failed.length }));
    await page.close();
  }
} finally { await browser.close(); srv.server.close(); }
fs.writeFileSync(path.join(OUT, "shots.json"), JSON.stringify(report, null, 1));
