import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp, interp, gridAt, investedPct, lcBasePct, lcSharePct, GRID_A, GRID_B, ANCHOR_X, LC_CAP,
  percentileRank, zScore, quantile, seriesStats, conditionFromPercentile, conditionFromFixedScale, DEFAULT_EDGES,
  computeVoters, heat, heatWith, heatSeries, buildHistoryDays, computeRead, applyOperatorInputs,
  diffSentence, voterSentence, riskName, TOOL_DEFAULTS
} from '../ground-up-math.mjs';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

/* ---------- interpolation ---------- */
test('interp hits the anchors exactly and is linear between them', () => {
  const ys = [100, 80, 50, 30, 15];
  ANCHOR_X.forEach((x, i) => close(interp(x, ANCHOR_X, ys), ys[i]));
  close(interp(0.125, ANCHOR_X, ys), 90);
  close(interp(0.375, ANCHOR_X, ys), 65);
  close(interp(0.625, ANCHOR_X, ys), 40);
});
test('interp is flat beyond the ends and null on null', () => {
  const ys = [100, 80, 50, 30, 15];
  close(interp(-1, ANCHOR_X, ys), 100);
  close(interp(2, ANCHOR_X, ys), 15);
  assert.equal(interp(null, ANCHOR_X, ys), null);
});

/* ---------- grid A (% invested) ---------- */
test('grid A reproduces the Cockpit at Oversold / Neutral / Overbought', () => {
  close(investedPct(0.25, 0), 60); close(investedPct(0.5, 0), 40); close(investedPct(0.75, 0), 20);   // conservative
  close(investedPct(0.25, 1), 80); close(investedPct(0.5, 1), 50); close(investedPct(0.75, 1), 30);   // balanced
  close(investedPct(0.25, 2), 100); close(investedPct(0.5, 2), 70); close(investedPct(0.75, 2), 40);  // aggressive
});
test('grid A balanced ends are the MODEL anchors: 100 at −1, 15 at +1', () => {
  close(investedPct(0, 1), 100); close(investedPct(1, 1), 15);
});
test('grid A blends between risk columns when the dial sits between detents', () => {
  close(investedPct(0.5, 0.5), 45);   // half conservative (40) half balanced (50)
  close(investedPct(0.5, 1.5), 60);   // half balanced (50) half aggressive (70)
});
test('grid A is monotone: more heat never means more invested', () => {
  for (const R of [0, 0.3, 1, 1.7, 2]) {
    let prev = Infinity;
    for (let x = 0; x <= 1.0001; x += 0.01) { const v = investedPct(x, R); assert.ok(v <= prev + 1e-9, `R=${R} x=${x}`); prev = v; }
  }
});
test('risk dial is clamped to 0..2', () => { close(investedPct(0.5, -3), 40); close(investedPct(0.5, 9), 70); });

/* ---------- grid B (large-cap share) + tilt + caps ---------- */
test('grid B reproduces the Cockpit large-cap shares', () => {
  close(lcBasePct(0.25, 0), 50); close(lcBasePct(0.5, 0), 60); close(lcBasePct(0.75, 0), 75);
  close(lcBasePct(0.25, 1), 25); close(lcBasePct(0.5, 1), 30); close(lcBasePct(0.75, 1), 50);
  close(lcBasePct(0.25, 2), 15); close(lcBasePct(0.5, 2), 20); close(lcBasePct(0.75, 2), 40);
});
test('rotation tilt adds tiltCoef points per 1.0 of IWM−SPY spread', () => {
  const r = lcSharePct(0.5, 1, 0.4, 25);
  close(r.base, 30); close(r.tilt, 10); close(r.lc, 40);
  const neg = lcSharePct(0.5, 1, -0.2, 25);
  close(neg.tilt, -5); close(neg.lc, 25);
  const zero = lcSharePct(0.5, 1, 0.4, 0);
  close(zero.lc, 30);
});
test('rotation tilt with no spread is zero, and the cap is 10–90', () => {
  close(lcSharePct(0.5, 1, null, 25).tilt, 0);
  close(lcSharePct(1, 0, 1, 25).lc, LC_CAP[1]);     // 85 + 25 → capped 90
  close(lcSharePct(0, 2, -1, 25).lc, LC_CAP[0]);    // 10 − 25 → capped 10
});

