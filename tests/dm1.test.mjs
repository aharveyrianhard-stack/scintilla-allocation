/* DM1 tests (7 Oct 2026) — the deployment engine: the pure function's arithmetic, the measured table's consistency with its own
   sentences, the replay's line, and the study page rendering headless at 1680 and 390. Study only: index.html is untouched. */
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { openPage, ROOT } from "./_harness.mjs";
import { deploy, readSheet, pctFromEdge, lineOf, money, edgeOf, LADDER, RUNG_PCTL, THIN } from "../study/dm1/engine.mjs";
const J = JSON.parse(fs.readFileSync(path.join(ROOT, "study/dm1/data/dm1.json"), "utf8")); const M = J.model, T = J.today, S = J.scenarios, R = J.replay;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const inputsToday = { rsi: T.rsi, vixPct: T.vixPct, putCallPct: null, trendRising: T.rising, creditAbove: T.creditAbove, tenStretchPct: T.ten.stretchPct, tenAbove200: T.ten.above200 };

test("1 · edge → % invested: the rungs are hit exactly, the line between them is straight and never leaves 15–100", () => {
  M.rungs.edges.forEach((e, k) => assert.equal(pctFromEdge(e, M.rungs), LADDER[k]));
  const mid = (M.rungs.edges[2] + M.rungs.edges[3]) / 2; assert.ok(near(pctFromEdge(mid, M.rungs), (LADDER[2] + LADDER[3]) / 2, 1e-9));
  assert.equal(pctFromEdge(-99, M.rungs), 15); assert.equal(pctFromEdge(99, M.rungs), 100);
  let prev = -Infinity; for (let e = -8; e <= 8; e += 0.05) { const p = pctFromEdge(e, M.rungs); assert.ok(p >= prev - 1e-9); prev = p; } });

test("2 · the money: conviction is a fifth of what is invested, Micron 0.4× capped at 30, and cash + core + Micron = 100", () => {
  for (const p of [15, 33.4, 50, 75, 80, 100]) { const m = money(p); assert.ok(near(m.conviction, 0.2 * p, 1e-9)); assert.ok(near(m.micron, Math.min(0.4 * p, 30), 1e-9)); assert.ok(near(m.cash + m.core + m.micron, 100, 1e-9)); assert.ok(m.core >= 0); }
  assert.equal(money(80).micron, 30); assert.equal(money(50).micron, 20); });

test("3 · tonight: the engine on the stored inputs reproduces the page's number, edge and reasons; the line is the three-evening average", () => {
  const d = deploy(inputsToday, M, S[0].prior); assert.equal(d.pct, S[0].pct); assert.equal(d.edge, S[0].edge); assert.equal(d.line, S[0].line);
  assert.equal(d.line, lineOf(S[0].pct, S[0].prior)); assert.ok(near(d.line, (S[0].pct + S[0].prior[0] + S[0].prior[1]) / 3, 0.06));
  assert.ok(d.reasons.some((r) => /RSI is 62/.test(r)) && d.reasons.some((r) => /history put 15 \/ 30 \/ 50 \/ 80 \/ 100%/.test(r)));
  for (const sc of S) { const e = deploy({ ...inputsToday, rsi: sc.rsi, vixPct: sc.vixPct }, M); assert.equal(e.pct, sc.pct, sc.name); assert.equal(e.edge, sc.edge, sc.name); } });

test("4 · a tie-breaker sheet counts in proportion to the evenings it has near the spot; with none it does not vote", () => {
  const main = edgeOf(M.sheets.all, M, T.rsi, T.vixPct); const cb = edgeOf(M.sheets.creditBelow, M, T.rsi, T.vixPct, main);
  assert.ok(near(cb.lambda, cb.near / (cb.near + THIN), 1e-9)); assert.ok(cb.lambda < 0.5, "tonight's credit-under spot is thin");
  /* a spot the credit-under sheet never saw: find one on the grid and check the shrunk reading equals the main one */
  let empty = null; for (let i = 0; i < M.grid.rsi.length && !empty; i++) for (let j = 0; j < M.grid.pct.length; j++) if (M.sheets.creditBelow.near[i][j] === 0 && M.sheets.all.med60[i][j] != null && readSheet(M.sheets.creditBelow, M.grid, "near", M.grid.rsi[i], M.grid.pct[j]) === 0) { empty = [M.grid.rsi[i], M.grid.pct[j]]; break; }
  assert.ok(empty, "an empty credit-under spot exists"); const m2 = edgeOf(M.sheets.all, M, ...empty), c2 = edgeOf(M.sheets.creditBelow, M, ...empty, m2); assert.equal(c2.lambda, 0); assert.ok(near(c2.e, m2.e, 1e-9));
  const withC = deploy({ ...inputsToday, rsi: empty[0], vixPct: empty[1], trendRising: null }, M), without = deploy({ ...inputsToday, rsi: empty[0], vixPct: empty[1], trendRising: null, creditAbove: null }, M); assert.equal(withC.pct, without.pct); });

