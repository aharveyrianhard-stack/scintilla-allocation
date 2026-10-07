/* DS1 (7 Oct 2026) — the deployment system, measured. Reads the cache folder (scripts/dm2-pull.mjs + scripts/ds1-pull.mjs), writes
   study/ds1/data/ds1.json (everything the study page shows) and study/ds1/data/ds1-live.json (the compact model the tool reads).
     node scripts/ds1-build.mjs <cacheDir>
   No key, no table, no network: it only reads the cache folder.

   THE OUTCOME every part is measured against: the 50/50 blend of SPY and QQQ, 20 and 60 sessions on (median, share of times higher).

   THE KEEP RULE — written here before any number was looked at, and applied by the code below, not by hand.
   A part is fitted on the evenings from 10 Mar 2009 to the end of 2017 (2008 is replayed, never designed around — DM2) and replayed on
   2018 → 2026, on what the parts kept ahead of it left unexplained. The third of unseen evenings it voted for most is set against the
   third it voted against most:
     at 20 sessions it passes with a gap of 0.5 point of median return AND 3 points of share higher AND the right way in more than half the years;
     at 60 sessions it passes with 1.0 point of median AND 3 points of share AND more than half the years (DM2's bar).
   It EARNS A VOTE when it passes at either horizon, does not point the wrong way at the other, and its gap at the passing horizon is not
   negative in any of three other fits (fitted to 2015, fitted to 2019, and fitted to 2017 with 2008 left in). Otherwise it is a LIGHT:
   shown with what it would add, never added. Parts are tried in the order of the brief: the index readings, the VIX, breadth, credit,
   the leaders. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import * as E from "../study/ds1/engine.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.argv[2]; if (!CACHE || !fs.existsSync(path.join(CACHE, "SPY_D.json"))) { console.error("usage: node scripts/ds1-build.mjs <cacheDir>"); process.exit(2); }
const J = (f) => JSON.parse(fs.readFileSync(f, "utf8")), iso = (t) => new Date(t).toISOString().slice(0, 10), log = (...a) => console.error(...a);
const r1 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(1)), r2 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(2)), r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3)), r5 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(5));
const fin = (a) => a.filter((v) => v != null && isFinite(v));
const med = (a) => { const x = fin(a).sort((p, q) => p - q); return x.length ? (x.length % 2 ? x[x.length >> 1] : (x[(x.length >> 1) - 1] + x[x.length >> 1]) / 2) : null; };
const mean = (a) => { const x = fin(a); return x.length ? x.reduce((p, q) => p + q, 0) / x.length : null; };
const sd = (a) => { const x = fin(a), m = mean(x); return x.length ? Math.sqrt(mean(x.map((v) => (v - m) ** 2))) : null; };
const pctl = (a, q) => { const s = fin(a).sort((p, r) => p - r); if (!s.length) return null; const k = ((s.length - 1) * q) / 100, lo = Math.floor(k), hi = Math.ceil(k); return s[lo] + (s[hi] - s[lo]) * (k - lo); };
const shareUp = (a) => { const x = fin(a); return x.length ? x.filter((v) => v > 0).length / x.length : null; };
const corr = (a, b) => { const p = []; for (let i = 0; i < a.length; i++) if (a[i] != null && b[i] != null) p.push([a[i], b[i]]); if (p.length < 20) return null; const ma = mean(p.map((x) => x[0])), mb = mean(p.map((x) => x[1])); let s = 0, sa = 0, sb = 0; for (const [x, y] of p) { s += (x - ma) * (y - mb); sa += (x - ma) ** 2; sb += (y - mb) ** 2; } return s / Math.sqrt(sa * sb); };

/* ---------- the series, on SPY's sessions ---------- */
const D = (s) => J(path.join(CACHE, `${s}_D.json`)).series.filter((b) => b.c != null);
const spyBars = D("SPY"), dates = spyBars.map((b) => iso(b.t)), N = dates.length, LAST = N - 1, ix = Object.fromEntries(dates.map((d, i) => [d, i]));
function onClock(s) { if (!fs.existsSync(path.join(CACHE, `${s}_D.json`))) return null; const m = new Map(D(s).map((b) => [iso(b.t), b])); let cur = null; const c = [], h = [], l = []; for (const d of dates) { const b = m.get(d); if (b) { cur = b.c; c.push(b.c); h.push(Math.max(b.h ?? b.c, b.c)); l.push(Math.min(b.l ?? b.c, b.c)); } else { c.push(cur); h.push(cur); l.push(cur); } } return { c, h, l }; }
const bars = {}; for (const s of E.ALL_SYMBOLS) bars[s] = onClock(s);
/* the VIX's close: the vix_term table where it has one (DM2), the chart API's bar otherwise; the session's high is the bar's */
{ const t = new Map(J(path.join(CACHE, "data/vix.json")).filter((r) => r.vix != null).map((r) => [r.date, +r.vix])); for (let i = 0; i < N; i++) if (t.has(dates[i])) { bars.VIX.c[i] = t.get(dates[i]); bars.VIX.h[i] = Math.max(bars.VIX.h[i] ?? 0, bars.VIX.c[i]); bars.VIX.l[i] = Math.min(bars.VIX.l[i] ?? 1e9, bars.VIX.c[i]); } }
const hygF = J(path.join(CACHE, "data/hyg_adjusted_fmp.json")); const hygTR = (() => { const m = new Map(hygF.adjusted.rows.map((r) => [r[0], r[1]])); let cur = null; return dates.map((d) => (m.has(d) ? (cur = m.get(d)) : cur)); })();
const S = { dates, bars }; const RD = E.allReadings(S, hygTR), X = RD.X, IND = RD.ind;
log("series", N, dates[0], dates[LAST], "· names", E.NAMES.map((s) => s + ":" + (bars[s] ? dates[bars[s].c.findIndex((v) => v != null)] : "none")).join(" "));

/* ---------- the outcome: the 50/50 blend of SPY and QQQ ---------- */
const spy = bars.SPY.c, qqq = bars.QQQ.c; const blendPath = (i, k) => (i + k > LAST || spy[i] == null || qqq[i] == null ? null : 0.5 * (spy[i + k] / spy[i]) + 0.5 * (qqq[i + k] / qqq[i]));
const fwd = (h) => dates.map((_, i) => { const p = blendPath(i, h); return p == null ? null : p - 1; }), dipOf = (h) => dates.map((_, i) => { if (i + h > LAST) return null; let m = 0; for (let k = 1; k <= h; k++) { const p = blendPath(i, k) - 1; if (p < m) m = p; } return m; });
const Y = { r20: fwd(20), r60: fwd(60), dip20: dipOf(20), dip60: dipOf(60) }, spy20 = dates.map((_, i) => (i + 20 > LAST ? null : spy[i + 20] / spy[i] - 1)), spy60 = dates.map((_, i) => (i + 60 > LAST ? null : spy[i + 60] / spy[i] - 1));
const dayRet = dates.map((_, i) => (i === 0 ? null : 0.5 * (spy[i] / spy[i - 1] - 1) + 0.5 * (qqq[i] / qqq[i - 1] - 1)));

