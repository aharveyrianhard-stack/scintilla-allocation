/* PA3 wiring tests (5 Oct 2026). Each source: reachable, fresh, and the number the page shows equals the source.
   Runs headless against a local stand-in for Vercel (static index.html + the two rewrites in vercel.json).
   node --test tests/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { openLongVersion } from "./_harness.mjs";   /* DB1 (9 Oct): the panels this test reads sit under THE LONG VERSION, closed to start */
import { createRequire } from "node:module";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const require = createRequire("/Users/alanharvey/SCINTILLA 0.5/visual-supervisor/package.json");
const { chromium } = require("playwright-core");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://scintilla-massive-chart-api.fly.dev";
const SB = "https://wadinxqplrggagkvrdag.supabase.co/rest/v1";
const KEY = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/const SB_ANON='([^']+)'/)[1];
const rewrites = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")).rewrites;
const sbGet = async (p) => { const r = await fetch(SB + "/" + p, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } }); assert.equal(r.status, 200, p); return r.json(); };
const hours = (iso) => (Date.now() - Date.parse(iso)) / 36e5;

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"); const rw = rewrites.find((x) => x.source === u.pathname);
  if (rw) { const r = await fetch(rw.destination + u.search); res.writeHead(r.status, { "content-type": r.headers.get("content-type") || "application/json" })   /* PA6: the upstream's own type — the C5 method is a JavaScript module */; return res.end(Buffer.from(await r.arrayBuffer())); }
  const f = path.join(ROOT, u.pathname === "/" ? "index.html" : u.pathname);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": "text/html" }); res.end(fs.readFileSync(f));
});
await new Promise((ok) => server.listen(0, ok)); const PORT = server.address().port;