test("5 · the engine refuses an impossible reading and keeps the 10-year out of the number tonight (advisory)", () => {
  assert.throws(() => deploy({ rsi: 120, vixPct: 10 }, M)); assert.throws(() => deploy({ rsi: 50, vixPct: -1 }, M));
  assert.equal(M.tenYear.shortTilt, 0); assert.equal(M.tenYear.longTilt, 0); const d = deploy(inputsToday, M); assert.equal(d.tenTilt, 0); assert.equal(d.pct, d.pctBeforeTilt);
  assert.ok(d.reasons.some((r) => /advisory only/.test(r)));
  const d2 = deploy({ ...inputsToday, tenStretchPct: null, tenAbove200: null }, M); assert.equal(d2.pct, d.pct); });

test("6 · the rungs sit at the stated percentiles of the evenings' edges, and the line spends the stated share at each end", () => {
  const cols = R.seriesCols; const ei = cols.indexOf("edge"), li = cols.indexOf("linePct"), ti = cols.indexOf("tonightPct");
  const es = R.series.map((r) => r[ei]).filter((v) => v != null).sort((a, b) => a - b); const q = (p) => es[Math.round((es.length - 1) * p / 100)];
  M.rungs.edges.forEach((e, k) => assert.ok(near(e, q(RUNG_PCTL[k]), 0.12), `rung ${LADDER[k]} at the ${RUNG_PCTL[k]}th percentile: ${e} vs ${q(RUNG_PCTL[k])}`));
  const tn = R.series.map((r) => r[ti]).filter((v) => v != null); const share = (f) => tn.filter(f).length / tn.length;
  assert.ok(near(share((v) => v >= 99.5), 0.05, 0.015)); assert.ok(near(share((v) => v <= 15.5), 0.05, 0.015)); assert.ok(near(share((v) => v >= 80), 0.20, 0.03));
  /* the line is the average of the last three readings */
  for (let k = 2; k < R.series.length; k += 97) assert.ok(near(R.series[k][li], (R.series[k][ti] + R.series[k - 1][ti] + R.series[k - 2][ti]) / 3, 0.06)); });

test("7 · the sheets: shares are shares, thin means under 30 near evenings, and the baseline is the all-evenings median and share", () => {
  for (const [k, sh] of Object.entries(M.sheets)) for (let i = 0; i < M.grid.rsi.length; i++) for (let j = 0; j < M.grid.pct.length; j++) { const s = sh.share60[i][j]; if (s != null) assert.ok(s >= 0 && s <= 1, k); assert.equal(sh.thin[i][j], sh.near[i][j] < 30, k); assert.ok(sh.near[i][j] <= sh.evenings); }
  assert.ok(M.baseline.med60 > 0.02 && M.baseline.med60 < 0.06); assert.ok(M.baseline.share60 > 0.65 && M.baseline.share60 < 0.8); assert.equal(M.baseline.n, J.evWithOutcome);
  assert.equal(M.sheets.rising.evenings + M.sheets.falling.evenings, M.sheets.all.evenings); });