/* ---------- the additive fit: every part a curve on its own place, fitted together (three rounds, each on what the others left) ---------- */
const FBW = 10, TG = ["m20", "p20", "m60", "p60"], CUR = { m20: "gm20", p20: "gp20", m60: "gm60", p60: "gp60" };
function kernelCurve(us, res, useMedian) { const n = us.length, w = new Float64Array(n), out = []; const ordr = useMedian ? [...Array(n).keys()].sort((a, b) => res[a] - res[b]) : null;
  for (const g of E.FGRID) { let sw = 0, sv = 0; for (let q = 0; q < n; q++) { const d = (us[q] - g) / FBW, v = Math.exp(-0.5 * d * d); w[q] = v; sw += v; sv += v * res[q]; }
    if (!useMedian) { out.push(sw > 0 ? sv / sw : 0); continue; } let acc = 0, val = 0; for (const q of ordr) { acc += w[q]; if (acc >= sw / 2) { val = res[q]; break; } } out.push(val); } return out; }
function baselineOf(rows) { return { med20: med(rows.map((i) => Y.r20[i])), share20: shareUp(rows.map((i) => Y.r20[i])), med60: med(rows.map((i) => Y.r60[i])), share60: shareUp(rows.map((i) => Y.r60[i])), dip20: med(rows.map((i) => Y.dip20[i])), dip60: med(rows.map((i) => Y.dip60[i])), n: rows.length }; }
const yOf = (i, t, B) => { const r = t.endsWith("20") ? Y.r20[i] : Y.r60[i]; if (r == null) return null; return t[0] === "m" ? r - (t.endsWith("20") ? B.med20 : B.med60) : (r > 0 ? 1 : 0) - (t.endsWith("20") ? B.share20 : B.share60); };
function fitAdditive(rows, keys, B = baselineOf(rows), hz = null) {   // hz = { key: [20] | [60] | [20, 60] }: a part is fitted, and votes, only at the horizons it proved at (null = both)
  const n = rows.length, y = Object.fromEntries(TG.map((t) => [t, rows.map((i) => yOf(i, t, B))]));
  const P = keys.map((key) => { const vals = rows.map((i) => X[key][i]), present = fin(vals).sort((a, b) => a - b), q = []; for (let k = 0; k <= 100; k++) q.push(+pctl(present, k).toFixed(6));
    return { key, q, us: vals.map((v) => (v == null || !isFinite(v) ? null : E.placeOf(q, v))), evenings: present.length, gm20: E.FGRID.map(() => 0), gp20: E.FGRID.map(() => 0), gm60: E.FGRID.map(() => 0), gp60: E.FGRID.map(() => 0), fit: Object.fromEntries(TG.map((t) => [t, new Float64Array(n)])) }; });
  for (let round = 0; round < 3; round++) for (const p of P) for (const t of TG) { if (hz && hz[p.key] && !hz[p.key].includes(+t.slice(1))) continue; const ks = []; for (let k = 0; k < n; k++) if (p.us[k] != null && y[t][k] != null) ks.push(k);
    const us = ks.map((k) => p.us[k]), res = ks.map((k) => { let s = y[t][k]; for (const o of P) if (o !== p) s -= o.fit[t][k]; return s; });
    let c = kernelCurve(us, res, t[0] === "m"); const cm = mean(us.map((u) => E.curveAt(c, u))) || 0; c = c.map((v) => v - cm); p[CUR[t]] = c; p.fit[t].fill(0); for (const k of ks) p.fit[t][k] = E.curveAt(c, p.us[k]); }
  /* the scale: the spread of each summed curve over the fitted evenings; a typical evening reads 50; the 2.5th–97.5th percentile spans 0–100 */
  const tot = Object.fromEntries(TG.map((t) => [t, Array.from({ length: n }, (_, k) => P.reduce((a, p) => a + p.fit[t][k], 0))]));
  const scale = { sM20: sd(tot.m20) || 1, sP20: sd(tot.p20) || 1, sM60: sd(tot.m60) || 1, sP60: sd(tot.p60) || 1 };
  const votes = Array.from({ length: n }, (_, k) => (tot.m20[k] / scale.sM20 + tot.p20[k] / scale.sP20 + tot.m60[k] / scale.sM60 + tot.p60[k] / scale.sP60) / 4);
  scale.centre = med(votes) || 0; const span = (pctl(votes, 97.5) - pctl(votes, 2.5)) || 1; scale.gain = 100 / span;
  return { keys, B, scale, parts: P.map((p) => ({ key: p.key, q: p.q, evenings: p.evenings, gm20: p.gm20.map(r5), gp20: p.gp20.map(r5), gm60: p.gm60.map(r5), gp60: p.gp60.map(r5) })) }; }
const fittedAt = (M, i, t) => { let s = 0; for (const p of M.parts) { const z = X[p.key][i]; if (z == null) return null; s += E.curveAt(p[CUR[t]], E.placeOf(p.q, z)); } return s; };
const readingAt = (M, i) => { const inp = E.inputsAt(X, i); for (const p of M.parts) if (inp[p.key] == null) return null; return E.readSystem(inp, { parts: M.parts.map((p) => ({ ...p, vote: true })), scale: M.scale }); };

/* ---------- the evenings ---------- */
const FROM = ix["2009-03-10"], rowsBetween = (a, b, lastOutcome = null) => { const out = []; const end = lastOutcome != null ? lastOutcome : LAST; for (let i = a; i <= Math.min(b, LAST); i++) { if (i + 60 > end) break; out.push(i); } return out; };
const lastOf = (year) => { let k = -1; for (let i = 0; i < N; i++) if (dates[i] <= year + "-12-31") k = i; return k; }, firstOf = (year) => dates.findIndex((d) => d >= year + "-01-01");
const fitRows = (toYear, from = FROM) => rowsBetween(from, lastOf(toYear), lastOf(toYear)), testRows = (fromYear) => { const out = []; for (let i = firstOf(fromYear); i + 20 <= LAST; i++) out.push(i); return out; };
const ALLROWS = rowsBetween(FROM, LAST);

