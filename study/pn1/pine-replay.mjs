/* PN1 (7 Oct 2026) — a replay of the TradingView script SCINTILLA-DEPLOYMENT-PANE.pine in JavaScript, statement for statement.
   Pure arithmetic: no fetch, no clock. It does NOT import the allocation tool's engine — it is the other side of the comparison.

   WHAT IS READ FROM THE SCRIPT ITSELF (parsePine): every number — the two place tables, the two points curves, the typical day, the
   two window lengths, the rates share, the two inputs' defaults — and which fund is asked for with its payouts added back. So the
   numbers proved here are the numbers that get pasted into TradingView.
   WHAT IS WRITTEN AGAIN BY HAND, in the script's own order and names: wilderRsi, the ten-session move, pointsAt, the sum, the rounding,
   the direction colour and the label's words. Each function below names the script lines it copies.

   WHAT A REPLAY CANNOT SHOW: that TradingView's compiler accepts the script, and that TradingView's prices are the Hub's prices.
   The first is checked when the script is installed; the second is measured as a sensitivity (scripts/pn1-prove.mjs). */

/* ---------- the script's numbers ---------- */
export function parsePine(src) {
  const num = (name) => { const m = src.match(new RegExp("^const\\s+(?:int|float)\\s+" + name + "\\s*=\\s*(-?[0-9.]+)", "m")); if (!m) throw new Error("the script has no constant " + name); return +m[1]; };
  const list = (name) => { const m = src.match(new RegExp("^var array<float> " + name + " = array\\.from\\(([^)]*)\\)", "m")); if (!m) throw new Error("the script has no table " + name); return m[1].split(",").map((x) => +x.trim()); };
  const input = (name) => { const m = src.match(new RegExp("^float " + name + "\\s*=\\s*input\\.float\\((-?[0-9.]+),", "m")); if (!m) throw new Error("the script has no input " + name); return +m[1]; };
  const sym = (v) => { const m = src.match(new RegExp("^string " + v + "Sym = input\\.symbol\\(\"([^\"]+)\"", "m")), a = src.match(new RegExp("^string " + v + "T = ticker\\.modify\\(" + v + "Sym, session\\.regular, adjustment\\.(\\w+)\\)", "m")); if (!m || !a) throw new Error("the script does not request " + v); return { symbol: m[1], adjustment: a[1] }; };
  return { RSI_DAYS: num("RSI_DAYS"), CREDIT_DAYS: num("CREDIT_DAYS"), RATES_SHARE: num("RATES_SHARE"), TYPICAL_DAY: num("TYPICAL_DAY"),
    RSI_PLACES: list("RSI_PLACES"), CREDIT_PLACES: list("CREDIT_PLACES"), RSI_POINTS: list("RSI_POINTS"), CREDIT_POINTS: list("CREDIT_POINTS"),
    heldPct: input("heldPct"), tacticalPct: input("tacticalPct"), funds: { spy: sym("spy"), qqq: sym("qqq"), hyg: sym("hyg"), ief: sym("ief") } }; }

/* ---------- Pine's own behaviours the script leans on ---------- */
const NA = null, na = (x) => x == null || Number.isNaN(x);
/* math.round(x, 1): to one decimal */
export const round1 = (x) => (na(x) ? NA : Math.round(x * 10) / 10);
/* math.round(x): to the nearest whole number, halves away from zero */
export const roundWhole = (x) => (na(x) ? NA : x < 0 ? -Math.round(-x) : Math.round(x));
/* request.security(fund, "D", expr, lookahead off): expr runs once on each of the fund's OWN daily bars, in order, keeping its `var`
   state from bar to bar; a chart bar then shows the value of the fund's newest bar dated on or before it (no gaps).
   own = [{ date, close }] in date order; makeExpr() returns a fresh (close, history) => value. */
export function security(own, makeExpr, chartDates) {
  const expr = makeExpr(), at = new Map(), closes = []; for (const b of own) { closes.push(b.close); at.set(b.date, expr(b.close, closes)); }
  const dates = own.map((b) => b.date), out = []; let j = -1; for (const d of chartDates) { while (j + 1 < dates.length && dates[j + 1] <= d) j++; out.push(j < 0 ? NA : at.get(dates[j])); } return out; }

