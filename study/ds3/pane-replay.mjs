/* DS3 (8 Oct 2026) — a replay of VERSION 3 of the TradingView script (study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine) in JavaScript, statement
   for statement. Pure arithmetic: no fetch, no clock. It does NOT import the tool's version 3 (study/ds3/number.mjs) — it is the other
   side of the comparison. The same method as PN1's replay and DS2's, and it leans on those two files for the lines version 3 did not
   change: Wilder's RSI, the ten-session move, pointsAt, what a request hands a chart bar, offHigh and overAvg (a test holds those lines of
   the scripts to the same text, byte for byte).

   WHAT IS READ FROM THE SCRIPT ITSELF (parsePine3): every number — version 1's tables and constants, version 2's eight thresholds,
   version 3's five, the inputs' defaults, the four switches' defaults, and the symbol the VIX is asked for under.
   WHAT IS WRITTEN AGAIN BY HAND, in the script's own order and names: the Treasury rule, the VIX's steps, the fade, the raise-cash state,
   the sum, the two earlier versions' lines, the rounding, the labels' words. */
import { security, wilderRsi, moveOver, pointsAt, round1, roundWhole } from "../pn1/pine-replay.mjs";
import { parsePine2, offHigh, overAvg } from "../ds2/pane-replay.mjs";
const NA = null, na = (x) => x == null || Number.isNaN(x);
export function parsePine3(src) { const K = parsePine2(src), num = (name) => { const m = src.match(new RegExp("^const\\s+(?:int|float)\\s+" + name + "\\s*=\\s*(-?[0-9.]+)", "m")); if (!m) throw new Error("the script has no constant " + name); return +m[1]; }, flag = (name) => { const m = src.match(new RegExp("^bool " + name + "\\s*=\\s*input\\.bool\\((true|false),", "m")); if (!m) throw new Error("the script has no switch " + name); return m[1] === "true"; };
  const vs = src.match(/^string vixSym = input\.symbol\("([^"]+)"/m), vt = /^string vixT = vixSym\s*$/m.test(src); if (!vs || !vt) throw new Error("the script does not request the VIX the way this replay reads it");
  return { ...K, VIX_LO: num("VIX_LO"), VIX_HI: num("VIX_HI"), VIX_ADD_LO: num("VIX_ADD_LO"), VIX_ADD_HI: num("VIX_ADD_HI"), VIX_TOUCH: num("VIX_TOUCH"), vixRule: flag("vixRule"), fearRule: flag("fearRule"), funds: { ...K.funds, vix: { symbol: vs[1], adjustment: "none" } } }; }
/* request.security(vixT, "D", close | high): the VIX's own daily bar. own = [{ date, close, high }] */
const closeOf = () => () => (close) => close, fieldOf = (own, key) => own.map((b) => ({ date: b.date, close: b[key] }));

/* the whole script on a chart. funds = { spy, qqq, hyg, ief }: each [{ date, close }]; funds.vix = [{ date, close, high }].
   inputs = the script's inputs; the defaults are the script's own. Returns one row per chart bar. */
