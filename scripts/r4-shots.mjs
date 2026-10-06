/* R4 — (a) read today's heat, rung and voters off the live tool's own code in a headless browser → study/r4/data/today.json;
   (b) picture the study page at 1680 and 390.   node scripts/r4-shots.mjs [outdir]   Study only; nothing on the live page changes. */
import fs from "node:fs"; import path from "node:path";
import { openPage, ROOT } from "../tests/_harness.mjs";
const OUT = process.argv[2] || path.join(ROOT, "study/r4/pictures"); fs.mkdirSync(OUT, { recursive: true });
const DATA = path.join(ROOT, "study/r4/data");
{
  const P = await openPage({ width: 1680, height: 1050 }); const { page } = P;
  await page.waitForFunction(() => document.getElementById("heatnum").textContent !== "—", null, { timeout: 90000 }); await page.waitForTimeout(1500);
  const today = await page.evaluate(() => { const V = voters(); const can = (v) => (typeof canVote === "function" ? canVote(v) : v.val != null);
    const rows = V.map((v) => ({ key: v.key, name: v.name, val: v.val == null ? null : +v.val.toFixed(4), w: S.wts[v.key] ?? 0, sub: v.sub || "", counts: can(v) && (S.wts[v.key] ?? 0) > 0 }));
    const T = sectorTally();
    return { read_utc: new Date().toISOString(), heat: heat(), rung: policyStep(heat()), brief: document.getElementById("brief").innerText.split("\n")[0], rows: rows.filter((r) => r.counts).map(({ counts, ...r }) => r), notVoting: V.filter((v) => !can(v)).map((v) => v.name), sectors: { n: T.n, leading: T.leading.length, lagging: T.lagging.length, turning: T.turning.length, bow: T.bowAvg }, weightsAreDefaults: JSON.stringify(S.wts) === JSON.stringify(DEFAULTS.wts) }; });
  fs.writeFileSync(path.join(DATA, "today.json"), JSON.stringify(today, null, 1));
  console.log("live tool: heat", today.heat.toFixed(3), today.rung, "voters", today.rows.length, "errors", P.errors.length);
  await P.close();
}
const readout = {};
for (const [w, h] of [[1680, 1050], [390, 844]]) {
  const P = await openPage({ width: w, height: h, path: "study/r4/R4.html" }); const { page } = P;
  await page.waitForFunction(() => window.READY != null, null, { timeout: 60000 }); await page.waitForTimeout(500);
  const shot = (n, sel) => sel ? page.locator(sel).screenshot({ path: path.join(OUT, `${n}-${w}.png`) }) : page.screenshot({ path: path.join(OUT, `${n}-${w}.png`) });
  await shot("r4-00-first-screen"); await shot("r4-01-both-dials", "#p-dials"); await shot("r4-02-regime", "#p-regime"); await shot("r4-03-stretch", "#p-stretch"); await shot("r4-04-tree", "#p-tree"); await shot("r4-05-template-vs-us", "#p-template"); await shot("r4-06-history", "#p-history");
  await shot("r4-07-indexes-side-by-side", "#p-indexes"); await shot("r4-08-index-pullbacks", "#p-pullbacks"); await shot("r4-09-midpoint", "#p-midpoint"); await shot("r4-10-core-and-satellite", "#p-coresat"); await shot("r4-11-oversold-deserved-or-not", "#p-oversold"); await shot("r4-12-cohort-bow-tie", "#p-bowtie");
  await page.evaluate(() => { document.querySelectorAll("#p-tree details").forEach((d) => (d.open = true)); }); await page.waitForTimeout(200); await shot("r4-04b-tree-every-cohort", "#p-tree");
  await page.screenshot({ path: path.join(OUT, `r4-99-full-page-${w}.png`), fullPage: true });
  readout[w] = await page.evaluate(() => ({ indexes: document.getElementById("indexwords").innerText, midpoint: document.getElementById("midwords").innerText, coresat: document.getElementById("coresat").innerText.slice(0, 700), oversold: document.getElementById("oversoldcounts").innerText, bowgroups: document.getElementById("bowgroups").innerText, stamp: document.getElementById("stamp").textContent, ready: window.READY, dials: document.getElementById("dials").innerText, template: document.getElementById("template").innerText + "\n" + document.getElementById("whydiffer").innerText, counts: document.getElementById("counts").innerText, summary: document.getElementById("summary").innerText, width: document.documentElement.scrollWidth }));
  readout[w].errors = P.errors; readout[w].nonGet = P.nonGet; await P.close();
}
fs.writeFileSync(path.join(OUT, "readout.json"), JSON.stringify(readout, null, 1));
console.log("pictures in", OUT, fs.readdirSync(OUT).length, "files; page errors", readout[1680].errors, "phone scroll width", readout[390].width);
