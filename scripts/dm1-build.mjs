/* DM1 (7 Oct 2026) — the deployment engine, measured. Study only: writes study/dm1/data/dm1.json; nothing on the live page reads it.
   node scripts/dm1-build.mjs <cacheDir> [<hm1.json>]
     cacheDir   the folder scripts/hm1-pull.mjs filled (SPY_D, VIX_D, HYG_D, US10Y_D, US3M_D, data/vix.json, data/treasury.json) plus
                data/hyg_adjusted_fmp.json (scripts/dm1-fmp-hyg.mjs, a keyed read on a throw-away Fly machine) and data/putcall.json
                (put_call_history — the CBOE equity ratio to 4 Oct 2019 — and the IB market estimate since 24 Sep 2026)
     hm1.json   the heat-at-the-bottoms replay (its evening-by-evening heat → today's ladder, for the payoff comparison)
   Every evening from 2 Jan 2008 to 6 Oct 2026 on SPY's sessions. Prices are the chart API's; returns are on closes (no SPY payouts). */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { deploy, readSheet, LADDER, RUNG_PCTL } from "../study/dm1/engine.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const OUT = path.join(ROOT, "study/dm1/data"); fs.mkdirSync(OUT, { recursive: true });
const CACHE = process.argv[2]; const HM1 = process.argv[3]; if (!CACHE || !fs.existsSync(path.join(CACHE, "SPY_D.json"))) { console.error("usage: node scripts/dm1-build.mjs <cacheDir> [hm1.json]"); process.exit(2); }
const J = (f) => JSON.parse(fs.readFileSync(f, "utf8")); const iso = (t) => new Date(t).toISOString().slice(0, 10);
const r4 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(4)), r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3)), r1 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(1));
const med = (a) => { const x = a.filter((v) => v != null && isFinite(v)).sort((p, q) => p - q); return x.length ? (x.length % 2 ? x[x.length >> 1] : (x[(x.length >> 1) - 1] + x[x.length >> 1]) / 2) : null; };
const mean = (a) => { const x = a.filter((v) => v != null && isFinite(v)); return x.length ? x.reduce((p, q) => p + q, 0) / x.length : null; };
const sd = (a) => { const x = a.filter((v) => v != null && isFinite(v)); const m = mean(x); return Math.sqrt(mean(x.map((v) => (v - m) ** 2))); };
const pctl = (sorted, q) => { if (!sorted.length) return null; const k = (sorted.length - 1) * q / 100, lo = Math.floor(k), hi = Math.ceil(k); return sorted[lo] + (sorted[hi] - sorted[lo]) * (k - lo); };
const share = (a) => { const x = a.filter((v) => v != null); return x.length ? { up: x.filter((v) => v > 0).length, of: x.length, share: x.filter((v) => v > 0).length / x.length } : null; };

/* ---------- series on SPY's clock ---------- */
const spyAll = J(path.join(CACHE, "SPY_D.json")).series.filter((b) => b.c != null); const dates = spyAll.map((b) => iso(b.t)); const close = spyAll.map((b) => b.c); const N = dates.length; const ix = Object.fromEntries(dates.map((d, i) => [d, i]));
const byDate = (rows, key, val) => { const m = new Map(); for (const r of rows) { const v = typeof val === "function" ? val(r) : r[val]; if (v != null && isFinite(v)) m.set(typeof key === "function" ? key(r) : r[key], +v); } return m; };
const lastKnown = (m) => { const out = new Array(N).fill(null); let cur = null; const keys = [...m.keys()].sort(); let k = 0; for (let i = 0; i < N; i++) { while (k < keys.length && keys[k] <= dates[i]) { cur = m.get(keys[k]); k++; } out[i] = cur; } return out; };
/* VIX: the vix_term table's close (2003 →, 6 Oct 2026 = 15.01), the chart API's FMP series before and where the table has a hole */
const vixT = byDate(J(path.join(CACHE, "data/vix.json")), "date", "vix"); const vixA = byDate(J(path.join(CACHE, "VIX_D.json")).series, (b) => iso(b.t), "c"); const vixM = new Map([...vixA, ...vixT]); const vix = lastKnown(vixM);
/* HYG price-only (chart API) and with payouts added back (FMP dividend-adjusted) */
const hygP = lastKnown(byDate(J(path.join(CACHE, "HYG_D.json")).series, (b) => iso(b.t), "c")); const hygAdjRows = J(path.join(CACHE, "data/hyg_adjusted_fmp.json")).adjusted.rows; const hygA = lastKnown(new Map(hygAdjRows.map((r) => [r[0], r[1]])));
/* the 10-year: the chart API's FMP yield series, the treasury table for the days after it */
const tenM = new Map([...byDate(J(path.join(CACHE, "US10Y_D.json")).series, (b) => iso(b.t), "c")]); for (const r of J(path.join(CACHE, "data/treasury.json"))) if (!tenM.has(r.date) && r.y10 != null) tenM.set(r.date, +r.y10); const ten = lastKnown(tenM);
const bill = lastKnown(byDate(J(path.join(CACHE, "US3M_D.json")).series, (b) => iso(b.t), "c"));
/* the equity put/call: CBOE's own to 4 Oct 2019, IB's market estimate since 24 Sep 2026 (its own scale; fewer than a year of sessions → no percentile yet) */
const PC = J(path.join(CACHE, "data/putcall.json")); const pcC = lastKnown(new Map(PC.cboe.filter((r) => r.kind === "equity").map((r) => [r.date, r.ratio]))); const pcI = lastKnown(new Map(PC.ib.filter((r) => r.measured > 0 && r.put_call != null).map((r) => [r.session_et, r.put_call])));
const pcCdates = new Set(PC.cboe.filter((r) => r.kind === "equity").map((r) => r.date)); const pcLast = PC.cboe.filter((r) => r.kind === "equity").map((r) => r.date).sort().at(-1);

