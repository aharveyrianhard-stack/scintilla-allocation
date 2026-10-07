/* AL7 tests (6 Oct 2026, evening) — the allocation tool, next iteration:
   1 THE BRIEF is a walkthrough (one sentence, one gauge with the five rungs and today's needle, two camp bars, at most six bullets) and the
     repeated explanations are gone; 2 the voters are grouped in five families, every row says its share of the vote, breadth reads every
     equal-weight / cap-weight pair, our companies above their 200-day and 50-day vote; 3 the sectors know the tree (the AI cohorts beside
     Technology, metals read from the metal, the five methods side by side with their spread and the companies they share); 4 a sector opens
     its branch (funds to track, the names that pass the comps filter, each with its Geiger and nearest reviewed line); 5 the money is a few
     sleeves, core and conviction, and the index sleeve says what it bets on; 6 nothing scrolls sideways on a phone.
   Headless, against the local stand-in for Vercel; no write leaves the page. node --test tests/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"; import path from "node:path";
import { openPage, sbGet, ROOT } from "./_harness.mjs";

let P, s;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const clamp = (x) => Math.max(-1, Math.min(1, x));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

test("the page loads with the tree, the reviewed lines and the long daily bars read; nothing is written", async () => {
  P = await openPage();
  await P.page.waitForFunction(() => window.AL7 && AL7.ready(), null, { timeout: 120000 });
  await P.page.waitForTimeout(700);
  s = await P.page.evaluate(() => {
    { const d = document.querySelector("#moneysplit details.two"); if (d) d.open = true; }   /* AL8: the two reads sit folded under the ranking — opened so their words can be read */
    const txt = (id) => document.getElementById(id).innerText, B = voteBook(), X = breadthPairs(), A = allocation(), brief = document.getElementById("brief");
    document.querySelectorAll("#gauges details.fam").forEach((d) => d.open = true);
    const fams = [...document.querySelectorAll("#gauges details.fam")].map((d) => ({ id: d.getAttribute("data-fam"), summary: d.querySelector("summary").innerText.replace(/\s+/g, " "), rows: [...d.querySelectorAll(":scope > .gauge")].map((g) => ({ key: g.getAttribute("data-key"), share: g.querySelector(".gshare").innerText.trim(), silent: g.classList.contains("silent") })) }));
    document.querySelectorAll("#gauges details.fam").forEach((d) => d.open = false);
    const table = blendTable(), metals = table.find((r) => r.method === "COMMODITY"), T = treeSleeveRows();
    const g = (x) => (GEIGER[x] && GEIGER[x].composite != null) ? GEIGER[x].composite : null;
    return {
      heat: heat(), step: policyStep(heat()), spine: Object.fromEntries(Object.entries(SPINE).map(([k, v]) => [k, v.mode])),
      brief: { text: brief.innerText, lead: brief.querySelectorAll(".a7-lead").length, leadText: brief.querySelector(".a7-lead").innerText, bands: brief.querySelectorAll(".a7-gauge .a7-band").length, lit: [...brief.querySelectorAll(".a7-gauge .a7-band")].filter((b) => b.style.opacity === "1").length,
        needle: parseFloat(brief.querySelector(".a7-needle").style.left), needleText: brief.querySelector(".a7-needle").innerText, rungs: [...brief.querySelectorAll(".a7-rungs div b")].map((b) => b.innerText), ticks: [...brief.querySelectorAll(".a7-ticks i")].map((i) => i.innerText),
        camps: brief.querySelectorAll(".a7-camps .k").length, campChips: brief.querySelectorAll(".a7-camps .sc-gmini").length, bullets: [...brief.querySelectorAll("ul.a7-bul li")].map((li) => li.querySelector("b").innerText), bulletLen: [...brief.querySelectorAll("ul.a7-bul li")].map((li) => li.innerText.length), paragraphs: brief.querySelectorAll("br").length, near: brief.querySelector(".a7-near").innerText },
      ladder: policyLadder().map((r) => r[2]), sp: (() => { const c = campSplit(); return { hot: c.hot.avg, cold: c.cold.avg, hotW: c.hot.w, coldW: c.cold.w, W: c.W }; })(),
      panels: { brief: txt("p-brief"), heat: txt("p-heat"), sectors: txt("p-bowtie"), money: txt("p-money"), picks: txt("p-mix"), howmuch: txt("p-howmuch") },
      book: { W: B.W, voting: B.voting, silent: B.silent, cannot: B.cannot, fams: B.fams.map((f) => ({ id: f.id, name: f.name, share: f.share, avg: f.avg, on: f.on.map((r) => r.key), all: f.rows.map((r) => r.key) })), rows: B.rows.map((r) => ({ key: r.key, fam: r.fam, w: r.w, votes: r.votes, share: r.share, val: r.v.val, nv: !!r.nv })) },
      fams, famcap: document.getElementById("famcap").innerText, wts: S.wts, voterKeys: voters().map((v) => v.key),
      pairs: { n: X.n, avg: X.avg, below: X.below, above: X.above, level: X.level, rows: X.rows.map((r) => ({ label: r.label, ew: r.ew, cw: r.cw, gap: r.gap, ewG: g(r.ew), cwG: g(r.cw) })) },
      longb: LONGB && { asof: LONGB.asof, n: LONGB.n, m200: LONGB.m200, m50: LONGB.m50, pct200: LONGB.pct200, pct50: LONGB.pct50, idx: LONGB.idx, error: LONGB.error || null },
      above: aboveAverages({ UP: Array.from({ length: 220 }, (_, i) => 100 + i), DOWN: Array.from({ length: 220 }, (_, i) => 400 - i), SHORT: Array.from({ length: 60 }, (_, i) => 50 + i), TINY: [1, 2, 3] }),
      tree: TREE && { rows: TREE.rows, links: TREE.links, companies: TREE.companies, cohorts: TREE.cohorts, nvda: TREE.of.NVDA || [], aiKids: (TREE.kids.AI || []).filter((id) => TREE.by[id].kind === "cohort") },
      T: T.map((r) => ({ key: r.key, score: r.score, parent: r.parent, n: r.n, of: r.of, cap: r.cap, eq: r.eq, parts: Object.fromEntries(Object.entries(r.parts).map(([k, p]) => [k, p && p.score])), fund: r.fund, word: groupWord(r.key) })),
      treeDom: { rows: document.querySelectorAll("#bowtie table.treetab tr").length, names: [...document.querySelectorAll("#bowtie table.treetab td.nm")].map((td) => td.childNodes[1].textContent) },
      nvdaSleeves: tickerSleeves("NVDA"), parents: TREE_SLEEVE_PARENTS,
      table: table.map((r) => ({ key: r.key, method: r.method, score: r.score })),
      metals: metals && { score: metals.score, used: metals.used, beside: metals.beside, parts: Object.fromEntries(Object.entries(metals.parts).map(([k, p]) => [k, p && p.score])), noLine: metals.noLine, miners: metals.miners.n, minersScore: metals.miners.score, lines: metals.metals.map((l) => ({ name: l.name, fund: l.fund, fut: l.fut, f: l.f && l.f.score, u: l.u && l.u.score })), glds: [g("GLD"), g("SLV")], futs: ["GCUSD", "SIUSD"].map((x) => COMPOSITE[x] ? +COMPOSITE[x].composite : null), minerSyms: metals.miners.rows.map((r) => r.sym) },
      spread: { made: methodSpread({ score: 0.5, parts: { A: { score: 0.9 }, B: { score: 0.3 }, C: null, D: { score: 0.55 } } }), one: methodSpread({ score: 0.2, parts: { A: { score: 0.2 }, B: null } }), close: methodSpread({ score: 0.1, parts: { A: { score: 0.15 }, B: { score: 0.05 } } }), far: METHOD_FAR, wide: METHOD_SPREAD },
      mx: { rows: document.querySelectorAll("#treeroll table.a7-mx")[0].querySelectorAll("tr").length - 1, ringed: document.querySelectorAll("#treeroll table.a7-mx")[0].querySelectorAll("td.c.far").length, want: table.filter((r) => r.method === "BLEND").reduce((t, r) => t + methodSpread(r).far.length, 0), sectors: table.filter((r) => r.method === "BLEND").length, text: document.getElementById("treeroll").innerText, caption: document.getElementById("mixdial").innerText },
      sets: (() => { const M = methodSets("TECH"); const served = new Set(MKTBOW.sectors.TECH.syms), fund = new Set(SPDR_MEMBERS.XLK || []); return M && { fund: M.fund, served: M.served, tier: M.tier, ranking: M.ranking, shared: M.shared.length, allServed: M.shared.every((x) => served.has(x)), allFund: fund.size ? M.shared.every((x) => fund.has(x)) : null, first: M.shared.slice(0, 5), fundServed: M.fundServed }; })(),
      A: { inv: A.inv, convEq: A.convEq, coreEq: A.coreEq, indexEq: A.indexEq, sleeveEq: A.sleeveEq, sleeves: A.sleeves.map((x) => [x.key, x.equity]), cands: A.cands.length, conv: A.conviction.rows.map((r) => [r.sym, r.size, r.how]) },
      mixtop: { segs: [...document.querySelectorAll("#mixtop .a7-mix > div")].map((d) => [d.className, parseFloat(d.style.flex), d.title]), text: txt("mixtop"), rows: document.querySelectorAll("#mixtop .a7-rows .pc").length },
      two: [...document.querySelectorAll("#moneysplit .a7-two .a7-card")].map((c) => ({ on: c.classList.contains("on"), text: c.innerText })),
      pure: {
        lines: nearestLines("MU", 1045), none: nearestLines("NOT_A_NAME", 10), mu: RLINES && RLINES.names.MU.levels.map((x) => x.level), asof: RLINES && RLINES.as_of, names: RLINES && Object.keys(RLINES.names).length,
        card: (() => { const keep = CARDS; CARDS = cardIndex({ as_of: { card_date: "2026-10-06" }, cards: { ZZZ: { ticker: "ZZZ", technicals: { lines_n: 3, lines_below: [{ label: "3D P1", tf: "3D", level: 90 }, { label: "1W C3", tf: "1W", level: 80 }], lines_above: [{ label: "2W D3", tf: "2W", level: 110 }] } } } }); const r = nearestLines("ZZZ", 100); CARDS = keep; return r; })(),
        cardList: !!cardIndex({ cards: [{ ticker: "AAA" }] }), cardNone: cardIndex(null),
        growth: fwdGrowth([{ fiscal_date: "2025-08-28", est_revenue_avg: 37.19e9 }, { fiscal_date: "2026-09-03", est_revenue_avg: 130.2e9 }, { fiscal_date: "2027-09-03", est_revenue_avg: 271.26e9 }], [{ fiscal_date: "2026-09-03", revenue: 133.188e9 }], "2026-10-07"),
        growthSoon: fwdGrowth([{ fiscal_date: "2025-12-31", est_revenue_avg: 100 * 1e9 }, { fiscal_date: "2026-12-31", est_revenue_avg: 110 * 1e9 }, { fiscal_date: "2027-12-31", est_revenue_avg: 132 * 1e9 }], [{ fiscal_date: "2025-12-31", revenue: 100e9 }], "2026-11-15"),
        growthTiny: fwdGrowth([{ fiscal_date: "2025-12-31", est_revenue_avg: 1e6 }, { fiscal_date: "2027-01-31", est_revenue_avg: 9e6 }], [], "2026-01-10"), growthNone: fwdGrowth([], [], "2026-10-07"),
        tree: (() => { const t = buildTree([{ cohort: "H", label: "HEAD", kind: "heading", parent_1: null }, { cohort: "C1", label: "ONE", kind: "cohort", parent_1: "H", parent_2: null, spine_fund: "FND" }, { cohort: "IX", label: "COPIES (x)", kind: "index", parent_1: null }],
          [{ cohort: "C1", ticker: "AAA", role: "member", status: "served" }, { cohort: "C1", ticker: "FND", role: "reference", status: "served" }, { cohort: "IX", ticker: "TWN", role: "index_fund", status: "served", near_copy_of: "XLK" }]); return { members: t.by.C1.members, funds: t.by.C1.funds, kids: t.kids.H, of: t.of.AAA, twins: t.twins.XLK, companies: t.companies, cohorts: t.cohorts }; })(),
        word: [treeWord("AI ACCELERATORS & LOGIC"), treeWord("AUTONOMY, eVTOL & DRONES"), treeWord("REITs (property)")],
      },
      width: document.documentElement.scrollWidth, vw: innerWidth,
    };
  });
  assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked, 0, "nothing is written"); assert.equal(P.nonGet.allowed, 0);
  for (const k of ["cohort_tree", "breadth_long", "geiger"]) assert.equal(s.spine[k], "LIVE", k);
  assert.ok(s.tree && s.longb && !s.longb.error, "the tree and the long bars are read");
});

