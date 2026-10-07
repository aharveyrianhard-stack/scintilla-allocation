/* DM2 tests (7 Oct 2026) — the deployment matrix, version 2: the engine's arithmetic, the matrix's protection where its table is thin, the
   keep rule against its own numbers, the grid and the replay's consistency, the live module's clock and arithmetic (pure, then against
   the chart API), and the two pages rendering headless at 1680 and 390 — the live line inside the tool and the study page.
   Nothing here writes: every page test runs with non-GET requests blocked and counted. */
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { openPage, ROOT } from "./_harness.mjs";
import { deploy2, matrixRead, placeOf, factorRead, voteOf, interp, money, lineOf, pctFromEdge, readSheet, LADDER, THIN } from "../study/dm2/engine.mjs";
import { shouldRefresh, nextRead, etParts, SESSION, hygWithPayouts, placeInYear, rsiSeries, smaAt, quotePrice, withLive, alignCloses, inputsAt, readLive, fetchCandles, fetchQuotes, day, dayY } from "../study/dm2/live.mjs";
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8")); const D = J("study/dm2/data/dm2.json"), W = J("study/dm2/data/dm2-with2008.json"), LV = J("study/dm2/data/dm2-live.json");
const M = D.model, T = D.today, near = (a, b, tol) => Math.abs(a - b) <= tol;
const API = "https://scintilla-massive-chart-api.fly.dev", getApi = async (p) => { const r = await fetch(API + p, { headers: { Origin: "https://scintillahub.ai" }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(p.split("?")[0] + " " + r.status); return r.json(); };

test("1 · the engine's small parts: a value's place in its history, a curve read between its points, a line read flat beyond its ends", () => {
  const f = M.factors[0]; assert.equal(f.q.length, 101); assert.equal(placeOf(f.q, f.q[0] - 5), 0); assert.equal(placeOf(f.q, f.q[100] + 5), 100); assert.ok(near(placeOf(f.q, f.q[50]), 50, 0.51));
  let prev = -1; for (let k = 0; k <= 100; k += 5) { const u = placeOf(f.q, f.q[k]); assert.ok(u >= prev - 1e-9); prev = u; }
  const r = factorRead(f, 12.5); assert.ok(near(r.gm, (f.gm[2] + f.gm[3]) / 2, 1e-9)); assert.equal(factorRead(f, -9).gm, f.gm[0]); assert.equal(factorRead(f, 999).gp, f.gp[f.gp.length - 1]);
  assert.equal(voteOf(f, null, M.baseline), null); assert.equal(voteOf(f, NaN, M.baseline), null);
  assert.equal(interp([0, 10, 20], [1, 3, 7], 5), 2); assert.equal(interp([0, 10, 20], [1, 3, 7], -4), 1); assert.equal(interp([0, 10, 20], [1, 3, 7], 99), 7); });

test("2 · the matrix is protected where its table is thin: it counts the table by the evenings near the spot and the two lines for the rest", () => {
  assert.equal(M.thinMatrix, 250, "the table counts half at 250 evenings");
  const a = matrixRead(M, T.rsi, T.vixPct), sm = readSheet(M.sheets.all, M.grid, "med60", T.rsi, T.vixPct), nr = readSheet(M.sheets.all, M.grid, "near", T.rsi, T.vixPct);
  assert.ok(near(a.lambda, nr / (nr + 250), 1e-9)); assert.ok(near(a.m, a.lambda * sm + (1 - a.lambda) * a.lines.m, 1e-12)); assert.ok(a.near > 250, "tonight's spot is well populated");
  /* a spot history never sat at: a calm RSI with the VIX at a record — version 1 refused it; here the two lines answer and the reading says so */
  let empty = null; for (let i = 0; i < M.grid.rsi.length && !empty; i++) for (let j = 0; j < M.grid.pct.length; j++) if (M.sheets.all.med60[i][j] == null && readSheet(M.sheets.all, M.grid, "med60", M.grid.rsi[i], M.grid.pct[j]) == null) { empty = [M.grid.rsi[i], M.grid.pct[j]]; break; }
  assert.ok(empty, "an unmeasured spot exists on the grid"); const e = matrixRead(M, ...empty); assert.equal(e.lambda, 0); assert.equal(e.table, null); assert.ok(near(e.m, e.lines.m, 1e-12));
  const d = deploy2({ rsi: empty[0], vixPct: empty[1], break100: T.break100 }, M); assert.ok(d.pct >= 15 && d.pct <= 100); assert.equal(d.thinSpot, true); assert.ok(d.reasons.some((r) => /hardly ever sat at this spot/.test(r)));
  /* the two lines are flat beyond their last well-measured band: no reading invented from fewer than 30 evenings */
  for (const L of [M.marg.rsi, M.marg.pct]) L.near.forEach((n, k) => { if (n < THIN) assert.ok(L.near.some((v, q) => v >= THIN && L.m[q] === L.m[k]), "a thin grid point reads as a measured neighbour"); }); });

test("3 · tonight: the engine on the stored inputs gives the page's number, the votes add up, and the line is the three-evening average", () => {
  const inp = LV.check.inputs, d = deploy2(inp, M, LV.check.prior); assert.equal(d.pct, T.v2.pct); assert.equal(d.line, T.v2.line); assert.equal(d.pct, LV.check.pct); assert.equal(d.line, LV.check.line);
  assert.ok(near(d.line, (d.pct + LV.check.prior[0] + LV.check.prior[1]) / 3, 0.06)); assert.equal(d.line, lineOf(d.pct, LV.check.prior));
  assert.ok(near(d.matrixPct + d.votes.reduce((s, v) => s + v.points, 0), d.pct, 0.11), "the matrix plus the votes is the reading");
  assert.deepEqual(d.votes.map((v) => v.key), D.kept); assert.ok(d.reasons[0].includes("on its own the matrix says")); assert.ok(d.reasons.some((r) => /^together: \d+% invested$/.test(r)));
  /* the compact model the live line reads is the study's model */
  assert.deepEqual(LV.model.rungs, M.rungs); assert.deepEqual(LV.model.factors.map((f) => f.key), D.kept); assert.equal(LV.model.thinMatrix, M.thinMatrix); assert.deepEqual(LV.model.advisory.map((f) => f.key), D.dropped); });

test("4 · the money: Micron is 0.4 × the % capped at 30, and cash + core + Micron is 100", () => {
  for (const p of [15, 38.7, 47, 60, 75, 80, 100]) { const m = money(p); assert.ok(near(m.micron, Math.min(0.4 * p, 30), 1e-9)); assert.ok(near(m.cash + m.core + m.micron, 100, 1e-9)); assert.ok(m.core >= 0 && m.cash >= 0); }
  assert.equal(money(75).micron, 30); assert.equal(money(100).micron, 30); assert.ok(near(T.v2.money.micron, 0.4 * T.v2.line, 1e-9)); });

test("5 · the engine refuses an impossible reading; a factor with no reading does not vote and says so", () => {
  assert.throws(() => deploy2({ rsi: 120, vixPct: 10 }, M)); assert.throws(() => deploy2({ rsi: 50, vixPct: -1 }, M)); assert.throws(() => deploy2({ vixPct: 50 }, M));
  const d = deploy2({ rsi: T.rsi, vixPct: T.vixPct, break100: null }, M); assert.equal(d.pct, d.matrixPct); assert.ok(d.votes[0].missing); assert.ok(d.reasons.some((r) => /no reading — it does not vote/.test(r))); });

test("6 · a calm dip no longer lowers the number: the reading rises as SPY's RSI falls with the VIX held, and a 100-day break adds", () => {
  const C = D.calmDip; assert.ok(C.v2.today < C.v2.dip15 && C.v2.dip15 < C.v2.dip3, "39 → 58 → 87"); assert.ok(C.dip15.full < C.today.full, "version 1 fell on the same dip");
  for (let k = 1; k < C.walk.length; k++) assert.ok(C.walk[k].v2 >= C.walk[k - 1].v2 - 0.6, `no step down at RSI ${C.walk[k].rsi}`);
  /* why version 1 fell: its credit-under sheet had a handful of evenings near the spot, and counted more as the dip began */
  assert.ok(C.today.creditSheet.eveningsNear <= 10 && C.dip15.creditSheet.countsPct > C.today.creditSheet.countsPct); assert.ok(near(D.thin.moved, C.today.full - C.today.withTrendOnly, 0.11)); assert.ok(D.thin.moved < -10, "the thin sheet took more than ten points off");
  const f = M.factors.find((x) => x.key === "break100"), B = M.baseline; assert.ok(voteOf(f, -3, B).add > voteOf(f, 4.5, B).add, "under its 100-day votes more than comfortably above it"); assert.ok(voteOf(f, -3, B).add > 0); });

test("7 · the grid Alan asked for: six drawdowns × the calm VIX and six VIX levels; a deeper fall never reads lower; credit does not move it", () => {
  const G = D.grid; assert.deepEqual(G.drawdowns, [0, -1.5, -3, -5, -7, -10]); assert.deepEqual(G.vixes, [16, 20, 23.5, 25, 30, 40]); assert.equal(G.asToday.length, 6); for (const r of G.asToday) assert.equal(r.length, 7);
  for (const r of G.asToday) for (const c of r) { assert.ok(c.v2 >= 15 && c.v2 <= 100); assert.ok(near(c.micron, Math.min(0.4 * c.v2, 30), 0.06)); }
  for (let k = 0; k < 7; k++) for (let i = 1; i < 6; i++) assert.ok(G.asToday[i][k].v2 >= G.asToday[i - 1][k].v2 - 0.6, `column ${k}: ${G.asToday[i][k].dd}% reads at least what ${G.asToday[i - 1][k].dd}% does`);
  assert.equal(G.creditCounts, false); G.asToday.forEach((r, i) => r.forEach((c, k) => assert.equal(c.v2, G.healed[i][k].v2)));
  assert.equal(G.asToday[0][0].v2, T.v2.pct, "the first cell is tonight"); assert.ok(G.creditToday < 0 && G.creditHealed > 0);
  /* the cells of the usual pairing all read at least tonight's number, and from a 5% fall on the number is 100 */
  for (const [dd, v] of [[-1.5, 16], [-3, 20], [-5, 23.5], [-7, 30], [-10, 40]]) { const c = G.asToday[G.drawdowns.indexOf(dd)][G.vixes.indexOf(v) + 1]; assert.ok(c.v2 > T.v2.pct); if (dd <= -5) assert.equal(c.v2, 100); }
  /* the little drop: 1.5% and 2% in one session, the VIX where it usually goes */
  assert.deepEqual(D.littleDrop.map((d) => d.dd), [-1.5, -2]); for (const d of D.littleDrop) { assert.ok(d.days >= 20 && d.vixRatio > 1); assert.ok(d.usual.v2 > T.v2.pct, "a small drop raises the reading"); } assert.ok(D.littleDrop[1].usual.v2 > D.littleDrop[0].usual.v2); });

test("8 · the keep rule is applied as written: kept = passed the brief's test and never the wrong way in the three other fits", () => {
  const dirOK = (t) => t.gapMed60 > 0 && t.yearsRight * 2 > t.yearsVoted; assert.equal(D.factorSheets.length, 7);
  for (const f of D.factorSheets) { for (const k of ["2015", "2017", "2019", "otherDesign"]) { const t = f.splits[k]; assert.equal(t.passes, t.gapMed60 >= 0.01 && t.gapShare60 >= 0.03 && t.yearsRight * 2 > t.yearsVoted, `${f.key} ${k}`); }
    assert.equal(f.directionHeld, ["2015", "2017", "2019", "otherDesign"].every((k) => dirOK(f.splits[k])), f.key); assert.equal(f.kept, D.kept.includes(f.key)); if (f.kept) assert.ok(f.passedFirstTest && f.directionHeld, f.key); if (f.passedFirstTest && f.directionHeld) assert.ok(f.kept, f.key); }
  assert.deepEqual(D.kept, ["break100"]); assert.deepEqual(D.standards.neverTheWrongWay, D.kept); assert.deepEqual(D.standards.briefTestOnly.slice().sort(), ["break100", "goldX"]); assert.deepEqual(D.standards.fullBarInEveryFit, [], "by the strictest reading nothing earns its place — the page says so");
  assert.deepEqual(M.factors.map((f) => f.key), D.kept); assert.deepEqual([...D.kept, ...D.dropped].sort(), D.factorSheets.map((f) => f.key).sort());
  /* gold reverses when 2008 is left in the fit; credit's gap is large in every fit and wrong inside most years */
  const g = D.factorSheets.find((f) => f.key === "goldX"), c = D.factorSheets.find((f) => f.key === "credit"); assert.ok(g.splits[2017].passes && g.splits.otherDesign.gapMed60 < 0); assert.ok(c.splits[2017].gapMed60 > 0.01 && c.splits[2017].yearsRight * 2 <= c.splits[2017].yearsVoted);
  assert.equal(W.kept.join(), "break100", "the 100-day break is also what is kept with 2008 in the fit"); });

test("9 · the replay: the line is the average of three evenings, every reading sits on the ladder's span, and the design never saw 2008", () => {
  const S = D.replay.series, ci = Object.fromEntries(D.replay.cols.map((c, k) => [c, k])); assert.ok(S.length > 4800); assert.equal(S.at(-1)[0], D.to); assert.equal(D.fitFrom, "2009-03-10"); assert.equal(D.with2008, false); assert.equal(W.fitFrom, "2008-01-02");
  for (let k = 5; k < S.length; k += 53) { const a = S[k][ci.v2], b = S[k - 1][ci.v2], c = S[k - 2][ci.v2]; if (a == null || b == null || c == null) continue; assert.ok(near(S[k][ci.v2line], (a + b + c) / 3, 0.06), S[k][0]); }
  for (const r of S) for (const c of [ci.v2, ci.v2line, ci.v1line]) if (r[c] != null) assert.ok(r[c] >= 15 && r[c] <= 100);
  assert.equal(S.at(-1)[ci.v2], T.v2.pct); assert.equal(S.at(-1)[ci.v2line], T.v2.line); });

test("10 · bottoms and tops: the seven dates and their lows, the three evenings asked about, the named tops and the 2026 highs", () => {
  assert.deepEqual(D.bottoms.seven.map((b) => b.date), ["2026-03-26", "2025-04-04", "2023-10-30", "2022-10-17", "2020-03-17", "2018-12-21", "2009-03-02"]);
  assert.deepEqual(D.bottoms.seven.map((b) => b.low.date), ["2026-03-30", "2025-04-08", "2023-10-27", "2022-10-12", "2020-03-23", "2018-12-24", "2009-03-09"]);
  assert.deepEqual(D.bottoms.recent.map((b) => b.date), ["2026-07-29", "2026-07-30", "2026-09-16"]);
  for (const b of D.bottoms.seven) { assert.ok(b.low.v2line >= 90, `${b.low.date}: the line is at least 90% at the slide low (${b.low.v2line})`); assert.ok(b.v2line >= 80, b.date); assert.ok(b.low.next60 > 0); }
  const tops = D.tops.map((t) => t.date); for (const d of ["2007-10-09", "2018-01-26", "2020-02-19", "2022-01-03", "2024-07-16", "2025-02-19"]) assert.ok(tops.includes(d), d); assert.ok(D.highs2026.length >= 2 && D.highs2026.every((h) => h.date.startsWith("2026")));
  for (const t of D.tops) assert.ok(t.v2line <= 55, `${t.date}: the line is under 55% at the high (${t.v2line})`); assert.ok(D.tops.find((t) => t.date === "2007-10-09").beforeFit);
  /* 2008, reported: the design that never saw it averaged about 80% invested on the way down — the price of not designing around it */
  const k8 = Object.keys(D.payoffs).find((k) => k.startsWith("the 2008")), S8 = D.payoffs[k8]; assert.ok(S8["version 2 as it is"].worstFall < -0.35 && S8["version 2 as it is"].avgInvested > 70); assert.ok(S8["version 1 as it is"].worstFall > S8["version 2 as it is"].worstFall);
  /* with 2008 left in the fit the engine is timid at the lows — the comparison the page draws */
  const w = Object.fromEntries(W.bottoms.map((b) => [b.date, b])); assert.ok(w["2025-04-04"].low.v2line < 60 && w["2020-03-17"].low.v2line < 70); });

test("11 · the payoff and the floor: the four versions asked for, each with its payoff, worst fall and average invested out of sample", () => {
  const P = D.payoffs["2018 → 2026, fitted to 2017 (the honest check)"]; const ks = ["version 2 as it is", "version 2 over a 40% floor", "version 2 over a 50% floor", "version 2 over a 60% floor"];
  for (const k of [...ks, "version 1 as it is", "today's ladder", "always 60% invested", "buy and hold"]) { assert.ok(P[k], k); assert.ok(P[k].multiple > 1 && P[k].worstFall < 0 && P[k].avgInvested > 0 && P[k].avgInvested <= 100); }
  for (let i = 1; i < ks.length; i++) { assert.ok(P[ks[i]].avgInvested >= P[ks[i - 1]].avgInvested); assert.ok(P[ks[i]].multiple >= P[ks[i - 1]].multiple, "each step of the floor paid more"); assert.ok(near(P[ks[i]].worstFall, P[ks[0]].worstFall, 0.01), "and cost nothing in the worst fall"); }
  assert.equal(P["buy and hold"].avgInvested, 100); assert.equal(P["always 60% invested"].avgInvested, 60); assert.deepEqual(D.floors, [40, 50, 60]); assert.ok(/three closes running/.test(D.slowFilter.rule));
  const R = D.rankings["2018 → 2026, fitted to 2017"]; assert.ok(R["version 2"].rankCorr > R["the matrix alone"].rankCorr && R["the matrix alone"].rankCorr > R["version 1"].rankCorr, "version 2 ranked unseen evenings better than the matrix alone, and that better than version 1");
  /* the table against the two lines: out of sample, at every split year, the less the table counted the better the ranking */
  for (const y of ["2015", "2017", "2019"]) for (let k = 1; k < D.tableWeight.length; k++) assert.ok(D.tableWeight[k].splits[y].rankCorr >= D.tableWeight[k - 1].splits[y].rankCorr - 0.002, `fit to ${y}: ${D.tableWeight[k].label}`); });

test("12 · proportion: every factor is in the same unit, and the depth of the dip is worth more than the VIX's place", () => {
  const P = D.proportion; assert.ok(near(P.ptsPerEdge, 85 / (M.rungs.edges[4] - M.rungs.edges[0]), 0.01)); assert.ok(P.rsi.swing > 2 * P.vix.swing, "the RSI's swing is more than twice the VIX's");
  assert.deepEqual(P.factors.map((f) => f.key).sort(), D.factorSheets.map((f) => f.key).sort()); for (const f of P.factors) assert.ok(f.swing >= 0 && f.average >= 0);
  const line = (L) => L.m.map((m, k) => (m / M.baseline.sdMed60 + L.p[k] / M.baseline.sdShare60) * P.ptsPerEdge), r = line(M.marg.rsi), v = line(M.marg.pct); assert.ok(Math.max(...r) - Math.min(...r) > 5 * (Math.max(...v) - Math.min(...v)), "the RSI's own line is worth more than five times the VIX's own line"); });

test("13 · the live line's clock: on load, every 5 minutes while New York is open, once after the close, never at the weekend", () => {
  const at = (weekday, hh, mm, date = "2026-10-07") => ({ date, weekday, minutes: hh * 60 + mm, hhmm: "" });
  assert.equal(shouldRefresh(at("Wed", 3, 0), null), true, "never read → read");
  assert.equal(shouldRefresh(at("Wed", 10, 4), at("Wed", 10, 0)), false); assert.equal(shouldRefresh(at("Wed", 10, 5), at("Wed", 10, 0)), true); assert.equal(shouldRefresh(at("Wed", 9, 30), at("Wed", 8, 0)), true, "the open");
  assert.equal(shouldRefresh(at("Wed", 9, 29), at("Wed", 8, 0)), false, "not before the open"); assert.equal(shouldRefresh(at("Wed", 16, 5), at("Wed", 15, 58)), false, "not between the close and 16:10");
  assert.equal(shouldRefresh(at("Wed", 16, 10), at("Wed", 15, 58)), true, "once after the close"); assert.equal(shouldRefresh(at("Wed", 17, 30), at("Wed", 16, 10)), false, "and only once");
  assert.equal(shouldRefresh(at("Sat", 11, 0, "2026-10-10"), at("Fri", 16, 10, "2026-10-09")), false); assert.equal(shouldRefresh(at("Mon", 9, 31, "2026-10-12"), at("Fri", 16, 10, "2026-10-09")), true, "a new session");
  assert.deepEqual([SESSION.open, SESSION.close, SESSION.afterClose, SESSION.everyMin], [570, 960, 970, 5]); assert.match(nextRead(at("Wed", 10, 0)), /10:05 New York/); assert.match(nextRead(at("Wed", 15, 58)), /after the close/); assert.match(nextRead(at("Sat", 10, 0)), /next open/);
  /* New York wall-clock from the time-zone table: 14:00 UTC is 10:00 in October (daylight time) and 09:00 in January */
  assert.deepEqual([etParts(new Date("2026-10-07T14:00:00Z")).hhmm, etParts(new Date("2026-10-07T14:00:00Z")).date, etParts(new Date("2026-10-07T14:00:00Z")).weekday], ["10:00", "2026-10-07", "Wed"]); assert.equal(etParts(new Date("2026-01-07T14:00:00Z")).hhmm, "09:00");
  assert.equal(day("2026-10-06"), "6 Oct"); assert.equal(dayY("2026-03-30"), "30 Mar 2026"); });

test("14 · the live line's arithmetic: payouts added back to HYG, a value's place in its year, the session's own close preferred, today's bar added once", () => {
  const dates = ["2026-08-31", "2026-09-01", "2026-09-02", "2026-10-01", "2026-10-02", "2026-11-02", "2026-11-03"], price = [100, 99.6, 99.6, 99.6, 99.6, 99.6, 99.6];
  const h = hygWithPayouts(dates, price, [["2025-11-03", 0.5], ["2026-09-01", 0.4], ["2026-10-01", 0.4]]); assert.ok(near(h.tr[1], 100 * (99.6 + 0.4) / 100, 1e-9), "the payout is counted on its ex-date"); assert.ok(near(h.tr[3], h.tr[2] * (99.6 + 0.4) / 99.6, 1e-9));
  assert.equal(h.estimated, 1, "one payout assumed after the last known: last year's 3 Nov, at the last size"); assert.ok(near(h.tr[6], h.tr[5] * (99.6 + 0.4) / 99.6, 1e-9)); assert.ok(near(h.tr[5], h.tr[4], 1e-9), "not on 2 Nov");
  const v = Array.from({ length: 252 }, (_, k) => k); assert.equal(placeInYear(v, 251), 100); assert.equal(placeInYear(v.slice().reverse(), 251), 0); assert.equal(placeInYear([1, 2, 3], 2), null, "under 200 sessions there is no year");
  const up = Array.from({ length: 40 }, (_, k) => 100 + k); assert.equal(rsiSeries(up)[39], 100); assert.equal(smaAt([1, 2, 3, 4], 2, 3), 3.5); assert.equal(smaAt([1, 2], 5, 1), null);
  assert.equal(quotePrice({ price: 10, today_session_close: null, today_session_close_state: "ABSENT" }), 10); assert.equal(quotePrice({ price: 10.4, today_session_close: 10.1, today_session_close_state: "SETTLED" }), 10.1, "after the close the session's own close is read, not an after-hours trade"); assert.equal(quotePrice(null), null);
  const S = { dates: ["2026-10-05", "2026-10-06"], SPY: [1, 2], QQQ: [1, 2], HYG: [1, 2], TLT: [1, 2], GLD: [1, 2], VIX: [15, 16] }, q = (p) => ({ price: p, price_session_et: "2026-10-07" });
  const a = withLive(S, { SPY: q(3), QQQ: q(3), HYG: q(3), TLT: q(3) }, { VIX: { quote: { price: 17, session_et: "2026-10-07" } } }); assert.equal(a.live, true); assert.equal(a.S.dates.length, 3); assert.equal(a.S.SPY[2], 3); assert.equal(a.S.VIX[2], 17); assert.deepEqual(a.missing, ["GLD"]); assert.equal(a.S.GLD[2], 2, "a missing quote falls back to the last close and is named");
  const b = withLive(S, { SPY: { price: 3, price_session_et: "2026-10-06" } }, null); assert.equal(b.live, false); assert.equal(b.S.dates.length, 2, "no bar is added while the session is the last settled one"); });

test("15 · the live module against the chart API: rebuilt from 420 daily bars, the model's own session gives the build's inputs and number", async () => {
  const candles = await fetchCandles(getApi), S = alignCloses(candles), k = S.dates.indexOf(LV.check.date); assert.ok(S.dates.length >= 400, "420 bars asked, " + S.dates.length + " served"); assert.ok(k >= 260, "the model's session is inside the window (rebuild the model if this fails with age)");
  const inp = inputsAt(S, k, LV); for (const key of ["rsi", "vixPct", "trend", "credit", "break100", "vixLevel", "bondsX", "goldX"]) assert.ok(near(inp[key], LV.check.inputs[key], 0.02), `${key}: ${inp[key]} against the build's ${LV.check.inputs[key]}`);
  const d = deploy2(inp, LV.model, LV.check.prior); assert.ok(near(d.pct, LV.check.pct, 0.2)); assert.ok(near(d.line, LV.check.line, 0.2));
  const { quotes, macro } = await fetchQuotes(getApi), R = readLive({ base: LV, candles, quotes, macro }); assert.ok(R.reading.pct >= 15 && R.reading.pct <= 100); assert.ok(near(R.reading.line, (R.reading.pct + R.prior[0].pct + R.prior[1].pct) / 3, 0.06)); assert.ok(near(R.money.micron, Math.min(0.4 * R.reading.line, 30), 1e-9));
  assert.equal(R.lights.length, D.dropped.length); assert.ok(R.session >= LV.check.date); });

test("16 · the tool: the matrix's line sits under the ladder in step 2, live, at 1680 and 390 — no error, no write, no sideways scroll, no text under 11px, the ladder untouched", async () => {
  for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h }); try {
    await P.page.waitForFunction(() => window.DM2_LIVE_READY === true, null, { timeout: 90000 }); await P.page.waitForTimeout(6000);
    const r = await P.page.evaluate(() => { const root = document.getElementById("dm2l-root"), el = document.getElementById("dm2live"), st = window.DM2_LIVE, pol = document.getElementById("policy");
      return { has: !!root, line: root && +root.dataset.line, reading: root && +root.dataset.reading, after: pol.nextElementSibling === el, samePanel: pol.closest(".panel") === el.closest(".panel"), reads: st.reads, error: st.error, prior: st.read.prior.map((p) => p.pct), money: st.read.money, ladder: st.ladderPct, ladderPage: policyStep(heat()).pct, votes: st.read.reading.votes.map((v) => v.key),
        text: el.innerText, scrollW: document.scrollingElement.scrollWidth, minFont: Math.min(...[...el.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent.trim()).map((e) => parseFloat(getComputedStyle(e).fontSize))), policyText: pol.innerText.slice(0, 60) }; });
    assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked + P.nonGet.allowed, 0, "no write of any kind"); assert.ok(r.has && r.after && r.samePanel, "the line is the ladder's next sibling, in step 2"); assert.equal(r.error, null);
    assert.ok(r.line >= 15 && r.line <= 100 && r.reading >= 15 && r.reading <= 100); assert.ok(near(r.line, (r.reading + r.prior[0] + r.prior[1]) / 3, 0.06)); assert.ok(near(r.money.cash + r.money.core + r.money.micron, 100, 1e-6)); assert.ok(near(r.money.micron, Math.min(0.4 * r.line, 30), 1e-6));
    assert.equal(r.ladder, r.ladderPage, "the line shows the ladder's own number and does not change it"); assert.match(r.policyText, /THE LADDER/); assert.deepEqual(r.votes, D.kept); assert.equal(r.reads, 1, "one reading on load, no second inside five minutes");
    for (const s of ["THE MATRIX, LIVE", "the matrix's line", "the ladder says", "WHY — IN POINTS OF % INVESTED", "THE MONEY THAT FOLLOWS", "Micron = 0.4 ×", "the rest of the core", "New York"]) assert.ok(r.text.includes(s), s);
    assert.ok(r.scrollW <= w, "no sideways scroll"); assert.ok(r.minFont >= 11, "no text under 11px: " + r.minFont);
  } finally { await P.close(); } } });

