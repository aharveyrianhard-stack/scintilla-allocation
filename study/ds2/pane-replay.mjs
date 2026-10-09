/* DS2 (7 Oct 2026) — a replay of VERSION 2 of the TradingView script (study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine) in JavaScript, statement
   for statement. Pure arithmetic: no fetch, no clock. It does NOT import the tool's version 2 (study/ds2/number.mjs) — it is the other
   side of the comparison. The same method as PN1's replay (study/pn1/pine-replay.mjs), and it leans on that file for the lines version 2
   did not change: Wilder's RSI, the ten-session move, pointsAt and what a request hands a chart bar (a test holds those lines of the two
   scripts to the same text, byte for byte).

   WHAT IS READ FROM THE SCRIPT ITSELF (parsePine2): every number — version 1's tables and constants, version 2's eight thresholds, the
   two inputs' defaults, the two switches' defaults.
   WHAT IS WRITTEN AGAIN BY HAND, in the script's own order and names: offHigh, overAvg, the fade, the raise-cash state, the sum, the
   rounding, the label's words. */
import { parsePine, security, wilderRsi, moveOver, pointsAt, round1, roundWhole } from "../pn1/pine-replay.mjs";
const NA = null, na = (x) => x == null || Number.isNaN(x);
export function parsePine2(src) { const K = parsePine(src), num = (name) => { const m = src.match(new RegExp("^const\\s+(?:int|float)\\s+" + name + "\\s*=\\s*(-?[0-9.]+)", "m")); if (!m) throw new Error("the script has no constant " + name); return +m[1]; }, flag = (name) => { const m = src.match(new RegExp("^bool " + name + "\\s*=\\s*input\\.bool\\((true|false),", "m")); if (!m) throw new Error("the script has no switch " + name); return m[1] === "true"; };
  return { ...K, FADE_FROM: num("FADE_FROM"), FADE_TO: num("FADE_TO"), HIGH_DAYS: num("HIGH_DAYS"), AVG_DAYS: num("AVG_DAYS"), NEAR_PCT: num("NEAR_PCT"), EXT_PCT: num("EXT_PCT"), RESET_RSI: num("RESET_RSI"), CASH_CUT: num("CASH_CUT"), creditRule: flag("creditRule"), cashRule: flag("cashRule") }; }
/* offHigh(src) — script lines "offHigh(float src) =>" … "out" */
export const offHigh = (K) => () => { const win = []; return (src) => { let out = NA; if (!na(src)) { win.push(src); if (win.length > K.HIGH_DAYS) win.shift(); if (win.length === K.HIGH_DAYS) out = (src / Math.max(...win) - 1.0) * 100.0; } return out; }; };
/* overAvg(src) — script lines "overAvg(float src) =>" … "out" */
export const overAvg = (K) => () => { const win = []; return (src) => { let out = NA; if (!na(src)) { win.push(src); if (win.length > K.AVG_DAYS) win.shift(); if (win.length === K.AVG_DAYS) out = (src / (win.reduce((p, q) => p + q, 0) / win.length) - 1.0) * 100.0; } return out; }; };

/* the whole script on a chart. funds = { spy, qqq, hyg, ief }: each [{ date, close }] as TradingView would hand it for the adjustment the
   script asks for. inputs = the script's inputs; the defaults are the script's own. Returns one row per chart bar. */
