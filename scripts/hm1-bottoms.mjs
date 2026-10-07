/* HM1 (6 Oct 2026) — what the heat and the ladder said at real market bottoms, and when the ladder last said 100% / 80%.
   Study only: writes study/hm1/data/hm1.json; nothing on the live page reads it.
   node scripts/hm1-bottoms.mjs <cacheDir>      (cacheDir = the folder scripts/hm1-pull.mjs filled; read-only pulls)

   The replay is the live tool's own arithmetic on every evening since 3 Jan 2007: each voter's formula as index.html writes it, the
   page's base weights, the heat as their weighted average, the rung from the page's five thresholds. What is different from HEAT1:
   1. the Geiger rows are the Hub's own seven-rung Geiger (scripts/hm1-geiger.mjs), not a three-rung stand-in — on the last evening the
      rebuild equals the Hub's /geiger to four decimals on all 18 funds, and that check is in the output;
   2. the advance/decline row uses the page's first-choice formula (the 20-session line over the tool's candidate names, rebuilt from
      their daily closes, read as the page reads it on the evening of a session) instead of the one-day fallback;
   3. the market_internals rows (TRIN, up vs down volume) are read on the session they describe: until 6 Aug 2026 every row is stamped
      one calendar day early and the rows for Mondays are missing; from 10 Aug 2026 a row is a three-day bucket of the whole market;
   4. the years the tables do not reach are filled from the same sources: the 2-year and 10-year from FMP before 3 Aug 2020, the 3-month
      VIX from FMP before 18 Sep 2009 (scripts/hm1-fmp-rates.mjs, a keyed read on a throw-away machine), and the two tape rows rebuilt
      from the served names' own closes and volumes before 5 Jan 2015. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execFileSync } from "node:child_process";
import * as GE from "./hm1-geiger.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "study/hm1/data"); fs.mkdirSync(OUT, { recursive: true });
const CACHE = process.argv[2]; if (!CACHE || !fs.existsSync(path.join(CACHE, "SPY_D.json"))) { console.error("usage: node scripts/hm1-bottoms.mjs <cacheDir>   (run scripts/hm1-pull.mjs <cacheDir> first)"); process.exit(2); }
const DAY = 864e5; const dayNum = GE.dayNum, isoDn = GE.isoOfDayNum;
const clamp = (x) => Math.max(-1, Math.min(1, x));
const r4 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(4)), r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3)), r2 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(2));
const med = (a) => { const x = a.filter((v) => v != null && isFinite(v)).sort((p, q) => p - q); return x.length ? (x.length % 2 ? x[x.length >> 1] : (x[(x.length >> 1) - 1] + x[x.length >> 1]) / 2) : null; };
const mean = (a) => { const x = a.filter((v) => v != null && isFinite(v)); return x.length ? x.reduce((p, q) => p + q, 0) / x.length : null; };

/* ---------- the page's own constants, read off index.html (the base weights and the ladder; Alan's saved dials live in his browser) ---------- */
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const DEF = HTML.match(/const DEFAULTS = \{([\s\S]*?)\n\};/)[1];
const WTS = Object.fromEntries(DEF.match(/wts:\{([^}]+)\}/)[1].split(",").map((s) => s.split(":")).map(([k, v]) => [k.trim(), +v]));
const dnum = (k) => +DEF.match(new RegExp("\\b" + k + ":\\s*([0-9.]+)"))[1];
const VIX_COLD = dnum("vixCold"), TEN_COLD = dnum("tenCold");
const LADDER = { deepCold: dnum("maxInv"), cold: dnum("invCold"), mid: dnum("invMid"), hot: dnum("invHot"), deepHot: dnum("minInv") };
const TH = { deepCold: -0.5, cold: -0.2, hot: 0.2, deepHot: 0.5 };   // heatLabel(): ≤ −0.5 · ≤ −0.2 · between · ≥ +0.2 · ≥ +0.5
/* this branch started before R3 went to main; the replay must use the constants the DEPLOYED page uses, so main's file is read too and compared */
const mainCheck = (() => { try { const M = execFileSync("git", ["-C", ROOT, "show", "origin/main:index.html"], { encoding: "utf8", maxBuffer: 64e6 }); const D2 = M.match(/const DEFAULTS = \{([\s\S]*?)\n\};/)[1]; const pick = (D) => ({ wts: D.match(/wts:\{([^}]+)\}/)[1].replace(/\s/g, ""), ladder: ["maxInv", "invCold", "invMid", "invHot", "minInv", "vixCold", "tenCold"].map((k) => D.match(new RegExp("\\b" + k + ":\\s*([0-9.]+)"))[1]).join(",") }); const fn = (src, name) => { const i = src.indexOf("function " + name + "("); return i < 0 ? null : src.slice(i, src.indexOf("\n}", i)).replace(/\s+/g, " "); };
    const a = pick(DEF), b = pick(D2); return { commit: execFileSync("git", ["-C", ROOT, "rev-parse", "--short", "origin/main"], { encoding: "utf8" }).trim(), sameWeights: a.wts === b.wts, sameLadderAndAnchors: a.ladder === b.ladder, sameHeatLabel: fn(HTML, "heatLabel") === fn(M, "heatLabel"), samePolicyStep: fn(HTML, "policyStep") === fn(M, "policyStep") }; } catch (e) { return { error: String(e.message).slice(0, 120) }; } })();
function rungOf(h, th = TH) { if (h == null) return null; if (h >= th.deepHot) return { cond: "DEEP OVERBOUGHT", word: "DEEPLY STRETCHED", pct: LADDER.deepHot }; if (h >= th.hot) return { cond: "OVERBOUGHT", word: "STRETCHED", pct: LADDER.hot };
  if (h <= th.deepCold) return { cond: "DEEP OVERSOLD", word: "DEEPLY WASHED OUT", pct: LADDER.deepCold }; if (h <= th.cold) return { cond: "OVERSOLD", word: "WASHED OUT", pct: LADDER.cold }; return { cond: "NEUTRAL", word: "MIDDLING", pct: LADDER.mid }; }

const LADDER_PCT = (h) => rungOf(h).pct;
/* ---------- sessions (SPY's own daily bars are the calendar) ---------- */
const SPYS = GE.loadSymbol(CACHE, "SPY"); const sessDn = SPYS.bars["1d"].dn; const N = sessDn.length; const sessions = sessDn.map(isoDn); const SX = Object.fromEntries(sessions.map((d, i) => [d, i]));
const nextDn = sessDn.map((d, i) => { if (i + 1 < N) return sessDn[i + 1]; let n = d + 1; while ([0, 6].includes(new Date(n * DAY).getUTCDay())) n++; return n; });
const FROM = "2007-01-03"; const i0 = sessions.findIndex((d) => d >= FROM); const TODAY = sessions[N - 1];
const cSPY = SPYS.bars["1d"].c;

/* ---------- the Geiger of every symbol a voter reads, on every evening ---------- */
const HUB7 = ["SPY", "QQQ", "IWM", "SMH", "RSP", "HYG", "TLT", "XLP", "XLU"];            // the chart API's /geiger carries these: seven rungs
const SECTOR_FUNDS = ["XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLB", "XLRE", "XLC", "XLP", "XLU"];
const STAGED = ["CLUSD", "GCUSD", "BTCUSD"];                                                // the page reads these three from the older stored Geiger; rebuilt here from daily bars (D, 3D, W)
const SYM = {}; for (const s of [...new Set([...HUB7, ...SECTOR_FUNDS, ...STAGED])]) SYM[s] = s === "SPY" ? SPYS : GE.loadSymbol(CACHE, s);
const GA = {}; for (const s of Object.keys(SYM)) GA[s] = SYM[s] ? GE.geigerSeries(SYM[s], sessDn, nextDn, { keep: true, only: STAGED.includes(s) ? ["1d", "3d", "1w"] : null }) : new Array(N).fill(null);

