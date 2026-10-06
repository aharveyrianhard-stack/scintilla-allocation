/* R4 (6 Oct 2026) — step 1 rebuilt as two dials, REGIME and STRETCH, replayed over HEAT1's two years, aware of the tree.
   Study only: writes study/r4/data/r4.json; nothing on the live page reads it.
   node scripts/r4-dials.mjs [cacheDir]   (cacheDir: a folder of <SYM>_<TF>.json candle answers; without it everything is fetched
   from the chart API — read-only, Origin scintillahub.ai — and the comps feed). Inputs copied from sister lanes sit in study/r4/data:
   lb1-where-price-sits-20261006.json (LB1), sg1-gauge-20261006.json (SG1), co1-tree-20261006.json (CO1). */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "study/r4/data"); fs.mkdirSync(OUT, { recursive: true });
const CACHE = process.argv[2] || null;
const API = "https://scintilla-massive-chart-api.fly.dev", SBF = "https://wadinxqplrggagkvrdag.supabase.co/functions/v1";
const DAY = 864e5, iso = (t) => new Date(t).toISOString().slice(0, 10), clamp = (x) => Math.max(-1, Math.min(1, x));
const H1 = JSON.parse(fs.readFileSync(path.join(ROOT, "study/heat1/data/heat1.json"), "utf8"));
const LB1 = JSON.parse(fs.readFileSync(path.join(OUT, "lb1-where-price-sits-20261006.json"), "utf8"));
const SG1 = JSON.parse(fs.readFileSync(path.join(OUT, "sg1-gauge-20261006.json"), "utf8"));
const CO1 = JSON.parse(fs.readFileSync(path.join(OUT, "co1-tree-20261006.json"), "utf8"));
const t0 = Date.now(); const log = (...a) => console.error(((Date.now() - t0) / 1000).toFixed(0) + "s", ...a);

/* ---------- the Hub's Geiger, as HEAT1 rebuilt it (three daily-and-up rungs, Equalizer weights) ---------- */
const RUNGS = { D: 3.178477, "3D": 2.576738, W: 0.987499 };
const RSI_OS = 23, RSI_OB = 77, W_OS = -90, W_OB = -10, W_RSI = 0.6, W_WILL = 0.4;
function ema(a, n) { const k = 2 / (n + 1); let e = a[0]; const o = [e]; for (let i = 1; i < a.length; i++) { e = a[i] * k + e * (1 - k); o.push(e); } return o; }
function smaLast(a, n) { if (a.length < n) return null; let s = 0; for (let i = a.length - n; i < a.length; i++) s += a[i]; return s / n; }
function rsiLast(c, p = 14) { if (c.length < p + 1) return null; let g = 0, l = 0; for (let i = 1; i <= p; i++) { const d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; } g /= p; l /= p;
  for (let i = p + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; g = (g * (p - 1) + (d > 0 ? d : 0)) / p; l = (l * (p - 1) + (d < 0 ? -d : 0)) / p; } return 100 - 100 / (1 + (l === 0 ? 1e9 : g / l)); }
function willLast(h, l, c, p = 14) { if (c.length < p) return null; let hh = -1e18, ll = 1e18; for (let j = c.length - p; j < c.length; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; } return hh > ll ? (hh - c[c.length - 1]) / (hh - ll) * -100 : -50; }
function fan(src) { const specs = [["e", 5], ["e", 8], ["e", 13], ["e", 21], ["e", 34], ["s", 50], ["s", 100], ["s", 150], ["s", 200]]; const out = [];
  for (const [ty, n] of specs) { if (src.length < n) continue; out.push(ty === "e" ? ema(src, n)[src.length - 1] : smaLast(src, n)); } return out; }
function rung(bars) { const b = bars.slice(-230); if (b.length < 15) return null; const c = b.map((x) => x.c), h = b.map((x) => x.h), l = b.map((x) => x.l);
  const f = fan(c), pairs = f.length - 1; let inOrder = 0; for (let i = 0; i < pairs; i++) if (f[i] > f[i + 1]) inOrder++; if (pairs <= 0) return null; const trend = (2 * inOrder - pairs) / pairs;
  const rsi = rsiLast(c, 14), wr = willLast(h, l, c, 14); const mom = (clamp((rsi - RSI_OS) / (RSI_OB - RSI_OS) * 2 - 1) * W_RSI + clamp((wr - W_OS) / (W_OB - W_OS) * 2 - 1) * W_WILL) / (W_RSI + W_WILL);
  return { trend, mom, read: 0.5 * trend + 0.5 * mom }; }
