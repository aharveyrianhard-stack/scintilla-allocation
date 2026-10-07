/* DM2 (7 Oct 2026) — the deployment matrix, version 2: how much to have invested, read from measured odds.
   One pure function, deploy2(inputs, model, prior) → { pct, line, votes, money, reasons, … }.

   What changed against version 1 (study/dm1/engine.mjs):
     · the matrix is the same kind of table — SPY's daily RSI × the VIX's place in its own year → what SPY did in the next 60 sessions —
       but a spot history rarely sat at no longer reads at face value: it leans on the RSI's own line and the VIX's own line (matrixRead);
     · the two on/off tie-breaker sheets (200-day rising or falling, credit above or under) are gone. In their place every extra factor is a
       CONTINUOUS reading with its own measured curve: how much median return and how much share-higher it added ON TOP of the matrix and
       of the other factors (fitted together, each on what the others left unexplained). A factor a little under its line votes a little;
       one far under votes more — no cliff at the line;
     · every factor's vote is in the same unit (the edge), so the votes add and can be compared: "one tier of VIX is worth this many
       points, one band of credit that many".

   The model is measured by scripts/dm2-build.mjs (study/dm2/data/dm2.json → "model"; the compact copy the live line reads is
   study/dm2/data/dm2-live.json):
     grid, sheets.all, baseline   as in version 1 (the smoothed matrix; the all-evenings median and share, and the spread of each)
     marg       the RSI's own line and the VIX-place's own line (what each added by itself) — what the matrix leans on where its table is thin
     factors    the factors that earned their place, in the order they vote. Each: key, q (its 101-point quantile table — a value's place
                among the evenings the model was fitted on), grid (places 0–100), gm / gp (the extra median 60-session return and the
                extra share higher at each place), near (evenings within one kernel width)
     rungs      where the edge sat on the evenings history put at 15 / 30 / 50 / 80 / 100 %

   inputs: { rsi, vixPct, …one number per factor key (null = not known; that factor then does not vote) }
     rsi        SPY's daily RSI(14)                           vixPct     the VIX's place in its own past year, 0–100
     trend      SPY's 200-day average, % change over 21 sessions          credit     dividend-adjusted HYG, % above (+) or under (−) its 200-day
     geiger     the SPY and QQQ Geigers' place in their own past year (the average of the two), 0–100
     break100   the nearer-to-broken of SPY and QQQ against its own 100-day average, % above (+) or under (−)
     vixLevel   the VIX itself, in points                     bondsX / goldX   TLT's / GLD's 14-day RSI placed in its own past year, 0–100 */
import { readSheet, edgeOf, pctFromEdge, money, lineOf, LADDER, RUNG_PCTL, THIN, MICRON_SHARE, MICRON_CAP, LINE_EVENINGS } from "../dm1/engine.mjs";
export { readSheet, edgeOf, pctFromEdge, money, lineOf, LADDER, RUNG_PCTL, THIN, MICRON_SHARE, MICRON_CAP, LINE_EVENINGS };

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* a value's place among the evenings the model was fitted on, 0–100: straight lines through the factor's quantile table, flat beyond its ends */
export function placeOf(q, z) {
  const n = q.length - 1; if (z <= q[0]) return 0; if (z >= q[n]) return 100;
  let lo = 0, hi = n; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (q[mid] <= z) lo = mid; else hi = mid; }
  return (100 / n) * (q[hi] === q[lo] ? lo : lo + (z - q[lo]) / (q[hi] - q[lo])); }

/* a factor's measured vote at a place: straight lines between the grid points */
export function factorRead(f, u) {
  const G = f.grid, x = clamp(u, G[0], G[G.length - 1]); let i = 0; while (i < G.length - 2 && G[i + 1] <= x) i++;
  const t = (x - G[i]) / (G[i + 1] - G[i]), L = (a) => a[i] + t * (a[i + 1] - a[i]); return { gm: L(f.gm), gp: L(f.gp), near: L(f.near) }; }

/* one factor's vote in edge units: its extra median return and extra share higher, each in units of the matrix's own spread, counted in
   proportion to the evenings it has near that place (the version-1 rule: with THIN of them it counts half, with none it does not vote) */