test("1 · THE BRIEF is a walkthrough: one sentence, the heat as one gauge with the five rungs as bands and today's needle, the two camps as two bars, at most six bullets", () => {
  const b = s.brief;
  assert.equal(b.lead, 1); assert.ok(/^The market's heat is .*, so the plan .*: \d+% invested, \d+% in cash\.$/.test(b.leadText), b.leadText);
  assert.ok(b.text.startsWith(b.leadText), "the sentence is first");
  assert.equal(b.bands, 5, "five rungs, five bands"); assert.equal(b.lit, 1, "today's rung is the one lit");
  assert.ok(near(b.needle, (clamp(s.heat) + 1) / 2 * 100, 0.01), "the needle stands at today's heat: " + b.needle + " for " + s.heat);
  assert.ok(b.needleText.includes((s.heat >= 0 ? "+" : "−") + Math.abs(s.heat).toFixed(2)), b.needleText);
  assert.deepEqual(b.rungs, s.ladder.map((v) => v + "%"), "under each band, what is invested on that rung");
  assert.deepEqual(b.ticks, ["−1", "−0.5", "−0.2", "+0.2", "+0.5", "+1"], "the rungs' edges are the reference lines");
  /* AL9 re-pin (7 Oct): the word on the screen is "step" (Alan could not read "rung"); the line says the same thing */
  assert.ok(/next step/.test(b.near) && /% invested/.test(b.near), "the edges that would change the step, and how far: " + b.near);
  assert.equal(b.camps, 2, "two camps"); assert.equal(b.campChips, 2, "two bars");
  assert.ok(b.bullets.length >= 4 && b.bullets.length <= 6, "four to six bullets: " + b.bullets.join(" | "));
  assert.equal(b.paragraphs, 0, "no paragraph breaks left in the brief");
  for (const k of ["HOW MUCH", "SECTORS", "WHERE"]) assert.ok(b.bullets.includes(k), k);
  /* the three paragraphs this replaces ran to about 1,700 characters; the words that are left — the sentence and the bullets — are well under that */
  const words = b.leadText.length + b.bulletLen.reduce((t, n) => t + n, 0);
  assert.ok(words < 1000, "the sentence and the bullets together: " + words + " characters"); for (const n of b.bulletLen) assert.ok(n <= 260, "no bullet is a paragraph: " + n);
});

test("1 · the repeated explanations are gone: no legend of the scale, no 'none picked' on any row, no pie", () => {
  const all = Object.values(s.panels).join("\n");
  assert.ok(!/none picked/i.test(all), "'none picked' is said nowhere");
  /* AL8 (7 Oct): the conviction list starts with the name Alan approved (Micron), so on a fresh device there is nothing to say; with an empty
     list the sentence ("no name approved or kept yet") is still said once where the money is drawn, never on every row. */
  for (const k of ["brief", "money", "picks"]) assert.ok((s.panels[k].match(/no name (approved or )?kept yet/g) || []).length <= (s.A.conv.length ? 0 : 1), k + ": that no name is kept yet is said at most once where the money is drawn, and not at all while a name is approved");
  for (const k of ["heat", "sectors", "howmuch"]) assert.equal((s.panels[k].match(/no name (approved or )?kept yet/g) || []).length, 0, k);
  assert.ok(!/on a scale from/.test(all) && !/washed-out \(cold\)/.test(all) && !/WASHED OUT — everything sold down/.test(all), "the −1…+1 scale is not explained again");
  assert.ok(!/outer ring|inner ring|OUTER RING/.test(all), "the two-ring pie and its legend are gone");
  assert.ok(!/Every voter on one scale/.test(s.panels.heat) && !/MACRO HEAT = the weighted average/.test(s.panels.heat), "step 1 carries no explaining paragraph");
});

test("2 · the voters sit in five families; a family's bar is the weighted average of its voting rows; the heat is the families' shares times their averages", () => {
  const { book } = s;
  assert.deepEqual(book.fams.map((f) => f.id), ["index", "breadth", "rates", "sentiment", "defensives"]);
  assert.deepEqual(book.fams.map((f) => f.name), ["INDEX", "BREADTH", "RATES & CREDIT", "SENTIMENT", "DEFENSIVES"]);
  assert.equal(book.rows.length, s.voterKeys.length); assert.equal(book.fams.reduce((t, f) => t + f.all.length, 0), book.rows.length, "every row is in exactly one family");
  for (const [k, fam] of [["ADLINE", "breadth"], ["BREADTH_X", "breadth"], ["B_200D", "breadth"], ["B_50D", "breadth"], ["CONC", "breadth"], ["PCC", "sentiment"], ["VIX", "sentiment"], ["US10Y", "rates"], ["CREDIT", "rates"], ["SPY", "index"], ["DEF", "defensives"], ["HAVEN", "defensives"]]) assert.equal(book.rows.find((r) => r.key === k).fam, fam, k + " (Alan: 'advance/decline — isn't that a breadth metric?')");
  assert.ok(near(book.fams.reduce((t, f) => t + f.share, 0), 1, 1e-9), "the shares add up to the whole vote");
  assert.ok(near(book.fams.reduce((t, f) => t + f.share * (f.avg || 0), 0), s.heat, 1e-12), "heat = Σ family share × family average");
  for (const f of book.fams) { const on = book.rows.filter((r) => r.fam === f.id && r.votes), w = on.reduce((t, r) => t + r.w, 0); assert.ok(near(f.share, w / book.W, 1e-12), f.id); if (w) assert.ok(near(f.avg, on.reduce((t, r) => t + r.w * r.val, 0) / w, 1e-12), f.id + " average"); }
  assert.equal(s.fams.length, 5, "five folds drawn");
  s.fams.forEach((d, i) => { const f = book.fams[i]; assert.equal(d.id, f.id); assert.ok(d.summary.includes((f.share * 100).toFixed(f.share < 0.0995 ? 1 : 0) + "% of the vote"), d.summary); assert.ok(d.summary.startsWith(f.name), d.summary); });
});

test("2 · 'is it used' — every row says its share of the vote: weight ÷ the weight of every voting row; a row at weight 0 says it is unused; a row that cannot vote is in the list below", () => {
  const { book } = s, drawn = s.fams.flatMap((d) => d.rows);
  for (const r of book.rows) {
    const row = drawn.find((x) => x.key === r.key);
    if (r.nv) { assert.equal(row, undefined, r.key + " cannot vote and is not drawn among the voters"); continue; }
    assert.ok(row, r.key + " is drawn");
    if (r.votes) { assert.ok(near(r.share, r.w / book.W, 1e-12)); assert.equal(row.share, (r.share * 100).toFixed(r.share < 0.0995 ? 1 : 0) + "%", r.key); assert.ok(!row.silent); }
    else { assert.equal(r.share, 0); assert.ok(/^0% · unused$/.test(row.share), r.key + ": " + row.share); assert.ok(row.silent); }
  }
  assert.equal(book.voting + book.silent + book.cannot, book.rows.length);
  assert.ok(s.famcap.includes(book.voting + " vote") && s.famcap.includes(book.silent + " are read only") && s.famcap.includes(book.cannot + " cannot vote"), s.famcap);
});

test("2 · breadth reads every pair, not only RSP − SPY: the vote is the average equal-weight − cap-weight gap over the S&P, the Nasdaq-100 and the eleven sectors", () => {
  const X = s.pairs;
  assert.equal(X.n, 13, "thirteen pairs: " + X.rows.map((r) => r.label).join(", "));
  for (const r of X.rows) assert.ok(near(r.gap, r.ewG - r.cwG, 1e-12), r.label + ": " + r.ew + " − " + r.cw);
  assert.ok(X.rows.find((r) => r.ew === "RSP" && r.cw === "SPY") && X.rows.find((r) => r.ew === "QQQE" && r.cw === "QQQ") && X.rows.find((r) => r.ew === "RSPT" && r.cw === "XLK"));
  assert.ok(near(X.avg, mean(X.rows.map((r) => r.gap)), 1e-12)); assert.equal(X.below + X.above + X.level, X.n);
  assert.equal(X.below, X.rows.filter((r) => r.gap < -0.05).length); assert.equal(X.above, X.rows.filter((r) => r.gap > 0.05).length);
  const v = s.book.rows.find((r) => r.key === "BREADTH_X"), one = s.book.rows.find((r) => r.key === "BREADTH_EW");
  assert.ok(near(v.val, clamp(X.avg), 1e-12), "the vote is the average gap"); assert.equal(v.w, 0.5, "it carries the weight the single pair carried"); assert.ok(v.votes);
  assert.equal(one.w, 0, "the single pair is a reading now"); assert.ok(!one.votes); const sp = X.rows.find((r) => r.ew === "RSP"); assert.ok(near(one.val, clamp(sp.gap), 1e-12), "and it is one of the thirteen");
});

test("2 · our own companies above their 200-day and 50-day average vote: half above reads 0", () => {
  const L = s.longb;
  assert.ok(L.n >= 300, "the tree's companies: " + L.n); assert.ok(L.m200 >= 300 && L.m50 >= L.m200); assert.ok(L.pct200 >= 0 && L.pct200 <= 100 && L.pct50 >= 0 && L.pct50 <= 100);
  for (const [k, p] of [["B_200D", L.pct200], ["B_50D", L.pct50]]) { const r = s.book.rows.find((x) => x.key === k); assert.ok(near(r.val, clamp((p / 100 - 0.5) * 2), 1e-12), k); assert.equal(r.w, 0.25); assert.ok(r.votes, k + " votes"); }
  assert.deepEqual(s.above, { n: 3, m200: 2, m50: 3, pct200: null, pct50: null }, "the count needs twenty companies before it gives a share: " + JSON.stringify(s.above));
  for (const k of ["SPY", "RSP", "IWM"]) { const x = L.idx[k]; assert.ok(x && x.fromHigh <= 1e-12 && x.bars >= 200 && x.rsi > 0 && x.rsi < 100, k + " " + JSON.stringify(x)); }
});

test("3 · the tree is read from its tables as it stands, and the AI cohorts stand beside the sectors as their own rows", async () => {
  const [t, m] = await Promise.all([sbGet("cohort_tree?select=cohort,kind,parent_1&limit=1000"), sbGet("cohort_tree_members?select=cohort,ticker,role&limit=2000")]);
  assert.equal(s.tree.rows, t.length); assert.equal(s.tree.links, m.length);
  assert.equal(s.tree.companies, new Set(m.filter((r) => r.role === "member").map((r) => r.ticker)).size);
  const ai = t.filter((r) => r.kind === "cohort" && s.parents.includes(r.parent_1)).map((r) => r.cohort);
  assert.ok(ai.length >= 5, "the tree's AI heading carries cohorts: " + ai.length);
  for (const r of s.T) { assert.ok(ai.includes(r.key), r.key + " is a cohort of the heading"); const vals = Object.values(r.parts).filter((x) => x != null); assert.ok(near(r.score, mean(vals), 1e-12), r.key + " = the average of its readings"); assert.ok(r.n >= 3 && r.n <= r.of); assert.ok(near(r.eq, r.parts.EW, 1e-12)); }
  for (let i = 1; i < s.T.length; i++) assert.ok(s.T[i].score <= s.T[i - 1].score, "most overbought first");
  assert.equal(s.treeDom.rows, s.T.length + 1, "one row per cohort and the head"); assert.deepEqual(s.treeDom.names, s.T.map((r) => r.word));
  assert.ok(/THE TREE'S COHORTS/.test(s.panels.sectors) && /beside Technology/.test(s.panels.sectors));
  const mine = s.tree.nvda.filter((id) => ai.includes(id)); assert.ok(mine.length >= 1, "NVDA sits in an AI cohort of the tree"); for (const id of mine) assert.ok(s.nvdaSleeves.includes(id), "and so in that sleeve as well as in its sector: " + s.nvdaSleeves);
  assert.deepEqual(s.pure.tree, { members: ["AAA"], funds: ["FND"], kids: ["C1"], of: ["C1"], twins: [{ ticker: "TWN", set: "IX", status: "served" }], companies: 1, cohorts: 1 });
  assert.deepEqual(s.pure.word, ["AI accelerators & logic", "Autonomy, eVTOL & drones", "REITs (property)"]);
});

test("3 · metals are read from the metal, not the miners: the trusts are the reading, the futures stand beside it, copper is named as missing", () => {
  const M = s.metals; assert.ok(M, "a metals row");
  const trusts = M.glds.filter((x) => x != null), futs = M.futs.filter((x) => x != null);
  if (trusts.length) { assert.deepEqual(M.used, ["TRUST"]); assert.ok(near(M.score, mean(trusts), 1e-12), "the reading is gold and silver themselves (GLD, SLV): " + M.score + " vs " + mean(trusts)); assert.ok(near(M.parts.TRUST, mean(trusts), 1e-12)); }
  else { assert.deepEqual(M.used, ["FUTURE"]); assert.ok(near(M.score, mean(futs), 1e-12)); }
  if (trusts.length && futs.length) { assert.deepEqual(M.beside, ["FUTURE"]); assert.ok(near(M.parts.FUTURE, mean(futs), 1e-12)); assert.ok(!near(M.score, (mean(trusts) + mean(futs)) / 2, 1e-9) || near(mean(trusts), mean(futs), 1e-9), "the futures row is never averaged into the reading"); }
  assert.deepEqual(M.lines.map((l) => l.name), ["GOLD", "SILVER", "COPPER"]); assert.deepEqual(M.noLine, ["COPPER"], "copper has no commodity line in the estate and says so");
  assert.ok(M.miners >= 5, "the miners are kept, folded: " + M.miners); for (const t of ["GLD", "SLV", "GCUSD", "SIUSD"]) assert.ok(!M.minerSyms.includes(t), t + " is the metal, not a miner");
  assert.ok(/read from the metal/.test(s.panels.sectors) && /copper: no line served/.test(s.panels.sectors), "the row says where it is read from");
  assert.ok(s.table.find((r) => r.key === "METALS").method === "COMMODITY");
});

test("3 · how the blend is made: the five methods side by side, the spread between them, the cells far from the blend ringed, and the companies they share", () => {
  const { spread, mx, sets } = s;
  assert.equal(spread.far, 0.2); assert.equal(spread.wide, 0.4);
  assert.ok(near(spread.made.spread, 0.6, 1e-12)); assert.deepEqual(spread.made.far, ["A", "B"]); assert.equal(spread.made.wide, true); assert.equal(spread.made.n, 3);
  assert.equal(spread.one.spread, null); assert.deepEqual(spread.close.far, []); assert.equal(spread.close.wide, false);
  assert.equal(mx.rows, mx.sectors, "one row per five-method sector"); assert.equal(mx.ringed, mx.want, "a cell is ringed exactly when it is 0.20 or more from the blend");
  for (const h of ["STATE STREET FUND", "HUB SECTOR COMPARE", "MARKET BOW TIE", "TREE CLOSE TIER", "SECTOR RANKING", "THE BLEND", "SPREAD", "COMPANIES THE METHODS SHARE"]) assert.ok(mx.text.includes(h), h);
  assert.ok(/HOW THE BLEND IS MADE/.test(mx.caption) && /weights/.test(mx.caption));
  assert.ok(sets.shared >= 1 && sets.shared <= Math.min(sets.served, sets.tier, sets.ranking), JSON.stringify(sets)); assert.ok(sets.allServed, "a shared company is one we serve");
  if (sets.fund) { assert.ok(sets.allFund, "and one the fund holds"); assert.ok(sets.fundServed <= Math.min(sets.fund, sets.served)); }
});

test("4 · a sector opens its branch: the funds to track, and the names that pass the comps filter — fundamentals first — each with its Geiger and nearest reviewed line", async () => {
  const twins = (await sbGet("cohort_tree_members?select=ticker,cohort&near_copy_of=eq.XLY&limit=20")).map((r) => r.ticker);
  await P.page.evaluate(() => { setFold("p-bowtie", false); AL7.openBranch("DISCRET"); });
  await P.page.waitForFunction(() => Object.keys(FWD).length > 0, null, { timeout: 30000 }); await P.page.waitForTimeout(600);
  const b = await P.page.evaluate(() => { const el = document.querySelector("#branch .a7-branch"), N = AL7.branchNames("DISCRET");
    return { key: el.getAttribute("data-key"), text: el.innerText, funds: AL7.branchFunds("DISCRET").map((x) => [x.t, x.g]), fundRows: el.querySelectorAll(".a7-funds > b").length, fundChips: el.querySelectorAll(".a7-funds .sc-gmini").length,
      all: N.all, measured: N.measured, pass: N.pass.map((x) => ({ sym: x.sym, score: x.fund.score, n: x.fund.n, g: x.g, growth: x.growth && x.growth.v, lines: !!x.lines, price: x.price })), rows: [...el.querySelectorAll("table.a7-names tr")].slice(1).map((tr) => ({ sym: tr.querySelector("td b").innerText, chips: tr.querySelectorAll(".sc-gmini").length, cells: tr.children.length })),
      open: document.querySelector("#bowtie tr.open") && document.querySelector("#bowtie tr.open").getAttribute("data-key"), sector: Object.fromEntries(N.pass.map((x) => [x.sym, sectorKeyOfAny(x.sym)])), bowText: document.getElementById("bowtie").innerText, fwd: Object.keys(FWD).length }; });
  assert.equal(b.key, "DISCRET"); assert.equal(b.open, "DISCRET", "the pressed row is marked");
  assert.ok(/FUNDS TO TRACK/.test(b.text) && /NAMES THAT PASS THE COMPS FILTER/.test(b.text) && /HOW THIS READING IS MADE/.test(b.text));
  const funds = b.funds.map((x) => x[0]); assert.deepEqual(funds.slice(0, 2), ["XLY", "RSPD"], "the State Street fund, then its equal-weight twin");
  assert.ok(twins.length >= 1, "the tree lists copies of XLY"); for (const t of twins) assert.ok(funds.includes(t), t + " (the tree's near copy) is in the funds to track: " + funds); assert.equal(funds.length, 2 + twins.length);
  assert.equal(b.fundRows, funds.length); assert.equal(b.fundChips, b.funds.filter((x) => x[1] != null).length, "each served fund with its Geiger");
  assert.ok(b.pass.length >= 1 && b.pass.length <= b.measured && b.measured <= b.all);
  for (const x of b.pass) { assert.ok(x.n >= 2 && x.score >= 0.5, x.sym + " passes the filter: " + x.score + " on " + x.n); assert.equal(b.sector[x.sym], "DISCRET", x.sym + " is a consumer discretionary company"); }
  for (let i = 1; i < b.pass.length; i++) assert.ok(b.pass[i].score <= b.pass[i - 1].score + 1e-12, "fundamentals first");
  assert.deepEqual(b.rows.map((r) => r.sym), b.pass.slice(0, 8).map((x) => x.sym), "the best eight are shown, in order"); for (const r of b.rows) { assert.equal(r.cells, 6, "name · growth · fundamentals · Geiger · nearest reviewed line · target"); assert.ok(r.chips >= 1, r.sym + " carries its Geiger chip"); }
  assert.ok(b.pass.some((x) => x.growth != null), "growth comes from the stored estimates"); assert.ok(b.pass.some((x) => x.price != null), "prices are read when the branch opens");
  assert.ok(!/equity|money|%\s*of|invested|cash/i.test(b.bowText), "3a's table still says nothing about money");
  await P.page.evaluate(() => AL7.openBranch("DISCRET")); assert.equal(await P.page.evaluate(() => document.getElementById("branch").innerHTML), "", "pressing it again closes the branch");
  // a tree cohort's branch: the tree's own funds and members
  const ai = s.T[0].key; await P.page.evaluate((k) => AL7.openBranch(k), ai); await P.page.waitForTimeout(1500);
  const c = await P.page.evaluate((k) => ({ funds: AL7.branchFunds(k).map((x) => x.t), tree: [TREE.by[k].spine_fund, ...TREE.by[k].funds].filter(Boolean), members: TREE.by[k].members, pass: AL7.branchNames(k).pass.map((x) => x.sym), text: document.querySelector("#branch .a7-branch").innerText }), ai);
  assert.deepEqual(c.funds, [...new Set(c.tree)], "the funds the tree names for the cohort"); for (const x of c.pass) assert.ok(c.members.includes(x), x + " is a member of " + ai);
  // metals: the metal's lines and trusts, the miners folded
  await P.page.evaluate(() => AL7.openBranch("METALS")); await P.page.waitForTimeout(400);
  const m = await P.page.evaluate(() => { const el = document.querySelector("#branch .a7-branch"), d = el.querySelector("details"); return { text: el.innerText, funds: AL7.branchFunds("METALS").map((x) => x.t), minersOpen: d.open, summary: d.querySelector("summary").innerText, miners: d.querySelectorAll(".a7-mini").length }; });
  assert.deepEqual(m.funds, ["GLD", "SLV"], "the funds to track are the metal's own trusts"); assert.ok(/GOLD/.test(m.text) && /SILVER/.test(m.text) && /COPPER/.test(m.text) && /no commodity line in the estate/.test(m.text));
  assert.equal(m.minersOpen, false, "the miners are folded"); assert.ok(/THE MINERS/.test(m.summary) && /never in the reading/.test(m.summary)); assert.equal(m.miners, s.metals.miners);
  await P.page.evaluate(() => { AL7.openBranch("METALS"); setFold("p-bowtie", true); });
});

test("4 · the nearest reviewed line: the Lab's own label, the closest level under and over the price, dated; a decision card's lines when the Hub serves one; growth from the stored estimates", () => {
  const file = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reviewed-lines-20261006.json"), "utf8"));
  assert.equal(s.pure.names, Object.keys(file.names).length); assert.equal(s.pure.asof, file.as_of); assert.ok(/^\d{4}-\d\d-\d\d$/.test(file.as_of), "the levels carry their date");
  const lv = file.names.MU.levels.map((x) => x.level), below = Math.max(...lv.filter((x) => x <= 1045)), above = Math.min(...lv.filter((x) => x > 1045)), L = s.pure.lines;
  assert.equal(L.below.level, below); assert.equal(L.above.level, above); assert.ok(near(L.below.pct, (below / 1045 - 1) * 100, 1e-9) && L.below.pct <= 0 && L.above.pct > 0);
  assert.ok(/^(\d+[DWM]|\d+[hm]) /.test(L.below.id) && /^(\d+[DWM]|\d+[hm]) /.test(L.above.id), "the Lab's label carries its timeframe: " + L.below.id + " / " + L.above.id); assert.equal(L.asof, file.as_of); assert.equal(L.n, lv.length);
  assert.equal(s.pure.none, null, "a name with no reviewed line says nothing");
  /* AL8: the card's levels in the real cards' own field names; the source is said in plain words (no internal code on the page) */
  const C = s.pure.card; assert.equal(C.src, "its decision card"); assert.equal(C.below.id, "3D P1"); assert.equal(C.above.id, "2W D3"); assert.ok(near(C.below.pct, -10, 1e-9) && near(C.above.pct, 10, 1e-9)); assert.equal(C.asof, "2026-10-06");
  assert.equal(s.pure.cardList, true, "cards may come as a list or keyed by ticker"); assert.equal(s.pure.cardNone, null);
  const g = s.pure.growth; assert.ok(near(g.v, 271.26e9 / 133.188e9 - 1, 1e-12), "next fiscal year's expected revenue ÷ the reported year before: " + g.v); assert.equal(g.fyEnd, "2027-09-03"); assert.equal(g.basis, "reported"); assert.equal(g.says, true);
  assert.equal(s.pure.growthSoon.fyEnd, "2027-12-31", "a year that ends inside three months is nearly known: the one after is read"); assert.ok(near(s.pure.growthSoon.v, 132 / 110 - 1, 1e-12)); assert.equal(s.pure.growthSoon.basis, "estimate");
  assert.equal(s.pure.growthTiny.says, false, "growth from a near-zero base says nothing"); assert.equal(s.pure.growthNone, null);
});

/* AL8 (7 Oct 2026): the pin this test held — at most six sleeves, conviction a fifth of what is invested, the index sleeve half the core,
   the four dials moving it, the kept names sharing the conviction part — is the fixed shape Alan turned down that night ("the conviction
   doesn't always have to be a fifth"; "the index sleeve, half of the core — I don't think I'm understanding"; "at most six sleeves — I
   don't think it makes sense to limit it"). The rule that replaced it is pinned in al8.test.mjs. What stays here is what did not change:
   the bar is the whole of the money, in the same three roles. */
test("5 · the money bar is the whole of the money: cash, the core's sleeves, conviction by name (AL8: the fixed shape of 6 Oct was replaced — see al8.test.mjs)", () => {
  const A = s.A; assert.ok(A.cands >= 14, "from " + A.cands + " candidates");
  assert.ok(near(1 - A.inv + A.indexEq + A.sleeves.reduce((t, x) => t + x[1], 0) + A.convEq, 1, 1e-9), "cash + the equal-weight fund + sleeves + conviction = everything");
  const segs = s.mixtop.segs, sized = A.conv.filter((r) => r[1] > 0).length, cores = A.sleeves.length + (A.indexEq > 0 ? 1 : 0);
  assert.equal(segs[0][0], "cash"); assert.equal(segs.filter((x) => x[0] === "core").length, cores, "core = the funded sleeves (the equal-weight fund only when none is funded)");
  assert.equal(segs.filter((x) => x[0] === "conv").length, sized, "one conviction segment per sized name"); if (sized) assert.equal(segs[segs.length - 1][0], "conv");
  assert.ok(near(segs.reduce((t, x) => t + x[1], 0), 1, 1e-3), "the bar is the whole of the money"); assert.ok(near(segs[0][1], 1 - A.inv, 1e-4));
  assert.ok(/CORE/.test(s.mixtop.text) && /CONVICTION/.test(s.mixtop.text) && /cash/i.test(s.mixtop.text), "core and conviction are visible"); assert.equal(s.mixtop.rows, cores + sized, "one line per sleeve and per sized name under the bar");
  assert.ok(!/none picked|no name kept yet — it waits in the index sleeve/i.test(s.mixtop.text + s.panels.money), "nothing says none picked");
});

test("5 · small caps or breadth: the two reads side by side, and the index sleeve says which one it bets on", () => {
  assert.equal(s.two.length, 2); const [a, b] = s.two;
  /* AL8: the equal-weight fund holds the core only when no branch is funded, so the card names it the fall-back fund's bet */
  assert.ok(a.on && !b.on, "one of the two is the bet"); assert.ok(/BREADTH RETURNING/.test(a.text) && /RSP/.test(a.text) && /THE FALL-BACK FUND'S BET/.test(a.text), a.text.slice(0, 120));
  assert.ok(/SMALL CAPS RETURNING/.test(b.text) && /IWM/.test(b.text) && !/BET/.test(b.text));
  for (const c of s.two) for (const k of ["Geiger gap to the S&P", "off its high", "against its 50-day", "against its 200-day", "RSI (14)"]) assert.ok(c.text.includes(k), k);
  assert.ok(/SMALL CAPS OR BREADTH/.test(s.panels.money) && new RegExp(s.pairs.below + " of " + s.pairs.n + " equal-weight pairs trail").test(s.panels.money), "the breadth count is beside it");
  assert.ok(/the regime study, 5 Oct 2026/.test(a.text) && /0 of 21/.test(a.text), "the count behind the bet is the regime study's, dated (AL8: named by what it is, not by its code)");
  assert.ok(s.wts.BREADTH_SC === 0.25 && s.A.sleeves.every((x) => x[0] !== "SMALL"), "small caps still vote in the heat; they hold no sleeve");
});

test("6 · on a phone nothing scrolls sideways, and a panel's body uses the panel's width", async () => {
  const Q = await openPage({ width: 390, height: 844 });
  try {
    await Q.page.waitForFunction(() => window.AL7 && AL7.ready(), null, { timeout: 120000 }); await Q.page.waitForTimeout(500);
    const r = await Q.page.evaluate(() => { const w = (sel) => document.querySelector(sel).getBoundingClientRect().width; setFold("p-money", false); setFold("p-heat", false);
      return { page: document.documentElement.scrollWidth, vw: innerWidth, panel: w("#p-brief"), body: w("#p-brief .pbody"), money: w("#p-money .pbody"), moneyPanel: w("#p-money"), gauge: w("#brief .a7-gauge"), bar: w("#mixtop .a7-mix"),
        ticks: [...document.querySelectorAll("#brief .a7-ticks i")].map((i) => { const b = i.getBoundingClientRect(); return [b.left, b.right, b.top]; }), small: [...document.querySelectorAll("#brief *")].filter((e) => e.children.length === 0 && e.innerText && e.innerText.trim() && parseFloat(getComputedStyle(e).fontSize) < 11).length }; });
    assert.deepEqual(Q.errors, []); assert.ok(r.page <= r.vw, "no sideways scroll: " + r.page + " in " + r.vw);
    assert.ok(r.body >= r.panel - 40 && r.money >= r.moneyPanel - 40, "the body is as wide as its panel (it was squeezed beside the FOLD button): " + r.body + " of " + r.panel + ", " + r.money + " of " + r.moneyPanel);
    assert.ok(r.gauge >= 240 && r.bar >= 240, "the gauge and the bar have room: " + r.gauge + " / " + r.bar);
    for (let i = 0; i < r.ticks.length; i++) for (let j = i + 1; j < r.ticks.length; j++) { const a = r.ticks[i], b = r.ticks[j]; assert.ok(Math.abs(a[2] - b[2]) > 4 || a[1] <= b[0] + 0.5 || b[1] <= a[0] + 0.5, "no two marks under the gauge touch (" + i + "," + j + ")"); }
    assert.equal(r.small, 0, "no text in the brief is under 11px");
  } finally { await Q.close(); }
});

test("a device that already holds saved dials keeps them: only the breadth weight moves to the every-pair row and the put/call takes its weight, once", async () => {
  /* the state the live page (main @e8b2862) saves, with three weights the owner changed, a picked name and his own caps */
  const saved = { dTrend: 0.5, dRsi: 0.6, dTf: 0.763, vixCold: 32, tenCold: 4.8, maxInv: 100, minInv: 20, invCold: 80, invMid: 50, invHot: 30, nLC: 4, nSC: 2, nPer: 2, divAuto: 1, lcTilt: 0, maxTotal: 10, maxNames: 6, concLean: 0, curInv: 0, curLC: 0,
    wts: { SPY: 0.75, QQQ: 1, IWM: 0.5, SMH: 0.5, VIX: 0.5, US10Y: 0.5, OIL: 0.5, VALUE: 0, CRYPTO: 0.25, DEF: 0.25, BREADTH_EW: 0.75, BREADTH_SC: 0.25, SECTORS: 0.75, VIX_TERM: 0.25, CURVE: 0.5, PCC: 0, SKEW: 0.25, ADLINE: 0.5, TRIN: 0.25, B_VOL: 0.25, CONC: 0.25, CREDIT: 0.5, DURATION: 0.25, HAVEN: 0.25 },
    _v4: 1, _v5: 1, _v6: 1, mixMethod: "BLEND", mixW: { SPDR: 40, HUBCMP: 20, MKTBOW: 20, TREE: 10, RANK: 10 } };
  const run = async (state) => { const Q = await openPage({ storage: { "alloc-module-v1": JSON.stringify(state), "alloc-picks": JSON.stringify(["NVDA"]) } });
    try { await Q.page.waitForFunction(() => window.AL7 && AL7.ready(), null, { timeout: 120000 }); await Q.page.waitForTimeout(400);
      const r = await Q.page.evaluate(() => ({ S: JSON.parse(JSON.stringify(S)), stored: JSON.parse(localStorage.getItem("alloc-module-v1")), picks: [...PICKS], per: pickMix(sleeveShares(), investedAt(heat())).perName, conv: allocation().convEq, mixtop: document.getElementById("mixtop").innerText, book: allocation().conviction.rows.map((r) => [r.sym, r.size, r.how]), hand: (() => { let n = 0, d = 0; for (const v of voters()) { if (!canVote(v)) continue; const w = S.wts[v.key] ?? 0; n += v.val * w; d += w; } return d ? n / d : 0; })(), heat: heat() }));
      assert.deepEqual(Q.errors, []); assert.equal(Q.nonGet.blocked, 0); return r; } finally { await Q.close(); } };
  const a = await run(saved);
  assert.equal(a.S.wts.BREADTH_X, 0.75, "the weight he gave the S&P pair moves to the row that reads every pair"); assert.equal(a.S.wts.BREADTH_EW, 0); assert.equal(a.S.wts.PCC, 0.25, "the put/call takes a weight");
  for (const [k, v] of Object.entries(saved.wts)) if (!["BREADTH_EW", "PCC"].includes(k)) assert.equal(a.S.wts[k], v, k + " is as he left it");
  assert.equal(a.S.wts.B_200D, 0.25); assert.equal(a.S.wts.B_50D, 0.25);
  for (const k of ["vixCold", "tenCold", "maxInv", "minInv", "invCold", "invMid", "invHot", "maxTotal", "maxNames", "concLean", "divAuto", "nPer", "lcTilt"]) assert.equal(a.S[k], saved[k], k + " is as he left it");
  assert.deepEqual(a.S.mixW, saved.mixW, "his blend weights are untouched"); assert.equal(a.S._v7, 1); assert.equal(a.stored._v7, 1, "and it is saved, so it happens once");
  assert.deepEqual([a.S.maxSleeves, a.S.minSleeve, a.S.convShare, a.S.coreIndexShare], [6, 4, 20, 50], "the four new dials start at their proposals");
  /* AL8 (7 Oct): there is no conviction part to hold any more. His picked name is still kept and is on the conviction list; it takes no
     money until he gives it a size, and the page says so. The two settings this brief adds start empty / at their proposals. */
  assert.deepEqual(a.picks, ["NVDA"], "his picked name is kept"); const nv = a.book.find((r) => r[0] === "NVDA");
  assert.ok(nv && nv[1] === 0 && nv[2] === "none" && a.per.NVDA === 0, "it is on the conviction list, with no size yet"); assert.ok(/kept without a size: NVDA/.test(a.mixtop), a.mixtop.slice(-200));
  assert.deepEqual(a.S.sizes, {}, "no size is invented for him"); assert.deepEqual(a.S.rankW, { growth: 50, regime: 25, opportunity: 25 }, "the ranking's weights start at their proposals");
  assert.ok(Math.abs(a.heat - a.hand) < 1e-12, "the heat is the weighted average of his weights");
  /* a second visit: he has since muted the put/call and the every-pair row — nothing puts them back */
  const b = await run({ ...a.stored, wts: { ...a.stored.wts, PCC: 0, BREADTH_X: 0 } });
  assert.equal(b.S.wts.PCC, 0, "a weight he sets after the change is his"); assert.equal(b.S.wts.BREADTH_X, 0); assert.equal(b.S.wts.BREADTH_EW, 0); assert.equal(b.S.wts.SPY, 0.75);
});

test("close", async () => { if (P) await P.close(); });