/* the Geiger day by day from a symbol's D, 3D and W bars: completed higher-rung bars from the provider, the forming one built from the daily bars */
function geigerSeries(D, P3, PW, fromIdx = 0) {
  const out = {}; const spans = { "3D": [P3, 3 * DAY], W: [PW, 7 * DAY] };
  for (let i = Math.max(fromIdx, 0); i < D.length; i++) { const d = D[i], dEnd = d.t + DAY; const reads = [];
    const dr = rung(D.slice(0, i + 1)); if (dr) reads.push([RUNGS.D, dr]);
    for (const tf of ["3D", "W"]) { const [P, span] = spans[tf]; if (!P || !P.length) continue; const done = P.filter((b) => b.t + span <= dEnd); const lastStart = done.length ? done[done.length - 1].t + span : null;
      let forming = null; if (lastStart != null && lastStart <= d.t) { const ds = D.filter((x) => x.t >= lastStart && x.t <= d.t); if (ds.length) forming = { t: lastStart, o: ds[0].o, h: Math.max(...ds.map((x) => x.h)), l: Math.min(...ds.map((x) => x.l)), c: ds[ds.length - 1].c }; }
      const r = rung(forming ? [...done, forming] : done); if (r) reads.push([RUNGS[tf], r]); }
    if (!reads.length) continue; const W = reads.reduce((t, [w]) => t + w, 0);
    out[iso(d.t)] = { g: reads.reduce((t, [w, r]) => t + w * r.read, 0) / W, trend: reads.reduce((t, [w, r]) => t + w * r.trend, 0) / W, mom: reads.reduce((t, [w, r]) => t + w * r.mom, 0) / W, rungs: reads.length, close: d.c }; }
  return out; }