/* the check: the rebuilt Geiger on the last evening against the Hub's own /geiger taken that evening */
const geigerCheck = (() => { const f = path.join(CACHE, "geiger_live_evening.json"); if (!fs.existsSync(f)) return null; const L = JSON.parse(fs.readFileSync(f, "utf8")); const rows = []; let worst = 0;
  for (const s of [...new Set([...HUB7, ...SECTOR_FUNDS])]) { const h = L.symbols && L.symbols[s], r = GA[s][N - 1]; if (!h || !r) continue; const d = [r.g - h.composite, r.trend - h.trend, r.mom - h.momentum]; worst = Math.max(worst, ...d.map(Math.abs)); rows.push({ sym: s, hub: r4(h.composite), rebuilt: r4(r.g), diff: +d[0].toFixed(5), trendDiff: +d[1].toFixed(5), momDiff: +d[2].toFixed(5), rungs: r.n }); }
  /* and at any other instant a /geiger answer was saved that evening (the finality rule in full, not its end-of-day shortcut) */
  const instants = fs.readdirSync(CACHE).filter((n) => /^geiger_live_.*\.json$/.test(n)).map((n) => { const P2 = JSON.parse(fs.readFileSync(path.join(CACHE, n), "utf8")); const T = Date.parse(P2.computed_utc); let w = 0, k = 0; for (const s of [...new Set([...HUB7, ...SECTOR_FUNDS])]) { const h = P2.symbols && P2.symbols[s], r = GE.geigerAt(SYM[s], T, sessDn); if (!h || !r) continue; k++; w = Math.max(w, Math.abs(r.g - h.composite), Math.abs(r.trend - h.trend), Math.abs(r.mom - h.momentum)); } return { computed_utc: P2.computed_utc, funds: k, largestAbsDiff: +w.toFixed(5) }; }).sort((a, b) => (a.computed_utc < b.computed_utc ? -1 : 1));
  return { published_utc: L.published_utc, session: TODAY, funds: rows.length, largestAbsDiff: +worst.toFixed(5), rungs: (L.participating_rungs || []).map((r) => ({ key: r.equalizer_key, weight: r.weight })), instants, rows }; })();

/* ---------- the tables, lined up on the sessions ---------- */
const tbl = (n) => { const f = path.join(CACHE, "data", n + ".json"); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const treas = tbl("treasury") || [], vixT = tbl("vix") || [], intern = tbl("internals") || [], UNI = tbl("universe") || { candidates: [] };
const treasOld = (tbl("treasury_fmp") || { rows: [] }).rows || [], vix3mOld = (tbl("vix3m_fmp") || { rows: [] }).rows || [];
function carried(map, maxDays) { const keys = [...map.keys()].sort(); const out = new Array(N).fill(null); let p = 0, last = null; for (let i = 0; i < N; i++) { const d = sessions[i]; while (p < keys.length && keys[p] <= d) { last = keys[p]; p++; } if (last != null && dayNum(d) - dayNum(last) <= maxDays) out[i] = { ...map.get(last), asof: last }; } return out; }
const VXA = carried(new Map(vixT.filter((r) => r.vix != null).map((r) => [r.date, r])), 5);
const V3A = carried(new Map([...vix3mOld.filter((r) => r.vix3m != null).map((r) => [r.date, { vix3m: r.vix3m, src: "FMP" }]), ...vixT.filter((r) => r.vix3m != null).map((r) => [r.date, { vix3m: r.vix3m, src: "vix_term" }])]), 5);
const SKA = carried(new Map(vixT.filter((r) => r.skew != null).map((r) => [r.date, r])), 5);
const TRA = carried(new Map([...treasOld.filter((r) => r.y10 != null).map((r) => [r.date, { y2: r.y2, y10: r.y10, src: "FMP" }]), ...treas.filter((r) => r.y10 != null).map((r) => [r.date, { y2: r.y2, y10: r.y10, src: "treasury_rates" }])]), 5);
const TNX = (() => { const f = path.join(CACHE, "US10Y_D.json"); const m = new Map(); if (fs.existsSync(f)) for (const b of JSON.parse(fs.readFileSync(f, "utf8")).series || []) if (b && b.c != null) m.set(new Date(b.t).toISOString().slice(0, 10), { y10: b.c }); return carried(m, 5); })();

/* ---------- the served names' closes and volumes: the advance/decline line, and the two tape rows before the table starts ---------- */
const SERVED = JSON.parse(fs.readFileSync(path.join(CACHE, "served_closes.json"), "utf8")); const SC = SERVED.closes, sOff = SX[SERVED.sessions[0]];
const VOLS = (() => { const f = path.join(CACHE, "served_volumes.json"); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).volumes : null; })();
const FUNDISH = new Set([...HUB7, ...SECTOR_FUNDS, "DIA", "MAGS", "GLD", "USO", "SLV", "AGG"]);
const CANDS = UNI.candidates.filter((s) => SC[s]); const ALLSERVED = Object.keys(SC).filter((s) => !FUNDISH.has(s) && !/USD$/.test(s));
/* per session: how many names rose and fell (close against the name's bar before), how many printed, and the volume behind each side */
function tape(names) { const up = new Float64Array(N), dn = new Float64Array(N), cnt = new Float64Array(N), live = new Float64Array(N), av = new Float64Array(N), dv = new Float64Array(N);
  for (const s of names) { const row = SC[s]; if (!row) continue; const vol = VOLS && VOLS[s]; let prev = null; const have = new Uint8Array(row.length);
    for (let j = 0; j < row.length; j++) { const c = row[j]; if (c == null) continue; have[j] = 1; if (prev != null) { cnt[j + sOff]++; const v = vol && vol[j] != null ? vol[j] : 0; if (c > prev) { up[j + sOff]++; av[j + sOff] += v; } else if (c < prev) { dn[j + sOff]++; dv[j + sOff] += v; } } prev = c; }
    let run = 0; for (let j = 0; j < row.length; j++) { run += have[j]; if (j >= 22) run -= have[j - 22]; if (run >= 3) live[j + sOff]++; } }
  return { up, dn, cnt, live, av, dv }; }
const TC = tape(CANDS), TA = tape(ALLSERVED);
/* the page's advance/decline vote as it stands on the evening of a session: the line over the last 20 completed sessions (the day included, once its
   bar has settled) plus "today" from the quotes — which in the evening is the same day again — over (names × 21); two thirds of the names up every day = +1 */
const ADA = new Array(N).fill(null); for (let i = sOff + 22; i < N; i++) { const nd = TC.live[i]; if (nd < 50 || !TC.cnt[i]) continue; let cum = 0; for (let j = i - 19; j <= i; j++) cum += TC.up[j] - TC.dn[j]; const slope = (cum + (TC.up[i] - TC.dn[i]) * nd / TC.cnt[i]) / (nd * 21); ADA[i] = { n: nd, cum, up: TC.up[i], down: TC.dn[i], val: clamp(slope / 0.33) }; }
/* % of the served companies over their own 200-day — not a voter on the page; kept beside the replay because the 200-day is how Alan reads a washout */
const P200 = new Array(N).fill(null); { const over = new Float64Array(N), cnt = new Float64Array(N); for (const s of ALLSERVED) { const row = SC[s]; let sum = 0; const q = []; for (let j = 0; j < row.length; j++) { const c = row[j]; if (c == null) continue; q.push(c); sum += c; if (q.length > 200) sum -= q.shift(); if (q.length === 200) { cnt[j + sOff]++; if (c > sum / 200) over[j + sOff]++; } } }
  for (let i = 0; i < N; i++) if (cnt[i] >= 50) P200[i] = { pct: 100 * over[i] / cnt[i], n: cnt[i] }; }

/* ---------- market_internals on the session each row describes ---------- */
const NEW_WRITER = "2026-08-10"; const TABLE_FROM = intern.length ? isoDn(dayNum(intern[0].asof) + 1) : null;   // the first session the table describes
const INA = new Array(N).fill(null);
{ const rows = intern.filter((r) => r.asof); let p = 0, last = null; for (let i = 0; i < N; i++) { const d = sessions[i]; const strict = d < NEW_WRITER; while (p < rows.length && (strict ? rows[p].asof < d : rows[p].asof <= d)) { last = rows[p]; p++; }
    /* the page drops the newest row once it is more than five days old; read on the evening of a session that is a row stamped up to four days before it */
    if (last && dayNum(d) - dayNum(last.asof) <= 4) INA[i] = { trin: last.trin == null ? null : +last.trin, av: +last.adv_volume, dv: +last.dec_volume, adv: last.advancers, dec: last.decliners, universe: last.universe, asof: last.asof, src: "market_internals" }; } }
