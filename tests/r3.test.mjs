/* R3 tests (6 Oct 2026) — the regime step's mechanics: the put/call row reads the IB collector's newest MEASURED session; the rows that
   cannot vote are folded with their reason and date, and nothing is removed; the heat row and the brief print one sector count; the split
   beside the heat adds back up to the heat; today's place in its own past is like-for-like and replays the voters' own formulas; turning
   rates, credit and long bonds changes only those three rows. Headless, against the local stand-in for Vercel. node --test tests/
   AL7 (6 Oct, evening) changed three things these tests pinned, on Alan's word, and the assertions say so where they changed: the voters
   are drawn inside five family folds (the rows are read from there); the IB put/call now votes, on its own measured sessions; the weight of
   the single S&P breadth pair moved to the row that reads every pair, so one voter fewer keeps a stored past. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage, sbGet } from "./_harness.mjs";

let P, s;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test("the page loads with the regime step read once", async () => {
  P = await openPage();
  await P.page.waitForFunction(() => window.heatPastRead && document.getElementById("heatpast").textContent.length > 0, null, { timeout: 60000 });
  s = await P.page.evaluate(() => {
    const V = voters(), w = (k) => S.wts[k] ?? 0, gd = document.getElementById("gauges");
    const nv = document.getElementById("notvoting"); const wasOpen = nv.open; nv.open = true;
    const nvRows = [...nv.querySelectorAll(".nvrow")].map((r) => ({ name: r.querySelector("b").innerText, why: r.querySelector("span").innerText, when: r.querySelector("i").innerText })); nv.open = wasOpen;
    const shown = [...gd.querySelectorAll("details.fam > .gauge")].map((g) => g.querySelector(".gname").childNodes[0].textContent.trim());   /* AL7: the rows sit inside their family */
    const order = [...gd.children].map((c) => c.id === "notvoting" ? "FOLD" : c.className);
    const hand = (() => { let n = 0, d = 0; for (const v of V) { if (v.val == null) continue; n += v.val * w(v.key); d += w(v.key); } return n / d; })();
    const sp = campSplit(), flip = new Set(["US10Y", "CREDIT", "DURATION"]), sf = campSplit(null, flip);
    const T = sectorTally(), R = heatPastRead();
    const live = {}; for (const v of V) if (v.val != null) live[v.key] = v.val;
    const today = { g: Object.fromEntries(["SPY", "QQQ", "IWM", "SMH", "RSP", "CLUSD", "BTCUSD", "HYG", "TLT", "GCUSD", "XLP", "XLU"].map((x) => [x, gv(x)])),
      vix: MACROAPI && MACROAPI.VIX && MACROAPI.VIX.quote ? +MACROAPI.VIX.quote.price : VIXDB.vix, vix3m: +VIXDB.vix3m, y10: +TREAS.y10, y2: +TREAS.y2 };
    return { heat: heat(), hand, wts: V.map((v) => [v.key, w(v.key)]), rows: V.map((v) => ({ key: v.key, name: v.name, val: v.val, reading: v.reading ?? null, asof: v.asof ?? null, sub: v.sub, folded: !!notVoting(v), w: w(v.key) })),
      nvRows, nvSummary: nv.querySelector("summary").innerText, nvOpen: wasOpen, shown, order, PUTCALL, pccText: [...gd.querySelectorAll(".gauge")].find((g) => /PUT \/ CALL \(IB/.test(g.textContent)).textContent,   /* AL7: read as text — the row is inside a folded family */
      sp, sf, splitText: document.getElementById("heatsplit").textContent, pastText: document.getElementById("heatpast").textContent, step: policyStep(heat()), stepF: policyStep(sf.heat),
      tally: { n: T.n, lead: T.leading.map((r) => r.key), lag: T.lagging.map((r) => r.key), turn: T.turning.map((r) => r.key), pull: T.pulling.map((r) => r.key), beside: T.beside.map((r) => r.key), bow: T.bowAvg },
      sectorsSub: V.find((v) => v.key === "SECTORS").sub, brief: document.getElementById("brief").innerText,
      R: { replay: { keys: R.replay.keys, today: R.replay.today, n: R.replay.series.length, place: R.replay.place, dates: R.replay.series.map((x) => x[0]) }, year: { keys: R.year.keys, today: R.year.today, n: R.year.series.length, place: R.year.place }, voting: R.voting, noPast: R.noPast, carried: R.carried },
      live, replayToday: pastVoterVals(today), keys: { replay: PAST_REPLAY, year: PAST_YEAR }, heatOnLive: heatOnSet(live, PAST_REPLAY),
      pick: putcallPick([{ session_et: "2026-10-05", measured: 0, put_call: null }, { session_et: "2026-10-02", measured: 590, put_call: 0.81 }, { session_et: "2026-10-01", measured: 590, put_call: 0.8 }]),
      pickNone: putcallPick([{ session_et: "2026-10-05", measured: 0, put_call: null }]),
      place: placeIn(0.5, [0.1, 0.2, 0.5, 0.9]), thin: heatPastSentence({ replay: { keys: ["SPY"], today: 0.1, place: placeIn(0.1, [0, 0.2]), first: "2026-08-11", last: "2026-08-12" }, year: { keys: ["VIX"], today: null, place: null }, voting: ["SPY", "VIX"], noPast: [], carried: 0 }),
      fold: { none: notVoting({ val: null }), old: !!notVoting({ val: 0.4, asof: new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10) }), fresh: notVoting({ val: 0.4, asof: new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10) }), reading: notVoting({ val: null, reading: 0.8, asof: new Date(Date.now() - 4 * 864e5).toISOString().slice(0, 10) }) } };
  });
  assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked, 0);
});

