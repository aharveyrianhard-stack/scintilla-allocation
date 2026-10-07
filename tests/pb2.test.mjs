/* PB2 tests (7 Oct 2026) — the Micron order layer, the stops, the leader comparison and the open-source review.
   Study + branch only: nothing here touches index.html, a table or an order.

     node --test tests/pb2.test.mjs

   1 · a SECOND replay engine, written here in JavaScript from the rules in PAGE SPECS, is run on real cases stored with their
       bars (study/pb2/data/fixtures.json) and must land on the same fills, stops and results as the Python engine;
   2 · the coordinator's own counts of 7 Oct 2026 are reproduced (185 leader pullbacks, 12 bunched, 31 Micron closes under the 100-day);
   3 · the numbers hang together (shares between 0 and 1, fill rates that only grow with time, intervals the right way round,
       one thing measured two ways gives one answer);
   4 · the sheet and the playbook carry every rule, each with a verdict, a number and the date it was measured;
   5 · the page renders headless at 1680 and 390 with no error, no request other than a read, no sideways scroll, no text
       under 11px, and no internal code or broken number in anything a reader sees;
   6 · index.html is the one on main. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { startServer, chromium, ROOT } from "./_harness.mjs";

const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const P = J("study/pb2/data/pb2.json"), FX = J("study/pb2/data/fixtures.json"), SHEET = J("study/pb2/data/sheet.json");
const near = (a, b, tol = 1e-7) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) <= tol);

/* ---------- 1 · the second engine ---------- */
const limitFill = (o, l, level) => (!Number.isFinite(level) ? null : o <= level ? o : l <= level ? level : null);
function replay(F, strat) {
  const { o, l, c, ma21, ma50, ma100, vix } = F, n = c.length, C0 = c[0], last = n - 1, S = FX.sizes;
  const cfg = { allin21: { rungs: "one" }, pyramid: { rungs: "ma" }, pyr_stop: { rungs: "ma", stop: "close" }, pyr_stop_deep: { rungs: "ma", stop: "close", deep: true }, pyr_fixed13: { rungs: "ma", stop: "fixed" },
    draft: { rungs: "draft" }, pyr_stop_band3: { rungs: "ma", stop: "close", band: 0.03 } }[strat];
  let rungs;
  if (cfg.rungs === "one") rungs = [{ name: "21-day", w: 1, f: (t) => ma21[t] }];
  else if (cfg.rungs === "ma") { const lv = [["21-day", ma21], ["50-day", ma50], ["100-day", ma100]];
    const order = [0, 1, 2].sort((a, b) => lv[b][1][0] - lv[a][1][0]);            /* highest level on the signal day first: it gets the smallest size */
    const size = {}; order.forEach((j, r) => { size[j] = S.grow[r]; });
    rungs = lv.map(([name, a], j) => ({ name, w: size[j], f: (t) => a[t] })); }
  else { const usd = S.draft_shares.map((q, k) => q * S.draft_prices[k]), tot = usd.reduce((x, y) => x + y, 0);
    rungs = S.draft_prices.map((p, k) => ({ name: "draft" + k, w: usd[k] / tot, f: () => (p / S.draft_close) * C0 })); }
  let sh = 0, cost = 0, real = 0, state = "IN", preStop = 0, salePx = null, pending = null, deepDone = [false, false, false], stops = 0, whips = 0, rebuys = 0, deepFills = 0, fixedPx = null, dead = false, first = null, under = 0;
  const stopDays = [], eqLow = new Array(n).fill(0), eqClose = new Array(n).fill(0), held = new Array(n).fill(0);
  const buyUsd = (w, px) => { sh += (w * C0) / px; cost += w; }, buySh = (q, px) => { sh += q; cost += (q * px) / C0; };
  const sell = (q, px) => { if (sh <= 1e-12) return; const frac = Math.min(1, q / sh), cOut = cost * frac; real += (q * px) / C0 - cOut; cost -= cOut; sh -= q; if (sh < 1e-12) { sh = 0; cost = 0; } };
  for (let t = 1; t <= last; t++) { const y = t - 1;
    if (pending && !dead) { const [kind, q] = pending; pending = null;
      if (kind === "sell" && q > 1e-12) { sell(q, o[t]); salePx = o[t]; }
      else if (kind === "buy" && q > 1e-12) { buySh(q, o[t]); rebuys++; if (salePx != null && o[t] > salePx) whips++; } }
    if (state === "IN" && !dead) {
      const open = rungs.filter((r) => !r.filled && Number.isFinite(r.f(y))).sort((a, b) => b.f(y) - a.f(y)).slice(0, 3);          /* at most three working */
      for (const r of open) { const px = limitFill(o[t], l[t], r.f(y)); if (px != null) { r.filled = true; r.day = t; r.px = px / C0; buyUsd(r.w, px); if (first == null) { first = t; if (cfg.stop === "fixed") fixedPx = 0.87 * px; } } }
    } else if (state === "OUT" && !dead && cfg.deep && Number.isFinite(vix[y]) && vix[y] >= 20 && Number.isFinite(ma100[y])) {
      S.deep.forEach((x, j) => { if (deepDone[j] || cost >= 1 - 1e-9) return; const px = limitFill(o[t], l[t], ma100[y] * (1 - x)); if (px != null) { buyUsd(Math.min(1 / 3, 1 - cost), px); deepDone[j] = true; deepFills++; } }); }
    if (!dead && cfg.stop === "fixed" && fixedPx != null && sh > 0 && l[t] <= fixedPx) { sell(sh, Math.min(o[t], fixedPx)); stops++; stopDays.push(t); dead = true; }
    if (!dead && cfg.stop === "close" && Number.isFinite(ma100[t])) {
      under = c[t] < ma100[t] * (1 - (cfg.band || 0)) ? under + 1 : 0;
      if (state === "IN" && sh > 1e-12 && under >= 1) { preStop = sh; pending = ["sell", sh]; stops++; stopDays.push(t); state = "OUT"; deepDone = [false, false, false]; }
      else if (state === "OUT" && c[t] > ma100[t]) { const q = Math.max(0, preStop - sh); state = "IN"; if (q > 1e-12) pending = ["buy", q]; } }
    eqLow[t] = real + (sh * l[t]) / C0 - cost; eqClose[t] = real + (sh * c[t]) / C0 - cost; held[t] = cost; }
  const res = {}; for (const H of [20, 60, 120]) res[H] = H <= last ? { pnl: eqClose[H], dd: Math.min(0, ...eqLow.slice(1, H + 1)), held: held[H] } : null;
  return { fills: rungs.map((r) => [r.filled ? r.day : null, r.filled ? r.px : null, r.w]), res, stops, whipsaws: whips, deepFills, rebuys, stopDays };
}

