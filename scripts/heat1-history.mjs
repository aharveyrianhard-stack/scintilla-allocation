/* HEAT1 (6 Oct 2026) — the heat's history, replayed with the page's own voter formulas, and the 2W P1 breakouts.
   Study only: writes study/heat1/data/heat1.json; nothing on the live page reads it.
   node scripts/heat1-history.mjs [cacheDir]   (cacheDir: a folder of <SYM>_<TF>.json candle answers and data/*.json table pulls;
   without it everything is fetched from the chart API and the database, read-only). */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "study/heat1/data"); fs.mkdirSync(OUT, { recursive: true });
const CACHE = process.argv[2] || null;
const API = "https://scintilla-massive-chart-api.fly.dev", SB = "https://wadinxqplrggagkvrdag.supabase.co/rest/v1";
const KEY = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/const SB_ANON='([^']+)'/)[1];
const DAY = 864e5;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const clamp = (x) => Math.max(-1, Math.min(1, x));

/* ---------- the page's own constants (index.html DEFAULTS; Alan's saved weights live in his browser and are not read here) ---------- */
const WTS = { SPY: 1, QQQ: 1, IWM: 0.5, SMH: 0.5, VIX: 0.5, US10Y: 0.5, OIL: 0.5, VALUE: 0, CRYPTO: 0.25, DEF: 0.25, BREADTH_EW: 0.5, BREADTH_SC: 0.25, SECTORS: 0.75, VIX_TERM: 0.25, CURVE: 0.5, PCC: 0, SKEW: 0.25, ADLINE: 0.5, TRIN: 0.25, B_VOL: 0.25, CONC: 0.5, CREDIT: 0.5, DURATION: 0.25, HAVEN: 0.25 };
const VIX_COLD = 30, TEN_COLD = 4.8;
/* the Hub's Geiger (provider services/hot-query/geiger-from-massive.mjs): per rung the newest 230 bars; TREND = order of the nine-line fan,
   MOMENTUM = 0.6 × RSI(14) on 23..77 + 0.4 × Williams %R(14) on −90..−10; the rung reads 0.5 trend + 0.5 momentum; rungs blend by the
   Equalizer's weights. The Hub uses seven rungs (3h 4h 6h 12h D 3D W); two years of intraday bars are not kept, so this replay uses the
   three daily-and-up rungs with their Equalizer weights — the scout's "daily" fallback — and reports its distance from the seven-rung number. */
const RUNGS = { D: 3.178477, "3D": 2.576738, W: 0.987499 };
const RSI_OS = 23, RSI_OB = 77, W_OS = -90, W_OB = -10, W_RSI = 0.6, W_WILL = 0.4;
function ema(a, n) { const k = 2 / (n + 1); let e = a[0]; const o = [e]; for (let i = 1; i < a.length; i++) { e = a[i] * k + e * (1 - k); o.push(e); } return o; }
function sma(a, n) { const o = []; let s = 0; const q = []; for (const x of a) { q.push(x); s += x; if (q.length > n) s -= q.shift(); o.push(q.length >= n ? s / n : null); } return o; }
function rsiLast(c, p = 14) { let g = 0, l = 0; for (let i = 1; i <= p; i++) { const d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; } g /= p; l /= p;
  for (let i = p + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; g = (g * (p - 1) + (d > 0 ? d : 0)) / p; l = (l * (p - 1) + (d < 0 ? -d : 0)) / p; } return 100 - 100 / (1 + (l === 0 ? 1e9 : g / l)); }
function fan(src) { const specs = [["e", 5], ["e", 8], ["e", 13], ["e", 21], ["e", 34], ["s", 50], ["s", 100], ["s", 150], ["s", 200]]; const out = [];
  for (const [ty, n] of specs) { if (src.length < n) continue; const s = ty === "e" ? ema(src, n) : sma(src, n); const last = s[s.length - 1]; if (last != null) out.push(last); } return out; }