let page, browser, state, nonGet = 0;
test("the page loads headless with no errors and no non-GET request", async () => {
  browser = await chromium.launch({ headless: true });
  { const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } }); await openLongVersion(context); page = await context.newPage(); }   /* DB1: the panels this test reads sit under THE LONG VERSION, closed to start */
  const errors = [];
  await page.route("**/*", (r) => { if (r.request().method() !== "GET") { nonGet++; return r.abort(); } r.continue(); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(2500); await page.waitForSelector("#cohort tr:nth-child(2)", { timeout: 120000 });   /* PA6: the page now loads the fundamentals of every served company (each business line needs its field), so the names table arrives a few seconds later */
  state = await page.evaluate(() => ({
    spine: Object.fromEntries(Object.entries(SPINE).map(([k, v]) => [k, v.mode])),
    spy: tickerG("SPY"), xlk: SECTOR_READ.TECH, rspt: GEIGER.RSPT && GEIGER.RSPT.composite, geigerN: Object.keys(GEIGER).length,
    voters: Object.fromEntries(voters().map((v) => [v.key, v.val])), heat: heat(), step: policyStep(heat()), inv: investedAt(heat()),
    heatShown: document.getElementById("heatnum").innerText, policyText: document.getElementById("policy").innerText,
    quotes: Object.keys(QUOTES).length, nvdaPrice: QUOTES.NVDA && QUOTES.NVDA.price, targetsN: Object.keys(TARGETS).length, nvdaTarget: TARGETS.NVDA,
    peersN: Object.keys(PEERS).length, nvdaPeers: PEERS.NVDA, b1: B1 && { asof: B1.asof, market: B1.market.bowtie, tech: B1.sectors.TECH },
    ranked: RANKED.slice(0, 5).map((r) => r.sym), tabs: document.getElementById("catTabs").innerText,
    firstRow: [...document.querySelectorAll("#cohort tr")][1].innerText, brief: document.getElementById("brief").innerText,
    wts: S.wts, stamp: document.getElementById("stamp").innerText,
  }));
  assert.deepEqual(errors, []); assert.equal(nonGet, 0);
});
test("Geiger: the chart API is live and fresh, and SPY on the page equals the source", async () => {
  const j = await (await fetch(API + "/geiger?symbols=SPY,XLK,RSPT")).json();
  assert.equal(j.symbols.SPY.liveness.state, "FRESH"); assert.ok(hours(j.computed_utc) < 1, "computed within the hour");
  assert.equal(state.spine.geiger, "LIVE"); assert.equal(state.spy.src, "geiger"); assert.ok(state.geigerN >= 590);
  assert.ok(Math.abs(state.spy.g - j.symbols.SPY.composite) < 0.05, `SPY page ${state.spy.g} vs source ${j.symbols.SPY.composite}`);
  assert.equal(state.voters.SPY, state.spy.g);
});
test("sectors: Technology on the page = XLK's Geiger, and the bow tie = RSPT − XLK", async () => {
  const j = await (await fetch(API + "/geiger?symbols=XLK,RSPT")).json();
  assert.equal(state.spine.sector_compare, "LIVE"); assert.equal(state.xlk.src, "geiger"); assert.equal(state.xlk.etf, "XLK");
  assert.ok(Math.abs(state.xlk.score - j.symbols.XLK.composite) < 0.05); assert.ok(Math.abs(state.xlk.bowtie - (j.symbols.RSPT.composite - j.symbols.XLK.composite)) < 0.05);
  // PA5: the three sector voters (SECTOR COMPARE, SECTOR BOW TIE, MARKET BOW TIE) became ONE blended voter
  assert.ok(state.voters.SECTORS != null, "the blended sector voter votes"); assert.equal(state.wts.SECTORS, 0.75);
  for (const k of ["SECTOR_CMP", "BOWTIE", "MKT_BOWTIE"]) assert.equal(state.voters[k], undefined, k + " no longer votes on its own");
});
test("the policy ladder: the shown heat maps to the rung and the invested %", () => {
  assert.equal(state.heatShown, (state.heat >= 0 ? "+" : "") + state.heat.toFixed(2));
  const ladder = { "DEEP OVERSOLD": 100, OVERSOLD: 80, NEUTRAL: 50, OVERBOUGHT: 30, "DEEP OVERBOUGHT": 15 };
  assert.equal(state.step.pct, ladder[state.step.cond]); assert.equal(state.inv, state.step.pct / 100);
  const PLAIN = { "DEEP OVERSOLD": "DEEPLY WASHED OUT", OVERSOLD: "WASHED OUT", NEUTRAL: "MIDDLING", OVERBOUGHT: "STRETCHED", "DEEP OVERBOUGHT": "DEEPLY STRETCHED" };
  assert.ok(state.policyText.includes(PLAIN[state.step.cond]) && state.policyText.includes(state.step.pct + "% invested, " + (100 - state.step.pct) + "% in cash"), "PA5: the rung in plain words with what it does to the money: " + state.policyText.slice(0, 200));
});
test("prices: the chart API quotes are fresh and NVDA on the page equals the source", async () => {
  const j = await (await fetch(API + "/quotes?symbols=NVDA")).json();
  assert.equal(state.spine.quotes, "LIVE"); assert.ok(state.quotes > 250);
  assert.ok(Math.abs(state.nvdaPrice - j.quotes.NVDA.price) / j.quotes.NVDA.price < 0.01, `NVDA ${state.nvdaPrice} vs ${j.quotes.NVDA.price}`);
});
test("analyst targets: A4's checked notes, one per firm, last 90 days — NVDA's median equals the source", async () => {
  const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const rows = await sbGet(`analyst_target_news?select=firm,adj_target_checked,published_utc&ticker=eq.NVDA&kind=eq.TARGET&quality=eq.ok&adj_target_checked=not.is.null&published_utc=gte.${since}&order=published_utc.desc&limit=1000`);
  const byFirm = {}; for (const r of rows) if (!((r.firm || "(no firm)") in byFirm)) byFirm[r.firm || "(no firm)"] = +r.adj_target_checked;
  const v = Object.values(byFirm).filter((x) => x > 0).sort((a, b) => a - b); const med = v.length % 2 ? v[v.length >> 1] : (v[(v.length >> 1) - 1] + v[v.length >> 1]) / 2;
  assert.equal(state.spine.analyst_targets, "LIVE"); assert.ok(state.targetsN > 100);
  assert.equal(state.nvdaTarget.n, v.length); assert.equal(state.nvdaTarget.median, med);
});
test("peers: peer_sources is read for the candidates and NVDA's set matches", async () => {
  const rows = await sbGet("peer_sources?select=peer&ticker=eq.NVDA&order=source.asc,position.asc&limit=100");
  assert.equal(state.spine.peer_sources, "LIVE"); assert.ok(state.peersN > 100);
  for (const r of rows) assert.ok(state.nvdaPeers.includes(r.peer), r.peer + " in NVDA's peers");
});
test("B1: the soundness verdicts and the whole-market bow tie are read from the Hub", async () => {
  const j = await (await fetch("https://scintillahub.ai/deliverables/20261003/b1-market-bowtie/data/market-bowtie-20261003.json")).json();
  assert.equal(state.spine.b1_soundness, "LIVE"); assert.equal(state.b1.asof, j.as_of.close); assert.equal(state.b1.market, j.modes.blend.market.bowtie);
  assert.equal(state.voters.MKT_BOWTIE, undefined, "PA5: B1's whole-market figure is shown and dated but no longer votes on its own");
  assert.equal(state.b1.tech, j.modes.blend.sectors.find((s) => s.label === "TECH").verdict);
});
test("names: sound sectors come first in the tabs, the first row is tagged ADD, the brief names the rung and the cash", () => {
  const tabs = state.tabs.split("\n").filter((t) => /^[●◐○] /.test(t) && !/sound ·/.test(t)); const order = tabs.map((t) => t[0]);
  const rank = { "●": 0, "◐": 1, "○": 2 }; for (let i = 1; i < order.length; i++) assert.ok(rank[order[i]] >= rank[order[i - 1]], "sound first: " + order.join(""));
  assert.ok(state.firstRow.includes("ADD")); assert.ok(state.ranked.length === 5);
  assert.ok(/^The market's heat is (deeply washed out|washed out|middling|stretched|deeply stretched) \(/.test(state.brief), "PA5: plain words, no bare NEUTRAL: " + state.brief.slice(0, 120)); assert.ok(!/\bNEUTRAL\b/.test(state.brief)); assert.ok(state.brief.includes(state.step.pct + "% invested"));
  assert.ok(state.stamp.includes("the Hub's Geiger")); assert.ok(!/composite_staged|SSOT|sbGet/.test(state.brief), "no codes in the brief");
});
test("what still says STALE or FALLBACK is only what has no live source", () => {
  const notLive = Object.entries(state.spine).filter(([, m]) => m !== "LIVE").map(([k]) => k).sort();
  /* AL8 (7 Oct): two more may read "old", each for a stated reason — the scenario rows are placeholders until the deployment engine's own
     file sits beside the page; the fundamentals feed is marked while it gives a forward P/E to under half the names with earnings (measured
     at load; it clears by itself when the repaired feed is deployed). */
  for (const k of notLive) assert.ok(["vix_term", "market_breadth", "live_quotes", "sector_rankings", "deployment_scenarios", "comps-feed"].includes(k), k + " should be live");
  assert.ok(state.spine.live_quotes === "FALLBACK", "live_quotes is only the fallback now");
});
test("teardown", async () => { await browser.close(); server.close(); });
