/* HM1 (6 Oct 2026) — what the heat and the ladder said at real market bottoms, and when the ladder last said 100% / 80%.
   Study only: writes study/hm1/data/hm1.json; nothing on the live page reads it.
   node scripts/hm1-bottoms.mjs <cacheDir>      (cacheDir = the folder scripts/hm1-pull.mjs filled; read-only pulls, no key but the page's own)

   The replay is HEAT1's (scripts/heat1-history.mjs) carried back to 2007, with three things done differently and said so on the page:
   1. the 3-day and weekly bars are built here from the daily bars with the provider's own buckets (3 calendar days from 10 Sep 2003;
      weeks from Sunday) — the provider's ready-made QQQ 3-day bars have a hole from Dec 2004 to Mar 2011, and this makes every symbol
      and every year the same. The build is checked against the provider's ready-made SPY bars and the check is in the output.
   2. the advance/decline row uses the page's own first-choice formula (the 20-session line over the tool's candidate names, rebuilt
      from their daily closes) instead of the one-day fallback HEAT1 used.
   3. the market_internals rows (TRIN, up/down volume) are read on the session they describe: until 6 Aug 2026 every row is stamped
      one session early and Mondays are missing; from 10 Aug 2026 the rows are the provider's 3-day buckets. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "study/hm1/data"); fs.mkdirSync(OUT, { recursive: true });
const CACHE = process.argv[2]; if (!CACHE || !fs.existsSync(path.join(CACHE, "SPY_D.json"))) { console.error("usage: node scripts/hm1-bottoms.mjs <cacheDir>   (run scripts/hm1-pull.mjs <cacheDir> first)"); process.exit(2); }
const DAY = 864e5; const iso = (t) => new Date(t).toISOString().slice(0, 10);
const dayNum = (d) => Math.round(Date.parse(d + "T00:00:00Z") / DAY);
const clamp = (x) => Math.max(-1, Math.min(1, x));
const r4 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(4)), r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3));

/* ---------- the page's own constants, read off index.html (the base weights and the ladder; Alan's saved dials live in his browser) ---------- */
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const DEF = HTML.match(/const DEFAULTS = \{([\s\S]*?)\n\};/)[1];
const WTS = Object.fromEntries(DEF.match(/wts:\{([^}]+)\}/)[1].split(",").map((s) => s.split(":")).map(([k, v]) => [k.trim(), +v]));
const dnum = (k) => +DEF.match(new RegExp("\\b" + k + ":\\s*([0-9.]+)"))[1];
const VIX_COLD = dnum("vixCold"), TEN_COLD = dnum("tenCold");
const LADDER = { deepCold: dnum("maxInv"), cold: dnum("invCold"), mid: dnum("invMid"), hot: dnum("invHot"), deepHot: dnum("minInv") };
/* heatLabel() and PLAIN_COND, as on the page: ≤ −0.5 · ≤ −0.2 · between · ≥ +0.2 · ≥ +0.5 */
function rungOf(h) { if (h == null) return null; if (h >= 0.5) return { cond: "DEEP OVERBOUGHT", word: "DEEPLY STRETCHED", pct: LADDER.deepHot }; if (h >= 0.2) return { cond: "OVERBOUGHT", word: "STRETCHED", pct: LADDER.hot };
  if (h <= -0.5) return { cond: "DEEP OVERSOLD", word: "DEEPLY WASHED OUT", pct: LADDER.deepCold }; if (h <= -0.2) return { cond: "OVERSOLD", word: "WASHED OUT", pct: LADDER.cold }; return { cond: "NEUTRAL", word: "MIDDLING", pct: LADDER.mid }; }

/* ---------- the Hub's Geiger, exactly as HEAT1 rebuilt it (provider services/hot-query/geiger-from-massive.mjs): per rung the newest 230
   bars; TREND = order of the nine-line fan; MOMENTUM = 0.6 × RSI(14) on 23..77 + 0.4 × Williams %R(14) on −90..−10; rung = half and half;
   the rungs blend by the Equalizer's weights. Three rungs (D, 3D, W) — years of intraday bars are not kept. ---------- */
const RUNGS = { D: 3.178477, "3D": 2.576738, W: 0.987499 };
const RSI_OS = 23, RSI_OB = 77, W_OS = -90, W_OB = -10, W_RSI = 0.6, W_WILL = 0.4;
const FAN = [["e", 5], ["e", 8], ["e", 13], ["e", 21], ["e", 34], ["s", 50], ["s", 100], ["s", 150], ["s", 200]];
function emaLast(a, n) { const k = 2 / (n + 1); let e = a[0]; for (let i = 1; i < a.length; i++) e = a[i] * k + e * (1 - k); return e; }
function smaLast(a, n) { let s = 0; for (let i = a.length - n; i < a.length; i++) s += a[i]; return s / n; }
function rsiLast(c, p = 14) { let g = 0, l = 0; for (let i = 1; i <= p; i++) { const d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; } g /= p; l /= p;
  for (let i = p + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; g = (g * (p - 1) + (d > 0 ? d : 0)) / p; l = (l * (p - 1) + (d < 0 ? -d : 0)) / p; } return 100 - 100 / (1 + (l === 0 ? 1e9 : g / l)); }