/* before the table: the same two readings from the served companies' own bars (TRIN = (advancers ÷ decliners) ÷ (up volume ÷ down volume)) */
const REBUILT = new Array(N).fill(null); if (VOLS) for (let i = sOff + 1; i < N; i++) { const a = TA.up[i], d = TA.dn[i], av = TA.av[i], dv = TA.dv[i]; if (a + d < 50 || !a || !d || !(av > 0) || !(dv > 0)) continue; REBUILT[i] = { trin: (a / d) / (av / dv), av, dv, adv: a, dec: d, universe: TA.cnt[i], asof: sessions[i], src: "rebuilt from the served companies" }; }
const INT = INA.map((x, i) => x || (TABLE_FROM && sessions[i] < TABLE_FROM ? REBUILT[i] : null));
/* how close the rebuild is to the table where both exist (it is used only for the years before the table) */
const internalsCheck = (() => { if (!VOLS) return null; let n = 0, sameSign = 0, sT = 0, sR = 0, sTT = 0, sRR = 0, sTR = 0; const dT = []; for (let i = 0; i < N; i++) { const t = INA[i], r = REBUILT[i]; if (!t || !r || sessions[i] >= NEW_WRITER || t.trin == null || t.asof !== isoDn(sessDn[i] - 1)) continue; n++; const tv = (t.av - t.dv) / (t.av + t.dv), rv = (r.av - r.dv) / (r.av + r.dv); if (Math.sign(tv) === Math.sign(rv)) sameSign++; sT += tv; sR += rv; sTT += tv * tv; sRR += rv * rv; sTR += tv * rv; dT.push(Math.abs(Math.log(t.trin / r.trin))); }
  if (!n) return null; const corr = (n * sTR - sT * sR) / Math.sqrt((n * sTT - sT * sT) * (n * sRR - sR * sR)); return { sessions: n, upDownVolume: { correlation: r3(corr), sameSign: r3(sameSign / n) }, trin: { medianRatioGap: r3(Math.exp(med(dT)) - 1) } }; })();
/* the same two readings over the ten sessions to the day (Arms' ten-day TRIN: the mean of the daily values; volume as ten-session sums) */
const INT10 = new Array(N).fill(null); for (let i = 0; i < N; i++) { if (!INT[i]) continue; const seen = new Set(), tr = []; let av = 0, dv = 0; for (let j = i; j > Math.max(-1, i - 10); j--) { const x = INT[j]; if (!x || seen.has(x.asof)) continue; seen.add(x.asof); if (x.trin != null) tr.push(x.trin); if (x.av > 0 && x.dv > 0) { av += x.av; dv += x.dv; } } INT10[i] = { n: seen.size, trin: tr.length >= 3 ? mean(tr) : null, av, dv }; }

const closeMap = (sym) => { const B = SYM[sym].bars["1d"]; const m = new Map(B.dn.map((d, i) => [d, B.c[i]])); return sessDn.map((d) => m.get(d) ?? null); };
const cRSP = closeMap("RSP"); const ret20 = (arr, i) => (i >= 20 && arr[i] != null && arr[i - 20] != null ? arr[i] / arr[i - 20] - 1 : null);

/* ---------- the voters, with the page's own formulas (index.html voters()) ---------- */
const VOTERS = [
  { k: "SPY", name: "S&P 500 (SPY Geiger)", camp: "STOCKS" }, { k: "QQQ", name: "Nasdaq-100 (QQQ Geiger)", camp: "STOCKS" }, { k: "IWM", name: "small caps (IWM Geiger)", camp: "STOCKS" }, { k: "SMH", name: "semis (SMH Geiger)", camp: "STOCKS" },
  { k: "CREDIT", name: "credit (HYG Geiger)", camp: "STOCKS" }, { k: "CRYPTO", name: "bitcoin (Geiger)", camp: "STOCKS" }, { k: "SECTORS", name: "sector bow tie (blended)", camp: "STOCKS" },
  { k: "VIX", name: "VIX (turned over)", camp: "FEAR" }, { k: "VIX_TERM", name: "VIX term (spot ÷ 3-month)", camp: "FEAR" }, { k: "ADLINE", name: "advance / decline line", camp: "FEAR" }, { k: "TRIN", name: "TRIN (turned over)", camp: "FEAR" }, { k: "B_VOL", name: "up vs down volume", camp: "FEAR" },
  { k: "BREADTH_EW", name: "equal-weight vs index", camp: "GAPS" }, { k: "BREADTH_SC", name: "small vs large", camp: "GAPS" }, { k: "CONC", name: "concentration", camp: "GAPS" },
  { k: "US10Y", name: "10-year yield (turned over)", camp: "BACKDROP" }, { k: "CURVE", name: "yield curve (10y − 2y)", camp: "BACKDROP" }, { k: "OIL", name: "oil (turned over)", camp: "BACKDROP" }, { k: "DURATION", name: "long bonds (TLT Geiger)", camp: "BACKDROP" }, { k: "HAVEN", name: "gold (turned over)", camp: "BACKDROP" }, { k: "DEF", name: "defensives (turned over)", camp: "BACKDROP" },
  { k: "SKEW", name: "SKEW (put protection bid)", camp: "FEAR", sensitivity: true }];
const CAMP_WORDS = { STOCKS: "stocks and risk themselves", FEAR: "fear and the tape", GAPS: "gaps between two things", BACKDROP: "the backdrop: rates, the curve, oil, long bonds, gold, defensives" };
const VK = VOTERS.map((v) => v.k); const GEIGER_OF = { SPY: "SPY", QQQ: "QQQ", IWM: "IWM", SMH: "SMH", CREDIT: "HYG", CRYPTO: "BTCUSD", DURATION: "TLT" };
function voterVals(i, o = {}) { const f = o.momOnly ? "mom" : "g"; const g = (s) => (GA[s] && GA[s][i] && GA[s][i][f] != null ? clamp(GA[s][i][f]) : null); const v = {}, src = {};
  for (const [k, s] of Object.entries(GEIGER_OF)) v[k] = g(s);
  const vx = VXA[i]; v.VIX = vx ? clamp(((VIX_COLD + 12) / 2 - vx.vix) / ((VIX_COLD - 12) / 2)) : null; src.vix = vx ? vx.vix : null;
  const tr = TRA[i], t10 = tr ? tr.y10 : TNX[i] ? TNX[i].y10 : null; v.US10Y = t10 != null ? clamp(((TEN_COLD + 3.5) / 2 - t10) / ((TEN_COLD - 3.5) / 2)) : null; src.y10 = t10; src.ratesFrom = tr ? tr.src : TNX[i] ? "chart API ^TNX" : null;
  v.CURVE = tr && tr.y10 != null && tr.y2 != null ? clamp((tr.y10 - tr.y2) / 1.5) : null; src.y2 = tr ? tr.y2 : null; src.curve = tr && tr.y2 != null ? r2(tr.y10 - tr.y2) : null;
  v.OIL = g("CLUSD") != null ? clamp(-g("CLUSD")) : null; v.HAVEN = g("GCUSD") != null ? clamp(-g("GCUSD")) : null;
  v.BREADTH_EW = g("RSP") != null && g("SPY") != null ? clamp(g("RSP") - g("SPY")) : null; v.BREADTH_SC = g("IWM") != null && g("SPY") != null ? clamp(g("IWM") - g("SPY")) : null;
  const v3 = V3A[i]; v.VIX_TERM = vx && v3 && v3.vix3m ? clamp((1 - vx.vix / v3.vix3m) * 4) : null; src.vix3m = v3 ? v3.vix3m : null; src.vix3mFrom = v3 ? v3.src : null;
  const sk = SKA[i]; v.SKEW = o.skew && sk ? clamp((135 - sk.skew) / 25) : null; src.skew = sk ? sk.skew : null;
  const ad = ADA[i]; v.ADLINE = ad ? ad.val : null; src.ad = ad ? { names: ad.n, line: ad.cum } : null;
  const inn = INT[i]; v.TRIN = inn && inn.trin != null ? clamp((1 - inn.trin) * 2) : null; v.B_VOL = inn && inn.av > 0 && inn.dv > 0 ? clamp((inn.av - inn.dv) / (inn.av + inn.dv) * 3) : null; src.tape = inn ? { from: inn.src, row: inn.asof, issues: inn.universe, trin: r3(inn.trin) } : null;
  if (o.tenSession && INT10[i]) { const t = INT10[i]; if (v.TRIN != null && t.trin != null) v.TRIN = clamp((1 - t.trin) * 2); if (v.B_VOL != null && t.av > 0 && t.dv > 0) v.B_VOL = clamp((t.av - t.dv) / (t.av + t.dv) * 3); }
  const rs = ret20(cSPY, i), rr = ret20(cRSP, i); v.CONC = rs != null && rr != null ? clamp((rr - rs) / 0.05) : null;
  const dp = g("XLP"), du = g("XLU"); v.DEF = dp != null && du != null ? clamp(-(dp + du) / 2) : null;
  if (o.defRelative && v.DEF != null && g("SPY") != null) v.DEF = clamp(-((dp + du) / 2 - g("SPY")));
  if (o.sectorFunds) { const xs = SECTOR_FUNDS.map((s) => g(s)).filter((x) => x != null); v.SECTORS = xs.length >= 9 ? clamp(xs.reduce((a, b) => a + b, 0) / xs.length) : null; } else v.SECTORS = null;
  if (o.flip) for (const k of o.flip) if (v[k] != null) v[k] = -v[k];
  v._src = src; return v; }
