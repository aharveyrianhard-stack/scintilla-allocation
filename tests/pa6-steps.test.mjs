/* PA6 tests (6 Oct 2026): the sources line (one quiet sentence with the counts, opening the list; the badges are gone), and step 3
   split in two — 3a SECTORS says each sector's reading in the Hub's Geiger chip and nothing about money; 3b HOW THE MONEY SPLITS
   shows the % of equity per sector computed from 3a with the stated rule, every column following from the one before it.
   Headless, against the local stand-in for Vercel. node --test tests/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage } from "./_harness.mjs";

let P, s;
test("the page loads; the sources are one line with the counts, and the list opens", async () => {
  P = await openPage();
  s = await P.page.evaluate(() => {
    const ds = document.getElementById("dataspine"), d = ds.querySelector("details.srcline");
    const counts = sourceCounts(); const spine = Object.values(SPINE);
    const before = { open: d.open, summary: d.querySelector("summary").innerText.replace(/\s+/g, " ").trim(), badges: ds.querySelectorAll(":scope > span").length, height: ds.getBoundingClientRect().height };
    d.open = true; const rows = [...d.querySelectorAll("table tr")].map((tr) => [...tr.children].map((td) => td.innerText)); d.open = false;
    const bow = document.getElementById("bowtie"), money = document.getElementById("moneysplit");
    money.querySelectorAll("details").forEach((d) => d.open = true);   /* AL7: the full ranking is folded under the bar — opened so its cells can be read */
    const table = blendTable();
    const rows3a = [...bow.querySelectorAll("table.sectab tr")].slice(1).map((tr) => ({ name: tr.querySelector("td.nm").childNodes[0].textContent, chips: tr.querySelectorAll(".sc-gmini").length, word: tr.querySelector("td.word").innerText, blend: tr.querySelectorAll("td.v")[0].innerText }));
    const chipFills = [...bow.querySelectorAll("td[data-side=blend] .sc-gmini i")].map((i) => ({ left: i.style.left, right: i.style.right, width: i.style.width, bg: i.style.background }));
    const M = moneyRows(); const inv = investedAt(heat()), SH = sleeveShares();
    const rows3b = [...money.querySelectorAll("table.sectab tr")].slice(1).map((tr) => [...tr.children].map((td) => td.innerText));
    const A = allocation();
    return { counts, nSpine: spine.length, before, rows, bowText: bow.innerText, moneyText: money.innerText, table: table.map((r) => ({ key: r.key, score: r.score, cap: r.cap, eq: r.eq, method: r.method, metals: r.metals && r.metals.filter((l) => l.f || l.u).length })), rows3a, chipFills, M, inv, SH,
      A: { inv: A.inv, convEq: A.convEq, coreEq: A.coreEq, indexEq: A.indexEq, sleeveEq: A.sleeveEq, maxN: A.maxN, minEq: A.minEq, conv: A.conv, idx: A.idx, sleeves: A.sleeves.map((x) => [x.key, x.equity, x.share, x.raw]), cands: A.cands.map((x) => [x.key, x.raw]) }, dials: { maxSleeves: S.maxSleeves, minSleeve: S.minSleeve, convShare: S.convShare, coreIndexShare: S.coreIndexShare },
      rows3b, secIds: [...document.querySelectorAll(".grid > .panel")].map((p) => p.id), css: getComputedStyle(bow.querySelector("td[data-side=blend] .sc-gmini")).height, folded3a: document.getElementById("p-bowtie").classList.contains("folded"), folded3b: document.getElementById("p-money").classList.contains("folded"),
      h3a: document.querySelector("#p-bowtie .pbody").getBoundingClientRect().height, h3b: document.querySelector("#p-money .pbody").getBoundingClientRect().height };
  });
  assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked, 0);
  assert.equal(s.before.badges, 0, "no badges left under the title");
  assert.ok(!s.before.open, "the list is closed by default");
  assert.ok(new RegExp("^sources: " + s.counts.live + " live" + (s.counts.old ? " · " + s.counts.old + " old" : "") + (s.counts.gone ? " · " + s.counts.gone + " unreachable" : "") + " ?details$").test(s.before.summary), s.before.summary);
  assert.equal(s.counts.live + s.counts.old + s.counts.gone, s.nSpine, "every source counted once");
  assert.equal(s.rows.length, s.nSpine, "the list names every source"); assert.ok(s.rows.every((r) => r.length === 3 && /^(live|old|unreachable)/.test(r[1])), "name · state · what it is");
  assert.ok(s.before.height < 40, "one quiet line: " + s.before.height + "px");
});
test("3a SECTORS: one row per sector in the Hub's chip (cap · blend · equal), the ladder's words, most overbought first, and nothing about money", () => {
  assert.equal(s.rows3a.length, s.table.length);
  /* AL7: the metals row is read from the metal — its two side chips are gold and silver themselves, not a cap-weighted and an equal-weighted half */
  s.table.forEach((r, i) => { const row = s.rows3a[i]; const want = r.method === "COMMODITY" ? 1 + 2 : 1 + (r.cap != null ? 1 : 0) + (r.eq != null ? 1 : 0); assert.equal(row.chips, want, r.key + " chips"); assert.equal(row.word, sectorWordJS(r.score), r.key + " word"); });
  for (let i = 1; i < s.table.length; i++) assert.ok(s.table[i].score <= s.table[i - 1].score, "most overbought first");
  s.table.forEach((r, i) => { const f = s.chipFills[i]; const bull = r.score >= 0; assert.equal(bull ? f.left : f.right, "50%", r.key + " fills from the centre " + (bull ? "rightwards" : "leftwards")); assert.ok(f.bg.includes(bull ? "--bull" : "--bear"), r.key + " colour " + f.bg); assert.ok(Math.abs(parseFloat(f.width) - Math.min(Math.abs(r.score), 1) * 50) < 0.01, r.key + " width " + f.width); });
  assert.equal(s.css, "16px", "the Hub's blend chip height (the board's mean line)");
  assert.ok(!/equity|money|%\s*of|invested|cash/i.test(s.bowText), "3a says nothing about money: " + (s.bowText.match(/.{0,40}(equity|money|% of|invested|cash).{0,40}/i) || [""])[0]);
  assert.ok(/OVERSOLD/.test(s.bowText) && /OVERBOUGHT/.test(s.bowText), "the ends are named");
  assert.ok(s.folded3a && s.folded3b && s.h3a <= 900 && s.h3b <= 900, "one screen each: " + s.h3a + " / " + s.h3b);
  assert.deepEqual(s.secIds.slice(3, 7), ["p-howmuch", "p-bowtie", "p-money", "p-cohorts"], "3a then 3b, between HOW MUCH and the cohorts");
});
/* AL7 (6 Oct, evening) — Alan: "I would never diversify to this degree". 3b is no longer every sector between 2% and 35%: it is a few sleeves,
   core and conviction. The rule's columns (coldness, the turn, raw) are PA6's, unchanged; what follows them is new and is tested here. */
