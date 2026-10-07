/* DM2 (7 Oct 2026) — the shared measuring kit of the deployment matrix, version 2: the series on SPY's clock, the indicators, the smoothed
   matrix (the same kernel as version 1), the factor curves fitted together, and the model. Used by scripts/dm2-build.mjs.
   Nothing here writes a file or reads a key. */
import fs from "node:fs"; import path from "node:path";
import { readSheet, edgeOf, pctFromEdge, RUNG_PCTL, THIN, deploy2, placeOf, voteOf, matrixRead, interp } from "../study/dm2/engine.mjs";
import { deploy as deployV1 } from "../study/dm1/engine.mjs";

export const J = (f) => JSON.parse(fs.readFileSync(f, "utf8")); export const iso = (t) => new Date(t).toISOString().slice(0, 10);
export const r4 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(4)), r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3)), r2 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(2)), r1 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(1));
export const med = (a) => { const x = a.filter((v) => v != null && isFinite(v)).sort((p, q) => p - q); return x.length ? (x.length % 2 ? x[x.length >> 1] : (x[(x.length >> 1) - 1] + x[x.length >> 1]) / 2) : null; };
export const mean = (a) => { const x = a.filter((v) => v != null && isFinite(v)); return x.length ? x.reduce((p, q) => p + q, 0) / x.length : null; };
export const sd = (a) => { const x = a.filter((v) => v != null && isFinite(v)); const m = mean(x); return Math.sqrt(mean(x.map((v) => (v - m) ** 2))); };
export const pctl = (sorted, q) => { if (!sorted.length) return null; const k = (sorted.length - 1) * q / 100, lo = Math.floor(k), hi = Math.ceil(k); return sorted[lo] + (sorted[hi] - sorted[lo]) * (k - lo); };
export const share = (a) => { const x = a.filter((v) => v != null); return x.length ? x.filter((v) => v > 0).length / x.length : null; };

/* ---------- indicators (the same arithmetic as version 1) ---------- */
export function rsi14(c) { const out = new Array(c.length).fill(null); let g = 0, l = 0, k = 0, prev = null; for (let i = 0; i < c.length; i++) { if (c[i] == null) continue; if (prev == null) { prev = c[i]; continue; } const d = c[i] - prev; prev = c[i]; const up = Math.max(d, 0), dn = Math.max(-d, 0); k++; if (k <= 14) { g += up / 14; l += dn / 14; if (k === 14) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } else { g = (g * 13 + up) / 14; l = (l * 13 + dn) / 14; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } } return out; }
export function sma(c, n) { const out = new Array(c.length).fill(null); let s = 0, k = 0; for (let i = 0; i < c.length; i++) { if (c[i] == null) { s = 0; k = 0; continue; } s += c[i]; k++; if (k > n) { s -= c[i - n]; k = n; } if (k === n) out[i] = s / n; } return out; }
/* the place of today's value among the trailing year (252 sessions, today included): the share of those strictly below it, 0–100 */
export function yearPct(v, win = 252, need = 200) { const out = new Array(v.length).fill(null); for (let i = 0; i < v.length; i++) { if (v[i] == null) continue; let below = 0, n = 0; for (let k = Math.max(0, i - win + 1); k <= i; k++) { if (v[k] == null) continue; n++; if (v[k] < v[i]) below++; } if (n >= need) out[i] = 100 * below / (n - 1 || 1); } return out; }

