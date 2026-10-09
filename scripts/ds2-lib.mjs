/* DS2 (7 Oct 2026) — the lab the DS2 build runs in: DS1's own series loader, DS1's own fit and DS1's own replay, as functions.
   scripts/ds1-build.mjs is one long script that runs when it is read, so nothing in it can be imported. Its loader, its additive fit
   (kernelCurve, nonIncreasing, fitAdditive), its outcome (the 50/50 blend of SPY and QQQ, 20 and 60 sessions on) and its replay are copied
   here WORD FOR WORD, and tests/ds2.test.mjs holds the copy to DS1's stored answers: the model this lab fits is the model in
   study/ds1/data/ds1-live.json, and the replay of that model gives DS1's own 3.54× / −30.0% / 85.0%. So "tested exactly as DS1 tested"
   is a thing a test checks, not a claim.
     lab(cacheDir) → everything below.   No key, no table, no network: it only reads the cache folder. */
import fs from "node:fs"; import path from "node:path";
import * as E from "../study/ds1/engine.mjs";

export const J = (f) => JSON.parse(fs.readFileSync(f, "utf8")), iso = (t) => new Date(t).toISOString().slice(0, 10);
export const r1 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(1)), r2 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(2)), r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3)), r5 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(5));
export const fin = (a) => a.filter((v) => v != null && isFinite(v));
export const med = (a) => { const x = fin(a).sort((p, q) => p - q); return x.length ? (x.length % 2 ? x[x.length >> 1] : (x[(x.length >> 1) - 1] + x[x.length >> 1]) / 2) : null; };
export const mean = (a) => { const x = fin(a); return x.length ? x.reduce((p, q) => p + q, 0) / x.length : null; };
export const sd = (a) => { const x = fin(a), m = mean(x); return x.length ? Math.sqrt(mean(x.map((v) => (v - m) ** 2))) : null; };
export const pctl = (a, q) => { const s = fin(a).sort((p, r) => p - r); if (!s.length) return null; const k = ((s.length - 1) * q) / 100, lo = Math.floor(k), hi = Math.ceil(k); return s[lo] + (s[hi] - s[lo]) * (k - lo); };
export const shareUp = (a) => { const x = fin(a); return x.length ? x.filter((v) => v > 0).length / x.length : null; };