test("a second engine, written separately, lands on the same fills, stops and results on real cases", () => {
  assert.ok(FX.cases.length >= 4, "at least four stored cases"); let compared = 0, sawStop = false, sawDeep = false, sawFixed = false, sawNull = false;
  for (const F of FX.cases) for (const st of FX.strategies) {
    const mine = replay(F, st), theirs = F.expect[st], tag = `${F.sym} ${F.d} ${st}`;
    theirs.fills.forEach((f, k) => { assert.equal(mine.fills[k][0], f[1], tag + ": session rung " + k + " filled"); assert.ok(near(mine.fills[k][1], f[2]), tag + ": price rung " + k); assert.ok(near(mine.fills[k][2], f[3]), tag + ": size rung " + k); });
    for (const H of ["20", "60", "120"]) { const a = mine.res[H], b = theirs.res[H];
      if (b == null) { assert.equal(a, null, tag + ": no result where the bars end"); sawNull = true; continue; }
      assert.ok(near(a.pnl, b.pnl), `${tag}: result at ${H} — ${a.pnl} against ${b.pnl}`); assert.ok(near(a.dd, b.dd), `${tag}: drawdown inside ${H}`); assert.ok(near(a.held, b.held), `${tag}: money at work at ${H}`); }
    assert.equal(mine.stops, theirs.stops, tag + ": stops"); assert.equal(mine.whipsaws, theirs.whipsaws, tag + ": whipsaws"); assert.equal(mine.deepFills, theirs.deep_fills, tag + ": deep fills"); assert.deepEqual(mine.stopDays, theirs.stop_days, tag + ": stop days");
    compared++; if (st === "pyr_stop" && theirs.whipsaws > 0) sawStop = true; if (theirs.deep_fills > 0) sawDeep = true; if (st === "pyr_fixed13" && theirs.stops > 0) sawFixed = true; }
  assert.ok(sawStop && sawDeep && sawFixed && sawNull, "the stored cases exercise a whipsaw, a deep fill, the fixed stop and a case whose bars end before 120 sessions");
  assert.equal(compared, FX.cases.length * FX.strategies.length);
});

