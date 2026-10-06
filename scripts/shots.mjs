/* PA5 — headless pictures at 1680 × 1050 and 1920 × 1080: the first screen, the bow tie, one knockout round (the final), the picks,
   the dial drawer, and each section folded and open. node scripts/shots.mjs <outdir> */
import fs from "node:fs"; import path from "node:path";
import { openPage } from "../tests/_harness.mjs";
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const SECS = [["p-brief","00-the-brief"],["p-heat","01-market-heat"],["p-howmuch","02-how-much"],["p-bowtie","03-blended-bow-tie"],["p-cohorts","04-cohorts"],["p-knockout","05-knockout"],["p-mix","06-picks-and-pct"],["p-moves","07-the-moves"],["p-options","08-move-options"],["p-comps","09-comparables-cards"],["p-map","10-input-map"],["p-state","11-state-roadmap"],["p-trace","12-audit-trace"]];
const readout = [];
for (const [w, h] of [[1680, 1050], [1920, 1080]]) {
  const P = await openPage({ width: w, height: h });
  const { page } = P;
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${n}-${w}.png`) });
  const goTo = (id) => page.evaluate((id) => { window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + window.scrollY - 56 }); }, id);
  await shot("first-screen");
  readout.push(await page.evaluate((w) => w + ": " + document.getElementById("brief").innerText + "\n" + document.getElementById("mixdial").innerText + "\n" + document.getElementById("bowtie").innerText.split("\n").slice(0, 2).join(" · ") + "\n" + blendTable().map((r) => r.key + " " + r.score.toFixed(2) + " (cap " + (r.cap == null ? "—" : r.cap.toFixed(2)) + " / eq " + (r.eq == null ? "—" : r.eq.toFixed(2)) + (r.missing.length ? "; missing " + r.missing.join(",") : "") + ")").join("\n") + "\n" + [...document.querySelectorAll("#gauges .gauge")].map((g) => g.innerText.replace(/\n/g, " · ")).join("\n") + "\nKNOCKOUT " + KO_COHORT + ": " + knockout(KO_COHORT).rounds.map((ms, i) => "R" + (i + 1) + " " + ms.map((m) => m.winner.sym + (m.b ? ">" + (m.loser && m.loser.sym) : "(bye)")).join(" ")).join(" | "), w));
  await page.click('#secbar button[data-sec="p-inputs"]'); await page.waitForTimeout(400); await shot("dial-drawer"); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  // the bow tie
  await page.evaluate(() => setFold("p-bowtie", false)); await goTo("p-bowtie"); await page.waitForTimeout(350); await shot("the-bow-tie");
  await page.evaluate(() => { document.querySelectorAll("#p-bowtie details").forEach((d) => d.open = true); }); await goTo("p-bowtie"); await page.waitForTimeout(300); await shot("the-bow-tie-five-readings");
  await page.evaluate(() => { setFold("p-bowtie", true); document.querySelectorAll("#p-bowtie details").forEach((d) => d.open = false); });
  // one knockout round — the final, with the bracket scrolled to its right end
  await page.evaluate(() => setFold("p-knockout", false)); await goTo("p-knockout"); await page.waitForTimeout(300); await shot("knockout-round-1");
  await page.evaluate(() => { const b = document.querySelector("#knockout .kobracket"); b.scrollLeft = b.scrollWidth; }); await page.waitForTimeout(300); await shot("knockout-the-final");
  await page.evaluate(() => { const el = document.querySelector("#knockout .kopick"); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120 }); }); await page.waitForTimeout(300); await shot("knockout-the-picks-cards");
  // the picks: KEEP the champion with the write intercepted (no real row), picture the allocation, then DROP it again
  await page.evaluate(() => { window.writeDecision = async () => { throw new Error("pictures: write intercepted"); }; });
  await page.click("#knockout .kopick .swcard:first-child .swbtns button:last-child"); await page.waitForTimeout(400);
  await page.evaluate(() => setFold("p-mix", false)); await goTo("p-mix"); await page.waitForTimeout(350); await shot("the-picks-and-their-pct");
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(250); await shot("first-screen-with-a-pick");
  await page.click("#knockout .kopick .swcard:first-child .swbtns button:first-child"); await page.waitForTimeout(300);
  await page.evaluate(() => { PICKS.clear(); localStorage.removeItem("alloc-picks"); localStorage.removeItem("alloc-decisions"); setFold("p-mix", true); setFold("p-knockout", true); render(); });
  for (const [id, name] of SECS) {
    await page.evaluate((id) => { setFold(id, true); window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + window.scrollY - 56 }); }, id); await page.waitForTimeout(350); await shot(`${name}-folded`);
    await page.evaluate((id) => { setFold(id, false); document.querySelectorAll("#" + id + " details").forEach((d) => d.open = true); window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + window.scrollY - 56 }); }, id); await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT, `${name}-open-${w}.png`), fullPage: false });
    await page.evaluate((id) => { setFold(id, true); document.querySelectorAll("#" + id + " details").forEach((d) => d.open = false); }, id);
  }
  await P.close();
}
fs.writeFileSync(path.join(OUT, "readout.txt"), readout.join("\n\n"));
console.log("pictures in", OUT, fs.readdirSync(OUT).length, "files");