test("1 · PUT / CALL reads the IB collector: the newest session that measured something, with its date, measured/of_members and age; AL7: it votes on its own sessions", async () => {
  const db = await sbGet("putcall_daily?select=session_et,put_call,measured,of_members&scope=eq.MARKET_ESTIMATE&order=session_et.desc&limit=30");
  const want = db.find((r) => r.measured > 0 && r.put_call != null);
  assert.ok(want, "the collector has a measured session");
  const row = s.rows.find((r) => r.key === "PCC");
  assert.equal(s.PUTCALL.row.session_et, want.session_et); assert.ok(near(row.reading, want.put_call, 1e-9));
  assert.equal(row.asof, want.session_et);
  /* AL7 (Alan, 6 Oct: "put/call, why aren't we adding that?") — weight 0.25; the level is its place among its own OTHER measured sessions, a low
     put/call the hot side, scaled by sessions ÷ 20 while they are few; under three other sessions it still takes no level */
  assert.equal(row.w, 0.25, "the put/call carries a weight");
  const others = db.filter((r) => r.measured > 0 && r.put_call != null && r.session_et !== want.session_et).map((r) => +r.put_call);
  if (others.length >= 3) { const below = others.filter((x) => x < want.put_call).length, ties = others.filter((x) => x === want.put_call).length, pct = 100 * (below + ties / 2) / others.length;
    const expect = Math.max(-1, Math.min(1, (1 - 2 * pct / 100) * Math.min(1, others.length / 20)));
    assert.ok(near(row.val, expect, 1e-9), "the vote is its place among its own " + others.length + " other sessions, scaled: " + row.val + " vs " + expect); assert.ok(Math.abs(row.val) <= others.length / 20 + 1e-9, "few sessions cannot shout"); }
  else assert.equal(row.val, null, "no level under three other measured sessions");
  assert.ok(!row.folded, "a fresh reading stays with the voters");
  for (const bit of [want.put_call.toFixed(3), "session " + want.session_et, "measured " + want.measured + " of " + want.of_members, "old"]) assert.ok(s.pccText.includes(bit) || /today/.test(s.pccText), bit + " in: " + s.pccText);
  assert.ok(!/2019/.test(s.pccText), "the 2019 table is gone from the row");
  const empties = db.slice(0, db.indexOf(want)).map((r) => r.session_et); assert.deepEqual(s.PUTCALL.empty, empties, "the empty sessions newer than it are named");
  assert.equal(s.pick.row.session_et, "2026-10-02"); assert.deepEqual(s.pick.empty, ["2026-10-05"]); assert.equal(s.pick.sessions, 2); assert.equal(s.pickNone.row, null);
});