/* ---------- own-history statistics ---------- */
test('percentileRank places a value inside its own distribution (ties count half)', () => {
  const s = Array.from({ length: 100 }, (_, i) => i + 1);
  close(percentileRank(s, 50.5), 0.5);
  close(percentileRank(s, 0), 0);
  close(percentileRank(s, 1000), 1);
  close(percentileRank(s, 50), 0.495);
  assert.equal(percentileRank([1, 2, 3], 2), null, 'too little history returns null');
  assert.equal(percentileRank(s, null), null);
});
test('zScore and quantiles', () => {
  const s = [];
  for (let i = 0; i < 200; i++) s.push(Math.sin(i) * 0.5);
  close(zScore(s, s.reduce((a, b) => a + b, 0) / s.length), 0);
  assert.ok(zScore(s, 1) > 2);
  close(zScore(new Array(30).fill(0.2), 0.2), 0, 1e-9);
  close(quantile([1, 2, 3, 4, 5], 0.5), 3);
  const st = seriesStats([0.1, 0.9, -0.4, null, NaN, 0.3]);
  assert.equal(st.n, 4); close(st.min, -0.4); close(st.max, 0.9);
});

/* ---------- condition ---------- */
test('condition on the heat\'s own percentile uses the editable edges', () => {
  assert.equal(conditionFromPercentile(0.05), 'DEEP OVERSOLD');
  assert.equal(conditionFromPercentile(0.10), 'DEEP OVERSOLD');
  assert.equal(conditionFromPercentile(0.2), 'OVERSOLD');
  assert.equal(conditionFromPercentile(0.5), 'NEUTRAL');
  assert.equal(conditionFromPercentile(0.75), 'OVERBOUGHT');
  assert.equal(conditionFromPercentile(0.95), 'DEEP OVERBOUGHT');
  assert.equal(conditionFromPercentile(0.75, { ...DEFAULT_EDGES, hot: 0.8 }), 'NEUTRAL');
  assert.equal(conditionFromPercentile(null), null);
});
test('the fixed reference scale keeps the old words at −0.5/−0.2/+0.2/+0.5', () => {
  assert.equal(conditionFromFixedScale(-0.6), 'DEEP OVERSOLD');
  assert.equal(conditionFromFixedScale(-0.3), 'OVERSOLD');
  assert.equal(conditionFromFixedScale(0), 'NEUTRAL');
  assert.equal(conditionFromFixedScale(0.3), 'OVERBOUGHT');
  assert.equal(conditionFromFixedScale(0.6), 'DEEP OVERBOUGHT');
});

