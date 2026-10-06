/* HEAT1 (6 Oct 2026) — the study's hand-checks: today's parts add to the heat; every replayed day's heat is the weighted average of
   its voters; every replayed voter covers every session; the 2W pivot rule reproduces the Indicator Lab's reviewed dates; the study page
   renders headless without errors; the harness still opens index.html by default. Run: node --test tests/heat1.test.mjs */
import { test } from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path";
import { openPage, ROOT } from "./_harness.mjs";
const H = JSON.parse(fs.readFileSync(path.join(ROOT, "study/heat1/data/heat1.json"), "utf8"));
const T = JSON.parse(fs.readFileSync(path.join(ROOT, "study/heat1/data/today.json"), "utf8"));
test("today: the shares (reading × weight ÷ total weight) add to the page's own heat", () => {
  const W = T.rows.reduce((t, r) => t + r.w, 0); const sum = T.rows.reduce((t, r) => t + r.val * r.w / W, 0);
  assert.ok(Math.abs(sum - T.heat) < 2e-3, `shares ${sum} vs heat ${T.heat}`); assert.equal(W, 9.75); assert.equal(T.rows.length, 21); assert.ok(T.rows.every((r) => r.val != null && r.w > 0));
});
test("history: each day's heat is the weighted average of its replayed voters, and every voter has every session", () => {
  for (const s of H.series) { let num = 0, den = 0; for (const k of H.replay) { const w = H.weights[k]; if (!w) continue; assert.notEqual(s.v[k], null, k + " missing on " + s.date); num += s.v[k] * w; den += w; } assert.ok(Math.abs(num / den - s.heat) < 1e-3, s.date); }
  for (const k of H.replay) assert.equal(H.coverage[k].days, H.coverage[k].of, k);
  assert.ok(H.series.length >= 480); assert.ok(H.noPast.SECTORS);
});
test("the 2W pivot rule reproduces the reviewed P1 dates on SPY and QQQ (provider bar = TradingView bar − 1 day) and sits within 0.6% of the registry's dividend-adjusted levels", () => {
  const d = (sym) => H.pivots[sym].map((p) => p.date);
  assert.ok(d("SPY").includes("2026-08-02") && d("SPY").includes("2026-05-24"), "SPY 3 Aug / 26 May 2026");
  assert.ok(d("QQQ").includes("2026-05-24") && d("QQQ").includes("2026-01-18"), "QQQ 26 May / 20 Jan 2026");
  assert.equal(H.standing.SPY.pivotDate, "2026-08-02"); assert.equal(H.standing.QQQ.pivotDate, "2026-05-24");
  assert.ok(Math.abs(H.standing.SPY.pivotHigh / H.registry.SPY.tv - 1) < 0.006); assert.ok(Math.abs(H.standing.QQQ.pivotHigh / H.registry.QQQ.tv - 1) < 0.006);
  for (const e of H.events) { assert.ok(e.breakDate > e.confirmedAt, "a break is counted only after the pivot is confirmed"); assert.ok(e.breakClose > e.pivotHigh); }
  assert.equal(H.events[0].sym, "QQQ"); assert.equal(H.events[0].breakDate, "2026-10-02");
});
test("the study page renders headless with no page errors and no write", async () => {
  const P = await openPage({ width: 1680, height: 1050, path: "study/heat1/HEAT1.html" });
  try { await P.page.waitForFunction(() => window.LESSON != null, null, { timeout: 60000 });
    const r = await P.page.evaluate(() => ({ rows: document.querySelectorAll("#today table tr").length, events: document.querySelectorAll("#events table tr").length, live: window.LIVE_REPLAY, stamp: document.getElementById("stamp").textContent }));
    assert.ok(r.rows >= 20); assert.ok(r.events >= 5); assert.ok(typeof r.live === "number"); assert.ok(/history built/.test(r.stamp));
    assert.deepEqual(P.errors, []); assert.equal(P.nonGet.allowed, 0);
  } finally { await P.close(); }
});
test("the harness still opens index.html when no path is given", async () => {
  const P = await openPage({ width: 1680, height: 1050 });
  try { assert.ok(await P.page.$("#heatnum")); } finally { await P.close(); }
});