test("2 · rows that cannot vote are folded below the voters with a reason and a date; nothing is removed and the heat does not move", () => {
  assert.ok(!s.nvOpen, "folded by default"); assert.equal(s.order[s.order.length - 1], "FOLD", "the list sits below the voters");
  const folded = s.rows.filter((r) => r.folded);
  assert.equal(s.nvRows.length, folded.length); assert.ok(new RegExp("^not voting — why \\(" + folded.length + "\\)$").test(s.nvSummary.trim()), s.nvSummary);
  assert.deepEqual(s.nvRows.map((r) => r.name).sort(), folded.map((r) => r.name).sort());
  for (const r of s.nvRows) { assert.ok(r.why.length > 12, "a reason: " + r.name); assert.ok(/newest reading \d{4}-\d\d-\d\d|no reading on file/.test(r.when), r.name + ": " + r.when); }
  for (const r of folded) { const days = r.asof ? (Date.now() - Date.parse(r.asof)) / 864e5 : null; assert.ok((r.val == null && r.reading == null) || days >= 30, r.key + " is folded for a stated rule"); assert.ok(!s.shown.includes(r.name)); }
  for (const r of s.rows.filter((x) => !x.folded)) assert.ok(s.shown.includes(r.name), r.name + " is drawn");
  for (const k of ["M_200D", "M_50D", "M_PCC", "M_ADD", "M_TICK", "SKEW", "PCC"]) assert.ok(s.rows.find((r) => r.key === k), k + " is still in the code");
  assert.equal(s.rows.length, 33, "every row voters() returned before is still returned, and AL7's three are added (every pair · our companies above their 200-day · above their 50-day)");
  for (const k of ["BREADTH_X", "B_200D", "B_50D", "BREADTH_EW"]) assert.ok(s.rows.find((r) => r.key === k), k);
  for (const k of ["M_200D", "M_50D", "M_PCC", "M_ADD"]) assert.ok(folded.find((r) => r.key === k), k + " (TradingView snapshot of 11 Aug) is folded");
  assert.ok(near(s.heat, s.hand, 1e-12), "the heat is still the plain weighted average of the rows with a value: " + s.heat + " vs " + s.hand);
  assert.equal(s.fold.none.why, "no reading"); assert.ok(s.fold.old); assert.equal(s.fold.fresh, null); assert.equal(s.fold.reading, null);
});

test("3 · one sector count: the heat row and the brief say the same sectors, the same leading and lagging", () => {
  const t = s.tally;
  assert.equal(t.n, 11, "the eleven sectors the voter averages"); assert.equal(t.lead.length + t.lag.length + t.turn.length + t.pull.length, t.n);
  const row = s.sectorsSub.match(/^(\d+) sectors.*?(\d+) leading · (\d+) lagging/), brief = s.brief.match(/(\d+) of (\d+) sectors lead(?: \([^)]*\))?(?:, (\d+) lag)?/);
  assert.ok(row, s.sectorsSub); assert.ok(brief, s.brief.slice(0, 500));
  assert.equal(+row[1], t.n); assert.equal(+brief[2], t.n, "same sectors"); assert.equal(+row[1], +brief[2]);
  assert.equal(+row[2], t.lead.length); assert.equal(+brief[1], t.lead.length, "same leading"); assert.equal(+row[3], t.lag.length); assert.equal(+(brief[3] || 0), t.lag.length, "same lagging");
  const bowRow = s.sectorsSub.match(/bow tie ([+\-−][\d.]+)/), bowBrief = s.brief.match(/the bow tie reads ([+\-−][\d.]+)/);
  assert.equal(bowRow[1], bowBrief[1], "one bow-tie average");
  for (const k of t.beside) assert.ok(!["go", "avoid"].includes(k)); assert.ok(t.beside.length === 0 || /not counted in/.test(s.brief), "crypto, metals and oil are named apart");
  assert.equal((s.brief.match(/sectors lead/g) || []).length, 1);
});