/* ---------- indicators ---------- */
function rsi14(c) { const out = new Array(c.length).fill(null); let g = 0, l = 0; for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1]; const up = Math.max(d, 0), dn = Math.max(-d, 0); if (i <= 14) { g += up / 14; l += dn / 14; if (i === 14) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } else { g = (g * 13 + up) / 14; l = (l * 13 + dn) / 14; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } } return out; }
function sma(c, n) { const out = new Array(c.length).fill(null); let s = 0, k = 0; for (let i = 0; i < c.length; i++) { if (c[i] == null) { s = 0; k = 0; continue; } s += c[i]; k++; if (k > n) { s -= c[i - n]; k = n; } if (k === n) out[i] = s / n; } return out; }
/* the place of today's value among the trailing year (252 sessions, today included): the share of those strictly below it, 0–100 */
function yearPct(v, win = 252) { const out = new Array(v.length).fill(null); for (let i = 0; i < v.length; i++) { if (v[i] == null) continue; let below = 0, n = 0; for (let k = Math.max(0, i - win + 1); k <= i; k++) { if (v[k] == null) continue; n++; if (v[k] < v[i]) below++; } if (n >= 200) out[i] = 100 * below / (n - 1 || 1); } return out; }
const rsi = rsi14(close), s200 = sma(close, 200), vixPct = yearPct(vix), hygA200 = sma(hygA, 200), hygP200 = sma(hygP, 200), ten200 = sma(ten, 200), tenRsi = rsi14(ten.map((v) => v ?? 0)), tenPct = yearPct(tenRsi), pcPct = yearPct(pcC);
const rising = s200.map((v, i) => (v == null || s200[i - 21] == null ? null : v > s200[i - 21]));
const creditA = hygA.map((v, i) => (v == null || hygA200[i] == null ? null : v > hygA200[i])), creditP = hygP.map((v, i) => (v == null || hygP200[i] == null ? null : v > hygP200[i]));
const tenAbove = ten.map((v, i) => (v == null || ten200[i] == null ? null : v > ten200[i]));
/* forward outcomes on closes */
const fwd = (n) => close.map((c, i) => (i + n < N ? close[i + n] / c - 1 : null)); const r20 = fwd(20), r60 = fwd(60), r120 = fwd(120);
const dip = (n) => close.map((c, i) => { if (i + n >= N) return null; let m = c; for (let k = i + 1; k <= i + n; k++) m = Math.min(m, close[k]); return m / c - 1; }); const dip20 = dip(20), dip60 = dip(60), dip120 = dip(120);

/* ---------- the evenings the sheets are measured on ---------- */
const FROM = ix["2008-01-02"], LAST = N - 1;
const ev = []; for (let i = FROM; i <= LAST; i++) if (rsi[i] != null && vixPct[i] != null) ev.push(i);
const evOut = ev.filter((i) => r60[i] != null);   // the evenings with a measured 60-session outcome
console.error("evenings", ev.length, "with 60-session outcome", evOut.length, dates[ev[0]], "→", dates[evOut.at(-1)]);

/* ---------- kernel-smoothed sheets ---------- */
const GRID = { rsi: [], pct: [] }; for (let r = 15; r <= 90; r += 2.5) GRID.rsi.push(r); for (let p = 0; p <= 100; p += 5) GRID.pct.push(p);
const BW = { rsi: 4, pct: 8 };   // the kernel's width: a neighbour 4 RSI points or 8 percentile points away counts e^-0.5 ≈ 61% as much
const FIELDS = { med20: r20, med60: r60, med120: r120, dip20: dip20, dip60: dip60, dip120: dip120 }; const SHARES = { share20: r20, share60: r60, share120: r120 };
function buildSheet(idx, fearOf, label) {
  const pts = idx.map((i) => ({ i, x: rsi[i], y: fearOf(i) })).filter((p) => p.y != null);
  const sorted = Object.fromEntries(Object.entries(FIELDS).map(([k, arr]) => [k, [...pts.keys()].filter((q) => arr[pts[q].i] != null).sort((a, b) => arr[pts[a].i] - arr[pts[b].i])]));
  const sheet = { label, n: [], near: [], neff: [], thin: [] }; for (const k of Object.keys(FIELDS)) sheet[k] = []; for (const k of Object.keys(SHARES)) sheet[k] = [];
  for (const r0 of GRID.rsi) { const rowN = [], rowNear = [], rowE = [], rowT = [], rows = {}; for (const k of [...Object.keys(FIELDS), ...Object.keys(SHARES)]) rows[k] = [];
    for (const p0 of GRID.pct) { const w = new Float64Array(pts.length); let sw = 0, sw2 = 0, raw = 0, near = 0;
      for (let q = 0; q < pts.length; q++) { const dx = (pts[q].x - r0) / BW.rsi, dy = (pts[q].y - p0) / BW.pct; const v = Math.exp(-0.5 * (dx * dx + dy * dy)); w[q] = v; sw += v; sw2 += v * v; if (Math.abs(pts[q].x - r0) <= 1.25 && Math.abs(pts[q].y - p0) <= 2.5) raw++; if (Math.abs(pts[q].x - r0) <= BW.rsi && Math.abs(pts[q].y - p0) <= BW.pct) near++; }
      const neff = sw > 0 ? (sw * sw) / sw2 : 0; rowN.push(raw); rowNear.push(near); rowE.push(+neff.toFixed(1)); rowT.push(near < 30);
      if (sw < 1e-9 || neff < 5) { for (const k of Object.keys(rows)) rows[k].push(null); continue; }
      for (const [k, arr] of Object.entries(FIELDS)) { const ord = sorted[k]; let acc = 0, tot = 0; for (const q of ord) tot += w[q]; let val = null; for (const q of ord) { acc += w[q]; if (acc >= tot / 2) { val = arr[pts[q].i]; break; } } rows[k].push(r4(val)); }
      for (const [k, arr] of Object.entries(SHARES)) { let up = 0, tot = 0; for (let q = 0; q < pts.length; q++) { const v = arr[pts[q].i]; if (v == null) continue; tot += w[q]; if (v > 0) up += w[q]; } rows[k].push(tot > 0 ? r4(up / tot) : null); } }
    sheet.n.push(rowN); sheet.near.push(rowNear); sheet.neff.push(rowE); sheet.thin.push(rowT); for (const k of Object.keys(rows)) sheet[k].push(rows[k]); }
  sheet.evenings = pts.length; return sheet; }