test("3b HOW THE MONEY SPLITS: the ranking follows from the 3a reading by the stated rule; only the first few sleeves are funded, none under the smallest allowed; index + sleeves + conviction add up to the rung", async () => {
  const M = s.M, A = s.A; assert.ok(M.rows.length >= 11, "the eleven sectors and more are candidates");
  let rawTot = 0; for (const r of M.rows) { const cold = Math.max(0.05, (1 - r.score) / 2); const turn = r.kind === "improve" ? 1.35 : r.kind === "avoid" ? 0.6 : r.kind === "buy" ? 0.85 : 1; assert.ok(Math.abs(r.cold - cold) < 1e-9 && Math.abs(r.raw - cold * turn) < 1e-9, r.key); rawTot += r.raw; }
  for (let i = 0; i < M.rows.length; i++) { const r = M.rows[i]; assert.ok(Math.abs(r.rawShare - r.raw / rawTot) < 1e-9); assert.equal(r.rank, i + 1); if (i) assert.ok(r.raw <= M.rows[i - 1].raw + 1e-12, "ranked by raw, best first"); }
  const funded = M.rows.filter((r) => r.funded), out = M.rows.filter((r) => !r.funded);
  assert.deepEqual(s.dials, { maxSleeves: 6, minSleeve: 4, convShare: 20, coreIndexShare: 50 }, "the four proposals, as dials");
  assert.equal(A.maxN, s.dials.maxSleeves - 2, "the index sleeve and the conviction sleeve are two of the sleeves"); assert.ok(funded.length <= A.maxN && funded.length >= 1, "few sleeves: " + funded.length);
  assert.deepEqual(funded.map((r) => r.key), M.rows.slice(0, funded.length).map((r) => r.key), "the funded sleeves are the first of the ranking");
  for (const r of funded) { assert.ok(r.equity >= A.minEq - 1e-9, r.key + " is at least the smallest sleeve: " + r.equity); assert.ok(Math.abs(r.equity - r.share * A.sleeveEq) < 1e-12); assert.ok(Math.abs(r.equity - (s.SH[r.key] || 0) * s.inv) < 1e-12, "the same share every other step uses"); }
  const fr = funded.reduce((t, r) => t + r.raw, 0); for (const r of funded) assert.ok(Math.abs(r.share - r.raw / fr) < 1e-9, r.key + " takes its raw share of the sleeves");
  for (const r of out) { assert.equal(r.equity, 0); assert.ok(/outside the first \d+|smaller than the smallest sleeve/.test(r.why), r.key + ": " + r.why); assert.equal(s.SH[r.key], undefined, r.key + " gets no share anywhere"); }
  assert.ok(Math.abs(A.convEq - s.inv * 0.20) < 1e-12, "conviction is a fifth of the invested money"); assert.ok(Math.abs(A.indexEq - (s.inv - A.convEq) * 0.5) < 1e-12, "the index sleeve is half the core");
  const tot = funded.reduce((t, r) => t + r.equity, 0); assert.ok(Math.abs(tot + A.indexEq + A.convEq - s.inv) < 1e-9, "index + sleeves + conviction = the rung: " + (tot + A.indexEq + A.convEq) + " vs " + s.inv);
  assert.ok(Math.abs((s.SH.INDEX || 0) * s.inv - A.indexEq) < 1e-12, "the index sleeve is a share like the others");
  assert.equal(s.rows3b.length, M.rows.length + 1, "the full ranking: one row per candidate and the total");
  for (let i = 0; i < M.rows.length; i++) { const r = s.rows3b[i]; assert.equal(r[6], M.rows[i].funded ? (M.rows[i].equity * 100).toFixed(1) + "%" : "—", M.rows[i].key + " % of equity"); assert.ok(M.rows[i].funded ? /^IN$/.test(r[5].trim()) : /^out/.test(r[5].trim()), M.rows[i].key + " in or out: " + r[5]); }
  assert.ok(/THE MONEY/.test(s.moneyText) && /conviction/i.test(s.moneyText) && /coldness/i.test(s.moneyText) && !/2% and 35%/.test(s.moneyText), "the rule is named; the old rails are gone");
  assert.ok(!/none picked/i.test(s.moneyText + s.bowText), "nothing says none picked");
});
function sectorWordJS(v) { if (v == null) return "NO READ"; return v <= -0.5 ? "DEEP OVERSOLD" : v <= -0.2 ? "OVERSOLD" : v < 0.2 ? "NEUTRAL" : v < 0.5 ? "OVERBOUGHT" : "DEEP OVERBOUGHT"; }
/* the browser always closes, even after a failed assertion — otherwise the test process never exits */
test("teardown", async () => { if (P) await P.close(); });