export function lab(CACHE) {
  if (!CACHE || !fs.existsSync(path.join(CACHE, "SPY_D.json"))) throw new Error("no cache folder: " + CACHE);
  /* ---------- the series, on SPY's sessions (ds1-build.mjs, lines 33–41) ---------- */
  const D = (s) => J(path.join(CACHE, `${s}_D.json`)).series.filter((b) => b.c != null);
  const spyBars = D("SPY"), dates = spyBars.map((b) => iso(b.t)), N = dates.length, LAST = N - 1, ix = Object.fromEntries(dates.map((d, i) => [d, i]));
  function onClock(s) { if (!fs.existsSync(path.join(CACHE, `${s}_D.json`))) return null; const m = new Map(D(s).map((b) => [iso(b.t), b])); let cur = null; const c = [], h = [], l = []; for (const d of dates) { const b = m.get(d); if (b) { cur = b.c; c.push(b.c); h.push(Math.max(b.h ?? b.c, b.c)); l.push(Math.min(b.l ?? b.c, b.c)); } else { c.push(cur); h.push(cur); l.push(cur); } } return { c, h, l }; }
  const bars = {}; for (const s of E.ALL_SYMBOLS) bars[s] = onClock(s);
  { const t = new Map(J(path.join(CACHE, "data/vix.json")).filter((r) => r.vix != null).map((r) => [r.date, +r.vix])); for (let i = 0; i < N; i++) if (t.has(dates[i])) { bars.VIX.c[i] = t.get(dates[i]); bars.VIX.h[i] = Math.max(bars.VIX.h[i] ?? 0, bars.VIX.c[i]); bars.VIX.l[i] = Math.min(bars.VIX.l[i] ?? 1e9, bars.VIX.c[i]); } }
  const hygF = J(path.join(CACHE, "data/hyg_adjusted_fmp.json")); const hygTR = (() => { const m = new Map(hygF.adjusted.rows.map((r) => [r[0], r[1]])); let cur = null; return dates.map((d) => (m.has(d) ? (cur = m.get(d)) : cur)); })();
  const S = { dates, bars }; const RD = E.allReadings(S, hygTR), X = RD.X, IND = RD.ind;

  /* ---------- the outcome: the 50/50 blend of SPY and QQQ (lines 44–47) ---------- */
  const spy = bars.SPY.c, qqq = bars.QQQ.c; const blendPath = (i, k) => (i + k > LAST || spy[i] == null || qqq[i] == null ? null : 0.5 * (spy[i + k] / spy[i]) + 0.5 * (qqq[i + k] / qqq[i]));
  const fwd = (h) => dates.map((_, i) => { const p = blendPath(i, h); return p == null ? null : p - 1; }), dipOf = (h) => dates.map((_, i) => { if (i + h > LAST) return null; let m = 0; for (let k = 1; k <= h; k++) { const p = blendPath(i, k) - 1; if (p < m) m = p; } return m; });
  const Y = { r20: fwd(20), r60: fwd(60), dip20: dipOf(20), dip60: dipOf(60) };
  const dayRet = dates.map((_, i) => (i === 0 ? null : 0.5 * (spy[i] / spy[i - 1] - 1) + 0.5 * (qqq[i] / qqq[i - 1] - 1)));

  /* ---------- the additive fit (lines 50–73), with one addition: mono[key] = "up" holds a curve so it never FALLS as the place rises
     (DS1 only ever needed "never rises", for the index RSI) ---------- */
  const FBW = 10, TG = ["m20", "p20", "m60", "p60"], CUR = { m20: "gm20", p20: "gp20", m60: "gm60", p60: "gp60" };
  function kernelCurve(us, res, useMedian) { const n = us.length, w = new Float64Array(n), out = []; const ordr = useMedian ? [...Array(n).keys()].sort((a, b) => res[a] - res[b]) : null;
    for (const g of E.FGRID) { let sw = 0, sv = 0; for (let q = 0; q < n; q++) { const d = (us[q] - g) / FBW, v = Math.exp(-0.5 * d * d); w[q] = v; sw += v; sv += v * res[q]; }
      if (!useMedian) { out.push(sw > 0 ? sv / sw : 0); continue; } let acc = 0, val = 0; for (const q of ordr) { acc += w[q]; if (acc >= sw / 2) { val = res[q]; break; } } out.push(val); } return out; }
  function nonIncreasing(a) { const blocks = a.map((v) => ({ sum: v, n: 1 })); for (let i = 0; i < blocks.length - 1; ) { if (blocks[i].sum / blocks[i].n < blocks[i + 1].sum / blocks[i + 1].n - 1e-12) { blocks[i].sum += blocks[i + 1].sum; blocks[i].n += blocks[i + 1].n; blocks.splice(i + 1, 1); if (i > 0) i--; } else i++; } return blocks.flatMap((b) => Array(b.n).fill(b.sum / b.n)); }
  const nonDecreasing = (a) => nonIncreasing(a.map((v) => -v)).map((v) => -v);
  function baselineOf(rows) { return { med20: med(rows.map((i) => Y.r20[i])), share20: shareUp(rows.map((i) => Y.r20[i])), med60: med(rows.map((i) => Y.r60[i])), share60: shareUp(rows.map((i) => Y.r60[i])), dip20: med(rows.map((i) => Y.dip20[i])), dip60: med(rows.map((i) => Y.dip60[i])), n: rows.length }; }
  const yOf = (i, t, B) => { const r = t.endsWith("20") ? Y.r20[i] : Y.r60[i]; if (r == null) return null; return t[0] === "m" ? r - (t.endsWith("20") ? B.med20 : B.med60) : (r > 0 ? 1 : 0) - (t.endsWith("20") ? B.share20 : B.share60); };
  function fitAdditive(rows, keys, B = baselineOf(rows), hz = null, mono = null) {
    const n = rows.length, y = Object.fromEntries(TG.map((t) => [t, rows.map((i) => yOf(i, t, B))]));
    const P = keys.map((key) => { const vals = rows.map((i) => X[key][i]), present = fin(vals).sort((a, b) => a - b), q = []; for (let k = 0; k <= 100; k++) q.push(+pctl(present, k).toFixed(6));
      return { key, q, us: vals.map((v) => (v == null || !isFinite(v) ? null : E.placeOf(q, v))), evenings: present.length, gm20: E.FGRID.map(() => 0), gp20: E.FGRID.map(() => 0), gm60: E.FGRID.map(() => 0), gp60: E.FGRID.map(() => 0), fit: Object.fromEntries(TG.map((t) => [t, new Float64Array(n)])) }; });
    for (let round = 0; round < 3; round++) for (const p of P) for (const t of TG) { if (hz && hz[p.key] && !hz[p.key].includes(+t.slice(1))) continue; const ks = []; for (let k = 0; k < n; k++) if (p.us[k] != null && y[t][k] != null) ks.push(k);
      const us = ks.map((k) => p.us[k]), res = ks.map((k) => { let s = y[t][k]; for (const o of P) if (o !== p) s -= o.fit[t][k]; return s; });
      let c = kernelCurve(us, res, t[0] === "m"); if (mono && mono[p.key]) c = mono[p.key] === "up" ? nonDecreasing(c) : nonIncreasing(c); const cm = mean(us.map((u) => E.curveAt(c, u))) || 0; c = c.map((v) => v - cm); p[CUR[t]] = c; p.fit[t].fill(0); for (const k of ks) p.fit[t][k] = E.curveAt(c, p.us[k]); }
    const tot = Object.fromEntries(TG.map((t) => [t, Array.from({ length: n }, (_, k) => P.reduce((a, p) => a + p.fit[t][k], 0))]));
    const scale = { sM20: sd(tot.m20) || 1, sP20: sd(tot.p20) || 1, sM60: sd(tot.m60) || 1, sP60: sd(tot.p60) || 1 };
    const votes = Array.from({ length: n }, (_, k) => (tot.m20[k] / scale.sM20 + tot.p20[k] / scale.sP20 + tot.m60[k] / scale.sM60 + tot.p60[k] / scale.sP60) / 4);
    scale.centre = med(votes) || 0; const span = (pctl(votes, 97.5) - pctl(votes, 2.5)) || 1; scale.gain = 100 / span;
    return { keys, B, scale, parts: P.map((p) => ({ key: p.key, q: p.q, evenings: p.evenings, gm20: p.gm20.map(r5), gp20: p.gp20.map(r5), gm60: p.gm60.map(r5), gp60: p.gp60.map(r5) })) }; }
  const fittedAt = (M, i, t) => { let s = 0; for (const p of M.parts) { const z = X[p.key][i]; if (z == null) return null; s += E.curveAt(p[CUR[t]], E.placeOf(p.q, z)); } return s; };

  /* ---------- the evenings (lines 78–81, 108) ---------- */
  const FROM = ix["2009-03-10"], rowsBetween = (a, b, lastOutcome = null) => { const out = []; const end = lastOutcome != null ? lastOutcome : LAST; for (let i = a; i <= Math.min(b, LAST); i++) { if (i + 60 > end) break; out.push(i); } return out; };
  const lastOf = (year) => { let k = -1; for (let i = 0; i < N; i++) if (dates[i] <= year + "-12-31") k = i; return k; }, firstOf = (year) => dates.findIndex((d) => d >= year + "-01-01");
  const fitRows = (toYear, from = FROM) => rowsBetween(from, lastOf(toYear), lastOf(toYear)), testRows = (fromYear) => { const out = []; for (let i = firstOf(fromYear); i + 20 <= LAST; i++) out.push(i); return out; };
  const ALLROWS = rowsBetween(FROM, LAST);
  const F17 = fitRows(2017), T18 = testRows(2018), F15 = fitRows(2015), T16 = testRows(2016), F19 = fitRows(2019), T20 = testRows(2020), F17w = fitRows(2017, ix["2007-06-01"] ?? 0);

  /* ---------- the replay (lines 152–155): the invested share is set at a close and earns the next session; cash earns the 3-month bill;
     the blend of SPY and QQQ without payouts; no costs. costPerUnit (mine) charges that fraction of every dollar moved, when asked. ---------- */
  const bill = (() => { const b = fs.existsSync(path.join(CACHE, "US3M_D.json")) ? onClock("US3M") : null; return dates.map((_, i) => (b && b.c[i] != null ? b.c[i] / 100 / 252 : 0)); })();
  function replay(investedOf, a, b, costPerUnit = 0) { let v = 1, peak = 1, worst = 0, sum = 0, n = 0, prevW = null, moved = 0; for (let i = a + 1; i <= b; i++) { const w = investedOf(i - 1); if (w == null) continue; if (prevW != null) { const t = Math.abs(w - prevW); moved += t; if (costPerUnit) v *= 1 - t * costPerUnit; } prevW = w; v *= 1 + w * dayRet[i] + (1 - w) * bill[i]; if (v > peak) peak = v; worst = Math.min(worst, v / peak - 1); sum += w; n++; } return { became: r3(v), worstFall: r1(worst * 100), invested: r1((sum / n) * 100), movedPerSession: r2((moved / Math.max(1, n - 1)) * 100) }; }

  return { E, CACHE, dates, N, LAST, ix, bars, hygTR, hygF, S, RD, X, IND, spy, qqq, blendPath, Y, dayRet, bill, TG, CUR, kernelCurve, nonIncreasing, nonDecreasing, baselineOf, yOf, fitAdditive, fittedAt, FROM, rowsBetween, lastOf, firstOf, fitRows, testRows, ALLROWS, F17, T18, F15, T16, F19, T20, F17w, replay };
}
