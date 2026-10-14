/* CW1 · the pictures, headless, every non-GET blocked, ONE page: study/cw1/COMPS-WALKTHROUGH.html at 1680 (each example cut from the full page,
   and the whole page) and at 390 (the first screen). Prints what was on the page (widest element, smallest font, forbidden words counted).
     node study/cw1/tools/shots.mjs */
import fs from "node:fs"; import path from "node:path"; import { openPage, ROOT } from "../../../tests/_harness.mjs";
const OUT = path.join(ROOT, "study/cw1/pictures"); fs.mkdirSync(OUT, { recursive: true });
const ny = () => new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
const report = [];
for (const [w, h] of [[1680, 1050], [390, 844]]) {
  const P = await openPage({ width: w, height: h, path: "study/cw1/COMPS-WALKTHROUGH.html" }); const { page } = P;
  const clipOf = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.max(0, r.left + scrollX), y: r.top + scrollY, width: Math.min(r.width, innerWidth), height: r.height }; }, sel);
  const shot = async (name, sel) => { const c = await clipOf(sel); if (c && c.height > 4) await page.screenshot({ path: path.join(OUT, `${name}-${w}.png`), fullPage: true, clip: { x: c.x, y: c.y, width: Math.min(w, c.width), height: Math.min(c.height, 14000) } }); };
  try {
    await page.waitForFunction(() => window.CW1_PAGE_READY === true, null, { timeout: 60000 }); await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `walkthrough-0-first-screen-${w}.png`) });
    if (w === 1680) {
      for (const [n, sel] of [["walkthrough-1-the-frame", "#frame"], ["walkthrough-2-example-A-industrials", "#exA"], ["walkthrough-3-example-B-technology", "#exB"], ["walkthrough-4-example-C-against-each-other", "#exC"], ["walkthrough-5-where-it-is-weak", "#weak"], ["walkthrough-6-questions", "#questions"]]) await shot(n, sel);
      await page.screenshot({ path: path.join(OUT, `walkthrough-full-page-${w}.png`), fullPage: true });
    }
    const info = await page.evaluate(() => { const leaves = [...document.body.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent.trim() && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0 && !e.closest("svg") && !e.closest("script") && !e.closest("style"));
      const text = document.body.innerText;
      return { scrollW: document.scrollingElement.scrollWidth, innerW: innerWidth, pageH: document.scrollingElement.scrollHeight, minFont: Math.min(...leaves.map((e) => parseFloat(getComputedStyle(e).fontSize))), tags: { measured: document.querySelectorAll(".tag.m").length, estimate: document.querySelectorAll(".tag.e").length, stale: document.querySelectorAll(".tag.s").length }, tables: document.querySelectorAll("table").length, widestTable: Math.max(...[...document.querySelectorAll("table")].map((t) => t.scrollWidth)), fields: document.querySelectorAll("svg.ff").length, worked: document.querySelectorAll(".worked").length, laneCodes: (text.match(/\b(CW1|CS[0-9]|CP[0-9]|PP1|R4|C5|C6b?)\b/g) || []).length, geigerWords: (text.match(/geiger/gi) || []).length, h1: document.querySelector("h1").innerText.slice(0, 80), title: document.title, bg: getComputedStyle(document.body).backgroundColor }; });
    report.push({ width: w, errors: P.errors, nonGet: P.nonGet.blocked + P.nonGet.allowed, ...info });
  } finally { await P.close(); }
}
fs.writeFileSync(path.join(ROOT, "study/cw1/data/cw1-shots.json"), JSON.stringify({ stamp: "pictures taken " + ny() + " New York", takenAt: new Date().toISOString(), report }, null, 1));
console.log(JSON.stringify(report, null, 1)); console.log("pictures in", OUT, fs.readdirSync(OUT).filter((f) => /\.png$/.test(f)).length);