/* ---------- the out-of-sample test of one part, on what the parts ahead of it left unexplained ---------- */
function testPart(baseKeys, cand, fRows, tRows) {
  const B = baselineOf(fRows), A = baseKeys.length ? fitAdditive(fRows, baseKeys, B) : null, M = fitAdditive(fRows, [...baseKeys, cand], B), cp = M.parts.find((p) => p.key === cand), out = {};
  for (const H of [20, 60]) { const tm = "m" + H, tp = "p" + H, sM = sd(fRows.map((i) => yOf(i, tm, B))) || 1, sP = sd(fRows.map((i) => yOf(i, tp, B))) || 1, rows = [];
    for (const i of tRows) { const ym = yOf(i, tm, B), yp = yOf(i, tp, B), z = X[cand][i]; if (ym == null || z == null) continue; let bm = 0, bp = 0; if (A) { bm = fittedAt(A, i, tm); bp = fittedAt(A, i, tp); if (bm == null) continue; }
      const u = E.placeOf(cp.q, z); rows.push({ i, y: dates[i].slice(0, 4), rm: ym - bm, rp: yp - bp, v: E.curveAt(cp[CUR[tm]], u) / sM + E.curveAt(cp[CUR[tp]], u) / sP }); }
    const vs = rows.map((r) => r.v), hi = pctl(vs, 200 / 3), lo = pctl(vs, 100 / 3);
    if (!rows.length || !(hi - lo > 1e-9)) { out[H] = { n: rows.length, gapMed: 0, gapShare: 0, yearsRight: 0, years: 0, flat: true }; continue; }
    const top = rows.filter((r) => r.v >= hi), bot = rows.filter((r) => r.v <= lo), years = [...new Set(rows.map((r) => r.y))]; let right = 0, counted = 0; const byYear = [];
    for (const y of years) { const t = top.filter((r) => r.y === y), b = bot.filter((r) => r.y === y); if (t.length < 15 || b.length < 15) continue; counted++; const g = med(t.map((r) => r.rm)) - med(b.map((r) => r.rm)); if (g > 0) right++; byYear.push([y, r2(g * 100)]); }
    out[H] = { n: rows.length, gapMed: r2((med(top.map((r) => r.rm)) - med(bot.map((r) => r.rm))) * 100), gapShare: r1((mean(top.map((r) => r.rp)) - mean(bot.map((r) => r.rp))) * 100), yearsRight: right, years: counted, byYear }; }
  return out; }
const BAR = { 20: { med: 0.5, share: 3 }, 60: { med: 1.0, share: 3 } };
const passes = (t, H) => !t.flat && t.gapMed >= BAR[H].med && t.gapShare >= BAR[H].share && t.years > 0 && t.yearsRight > t.years / 2;

const CANDIDATES = [
  { key: "rsi", family: "index", name: "RSI — SPY and QQQ together" }, { key: "d21", family: "index", name: "distance from the 21-day" }, { key: "d50", family: "index", name: "distance from the 50-day" }, { key: "d100", family: "index", name: "distance from the 100-day" },
  { key: "gTrend", family: "index", name: "the index Geigers' trend" }, { key: "gMom", family: "index", name: "the index Geigers' momentum" },
  { key: "vixPct", family: "vix", name: "the VIX's close, placed in its own year" }, { key: "vixHiPct", family: "vix", name: "the VIX's intraday high, placed in its own year" },
  { key: "br50", family: "breadth", name: "sector funds and equal-weight above their 50-day" }, { key: "br200", family: "breadth", name: "sector funds and equal-weight above their 200-day" },
  { key: "hygRsi", family: "credit", name: "HYG's RSI (with its payouts)" }, { key: "hygWr", family: "credit", name: "HYG's Williams %R" }, { key: "creditOwn", family: "credit", name: "credit's own move, rates taken out" },
  { key: "ld21", family: "leaders", name: "core candidates holding their 21-day" }, { key: "ld50", family: "leaders", name: "core candidates holding their 50-day" }];
const F17 = fitRows(2017), T18 = testRows(2018), F15 = fitRows(2015), T16 = testRows(2016), F19 = fitRows(2019), T20 = testRows(2020), F17w = fitRows(2017, ix["2007-06-01"] ?? 0);
log("fit rows to 2017:", F17.length, dates[F17[0]], dates[F17.at(-1)], "· test rows:", T18.length, dates[T18[0]], dates[T18.at(-1)]);
const kept = [], verdicts = [], HZ = {};
for (const c of CANDIDATES) {
  const alone = testPart([], c.key, F17, T18), main = testPart(kept, c.key, F17, T18), p20 = passes(main[20], 20), p60 = passes(main[60], 60); let verdict = "light", why = "";
  const others = { fit2015: testPart(kept, c.key, F15, T16), fit2019: testPart(kept, c.key, F19, T20), with2008: testPart(kept, c.key, F17w, T18) };
  if (!p20 && !p60) why = "missed the bar at both horizons";
  else { const H = p20 ? 20 : 60, O = p20 ? 60 : 20; if (main[O].gapMed < 0 && !(p20 && p60)) why = `passed at ${H} sessions but pointed the wrong way at ${O}`;
    else { const bad = Object.entries(others).filter(([, t]) => t[H].gapMed < 0).map(([k]) => k); if (bad.length) why = `passed at ${H} sessions but reversed in another fit (${bad.join(", ")})`; else { verdict = "vote"; why = `passed at ${p20 && p60 ? "20 and 60" : H} sessions; never the wrong way in the three other fits`; } } }
  const horizons = verdict === "vote" ? [20, 60].filter((H) => (H === 20 ? p20 : p60)) : [];
  verdicts.push({ ...c, verdict, why, horizons, alone, main, others, testedOnTopOf: kept.slice() }); if (verdict === "vote") { kept.push(c.key); HZ[c.key] = horizons; }
  log(c.key.padEnd(10), verdict.padEnd(6), "20:", JSON.stringify([main[20].gapMed, main[20].gapShare, main[20].yearsRight + "/" + main[20].years]), "60:", JSON.stringify([main[60].gapMed, main[60].gapShare, main[60].yearsRight + "/" + main[60].years]), "alone20:", alone[20].gapMed, alone[20].gapShare, "|", why); }
log("KEPT:", kept.join(", ") || "(none)");

/* ---------- the model: the kept parts fitted on every evening since 10 Mar 2009; each light fitted as if it were counted ---------- */
const FINAL = fitAdditive(ALLROWS, kept, undefined, HZ), M17 = fitAdditive(F17, kept, undefined, HZ);
const meta = Object.fromEntries(CANDIDATES.map((c) => [c.key, c]));
const modelParts = FINAL.parts.map((p) => ({ ...p, family: meta[p.key].family, name: meta[p.key].name, vote: true, horizons: HZ[p.key] }));
for (const c of CANDIDATES) if (!kept.includes(c.key)) { const L = fitAdditive(ALLROWS, [...kept, c.key], undefined, { ...HZ, [c.key]: [20, 60] }), lp = L.parts.find((p) => p.key === c.key); modelParts.push({ ...lp, family: c.family, name: c.name, vote: false, scale: { ...L.scale, gain: FINAL.scale.gain, centre: 0 } }); }
const model = { parts: modelParts, scale: Object.fromEntries(Object.entries(FINAL.scale).map(([k, v]) => [k, +v.toFixed(6)])), baseline: Object.fromEntries(Object.entries(FINAL.B).map(([k, v]) => [k, r5(v)])), fittedFrom: dates[ALLROWS[0]], fittedTo: dates[ALLROWS.at(-1)], evenings: ALLROWS.length };
const readFinal = (i) => { const inp = E.inputsAt(X, i); return kept.every((k) => inp[k] != null) ? E.readSystem(inp, model) : null; };

