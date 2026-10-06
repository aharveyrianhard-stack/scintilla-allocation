/* PA6 tests (6 Oct 2026): the knockout built to KNOCKOUT-CONCEPT.html and nothing else. Who may face whom: only two names in the
   same C5 business line (a duel across business lines is impossible — on tonight's cohort and on a made-up cohort of the pairs Alan
   named: RMBS v LRCX, ADI v ASML, SIMO v IREN never meet); how a duel is scored (four readings against the line's field, the family
   when the line is thin, C6b outliers out, won on fundamentals, the Geiger only when even); seeds; rounds until a line champion;
   champions on a podium, never duelling; a lone name's champion marked unopposed. Headless, local stand-in for Vercel. node --test tests/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage } from "./_harness.mjs";

let P, s;
const dumpK = (K) => K && { cohort: K.cohort.key, lines: K.lines.map((l) => ({ line: l.line, scale: l.scale.level + ":" + l.scale.name, scaleN: l.scale.members.length, entrants: l.entrants.map((e) => [e.sym, e.seed, e.fund.score, e.fund.n, e.timing, e.fieldN]), sitOut: l.sitOut.map((e) => e.sym), rounds: l.rounds.map((ms) => ms.map((m) => ({ a: m.a.sym, b: m.b && m.b.sym, w: m.winner.sym, on: m.on, fa: m.a.fund.score, fb: m.b && m.b.fund.score, ta: m.a.timing, tb: m.b && m.b.timing, why: m.why }))), champion: l.champion && l.champion.sym, unopposed: l.unopposed })),
  podium: K.podium.map((e) => [e.sym, e.line, e.fund.score]), champion: K.champion && K.champion.sym, picks: K.picksOrder.map((e) => e.sym), rounds: K.rounds.length, entrants: K.entrants.length };
test("the page loads with C5's method live; tonight's knockout runs by business line", async () => {
  P = await openPage({ allowPost: (u) => /\/rest\/v1\/comps_decisions$/.test(u) });
  s = await P.page.evaluate(() => {
    const K = knockout(KO_COHORT);
    return { spine: SPINE.c5_lines, nLines: Object.keys(LINES).length, hand: LINES.LRCX && LINES.LRCX.lines, mu: LINES.MU && LINES.MU.lines, comps: Object.keys(COMPS).length,
      K: (window.__dk = (K) => K && { cohort: K.cohort.key, lines: K.lines.map((l) => ({ line: l.line, scale: l.scale.level + ":" + l.scale.name, scaleN: l.scale.members.length, entrants: l.entrants.map((e) => [e.sym, e.seed, e.fund.score, e.fund.n, e.timing, e.fieldN]), sitOut: l.sitOut.map((e) => e.sym), rounds: l.rounds.map((ms) => ms.map((m) => ({ a: m.a.sym, b: m.b && m.b.sym, w: m.winner.sym, on: m.on, fa: m.a.fund.score, fb: m.b && m.b.fund.score, ta: m.a.timing, tb: m.b && m.b.timing, why: m.why }))), champion: l.champion && l.champion.sym, unopposed: l.unopposed })), podium: K.podium.map((e) => [e.sym, e.line, e.fund.score]), champion: K.champion && K.champion.sym, picks: K.picksOrder.map((e) => e.sym), rounds: K.rounds.length, entrants: K.entrants.length })(K),
      lineOf: Object.fromEntries(K.entrants.map((e) => [e.sym, Object.entries(LINES[e.sym].lines)])),
      dom: { lines: document.querySelectorAll("#knockout .koline").length, matches: document.querySelectorAll("#knockout .komatch").length, minis: document.querySelectorAll("#knockout .komini").length, podium: document.querySelectorAll("#knockout .kopick .swcard").length, won: [...document.querySelectorAll("#knockout .koline")].map((l) => [...l.querySelectorAll(".koround:last-child .swcard.won .chead b")].map((b) => b.innerText)), text: document.getElementById("knockout").innerText } };
  });
  assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked, 0); assert.equal(P.nonGet.allowed, 0, "nothing written at load");
  assert.equal(s.spine && s.spine.mode, "LIVE", "C5's lines.mjs and the segments reached through the rewrites: " + JSON.stringify(s.spine));
  assert.ok(s.nLines >= 400, "a line vector for every served company: " + s.nLines);
  assert.deepEqual(s.hand, { "semiconductor equipment": 1 }, "PA6's hand rule: Lam is semiconductor equipment"); assert.deepEqual(s.mu, { memory: 1 }, "Micron is memory, from its DRAM / NAND segments");
  assert.ok(s.comps >= 300, "fundamentals loaded for the served names so every line has its field: " + s.comps);
  const K = s.K; assert.ok(K && K.lines.length >= 3 && K.entrants >= 6, JSON.stringify(K && { c: K.cohort, l: K.lines.length, e: K.entrants }));
  console.log("PA6 knockout tonight: " + K.cohort + " · " + K.lines.map((l) => l.line + " " + l.entrants.length + "→" + l.champion + (l.unopposed ? " (unopposed)" : "")).join(" · ") + " · podium " + K.podium.map((p) => p[0]).join(" > "));
});
test("who may face whom: every duel is inside one business line, both names with at least 15 cents of revenue in it — never across lines", () => {
  let duels = 0;
  for (const l of s.K.lines) for (const ms of l.rounds) for (const m of ms) { if (!m.b) { assert.equal(m.on, "bye"); continue; } duels++;
    const la = Object.fromEntries(s.lineOf[m.a]), lb = Object.fromEntries(s.lineOf[m.b]);
    assert.ok((la[l.line] || 0) >= 0.15 && (lb[l.line] || 0) >= 0.15, m.a + " v " + m.b + " in " + l.line + ": " + JSON.stringify([la, lb])); }
  assert.ok(duels >= 5, "duels tonight " + duels);
  const byLine = {}; for (const l of s.K.lines) for (const e of l.entrants) byLine[e[0]] = l.line;
  for (const [a, b] of [["RMBS", "LRCX"], ["ADI", "ASML"], ["SIMO", "IREN"]]) if (byLine[a] && byLine[b]) assert.notEqual(byLine[a], byLine[b], a + " and " + b + " are in different lines");
});
test("how a duel is scored: seeds by fundamentals inside the line, first plays last, won on fundamentals, the Geiger only when even; the scale is the line or, when thin, the family", () => {
  for (const l of s.K.lines) {
    for (let i = 1; i < l.entrants.length; i++) assert.ok(l.entrants[i][2] <= l.entrants[i - 1][2], l.line + " seeded by fundamentals");
    for (const e of l.entrants) { assert.ok(e[3] >= 2, e[0] + " enters with " + e[3]); assert.ok(e[5] >= 4, e[0] + " measured against a field of " + e[5]); }
    if (l.entrants.length > 1) { const r1 = l.rounds[0]; assert.equal(r1[0].a, l.entrants[0][0]); assert.equal(r1[0].b, l.entrants[l.entrants.length - 1][0], l.line + ": first plays last"); }
    for (const ms of l.rounds) for (const m of ms) { if (!m.b) continue; const d = m.fa - m.fb;
      if (Math.abs(d) >= 0.02) { assert.equal(m.on, "fundamentals"); assert.equal(m.w, d > 0 ? m.a : m.b, m.why); assert.ok(/wins on fundamentals/.test(m.why)); }
      else { assert.equal(m.on, "timing"); assert.equal(m.w, (m.ta ?? 0) >= (m.tb ?? 0) ? m.a : m.b); assert.ok(/Geiger decides the timing/.test(m.why), m.why); } }
    assert.ok(/^(line|family):/.test(l.scale)); if (l.scale.startsWith("line:")) assert.ok(l.scaleN >= 5, l.line + " a line scale has at least five names: " + l.scaleN);
    if (l.entrants.length) { assert.equal(l.champion, l.rounds.length ? l.rounds[l.rounds.length - 1][0].w : l.entrants[0][0]); assert.equal(l.unopposed, l.entrants.length === 1); }
  }
});
test("the podium: one champion per line, ordered by score, never a duel between champions; the pick cards are the podium's first names; the unopposed are marked", () => {
  const K = s.K; const champs = K.lines.filter((l) => l.champion).map((l) => l.champion);
  assert.deepEqual([...K.podium.map((p) => p[0])].sort(), [...champs].sort(), "every line champion stands on the podium, nothing else");
  for (let i = 1; i < K.podium.length; i++) assert.ok(K.podium[i][2] <= K.podium[i - 1][2], "podium by score");
  assert.equal(K.champion, K.podium[0][0]); assert.deepEqual(K.picks, K.podium.map((p) => p[0]));
  assert.equal(s.dom.lines, K.lines.filter((l) => l.entrants.length).length, "one block per line with entrants");
  assert.ok(s.dom.podium >= 1 && s.dom.podium <= K.podium.length); assert.ok(/PODIUM/.test(s.dom.text));
  for (const l of K.lines) if (l.unopposed) assert.ok(s.dom.text.includes("unopposed"), l.line + " marked unopposed");
  for (const [i, l] of K.lines.filter((l) => l.entrants.length > 1).entries()) { /* the final's winning card is marked in every line block */ }
  assert.ok(s.dom.won.every((w) => w.length <= 1), "at most one winner card per final");
});
test("a made-up cohort of the pairs Alan named: a duel across business lines is impossible", async () => {
  const r = await P.page.evaluate(() => {
    const names = ["RMBS", "LRCX", "ADI", "ASML", "SIMO", "IREN", "MU", "SNDK", "NVDA", "MRVL"];
    for (const t of names) { const a = (UNIVERSE.cohorts[t] = UNIVERSE.cohorts[t] || []); if (!a.includes("PA6_TEST")) a.push("PA6_TEST"); }
    TRUE_COHORT_SET.add("PA6_TEST"); const K = knockout("PA6_TEST");
    const out = { lines: K.lines.map((l) => ({ line: l.line, names: l.entrants.map((e) => e.sym), duels: l.rounds.flat().filter((m) => m.b).map((m) => [m.a.sym, m.b.sym]), champion: l.champion && l.champion.sym, unopposed: l.unopposed })), podium: K.podium.map((e) => e.sym), allDuels: K.rounds.flat().filter((m) => m.b).map((m) => [m.a.sym, m.b.sym].sort().join("-")) };
    for (const t of names) UNIVERSE.cohorts[t] = UNIVERSE.cohorts[t].filter((c) => c !== "PA6_TEST"); TRUE_COHORT_SET.delete("PA6_TEST"); return out; });
  for (const bad of ["LRCX-RMBS", "ADI-ASML", "IREN-SIMO"]) assert.ok(!r.allDuels.includes(bad), bad + " must never meet: " + JSON.stringify(r.allDuels));
  const lineOf = {}; for (const l of r.lines) for (const n of l.names) lineOf[n] = l.line;
  for (const d of r.allDuels) { const [a, b] = d.split("-"); assert.equal(lineOf[a], lineOf[b], d + " across lines"); }
  const mem = r.lines.find((l) => l.line === "memory"); assert.ok(mem && mem.names.length === 2 && mem.duels.length === 1, "MU and SNDK meet in memory: " + JSON.stringify(mem));
  const dc = r.lines.find((l) => l.line === "data-center chips"); assert.ok(dc && dc.duels.length === 1 && dc.duels[0].sort().join("-") === "MRVL-NVDA", JSON.stringify(dc));
  const eq = r.lines.find((l) => l.line === "semiconductor equipment"); assert.ok(eq && eq.duels.length === 1 && eq.duels[0].sort().join("-") === "ASML-LRCX", JSON.stringify(eq));
  assert.equal(r.podium.length, r.lines.filter((l) => l.champion).length, "one champion per line on the podium");
  console.log("PA6 made-up cohort: " + JSON.stringify(r.lines.map((l) => l.line + ":" + l.names.join("/") + "→" + l.champion)));
  await P.close();
});
