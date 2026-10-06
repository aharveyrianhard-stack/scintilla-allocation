/* R4 (6 Oct 2026) — the two dials' hand-checks: the invested number follows the stated rule from REGIME, STRETCH and credit; STRETCH is the
   mean of its four blocks; REGIME is 0.6 structure + 0.4 breadth; breadth is counted over hundreds of served companies; the 10-year's own
   Geiger exists on the chart API's bars and is recorded with the proof; VIX spike days obey the 35% rule; the nine breakouts are scored and the
   counts add up; the study page renders headless with no error and no write.   node --test tests/r4.test.mjs */
import { test } from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path";
import { openPage, ROOT } from "./_harness.mjs";
const R = JSON.parse(fs.readFileSync(path.join(ROOT, "study/r4/data/r4.json"), "utf8"));
const near = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;
const BASE = (v) => v >= 0.5 ? 90 : v >= 0.2 ? 75 : v > -0.2 ? 60 : v > -0.5 ? 40 : 25;
test("every session with both dials: invested = base(REGIME) − 20 × STRETCH − 10 if credit is not confirming, bounded 15–100", () => {
  const S = R.series.filter((s) => s.invested != null); assert.ok(S.length >= 400, "sessions with both dials " + S.length);
  for (const s of S) { assert.equal(s.base, BASE(s.regime), s.date); const want = Math.max(15, Math.min(100, Math.round(s.base - 20 * s.stretch - (s.creditFlag ? 10 : 0)))); assert.ok(Math.abs(s.invested - want) <= 1, s.date + " " + s.invested + " vs " + want);   /* the stored dials are rounded to four places, so a half-point can round either way */ assert.ok(s.regime >= -1 && s.regime <= 1 && s.stretch >= -1 && s.stretch <= 1, s.date); }
});
test("STRETCH is the mean of its four blocks and REGIME is 0.6 × structure + 0.4 × breadth, clamped", () => {
  for (const s of R.series) { if (s.stretch != null) { const b = s.blocks; assert.ok(near((b.indexGeigers + b.rsiWilliams + b.vix + b.tenYear) / 4, s.stretch, 2e-3), s.date); }
    if (s.regime != null) assert.ok(near(Math.max(-1, Math.min(1, 0.6 * s.structure + 0.4 * s.breadthRead)), s.regime, 2e-3), s.date); }
});
test("breadth is counted daily over hundreds of served companies, and the percentages are percentages", () => {
  assert.ok(R.breadthUniverse.companies >= 300); const last = R.series[R.series.length - 1].breadth; assert.ok(last.n >= 300);
  for (const s of R.series) if (s.breadth) { for (const k of ["pct200", "pct50"]) if (s.breadth[k] != null) assert.ok(s.breadth[k] >= 0 && s.breadth[k] <= 100, s.date); assert.ok(s.breadth.adv + s.breadth.dec <= s.breadth.n, s.date); }
});
test("the 10-year's own Geiger: US10Y sits on the chart API macro board with D, 3D and W bars, and its Geiger reads on every replayed session", () => {
  const p = R.macroProof; assert.equal(p.board_symbol, "US10Y"); assert.ok(p.macro_board.includes("US10Y")); assert.ok(p.bars.D >= 500 && p.bars["3D"] >= 300 && p.bars.W >= 200, JSON.stringify(p.bars)); assert.ok(p.quote && p.quote.price > 0);
  for (const s of R.series) { assert.notEqual(s.ten.g, null, s.date); assert.ok(s.ten.g >= -1 && s.ten.g <= 1); assert.ok(near(s.blocks.tenYear, -s.ten.g, 2e-3), s.date); }
  const t = R.today.tenBand; assert.ok(t.yield > 0); assert.ok(near(t.inverted, -t.ownGeiger, 1e-6));
});
test("VIX: a spike day is a close at least 35% over its own 60-session median, and the read is −ratio ÷ 0.35 clamped", () => {
  let spikes = 0; for (const s of R.series) { if (!s.vix) continue; assert.equal(s.vix.spike, s.vix.ratio >= 0.35, s.date); assert.ok(near(s.vix.read, Math.max(-1, Math.min(1, -s.vix.ratio / 0.35)), 2e-3), s.date); if (s.vix.spike) spikes++; }
  assert.equal(spikes, R.summary.spikeDays); assert.ok(R.summary.spikes.length >= 1);
});
test("the nine breakouts are scored, every event carries both reads, and the counts add up", () => {
  assert.equal(R.events.length, 9); assert.equal(R.check.scored, 9); const c = R.check; assert.equal(c.followedThrough + c.failed, 9);
  for (const e of R.events) { assert.equal(e.followed, e.ret20 > 0); assert.ok(["add", "hold", "hold back"].includes(e.heatSays)); assert.ok(["add", "hold", "hold back"].includes(e.twoSays), e.breakDate); assert.ok(e.invested >= 15 && e.invested <= 100); }
  for (const side of ["heat", "two"]) { const k = c[side]; assert.equal(k.holdBack_followed + k.hold_followed + k.add_followed, c.followedThrough); assert.equal(k.holdBack_failed + k.hold_failed + k.add_failed, c.failed); }
  assert.ok(c.pairs.heat.rightOrder <= c.pairs.heat.pairs && c.pairs.two.rightOrder <= c.pairs.two.pairs && c.pairs.total === c.followedThrough * c.failed);
});
test("the tree-aware middle: every cohort reads its served members, percentiles are percentiles, cold-with-growth follows the stated thresholds", () => {
  const T = R.tree; assert.ok(T.cohorts.length >= 50); for (const c of T.cohorts) { assert.ok(c.served <= c.n); if (c.ownPct12m != null) assert.ok(c.ownPct12m >= 0 && c.ownPct12m <= 1); assert.equal(c.coldForItself, c.ownPct12m != null && c.ownPct12m <= 0.25); assert.equal(c.goodGrowthFmp, c.fmpGrowthMedian != null && c.fmpGrowthMedian >= 0.10, c.id); }   /* growth from the stored FMP estimates; the comps feed flaps */
  assert.deepEqual(T.coldWithGrowthFmp, T.cohorts.filter((c) => c.coldForItself && c.goodGrowthFmp).sort((a, b) => a.ownPct12m - b.ownPct12m).map((c) => c.id)); assert.ok(Object.keys(T.sectors.sectors).length >= 14);
});
test("the study page renders headless with no page errors and no write, and stays inside a phone screen", async () => {
  for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h, path: "study/r4/R4.html" });
    try { await P.page.waitForFunction(() => window.READY != null, null, { timeout: 60000 }); const r = await P.page.evaluate(() => ({ ready: window.READY, dials: document.querySelectorAll("#dials .dial").length, events: document.querySelectorAll("#events table tr").length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      assert.equal(r.dials, 3); assert.ok(r.events >= 10); assert.ok(typeof r.ready.invested === "number"); assert.deepEqual(P.errors, []); assert.equal(P.nonGet.allowed, 0); assert.ok(r.sw <= r.cw + 1, "horizontal scroll " + r.sw + " > " + r.cw); }
    finally { await P.close(); } }
});