function heatOf(vals, o = {}) { let num = 0, den = 0; const present = [], absent = []; for (const k of VK) { const w = (o.weights || WTS)[k] ?? 0; if (!w) continue; if (k === "SKEW" && !o.skew) continue; if (o.drop && o.drop.includes(k)) continue; if (vals[k] == null) { if (k !== "SKEW") absent.push(k); continue; } num += vals[k] * w; den += w; present.push(k); } return { heat: den ? num / den : null, w: den, present, absent }; }

/* ---------- the tool as it stands, and the repairs tried ---------- */
const BACKDROP = ["US10Y", "CURVE", "OIL", "DURATION", "HAVEN", "DEF"];   // the six rows that describe the backdrop, not how sold stocks are
const GAPS = ["BREADTH_EW", "BREADTH_SC", "CONC"];
const VARIANTS = {
  base: { label: "the tool as it stands", o: {} },
  fix: { label: "the proposed repair: the six backdrop rows out of the sum, the two tape rows over ten sessions", o: { drop: BACKDROP, tenSession: true } },
  dropBackdrop: { label: "only the six backdrop rows out", o: { drop: BACKDROP } },
  ten: { label: "only the two tape rows over ten sessions", o: { tenSession: true } },
  fixNoGaps: { label: "the repair, and the three gap rows out as well", o: { drop: [...BACKDROP, ...GAPS], tenSession: true } },
  fixMom: { label: "the repair, and the Geiger rows read by their momentum half only", o: { drop: BACKDROP, tenSession: true, momOnly: true } },
  mom: { label: "only the momentum half of the Geiger rows", o: { momOnly: true } },
  flipRates: { label: "the 10-year and long bonds turned over instead of taken out", o: { flip: ["US10Y", "DURATION"] } },
  defRelative: { label: "defensives read against the S&P instead of on their own", o: { defRelative: true } },
  baseSectors: { label: "the tool as it stands, with the sector row read as the eleven funds' own Geigers", o: { sectorFunds: true } },
  baseSkew: { label: "the tool as it stands, with SKEW voting", o: { skew: true } },
  fixSectors: { label: "the repair, with the sector row read as the eleven funds' own Geigers", o: { drop: BACKDROP, tenSession: true, sectorFunds: true } } };
const VAL = {}, SER = {}; for (const [name, V] of Object.entries(VARIANTS)) { const heat = new Array(N).fill(null), w = new Array(N).fill(null), vals = new Array(N).fill(null); for (let i = i0; i < N; i++) { const vv = voterVals(i, V.o); const h = heatOf(vv, V.o); heat[i] = h.heat; w[i] = h.w; vals[i] = vv; } SER[name] = { heat, w }; VAL[name] = vals; }

/* ---------- SPY's own lines: the 200-day and the Lab's three clouds ---------- */
const sma = (arr, n) => { const out = new Array(arr.length).fill(null); let s = 0; for (let i = 0; i < arr.length; i++) { s += arr[i]; if (i >= n) s -= arr[i - n]; if (i >= n - 1) out[i] = s / n; } return out; };
const emaPine = (arr, n) => { const out = new Array(arr.length).fill(null); const k = 2 / (n + 1); let e = null; for (let i = 0; i < arr.length; i++) { if (i === n - 1) { let s = 0; for (let j = 0; j < n; j++) s += arr[j]; e = s / n; } else if (i >= n) e = arr[i] * k + e * (1 - k); out[i] = e; } return out; };
const S200 = sma(cSPY, 200), S50 = sma(cSPY, 50), E21 = emaPine(cSPY, 21), E13 = emaPine(cSPY, 13);
/* Lab rule (INDICATOR_LAB/…/SCINTILLA_Clean_Clouds_V17_Readable.pine, read only): daily closes; the 13–21 cloud is blue when EMA13 ≥ EMA21, the 21–50
   cloud when EMA21 ≥ SMA50, the 50–200 cloud when SMA50 ≥ SMA200, pink otherwise; a flip is confirmed on the daily close. */
const cloudBlue = { c1321: (i) => (E13[i] != null && E21[i] != null ? E13[i] >= E21[i] : null), c2150: (i) => (E21[i] != null && S50[i] != null ? E21[i] >= S50[i] : null), c50200: (i) => (S50[i] != null && S200[i] != null ? S50[i] >= S200[i] : null) };
const fwd = (i, k) => (i + k < N ? cSPY[i + k] / cSPY[i] - 1 : null);
const worstAhead = (i, k) => { if (i + 1 >= N) return null; let m = 0; for (let j = i + 1; j <= Math.min(N - 1, i + k); j++) m = Math.min(m, cSPY[j] / cSPY[i] - 1); return m; };
const rsiD = (i) => (GA.SPY[i] && GA.SPY[i].per && GA.SPY[i].per["1d"] ? GA.SPY[i].per["1d"].rsi : null);
function eventRow(i, extra = {}) { const b = SER.base.heat[i], f = SER.fix.heat[i]; return { date: sessions[i], spy: cSPY[i], heat: r4(b), pct: b == null ? null : rungOf(b).pct, word: b == null ? null : rungOf(b).word, fix: r4(f), fixPct: f == null ? null : rungOf(f).pct, fixWord: f == null ? null : rungOf(f).word, rsi: rsiD(i) == null ? null : +rsiD(i).toFixed(1), f20: r4(fwd(i, 20)), f60: r4(fwd(i, 60)), f120: r4(fwd(i, 120)), f250: r4(fwd(i, 250)), worst60: r4(worstAhead(i, 60)), ...extra }; }
const EVENTS = { loss200: [], c1321: [], c2150: [], c50200: [] };
for (let i = Math.max(i0, 201); i < N; i++) { if (cSPY[i] < S200[i] && cSPY[i - 1] >= S200[i - 1]) { let back = null; for (let j = i + 1; j < N; j++) if (cSPY[j] >= S200[j]) { back = j; break; } EVENTS.loss200.push(eventRow(i, { level: r2(S200[i]), sessionsUnder: back == null ? null : back - i, backDate: back == null ? null : sessions[back] })); }
  for (const k of ["c1321", "c2150", "c50200"]) { const now = cloudBlue[k](i), was = cloudBlue[k](i - 1); if (was === true && now === false) { let back = null; for (let j = i + 1; j < N; j++) if (cloudBlue[k](j) === true) { back = j; break; } EVENTS[k].push(eventRow(i, { sessionsPink: back == null ? null : back - i, backDate: back == null ? null : sessions[back] })); } } }
