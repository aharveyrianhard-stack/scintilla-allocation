/* AL8 tests (7 Oct 2026) — the allocation tool: "how much to invest" split from "where it goes", and the decision cards where the picks
   are made.
   1 THE AUDIT: every input in INPUT_AUDIT is moved in the headless page and the page is held to what the table says it moves — the %
     invested, the mix, the names, the gap, or nothing; INPUTS is laid out from the same table; the sector-compare weights' one way into
     the % is measured. 2 THE MONEY PICTURE: one bar per market, the invested part split by the page's own conviction rule, marked
     PLACEHOLDER while the rows come from the placeholder file, and reading the deployment engine's own file when it is there (the seam).
     3 CONVICTION BY NAME and 4 SLEEVES IN RANK ORDER: the rule that replaced the fixed shape of 6 Oct. 5 THE PICKS READ THE DECISION
     CARDS, laid over the feed field by field. 6 MICRON'S LADDER is its three confluence zones with their named members. 7 no internal
     code is on the page; nothing scrolls sideways on a phone; a device with saved dials keeps them.
   Headless, against the local stand-in for Vercel; no write leaves the page. node --test tests/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"; import path from "node:path";
import { openPage, startServer, chromium, ROOT } from "./_harness.mjs";

let P, s;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const CARDS = J("decision-cards-20261006.json"), ZONES = J("confluence-zones-20261006.json"), APPROVED = J("approved-names-20261007.json"), DEPLOY = J("deployment-scenarios.json");
/* the same place rule as the page's, written again here: first = 1, last = 0, equal answers share the middle of their places */
function placesJS(vals) { const have = vals.map((v, i) => [v, i]).filter(([v]) => v != null && isFinite(v)).sort((a, b) => b[0] - a[0]), n = have.length, out = vals.map(() => null);
  for (let i = 0; i < n;) { let j = i; while (j < n && have[j][0] === have[i][0]) j++; const mid = (i + j - 1) / 2, p = n > 1 ? 1 - mid / (n - 1) : 1; for (let k = i; k < j; k++) out[have[k][1]] = p; i = j; } return out; }
/* a page with one extra rule about what the two scenario files answer (the harness's own page has none): every non-GET is still blocked */
async function openWith(routes, { width = 1680, height = 1050 } = {}) {
  const srv = await startServer(); const browser = await chromium.launch({ headless: true }); const context = await browser.newContext({ viewport: { width, height } }); const page = await context.newPage();
  const errors = [], nonGet = { blocked: 0 }; page.on("pageerror", (e) => errors.push(String(e)));
  await page.route("**/*", (r) => { if (r.request().method() !== "GET") { nonGet.blocked++; return r.abort(); } for (const [re, answer] of routes) if (re.test(r.request().url())) return answer === 404 ? r.fulfill({ status: 404, body: "" }) : r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(answer) }); r.continue(); });
  await page.goto(srv.url, { waitUntil: "networkidle", timeout: 180000 }); await page.waitForTimeout(2500);
  return { page, errors, nonGet, close: async () => { await browser.close(); srv.server.close(); } };
}

test("the page loads with the cards, the zones, the approved names and the scenario rows read; nothing is written", async () => {
  P = await openPage();
  await P.page.waitForFunction(() => window.AL8 && AL8.ready(), null, { timeout: 120000 }); await P.page.waitForTimeout(700);
  s = await P.page.evaluate(() => {
    const R = AL8.readout(), A = allocation();
    return { R, audit: AL8.audit(), spine: Object.fromEntries(Object.entries(SPINE).map(([k, v]) => [k, v.mode])), spineNote: Object.fromEntries(["decision_cards", "confluence_zones", "deployment_scenarios", "sleeve_growth", "comps-feed"].map((k) => [k, SPINE[k] && SPINE[k].note])),
      ladder: investedNow(), rung: policyStep(heat()), heat: heat(), mu: { price: (QUOTES.MU && QUOTES.MU.price) || null, row: COMPS.MU && { rev_growth: COMPS.MU.rev_growth, fwd_pe: COMPS.MU.fwd_pe, pe: COMPS.MU.pe, ps: COMPS.MU.ps, card: COMPS.MU.card, feed: COMPS.MU.feed } },
      sections: [...document.querySelectorAll(".grid > .panel")].map((p) => p.id), bar: document.getElementById("secbar").innerText,
      cands: A.cands.map((o) => ({ key: o.key, score: o.score, kind: o.kind, cold: o.cold, turn: o.turn, growth: o.growth, pGrowth: o.pGrowth, pRegime: o.pRegime, pOpp: o.pOpp, rankScore: o.rankScore, tree: o.tree })) };
  });
  assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked, 0, "nothing is written"); assert.equal(P.nonGet.allowed, 0);
  assert.equal(s.R.cards.n, Object.keys(CARDS.cards).length); assert.equal(s.R.cards.as_of, CARDS.as_of.card_date); assert.equal(s.R.zones.n, Object.keys(ZONES.names).length); assert.deepEqual(s.R.approved, Object.keys(APPROVED.names));
  assert.equal(s.R.deploy.n, DEPLOY.scenarios.length); assert.equal(s.R.growthRead, true, "every sleeve's companies' expected growth was read");
  for (const k of ["decision_cards", "confluence_zones", "sleeve_growth"]) assert.equal(s.spine[k], "LIVE", k);
  assert.equal(s.sections[0], "p-scen", "the money picture is the first section"); assert.ok(/^THE MONEY/.test(s.bar.trim()));
});

/* ------------------------------------------------------------------ 1 · THE AUDIT */
test("1 · the audit covers every control: each dial, toggle and button in INPUTS is one of its rows, and sits in the section its row says", async () => {
  const r = await P.page.evaluate(() => { const box = document.getElementById("p-inputs"), sec = (el) => { const x = el.closest("#in-howmuch, #in-where, #in-here, #in-remove"); return x ? x.id : null; };
    return { controls: [...box.querySelectorAll("input, button, select")].filter((e) => !e.classList.contains("pfold")).map((e) => [e.id, sec(e)]), heatPanel: [...document.querySelectorAll("#p-heat input[type=range]")].filter((e) => e.id).map((e) => e.id),
      sumText: document.getElementById("inaudit").innerText.replace(/\s+/g, " "), removeN: document.getElementById("in-remove-n").innerText, stored: [...document.querySelectorAll("#in-stored .a8-st b")].map((b) => b.innerText), removeOpen: document.getElementById("in-remove").open,
      titles: [...document.querySelectorAll("#p-inputs .a8-sec > h3")].map((h) => h.innerText.replace(/\s+/g, " ")), axisControl: !!document.querySelector('[onclick*="setAxis"]') }; });
  const A = s.audit, where = { pct: "in-howmuch", mix: "in-where", names: "in-where", gap: "in-here", none: "in-remove" }, byKey = {};
  for (const x of A) for (const k of x.keys || []) byKey[k] = x;
  for (const [id, sec] of r.controls) { assert.ok(id, "every control in INPUTS has an id"); const x = byKey[id]; assert.ok(x, id + " is a row of the audit"); assert.equal(sec, where[x.moves], id + " moves " + x.moves + ", so it sits in " + where[x.moves]); }
  for (const x of A) for (const k of x.keys || []) if (where[x.moves]) assert.ok(r.controls.some(([id]) => id === k), k + " (" + x.id + ") is a control in INPUTS");
  assert.deepEqual(r.heatPanel, [], "the two endpoint dials left the heat panel for HOW MUCH TO INVEST; a voter's weight slider carries no id");
  assert.ok(/^HOW MUCH TO INVEST/.test(r.titles[0]) && /only these move the % invested/.test(r.titles[0])); assert.ok(/^WHERE IT GOES — SECTOR COMPARE/.test(r.titles[1]) && /not the %/.test(r.titles[1])); assert.ok(/^WHERE YOU ARE/.test(r.titles[2]));
  const n = (m) => A.filter((x) => x.moves === m && !x.nocontrol).length;
  assert.ok(new RegExp("^" + n("pct") + " ?move the % invested " + (n("mix") + n("names")) + " ?move where it goes " + n("gap") + " ?says where you are " + n("none") + " ?change nothing$").test(r.sumText), r.sumText);
  const none = A.filter((x) => x.moves === "none"); assert.equal(r.removeN, none.filter((x) => x.keys).length + " dials and " + none.filter((x) => !x.keys).reduce((t, x) => t + x.store.length, 0) + " stored settings");
  assert.equal(r.removeOpen, false, "listed for removal, folded — and not removed: " + none.filter((x) => x.keys).map((x) => x.keys[0]).join(", "));
  assert.equal(r.stored.length, none.filter((x) => !x.keys).length + A.filter((x) => x.nocontrol).length, "the stored settings with no control are listed by name");
  assert.equal(r.axisControl, false, "nothing on the page sets the sector / cohort switch — it is a stored setting with no control");
});

test("1 · what moves the %: the ladder's five rungs, the voters' weights and the two endpoint dials — and nothing in the other sections", async () => {
  const r = await P.page.evaluate(() => { const keep = structuredClone(S), out = { ladder: {}, ends: {}, wts: [] };
    const put = () => { render(); return AL8.probe(); }, back = () => { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, structuredClone(keep)); render(); };
    const base = put(); out.base = base; out.is = investedNow() === investedAt(heat());
    /* each rung's dial moves the % on its own rung */
    for (const [key, h] of [["maxInv", -0.7], ["invCold", -0.3], ["invMid", 0], ["invHot", 0.3], ["minInv", 0.7]]) { const was = investedAt(h); S[key] = S[key] === 35 ? 45 : 35; out.ladder[key] = [was, investedAt(h), policyStep(h).pct]; back(); }
    /* today's own rung, through the page */
    const mine = { "DEEP OVERSOLD": "maxInv", OVERSOLD: "invCold", NEUTRAL: "invMid", OVERBOUGHT: "invHot", "DEEP OVERBOUGHT": "minInv" }[policyStep(heat()).cond]; S[mine] = S[mine] === 35 ? 45 : 35; out.today = [mine, put().pct, document.getElementById("heatlabel").innerText]; back();
    /* the two endpoints move their voter's reading, and so the heat */
    for (const [key, lo, hi] of [["vixCold", 20, 50], ["tenCold", 4, 6]]) { S[key] = lo; const a = put().heat; S[key] = hi; const b = put().heat; out.ends[key] = [a, b]; back(); }
    /* every voting row's weight moves the heat */
    for (const v of voters()) { if (!canVote(v)) continue; const w = S.wts[v.key] ?? 0; S.wts[v.key] = w > 0 ? 0 : 1; out.wts.push([v.key, base.heat, put().heat, v.val]); back(); }
    out.after = AL8.probe(); return out; });
  assert.ok(r.is, "how much is invested is the ladder read at the heat — one seat");
  for (const [k, [was, now, step]] of Object.entries(r.ladder)) { assert.notEqual(was, now, k + " moves the % on its own rung"); assert.ok(near(now * 100, step, 1e-9)); }
  assert.notEqual(r.today[1], r.base.pct, "today's rung (" + r.today[0] + ") moves today's % invested");
  for (const [k, [a, b]] of Object.entries(r.ends)) assert.ok(Math.abs(a - b) > 1e-6, k + " moves the heat: " + a + " → " + b);
  const moved = r.wts.filter(([k, a, b, val]) => Math.abs(a - b) > 1e-9); assert.ok(r.wts.length >= 15, r.wts.length + " voting rows");
  for (const [k, a, b, val] of r.wts) assert.ok(Math.abs(a - b) > 1e-9 || Math.abs(val - a) < 5e-4, k + " moves the heat when its weight is flipped (unless it reads the heat itself): " + a + " → " + b);
  assert.ok(moved.length >= r.wts.length - 1);
  assert.deepEqual(r.after, r.base, "every dial is put back");
});