export function voteOf(f, z, baseline) {
  if (z == null || !isFinite(z)) return null; const u = placeOf(f.q, z), r = factorRead(f, u), lambda = r.near / (r.near + THIN);
  return { z, place: u, gm: r.gm, gp: r.gp, near: r.near, lambda, add: lambda * (r.gm / baseline.sdMed60 + r.gp / baseline.sdShare60) }; }

/* a straight-line read of a curve tabulated on a grid, flat beyond its ends */
export function interp(grid, arr, x) { const v = clamp(x, grid[0], grid[grid.length - 1]); let i = 0; while (i < grid.length - 2 && grid[i + 1] <= v) i++; const t = (v - grid[i]) / (grid[i + 1] - grid[i]); return arr[i] + t * (arr[i + 1] - arr[i]); }

/* THE MATRIX READ. Version 1 read the smoothed table at face value everywhere, and only its tie-breaker sheets were protected against
   thin evidence ("with 30 evenings near the spot it counts half, with none it does not vote"). Here the same rule protects the matrix
   itself. Two readings exist at every spot:
     the table   the kernel-smoothed median return and share higher of the evenings NEAR this spot (RSI and VIX together)
     the lines   what the RSI on its own and the VIX's place on its own each added, summed (two well-populated curves, model.marg)
   The matrix counts the table in proportion to the evenings near the spot (near / (near + THIN)) and the lines for the rest. Where
   history is thick the table decides; at a spot it rarely or never sat (a 3% dip with a calm VIX, a calm RSI with the VIX at a record)
   the two lines decide, so a handful of evenings cannot invent a 100% or a 15%. */
export function matrixRead(model, rsi, pct) {
  const B = model.baseline, S = model.sheets.all, G = model.grid; const sm = readSheet(S, G, "med60", rsi, pct), sp = readSheet(S, G, "share60", rsi, pct), near = readSheet(S, G, "near", rsi, pct) ?? 0;
  if (!model.marg) { if (sm == null || sp == null) return null; return { m: sm, p: sp, near, lambda: 1, table: { m: sm, p: sp }, lines: null, e: (sm - B.med60) / B.sdMed60 + (sp - B.share60) / B.sdShare60 }; }
  const M = model.marg, am = B.med60 + interp(G.rsi, M.rsi.m, rsi) + interp(G.pct, M.pct.m, pct), ap = B.share60 + interp(G.rsi, M.rsi.p, rsi) + interp(G.pct, M.pct.p, pct);
  const lambda = sm == null || sp == null ? 0 : near / (near + THIN), m = lambda ? lambda * sm + (1 - lambda) * am : am, p = lambda ? lambda * sp + (1 - lambda) * ap : ap;
  return { m, p, near, lambda, table: sm == null || sp == null ? null : { m: sm, p: sp }, lines: { m: am, p: ap, rsi: { m: interp(G.rsi, M.rsi.m, rsi), p: interp(G.rsi, M.rsi.p, rsi) }, vix: { m: interp(G.pct, M.pct.m, pct), p: interp(G.pct, M.pct.p, pct) } }, e: (m - B.med60) / B.sdMed60 + (p - B.share60) / B.sdShare60 }; }

