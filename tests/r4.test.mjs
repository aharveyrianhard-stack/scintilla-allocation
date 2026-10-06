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
  for (const s of S) { assert.equal(s.base, BASE(s.regime), s.date); const want = Math.max(15, Math.min(100, Math.round(s.base - 20 * s.stretch - (s.creditFlag ? 10 : 0)))); assert.equal(s.invested, want, s.date); assert.ok(s.regime >= -1 && s.regime <= 1 && s.stretch >= -1 && s.stretch <= 1, s.date); }
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
  const T = R.tree; assert.ok(T.cohorts.length >= 50); for (const c of T.cohorts) { assert.ok(c.served <= c.n); if (c.ownPct12m != null) assert.ok(c.ownPct12m >= 0 && c.ownPct12m <= 1); assert.equal(c.coldForItself, c.ownPct12m != null && c.ownPct12m <= 0.25); assert.equal(c.goodGrowth, c.growthMedian != null && c.growthMedian >= 0.15); }
  assert.deepEqual(T.coldWithGrowth, T.cohorts.filter((c) => c.coldForItself && c.goodGrowth).sort((a, b) => a.ownPct12m - b.ownPct12m).map((c) => c.id)); assert.ok(Object.keys(T.sectors.sectors).length >= 14);
});
test("the study page renders headless with no page errors and no write, and stays inside a phone screen", async () => {
  for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h, path: "study/r4/R4.html" });
    try { await P.page.waitForFunction(() => window.READY != null, null, { timeout: 60000 }); const r = await P.page.evaluate(() => ({ ready: window.READY, dials: document.querySelectorAll("#dials .dial").length, events: document.querySelectorAll("#events table tr").length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      assert.equal(r.dials, 3); assert.ok(r.events >= 10); assert.ok(typeof r.ready.invested === "number"); assert.deepEqual(P.errors, []); assert.equal(P.nonGet.allowed, 0); assert.ok(r.sw <= r.cw + 1, "horizontal scroll " + r.sw + " > " + r.cw); }
    finally { await P.close(); } }
});