test("1 · what moves where it goes, and never the %: the ranking's weights, the smallest sleeve, a name's own size; the names dials move the names only; where you are moves the gap only", async () => {
  const r = await P.page.evaluate(() => { const keep = structuredClone(S), picks = new Set(PICKS), ko = KO_COHORT, out = {};
    const put = () => { render(); return AL8.probe(); }, back = () => { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, structuredClone(keep)); PICKS.clear(); for (const x of picks) PICKS.add(x); KO_COHORT = ko; render(); };
    const sweep = (sets) => { const seen = []; for (const f of sets) { f(); seen.push(put()); back(); } return seen; };
    out.base = put();
    out.rankW = sweep([() => (S.rankW = { growth: 100, regime: 0, opportunity: 0 }), () => (S.rankW = { growth: 0, regime: 100, opportunity: 0 }), () => (S.rankW = { growth: 0, regime: 0, opportunity: 100 })]);
    out.minSleeve = sweep([() => (S.minSleeve = 2), () => (S.minSleeve = 10)]);
    out.sizes = sweep([() => (S.sizes = { MU: 5 }), () => (S.sizes = { MU: 35 })]);
    out.mixW = sweep([() => (S.mixW = { SPDR: 100, HUBCMP: 0, MKTBOW: 0, TREE: 0, RANK: 0 }), () => (S.mixW = { SPDR: 0, HUBCMP: 0, MKTBOW: 0, TREE: 100, RANK: 0 })]);
    out.divAuto = sweep([() => { S.divAuto = 0; S.nPer = 1; }, () => { S.divAuto = 0; S.nPer = 5; }]);
    out.nPer = out.divAuto;
    out.maxNames = sweep([() => (S.maxNames = 1), () => (S.maxNames = 8)]);
    out.concLean = sweep([() => (S.concLean = -1), () => (S.concLean = 1)]);
    out.maxTotal = sweep([() => (S.maxTotal = 2), () => (S.maxTotal = 24)]);
    out.cap = (() => { setFold("p-comps", false); const free = [...document.querySelectorAll("#comps .compick")].map((b) => b.getAttribute("data-sym")).find((t) => !PICKS.has(t)); if (!free) { setFold("p-comps", true); return null; }
      S.maxTotal = PICKS.size; render(); const before = PICKS.size; [...document.querySelectorAll("#comps .compick")].find((b) => b.getAttribute("data-sym") === free).click(); const got = [before, PICKS.size, document.getElementById("pickNote").textContent]; back(); setFold("p-comps", true); return got; })();
    const other = cohortBoard().map((c) => c.key).find((k) => k !== ko && (knockout(k) || {}).podium && knockout(k).podium.length);
    out.koCohort = other ? sweep([() => (KO_COHORT = other)]) : null;
    out.picks = sweep([() => PICKS.add("ZZ_TEST_NAME")]);
    out.curInv = sweep([() => (S.curInv = 0), () => (S.curInv = 90)]);
    out.after = AL8.probe(); return out; });
  const B = r.base, same = (a, b, what) => assert.equal(a, b, what);
  for (const k of ["rankW", "minSleeve", "sizes"]) { for (const x of r[k]) { same(x.pct, B.pct, k + " never moves the % invested"); same(x.heat, B.heat, k + " never moves the heat"); same(x.names, B.names, k + " never moves the names"); } assert.ok(r[k].some((x) => x.mix !== B.mix), k + " moves the mix"); }
  for (const x of r.mixW) same(x.pct, B.pct, "the blend weights do not move today's rung"); assert.ok(r.mixW.some((x) => x.mix !== B.mix), "the blend weights move the mix"); assert.ok(r.mixW.some((x) => x.heat !== B.heat), "…and the heat, through the sectors voter: the one way they reach the %");
  for (const k of ["divAuto", "maxNames", "concLean", "maxTotal"].concat(r.koCohort ? ["koCohort"] : [])) { for (const x of r[k]) { same(x.pct, B.pct, k + " never moves the % invested"); same(x.mix, B.mix, k + " never moves the mix"); } assert.ok(r[k].some((x) => x.names !== B.names), k + " moves the names"); }
  if (r.cap) assert.ok(r.cap[0] === r.cap[1] && /cap reached/i.test(r.cap[2]), "at the limit the comps sheet takes no more picks: " + r.cap[2]);
  for (const x of r.picks) { same(x.pct, B.pct, "keeping a name never moves the % invested"); assert.notEqual(x.names, B.names, "keeping a name moves the names"); }
  for (const x of r.curInv) { same(x.pct, B.pct, "where you are never moves the target"); same(x.mix, B.mix); same(x.names, B.names); } assert.notEqual(r.curInv[0].gap, r.curInv[1].gap, "where you are moves the gap");
  assert.deepEqual(r.after, B, "every dial is put back");
});

test("1 · what moves nothing: the five dials and six stored settings listed for removal are swept end to end and the page does not change", async () => {
  const r = await P.page.evaluate(() => { const keep = structuredClone(S), out = {};
    const snap = () => { render(); return JSON.stringify([AL8.probe(), ["p-scen", "p-brief", "p-howmuch", "p-bowtie", "p-money", "p-cohorts", "p-knockout", "p-mix", "p-moves"].map((id) => document.getElementById(id).innerText)]); };
    const back = () => { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, structuredClone(keep)); render(); };
    const base = snap();
    const sweeps = { convShare: [0, 40], coreIndexShare: [0, 100], maxSleeves: [5, 7], lcTilt: [0.05, 0.3], nLC: [1, 9], nSC: [1, 9], dTrend: [0, 1], dRsi: [0, 1], dTf: [0, 1], mixMethod: ["SPDR", "TREE"] };
    for (const [k, vals] of Object.entries(sweeps)) out[k] = vals.map((v) => { S[k] = v; const x = snap(); back(); return x === base; });
    { S.curInv = 40; S.curLC = 0; const a = snap(); S.curLC = 40; const b = snap(); back(); out.curLC = [a === b, a !== base]; }   /* with 40% held, none of it or all of it in large caps: the page reads the same */
    out.traceMoves = (() => { const t0 = document.getElementById("trace").textContent; S.lcTilt = 0.3; render(); const t1 = document.getElementById("trace").textContent; back(); return t0 !== t1; })();
    out.sliders = Object.fromEntries(["convShare", "coreIndexShare", "maxSleeves", "curLC", "lcTilt"].map((id) => { const e = document.getElementById(id); return [id, [!!e, e && e.type, e && !e.disabled, document.getElementById(id + "V").textContent]]; }));
    out.stillStored = (() => { const e = document.getElementById("convShare"); e.value = 35; e.dispatchEvent(new Event("input", { bubbles: true })); const v = [S.convShare, JSON.parse(localStorage.getItem("alloc-module-v1")).convShare]; back(); save(); return v; })();
    out.same = snap() === base; return out; });
  const none = s.audit.filter((x) => x.moves === "none"); const stores = none.flatMap((x) => x.store);
  assert.deepEqual(stores.sort(), ["convShare", "coreIndexShare", "curLC", "dRsi", "dTf", "dTrend", "lcTilt", "maxSleeves", "mixMethod", "nLC", "nSC"]);
  for (const k of stores) assert.deepEqual(r[k], [true, true], k + (k === "curLC" ? ": with 40% held, the page reads the same with none or all of it in large caps (and differs from holding nothing — so the comparison is a real one)" : ": the whole page reads the same at both ends"));
  assert.equal(r.traceMoves, true, "the heat tilt still moves one line of the audit trace, as its row says — and nothing a reader acts on");
  for (const [id, [there, type, live, word]] of Object.entries(r.sliders)) { assert.ok(there && type === "range" && live, id + " is still a working slider — listed, not removed"); assert.equal(word, "unused"); }
  assert.deepEqual(r.stillStored, [35, 35], "a listed dial still slides and is still stored");
  assert.ok(r.same, "every dial is put back");
});

test("1 · a stored setting with no control that is NOT nothing: the sector / cohort switch would change the mix, and the page lists it so it can be fixed", async () => {
  const r = await P.page.evaluate(() => { const a = AL8.probe(); AXIS = "cohort"; render(); const b = AL8.probe(); AXIS = "sector"; render(); const c = AL8.probe(); return { a, b, c, stored: localStorage.getItem("alloc-axis"), row: document.querySelector("#in-stored .a8-st.flag").textContent.replace(/\s+/g, " ") }; });   /* textContent: the list sits in a folded block */
  const x = s.audit.find((q) => q.id === "axis"); assert.ok(x.nocontrol && x.moves === "mix");
  assert.equal(r.a.pct, r.b.pct, "it never moves the % invested"); assert.notEqual(r.a.mix, r.b.mix, "ranking cohorts instead of sectors changes the mix"); assert.deepEqual(r.c, r.a);
  assert.ok(/Sectors or cohorts/.test(r.row) && /not nothing/.test(r.row), r.row);
});

