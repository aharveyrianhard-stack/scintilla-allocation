/* DM2 — the pictures, headless, every non-GET blocked: the live line in the allocation tool (index.html, step 2) and the study page
   (study/dm2/DM2.html), each at 1680 and 390.   node scripts/dm2-shots.mjs [outdir] [tool|study|all] */
import fs from "node:fs"; import path from "node:path"; import { openPage, ROOT } from "../tests/_harness.mjs";
const OUT = process.argv[2] || path.join(ROOT, "study/dm2/pictures"), WHAT = process.argv[3] || "all"; fs.mkdirSync(OUT, { recursive: true });
const report = [];
if (WHAT !== "study") for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h }); const { page } = P;
  try { await page.waitForFunction(() => window.DM2_LIVE_READY === true, null, { timeout: 90000 }); await page.waitForTimeout(6500);   /* one tick of the line's own clock, so the ladder's number is on it */
    const info = await page.evaluate(() => { const r = document.getElementById("dm2l-root"), p = document.getElementById("dm2live").closest(".panel"); if (p.classList.contains("folded")) { const b = p.querySelector(".unfold, .foldbtn, [data-unfold]"); if (b) b.click(); }
      return { line: r && r.dataset.line, reading: r && r.dataset.reading, session: r && r.dataset.session, live: r && r.dataset.live, folded: p.classList.contains("folded"), ladder: window.DM2_LIVE && window.DM2_LIVE.ladderPct, text: document.getElementById("dm2live").innerText.slice(0, 900), scrollW: document.scrollingElement.scrollWidth,
        minFont: Math.min(...[...document.querySelectorAll("#dm2live *")].filter((e) => e.children.length === 0 && e.textContent.trim()).map((e) => parseFloat(getComputedStyle(e).fontSize))) }; });
    /* 1 · the step as it loads (folded to one screen, the page's own rule) */
    await page.evaluate(() => { const p = document.getElementById("dm2live").closest(".panel"); p.scrollIntoView({ block: "start" }); window.scrollBy(0, -(w => w)(document.querySelector(".foldbar, #foldbar, .sticky") ? 90 : 60)); }); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `dm2-tool-1-step-2-as-it-loads-${w}.png`) });
    /* 2 · the step opened from its corner: the ladder and the whole line under it */
    await page.evaluate(() => { const p = document.getElementById("dm2live").closest(".panel"); if (p.classList.contains("folded")) { const b = p.querySelector(".pfold"); if (b) b.click(); } }); await page.waitForTimeout(400);
    const clip = await page.evaluate(() => { const r = document.getElementById("dm2live").closest(".panel").getBoundingClientRect(); return { x: Math.max(0, r.left + scrollX), y: r.top + scrollY, width: Math.min(r.width, innerWidth), height: r.height }; });
    await page.screenshot({ path: path.join(OUT, `dm2-tool-2-step-2-opened-the-ladder-and-the-line-${w}.png`), fullPage: true, clip });
    const clip2 = await page.evaluate(() => { const r = document.getElementById("dm2live").getBoundingClientRect(); return { x: Math.max(0, r.left + scrollX), y: r.top + scrollY, width: Math.min(r.width, innerWidth), height: r.height }; });
    await page.screenshot({ path: path.join(OUT, `dm2-tool-3-the-live-line-alone-${w}.png`), fullPage: true, clip: clip2 });
    report.push({ page: "index.html", width: w, errors: P.errors, nonGet: P.nonGet.blocked + P.nonGet.allowed, ...info }); } finally { await P.close(); } }
if (WHAT !== "tool") for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h, path: "study/dm2/DM2.html" }); const { page } = P;
  try { await page.waitForFunction(() => window.DM2_READY === true, null, { timeout: 90000 }); await page.waitForFunction(() => window.DM2_LIVE_TILE === true && [...document.querySelectorAll("#shots img")].every((i) => i.complete), null, { timeout: 60000 }); await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `dm2-00-first-screen-${w}.png`) });
    const ids = await page.evaluate(() => [...document.querySelectorAll(".panel[id]")].map((p) => p.id));
    for (const id of ids) await page.locator("#" + id).screenshot({ path: path.join(OUT, `dm2-${id.replace(/^p-/, "")}-${w}.png`) });
    await page.screenshot({ path: path.join(OUT, `dm2-99-full-page-${w}.png`), fullPage: true });
    const info = await page.evaluate(() => ({ scrollW: document.scrollingElement.scrollWidth, minFont: Math.min(...[...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && getComputedStyle(e).display !== "none").map((e) => parseFloat(getComputedStyle(e).fontSize))), panels: document.querySelectorAll(".panel[id]").length }));
    report.push({ page: "study/dm2/DM2.html", width: w, errors: P.errors, nonGet: P.nonGet.blocked + P.nonGet.allowed, ...info }); } finally { await P.close(); } }
console.log(JSON.stringify(report, null, 1)); console.log("pictures in", OUT, fs.readdirSync(OUT).length);