function rung(bars) { const b = bars.slice(-230); if (b.length < 15) return null; const c = b.map((x) => x.c), h = b.map((x) => x.h), l = b.map((x) => x.l), close = c[c.length - 1];
  const f = fan(c); const pairs = f.length - 1; let inOrder = 0; for (let i = 0; i < pairs; i++) if (f[i] > f[i + 1]) inOrder++; const trend = pairs > 0 ? (2 * inOrder - pairs) / pairs : null;
  const rsi = rsiLast(c, 14); let hh = -1e18, ll = 1e18; for (let j = c.length - 14; j < c.length; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
  const wr = hh > ll ? (hh - close) / (hh - ll) * -100 : -50; const mom = (clamp((rsi - RSI_OS) / (RSI_OB - RSI_OS) * 2 - 1) * W_RSI + clamp((wr - W_OS) / (W_OB - W_OS) * 2 - 1) * W_WILL) / (W_RSI + W_WILL);
  if (trend == null) return null; return { trend, mom, read: 0.5 * trend + 0.5 * mom }; }

/* ---------- reads ---------- */
async function candles(sym, tf, limit) { const f = CACHE && path.join(CACHE, `${sym}_${tf}.json`); if (f && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8")).series || [];
  const r = await fetch(`${API}/candles?symbol=${sym}&tf=${tf}&limit=${limit}`, { headers: { Origin: "https://scintillahub.ai" } }); if (!r.ok) throw new Error(sym + " " + tf + " " + r.status); return (await r.json()).series || []; }
async function table(name, q) { const f = CACHE && path.join(CACHE, "data", name + ".json"); if (f && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const out = []; for (let off = 0; ; off += 1000) { const r = await fetch(`${SB}/${q}&limit=1000&offset=${off}`, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } }); if (!r.ok) throw new Error(name + " " + r.status); const rows = await r.json(); out.push(...rows); if (rows.length < 1000) break; } return out; }

const GEI = ["SPY", "QQQ", "IWM", "SMH", "RSP", "HYG", "TLT", "XLP", "XLU", "BTCUSD", "CLUSD", "GCUSD"];
const bars = {}; for (const s of GEI) bars[s] = { D: await candles(s, "D", 800), "3D": await candles(s, "3D", 700), W: await candles(s, "W", 450) };
const two = { SPY: await candles("SPY", "2W", 400), QQQ: await candles("QQQ", "2W", 400) };
const treas = await table("treasury", "treasury_rates?select=date,y2,y10&date=gte.2024-08-01&order=date.asc");
const vixT = await table("vix", "vix_term?select=date,vix,vix3m,skew&date=gte.2024-08-01&order=date.asc");
const intern = await table("internals", "market_internals?select=asof,advancers,decliners,trin,adv_volume,dec_volume,universe&asof=gte.2024-08-01&order=asof.asc");

/* ---------- the Geiger, day by day: completed higher-rung bars from the provider, the forming one built from the daily bars ---------- */
function geigerSeries(sym) {
  const D = bars[sym].D; const out = {};
  for (const tf of ["3D", "W"]) { const span = tf === "3D" ? 3 * DAY : 7 * DAY; bars[sym][tf + "_span"] = span; }
  for (let i = 0; i < D.length; i++) {
    const d = D[i], dEnd = d.t + DAY; const reads = [], used = [];
    const dr = rung(D.slice(0, i + 1)); if (dr) { reads.push([RUNGS.D, dr]); used.push("D"); }
    for (const tf of ["3D", "W"]) { const span = bars[sym][tf + "_span"], P = bars[sym][tf]; const done = P.filter((b) => b.t + span <= dEnd);
      const lastStart = done.length ? done[done.length - 1].t + span : null; // the forming bar starts where the last completed one ended
      let forming = null; if (lastStart != null && lastStart <= d.t) { const ds = D.filter((x) => x.t >= lastStart && x.t <= d.t); if (ds.length) forming = { t: lastStart, o: ds[0].o, h: Math.max(...ds.map((x) => x.h)), l: Math.min(...ds.map((x) => x.l)), c: ds[ds.length - 1].c }; }
      const seq = forming ? [...done, forming] : done; const r = rung(seq); if (r) { reads.push([RUNGS[tf], r]); used.push(tf); } }
    if (!reads.length) continue; const W = reads.reduce((t, [w]) => t + w, 0);
    out[iso(d.t)] = { g: reads.reduce((t, [w, r]) => t + w * r.read, 0) / W, trend: reads.reduce((t, [w, r]) => t + w * r.trend, 0) / W, mom: reads.reduce((t, [w, r]) => t + w * r.mom, 0) / W, rungs: used.join(","), close: d.c };
  }
  return out;
}
const G = {}; for (const s of GEI) G[s] = geigerSeries(s);

/* ---------- the other inputs, by date, carried forward a few days (the page itself reads the newest row) ---------- */
function byDate(rows, key) { const m = {}; for (const r of rows) m[r[key]] = r; return m; }
const TR = byDate(treas, "date"), VX = byDate(vixT, "date"), IN = byDate(intern, "asof");
function latest(map, date, maxDays) { for (let k = 0; k <= maxDays; k++) { const d = iso(Date.parse(date) - k * DAY); if (map[d]) return { row: map[d], asof: d, age: k }; } return null; }
const sessions = bars.SPY.D.map((b) => iso(b.t)); // equity sessions
const FROM = iso(Date.parse(sessions[sessions.length - 1]) - 2 * 366 * DAY);
const dates = sessions.filter((d) => d >= FROM);
const closes = {}; for (const s of GEI) closes[s] = Object.fromEntries(bars[s].D.map((b) => [iso(b.t), b.c]));
function ret20(sym, date) { const D = bars[sym].D, i = D.findIndex((b) => iso(b.t) === date); if (i < 20) return null; return D[i].c / D[i - 20].c - 1; }

/* ---------- each replayable voter, with the formulas voters() uses ---------- */
const REPLAY = ["SPY", "QQQ", "IWM", "SMH", "VIX", "US10Y", "OIL", "CRYPTO", "BREADTH_EW", "BREADTH_SC", "VIX_TERM", "CURVE", "ADLINE", "TRIN", "B_VOL", "CONC", "CREDIT", "DURATION", "HAVEN", "DEF"];
const NO_PAST = { SECTORS: "the blended sector bow tie needs five readings per sector (the fund's Geiger, the Hub compare, the served names, the tree, the ranking); only the fund's Geiger has a past, so the blend cannot be replayed" };
const NOTES = {
  ADLINE: "the page's live row counts the served set's own advance/decline line from daily bars; that set was not stored day by day, so the history uses the page's fallback — the market_internals table's advancers minus decliners over their sum, × 2 — whose universe grew from a few hundred issues (2024) to over 20,000 (2026)",
  TRIN: "market_internals, stored with gaps; a reading is carried up to 7 days, as the page reads the newest row", B_VOL: "market_internals, as TRIN",
  SPY: "Geiger rebuilt on the D, 3D and W rungs only (see the method); the live page uses seven rungs", QQQ: "as SPY", IWM: "as SPY", SMH: "as SPY", OIL: "CLUSD Geiger, three rungs, sign turned", CRYPTO: "BTCUSD Geiger, three rungs", CREDIT: "HYG Geiger, three rungs", DURATION: "TLT Geiger, three rungs", HAVEN: "GCUSD Geiger, three rungs, sign turned", DEF: "XLP and XLU Geigers, three rungs, averaged, sign turned", BREADTH_EW: "RSP Geiger minus SPY Geiger, three rungs", BREADTH_SC: "IWM Geiger minus SPY Geiger, three rungs",
  VIX: "vix_term close; the live page reads the spot VIX intraday", VIX_TERM: "vix_term close ÷ its 3-month leg", US10Y: "treasury_rates", CURVE: "treasury_rates 10y − 2y", CONC: "SPY and RSP daily bars: the equal-weight 20-session return minus the cap-weight one, ÷ 0.05"
};
function voterVals(date) {
  const g = (s) => (G[s][date] ? clamp(G[s][date].g) : null); const o = {};
  o.SPY = g("SPY"); o.QQQ = g("QQQ"); o.IWM = g("IWM"); o.SMH = g("SMH");
  const vx = latest(VX, date, 5), tr = latest(TR, date, 5), inn = latest(IN, date, 7);
  o.VIX = vx && vx.row.vix != null ? clamp(((VIX_COLD + 12) / 2 - vx.row.vix) / ((VIX_COLD - 12) / 2)) : null;
  o.US10Y = tr && tr.row.y10 != null ? clamp(((TEN_COLD + 3.5) / 2 - tr.row.y10) / ((TEN_COLD - 3.5) / 2)) : null;
  o.OIL = g("CLUSD") != null ? clamp(-g("CLUSD")) : null; o.CRYPTO = g("BTCUSD");
  o.BREADTH_EW = g("RSP") != null && g("SPY") != null ? clamp(g("RSP") - g("SPY")) : null;
  o.BREADTH_SC = g("IWM") != null && g("SPY") != null ? clamp(g("IWM") - g("SPY")) : null;
  o.VIX_TERM = vx && vx.row.vix != null && vx.row.vix3m ? clamp((1 - vx.row.vix / vx.row.vix3m) * 4) : null;
  o.CURVE = tr && tr.row.y10 != null && tr.row.y2 != null ? clamp((tr.row.y10 - tr.row.y2) / 1.5) : null;
  if (inn && inn.row.advancers != null && inn.row.decliners != null) { const ad = (inn.row.advancers - inn.row.decliners) / Math.max(1, inn.row.advancers + inn.row.decliners); o.ADLINE = clamp(ad * 2); } else o.ADLINE = null;
  o.TRIN = inn && inn.row.trin != null ? clamp((1 - +inn.row.trin) * 2) : null;
  o.B_VOL = inn && inn.row.adv_volume > 0 && inn.row.dec_volume > 0 ? clamp((inn.row.adv_volume - inn.row.dec_volume) / (inn.row.adv_volume + inn.row.dec_volume) * 3) : null;
  const rs = ret20("SPY", date), rr = ret20("RSP", date); o.CONC = rs != null && rr != null ? clamp((rr - rs) / 0.05) : null;
  o.CREDIT = g("HYG"); o.DURATION = g("TLT"); o.HAVEN = g("GCUSD") != null ? clamp(-g("GCUSD")) : null;
  o.DEF = g("XLP") != null && g("XLU") != null ? clamp(-(g("XLP") + g("XLU")) / 2) : null;
  o._asof = { vix: vx && vx.asof, treasury: tr && tr.asof, internals: inn && inn.asof };
  return o;
}
function heatOn(vals, keys) { let num = 0, den = 0, missing = []; for (const k of keys) { const w = WTS[k] ?? 0; if (!w) continue; if (vals[k] == null) { missing.push(k); continue; } num += vals[k] * w; den += w; } return { heat: den ? num / den : null, w: den, missing }; }
const series = []; const perVoter = Object.fromEntries(REPLAY.map((k) => [k, []]));
for (const d of dates) { const v = voterVals(d); const h = heatOn(v, REPLAY); series.push({ date: d, heat: h.heat, w: h.w, missing: h.missing, spy: closes.SPY[d], qqq: closes.QQQ[d], asof: v._asof, v: Object.fromEntries(REPLAY.map((k) => [k, v[k] == null ? null : +v[k].toFixed(4)])) }); for (const k of REPLAY) perVoter[k].push(v[k]); }
const coverage = Object.fromEntries(REPLAY.map((k) => { const have = series.filter((s) => s.v[k] != null); return [k, { from: have.length ? have[0].date : null, to: have.length ? have[have.length - 1].date : null, days: have.length, of: series.length, weight: WTS[k], note: NOTES[k] || "" }]; }));
const full = series.filter((s) => s.heat != null && !s.missing.length);

/* ---------- the three-rung Geiger against the Hub's seven-rung number on the last stored evening ---------- */
let check = null; try { const r = await fetch(`${API}/v1/scout-geiger`, { headers: { Origin: "https://scintillahub.ai" } }); const j = await r.json(); const cols = j.row_columns; const last = dates[dates.length - 1];
  check = { as_of: j.as_of, rows: GEI.map((s) => { const row = j.rows.find((x) => x[0] === s); const mine = G[s][last]; return { sym: s, date: last, three_rung: mine ? +mine.g.toFixed(3) : null, seven_rung: row ? +row[cols.indexOf("composite")].toFixed(3) : null, diff: row && mine ? +(mine.g - row[cols.indexOf("composite")]).toFixed(3) : null }; }) };
} catch (e) { check = { error: String(e) }; }

/* ---------- the 2W P1 rule: the latest confirmed two-week pivot high; a break = the first daily close above it after it is confirmed ---------- */
/* The Indicator Lab's reviewed grid tags these pivots "D/PU … confirmed high" — the D family's ta.pivothigh(high, left, right) on the 2W
   source bars. The lengths actually set on the chart are not in the saved evidence; the Channels source ships 10/10, which cannot produce
   the reviewed dates. Left ≥ 2 with right 2 or 3 reproduces every reviewed 2W pivot high on SPY and QQQ (26 May 2026 and 3 Aug 2026 on
   SPY; 26 May 2026 on QQQ, with 20 Jan 2026 as the one before). This uses left 2, right 2 and says so. */
const PL = 2, PR = 2;
function pivots(S) { const out = []; for (let i = PL; i < S.length - PR; i++) { const h = S[i].h; if (S.slice(i - PL, i).every((b) => h > b.h) && S.slice(i + 1, i + PR + 1).every((b) => h >= b.h)) out.push({ i, t: S[i].t, date: iso(S[i].t), high: h, confirmedAt: iso(S[i + PR].t + 14 * DAY - DAY) }); } return out; }
function breaks(sym) {
  const S = two[sym], D = bars[sym].D, P = pivots(S), events = [];
  for (let k = 0; k < P.length; k++) { const p = P[k], next = P[k + 1]; const until = next ? next.confirmedAt : "9999";
    const day = D.find((b) => iso(b.t) > p.confirmedAt && iso(b.t) <= until && b.c > p.high);
    const bar2w = S.find((b) => b.t > S[p.i + PR].t && iso(b.t) <= until && b.c > p.high);
    events.push({ sym, pivotDate: p.date, pivotHigh: p.high, confirmedAt: p.confirmedAt, breakDate: day ? iso(day.t) : null, breakClose: day ? day.c : null, break2W: bar2w ? iso(bar2w.t) : null, replacedAt: !day && next ? next.confirmedAt : null }); }
  return { pivots: P, events };
}
const B = { SPY: breaks("SPY"), QQQ: breaks("QQQ") };
const idx = Object.fromEntries(series.map((s, i) => [s.date, i]));
function around(date) { const i = idx[date]; if (i == null) return null; const at = (k) => (series[i + k] ? { date: series[i + k].date, heat: series[i + k].heat, v: series[i + k].v } : null);
  const s0 = series[i]; const r = (sym, k) => (series[i + k] && s0[sym] ? +(series[i + k][sym] / s0[sym] - 1).toFixed(4) : null);
  return { before: at(-1), day: at(0), p5: at(5), p10: at(10), p20: at(20), spy20: r("spy", 20), qqq20: r("qqq", 20), spy5: r("spy", 5), qqq5: r("qqq", 5) }; }
const eventsOut = [];
for (const sym of ["SPY", "QQQ"]) for (const e of B[sym].events) { if (!e.breakDate || e.breakDate < FROM) continue; eventsOut.push({ ...e, around: around(e.breakDate) }); }
eventsOut.sort((a, b) => (a.breakDate < b.breakDate ? 1 : -1));
const standing = {}; for (const sym of ["SPY", "QQQ"]) { const P = B[sym].pivots; const p = P[P.length - 1]; const lastClose = bars[sym].D[bars[sym].D.length - 1]; standing[sym] = { pivotDate: p.date, pivotHigh: p.high, confirmedAt: p.confirmedAt, lastClose: lastClose.c, lastCloseDate: iso(lastClose.t), above: lastClose.c > p.high }; }
const REG = { SPY: { tv: 777.439633, when: "2026-08-03 (TV 2W bar) = 2026-08-02 (provider 2W bar)" }, QQQ: { tv: 747.04878292, when: "2026-05-26 (TV 2W bar) = 2026-05-24 (provider 2W bar)" } };

fs.writeFileSync(path.join(OUT, "heat1.json"), JSON.stringify({ built_utc: new Date().toISOString(), from: FROM, to: dates[dates.length - 1], weights: WTS, replay: REPLAY, noPast: NO_PAST, rungs: RUNGS, pivotRule: { left: PL, right: PR, note: "ta.pivothigh(high, 2, 2) on the provider's 2W bars; a break = the first daily close above the pivot high after the bar that confirms it" },
  registry: REG, coverage, fullDays: full.length, days: series.length, series, check, pivots: { SPY: B.SPY.pivots, QQQ: B.QQQ.pivots }, events: eventsOut, standing }, null, 0));
console.log(JSON.stringify({ days: series.length, full: full.length, from: FROM, to: dates[dates.length - 1], check, standing, events: eventsOut.map((e) => [e.sym, e.pivotDate, e.pivotHigh, e.confirmedAt, e.breakDate, e.breakClose, e.around && e.around.day && e.around.day.heat]), coverage: Object.fromEntries(Object.entries(coverage).map(([k, c]) => [k, c.days + "/" + c.of + " " + c.from])) }, null, 1));
