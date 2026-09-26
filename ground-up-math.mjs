/* GROUND UP — the allocation read, rebuilt from the beginning (26 Sep 2026).
   Pure arithmetic. No fetch, no DOM. The page (ground-up.html) and the tests
   (tests/ground-up.test.mjs) both import this file, so what is tested is what runs.

   Order of the read:  voters → heat → heat against its OWN history → condition
                       → % invested (grid A × risk dial) → large-cap share (grid B
                       + rotation tilt) → operator inputs → one sentence.

   Alan, 26 Sep: no universal bands. "The Geiger of Micron is never going to go as
   red as the Geiger of Bitcoin." So the condition is read as a PERCENTILE of the
   heat's own history, and the fixed −0.5/−0.2/+0.2/+0.5 bands survive only as a
   labelled reference. Every default below is a dial on the page. */

export const clamp = (x, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
const num = x => (x === null || x === undefined || x === '' || Number.isNaN(+x)) ? null : +x;

/* ---------- 1 · VOTERS — the same formulas the live tool uses (index.html voters()) ----------
   `day` is one day's raw inputs:
     g: {SPY,QQQ,IWM,SMH,RSP,BTCUSD,CLUSD,GCUSD,XLP,XLU,MAGS,HYG,TLT}  geiger composites −1..+1
     vix, vixRatio (spot ÷ 3m), skew, y2, y10, adv, dec, advVol, decVol, trin
   `dials` carries the two macro endpoints the tool exposes: vixCold (default 30), tenCold (4.8). */
export const TOOL_DEFAULTS = {
  vixCold: 30, tenCold: 4.8,
  wts: { SPY: 1, QQQ: 1, IWM: 0.5, SMH: 0.5, VIX: 0.5, US10Y: 0.5, OIL: 0.5, VALUE: 0, CRYPTO: 0.25, DEF: 0.25,
    BREADTH_EW: 0.5, BREADTH_SC: 0.25, VIX_TERM: 0.25, CURVE: 0.5, SKEW: 0.25, ADLINE: 0.5, TRIN: 0.25,
    B_VOL: 0.25, CONC: 0.5, CREDIT: 0.5, DURATION: 0.25, HAVEN: 0.25 }
};
export const GEIGER_SYMS = ['SPY', 'QQQ', 'IWM', 'SMH', 'RSP', 'BTCUSD', 'CLUSD', 'GCUSD', 'XLP', 'XLU', 'MAGS', 'HYG', 'TLT'];

const f2 = x => x == null ? '—' : (x >= 0 ? '+' : '') + (+x).toFixed(2);
const pctf = (x, d = 0) => x == null ? '—' : (+x).toFixed(d) + '%';

/* Each voter: key · name · how it is read · what its value says in plain words. */
export function computeVoters(day, dials = TOOL_DEFAULTS) {
  const g = k => num(day?.g?.[k]);
  const vixCold = +(dials.vixCold ?? 30), tenCold = +(dials.tenCold ?? 4.8);
  const vix = num(day?.vix), ratio = num(day?.vixRatio), skew = num(day?.skew);
  const y2 = num(day?.y2), y10 = num(day?.y10), trin = num(day?.trin);
  const adv = num(day?.adv), dec = num(day?.dec), advVol = num(day?.advVol), decVol = num(day?.decVol);
  const spread = (a, b) => (g(a) != null && g(b) != null) ? clamp(g(a) - g(b)) : null;
  const sign = (v, hotWord, coldWord) => v == null ? 'no reading' : v > 0.05 ? hotWord : v < -0.05 ? coldWord : 'about neutral';
  const V = [];
  const push = (key, name, val, reading, says) => V.push({ key, name, val: val == null ? null : +val, reading, says });

  push('SPY', 'SPY geiger', g('SPY'), 'geiger, straight', v => `the S&P is ${sign(v, 'stretched', 'washed out')} on its own scale`);
  push('QQQ', 'QQQ geiger', g('QQQ'), 'geiger, straight', v => `growth is ${sign(v, 'the stretched side', 'the beaten-down side')}`);
  push('IWM', 'IWM geiger', g('IWM'), 'geiger, straight', v => `small caps are ${sign(v, 'hot', 'cold')}`);
  push('SMH', 'SMH geiger', g('SMH'), 'geiger, straight', v => `semis are ${sign(v, 'stretched', 'broken')}`);
  push('VIX', 'VIX level (inverted)', vix == null ? null : clamp(((vixCold + 12) / 2 - vix) / ((vixCold - 12) / 2)), `+1 at 12 · −1 at ${vixCold}`,
    v => vix == null ? 'no reading' : `VIX ${vix.toFixed(1)} — ${v > 0.05 ? 'calm, votes hot' : v < -0.05 ? 'fear, votes cold' : 'neither calm nor fearful'}`);
  push('US10Y', 'US 10-year (inverted)', y10 == null ? null : clamp(((tenCold + 3.5) / 2 - y10) / ((tenCold - 3.5) / 2)), `+1 at 3.5% · −1 at ${tenCold}%`,
    v => y10 == null ? 'no reading' : `10-year ${y10.toFixed(2)}% — rates are ${v > 0.05 ? 'fuel' : v < -0.05 ? 'a drag' : 'neutral'}`);
  push('OIL', 'Oil (inverted)', g('CLUSD') == null ? null : clamp(-g('CLUSD')), 'geiger, inverted', v => `crude is ${sign(-v, 'hot: inflation pressure', 'breaking down: relief')}`);
  push('VALUE', 'Value (RSP)', g('RSP'), 'geiger, straight · weight 0 by design', v => `the equal-weight tape is ${sign(v, 'strong', 'weak')}`);
  push('CRYPTO', 'Crypto (BTC)', g('BTCUSD'), 'geiger, straight', v => `risk appetite is ${sign(v, 'running hot', 'coming off')}`);
  push('DEF', 'Defensives (inverted)', (g('XLP') != null && g('XLU') != null) ? clamp(-(g('XLP') + g('XLU')) / 2) : null, 'XLP+XLU geiger, inverted',
    v => `money is ${sign(-v, 'hiding in defensives', 'not paying for safety')}`);
  push('BREADTH_EW', 'Equal-weight vs index', spread('RSP', 'SPY'), 'RSP − SPY', v => `the average stock is ${sign(v, 'stronger than the index', 'colder than the index')}`);
  push('BREADTH_SC', 'Small vs large', spread('IWM', 'SPY'), 'IWM − SPY', v => `small caps are ${sign(v, 'hotter than large', 'colder than large')}`);
  push('VIX_TERM', 'VIX term (spot ÷ 3m)', ratio == null ? null : clamp((1 - ratio) * 4), 'above 1.00 = stress now',
    v => ratio == null ? 'no reading' : `ratio ${ratio.toFixed(3)} — ${ratio > 1 ? 'stress priced now' : 'no stress priced now'}`);
  push('CURVE', 'Yield curve (10y − 2y)', (y10 != null && y2 != null) ? clamp((y10 - y2) / 1.5) : null, 'negative = inverted',
    v => (y10 != null && y2 != null) ? `${(y10 - y2).toFixed(2)}% — the curve is ${y10 - y2 < 0 ? 'inverted' : 'upward'}` : 'no reading');
  push('SKEW', 'SKEW (put protection)', skew == null ? null : clamp((135 - skew) / 25), 'above ~135 = paying up for puts',
    v => skew == null ? 'no reading' : `SKEW ${skew.toFixed(1)} — ${skew > 135 ? 'downside protection is bid' : 'protection is cheap'}`);
  const ad = (adv != null && dec != null && adv + dec > 0) ? (adv - dec) / (adv + dec) : null;
  push('ADLINE', 'Advance / decline', ad == null ? null : clamp(ad * 2), 'net advancers ÷ issues, ×2',
    v => ad == null ? 'no reading' : `${adv} up / ${dec} down — ${ad > 0.05 ? 'more rising than falling' : ad < -0.05 ? 'more falling than rising' : 'even'}`);
  push('TRIN', 'TRIN (inverted)', trin == null ? null : clamp((1 - trin) * 2), 'below 1.00 = volume confirms',
    v => trin == null ? 'no reading' : `TRIN ${trin.toFixed(3)} — volume ${trin < 1 ? 'is going with the advance' : 'is not paying for the advance'}`);
  const uv = (advVol != null && decVol != null && advVol > 0 && decVol > 0) ? (advVol - decVol) / (advVol + decVol) : null;
  push('B_VOL', 'Up vs down volume', uv == null ? null : clamp(uv * 3), 'net up-volume, ×3',
    v => uv == null ? 'no reading' : `${(uv * 100).toFixed(1)}% net up-volume`);
  const conc = (g('MAGS') != null && g('SPY') != null) ? clamp(-(g('MAGS') - g('SPY'))) : null;
  push('CONC', 'Concentration (inverted)', conc, 'MAGS − SPY, inverted', v => `mega-caps are ${sign(-v, 'carrying the tape', 'lagging the tape')}`);
  push('CREDIT', 'Credit (HYG)', g('HYG'), 'geiger, straight', v => `high yield is ${sign(v, 'bid', 'soft')}`);
  push('DURATION', 'Duration (TLT)', g('TLT'), 'geiger, straight', v => `long treasuries are ${sign(v, 'bid', 'being sold')}`);
  push('HAVEN', 'Gold (inverted)', g('GCUSD') == null ? null : clamp(-g('GCUSD')), 'geiger, inverted', v => `the haven bid is ${sign(-v, 'on', 'off')}`);
  for (const v of V) v.says = v.says(v.val);
  return V;
}

/* HEAT = Σ value × weight ÷ Σ weight, over voters that have a value. Same as the tool's heat(). */
export function heat(voters, wts = TOOL_DEFAULTS.wts) {
  let n = 0, d = 0, used = 0, total = 0;
  for (const v of voters) { const w = +(wts[v.key] ?? 0); if (!w) continue; total += w; if (v.val == null) continue; n += v.val * w; d += w; used += w; }
  return { H: d ? n / d : null, coverage: total ? used / total : 0 };
}
/* Counterfactual: heat with one voter's weight set to w. */
export function heatWith(voters, wts, key, w) {
  return heat(voters, { ...wts, [key]: w }).H;
}

/* ---------- 2 · HISTORY — a value against its OWN past ----------
   percentileRank: share of history at or below x, ties counted half (0..1). Needs ≥ minN points. */
export function percentileRank(series, x, minN = 20) {
  const s = series.filter(v => v != null && Number.isFinite(v));
  if (x == null || s.length < minN) return null;
  let below = 0, eq = 0;
  for (const v of s) { if (v < x) below++; else if (v === x) eq++; }
  return (below + 0.5 * eq) / s.length;
}
export function zScore(series, x, minN = 20) {
  const s = series.filter(v => v != null && Number.isFinite(v));
  if (x == null || s.length < minN) return null;
  const m = s.reduce((a, b) => a + b, 0) / s.length;
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / s.length);
  return sd > 1e-9 ? (x - m) / sd : 0;   // a flat series has no spread; floating error must not read as ±1
}
export function quantile(series, q) {
  const s = series.filter(v => v != null && Number.isFinite(v)).sort((a, b) => a - b);
  if (!s.length) return null;
  const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
export function seriesStats(series) {
  const s = series.filter(v => v != null && Number.isFinite(v));
  if (!s.length) return { n: 0 };
  return { n: s.length, min: Math.min(...s), max: Math.max(...s), p10: quantile(s, .1), p30: quantile(s, .3), p50: quantile(s, .5), p70: quantile(s, .7), p90: quantile(s, .9) };
}

/* Reconstruct the heat day by day from each voter's daily history, with the SAME weights and
   formulas. A day counts only when enough of the active weight had a value (default 60%),
   otherwise the number would be a different committee wearing the same name. */
export function heatSeries(days, wts = TOOL_DEFAULTS.wts, dials = TOOL_DEFAULTS, minCoverage = 0.6) {
  const out = [];
  for (const day of days) {
    const { H, coverage } = heat(computeVoters(day, dials), wts);
    if (H != null && coverage >= minCoverage) out.push({ date: day.date, H, coverage });
  }
  return out;
}

/* ---------- 3 · CONDITION ----------
   On the heat's own history: percentile edges (a dial; defaults 10 / 30 / 70 / 90).
   The fixed scale (−0.5 / −0.2 / +0.2 / +0.5) is kept ONLY as a labelled reference. */
export const CONDITION_WORDS = ['DEEP OVERSOLD', 'OVERSOLD', 'NEUTRAL', 'OVERBOUGHT', 'DEEP OVERBOUGHT'];
export const DEFAULT_EDGES = { deepCold: 0.10, cold: 0.30, hot: 0.70, deepHot: 0.90 };
export function conditionFromPercentile(p, edges = DEFAULT_EDGES) {
  if (p == null) return null;
  if (p <= edges.deepCold) return CONDITION_WORDS[0];
  if (p <= edges.cold) return CONDITION_WORDS[1];
  if (p >= edges.deepHot) return CONDITION_WORDS[4];
  if (p >= edges.hot) return CONDITION_WORDS[3];
  return CONDITION_WORDS[2];
}
export function conditionFromFixedScale(h) {
  if (h == null) return null;
  if (h <= -0.5) return CONDITION_WORDS[0];
  if (h <= -0.2) return CONDITION_WORDS[1];
  if (h >= 0.5) return CONDITION_WORDS[4];
  if (h >= 0.2) return CONDITION_WORDS[3];
  return CONDITION_WORDS[2];
}

/* ---------- 4 · THE GRIDS (Alan's Cockpit, extended to the MODEL's five anchors) ----------
   x runs 0 → 1 along the condition: 0 = most washed out, 0.5 = neutral, 1 = most stretched.
   Under the default reading x IS the percentile; under the fixed-scale reference x = (H+1)/2.
   Anchors sit at x = 0, .25, .5, .75, 1  ≙  MODEL −1, −.5, 0, +.5, +1  ≙  —, Oversold, Neutral, Overbought, —.
   Cockpit grid A (% invested)      Conservative 60/40/20 · Balanced 80/50/30 · Aggressive 100/70/40
   Cockpit grid B (large-cap share) Conservative 50/60/75 · Balanced 25/30/50 · Aggressive 15/20/40
   The two OUTER anchors per column are not on the Cockpit; they are stated defaults (Balanced's
   100 and 15 come from the MODEL; the other four are mine and are dials). */
export const ANCHOR_X = [0, 0.25, 0.5, 0.75, 1];
export const GRID_A = { // % invested
  conservative: [75, 60, 40, 20, 10],
  balanced: [100, 80, 50, 30, 15],
  aggressive: [100, 100, 70, 40, 25]
};
export const GRID_B = { // large-cap share of what is invested, %
  conservative: [40, 50, 60, 75, 85],
  balanced: [20, 25, 30, 50, 60],
  aggressive: [10, 15, 20, 40, 50]
};
export const RISK_LEVELS = ['conservative', 'balanced', 'aggressive'];

/* Piecewise-linear interpolation through (xs, ys); flat beyond the ends. */
export function interp(x, xs, ys) {
  if (x == null) return null;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) { const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[i - 1] + t * (ys[i] - ys[i - 1]); }
  return ys[ys.length - 1];
}
/* Risk R is continuous 0..2 (0 conservative · 1 balanced · 2 aggressive); between columns we blend. */
export function gridAt(grid, x, R) {
  const r = clamp(+R, 0, 2), lo = Math.floor(r), hi = Math.min(2, lo + 1), t = r - lo;
  const a = interp(x, ANCHOR_X, grid[RISK_LEVELS[lo]]), b = interp(x, ANCHOR_X, grid[RISK_LEVELS[hi]]);
  return a + (b - a) * t;
}
export const investedPct = (x, R = 1, grid = GRID_A) => gridAt(grid, x, R);
export const lcBasePct = (x, R = 1, grid = GRID_B) => gridAt(grid, x, R);
export function riskName(R) { const r = clamp(+R, 0, 2); if (Math.abs(r - Math.round(r)) < 1e-9) return RISK_LEVELS[Math.round(r)]; return `${(1 - (r % 1)).toFixed(2)} ${RISK_LEVELS[Math.floor(r)]} / ${(r % 1).toFixed(2)} ${RISK_LEVELS[Math.ceil(r)]}`; }