test("1 · the one way the sector-compare weights reach the %, measured as it stands: the sectors voter's share of the vote, and how far the heat can move", async () => {
  const r = await P.page.evaluate(() => { const L = mixLeak(), keep = structuredClone(S.mixW), h0 = heat(); let lo = h0, hi = h0;
    for (const k of ["SPDR", "HUBCMP", "MKTBOW", "TREE", "RANK"]) for (const v of [0, 100]) { S.mixW = { ...keep, [k]: v }; const h = heat(); lo = Math.min(lo, h); hi = Math.max(hi, h); } S.mixW = keep; render();
    const B = voteBook(), sec = B.rows.find((x) => x.key === "SECTORS"); return { L, lo, hi, h0, share: sec.share, w: sec.w, W: B.W, text: document.getElementById("in-leak").innerText.replace(/\s+/g, " "), same: structuredClone(S.mixW) }; });
  assert.ok(near(r.L.lo, r.lo, 1e-12) && near(r.L.hi, r.hi, 1e-12) && near(r.L.heat, r.h0, 1e-12)); assert.ok(near(r.L.reach, Math.max(r.h0 - r.lo, r.hi - r.h0), 1e-12));
  assert.ok(near(r.share, r.w / r.W, 1e-12) && near(r.L.share, r.share, 1e-12), "the sectors row's share of the vote");
  assert.ok(r.text.includes(Math.round(r.share * 100) + "% of the vote") && r.text.includes(r.L.reach.toFixed(3)) && (r.L.rung ? /would change/.test(r.text) : new RegExp("the rung stays at " + r.L.pct + "%").test(r.text)), r.text);
  assert.deepEqual(r.same, { SPDR: 20, HUBCMP: 20, MKTBOW: 20, TREE: 20, RANK: 20 }, "measuring it changes no weight");
});

test("1 · step 9 prints the table: one row per input with the one thing it moves", async () => {
  const r = await P.page.evaluate(() => { setFold("p-map", false); const rows = [...document.querySelectorAll("#auditmap table.a8-audit tr")].slice(1).map((tr) => ({ id: tr.getAttribute("data-id"), moves: tr.getAttribute("data-moves"), tag: tr.querySelector(".a8-mv").innerText, also: (tr.querySelector(".a8-mv.also") || {}).innerText || null, cells: tr.children.length, how: tr.children[5].innerText })); setFold("p-map", true); return { rows, cap: document.querySelector("#auditmap .a7-cap").innerText }; });
  const WORD = { pct: "THE % INVESTED", mix: "THE MIX", names: "THE NAMES", gap: "THE GAP ONLY", view: "WHAT IS DRAWN", none: "NOTHING" };
  assert.equal(r.rows.length, s.audit.length); assert.ok(r.cap.includes(s.audit.length + " inputs"));
  for (const x of s.audit) { const row = r.rows.find((q) => q.id === x.id); assert.ok(row, x.id); assert.equal(row.moves, x.moves); assert.equal(row.tag, WORD[x.moves]); assert.equal(row.cells, 6); assert.ok(row.how.length > 8, x.id + " says how"); if (x.also) assert.equal(row.also, "and " + WORD[x.also].toLowerCase()); }
});