/* ---------- the script, line for line ---------- */
/* wilderRsi(src) — script lines "wilderRsi(float src) =>" … "out" */
export const wilderRsi = (K) => () => { let prev = NA, upAvg = 0.0, dnAvg = 0.0, k = 0;
  return (src) => { let out = NA;
    if (!na(src)) {
      if (na(prev)) prev = src;
      else { const d = src - prev, up = Math.max(d, 0.0), dn = Math.max(-d, 0.0); prev = src; k += 1;
        if (k <= K.RSI_DAYS) { upAvg += up / K.RSI_DAYS; dnAvg += dn / K.RSI_DAYS; }
        else { upAvg = (upAvg * (K.RSI_DAYS - 1) + up) / K.RSI_DAYS; dnAvg = (dnAvg * (K.RSI_DAYS - 1) + dn) / K.RSI_DAYS; }
        if (k >= K.RSI_DAYS) out = dnAvg === 0 ? 100.0 : 100.0 - 100.0 / (1.0 + upAvg / dnAvg); } }
    return out; }; };
/* close / close[CREDIT_DAYS] - 1.0 — na until the fund has that many bars behind it */
export const moveOver = (K) => () => (close, history) => { const i = history.length - 1 - K.CREDIT_DAYS; return i < 0 || na(close) || na(history[i]) ? NA : close / history[i] - 1.0; };
/* pointsAt(placeTab, curve, z) — script lines "pointsAt(array<float> placeTab, …) =>" … "out" */
export function pointsAt(placeTab, curve, z) { let out = NA;
  if (!na(z)) { const n = placeTab.length - 1; let u = 0.0;
    if (z <= placeTab[0]) u = 0.0;
    else if (z >= placeTab[n]) u = 100.0;
    else { let lo = 0, hi = n;
      while (hi - lo > 1) { const mid = Math.trunc(Math.floor((lo + hi) / 2.0)); if (placeTab[mid] <= z) lo = mid; else hi = mid; }
      const a = placeTab[lo], b = placeTab[hi], fl = lo; u = (100.0 / n) * (b === a ? fl : fl + (z - a) / (b - a)); }
    const i = Math.min(curve.length - 2, Math.trunc(Math.floor(u / 5.0))), t = (u - i * 5.0) / 5.0;
    out = curve[i] + t * (curve[i + 1] - curve[i]); }
  return out; }

/* the whole script on a chart. funds = { spy, qqq, hyg, ief }: each [{ date, close }] as TradingView would hand it for the adjustment the
   script asks for (hyg with its payouts added back). chartDates = the chart's own daily bars (the layout puts the pane under SPY).
   inputs = the script's inputs; the defaults are the script's own. Returns one row per chart bar. */
export function replay(K, funds, chartDates, inputs = {}) {
  const heldPct = inputs.heldPct ?? K.heldPct, tacticalPct = inputs.tacticalPct ?? K.tacticalPct, byDirection = inputs.byDirection ?? true;
  const spyRsi = security(funds.spy, wilderRsi(K), chartDates), qqqRsi = security(funds.qqq, wilderRsi(K), chartDates), hygMove = security(funds.hyg, moveOver(K), chartDates), iefMove = security(funds.ief, moveOver(K), chartDates);
  const rows = []; let dirCol = "teal", prevInvested = NA;
  for (let i = 0; i < chartDates.length; i++) {
    const rsiBoth = na(spyRsi[i]) || na(qqqRsi[i]) ? NA : (spyRsi[i] + qqqRsi[i]) / 2.0;
    const creditOwn = na(hygMove[i]) || na(iefMove[i]) ? NA : (hygMove[i] - K.RATES_SHARE * iefMove[i]) * 100.0;
    const ptsRsi = pointsAt(K.RSI_PLACES, K.RSI_POINTS, rsiBoth), ptsCredit = pointsAt(K.CREDIT_PLACES, K.CREDIT_POINTS, creditOwn);
    const raw = na(ptsRsi) || na(ptsCredit) ? NA : K.TYPICAL_DAY + ptsRsi + ptsCredit;
    const reading = na(raw) ? NA : round1(Math.max(0.0, Math.min(100.0, raw)));
    const invested = na(reading) ? NA : Math.min(100.0, heldPct + (tacticalPct * reading) / 100.0);
    if (!na(invested) && !na(prevInvested)) { if (invested > prevInvested) dirCol = "green"; else if (invested < prevInvested) dirCol = "red"; }
    rows.push({ date: chartDates[i], spyRsi: spyRsi[i], qqqRsi: qqqRsi[i], hygMove: hygMove[i], iefMove: iefMove[i], rsiBoth, creditOwn, ptsRsi, ptsCredit, raw, reading, invested, colour: byDirection ? dirCol : "teal",
      partA: na(ptsRsi) ? NA : 50.0 + ptsRsi, partB: na(ptsCredit) ? NA : 50.0 + ptsCredit, colA: ptsRsi >= 0 ? "green" : "red", colB: ptsCredit >= 0 ? "green" : "red" });
    prevInvested = invested; }
  rows.labels = labelsOf(rows[rows.length - 1], inputs); return rows; }
