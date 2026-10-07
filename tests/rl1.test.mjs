/* RL1 (7 Oct 2026) — the release: the money panel at the top reads the deployment engine v2 LIVE, never version 1's
   numbers (33 / 22 / 44 / 88 / 84), and says "deployment engine v2 — next round in progress".
   Offline tests on a fixture of the chart API's 420 daily closes (the last bar is the 6 Oct close), plus the page's own text.
   The headless checks of the panel on the page are in tests/al8.test.mjs (section 2). node --test tests/rl1.test.mjs */
import test from "node:test"; import assert from "node:assert/strict";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8"), J = (f) => JSON.parse(read(f));
const L = await import(path.join(ROOT, "study/dm2/live.mjs")), SC = await import(path.join(ROOT, "study/dm2/scenarios.mjs")), E = await import(path.join(ROOT, "study/dm2/engine.mjs"));
const FX = J("tests/fixtures/rl1-daily-closes-20261006.json"), base = J("study/dm2/data/dm2-live.json"), STUDY = J("study/dm2/data/dm2.json"), OLD = J("data/deployment-scenarios.json");
const PAGE = read("index.html"), near = (a, b, eps, msg) => assert.ok(a != null && Math.abs(a - b) <= eps, `${msg || ""}: ${a} vs ${b}`);
const atClose = () => ({ base, candles: FX.candles, read: L.readLive({ base, candles: FX.candles, quotes: {}, macro: null }) });
const cell = (dd, vix) => STUDY.grid.asToday.find((row) => row[0].dd === dd).find((c) => c.vix === vix);

test("1 · at the 6 Oct close the five rows are the study's own numbers: the line 47%, and the grid's cells for the three falls", () => {
  const st = atClose(), v = SC.fiveMarkets(st), R = Object.fromEntries(v.rows.map((r) => [r.key, r]));
  assert.equal(v.session, "2026-10-06"); assert.equal(v.live, false); assert.equal(v.agree, true, "the series rebuilt for the rows gives the inputs the line itself read");
  assert.deepEqual(v.rows.map((r) => r.key), ["today", "a", "b", "c", "d"]); assert.ok(v.rows.every((r) => !r.error));
  near(R.today.pct, st.read.reading.line, 1e-9, "TODAY is the line"); near(R.today.now, st.read.reading.pct, 1e-9, "with the evening's own reading beside it");
  near(R.today.pct, 47, 0.05, "the line the study published for 6 Oct"); near(R.today.now, STUDY.grid.asToday[0][0].v2, 0.05, "the reading the study published");
  near(R.a.pct, cell(-1.5, STUDY.grid.calmVix).v2, 0.15, "the S&P down 1.5%, the VIX left where it is"); near(R.a.rsi, cell(-1.5, STUDY.grid.calmVix).rsi, 0.06, "its RSI");
  near(R.b.pct, cell(-3, 20).v2, 0.6, "the S&P down 3% with the VIX at 20"); near(R.b.rsi, cell(-3, 20).rsi, 0.06, "its RSI");
  near(R.c.pct, cell(-5, 23.5).v2, 0.6, "the S&P down 5% with the VIX at 23.5"); near(R.c.rsi, cell(-5, 23.5).rsi, 0.06, "its RSI");
});

test("2 · each market is the stated fall on the stated sessions; QQQ falls its past-year beta times as far; the VIX is where the row says", () => {
  const st = atClose(), S = SC.seriesOf(st), k = S.dates.length - 1, v = SC.fiveMarkets(st), R = Object.fromEntries(v.rows.map((r) => [r.key, r]));
  near(SC.betaOf(S, k), STUDY.grid.beta, 0.002, "the same beta as the study's");
  for (const m of SC.MARKETS) { const X = SC.shocked(S, m), T = X.series, j = T.dates.length - 1;
    assert.equal(j - k, m.sessions, m.key + ": sessions joined on"); near(T.SPY[j] / S.SPY[k] - 1, -m.fall / 100, 1e-9, m.key + ": the S&P's fall"); near(T.QQQ[j] / S.QQQ[k] - 1, -X.beta * m.fall / 100, 1e-9, m.key + ": QQQ's fall");
    assert.ok(T.dates.slice(k + 1).every((d, i, a) => d > S.dates[k] && (i === 0 || d > a[i - 1]) && ![0, 6].includes(new Date(d + "T12:00:00Z").getUTCDay())), m.key + ": the added sessions are weekdays, in order");
    near(R[m.key].spy, T.SPY[j], 1e-9, m.key + ": the row's S&P"); }
  assert.equal(R.a.vix, S.VIX[k]); assert.equal(R.b.vix, 20); assert.equal(R.c.vix, 23.5);
  assert.ok(R.d.vix >= SC.PANIC_VIX && R.d.vixPct >= 95, "the panic's VIX is in the top twentieth of its year: " + R.d.vix + " at " + R.d.vixPct); assert.ok(R.d.rsi < 35, "and its RSI is under 35: " + R.d.rsi);
  assert.ok(R.today.rsi > R.a.rsi && R.a.rsi > R.b.rsi && R.b.rsi > R.c.rsi && R.c.rsi > R.d.rsi, "a deeper fall has a lower RSI");
});