/* ---------- 2 · the coordinator's own counts ---------- */
test("the coordinator's 7 Oct counts are reproduced: 185 leader pullbacks, 12 bunched, 31 Micron closes under a rising 100-day", () => {
  const c = P.cases, pc = (v) => Math.round(100 * v);
  assert.equal(c.counts.coordinator19, 185); assert.equal(c.counts.coordinator19_bunched, 12);
  assert.deepEqual([pc(c.coordinator19.held21_10), pc(c.coordinator19.t50_20), pc(c.coordinator19.t100_20), pc(c.coordinator19.nh60)], [18, 60, 24, 68], "18% held, 60% touched the 50-day, 24% the 100-day, 68% a new high");
  assert.equal((100 * c.coordinator19.dd20_med).toFixed(1), "-7.0", "median deepest dip");
  assert.deepEqual([pc(c.coordinator19_bunched.t50_20), pc(c.coordinator19_bunched.t100_20)], [75, 42], "bunched: 75% and 42%");
  const f = P.stops.micron_first_close_under_100; assert.equal(f.n, 31); assert.equal(f.back_within20, 23); assert.equal((100 * f.dd20_med).toFixed(1), "-7.7");
  const t = c.today_mu; assert.equal(t.close, 1045.56); assert.ok(t.leader && t.bunched && t.micron_own, "6 Oct 2026 meets the rule and is bunched");
  assert.ok(c.counts.wide > c.counts.coordinator19 && c.counts.names_with_cases >= 60, "the comparison is wider than the 19 names");
  for (const p of c.named_periods) assert.ok(p.n >= 1, p.label + " has at least one case");
});