const fearVix = (i) => vixPct[i];
function buildModel(idx, { putCallCounts = false, tenYear = { shortTilt: 0, longTilt: 0 } } = {}) {
  const fearOf = putCallCounts ? (i) => (pcPct[i] != null && pcPct[i] > vixPct[i] ? pcPct[i] : vixPct[i]) : fearVix;
  const sheets = { all: buildSheet(idx, fearOf, "every evening"), rising: buildSheet(idx.filter((i) => rising[i] === true), fearOf, "SPY's 200-day rising"), falling: buildSheet(idx.filter((i) => rising[i] === false), fearOf, "SPY's 200-day falling"),
    creditAbove: buildSheet(idx.filter((i) => creditA[i] === true), fearOf, "credit above its 200-day"), creditBelow: buildSheet(idx.filter((i) => creditA[i] === false), fearOf, "credit under its 200-day") };
  const model = { grid: GRID, bandwidth: BW, sheets, baseline: { med60: med(idx.map((i) => r60[i])), share60: share(idx.map((i) => r60[i])).share, med20: med(idx.map((i) => r20[i])), med120: med(idx.map((i) => r120[i])), share20: share(idx.map((i) => r20[i])).share, share120: share(idx.map((i) => r120[i])).share, dip60: med(idx.map((i) => dip60[i])), n: idx.length }, putCall: { counts: putCallCounts }, tenYear, rungs: null };
  /* the spread of the two odds across the evenings (the main sheet read at each evening's own spot) */
  const ms = [], ps = []; for (const i of idx) { const f = fearOf(i); if (f == null) continue; const m = readSheet(sheets.all, GRID, "med60", rsi[i], f), p = readSheet(sheets.all, GRID, "share60", rsi[i], f); if (m != null && p != null) { ms.push(m); ps.push(p); } }
  model.baseline.sdMed60 = sd(ms); model.baseline.sdShare60 = sd(ps);
  /* every evening's edge, with the tie-breakers, then the rungs at its own percentiles */
  const edges = []; for (const i of idx) { const d = deployAt(i, model, fearOf); if (d) edges.push(d.edge); } const es = edges.slice().sort((a, b) => a - b);
  model.rungs = { percentiles: RUNG_PCTL, edges: RUNG_PCTL.map((q) => +pctl(es, q).toFixed(4)), evenings: es.length };
  return model; }
function inputsAt(i, fearOf) { return { rsi: rsi[i], vixPct: vixPct[i], putCallPct: pcPct[i], trendRising: rising[i], creditAbove: creditA[i], tenStretchPct: tenPct[i], tenAbove200: tenAbove[i] }; }
function deployAt(i, model, fearOf) { if (rsi[i] == null || vixPct[i] == null) return null; const m = model.rungs ? model : { ...model, rungs: { edges: [0, 0, 0, 0, 0] } }; try { return deploy(inputsAt(i), m); } catch (e) { return null; } }

/* ---------- 2 · put/call as a third fear gauge: at the levels (RSI ≤ 45) — a put/call spike with no VIX spike, a VIX spike, neither ---------- */
const SPIKE = 80; const atLevel = evOut.filter((i) => rsi[i] <= 45 && pcPct[i] != null);
const grp = (idx) => ({ n: idx.length, med20: r4(med(idx.map((i) => r20[i]))), med60: r4(med(idx.map((i) => r60[i]))), med120: r4(med(idx.map((i) => r120[i]))), share20: share(idx.map((i) => r20[i])), share60: share(idx.map((i) => r60[i])), share120: share(idx.map((i) => r120[i])), dip60: r4(med(idx.map((i) => dip60[i]))) });
const pcGroups = { pcOnly: grp(atLevel.filter((i) => pcPct[i] >= SPIKE && vixPct[i] < 60)), vixSpike: grp(atLevel.filter((i) => vixPct[i] >= SPIKE)), both: grp(atLevel.filter((i) => vixPct[i] >= SPIKE && pcPct[i] >= SPIKE)), neither: grp(atLevel.filter((i) => vixPct[i] < 60 && pcPct[i] < 60)), anyAtLevel: grp(atLevel) };
/* the rule that decides: a put/call-only spike counts as fear when those evenings beat the no-spike evenings on both the median and the share higher over 60 sessions, with at least 30 of them */
const putCallCounts = pcGroups.pcOnly.n >= 30 && pcGroups.pcOnly.med60 > pcGroups.neither.med60 && pcGroups.pcOnly.share60.share > pcGroups.neither.share60.share;
const pcCorr = (() => { const xs = [], ys = []; for (const i of evOut) if (pcPct[i] != null) { xs.push(pcPct[i]); ys.push(vixPct[i]); } const mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0, syy = 0; for (let k = 0; k < xs.length; k++) { sxy += (xs[k] - mx) * (ys[k] - my); sxx += (xs[k] - mx) ** 2; syy += (ys[k] - my) ** 2; } return { n: xs.length, r: r3(sxy / Math.sqrt(sxx * syy)) }; })();
const ibRows = PC.ib.filter((r) => r.measured > 0 && r.put_call != null);
const putCall = { cboeFrom: PC.cboe.find((r) => r.kind === "equity").date, cboeTo: pcLast, cboeSessions: pcCdates.size, ibFrom: ibRows[0]?.session_et, ibTo: ibRows.at(-1)?.session_et, ibSessions: ibRows.length, ibLast: ibRows.at(-1)?.put_call, ibNote: "IB's market estimate has " + ibRows.length + " measured sessions; a one-year percentile needs about 200, so the engine reads the VIX alone until then (around September 2027; a 60-session read would be possible from late December 2026)", spikeLine: SPIKE, levelRule: "SPY's daily RSI at or under 45", groups: pcGroups, counts: putCallCounts, corrWithVixPct: pcCorr };

