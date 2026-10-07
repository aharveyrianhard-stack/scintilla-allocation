/* DM2 (7 Oct 2026) — the live line checked from the command line, with the same module the page runs (study/dm2/live.mjs).
     node scripts/dm2-live-check.mjs
   1 · rebuilds the engine's inputs for the model's own as-of session from the chart API's 420 daily bars and sets them beside the numbers
       the build got from the full history (study/dm2/data/dm2-live.json → check) — the two must agree;
   2 · prints the reading from the live prices of this minute. Reads only; prints no key. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { readLive, alignCloses, inputsAt, fetchCandles, fetchQuotes, etParts, shouldRefresh, nextRead } from "../study/dm2/live.mjs";
import { deploy2 } from "../study/dm2/engine.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const base = JSON.parse(fs.readFileSync(path.join(ROOT, "study/dm2/data/dm2-live.json"), "utf8"));
const API = "https://scintilla-massive-chart-api.fly.dev"; const getApi = async (p) => { const r = await fetch(API + p, { headers: { Origin: "https://scintillahub.ai" }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(p.split("?")[0] + " " + r.status); return r.json(); };
const candles = await fetchCandles(getApi), S = alignCloses(candles), k = S.dates.indexOf(base.check.date);
const out = { asOf: base.check.date, bars: S.dates.length, firstBar: S.dates[0], lastBar: S.dates.at(-1), check: null, live: null };
if (k >= 0) { const inp = inputsAt(S, k, base), d = deploy2(inp, base.model, base.check.prior); const rows = {}; for (const key of Object.keys(base.check.inputs)) rows[key] = { fullHistory: base.check.inputs[key], from420Bars: inp[key] == null ? null : +inp[key].toFixed(3), gap: inp[key] == null || base.check.inputs[key] == null ? null : +(inp[key] - base.check.inputs[key]).toFixed(3) };
  out.check = { inputs: rows, pct: { fullHistory: base.check.pct, from420Bars: d.pct }, line: { fullHistory: base.check.line, from420Bars: d.line } }; }
const { quotes, macro } = await fetchQuotes(getApi), R = readLive({ base, candles, quotes, macro }), now = etParts();
out.live = { newYork: now.date + " " + now.hhmm, session: R.session, live: R.live, missing: R.missing, spy: R.inputs.detail.spy, qqq: R.inputs.detail.qqq, vix: R.inputs.detail.vix, hyg: R.inputs.detail.hyg, gld: R.inputs.detail.gld, rsi: +R.inputs.rsi.toFixed(1), vixPct: +R.inputs.vixPct.toFixed(1), break100: +R.inputs.break100.toFixed(2), weaker: R.inputs.detail.weaker, goldX: +R.inputs.goldX.toFixed(1), credit: +R.inputs.credit.toFixed(2),
  matrix: R.reading.matrixPct, votes: R.reading.votes.map((v) => [v.key, +v.points.toFixed(1)]), reading: R.reading.pct, prior: R.prior, line: R.reading.line, money: R.money, lights: R.lights.map((l) => [l.key, l.missing ? null : +l.points.toFixed(1), l.wouldSay ?? null]), payoutsEstimated: R.payoutsEstimated, due: shouldRefresh(now, null), next: nextRead(now), reasons: R.reading.reasons };
console.log(JSON.stringify(out, null, 1));
