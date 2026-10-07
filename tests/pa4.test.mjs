/* PA4 tests (5 Oct 2026): one per new voter, the VIX wiring, the dial changes the pie, the cards write a decision (against a
   test row), the guidance file validates. Headless, against the local stand-in for Vercel (tests/_harness.mjs). node --test tests/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"; import path from "node:path";
import { openPage, API, sbGet, ROOT } from "./_harness.mjs";

let P, state;
test("the page loads headless with the new sources live and no stray write", async () => {
  P = await openPage({ allowPost: (u) => /\/rest\/v1\/comps_decisions$/.test(u) });
  state = await P.page.evaluate(() => ({
    spine: Object.fromEntries(Object.entries(SPINE).map(([k, v]) => [k, v.mode])),
    voters: Object.fromEntries(voters().map((v) => [v.key, { val: v.val, sub: v.sub, w: S.wts[v.key] }])),
    b20: BREADTH20 && { n: BREADTH20.n, cum: BREADTH20.cum, asof: BREADTH20.asof, k: BREADTH20.sessions.length, today: BREADTH20.today, dir: Object.fromEntries(Object.entries(BREADTH20.dir).slice(0, 40)), last: BREADTH20.sessions[BREADTH20.sessions.length - 1] },
    conc: CONC20, method: methodWord(), mixW: mixWeights(),
    tree: TREE_ROLL && { names: TREE_ROLL.names, mapped: TREE_ROLL.mapped, sectors: Object.keys(TREE_ROLL.sectors).length, cohorts: Object.keys(TREE_ROLL.cohorts).length, tech: TREE_ROLL.sectors.TECH },
    mb: MKTBOW && { n: MKTBOW.n, market: MKTBOW.market && MKTBOW.market.bowtie, tech: MKTBOW.sectors.TECH },
    shortList: shortList().map((c) => ({ sym: c.sym, of: c.of, sector: c.sector, reason: c.reason })),
    guidance: hubGuidance(), bar: document.getElementById("secbar").innerText,
    folded: [...document.querySelectorAll(".grid > .panel")].map((p) => [p.id, p.classList.contains("folded"), p.querySelector(".pbody").clientHeight]),
    cards: document.querySelectorAll("#cards .swcard").length, tagged: RANKED.filter((r) => r.tag).map((r) => [r.sym, r.fund.n]),
  }));
  assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked, 0); assert.equal(P.nonGet.allowed, 0, "nothing written at load");
  for (const k of ["breadth_20d", "macro_api", "tree_close_tier", "market_bowtie_live", "comps_decisions"]) assert.equal(state.spine[k], "LIVE", k);
});
test("ADVANCE / DECLINE: the served set's 20-session line, and the page's up/down per name equals the daily bars", async () => {
  const B = state.b20; assert.ok(B && B.n >= 200, "at least 200 served names with bars"); assert.equal(B.k, 20);
  const syms = Object.keys(B.dir).slice(0, 30);
  const j = await (await fetch(API + "/candles-multi?symbols=" + syms.join(",") + "&tf=1d&limit=22")).json();
  let checked = 0;
  for (const s of syms) { const c = j.candles[s]; if (!c || !Array.isArray(c.series)) continue; const ser = c.series.filter((x) => x.c != null); const d = []; for (let i = 1; i < ser.length; i++) d.push(ser[i].c > ser[i - 1].c ? 1 : ser[i].c < ser[i - 1].c ? -1 : 0);
    assert.deepEqual(B.dir[s].slice(-d.length), d, s + " direction per session"); checked++; }
  assert.ok(checked >= 20);
  const v = state.voters.ADLINE; assert.ok(v.val != null && Math.abs(v.val) <= 1); assert.equal(v.w, 0.5, "default weight 0.5");
  assert.ok(v.sub.includes("served set, " + B.n + " names") && v.sub.includes("line " + (B.cum >= 0 ? "+" : "") + B.cum), v.sub);
  assert.equal(B.last.up + B.last.down <= B.n, true);
});
test("CONCENTRATION: SPY vs RSP over 20 sessions from the same bars, and the top ten's share is stated", async () => {
  const j = await (await fetch(API + "/candles-multi?symbols=SPY,RSP&tf=1d&limit=22")).json();
  const ret = (s) => { const a = s.series[s.series.length - 21].c, b = s.series[s.series.length - 1].c; return b / a - 1; };
  const spread = ret(j.candles.RSP) - ret(j.candles.SPY);
  assert.ok(Math.abs(state.conc.spread - spread) < 1e-6, `spread page ${state.conc.spread} vs source ${spread}`);
  const v = state.voters.CONC; assert.equal(v.val, Math.max(-1, Math.min(1, spread / 0.05))); assert.equal(v.w, 0.5);
  assert.ok(state.conc.top10 && state.conc.top10.names.length === 10 && /ten largest names/.test(v.sub), v.sub);
  assert.ok(state.voters.MAGS, "the old Geiger concentration still votes under its own key");
});
test("VIX: votes live from the chart API's macro board; VIX TERM votes on the table's last close and says its date", async () => {
  const m = await (await fetch(API + "/macro")).json();
  const v = state.voters.VIX; assert.ok(v.val != null); assert.ok(/chart API macro/.test(v.sub), v.sub);
  const px = +v.sub.split(" ")[0]; assert.ok(Math.abs(px - m.macro.VIX.quote.price) / m.macro.VIX.quote.price < 0.05, `VIX ${px} vs ${m.macro.VIX.quote.price}`);
  const row = (await sbGet("vix_term?select=date,vix3m&order=date.desc&limit=1"))[0];
  const t = state.voters.VIX_TERM; assert.ok(t.sub.includes(row.date), "the dial says the 3-month leg's date: " + t.sub);
  const age = (Date.now() - Date.parse(row.date)) / 864e5;
  if (age <= 4) { assert.ok(t.val != null, "votes when the close is within four days"); assert.ok(Math.abs((px / row.vix3m) - +t.sub.split(" ")[0]) < 0.02); }
  else assert.equal(t.val, null, "says it is not voting");
});
test("the blend (PA5, in place of the dial): stated default weights, and moving a weight changes the money bar (AL7: the bar took the pie's place)", async () => {
  assert.deepEqual(state.mixW, { SPDR: 20, HUBCMP: 20, MKTBOW: 20, TREE: 20, RANK: 20 }); assert.ok(/^THE BLENDED SECTOR BOW TIE · five readings, weights State Street fund 20/.test(state.method), state.method);
  const pic = () => { const el = document.getElementById("mix6"); return [el.innerHTML.length, [...el.querySelectorAll(".a7-mix > div")].map((d) => d.className + " " + d.style.flex + " " + d.title).join("|")]; };
  const before = await P.page.evaluate("(" + pic + ")()").then((x) => [...x]);
  await P.page.evaluate(() => { S.mixW = { SPDR: 0, HUBCMP: 0, MKTBOW: 0, TREE: 100, RANK: 0 }; save(); render(); }); await P.page.waitForTimeout(300);
  const after = await P.page.evaluate("(" + pic + ")()").then((x) => [...x]);
  const rest = await P.page.evaluate(() => [methodWord(), document.getElementById("mixdial").innerText, blendTable().filter((r) => r.method === "BLEND").map((r) => [r.key, r.used])]);
  assert.ok(before[1].length > 20 && (before[0] !== after[0] || before[1] !== after[1]), "the money bar redrew: " + before[1].slice(0, 160) + " → " + after[1].slice(0, 160)); assert.ok(/tree close tier 100/.test(rest[0]), rest[0]); assert.ok(/weights/.test(rest[1]));
  for (const [k, used] of rest[2]) assert.ok(used.length <= 1 && (used.length === 0 || used[0] === "TREE"), k + " reads the tree only: " + used);   /* the five-method sectors; metals are read from the metal (AL7) */
  await P.page.evaluate(() => { S.mixW = { SPDR: 20, HUBCMP: 20, MKTBOW: 20, TREE: 20, RANK: 20 }; save(); render(); });
  assert.ok(state.tree && state.tree.names > 5000 && state.tree.sectors === 11 && state.tree.cohorts >= 10, JSON.stringify(state.tree));
  assert.ok(state.mb && state.mb.n > 300 && state.mb.tech && state.mb.tech.bowtie != null);
});
test("the cards: a short list from the favoured sectors, every card with its one-line reason, and KEEP writes a decision (test row)", async () => {
  assert.ok(state.cards >= 6 && state.cards === state.shortList.length, "cards " + state.cards);
  for (const c of state.shortList) assert.ok(/fundamentals|no measured/.test(c.reason) && /Geiger|target/.test(c.reason), c.sym + ": " + c.reason);
  for (const [sym, n] of state.tagged) assert.ok(n >= 2, sym + " tagged ADD with " + n + " readings");
  // the card's own write path, against a test row — the same function the KEEP button calls
  const reason = "PA4 test row " + new Date().toISOString();
  await P.page.evaluate((r) => writeDecision({ company: "PA4_TEST", peer: "PA4_TEST", off: false, reason: r, source: "allocation-pa4-test" }), reason);
  assert.equal(P.nonGet.allowed, 1, "one insert, to comps_decisions");
  const rows = await sbGet("comps_decisions?select=company,peer,off,reason,source&company=eq.PA4_TEST&order=set_at.desc&limit=1");
  assert.equal(rows.length, 1); assert.equal(rows[0].reason, reason); assert.equal(rows[0].off, false); assert.equal(rows[0].source, "allocation-pa4-test");
  // and a card click goes through decide() → the same write (intercepted and counted, not sent twice)
  const before = P.nonGet.urls.length;
  await P.page.evaluate(() => { window.writeDecision = async () => { throw new Error("test: write intercepted"); }; });
  await P.page.click("#cards .swcard:first-child .swbtns button:last-child"); await P.page.waitForTimeout(300);
  const st = await P.page.evaluate(() => { const c = shortList()[0]; const d = decisionOf(c.of || c.sym, c.sym); return { d, txt: document.querySelector("#cards .swcard:first-child").innerText }; });
  assert.ok(st.d && st.d.off === false && st.d.saved === false, "the decision is kept on the device when the write fails"); assert.ok(/KEPT/.test(st.txt));
  assert.equal(P.nonGet.urls.length, before);
});
test("the guidance file validates and matches the page's list", () => {
  const f = path.join(ROOT, "control", "ALLOCATION-HUB-GUIDANCE.json"); assert.ok(fs.existsSync(f), "control/ALLOCATION-HUB-GUIDANCE.json on the branch");
  const g = JSON.parse(fs.readFileSync(f, "utf8"));
  assert.ok(Array.isArray(g.names) && g.names.length >= 6);
  for (const n of g.names) { assert.ok(/^[A-Z.\-]{1,8}$/.test(n.ticker), n.ticker); assert.ok(["NEEDS THE LIVE HUB", "FUNDAMENTALS ONLY — OFF-HUB IS ENOUGH"].includes(n.tag), n.tag); assert.ok(n.reason && n.reason.length > 10); assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(n.date)); }
  assert.equal(g.counts.needs_live_hub, g.names.filter((n) => n.tag === "NEEDS THE LIVE HUB").length);
  assert.equal(g.counts.fundamentals_only, g.names.length - g.counts.needs_live_hub);
  const live = state.guidance; assert.ok(live.names.length >= 6);
  for (const n of live.names) assert.ok(n.tag === (n.of && !/favourites|KEEP/.test(n.reason) ? "FUNDAMENTALS ONLY — OFF-HUB IS ENOUGH" : "NEEDS THE LIVE HUB"), n.ticker + " " + n.tag + " " + n.reason);
});
/* AL8 (7 Oct): sixteen sections — THE MONEY (one bar per market) is the first, and it is open with THE BRIEF on the first screen. */
test("the fold: a sticky section bar with the sixteen sections (PA6: 3a and 3b · AL8: THE MONEY first), every section but THE MONEY and THE BRIEF folded to one screen", () => {
  for (const t of ["THE MONEY", "THE BRIEF", "1 HEAT", "INPUTS", "2 HOW MUCH", "3a SECTORS", "3b MONEY", "4 COHORTS", "5 KNOCKOUT", "6 PICKS & %", "7 MOVES", "8 OPTIONS", "8b COMPS", "9 MAP", "10 STATE", "11 TRACE"]) assert.ok(state.bar.includes(t), t);
  assert.equal(state.folded.length, 16); assert.equal(state.folded[0][0], "p-scen");
  for (const [id, folded, h] of state.folded) { if (id === "p-scen" || id === "p-brief" || id === "p-inputs") { assert.equal(folded, false); continue; } assert.equal(folded, true, id); assert.ok(h <= 1050 - 200, id + " body " + h + "px"); }
});
test("teardown", async () => { await P.close(); });
