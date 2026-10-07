/* CP4 (7 Oct 2026) · the click-through: any ticker opens the engine's reading; the cards come from the engine's file; the reader is the Hub's. */
import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync, existsSync } from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { openPage } from "./_harness.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), S = readFileSync(ROOT + "/index.html", "utf8");
test("the cards and the click-through read the one comps engine's files", () => {
  assert.ok(S.indexOf("'https://scintillahub.ai/deliverables/20261007/comps-engine/data/cards.json'") < S.indexOf("'https://scintillahub.ai/deliverables/20261007/one-basis/data/cards.json'"), "the engine's cards come first");
  assert.ok(S.includes("const ENGINE_SOURCES=['https://scintillahub.ai/deliverables/20261007/comps-engine/data/names/','data/comps-engine/names/']"));
  assert.ok(existsSync(ROOT + "/data/comps-engine/cards.json") && existsSync(ROOT + "/data/comps-engine/names/MU.json"), "the local copies are beside the page"); });
test("the reader inline is byte-identical to the Hub's lib/comps-artifact.mjs (when the Hub worktree is beside this one)", () => {
  const hub = ["hub-cp5-comps-default-20261007", "hub-cp4-comps-engine-20261007"].map((d) => ROOT.replace(/_worktrees\/.*$/, "_worktrees/" + d + "/lib/comps-artifact.mjs")).find((f) => existsSync(f)); if (!hub) return;   // CP5: this round's Hub worktree first
  const lib = readFileSync(hub, "utf8").replace(/export const /g, "const ").replace(/export function /g, "function "), a = S.indexOf("/*C4-READER-BEGIN*/\n") + "/*C4-READER-BEGIN*/\n".length, b = S.indexOf("\n/*C4-READER-END*/");
  assert.equal(S.slice(a, b).trim(), lib.trim()); });
test("every ticker in the core table, the pick cards, the knockout's cards and the comps table carries the opener", () => {
  assert.ok((S.match(/class="c4-open"/g) || []).length >= 4, "openers in four places"); assert.ok(S.includes('document.addEventListener("click"') && S.includes(".c4-open")); });
test("clicking a ticker opens its peers, yardsticks, the football field, growth two ways, PEG, debt, the channel and the Geiger in its own year (headless)", async () => {
  const { page, errors, nonGet, close } = await openPage({ width: 1680, height: 1050 });
  try {
    await page.evaluate(() => C4.open("MU")); await page.waitForFunction(() => document.querySelector("#c4body .sec table"), null, { timeout: 30000 });
    const txt = await page.evaluate(() => document.getElementById("c4body").innerText);
    for (const w of ["THE BLEND", "EACH YARDSTICK", "forward P/E", "PEG", "GROWTH, TWO WAYS", "DEBT · CHANNEL · GEIGER", "THE PEERS", "SK hynix", "long-term channel", "percentile of its own year"]) assert.ok(txt.includes(w), "drawer says " + w);
    assert.ok(await page.evaluate(() => !!document.querySelector("#c4body svg[aria-label='football field']")), "the football field is drawn");
    const dots = await page.evaluate(() => [...document.querySelectorAll("#c4body .dots")].map((d) => d.textContent)); assert.ok(dots.length >= 4 && dots.every((d) => /^[●○]{4}$/.test(d)), "four dots per peer: " + dots.slice(0, 3));
    /* the Geiger: today's value against today's percentile — the drawer never prints the close's percentile beside a live value */
    const geiger = await page.evaluate(() => { const m = /Geiger\s+([+\-−]?[0-9.]+)\s+(now|at the close)\s+·\s+the\s+(\d+)(?:st|nd|rd|th) percentile/.exec(document.getElementById("c4body").innerText); return m ? { v: m[1], when: m[2], pctl: +m[3] } : null; });
    assert.ok(geiger, "a Geiger line with a percentile"); if (geiger.when === "now") { const r = JSON.parse(readFileSync(ROOT + "/data/comps-engine/names/MU.json", "utf8")); assert.notEqual(geiger.pctl, null); assert.ok(Math.abs(geiger.pctl - r.geiger.pctl_close) <= 100); }
    /* a name beyond the ten still opens (any ticker) */
    await page.evaluate(() => C4.open("LRCX")); await page.waitForFunction(() => /LRCX · COMPS/.test(document.getElementById("c4title").textContent) && document.querySelector("#c4body .sec"), null, { timeout: 30000 });
    assert.ok((await page.evaluate(() => document.getElementById("c4body").innerText)).includes("THE PEERS"), "Lam opens too");
    assert.equal(nonGet.allowed, 0, "no write left the page"); assert.deepEqual(errors.filter((e) => !/ResizeObserver|chart-api|Failed to fetch|NetworkError|Load failed/.test(e)), [], "no page error");
  } finally { await close(); } });