/* ---------- 3 · the 10-year on two clocks ---------- */
const tenEv = evOut.filter((i) => tenPct[i] != null && tenAbove[i] != null);
const quint = (lo, hi) => grp(tenEv.filter((i) => tenPct[i] >= lo && tenPct[i] < hi)); const tenShort = { "0–20 (yield washed out)": quint(0, 20), "20–40": quint(20, 40), "40–60": quint(40, 60), "60–80": quint(60, 80), "80–100 (yield stretched high)": quint(80, 100.01) };
const tenLong = { "yield above its 200-day (rising)": grp(tenEv.filter((i) => tenAbove[i])), "yield under its 200-day (falling)": grp(tenEv.filter((i) => !tenAbove[i])) };
const tenCross = { "stretched high & rising": grp(tenEv.filter((i) => tenPct[i] >= 80 && tenAbove[i])), "stretched high & falling": grp(tenEv.filter((i) => tenPct[i] >= 80 && !tenAbove[i])), "washed out & rising": grp(tenEv.filter((i) => tenPct[i] < 20 && tenAbove[i])), "washed out & falling": grp(tenEv.filter((i) => tenPct[i] < 20 && !tenAbove[i])) };
const tenAll = grp(tenEv);
/* the votes: a tilt only where the measured gap is material on both horizons (≥ 1 point of median and ≥ 3 points of share, 60 and 120 sessions); otherwise advisory */
const hiS = tenShort["80–100 (yield stretched high)"], loS = tenShort["0–20 (yield washed out)"]; const shortGap60 = hiS.med60 - loS.med60, shortGap120 = hiS.med120 - loS.med120, shortShare60 = hiS.share60.share - loS.share60.share, shortShare120 = hiS.share120.share - loS.share120.share;
const rL = tenLong["yield above its 200-day (rising)"], fL = tenLong["yield under its 200-day (falling)"]; const longGap60 = fL.med60 - rL.med60, longGap120 = fL.med120 - rL.med120, longShare60 = fL.share60.share - rL.share60.share, longShare120 = fL.share120.share - rL.share120.share;
const material = (g60, g120, s60, s120) => g60 >= 0.01 && g120 >= 0.01 && s60 >= 0.03 && s120 >= 0.03;
const pc = (x) => (x * 100).toFixed(1) + "%", ps = (x) => (x.share * 100).toFixed(0) + "%";
const tenYear = { shortTilt: material(Math.abs(shortGap60), Math.abs(shortGap120), Math.abs(shortShare60), Math.abs(shortShare120)) ? 5 : 0, longTilt: material(Math.abs(longGap60), Math.abs(longGap120), Math.abs(longShare60), Math.abs(longShare120)) ? 5 : 0,
  short: { hotIsBetter: shortGap60 > 0 && shortShare60 > 0, hotText: `stretched high: ${pc(hiS.med60)} / ${ps(hiS.share60)} over 60 sessions, ${pc(hiS.med120)} / ${ps(hiS.share120)} over 120; washed out: ${pc(loS.med60)} / ${ps(loS.share60)}, ${pc(loS.med120)} / ${ps(loS.share120)}`, coldText: `washed out: ${pc(loS.med60)} / ${ps(loS.share60)} over 60 sessions, ${pc(loS.med120)} / ${ps(loS.share120)} over 120; stretched high: ${pc(hiS.med60)} / ${ps(hiS.share60)}, ${pc(hiS.med120)} / ${ps(hiS.share120)}` },
  long: { fallingIsBetter: longGap60 > 0 && longShare60 > 0, aboveText: `above: ${pc(rL.med60)} / ${ps(rL.share60)} over 60 sessions, ${pc(rL.med120)} / ${ps(rL.share120)} over 120; under: ${pc(fL.med60)} / ${ps(fL.share60)}, ${pc(fL.med120)} / ${ps(fL.share120)}`, belowText: `under: ${pc(fL.med60)} / ${ps(fL.share60)} over 60 sessions, ${pc(fL.med120)} / ${ps(fL.share120)} over 120; above: ${pc(rL.med60)} / ${ps(rL.share60)}, ${pc(rL.med120)} / ${ps(rL.share120)}` } };
const tenYearStudy = { all: tenAll, short: tenShort, long: tenLong, cross: tenCross, gaps: { short: { med60: r4(shortGap60), med120: r4(shortGap120), share60: r4(shortShare60), share120: r4(shortShare120) }, long: { med60: r4(longGap60), med120: r4(longGap120), share60: r4(longShare60), share120: r4(longShare120) } }, votes: tenYear, rule: "a tilt of 5 points only when the gap between the two ends is at least 1 point of median return and 3 points of share higher on both the 60- and 120-session horizons; otherwise the clock is advisory", today: { yield: ten[LAST], rsi: r1(tenRsi[LAST]), stretchPct: r1(tenPct[LAST]), sma200: r3(ten200[LAST]), above200: tenAbove[LAST] } };

