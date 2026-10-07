/* DM1 (7 Oct 2026) — the deployment engine: how much to have invested, read from measured odds, with smooth transitions.
   One pure function, deploy(inputs, model) → { pct, money, reasons, … }. Study only: nothing on the live tool imports it.

   The model is measured by scripts/dm1-build.mjs from every evening since 2008 (study/dm1/data/dm1.json → "model"):
     grid       the RSI rows and fear-percentile columns the sheets are tabulated on
     sheets     all · rising · falling · creditAbove · creditBelow — each a smoothed table of what SPY did in the next 60 sessions
                (kernel-weighted neighbours, not hard cells): med60 (median return), share60 (share of evenings higher)
     baseline   the same two numbers over every evening, and the spread (sd) of each across the evenings — the edge is measured
                against these
     rungs      where the edge sat on the evenings history put at 15 / 30 / 50 / 80 / 100 % (its 5th, 20th, 50th, 80th, 95th percentile)
     putCall    whether a put/call spike without a VIX spike counted as fear in the measurement (then the fear column is the higher
                of the two percentiles)
     tenYear    how the 10-year votes (a tilt in points, 0 when advisory only) — never part of the fear reading

   inputs: { rsi, vixPct, putCallPct?, trendRising?, creditAbove?, tenStretchPct?, tenAbove200? }
     rsi           SPY's daily RSI(14)                       vixPct        the VIX close's place in its own past year, 0–100
     putCallPct    the equity put/call's place in its past year, or null when there is no year yet
     trendRising   SPY's 200-day higher than 21 sessions ago (null = unknown)     creditAbove   dividend-adjusted HYG above its 200-day
     tenStretchPct the 10-year yield's 14-day RSI placed in its past year (null = unknown)   tenAbove200   the yield above its 200-day */

export const LADDER = [15, 30, 50, 80, 100];
export const RUNG_PCTL = [5, 20, 50, 80, 95];
export const MICRON_SHARE = 0.4, MICRON_CAP = 30, CONVICTION_SHARE = 0.2;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* bilinear read of a sheet at (rsi, pct); outside the grid the nearest edge is read; a missing corner (null) falls back to the nearest measured one */
export function readSheet(sheet, grid, field, rsi, pct) {
  const R = grid.rsi, C = grid.pct, T = sheet[field]; if (!T) return null;
  const x = clamp(rsi, R[0], R[R.length - 1]), y = clamp(pct, C[0], C[C.length - 1]);
  let i = 0; while (i < R.length - 2 && R[i + 1] <= x) i++; let j = 0; while (j < C.length - 2 && C[j + 1] <= y) j++;
  const fx = (x - R[i]) / (R[i + 1] - R[i]), fy = (y - C[j]) / (C[j + 1] - C[j]);
  const v = [[T[i][j], 1 - fx, 1 - fy], [T[i + 1][j], fx, 1 - fy], [T[i][j + 1], 1 - fx, fy], [T[i + 1][j + 1], fx, fy]].filter((c) => c[0] != null);
  if (!v.length) return null; let s = 0, w = 0; for (const [val, a, b] of v) { s += val * a * b; w += a * b; } return w > 0 ? s / w : null; }

/* the edge: tonight's measured odds against every evening — the median 60-session return and the share higher, each in units of its own spread.
   A tie-breaker sheet (shrinkTo = the main reading) counts in proportion to the evenings it has within one kernel width of the spot:
   with THIN of them it counts half, with none it does not vote — so a regime nobody has seen at this spot cannot invent odds. */
export const THIN = 30;
export function edgeOf(sheet, model, rsi, pct, shrinkTo = null) {
  let m = readSheet(sheet, model.grid, "med60", rsi, pct), p = readSheet(sheet, model.grid, "share60", rsi, pct);
  const near = readSheet(sheet, model.grid, "near", rsi, pct) ?? 0; let lambda = 1;
  if (shrinkTo) { lambda = near / (near + THIN); if (m == null || p == null) { m = shrinkTo.m; p = shrinkTo.p; lambda = 0; } else { m = lambda * m + (1 - lambda) * shrinkTo.m; p = lambda * p + (1 - lambda) * shrinkTo.p; } }
  if (m == null || p == null) return null; const B = model.baseline;
  return { m, p, near, lambda, e: (m - B.med60) / B.sdMed60 + (p - B.share60) / B.sdShare60 }; }

/* edge → % invested: a straight line between the rungs history placed; flat beyond the ends */
export function pctFromEdge(e, rungs) {
  const E = rungs.edges; if (e <= E[0]) return LADDER[0]; if (e >= E[E.length - 1]) return LADDER[LADDER.length - 1];
  for (let k = 0; k < E.length - 1; k++) if (e <= E[k + 1]) { const f = E[k + 1] === E[k] ? 1 : (e - E[k]) / (E[k + 1] - E[k]); return LADDER[k] + f * (LADDER[k + 1] - LADDER[k]); }
  return LADDER[LADDER.length - 1]; }

export function money(pct) {
  const micron = Math.min(MICRON_SHARE * pct, MICRON_CAP), conviction = CONVICTION_SHARE * pct;
  return { invested: pct, cash: 100 - pct, conviction, micron, core: pct - micron }; }

/* the deployed line is the average of tonight's reading and the two before it (prior = [yesterday, the day before], newest first): the
   reading can move with one close; the line gets there over three evenings — transitions, not cliffs */