/* ---------- reads ---------- */
async function getJson(url, headers = {}) { let last = null; for (let k = 0; k < 6; k++) { try { const r = await fetch(url, { headers: { Origin: "https://scintillahub.ai", ...headers }, signal: AbortSignal.timeout(120000) }); if (r.ok) return await r.json(); if (r.status === 404) return null; last = "http " + r.status; } catch (e) { last = e.message; } log("retry", k + 1, last, url.slice(0, 90)); await new Promise((ok) => setTimeout(ok, 1500 * (k + 1))); } throw new Error("fetch failed (" + last + ") " + url); }
async function candles(sym, tf, limit) { const f = CACHE && path.join(CACHE, `${sym}_${tf}.json`); if (f && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8")).series || []; const j = await getJson(`${API}/candles?symbol=${sym}&tf=${tf}&limit=${limit}`); return (j && j.series) || []; }
async function multi(syms, tf, limit) { const out = {}; for (let i = 0; i < syms.length; i += 25) { const b = syms.slice(i, i + 25); const j = await getJson(`${API}/candles-multi?symbols=${encodeURIComponent(b.join(","))}&tf=${tf}&limit=${limit}`); for (const [s, c] of Object.entries((j && j.candles) || {})) { const ser = c && Array.isArray(c.series) ? c.series.filter((x) => x && x.c != null) : null; if (ser && ser.length) out[s] = ser; } log("multi", tf, i + b.length, "/", syms.length); } return out; }

const GEI = await getJson(`${API}/geiger`); const served = Object.keys(GEI.symbols).sort(); log("served", served.length);
const MACRO = await getJson(`${API}/macro`); const QUOTES = await getJson(`${API}/quotes?symbols=SPY,QQQ,SMH,IWM,RSP,HYG`);
/* the proof the brief asks for: the 10-year is a tracked symbol of the chart API's macro set with its own D / 3D / W bars */
const US10 = { D: await candles("US10Y", "D", 1300), "3D": await candles("US10Y", "3D", 800), W: await candles("US10Y", "W", 800) };
const VIXB = { D: await candles("VIX", "D", 1300) };
const macroProof = { board_symbol: "US10Y", provider: MACRO && MACRO.macro && MACRO.macro.US10Y ? MACRO.macro.US10Y.provider + " " + MACRO.macro.US10Y.provider_symbol : null, instrument: MACRO && MACRO.macro && MACRO.macro.US10Y ? MACRO.macro.US10Y.instrument : null, quote: MACRO && MACRO.macro && MACRO.macro.US10Y ? MACRO.macro.US10Y.quote : null,
  bars: { D: US10.D.length, "3D": US10["3D"].length, W: US10.W.length, D_from: US10.D.length ? iso(US10.D[0].t) : null, D_to: US10.D.length ? iso(US10.D[US10.D.length - 1].t) : null }, macro_board: MACRO && MACRO.macro ? Object.keys(MACRO.macro) : [],
  not_in_geiger_board: !(GEI.symbols.US10Y), note: "the chart API's /macro board carries US10Y (FMP ^TNX) with a live quote, and /candles serves its D, 3D and W bars; the Hub's /geiger board (590 served names) does not carry it, so its Geiger is rebuilt here with the Hub's formula on those bars" };
log("10y bars", macroProof.bars, "vix D", VIXB.D.length);
const barsD = await multi(served, "1d", 800); const bars3 = await multi(served, "3d", 400); const barsW = await multi(served, "W", 400);
const two = { SPY: await candles("SPY", "2W", 400), QQQ: await candles("QQQ", "2W", 400) };
/* growth: the comps feed (revenue growth per name), the same feed the tool's knockout reads */
const COMPS = {}; { const list = served.filter((s) => !/USD$/.test(s)); for (let i = 0; i < list.length; i += 60) { try { const r = await fetch(`${SBF}/comps-feed?syms=${encodeURIComponent(list.slice(i, i + 60).join(","))}`); const L = (await r.text()).trim().split("\n"); const head = L[0].split(","); for (const line of L.slice(1)) { const c = line.split(","); const o = {}; head.forEach((h, k) => (o[h] = c[k] === "" || c[k] == null ? null : h === "sym" || h === "updated" ? c[k] : +c[k])); COMPS[c[0]] = o; } } catch (e) { log("comps batch failed", e.message); } } log("comps", Object.keys(COMPS).length); }

/* ---------- sessions and breadth over the served names: % above the 200-day and the 50-day, advancers / decliners, the A/D line ---------- */
const SPYD = barsD.SPY, sessions = SPYD.map((b) => iso(b.t)); const sIdx = Object.fromEntries(sessions.map((d, i) => [d, i]));
const companies = served.filter((s) => !/USD$/.test(s) && !(CO1.cohorts.find((c) => c.id.startsWith("IDX_") && c.members.includes(s))) && !["SPY", "QQQ", "IWM", "SMH", "RSP", "HYG", "TLT", "XLK", "XLP", "XLU"].includes(s));
const breadth = {}; { const per = {}; for (const s of companies) { const D = barsD[s]; if (!D || D.length < 60) continue; const c = D.map((x) => x.c); let s50 = 0, s200 = 0; const row = {};
    for (let i = 0; i < D.length; i++) { s50 += c[i]; if (i >= 50) s50 -= c[i - 50]; s200 += c[i]; if (i >= 200) s200 -= c[i - 200]; const d = iso(D[i].t); row[d] = { a50: i >= 49 ? c[i] > s50 / 50 : null, a200: i >= 199 ? c[i] > s200 / 200 : null, up: i > 0 ? (c[i] > c[i - 1] ? 1 : c[i] < c[i - 1] ? -1 : 0) : null }; } per[s] = row; }
  let cum = 0; for (const d of sessions) { let n50 = 0, m50 = 0, n200 = 0, m200 = 0, adv = 0, dec = 0, n = 0; for (const s of Object.keys(per)) { const r = per[s][d]; if (!r) continue; n++; if (r.a50 != null) { m50++; if (r.a50) n50++; } if (r.a200 != null) { m200++; if (r.a200) n200++; } if (r.up === 1) adv++; else if (r.up === -1) dec++; }
    cum += adv - dec; breadth[d] = { n, pct50: m50 ? 100 * n50 / m50 : null, m50, pct200: m200 ? 100 * n200 / m200 : null, m200, adv, dec, ad: cum }; } }
log("breadth sessions", Object.keys(breadth).length, "companies", companies.length);

/* ---------- Geigers: the indices and semis, the 10-year, and every served company for the cohort history ---------- */
const G = {}; for (const s of ["SPY", "QQQ", "SMH", "IWM", "RSP", "HYG"]) G[s] = geigerSeries(barsD[s], bars3[s], barsW[s]);
G.US10Y = geigerSeries(US10.D, US10["3D"], US10.W); log("index + 10y Geigers");
const FROM = H1.from, TO = sessions[sessions.length - 1];
const coStart = sIdx[FROM] != null ? Math.max(0, sIdx[FROM] - 5) : 0;
const GC = {}; for (const s of companies) { const D = barsD[s]; if (!D || D.length < 230) continue; const first = D.findIndex((b) => iso(b.t) >= sessions[coStart]); GC[s] = geigerSeries(D, bars3[s], barsW[s], Math.max(first, 0)); } log("company Geigers", Object.keys(GC).length);

/* ---------- daily RSI and Williams on the indices, and the VIX against its own baseline ---------- */
function dailyOsc(D) { const out = {}; const h = D.map((x) => x.h), l = D.map((x) => x.l), c = D.map((x) => x.c); for (let i = 14; i < D.length; i++) out[iso(D[i].t)] = { rsi: rsiLast(c.slice(Math.max(0, i - 250), i + 1), 14), wr: willLast(h.slice(0, i + 1), l.slice(0, i + 1), c.slice(0, i + 1), 14) }; return out; }
const OSC = { SPY: dailyOsc(barsD.SPY), QQQ: dailyOsc(barsD.QQQ) };
const SPIKE = 0.35, BASE_N = 60; const VX = {}; { const D = VIXB.D; let lastSpike = null, peak = null; for (let i = 0; i < D.length; i++) { const d = iso(D[i].t), v = D[i].c; if (i < BASE_N) continue; const win = D.slice(i - BASE_N, i).map((x) => x.c).sort((a, b) => a - b); const base = win[BASE_N >> 1]; const ratio = v / base - 1;
    if (ratio >= SPIKE) { if (lastSpike == null || sIdxOf(d) - sIdxOf(lastSpike) > 5) peak = v; lastSpike = d; peak = Math.max(peak || v, v); }
    const since = lastSpike ? daysBetween(lastSpike, d) : null; const inEpisode = lastSpike && since <= 40; const decay = inEpisode && peak > base ? Math.max(0, Math.min(1, (peak - v) / (peak - base))) : null;
    VX[d] = { vix: v, base: +base.toFixed(2), ratio: +ratio.toFixed(3), spike: ratio >= SPIKE, lastSpike, since, peak: inEpisode ? peak : null, decay: decay == null ? null : +decay.toFixed(2), read: +clamp(-ratio / SPIKE).toFixed(4) }; } }
function sIdxOf(d) { return Date.parse(d) / DAY; } function daysBetween(a, b) { let n = 0; const ia = sIdx[a], ib = sIdx[b]; if (ia != null && ib != null) return ib - ia; return Math.round((Date.parse(b) - Date.parse(a)) / DAY); }
log("osc + vix");

/* ---------- the 2W P1 structure, replayed: the latest confirmed pivot high, broken or not, retest or not; and the 200-day ---------- */
const PL = 2, PR = 2;
function pivots(S) { const out = []; for (let i = PL; i < S.length - PR; i++) { const h = S[i].h; if (S.slice(i - PL, i).every((b) => h > b.h) && S.slice(i + 1, i + PR + 1).every((b) => h >= b.h)) out.push({ date: iso(S[i].t), high: h, confirmedAt: iso(S[i + PR].t + 14 * DAY - DAY) }); } return out; }
const PIV = { SPY: pivots(two.SPY), QQQ: pivots(two.QQQ) };
function structureOn(sym, date) { const D = barsD[sym], i = D.findIndex((b) => iso(b.t) === date); if (i < 0) return null; const close = D[i].c; const sma200 = smaLast(D.slice(0, i + 1).map((b) => b.c), 200), sma50 = smaLast(D.slice(0, i + 1).map((b) => b.c), 50);
  const P = PIV[sym].filter((p) => p.confirmedAt <= date); const p = P[P.length - 1]; if (!p) return null;
  let broke = null; for (let k = 0; k <= i; k++) { const d = iso(D[k].t); if (d <= p.confirmedAt) continue; if (D[k].c > p.high) { broke = d; break; } }
  const dist = close / p.high - 1; let state, score;
  if (broke && dist > 0.015) { state = "above, holding"; score = 1; } else if (broke && dist >= -0.01) { state = "retesting from above (resistance turned support)"; score = 0.6; } else if (broke) { state = "lost the level (back below a broken line)"; score = -0.5; }
  else if (sma200 != null && close > sma200) { state = "uptrend, under resistance"; score = 0.2; } else { state = "below resistance and below the 200-day"; score = -1; }
  if (!broke && sma200 != null && close < sma200) score = -1; if (broke && sma200 != null && close < sma200) score = Math.min(score, -0.8);
  return { close, level: p.high, pivotDate: p.date, confirmedAt: p.confirmedAt, broke, dist: +dist.toFixed(4), above200: sma200 != null ? close > sma200 : null, above50: sma50 != null ? close > sma50 : null, state, score }; }

/* ---------- percentiles against each one's own past (rolling 252 sessions once available, never fewer than 100) ---------- */
function pctile(x, past) { if (x == null || past.length < 100) return null; let below = 0, ties = 0; for (const p of past) { if (p < x) below++; else if (p === x) ties++; } return (below + ties / 2) / past.length; }
const dates = sessions.filter((d) => d >= FROM && d <= TO); const H1byDate = Object.fromEntries(H1.series.map((s) => [s.date, s]));
const hist = { g: {}, rsi: {}, wr: {} }; for (const s of ["SPY", "QQQ", "SMH"]) { hist.g[s] = []; } for (const s of ["SPY", "QQQ"]) { hist.rsi[s] = []; hist.wr[s] = []; } hist.g.US10Y = [];
const seriesOut = [];
/* warm the own-past windows with the sessions before FROM */
for (const d of sessions) { if (d >= FROM) break; for (const s of ["SPY", "QQQ", "SMH", "US10Y"]) if (G[s][d]) hist.g[s].push(G[s][d].g); for (const s of ["SPY", "QQQ"]) if (OSC[s][d]) { hist.rsi[s].push(OSC[s][d].rsi); hist.wr[s].push(OSC[s][d].wr); } }
const roll = (a) => a.slice(-252);
const BASE = (v) => v >= 0.5 ? 90 : v >= 0.2 ? 75 : v > -0.2 ? 60 : v > -0.5 ? 40 : 25; const STRETCH_SWING = 20, CREDIT_CUT = 10;
function regimeWord(v, br, credit) { const w = v >= 0.5 ? "UPTREND, BROAD" : v >= 0.2 ? (br < 0 ? "UPTREND, NARROW" : "UPTREND, UNDER RESISTANCE") : v > -0.2 ? "RANGE OR RETEST" : v > -0.5 ? "BREAKDOWN" : "DOWNTREND"; return w + (credit ? " · CREDIT NOT CONFIRMING" : ""); }
function stretchWord(s) { return s >= 0.5 ? "DEEPLY STRETCHED — trim" : s >= 0.2 ? "STRETCHED — do not add" : s > -0.2 ? "MIDDLING — hold" : s > -0.5 ? "WASHED OUT — add" : "DEEPLY WASHED OUT — add hard"; }
function invested(base, stretch, credit) { return Math.max(15, Math.min(100, Math.round(base - STRETCH_SWING * stretch - (credit ? CREDIT_CUT : 0)))); }
for (const d of dates) {
  const st = { SPY: structureOn("SPY", d), QQQ: structureOn("QQQ", d) }; const br = breadth[d]; const h1 = H1byDate[d];
  const structure = st.SPY && st.QQQ ? (st.SPY.score + st.QQQ.score) / 2 : null;
  const breadthRead = br && br.pct200 != null && br.pct50 != null ? clamp(((br.pct200 - 50) / 25 + (br.pct50 - 50) / 25) / 2) : null;
  const credit = h1 && h1.v.CREDIT != null ? h1.v.CREDIT : (G.HYG[d] ? G.HYG[d].g : null); const creditFlag = credit != null && credit <= -0.5;
  const regime = structure != null && breadthRead != null ? clamp(0.6 * structure + 0.4 * breadthRead) : null;
  /* stretch blocks */
  const gp = {}; for (const s of ["SPY", "QQQ", "SMH"]) { const g = G[s][d] ? G[s][d].g : null; gp[s] = { g, pct: pctile(g, roll(hist.g[s])) }; if (g != null) hist.g[s].push(g); }
  const op = {}; for (const s of ["SPY", "QQQ"]) { const o = OSC[s][d]; op[s] = o ? { rsi: o.rsi, wr: o.wr, rsiPct: pctile(o.rsi, roll(hist.rsi[s])), wrPct: pctile(o.wr, roll(hist.wr[s])) } : null; if (o) { hist.rsi[s].push(o.rsi); hist.wr[s].push(o.wr); } }
  const g10 = G.US10Y[d] ? G.US10Y[d].g : null; const g10pct = pctile(g10, roll(hist.g.US10Y)); if (g10 != null) hist.g.US10Y.push(g10);
  const vx = VX[d] || null;
  const idxRead = avg(["SPY", "QQQ", "SMH"].map((s) => gp[s].pct == null ? null : 2 * gp[s].pct - 1));
  const oscRead = avg(["SPY", "QQQ"].flatMap((s) => op[s] ? [op[s].rsiPct == null ? null : 2 * op[s].rsiPct - 1, op[s].wrPct == null ? null : 2 * op[s].wrPct - 1] : [null, null]));
  const vixRead = vx ? vx.read : null; const tenRead = g10 == null ? null : -g10;
  const blocks = { indexGeigers: idxRead, rsiWilliams: oscRead, vix: vixRead, tenYear: tenRead }; const have = Object.values(blocks).filter((x) => x != null);
  const stretch = have.length === 4 ? have.reduce((t, x) => t + x, 0) / 4 : null;
  const base = regime == null ? null : BASE(regime); const inv = regime != null && stretch != null ? invested(base, stretch, creditFlag) : null;
  seriesOut.push({ date: d, spy: SPYD[sIdx[d]].c, qqq: barsD.QQQ[sIdx[d]] ? barsD.QQQ[sIdx[d]].c : null, heat: h1 ? +h1.heat.toFixed(4) : null, heatRung: h1 ? ladder(h1.heat) : null,
    regime: regime == null ? null : +regime.toFixed(4), regimeWord: regime == null ? null : regimeWord(regime, breadthRead, creditFlag), structure: structure == null ? null : +structure.toFixed(3), st: { SPY: st.SPY && { state: st.SPY.state, level: st.SPY.level, dist: st.SPY.dist, above200: st.SPY.above200 }, QQQ: st.QQQ && { state: st.QQQ.state, level: st.QQQ.level, dist: st.QQQ.dist, above200: st.QQQ.above200 } },
    breadth: br ? { pct200: br.pct200 == null ? null : +br.pct200.toFixed(1), pct50: br.pct50 == null ? null : +br.pct50.toFixed(1), adv: br.adv, dec: br.dec, ad: br.ad, n: br.n } : null, breadthRead: breadthRead == null ? null : +breadthRead.toFixed(3), credit: credit == null ? null : +credit.toFixed(3), creditFlag,
    stretch: stretch == null ? null : +stretch.toFixed(4), stretchWord: stretch == null ? null : stretchWord(stretch), blocks: Object.fromEntries(Object.entries(blocks).map(([k, v]) => [k, v == null ? null : +v.toFixed(3)])), gp: Object.fromEntries(Object.entries(gp).map(([k, v]) => [k, { g: v.g == null ? null : +v.g.toFixed(3), pct: v.pct == null ? null : +v.pct.toFixed(3) }])), op: Object.fromEntries(Object.entries(op).map(([k, v]) => [k, v && { rsi: +v.rsi.toFixed(1), wr: +v.wr.toFixed(1), rsiPct: v.rsiPct == null ? null : +v.rsiPct.toFixed(3), wrPct: v.wrPct == null ? null : +v.wrPct.toFixed(3) }])),
    ten: { g: g10 == null ? null : +g10.toFixed(3), pct: g10pct == null ? null : +g10pct.toFixed(3), yield: G.US10Y[d] ? G.US10Y[d].close : null }, vix: vx, base, invested: inv });
}
function avg(a) { const v = a.filter((x) => x != null); return v.length ? v.reduce((t, x) => t + x, 0) / v.length : null; }
function ladder(h) { return h >= 0.5 ? 15 : h >= 0.2 ? 30 : h > -0.2 ? 50 : h > -0.5 ? 80 : 100; }
log("two dials replayed", seriesOut.length, "sessions; with both dials:", seriesOut.filter((s) => s.invested != null).length);

/* ---------- the nine breakouts: did the two-dial read separate the ones that followed through from the ones that failed better than the heat? ---------- */
const byDate = Object.fromEntries(seriesOut.map((s) => [s.date, s]));
const events = H1.events.filter((e) => e.around && e.around.p20).map((e) => { const r = e.sym === "SPY" ? e.around.spy20 : e.around.qqq20; const s = byDate[e.breakDate]; const sb = byDate[e.around.before.date];
  const heatSays = e.around.day.heat >= 0.2 ? "hold back" : e.around.day.heat <= -0.2 ? "add" : "hold"; const twoSays = s && s.invested != null ? (s.invested >= 70 ? "add" : s.invested < 50 ? "hold back" : "hold") : null;
  return { sym: e.sym, breakDate: e.breakDate, level: e.pivotHigh, close: e.breakClose, ret20: r, followed: r > 0, heatBefore: e.around.before.heat, heatDay: e.around.day.heat, heatRung: ladder(e.around.day.heat), heatSays, regime: s && s.regime, regimeWord: s && s.regimeWord, stretch: s && s.stretch, stretchWord: s && s.stretchWord, invested: s && s.invested, investedBefore: sb && sb.invested, twoSays, breadth: s && s.breadth, blocks: s && s.blocks, st: s && s.st }; });
const scored = events.filter((e) => e.invested != null);
const count = (list, pred) => list.filter(pred).length;
const F = scored.filter((e) => e.followed), X = scored.filter((e) => !e.followed);
const check = { breakouts: events.length, scored: scored.length, followedThrough: F.length, failed: X.length, rule: "followed through = the broken fund closed higher twenty sessions after the break (HEAT1's +20 column); the heat 'holds back' at or above +0.2 (its STRETCHED rung), the two dials 'hold back' under 50% invested and 'add' at or above 70%",
  heat: { holdBack_followed: count(F, (e) => e.heatSays === "hold back"), holdBack_failed: count(X, (e) => e.heatSays === "hold back"), hold_followed: count(F, (e) => e.heatSays === "hold"), hold_failed: count(X, (e) => e.heatSays === "hold"), add_followed: count(F, (e) => e.heatSays === "add"), add_failed: count(X, (e) => e.heatSays === "add"), meanFollowed: avg(F.map((e) => e.heatDay)), meanFailed: avg(X.map((e) => e.heatDay)), meanRungFollowed: avg(F.map((e) => e.heatRung)), meanRungFailed: avg(X.map((e) => e.heatRung)) },
  two: { holdBack_followed: count(F, (e) => e.twoSays === "hold back"), holdBack_failed: count(X, (e) => e.twoSays === "hold back"), hold_followed: count(F, (e) => e.twoSays === "hold"), hold_failed: count(X, (e) => e.twoSays === "hold"), add_followed: count(F, (e) => e.twoSays === "add"), add_failed: count(X, (e) => e.twoSays === "add"), meanInvFollowed: avg(F.map((e) => e.invested)), meanInvFailed: avg(X.map((e) => e.invested)), meanRegimeFollowed: avg(F.map((e) => e.regime)), meanRegimeFailed: avg(X.map((e) => e.regime)), meanStretchFollowed: avg(F.map((e) => e.stretch)), meanStretchFailed: avg(X.map((e) => e.stretch)) },
  /* a rank test: if you ordered the nine by each read, how many followed-through / failed pairs are in the right order (higher invested → followed through) */
  pairs: (() => { let hp = 0, hc = 0, tp = 0, tc = 0; for (const f of F) for (const x of X) { if (f.heatRung !== x.heatRung) { hp++; if (f.heatRung > x.heatRung) hc++; } if (f.invested !== x.invested) { tp++; if (f.invested > x.invested) tc++; } } return { heat: { pairs: hp, rightOrder: hc }, two: { pairs: tp, rightOrder: tc }, total: F.length * X.length }; })() };
log("breakouts", check);

/* ---------- today: the two dials on the last completed session, plus the live quotes and LB1's reviewed-line states ---------- */
const last = seriesOut[seriesOut.length - 1];
const lbRow = (sym) => LB1.rows.find((r) => r.ticker === sym);
const linesToday = Object.fromEntries(["SPY", "QQQ"].map((sym) => { const r = lbRow(sym); if (!r) return [sym, null]; const lv = r.levels.slice().sort((a, b) => b.level - a.level); const q = QUOTES && (QUOTES.quotes || QUOTES.rows || QUOTES); const row = Array.isArray(q) ? q.find((x) => x.symbol === sym) : q && q[sym]; const live = row ? (row.price ?? row.last ?? null) : null;
  return [sym, { price_lb1: r.price, price_source: r.price_source, price_time: r.price_time, live, lines: r.lines, nearest_above: r.nearest_above, nearest_below: r.nearest_below, states: lv.map((l) => ({ id: l.native_id, tf: l.tf, kind: l.kind, level: +l.level.toFixed(2), pct: +l.pct.toFixed(2), state: l.state, approved_slope: l.approved_slope })),
    summary: { above: lv.filter((l) => l.state === "above").length, retest_from_above: lv.filter((l) => /retest_from_above/.test(l.state)).length, broke_above: lv.filter((l) => /broke_above/.test(l.state)).length, retest_from_below: lv.filter((l) => /retest_from_below/.test(l.state)).length, below: lv.filter((l) => l.state === "below").length } }]; }));
const vixLive = MACRO && MACRO.macro && MACRO.macro.VIX && MACRO.macro.VIX.quote ? MACRO.macro.VIX.quote : null, tenLive = macroProof.quote;
const today = { session: last.date, regime: last.regime, regimeWord: last.regimeWord, structure: last.structure, st: last.st, breadth: last.breadth, breadthRead: last.breadthRead, credit: last.credit, creditFlag: last.creditFlag, base: last.base,
  stretch: last.stretch, stretchWord: last.stretchWord, blocks: last.blocks, gp: last.gp, op: last.op, ten: last.ten, vix: last.vix, invested: last.invested, heat: last.heat, heatRung: last.heatRung,
  live: { vix: vixLive && { price: vixLive.price, session: vixLive.session_et, observed: vixLive.price_observation_utc, vsBase: last.vix ? +(vixLive.price / last.vix.base - 1).toFixed(3) : null }, tenYear: tenLive && { price: tenLive.price, session: tenLive.session_et, observed: tenLive.price_observation_utc }, quotes: Object.fromEntries(["SPY", "QQQ", "SMH"].map((s) => { const q = QUOTES && (QUOTES.quotes || QUOTES.rows || QUOTES); const row = Array.isArray(q) ? q.find((x) => x.symbol === s) : q && q[s]; return [s, row ? (row.price ?? row.last ?? null) : null]; })), read_utc: new Date().toISOString() }, lines: linesToday };
/* the fixed band the 10-year voter uses today, for the panel */
today.tenBand = { yield: last.ten.yield, fixed: last.ten.yield == null ? null : +clamp(((4.8 + 3.5) / 2 - last.ten.yield) / ((4.8 - 3.5) / 2)).toFixed(3), ownGeiger: last.ten.g, ownPct: last.ten.pct, inverted: last.ten.g == null ? null : +(-last.ten.g).toFixed(3) };

/* ---------- the tree-aware middle: SG1's gauge per sector; CO1's cohorts read for themselves, with growth ---------- */
const liveG = (s) => GEI.symbols[s] && GEI.symbols[s].composite != null ? clamp(GEI.symbols[s].composite) : null;
const yearFrom = iso(Date.parse(TO) - 365 * DAY);
const cohorts = CO1.cohorts.filter((c) => !c.id.startsWith("IDX_")).map((c) => { const mem = c.members.filter((m) => GC[m] || liveG(m) != null); const hist = {}; for (const m of mem) { const g = GC[m]; if (!g) continue; for (const [d, r] of Object.entries(g)) { if (d < yearFrom) continue; (hist[d] = hist[d] || []).push(r.g); } }
  const ds = Object.keys(hist).sort(); const ser = ds.map((d) => avg(hist[d])); const lastRebuilt = ser.length ? ser[ser.length - 1] : null; const liveAvg = avg(mem.map(liveG)); const pct = pctile(lastRebuilt, ser.slice(0, -1));
  const growth = c.members.map((m) => COMPS[m] && COMPS[m].rev_growth).filter((x) => x != null && isFinite(x)); const gsorted = growth.slice().sort((a, b) => a - b); const gmed = gsorted.length ? gsorted[gsorted.length >> 1] : null;
  const names = mem.map((m) => ({ t: m, g: liveG(m), growth: COMPS[m] ? COMPS[m].rev_growth : null, pct: GC[m] ? pctile(GC[m][TO] ? GC[m][TO].g : null, Object.entries(GC[m]).filter(([d]) => d >= yearFrom && d < TO).map(([, r]) => r.g)) : null })).sort((a, b) => (a.g ?? 9) - (b.g ?? 9));
  return { id: c.id, label: c.label, parents: c.parents, home: c.parents[0], homeSector: c.home_sector, n: c.n, served: mem.length, liveGeiger: liveAvg == null ? null : +liveAvg.toFixed(3), rebuiltLast: lastRebuilt == null ? null : +lastRebuilt.toFixed(3), ownPct12m: pct == null ? null : +pct.toFixed(3), sessions12m: ser.length, growthMedian: gmed == null ? null : +gmed.toFixed(3), growthN: growth.length,
    coldForItself: pct != null && pct <= 0.25, hotForItself: pct != null && pct >= 0.75, goodGrowth: gmed != null && gmed >= 0.15, movesTogether: c.moves_together && c.moves_together.avg_pair_corr, names }; });
const parents = {}; for (const c of cohorts) { const p = (parents[c.home] = parents[c.home] || { id: c.home, label: (CO1.headings[c.home] || {}).label || c.home, cohorts: [] }); p.cohorts.push(c.id); }
for (const p of Object.values(parents)) { const cs = cohorts.filter((c) => c.home === p.id); p.liveGeiger = avg(cs.map((c) => c.liveGeiger)); p.ownPct12m = avg(cs.map((c) => c.ownPct12m)); p.growthMedian = avg(cs.map((c) => c.growthMedian)); p.coldCohorts = cs.filter((c) => c.coldForItself).map((c) => c.label); p.coldWithGrowth = cs.filter((c) => c.coldForItself && c.goodGrowth).map((c) => c.label); p.hotCohorts = cs.filter((c) => c.hotForItself).map((c) => c.label); for (const k of ["liveGeiger", "ownPct12m", "growthMedian"]) if (p[k] != null) p[k] = +p[k].toFixed(3); }
const tree = { sectors: SG1, cohorts, parents: Object.values(parents).sort((a, b) => (a.ownPct12m ?? 1) - (b.ownPct12m ?? 1)), coldWithGrowth: cohorts.filter((c) => c.coldForItself && c.goodGrowth).sort((a, b) => a.ownPct12m - b.ownPct12m).map((c) => c.id), note: "a cohort's reading = the equal-weight average of its served members' Geigers (live: the Hub's seven-rung /geiger; history: the three-rung rebuild on each member's D/3D/W bars); its own percentile places the last rebuilt close among its last twelve months; growth = the median revenue growth of its members from the comps feed; cold for itself ≤ 25th percentile, good growth ≥ 15%" };
log("tree", cohorts.length, "cohorts;", tree.coldWithGrowth.length, "cold with growth");

/* ---------- the two-year summary ---------- */
const withBoth = seriesOut.filter((s) => s.invested != null);
const summary = { sessions: seriesOut.length, withBothDials: withBoth.length, from: withBoth[0] && withBoth[0].date, to: TO, investedMean: avg(withBoth.map((s) => s.invested)), heatRungMean: avg(withBoth.map((s) => s.heatRung)),
  regimeWords: Object.fromEntries(Object.entries(withBoth.reduce((m, s) => { const k = s.regimeWord.split(" · ")[0]; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1])), stretchWords: Object.fromEntries(Object.entries(withBoth.reduce((m, s) => { const k = s.stretchWord.split(" — ")[0]; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1])),
  creditFlagDays: withBoth.filter((s) => s.creditFlag).length, spikeDays: withBoth.filter((s) => s.vix && s.vix.spike).length, spikes: (() => { const out = []; let cur = null; for (const s of seriesOut) { if (!s.vix) continue; if (s.vix.spike) { if (!cur || daysBetween(cur.lastDay, s.date) > 5) { cur = { first: s.date, lastDay: s.date, peak: s.vix.vix, base: s.vix.base }; out.push(cur); } else { cur.lastDay = s.date; cur.peak = Math.max(cur.peak, s.vix.vix); } } } return out.map((c) => { const after = seriesOut.filter((s) => s.date > c.lastDay && s.vix); const back = after.find((s) => s.vix.vix <= s.vix.base * 1.05); return { ...c, sessionsAboveSpike: daysBetween(c.first, c.lastDay) + 1, sessionsToBaseline: back ? daysBetween(c.first, back.date) : null }; }); })(),
  agree: withBoth.filter((s) => Math.abs(s.invested - s.heatRung) <= 15).length };
fs.writeFileSync(path.join(OUT, "r4.json"), JSON.stringify({ built_utc: new Date().toISOString(), from: FROM, to: TO, rules: { regime: "0.6 × structure + 0.4 × breadth. Structure per index (SPY, QQQ, averaged): above the latest confirmed 2W P1 and holding (> 1.5% over it) +1 · retesting it from above (−1% to +1.5%) +0.6 · uptrend under resistance (over the 200-day, under the line) +0.2 · lost a broken line −0.5 · under the line and under the 200-day −1. Breadth: the served companies' % above the 200-day and % above the 50-day, each (pct − 50) ÷ 25, averaged, clamped. Credit is a condition, not a vote: HYG's Geiger at or under −0.5 names it and takes 10 points off.",
  stretch: "the mean of four blocks, equal weight: (1) the SPY, QQQ and SMH Geigers, each placed in its own last 252 sessions (2 × percentile − 1); (2) SPY's and QQQ's daily RSI(14) and Williams %R(14), each by its own percentile the same way; (3) the VIX against its own 60-session median: read = −(VIX ÷ median − 1) ÷ 0.35, so 35% over its baseline reads −1 (fear) and 35% under reads +1 (calm); a spike is a close 35% or more over the baseline; (4) the 10-year's own Geiger (D, 3D, W bars, the Hub's formula), inverted — a hot yield is a headwind.",
  invested: "REGIME sets the base: ≥ +0.5 → 90% · ≥ +0.2 → 75% · middle → 60% · ≤ −0.2 → 40% · ≤ −0.5 → 25%; STRETCH moves it by up to 20 points (−20 × stretch); credit not confirming takes 10 off; bounded 15–100. These bases and swings are a proposal for Alan, not settled numbers.", ownPast: "percentiles use the last 252 sessions once available and never fewer than 100; the first sessions of the replay therefore read against a shorter own-past, and the chart marks where 252 is reached", pivot: H1.pivotRule },
  macroProof, breadthUniverse: { companies: companies.length, withBars: Object.keys(barsD).length, excluded: "funds (the CO1 index layer), SPY/QQQ/IWM/SMH/RSP/HYG/TLT/XLK/XLP/XLU and the USD pairs" }, vixRule: { spike: SPIKE, baselineSessions: BASE_N }, summary, series: seriesOut, events, check, today, tree, lb1: { generated_at: LB1.generated_at, N: LB1.N, near: LB1.near } }, null, 0));
console.log(JSON.stringify({ today: { session: today.session, regime: today.regime, regimeWord: today.regimeWord, stretch: today.stretch, stretchWord: today.stretchWord, invested: today.invested, heat: today.heat, heatRung: today.heatRung, breadth: today.breadth, ten: today.tenBand, vix: today.vix, live: today.live }, check, summary: { ...summary, spikes: summary.spikes.length }, coldWithGrowth: tree.coldWithGrowth, macroProof: macroProof.bars }, null, 1));