/* ---------- the odds that go with a reading: unseen evenings (fitted to 2017, read on 2018 → 2026), in bands ---------- */
const BANDS = [[0, 20], [20, 35], [35, 50], [50, 65], [65, 80], [80, 100.01]];
function oddsTable(readOf, rows) { const R = rows.map((i) => ({ i, r: readOf(i) })).filter((x) => x.r != null); return BANDS.map(([lo, hi]) => { const g = R.filter((x) => x.r >= lo && x.r < hi).map((x) => x.i); return { lo, hi: Math.min(hi, 100), n: g.length, share20: r3(shareUp(g.map((i) => Y.r20[i]))), med20: r2(med(g.map((i) => Y.r20[i])) * 100), share60: r3(shareUp(g.map((i) => Y.r60[i]))), med60: r2(med(g.map((i) => Y.r60[i])) * 100), dip20: r2(med(g.map((i) => Y.dip20[i])) * 100), dip60: r2(med(g.map((i) => Y.dip60[i])) * 100) }; }); }
const read17 = (i) => { const r = readingAt(M17, i); return r ? r.reading : null; };
const oddsOOS = oddsTable(read17, T18), oddsAll = oddsTable((i) => { const r = readFinal(i); return r ? r.reading : null; }, ALLROWS.concat(testRows(2026).filter((i) => i > ALLROWS.at(-1))));
const baseT = { n: T18.length, share20: r3(shareUp(T18.map((i) => Y.r20[i]))), med20: r2(med(T18.map((i) => Y.r20[i])) * 100), share60: r3(shareUp(T18.map((i) => Y.r60[i]))), med60: r2(med(T18.map((i) => Y.r60[i])) * 100), dip20: r2(med(T18.map((i) => Y.dip20[i])) * 100), dip60: r2(med(T18.map((i) => Y.dip60[i])) * 100) };
model.odds = oddsOOS; model.oddsAny = baseT;
/* how well the reading ranked unseen evenings (rank correlation with what came next; 0 = chance) */
const rankCorr = (a, b) => { const p = []; for (let i = 0; i < a.length; i++) if (a[i] != null && b[i] != null) p.push([a[i], b[i]]); const rk = (v) => { const o = v.map((x, i) => [x, i]).sort((x, y) => x[0] - y[0]), r = new Array(v.length); o.forEach(([, i], k) => (r[i] = k)); return r; }; return corr(rk(p.map((x) => x[0])), rk(p.map((x) => x[1]))); };
const ranking = { at20: r3(rankCorr(T18.map(read17), T18.map((i) => Y.r20[i]))), at60: r3(rankCorr(T18.map(read17), T18.map((i) => Y.r60[i]))) };

/* ---------- the pie through time: core held, tactical moved by the line (unseen evenings, fitted to 2017) ---------- */
const s200 = E.sma(spy, 200), secUnder = dates.map((_, i) => { let n = 0, u = 0; for (const s of E.SECTORS) { const o = IND[s]; if (!o || o.c[i] == null || o.s200[i] == null) continue; n++; if (o.c[i] < o.s200[i]) u++; } return n ? u > n / 2 : false; });
const slow = dates.map((_, i) => i >= 2 && [0, 1, 2].every((k) => s200[i - k] != null && spy[i - k] < s200[i - k] && secUnder[i - k]));   // DM2's switch: SPY under its 200-day and most sector funds under theirs, three closes running
const bill = (() => { const b = fs.existsSync(path.join(CACHE, "US3M_D.json")) ? onClock("US3M") : null; return dates.map((_, i) => (b && b.c[i] != null ? b.c[i] / 100 / 252 : 0)); })();
function replay(investedOf, a, b) { let v = 1, peak = 1, worst = 0, sum = 0, n = 0; for (let i = a + 1; i <= b; i++) { const w = investedOf(i - 1); if (w == null) continue; v *= 1 + w * dayRet[i] + (1 - w) * bill[i]; if (v > peak) peak = v; worst = Math.min(worst, v / peak - 1); sum += w; n++; } return { became: r3(v), worstFall: r1(worst * 100), invested: r1((sum / n) * 100) }; }
const reads17 = dates.map((_, i) => (i >= firstOf(2018) - 3 ? read17(i) : null)), line17 = dates.map((_, i) => { const v = [reads17[i], reads17[i - 1], reads17[i - 2]].filter((x) => x != null); return v.length ? mean(v) : null; });
const A0 = firstOf(2018), A2 = ix[dates.find((d) => d >= "2024-10-07")];
const shapes = [];
for (const [label, core, tact] of [["the reading alone, no core", 0, 100], ["core 40 + tactical 60", 40, 60], ["core 50 + tactical 50", 50, 50], ["core 60 + tactical 40", 60, 40], ["core 70 + tactical 30 (the pie's baseline: core 45 + conviction 25, tactical 30)", 70, 30], ["core 80 + tactical 20", 80, 20]])
  for (const sw of [false, true]) { if (sw && core === 0) continue;
    const inv = (i) => (line17[i] == null ? null : ((sw && slow[i] ? 0 : core) + (tact * line17[i]) / 100) / 100), R = replay(inv, A0, LAST), flat = replay(() => R.invested / 100, A0, LAST), R2 = replay(inv, A2, LAST), flat2 = replay(() => R2.invested / 100, A2, LAST);
    shapes.push({ label, core, tactical: tact, slowSwitch: sw, ...R, sameShareUntimed: flat.became, sameShareWorstFall: flat.worstFall, timingAdded: r3(R.became - flat.became), last2y: R2.became, last2yUntimed: flat2.became, last2yInvested: R2.invested }); }
const lineTest = [1, 3, 5].map((n) => { const ln = dates.map((_, i) => { const v = []; for (let k = 0; k < n; k++) if (reads17[i - k] != null) v.push(reads17[i - k]); return v.length ? mean(v) : null; }); let moves = 0, cnt = 0; for (let i = A0 + 1; i <= LAST; i++) if (ln[i] != null && ln[i - 1] != null) { moves += Math.abs(ln[i] - ln[i - 1]); cnt++; }
  return { readings: n, alone: replay((i) => (ln[i] == null ? null : ln[i] / 100), A0, LAST), core70: replay((i) => (ln[i] == null ? null : (70 + 0.3 * ln[i]) / 100), A0, LAST), pointsMovedPerSession: r2(moves / cnt) }; });
const bh = replay(() => 1, A0, LAST), c60 = replay(() => 0.6, A0, LAST), bh2 = replay(() => 1, A2, LAST);
const pieReplay = { from: dates[A0], to: dates[LAST], shapes, lineTest, buyAndHold: bh, always60: c60, buyAndHoldLast2y: bh2.became, slowSwitchEvenings: dates.filter((_, i) => i >= A0 && slow[i]).length, slowSwitchNow: slow[LAST], note: "the blend of SPY and QQQ without payouts; cash earns the 3-month bill; no costs; the invested share is set at the close and earns the next session" };

/* ---------- bottoms and tops: what the reading said (DM2's dates) ---------- */
const DATES_B = ["2026-03-26", "2025-04-04", "2023-10-30", "2022-10-17", "2020-03-17", "2018-12-21", "2009-03-02"], DATES_T = ["2007-10-09", "2018-01-26", "2020-02-19", "2022-01-03", "2024-07-16", "2025-02-19", "2026-01-27", "2026-06-02", "2026-08-13", "2026-10-06"];
const atDate = (d) => { const i = ix[d]; if (i == null) return { date: d, reading: null }; const r = readFinal(i); return { date: d, reading: r ? r.reading : null, rsi: r1(X.rsi[i]), vix: bars.VIX.c[i], r20: r2((Y.r20[i] ?? NaN) * 100), r60: r2((Y.r60[i] ?? NaN) * 100) }; };
const extremes = { bottoms: DATES_B.map(atDate), tops: DATES_T.map(atDate) };

