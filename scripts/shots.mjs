/* PA6 — headless pictures at 1680 × 1050: each step one screen (the first screen with the way back and the sources line, 1 heat,
   2 how much, 3a sectors, 3b money, 4 cohorts, 5 the knockout — a line's bracket, the podium and the pick cards —, 6 picks and %),
   then every section folded and open. node scripts/shots.mjs <outdir> */
import fs from "node:fs"; import path from "node:path";
import { openPage } from "../tests/_harness.mjs";
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const SECS = [["p-brief","00-the-brief"],["p-heat","01-market-heat"],["p-howmuch","02-how-much"],["p-bowtie","03a-sectors"],["p-money","03b-money"],["p-cohorts","04-cohorts"],["p-knockout","05-knockout"],["p-mix","06-picks-and-pct"],["p-moves","07-the-moves"],["p-options","08-move-options"],["p-comps","09-comparables-cards"],["p-map","10-input-map"],["p-state","11-state-roadmap"],["p-trace","12-audit-trace"]];
const readout = [];
for (const [w, h] of [[1680, 1050]]) {
  const P = await openPage({ width: w, height: h });
  const { page } = P;
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${n}-${w}.png`) });
  const goTo = (id) => page.evaluate((id) => { window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + window.scrollY - 56 }); }, id);
  const open = async (id) => { await page.evaluate((id) => setFold(id, false), id); await goTo(id); await page.waitForTimeout(350); };
  const fold = async (id) => { await page.evaluate((id) => { setFold(id, true); document.querySelectorAll("#" + id + " details").forEach((d) => d.open = false); }, id); };
  await shot("first-screen");
  readout.push(await page.evaluate((w) => { const K = knockout(KO_COHORT); return w + ": " + document.getElementById("brief").innerText + "\nSOURCES " + document.querySelector("#dataspine summary").innerText + "\n" + blendTable().map((r) => r.key + " " + r.score.toFixed(2) + " " + sectorWord(r.score) + " (cap " + (r.cap == null ? "—" : r.cap.toFixed(2)) + " / eq " + (r.eq == null ? "—" : r.eq.toFixed(2)) + ")").join("\n") + "\nMONEY " + moneyRows().rows.map((r) => r.key + " " + (r.equity * 100).toFixed(1) + "%").join(" · ") + "\nKNOCKOUT " + KO_COHORT + ": " + K.lines.map((l) => l.line + " [" + l.scale.level + ":" + l.scale.name + " " + l.scale.members.length + "] " + l.entrants.map((e) => e.sym + " " + e.fund.score.toFixed(2)).join(", ") + " → " + (l.champion && l.champion.sym) + (l.unopposed ? " (unopposed)" : "") + " | " + l.rounds.map((ms, i) => "R" + (i + 1) + " " + ms.map((m) => m.winner.sym + (m.b ? ">" + m.loser.sym + (m.on === "timing" ? "(t)" : "") : "(bye)")).join(" ")).join(" | ")).join("\n  ") + "\nPODIUM " + K.podium.map((e) => e.sym + " " + e.line + " " + e.fund.score.toFixed(2)).join(" > "); }, w));
  await page.evaluate(() => { document.querySelector("#dataspine details").open = true; }); await page.waitForTimeout(250); await shot("sources-details-open"); await page.evaluate(() => { document.querySelector("#dataspine details").open = false; });
  await open("p-heat"); await shot("step-1-heat"); await fold("p-heat");
  await open("p-howmuch"); await shot("step-2-how-much"); await fold("p-howmuch");
  await open("p-bowtie"); await shot("step-3a-sectors"); await fold("p-bowtie");
  await open("p-money"); await shot("step-3b-money"); await fold("p-money");
  await open("p-cohorts"); await shot("step-4-cohorts"); await fold("p-cohorts");
  await open("p-knockout"); await shot("step-5-knockout-first-line");
  await page.evaluate(() => { const ls = document.querySelectorAll("#knockout .koline"); const l = [...ls].find((x) => x.querySelectorAll(".koround").length >= 2) || ls[0]; window.scrollTo({ top: l.getBoundingClientRect().top + window.scrollY - 70 }); }); await page.waitForTimeout(300); await shot("step-5-knockout-a-line-with-rounds");
  await page.evaluate(() => { const el = document.querySelector("#knockout .kopick"); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 160 }); }); await page.waitForTimeout(300); await shot("step-5-knockout-podium-and-picks");
  // KEEP the first pick with the write intercepted (no real row), picture the allocation, then DROP it again
  await page.evaluate(() => { window.writeDecision = async () => { throw new Error("pictures: write intercepted"); }; });
  await page.click("#knockout .kopick .swcard:first-child .swbtns button:last-child"); await page.waitForTimeout(400);
  await open("p-mix"); await shot("step-6-picks-and-their-pct");
  await page.click("#knockout .kopick .swcard:first-child .swbtns button:first-child"); await page.waitForTimeout(300);
  await page.evaluate(() => { PICKS.clear(); localStorage.removeItem("alloc-picks"); localStorage.removeItem("alloc-decisions"); setFold("p-mix", true); setFold("p-knockout", true); render(); });
  for (const [id, name] of SECS) {
    await page.evaluate((id) => { setFold(id, true); window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + window.scrollY - 56 }); }, id); await page.waitForTimeout(300); await shot(`${name}-folded`);
    await page.evaluate((id) => { setFold(id, false); document.querySelectorAll("#" + id + " details").forEach((d) => d.open = true); window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + window.scrollY - 56 }); }, id); await page.waitForTimeout(300);
    await shot(`${name}-open`);
    await fold(id);
  }
  await P.close();
}
fs.writeFileSync(path.join(OUT, "readout.txt"), readout.join("\n\n"));
console.log("pictures in", OUT, fs.readdirSync(OUT).length, "files");