test("17 · the study page renders headless at 1680 and 390: ready, no error, no write, no sideways scroll, no text under 11px, its numbers on screen", async () => {
  for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h, path: "study/dm2/DM2.html" }); try {
    await P.page.waitForFunction(() => window.DM2_READY === true, null, { timeout: 60000 }); await P.page.waitForFunction(() => window.DM2_LIVE_TILE === true, null, { timeout: 60000 }); await P.page.waitForFunction(() => [...document.querySelectorAll("#shots img")].every((i) => i.complete), null, { timeout: 30000 });
    const r = await P.page.evaluate(() => { const els = [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && getComputedStyle(e).display !== "none"); const q = (s) => document.querySelectorAll(s).length;
      return { scrollW: document.scrollingElement.scrollWidth, minFont: Math.min(...els.map((e) => parseFloat(getComputedStyle(e).fontSize))), tiles: document.getElementById("tiles").innerText, panels: q(".panel[id]"), grid: q("#grid .c"), factors: q("#factors tr"), bottoms: q("#bottoms tr"), tops: q("#tops tr"), pay: q("#pay tr"), svgs: q(".chart svg"), dec: q("#dec li"), wrong: q("#wrong li"), imgs: [...document.querySelectorAll("#shots img")].map((i) => i.complete && i.naturalWidth > 0), stamp: document.getElementById("stamp").textContent, live: document.getElementById("liveV").textContent }; });
    assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked + P.nonGet.allowed, 0); assert.ok(r.scrollW <= w, "no sideways scroll"); assert.ok(r.minFont >= 11, "no text under 11px: " + r.minFont);
    assert.equal(r.panels, 10); assert.equal(r.grid, 42); assert.equal(r.factors, 2 + 7 + 1); assert.equal(r.bottoms, 1 + 14 + 1 + 3); assert.equal(r.tops, 1 + D.tops.length); assert.ok(r.pay >= 9); assert.ok(r.svgs >= 6); assert.equal(r.dec, 3, "at most three decisions"); assert.ok(r.wrong >= 8);
    assert.ok(r.tiles.includes(Math.round(T.v2.line) + "%")); assert.ok(r.tiles.includes(Math.round(T.ladder) + "%")); assert.match(r.stamp, /10 Mar 2009/); assert.deepEqual(r.imgs, [true, true], "both pictures of the tool load"); assert.match(r.live, /^\d+%$/, "the live tile read the same module the tool runs");
  } finally { await P.close(); } } });

