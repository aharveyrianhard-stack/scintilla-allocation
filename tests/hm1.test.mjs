/* HM1 (6 Oct 2026) — the study's hand-checks: the rebuilt Geiger equals the Hub's own; only completed bars are read; every replayed
   heat is the weighted average of its rows and the repair is the same rows less the six backdrop ones; the ladder's history adds up;
   every marked event obeys its rule; the replay's last day matches what the live tool showed that evening; the live tool's page is
   untouched; the study page renders headless with no error, no write, no sideways page scroll on a phone and no text under 11px.
   Run: node --test tests/hm1.test.mjs */
import { test } from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { openPage, ROOT } from "./_harness.mjs";
import * as GE from "../scripts/hm1-geiger.mjs";
const H = JSON.parse(fs.readFileSync(path.join(ROOT, "study/hm1/data/hm1.json"), "utf8"));
const rungOf = (h) => (h >= 0.5 ? 15 : h >= 0.2 ? 30 : h <= -0.5 ? 100 : h <= -0.2 ? 80 : 50);
const COL = Object.fromEntries(H.seriesCols.map((c, i) => [c, i]));

test("the rebuilt seven-rung Geiger equals the Hub's own /geiger on the last evening, on every fund a voter or the sector row reads", () => {
  const g = H.geigerCheck; assert.ok(g, "the engine ran without the Hub's /geiger file"); assert.ok(g.funds >= 18, "funds " + g.funds);
  assert.ok(g.largestAbsDiff < 0.001, "largest difference " + g.largestAbsDiff); assert.equal(g.rungs.length, 7);
  for (const r of g.rows) assert.equal(r.rungs, 7, r.sym + " read on " + r.rungs + " rungs");
  assert.ok(g.instants.length >= 1); for (const x of g.instants) { assert.ok(x.funds >= 18, x.computed_utc); assert.ok(x.largestAbsDiff < 0.001, x.computed_utc + " differs by " + x.largestAbsDiff); }   // every /geiger answer saved that evening, by the finality rule in full
});