/* ---------- the model (in-sample on every evening with an outcome) and the honest check (fit to 2017, applied from 2018) ---------- */
const model = buildModel(evOut, { putCallCounts, tenYear });
const cut = ix["2018-01-02"]; const modelOOS = buildModel(evOut.filter((i) => i < cut - 60), { putCallCounts, tenYear });
console.error("rungs", model.rungs.edges, "baseline", model.baseline);

/* ---------- 4 · the replay: every evening's % invested, and the payoff ---------- */
const rep = []; for (const i of ev) { const d = deployAt(i, model); rep.push({ i, date: dates[i], pct: d ? d.pct : null, edge: d ? d.edge : null, fear: d ? d.fearSource : null }); }
const repByDate = Object.fromEntries(rep.map((r) => [r.date, r]));
/* today's ladder and the repaired heat from the heat-at-the-bottoms replay */
let ladder = {}, ladderFix = {}; if (HM1 && fs.existsSync(HM1)) { const h = J(HM1); const cols = h.seriesCols; const di = cols.indexOf("date"), hi = cols.indexOf("heat"), fi = cols.indexOf("fix"); const L = h.ladder; const rung = (x) => (x == null ? null : x <= -0.5 ? L.deepCold : x <= -0.2 ? L.cold : x >= 0.5 ? L.deepHot : x >= 0.2 ? L.hot : L.mid); for (const row of h.series) { ladder[row[di]] = rung(row[hi]); ladderFix[row[di]] = rung(row[fi]); } }
function payoff(fracOf, from, to) { let v = 1, peak = 1, mdd = 0, inv = [], last = null; for (let i = from; i < to; i++) { const f = fracOf(i); if (f == null) continue; inv.push(f); const rs = close[i + 1] / close[i] - 1, rc = (bill[i] ?? 0) / 100 / 252; v *= 1 + f * rs + (1 - f) * rc; peak = Math.max(peak, v); mdd = Math.min(mdd, v / peak - 1); last = i; } const yrs = (ix[dates[to]] - from) / 252; return { multiple: r3(v), cagr: r4(v ** (1 / yrs) - 1), maxDrawdown: r4(mdd), avgInvested: r1(mean(inv)), evenings: inv.length }; }
const strat = { engine: (i) => (repByDate[dates[i]]?.pct ?? null) / 100, ladder: (i) => (ladder[dates[i]] ?? null) / 100, repaired: (i) => (ladderFix[dates[i]] ?? null) / 100, buyAndHold: () => 1, half: () => 0.5 };
const spans = { "2008 → 2026": [FROM, LAST], "2009 → 2026": [ix["2009-01-02"], LAST], "2018 → 2026 (the honest check's years)": [cut, LAST] };
const payoffs = {}; for (const [k, [a, b]] of Object.entries(spans)) { payoffs[k] = {}; for (const [s, f] of Object.entries(strat)) payoffs[k][s] = payoff((i) => (f(i) == null || isNaN(f(i)) ? null : f(i)), a, b); }
/* the honest check: the model fit to 2017 only, applied from 2018 */
const repOOS = {}; for (const i of ev) if (i >= cut) { const d = (() => { try { return deploy(inputsAt(i), modelOOS); } catch (e) { return null; } })(); repOOS[dates[i]] = d ? d.pct : null; }
payoffs["2018 → 2026 (the honest check's years)"].engineFitTo2017 = payoff((i) => (repOOS[dates[i]] ?? null) / 100, cut, LAST);
/* the seven dates and the slide lows */
const SEVEN = [["2026-03-26", "2026-03-30"], ["2025-04-04", "2025-04-08"], ["2023-10-30", "2023-10-27"], ["2022-10-17", "2022-10-12"], ["2020-03-17", "2020-03-23"], ["2018-12-21", "2018-12-24"], ["2009-03-02", "2009-03-09"]];
const at = (d) => { const i = ix[d]; const r = repByDate[d]; const dd = i != null ? deployAt(i, model) : null; return { date: d, spy: close[i], rsi: r1(rsi[i]), vix: vix[i], vixPct: r1(vixPct[i]), putCallPct: r1(pcPct[i]), rising: rising[i], creditAbove: creditA[i], creditPriceOnly: creditP[i], edge: r?.edge, pct: r?.pct, fear: r?.fear, ladder: ladder[d] ?? null, repaired: ladderFix[d] ?? null, oos: repOOS[d] ?? null, odds: dd ? { med60: r4(dd.odds.med60), share60: r4(dd.odds.share60) } : null, next60: r4(r60[i]), next120: r4(r120[i]), reasons: dd ? dd.reasons : [] }; };
const seven = SEVEN.map(([d, low]) => ({ ...at(d), low: at(low) }));
/* the lows found by rule in the heat study (14 since 2007) */
const hm1Lows = HM1 && fs.existsSync(HM1) ? J(HM1).lows.map((l) => l.date).filter((d) => ix[d] != null && ix[d] >= FROM) : [];
const lows = hm1Lows.map((d) => at(d));
/* when it last said 100% and 80%, the share of evenings at each, the average */
const saidAtLeast = (p) => rep.filter((r) => r.pct != null && r.pct >= p); const runs = (rows) => { const out = []; let cur = null; for (const r of rows) { if (cur && ix[r.date] - ix[cur.to] <= 3) { cur.to = r.date; cur.n++; } else { cur = { from: r.date, to: r.date, n: 1 }; out.push(cur); } } return out; };
const last100 = runs(saidAtLeast(99.5)).slice(-6).reverse(), last80 = runs(saidAtLeast(80)).slice(-6).reverse();
const pcts = rep.map((r) => r.pct).filter((v) => v != null); const dist = { avg: r1(mean(pcts)), median: r1(med(pcts)), share100: r4(pcts.filter((v) => v >= 99.5).length / pcts.length), shareAtLeast80: r4(pcts.filter((v) => v >= 80).length / pcts.length), shareAtMost30: r4(pcts.filter((v) => v <= 30).length / pcts.length), share15: r4(pcts.filter((v) => v <= 15.5).length / pcts.length), evenings: pcts.length };
/* how jumpy: the evening-to-evening change in the % invested, the engine against today's ladder */
const jumpy = (seq) => { const d = []; for (let k = 1; k < seq.length; k++) if (seq[k] != null && seq[k - 1] != null) d.push(Math.abs(seq[k] - seq[k - 1])); return { meanAbsChange: r1(mean(d)), changesOf20orMore: d.filter((x) => x >= 20).length, changesOf5orMore: d.filter((x) => x >= 5).length, evenings: d.length, perYear20: r1(d.filter((x) => x >= 20).length / (d.length / 252)) }; };
const smooth = { engine: jumpy(rep.map((r) => r.pct)), ladder: jumpy(rep.map((r) => ladder[r.date] ?? null)), repaired: jumpy(rep.map((r) => ladderFix[r.date] ?? null)) };
const byYear = {}; for (const r of rep) { const y = r.date.slice(0, 4); (byYear[y] ??= []).push(r.pct); } const byYearOut = Object.fromEntries(Object.entries(byYear).map(([y, a]) => [y, { avg: r1(mean(a)), min: r1(Math.min(...a)), max: r1(Math.max(...a)), at100: a.filter((v) => v >= 99.5).length, atMost30: a.filter((v) => v <= 30).length, n: a.length }]));
/* the worst early calls: in 2008 and 2022, the first evening the engine said 100% (and 80%+), and how much further SPY fell to the slide's closing low */
const earlyCall = (from, to, p) => { const lowI = (() => { let b = ix[from]; for (let i = ix[from]; i <= ix[to]; i++) if (close[i] < close[b]) b = i; return b; })(); const first = rep.find((r) => r.date >= from && r.date <= to && r.pct != null && r.pct >= p); if (!first) return { threshold: p, first: null, low: dates[lowI] }; const fi = ix[first.date]; let worst = fi; for (let i = fi; i <= lowI; i++) if (close[i] < close[worst]) worst = i; return { threshold: p, first: first.date, pct: first.pct, spy: close[fi], low: dates[lowI], lowSpy: close[lowI], furtherFall: r4(close[lowI] / close[fi] - 1), evenings100Before: rep.filter((r) => r.date >= from && r.date <= dates[lowI] && r.pct >= p).length, avgPctToLow: r1(mean(rep.filter((r) => r.date >= from && r.date <= dates[lowI]).map((r) => r.pct))) }; };
const early = { "2008": [earlyCall("2008-01-02", "2009-03-09", 99.5), earlyCall("2008-01-02", "2009-03-09", 80)], "2022": [earlyCall("2022-01-03", "2022-10-12", 99.5), earlyCall("2022-01-03", "2022-10-12", 80)] };
/* how often the tie-breakers and the fear switch changed the number */
const tieEffect = (() => { let tr = 0, cr = 0, pc = 0, n = 0, big = 0; for (const i of ev) { const base = deployAt(i, model); if (!base) continue; n++; const noT = deploy({ ...inputsAt(i), trendRising: null }, model), noC = deploy({ ...inputsAt(i), creditAbove: null }, model); if (Math.abs(noT.pct - base.pct) >= 5) tr++; if (Math.abs(noC.pct - base.pct) >= 5) cr++; if (Math.abs(noT.pct - base.pct) >= 20 || Math.abs(noC.pct - base.pct) >= 20) big++; if (base.fearSource === "put/call") pc++; } return { evenings: n, trendMoved5: tr, creditMoved5: cr, eitherMoved20: big, fearFromPutCall: pc }; })();