/* Rotation tilt: +tiltCoef points × (geiger IWM − geiger SPY). Small caps hotter than large → lean large.
   Capped 10–90 after the tilt. */
export const LC_CAP = [10, 90];
export function lcSharePct(x, R, spread, tiltCoef = 25, grid = GRID_B) {
  const base = lcBasePct(x, R, grid);
  const tilt = spread == null ? 0 : tiltCoef * spread;
  return { base, tilt, lc: clamp(base + tilt, LC_CAP[0], LC_CAP[1]) };
}

/* ---------- 5 · OPERATOR INPUTS — the conditions that cannot be put in maths ----------
   Each: {id, name, reason, target: 'heat'|'invested'|'lc', amount, on}. heat is in heat units
   (e.g. −0.10), invested and lc in percentage points. Applied AFTER the grids. */
export const OPERATOR_TEMPLATES = [
  { id: 'ai-leadership', name: 'AI is leadership', reason: 'Mega-cap AI names carry the tape; the large-cap sleeve should hold more of what is invested.', target: 'lc', amount: 10, on: false },
  { id: 'rates-headwind', name: 'Rates are a headwind', reason: 'Yields above 5% hurt long-duration equity; keep a little more in cash than the grid says.', target: 'invested', amount: -5, on: false }
];
export function applyOperatorInputs(base, inputs = []) {
  let dHeat = 0, dInv = 0, dLc = 0;
  const effects = [];
  for (const i of inputs) {
    if (!i || !i.on || !Number.isFinite(+i.amount)) { effects.push({ id: i?.id, applied: 0, target: i?.target }); continue; }
    const a = +i.amount;
    if (i.target === 'heat') dHeat += a; else if (i.target === 'invested') dInv += a; else if (i.target === 'lc') dLc += a;
    effects.push({ id: i.id, applied: a, target: i.target });
  }
  return { dHeat, dInv, dLc, effects };
}

