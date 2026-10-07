/* CP5 (7 Oct 2026) · the tool on the comps engine's two fixes: the cards ARE the engine's (the morning's cards no longer win a
   tie-break), a centre that is not a target says so on the card table and in the click-through, and the click-through lists the
   outlier rule's cases — who is left out for being priced far above the group, which cheap peer stays. */
import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync, existsSync } from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { openPage } from "./_harness.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), S = readFileSync(ROOT + "/index.html", "utf8"), J = (p) => JSON.parse(readFileSync(ROOT + "/" + p, "utf8"));
const CARDS = J("data/comps-engine/cards.json"), SIX_OCT = CARDS.as_of.card_date === "2026-10-06" ? {} : { skip: "the cards are from another close; this test names 6 Oct figures" };
test("the engine's cards carry a re-priced stamp, so the tool's own rule keeps them over the morning's cards", () => {
  assert.ok(CARDS.as_of.repriced && String(CARDS.as_of.repriced) > "2026-10-07", "re-priced " + CARDS.as_of.repriced);
  assert.match(S, /got\.sort\(\(a,b\)=>String\(b\.as_of\|\|''\)\.localeCompare\(String\(a\.as_of\|\|''\)\)\|\|String\(b\.repriced\|\|''\)\.localeCompare\(String\(a\.repriced\|\|''\)\)\|\|a\.order-b\.order\);/, "the rule itself is unchanged: newest card date, newest re-pricing, then the list's order"); });
test("the local copies are this round's: the card, the reading and the Hub's files agree (when the Hub worktree is beside this one)", () => {
  const hub = ROOT.replace(/_worktrees\/.*$/, "_worktrees/hub-cp5-comps-default-20261007/deliverables/20261007/comps-engine/data"); if (!existsSync(hub)) return;
  assert.equal(readFileSync(ROOT + "/data/comps-engine/cards.json", "utf8"), readFileSync(hub + "/cards.json", "utf8"), "cards.json");
  for (const t of ["NVDA", "AVGO", "GOOGL", "MU", "ORCL", "QCOM", "ARM"]) assert.equal(readFileSync(`${ROOT}/data/comps-engine/names/${t}.json`, "utf8"), readFileSync(`${hub}/names/${t}.json`, "utf8"), t); });
test("the card and the click-through are one number, and the not-a-target line is the same words on both", SIX_OCT, () => {
  for (const t of ["GOOGL", "AMZN", "AVGO", "NVDA", "TSM", "VST", "MU", "ORCL", "DLR", "EQIX", "SNDK", "WDC"]) { const r = J(`data/comps-engine/names/${t}.json`), c = CARDS.cards[t];
    assert.equal(c.comps.centre, r.blend.centre, t + " centre"); assert.equal(c.comps.upside_pct, r.blend.upside_pct, t + " upside"); assert.equal(c.comps.not_a_target, r.not_a_target ? r.not_a_target.words : null, t + " line"); }
  assert.ok(CARDS.cards.NVDA.comps.not_a_target && CARDS.cards.ORCL.comps.not_a_target && !CARDS.cards.MU.comps.not_a_target); });