/* ---------- 1b · Kimi's credit sheet redone: RSI band × credit above/under its 200-day, price-only against payouts-added-back ---------- */
const BANDS = [["≥70", 70, 101], ["65–70", 65, 70], ["60–65", 60, 65], ["55–60", 55, 60], ["50–55", 50, 55], ["45–50", 45, 50], ["40–45", 40, 45], ["35–40", 35, 40], ["30–35", 30, 35], ["<30", -1, 30]];
const creditSheet = (flag) => BANDS.map(([name, lo, hi]) => { const sel = evOut.filter((i) => rsi[i] >= lo && rsi[i] < hi && flag[i] != null); const A = grp(sel.filter((i) => flag[i])), B = grp(sel.filter((i) => !flag[i])); return { band: name, above: A, below: B, belowWorse60: A.n && B.n ? B.med60 < A.med60 && B.share60.share < A.share60.share : null, belowWorse20: A.n && B.n ? B.med20 < A.med20 : null }; });
const credit = { priceOnly: creditSheet(creditP), adjusted: creditSheet(creditA), today: { hygPrice: hygP[LAST], hygPrice200: r3(hygP200[LAST]), hygAdj: hygA[LAST], hygAdj200: r3(hygA200[LAST]), adjustedUnderSince: (() => { let i = LAST; while (i > 0 && creditA[i] === false) i--; return dates[i + 1]; })(), priceOnlyUnderSince: (() => { let i = LAST; while (i > 0 && creditP[i] === false) i--; return dates[i + 1]; })() }, shareUnder: { priceOnly: r4(evOut.filter((i) => creditP[i] === false).length / evOut.filter((i) => creditP[i] != null).length), adjusted: r4(evOut.filter((i) => creditA[i] === false).length / evOut.filter((i) => creditA[i] != null).length) }, dividends: J(path.join(CACHE, "data/hyg_adjusted_fmp.json")).dividends.n };
credit.survives = { adjusted: credit.adjusted.filter((r) => r.belowWorse60 === false).map((r) => r.band), priceOnly: credit.priceOnly.filter((r) => r.belowWorse60 === false).map((r) => r.band) };
/* the reconstruction check: price + payouts, chained, against FMP's adjusted series (the ratio of the two should be flat) */
const recon = (() => { const divs = J(path.join(CACHE, "data/hyg_adjusted_fmp.json")).dividends.rows; const dm = new Map(divs.map((d) => [d[0], d[1]])); let tr = null, prev = null; const ratios = []; for (let i = 0; i < N; i++) { const p = hygP[i]; if (p == null) continue; if (tr == null) { tr = p; prev = p; continue; } const d = dm.get(dates[i]) || 0; tr *= (p + d) / prev; prev = p; if (hygA[i] != null && i % 50 === 0) ratios.push(tr / hygA[i]); } const m = mean(ratios); return { samples: ratios.length, driftPct: r4(Math.max(...ratios) / Math.min(...ratios) - 1), note: "price-only HYG with each payout added back on its ex-date, chained, against FMP's adjusted closes — the ratio's drift over 2007–2026" }; })();