export function replay2(K, funds, chartDates, inputs = {}) {
  const heldPct = inputs.heldPct ?? K.heldPct, tacticalPct = inputs.tacticalPct ?? K.tacticalPct, byDirection = inputs.byDirection ?? true, creditRule = inputs.creditRule ?? K.creditRule, cashRule = inputs.cashRule ?? K.cashRule;
  const spyRsi = security(funds.spy, wilderRsi(K), chartDates), qqqRsi = security(funds.qqq, wilderRsi(K), chartDates), hygMove = security(funds.hyg, moveOver(K), chartDates), iefMove = security(funds.ief, moveOver(K), chartDates);
  const spyOff = security(funds.spy, offHigh(K), chartDates), qqqOff = security(funds.qqq, offHigh(K), chartDates), spyOver = security(funds.spy, overAvg(K), chartDates), qqqOver = security(funds.qqq, overAvg(K), chartDates);
  const rows = []; let dirCol = "teal", prevInvested = NA, cash = false;
  for (let i = 0; i < chartDates.length; i++) {
    const rsiBoth = na(spyRsi[i]) || na(qqqRsi[i]) ? NA : (spyRsi[i] + qqqRsi[i]) / 2.0;
    const creditOwn = na(hygMove[i]) || na(iefMove[i]) ? NA : (hygMove[i] - K.RATES_SHARE * iefMove[i]) * 100.0;
    const ptsRsi = pointsAt(K.RSI_PLACES, K.RSI_POINTS, rsiBoth), ptsFitted = pointsAt(K.CREDIT_PLACES, K.CREDIT_POINTS, creditOwn);
    const fade = na(rsiBoth) ? NA : Math.max(0.0, Math.min(1.0, (rsiBoth - K.FADE_TO) / (K.FADE_FROM - K.FADE_TO)));
    const ptsCredit = creditRule && !na(ptsFitted) && ptsFitted < 0.0 ? (na(fade) ? NA : ptsFitted * fade) : ptsFitted;
    const extended = na(spyOver[i]) || na(qqqOver[i]) ? NA : Math.max(0.0, (spyOver[i] + qqqOver[i]) / 2.0);
    const atHigh = !na(spyOff[i]) && !na(qqqOff[i]) && spyOff[i] >= -K.NEAR_PCT && qqqOff[i] >= -K.NEAR_PCT;
    if (!na(ptsRsi) && !na(ptsFitted)) { if (rsiBoth < K.RESET_RSI) cash = false; else if (atHigh && !na(extended) && extended >= K.EXT_PCT) cash = true; }
    const cashOn = cashRule && cash;
    const beforeCut = na(ptsRsi) || na(ptsCredit) ? NA : Math.max(0.0, Math.min(100.0, K.TYPICAL_DAY + ptsRsi + ptsCredit));
    const reading = na(beforeCut) ? NA : round1(cashOn ? beforeCut * K.CASH_CUT : beforeCut);
    const invested = na(reading) ? NA : Math.min(100.0, heldPct + (tacticalPct * reading) / 100.0);
    const readingOld = na(ptsRsi) || na(ptsFitted) ? NA : round1(Math.max(0.0, Math.min(100.0, K.TYPICAL_DAY + ptsRsi + ptsFitted)));
    const investedOld = na(readingOld) ? NA : Math.min(100.0, heldPct + (tacticalPct * readingOld) / 100.0);
    if (!na(invested) && !na(prevInvested)) { if (invested > prevInvested) dirCol = "green"; else if (invested < prevInvested) dirCol = "red"; }
    rows.push({ date: chartDates[i], spyRsi: spyRsi[i], qqqRsi: qqqRsi[i], hygMove: hygMove[i], iefMove: iefMove[i], spyOff: spyOff[i], qqqOff: qqqOff[i], spyOver: spyOver[i], qqqOver: qqqOver[i], rsiBoth, creditOwn, ptsRsi, ptsFitted, fade, ptsCredit, extended, atHigh, cash, cashOn, beforeCut, reading, invested, readingOld, investedOld,
      colour: byDirection ? dirCol : "teal", partA: na(ptsRsi) ? NA : 50.0 + ptsRsi, partB: na(ptsCredit) ? NA : 50.0 + ptsCredit, colA: ptsRsi >= 0 ? "green" : "red", colB: ptsCredit >= 0 ? "green" : "red" });
    prevInvested = invested; }
  rows.labels = labelsOf2(rows[rows.length - 1], inputs); return rows; }
/* the labels on the last bar — script lines "var array<label> tags" … the last "label.new(…)" */
const roundN = (x, n) => Math.round(x * 10 ** n) / 10 ** n, whole = (v) => (na(v) ? "—" : String(roundWhole(v))), signed1 = (v) => (na(v) ? "—" : (roundN(v, 1) > 0 ? "+" : roundN(v, 1) < 0 ? "−" : "") + Math.abs(roundN(v, 1)).toFixed(1));
export function labelsOf2(r, inputs = {}) { const showReading = inputs.showReading ?? false, showParts = inputs.showParts ?? false, showOld = inputs.showOld ?? false, labelGap = inputs.labelGap ?? 12.0, showTag = inputs.showTag ?? true;
  if (!r || !showTag) return [];
  if (na(r.invested)) return [{ y: 50.0, text: "No reading yet · waiting for prices from" + (na(r.spyRsi) ? " SPY" : "") + (na(r.qqqRsi) ? " QQQ" : "") + (na(r.hygMove) ? " HYG" : "") + (na(r.iefMove) ? " IEF" : ""), colour: "teal" }];
  const ys = [], ts = [], cs = [];
  ys.push(r.invested); ts.push("Invested " + whole(r.invested) + "% · market reading " + whole(r.reading) + (r.cashOn ? " · cash raised" : "")); cs.push(r.colour);
  if (showOld) { ys.push(r.investedOld); ts.push("version 1: " + whole(r.investedOld) + "%"); cs.push("teal"); }
  if (showReading) { ys.push(r.reading); ts.push("market reading " + whole(r.reading)); cs.push("teal"); }
  if (showParts) { ys.push(r.partA); ts.push("SPY and QQQ " + signed1(r.ptsRsi)); cs.push(r.colA); ys.push(r.partB); ts.push("credit " + signed1(r.ptsCredit)); cs.push(r.colB); }
  const rank = ys.map((_, k) => k).sort((a, b) => ys[b] - ys[a] || a - b), out = []; let above = NA;
  for (let i = 0; i <= rank.length - 1; i++) { const j = rank[i]; let y = ys[j]; if (!na(above)) y = Math.min(y, above - labelGap); above = y; out.push({ y, text: ts[j], colour: cs[j], at: ys[j] }); }
  return out; }
export const labelOf2 = (r, inputs) => (labelsOf2(r, inputs)[0] || { text: "" }).text;