export const LINE_EVENINGS = 3;
export function lineOf(pct, prior = []) { const a = [pct, ...prior.filter((v) => v != null).slice(0, LINE_EVENINGS - 1)]; return +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(1); }
export function deploy(inputs, model, prior = []) {
  const { rsi, vixPct } = inputs; const reasons = [];
  if (!(rsi >= 0 && rsi <= 100) || !(vixPct >= 0 && vixPct <= 100)) throw new Error("deploy: rsi and vixPct must be 0–100");
  let fearPct = vixPct, fearSource = "VIX";
  if (model.putCall && model.putCall.counts && inputs.putCallPct != null && inputs.putCallPct > vixPct) { fearPct = inputs.putCallPct; fearSource = "put/call"; }
  const main = edgeOf(model.sheets.all, model, rsi, fearPct); if (!main) throw new Error("deploy: no measured neighbours");
  let e = main.e; const parts = { main: main.e };
  const tr = inputs.trendRising == null ? null : edgeOf(model.sheets[inputs.trendRising ? "rising" : "falling"], model, rsi, fearPct, main);
  const cr = inputs.creditAbove == null ? null : edgeOf(model.sheets[inputs.creditAbove ? "creditAbove" : "creditBelow"], model, rsi, fearPct, main);
  if (tr) { e += 0.5 * (tr.e - main.e); parts.trend = tr.e; } if (cr) { e += 0.5 * (cr.e - main.e); parts.credit = cr.e; }
  let pct = pctFromEdge(e, model.rungs);
  /* the 10-year: a note of its own, outside the fear reading, with a tilt only where the measurement earned one (0 = advisory) */
  let tenTilt = 0, tenNote = null; const T = model.tenYear;
  if (T && inputs.tenStretchPct != null) { const hot = inputs.tenStretchPct >= 80, cold = inputs.tenStretchPct <= 20; const S = T.short || {};
    tenNote = hot ? `the 10-year yield is stretched high in its own year (${Math.round(inputs.tenStretchPct)}th percentile): history read that as ${S.hotIsBetter ? "a mild tailwind" : "a mild headwind, not a contrarian buy"} (${S.hotText || ""})` : cold ? `the 10-year yield is washed out in its own year (${Math.round(inputs.tenStretchPct)}th percentile): history read that as ${S.hotIsBetter ? "a mild headwind" : "the better side"} (${S.coldText || ""})` : "the 10-year yield is not stretched in its own year";
    if (hot) tenTilt += (S.hotIsBetter ? 1 : -1) * T.shortTilt; if (cold) tenTilt -= (S.hotIsBetter ? 1 : -1) * T.shortTilt; }
  if (T && inputs.tenAbove200 != null) { const L = T.long || {}; tenNote = (tenNote ? tenNote + "; " : "") + (inputs.tenAbove200 ? `it sits above its 200-day (rising) — the longer-term ${L.fallingIsBetter ? "negative" : "positive"} (${L.aboveText || ""})` : `it sits under its 200-day (falling) — the longer-term ${L.fallingIsBetter ? "positive" : "negative"} (${L.belowText || ""})`); if (inputs.tenAbove200) tenTilt -= (L.fallingIsBetter ? 1 : -1) * T.longTilt; else tenTilt += (L.fallingIsBetter ? 1 : -1) * T.longTilt; }
  const beforeTilt = pct; pct = clamp(pct + tenTilt, LADDER[0], LADDER[LADDER.length - 1]);
  /* reasons, in plain words */
  reasons.push(`SPY's daily RSI is ${rsi.toFixed(0)} and the ${fearSource} sits at the ${Math.round(fearPct)}th percentile of its own past year${fearSource === "put/call" ? " (the put/call spiked without the VIX, and history says that counts)" : ""}`);
  reasons.push(`evenings like this were followed by a median ${(main.m * 100).toFixed(1)}% over 60 sessions, higher ${(main.p * 100).toFixed(0)}% of the time (every evening: ${(model.baseline.med60 * 100).toFixed(1)}%, ${(model.baseline.share60 * 100).toFixed(0)}%)`);
  const tie = (x, what) => x.lambda === 0 ? `${what}: no comparable evening near this spot — that sheet does not vote tonight` : `${what} the same spot read ${(x.m * 100).toFixed(1)}% / ${(x.p * 100).toFixed(0)}% (${Math.round(x.near)} evenings near it${x.lambda < 0.5 ? ", thin, so it counts " + Math.round(x.lambda * 100) + "%" : ""}) — pulls the edge ${x.e > main.e + 1e-9 ? "up" : x.e < main.e - 1e-9 ? "down" : "nowhere"}`;
  if (tr) reasons.push(tie(tr, `with SPY's 200-day ${inputs.trendRising ? "rising" : "falling"}`));
  if (cr) reasons.push(tie(cr, `with credit (HYG, payouts added back) ${inputs.creditAbove ? "above" : "under"} its 200-day`));
  reasons.push(`the edge is ${e >= 0 ? "+" : ""}${e.toFixed(2)}; history put ${LADDER.join(" / ")}% at ${model.rungs.edges.map((v) => (v >= 0 ? "+" : "") + v.toFixed(2)).join(" / ")}, so the line says ${beforeTilt.toFixed(0)}%`);
  if (tenNote) reasons.push(tenNote + (tenTilt ? ` (tilt ${tenTilt > 0 ? "+" : ""}${tenTilt} points)` : " (advisory only — it does not move the number)"));
  const line = lineOf(+pct.toFixed(1), prior); if (prior.length) reasons.push(`the line is the average of the last ${Math.min(LINE_EVENINGS, prior.length + 1)} evenings' readings: ${line.toFixed(0)}%`);
  return { pct: +pct.toFixed(1), line, pctBeforeTilt: +beforeTilt.toFixed(1), edge: +e.toFixed(3), parts, fearPct, fearSource, odds: { med60: main.m, share60: main.p }, tenTilt, money: money(line), moneyTonight: money(+pct.toFixed(1)), reasons }; }
