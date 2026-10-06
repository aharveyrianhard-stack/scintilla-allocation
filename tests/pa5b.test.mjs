/* PA5b tests (5 Oct 2026, night): the knockout's peer medians use the Hub's C6b outlier rule — an outlier is a PEER whose PRICE
   is strange next to the group (P/E trailing-or-forward · P/S · P/B, log scale, 3.5 spreads; 3+ votes or half the votes it has and
   at least two), left out of every median; a fast grower with normal multiples is NOT an outlier; a 300× P/E peer IS.
   Headless, against the local stand-in for Vercel; the page's own functions on a made-up peer set. node --test tests/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage } from "./_harness.mjs";

let P;
/* a made-up company ZZT with twelve peers ZP0…ZP11: multiples in a tight pack, growth 5-16%; then one peer is bent */
const world = (bend) => P.page.evaluate((bend) => {
  const peers = []; for (let i = 0; i < 12; i++) { const t = "ZP" + i, f = 1 + (i - 5.5) * 0.03; peers.push(t); COMPS[t] = { pe: 30 * f, fwd_pe: 25 * f, ps: 8 * f, pb: 6 * f, rev_growth: 0.05 + i * 0.01, net_m: 0.2, de: 0.5 }; }
  COMPS.ZZT = { pe: 28, fwd_pe: 24, ps: 7.5, pb: 6, rev_growth: 0.1, net_m: 0.2, de: 0.5 }; PEERS.ZZT = peers;
  Object.assign(COMPS.ZP11, bend); for (const k of Object.keys(PV_CACHE)) delete PV_CACHE[k];
  const O = peerOutliers("ZZT"), d = (k) => { const x = peerDist("ZZT", k); return x && { n: x.n, med: x.med, out: x.out }; }, kf = koField("ZZT");
  return { out: [...O.out], why: O.why, pe: d("pe"), ps: d("ps"), g: d("rev_growth"), ko: { outliers: kf.outliers, who: kf.outlierPeers, n: kf.fund.n }, votes: C6B.votes.map((v) => v[0]), c6b: { cut: C6B.cut, share: C6B.share, minFlags: C6B.minFlags, shareMinFlags: C6B.shareMinFlags, minN: C6B.minN } };
}, bend);

test("the page loads; the rule's numbers are the Hub's: 3.5 spreads, P/E · P/S · P/B vote, 3+ or half and at least two, 5 peers", async () => {
  P = await openPage();
  const w = await world({});
  assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked, 0);
  assert.deepEqual(w.votes, ["P/E", "P/S", "P/B"]); assert.deepEqual(w.c6b, { cut: 3.5, share: 0.5, minFlags: 3, shareMinFlags: 2, minN: 5 });
  assert.deepEqual(w.out, [], "a tight pack has no outlier"); assert.equal(w.pe.n, 12); assert.equal(w.g.n, 12);
});
test("a fast grower with normal multiples is NOT an outlier: it stays in every median", async () => {
  const w = await world({ rev_growth: 4.2, net_m: -3, de: 40 });
  assert.deepEqual(w.out, []); assert.equal(w.pe.n, 12); assert.equal(w.g.n, 12, "the 420% grower is still in the growth median's pack"); assert.equal(w.ko.outliers, 0);
});
test("a 300× P/E peer priced strangely across the multiples IS an outlier: out of EVERY median, growth included", async () => {
  const base = await world({}), w = await world({ pe: 300, fwd_pe: 180, ps: 70 });
  assert.deepEqual(w.out, ["ZP11"]); assert.deepEqual(w.why.ZP11, { n: 2, have: 3, on: ["P/E", "P/S"] });
  assert.equal(w.pe.n, 11); assert.equal(w.ps.n, 11); assert.equal(w.g.n, 11, "left out of the growth median too"); assert.ok(w.g.med < base.g.med);
  assert.deepEqual(w.ko, { outliers: 1, who: ["ZP11"], n: 4 });
});
test("trailing and forward P/E wild together are ONE vote: a marked peer, still in the medians", async () => {
  const w = await world({ pe: 300, fwd_pe: 250 });
  assert.deepEqual(w.out, [], "1 of 3 votes"); assert.equal(w.pe.n, 12);
  const loss = await world({ pe: null, fwd_pe: null, ps: 70, pb: 60 }); assert.deepEqual(loss.out, ["ZP11"]); assert.equal(loss.why.ZP11.have, 2);
  const one = await world({ pe: null, fwd_pe: null, pb: null, ps: 70 }); assert.deepEqual(one.out, [], "one flag never decides");
});
test("tonight's knockout still runs on the live data, and says who was left out on price", async () => {
  const k = await P.page.evaluate(() => { for (const k of Object.keys(PV_CACHE)) delete PV_CACHE[k]; for (const t of Object.keys(COMPS)) if (/^Z(ZT|P\d+)$/.test(t)) delete COMPS[t]; delete PEERS.ZZT; render();
    const K = knockout(KO_COHORT); return K && { n: K.entrants.length, rounds: K.rounds.length, champ: K.rounds[K.rounds.length - 1][0].winner.sym, withOut: K.entrants.filter((e) => e.outliers).map((e) => [e.sym, e.outlierPeers]), note: document.querySelector("#knockout").innerText.includes("out on price") || document.querySelector("#knockout").innerText.includes("no outliers to drop") }; });
  assert.ok(k && k.n >= 4 && k.rounds >= 2 && k.champ); assert.ok(k.note); assert.deepEqual(P.errors, []);
  console.log("PA5b knockout tonight: " + JSON.stringify(k));
  await P.close();
});