/* ---------- 6 · THE WHOLE READ ----------
   state = { today (day object), history (array of day objects), wts, dials:{vixCold,tenCold},
             risk (0..2), tiltCoef, basis:'own'|'fixed', edges, operator:[...], gridA, gridB } */
export function computeRead(state) {
  const wts = state.wts || TOOL_DEFAULTS.wts, dials = state.dials || TOOL_DEFAULTS;
  const voters = computeVoters(state.today, dials);
  const { H: H0, coverage } = heat(voters, wts);
  const ops = applyOperatorInputs({}, state.operator || []);
  const H = H0 == null ? null : clamp(H0 + ops.dHeat);
  const hist = heatSeries(state.history || [], wts, dials);
  const hVals = hist.map(r => r.H);
  const p = percentileRank(hVals, H), z = zScore(hVals, H), stats = seriesStats(hVals);
  const basis = state.basis === 'fixed' ? 'fixed' : 'own';
  const x = H == null ? null : (basis === 'own' ? (p == null ? (H + 1) / 2 : p) : (H + 1) / 2);
  const basisUsed = basis === 'own' && p == null && H != null ? 'fixed (not enough history)' : basis;
  const condition = basisUsed === 'own' ? conditionFromPercentile(p, state.edges || DEFAULT_EDGES) : conditionFromFixedScale(H);
  const refCondition = conditionFromFixedScale(H);
  const R = state.risk ?? 1, tiltCoef = state.tiltCoef ?? 25;
  const invGrid = x == null ? null : investedPct(x, R, state.gridA || GRID_A);
  const invested = invGrid == null ? null : clamp(invGrid + ops.dInv, 0, 100);
  const gI = num(state.today?.g?.IWM), gS = num(state.today?.g?.SPY);
  const spread = (gI != null && gS != null) ? gI - gS : null;
  const split = x == null ? null : lcSharePct(x, R, spread, tiltCoef, state.gridB || GRID_B);
  const lc = split == null ? null : clamp(split.lc + ops.dLc, LC_CAP[0], LC_CAP[1]);
  // per-voter own-history position
  const perVoter = voters.map(v => {
    const series = (state.history || []).map(d => { const vv = computeVoters(d, dials).find(q => q.key === v.key); return vv ? vv.val : null; });
    return { ...v, w: +(wts[v.key] ?? 0), pct: percentileRank(series, v.val), z: zScore(series, v.val), stats: seriesStats(series), muteEffect: (H0 == null || !(wts[v.key] ?? 0)) ? null : heatWith(voters, wts, v.key, 0) };
  });
  return {
    voters: perVoter, H0, H, coverage, hist, stats, p, z, basis: basisUsed, x, condition, refCondition,
    R, riskName: riskName(R), tiltCoef, invGrid, invested, spread, split, lc, sc: lc == null ? null : 100 - lc, ops,
    sentence: outputSentence({ H, p, condition, riskName: riskName(R), invested, spread, lc, gI, gS, basis: basisUsed, ops })
  };
}

