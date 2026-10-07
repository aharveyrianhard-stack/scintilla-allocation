/* CP4 · pictures, headless, one page at a time: the tool's click-through at 1680 and 390. Writes into the Hub worktree's comps-engine/shots. */
import { openPage } from "../tests/_harness.mjs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), SHOTS = ROOT.replace(/_worktrees\/.*$/, "_worktrees/hub-cp4-comps-engine-20261007/deliverables/20261007/comps-engine/shots");
for (const [w, h, sym, file] of [[1680, 1050, "MU", "tool-1680-mu.png"], [1680, 1050, "LRCX", "tool-1680-lrcx.png"], [390, 844, "MU", "tool-390-mu.png"]]) {
  const { page, close } = await openPage({ width: w, height: h });
  try { await page.evaluate((s) => C4.open(s), sym); await page.waitForFunction(() => document.querySelector("#c4body .sec table"), null, { timeout: 60000 }); await page.waitForTimeout(800);
    const facts = await page.evaluate(() => { const b = document.getElementById("c4body"); return { text: b.innerText.slice(0, 400), overflow: document.documentElement.scrollWidth > window.innerWidth, small: [...b.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11).length, svg: !!b.querySelector("svg") }; });
    await page.screenshot({ path: `${SHOTS}/${file}`, fullPage: false }); console.log(file, JSON.stringify({ overflow: facts.overflow, under11px: facts.small, svg: facts.svg }), facts.text.replace(/\s+/g, " ").slice(0, 160));
  } finally { await close(); }
}
