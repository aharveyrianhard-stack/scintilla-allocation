/* AL7 (6 Oct 2026) — headless pictures, before → after, at 1680 and 390. The same script shoots the page as it was (main @e8b2862,
   served from a scratch copy) and the page on this branch: the first screen, then each changed step unfolded, as the panel itself
   (the page's sticky bar is unpinned for the close-ups so it covers nothing). On the branch it also opens the new pieces: a voter
   family, the rows that cannot vote, the five methods of the sectors, a sector's branch (a State Street sector, a tree cohort, metals),
   the money with the full ranking open.
   node scripts/al7-shots.mjs <outdir> <before|after> */
import fs from "node:fs"; import path from "node:path";
import { openPage } from "../tests/_harness.mjs";
const OUT = process.argv[2], LABEL = process.argv[3] || "after"; fs.mkdirSync(OUT, { recursive: true });
const readout = {};
for (const [w, h] of [[1680, 1050], [390, 844]]) {
  const P = await openPage({ width: w, height: h }); const { page } = P;
  await page.waitForSelector("#cohort tr:nth-child(2)", { timeout: 120000 }).catch(() => {});
  await page.waitForFunction(() => document.getElementById("heatpast") && document.getElementById("heatpast").textContent.length > 0, null, { timeout: 60000 }).catch(() => {});
  if (LABEL === "after") await page.waitForFunction(() => window.AL7 && AL7.ready && AL7.ready(), null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const name = (n) => path.join(OUT, `${LABEL}-${n}-${w}.png`);
  await page.screenshot({ path: name("00-first-screen") });
  readout[w] = await page.evaluate(() => ({ heat: heat(), rung: policyStep(heat()), brief: document.getElementById("brief").innerText, voters: voters().filter(canVote).map((v) => [v.key, +v.val.toFixed(3), S.wts[v.key] ?? 0]), sleeves: Object.entries(sleeveShares()).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v * investedAt(heat()) * 100).toFixed(1)]), pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, al7: window.AL7 && AL7.readout ? AL7.readout() : null }));
  readout[w].errors = P.errors; readout[w].nonGet = P.nonGet;
  // close-ups: unpin sticky / fixed chrome so it never covers a panel, then shoot each panel unfolded
  await page.evaluate(() => { for (const el of document.querySelectorAll("#secbar, .scnav")) el.style.position = "static"; });
  const panel = async (id, n, prep) => { await page.evaluate((id) => { if (window.setFold) setFold(id, false); }, id); if (prep) await page.evaluate(prep); await page.waitForTimeout(700);
    const el = page.locator("#" + id); if (await el.count()) await el.screenshot({ path: name(n) }); await page.evaluate((id) => { if (window.setFold) setFold(id, true); }, id); };
  await panel("p-brief", "01-the-brief"); await page.evaluate(() => setFold("p-brief", false));
  await panel("p-heat", "02-heat-voters");
  await panel("p-howmuch", "03-how-much");
  await panel("p-bowtie", "04-sectors");
  await panel("p-money", "05-money-split");
  await panel("p-mix", "06-picks-and-mix");
  if (LABEL === "after") {
    await panel("p-heat", "12-heat-families-open", () => { for (const f of ["breadth", "sentiment"]) { const d = document.querySelector("#gauges details.fam[data-fam=" + f + "]"); if (d) d.open = true; } });
    await panel("p-heat", "13-heat-not-voting-open", () => { document.querySelectorAll("#gauges details.fam").forEach((d) => d.open = false); const d = document.getElementById("notvoting"); if (d) d.open = true; });
    await page.evaluate(() => { const d = document.getElementById("notvoting"); if (d) d.open = false; });
    const branch = async (key, n) => { await page.evaluate((k) => { setFold("p-bowtie", false); if (BRANCH !== k) AL7.openBranch(k); }, key); await page.waitForTimeout(2500);   /* the names' prices are read when the branch opens */
      const el = page.locator("#branch .a7-branch"); if (await el.count()) await el.screenshot({ path: name(n) }); };
    await branch("DISCRET", "15-branch-consumer-discretionary");
    await branch("TECH", "16-branch-technology");
    const ai = await page.evaluate(() => { const T = treeSleeveRows().map((r) => r.key); return T.includes("MEMORY_STORAGE") ? "MEMORY_STORAGE" : T[0]; });
    if (ai) await branch(ai, "17-branch-tree-cohort-" + ai.toLowerCase().replace(/_/g, "-"));
    await branch("METALS", "18-branch-metals-the-commodity");
    await page.evaluate(() => { const d = document.querySelector("#branch details"); if (d) d.open = true; }); await page.waitForTimeout(300);
    { const el = page.locator("#branch .a7-branch"); if (await el.count()) await el.screenshot({ path: name("19-branch-metals-miners-open") }); }
    await page.evaluate(() => { if (BRANCH) AL7.openBranch(BRANCH); });
    { await page.evaluate(() => setFold("p-bowtie", false)); await page.waitForTimeout(400); const el = page.locator("#treeroll"); if (await el.count()) await el.screenshot({ path: name("14-how-the-blend-is-made") }); await page.evaluate(() => setFold("p-bowtie", true)); }
    await panel("p-money", "20-money-full-ranking-open", () => { document.querySelectorAll("#moneysplit details").forEach((d) => d.open = true); });
  }
  await P.close();
}
fs.writeFileSync(path.join(OUT, `${LABEL}-readout.json`), JSON.stringify(readout, null, 1));
console.log("pictures in", OUT, fs.readdirSync(OUT).filter((f) => f.startsWith(LABEL)).length, "files");