/* ---------- 7 · SENTENCES ---------- */
/* Where a value sits in ITS OWN range, in words. The raw sign is not the condition (Alan, 26 Sep). */
export function ownWord(p, edges = DEFAULT_EDGES) {
  if (p == null) return null;
  if (p <= edges.deepCold) return 'at the cold end of its own range';
  if (p <= edges.cold) return 'cooler than its usual';
  if (p >= edges.deepHot) return 'at the hot end of its own range';
  if (p >= edges.hot) return 'hotter than its usual';
  return 'around its usual';
}
export function voterSentence(v, edges = DEFAULT_EDGES) {
  if (v.val == null) return `${v.name}: no reading today (weight ${v.w}); it abstains.`;
  const weight = v.w ? `weight ${v.w}` : 'weight 0, reading only';
  if (v.pct == null) return `${v.name} reads ${f2(v.val)} (${weight}): ${v.says}; not enough of its own history to place it.`;
  const ow = ownWord(v.pct, edges);
  const rawHot = v.val > 0.05, rawCold = v.val < -0.05, ownHot = v.pct >= edges.hot, ownCold = v.pct <= edges.cold;
  const clash = (rawHot && ownCold) ? ' — the raw sign says hot, its own history says cool' : (rawCold && ownHot) ? ' — the raw sign says cold, its own history says warm' : '';
  return `${v.name} reads ${f2(v.val)} (${weight}): ${ow}, ${Math.round(v.pct * 100)}th percentile of its own history, Z ${f2(v.z)}${clash}. ${cap(v.says)}.`;
}
export function outputSentence(o) {
  if (o.H == null) return 'Heat cannot be read: no voter has a value.';
  const cond = (o.condition || '—').toLowerCase();
  const where = o.basis === 'own' && o.p != null ? `${Math.round(o.p * 100)}th percentile of its own history` : 'read on the fixed reference scale';
  const s1 = `Heat ${f2(o.H)} — ${cond} (${where}).`;
  const s2 = `${cap(o.riskName)} policy: ${pctf(o.invested)} invested${o.ops?.dInv ? ` (${o.ops.dInv > 0 ? '+' : ''}${o.ops.dInv} pts from operator inputs)` : ''}.`;
  let s3;
  if (o.spread == null) s3 = `No IWM-vs-SPY read, so the split stays on the grid: ${Math.round(o.lc)} / ${Math.round(100 - o.lc)} large / small.`;
  else {
    const lean = o.spread > 0.02 ? 'Small caps are hotter than large' : o.spread < -0.02 ? 'Large caps are hotter than small' : 'Small and large read alike';
    const so = o.spread > 0.02 ? 'so the split leans large' : o.spread < -0.02 ? 'so the split leans small' : 'so the split sits on the grid';
    s3 = `${lean} (IWM ${f2(o.gI)} vs SPY ${f2(o.gS)}), ${so}: ${Math.round(o.lc)} / ${Math.round(100 - o.lc)}${o.ops?.dLc ? ` (${o.ops.dLc > 0 ? '+' : ''}${o.ops.dLc} pts large from operator inputs)` : ''}.`;
  }
  return `${s1} ${s2} ${s3}`;
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/* "What changed when you moved a dial": compare two reads. */
export function diffSentence(prev, next, what) {
  if (!prev || !next) return '';
  const parts = [];
  const d = (a, b, fmt, name) => { if (a == null || b == null) return; if (Math.abs(a - b) < 0.005) return; parts.push(`${name} ${fmt(a)} → ${fmt(b)}`); };
  d(prev.H, next.H, f2, 'heat');
  if (prev.condition !== next.condition) parts.push(`condition ${prev.condition} → ${next.condition}`);
  d(prev.invested, next.invested, v => Math.round(v) + '%', 'invested');
  d(prev.lc, next.lc, v => Math.round(v) + ' / ' + Math.round(100 - v), 'split');
  const head = what ? `${what}: ` : '';
  return parts.length ? head + parts.join(' · ') + '.' : head + 'nothing in the read changed.';
}

/* ---------- 8 · DAY BUILDERS — turn table rows into day objects (used by the page, tested here) ---------- */
/* fan_daily + momentum_daily → daily composite = 0.5 × trend + 0.5 × momentum (the composite_staged recipe). */
export function buildHistoryDays({ fan = {}, mom = {}, vix = [], treas = [], internals = [] }) {
  const days = new Map();
  const at = d => { if (!days.has(d)) days.set(d, { date: d, g: {} }); return days.get(d); };
  for (const sym of Object.keys(fan)) {
    const m = new Map((mom[sym] || []).map(r => [r.asof, num(r.read)]));
    for (const r of fan[sym]) { const t = num(r.read), mo = m.get(r.asof); if (t == null || mo == null) continue; at(r.asof).g[sym] = clamp(0.5 * t + 0.5 * mo); }
  }
  for (const r of vix) { const d = at(r.date); d.vix = num(r.vix); d.vixRatio = num(r.ratio); d.skew = num(r.skew); }
  for (const r of treas) { const d = at(r.date); d.y2 = num(r.y2); d.y10 = num(r.y10); }
  for (const r of internals) { const d = at(r.asof); d.adv = num(r.advancers); d.dec = num(r.decliners); d.advVol = num(r.adv_volume); d.decVol = num(r.dec_volume); d.trin = num(r.trin); }
  return [...days.values()].sort((a, b) => a.date < b.date ? -1 : 1);
}