function stats(rows) { const pos = (k) => { const x = rows.filter((e) => e[k] != null); return x.length ? { up: x.filter((e) => e[k] > 0).length, of: x.length } : null; };
  return { n: rows.length, medHeat: r3(med(rows.map((e) => e.heat))), medFix: r3(med(rows.map((e) => e.fix))), med20: r4(med(rows.map((e) => e.f20))), med60: r4(med(rows.map((e) => e.f60))), med120: r4(med(rows.map((e) => e.f120))), med250: r4(med(rows.map((e) => e.f250))), mean60: r4(mean(rows.map((e) => e.f60))), mean250: r4(mean(rows.map((e) => e.f250))), up20: pos("f20"), up60: pos("f60"), up120: pos("f120"), up250: pos("f250"), medWorst60: r4(med(rows.map((e) => e.worst60))) }; }
function eventStats(rows) { const s9 = rows.filter((e) => e.date >= "2009-01-01"); return { all: stats(rows), since2009: stats(s9), fixWashed: stats(s9.filter((e) => e.fix != null && e.fix <= -0.2)), fixNotWashed: stats(s9.filter((e) => e.fix != null && e.fix > -0.2)), baseWashed: stats(s9.filter((e) => e.heat != null && e.heat <= -0.2)), baseNotWashed: stats(s9.filter((e) => e.heat != null && e.heat > -0.2)) }; }
const EVSTATS = Object.fromEntries(Object.entries(EVENTS).map(([k, rows]) => [k, eventStats(rows)]));
/* the yardstick: every session since 2009 whatever the heat, and the same split by rung */
const A9 = SX["2009-01-02"]; const ALLROWS = []; for (let i = A9; i < N; i++) ALLROWS.push({ date: sessions[i], heat: SER.base.heat[i], fix: SER.fix.heat[i], f20: fwd(i, 20), f60: fwd(i, 60), f120: fwd(i, 120), f250: fwd(i, 250), worst60: worstAhead(i, 60), pct: rungOf(SER.base.heat[i])?.pct, fixPct: rungOf(SER.fix.heat[i])?.pct });
const ANY = { all: stats(ALLROWS), byRung: Object.fromEntries([100, 80, 50, 30, 15].map((p) => [p, stats(ALLROWS.filter((e) => e.pct === p))])), byFixRung: Object.fromEntries([100, 80, 50, 30, 15].map((p) => [p, stats(ALLROWS.filter((e) => e.fixPct === p))])) };
/* Alan's own two readings, for the same yardstick: SPY's daily RSI at or under 40, and SPY within 1% of its 200-day from above */
const ALAN = { rsi40: stats(ALLROWS.filter((e, k) => { const i = A9 + k; const r = rsiD(i), p = rsiD(i - 1); return r != null && p != null && r <= 40 && p > 40; })), rsi40n: null };

/* ---------- the seven dates ---------- */
const SEVEN = [["2026-03-26", "26 Mar 2026"], ["2025-04-04", "4 Apr 2025"], ["2023-10-30", "30 Oct 2023"], ["2022-10-17", "17 Oct 2022"], ["2020-03-17", "17 Mar 2020"], ["2018-12-21", "21 Dec 2018"], ["2009-03-02", "2 Mar 2009"]];
const WHY_ABSENT = { SECTORS: "the blended sector bow tie needs five readings per sector; only one of them (each fund's own Geiger) has a past", CRYPTO: "bitcoin's bars start 5 Oct 2009", CREDIT: "HYG first traded 11 Apr 2007", TRIN: "no stored or rebuildable tape reading that day", B_VOL: "no stored or rebuildable tape reading that day", CURVE: "no 2-year yield that day", VIX_TERM: "no 3-month VIX that day", ADLINE: "fewer than 50 of the tool's candidate names had bars" };
function detail(i, vname = "base") { const V = VARIANTS[vname]; const vals = VAL[vname][i]; const h = heatOf(vals, V.o); const rows = VOTERS.filter((v) => (WTS[v.k] ?? 0) > 0 && !(V.o.drop || []).includes(v.k) && (v.k !== "SKEW" || V.o.skew)).map((v) => ({ k: v.k, name: v.name, camp: v.camp, weight: WTS[v.k], val: r4(vals[v.k]), share: vals[v.k] == null || !h.w ? null : r4(vals[v.k] * WTS[v.k] / h.w), why: vals[v.k] == null ? (WHY_ABSENT[v.k] || "no reading that day") : null }));
  const camps = {}; for (const c of Object.keys(CAMP_WORDS)) { const r = rows.filter((x) => x.camp === c && x.val != null); const w = r.reduce((t, x) => t + x.weight, 0); camps[c] = { words: CAMP_WORDS[c], weight: w, mean: w ? r3(r.reduce((t, x) => t + x.val * x.weight, 0) / w) : null, share: h.w ? r4(r.reduce((t, x) => t + x.val * x.weight, 0) / h.w) : null, n: r.length }; }
  return { date: sessions[i], heat: r4(h.heat), rung: rungOf(h.heat), weight: h.w, present: h.present, absent: h.absent, rows, camps, src: vals._src }; }
const geigerAt = (sym, i) => { const x = GA[sym][i]; return x ? { g: r3(x.g), trend: r3(x.trend), mom: r3(x.mom), rungs: x.n, left: (x.left || []).map((l) => (typeof l === "string" ? l : l.key)), per: x.per ? Object.fromEntries(Object.entries(x.per).map(([k, p]) => [k, { trend: r3(p.trend), mom: r3(p.mom), read: r3(p.read), rsi: p.rsi == null ? null : +p.rsi.toFixed(1), wr: p.wr == null ? null : +p.wr.toFixed(0), lines: p.lines, newest: p.newest, src: p.src }])) : null } : null; };
const variantAt = (i) => Object.fromEntries(Object.keys(VARIANTS).map((v) => [v, { heat: r4(SER[v].heat[i]), pct: rungOf(SER[v].heat[i])?.pct ?? null, word: rungOf(SER[v].heat[i])?.word ?? null, w: SER[v].w[i] }]));
function sevenRow([date, label]) { const i = SX[date]; const win = []; for (let k = -5; k <= 5; k++) { const j = i + k; if (j < 0 || j >= N) continue; const b = SER.base.heat[j], f = SER.fix.heat[j]; win.push({ k, date: sessions[j], spy: cSPY[j], chg: r4(cSPY[j] / cSPY[j - 1] - 1), heat: r4(b), pct: rungOf(b).pct, word: rungOf(b).word, fix: r4(f), fixPct: rungOf(f).pct, fixWord: rungOf(f).word, p200: P200[j] ? +P200[j].pct.toFixed(1) : null, voters: heatOf(VAL.base[j], {}).present.length }); }
  /* the closing low of that slide: the lowest SPY close within 15 sessions either side, and the high of the year before it */
  let lo = i; for (let j = Math.max(0, i - 15); j <= Math.min(N - 1, i + 15); j++) if (cSPY[j] < cSPY[lo]) lo = j; let hi = lo; for (let j = Math.max(0, lo - 252); j <= lo; j++) if (cSPY[j] > cSPY[hi]) hi = j;
  const minBase = win.reduce((a, b) => (b.heat < a.heat ? b : a)), minFix = win.reduce((a, b) => (b.fix < a.fix ? b : a));
  return { date, label, spy: cSPY[i], fromHigh: r4(cSPY[i] / cSPY[hi] - 1), base: detail(i, "base"), fix: detail(i, "fix"), variants: variantAt(i), window: win, minBase, minFix,
    low: { date: sessions[lo], spy: cSPY[lo], sessionsFromDate: lo - i, fromHigh: r4(cSPY[lo] / cSPY[hi] - 1), highDate: sessions[hi], heat: r4(SER.base.heat[lo]), pct: rungOf(SER.base.heat[lo]).pct, word: rungOf(SER.base.heat[lo]).word, fix: r4(SER.fix.heat[lo]), fixPct: rungOf(SER.fix.heat[lo]).pct, fixWord: rungOf(SER.fix.heat[lo]).word },
    after: { f20: r4(fwd(i, 20)), f60: r4(fwd(i, 60)), f120: r4(fwd(i, 120)), f250: r4(fwd(i, 250)) }, vs200: S200[i] ? r4(cSPY[i] / S200[i] - 1) : null, p200: P200[i] ? { pct: +P200[i].pct.toFixed(1), n: P200[i].n } : null,
    geiger: Object.fromEntries(["SPY", "QQQ", "IWM", "SMH", "HYG", "TLT", "XLP", "XLU", "RSP", "CLUSD", "GCUSD", "BTCUSD"].map((s) => [s, geigerAt(s, i)])),
    /* had the absent voters read their coldest or hottest, where would the heat sit */
    bracket: (() => { const h = heatOf(VAL.base[i], {}); const wAbs = h.absent.filter((k) => k !== "SECTORS").reduce((t, k) => t + WTS[k], 0), wSec = WTS.SECTORS; const num = h.heat * h.w; return { absentWeight: wAbs, low: r4((num - wAbs) / (h.w + wAbs)), high: r4((num + wAbs) / (h.w + wAbs)), withSectorsLow: r4((num - wAbs - wSec) / (h.w + wAbs + wSec)), withSectorsHigh: r4((num + wAbs + wSec) / (h.w + wAbs + wSec)) }; })() }; }