/* the labels on the last bar — script lines "var array<label> tags" … the last "label.new(…)". Each label sits at its own line's value;
   they are taken from the highest value down and each is pushed down so that no two sit closer than labelGap (the script's input, 12). */
/* str.tostring(x, "0.0"): one decimal; math.round(x, 1) first, as the script does */
const roundN = (x, n) => Math.round(x * 10 ** n) / 10 ** n;
const whole = (v) => (na(v) ? "—" : String(roundWhole(v))), signed1 = (v) => (na(v) ? "—" : (roundN(v, 1) > 0 ? "+" : roundN(v, 1) < 0 ? "−" : "") + Math.abs(roundN(v, 1)).toFixed(1));
export function labelsOf(r, inputs = {}) { const showReading = inputs.showReading ?? false, showParts = inputs.showParts ?? false, labelGap = inputs.labelGap ?? 12.0, showTag = inputs.showTag ?? true;
  if (!r || !showTag) return [];
  if (na(r.invested)) return [{ y: 50.0, text: "No reading yet · waiting for prices from" + (na(r.spyRsi) ? " SPY" : "") + (na(r.qqqRsi) ? " QQQ" : "") + (na(r.hygMove) ? " HYG" : "") + (na(r.iefMove) ? " IEF" : ""), colour: "teal" }];
  const ys = [], ts = [], cs = [];
  ys.push(r.invested); ts.push("Invested " + whole(r.invested) + "% · market reading " + whole(r.reading)); cs.push(r.colour);
  if (showReading) { ys.push(r.reading); ts.push("market reading " + whole(r.reading)); cs.push("bright teal"); }
  if (showParts) { ys.push(r.partA); ts.push("SPY and QQQ " + signed1(r.ptsRsi)); cs.push(r.colA); ys.push(r.partB); ts.push("credit " + signed1(r.ptsCredit)); cs.push(r.colB); }
  const rank = ys.map((_, k) => k).sort((a, b) => ys[b] - ys[a] || a - b), out = []; let above = NA;
  for (let i = 0; i <= rank.length - 1; i++) { const j = rank[i]; let y = ys[j]; if (!na(above)) y = Math.min(y, above - labelGap); above = y; out.push({ y, text: ts[j], colour: cs[j], at: ys[j] }); }
  return out; }
/* the first label's words: the one the pane always shows */
export const labelOf = (r) => (labelsOf(r)[0] || { text: "" }).text;

/* ---------- HYG with its payouts added back, the two ways it is done ---------- */
/* TradingView's way (its help page "How does dividend adjustment work"): for each payout, every price BEFORE the ex-date is multiplied
   by (the close of the day before − the payout) ÷ (that close); the newest price is never changed. payouts = [[exDate, amount], …]. */
export function adjustLikeTradingView(dates, close, payouts) {
  const ix = new Map(dates.map((d, i) => [d, i])), factorAt = new Array(dates.length).fill(1);
  for (const [d, amt] of payouts) { let i = ix.get(d); if (i == null) { i = dates.findIndex((x) => x >= d); if (i < 0) continue; } if (i === 0 || close[i - 1] == null) continue; factorAt[i] *= (close[i - 1] - amt) / close[i - 1]; }
  const out = new Array(dates.length).fill(null); let f = 1; for (let i = dates.length - 1; i >= 0; i--) { out[i] = close[i] == null ? null : close[i] * f; f *= factorAt[i]; } return out; }