/* ---------- voters: the tool's formulas ---------- */
const day = {
  date: '2026-09-25',
  g: { SPY: 0.18, QQQ: 0.02, IWM: 0.19, SMH: -0.13, RSP: 0.57, BTCUSD: 0.65, CLUSD: 0.33, GCUSD: 0.38, XLP: 0.61, XLU: -0.60, MAGS: -0.03, HYG: -0.14, TLT: -0.53 },
  vix: 14.87, vixRatio: 0.8293, skew: 146.04, y2: 4.81, y10: 5.17, adv: 6556, dec: 9428, advVol: 11.3e9, decVol: 15.9e9, trin: 0.9801
};
const byKey = (V, k) => V.find(v => v.key === k);
test('VIX and 10-year vote on the tool\'s inverted endpoints', () => {
  close(byKey(computeVoters({ vix: 12 }), 'VIX').val, 1);
  close(byKey(computeVoters({ vix: 30 }), 'VIX').val, -1);
  close(byKey(computeVoters({ vix: 21 }), 'VIX').val, 0);
  close(byKey(computeVoters({ vix: 5 }), 'VIX').val, 1, 1e-9);          // clamped
  close(byKey(computeVoters({ y10: 3.5 }), 'US10Y').val, 1);
  close(byKey(computeVoters({ y10: 4.8 }), 'US10Y').val, -1);
  close(byKey(computeVoters({ y10: 5.17 }), 'US10Y').val, -1);          // beyond the cold end, clamped
  close(byKey(computeVoters({ vix: 20 }, { vixCold: 40, tenCold: 4.8 }), 'VIX').val, ((40 + 12) / 2 - 20) / ((40 - 12) / 2));
});
test('inverted geigers, spreads, breadth, term, curve, skew, TRIN, volume', () => {
  const V = computeVoters(day);
  close(byKey(V, 'OIL').val, -0.33);
  close(byKey(V, 'HAVEN').val, -0.38);
  close(byKey(V, 'DEF').val, -(0.61 - 0.60) / 2);
  close(byKey(V, 'BREADTH_EW').val, 0.57 - 0.18);
  close(byKey(V, 'BREADTH_SC').val, 0.19 - 0.18);
  close(byKey(V, 'CONC').val, -(-0.03 - 0.18));
  close(byKey(V, 'VIX_TERM').val, clamp((1 - 0.8293) * 4));
  close(byKey(V, 'CURVE').val, (5.17 - 4.81) / 1.5);
  close(byKey(V, 'SKEW').val, (135 - 146.04) / 25);
  close(byKey(V, 'ADLINE').val, clamp(2 * (6556 - 9428) / (6556 + 9428)));
  close(byKey(V, 'TRIN').val, (1 - 0.9801) * 2);
  close(byKey(V, 'B_VOL').val, clamp(3 * (11.3e9 - 15.9e9) / (11.3e9 + 15.9e9)));
  assert.equal(byKey(V, 'CREDIT').val, -0.14);
  assert.equal(byKey(V, 'DURATION').val, -0.53);
  for (const v of V) assert.equal(typeof v.says, 'string');
});
test('a voter with no input abstains (null), never votes zero', () => {
  const V = computeVoters({ g: { SPY: 0.2 } });
  assert.equal(byKey(V, 'IWM').val, null);
  assert.equal(byKey(V, 'VIX').val, null);
  assert.equal(byKey(V, 'BREADTH_SC').val, null);
  assert.equal(byKey(V, 'SPY').val, 0.2);
});

/* ---------- heat ---------- */
test('heat is the weighted mean over voters that have a value, with coverage reported', () => {
  const V = [{ key: 'A', val: 1 }, { key: 'B', val: -1 }, { key: 'C', val: null }, { key: 'D', val: 0.5 }];
  const r = heat(V, { A: 1, B: 1, C: 1, D: 0 });
  close(r.H, 0); close(r.coverage, 2 / 3);
  const r2 = heat(V, { A: 3, B: 1 });
  close(r2.H, (3 - 1) / 4); close(r2.coverage, 1);
  assert.equal(heat([{ key: 'A', val: null }], { A: 1 }).H, null);
});
test('heatWith is the counterfactual for one weight', () => {
  const V = [{ key: 'A', val: 1 }, { key: 'B', val: -1 }];
  close(heatWith(V, { A: 1, B: 1 }, 'B', 0), 1);
  close(heatWith(V, { A: 1, B: 1 }, 'A', 3), (3 - 1) / 4);
});
test('the reconstructed heat series drops days with too little of the committee present', () => {
  const full = { date: 'a', g: { SPY: 0.5, QQQ: 0.5, IWM: 0.5, SMH: 0.5, RSP: 0.5, BTCUSD: 0.5, CLUSD: 0, GCUSD: 0, XLP: 0, XLU: 0, MAGS: 0.5, HYG: 0, TLT: 0 }, vix: 20, vixRatio: 0.9, skew: 130, y2: 4, y10: 4.5, adv: 100, dec: 100, advVol: 1, decVol: 1, trin: 1 };
  const thin = { date: 'b', vix: 20 };
  const s = heatSeries([full, thin]);
  assert.equal(s.length, 1); assert.equal(s[0].date, 'a'); assert.ok(s[0].coverage > 0.99);
});