/* ---------- the VIX as it trades: a touch counts, a close confirms ---------- */
const firstRealHigh = dates[bars.VIX.h.findIndex((v, i) => v != null && v > bars.VIX.c[i] + 1e-9)];
function vixStudy(T) { const from = Math.max(FROM, ix[firstRealHigh] ?? 0), g = { touch: [], confirm: [], neither: [] }; for (let i = from; i + 20 <= LAST; i++) { const c = X.vixPct[i], h = X.vixHiPct[i]; if (c == null || h == null) continue; (c >= T ? g.confirm : h >= T ? g.touch : g.neither).push(i); }
  const sum = (a) => ({ evenings: a.length, share20: r3(shareUp(a.map((i) => Y.r20[i]))), med20: r2(med(a.map((i) => Y.r20[i])) * 100), share60: r3(shareUp(a.map((i) => Y.r60[i]))), med60: r2(med(a.map((i) => Y.r60[i])) * 100), dip20: r2(med(a.map((i) => Y.dip20[i])) * 100) });
  return { place: T, touchOnly: sum(g.touch), closeConfirmed: sum(g.confirm), neither: sum(g.neither) }; }
const vixYear = fin(bars.VIX.c.slice(LAST - 251)).sort((a, b) => a - b), vixNow = { close: bars.VIX.c[LAST], high: bars.VIX.h[LAST], pct: r1(X.vixPct[LAST]), p80: r2(pctl(vixYear, 80)), p90: r2(pctl(vixYear, 90)), p95: r2(pctl(vixYear, 95)), p10: r2(pctl(vixYear, 10)), p5: r2(pctl(vixYear, 5)), max: Math.max(...vixYear) };
const vixTouch = { firstRealHigh, at80: vixStudy(80), at90: vixStudy(90), now: vixNow };

/* ---------- credit: the washout as an ADD signal, and a rates-led dip told from a credit scare ---------- */
const hygPriceRsi = E.rsi(bars.HYG.c), hygFrom = bars.HYG.c.findIndex((v) => v != null);
function episodes(cond, gap = 10, from = 0, to = LAST) { const out = []; let last = -1e9; for (let i = from; i <= to; i++) { if (!cond(i)) continue; if (i - last > gap) out.push(i); last = i; } return out; }
const sumOut = (a, base = null) => ({ n: a.length, spyMed20: r2(med(a.map((i) => spy20[i])) * 100), spyShare20: r3(shareUp(a.map((i) => spy20[i]))), spyMed60: r2(med(a.map((i) => spy60[i])) * 100), spyShare60: r3(shareUp(a.map((i) => spy60[i]))), med20: r2(med(a.map((i) => Y.r20[i])) * 100), share20: r3(shareUp(a.map((i) => Y.r20[i]))), med60: r2(med(a.map((i) => Y.r60[i])) * 100), share60: r3(shareUp(a.map((i) => Y.r60[i]))), dip20: r2(med(a.map((i) => Y.dip20[i])) * 100), dates: base ? undefined : a.map((i) => dates[i]) });
const anyDay = (() => { const a = []; for (let i = hygFrom + 20; i + 60 <= LAST; i++) a.push(i); return sumOut(a, true); })();
const ratesLeg = (i) => (i >= E.CREDIT_WINDOW && bars.IEF.c[i] != null && bars.IEF.c[i - E.CREDIT_WINDOW] != null ? E.RATES_SHARE * (bars.IEF.c[i] / bars.IEF.c[i - E.CREDIT_WINDOW] - 1) * 100 : null), hygMove = (i) => (i >= E.CREDIT_WINDOW && hygTR[i] != null && hygTR[i - E.CREDIT_WINDOW] != null ? (hygTR[i] / hygTR[i - E.CREDIT_WINDOW] - 1) * 100 : null);
/* a washout is RATES-LED when treasuries fell with HYG and that leg is at least 40% of HYG's fall; otherwise it is CREDIT-LED (credit's own selling) */
const ledBy = (i) => { const h = hygMove(i), r = ratesLeg(i); if (h == null || r == null || h >= 0) return null; return r < 0 && r / h >= 0.4 ? "rates" : "credit"; };
const washP = episodes((i) => hygPriceRsi[i] != null && hygPriceRsi[i] < 22, 10, hygFrom, LAST - 20), washA = episodes((i) => X.hygRsi[i] != null && X.hygRsi[i] < 22, 10, hygFrom, LAST - 20), washA25 = episodes((i) => X.hygRsi[i] != null && X.hygRsi[i] < 25, 10, hygFrom, LAST - 20), washA30 = episodes((i) => X.hygRsi[i] != null && X.hygRsi[i] < 30, 10, hygFrom, LAST - 20), washW = episodes((i) => X.hygWr[i] != null && X.hygWr[i] <= -95 && X.hygRsi[i] != null && X.hygRsi[i] < 35, 10, hygFrom, LAST - 20);
/* both directions: what followed each band of HYG's RSI (every evening since 2007), and the same asked only on evenings the indices were in a dip */
const band = (rows, f, edges) => edges.map(([lo, hi]) => { const g = rows.filter((i) => f(i) != null && f(i) >= lo && f(i) < hi); return { lo, hi, n: g.length, med20: r2(med(g.map((i) => Y.r20[i])) * 100), share20: r3(shareUp(g.map((i) => Y.r20[i]))), med60: r2(med(g.map((i) => Y.r60[i])) * 100), share60: r3(shareUp(g.map((i) => Y.r60[i]))), dip20: r2(med(g.map((i) => Y.dip20[i])) * 100) }; });
const creditRows = (() => { const a = []; for (let i = hygFrom + 30; i + 20 <= LAST; i++) a.push(i); return a; })(), HB = [[0, 25], [25, 30], [30, 40], [40, 50], [50, 60], [60, 70], [70, 101]];
const hygBands = band(creditRows, (i) => X.hygRsi[i], HB), dipRows = creditRows.filter((i) => X.rsi[i] != null && X.rsi[i] < 45);
const dipByCredit = { what: "evenings with SPY and QQQ's average RSI under 45 (a dip), split by HYG's own RSI", rows: band(dipRows, (i) => X.hygRsi[i], [[0, 30], [30, 40], [40, 50], [50, 101]]), ownMove: band(dipRows, (i) => X.creditOwn[i], [[-99, -1.5], [-1.5, -0.5], [-0.5, 0.5], [0.5, 99]]) };
const fredRows = fs.existsSync(path.join(CACHE, "data/hy-spread-fred.csv")) ? fs.readFileSync(path.join(CACHE, "data/hy-spread-fred.csv"), "utf8").trim().split("\n").slice(1).map((l) => l.split(",")).filter((r) => r[1] && r[1] !== ".").map((r) => [r[0], +r[1]]) : [];
const fredOn = (() => { const m = new Map(fredRows); let cur = null; return dates.map((d) => (m.has(d) ? (cur = m.get(d)) : d >= (fredRows[0] || ["9"])[0] ? cur : null)); })();
const fredChg = dates.map((_, i) => (i >= E.CREDIT_WINDOW && fredOn[i] != null && fredOn[i - E.CREDIT_WINDOW] != null ? fredOn[i] - fredOn[i - E.CREDIT_WINDOW] : null));
const span = (a, b) => { const i = ix[a], j = ix[b]; return { from: a, to: b, hygPct: r2((hygTR[j] / hygTR[i] - 1) * 100), iefPct: r2((bars.IEF.c[j] / bars.IEF.c[i] - 1) * 100), ratesLegPct: r2(E.RATES_SHARE * (bars.IEF.c[j] / bars.IEF.c[i] - 1) * 100), creditOwnPct: r2(((hygTR[j] / hygTR[i] - 1) - E.RATES_SHARE * (bars.IEF.c[j] / bars.IEF.c[i] - 1)) * 100), spreadFrom: fredOn[i], spreadTo: fredOn[j], spyPct: r2((spy[j] / spy[i] - 1) * 100), qqqPct: r2((qqq[j] / qqq[i] - 1) * 100) }; };
const fredVals = fredRows.map((r) => r[1]), fredLast = fredRows.at(-1) || [null, null];
const credit = {
  hygRsiNow: r1(X.hygRsi[LAST]), hygRsiPriceOnlyNow: r1(hygPriceRsi[LAST]), hygWrNow: r1(X.hygWr[LAST]), creditOwnNow: r2(X.creditOwn[LAST]),
  lowLately: (() => { let k = LAST; for (let i = LAST - 15; i <= LAST; i++) if (X.hygRsi[i] < X.hygRsi[k]) k = i; let kp = LAST; for (let i = LAST - 15; i <= LAST; i++) if (hygPriceRsi[i] < hygPriceRsi[kp]) kp = i; return { withPayouts: { date: dates[k], rsi: r1(X.hygRsi[k]), wr: r1(X.hygWr[k]), ledBy: ledBy(k) }, priceOnly: { date: dates[kp], rsi: r1(hygPriceRsi[kp]) } }; })(),
  anyDay, washoutPriceOnlyUnder22: sumOut(washP), washoutWithPayoutsUnder22: sumOut(washA), washoutWithPayoutsUnder25: sumOut(washA25), washoutWithPayoutsUnder30: sumOut(washA30), williamsWashout: sumOut(washW),
  ratesLed: sumOut(washA30.filter((i) => ledBy(i) === "rates")), creditLed: sumOut(washA30.filter((i) => ledBy(i) === "credit")),
  hygBands, dipByCredit,
  thisEpisode: [span("2026-09-22", "2026-10-01"), span("2026-09-22", "2026-10-06")],
  spread: { series: "FRED BAMLH0A0HYM2", from: (fredRows[0] || [null])[0], last: fredLast, min: Math.min(...fredVals), max: Math.max(...fredVals), median: r2(med(fredVals)), placeOfLast: r1((100 * fredVals.filter((v) => v < fredLast[1]).length) / (fredVals.length - 1)), rows: fredRows.slice(-30),
    proxyCheck: { what: "ten-session change in FRED's spread against the same ten sessions of HYG, on the three years FRED serves", withRatesTakenOut: r3(corr(fredChg, X.creditOwn)), rawHyg: r3(corr(fredChg, dates.map((_, i) => hygMove(i)))) } },
};