/* ---------- the series on SPY's clock ---------- */
export function loadSeries(CACHE) {
  const D = (s) => J(path.join(CACHE, `${s}_D.json`)).series.filter((b) => b.c != null);
  const spyAll = D("SPY"); const dates = spyAll.map((b) => iso(b.t)), close = spyAll.map((b) => b.c), N = dates.length, ix = Object.fromEntries(dates.map((d, i) => [d, i]));
  const lastKnown = (m) => { const out = new Array(N).fill(null); let cur = null; const keys = [...m.keys()].sort(); let k = 0; for (let i = 0; i < N; i++) { while (k < keys.length && keys[k] <= dates[i]) { cur = m.get(keys[k]); k++; } out[i] = cur; } return out; };
  const onClock = (s) => lastKnown(new Map(D(s).map((b) => [iso(b.t), b.c])));
  /* a fund that did not exist yet stays null until its first session (lastKnown starts null) */
  const vixT = new Map(J(path.join(CACHE, "data/vix.json")).filter((r) => r.vix != null).map((r) => [r.date, +r.vix])), vixA = new Map(D("VIX").map((b) => [iso(b.t), b.c]));
  const vix = lastKnown(new Map([...vixA, ...vixT]));   // the vix_term table's close where it has one, the chart API's series before 2003 and in any hole
  const hygF = J(path.join(CACHE, "data/hyg_adjusted_fmp.json")); const hygA = lastKnown(new Map(hygF.adjusted.rows.map((r) => [r[0], r[1]]))), hygP = onClock("HYG");
  const tenM = new Map(D("US10Y").map((b) => [iso(b.t), b.c])); for (const r of J(path.join(CACHE, "data/treasury.json"))) if (!tenM.has(r.date) && r.y10 != null) tenM.set(r.date, +r.y10);
  const G = J(path.join(CACHE, "data/geiger-series-gh1.json")); const gOf = (s) => { const o = G.names[s], m = new Map(); o.g.forEach((v, k) => { if (v != null) m.set(G.calendar[o.start + k], v / 1000); }); const out = new Array(N).fill(null); for (let i = 0; i < N; i++) if (m.has(dates[i])) out[i] = m.get(dates[i]); return out; };
  const SECTORS = ["XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLB", "XLRE", "XLC", "XLP", "XLU"];
  return { dates, close, N, ix, vix, hygA, hygP, hygDividends: hygF.dividends.rows, hygAdjRows: hygF.adjusted.rows, qqq: onClock("QQQ"), tlt: onClock("TLT"), gld: onClock("GLD"), ten: lastKnown(tenM), bill: onClock("US3M"),
    gSpy: gOf("SPY"), gQqq: gOf("QQQ"), geigerAsOf: G.as_of_session, geigerCalendarMatches: G.calendar.length === N && G.calendar[N - 1] === dates[N - 1], sectors: Object.fromEntries(SECTORS.map((s) => [s, onClock(s)])), SECTORS };
}

/* ---------- the kernel-smoothed matrix: SPY's RSI × the fear percentile → what SPY did next (version 1's own smoothing) ---------- */
export const GRID = { rsi: [], pct: [] }; for (let r = 15; r <= 90; r += 2.5) GRID.rsi.push(r); for (let p = 0; p <= 100; p += 5) GRID.pct.push(p);
export const BW = { rsi: 4, pct: 8 };
export function buildSheet(idx, X, label) {   // X: { rsi, fear, fields: {name: array}, shares: {name: array} }
  const pts = idx.map((i) => ({ i, x: X.rsi[i], y: X.fear[i] })).filter((p) => p.x != null && p.y != null);
  const sorted = Object.fromEntries(Object.entries(X.fields).map(([k, arr]) => [k, [...pts.keys()].filter((q) => arr[pts[q].i] != null).sort((a, b) => arr[pts[a].i] - arr[pts[b].i])]));
  const sheet = { label, near: [], thin: [] }; for (const k of [...Object.keys(X.fields), ...Object.keys(X.shares)]) sheet[k] = [];
  const w = new Float64Array(pts.length);
  for (const r0 of GRID.rsi) { const rowNear = [], rowT = [], rows = {}; for (const k of [...Object.keys(X.fields), ...Object.keys(X.shares)]) rows[k] = [];
    for (const p0 of GRID.pct) { let sw = 0, sw2 = 0, near = 0;
      for (let q = 0; q < pts.length; q++) { const dx = (pts[q].x - r0) / BW.rsi, dy = (pts[q].y - p0) / BW.pct; const v = Math.exp(-0.5 * (dx * dx + dy * dy)); w[q] = v; sw += v; sw2 += v * v; if (Math.abs(pts[q].x - r0) <= BW.rsi && Math.abs(pts[q].y - p0) <= BW.pct) near++; }
      const neff = sw > 0 ? (sw * sw) / sw2 : 0; rowNear.push(near); rowT.push(near < 30);
      if (sw < 1e-9 || neff < 5) { for (const k of Object.keys(rows)) rows[k].push(null); continue; }
      for (const [k, arr] of Object.entries(X.fields)) { const ordr = sorted[k]; let acc = 0, tot = 0; for (const q of ordr) tot += w[q]; let val = null; for (const q of ordr) { acc += w[q]; if (acc >= tot / 2) { val = arr[pts[q].i]; break; } } rows[k].push(r4(val)); }
      for (const [k, arr] of Object.entries(X.shares)) { let up = 0, tot = 0; for (let q = 0; q < pts.length; q++) { const v = arr[pts[q].i]; if (v == null) continue; tot += w[q]; if (v > 0) up += w[q]; } rows[k].push(tot > 0 ? r4(up / tot) : null); } }
    sheet.near.push(rowNear); sheet.thin.push(rowT); for (const k of Object.keys(rows)) sheet[k].push(rows[k]); }
  sheet.evenings = pts.length; return sheet; }

