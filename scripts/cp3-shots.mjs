/* CP3 (7 Oct 2026) — headless pictures of what the one forward P/E and the core candidates' comps look like in the tool, at 1680
   and 390: the first screen, the brief with the core line, step 5b (the core candidates, two of them with their peers open), the
   knockout's pick card with its value line, and the picks with their two new cells and the peers that price them. Every non-GET is
   blocked and counted. Also writes what the page prints for every card's forward P/E on the card's own close, for the test table.
   node scripts/cp3-shots.mjs <outdir> */
import fs from "node:fs"; import path from "node:path";
import { openPage } from "../tests/_harness.mjs";
const OUT = process.argv[2] || "study/cp3/pictures"; fs.mkdirSync(OUT, { recursive: true });
const readout = {};
for (const [w, h] of [[1680, 1050], [390, 844]]) {
  const P = await openPage({ width: w, height: h }); const { page } = P;
  try {
    await page.waitForSelector("#cohort tr:nth-child(2)", { timeout: 120000 }).catch(() => {});
    await page.waitForFunction(() => window.AL7 && AL7.ready && AL7.ready(), null, { timeout: 120000 }).catch(() => {});
    await page.waitForFunction(() => window.AL8 && AL8.ready(), null, { timeout: 120000 }).catch(() => {});
    await page.waitForFunction(() => typeof coreNames === "function" && coreNames().length > 0 && document.querySelector("#coretab"), null, { timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const name = (n) => path.join(OUT, `${w}-${n}.png`);
    await page.screenshot({ path: name("00-first-screen") });
    readout[w] = await page.evaluate(() => ({ pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, sections: [...document.querySelectorAll(".grid > .panel")].map((p) => p.id), cards: CARDS && { n: Object.keys(CARDS.cards).length, as_of: CARDS.as_of, repriced: CARDS.repriced, src: CARDS.src, served: !!CARDS.served },
      core: coreNames(), core_rows: document.querySelectorAll("#coretab tbody tr[data-sym]").length,
      prints_on_the_cards_close: Object.fromEntries(Object.values(CARDS.cards).map((c) => [c.ticker, cardForward(c, +c.price).text])),
      prints_live: Object.fromEntries(coreNames().map((s) => { const q = QUOTES[s] || {}; return [s, { price: q.price ?? null, text: cardForward(cardOf(s), q.price != null ? +q.price : null).text }]; })),
      knockout_rows_on_card: Object.entries(COMPS).filter(([, r]) => r && r.card && r.card.fields.includes("fwd_pe")).length, mu: COMPS.MU ? { fwd_pe: COMPS.MU.fwd_pe, card: COMPS.MU.card || null } : null,
      smallest_font_px: Math.min(...[...document.querySelectorAll("#core *, .c3-peers *, .c3-core *")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize))),
      under_11px: [...new Set([...document.querySelectorAll("#core *, .c3-peers *, .c3-core *")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).map((e) => e.tagName + "." + e.className))].slice(0, 6),
      price_source: (typeof SPINE !== "undefined" && SPINE.quotes) ? SPINE.quotes : null, any_live_core_price: coreNames().some((s) => livePrice(s) != null),
      prints_now: Object.fromEntries(coreNames().map((s) => { const u = priceUnder(s); return [s, { price: u.price, live: u.live, text: cardForward(cardOf(s), u.price).text }]; })),
      internal_codes: (document.querySelector("#p-core").innerText.match(/\b(CP[123]|KO1|FD1|AL[78]|C5b?|C6b?)\b/g) || []).slice(0, 5) }));
    readout[w].errors = P.errors; readout[w].nonGet = P.nonGet;
    await page.evaluate(() => { for (const el of document.querySelectorAll("#secbar, .scnav")) el.style.position = "static"; });
    const open = async (id) => { await page.evaluate((id) => setFold(id, false), id); await page.waitForTimeout(600); };
    await open("p-brief"); await page.locator("#p-brief").screenshot({ path: name("01-the-brief-with-the-core-line") });
    await open("p-core"); await page.locator("#p-core").screenshot({ path: name("02-the-core-candidates") });
    await page.evaluate(() => { for (const s of ["GOOGL", "AVGO"]) { const r = document.querySelector('#coretab tr[data-sym="' + s + '"]'); if (r && r.nextElementSibling) { const d = r.nextElementSibling.querySelector("details"); if (d) d.open = true; } } });
    await page.waitForTimeout(400); await page.locator("#p-core").screenshot({ path: name("03-core-with-alphabet-and-broadcom-peers-open") });
    readout[w].core_panel_width = await page.evaluate(() => ({ panel: document.getElementById("p-core").scrollWidth, table: document.getElementById("coretab").scrollWidth, page: document.documentElement.scrollWidth, viewport: innerWidth }));
    await page.evaluate(() => setFold("p-core", true));
    await open("p-mix"); await page.locator("#picks").screenshot({ path: name("04-the-picks-with-forward-pe-debt-and-peers") }); await page.evaluate(() => setFold("p-mix", true));
    await open("p-knockout"); const kp = page.locator("#knockout .kopick").first(); if (await kp.count()) await kp.screenshot({ path: name("05-knockout-pick-card-with-its-value-line") });
    await page.evaluate(() => setFold("p-knockout", true));
  } finally { await P.close(); }
}
fs.writeFileSync(path.join(OUT, "readout.json"), JSON.stringify(readout, null, 1));
for (const w of Object.keys(readout)) { const r = readout[w]; console.log(w, "· cards", JSON.stringify(r.cards), "· core rows", r.core_rows, "· page", r.pageWidth, "/", r.viewport, "· errors", r.errors.length, "· non-GET blocked", r.nonGet.blocked, "· smallest font", r.smallest_font_px, "· codes", JSON.stringify(r.internal_codes), "· knockout rows on a card's forward P/E", r.knockout_rows_on_card, "· core panel", JSON.stringify(r.core_panel_width)); }
console.log("prints now:", JSON.stringify(readout[1680].prints_now)); console.log("price source:", JSON.stringify(readout[1680].price_source), "· any live core price:", readout[1680].any_live_core_price, "· under 11px:", JSON.stringify(readout[1680].under_11px));