/* ---------- the overbought side: when did trimming the tactical part pay? ----------
   THE TRADE: sell at the signal's close; buy back at the first close 2% or more lower inside 20 sessions; if none comes, buy back at the
   close of session 20, wherever it is. The trade PAID when the buy-back was lower than the sale. */
const SCTX = E.stretchCtx(RD, S);
function trimTrade(i) { if (i + 20 > LAST) return null; let run = 0; for (let k = 1; k <= 20; k++) { const p = blendPath(i, k) - 1; if (p <= -0.02) return { paid: true, result: 1 / (1 + p) - 1, k, runUp: run }; if (p > run) run = p; } const p = blendPath(i, 20) - 1; return { paid: p < 0, result: 1 / (1 + p) - 1, k: 20, runUp: run }; }
const lowWithin = (i, h, x) => { if (i + h > LAST) return null; for (let k = 1; k <= h; k++) if (blendPath(i, k) - 1 <= -x) return 1; return 0; };
const RULES = [{ key: "any", name: "any evening", f: () => true, every: true }, ...E.STRETCH.map((r) => ({ key: r.key, name: r.name, addedAfterFirstRun: !!r.addedAfterFirstRun, f: (i) => r.f(SCTX, i) })),
  { key: "readingLow", name: "the system's own reading under 20", f: (i) => { const r = i >= A0 ? read17(i) : (readFinal(i) || {}).reading; return r != null && r < 20; } }];
const START = Math.max(260, ix["2004-01-02"] ?? 260);
function trimRow(rule, a, b) { const hit = []; for (let i = a; i <= Math.min(b, LAST - 20); i++) { let ok = false; try { ok = !!rule.f(i); } catch (e) { ok = false; } if (ok) hit.push(i); } const eps = rule.every ? hit : episodes((i) => hit.includes(i), 10, a, Math.min(b, LAST - 20));
  const T = eps.map(trimTrade).filter(Boolean); return { evenings: hit.length, n: eps.length, paid: r3(mean(T.map((t) => (t.paid ? 1 : 0)))), medResult: r2(med(T.map((t) => t.result)) * 100), meanResult: r2(mean(T.map((t) => t.result)) * 100), back2in20: r3(mean(eps.map((i) => lowWithin(i, 20, 0.02)))), back3in40: r3(mean(eps.map((i) => lowWithin(i, 40, 0.03)))), back5in60: r3(mean(eps.map((i) => lowWithin(i, 60, 0.05)))), lower20: r3(mean(eps.map((i) => (Y.r20[i] == null ? null : Y.r20[i] < 0 ? 1 : 0)))), med20: r2(med(eps.map((i) => Y.r20[i])) * 100), med60: r2(med(eps.map((i) => Y.r60[i])) * 100), medRunUpFirst: r2(med(T.map((t) => t.runUp)) * 100), medDip20: r2(med(eps.map((i) => Y.dip20[i])) * 100), last: eps.length ? dates[eps.at(-1)] : null }; }
const trim = RULES.map((rule) => ({ key: rule.key, name: rule.name, addedAfterFirstRun: !!rule.addedAfterFirstRun, all: trimRow(rule, START, LAST), to2017: trimRow(rule, START, lastOf(2017)), from2018: trimRow(rule, firstOf(2018), LAST), onNow: (() => { try { return !!rule.f(LAST); } catch (e) { return false; } })() }));
/* a rule is a TWO-THIRDS CALL when the trade paid at least two times in three on BOTH halves of history (to 2017, and 2018 on) with at least 12 cases in each */
for (const t of trim) t.twoThirds = t.key !== "any" && t.to2017.n >= 12 && t.from2018.n >= 12 && t.to2017.paid >= 2 / 3 && t.from2018.paid >= 2 / 3;
log("TRIM any:", JSON.stringify(trim[0].all)); for (const t of trim.slice(1)) log(" ", t.key.padEnd(14), "all n", t.all.n, "paid", t.all.paid, "| ≤2017 n", t.to2017.n, t.to2017.paid, "| 2018+ n", t.from2018.n, t.from2018.paid, "| back2in20", t.all.back2in20, "med20", t.all.med20, t.twoThirds ? "  ← two-thirds" : "");

