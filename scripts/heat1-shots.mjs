/* HEAT1 — (a) read today's voters off the live tool's own code in a headless browser → study/heat1/data/today.json;
   (b) picture the study page at 1680 and 390.   node scripts/heat1-shots.mjs [outdir]   Study only; nothing on the live page changes. */
import fs from "node:fs"; import path from "node:path";
import { openPage, ROOT } from "../tests/_harness.mjs";
const OUT = process.argv[2] || path.join(ROOT, "study/heat1/pictures"); fs.mkdirSync(OUT, { recursive: true });
const DATA = path.join(ROOT, "study/heat1/data");
// (a) today's voters from index.html
{
  const P = await openPage({ width: 1680, height: 1050 }); const { page } = P;
  await page.waitForFunction(() => document.getElementById("heatnum").textContent !== "—", null, { timeout: 90000 }); await page.waitForTimeout(1500);
  const today = await page.evaluate(() => { const V = voters(); const can = (v) => (typeof canVote === "function" ? canVote(v) : v.val != null);
    const rows = V.map((v) => ({ key: v.key, name: v.name, val: v.val == null ? null : +v.val.toFixed(4), w: S.wts[v.key] ?? 0, sub: v.sub || "", counts: can(v) && (S.wts[v.key] ?? 0) > 0 }));
    const notVoting = V.filter((v) => !can(v)).map((v) => ({ name: v.name, why: v.val == null ? "no reading" : "folded" }));
    const quotes = { SPY: QUOTES && QUOTES.SPY ? QUOTES.SPY.price : null, QQQ: QUOTES && QUOTES.QQQ ? QUOTES.QQQ.price : null };
    return { read_utc: new Date().toISOString(), heat: heat(), rung: policyStep(heat()), rows: rows.filter((r) => r.counts).map(({ counts, ...r }) => r), all: rows, notVoting, quotes, weightsAreDefaults: JSON.stringify(S.wts) === JSON.stringify(DEFAULTS.wts) }; });
  try { const r = await fetch("https://scintilla-massive-chart-api.fly.dev/quotes?symbols=SPY,QQQ", { headers: { Origin: "https://scintillahub.ai" } }); const j = await r.json(); const q = j.quotes || j.rows || j; const pick = (s) => { const row = Array.isArray(q) ? q.find((x) => x.symbol === s) : q[s]; return row ? (row.price ?? row.last ?? null) : null; }; today.quotes = { SPY: pick("SPY"), QQQ: pick("QQQ"), read_utc: j.generated_utc || null }; } catch (e) { today.quotes = { SPY: null, QQQ: null, error: String(e) }; }
  fs.writeFileSync(path.join(DATA, "today.json"), JSON.stringify(today, null, 1));
  console.log("today", today.heat, today.rung, "voters", today.rows.length, "weight", today.rows.reduce((t, r) => t + r.w, 0), "quotes", today.quotes, "defaults", today.weightsAreDefaults, "errors", P.errors.length);
  await P.close();
}
// (b) the study page
const readout = {};
for (const [w, h] of [[1680, 1050], [390, 844]]) {
  const P = await openPage({ width: w, height: h, path: "study/heat1/HEAT1.html" }); const { page } = P;
  await page.waitForFunction(() => window.LESSON != null, null, { timeout: 60000 }); await page.waitForTimeout(500);
  const shot = (n, sel) => sel ? page.locator(sel).screenshot({ path: path.join(OUT, `${n}-${w}.png`) }) : page.screenshot({ path: path.join(OUT, `${n}-${w}.png`) });
  await shot("heat1-00-first-screen");
  await shot("heat1-01-today-taken-apart", "#p-today");
  await shot("heat1-02-history-under-spy-qqq", "#p-history");
  await page.evaluate(() => { document.querySelectorAll("#p-history details").forEach((d) => (d.open = true)); }); await page.waitForTimeout(200);
  await shot("heat1-02b-coverage-open", "#p-history");
  await shot("heat1-03-breakouts", "#p-breaks");
  await page.evaluate(() => { document.querySelectorAll("#p-breaks details").forEach((d) => (d.open = true)); }); await page.waitForTimeout(200);
  await shot("heat1-03b-breakouts-every-voter", "#p-breaks");
  await shot("heat1-04-lesson", "#p-lesson");
  await page.screenshot({ path: path.join(OUT, `heat1-99-full-page-${w}.png`), fullPage: true });
  readout[w] = await page.evaluate(() => ({ stamp: document.getElementById("stamp").textContent, percentile: document.getElementById("percentile").innerText, liveReplay: window.LIVE_REPLAY, lesson: window.LESSON, todayTable: document.querySelector("#today table") ? document.querySelector("#today table").innerText : null, events: document.querySelector("#events table").innerText, errors: [] }));
  readout[w].errors = P.errors; readout[w].nonGet = P.nonGet;
  await P.close();
}
fs.writeFileSync(path.join(OUT, "readout.json"), JSON.stringify(readout, null, 1));
console.log("pictures in", OUT, fs.readdirSync(OUT).length, "files; page errors", readout[1680].errors);