/* ---------- day builders ---------- */
test('buildHistoryDays makes the composite as 0.5×trend + 0.5×momentum and skips half-days', () => {
  const days = buildHistoryDays({
    fan: { SPY: [{ asof: '2026-01-02', read: 0.6 }, { asof: '2026-01-03', read: 0.4 }] },
    mom: { SPY: [{ asof: '2026-01-02', read: -0.2 }] },
    vix: [{ date: '2026-01-02', vix: 15, ratio: 0.9, skew: null }, { date: '2026-01-05', vix: 30, ratio: 1.1, skew: 140 }],
    treas: [{ date: '2026-01-02', y2: 4, y10: 4.5 }],
    internals: [{ asof: '2026-01-02', advancers: 10, decliners: 5, adv_volume: 3, dec_volume: 1, trin: 0.8 }]
  });
  assert.deepEqual(days.map(d => d.date), ['2026-01-02', '2026-01-05'], 'a day with trend but no momentum carries no composite and no other data, so it is not a day');
  close(days[0].g.SPY, 0.2);
  assert.equal(days[1].g.SPY, undefined);
  assert.equal(days[0].vix, 15); assert.equal(days[0].skew, null); assert.equal(days[0].y10, 4.5); assert.equal(days[0].adv, 10); assert.equal(days[0].trin, 0.8);
  assert.equal(days[1].vix, 30);
});

/* ---------- operator inputs ---------- */
test('operator inputs only count when ON, and land on the right output', () => {
  const r = applyOperatorInputs({}, [
    { id: 'a', target: 'lc', amount: 10, on: true },
    { id: 'b', target: 'invested', amount: -5, on: false },
    { id: 'c', target: 'heat', amount: -0.1, on: true },
    { id: 'd', target: 'invested', amount: 'x', on: true }
  ]);
  close(r.dLc, 10); close(r.dInv, 0); close(r.dHeat, -0.1);
  assert.equal(r.effects.find(e => e.id === 'b').applied, 0);
});