test("headless: the card table is the engine's, Nvidia's row says NOT A TARGET, and the click-through shows the line and the outlier cases", SIX_OCT, async () => {
  const { page, errors, nonGet, close } = await openPage({ width: 1680, height: 1050 });
  try {
    const src = await page.evaluate(() => ({ src: CARDS && CARDS.src, n: CARDS && Object.keys(CARDS.cards).length, nvda: cardOf("NVDA") && cardOf("NVDA").comps.upside_pct }));
    assert.match(String(src.src), /comps-engine\/(data\/)?cards\.json$/, "the cards in use are the engine's: " + src.src); assert.equal(src.nvda, CARDS.cards.NVDA.comps.upside_pct);
    const row = await page.evaluate(() => { const r = document.querySelector('#core tr[data-sym="NVDA"]'), m = document.querySelector('#core tr[data-sym="MU"]'); return { nvda: r ? r.querySelector("td").innerText : null, mu: m ? m.querySelector("td").innerText : null }; });
    assert.match(String(row.nvda), /NOT A TARGET/); assert.ok(row.mu && !/NOT A TARGET/.test(row.mu), "Micron carries no such tag");
    await page.evaluate(() => C4.open("NVDA")); await page.waitForFunction(() => document.querySelector("#c4body .nat"), null, { timeout: 30000 });
    const nv = await page.evaluate(() => ({ nat: document.querySelector("#c4body .nat").innerText, text: document.getElementById("c4body").innerText }));
    assert.match(nv.nat, /^NOT A TARGET · Every company that shares Nvidia's business here is a fraction of its size/); assert.ok(!/· Not a target\./.test(nv.text), "the line is not printed a second time among the flags");
    assert.ok(/OUTLIERS · expensive ones only/.test(nv.text) && /Arm is left out: it is priced far above the group/.test(nv.text)); assert.ok(!/\bevenings?\b/i.test(nv.text), "trading days, not evenings");
    assert.ok(/PEG\s+0\.33/.test(nv.text.replace(/ /g, " ")), "the PEG printed is forward P/E ÷ growth"); assert.ok(/growth counted to 30%/.test(nv.text));
    await page.evaluate(() => C4.open("AVGO")); await page.waitForFunction(() => /AVGO · COMPS/.test(document.getElementById("c4title").textContent) && document.querySelector("#c4body .case"), null, { timeout: 30000 });
    const av = await page.evaluate(() => ({ cases: [...document.querySelectorAll("#c4body .case")].map((e) => e.innerText), nat: !!document.querySelector("#c4body .nat"), kept: [...document.querySelectorAll("#c4body tr")].filter((r) => /QCOM/.test(r.innerText)).map((r) => r.innerText.replace(/\s+/g, " "))[0] || "" }));
    assert.ok(av.cases.some((c) => /^LEFT OUT\s*Arm is left out/.test(c)), "Arm: " + av.cases[0]); assert.ok(av.cases.some((c) => /^KEPT\s*Qualcomm stays in: it is priced far below the group/.test(c)), "Qualcomm is kept, with the reason");
    assert.equal(av.nat, false, "Broadcom's centre does not rest on the growth yardstick at this cap"); assert.match(av.kept, /cheap: kept/);
    assert.equal(nonGet.allowed, 0, "no write left the page"); assert.deepEqual(errors.filter((e) => !/ResizeObserver|chart-api|Failed to fetch|NetworkError|Load failed/.test(e)), [], "no page error");
  } finally { await close(); } });
test("headless: the comps sheet is closed when the page loads, opens on a ticker, and closes again — it never covers the tool by itself", async () => {
  const { page, close } = await openPage({ width: 1680, height: 1050 });
  try {
    const shown = () => page.evaluate(() => { const d = document.getElementById("c4drawer"), r = d.getBoundingClientRect(); return { display: getComputedStyle(d).display, area: r.width * r.height, top: (document.elementFromPoint(840, 500) || {}).id || (document.elementFromPoint(840, 500) || {}).className || "" }; });
    const atLoad = await shown(); assert.equal(atLoad.display, "none", "closed at load: " + JSON.stringify(atLoad)); assert.equal(atLoad.area, 0); assert.ok(!/c4-/.test(String(atLoad.top)), "the middle of the page is the tool, not the sheet");
    await page.evaluate(() => C4.open("MU")); await page.waitForFunction(() => document.querySelector("#c4body .sec table"), null, { timeout: 30000 }); const open = await shown(); assert.equal(open.display, "flex"); assert.ok(open.area > 0);
    await page.keyboard.press("Escape"); const esc = await shown(); assert.equal(esc.display, "none", "Escape closes it");
    await page.evaluate(() => C4.open("MU")); await page.waitForFunction(() => getComputedStyle(document.getElementById("c4drawer")).display === "flex", null, { timeout: 30000 }); await page.evaluate(() => C4.close()); assert.equal((await shown()).display, "none", "CLOSE closes it");
  } finally { await close(); } });
test("what Alan reads in the click-through carries no internal codes", () => {
  const a = S.indexOf("const C4 = (() => {"), b = S.indexOf("  async function open(sym)", a), drawn = S.slice(a, b).replace(/\/\*[\s\S]*?\*\//g, "").replace(/r\.sets\.cp3|cp3/g, "");   // the code's own comments are not drawn
  assert.ok(!/\b(CP\d|C6b?|v[12]|rung)\b/.test(drawn) && !/\bevenings?\b/.test(drawn)); });