export function replay3(K, funds, chartDates, inputs = {}) {
  const heldPct = inputs.heldPct ?? K.heldPct, tacticalPct = inputs.tacticalPct ?? K.tacticalPct, byDirection = inputs.byDirection ?? true, creditRule = inputs.creditRule ?? K.creditRule, cashRule = inputs.cashRule ?? K.cashRule, vixRule = inputs.vixRule ?? K.vixRule, fearRule = inputs.fearRule ?? K.fearRule;
  const spyRsi = security(funds.spy, wilderRsi(K), chartDates), qqqRsi = security(funds.qqq, wilderRsi(K), chartDates), hygMove = security(funds.hyg, moveOver(K), chartDates), iefMove = security(funds.ief, moveOver(K), chartDates);
  const spyOff = security(funds.spy, offHigh(K), chartDates), qqqOff = security(funds.qqq, offHigh(K), chartDates), spyOver = security(funds.spy, overAvg(K), chartDates), qqqOver = security(funds.qqq, overAvg(K), chartDates);
  const vixClose = security(fieldOf(funds.vix, "close"), closeOf(), chartDates), vixHigh = security(fieldOf(funds.vix, "high"), closeOf(), chartDates);
  const rows = []; let dirCol = "teal", prevInvested = NA, cash = false;
  for (let i = 0; i < chartDates.length; i++) {
    const rsiBoth = na(spyRsi[i]) || na(qqqRsi[i]) ? NA : (spyRsi[i] + qqqRsi[i]) / 2.0;
    const creditOwn = na(hygMove[i]) || na(iefMove[i]) ? NA : (hygMove[i] - K.RATES_SHARE * iefMove[i]) * 100.0;
    const ptsRsi = pointsAt(K.RSI_PLACES, K.RSI_POINTS, rsiBoth), ptsOwn = pointsAt(K.CREDIT_PLACES, K.CREDIT_POINTS, creditOwn);
    /* version 3, D */
    const hygAlone = na(hygMove[i]) ? NA : hygMove[i] * 100.0, ptsAlone = pointsAt(K.CREDIT_PLACES, K.CREDIT_POINTS, hygAlone), rally = !na(iefMove[i]) && iefMove[i] > 0.0;
    const ptsFitted = na(ptsOwn) ? NA : fearRule && rally && !na(ptsAlone) ? Math.max(ptsOwn, ptsAlone) : ptsOwn;
    /* version 2, A */
    const fade = na(rsiBoth) ? NA : Math.max(0.0, Math.min(1.0, (rsiBoth - K.FADE_TO) / (K.FADE_FROM - K.FADE_TO)));
    const ptsCredit = creditRule && !na(ptsFitted) && ptsFitted < 0.0 ? (na(fade) ? NA : ptsFitted * fade) : ptsFitted;
    /* version 3, C */
    const vixTop = na(vixHigh[i]) ? vixClose[i] : na(vixClose[i]) ? NA : Math.max(vixHigh[i], vixClose[i]);
    const stepLo = !na(vixClose[i]) && vixClose[i] >= K.VIX_LO ? 1.0 : !na(vixTop) && vixTop >= K.VIX_LO ? K.VIX_TOUCH : 0.0, stepHi = !na(vixClose[i]) && vixClose[i] >= K.VIX_HI ? 1.0 : !na(vixTop) && vixTop >= K.VIX_HI ? K.VIX_TOUCH : 0.0;
    const ptsVix = !vixRule ? 0.0 : na(vixClose[i]) ? NA : K.VIX_ADD_LO * stepLo + (K.VIX_ADD_HI - K.VIX_ADD_LO) * stepHi;
    /* version 2, B */
    const extended = na(spyOver[i]) || na(qqqOver[i]) ? NA : Math.max(0.0, (spyOver[i] + qqqOver[i]) / 2.0);
    const atHigh = !na(spyOff[i]) && !na(qqqOff[i]) && spyOff[i] >= -K.NEAR_PCT && qqqOff[i] >= -K.NEAR_PCT;
    if (!na(ptsRsi) && !na(ptsFitted) && !na(ptsVix)) { if (rsiBoth < K.RESET_RSI) cash = false; else if (atHigh && !na(extended) && extended >= K.EXT_PCT) cash = true; }
    const cashOn = cashRule && cash;
    const beforeCut = na(ptsRsi) || na(ptsCredit) || na(ptsVix) ? NA : Math.max(0.0, Math.min(100.0, K.TYPICAL_DAY + ptsRsi + ptsCredit + ptsVix));
    const reading = na(beforeCut) ? NA : round1(cashOn ? beforeCut * K.CASH_CUT : beforeCut);
    const invested = na(reading) ? NA : Math.min(100.0, heldPct + (tacticalPct * reading) / 100.0);
    const readingOld = na(ptsRsi) || na(ptsOwn) ? NA : round1(Math.max(0.0, Math.min(100.0, K.TYPICAL_DAY + ptsRsi + ptsOwn)));
    const investedOld = na(readingOld) ? NA : Math.min(100.0, heldPct + (tacticalPct * readingOld) / 100.0);
    const ptsCredit2 = creditRule && !na(ptsOwn) && ptsOwn < 0.0 ? (na(fade) ? NA : ptsOwn * fade) : ptsOwn;
    const before2 = na(ptsRsi) || na(ptsCredit2) ? NA : Math.max(0.0, Math.min(100.0, K.TYPICAL_DAY + ptsRsi + ptsCredit2));
    const reading2 = na(before2) ? NA : round1(cashOn ? before2 * K.CASH_CUT : before2);
    const invested2 = na(reading2) ? NA : Math.min(100.0, heldPct + (tacticalPct * reading2) / 100.0);
    if (!na(invested) && !na(prevInvested)) { if (invested > prevInvested) dirCol = "green"; else if (invested < prevInvested) dirCol = "red"; }
    rows.push({ date: chartDates[i], spyRsi: spyRsi[i], qqqRsi: qqqRsi[i], hygMove: hygMove[i], iefMove: iefMove[i], spyOff: spyOff[i], qqqOff: qqqOff[i], spyOver: spyOver[i], qqqOver: qqqOver[i], vixClose: vixClose[i], vixHigh: vixHigh[i], rsiBoth, creditOwn, ptsRsi, ptsOwn, hygAlone, ptsAlone, rally, ptsFitted, fade, ptsCredit, vixTop, stepLo, stepHi, ptsVix, extended, atHigh, cash, cashOn, beforeCut, reading, invested, readingOld, investedOld, ptsCredit2, reading2, invested2,
      raisedByRally: !na(invested) && fearRule && rally && !na(ptsAlone) && !na(ptsOwn) && ptsAlone > ptsOwn, vixWaiting: vixRule && na(vixClose[i]),
      colour: byDirection ? dirCol : "teal", partA: na(ptsRsi) ? NA : 50.0 + ptsRsi, partB: na(ptsCredit) ? NA : 50.0 + ptsCredit, partC: na(ptsVix) ? NA : 50.0 + ptsVix, colA: ptsRsi >= 0 ? "green" : "red", colB: ptsCredit >= 0 ? "green" : "red", colC: ptsVix > 0 ? "green" : "grey" });
    prevInvested = invested; }
  rows.labels = labelsOf3(rows[rows.length - 1], inputs); return rows; }