const seven = SEVEN.map(sevenRow);
const today = (() => { const i = N - 1; return { date: TODAY, spy: cSPY[i], base: detail(i, "base"), fix: detail(i, "fix"), variants: variantAt(i), vs200: r4(cSPY[i] / S200[i] - 1), p200: P200[i] ? { pct: +P200[i].pct.toFixed(1), n: P200[i].n } : null, geiger: Object.fromEntries(["SPY", "QQQ", "IWM", "SMH", "HYG", "TLT", "XLP", "XLU", "RSP", "CLUSD", "GCUSD", "BTCUSD"].map((s) => [s, geigerAt(s, i)])) }; })();

/* ---------- every real low since 2007, found by rule rather than picked: the lowest SPY close within 60 sessions either side, 10% or more under the high of the year before ---------- */
const LOWS = []; for (let i = Math.max(i0, 252); i < N; i++) { let isLow = true; for (let j = Math.max(0, i - 60); j <= Math.min(N - 1, i + 60); j++) if (cSPY[j] < cSPY[i]) { isLow = false; break; } if (!isLow) continue; let hi = i; for (let j = i - 252; j <= i; j++) if (cSPY[j] > cSPY[hi]) hi = j; const dd = cSPY[i] / cSPY[hi] - 1; if (dd > -0.10) continue;
  const row = { date: sessions[i], i, spy: cSPY[i], fromHigh: r4(dd), highDate: sessions[hi], settled: i + 60 < N, f60: r4(fwd(i, 60)), f250: r4(fwd(i, 250)), p200: P200[i] ? +P200[i].pct.toFixed(1) : null, vix: VXA[i] ? VXA[i].vix : null, voters: heatOf(VAL.base[i], {}).present.length };
  for (const v of Object.keys(VARIANTS)) { const h = SER[v].heat[i]; let mn = h; for (let j = Math.max(i0, i - 5); j <= Math.min(N - 1, i + 5); j++) if (SER[v].heat[j] != null && SER[v].heat[j] < mn) mn = SER[v].heat[j]; row[v] = { heat: r4(h), pct: rungOf(h).pct, word: rungOf(h).word, min5: r4(mn), min5pct: rungOf(mn).pct }; } LOWS.push(row); }

/* ---------- which rows read cold when stocks are at a low, and which do not: each voter at the seven dates and at the rule-found lows ---------- */
const evidence = VOTERS.filter((v) => (WTS[v.k] ?? 0) > 0 && v.k !== "SECTORS").map((v) => { const at = (idx) => idx.map((i) => VAL.baseSkew[i][v.k]).filter((x) => x != null); const s7 = at(SEVEN.map(([d]) => SX[d])), lw = at(LOWS.map((l) => l.i));
  let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, all = []; for (let i = i0; i < N; i++) { const x = VAL.baseSkew[i][v.k], y = GA.SPY[i] ? GA.SPY[i].g : null; if (x == null || y == null) continue; n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; all.push(x); }
  const corr = n > 30 ? (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy)) : null;
  return { k: v.k, name: v.name, camp: v.camp, weight: WTS[v.k], sensitivity: !!v.sensitivity, atSeven: { n: s7.length, mean: r3(mean(s7)), notCold: s7.filter((x) => x >= 0).length }, atLows: { n: lw.length, mean: r3(mean(lw)), notCold: lw.filter((x) => x >= 0).length }, allDays: { n, mean: r3(mean(all)) }, withSpyGeiger: r3(corr) }; });

/* ---------- the rungs through time: how often, the stretches of 100% and 80%, and when each was last said ---------- */
function ladderHistory(vname, from = "2009-01-02", th = TH) { const H = SER[vname].heat; const a = Math.max(i0, SX[from] ?? i0); const count = { 100: 0, 80: 0, 50: 0, 30: 0, 15: 0 }; let n = 0, mn = { h: 9 }, mx = { h: -9 }; const last = {}, first = {}; const xs = [];
  for (let i = a; i < N; i++) { if (H[i] == null) continue; const p = rungOf(H[i], th).pct; count[p]++; n++; last[p] = sessions[i]; first[p] ??= sessions[i]; xs.push(H[i]); if (H[i] < mn.h) mn = { h: H[i], date: sessions[i] }; if (H[i] > mx.h) mx = { h: H[i], date: sessions[i] }; }
  xs.sort((p, q) => p - q); const pc = (q) => r3(xs[Math.min(xs.length - 1, Math.floor(q * xs.length))]);
  const stretches = (want) => { const out = []; let s = null; for (let i = a; i < N; i++) { const p = H[i] == null ? null : rungOf(H[i], th).pct; const on = want === 80 ? (p === 80 || p === 100) : p === want; if (on && s == null) s = i; if ((!on || i === N - 1) && s != null) { const e = on ? i : i - 1; let lo = s; for (let j = s; j <= Math.min(N - 1, s + 250); j++) if (cSPY[j] < cSPY[lo]) lo = j; let mh = s; for (let j = s; j <= e; j++) if (H[j] < H[mh]) mh = j;
        out.push({ from: sessions[s], to: sessions[e], sessions: e - s + 1, spyAtStart: cSPY[s], lowestHeat: r4(H[mh]), lowestHeatDate: sessions[mh], furtherFall: r4(cSPY[lo] / cSPY[s] - 1), lowDate: sessions[lo], f60: r4(fwd(s, 60)), f120: r4(fwd(s, 120)), f250: r4(fwd(s, 250)) }); s = null; } } return out; };
  /* stretches that sit within 10 sessions of each other are one episode */
  const merge = (S) => { const out = []; for (const x of S) { const p = out[out.length - 1]; if (p && SX[x.from] - SX[p.to] <= 10) { p.to = x.to; p.sessions += x.sessions; if (x.lowestHeat < p.lowestHeat) { p.lowestHeat = x.lowestHeat; p.lowestHeatDate = x.lowestHeatDate; } p.parts++; } else out.push({ ...x, parts: 1 }); } return out; };
  const at100 = merge(stretches(100)), at80 = merge(stretches(80));
  return { from: sessions[a], to: TODAY, sessions: n, count, share: Object.fromEntries(Object.entries(count).map(([k, v]) => [k, r4(v / n)])), last, first, min: { heat: r4(mn.h), date: mn.date }, max: { heat: r4(mx.h), date: mx.date }, pctiles: { p01: pc(0.01), p05: pc(0.05), p10: pc(0.1), p25: pc(0.25), p50: pc(0.5), p75: pc(0.75), p90: pc(0.9), p95: pc(0.95), p99: pc(0.99) }, at100, at80plus: at80 }; }