test("18 · index.html changed only by the line's own block, and no key is in any committed file of this study", () => {
  /* RL1 (7 Oct), re-pinned for the release: against the tree before the matrix was merged in (ed06fe2), the merge (e5f4c6e) adds the
     line's own block and nothing else. The release's own later change to the money panel is pinned in tests/rl1.test.mjs. */
  const stat = execFileSync("git", ["-C", ROOT, "diff", "--numstat", "ed06fe2", "e5f4c6e", "--", "index.html"], { encoding: "utf8" }).trim().split(/\s+/); assert.equal(stat[1], "0", "no line of the tool was removed or rewritten"); assert.ok(+stat[0] > 0 && +stat[0] <= 12, "a dozen added lines at most: " + stat[0]);
  const added = execFileSync("git", ["-C", ROOT, "diff", "-U0", "ed06fe2", "e5f4c6e", "--", "index.html"], { encoding: "utf8" }).split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")); for (const l of added) assert.ok(/dm2|DM2|matrix|startLiveMatrix|<script type="module">|<\/script>|catch\(/i.test(l), "an added line that is not the matrix's: " + l.slice(0, 80));
  for (const f of ["study/dm2/engine.mjs", "study/dm2/live.mjs", "study/dm2/DM2.html", "scripts/dm2-build.mjs", "scripts/dm2-lib.mjs", "scripts/dm2-pull.mjs", "scripts/dm2-live-check.mjs", "scripts/dm2-shots.mjs", "study/dm2/data/dm2.json", "study/dm2/data/dm2-live.json", "study/dm2/data/dm2-with2008.json"]) { const t = fs.readFileSync(path.join(ROOT, f), "utf8"); assert.ok(!/apikey=[A-Za-z0-9]{10,}/.test(t) && !/eyJ[A-Za-z0-9_-]{20,}/.test(t), f); }
  for (const f of fs.readdirSync(path.join(ROOT, "study/dm2/pictures"))) assert.ok(/\.png$/.test(f)); assert.ok(fs.readdirSync(path.join(ROOT, "study/dm2/pictures")).length >= 20); });
