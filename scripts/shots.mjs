/* PA4 — headless pictures at 1680 × 1050 and 1920 × 1080: the first screen, each section folded and open, the dial drawer,
   the cards. node scripts/shots.mjs <outdir> */
import fs from "node:fs"; import path from "node:path";
import { openPage } from "../tests/_harness.mjs";
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const SECS = [["p-brief","00-the-brief"],["p-heat","01-macro-heat"],["p-mix","02-target-mix"],["p-moves","03-the-moves"],["p-options","04-move-options"],["p-comps","05-comparables-cards"],["p-map","06-input-map"],["p-state","07-state-roadmap"],["p-trace","08-audit-trace"]];
const readout = [];
for (const [w, h] of [[1680, 1050], [1920, 1080]]) {
  const P = await openPage({ width: w, height: h });
  const { page } = P;
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${n}-${w}.png`) });
  await shot("first-screen");
  readout.push(await page.evaluate((w) => w + ": " + document.getElementById("brief").innerText + "\n" + document.getElementById("mixdial").innerText + "\n" + [...document.querySelectorAll("#gauges .gauge")].map((g) => g.innerText.replace(/\n/g, " · ")).join("\n"), w));
  await page.click('#secbar button[data-sec="p-inputs"]'); await page.waitForTimeout(400); await shot("dial-drawer"); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  for (const [id, name] of SECS) {
    await page.evaluate((id) => { setFold(id, true); window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + window.scrollY - 56 }); }, id); await page.waitForTimeout(350); await shot(`${name}-folded`);
    await page.evaluate((id) => { setFold(id, false); document.querySelectorAll("#" + id + " details").forEach((d) => d.open = true); window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + window.scrollY - 56 }); }, id); await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT, `${name}-open-${w}.png`), fullPage: false });
    await page.evaluate((id) => { setFold(id, true); document.querySelectorAll("#" + id + " details").forEach((d) => d.open = false); }, id);
  }
  await page.evaluate(() => { window.scrollTo({ top: document.getElementById("p-comps").getBoundingClientRect().top + window.scrollY - 56 }); }); await page.waitForTimeout(300); await shot("the-cards");
  await page.evaluate(() => setMixMethod("TREE")); await page.waitForTimeout(300); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200); await shot("dial-on-tree");
  await page.evaluate(() => setMixMethod("MIX"));
  await P.close();
}
fs.writeFileSync(path.join(OUT, "readout.txt"), readout.join("\n\n"));
console.log("pictures in", OUT, fs.readdirSync(OUT).length, "files");
