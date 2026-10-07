/* RL1 (7 Oct 2026) — THE FIVE MARKETS OF THE MONEY PANEL, READ FROM THE DEPLOYMENT MATRIX VERSION 2 ON LIVE PRICES.

   The panel at the top of the tool (index.html, #scenbars) drew its five bars from a file of version 1's numbers
   (33 / 22 / 44 / 88 / 84 — the readings DM2 showed to carry an artefact: a calm 1.5% dip LOWERED the number). This module
   gives the same five rows from version 2's engine, on the very series the matrix's own line reads in step 2, so the top of
   the page and step 2 can never disagree about today.

   The rule for a market is DM2's own (scripts/dm2-build.mjs, inputsFor): the fall happens in sessions of about 1% (−1.5% is one
   session), QQQ falls its past-year beta times as far, the 100-day averages and the RSI are recomputed along the path, and the
   VIX is placed in its own past year. Nothing is fitted here and no number is typed in.
     today   the matrix's line (the average of three evenings) — the number step 2 shows — with this minute's reading beside it
     a       the S&P down 1.5% in one session, the VIX left where it is
     b       the S&P down 3% over three sessions, the VIX at 20
     c       the S&P down 5% over five sessions, the VIX at 23.5
     d       a panic: the S&P down 8% over ten sessions (the RSI under 35), the VIX in the top 5% of its year
             (26, or half a point over the year's 95th-percentile level when that is higher)
   The VIX walks to its level in a straight line over the same sessions. Pure: no fetch, no DOM, no key. */
import { alignCloses, inputsAt } from "./live.mjs";
import { deploy2, money } from "./engine.mjs";

export const MARKETS = [
  { key: "a", fall: 1.5, sessions: 1, vix: null },
  { key: "b", fall: 3, sessions: 3, vix: 20 },
  { key: "c", fall: 5, sessions: 5, vix: 23.5 },
  { key: "d", fall: 8, sessions: 10, vix: "top5" },
];
export const PANIC_VIX = 26, PANIC_PLACE = 95;

/* the series the live line read: the daily closes, with today's session joined on once the market has traded */
export function seriesOf(st) {
  const S0 = alignCloses(st.candles), R = st.read;
  if (!R || !R.live || S0.dates[S0.dates.length - 1] >= R.session) return S0;
  const d = R.inputs.detail;
  return { dates: S0.dates.concat(R.session), SPY: S0.SPY.concat(d.spy), QQQ: S0.QQQ.concat(d.qqq), HYG: S0.HYG.concat(d.hyg), TLT: S0.TLT.concat(d.tlt), GLD: S0.GLD.concat(d.gld), VIX: S0.VIX.concat(d.vix) };
}

/* how far QQQ falls for each 1% of SPY's: the slope of QQQ's daily returns on SPY's over the past year (DM2's rule) */
export function betaOf(S, k, win = 252) {
  const xs = [], ys = [];
  for (let i = Math.max(1, k - win + 1); i <= k; i++) { if (S.SPY[i] == null || S.SPY[i - 1] == null || S.QQQ[i] == null || S.QQQ[i - 1] == null) continue; xs.push(S.SPY[i] / S.SPY[i - 1] - 1); ys.push(S.QQQ[i] / S.QQQ[i - 1] - 1); }
  if (xs.length < 60) return 1;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length; let sxy = 0, sxx = 0;
  for (let j = 0; j < xs.length; j++) { sxy += (xs[j] - mx) * (ys[j] - my); sxx += (xs[j] - mx) ** 2; }
  return sxx > 0 ? sxy / sxx : 1;
}

/* the VIX level a share `place` of its last year's closes sit under */
export function vixLevelAt(S, k, place, win = 252) {
  const v = []; for (let i = Math.max(0, k - win + 1); i <= k; i++) if (S.VIX[i] != null) v.push(S.VIX[i]);
  if (!v.length) return null; v.sort((a, b) => a - b);
  const x = (place / 100) * (v.length - 1), lo = Math.floor(x), hi = Math.ceil(x); return v[lo] + (v[hi] - v[lo]) * (x - lo);
}

const weekdaysAfter = (iso, n) => { const out = [], d = new Date(iso + "T12:00:00Z"); while (out.length < n) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) out.push(d.toISOString().slice(0, 10)); } return out; };
const steps = (base, n, total) => Array.from({ length: n }, (_, i) => base * (1 + total) ** ((i + 1) / n));
const walk = (from, to, n) => Array.from({ length: n }, (_, i) => from + (to - from) * ((i + 1) / n));
const hold = (x, n) => Array.from({ length: n }, () => x);

/* the series with one market's fall joined on: { series, vix, beta } */
export function shocked(S, m) {
  const k = S.dates.length - 1, n = m.sessions, beta = betaOf(S, k), f = -m.fall / 100;
  const top = vixLevelAt(S, k, PANIC_PLACE), vix = m.vix === "top5" ? Math.max(PANIC_VIX, (top ?? PANIC_VIX) + 0.5) : m.vix == null ? S.VIX[k] : m.vix;
  return { beta, vix, series: { dates: S.dates.concat(weekdaysAfter(S.dates[k], n)), SPY: S.SPY.concat(steps(S.SPY[k], n, f)), QQQ: S.QQQ.concat(steps(S.QQQ[k], n, beta * f)),
    HYG: S.HYG.concat(hold(S.HYG[k], n)), TLT: S.TLT.concat(hold(S.TLT[k], n)), GLD: S.GLD.concat(hold(S.GLD[k], n)), VIX: S.VIX.concat(m.vix == null ? hold(vix, n) : walk(S.VIX[k], vix, n)) } };
}

/* the five rows. st is the live line's own state (study/dm2/live.mjs startLiveMatrix): { base, candles, read }.
   Returns { rows, session, live, agree } — agree says the series rebuilt here gives the inputs the line itself read. */
export function fiveMarkets(st) {
  const base = st && st.base, R = st && st.read; if (!base || !R || !st.candles) return null;
  const S = seriesOf(st), k = S.dates.length - 1, here = inputsAt(S, k, base), d0 = R.reading;
  const agree = here.rsi != null && here.vixPct != null && Math.abs(here.rsi - R.inputs.rsi) < 1e-6 && Math.abs(here.vixPct - R.inputs.vixPct) < 1e-6 && Math.abs((here.break100 ?? 0) - (R.inputs.break100 ?? 0)) < 1e-6;
  const rows = [{ key: "today", pct: d0.line, now: d0.pct, spy: R.inputs.detail.spy, rsi: R.inputs.rsi, vix: R.inputs.vixLevel, vixPct: R.inputs.vixPct, break100: R.inputs.break100, micron: money(d0.line).micron, thin: !!d0.thinSpot, sessions: 0, fall: 0 }];
  for (const m of MARKETS) {
    try { const X = shocked(S, m), T = X.series, j = T.dates.length - 1, inp = inputsAt(T, j, base), d = deploy2(inp, base.model);
      rows.push({ key: m.key, pct: d.pct, now: null, spy: T.SPY[j], rsi: inp.rsi, vix: X.vix, vixPct: inp.vixPct, break100: inp.break100, micron: money(d.pct).micron, thin: !!d.thinSpot, sessions: m.sessions, fall: m.fall });
    } catch (e) { rows.push({ key: m.key, error: String((e && e.message) || e) }); }
  }
  return { rows, session: R.session, live: !!R.live, agree, modelAsOf: base.asOf || null };
}