test("4 · the split beside the heat: two camps whose weighted averages add back up to the heat", () => {
  const { sp } = s;
  assert.ok(near((sp.hot.w * sp.hot.avg + sp.cold.w * sp.cold.avg) / sp.W, s.heat, 1e-12)); assert.ok(near(sp.heat, s.heat, 1e-12));
  const voting = s.rows.filter((r) => r.val != null && !r.folded && r.w > 0);
  assert.equal(sp.hot.rows.length + sp.cold.rows.length + sp.flat.rows.length, voting.length);
  assert.deepEqual(sp.hot.rows.map((r) => r.key).sort(), voting.filter((r) => r.val > 0).map((r) => r.key).sort());
  assert.deepEqual(sp.cold.rows.map((r) => r.key).sort(), voting.filter((r) => r.val < 0).map((r) => r.key).sort());
  const f = (x) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2);
  assert.ok(s.splitText.startsWith(f(s.heat) + " = a hot camp at " + f(sp.hot.avg) + " ("), s.splitText); assert.ok(s.splitText.includes(") against a cold camp at " + f(sp.cold.avg) + " ("));
  for (const r of [...sp.hot.rows, ...sp.cold.rows]) assert.ok(s.splitText.includes(r.name + " " + f(r.val)), r.name);
});

test("5 · today against its own past: the voters' own formulas, like for like, with the coverage said", () => {
  for (const k of s.keys.replay) assert.ok(near(s.replayToday[k], s.live[k], 1e-9), k + ": the replay formula gives " + s.replayToday[k] + ", the voter " + s.live[k]);
  const { R } = s;
  assert.ok(near(R.replay.today, s.heatOnLive, 1e-12), "today is measured on the same set it is compared with");
  assert.equal(R.replay.keys.length, 15, "AL7: the single S&P breadth pair is a reading now (its weight moved to the every-pair row, which has no stored past), so fifteen voters keep one");
  assert.ok(!R.replay.keys.includes("BREADTH_EW") && R.noPast.includes("BREADTH_X")); assert.deepEqual(R.year.keys.slice().sort(), ["CURVE", "US10Y", "VIX", "VIX_TERM"]);
  assert.ok(R.year.n >= 200, "the four have about a year: " + R.year.n); assert.ok(R.replay.n >= 1 && R.replay.n <= R.year.n);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); for (const d of R.replay.dates) assert.ok(d < today, "today is not compared with itself");
  assert.equal(R.replay.place.n, R.replay.n); assert.ok(R.replay.place.pct >= 0 && R.replay.place.pct <= 100);
  assert.ok(s.pastText.includes(R.replay.keys.length + " of today's " + R.voting.length + " voters keep a stored past"), s.pastText);
  /* AL9 re-pin (7 Oct): the word on the screen is "days" (Alan: "I don't know what an evening is"); the figures are the same */
  assert.ok(s.pastText.includes("hotter than " + R.replay.place.below + " of the " + R.replay.n + " past days"), s.pastText);
  assert.ok(s.pastText.includes("hotter than " + R.year.place.below + " of the " + R.year.n + " past days"));
  assert.equal(/THIN: \d+ days/.test(s.pastText), R.replay.n < 60, "thin coverage is said in the line");
  for (const k of R.noPast) assert.ok(!s.keys.replay.includes(k)); assert.ok(R.noPast.length === 0 || /No usable stored past: /.test(s.pastText));
  assert.deepEqual(s.place, { n: 4, below: 2, pct: 62.5, min: 0.1, max: 0.9 }); assert.ok(/THIN: 2 days/.test(s.thin)); assert.ok(/cannot be read/.test(s.thin));
});

test("6 · turning rates, credit and long bonds changes those three rows and nothing else; nothing on the live page turns them", () => {
  const { sp, sf } = s, by = (x) => Object.fromEntries([...x.hot.rows, ...x.cold.rows, ...x.flat.rows].map((r) => [r.key, r.val]));
  const a = by(sp), b = by(sf);
  for (const k of Object.keys(a)) assert.ok(near(b[k], ["US10Y", "CREDIT", "DURATION"].includes(k) ? -a[k] : a[k]), k);
  const w = Object.fromEntries(s.wts), shift = 2 * (a.US10Y * w.US10Y + a.CREDIT * w.CREDIT + a.DURATION * w.DURATION) / sp.W;
  assert.ok(near(sf.heat, s.heat - shift, 1e-12), "flipped heat = heat − 2 × the three rows' weighted share");
  assert.equal(sf.W, sp.W, "the weights do not move");
  assert.ok(!/reasons to hold back/.test(s.brief + s.splitText), "the live page shows today's reading only");
});

test("close", async () => { await P.close(); });
