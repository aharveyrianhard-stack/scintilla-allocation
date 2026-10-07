/* CP3 tests (7 Oct 2026) — the allocation tool on ONE FORWARD P/E, with the core candidates' comps where the workflow stands.
   Alan: "Why is there inconsistencies everywhere on the forward P/E … if that's the right one, it should be everywhere"; "I need it
   reflected in portfolio allocation … I need to go through the workflow"; "debt should matter."
   1 THE FIFTH SURFACE: for every card of the Hub's thirty-name table the tool prints the multiple the dashboard, the COMPS tab, the
     card and the feed print (data/one-basis-30-20261007.json, written by the Hub's own test table), and on a live price it prints
     that price over the same earnings. 2 A STORED QUOTE HAS AN AGE: when the live price service is down and the stored table is weeks
     old, nothing is priced on it. 3 THE WORKFLOW: the brief's core line, step 5b with every core candidate and the peers that price
     it, the knockout's value line, the picks' forward P/E, debt and peers. 4 seventeen sections, no internal code, nothing sideways on
     a phone. Headless, against the local stand-in for Vercel; every non-GET is blocked; the price routes are answered by the test. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"; import path from "node:path";
import { startServer, chromium, ROOT } from "./_harness.mjs";

const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const CARDS = J("decision-cards-20261007.json"), TABLE = J("one-basis-30-20261007.json"), CORE = J("core-candidates-20261007.json");
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
/* a page whose prices the test decides: quotes(symbols) → the chart API's answer, or "down"; stored: the live_quotes rows */
async function openWith({ quotes, stored, width = 1680, height = 1050 }) {
  const srv = await startServer(), browser = await chromium.launch({ headless: true }), context = await browser.newContext({ viewport: { width, height } }), page = await context.newPage();
  const errors = [], nonGet = { blocked: 0 }; page.on("pageerror", (e) => errors.push(String(e)));
  await page.route("**/*", (r) => { const q = r.request(), u = q.url();
    if (q.method() !== "GET") { nonGet.blocked++; return r.abort(); }
    if (/\/quotes\?symbols=/.test(u)) { if (quotes === "down") return r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "live price surface unavailable" }) });
      const syms = decodeURIComponent(u.split("symbols=")[1].split("&")[0]).split(","), now = new Date().toISOString();
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ generated_utc: now, quotes: Object.fromEntries(syms.map((s) => [s, quotes(s)]).filter(([, p]) => p > 0).map(([s, p]) => [s, { symbol: s, price: p, previous_close: p, change_pct: 0, price_freshness: "FRESH", price_observation_utc: now }])) }) }); }
    if (/\/rest\/v1\/live_quotes\?/.test(u) && stored) return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stored) });
    r.continue(); });
  await page.goto(srv.url, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForFunction(() => typeof coreNames === "function" && coreNames().length > 0 && document.querySelector("#coretab") && typeof COMPS !== "undefined" && COMPS.MU, null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return { page, errors, nonGet, close: async () => { await browser.close(); srv.server.close(); } };
}
const closeOf = (s) => (CARDS.cards[s] ? +CARDS.cards[s].price : 0);
const read = () => ({ cards: { n: Object.keys(CARDS.cards).length, src: CARDS.src, repriced: CARDS.repriced, as_of: CARDS.as_of }, sections: [...document.querySelectorAll(".grid > .panel")].map((p) => p.id), bar: document.getElementById("secbar").innerText,
  prints: Object.fromEntries(Object.values(CARDS.cards).map((c) => { const u = priceUnder(c.ticker); return [c.ticker, { text: cardForward(c, u.price).text, pe: cardForward(c, u.price).pe, price: u.price, live: u.live, word: u.word }]; })),
  knock: Object.fromEntries(Object.entries(COMPS).filter(([, r]) => r && r.card && r.card.fields.includes("fwd_pe")).map(([t, r]) => [t, r.fwd_pe])),
  quotes: Object.keys(QUOTES).length, spine: SPINE.quotes, core: coreNames(), coreRows: [...document.querySelectorAll("#coretab tbody tr[data-sym]")].map((tr) => ({ sym: tr.dataset.sym, text: tr.innerText, peers: tr.nextElementSibling.querySelectorAll(".c3-peers tbody tr").length, chips: [...tr.querySelectorAll("td:nth-child(8) .c3-chip")].map((x) => x.innerText) })),
  coreCap: document.querySelector("#core .a7-cap").innerText, coreLine: (document.querySelector(".c3-core") || {}).innerText || "", picks: document.getElementById("picks").innerText,
  muPeers: [...document.querySelectorAll('#picks .a8-pick[data-sym="MU"] .c3-peers tbody tr')].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()),
  codes: (document.getElementById("p-core").innerText + document.getElementById("picks").innerText).match(/\b(CP[123]|KO1|FD1|ER1|AL[78]|DM[12]|C5b?|C6b?)\b/g) || [],
  small: [...document.querySelectorAll("#core *, .c3-peers *, .c3-core *")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).length,
  width: [document.documentElement.scrollWidth, innerWidth] });

