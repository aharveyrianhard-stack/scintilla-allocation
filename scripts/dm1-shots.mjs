/* DM1 — picture the study page at 1680 and 390, headless, every non-GET blocked. node scripts/dm1-shots.mjs [outdir] */
import fs from "node:fs"; import path from "node:path"; import { openPage, ROOT } from "../tests/_harness.mjs";
const OUT = process.argv[2] || path.join(ROOT, "study/dm1/pictures"); fs.mkdirSync(OUT, { recursive: true });
for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h, path: "study/dm1/DM1.html" }); const { page } = P;
  try { await page.waitForFunction(() => window.DM1_READY === true, null, { timeout: 60000 }); await page.waitForTimeout(500);
    const shot = (n, sel) => (sel ? page.locator(sel).screenshot({ path: path.join(OUT, `${n}-${w}.png`) }) : page.screenshot({ path: path.join(OUT, `${n}-${w}.png`) }));
    await shot("dm1-00-first-screen");
    for (const [n, sel] of [["dm1-01-tonight-matrix-bars", "#p-today"], ["dm1-02-the-table", "#p-table"], ["dm1-03-credit", "#p-credit"], ["dm1-04-putcall", "#p-putcall"], ["dm1-05-ten-year", "#p-ten"], ["dm1-06-mapping", "#p-map"], ["dm1-07-replay", "#p-replay"], ["dm1-08-alans-rule", "#p-alan"], ["dm1-09-what-could-be-wrong", "#p-wrong"]]) await shot(n, sel);
    await page.evaluate(() => { document.querySelectorAll("#p-today details").forEach((d) => (d.open = true)); }); await page.waitForTimeout(200); await shot("dm1-01b-reasons-and-last-ten", "#p-today");
    await page.screenshot({ path: path.join(OUT, `dm1-99-full-page-${w}.png`), fullPage: true });
    console.log(w, "errors", P.errors.length, "non-GET blocked", P.nonGet.blocked); } finally { await P.close(); } }
console.log("pictures in", OUT, fs.readdirSync(OUT).length);