/* ---------- a factor's curve: the kernel-weighted median of what the matrix (and the other factors) left unexplained, by the factor's place ---------- */
export const FGRID = []; for (let p = 0; p <= 100; p += 5) FGRID.push(p);
export let FBW = 10;   // a neighbour 10 places away counts e^-0.5 ≈ 61% as much
export const setFBW = (v) => { FBW = v; };   // the sensitivity run only
function fitCurve(us, resM, resP) {
  const n = us.length, ordr = [...Array(n).keys()].sort((a, b) => resM[a] - resM[b]), w = new Float64Array(n), gm = [], gp = [], near = [];
  for (const g of FGRID) { let sw = 0, sp = 0, nr = 0; for (let q = 0; q < n; q++) { const d = (us[q] - g) / FBW; const v = Math.exp(-0.5 * d * d); w[q] = v; sw += v; sp += v * resP[q]; if (Math.abs(us[q] - g) <= FBW) nr++; }
    let acc = 0, val = 0; for (const q of ordr) { acc += w[q]; if (acc >= sw / 2) { val = resM[q]; break; } } gm.push(val); gp.push(sw > 0 ? sp / sw : 0); near.push(nr); }
  return { gm, gp, near }; }

/* ---------- the two lines the matrix leans on where its table is thin: what the RSI alone and the VIX's place alone each added ---------- */
function fitLine(xs, grid, bw, resM, resP) { const n = xs.length, ordr = [...Array(n).keys()].sort((a, b) => resM[a] - resM[b]), w = new Float64Array(n), m = [], p = [], near = [];
  for (const g of grid) { let sw = 0, sp = 0, nr = 0; for (let q = 0; q < n; q++) { const d = (xs[q] - g) / bw; const v = Math.exp(-0.5 * d * d); w[q] = v; sw += v; sp += v * resP[q]; if (Math.abs(xs[q] - g) <= bw) nr++; }
    let acc = 0, val = 0; for (const q of ordr) { acc += w[q]; if (acc >= sw / 2) { val = resM[q]; break; } } m.push(val); p.push(sw > 0 ? sp / sw : 0); near.push(nr); }
  /* flat beyond the last well-measured band: a grid point with fewer than THIN evenings near it reads as the nearest one that has them */
  const okIdx = near.map((v, k) => (v >= THIN ? k : -1)).filter((k) => k >= 0); const fix = (a) => a.map((v, k) => (near[k] >= THIN || !okIdx.length ? v : a[okIdx.reduce((b, c) => (Math.abs(c - k) < Math.abs(b - k) ? c : b))]));
  return { m: fix(m), p: fix(p), near }; }