/* ---------- the reset tracker: each name's own usual cool-off ---------- */
const quart = (a, start) => ({ q25: r2(pctl(a, 25)), med: r2(med(a)), q75: r2(pctl(a, 75)), start: r2(start) });
const coolRaw = {}; for (const s of [...E.NAMES, "SPY", "QQQ"]) coolRaw[s] = IND[s] ? E.coolOffs(IND[s], dates).filter((c) => c.push >= "2010-01-01") : [];
const pooledList = E.CORE.concat(["MU"]).flatMap((s) => coolRaw[s].filter((c) => c.how === "resumed"));
const coolOf = (list, pooled = false) => { const res = list.filter((c) => c.how === "resumed"); return { n: list.length, resumed: res.length, resumedShare: r3(list.length ? res.length / list.length : null), pooled, rsi: quart(res.map((c) => c.lowRsi), med(res.map((c) => c.rsiAtPush))), wr: quart(res.map((c) => c.lowWr), med(res.map((c) => c.wrAtPush))), mom: quart(res.map((c) => c.lowMom), med(res.map((c) => c.momAtPush))), dipPct: quart(res.map((c) => c.dipPct), 0), sessions: quart(res.map((c) => c.sessions), 0) }; };
const cool = { pooled: coolOf(pooledList, true) }; for (const s of [...E.NAMES, "SPY", "QQQ"]) cool[s] = coolRaw[s].filter((c) => c.how === "resumed").length >= 8 ? coolOf(coolRaw[s]) : { ...coolOf(pooledList, true), ownCases: coolRaw[s].length };
const coolNowAll = Object.fromEntries([...E.NAMES, "SPY", "QQQ"].map((s) => [s, IND[s] ? E.coolNow(IND[s], dates, LAST) : null]));
for (const s of E.NAMES) log("cool", s.padEnd(5), "n", cool[s].n, cool[s].pooled ? "(pooled)" : "", "resumed", cool[s].resumedShare, "RSI low", JSON.stringify(cool[s].rsi), "W%R low", JSON.stringify(cool[s].wr), "mom low", JSON.stringify(cool[s].mom), "dip", cool[s].dipPct.med, "sessions", cool[s].sessions.med);

/* ---------- how the rest of the market usually moves on a dip in SPY and QQQ together (for drawing the dips) ---------- */
const slope0 = (ys, xs, keep) => { let sxy = 0, sxx = 0; for (let i = 0; i < xs.length; i++) if (xs[i] != null && ys[i] != null && keep(xs[i])) { sxy += xs[i] * ys[i]; sxx += xs[i] * xs[i]; } return sxx ? sxy / sxx : null; };
const chg = (a) => a.map((v, i) => (i && v != null && a[i - 1] ? (v / a[i - 1] - 1) * 100 : null)), blendChg = dayRet.map((v) => (v == null ? null : v * 100)), lastN = (a, n) => a.slice(-n);
const qChg = chg(qqq), scn = { measuredOver: "the last 500 sessions, sessions where the blend fell half a percent or more", vixPerPct: r2(-slope0(lastN(chg(bars.VIX.c), 500), lastN(blendChg, 500), (x) => x <= -0.5)), hygPerPct: r3(slope0(lastN(chg(bars.HYG.c), 500), lastN(blendChg, 500), (x) => x <= -0.5)), iefPerPct: r3(-slope0(lastN(chg(bars.IEF.c), 500), lastN(blendChg, 500), (x) => x <= -0.5)), fundBeta: Object.fromEntries(E.BREADTH.map((s) => [s, r2(slope0(lastN(chg(bars[s].c), 120), lastN(blendChg, 120), () => true))])), spyPerQqq: r3(slope0(lastN(chg(spy), 120), lastN(qChg, 120), () => true)), betaMeasured: Object.fromEntries(E.NAMES.map((s) => [s, r2(slope0(lastN(chg(bars[s].c), 120), lastN(qChg, 120), () => true))])) };

/* ---------- tonight, and the dips drawn from it ---------- */
const W = 540, cut = (a) => a.slice(-W), Sw = { dates: cut(dates), bars: Object.fromEntries(Object.entries(bars).map(([s, b]) => [s, b ? { c: cut(b.c), h: cut(b.h), l: cut(b.l) } : null])) }, trW = cut(hygTR), RW = E.allReadings(Sw, trW), kW = W - 1;
const coolWindow = Object.fromEntries(E.NAMES.map((s) => { const a = E.coolNow(IND[s], dates, LAST), b = E.coolNow(RW.ind[s], Sw.dates, kW); return [s, [a.push, b.push, +a.dipPct.toFixed(1), +b.dipPct.toFixed(1)]]; }));
const windowCheck = Object.fromEntries(Object.keys(X).map((key) => [key, [r3(X[key][LAST]), r3(RW.X[key][kW])]]));
const tonight = E.readSystem(E.inputsAt(RW.X, kW), model), line = mean([tonight.reading, readFinal(LAST - 1).reading, readFinal(LAST - 2).reading]);
const dips = E.DEFAULTS.dips.map((x) => { const d = E.dipSeries(Sw, trW, x, scn, E.BETA_QQQ, true), R = E.allReadings(d.S, d.hygTR), rd = E.readSystem(E.inputsAt(R.X, kW), model), u = E.dipSeries(Sw, trW, x, scn), Ru = E.allReadings(u.S, u.hygTR), ru = E.readSystem(E.inputsAt(Ru.X, kW), model); return { dipPct: x, reading: rd.reading, readingIfCreditSellsToo: ru.reading, families: rd.families.map((f) => ({ family: f.family, points: r1(f.points) })), inputs: Object.fromEntries(kept.map((k) => [k, r2(R.X[k][kW])])), vix: r2(d.S.bars.VIX.c[kW]), rsi: r1(R.X.rsi[kW]) }; });
log("TONIGHT", dates[LAST], "reading", tonight.reading, "line", r1(line), "base", tonight.base, "|", tonight.parts.map((p) => p.key + " " + r1(p.points)).join(" · "), "| lights:", tonight.lights.map((p) => p.key + " " + r1(p.points)).join(" · "));
log("DIPS [dip, calm, credit sells too, vix, rsi]", JSON.stringify(dips.map((d) => [d.dipPct, d.reading, d.readingIfCreditSellsToo, d.vix, d.rsi])));
log("ODDS (unseen 2018+):", JSON.stringify(oddsOOS.map((b) => [b.lo + "-" + b.hi, b.n, b.share20, b.med20, b.share60, b.med60])), "any:", JSON.stringify(baseT), "ranking", JSON.stringify(ranking));
log("PIE REPLAY:", JSON.stringify(shapes.map((s) => [s.label.slice(0, 22), s.slowSwitch ? "switch" : "held", s.became, s.worstFall, s.invested, s.sameShareUntimed, s.sameShareWorstFall, s.last2y, s.last2yUntimed])), "b&h", JSON.stringify(bh), "60%", JSON.stringify(c60));
log("CREDIT:", JSON.stringify({ now: [credit.hygRsiNow, credit.hygRsiPriceOnlyNow, credit.hygWrNow, credit.creditOwnNow], low: credit.lowLately, priceOnly22: [credit.washoutPriceOnlyUnder22.n, credit.washoutPriceOnlyUnder22.spyMed20, credit.washoutPriceOnlyUnder22.spyShare20, credit.washoutPriceOnlyUnder22.spyMed60, credit.washoutPriceOnlyUnder22.spyShare60], any: [anyDay.spyMed20, anyDay.spyShare20, anyDay.spyMed60, anyDay.spyShare60], adj30: [credit.washoutWithPayoutsUnder30.n, credit.washoutWithPayoutsUnder30.med20, credit.washoutWithPayoutsUnder30.share20], rates: [credit.ratesLed.n, credit.ratesLed.med20, credit.ratesLed.share20, credit.ratesLed.med60, credit.ratesLed.share60], cred: [credit.creditLed.n, credit.creditLed.med20, credit.creditLed.share20, credit.creditLed.med60, credit.creditLed.share60], ep: credit.thisEpisode, proxy: credit.spread.proxyCheck, spreadPlace: credit.spread.placeOfLast }));
log("HYG BANDS:", JSON.stringify(hygBands.map((b) => [b.lo + "-" + b.hi, b.n, b.med20, b.share20, b.med60, b.share60]))); log("DIP x CREDIT:", JSON.stringify(dipByCredit.rows.map((b) => [b.lo + "-" + b.hi, b.n, b.med20, b.share20, b.med60, b.share60])), "own move:", JSON.stringify(dipByCredit.ownMove.map((b) => [b.lo + "…" + b.hi, b.n, b.med20, b.share20, b.med60, b.share60])));
log("LINE TEST:", JSON.stringify(lineTest)); log("COOL WINDOW (top date and deepest dip: full history, window):", JSON.stringify(coolWindow)); log("SCN:", JSON.stringify(scn)); log("WINDOW CHECK (full history vs the 540-bar window):", JSON.stringify(windowCheck));
log("EXTREMES:", JSON.stringify(extremes.bottoms.map((b) => [b.date, b.reading])), JSON.stringify(extremes.tops.map((b) => [b.date, b.reading])));