const HIST = Object.fromEntries(Object.keys(VARIANTS).map((v) => [v, ladderHistory(v)])); const HIST2007 = Object.fromEntries(["base", "fix", "baseSectors", "fixSectors"].map((v) => [v, ladderHistory(v, FROM)]));
/* what moving only the "deeply washed out" line would do — the ladder's other lines left where they are */
const deepLines = [-0.5, -0.45, -0.4, -0.35, -0.3].map((line) => { const one = (v) => { const h = ladderHistory(v, "2009-01-02", { ...TH, deepCold: line }); const eps = h.at100; return { sessions: h.count[100], share: h.share[100], episodes: eps.length, last: h.last[100] ?? null, sevenAt100: SEVEN.filter(([d]) => SER[v].heat[SX[d]] <= line).length, lowsAt100: LOWS.filter((l) => l.date >= "2009-01-01" && l[v].min5 <= line).length + " of " + LOWS.filter((l) => l.date >= "2009-01-01").length, medianFurtherFall: r4(med(eps.map((e) => e.furtherFall))), worstFurtherFall: r4(Math.min(0, ...eps.map((e) => e.furtherFall))), medianF250: r4(med(eps.map((e) => e.f250))) }; }; return { line, base: one("base"), fix: one("fix") }; });

/* ---------- one scorecard per variant: does it read the lows, how often does it say 100%, what does it do to today and to the hot side ---------- */
const spearman = (xs, ys) => { const rk = (a) => { const o = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(a.length); o.forEach(([, i], k) => (r[i] = k + 1)); return r; }; const rx = rk(xs), ry = rk(ys), n = xs.length; let d = 0; for (let i = 0; i < n; i++) d += (rx[i] - ry[i]) ** 2; return n > 2 ? 1 - 6 * d / (n * (n * n - 1)) : null; };
const crossings = (H, line, a = A9) => { let n = 0, c = 0; for (let i = a + 1; i < N; i++) { if (H[i] == null || H[i - 1] == null) continue; n++; if ((H[i] <= line) !== (H[i - 1] <= line)) c++; } return +(c / (n / 252)).toFixed(1); };
const scorecard = Object.fromEntries(Object.keys(VARIANTS).map((v) => { const H = SER[v].heat, h = HIST[v]; const L9 = LOWS.filter((l) => l.date >= "2009-01-01"); let ch = 0, n = 0; for (let i = A9 + 1; i < N; i++) { n++; if (rungOf(H[i]).pct !== rungOf(H[i - 1]).pct) ch++; }
  return [v, { label: VARIANTS[v].label, sevenOnTheDay100: SEVEN.filter(([d]) => H[SX[d]] <= TH.deepCold).length, sevenOnTheDay80plus: SEVEN.filter(([d]) => H[SX[d]] <= TH.cold).length, sevenAtTheLow100: seven.filter((s) => H[SX[s.low.date]] <= TH.deepCold).length, lows100: L9.filter((l) => l[v].min5 <= TH.deepCold).length, lows80plus: L9.filter((l) => l[v].min5 <= TH.cold).length, lowsOf: L9.length,
    sessions100: h.count[100], episodes100: h.at100.length, medianFurtherFall: r4(med(h.at100.map((e) => e.furtherFall))), worstFurtherFall: h.at100.length ? r4(Math.min(...h.at100.map((e) => e.furtherFall))) : null, last100: h.last[100] ?? null, last80: h.last[80] ?? null, share15: h.share[15], share30: h.share[30], share50: h.share[50], share80: h.share[80], share100: h.share[100],
    today: r4(H[N - 1]), todayPct: rungOf(H[N - 1]).pct, rungChangesAYear: +(ch / (n / 252)).toFixed(1), median: h.pctiles.p50,
    /* does a deeper, more frightened low read colder? rank agreement of the heat at the 14 rule-found lows with how far SPY had fallen and with the VIX that day (+1 = perfectly) */
    ranksWithDepth: r3(spearman(LOWS.map((l) => l[v].heat), LOWS.map((l) => l.fromHigh))), ranksWithVix: r3(spearman(LOWS.map((l) => l[v].heat), LOWS.map((l) => -l.vix))) }]; }));
const lineCrossings = Object.fromEntries(["base", "fix"].map((v) => [v, Object.fromEntries(Object.entries(TH).map(([k, line]) => [k, crossings(SER[v].heat, line)]))]));
const byYear = {}; for (let i = i0; i < N; i++) { const y = sessions[i].slice(0, 4); const o = (byYear[y] ||= { n: 0, base: { 100: 0, 80: 0, 50: 0, 30: 0, 15: 0 }, fix: { 100: 0, 80: 0, 50: 0, 30: 0, 15: 0 }, baseSum: 0, fixSum: 0, spyFirst: cSPY[i], spyLast: null }); o.n++; o.base[rungOf(SER.base.heat[i]).pct]++; o.fix[rungOf(SER.fix.heat[i]).pct]++; o.baseSum += LADDER_PCT(SER.base.heat[i]); o.fixSum += LADDER_PCT(SER.fix.heat[i]); o.spyLast = cSPY[i]; }
for (const o of Object.values(byYear)) { o.baseAvgInvested = +(o.baseSum / o.n).toFixed(1); o.fixAvgInvested = +(o.fixSum / o.n).toFixed(1); o.spy = r4(o.spyLast / o.spyFirst - 1); delete o.baseSum; delete o.fixSum; delete o.spyFirst; delete o.spyLast; }

/* ---------- tonight on the live tool itself (scripts/hm1-shots.mjs --live-only read it off the page's own code): the page's heat, and the same rows with the repair applied ---------- */
const todayLive = (() => { const f = path.join(OUT, "live.json"); if (!fs.existsSync(f)) return null; const L = JSON.parse(fs.readFileSync(f, "utf8")); const rep = Object.fromEntries(today.base.rows.map((r) => [r.k, r.val]));
  const rows = L.rows.map((r) => ({ key: r.key, live: r.val, w: r.w, replay: rep[r.key] ?? null, diff: rep[r.key] == null ? null : r4(rep[r.key] - r.val), source: r.sub }));
  const t10 = INT10[N - 1]; const ten = { TRIN: t10 && t10.trin != null ? clamp((1 - t10.trin) * 2) : null, B_VOL: t10 && t10.av > 0 && t10.dv > 0 ? clamp((t10.av - t10.dv) / (t10.av + t10.dv) * 3) : null };
  let num = 0, den = 0, numB = 0, denB = 0; for (const r of L.rows) { numB += r.val * r.w; denB += r.w; if (BACKDROP.includes(r.key)) continue; const v = ten[r.key] != null ? ten[r.key] : r.val; num += v * r.w; den += r.w; }
  const same = rows.filter((r) => r.diff != null && Math.abs(r.diff) < 0.0015).length;
  return { read_utc: L.read_utc, source: L.source || null, deployed: L.deployed || null, heat: r4(L.heat), rung: rungOf(L.heat), voters: L.rows.length, weight: denB, weightsAreDefaults: L.weightsAreDefaults, notVoting: L.notVoting.filter((v) => v.weight > 0), fix: { heat: r4(num / den), rung: rungOf(num / den), weight: den, voters: L.rows.filter((r) => !BACKDROP.includes(r.key)).length, tenSession: { TRIN: r3(ten.TRIN), B_VOL: r3(ten.B_VOL) } },
    replayCheck: { compared: rows.filter((r) => r.diff != null).length, sameToThreeDecimals: same, differ: rows.filter((r) => r.diff != null && Math.abs(r.diff) >= 0.0015).map((r) => ({ key: r.key, live: r.live, replay: r.replay, diff: r.diff, source: r.source })), notInReplay: rows.filter((r) => r.replay == null).map((r) => ({ key: r.key, live: r.live, w: r.w })), heatOnSameVoters: r4(rows.filter((r) => r.replay != null).reduce((t, r) => t + r.live * r.w, 0) / rows.filter((r) => r.replay != null).reduce((t, r) => t + r.w, 0)), replayHeat: today.base.heat }, rows }; })();