export function fitMarginals(rows, X, B) {
  const xr = rows.map((i) => X.rsi[i]), xp = rows.map((i) => X.fear[i]), ym = rows.map((i) => X.r60[i] - B.med60), yp = rows.map((i) => (X.r60[i] > 0 ? 1 : 0) - B.share60);
  let R = { m: GRID.rsi.map(() => 0), p: GRID.rsi.map(() => 0) }, V = { m: GRID.pct.map(() => 0), p: GRID.pct.map(() => 0) };
  const centre = (C, grid, xs) => { const cm = mean(xs.map((x) => interp(grid, C.m, x))), cp = mean(xs.map((x) => interp(grid, C.p, x))); return { m: C.m.map((v) => +(v - cm).toFixed(5)), p: C.p.map((v) => +(v - cp).toFixed(5)), near: C.near }; };
  for (let round = 0; round < 3; round++) {
    R = centre(fitLine(xr, GRID.rsi, BW.rsi, ym.map((y, k) => y - interp(GRID.pct, V.m, xp[k])), yp.map((y, k) => y - interp(GRID.pct, V.p, xp[k]))), GRID.rsi, xr);
    V = centre(fitLine(xp, GRID.pct, BW.pct, ym.map((y, k) => y - interp(GRID.rsi, R.m, xr[k])), yp.map((y, k) => y - interp(GRID.rsi, R.p, xr[k]))), GRID.pct, xp); }
  return { rsi: R, pct: V }; }

/* ---------- the model: the matrix (table + lines), the baseline, the factors fitted together (three rounds, each on what the others left), the rungs ---------- */
export function fitModel(idx, keys, X, opt = {}) {   // X: { rsi, fear, r60, dip60, vals: {key: array} }
  const sheets = { all: opt.sheet || buildSheet(idx, { rsi: X.rsi, fear: X.fear, fields: { med60: X.r60, dip60: X.dip60 }, shares: { share60: X.r60 } }, "every evening") };
  const B = { med60: med(idx.map((i) => X.r60[i])), share60: share(idx.map((i) => X.r60[i])), dip60: med(idx.map((i) => X.dip60[i])), n: idx.length, sdMed60: 1, sdShare60: 1 };
  const marg = opt.plainTable ? null : fitMarginals(idx.filter((i) => X.rsi[i] != null && X.fear[i] != null), X, B);
  const use = [], m0 = [], p0 = []; for (const i of idx) { const r = matrixRead({ grid: GRID, sheets, baseline: B, marg }, X.rsi[i], X.fear[i]); if (r) { use.push(i); m0.push(r.m); p0.push(r.p); } }
  B.sdMed60 = sd(m0); B.sdShare60 = sd(p0);
  const model = { grid: GRID, bandwidth: BW, factorBandwidth: FBW, sheets, baseline: B, marg, factors: [], rungs: { edges: [0, 0, 0, 0, 0] } };
  const F = keys.map((key) => { const vals = use.map((i) => X.vals[key][i]); const present = vals.filter((v) => v != null && isFinite(v)).sort((a, b) => a - b); const q = []; for (let k = 0; k <= 100; k++) q.push(+pctl(present, k).toFixed(6));
    return { key, q, grid: FGRID, gm: FGRID.map(() => 0), gp: FGRID.map(() => 0), near: FGRID.map(() => present.length), evenings: present.length, us: vals.map((v) => (v == null || !isFinite(v) ? null : placeOf(q, v))), cm: new Float64Array(use.length), cp: new Float64Array(use.length) }; });
  const up = use.map((i) => (X.r60[i] > 0 ? 1 : 0)), ret = use.map((i) => X.r60[i]);
  for (let round = 0; round < (opt.rounds ?? 3); round++) for (const f of F) {
    const rows = []; for (let k = 0; k < use.length; k++) if (f.us[k] != null) rows.push(k);
    const us = rows.map((k) => f.us[k]), resM = rows.map((k) => { let s = ret[k] - m0[k]; for (const o of F) if (o !== f) s -= o.cm[k]; return s; }), resP = rows.map((k) => { let s = up[k] - p0[k]; for (const o of F) if (o !== f) s -= o.cp[k]; return s; });
    const c = fitCurve(us, resM, resP); f.gm = c.gm; f.gp = c.gp; f.near = c.near;
    /* centre the curve: over the evenings it was fitted on, the factor's average vote is nothing — it only moves the number away from a typical evening */
    let sl = 0, sm = 0, sp = 0; const lam = [], gmv = [], gpv = []; for (const k of rows) { const v = voteOf(f, X.vals[f.key][use[k]], B); lam.push(v.lambda); gmv.push(v.gm); gpv.push(v.gp); sl += v.lambda; sm += v.lambda * v.gm; sp += v.lambda * v.gp; }
    const cM = sm / sl, cP = sp / sl; f.gm = f.gm.map((v) => v - cM); f.gp = f.gp.map((v) => v - cP); f.cm.fill(0); f.cp.fill(0); rows.forEach((k, j) => { f.cm[k] = lam[j] * (gmv[j] - cM); f.cp[k] = lam[j] * (gpv[j] - cP); }); }
  model.factors = F.map((f) => ({ key: f.key, q: f.q, grid: f.grid, gm: f.gm.map((v) => +v.toFixed(5)), gp: f.gp.map((v) => +v.toFixed(5)), near: f.near, evenings: f.evenings }));
  /* the rungs: where the edge sat on the evenings history put at 15 / 30 / 50 / 80 / 100 % */
  const es = []; for (const i of use) { const d = readAt(i, model, X); if (d) es.push(d.edge); } es.sort((a, b) => a - b);
  model.rungs = { percentiles: RUNG_PCTL, edges: RUNG_PCTL.map((q) => +pctl(es, q).toFixed(4)), evenings: es.length };
  return model; }