/* the labels on the last bar — script lines "var array<label> tags" … the last "label.new(…)" */
const roundN = (x, n) => Math.round(x * 10 ** n) / 10 ** n, whole = (v) => (na(v) ? "—" : String(roundWhole(v))), signed1 = (v) => (na(v) ? "—" : (roundN(v, 1) > 0 ? "+" : roundN(v, 1) < 0 ? "−" : "") + Math.abs(roundN(v, 1)).toFixed(1));
export function labelsOf3(r, inputs = {}) { const showReading = inputs.showReading ?? false, showParts = inputs.showParts ?? false, showOld = inputs.showOld ?? false, showV2 = inputs.showV2 ?? false, labelGap = inputs.labelGap ?? 12.0, showTag = inputs.showTag ?? true;
  if (!r || !showTag) return [];
  if (na(r.invested)) return [{ y: 50.0, text: "No reading yet · waiting for prices from" + (na(r.spyRsi) ? " SPY" : "") + (na(r.qqqRsi) ? " QQQ" : "") + (na(r.hygMove) ? " HYG" : "") + (na(r.iefMove) ? " IEF" : "") + (r.vixWaiting ? " VIX" : ""), colour: "teal" }];
  const ys = [], ts = [], cs = [];
  ys.push(r.invested); ts.push("Invested " + whole(r.invested) + "% · market reading " + whole(r.reading) + (r.cashOn ? " · cash raised" : "") + (r.ptsVix > 0 ? " · VIX +" + whole(r.ptsVix) : "")); cs.push(r.colour);
  if (showOld) { ys.push(r.investedOld); ts.push("version 1: " + whole(r.investedOld) + "%"); cs.push("teal"); }
  if (showV2) { ys.push(r.invested2); ts.push("version 2: " + whole(r.invested2) + "%"); cs.push("teal"); }
  if (showReading) { ys.push(r.reading); ts.push("market reading " + whole(r.reading)); cs.push("teal"); }
  if (showParts) { ys.push(r.partA); ts.push("SPY and QQQ " + signed1(r.ptsRsi)); cs.push(r.colA); ys.push(r.partB); ts.push("credit " + signed1(r.ptsCredit)); cs.push(r.colB); ys.push(r.partC); ts.push("the VIX " + signed1(r.ptsVix)); cs.push(r.colC); }
  const rank = ys.map((_, k) => k).sort((a, b) => ys[b] - ys[a] || a - b), out = []; let above = NA;
  for (let i = 0; i <= rank.length - 1; i++) { const j = rank[i]; let y = ys[j]; if (!na(above)) y = Math.min(y, above - labelGap); above = y; out.push({ y, text: ts[j], colour: cs[j], at: ys[j] }); }
  return out; }
export const labelOf3 = (r, inputs) => (labelsOf3(r, inputs)[0] || { text: "" }).text;
