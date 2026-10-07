/* PA5 tests (5 Oct 2026, night): the blend (every source present → the weighted average; a source missing → weights renormalised and the
   missing one named), the bow tie drawn hot → cold with the readings' times, one sector voter in place of three, the chain's order,
   the knockout (seeded by fundamentals, who beat whom, the Geiger only when even), KEEP in the knockout writes through the page's own
   path (against a test row) and the pick takes its %. Headless, against the local stand-in for Vercel. node --test tests/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage, sbGet } from "./_harness.mjs";

let P, state;
test("the page loads with the blend live and no stray write", async () => {
  P = await openPage({ allowPost: (u) => /\/rest\/v1\/comps_decisions$/.test(u) });
  state = await P.page.evaluate(() => ({
    table: blendTable().map((r) => ({ key: r.key, score: r.score, cap: r.cap, eq: r.eq, bow: r.blendBow, used: r.used, missing: r.missing, weights: r.weights, parts: Object.fromEntries(Object.entries(r.parts || {}).map(([k, p]) => [k, p && { score: p.score, ts: p.ts }])) })),
    mixW: mixWeights(), method: methodWord(), voters: voters().map((v) => v.key), sectorsVoter: voters().find((v) => v.key === "SECTORS"), wts: S.wts,
    bar: document.getElementById("secbar").innerText.replace(/\n/g, " | "),
    svg: { polygons: document.querySelectorAll("#bowtie td[data-side=cap] .sc-gmini, #bowtie td[data-side=eq] .sc-gmini").length, circles: document.querySelectorAll("#bowtie td[data-side=blend] .sc-gmini").length, text: document.getElementById("bowtie").innerText },
    mixdialButtons: document.querySelectorAll("#mixdial button").length, rankDial: !!document.getElementById("mixRANK"),
    ko: KO_COHORT, K: (() => { const K = knockout(KO_COHORT); return K && { cohort: K.cohort.key, entrants: K.entrants.map((e) => [e.sym, e.seed, e.fund.score, e.fund.n, e.timing]), sitOut: K.sitOut.map((e) => [e.sym, e.fund.n]), rounds: K.rounds.map((ms) => ms.map((m) => ({ a: m.a.sym, b: m.b && m.b.sym, w: m.winner.sym, on: m.on, fa: m.a.fund.score, fb: m.b && m.b.fund.score, ta: m.a.timing, tb: m.b && m.b.timing, why: m.why }))), champion: K.champion && K.champion.sym, picks: K.picksOrder.map((e) => e.sym) }; })(),
    dom: { minis: document.querySelectorAll("#knockout .komini").length, matches: document.querySelectorAll("#knockout .komatch").length, won: [...document.querySelectorAll("#knockout .koline")].map((l) => [...l.querySelectorAll(".koround:last-child .swcard.won .chead b")].map((b) => b.innerText)), pickCards: document.querySelectorAll("#knockout .kopick .swcard").length, picksTxt: document.getElementById("picks").innerText },
    plain: plainCondition(heat()), heatLabelTxt: document.getElementById("heatlabel").innerText, policyTxt: document.getElementById("policy").innerText,
    spine: Object.fromEntries(Object.entries(SPINE).map(([k, v]) => [k, v.mode])),
  }));
  assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked, 0); assert.equal(P.nonGet.allowed, 0, "nothing written at load");
  for (const k of ["sector_compare", "sector_rankings", "tree_close_tier", "market_bowtie_live", "geiger"]) assert.equal(state.spine[k], "LIVE", k);
});
test("the blend: every source present → the blended score is the weighted average of the five readings", () => {
  assert.deepEqual(state.mixW, { SPDR: 20, HUBCMP: 20, MKTBOW: 20, TREE: 20, RANK: 20 }, "stated default weights, equal");
  const full = state.table.filter((r) => r.used.length === 5);
  assert.ok(full.length >= 8, "at least eight of the sectors carry all five readings tonight: " + full.length);
  for (const r of full) {
    const avg = ["SPDR", "HUBCMP", "MKTBOW", "TREE", "RANK"].reduce((t, k) => t + r.parts[k].score * state.mixW[k], 0) / 100;
    assert.ok(Math.abs(r.score - avg) < 1e-6, r.key + " blend " + r.score + " vs " + avg); assert.deepEqual(r.missing, []);
    assert.ok(r.cap != null && r.eq != null && Math.abs(r.bow - (r.eq - r.cap)) < 1e-9, r.key + " both halves of the bow tie");
  }
  const scores = state.table.map((r) => r.score); for (let i = 1; i < scores.length; i++) assert.ok(scores[i] <= scores[i - 1], "sorted hot → cold");
});
test("the blend: a missing source → the weights are renormalised over the rest and the missing one is named", async () => {
  const r = await P.page.evaluate(() => { const parts = blendParts("TECH"); const w = mixWeights();
    const all = blendFrom(parts, w); const noTree = blendFrom({ ...parts, TREE: null }, w); const two = blendFrom({ SPDR: parts.SPDR, RANK: parts.RANK, HUBCMP: null, MKTBOW: null, TREE: null }, w);
    return { parts: Object.fromEntries(Object.entries(parts).map(([k, p]) => [k, p.score])), all, noTree, two, live: blendTable().filter((x) => x.missing.length).map((x) => [x.key, x.missing, x.weights]) }; });
  assert.deepEqual(r.all.missing, []); assert.equal(r.all.used.length, 5);
  assert.deepEqual(r.noTree.missing, ["TREE"]); assert.deepEqual(r.noTree.used, ["SPDR", "HUBCMP", "MKTBOW", "RANK"]);
  assert.deepEqual(r.noTree.weights, { SPDR: 25, HUBCMP: 25, MKTBOW: 25, RANK: 25 }, "20/20/20/20 renormalised to 25 each");
  const avg4 = (r.parts.SPDR + r.parts.HUBCMP + r.parts.MKTBOW + r.parts.RANK) / 4; assert.ok(Math.abs(r.noTree.score - avg4) < 1e-9);
  assert.deepEqual(r.two.missing, ["HUBCMP", "MKTBOW", "TREE"]); assert.deepEqual(r.two.weights, { SPDR: 50, RANK: 50 });
  assert.ok(Math.abs(r.two.score - (r.parts.SPDR + r.parts.RANK) / 2) < 1e-9);
  // live: crypto and metals have no fund twin, no served-set bow tie and no tree roll-up — the page says so
  for (const [k, missing, weights] of r.live) { assert.ok(missing.length >= 1, k); assert.ok(Math.abs(Object.values(weights).reduce((a, b) => a + b, 0) - 100) < 0.2, k + " weights sum to 100: " + JSON.stringify(weights)); }
  const crypto = state.table.find((x) => x.key === "CRYPTO"); if (crypto) { assert.ok(crypto.missing.includes("MKTBOW") && crypto.missing.includes("TREE"), JSON.stringify(crypto.missing)); assert.ok(state.svg.text.includes("3 of 5 missing")); }
});
test("the bow tie is drawn (PA6: in the Hub's Geiger chip): one row per sector, the two halves meeting at the blend, most overbought at the top, the readings' times beside it", () => {
  const n = state.table.length; assert.ok(n >= 11, "sectors drawn " + n);
  assert.equal(state.svg.circles, n, "one blend chip per sector");
  const wings = state.table.reduce((t, r) => t + (r.cap != null ? 1 : 0) + (r.eq != null ? 1 : 0), 0); assert.equal(state.svg.polygons, wings, "one chip per cap-weighted and per equal-weighted reading");
  assert.ok(/READINGS TAKEN · fund Geigers .* ET · served-set bow tie .* ET · tree close tier .* ET · sector ranking .* ET/.test(state.svg.text), state.svg.text.slice(0, 300));
  assert.ok(state.svg.text.includes("CAP-WEIGHTED") && state.svg.text.includes("EQUAL-WEIGHTED"));
  const first = state.table[0].key, last = state.table[n - 1].key; const txt = state.svg.text;
  assert.ok(txt.indexOf(first === "TECH" ? "Technology" : first) < txt.indexOf(last === "REAL_ESTATE" ? "Real estate" : last), "hot first");
  assert.ok(/one blended bow tie/.test(state.method.toLowerCase()) || /BLENDED SECTOR BOW TIE/.test(state.method));
});
test("one sector voter in place of three, and the four-way dial is gone", () => {
  assert.ok(state.voters.includes("SECTORS")); for (const k of ["SECTOR_CMP", "BOWTIE", "MKT_BOWTIE"]) { assert.ok(!state.voters.includes(k), k + " still votes"); assert.equal(state.wts[k], undefined, k + " weight still stored"); }
  assert.equal(state.wts.SECTORS, 0.75); const v = state.sectorsVoter; assert.ok(v.val != null && Math.abs(v.val) <= 1);
  const avg = state.table.filter((r) => !["CRYPTO", "METALS", "OIL"].includes(r.key)).reduce((t, r, _, a) => t + r.score / a.length, 0); assert.ok(Math.abs(v.val - avg) < 1e-9, "the vote is the average blended reading of the fund sectors");
  assert.ok(/11 sectors, five readings each/.test(v.sub), v.sub);
  assert.equal(state.mixdialButtons, 0, "no method buttons"); assert.ok(state.rankDial, "the fifth weight dial exists in INPUTS");
});
test("the chain on one page, in order: heat → how much → the bow tie → cohorts → the knockout → the picks and their % → moves …", () => {
  const want = ["THE MONEY", "THE BRIEF", "1 HEAT", "INPUTS", "2 HOW MUCH",   /* AL8: THE MONEY, the bar per market, comes first */ "3a SECTORS", "3b MONEY", "4 COHORTS", "5 KNOCKOUT", "6 PICKS & %", "7 MOVES", "8 OPTIONS", "8b COMPS", "9 MAP", "10 STATE", "11 TRACE"];
  let at = -1; for (const w of want) { const i = state.bar.indexOf(w); assert.ok(i > at, w + " in order: " + state.bar); at = i; }
  assert.ok(/MIDDLING|WASHED OUT|STRETCHED/.test(state.heatLabelTxt) && !/^NEUTRAL/.test(state.heatLabelTxt), "plain words on the heat readout: " + state.heatLabelTxt);
  assert.ok(/^The market's heat is .*, so the plan .*: \d+% invested, \d+% in cash\.$/.test(state.plain.sentence), state.plain.sentence);
  assert.ok(state.policyTxt.includes(state.plain.sentence), "the ladder's TODAY line is the sentence");
});
test("the knockout (PA6: by business line — see pa6-knockout.test.mjs): inside each line seeded by fundamentals, first plays last, won on fundamentals, the Geiger only when even; the champion is the podium's first", () => {
  const K = state.K; assert.ok(K && K.entrants.length >= 4, "a cohort with at least four measured names is chosen by default: " + JSON.stringify(K && K.cohort));
  for (const e of K.entrants) assert.ok(e[3] >= 2, e[0] + " enters with " + e[3] + " readings"); for (const s of K.sitOut) assert.ok(s[1] < 2, s[0] + " sits out with " + s[1]);
  let total = 0; for (const ms of K.rounds) for (const m of ms) { if (!m.b) { assert.equal(m.on, "bye"); continue; } total++;
    const d = m.fa - m.fb; if (Math.abs(d) >= 0.02) { assert.equal(m.on, "fundamentals"); assert.equal(m.w, d > 0 ? m.a : m.b, m.why); assert.ok(/wins on fundamentals/.test(m.why)); }
    else { assert.equal(m.on, "timing"); assert.equal(m.w, (m.ta ?? 0) >= (m.tb ?? 0) ? m.a : m.b); assert.ok(/Geiger decides the timing/.test(m.why), m.why); } }
  assert.ok(total >= 3, "duels tonight " + total);
  assert.equal(K.champion, K.picks[0], "the champion is the podium's first"); assert.ok(state.dom.matches >= 3 && state.dom.pickCards >= 1);
  assert.ok(state.dom.won.every((w) => w.length <= 1), "at most one winner card per final");
});
/* AL8 (7 Oct): a kept name no longer takes a part of a conviction share — there is none. KEEP puts it on the conviction list in step 6,
   where it has no money until it is given a size; with a size it takes that % of the account. */