export function inputsAt(i, X) { const o = { rsi: X.rsi[i], vixPct: X.fear[i] }; for (const k of Object.keys(X.vals)) o[k] = X.vals[k][i]; return o; }
export function readAt(i, model, X, prior = []) { if (X.rsi[i] == null || X.fear[i] == null) return null; try { return deploy2(inputsAt(i, X), model, prior); } catch (e) { return null; } }

/* ---------- version 1, rebuilt on the same evenings (so the two can be compared out of sample): the matrix plus the two on/off sheets ---------- */
export function fitModelV1(idx, X) {   // X adds: rising, creditAbove (booleans or null)
  const mk = (sel, label) => buildSheet(sel, { rsi: X.rsi, fear: X.fear, fields: { med60: X.r60 }, shares: { share60: X.r60 } }, label);
  const sheets = { all: mk(idx, "every evening"), rising: mk(idx.filter((i) => X.rising[i] === true), "SPY's 200-day rising"), falling: mk(idx.filter((i) => X.rising[i] === false), "SPY's 200-day falling"), creditAbove: mk(idx.filter((i) => X.creditAbove[i] === true), "credit above its 200-day"), creditBelow: mk(idx.filter((i) => X.creditAbove[i] === false), "credit under its 200-day") };
  const B = { med60: med(idx.map((i) => X.r60[i])), share60: share(idx.map((i) => X.r60[i])), n: idx.length }; const ms = [], ps = [];
  for (const i of idx) { const m = readSheet(sheets.all, GRID, "med60", X.rsi[i], X.fear[i]), p = readSheet(sheets.all, GRID, "share60", X.rsi[i], X.fear[i]); if (m != null && p != null) { ms.push(m); ps.push(p); } } B.sdMed60 = sd(ms); B.sdShare60 = sd(ps);
  const model = { grid: GRID, bandwidth: BW, sheets, baseline: B, putCall: { counts: false }, tenYear: { shortTilt: 0, longTilt: 0, short: {}, long: {} }, rungs: { edges: [0, 0, 0, 0, 0] } };
  const es = []; for (const i of idx) { const d = readAtV1(i, model, X); if (d) es.push(d.edge); } es.sort((a, b) => a - b);
  model.rungs = { percentiles: RUNG_PCTL, edges: RUNG_PCTL.map((q) => +pctl(es, q).toFixed(4)), evenings: es.length }; return model; }
export function readAtV1(i, model, X, prior = [], over = {}) { if (X.rsi[i] == null || X.fear[i] == null) return null; try { return deployV1({ rsi: X.rsi[i], vixPct: X.fear[i], putCallPct: null, trendRising: X.rising[i], creditAbove: X.creditAbove[i], tenStretchPct: null, tenAbove200: null, ...over }, model, prior); } catch (e) { return null; } }
export { readSheet, edgeOf, pctFromEdge, RUNG_PCTL, THIN, deploy2, placeOf, voteOf, deployV1, matrixRead, interp };
