/* AL8 (7 Oct 2026) — headless pictures, before → after, at 1680 and 390. The same script shoots the page as it was (the evening of 6 Oct,
   @39e3667, served from a scratch copy that this file is copied into) and the page on this branch: the first screen, then each changed
   part as the panel itself (the sticky bar unpinned for the close-ups so it covers nothing; INPUTS laid flat so the whole drawer is in one
   picture). On the branch it also opens what is new: the same five markets as numbers, the list for removal, a kept name waiting for a
   size, Micron's own line of the knockout. Every non-GET is blocked and counted.
   node scripts/al8-shots.mjs <outdir> <before|after> */
import fs from "node:fs"; import path from "node:path";
import { openPage } from "../tests/_harness.mjs";
const OUT = process.argv[2], LABEL = process.argv[3] || "after"; fs.mkdirSync(OUT, { recursive: true });
const readout = {};
for (const [w, h] of [[1680, 1050], [390, 844]]) {
  const P = await openPage({ width: w, height: h }); const { page } = P;
  try {
    await page.waitForSelector("#cohort tr:nth-child(2)", { timeout: 120000 }).catch(() => {});
    await page.waitForFunction(() => window.AL7 && AL7.ready && AL7.ready(), null, { timeout: 120000 }).catch(() => {});
    if (LABEL === "after") await page.waitForFunction(() => window.AL8 && AL8.ready(), null, { timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const name = (n) => path.join(OUT, `${LABEL}-${n}-${w}.png`);
    await page.screenshot({ path: name("00-first-screen") });
    readout[w] = await page.evaluate(() => ({ heat: heat(), rung: policyStep(heat()), pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, sections: [...document.querySelectorAll(".grid > .panel")].map((p) => p.id),
      inputs: [...document.querySelectorAll("#p-inputs input, #p-inputs button")].filter((e) => e.id).map((e) => e.id), al7: window.AL7 && AL7.readout ? AL7.readout() : null, al8: window.AL8 ? AL8.readout() : null,
      mu: (typeof COMPS !== "undefined" && COMPS.MU) ? { rev_growth: COMPS.MU.rev_growth, fwd_pe: COMPS.MU.fwd_pe, pe: COMPS.MU.pe, ps: COMPS.MU.ps, feed: COMPS.MU.feed || null, card: COMPS.MU.card || null } : null }));
    readout[w].errors = P.errors; readout[w].nonGet = P.nonGet;
    // close-ups: unpin sticky / fixed chrome so it never covers a panel, then shoot each panel unfolded
    await page.evaluate(() => { for (const el of document.querySelectorAll("#secbar, .scnav")) el.style.position = "static"; });
    const panel = async (id, n, prep) => { if (!(await page.locator("#" + id).count())) return; await page.evaluate((id) => setFold(id, false), id); if (prep) await page.evaluate(prep); await page.waitForTimeout(700);
      await page.locator("#" + id).screenshot({ path: name(n) }); await page.evaluate((id) => setFold(id, true), id); };
    const part = async (sel, n) => { const el = page.locator(sel).first(); if (await el.count()) await el.screenshot({ path: name(n) }); };
    await panel("p-scen", "01-the-money-in-five-markets"); await page.evaluate(() => { if (document.getElementById("p-scen")) setFold("p-scen", false); });
    await panel("p-brief", "02-the-brief"); await page.evaluate(() => setFold("p-brief", false));
    /* INPUTS, the whole drawer in one picture: laid flat in the page for the shot, then put back */
    await page.evaluate(() => { const d = document.getElementById("p-inputs"); d.dataset.css = d.style.cssText; d.style.cssText = "position:static;transform:none;height:auto;width:" + Math.min(620, innerWidth - 24) + "px;box-shadow:none;overflow:visible"; document.querySelectorAll("#p-inputs details").forEach((x) => (x.open = false)); });
    await page.waitForTimeout(400); await part("#p-inputs", "03-inputs");
    if (LABEL === "after") { await page.evaluate(() => { document.getElementById("in-remove").open = true; }); await page.waitForTimeout(300); await part("#in-remove", "04-inputs-listed-for-removal"); await page.evaluate(() => { document.getElementById("in-remove").open = false; }); }
    await page.evaluate(() => { const d = document.getElementById("p-inputs"); d.style.cssText = d.dataset.css || ""; });
    await panel("p-money", "05-how-the-money-splits");
    await panel("p-mix", "06-the-picks");
    await page.evaluate(() => setFold("p-knockout", false)); await page.waitForTimeout(500);
    await part("#knockout .kopick", "07-knockout-the-pick-cards"); await part("#knockout .komatch", "08-knockout-a-duel");
    await page.evaluate(() => setFold("p-knockout", true));
    await panel("p-map", "09-what-each-input-moves", () => { document.querySelectorAll("#p-map details").forEach((d) => { if (d.querySelector("#imap") && !document.getElementById("auditmap")) d.open = true; }); });
    await panel("p-moves", "10-the-moves");
    if (LABEL === "after") {
      await panel("p-scen", "11-five-markets-as-numbers", () => { const d = document.querySelector("#scenbars details.a8-num"); if (d) d.open = true; });
      await page.evaluate(() => { const d = document.querySelector("#scenbars details.a8-num"); if (d) d.open = false; setFold("p-scen", false); });
      /* a name kept in the knockout: on the list, no money until it has a size (in memory only — nothing is stored or written) */
      await page.evaluate(() => { PICKS.add("NVDA"); render(); }); await panel("p-mix", "12-a-kept-name-waits-for-a-size"); await page.evaluate(() => { PICKS.delete("NVDA"); render(); });
      /* Micron's own cohort in the knockout: its business line, with the cards' readings */
      const home = await page.evaluate(() => { const c = cohortBoard().find((x) => x.names.includes("MU")); if (!c) return null; window.__ko = KO_COHORT; KO_COHORT = c.key; render(); setFold("p-knockout", false); const K = knockout(c.key), e = K.entrants.find((x) => x.sym === "MU"); return e ? e.line : null; });
      if (home) { await page.waitForTimeout(600); await part('#knockout .koline[data-line="' + home + '"]', "13-knockout-microns-line"); }
      await page.evaluate(() => { if (window.__ko !== undefined) { KO_COHORT = window.__ko; render(); } setFold("p-knockout", true); });
    }
    console.log(w, LABEL, "errors", P.errors.length, "non-GET blocked", P.nonGet.blocked);
  } finally { await P.close(); }
}
fs.writeFileSync(path.join(OUT, `${LABEL}-readout.json`), JSON.stringify(readout, null, 1));
console.log("pictures in", OUT, fs.readdirSync(OUT).filter((f) => f.startsWith(LABEL)).length, "files");