/* ---------- the whole read ---------- */
function synthHistory(n = 300) {
  const H = [];
  for (let i = 0; i < n; i++) {
    const t = Math.sin(i / 17) * 0.4;                    // heat wanders −0.4..+0.4
    H.push({ date: `d${String(i).padStart(4, '0')}`, g: { SPY: t, QQQ: t, IWM: t + 0.1, SMH: t, RSP: t, BTCUSD: t, CLUSD: -t, GCUSD: 0, XLP: 0, XLU: 0, MAGS: t, HYG: t, TLT: 0 },
      vix: 21 - t * 9, vixRatio: 0.9, skew: 135, y2: 4, y10: 4.15 - t * 0.65, adv: 100 + t * 50, dec: 100 - t * 50, advVol: 1 + t, decVol: 1 - t, trin: 1 - t * 0.5 });
  }
  return H;
}
test('computeRead: own-history basis places today inside its history and drives both grids', () => {
  const history = synthHistory();
  const today = { ...history[150], date: 'today' };
  const read = computeRead({ today, history, risk: 1, tiltCoef: 25, basis: 'own' });
  assert.ok(read.H != null && read.p != null && read.z != null);
  assert.ok(read.p >= 0 && read.p <= 1);
  close(read.x, read.p);
  close(read.invested, investedPct(read.p, 1));
  close(read.split.base, lcBasePct(read.p, 1));
  close(read.split.tilt, 25 * (today.g.IWM - today.g.SPY));
  close(read.lc, clamp(read.split.base + read.split.tilt, 10, 90));
  close(read.sc, 100 - read.lc);
  assert.ok(['DEEP OVERSOLD', 'OVERSOLD', 'NEUTRAL', 'OVERBOUGHT', 'DEEP OVERBOUGHT'].includes(read.condition));
  assert.match(read.sentence, /Heat [+−-]?\d\.\d\d — .* \(\d+th percentile of its own history\)\. Balanced policy: \d+% invested\./);
  assert.match(read.sentence, /IWM .* vs SPY .*: \d+ \/ \d+/);
  assert.equal(read.voters.length, 22);
  for (const v of read.voters) assert.equal(typeof voterSentence(v), 'string');
});
test('computeRead: the hottest day in its own history reads DEEP OVERBOUGHT even when the raw heat is modest', () => {
  const history = synthHistory();
  const top = history.reduce((a, b) => heat(computeVoters(a)).H > heat(computeVoters(b)).H ? a : b);
  const read = computeRead({ today: { ...top, date: 'today' }, history, basis: 'own' });
  assert.equal(read.condition, 'DEEP OVERBOUGHT');
  assert.ok(read.H < 0.5, 'raw heat stays under the old fixed +0.5 band');
  assert.notEqual(read.refCondition, 'DEEP OVERBOUGHT');
});
test('computeRead: the fixed-scale reference uses x = (H+1)/2 and the old words', () => {
  const history = synthHistory();
  const today = { ...history[150], date: 'today' };
  const read = computeRead({ today, history, basis: 'fixed' });
  close(read.x, (read.H + 1) / 2);
  assert.equal(read.condition, conditionFromFixedScale(read.H));
  assert.equal(read.basis, 'fixed');
});
test('computeRead: without enough history the own-history basis falls back to the fixed scale and says so', () => {
  const history = synthHistory(5);
  const read = computeRead({ today: history[2], history, basis: 'own' });
  assert.equal(read.p, null);
  assert.equal(read.basis, 'fixed (not enough history)');
  close(read.x, (read.H + 1) / 2);
});
test('computeRead: operator inputs move invested and split after the grids, inside the caps', () => {
  const history = synthHistory();
  const today = { ...history[150], date: 'today' };
  const base = computeRead({ today, history });
  const withOps = computeRead({ today, history, operator: [
    { id: 'a', name: 'AI is leadership', target: 'lc', amount: 10, on: true },
    { id: 'b', name: 'Rates', target: 'invested', amount: -5, on: true }
  ] });
  close(withOps.invested, clamp(base.invested - 5, 0, 100));
  close(withOps.lc, clamp(base.lc + 10, 10, 90));
  assert.match(withOps.sentence, /−5 pts|-5 pts/);
  const huge = computeRead({ today, history, operator: [{ id: 'h', target: 'lc', amount: 500, on: true }] });
  close(huge.lc, 90);
});
test('computeRead: the risk dial moves invested and split the way the Cockpit says', () => {
  const history = synthHistory();
  const today = { ...history[150], date: 'today' };
  const c = computeRead({ today, history, risk: 0 }), b = computeRead({ today, history, risk: 1 }), a = computeRead({ today, history, risk: 2 });
  assert.ok(c.invested < b.invested && b.invested < a.invested);
  assert.ok(c.split.base > b.split.base && b.split.base > a.split.base);
});
test('diffSentence names exactly what moved', () => {
  const prev = { H: 0.1, condition: 'NEUTRAL', invested: 50, lc: 30 };
  assert.equal(diffSentence(prev, { ...prev, invested: 70 }, 'Risk → aggressive'), 'Risk → aggressive: invested 50% → 70%.');
  assert.equal(diffSentence(prev, { ...prev }, 'Tilt 25 → 26'), 'Tilt 25 → 26: nothing in the read changed.');
  assert.match(diffSentence(prev, { H: 0.3, condition: 'OVERBOUGHT', invested: 34, lc: 55 }), /heat \+0\.10 → \+0\.30 · condition NEUTRAL → OVERBOUGHT · invested 50% → 34% · split 30 \/ 70 → 55 \/ 45\./);
});
test('riskName reads the dial in words', () => {
  assert.equal(riskName(1), 'balanced'); assert.equal(riskName(0), 'conservative'); assert.equal(riskName(2), 'aggressive');
  assert.match(riskName(1.25), /0\.75 balanced \/ 0\.25 aggressive/);
});
test('the tool\'s default weights are the ones this page starts from', () => {
  assert.equal(TOOL_DEFAULTS.wts.SPY, 1); assert.equal(TOOL_DEFAULTS.wts.VALUE, 0); assert.equal(TOOL_DEFAULTS.vixCold, 30); assert.equal(TOOL_DEFAULTS.tenCold, 4.8);
});