/* ---------- write ---------- */
const asOf = dates[LAST], built = new Date().toISOString();
const live = { what: "DS1 — the deployment system's model, as the allocation tool reads it", asOf, built, model, kept, trendFilter: { rule: "SPY under its 200-day and most sector funds under theirs, three closes running", on: slow[LAST] },
  trim: trim.map((t) => ({ key: t.key, name: t.name, twoThirds: t.twoThirds, all: t.all, to2017: t.to2017, from2018: t.from2018 })), cool, scn, vixTouch: { at80: vixTouch.at80, at90: vixTouch.at90 },
  credit: { anyDay: credit.anyDay, washout: credit.washoutWithPayoutsUnder30, ratesLed: credit.ratesLed, creditLed: credit.creditLed, spread: { series: credit.spread.series, last: credit.spread.last, median: credit.spread.median, min: credit.spread.min, max: credit.spread.max, placeOfLast: credit.spread.placeOfLast, from: credit.spread.from } },
  hygPayouts: hygF.dividends.rows.map((r) => [r[0], r[1]]).filter((r) => r[0] >= dates[LAST - 460]), lines: (() => { const f = path.join(ROOT, "data/reviewed-lines-20261006.json"); if (!fs.existsSync(f)) return { asOf: null, names: {} }; const j = J(f); return { asOf: j.as_of, names: Object.fromEntries([...E.NAMES, "SPY", "QQQ"].filter((s) => j.names[s]).map((s) => [s, j.names[s].levels.map((l) => ({ id: l.id, level: +(+l.level).toFixed(2), kind: l.kind }))])) }; })(),
  beta: E.BETA_QQQ, defaults: { ...E.DEFAULTS, spyPerQqq: scn.spyPerQqq ?? E.DEFAULTS.spyPerQqq } };
const study = { what: "DS1 — the deployment system, measured", asOf, built, keepRule: { bar: BAR, text: "passes at 20 or 60 sessions out of sample, not the wrong way at the other, never negative in three other fits" }, verdicts, kept, model, ranking, oddsOOS, oddsAll, oddsAny: baseT, pieReplay, extremes, vixTouch, credit, trim, cool, coolCases: Object.fromEntries(Object.entries(coolRaw).map(([s, a]) => [s, a.slice(-12)])), coolNow: coolNowAll, scn, tonight: { date: asOf, reading: tonight.reading, line: r1(line), base: tonight.base, parts: tonight.parts.map((p) => ({ key: p.key, family: p.family, name: p.name, value: r2(p.value), place: r1(p.place), points: r1(p.points) })), lights: tonight.lights.map((p) => ({ key: p.key, family: p.family, name: p.name, value: r2(p.value), place: r1(p.place), points: r1(p.points) })), families: tonight.families.map((f) => ({ ...f, points: r1(f.points) })), prior: [{ date: dates[LAST - 1], reading: readFinal(LAST - 1).reading }, { date: dates[LAST - 2], reading: readFinal(LAST - 2).reading }] }, dips, windowCheck, coolWindow,
  curves: Object.fromEntries(model.parts.map((p) => [p.key, { q: [0, 5, 10, 25, 50, 75, 90, 95, 100].map((k) => [k, r2(p.q[k])]), points: E.FGRID.map((u) => r1(model.scale.gain * ((E.curveAt(p.gm20, u) / (p.scale || model.scale).sM20 + E.curveAt(p.gp20, u) / (p.scale || model.scale).sP20 + E.curveAt(p.gm60, u) / (p.scale || model.scale).sM60 + E.curveAt(p.gp60, u) / (p.scale || model.scale).sP60) / 4))), gm20: p.gm20.map((v) => r2(v * 100)), gp20: p.gp20.map((v) => r1(v * 100)), gm60: p.gm60.map((v) => r2(v * 100)), gp60: p.gp60.map((v) => r1(v * 100)) }])),
  series: (() => { const a = ix["2025-10-06"] ?? LAST - 252; const out = []; for (let i = a; i <= LAST; i++) { const r = readFinal(i); out.push([dates[i], r ? r.reading : null, r2(0.5 * spy[i] / spy[a] + 0.5 * qqq[i] / qqq[a])]); } return out; })() };
fs.mkdirSync(path.join(ROOT, "study/ds1/data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "study/ds1/data/ds1-live.json"), JSON.stringify(live)); fs.writeFileSync(path.join(ROOT, "study/ds1/data/ds1.json"), JSON.stringify(study));
console.log(JSON.stringify({ ok: true, asOf, kept, reading: tonight.reading, line: r1(line), files: ["study/ds1/data/ds1-live.json", "study/ds1/data/ds1.json"].map((f) => [f, fs.statSync(path.join(ROOT, f)).size]) }));