/* the plain words for each factor's reading */
export const ord = (n) => { const k = Math.round(n), s = ["th", "st", "nd", "rd"], v = k % 100; return k + (s[(v - 20) % 10] || s[v] || s[0]); };
const f1 = (x) => Math.abs(x).toFixed(1);
export const SAY = {
  trend: (z) => `SPY's 200-day average is ${z >= 0 ? "rising" : "falling"} ${f1(z)}% a month`,
  credit: (z) => `credit — HYG with its payouts added back — is ${f1(z)}% ${z >= 0 ? "above" : "under"} its 200-day`,
  geiger: (z) => `the SPY and QQQ Geigers sit at the ${ord(z)} percentile of their own past year`,
  break100: (z) => (z >= 0 ? `SPY and QQQ are both above their 100-day (the nearer one by ${f1(z)}%)` : `the weaker of SPY and QQQ has closed ${f1(z)}% under its 100-day`),
  vixLevel: (z) => `the VIX itself is at ${z.toFixed(1)}`,
  bondsX: (z) => `long bonds (TLT) are at the ${ord(z)} percentile of their own year's stretch${z >= 90 ? " — a rush into safety" : z <= 10 ? " — being dumped" : ""}`,
  goldX: (z) => `gold (GLD) is at the ${ord(z)} percentile of its own year's stretch${z >= 90 ? " — a rush into safety" : z <= 10 ? " — being dumped" : ""}`,
};
export const NAME = { matrix: "the matrix (RSI × VIX)", trend: "200-day direction", credit: "credit distance", geiger: "index Geigers", break100: "100-day break", vixLevel: "VIX level", bondsX: "long bonds at an extreme", goldX: "gold at an extreme" };
const pts = (x) => (Math.abs(x) < 0.5 ? "nothing" : (x > 0 ? "+" : "−") + Math.abs(x).toFixed(0) + " point" + (Math.abs(x).toFixed(0) === "1" ? "" : "s"));

/* the reading. prior = [yesterday's reading, the day before's] newest first: the deployed line is the three-evening average, as in version 1 */
export function deploy2(inputs, model, prior = []) {
  const { rsi, vixPct } = inputs; if (!(rsi >= 0 && rsi <= 100) || !(vixPct >= 0 && vixPct <= 100)) throw new Error("deploy2: rsi and vixPct must be 0–100");
  const B = model.baseline, main = matrixRead(model, rsi, vixPct); if (!main) throw new Error("deploy2: no measured neighbours");
  let e = main.e; const matrixPct = pctFromEdge(e, model.rungs), votes = [], reasons = [];
  reasons.push(`SPY's daily RSI is ${rsi.toFixed(0)} and the VIX sits at the ${ord(vixPct)} percentile of its own past year: evenings like this were followed by a median ${(main.m * 100).toFixed(1)}% over 60 sessions, higher ${(main.p * 100).toFixed(0)}% of the time (every evening: ${(B.med60 * 100).toFixed(1)}%, ${(B.share60 * 100).toFixed(0)}%) — on its own the matrix says ${matrixPct.toFixed(0)}%`);
  if (main.lambda < 0.5) reasons.push(`history rarely sat at this spot (${Math.round(main.near)} evenings near it), so ${Math.round((1 - main.lambda) * 100)}% of that reading comes from the RSI on its own and the VIX on its own rather than from the two together`);
  for (const f of model.factors) { const v = voteOf(f, inputs[f.key], B);
    if (!v) { votes.push({ key: f.key, missing: true, add: 0, points: 0 }); reasons.push(`${NAME[f.key] || f.key}: no reading — it does not vote`); continue; }
    const before = pctFromEdge(e, model.rungs); e += v.add; const after = pctFromEdge(e, model.rungs); votes.push({ key: f.key, ...v, points: after - before });
    reasons.push(`${(SAY[f.key] || (() => f.key))(v.z)} — worth ${pts(after - before)}${v.lambda < 0.5 ? ` (thin: only ${Math.round(v.near)} evenings like it, so it counts ${Math.round(v.lambda * 100)}%)` : ""}`); }
  const pct = +pctFromEdge(e, model.rungs).toFixed(1), line = lineOf(pct, prior);
  reasons.push(`together: ${pct.toFixed(0)}% invested`);
  if (prior.filter((v) => v != null).length) reasons.push(`the line is the average of the last ${Math.min(LINE_EVENINGS, prior.filter((v) => v != null).length + 1)} evenings' readings: ${line.toFixed(0)}%`);
  return { pct, line, edge: +e.toFixed(3), matrixPct: +matrixPct.toFixed(1), matrixEdge: +main.e.toFixed(3), thinSpot: main.lambda < 0.5, matrix: { near: Math.round(main.near), lambda: +main.lambda.toFixed(3) }, votes, odds: { med60: main.m, share60: main.p }, money: money(line), moneyTonight: money(pct), reasons }; }