/* ---------- 3 · the numbers hang together ---------- */
test("shares are shares, fill rates only grow with time, and one thing measured two ways gives one answer", () => {
  const sets = P.layer.sets;
  for (const [nm, A] of Object.entries(sets)) for (const [st, a] of Object.entries(A)) { if (st.startsWith("_")) continue;
    for (const r of a.rungs) { assert.ok(r.fill20 <= r.fill60 + 1e-12 && r.fill60 <= r.fill120 + 1e-12, `${nm} ${st} ${r.name}: fills grow with time`); assert.ok(r.fill20 >= 0 && r.fill120 <= 1, `${nm} ${st} ${r.name}: a share`); }
    for (const H of ["20", "60", "120"]) { const x = a.res[H]; if (!x.n) continue; assert.ok(x.dd_worst <= x.dd_p10 + 1e-12 && x.dd_p10 <= x.dd_med + 1e-12 && x.dd_med <= 1e-12, `${nm} ${st} ${H}: drawdowns in order`); assert.ok(x.pos >= 0 && x.pos <= 1, `${nm} ${st} ${H}: share higher`); }
    if (["close", "allin21", "pyramid", "pyr_equal", "draft", "draft_equal"].includes(st)) assert.equal(a.stops_per100, 0, `${nm} ${st}: no stop in a strategy without one`);
    if (a.rungs.length > 1) assert.ok(Math.abs(a.rungs.reduce((s, r) => s + r.w_mean, 0) - 1) < 1e-5, `${nm} ${st}: the rungs add up to the planned money`); }      /* the file keeps six decimals */
  /* buying it all at the close, replayed by the engine, is the case study's own 60-session result */
  assert.ok(near(sets.wide.close.res["60"].med, P.cases.wide.r60_med, 1e-9), "the engine's 'all at the close' = the leader comparison's 60-session result");
  assert.ok(near(sets.micron_own.close.res["60"].med, P.cases.micron_own.r60_med, 1e-9), "the same for Micron's own set-ups");
  assert.equal(sets.wide.allin21.n, P.cases.counts.wide); assert.equal(sets.micron_own.allin21.n, P.cases.counts.micron_own);
  /* the breach days: every one is either a flush or a close break; a resting stop always trips on its breach day */
  for (const N of ["21", "50", "100"]) { const G = P.stops.levels[N].all; assert.equal(G.flush.n + G.close_break.n, G.all.n); assert.equal(G.all.intraday.sold, 1); assert.ok(G.big_flush.n <= G.flush.n, "a one-candle flush is a flush");
    assert.ok(G.all.intraday.sales_per_case >= G.all.close.sales_per_case, "the intraday stop trades at least as often"); }
  /* every interval is the right way round, and 'clear of zero' means what it says */
  const edges = []; for (const r of Object.values(P.review.market_rules.rules)) for (const g of ["spy", "mu", "price_only"]) for (const e of r[g] || []) if (!e.thin) edges.push(e);
  assert.ok(edges.length >= 25, "the market rules were measured: " + edges.length);
  for (const e of edges) { const [lo, hi] = e.edge_mean_ci; assert.ok(lo <= hi, e.label); assert.equal(e.proven, lo > 0 || hi < 0, e.label + ": clear of zero"); assert.ok(near(e.edge_mean, e.mean_rule - e.mean_other, 5e-6), e.label + ": the edge is rule days minus the other days"); assert.ok(e.boot_reps >= 1500, e.label + ": resamples kept"); }      /* the file keeps six decimals */
  for (const S_ of Object.values(P.review.layer_edges)) for (const pair of Object.values(S_)) for (const e of Object.values(pair)) if (!e.thin) { assert.ok(e.ci[0] <= e.ci[1], e.label); assert.equal(e.proven, e.ci[0] > 0 || e.ci[1] < 0, e.label); }
  const R = P.review; assert.equal(R.regimes.states.length, 3); assert.ok(Math.abs(R.regimes.states.reduce((s, x) => s + x.share_of_days, 0) - 1) < 1e-9); assert.ok(["calm", "choppy", "stress"].includes(R.regimes.today.state));
  assert.ok(R.regimes.states[0].vix_mean < R.regimes.states[1].vix_mean && R.regimes.states[1].vix_mean < R.regimes.states[2].vix_mean, "the regimes are named by their VIX");
  for (const l of R.range.levels) assert.ok(l.p1 <= l.p5 + 1e-12 && l.p5 <= l.p10 + 1e-12, l.name + ": the chance of being reached grows with time");
  assert.ok(R.range.expected_range_pct > 1 && R.range.expected_range_pct < 12, "a usual day for Micron is a few percent"); assert.equal(R.trend.settings.length, 3);
});