/* ---------- the check against HEAT1's stored replay (same formulas; three rungs, the one-day advance/decline, internals on their stamped dates) ---------- */
let heat1Check = null; try { const H1 = JSON.parse(fs.readFileSync(path.join(ROOT, "study/heat1/data/heat1.json"), "utf8")); const keys = ["SPY", "QQQ", "IWM", "SMH", "VIX", "US10Y", "OIL", "CRYPTO", "BREADTH_EW", "BREADTH_SC", "VIX_TERM", "CURVE", "CONC", "CREDIT", "DURATION", "HAVEN", "DEF", "ADLINE", "TRIN", "B_VOL"]; const acc = Object.fromEntries(keys.map((k) => [k, { n: 0, sum: 0, max: 0 }]));
  let hn = 0, hs = 0, hm = 0, bias = 0; for (const s of H1.series) { const i = SX[s.date]; if (i == null) continue; const v = VAL.base[i]; for (const k of keys) { if (s.v[k] == null || v[k] == null) continue; const d = Math.abs(s.v[k] - v[k]); acc[k].n++; acc[k].sum += d; if (d > acc[k].max) acc[k].max = d; } if (s.heat != null && SER.base.heat[i] != null) { const d = SER.base.heat[i] - s.heat; hn++; hs += Math.abs(d); bias += d; if (Math.abs(d) > hm) hm = Math.abs(d); } }
  heat1Check = { sessions: H1.series.length, from: H1.from, to: H1.to, heat: { n: hn, meanAbsDiff: r4(hs / hn), maxAbsDiff: r4(hm), meanDiff: r4(bias / hn) }, voters: Object.fromEntries(keys.map((k) => [k, { n: acc[k].n, meanAbsDiff: acc[k].n ? r4(acc[k].sum / acc[k].n) : null, maxAbsDiff: r4(acc[k].max) }])) }; } catch (e) { heat1Check = { error: String(e.message) }; }

/* ---------- coverage: which voters could be read, and from when ---------- */
const coverage = Object.fromEntries(VOTERS.filter((v) => WTS[v.k] > 0 && !v.sensitivity).map((v) => { let first = null, days = 0; for (let i = i0; i < N; i++) { const x = VAL.base[i][v.k]; if (x != null) { days++; if (!first) first = sessions[i]; } } return [v.k, { name: v.name, camp: v.camp, weight: WTS[v.k], from: first, days, of: N - i0, why: first ? null : WHY_ABSENT[v.k] || null }]; }));
const rungCoverage = Object.fromEntries(Object.keys(SYM).map((s) => { const firstFull = (() => { for (let i = i0; i < N; i++) if (GA[s][i] && GA[s][i].n === (STAGED.includes(s) ? 3 : 7)) return sessions[i]; return null; })(); let full = 0, any = 0; for (let i = i0; i < N; i++) if (GA[s][i]) { any++; if (GA[s][i].n === (STAGED.includes(s) ? 3 : 7)) full++; } return [s, { rungsWanted: STAGED.includes(s) ? 3 : 7, firstAllRungs: firstFull, sessionsAllRungs: full, sessionsAnyReading: any }]; }));

/* ---------- write ---------- */
const series = []; for (let i = i0; i < N; i++) series.push([sessions[i], cSPY[i], r4(SER.base.heat[i]), r4(SER.fix.heat[i]), S200[i] == null ? null : +S200[i].toFixed(3), P200[i] ? +P200[i].pct.toFixed(1) : null, SER.base.w[i], cloudBlue.c1321(i) ? 1 : 0, cloudBlue.c2150(i) ? 1 : 0, cloudBlue.c50200(i) ? 1 : 0, r3(SER.baseSectors.heat[i])]);
const out = { built_utc: new Date().toISOString(), from: FROM, to: TODAY, weights: Object.fromEntries(VOTERS.map((v) => [v.k, WTS[v.k]])), weightTotal: VOTERS.filter((v) => !v.sensitivity).reduce((t, v) => t + (WTS[v.k] || 0), 0), ladder: LADDER, thresholds: TH, anchors: { vixHot: 12, vixCold: VIX_COLD, tenHot: 3.5, tenCold: TEN_COLD },
  voters: VOTERS, campWords: CAMP_WORDS, variants: Object.fromEntries(Object.entries(VARIANTS).map(([k, v]) => [k, { label: v.label, ...v.o }])), backdrop: BACKDROP, gaps: GAPS, whyAbsent: WHY_ABSENT,
  inputs: { candidates: CANDS.length, candidatesListed: UNI.candidates.length, servedCompanies: ALLSERVED.length, servedRead: SERVED.read_utc, internalsRows: intern.length, internalsDescribeFrom: TABLE_FROM, internalsNewWriter: NEW_WRITER, tapeRebuiltBefore: VOLS ? TABLE_FROM : null, treasuryTableFrom: treas[0]?.date, treasuryFmp: { rows: treasOld.length, from: treasOld[0]?.date ?? null, to: treasOld.at(-1)?.date ?? null }, vix3mTableFrom: vixT.find((r) => r.vix3m != null)?.date, vix3mFmp: { rows: vix3mOld.length, from: vix3mOld[0]?.date ?? null }, vixFrom: vixT[0]?.date, skewFrom: vixT.find((r) => r.skew != null)?.date,
    bars: Object.fromEntries(Object.keys(SYM).map((s) => [s, { n: SYM[s].bars["1d"].dn.length, from: isoDn(SYM[s].bars["1d"].dn[0]), to: isoDn(SYM[s].bars["1d"].dn.at(-1)), rungs: Object.keys(SYM[s].source) }])) },
  geigerCheck, mainCheck, internalsCheck, heat1Check, coverage, rungCoverage, seven, today, todayLive, lows: LOWS.map(({ i, ...l }) => l), evidence, scorecard, lineCrossings, byYear, history: HIST, history2007: HIST2007, deepLines, events: EVENTS, eventStats: EVSTATS, anySession: ANY, alan: ALAN,
  seriesCols: ["date", "spy", "heat", "fix", "sma200", "pctOver200", "weight", "cloud1321", "cloud2150", "cloud50200", "heatWithSectorFunds"], series };
fs.writeFileSync(path.join(OUT, "hm1.json"), JSON.stringify(out));
const line = (s) => `${s.label.padEnd(12)} SPY ${String(s.spy).padStart(7)} ${String((s.fromHigh * 100).toFixed(1)).padStart(6)}%  base ${String(s.base.heat).padStart(7)} ${String(s.base.rung.pct).padStart(3)}% (${s.base.present.length} voters, w ${s.base.weight})  fix ${String(s.fix.heat).padStart(7)} ${String(s.fix.rung.pct).padStart(3)}%  | low ${s.low.date} ${s.low.fromHigh} base ${s.low.heat} fix ${s.low.fix} | absent ${s.base.absent.join(",")}`;
console.log(seven.map(line).join("\n")); console.log("today", TODAY, JSON.stringify(Object.fromEntries(Object.entries(today.variants).map(([k, v]) => [k, v.heat + " " + v.pct + "%"]))));
console.log("geiger check", JSON.stringify({ ...geigerCheck, rows: undefined })); console.log("internals check", JSON.stringify(internalsCheck)); console.log("heat1 check", JSON.stringify(heat1Check && heat1Check.heat));
for (const v of ["base", "baseSectors", "baseSkew", "fix"]) console.log("history", v, JSON.stringify({ count: HIST[v].count, last: HIST[v].last, min: HIST[v].min, max: HIST[v].max, pctiles: HIST[v].pctiles, at100: HIST[v].at100.length, at80plus: HIST[v].at80plus.length }));
console.log("events", Object.entries(EVENTS).map(([k, v]) => k + " " + v.length).join(" · "));
console.log("today live", JSON.stringify(todayLive && { heat: todayLive.heat, pct: todayLive.rung.pct, fix: todayLive.fix.heat, fixPct: todayLive.fix.rung.pct, same: todayLive.replayCheck.sameToThreeDecimals + " of " + todayLive.replayCheck.compared, differ: todayLive.replayCheck.differ.map((d) => d.key + " " + d.diff) }));
console.log("scorecard"); for (const [k, c] of Object.entries(scorecard)) console.log(" ", k.padEnd(13), JSON.stringify({ seven100: c.sevenOnTheDay100, sevenLow100: c.sevenAtTheLow100, lows100: c.lows100 + "/" + c.lowsOf, lows80: c.lows80plus, s100: c.sessions100, ep: c.episodes100, medFall: c.medianFurtherFall, worstFall: c.worstFurtherFall, today: c.today + " " + c.todayPct + "%", sh15: c.share15, sh30: c.share30, chg: c.rungChangesAYear, depth: c.ranksWithDepth, vix: c.ranksWithVix }));
console.log("line crossings a year", JSON.stringify(lineCrossings)); console.log("main check", JSON.stringify(mainCheck), "deployed", JSON.stringify(todayLive && todayLive.deployed));