test("KEEP in the knockout: the page's own write path (test row) lands in comps_decisions, and a kept name joins the conviction list — its own size, once given", async () => {
  const reason = "PA5 test row " + new Date().toISOString();
  await P.page.evaluate((r) => writeDecision({ company: "PA5_TEST", peer: "PA5_TEST", off: false, reason: r, source: "allocation-pa5-test" }), reason);
  assert.equal(P.nonGet.allowed, 1, "one insert, to comps_decisions");
  const rows = await sbGet("comps_decisions?select=company,peer,off,reason,source&company=eq.PA5_TEST&order=set_at.desc&limit=1");
  assert.equal(rows.length, 1); assert.equal(rows[0].reason, reason); assert.equal(rows[0].source, "allocation-pa5-test");
  // the flow itself, with the write intercepted so no real name is written: KEEP on the champion's card → the pick joins the allocation and the pie
  const before = P.nonGet.urls.length;
  await P.page.evaluate(() => { window.writeDecision = async () => { throw new Error("test: write intercepted"); }; });
  const champ = state.K.champion;
  await P.page.click("#knockout .kopick .swcard:first-child .swbtns button:last-child"); await P.page.waitForTimeout(400);
  const st = await P.page.evaluate((c) => { const d = decisionOf(c, c); const PM = pickMix(sleeveShares(), investedAt(heat())); const out = { d, inPicks: PICKS.has(c), eq: PM.perName[c], picksTxt: document.getElementById("picks").innerText, card: document.querySelector("#knockout .kopick .swcard:first-child").innerText, row: !!document.querySelector('#picks .a8-pick[data-sym="' + c + '"]') };
    const had = S.sizes[c]; setSize(c, 7); out.sized = pickMix(sleeveShares(), investedAt(heat())).perName[c]; out.sizedTxt = document.getElementById("picks").innerText; setSize(c, had == null ? null : had); return out; }, champ);
  assert.ok(st.d && st.d.off === false && st.d.saved === false, "kept on the device when the write fails"); assert.ok(/KEPT/.test(st.card));
  assert.ok(st.inPicks && st.row, champ + " is on the conviction list in step 6");
  if (st.eq === 0) assert.ok(/no size yet/.test(st.picksTxt), "kept without a size: no money until one is given");   /* a name the approved list already sizes (Micron) keeps its rule */
  assert.ok(Math.abs(st.sized - 0.07) < 1e-9 && st.sizedTxt.includes(champ) && /% of the account/.test(st.sizedTxt), champ + " at 7% once given a size: " + st.sized);
  await P.page.click("#knockout .kopick .swcard:first-child .swbtns button:first-child"); await P.page.waitForTimeout(300);
  const after = await P.page.evaluate((c) => ({ inPicks: PICKS.has(c), d: decisionOf(c, c) }), champ); assert.equal(after.inPicks, false); assert.equal(after.d.off, true);
  assert.equal(P.nonGet.urls.length, before, "nothing else was sent");
});
test("teardown", async () => { await P.close(); });