/* ---------- 5 · Alan's rule: buy on a VIX spike above 20, both hands above 23 ---------- */
function crossings(line, gap = 10) { const out = []; let last = -1e9; for (let i = FROM; i <= LAST; i++) { if (vix[i] != null && vix[i - 1] != null && vix[i] > line && vix[i - 1] <= line && i - last >= gap) { out.push(i); last = i; } } return out; }
const alanRule = {}; for (const line of [20, 23]) { const ev2 = crossings(line); const by = (f) => grp(ev2.filter(f)); alanRule[line] = { events: ev2.length, withOutcome: ev2.filter((i) => r60[i] != null).length, all: grp(ev2.filter((i) => r60[i] != null)), rising: by((i) => rising[i] === true && r60[i] != null), falling: by((i) => rising[i] === false && r60[i] != null), creditAbove: by((i) => creditA[i] === true && r60[i] != null), creditBelow: by((i) => creditA[i] === false && r60[i] != null), risingAndCreditAbove: by((i) => rising[i] && creditA[i] && r60[i] != null), fallingAndCreditBelow: by((i) => rising[i] === false && creditA[i] === false && r60[i] != null), list: ev2.map((i) => ({ date: dates[i], spy: close[i], vix: vix[i], vixPct: r1(vixPct[i]), rsi: r1(rsi[i]), rising: rising[i], creditAbove: creditA[i], r20: r4(r20[i]), r60: r4(r60[i]), r120: r4(r120[i]), dip60: r4(dip60[i]), enginePct: repByDate[dates[i]]?.pct ?? null })) }; }
alanRule.anyEvening = grp(evOut); alanRule.vixAbove20AnyDay = grp(evOut.filter((i) => vix[i] > 20)); alanRule.vixAbove23AnyDay = grp(evOut.filter((i) => vix[i] > 23));
alanRule.rule = "a spike = the first close above the line after a close at or under it, with at least 10 sessions since the last one; outcomes are SPY's close 20 / 60 / 120 sessions on and the deepest close within 60";
const vixYear = vix.slice(LAST - 251, LAST + 1).filter((v) => v != null).sort((a, b) => a - b); alanRule.vixYear = { p20: r1(pctl(vixYear, 20)), p80: r1(pctl(vixYear, 80)), p90: r1(pctl(vixYear, 90)), p95: r1(pctl(vixYear, 95)), max: Math.max(...vixYear), today: vix[LAST], line20pct: r1(100 * vixYear.filter((v) => v < 20).length / vixYear.length), line23pct: r1(100 * vixYear.filter((v) => v < 23).length / vixYear.length), line23_5pct: r1(100 * vixYear.filter((v) => v < 23.5).length / vixYear.length) };

/* ---------- 6 · today and the scenarios from the 6 Oct close ---------- */
const vixPctOf = (v) => { const win = vix.slice(LAST - 251, LAST + 1).filter((x) => x != null); return 100 * win.filter((x) => x < v).length / (win.length - 1); };
function rsiAfter(path) { const c = close.slice(0, LAST + 1).concat(path); return rsi14(c).at(-1); }
const today = { date: dates[LAST], spy: close[LAST], rsi: r1(rsi[LAST]), vix: vix[LAST], vixPct: r1(vixPct[LAST]), sma200: r3(s200[LAST]), pctOver200: r4(close[LAST] / s200[LAST] - 1), rising: rising[LAST], sma200MonthAgo: r3(s200[LAST - 21]), creditAbove: creditA[LAST], creditPriceOnly: creditP[LAST], putCall: { ib: pcI[LAST], ibPct: null }, ten: { yield: ten[LAST], stretchPct: r1(tenPct[LAST]), above200: tenAbove[LAST] } };
const inputsToday = { rsi: rsi[LAST], vixPct: vixPct[LAST], putCallPct: null, trendRising: rising[LAST], creditAbove: creditA[LAST], tenStretchPct: tenPct[LAST], tenAbove200: tenAbove[LAST] };
const steps = (n, total) => Array.from({ length: n }, (_, k) => close[LAST] * (1 + total) ** ((k + 1) / n));
const SCEN = [
  { key: "today", name: "6 Oct close, as it stands", spy: close[LAST], rsi: rsi[LAST], vix: vix[LAST], note: "SPY 779.09, RSI 62, VIX 15.01" },
  { key: "a", name: "(a) SPY −1.5%", spy: close[LAST] * 0.985, rsi: rsiAfter(steps(1, -0.015)), vix: vix[LAST], note: "one session; the VIX left where it is (15.01) — it would likely tick up, which only helps" },
  { key: "b", name: "(b) SPY −3% with VIX 20", spy: close[LAST] * 0.97, rsi: rsiAfter(steps(3, -0.03)), vix: 20, note: "three sessions of −1%; VIX 20 = Alan's first line" },
  { key: "c", name: "(c) SPY −5% with VIX 23.5", spy: close[LAST] * 0.95, rsi: rsiAfter(steps(5, -0.05)), vix: 23.5, note: "five sessions of −1%; VIX 23.5 = the year's 90th percentile, Alan's both-hands line" },
  { key: "d", name: "(d) panic: RSI under 35, VIX in its top 5%", spy: null, rsi: 33, vix: 26, note: "RSI 33 (about −8% over two weeks), VIX 26 (the year's 95th percentile is 25.3)" } ];