test("only completed bars are read: Monday to Thursday the weekly rung is last week's bar, on Friday evening it is this week's; a 3-day bar counts only once no later session falls inside it", () => {
  const D = { dn: [], h: [], l: [], c: [] }; const start = GE.dayNum("2024-01-01"), end = GE.dayNum("2026-06-05");   // a Monday to a Friday
  for (let dn = start, k = 0; dn <= end; dn++) { const dow = new Date(dn * GE.DAY).getUTCDay(); if (dow === 0 || dow === 6) continue; const c = 100 + k * 0.1; D.dn.push(dn); D.h.push(c); D.l.push(c - 0.5); D.c.push(c); k++; }   // every day closes on its high, a little above the day before
  const S = { sym: "TEST", bars: { "1d": D, "3d_rolled": GE.rollup(D, "3d"), "1w_rolled": GE.rollup(D, "1w") }, source: {} };
  const next = D.dn.map((d, i) => (i + 1 < D.dn.length ? D.dn[i + 1] : d + 3)); const ser = GE.geigerSeries(S, D.dn, next, { keep: true, only: ["1d", "3d", "1w"] });
  const at = (iso) => ser[D.dn.indexOf(GE.dayNum(iso))];
  assert.equal(at("2026-06-03").per["1w"].newest, "2026-05-24", "Wednesday reads the week that ended the Friday before");
  assert.equal(at("2026-06-05").per["1w"].newest, "2026-05-31", "Friday evening reads its own week");
  for (const iso of ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"]) { const r = at(iso), dn = GE.dayNum(iso), nx = next[D.dn.indexOf(dn)]; assert.ok(GE.dayNum(r.per["3d"].newest) + 3 <= nx, iso + ": the 3-day bar read must end before the next session"); assert.ok(GE.dayNum(r.per["3d"].newest) + 6 > nx, iso + ": and it must be the newest such bar"); }
  assert.ok(Math.abs(at("2026-06-05").g - 1) < 1e-9, "a market that rises every day reads +1 on every rung");
});

test("each replayed heat is the weighted average of the rows read that evening; the repair is the same rows less the six backdrop ones", () => {
  for (const d of [...H.seven, H.today]) {
    const rows = d.base.rows.filter((r) => r.val != null); const W = rows.reduce((t, r) => t + r.weight, 0); const sum = rows.reduce((t, r) => t + r.val * r.weight, 0);
    assert.ok(Math.abs(sum / W - d.base.heat) < 2e-3, d.date + " heat"); assert.equal(W, d.base.weight); assert.equal(rows.length, d.base.present.length);
    assert.ok(Math.abs(rows.reduce((t, r) => t + r.share, 0) - d.base.heat) < 3e-3, d.date + " shares");
    assert.ok(d.fix.rows.every((r) => !H.backdrop.includes(r.k)), d.date + " repair still counts a backdrop row"); assert.equal(d.fix.weight, d.base.weight - d.base.rows.filter((r) => H.backdrop.includes(r.k) && r.val != null).reduce((t, r) => t + r.weight, 0));
    assert.equal(d.base.rung.pct, rungOf(d.base.heat)); assert.equal(d.fix.rung.pct, rungOf(d.fix.heat));
    assert.ok(d.base.absent.includes("SECTORS"), "the sector row has no past and must be named absent");
  }
  assert.equal(H.weightTotal, 9.75); assert.equal(H.seven.length, 7); assert.deepEqual(H.backdrop, ["US10Y", "CURVE", "OIL", "DURATION", "HAVEN", "DEF"]);
  for (const s of H.seven) { assert.equal(s.window.length, 11, s.date + " window"); assert.equal(s.window[5].date, s.date); assert.ok(s.base.present.length >= 19, s.date + " rows read " + s.base.present.length); }
});

test("the headline: as it stands the tool said 100% on none of the seven dates and on no evening since 2007; the repair reaches it at the deep lows and, on the evening the live tool was read, left that day's rung where it was", () => {
  assert.equal(H.seven.filter((s) => s.base.rung.pct === 100).length, 0); assert.equal(H.history2007.base.count[100], 0); assert.equal(H.scorecard.base.lows100, 0);
  assert.ok(H.history2007.base.min.heat > -0.5 && H.history2007.base.min.heat < -0.4);
  assert.ok(H.scorecard.fix.sevenOnTheDay100 >= 4); assert.ok(H.scorecard.fix.sevenAtTheLow100 >= 6); assert.ok(H.scorecard.fix.lows100 >= 9); assert.equal(H.scorecard.fix.lows80plus, H.scorecard.fix.lowsOf);
  assert.ok(H.scorecard.fix.ranksWithDepth > H.scorecard.base.ranksWithDepth && H.scorecard.fix.ranksWithVix > H.scorecard.base.ranksWithVix);
  const L = H.todayLive; assert.ok(L, "the live tool was not read"); assert.equal(L.rung.pct, L.fix.rung.pct, "the repair moves today's rung");
});

test("the ladder's history adds up, and the last 100% / 80% it names are evenings that read so", () => {
  const rows = H.series.filter((r) => r[COL.date] >= "2009-01-02"); const byDate = Object.fromEntries(H.series.map((r) => [r[COL.date], r]));
  for (const [v, col] of [["base", COL.heat], ["fix", COL.fix]]) { const h = H.history[v]; assert.equal(Object.values(h.count).reduce((a, b) => a + b, 0), h.sessions); assert.equal(h.sessions, rows.length);
    const counted = { 100: 0, 80: 0, 50: 0, 30: 0, 15: 0 }; for (const r of rows) counted[rungOf(r[col])]++;
    for (const p of [100, 80, 50, 30, 15]) { assert.ok(Math.abs(counted[p] - h.count[p]) <= 3, v + " rung " + p + ": " + counted[p] + " vs " + h.count[p]); if (h.last[p]) assert.equal(rungOf(byDate[h.last[p]][col]), p, v + " last " + p); }   // the series is stored to four decimals: a reading exactly on a line can fall either side
    for (const e of h.at100) assert.ok(e.lowestHeat <= -0.5 && e.from <= e.to); for (const e of h.at80plus) assert.ok(e.lowestHeat <= -0.2); }
  assert.equal(H.history.base.at100.length, 0); assert.ok(H.history.fix.at100.length >= 15);
});

test("every marked event obeys its rule: a 200-day loss is the first close under it; a cloud flip is the first close on which the pair reads pink", () => {
  const S = H.series, ix = Object.fromEntries(S.map((r, i) => [r[COL.date], i]));
  for (const e of H.events.loss200) { const i = ix[e.date]; assert.ok(S[i][COL.spy] < S[i][COL.sma200] + 0.001, e.date + " not under"); assert.ok(S[i - 1][COL.spy] >= S[i - 1][COL.sma200] - 0.001, e.date + " was already under"); }   // the 200-day is stored to three decimals
  for (const [k, c] of [["c1321", COL.cloud1321], ["c2150", COL.cloud2150], ["c50200", COL.cloud50200]]) { for (const e of H.events[k]) { const i = ix[e.date]; assert.equal(S[i][c], 0, k + " " + e.date); assert.equal(S[i - 1][c], 1, k + " " + e.date + " the day before"); }
    let flips = 0; for (let i = 1; i < S.length; i++) if (S[i - 1][c] === 1 && S[i][c] === 0 && i >= 1) flips++; assert.ok(Math.abs(flips - H.events[k].length) <= 1, k + " flips in the series " + flips + " vs listed " + H.events[k].length); }
  assert.ok(H.events.loss200.filter((e) => e.date >= "2009").length >= 40); assert.equal(H.eventStats.loss200.since2009.n, H.events.loss200.filter((e) => e.date >= "2009-01-01").length);
});

test("the replay's last day against the live tool's own reading that evening: the rows rebuilt from bars and tables agree; only the three the page reads from its older stored Geiger differ", () => {
  const c = H.todayLive.replayCheck; assert.ok(c.compared >= 20); assert.ok(c.sameToThreeDecimals >= 14, "same " + c.sameToThreeDecimals);
  for (const d of c.differ) assert.ok(["OIL", "HAVEN", "CRYPTO", "ADLINE", "TRIN", "B_VOL"].includes(d.key), d.key + " differs by " + d.diff);
  for (const d of c.differ.filter((x) => ["ADLINE"].includes(x.key))) assert.ok(Math.abs(d.diff) < 0.05, d.key + " " + d.diff);
  assert.deepEqual(c.notInReplay.map((x) => x.key), ["SECTORS"]); assert.equal(H.todayLive.weight, 9.75); assert.equal(H.todayLive.weightsAreDefaults, true);
});

test("the tool that was read is the deployed one, and the replay uses its constants: the page at allocation.scintillahub.ai equalled main's file, and main's weights, ladder and lines are the ones replayed", () => {
  const d = H.todayLive.deployed; assert.ok(d, "the reading was not taken from the deployed page"); assert.match(d.url, /^https:\/\/allocation\.scintillahub\.ai\/$/); assert.equal(d.sameAsMain, true); assert.equal(d.sha256, d.mainSha256);
  const m = H.mainCheck; assert.equal(m.error, undefined); assert.equal(m.commit, d.mainCommit); assert.ok(m.sameWeights && m.sameLadderAndAnchors && m.sameHeatLabel && m.samePolicyStep, JSON.stringify(m));
});

test("nothing on the live tool changed: index.html is the file this branch started from", () => {
  const out = execFileSync("git", ["-C", ROOT, "diff", "--stat", "e312d0e", "--", "index.html", "vercel.json"], { encoding: "utf8" }); assert.equal(out.trim(), "");
});

test("the study page renders headless: the seven-date table first, no page error, no write, no sideways page scroll on a phone, no text under 11px", async () => {
  for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h, path: "study/hm1/HM1.html" });
    try { await P.page.waitForFunction(() => window.HM1_READY === true, null, { timeout: 60000 });
      const r = await P.page.evaluate(() => ({ first: document.querySelector(".panel").id, seven: document.querySelectorAll("#seven table tr").length, strips: document.querySelectorAll("#strips .cell").length, fixStrips: document.querySelectorAll("#fixstrips .cell").length, paths: document.querySelectorAll("#chart svg path").length, ticks: document.querySelectorAll("#chart svg rect").length, events: document.querySelectorAll("#events table tr").length, decisions: document.querySelectorAll("#decisions li").length, verdict: document.getElementById("verdict").innerText, last: document.getElementById("last").innerText, stamp: document.getElementById("stamp").textContent,
        scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, small: [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11 && e.getClientRects().length).length }));
      assert.equal(r.first, "p-seven"); assert.equal(r.seven, 8); assert.equal(r.strips, 77); assert.equal(r.fixStrips, 77); assert.ok(r.paths >= 10, "paths " + r.paths); assert.ok(r.ticks >= 150, "event ticks " + r.ticks); assert.equal(r.events, 7); assert.equal(r.decisions, 3);
      assert.match(r.verdict, /On none of the seven did it say deeply washed out/); assert.match(r.last, /100% — never/); assert.match(r.stamp, /built/);
      assert.ok(r.scrollW <= r.clientW + 1, w + " wide: the page scrolls sideways (" + r.scrollW + " vs " + r.clientW + ")"); assert.equal(r.small, 0, "text under 11px");
      assert.deepEqual(P.errors, []); assert.equal(P.nonGet.allowed, 0); assert.equal(P.nonGet.blocked, 0);
    } finally { await P.close(); } }
});