let A, a;
test("1 · on the cards' own close the tool prints, for every card of the thirty, the multiple the dashboard, the COMPS tab, the card and the feed print", async () => {
  A = await openWith({ quotes: closeOf }); a = await A.page.evaluate(read);
  assert.deepEqual(A.errors, []); assert.equal(A.nonGet.blocked, 0);
  assert.equal(a.cards.n, 27); assert.equal(a.cards.src, "data/decision-cards-20261007.json"); assert.equal(a.cards.repriced, "2026-10-07"); assert.equal(a.cards.as_of, "2026-10-06");
  const rows = TABLE.rows.filter((r) => CARDS.cards[r.ticker]); assert.equal(TABLE.rows.length, 30); assert.equal(rows.length, 27, "27 of the thirty have a card; Meta, Microsoft and AMD are read from the feed, which the Hub's own test holds to the same table");
  for (const r of rows) { const p = a.prints[r.ticker]; assert.equal(p.live, true, r.ticker + " is on the price the test gave"); assert.ok(near(p.price, r.price, 1e-9)); assert.equal(p.text, r.prints, `${r.ticker}: the tool ${p.text} · the Hub's table ${r.prints}`); }
  assert.deepEqual(["GOOGL", "AMZN", "AVGO", "NVDA", "MU", "VST", "TSM"].map((t) => a.prints[t].text), ["24.2×", "25.7×", "21.6×", "19.9×", "6.0×", "15.6×", "≈23.1×"]);
  /* and the knockout's rows carry that same number */
  assert.ok(Object.keys(a.knock).length >= 15, Object.keys(a.knock).length + " knockout rows read the card's forward P/E");
  for (const [t, v] of Object.entries(a.knock)) assert.ok(near(v, a.prints[t].pe, 1e-9), t + ": the knockout's forward P/E is the card's");
});
test("1 · on a live price the multiple is that price over the same earnings — the dashboard's number to the tick", async () => {
  const B = await openWith({ quotes: (s) => closeOf(s) * 0.9 }); const b = await B.page.evaluate(read); await B.close();
  for (const t of ["GOOGL", "AVGO", "MU", "VST"]) { const f = CARDS.cards[t].fundamentals, want = (closeOf(t) * 0.9) / f.fwd_eps; assert.ok(near(b.prints[t].pe, want, 1e-9), t); assert.equal(b.prints[t].text, want.toFixed(1) + "×"); assert.ok(near(b.knock[t], want, 1e-9), t + " in the knockout"); }
  assert.equal(b.prints.GOOGL.text, "21.8×"); assert.equal(b.prints.TSM.text.startsWith("≈"), true, "a converted multiple keeps its mark");
});
test("2 · a stored quote has an age: with the live service down and the stored table weeks old, nothing is priced on it — the cards' closes stand, and the page says so", async () => {
  const old = "2026-08-18T23:56:00.412521+00:00", stale = Object.keys(CARDS.cards).map((t) => ({ ticker: t, price: closeOf(t) * 0.8, updated_ts: old }));
  const C = await openWith({ quotes: "down", stored: stale }); const c = await C.page.evaluate(read); await C.close();
  assert.equal(c.quotes, 0, "no stale row is kept as a price"); assert.equal(c.spine.mode, "FALLBACK"); assert.match(c.spine.note, /no live price: the stored quotes are \d+ days old and are not used/);
  for (const r of TABLE.rows.filter((x) => CARDS.cards[x.ticker])) { assert.equal(c.prints[r.ticker].live, false); assert.equal(c.prints[r.ticker].text, r.prints, r.ticker + " on its card's close, not on an August price"); }
  assert.match(c.prints.MU.word, /6 Oct close/); assert.match(c.coreCap, /no fresh live price just now: every figure is on the card's close/); assert.equal(c.prints.MU.text, "6.0×");
  /* a stored row from today IS a price */
  const now = new Date().toISOString(), D = await openWith({ quotes: "down", stored: [{ ticker: "MU", price: 1000, updated_ts: now }] }); const d = await D.page.evaluate(read); await D.close();
  assert.equal(d.quotes, 1); assert.equal(d.prints.MU.live, true); assert.equal(d.prints.MU.text, (1000 / CARDS.cards.MU.fundamentals.fwd_eps).toFixed(1) + "×"); assert.equal(d.prints.GOOGL.live, false);
});
test("3 · the workflow shows the core candidates with their comps: one line under the brief, step 5b with the peers that price each, the picks with forward P/E, debt and peers", async () => {
  assert.deepEqual(a.core, CORE.names); assert.equal(a.coreRows.length, 10);
  for (const row of a.coreRows) { const c = CARDS.cards[row.sym], nice = (t) => ({ "000660.KS": "SK HYNIX", "005930.KS": "SAMSUNG", "285A.T": "KIOXIA" })[t] || t;
    assert.deepEqual(row.chips, c.comps.peers_priced.map(nice), row.sym + " names the peers that price it"); assert.equal(row.peers, c.peers.filter((p) => p.priced).length + 1, row.sym + ": its own row and one per peer that prices it");
    assert.ok(row.text.includes(a.prints[row.sym].text), row.sym + " prints its forward P/E"); assert.ok(/net cash|×/.test(row.text)); }
  for (const t of CORE.names) assert.ok(a.coreLine.includes(t), "the brief's core line names " + t); assert.match(a.coreLine, /GOOGL 24\.2× · −5%/); assert.match(a.coreLine, /MU 6\.0× · \+13%/);
  assert.match(a.picks, /FORWARD P\/E · the next four quarters/i); assert.match(a.picks, /NET DEBT ÷ EBITDA/i); assert.match(a.picks, /interest cover not on file/);
  assert.equal(a.muPeers.length, 7, "Micron and the six that price it"); assert.match(a.muPeers.join(" | "), /SK HYNIX .*≈3\.8×/); assert.match(a.muPeers.join(" | "), /SAMSUNG .*≈4\.1×/); assert.match(a.muPeers.join(" | "), /KIOXIA .*≈4\.2×/); assert.match(a.muPeers[0], /^MU 6\.0×/);
  assert.match(a.picks, /priced on SNDK, WDC, STX, SK hynix, Samsung, Kioxia/);
});
test("4 · seventeen sections with 5b CORE between the knockout and the picks; no internal code; text at 11px or more; nothing sideways on a phone", async () => {
  assert.equal(a.sections.length, 17); assert.deepEqual(a.sections.slice(8, 11), ["p-knockout", "p-core", "p-mix"]); assert.ok(a.bar.includes("5b CORE"));
  assert.deepEqual(a.codes, []); assert.equal(a.small, 0); assert.ok(a.width[0] <= a.width[1] + 1);
  await A.close();
  const M = await openWith({ quotes: closeOf, width: 390, height: 844 }); await M.page.evaluate(() => setFold("p-core", false)); await M.page.waitForTimeout(400); const m = await M.page.evaluate(read); await M.close();
  assert.ok(m.width[0] <= m.width[1] + 1, "the phone does not scroll sideways: " + m.width.join(" / ")); assert.equal(m.small, 0); assert.equal(m.coreRows.length, 10);
});