function rung(c, h, l) { const n = c.length; if (n < 15) return null; const close = c[n - 1]; const f = [];
  for (const [ty, len] of FAN) { if (n < len) continue; f.push(ty === "e" ? emaLast(c, len) : smaLast(c, len)); }
  const pairs = f.length - 1; if (pairs <= 0) return null; let inOrder = 0; for (let i = 0; i < pairs; i++) if (f[i] > f[i + 1]) inOrder++; const trend = (2 * inOrder - pairs) / pairs;
  const rsi = rsiLast(c, 14); let hh = -1e18, ll = 1e18; for (let j = n - 14; j < n; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
  const wr = hh > ll ? (hh - close) / (hh - ll) * -100 : -50; const mom = (clamp((rsi - RSI_OS) / (RSI_OB - RSI_OS) * 2 - 1) * W_RSI + clamp((wr - W_OS) / (W_OB - W_OS) * 2 - 1) * W_WILL) / (W_RSI + W_WILL);
  return { trend, mom, read: 0.5 * trend + 0.5 * mom, rsi, wr, lines: f.length }; }

/* ---------- reads (the cache hm1-pull.mjs filled) ---------- */
function loadD(sym) { const f = path.join(CACHE, `${sym}_D.json`); if (!fs.existsSync(f)) return []; const s = (JSON.parse(fs.readFileSync(f, "utf8")).series || []).filter((b) => b && b.c != null); const seen = new Set(), out = [];
  for (const b of s) { const d = iso(b.t); if (seen.has(d)) continue; seen.add(d); out.push({ d, o: b.o ?? b.c, h: b.h ?? b.c, l: b.l ?? b.c, c: b.c }); } return out; }
const GEI = ["SPY", "QQQ", "IWM", "SMH", "RSP", "HYG", "TLT", "XLP", "XLU", "BTCUSD", "CLUSD", "GCUSD"];
const SECTOR_FUNDS = ["XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLB", "XLRE", "XLC", "XLP", "XLU"];
const BARS = {}; for (const s of [...new Set([...GEI, ...SECTOR_FUNDS, "VIX", "US10Y", "US3M"])]) BARS[s] = loadD(s);
const tbl = (n) => { const f = path.join(CACHE, "data", n + ".json"); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const treas = tbl("treasury") || [], vixT = tbl("vix") || [], intern = tbl("internals") || [], UNI = tbl("universe") || { candidates: [] };
const treasOld = tbl("treasury_fmp") || [];   // optional: an FMP treasury history pull for the years before the table starts (absent unless a keyed job filled it)
const vix3mOld = tbl("vix3m_fmp") || [];      // optional: the 3-month VIX before the table carries it
const SERVED = JSON.parse(fs.readFileSync(path.join(CACHE, "served_closes.json"), "utf8"));

/* ---------- 3-day and weekly bars from the daily bars, on the provider's buckets ---------- */
const A3 = dayNum("2003-09-10"), AW = dayNum("2003-09-07");   // a provider 3D bar starts every third calendar day from 10 Sep 2003 (ET); a weekly bar on Sunday
const bucket = { "3D": (d) => Math.floor((dayNum(d) - A3) / 3), W: (d) => Math.floor((dayNum(d) - AW) / 7) };
const bucketStart = { "3D": (k) => iso((A3 + 3 * k) * DAY), W: (k) => iso((AW + 7 * k) * DAY) };
function rollup(D, tf) { const out = []; let cur = null, id = null; for (const b of D) { const k = bucket[tf](b.d); if (k !== id) { if (cur) out.push(cur); cur = { d: bucketStart[tf](k), o: b.o, h: b.h, l: b.l, c: b.c, n: 1 }; id = k; } else { cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; cur.n++; } } if (cur) out.push(cur); return out; }
function bucketCheck(sym, tf) { const f = path.join(CACHE, `${sym}_${tf}.json`); if (!fs.existsSync(f)) return null; const P = (JSON.parse(fs.readFileSync(f, "utf8")).series || []); const mine = Object.fromEntries(rollup(BARS[sym], tf).map((b) => [b.d, b]));
  let n = 0, same = 0, maxDiff = 0, offBucket = 0, missing = 0; const lastD = BARS[sym][BARS[sym].length - 1].d;
  for (const p of P) { const d = iso(p.t); const k = bucket[tf](d); if (bucketStart[tf](k) !== d) { offBucket++; continue; } const m = mine[d]; if (!m) { missing++; continue; } if (dayNum(d) + (tf === "3D" ? 3 : 7) > dayNum(lastD) + 1) continue; n++;
    const diff = Math.max(Math.abs(m.o - p.o), Math.abs(m.h - p.h), Math.abs(m.l - p.l), Math.abs(m.c - p.c)) / p.c; if (diff < 1e-6) same++; if (diff > maxDiff) maxDiff = diff; }
  let hole = null; for (let i = 1; i < P.length; i++) if ((P[i].t - P[i - 1].t) / DAY > 30) hole = { from: iso(P[i - 1].t), to: iso(P[i].t) };
  return { sym, tf, provider_bars: P.length, compared: n, identical: same, max_rel_diff: +maxDiff.toExponential(2), off_bucket: offBucket, not_built: missing, provider_hole: hole }; }
const bucketChecks = [["SPY", "3D"], ["SPY", "W"], ["QQQ", "3D"], ["QQQ", "W"], ["IWM", "3D"], ["IWM", "W"]].map(([s, t]) => bucketCheck(s, t)).filter(Boolean);

/* ---------- the Geiger, day by day: completed higher-rung bars and the forming one, all from the daily bars ---------- */
function geigerSeries(D, keepRungs = false) { const out = new Map(); const st = { "3D": { done: [], cur: null, id: null }, W: { done: [], cur: null, id: null } };
  const C = D.map((b) => b.c), H = D.map((b) => b.h), L = D.map((b) => b.l);
  for (let i = 0; i < D.length; i++) { const b = D[i];
    for (const tf of ["3D", "W"]) { const s = st[tf], k = bucket[tf](b.d); if (s.id !== k) { if (s.cur) s.done.push(s.cur); s.cur = { h: b.h, l: b.l, c: b.c }; s.id = k; } else { if (b.h > s.cur.h) s.cur.h = b.h; if (b.l < s.cur.l) s.cur.l = b.l; s.cur.c = b.c; } }
    const reads = []; const lo = Math.max(0, i - 229); const dr = rung(C.slice(lo, i + 1), H.slice(lo, i + 1), L.slice(lo, i + 1)); if (dr) reads.push(["D", dr]);
    for (const tf of ["3D", "W"]) { const s = st[tf]; const seq = s.done.slice(-229); seq.push(s.cur); const r = rung(seq.map((x) => x.c), seq.map((x) => x.h), seq.map((x) => x.l)); if (r) reads.push([tf, r]); }
    if (!reads.length) continue; const W = reads.reduce((t, [k]) => t + RUNGS[k], 0); const blend = (f) => reads.reduce((t, [k, r]) => t + RUNGS[k] * r[f], 0) / W;
    const row = { g: blend("read"), trend: blend("trend"), mom: blend("mom"), rungs: reads.length, close: b.c };
    if (keepRungs) row.per = Object.fromEntries(reads.map(([k, r]) => [k, { trend: r3(r.trend), mom: r3(r.mom), read: r3(r.read), rsi: +r.rsi.toFixed(1), wr: +r.wr.toFixed(0), lines: r.lines }]));
    out.set(b.d, row); }
  return out; }
const G = {}; for (const s of [...new Set([...GEI, ...SECTOR_FUNDS])]) G[s] = geigerSeries(BARS[s], s === "SPY" || s === "QQQ");

/* ---------- sessions, and everything lined up on them ---------- */
const SPY = BARS.SPY; const sessions = SPY.map((b) => b.d); const SX = Object.fromEntries(sessions.map((d, i) => [d, i]));
const FROM = "2007-01-03"; const i0 = sessions.findIndex((d) => d >= FROM); const N = sessions.length; const TODAY = sessions[N - 1];
function carried(map, maxDays) { const keys = [...map.keys()].sort(); const out = new Array(N).fill(null); let p = 0, last = null; for (let i = 0; i < N; i++) { const d = sessions[i]; while (p < keys.length && keys[p] <= d) { last = keys[p]; p++; } if (last != null && dayNum(d) - dayNum(last) <= maxDays) out[i] = { ...map.get(last), asof: last }; } return out; }
const GA = {}; for (const s of Object.keys(G)) GA[s] = carried(G[s], 5);
const mapOf = (rows, key) => new Map(rows.filter((r) => r[key]).map((r) => [r[key], r]));
const VXA = carried(mapOf(vixT.filter((r) => r.vix != null), "date"), 5);
const V3A = carried(new Map([...vix3mOld.filter((r) => r.vix3m != null).map((r) => [r.date, r]), ...vixT.filter((r) => r.vix3m != null).map((r) => [r.date, r])]), 5);
const TRA = carried(mapOf(treas.filter((r) => r.y10 != null), "date"), 5);
const TROLD = carried(mapOf(treasOld.filter((r) => r.y10 != null && r.y2 != null), "date"), 5);
const TENA = carried(new Map(BARS.US10Y.map((b) => [b.d, { y10: b.c }])), 5);
const VIXBAR = carried(new Map(BARS.VIX.map((b) => [b.d, { vix: b.c }])), 5);
/* market_internals on the session each row describes (see the header) */
const NEW_WRITER = "2026-08-10"; const INA = new Array(N).fill(null), IN10 = new Array(N).fill(null);
{ const rows = intern.filter((r) => r.asof); let p = 0, last = null; for (let i = 0; i < N; i++) { const d = sessions[i]; const strict = d < NEW_WRITER; while (p < rows.length && (strict ? rows[p].asof < d : rows[p].asof <= d)) { last = rows[p]; p++; }
    if (last && dayNum(d) - dayNum(last.asof) <= 7) { INA[i] = last;
      /* the same two readings over the last ten stored sessions — the usual way TRIN is read (Arms' 10-day TRIN), and up/down volume as ten-session sums */
      const w = rows.slice(Math.max(0, p - 10), p).filter((r) => dayNum(d) - dayNum(r.asof) <= 21); const tr = w.filter((r) => r.trin != null).map((r) => +r.trin); let av = 0, dv = 0; for (const r of w) if (r.adv_volume > 0 && r.dec_volume > 0) { av += +r.adv_volume; dv += +r.dec_volume; }
      IN10[i] = { n: w.length, trin: tr.length >= 5 ? tr.reduce((a, b) => a + b, 0) / tr.length : null, av, dv }; } } }

/* the advance/decline line over the tool's candidate names — the page's buildBreadth20(), rebuilt from daily closes */
const SC = SERVED.closes, SS = SERVED.sessions; const sOff = SX[SS[0]];   // SERVED.sessions is the tail of the SPY sessions
function adLine(names) { const up = new Array(N).fill(0), dn = new Array(N).fill(0), live = new Array(N).fill(0);
  for (const s of names) { const row = SC[s]; if (!row) continue; let prev = null; const have = new Array(row.length).fill(0);
    for (let j = 0; j < row.length; j++) { const c = row[j]; if (c == null) continue; have[j] = 1; if (prev != null) { if (c > prev) up[j + sOff]++; else if (c < prev) dn[j + sOff]++; } prev = c; }
    let run = 0; for (let j = 0; j < row.length; j++) { run += have[j]; if (j >= 22) run -= have[j - 22]; if (run >= 3) live[j + sOff]++; } }
  const out = new Array(N).fill(null); let cum = 0; for (let i = sOff + 1; i < N; i++) { cum += up[i] - dn[i]; if (i >= sOff + 21) cum -= up[i - 20] - dn[i - 20]; if (i >= sOff + 21 && live[i] >= 50) out[i] = { n: live[i], cum, up: up[i], down: dn[i], val: clamp(cum / (live[i] * 20) / 0.33) }; }
  return out; }
const CANDS = UNI.candidates.filter((s) => SC[s]); const ADA = adLine(CANDS);
const FUNDISH = new Set([...GEI, ...SECTOR_FUNDS, "DIA", "MAGS", "GLD", "USO", "SLV", "AGG"]); const ALLSERVED = Object.keys(SC).filter((s) => !FUNDISH.has(s) && !/USD$/.test(s)); const ADALL = adLine(ALLSERVED);
/* % of the served names over their own 200-day — not a voter on the page; kept beside the replay because the 200-day is how Alan reads a washout */
const P200 = new Array(N).fill(null); { const over = new Array(N).fill(0), cnt = new Array(N).fill(0); for (const s of ALLSERVED) { const row = SC[s]; let sum = 0, q = []; for (let j = 0; j < row.length; j++) { const c = row[j]; if (c == null) continue; q.push(c); sum += c; if (q.length > 200) sum -= q.shift(); if (q.length === 200) { cnt[j + sOff]++; if (c > sum / 200) over[j + sOff]++; } } }
  for (let i = 0; i < N; i++) if (cnt[i] >= 50) P200[i] = { pct: 100 * over[i] / cnt[i], n: cnt[i] }; }
const closeAt = (sym) => { const m = new Map(BARS[sym].map((b) => [b.d, b.c])); return sessions.map((d) => m.get(d) ?? null); };
const cSPY = closeAt("SPY"), cRSP = closeAt("RSP");
const ret20 = (arr, i) => (i >= 20 && arr[i] != null && arr[i - 20] != null ? arr[i] / arr[i - 20] - 1 : null);

/* ---------- the voters, with the page's own formulas ---------- */
const VOTERS = [
  { k: "SPY", name: "S&P 500 (SPY Geiger)", camp: "STOCKS" }, { k: "QQQ", name: "Nasdaq-100 (QQQ Geiger)", camp: "STOCKS" }, { k: "IWM", name: "small caps (IWM Geiger)", camp: "STOCKS" }, { k: "SMH", name: "semis (SMH Geiger)", camp: "STOCKS" },
  { k: "CREDIT", name: "credit (HYG Geiger)", camp: "STOCKS" }, { k: "CRYPTO", name: "bitcoin (Geiger)", camp: "STOCKS" }, { k: "SECTORS", name: "sector bow tie (blended)", camp: "STOCKS" },
  { k: "VIX", name: "VIX (turned over)", camp: "FEAR" }, { k: "VIX_TERM", name: "VIX term (spot ÷ 3-month)", camp: "FEAR" }, { k: "ADLINE", name: "advance / decline line", camp: "FEAR" }, { k: "TRIN", name: "TRIN (turned over)", camp: "FEAR" }, { k: "B_VOL", name: "up vs down volume", camp: "FEAR" },
  { k: "BREADTH_EW", name: "equal-weight vs index", camp: "GAPS" }, { k: "BREADTH_SC", name: "small vs large", camp: "GAPS" }, { k: "CONC", name: "concentration", camp: "GAPS" },
  { k: "US10Y", name: "10-year yield (turned over)", camp: "BACKDROP" }, { k: "CURVE", name: "yield curve (10y − 2y)", camp: "BACKDROP" }, { k: "OIL", name: "oil (turned over)", camp: "BACKDROP" }, { k: "DURATION", name: "long bonds (TLT Geiger)", camp: "BACKDROP" }, { k: "HAVEN", name: "gold (turned over)", camp: "BACKDROP" }, { k: "DEF", name: "defensives (turned over)", camp: "BACKDROP" }];
const CAMP_WORDS = { STOCKS: "stocks and risk themselves", FEAR: "fear and breadth", GAPS: "gaps between two things", BACKDROP: "the backdrop: rates, oil, gold, bonds, defensives" };
const VK = VOTERS.map((v) => v.k); const GEIGER_OF = { SPY: "SPY", QQQ: "QQQ", IWM: "IWM", SMH: "SMH", CREDIT: "HYG", CRYPTO: "BTCUSD", DURATION: "TLT" };
function voterVals(i, o = {}) { const f = o.momOnly ? "mom" : "g"; const g = (s) => (GA[s] && GA[s][i] ? clamp(GA[s][i][f]) : null); const v = {}, src = {};
  for (const [k, s] of Object.entries(GEIGER_OF)) v[k] = g(s);
  const vx = VXA[i] || VIXBAR[i]; v.VIX = vx ? clamp(((VIX_COLD + 12) / 2 - vx.vix) / ((VIX_COLD - 12) / 2)) : null; src.vix = vx ? vx.vix : null;
  const tr = TRA[i], t10 = tr ? tr.y10 : TENA[i] ? TENA[i].y10 : null; v.US10Y = t10 != null ? clamp(((TEN_COLD + 3.5) / 2 - t10) / ((TEN_COLD - 3.5) / 2)) : null; src.y10 = t10; src.y10src = tr ? "treasury_rates" : TENA[i] ? "chart API ^TNX" : null;
  const cv = tr && tr.y2 != null ? tr : TROLD[i]; v.CURVE = cv && cv.y10 != null && cv.y2 != null ? clamp((cv.y10 - cv.y2) / 1.5) : null; src.y2 = cv ? cv.y2 : null; src.curve = cv ? r3(cv.y10 - cv.y2) : null;
  v.OIL = g("CLUSD") != null ? clamp(-g("CLUSD")) : null; v.HAVEN = g("GCUSD") != null ? clamp(-g("GCUSD")) : null;
  v.BREADTH_EW = g("RSP") != null && g("SPY") != null ? clamp(g("RSP") - g("SPY")) : null; v.BREADTH_SC = g("IWM") != null && g("SPY") != null ? clamp(g("IWM") - g("SPY")) : null;
  const v3 = V3A[i]; v.VIX_TERM = vx && v3 && v3.vix3m ? clamp((1 - vx.vix / v3.vix3m) * 4) : null; src.vix3m = v3 ? v3.vix3m : null;
  const inn = INA[i]; const ad = ADA[i];
  if (ad) { v.ADLINE = ad.val; src.ad = { n: ad.n, line: ad.cum, how: "20-session line, the tool's candidate names" }; } else if (inn && inn.advancers != null && inn.decliners != null) { v.ADLINE = clamp((inn.advancers - inn.decliners) / Math.max(1, inn.advancers + inn.decliners) * 2); src.ad = { how: "one-day count, market_internals (the page's fallback)" }; } else v.ADLINE = null;
  v.TRIN = inn && inn.trin != null ? clamp((1 - +inn.trin) * 2) : null; v.B_VOL = inn && inn.adv_volume > 0 && inn.dec_volume > 0 ? clamp((inn.adv_volume - inn.dec_volume) / (inn.adv_volume + inn.dec_volume) * 3) : null; src.internals = inn ? inn.asof : null;
  if (o.tenSession && IN10[i]) { const t = IN10[i]; if (v.TRIN != null && t.trin != null) v.TRIN = clamp((1 - t.trin) * 2); if (v.B_VOL != null && t.av > 0 && t.dv > 0) v.B_VOL = clamp((t.av - t.dv) / (t.av + t.dv) * 3); }
  const rs = ret20(cSPY, i), rr = ret20(cRSP, i); v.CONC = rs != null && rr != null ? clamp((rr - rs) / 0.05) : null;
  const dp = g("XLP"), du = g("XLU"); v.DEF = dp != null && du != null ? (o.defRelative ? (g("SPY") != null ? clamp(-((dp + du) / 2 - g("SPY"))) : null) : clamp(-(dp + du) / 2)) : null;
  if (o.sectorFunds) { const xs = SECTOR_FUNDS.map((s) => g(s)).filter((x) => x != null); v.SECTORS = xs.length >= 9 ? clamp(xs.reduce((a, b) => a + b, 0) / xs.length) : null; } else v.SECTORS = null;
  if (o.flip) for (const k of o.flip) if (v[k] != null) v[k] = -v[k];
  v._src = src; return v; }
function heatOf(vals, o = {}) { let num = 0, den = 0; const present = [], absent = []; for (const k of VK) { const w = (o.weights || WTS)[k] ?? 0; if (!w) continue; if (o.drop && o.drop.includes(k)) continue; if (vals[k] == null) { absent.push(k); continue; } num += vals[k] * w; den += w; present.push(k); } return { heat: den ? num / den : null, w: den, present, absent }; }

/* ---------- the variants: the base (the live tool's formulas and base weights) and the candidate repairs ---------- */
const BACKDROP = ["US10Y", "CURVE", "OIL", "DURATION", "HAVEN", "DEF"];   // the six rows that describe the backdrop, not how sold stocks are
const VARIANTS = {
  base: { label: "the tool as it stands", o: {} },
  A: { label: "repair 1 — the six backdrop rows stop voting", o: { drop: BACKDROP } },
  A2: { label: "repairs 1 + 2 — and TRIN and up/down volume read over ten sessions", o: { drop: BACKDROP, tenSession: true } },
  fix: { label: "repairs 1 + 2 (the proposed repair)", o: { drop: BACKDROP, tenSession: true } },
  A2B: { label: "repairs 1 + 2 + 3 — and the Geiger rows read their momentum half", o: { drop: BACKDROP, tenSession: true, momOnly: true } },
  B: { label: "only the momentum half (no other repair)", o: { momOnly: true } },
  ten: { label: "only the ten-session internals (no other repair)", o: { tenSession: true } },
  flipSafety: { label: "the 10-year and long bonds turned over instead of taken out", o: { flip: ["US10Y", "DURATION"] } },
  baseSectors: { label: "the tool as it stands, with the sector row read as the eleven funds' own Geigers", o: { sectorFunds: true } },
  fixSectors: { label: "the proposed repair, with the sector row read as the eleven funds' own Geigers", o: { drop: BACKDROP, tenSession: true, sectorFunds: true } } };
const SER = {}; for (const [name, V] of Object.entries(VARIANTS)) { const heat = new Array(N).fill(null), w = new Array(N).fill(null); for (let i = i0; i < N; i++) { const h = heatOf(voterVals(i, V.o), V.o); heat[i] = h.heat; w[i] = h.w; } SER[name] = { heat, w }; }

/* ---------- SPY's own lines: the 200-day, the Lab's three clouds, the drawdown ---------- */
const sma = (arr, n) => { const out = new Array(arr.length).fill(null); let s = 0; for (let i = 0; i < arr.length; i++) { s += arr[i]; if (i >= n) s -= arr[i - n]; if (i >= n - 1) out[i] = s / n; } return out; };
const emaPine = (arr, n) => { const out = new Array(arr.length).fill(null); const k = 2 / (n + 1); let e = null; for (let i = 0; i < arr.length; i++) { if (i === n - 1) { let s = 0; for (let j = 0; j < n; j++) s += arr[j]; e = s / n; } else if (i >= n) e = arr[i] * k + e * (1 - k); out[i] = e; } return out; };
const S200 = sma(cSPY, 200), S50 = sma(cSPY, 50), E21 = emaPine(cSPY, 21), E13 = emaPine(cSPY, 13);
/* Lab rule (INDICATOR_LAB/…/SCINTILLA_Clean_Clouds_V17_Readable.pine, read only): daily closes; 13–21 cloud blue when EMA13 ≥ EMA21, 21–50 cloud blue when
   EMA21 ≥ SMA50, 50–200 cloud blue when SMA50 ≥ SMA200, pink otherwise. A flip blue → pink is the first close on which the pair reads pink. */
const cloudBlue = { c1321: (i) => E13[i] != null && E21[i] != null ? E13[i] >= E21[i] : null, c2150: (i) => E21[i] != null && S50[i] != null ? E21[i] >= S50[i] : null, c50200: (i) => S50[i] != null && S200[i] != null ? S50[i] >= S200[i] : null };
const fwd = (i, k) => (i + k < N ? cSPY[i + k] / cSPY[i] - 1 : null);
const worstAhead = (i, k) => { let m = 0; for (let j = i + 1; j <= Math.min(N - 1, i + k); j++) m = Math.min(m, cSPY[j] / cSPY[i] - 1); return i + 1 < N ? m : null; };
function eventRow(i, extra = {}) { const b = SER.base.heat[i], f = SER.fix.heat[i]; return { date: sessions[i], spy: cSPY[i], heat: r4(b), pct: b == null ? null : rungOf(b).pct, word: b == null ? null : rungOf(b).word, fix: r4(f), fixPct: f == null ? null : rungOf(f).pct, fixWord: f == null ? null : rungOf(f).word, f20: r4(fwd(i, 20)), f60: r4(fwd(i, 60)), f120: r4(fwd(i, 120)), f250: r4(fwd(i, 250)), worst60: r4(worstAhead(i, 60)), ...extra }; }
const EVENTS = { loss200: [], c1321: [], c2150: [], c50200: [] };
for (let i = Math.max(i0, 201); i < N; i++) { if (cSPY[i] < S200[i] && cSPY[i - 1] >= S200[i - 1]) { let back = null; for (let j = i + 1; j < N; j++) if (cSPY[j] >= S200[j]) { back = j; break; } EVENTS.loss200.push(eventRow(i, { level: r4(S200[i]), sessionsUnder: back == null ? null : back - i, backDate: back == null ? null : sessions[back] })); }
  for (const k of ["c1321", "c2150", "c50200"]) { const now = cloudBlue[k](i), was = cloudBlue[k](i - 1); if (was === true && now === false) { let back = null; for (let j = i + 1; j < N; j++) if (cloudBlue[k](j) === true) { back = j; break; } EVENTS[k].push(eventRow(i, { sessionsPink: back == null ? null : back - i, backDate: back == null ? null : sessions[back] })); } } }
const med = (a) => { const x = a.filter((v) => v != null).sort((p, q) => p - q); return x.length ? (x.length % 2 ? x[x.length >> 1] : (x[(x.length >> 1) - 1] + x[x.length >> 1]) / 2) : null; };
function eventStats(rows) { const grp = (sel) => { const r = rows.filter(sel); const pos = (k) => { const x = r.filter((e) => e[k] != null); return x.length ? x.filter((e) => e[k] > 0).length + " of " + x.length : null; }; return { n: r.length, medHeat: r3(med(r.map((e) => e.heat))), med20: r4(med(r.map((e) => e.f20))), med60: r4(med(r.map((e) => e.f60))), med120: r4(med(r.map((e) => e.f120))), med250: r4(med(r.map((e) => e.f250))), up20: pos("f20"), up60: pos("f60"), up120: pos("f120"), up250: pos("f250"), medWorst60: r4(med(r.map((e) => e.worst60))) }; };
  return { all: grp(() => true), since2009: grp((e) => e.date >= "2009-01-01"), heatCold: grp((e) => e.heat != null && e.heat <= -0.2), heatNotCold: grp((e) => e.heat != null && e.heat > -0.2), fixCold: grp((e) => e.fix != null && e.fix <= -0.2), fixDeep: grp((e) => e.fix != null && e.fix <= -0.5), fixNotCold: grp((e) => e.fix != null && e.fix > -0.2), byRung: Object.fromEntries([100, 80, 50, 30, 15].map((p) => [p, grp((e) => e.pct === p)])), byFixRung: Object.fromEntries([100, 80, 50, 30, 15].map((p) => [p, grp((e) => e.fixPct === p)])) }; }
const EVSTATS = Object.fromEntries(Object.entries(EVENTS).map(([k, rows]) => [k, eventStats(rows)]));
/* the yardstick for the event tables: every session since 2009, whatever the heat */
const ANY = (() => { const rows = []; for (let i = SX["2009-01-02"]; i < N; i++) rows.push({ heat: SER.base.heat[i], fix: SER.fix.heat[i], f20: fwd(i, 20), f60: fwd(i, 60), f120: fwd(i, 120), f250: fwd(i, 250), worst60: worstAhead(i, 60), pct: rungOf(SER.base.heat[i])?.pct, fixPct: rungOf(SER.fix.heat[i])?.pct, date: sessions[i] }); return eventStats(rows); })();

/* ---------- the seven dates ---------- */
const SEVEN = [["2026-03-26", "26 Mar 2026"], ["2025-04-04", "4 Apr 2025"], ["2023-10-30", "30 Oct 2023"], ["2022-10-17", "17 Oct 2022"], ["2020-03-17", "17 Mar 2020"], ["2018-12-21", "21 Dec 2018"], ["2009-03-02", "2 Mar 2009"]];
const WHY_ABSENT = { SECTORS: "the blended sector bow tie needs five readings per sector and only one of them (the fund's own Geiger) has a past", CURVE: "the 2-year yield: the treasury table starts 3 Aug 2020 and the chart API carries no 2-year", VIX_TERM: "the 3-month VIX: the VIX table carries it from 18 Sep 2009", TRIN: "the market-internals table starts 5 Jan 2015", B_VOL: "the market-internals table starts 5 Jan 2015", CRYPTO: "bitcoin's bars start 5 Oct 2009", CREDIT: "HYG first traded 11 Apr 2007", ADLINE: "the candidate names' daily closes reach back 5,000 sessions (Nov 2006)" };
function detail(i, vname = "base") { const V = VARIANTS[vname]; const vals = voterVals(i, V.o); const h = heatOf(vals, V.o); const rows = VOTERS.filter((v) => (WTS[v.k] ?? 0) > 0 && !(V.o.drop || []).includes(v.k)).map((v) => ({ k: v.k, name: v.name, camp: v.camp, weight: WTS[v.k], val: r4(vals[v.k]), share: vals[v.k] == null || !h.w ? null : r4(vals[v.k] * WTS[v.k] / h.w), why: vals[v.k] == null ? (WHY_ABSENT[v.k] || "no reading that day") : null }));
  const camps = {}; for (const c of Object.keys(CAMP_WORDS)) { const r = rows.filter((x) => x.camp === c && x.val != null); const w = r.reduce((t, x) => t + x.weight, 0); camps[c] = { words: CAMP_WORDS[c], weight: w, mean: w ? r3(r.reduce((t, x) => t + x.val * x.weight, 0) / w) : null, share: h.w ? r4(r.reduce((t, x) => t + x.val * x.weight, 0) / h.w) : null, n: r.length }; }
  return { date: sessions[i], heat: r4(h.heat), rung: rungOf(h.heat), weight: h.w, present: h.present, absent: h.absent, rows, camps, src: vals._src }; }
function sevenRow([date, label]) { const i = SX[date]; const win = []; for (let k = -5; k <= 5; k++) { const j = i + k; if (j < 0 || j >= N) continue; const b = SER.base.heat[j], f = SER.fix.heat[j]; win.push({ k, date: sessions[j], spy: cSPY[j], chg: r4(cSPY[j] / cSPY[j - 1] - 1), heat: r4(b), pct: rungOf(b).pct, word: rungOf(b).word, fix: r4(f), fixPct: rungOf(f).pct, fixWord: rungOf(f).word, p200: P200[j] ? +P200[j].pct.toFixed(1) : null }); }
  /* the closing low of that slide: the lowest SPY close within 15 sessions either side */
  let lo = i; for (let j = Math.max(0, i - 15); j <= Math.min(N - 1, i + 15); j++) if (cSPY[j] < cSPY[lo]) lo = j; let hi = lo; for (let j = Math.max(0, lo - 252); j <= lo; j++) if (cSPY[j] > cSPY[hi]) hi = j;
  const minBase = win.reduce((a, b) => (b.heat < a.heat ? b : a)), minFix = win.reduce((a, b) => (b.fix < a.fix ? b : a));
  const spyG = G.SPY.get(sessions[i]), qqqG = G.QQQ.get(sessions[i]);
  return { date, label, i, spy: cSPY[i], base: detail(i, "base"), fix: detail(i, "fix"), variants: Object.fromEntries(Object.keys(VARIANTS).map((v) => [v, { heat: r4(SER[v].heat[i]), pct: rungOf(SER[v].heat[i]).pct, word: rungOf(SER[v].heat[i]).word, w: SER[v].w[i] }])),
    window: win, minBase, minFix, low: { date: sessions[lo], spy: cSPY[lo], sessionsFromDate: lo - i, fromHigh: r4(cSPY[lo] / cSPY[hi] - 1), highDate: sessions[hi], heat: r4(SER.base.heat[lo]), pct: rungOf(SER.base.heat[lo]).pct, word: rungOf(SER.base.heat[lo]).word, fix: r4(SER.fix.heat[lo]), fixPct: rungOf(SER.fix.heat[lo]).pct, fixWord: rungOf(SER.fix.heat[lo]).word },
    after: { f20: r4(fwd(i, 20)), f60: r4(fwd(i, 60)), f120: r4(fwd(i, 120)), f250: r4(fwd(i, 250)) }, vs200: S200[i] ? r4(cSPY[i] / S200[i] - 1) : null, p200: P200[i] ? { pct: +P200[i].pct.toFixed(1), n: P200[i].n } : null,
    geiger: { SPY: spyG && { g: r3(spyG.g), trend: r3(spyG.trend), mom: r3(spyG.mom), per: spyG.per }, QQQ: qqqG && { g: r3(qqqG.g), trend: r3(qqqG.trend), mom: r3(qqqG.mom), per: qqqG.per } },
    adAll: ADALL[i] ? r3(ADALL[i].val) : null, adCands: ADA[i] ? { val: r3(ADA[i].val), n: ADA[i].n } : null }; }
const seven = SEVEN.map(sevenRow);
const today = (() => { const i = N - 1; return { date: TODAY, spy: cSPY[i], base: detail(i, "base"), fix: detail(i, "fix"), variants: Object.fromEntries(Object.keys(VARIANTS).map((v) => [v, { heat: r4(SER[v].heat[i]), pct: rungOf(SER[v].heat[i]).pct, word: rungOf(SER[v].heat[i]).word, w: SER[v].w[i] }])), vs200: r4(cSPY[i] / S200[i] - 1), p200: P200[i] ? { pct: +P200[i].pct.toFixed(1), n: P200[i].n } : null }; })();

/* ---------- every real low since 2007, found by rule rather than picked: the lowest SPY close within 60 sessions either side, 10% or more under the high of the year before ---------- */
const LOWS = []; for (let i = Math.max(i0, 252); i < N; i++) { let isLow = true; for (let j = Math.max(0, i - 60); j <= Math.min(N - 1, i + 60); j++) if (cSPY[j] < cSPY[i]) { isLow = false; break; } if (!isLow) continue; let hi = i; for (let j = i - 252; j <= i; j++) if (cSPY[j] > cSPY[hi]) hi = j; const dd = cSPY[i] / cSPY[hi] - 1; if (dd > -0.10) continue;
  const row = { date: sessions[i], spy: cSPY[i], fromHigh: r4(dd), highDate: sessions[hi], settled: i + 60 < N, f60: r4(fwd(i, 60)), f250: r4(fwd(i, 250)), p200: P200[i] ? +P200[i].pct.toFixed(1) : null }; for (const v of Object.keys(VARIANTS)) { const h = SER[v].heat[i]; let mn = h; for (let j = Math.max(i0, i - 5); j <= Math.min(N - 1, i + 5); j++) if (SER[v].heat[j] != null && SER[v].heat[j] < mn) mn = SER[v].heat[j]; row[v] = { heat: r4(h), pct: rungOf(h).pct, word: rungOf(h).word, min5: r4(mn), min5pct: rungOf(mn).pct }; } LOWS.push(row); }

/* ---------- the rungs through time: how often, the stretches of 100% and 80%, and when each was last said ---------- */
function ladderHistory(vname, from = "2009-01-02") { const H = SER[vname].heat; const a = Math.max(i0, SX[from] ?? i0); const count = { 100: 0, 80: 0, 50: 0, 30: 0, 15: 0 }; let n = 0, mn = { h: 9 }, mx = { h: -9 }; const last = {}; const xs = [];
  for (let i = a; i < N; i++) { if (H[i] == null) continue; const p = rungOf(H[i]).pct; count[p]++; n++; last[p] = sessions[i]; xs.push(H[i]); if (H[i] < mn.h) mn = { h: H[i], date: sessions[i] }; if (H[i] > mx.h) mx = { h: H[i], date: sessions[i] }; }
  xs.sort((p, q) => p - q); const pc = (q) => r3(xs[Math.min(xs.length - 1, Math.floor(q * xs.length))]);
  const stretches = (pctWanted) => { const out = []; let s = null; for (let i = a; i < N; i++) { const p = H[i] == null ? null : rungOf(H[i]).pct; const on = pctWanted === 80 ? (p === 80 || p === 100) : p === pctWanted; if (on && s == null) s = i; if ((!on || i === N - 1) && s != null) { const e = on ? i : i - 1; let lo = s; for (let j = s; j <= Math.min(N - 1, s + 250); j++) if (cSPY[j] < cSPY[lo]) lo = j; let mh = s; for (let j = s; j <= e; j++) if (H[j] < H[mh]) mh = j;
        out.push({ from: sessions[s], to: sessions[e], sessions: e - s + 1, spyAtStart: cSPY[s], lowestHeat: r4(H[mh]), lowestHeatDate: sessions[mh], furtherFall: r4(cSPY[lo] / cSPY[s] - 1), lowDate: sessions[lo], f60: r4(fwd(s, 60)), f120: r4(fwd(s, 120)), f250: r4(fwd(s, 250)) }); s = null; } } return out; };
  /* stretches that sit within 10 sessions of each other are one episode */
  const merge = (S) => { const out = []; for (const x of S) { const p = out[out.length - 1]; if (p && SX[x.from] - SX[p.to] <= 10) { p.to = x.to; p.sessions += x.sessions; if (x.lowestHeat < p.lowestHeat) { p.lowestHeat = x.lowestHeat; p.lowestHeatDate = x.lowestHeatDate; } p.parts++; } else out.push({ ...x, parts: 1 }); } return out; };
  return { from: sessions[a], to: TODAY, sessions: n, count, share: Object.fromEntries(Object.entries(count).map(([k, v]) => [k, r4(v / n)])), last, min: { heat: r4(mn.h), date: mn.date }, max: { heat: r4(mx.h), date: mx.date }, pctiles: { p01: pc(0.01), p05: pc(0.05), p25: pc(0.25), p50: pc(0.5), p75: pc(0.75), p95: pc(0.95), p99: pc(0.99) }, at100: merge(stretches(100)), at80plus: merge(stretches(80)) }; }
const HIST = Object.fromEntries(Object.keys(VARIANTS).map((v) => [v, ladderHistory(v)])); const HIST2007 = { base: ladderHistory("base", FROM), fix: ladderHistory("fix", FROM) };

/* ---------- the check against HEAT1's own stored replay (same formulas; its 3D / W bars were the provider's ready-made ones) ---------- */
let heat1Check = null; try { const H1 = JSON.parse(fs.readFileSync(path.join(ROOT, "study/heat1/data/heat1.json"), "utf8")); const keys = ["SPY", "QQQ", "IWM", "SMH", "VIX", "US10Y", "OIL", "CRYPTO", "BREADTH_EW", "BREADTH_SC", "VIX_TERM", "CURVE", "CONC", "CREDIT", "DURATION", "HAVEN", "DEF", "ADLINE", "TRIN", "B_VOL"]; const acc = Object.fromEntries(keys.map((k) => [k, { n: 0, sum: 0, max: 0 }]));
  for (const s of H1.series) { const i = SX[s.date]; if (i == null) continue; const v = voterVals(i); for (const k of keys) { if (s.v[k] == null || v[k] == null) continue; const d = Math.abs(s.v[k] - v[k]); acc[k].n++; acc[k].sum += d; if (d > acc[k].max) acc[k].max = d; } }
  let hn = 0, hs = 0, hm = 0; for (const s of H1.series) { const i = SX[s.date]; if (i == null || s.heat == null || SER.base.heat[i] == null) continue; const d = Math.abs(s.heat - SER.base.heat[i]); hn++; hs += d; if (d > hm) hm = d; }
  heat1Check = { sessions: H1.series.length, from: H1.from, to: H1.to, heat: { n: hn, meanAbsDiff: r4(hs / hn), maxAbsDiff: r4(hm) }, voters: Object.fromEntries(keys.map((k) => [k, { n: acc[k].n, meanAbsDiff: acc[k].n ? r4(acc[k].sum / acc[k].n) : null, maxAbsDiff: r4(acc[k].max) }])), note: "HEAT1 read the provider's ready-made 3D and W bars, the one-day advance/decline fallback and the internals rows on their stamped dates; this replay builds the bars itself, uses the 20-session line and reads the internals on the session they describe — so the Geiger rows should match closely and those three rows should not" }; } catch (e) { heat1Check = { error: String(e.message) }; }

/* ---------- coverage: which voters could be read, and from when ---------- */
const coverage = Object.fromEntries(VOTERS.filter((v) => WTS[v.k] > 0).map((v) => { let first = null, days = 0; for (let i = i0; i < N; i++) { const x = voterVals(i)[v.k]; if (x != null) { days++; if (!first) first = sessions[i]; } } return [v.k, { name: v.name, camp: v.camp, weight: WTS[v.k], from: first, days, of: N - i0, why: first ? null : WHY_ABSENT[v.k] || null }]; }));

/* ---------- write ---------- */
const series = []; for (let i = i0; i < N; i++) series.push([sessions[i], cSPY[i], r3(SER.base.heat[i]), r3(SER.fix.heat[i]), S200[i] == null ? null : +S200[i].toFixed(2), P200[i] ? +P200[i].pct.toFixed(1) : null, r3(SER.A.heat[i]), r3(SER.A2B.heat[i]), SER.base.w[i], cloudBlue.c1321(i) ? 1 : 0, cloudBlue.c2150(i) ? 1 : 0, cloudBlue.c50200(i) ? 1 : 0]);
const out = { built_utc: new Date().toISOString(), from: FROM, to: TODAY, weights: Object.fromEntries(VOTERS.map((v) => [v.k, WTS[v.k]])), weightTotal: VOTERS.reduce((t, v) => t + (WTS[v.k] || 0), 0), ladder: LADDER, thresholds: [-0.5, -0.2, 0.2, 0.5], anchors: { vixHot: 12, vixCold: VIX_COLD, tenHot: 3.5, tenCold: TEN_COLD }, rungs: RUNGS,
  voters: VOTERS, campWords: CAMP_WORDS, variants: Object.fromEntries(Object.entries(VARIANTS).map(([k, v]) => [k, { label: v.label, ...v.o }])), backdrop: BACKDROP, whyAbsent: WHY_ABSENT,
  inputs: { candidates: CANDS.length, candidatesListed: UNI.candidates.length, servedCompanies: ALLSERVED.length, servedRead: SERVED.read_utc, served: SERVED.served, internalsRows: intern.length, internalsFrom: intern[0]?.asof, internalsNewWriter: NEW_WRITER, treasuryFrom: treas[0]?.date, treasuryOldRows: treasOld.length, vix3mFrom: vixT.find((r) => r.vix3m != null)?.date, vix3mOldRows: vix3mOld.length, tenFromChartApi: BARS.US10Y[0]?.d, vixFrom: vixT[0]?.date, bars: Object.fromEntries(Object.keys(BARS).map((s) => [s, { n: BARS[s].length, from: BARS[s][0]?.d, to: BARS[s][BARS[s].length - 1]?.d }])) },
  bucketChecks, heat1Check, coverage, seven, today, lows: LOWS, history: HIST, history2007: HIST2007, events: EVENTS, eventStats: EVSTATS, anySession: ANY,
  seriesCols: ["date", "spy", "heat", "fix", "sma200", "pctOver200", "heatA", "heatA2B", "weight", "cloud1321", "cloud2150", "cloud50200"], series };
fs.writeFileSync(path.join(OUT, "hm1.json"), JSON.stringify(out));
const line = (s) => `${s.label.padEnd(12)} SPY ${String(s.spy).padStart(7)}  base ${String(s.base.heat).padStart(7)} ${String(s.base.rung.pct).padStart(3)}% (${s.base.present.length} voters, w ${s.base.weight})  fix ${String(s.fix.heat).padStart(7)} ${String(s.fix.rung.pct).padStart(3)}%  | low ${s.low.date} ${s.low.fromHigh} base ${s.low.heat} fix ${s.low.fix} | win min base ${s.minBase.heat}@${s.minBase.date} fix ${s.minFix.fix}@${s.minFix.date}`;
console.log(seven.map(line).join("\n")); console.log("today", TODAY, JSON.stringify(today.variants));
console.log("bucket checks", JSON.stringify(bucketChecks)); console.log("heat1 check", JSON.stringify(heat1Check && heat1Check.heat), JSON.stringify(heat1Check && heat1Check.voters));
console.log("history base", JSON.stringify({ ...HIST.base, at100: HIST.base.at100.length, at80plus: HIST.base.at80plus.length })); console.log("history fix", JSON.stringify({ ...HIST.fix, at100: HIST.fix.at100.length, at80plus: HIST.fix.at80plus.length }));
console.log("events", Object.entries(EVENTS).map(([k, v]) => k + " " + v.length).join(" · "));