test("8 · the page's own sentences agree with its data: credit, the put/call switch, the 10-year's direction, the seven dates", () => {
  const C = J.credit; const failing = C.adjusted.filter((r) => r.belowWorse60 === false).map((r) => r.band); assert.deepEqual(failing, C.survives.adjusted); assert.deepEqual(C.priceOnly.filter((r) => r.belowWorse60 === false).map((r) => r.band), C.survives.priceOnly);
  assert.ok(C.shareUnder.adjusted < C.shareUnder.priceOnly); assert.ok(J.recon.driftPct < 0.005, "price + payouts rebuilds FMP's adjusted series");
  const G = J.putCall.groups; const rule = G.pcOnly.n >= 30 && G.pcOnly.med60 > G.neither.med60 && G.pcOnly.share60.share > G.neither.share60.share; assert.equal(J.putCall.counts, rule); assert.equal(M.putCall.counts, rule);
  const TY = J.tenYear; assert.equal(M.tenYear.short.hotIsBetter, TY.gaps.short.med60 > 0 && TY.gaps.short.share60 > 0); assert.equal(M.tenYear.long.fallingIsBetter, TY.gaps.long.med60 > 0 && TY.gaps.long.share60 > 0);
  assert.deepEqual(R.seven.map((s) => s.date), ["2026-03-26", "2025-04-04", "2023-10-30", "2022-10-17", "2020-03-17", "2018-12-21", "2009-03-02"]);
  assert.deepEqual(R.seven.map((s) => s.low.date), ["2026-03-30", "2025-04-08", "2023-10-27", "2022-10-12", "2020-03-23", "2018-12-24", "2009-03-09"]);
  for (const s of R.seven) { assert.ok(s.line >= 15 && s.line <= 100); assert.ok(s.low.line >= 15 && s.low.line <= 100); } });

test("9 · Alan's rule: every spike is a first close above the line after a close at or under it, at least 10 sessions apart", () => {
  for (const L of [20, 23]) { const list = J.alanRule[L].list; assert.equal(list.length, J.alanRule[L].events); for (const r of list) assert.ok(r.vix > L, `${r.date} ${r.vix}`); const d = list.map((r) => Date.parse(r.date)); for (let k = 1; k < d.length; k++) assert.ok(d[k] - d[k - 1] >= 10 * 864e5); } });

test("10 · index.html: nothing of the tool removed or rewritten since the 6 Oct evening (DM2, 7 Oct, adds the matrix's live line as its own block — tests/dm2.test.mjs, test 18), and no key is in any committed study file", () => {
  /* DM1 pinned the page as untouched because its engine was study-only. On the DM2 branch the brief wires version 2 beside the ladder, so the pin is now: additions only. */
  /* RL1 (7 Oct), re-pinned for the release: the page of the 6 Oct evening (39e3667) has since been rebuilt by the tool split and the
     one-basis work, so the pin is the release's own merge of the matrix — the tree before it (ed06fe2) against the merge (e5f4c6e):
     that merge removed no line of the tool. What the release then changed on purpose (the money panel reads the live engine) is
     pinned in tests/rl1.test.mjs. */
  const stat = execFileSync("git", ["-C", ROOT, "diff", "--numstat", "ed06fe2", "e5f4c6e", "--", "index.html"], { encoding: "utf8" }).trim().split(/\s+/); assert.ok(stat[0] === "" || stat[1] === "0", "no line of the tool removed: " + stat.join(" "));
  for (const f of ["study/dm1/engine.mjs", "study/dm1/DM1.html", "scripts/dm1-build.mjs", "scripts/dm1-fmp-hyg.mjs"]) { const t = fs.readFileSync(path.join(ROOT, f), "utf8"); assert.ok(!/apikey=[A-Za-z0-9]{10,}/.test(t) && !/eyJ[A-Za-z0-9_-]{20,}/.test(t), f); }
  assert.ok(!/eyJ[A-Za-z0-9_-]{20,}/.test(JSON.stringify(J))); });

test("11 · the page renders headless at 1680 and 390: ready, no error, no write, no sideways scroll, no text under 11px, the pictures' numbers on screen", async () => {
  for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h, path: "study/dm1/DM1.html" }); try {
    await P.page.waitForFunction(() => window.DM1_READY === true, null, { timeout: 60000 });
    const r = await P.page.evaluate(() => { const els = [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && getComputedStyle(e).display !== "none"); return { scrollW: document.scrollingElement.scrollWidth, minFont: Math.min(...els.map((e) => parseFloat(getComputedStyle(e).fontSize))), tiles: document.getElementById("tiles").textContent, map: document.getElementById("map").querySelectorAll("rect").length, bars: document.querySelectorAll("#bars .bar").length, scen: document.querySelectorAll("#scen tr").length, hist: document.getElementById("history").querySelectorAll("path").length }; });
    assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked + P.nonGet.allowed, 0); assert.ok(r.scrollW <= w, "no sideways scroll"); assert.ok(r.minFont >= 11); assert.ok(r.tiles.includes(Math.round(S[0].line) + "%")); assert.ok(r.map > 100); assert.equal(r.bars, S.length); assert.equal(r.scen, S.length + 1); assert.ok(r.hist >= 4);
  } finally { await P.close(); } } });