/* ------------------------------------------------------------------ 2 · THE MONEY PICTURE */
test("2 · the money picture: one bar per market — today, the S&P down 1.5%, VIX 20, VIX 23.5, a panic — each the whole account as cash · core · conviction", async () => {
  const r = await P.page.evaluate(() => { const el = document.getElementById("scenbars");
    return { rows: [...el.querySelectorAll(".a8-scen")].map((d) => ({ key: d.getAttribute("data-key"), title: d.querySelector(".who b").innerText, sub: d.querySelector(".who small").innerText, inv: d.querySelector(".inv b").innerText, segs: [...d.querySelectorAll(".a7-mix > div")].map((x) => [x.className, parseFloat(x.style.flex), x.title]), ref: parseFloat(d.querySelector(".ref").style.left), facts: d.querySelector(".facts").innerText, aria: d.querySelector(".a7-mix").getAttribute("aria-label") })),
      ph: el.querySelectorAll(".a8-ph").length, cap: el.querySelector(".a7-cap").innerText.replace(/\s+/g, " "), leg: el.querySelector(".a7-leg").innerText.replace(/\s+/g, " "), phClass: el.querySelector(".a8-scens").classList.contains("ph"),
      table: (() => { const d = el.querySelector("details.a8-num"); d.open = true; const t = [...d.querySelectorAll("tr")].map((tr) => [...tr.children].map((td) => td.innerText.replace(/\s+/g, " "))); d.open = false; return t; })(),
      folded: document.getElementById("p-scen").classList.contains("folded"), top: document.getElementById("p-scen").getBoundingClientRect().top, briefTop: document.getElementById("p-brief").getBoundingClientRect().top, h: document.getElementById("p-scen").getBoundingClientRect().height }; });
  assert.deepEqual(r.rows.map((x) => x.key), ["today", "a", "b", "c", "d"]); assert.deepEqual(r.rows.map((x) => x.title), ["TODAY", "S&P DIPS 1.5%", "VIX 20", "VIX 23.5", "PANIC"]);
  const ap = APPROVED.names.MU, pc = (x) => (x * 100).toFixed(x * 100 < 9.95 ? 1 : 0) + "%";
  r.rows.forEach((x, i) => { const f = DEPLOY.scenarios[i], inv = f.pct / 100, mu = Math.min(ap.of_invested * inv, ap.ceiling_pct / 100);
    assert.equal(x.inv, pc(inv), x.title + " invested is the file's number");
    const cash = x.segs.find((q) => q[0] === "cash"), core = x.segs.find((q) => q[0] === "core"), conv = x.segs.filter((q) => q[0] === "conv");
    assert.ok(near(cash[1], 1 - inv, 1e-4) && near(core[1], inv - mu, 1e-4) && conv.length === 1 && near(conv[0][1], mu, 1e-4), x.title + ": cash " + cash[1] + " core " + core[1] + " Micron " + conv[0][1]);
    assert.ok(near(x.segs.reduce((t, q) => t + q[1], 0), 1, 1e-3), x.title + " is the whole account"); assert.deepEqual(x.segs.map((q) => q[0]), ["cash", "core", "conv"], "cash, then core, then conviction");
    assert.ok(/^Micron/.test(conv[0][2]), "the conviction segment names Micron: " + conv[0][2]);
    assert.ok(near(mu * 100, f.money.micron, 0.051), x.title + ": the page's Micron (" + (mu * 100).toFixed(2) + ") is the study's own (" + f.money.micron + ") — one rule"); assert.ok(!/the study's own Micron figure/.test(x.facts));
    assert.ok(near(x.ref, (1 - s.ladder) * 100, 0.02), "the dashed line stands where the ladder's cash ends: " + x.ref);
    assert.ok(new RegExp("RSI " + Math.round(f.rsi)).test(x.facts) && new RegExp("VIX " + f.vix.toFixed(1)).test(x.facts), x.facts);
    assert.ok(mu >= ap.ceiling_pct / 100 - 1e-9 ? /at its 30% ceiling/.test(x.facts) : mu >= ap.full_build_pct / 100 - 1e-9 ? /room for Micron's full 20% build/.test(x.facts) : /short of its 20% full build/.test(x.facts), x.facts); });
  assert.equal(r.table.length, 6); assert.deepEqual(r.table[0], ["MARKET", "INVESTED", "CASH", "CORE", "CONVICTION", "THE READING"]); r.rows.forEach((x, i) => { assert.equal(r.table[i + 1][1], x.inv); assert.ok(r.table[i + 1][4].startsWith("Micron ")); });
  assert.ok(new RegExp("the ladder: " + Math.round(s.ladder * 100) + "% invested").test(r.leg) && /cash/.test(r.leg) && /core/.test(r.leg) && /conviction — Micron/.test(r.leg), r.leg);
  assert.equal(r.folded, false, "open on the first screen"); assert.ok(r.top < r.briefTop && r.top + r.h < 1050, "above THE BRIEF, inside the first screen: " + r.top + " + " + r.h);
});

test("2 · the numbers are labelled PLACEHOLDER while they come from the placeholder file — on the panel, in the sources line, and nothing below the panel uses them", async () => {
  const r = await P.page.evaluate(() => ({ ph: document.querySelectorAll("#scenbars .a8-ph").length, phText: (document.querySelector("#scenbars .a8-ph") || {}).innerText, cap: document.querySelector("#scenbars .a7-cap").innerText.replace(/\s+/g, " "),
    A: allocation().inv, brief: document.querySelector("#brief .a7-lead").innerText, src: DEPLOY.src, status: DEPLOY.status }));
  assert.equal(DEPLOY.status, "placeholder", "the file kept with the page says what it is"); assert.equal(r.status, "placeholder"); assert.equal(r.src, "data/deployment-scenarios.json");
  assert.equal(r.ph, 1); assert.equal(r.phText, "PLACEHOLDER"); assert.ok(/PLACEHOLDER/.test(r.cap) && /not reviewed, not wired/.test(r.cap), r.cap);
  assert.equal(s.spine.deployment_scenarios, "STALE"); assert.ok(/PLACEHOLDERS/.test(s.spineNote.deployment_scenarios), s.spineNote.deployment_scenarios);
  assert.equal(r.A, s.ladder, "step 3b is still sized on the ladder's number, not on a placeholder"); assert.ok(r.brief.includes(Math.round(s.ladder * 100) + "% invested"), r.brief);
});

test("2 · the seam: when the deployment engine's own file sits beside the page the same bars read it and the word PLACEHOLDER goes; with no file at all the panel shows the ladder alone", async () => {
  /* the engine's file in its own shape (study/dm1/data/dm1.json): scenarios with key, name, rsi, vix, vixPct, pct, line, money — and no status */
  const engine = { built_utc: "2026-10-08T21:30:00.000Z", today: { date: "2026-10-08" }, model: { ignored: true }, scenarios: [
    { key: "today", name: "8 Oct close, as it stands", spy: 770, rsi: 55, vix: 17.2, vixPct: 48, pct: 41, line: 39.5, money: { invested: 41, cash: 59, conviction: 8.2, micron: 16.4, core: 24.6 }, reasons: ["…"] },
    { key: "a", name: "(a) SPY −1.5%", spy: 758.4, rsi: 47, vix: 17.2, vixPct: 48, pct: 36, line: null, money: { micron: 14.4 } },
    { key: "b", name: "(b) SPY −3% with VIX 20", spy: 746.9, rsi: 40, vix: 20, vixPct: 80.9, pct: 52.5, line: null, money: { micron: 21 } },
    { key: "c", name: "(c) SPY −5% with VIX 23.5", spy: 731.5, rsi: 32, vix: 23.5, vixPct: 89.6, pct: 90, line: null, money: { micron: 30 } },
    { key: "d", name: "(d) panic: RSI under 35, VIX in its top 5%", spy: null, rsi: 31, vix: 27, vixPct: 97, pct: 80, line: null, money: { micron: 25 } }] };   /* the last row's own Micron figure disagrees with the page's rule on purpose */
  const Q = await openWith([[/\/study\/dm1\/data\/dm1\.json/, engine]]);
  try { const r = await Q.page.evaluate(() => ({ status: DEPLOY.status, src: DEPLOY.src, built: DEPLOY.built, spine: SPINE.deployment_scenarios.mode, ph: document.querySelectorAll("#scenbars .a8-ph").length, cap: document.querySelector("#scenbars .a7-cap").innerText.replace(/\s+/g, " "), inv: [...document.querySelectorAll("#scenbars .a8-scen .inv b")].map((b) => b.innerText), conv: [...document.querySelectorAll("#scenbars .a8-scen .conv")].map((d) => parseFloat(d.style.flex)), facts: [...document.querySelectorAll("#scenbars .a8-scen .facts")].map((d) => d.innerText), ladder: investedNow(), A: allocation().inv }));
    assert.deepEqual(Q.errors, []); assert.equal(Q.nonGet.blocked, 0);
    assert.equal(r.status, "engine"); assert.equal(r.src, "study/dm1/data/dm1.json", "the engine's own file wins over the placeholder file"); assert.equal(r.spine, "LIVE");
    assert.equal(r.ph, 0, "no PLACEHOLDER tag"); assert.ok(/deployment engine's/.test(r.cap) && !/PLACEHOLDER/.test(r.cap) && /8 Oct/.test(r.cap), r.cap);
    assert.deepEqual(r.inv, ["41%", "36%", "53%", "90%", "80%"], "the bars are the engine's numbers");
    for (const [i, pct] of [41, 36, 52.5, 90, 80].entries()) assert.ok(near(r.conv[i], Math.min(0.4 * pct / 100, 0.30), 1e-4), "Micron is still the page's one rule in row " + i);
    assert.ok(/the study's own Micron figure for this row is 25%/.test(r.facts[4]) && !/own Micron figure/.test(r.facts[0]), "a row whose own Micron figure differs from the page's rule says so: " + r.facts[4]);
    assert.equal(r.A, r.ladder, "and step 3b still reads the one seat that says how much — today the ladder");
  } finally { await Q.close(); }
  const N = await openWith([[/\/study\/dm1\/data\/dm1\.json/, 404], [/\/data\/deployment-scenarios\.json/, 404]]);
  try { const r = await N.page.evaluate(() => ({ deploy: DEPLOY, spine: SPINE.deployment_scenarios.mode, rows: document.querySelectorAll("#scenbars .a8-scen").length, text: document.getElementById("scenbars").innerText.replace(/\s+/g, " "), bar: document.querySelectorAll("#scenbars .a7-mix").length, ladder: investedNow() }));
    assert.deepEqual(N.errors, [], "a missing file is not an error"); assert.equal(r.deploy, null); assert.equal(r.spine, "FALLBACK"); assert.equal(r.rows, 0);
    assert.ok(/no scenario file could be read/.test(r.text) && r.text.includes("the ladder: " + Math.round(r.ladder * 100) + "% invested") && r.bar === 1, r.text.slice(0, 200));
  } finally { await N.close(); }
});

test("2 · the reader of the engine's file takes what it needs and refuses what is not a scenario list", async () => {
  const r = await P.page.evaluate(() => ({ none: [deployIndex(null), deployIndex({}), deployIndex({ scenarios: [] }), deployIndex({ scenarios: [{ key: "x", pct: 140 }, { key: "y", pct: "abc" }] })],
    one: deployIndex({ built_utc: "t", scenarios: [{ key: "today", name: "n", pct: 33.4, money: { micron: 13.36 } }, { key: "bad", pct: -3 }] }, "u"), ph: deployIndex({ status: "placeholder", scenarios: [{ key: "a", pct: 10 }] }, "f").status }));
  assert.deepEqual(r.none, [null, null, null, null]); assert.equal(r.one.rows.length, 1, "a row outside 0–100 is left out"); assert.equal(r.one.status, "engine"); assert.equal(r.one.rows[0].engineMicron, 13.36); assert.equal(r.one.src, "u"); assert.equal(r.ph, "placeholder");
});

/* ------------------------------------------------------------------ 3 · CONVICTION BY NAME */
test("3 · conviction is each approved name at its own size — no share of what is invested: Micron by its rule, his own figure when he sets one, nothing for a kept name until he gives it a size", async () => {
  const r = await P.page.evaluate(() => { const keep = structuredClone(S.sizes), picks = new Set(PICKS), out = {};
    const back = () => { S.sizes = structuredClone(keep); PICKS.clear(); for (const x of picks) PICKS.add(x); render(); };
    out.rule = [0.15, 0.224, 0.334, 0.5, 0.75, 0.879, 1].map((inv) => { const B = convictionBook(inv); return [inv, B.total, B.rows.map((x) => [x.sym, x.size, x.how])]; });
    const A0 = allocation(); out.base = { inv: A0.inv, conv: A0.convEq, core: A0.coreEq, rows: A0.conviction.rows.map((x) => [x.sym, x.size, x.how]) };
    setSize("MU", 12); let A = allocation(); out.own = { conv: A.convEq, core: A.coreEq, how: A.conviction.rows.find((x) => x.sym === "MU").how, stored: JSON.parse(localStorage.getItem("alloc-module-v1")).sizes, input: document.querySelector('#picks input.a8-size[data-sym="MU"]').value, text: document.querySelector('#picks .a8-pick[data-sym="MU"] .szrow').innerText };
    setSize("MU", null); A = allocation(); out.backToRule = { conv: A.convEq, how: A.conviction.rows.find((x) => x.sym === "MU").how, input: document.querySelector('#picks input.a8-size[data-sym="MU"]').value, placeholder: document.querySelector('#picks input.a8-size[data-sym="MU"]').placeholder };
    PICKS.add("NVDA"); render(); A = allocation(); out.kept = { conv: A.convEq, row: A.conviction.rows.find((x) => x.sym === "NVDA"), text: document.querySelector('#picks .a8-pick[data-sym="NVDA"] .szrow').innerText, mixtop: document.getElementById("mixtop").innerText, segs: document.querySelectorAll("#mixtop .a7-mix .conv").length };
    setSize("NVDA", 10); A = allocation(); out.sized = { conv: A.convEq, core: A.coreEq, nv: A.conviction.rows.find((x) => x.sym === "NVDA").size, segs: document.querySelectorAll("#mixtop .a7-mix .conv").length };
    S.sizes = { MU: 40, NVDA: 30 }; render(); A = allocation(); out.tooMuch = { inv: A.inv, conv: A.convEq, core: A.coreEq, rows: A.conviction.rows.map((x) => [x.sym, x.size, !!x.cut]), scale: A.conviction.scale, text: document.getElementById("picks").innerText };
    back(); out.dialsDoNothing = (() => { const a = allocation().convEq; S.convShare = 0; render(); const b = allocation().convEq; S.convShare = 40; render(); const c = allocation().convEq; S.convShare = 20; render(); return [a, b, c]; })();
    out.after = allocation().conviction.rows.map((x) => [x.sym, x.size, x.how]); return out; });
  const ap = APPROVED.names.MU; assert.equal(ap.of_invested, 0.4); assert.equal(ap.ceiling_pct, 30); assert.equal(ap.full_build_pct, 20); assert.ok(/Alan/.test(ap.said) && ap.his_words.length > 10, "the rule is his, in his words, dated");
  for (const [inv, total, rows] of r.rule) { const want = Math.min(0.4 * inv, 0.30); assert.ok(near(total, want, 1e-12) && rows.length === 1 && rows[0][0] === "MU" && rows[0][2] === "rule", "at " + inv + " invested Micron is " + want + ": " + total); assert.ok(total <= inv); }
  assert.ok(near(r.rule[2][1], 0.1336, 1e-9) && near(r.rule[5][1], 0.30, 1e-12), "13.4% at 33.4% invested; the 30% ceiling at 87.9%");
  assert.ok(near(r.base.conv, Math.min(0.4 * r.base.inv, 0.30), 1e-12) && near(r.base.core, r.base.inv - r.base.conv, 1e-12), "the core is what is left");
  assert.ok(near(r.own.conv, 0.12, 1e-12) && r.own.how === "own" && near(r.own.core, r.base.inv - 0.12, 1e-12) && r.own.stored.MU === 12 && r.own.input === "12" && /your own figure/.test(r.own.text), "his own figure, typed on the name's row, stored: " + JSON.stringify(r.own));
  assert.ok(near(r.backToRule.conv, r.base.conv, 1e-12) && r.backToRule.how === "rule" && r.backToRule.input === "" && r.backToRule.placeholder === (r.base.conv * 100).toFixed(1), "cleared, it is the rule again");
  assert.ok(r.kept.row && r.kept.row.size === 0 && r.kept.row.how === "none" && near(r.kept.conv, r.base.conv, 1e-12), "a kept name takes no money until it has a size"); assert.ok(/no size yet/.test(r.kept.text) && /kept without a size: NVDA/.test(r.kept.mixtop)); assert.equal(r.kept.segs, 1);
  assert.ok(near(r.sized.nv, 0.10, 1e-12) && near(r.sized.conv, r.base.conv + 0.10, 1e-12) && near(r.sized.core, r.base.inv - r.base.conv - 0.10, 1e-12), "given a size, it takes that % of the account"); assert.equal(r.sized.segs, 2, "one conviction segment per sized name");
  assert.ok(near(r.tooMuch.conv, r.tooMuch.inv, 1e-12) && near(r.tooMuch.core, 0, 1e-12) && r.tooMuch.scale < 1, "the names together can never take more than is invested");
  const [mu, nv] = ["MU", "NVDA"].map((k) => r.tooMuch.rows.find((x) => x[0] === k)); assert.ok(mu[2] && nv[2] && near(mu[1] / nv[1], 40 / 30, 1e-9), "each cut in the same proportion, and marked"); assert.ok(/cut to fit what is invested/.test(r.tooMuch.text));
  assert.deepEqual(r.dialsDoNothing, [r.base.conv, r.base.conv, r.base.conv], "the old conviction-share dial moves nothing");
  assert.deepEqual(r.after, r.base.rows, "everything is put back");
});

test("3 · a name dropped in the knockout after it was approved takes no money; a drop from before the approval does not undo it", async () => {
  const r = await P.page.evaluate(() => { const keep = DECISIONS["MU|MU"]; const size = () => { A7_MEMO = null; return convictionBook(0.5).rows.find((x) => x.sym === "MU"); };
    DECISIONS["MU|MU"] = { off: true, reason: "test", set_at: "2026-10-08T12:00:00Z", saved: false }; const after = size();
    DECISIONS["MU|MU"] = { off: true, reason: "test", set_at: "2026-10-05T12:00:00Z", saved: false }; const before = size();
    if (keep) DECISIONS["MU|MU"] = keep; else delete DECISIONS["MU|MU"]; A7_MEMO = null; render(); return { after: [after.size, after.how], before: [before.size, before.how], now: size().how, asof: APPROVED.as_of }; });
  assert.deepEqual(r.after, [0, "dropped"]); assert.deepEqual(r.before, [0.2, "rule"], "approved on " + r.asof + ": an older drop does not undo it"); assert.equal(r.now, "rule");
});

/* ------------------------------------------------------------------ 4 · SLEEVES IN RANK ORDER */
test("4 · a place among the candidates: first 1, last 0, equal answers share the middle, no answer has no place", async () => {
  const r = await P.page.evaluate(() => { const run = (vals) => { const rows = vals.map((v) => ({ v })); const p = places(rows, (x) => x.v); return rows.map(p); };
    return [run([5, 3, 1]), run([2, 2, 2]), run([9, null, 4, 4, 1]), run([7]), run([null, undefined, NaN]), run([1.35, 1.35, 1.0, 0.85, 0.6, 0.6])]; });
  assert.deepEqual(r[0], [1, 0.5, 0]); assert.deepEqual(r[1], [0.5, 0.5, 0.5]); assert.deepEqual(r[2], [1, null, 0.5, 0.5, 0]); assert.deepEqual(r[3], [1]); assert.deepEqual(r[4], [null, null, null]);
  assert.deepEqual(r[5].map((x) => +x.toFixed(4)), [0.9, 0.9, 0.6, 0.4, 0.1, 0.1]);
});

test("4 · every candidate sleeve answers three questions — growth, regime fit, opportunity — each as its place among tonight's candidates; the score is the three places weighed, growth the most", () => {
  const C = s.cands, W = s.R.weights; assert.ok(C.length >= 14, C.length + " candidates: the eleven sectors, crypto, metals, oil and the tree's cohorts"); assert.ok(C.some((o) => o.tree) && C.some((o) => !o.tree));
  assert.deepEqual(W, { growth: 50, regime: 25, opportunity: 25 }); assert.ok(W.growth > W.regime && W.growth > W.opportunity, "growth carries the most");
  const TURN = { improve: 1.35, go: 1.0, buy: 0.85, avoid: 0.6 };
  for (const o of C) { assert.ok(near(o.cold, Math.max(0.05, (1 - o.score) / 2), 1e-12), o.key + " opportunity is how washed out its reading is"); assert.equal(o.turn, TURN[o.kind] ?? 1, o.key + " regime: improving, leading, pulling back, breaking down"); }
  const pG = placesJS(C.map((o) => o.growth)), pR = placesJS(C.map((o) => o.turn)), pO = placesJS(C.map((o) => o.cold));
  C.forEach((o, i) => { assert.ok((o.pGrowth == null && pG[i] == null) || near(o.pGrowth, pG[i], 1e-12), o.key + " growth place"); assert.ok(near(o.pRegime, pR[i], 1e-12), o.key + " regime place"); assert.ok(near(o.pOpp, pO[i], 1e-12), o.key + " opportunity place");
    assert.ok(near(o.rankScore, (W.growth * (o.pGrowth ?? 0.5) + W.regime * o.pRegime + W.opportunity * o.pOpp) / 100, 1e-12), o.key + " score"); });
  for (let i = 1; i < C.length; i++) assert.ok(C[i].rankScore <= C[i - 1].rankScore + 1e-12, "ranked best first");
  assert.ok(C.filter((o) => o.growth != null).length >= 14, "growth is read for the sleeves that have companies"); const m = C.find((o) => o.key === "METALS"); if (m) assert.equal(m.growth, null, "a metal has no sales: no growth reading, counted as the middle");
});

test("4 · a sleeve's growth is the middle expected sales growth of its companies, from the stored estimates; it needs three of them", async () => {
  const r = await P.page.evaluate(() => { const one = (k) => { const syms = branchSyms(k), vals = syms.map((t) => FWD[t]).filter((x) => x && x.says).map((x) => x.v).sort((a, b) => a - b), G = sleeveGrowth(k); return { k, n: vals.length, of: syms.length, med: vals.length ? (vals.length % 2 ? vals[vals.length >> 1] : (vals[(vals.length >> 1) - 1] + vals[vals.length >> 1]) / 2) : null, G }; };
    const keep = { ...FWD }; const tiny = (() => { const syms = branchSyms("TECH"); for (const t of syms.slice(2)) FWD[t] = null; const G = sleeveGrowth("TECH"); Object.assign(FWD, keep); return G; })();
    return { tech: one("TECH"), util: one("UTILITIES"), metals: sleeveGrowth("METALS"), tiny, note: SPINE.sleeve_growth.note }; });
  for (const x of [r.tech, r.util]) { assert.ok(x.n >= 3 && x.of >= x.n, x.k + ": " + x.n + " of " + x.of); assert.ok(near(x.G.v, x.med, 1e-12), x.k + " growth is the middle one"); assert.equal(x.G.n, x.n); assert.equal(x.G.why, null); }
  assert.equal(r.metals.v, null); assert.equal(r.metals.why, "a metal has no sales"); assert.equal(r.tiny.v, null, "two companies with an estimate say nothing"); assert.ok(/fewer than 3/.test(r.tiny.why));
  assert.ok(/companies carry a stored sales estimate/.test(r.note));
});

test("4 · funded in rank order, sized by score, with no cap on how many: the last is left out while any funded sleeve would be under the smallest allowed — and the core parks in each branch's parent fund", async () => {
  const r = await P.page.evaluate(() => { const keep = structuredClone(S), out = {};
    const shot = () => { render(); const A = allocation(), M = moneyRows(); return { inv: A.inv, core: A.coreEq, conv: A.convEq, index: A.indexEq, minEq: A.minEq, n: A.sleeves.length, cands: A.cands.length, sleeves: A.sleeves.map((x) => [x.key, x.equity, x.rankScore, x.rank]), order: A.cands.map((x) => [x.key, x.rankScore]), stop: M.stop, out: M.rows.filter((x) => !x.funded).map((x) => [x.key, x.why, x.whyFull, x.rank]) }; };
    const back = () => { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, structuredClone(keep)); render(); };
    out.base = shot();
    out.parked = allocation().sleeves.map((x) => [x.key, x.parked && x.parked.fund, viaOf(x.key)]); out.funds = { TECH: parentFund("TECH"), MEMORY_STORAGE: TREE && TREE.by.MEMORY_STORAGE ? parentFund("MEMORY_STORAGE") : null, METALS: parentFund("METALS"), INDEX: parentFund("INDEX") };
    S.minSleeve = 2; out.small = shot(); back();
    S.minSleeve = 2; S.invMid = 100; S.maxInv = 100; S.invCold = 100; S.invHot = 100; S.minInv = 100; S.sizes = { MU: 0 }; out.wide = shot(); back();
    S.minSleeve = 10; S.sizes = { MU: 45 }; out.none = shot(); out.noneBar = [...document.querySelectorAll("#mixtop .a7-mix > div")].map((d) => [d.className, d.title]); out.noneText = document.getElementById("mixtop").innerText; back();
    S.maxSleeves = 5; const a = shot().n; S.maxSleeves = 7; const b = shot().n; back(); out.capDial = [a, b];
    S.rankW = { growth: 100, regime: 0, opportunity: 0 }; render(); out.growthOnly = allocation().cands.map((x) => [x.key, x.growth, x.pGrowth, x.rankScore]); back();
    setFold("p-money", false); const rows = [...document.querySelectorAll("#moneysplit table.a8-rk3 tr")].slice(1).map((tr) => ({ cls: tr.className, key: tr.getAttribute("data-key"), cells: tr.children.length, text: tr.innerText.replace(/\s+/g, " "), bars: tr.querySelectorAll(".a8-pl").length }));
    out.table = rows; out.moneyText = document.getElementById("moneysplit").innerText; setFold("p-money", true); out.after = shot(); return out; });
  const check = (x, what) => { const tot = x.sleeves.reduce((t, q) => t + q[2], 0);
    assert.deepEqual(x.sleeves.map((q) => q[0]), x.order.slice(0, x.n).map((q) => q[0]), what + ": the funded sleeves are the first of the ranking");
    for (const q of x.sleeves) { assert.ok(near(q[1], q[2] / tot * x.core, 1e-9), what + ": " + q[0] + " is its score's part of the core"); assert.ok(q[1] >= x.minEq - 1e-9, what + ": " + q[0] + " is not under the smallest sleeve"); }
    if (x.n < x.cands) { const next = x.order[x.n][1], t2 = tot + next; assert.ok(Math.min(next, ...x.sleeves.map((q) => q[2])) / t2 * x.core < x.minEq - 1e-12, what + ": one more sleeve would leave one under the smallest"); }
    assert.ok(near(x.sleeves.reduce((t, q) => t + q[1], 0) + x.index + x.conv, x.inv, 1e-9), what + ": the equal-weight fund + sleeves + conviction = what is invested"); };
  check(r.base, "today"); check(r.small, "smallest sleeve 2%"); check(r.wide, "everything invested, 2%");
  assert.ok(r.small.n > r.base.n, "a smaller smallest sleeve funds more: " + r.base.n + " → " + r.small.n); assert.ok(r.wide.n > 6 && r.wide.n > r.small.n, "no cap: " + r.wide.n + " sleeves when all is invested (the old shape stopped at four beside the index and conviction)");
  assert.equal(r.base.index, 0, "a branch is funded, so nothing sits in the broad equal-weight fund"); assert.deepEqual(r.capDial, [r.base.n, r.base.n], "the old most-sleeves dial moves nothing");
  assert.equal(r.none.n, 0); assert.ok(near(r.none.index, r.none.core, 1e-12) && r.none.core > 0, "no sleeve big enough: the core waits in the equal-weight S&P"); assert.ok(r.noneBar.some(([c, t]) => c === "core" && /EQUAL-WEIGHT S&P/.test(t)) && /no branch funded/i.test(r.noneText));
  for (const [key, fund, via] of r.parked) assert.ok(fund ? via.startsWith("parked in " + fund) : /no fund tracks it/.test(via), key + ": " + via);
  assert.equal(r.funds.TECH.fund, "XLK"); assert.equal(r.funds.INDEX.fund, "RSP"); assert.equal(r.funds.METALS.fund, "GLD · SLV"); if (r.funds.MEMORY_STORAGE) assert.equal(r.funds.MEMORY_STORAGE.fund, "DRAM", "memory and storage parks in the memory fund");
  /* every sleeve left out says why, and what stops the core is said once */
  assert.ok(r.base.stop && new RegExp("stretches to " + r.base.n + " sleeve").test(r.base.stop) && /one more would leave a sleeve under/.test(r.base.stop), r.base.stop);
  for (const [key, why, full, rank] of r.base.out) { assert.ok(why && why.length > 5, key + " says what holds it back: " + why); assert.ok(/^(growth |its growth is not read|leading, not turning up|pulling back|breaking down|improving|not washed out)/.test(why), key + ": " + why); assert.ok(full.startsWith("rank " + rank + " — ") && full.includes(r.base.stop) && full.endsWith(why)); }
  const body = r.table.filter((x) => x.key), stops = r.table.filter((x) => x.cls === "stop"); assert.equal(body.length, r.base.cands, "one row per candidate"); assert.equal(stops.length, 1, "where the core stops is said once");
  assert.equal(r.table.findIndex((x) => x.cls === "stop"), r.base.n, "…right under the last funded sleeve"); assert.ok(/THE CORE STOPS HERE/.test(stops[0].text) && stops[0].text.includes(r.base.stop));
  for (const x of body) { assert.equal(x.bars, 3, x.key + " draws its three places"); assert.equal(x.cells, 8); } assert.deepEqual(body.map((x) => x.cls), r.base.order.map((q, i) => (i < r.base.n ? "in" : "out")));
  const outText = body.filter((x) => x.cls === "out").map((x) => x.text).join(" | "); assert.equal((outText.match(/stretches to/g) || []).length, 0, "the common reason is not repeated on every row");
  assert.ok(/THE RANKING/.test(r.moneyText) && /GROWTH/.test(r.moneyText) && /REGIME FIT/.test(r.moneyText) && /OPPORTUNITY/.test(r.moneyText) && !/NEUTRAL|OVERBOUGHT|OVERSOLD/.test(r.moneyText), "the three questions, in plain words");
  /* the weights are dials: growth alone ranks by growth */
  const g = r.growthOnly.filter((x) => x[1] != null); for (let i = 1; i < g.length; i++) assert.ok(g[i][1] <= g[i - 1][1] + 1e-12, "with growth as the only weight the order is growth's");
  assert.deepEqual(r.after.sleeves, r.base.sleeves, "every dial is put back");
});

/* ------------------------------------------------------------------ 5 · THE PICKS READ THE DECISION CARDS */
test("5 · the card's figures, one accessor each: comps range, growth on sales, the Geiger's place in its year; a name with no peer set says so; nothing is guessed", async () => {
  const r = await P.page.evaluate(() => ({ mu: { g: cardGrowth(cardOf("MU")), k: cardComps(cardOf("MU")), ge: cardGeiger(cardOf("MU")) }, be: cardComps(cardOf("BE")), none: [cardOf("NOT_A_NAME"), cardGrowth(null), cardComps(null), cardGeiger({}), cardGrowth({ fundamentals: {} })],
    idx: [cardIndex(null), cardIndex({ cards: {} }), !!cardIndex({ cards: [{ ticker: "AAA" }] })], n: Object.keys(CARDS.cards).length, src: CARDS.src, served: CARDS.served }));
  const c = CARDS.cards.MU;
  assert.ok(near(r.mu.g.v, c.fundamentals.rev_g_ntm / 100, 1e-12) && r.mu.g.what === "sales, next 12 months" && near(r.mu.g.twoYear, c.fundamentals.rev_g_2y_a_year / 100, 1e-12), "growth is sales over the next twelve months — a one-off gain never sits in sales");
  assert.deepEqual([r.mu.k.low, r.mu.k.centre, r.mu.k.high], [c.comps.low, c.comps.centre, c.comps.high]); assert.deepEqual(r.mu.k.peers, c.comps.peers_priced); assert.deepEqual(r.mu.k.flags, c.comps.flags); assert.ok(near(r.mu.k.upside, c.comps.upside_pct / 100, 1e-12));
  assert.ok(near(r.mu.ge.pctl, c.technicals.geiger_pctl_own_year, 1e-12) && near(r.mu.ge.g, c.technicals.geiger, 1e-12));
  assert.equal(r.be.none, true); assert.ok(/no peer set/.test(r.be.says)); assert.deepEqual(r.none, [null, null, null, null, null]); assert.deepEqual(r.idx, [null, null, true]);
  assert.equal(r.n, 26); assert.equal(r.src, "data/decision-cards-20261006.json"); assert.equal(r.served, false, "the Hub does not serve the cards yet: the dated copy kept with the page is read, and the sources line says so"); assert.ok(/the Hub does not serve them yet/.test(s.spineNote.decision_cards));
});

test("5 · the card over the feed: for a carded name the knockout reads growth, the forward and trailing P/E and price ÷ sales from the card, field by field; the feed's own figures are kept beside them; a name with no card is untouched", async () => {
  const r = await P.page.evaluate(() => { const over = Object.entries(COMPS).filter(([, x]) => x && x.card); const plain = Object.entries(COMPS).find(([t, x]) => x && !x.card && x.pe > 0 && !CARDS.cards[t]);
    return { over: over.map(([t, x]) => [t, x.card.fields, x.card.date, { rev_growth: x.rev_growth, fwd_pe: x.fwd_pe, pe: x.pe, ps: x.ps }, x.feed]), plain: plain && [plain[0], Object.keys(plain[1]).includes("feed")], FH: feedHealth(), mode: SPINE["comps-feed"].mode, note: SPINE["comps-feed"].note, mu: { fund: fundScore("MU"), row: COMPS.MU } }; });
  assert.ok(r.over.length >= 20 && r.over.length <= 26, r.over.length + " carded names are in the feed's answer");
  for (const [t, fields, date, now, feed] of r.over) { const c = CARDS.cards[t], want = { rev_growth: c.fundamentals.rev_g_ntm != null ? c.fundamentals.rev_g_ntm / 100 : null, fwd_pe: c.fundamentals.fwd_pe, pe: c.comps.rows && c.comps.rows.pe_ttm && c.comps.rows.pe_ttm.own, ps: c.comps.rows && c.comps.rows.ps && c.comps.rows.ps.own };
    assert.equal(date, c.card_date); for (const k of fields) { assert.ok(want[k] != null && near(now[k], want[k], 1e-9), t + " " + k + " is the card's: " + now[k] + " vs " + want[k]); assert.ok(k in feed, t + " keeps the feed's own " + k); }
    for (const k of Object.keys(want)) if (want[k] == null || !isFinite(want[k])) assert.ok(!fields.includes(k), t + " " + k + ": the card has none, so the feed's stays"); }
  const mu = r.over.find((x) => x[0] === "MU"); assert.ok(mu, "Micron is one of them"); assert.ok(near(mu[3].rev_growth, CARDS.cards.MU.fundamentals.rev_g_ntm / 100, 1e-9) && mu[3].rev_growth > 0.5, "Micron's growth in the knockout is the card's +92%, whatever the feed says tonight (" + mu[4].rev_growth + ")");
  assert.ok(r.mu.fund.parts.some((p) => p[0] === "growth" && /growth 92%/.test(p[2])), "and its growth reading says so: " + JSON.stringify(r.mu.fund.parts)); assert.ok(near(mu[3].fwd_pe, CARDS.cards.MU.fundamentals.fwd_pe, 1e-9));
  assert.ok(r.plain && r.plain[1] === false, "a name without a card is not touched");
  /* the feed itself is measured, never assumed: of the names it shows earnings for, how many does it give a forward P/E */
  assert.equal(r.FH.thin, r.FH.earn >= 20 && r.FH.fwd < r.FH.earn / 2); assert.equal(r.mode, r.FH.thin ? "STALE" : "LIVE", "the sources line marks the feed exactly while it is thin");
  assert.ok(r.note.includes(r.over.length + " of them read growth and price multiples from their decision card")); if (r.FH.thin) assert.ok(r.note.includes("only " + r.FH.fwd + " of the " + r.FH.earn + " names with earnings"), r.note);
});

test("5 · step 6: each conviction name is its decision card — the comps range drawn, growth, the Geiger's place in its own year, the nearest named line — with its own size and the parent fund of its branch", async () => {
  const r = await P.page.evaluate(() => { setFold("p-mix", false); const el = document.querySelector('#picks .a8-pick[data-sym="MU"]'), price = +QUOTES.MU.price, k = cardComps(cardOf("MU")), L = nearestLines("MU", price);
    const ff = el.querySelector(".a8-ff"), band = ff.querySelector("span"), out = { price, text: el.innerText.replace(/\s+/g, " "), cells: [...el.querySelectorAll(".cells .cell > span")].map((x) => x.innerText), band: [parseFloat(band.style.left), parseFloat(band.style.width)], centre: parseFloat(ff.querySelector("i.c").style.left), needle: parseFloat(ff.querySelector("i.p").style.left), aria: ff.getAttribute("aria-label"),
      tags: [...el.querySelectorAll(".hd .tags u")].map((u) => u.innerText), amt: el.querySelector(".hd .amt").innerText, input: (() => { const i = el.querySelector("input.a8-size"); return [i.type, i.placeholder, i.value, i.getAttribute("aria-label")]; })(), chip: el.querySelectorAll(".cells .sc-gmini").length, L, up: k.centre / price - 1, g: gv("MU"), cap: document.querySelector("#picks .a7-cap").innerText, small: [...el.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.innerText && e.innerText.trim() && parseFloat(getComputedStyle(e).fontSize) < 11).length };
    setFold("p-mix", true); return out; });
  const c = CARDS.cards.MU, lo = Math.min(c.comps.low, r.price), hi = Math.max(c.comps.high, r.price), pos = (x) => (x - lo) / (hi - lo) * 100;
  assert.deepEqual(r.cells.map((x) => x.split(" · ")[0]), ["COMPS RANGE", "GROWTH", "GEIGER", "NEAREST NAMED LINE"], "the four readings the picks are made on");
  assert.ok(near(r.band[0], pos(c.comps.low), 0.06) && near(r.band[0] + r.band[1], pos(c.comps.high), 0.11) && near(r.centre, pos(c.comps.centre), 0.06) && near(r.needle, pos(r.price), 0.06), "the band runs low → high, the mark is the centre, the needle is the price"); assert.ok(/comps range/.test(r.aria));
  const up = (r.up >= 0 ? "+" : "−") + Math.abs(r.up * 100).toFixed(0) + "%"; assert.ok(r.text.includes(up + " to the centre") && r.text.includes("priced on " + c.comps.peers_priced.join(", ")), "the upside is to the centre from the live price: " + up);
  for (const f of c.comps.flags) assert.ok(r.text.includes(f), "the card's own warning is on it: " + f);
  assert.ok(r.text.includes("+" + Math.round(c.fundamentals.rev_g_ntm) + "%") && /sales, next 12 months/i.test(r.text) && r.text.includes("two years: +" + Math.round(c.fundamentals.rev_g_2y_a_year) + "% a year"), "growth");
  const p = Math.round(c.technicals.geiger_pctl_own_year); assert.ok(new RegExp("the " + p + "(st|nd|rd|th) percentile").test(r.text) && r.chip === 1, "the Geiger's place in its own year: " + p);
  assert.ok(r.L && r.L.below && /^\d+[DWM] [A-Z]\d/.test(r.L.below.id) && r.text.includes("▼ " + r.L.below.id) && r.text.includes("▲ " + r.L.above.id), "the nearest named line under and over the price, by the Lab's own label: " + r.L.below.id + " / " + r.L.above.id);
  assert.ok(r.tags.some((t) => /^APPROVED · Alan/.test(t)) && r.tags.some((t) => t === "CARD · 6 Oct 2026"), r.tags.join(" | "));
  assert.deepEqual(r.input.slice(0, 3), ["number", (Math.min(0.4 * s.ladder, 0.3) * 100).toFixed(1), ""], "its own size: the rule's figure waits in the box until he types his own"); assert.ok(/MU size/.test(r.input[3]));
  assert.ok(/parent fund DRAM/.test(r.text) && /the memory fund/.test(r.text), "Micron's parent sleeve is the memory fund"); assert.ok(/1 conviction name · 1 sized/.test(r.cap), r.cap); assert.equal(r.small, 0, "no text under 11px");
});

test("5 · the knockout: every card says CARD or NO CARD · FEED; a carded name carries its card's readings; in Micron's own cohort its growth is the card's", async () => {
  const r = await P.page.evaluate(() => { const ko = KO_COHORT; setFold("p-knockout", false);
    const read = () => ({ cards: [...document.querySelectorAll("#knockout .komatch .swcard")].map((c) => ({ sym: c.querySelector(".chead b").innerText, tags: [...c.querySelectorAll(".ckind")].map((x) => x.innerText), mini: !!c.querySelector(".a8-mini4"), miniText: (c.querySelector(".a8-mini4") || {}).innerText || "", ff: c.querySelectorAll(".a8-ff").length })),
      picks: [...document.querySelectorAll("#knockout .kopick .swcard")].map((c) => ({ sym: c.querySelector(".chead b").innerText, tags: [...c.querySelectorAll(".ckind")].map((x) => x.innerText), strip: !!c.querySelector(".a8-strip"), nocard: !!c.querySelector(".a8-nocard"), text: c.innerText.replace(/\s+/g, " ") })) });
    const first = read(); const home = cohortBoard().find((c) => c.names.includes("MU")); let mu = null;
    if (home) { KO_COHORT = home.key; render(); const K = knockout(home.key), e = K.entrants.find((x) => x.sym === "MU"); mu = { cohort: home.key, parts: e && e.fund.parts, there: read().cards.concat(read().picks).filter((c) => c.sym === "MU") }; KO_COHORT = ko; render(); }
    setFold("p-knockout", true); return { first, mu, carded: Object.keys(CARDS.cards) }; });
  assert.ok(r.first.cards.length >= 2 && r.first.picks.length >= 1);
  for (const c of r.first.cards) { const has = r.carded.includes(c.sym); assert.ok(c.tags.some((t) => has ? /^CARD · \d+ [A-Z]{3}$/.test(t) : t === "NO CARD · FEED"), c.sym + " says where its readings come from: " + c.tags.join(" | ")); assert.equal(c.mini, has, c.sym + (has ? " carries" : " has no") + " card line"); assert.equal(c.ff, 0, "a duel card stays compact"); }
  for (const c of r.first.picks) { const has = r.carded.includes(c.sym); assert.ok(has ? c.strip && !c.nocard : c.nocard && !c.strip, c.sym + (has ? ": the card in full" : ": says it has no card")); assert.ok(c.tags.some((t) => has ? /^CARD · /.test(t) : t === "NO CARD · FEED")); assert.ok(!/in \d+ round —/.test(c.text) || /in 1 round —|in \d+ rounds —/.test(c.text), "the rounds are the line's own: " + c.text.slice(0, 160)); }
  for (const c of r.first.cards.filter((x) => x.mini)) assert.ok(/COMPS/.test(c.miniText) && /GROWTH/.test(c.miniText) && /GEIGER/.test(c.miniText), c.sym + ": " + c.miniText);
  assert.ok(r.mu, "Micron sits in a cohort of the knockout"); if (r.mu.parts) { const g = r.mu.parts.find((p) => p[0] === "growth"); assert.ok(g && /^growth 92%/.test(g[2]), "in " + r.mu.cohort + " Micron's growth reads the card's 92%, not the feed's: " + JSON.stringify(g)); }
  for (const c of r.mu.there) assert.ok(c.tags.some((t) => /^CARD · /.test(t)), "Micron's knockout card is marked CARD");
});

/* ------------------------------------------------------------------ 6 · MICRON'S LADDER */
test("6 · Micron's ladder is its three confluence zones — 1,028–1,036 · 980–989 · 960–962 — each with its named members; a line standing alone between them is named and is not a zone", async () => {
  const r = await P.page.evaluate(() => { setFold("p-mix", false); const el = document.querySelector('#picks .a8-pick[data-sym="MU"]'), price = +QUOTES.MU.price, Z = zonesOf("MU", price), C = zonesOf("MU", 1045.56), inside = zonesOf("MU", 1030);
    const out = { price, close: { below: C.below.map((z) => [z.low, z.high, z.members.map((m) => m.label), +z.pct.toFixed(2), z.two_sources]), alone: C.alone.map((a) => [a.label, a.level]), as_of: C.as_of }, live: Z.below.map((z) => [z.low, z.high, z.pct]), inside: { below: inside.below.length, at: inside.at.map((z) => [z.low, z.high]) },
      rows: [...el.querySelectorAll(".a8-zr .zr")].map((d) => ({ zone: d.getAttribute("data-zone"), alone: d.classList.contains("alone"), range: d.querySelector("b").innerText, members: d.querySelector("span").innerText.replace(/\s+/g, " "), pct: d.querySelector("i").innerText })),
      bands: [...el.querySelectorAll(".a8-lad span")].map((x) => [parseFloat(x.style.left), parseFloat(x.style.width), x.innerText, x.title]), ticks: el.querySelectorAll(".a8-lad i.l").length, needle: [parseFloat(el.querySelector(".a8-lad i.p").style.left), el.querySelector(".a8-lad i.p b").innerText], cap: el.querySelector(".a8-cap2").innerText.replace(/\s+/g, " "), none: zonesOf("NOT_A_NAME", 10), noLadder: ladderHTML("NOT_A_NAME", 10) };
    setFold("p-mix", true); return out; });
  /* the three zones under the 6 Oct close, exactly as the zones study wrote them */
  assert.deepEqual(r.close.below.map((z) => [z[0], z[1]]), [[1028.24, 1036.13], [979.97, 989.17], [959.57, 961.81]]);
  assert.deepEqual(r.close.below.map((z) => z[2]), [["21-day", "2W D3", "3D P1"], ["1D D3", "3D C3"], ["100-day", "50-day"]], "the named members");
  assert.deepEqual(r.close.below.map((z) => z[3]), [-0.9, -5.39, -8.01], "the distance is to the zone's nearest edge, from the close"); assert.ok(r.close.below.every((z) => z[4] === true), "each has members from two sources"); assert.equal(r.close.as_of, "2026-10-06");
  assert.ok(r.close.alone.some(([l, v]) => l === "3D P3" && v === 1011.77), "3D P3 1,011.77 stands alone between the first two");
  const src = ZONES.names.MU.zones.filter((z) => z.side === "below").sort((a, b) => b.high - a.high); assert.deepEqual(r.close.below.map((z) => z[2]), src.map((z) => z.members.map((m) => m.label)), "read from the dated zones file as it is");
  /* on the page, from the live price */
  const zr = r.rows.filter((x) => x.zone), al = r.rows.filter((x) => x.alone);
  if (r.live.length === 3) {
    assert.deepEqual(zr.map((x) => x.range), ["1,028–1,036", "980–989", "960–962"], "the three zones, in whole points"); assert.deepEqual(zr.map((x) => x.zone), ["1", "2", "3"]);
    assert.equal(zr[0].members, "21-day 1,028.24 + 2W D3 1,032.23 + 3D P1 1,036.13"); assert.equal(zr[1].members, "1D D3 979.97 + 3D C3 989.17"); assert.equal(zr[2].members, "100-day 959.57 + 50-day 961.81", "members to the cent");
    r.live.forEach((z, i) => { assert.ok(near(z[2], (z[1] / r.price - 1) * 100, 1e-9)); assert.equal(zr[i].pct, z[2].toFixed(1).replace("-", "−") + "%", "distance from the live price"); });
    assert.equal(r.bands.length, 3); assert.deepEqual(r.bands.map((b) => b[2]), ["1", "2", "3"]); assert.ok(r.bands[0][0] > r.bands[1][0] && r.bands[1][0] > r.bands[2][0], "nearest the price on the right"); assert.ok(r.needle[0] > r.bands[0][0] + r.bands[0][1], "the price is right of the first zone"); assert.ok(/21-day 1,028\.24 \+ 2W D3 1,032\.23 \+ 3D P1 1,036\.13/.test(r.bands[0][3]));
    const p3 = al.find((x) => /3D P3/.test(x.members)); assert.ok(p3 && p3.range === "1,011.77" && /standing alone, not a zone/.test(p3.members), "3D P3 is listed as standing alone"); assert.ok(r.rows.indexOf(p3) > r.rows.indexOf(zr[0]) && r.rows.indexOf(p3) < r.rows.indexOf(zr[1]), "between the first two zones"); assert.equal(r.ticks, al.length);
    assert.ok(/THE LADDER — 3 confluence zones under the price/.test(r.cap) && /levels as of the 6 Oct close/.test(r.cap), r.cap);
  } else assert.ok(r.live.length < 3 && zr.length === r.live.length, "the price has moved into the ladder: the zones still under it are the ones drawn (" + r.live.length + ")");
  assert.deepEqual(r.inside, { below: 2, at: [[1028.24, 1036.13]] }, "with the price inside the first zone, that zone is 'at' and two are left under it");
  assert.equal(r.none, null); assert.equal(r.noLadder, "", "a name with no zones draws no ladder");
});

/* ------------------------------------------------------------------ 7 · THE WORDS, THE PHONE, A SAVED DEVICE */
test("7 · no internal code is on the page: every section, fold, branch, hover text and label, with the Lab's own line labels left as they are", async () => {
  const r = await P.page.evaluate(() => { const keep = { ...FOLDS };
    for (const [id] of SECTIONS) if (id !== "p-inputs") setFold(id, false); openDrawer(true); const open = [...document.querySelectorAll("details")].filter((d) => !d.open); open.forEach((d) => (d.open = true)); const hid = document.body.classList.contains("hidedesc"); document.body.classList.remove("hidedesc"); AL7.openBranch("TECH");
    const LAB = /\b\d+[DWMhm]\s+[A-Z]\d+(\.[A-Z])?\b/g, CODE = /\b(AL\d|PA\d[a-z]?|R[1-9]|C[4-7][a-z]?|CP\d|CZ\d|LB\d|B1|BT\d|CO1|TR\d|HM\d|DM\d|FD\d|ER\d|NQ\d|SG\d|KO1|NP\d|PF\d|HEAT\d|HC\d|H1\d|F1|A4|U5|K1|P2|Y4|V6|S16)\b/g;
    const texts = [document.body.innerText]; for (const a of ["title", "aria-label", "placeholder", "alt"]) for (const el of document.querySelectorAll("[" + a + "]")) texts.push(el.getAttribute(a));
    const hits = []; for (const raw of texts) { const t = String(raw || "").replace(LAB, " "); let m; CODE.lastIndex = 0; while ((m = CODE.exec(t))) hits.push(m[1] + ": …" + t.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\s+/g, " ") + "…"); }
    const labels = (document.body.innerText.match(LAB) || []).length, chars = document.body.innerText.length;
    AL7.openBranch("TECH"); open.forEach((d) => (d.open = false)); openDrawer(false); if (hid) document.body.classList.add("hidedesc"); for (const [id] of SECTIONS) if (id !== "p-inputs") { if (keep[id] == null) delete FOLDS[id]; else FOLDS[id] = keep[id]; applyFold(id); } localStorage.setItem("alloc-folds", JSON.stringify(FOLDS));
    return { hits: [...new Set(hits)], labels, chars }; });
  assert.deepEqual(r.hits, [], "a study or a helper is named by what it is");
  assert.ok(r.labels >= 5, "the Lab's own labels are on the page as the Lab writes them (" + r.labels + ")"); assert.ok(r.chars > 20000);
});

test("7 · on a phone: the money picture, the ranking, the picks and INPUTS — nothing scrolls sideways, no text is under 11px, the ranking needs no swipe", async () => {
  const Q = await openPage({ width: 390, height: 844 });
  try { await Q.page.waitForFunction(() => window.AL8 && AL8.ready(), null, { timeout: 120000 }); await Q.page.waitForTimeout(500);
    const r = await Q.page.evaluate(() => { for (const id of ["p-scen", "p-money", "p-mix", "p-map"]) setFold(id, false); openDrawer(true); document.getElementById("in-remove").open = true;
      const small = (sel) => [...document.querySelectorAll(sel + " *")].filter((e) => e.children.length === 0 && e.innerText && e.innerText.trim() && getComputedStyle(e).display !== "none" && parseFloat(getComputedStyle(e).fontSize) < 11).map((e) => e.className + ":" + e.innerText.slice(0, 20)).slice(0, 5);
      const w = (sel) => { const e = document.querySelector(sel); return e ? [e.scrollWidth, e.clientWidth] : null; };
      return { page: document.documentElement.scrollWidth, vw: innerWidth, small: { scen: small("#scenbars"), money: small("#moneysplit"), picks: small("#picks"), inputs: small("#p-inputs"), audit: small("#auditmap") }, rank: w("#moneysplit .scrollx"), scen: w("#scenbars .a8-scens"), drawer: w("#p-inputs"), pick: w("#picks .a8-pick"),
        bars: [...document.querySelectorAll("#scenbars .a8-scen .a7-mix")].map((b) => b.getBoundingClientRect().width), rows: document.querySelectorAll("#scenbars .a8-scen").length, rankRow: getComputedStyle(document.querySelector("#moneysplit table.a8-rk3 tr.in")).display, q: getComputedStyle(document.querySelector("#moneysplit table.a8-rk3 tr.in td.q"), "::before").content }; });
    assert.deepEqual(Q.errors, []); assert.ok(r.page <= r.vw, "no sideways scroll: " + r.page + " in " + r.vw);
    for (const [k, v] of Object.entries(r.small)) assert.deepEqual(v, [], "no text under 11px in " + k);
    assert.equal(r.rows, 5); for (const b of r.bars) assert.ok(b >= 240, "each bar has room: " + b);
    assert.ok(r.rank[0] <= r.rank[1] + 1, "the ranking fits the phone without a swipe: " + r.rank); assert.equal(r.rankRow, "grid"); assert.equal(r.q, '"growth"', "each of a sleeve's three answers is named on the phone");
    assert.ok(r.drawer[0] <= r.drawer[1] + 1 && r.pick[0] <= r.pick[1] + 1 && r.scen[0] <= r.scen[1] + 1, "INPUTS, a pick and the bars fit their width");
  } finally { await Q.close(); }
});

test("7 · a device that already holds saved dials keeps every one of them: this brief adds two settings (a size per name, the ranking's weights) and changes no other", async () => {
  const saved = { dTrend: 0.5, dRsi: 0.6, dTf: 0.763, vixCold: 32, tenCold: 5.1, maxInv: 95, minInv: 20, invCold: 75, invMid: 45, invHot: 25, nLC: 4, nSC: 2, nPer: 3, divAuto: 0, lcTilt: 0.1, maxTotal: 10, maxNames: 5, concLean: 0.25, curInv: 12, curLC: 5,
    maxSleeves: 7, minSleeve: 5, convShare: 25, coreIndexShare: 40,
    wts: { SPY: 0.75, QQQ: 1, IWM: 0.5, SMH: 0.5, VIX: 0.5, US10Y: 0.5, OIL: 0.5, VALUE: 0, CRYPTO: 0.25, DEF: 0.25, BREADTH_X: 0.75, BREADTH_EW: 0, BREADTH_SC: 0.25, SECTORS: 0.5, VIX_TERM: 0.25, CURVE: 0.5, PCC: 0.25, SKEW: 0.25, ADLINE: 0.5, B_200D: 0.25, B_50D: 0.25, TRIN: 0.25, B_VOL: 0.25, CONC: 0.25, CREDIT: 0.5, DURATION: 0.25, HAVEN: 0.25 },
    _v4: 1, _v5: 1, _v6: 1, _v7: 1, mixMethod: "BLEND", mixW: { SPDR: 40, HUBCMP: 20, MKTBOW: 20, TREE: 10, RANK: 10 } };
  const Q = await openPage({ storage: { "alloc-module-v1": JSON.stringify(saved), "alloc-picks": JSON.stringify(["NVDA"]) } });
  try { await Q.page.waitForFunction(() => window.AL8 && AL8.ready(), null, { timeout: 120000 }); await Q.page.waitForTimeout(400);
    const r = await Q.page.evaluate(() => ({ S: JSON.parse(JSON.stringify(S)), stored: JSON.parse(localStorage.getItem("alloc-module-v1")), picks: [...PICKS], minEq: allocation().minEq, rung: policyStep(heat()), ladder: policyLadder().map((x) => x[2]), names: namesPer(heat()), book: allocation().conviction.rows.map((x) => [x.sym, x.how]) }));
    assert.deepEqual(Q.errors, []); assert.equal(Q.nonGet.blocked, 0);
    for (const [k, v] of Object.entries(saved)) { if (k === "curInv" || k === "curLC") continue; assert.deepEqual(r.S[k], v, k + " is as he left it"); assert.deepEqual(r.stored[k], v, k + " is still stored"); }   /* where he is follows the broker's file */
    assert.deepEqual(r.S.sizes, {}, "no size is invented"); assert.deepEqual(r.S.rankW, { growth: 50, regime: 25, opportunity: 25 }, "the ranking's weights start at their proposals");
    assert.deepEqual(Object.keys(r.S).filter((k) => !(k in saved)).sort(), ["ibkrTs", "rankW", "sizes"].filter((k) => k in r.S).sort(), "nothing else was added");
    assert.deepEqual(r.ladder, [95, 75, 45, 25, 20], "his ladder"); assert.equal(r.minEq, 0.05, "his smallest sleeve is still read"); assert.equal(r.names, 3, "his manual number of names");
    assert.deepEqual(r.picks, ["NVDA"]); assert.deepEqual(r.book.find((x) => x[0] === "NVDA"), ["NVDA", "none"], "his kept name is on the list, waiting for a size"); assert.deepEqual(r.book.find((x) => x[0] === "MU"), ["MU", "rule"]);
  } finally { await Q.close(); }
});

test("close", async () => { if (P) await P.close(); });