/* ---- the second half: the coordinator's steering (a)–(f) ---- */
test("the four indexes: IWM and RSP are read beside SPY and QQQ, each with its own pullback history and the rank of a pullback today", () => {
  for (const k of ["SPY", "QQQ", "IWM", "RSP"]) { const x = R.indexes[k]; assert.ok(x.bars >= 1000, k); assert.equal(x.reviewedByLab, k === "SPY" || k === "QQQ"); assert.ok(x.now.structure && x.now.structure.level > 0, k); assert.ok(x.now.rsi > 0 && x.now.rsi < 100);
    const P = x.pullbacks; assert.ok(P.count >= 5 && P.count === P.list.length, k); for (const e of P.list) { assert.ok(e.depth <= -0.03, k + " " + e.peak); assert.ok(e.low > e.peak && e.recovered > e.low); }
    const B = P.rsiLowBands; assert.equal(B.over50 + B.from40to50 + B.from30to40 + B.under30, P.list.filter((e) => e.uptrendAtPeak !== false && e.rsiLow != null).length, k); assert.equal(Object.values(P.tagged).reduce((a, b) => a + b, 0), P.count, k);
    assert.equal(x.wouldRank.length, 4); for (const r of x.wouldRank) if (r.shallower != null) assert.equal(r.shallower, P.list.filter((e) => e.depth > r.depthFromHigh).length, k + " " + r.to);
    const L = x.leaderOnPullback; assert.ok(L.lastTwoYears_higher20Later <= L.lastTwoYears_scored && L.lastTwoYears_scored <= L.lastTwoYears && L.lastTwoYears <= L.visits, k); assert.ok(L.last.rsiLow <= 50); }
});
test("the midpoint: every count is a count of scored sessions, and the stretches add back to the group", () => {
  const G = R.midpoint.groups; assert.ok(G["middling heat, narrow leadership"].sessions + G["middling heat, broad"].sessions <= G["every session"].sessions);
  for (const g of Object.values(G)) for (const k of ["next20", "next60"]) { assert.ok(g[k].sessions <= g.sessions); assert.ok(g[k].spyBeatEqualWeight <= g[k].sessions && g[k].spyBeatMedianCompany <= g[k].sessions); }
  const S = R.midpoint.midNarrowStretches, N = G["middling heat, narrow leadership"]; assert.equal(S.length, N.stretches); assert.equal(S.reduce((a, s) => a + s.sessions, 0), N.sessions); assert.equal(S.reduce((a, s) => a + s.spyBeatEqualWeightAt60, 0), N.next60.spyBeatEqualWeight);
});
test("core and satellite: the parts add to the % invested, cash is the rest, and a satellite sale lands in the index sleeve, never in cash", () => {
  const share = (reg) => reg >= 0.2 ? 25 : reg > -0.2 ? 20 : 10;
  for (const s of R.series) { const c = s.cs; if (!c) continue; assert.ok(Math.abs(c.satellite + c.coreIndex + c.coreLeaders - s.invested) <= 0.15, s.date); assert.equal(c.cash, 100 - s.invested); assert.equal(c.satelliteShareOfInvested, share(s.regime), s.date); assert.ok(Math.abs(c.satellite - s.invested * share(s.regime) / 100) <= 0.06, s.date); }
  const X = R.coreSat.workedExit; assert.equal(X.after.cash, X.before.cash); assert.ok(Math.abs((X.before.satellite - X.after.satellite) - (X.after.coreIndex - X.before.coreIndex)) <= 0.11); assert.equal(X.after.coreLeaders, X.before.coreLeaders);
});
test("oversold, deserved or not: every oversold name is in its own lowest fifth and under zero, and the verdict follows the stated rule, growth first", () => {
  const O = R.oversold; assert.equal(O.names.length, O.oversold); assert.equal(Object.values(O.counts).reduce((a, b) => a + b, 0), O.oversold); assert.ok(O.coverage.withForwardGrowth >= 0.9 * O.coverage.of);
  for (const n of O.names) { assert.ok(n.pct <= 0.2 && n.live < 0, n.t); const cuts = n.revN >= 3 && n.revNet < 0; let want;
    if (n.fwdRev == null || n.preRevenue) want = "UNKNOWN"; else if (n.fwdRev < 0 || (n.ttmRev != null && n.fwdRev < n.ttmRev - 0.10 && n.fwdRev < 0.10)) want = "DESERVED"; else if (n.fwdRev < 0.05 && cuts) want = "DESERVED"; else if (n.fwdRev >= 0.10 && !cuts) want = "UNDESERVED"; else want = "MIXED";
    assert.equal(n.verdict, want, n.t); assert.equal(n.revNet, n.targetRaises - n.targetCuts + n.upgrades - n.downgrades, n.t); }
});
test("the cohort bow tie: the blend is the mean of the reads present, the gap is equal-weight minus cap-weight, and the groups follow the 0.10 mark", () => {
  const B = R.cohortBow; assert.ok(B.rows.length >= 50);
  for (const r of B.rows) { const v = Object.values(r.reads).filter((x) => x != null); assert.equal(v.length + r.missing.length, 5, r.id); assert.ok(near(r.blend, v.reduce((a, b) => a + b, 0) / v.length, 2e-3), r.id);
    if (r.bow != null) { assert.ok(near(r.bow, r.reads.equalWeight - r.reads.capWeight, 2e-3), r.id); if (Math.abs(Math.abs(r.bow) - 0.10) > 2e-3) assert.equal(r.group, r.bow >= 0.10 ? "THE AVERAGE NAME LEADS" : r.bow <= -0.10 ? "THE GIANTS CARRY IT" : "LEVEL", r.id); } }
  assert.equal(Object.values(B.groups).reduce((a, g) => a + g.length, 0), B.rows.length); for (let i = 1; i < B.rows.length; i++) assert.ok(B.rows[i - 1].blend >= B.rows[i].blend, "hot → cold");
});
test("the second half is drawn: six more panels render at both widths with no error", async () => {
  for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h, path: "study/r4/R4.html" });
    try { await P.page.waitForFunction(() => window.READY != null, null, { timeout: 60000 }); const r = await P.page.evaluate(() => ({ idx: document.querySelectorAll("#indexes tr").length, pull: document.querySelectorAll("#pullbacks .dial").length, mid: document.querySelectorAll("#midtable tr").length, cs: document.querySelectorAll("#coresat table tr").length, und: document.querySelectorAll("#undeserved tr").length, bow: document.querySelectorAll("#bowtie tr").length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      assert.ok(r.idx >= 12); assert.equal(r.pull, 4); assert.equal(r.mid, 6); assert.equal(r.cs, 4); assert.ok(r.und >= 2); assert.ok(r.bow >= 50); assert.deepEqual(P.errors, []); assert.equal(P.nonGet.allowed, 0); assert.ok(r.sw <= r.cw + 1); }
    finally { await P.close(); } }
});