/* ---------- 4 · the sheet and the playbook ---------- */
test("the sheet gives every live rule a verdict and a number, and the playbook carries each with its date", () => {
  assert.ok(SHEET.length >= 12); const ids = SHEET.map((r) => r.id);
  for (const need of ["three_orders", "stop_100_close", "vix_rule", "credit_200", "ten_short", "ten_long", "extremes", "deep_bid_vix", "fixed_13"]) assert.ok(ids.includes(need), "the sheet covers " + need);
  for (const r of SHEET) { assert.ok(["keep", "change", "drop"].includes(r.verdict), r.id); assert.match(r.number, /\d/, r.id + " has a number behind it"); assert.doesNotMatch(r.number + r.rule + r.change, /undefined|NaN|None|null|\+−|−−/, r.id); }
  const md = fs.readFileSync(path.join(ROOT, "study/pb2/PLAYBOOK.md"), "utf8");
  assert.equal((md.match(/^### \d+\. /gm) || []).length, SHEET.length, "one playbook entry per rule"); assert.equal((md.match(/\*\*Last measured:\*\* 7 Oct 2026/g) || []).length, SHEET.length); assert.equal((md.match(/\*\*Check a new decision against it:\*\* \S/g) || []).length, SHEET.length);
  assert.match(md, /18 @ 1,036\.13 \(3D P1\) · 22 @ 1,030\.40 \(21-day \+ 2W D3\) · 27 @ 1,011\.77 \(3D P3\) · then 37 @ 989\.17 \(1D D3 \+ 3D C3\)/, "the drafts, each with the Lab's own label");
  /* the local model: its reading test is scored against the data, not against itself */
  const C = P.critique; assert.ok(C && C.models.length >= 1); assert.equal(C.quiz_truth.q1, P.review.market_rules.today.vix >= 20 ? "yes" : "no"); assert.equal(C.quiz_truth.q3, P.review.market_rules.today.credit_under ? "no" : "yes");
  for (const m of C.models) { assert.ok(m.quiz.right <= m.quiz.asked && m.quiz.asked === 10); for (const v of Object.values(m.roles)) assert.ok(v.quotes_verbatim <= v.quotes); }
});

/* ---------- 5 · the page ---------- */
test("the study page renders headless at 1680 and 390: no error, no write, no sideways scroll, no text under 11px, no internal code, no broken number", async () => {
  const srv = await startServer(); const browser = await chromium.launch({ headless: true });
  try { for (const [w, h] of [[1680, 1050], [390, 844]]) {
      const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage(); const errors = []; let nonGet = 0, requests = 0;
      await page.route("**/*", (r) => { requests++; if (r.request().method() !== "GET") { nonGet++; return r.abort(); } r.continue(); }); page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(srv.url + "study/pb2/PB2.html", { waitUntil: "networkidle", timeout: 120000 });
      const r = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, text: document.body.innerText,
        small: [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11 && e.getClientRects().length).length,
        panels: [...document.querySelectorAll(".panel")].map((p) => p.id), tiles: document.querySelectorAll(".tile").length, sheetRows: document.querySelectorAll("#p-sheet tbody tr").length, scripts: document.scripts.length,
        chart: !!document.querySelector(".chart svg path"), nav: [...document.querySelectorAll("nav.scnav a")].map((a) => a.getAttribute("href")), firstPanelTop: document.querySelector(".panel").getBoundingClientRect().top }));
      assert.deepEqual(errors, [], w + " wide: page errors"); assert.equal(nonGet, 0, "no request other than a read"); assert.equal(requests, 1, "the page asks for nothing but itself"); assert.equal(r.scripts, 0, "a static page: no script");
      assert.ok(r.scrollW <= r.clientW + 1, `${w} wide: the page scrolls sideways (${r.scrollW} against ${r.clientW})`); assert.equal(r.small, 0, w + " wide: text under 11px");
      assert.deepEqual(r.panels, ["p-layer", "p-stops", "p-leaders", "p-review", "p-sheet", "p-wrong"]); assert.equal(r.tiles, 5); assert.equal(r.sheetRows, SHEET.length); assert.ok(r.chart, "Micron's chart is drawn"); assert.equal(r.nav.length, 2, "a way back");
      assert.doesNotMatch(r.text, /\b(PB1|PB2|CZ1|CP1|ER1|DM1|HM1|AL7|R3|R4|LB1|NQ1)\b/, "no internal code in anything a reader sees");
      assert.doesNotMatch(r.text, /undefined|NaN|\bNone\b|\bnull\b|\+−|−−|\+-/, "no broken number"); assert.doesNotMatch(r.text, /licensed advis/i);
      for (const lab of ["3D P1 1,036.13", "21-day + 2W D3 1,030.40", "3D P3 1,011.77", "1D D3 + 3D C3 989.17"]) assert.ok(r.text.includes(lab), "the Lab's own label: " + lab);
      assert.ok(r.text.includes("6 Oct 2026"), "exact dates"); await page.close(); }
  } finally { await browser.close(); srv.server.close(); }
});

/* ---------- 6 · nothing else moved ---------- */
test("index.html is the one on main, and nothing was written under the Lab's folders", () => {
  const diff = execFileSync("git", ["-C", ROOT, "diff", "--name-only", "origin/main", "--"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const untracked = execFileSync("git", ["-C", ROOT, "ls-files", "--others", "--exclude-standard"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  for (const f of [...diff, ...untracked]) { assert.ok(/^(study\/pb2\/|tests\/pb2\.test\.mjs$|scripts\/pb2-shots\.mjs$)/.test(f), "only the study's own files changed: " + f); assert.doesNotMatch(f, /INDICATOR_LAB|indicator-lab|lab\.html/); }
});