for (const s of SCEN) { s.vixPct = r1(vixPctOf(s.vix)); s.rsi = r1(s.rsi); const d = deploy({ ...inputsToday, rsi: s.rsi, vixPct: s.vixPct }, model); s.pct = d.pct; s.edge = d.edge; s.odds = { med60: r4(d.odds.med60), share60: r4(d.odds.share60) }; s.money = d.money; s.reasons = d.reasons; s.tenTilt = d.tenTilt; s.pctBeforeTilt = d.pctBeforeTilt;
  const d2 = deploy({ ...inputsToday, rsi: s.rsi, vixPct: s.vixPct, trendRising: null, creditAbove: null }, model); s.pctNoTieBreakers = d2.pct; if (s.spy) s.spy = r3(s.spy); }
/* the no-spike case: Micron at 1,036 / 1,012 / 989 while the market stays calm — the engine reads only the market */
const mu = { close: 1045.56, levels: [{ price: 1036, name: "Zone 1 1,028–1,036 (21-day + 2W D3 + 3D P1): full 10% conviction", need: 10 }, { price: 1011.77, name: "3D P3 1,011.77: +2.5% core", need: 12.5 }, { price: 989, name: "Zone 2 980–989 (1D D3 + 3D C3): +2.5% core", need: 15 }, { price: 961, name: "Zone 3 960–962 (50 + 100-day): +5% core", need: 20 }] };
const calm = SCEN[0]; mu.calm = { pct: calm.pct, micronCap: calm.money.micron, conviction: calm.money.conviction, levels: mu.levels.map((l) => ({ ...l, opens: calm.money.micron >= l.need, fits: Math.min(l.need, calm.money.micron) })) };
mu.withFear = SCEN.slice(1).map((s) => ({ scenario: s.name, pct: s.pct, micronCap: s.money.micron, extraOverCalm: r1(s.money.micron - calm.money.micron), ladderFits: s.money.micron >= 20, thirtyOpens: s.money.micron >= 30 }));

/* ---------- the display sheets (every other grid line) and the write ---------- */
const out = { built_utc: new Date().toISOString(), from: dates[ev[0]], to: dates[LAST], outcomesTo: dates[evOut.at(-1)], evenings: ev.length, evWithOutcome: evOut.length, sources: { spy: "chart API SPY daily closes (split-adjusted, no payouts)", vix: "vix_term table (6 Oct 2026 = 15.01) with the chart API's FMP VIX series before 2003", hygAdjusted: "FMP historical-price-eod/dividend-adjusted, HYG, " + hygAdjRows.length + " sessions " + hygAdjRows[0][0] + " → " + hygAdjRows.at(-1)[0] + ", read on a throw-away Fly machine (stopped)", hygPrice: "chart API HYG daily closes", ten: "chart API US10Y (FMP) with the treasury table for 6 Oct 2026", bill: "chart API US3M, the cash leg of the payoff", putCall: "put_call_history (CBOE equity ratio, " + pcCdates.size + " sessions to " + pcLast + ") and putcall_daily MARKET_ESTIMATE (IB, " + ibRows.length + " measured sessions)" },
  model, modelOOS: { fitTo: dates[cut - 61], rungs: modelOOS.rungs, baseline: modelOOS.baseline }, putCall, tenYear: tenYearStudy, credit, recon, replay: { series: rep.map((r) => [r.date, r.pct, r.edge, r.fear === "put/call" ? 1 : 0, ladder[r.date] ?? null, ladderFix[r.date] ?? null, repOOS[r.date] ?? null, close[r.i]]), seriesCols: ["date", "enginePct", "edge", "fearFromPutCall", "ladderPct", "repairedPct", "fitTo2017Pct", "spy"], payoffs, seven, lows, last100, last80, dist, byYear: byYearOut, early, tieEffect, smooth }, alanRule, today, scenarios: SCEN, micron: mu };
fs.writeFileSync(path.join(OUT, "dm1.json"), JSON.stringify(out));
console.log(JSON.stringify({ ok: true, evenings: ev.length, rungs: model.rungs.edges, baseline: { med60: r4(model.baseline.med60), share60: r4(model.baseline.share60) }, putCallCounts, tenYear, today: { pct: SCEN[0].pct, edge: SCEN[0].edge }, scenarios: SCEN.map((s) => [s.key, s.rsi, s.vixPct, s.pct]), dist, payoffs: payoffs["2008 → 2026"], early, tieEffect }, null, 1));