test("3 · a calm dip no longer lowers the number, and the money is the engine's one rule: Micron 0.4 × the %, held at 30", () => {
  const v = SC.fiveMarkets(atClose()), R = Object.fromEntries(v.rows.map((r) => [r.key, r]));
  assert.ok(R.a.pct > R.today.now, "version 1 read 33% → 22% on this dip; version 2 reads more, not less: " + R.today.now + " → " + R.a.pct);
  for (const r of v.rows) { near(r.micron, Math.min(E.MICRON_SHARE * r.pct, E.MICRON_CAP), 0.051, r.key + ": Micron"); assert.ok(r.pct >= 15 && r.pct <= 100, r.key + " sits on the ladder's span"); }
  const old = OLD.scenarios.map((s) => Math.round(s.pct)); assert.deepEqual(old, [33, 22, 44, 88, 84], "the placeholder file still holds version 1's five");
  assert.notDeepEqual(v.rows.map((r) => Math.round(r.pct)), old, "and the rows are not those");
});

test("4 · with today's session joined on, TODAY is still the matrix's own line and the rows start from the live price", () => {
  const S0 = L.alignCloses(FX.candles), last = S0.dates.length - 1, q = (p) => ({ price: p, price_session_et: "2026-10-07", today_session_close: null, today_session_close_state: "ABSENT" });
  const quotes = { SPY: q(S0.SPY[last] * 0.995), QQQ: q(S0.QQQ[last] * 0.99), HYG: q(S0.HYG[last]), TLT: q(S0.TLT[last]), GLD: q(S0.GLD[last]) }, macro = { VIX: { quote: { price: 16.4, session_et: "2026-10-07" } } };
  const st = { base, candles: FX.candles, read: L.readLive({ base, candles: FX.candles, quotes, macro }) }, v = SC.fiveMarkets(st);
  assert.equal(st.read.live, true); assert.equal(v.live, true); assert.equal(v.session, "2026-10-07"); assert.equal(v.agree, true);
  near(v.rows[0].pct, st.read.reading.line, 1e-9, "TODAY is the line"); near(v.rows[0].spy, quotes.SPY.price, 1e-9, "from the live price"); near(v.rows[1].spy, quotes.SPY.price * 0.985, 1e-6, "the dip starts from the live price");
  assert.equal(SC.fiveMarkets({ base, candles: FX.candles, read: null }), null, "no reading, no rows"); assert.equal(SC.fiveMarkets(null), null);
});

/* DS1 (7 Oct 2026) changed this pin, by its brief ("replace DM2's slot and AL8's money panel"). RL1 wired the matrix's line to the money
   panel and labelled it "deployment engine v2 — next round in progress". The next round arrived: the deployment system draws the panel
   itself, so the hand-over and the interim label are gone from what the page runs. Tests 1 to 4 still hold study/dm2/scenarios.mjs to
   the study's own numbers; the page no longer imports it, and it is listed for removal. */
test("5 · the page: no file feeds the money panel, and the next round took it over — the deployment system draws it; the matrix's hand-over is gone and nothing says a branch or a placeholder", () => {
  const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");
  assert.match(code, /const DEPLOY_SOURCES=\[\];/, "no source file"); assert.ok(!/DEPLOY_SOURCES=\[[^\]]*dm1/.test(code) && !/DEPLOY_SOURCES=\[[^\]]*deployment-scenarios/.test(code));
  assert.ok(!/fetch\([^)]*deployment-scenarios\.json/.test(code) && !/fetch\([^)]*study\/dm1\/data\/dm1\.json/.test(code), "neither file is fetched by the page");
  assert.ok(!/import \{ fiveMarkets \}/.test(code) && !/onRead: dm2Markets/.test(code) && !/startLiveMatrix/.test(code), "the matrix's line and its hand-over to the panel are gone together");
  assert.match(code, /import \{ startDeploymentSystem \} from "\.\/study\/ds1\/live\.mjs";/); assert.match(code, /moneyEl: ds1Money/); assert.match(code, /<div id="ds1money-host"><\/div>/); assert.match(code, /onRead: ds1Spine/, "and it tells the sources line what it read");
  assert.match(code, /window\.setDeployLive=function\(v\)\{/, "the old setter is still in the page, unused — listed for removal, not removed");
  const specs = PAGE.slice(PAGE.indexOf('<details class="sc-pagespecs"'));
  assert.ok(specs.includes("What changed on 7 Oct, later — one forward P/E") && specs.includes("The deployment system, live (7 Oct)") && specs.includes("What changed on 7 Oct — the money at the top"), "every lane's PAGE SPECS paragraph is kept, under its own heading");
  assert.ok(!specs.includes("The matrix, live (7 Oct)"), "the matrix's paragraph went with its line"); assert.ok(/This is that next round/.test(specs) && /no scenario file is read/.test(specs), "and the money paragraph says what the first panel is now");
  assert.ok(!/on a branch, for review/.test(specs) && !/marked PLACEHOLDER/.test(specs), "and neither says what is no longer true");
  for (const f of ["study/dm2/scenarios.mjs", "tests/fixtures/rl1-daily-closes-20261006.json"]) assert.ok(!/apikey=[A-Za-z0-9]{10,}/.test(read(f)) && !/eyJ[A-Za-z0-9_-]{20,}/.test(read(f)), f + " carries no key");
});
