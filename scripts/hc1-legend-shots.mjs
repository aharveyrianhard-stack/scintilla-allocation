/* HC1 (6 Oct 2026) — the TARGET MIX legend, before → after. Alan, on the live tool: the labels overlap
   ("CONS. DISCRETIONARnone picked"). Headless, 1680 × 1050; every request that is not a GET is blocked by the harness.
   node scripts/hc1-legend-shots.mjs <before|after> — writes shots/hc1-legend/<tag>-target-mix-1680.png and the legend's measured boxes. */
import fs from "node:fs"; import path from "node:path";
import { openPage, ROOT } from "../tests/_harness.mjs";
const TAG = process.argv[2] || "after", OUT = path.join(ROOT, "shots", "hc1-legend"); fs.mkdirSync(OUT, { recursive: true });
const P = await openPage({ width: 1680, height: 1050 });
try {
  const { page } = P;
  /* record what the page itself draws: every legend text with the font it was drawn in and its true width in that font */
  const rows = await page.evaluate(() => {
    const cv = document.getElementById("donutTop"), ctx = cv.getContext("2d"), seen = [];
    const ft = ctx.fillText.bind(ctx);
    ctx.fillText = (t, x, y) => { seen.push({ t: String(t), x, y, font: ctx.font, align: ctx.textAlign, w: ctx.measureText(String(t)).width }); return ft(t, x, y); };
    render();
    ctx.fillText = ft;
    const byY = {}; for (const s of seen) if (s.x >= 360) (byY[Math.round(s.y)] = byY[Math.round(s.y)] || []).push(s);
    return Object.values(byY).filter((r) => r.length >= 2).map((r) => r.map((s) => ({ t: s.t, left: +(s.align === "right" ? s.x - s.w : s.x).toFixed(1), right: +(s.align === "right" ? s.x : s.x + s.w).toFixed(1), font: s.font.replace(/ monospace.*/, "") })));
  });
  let overlaps = 0;
  for (const r of rows) { r.sort((a, b) => a.left - b.left); for (let i = 1; i < r.length; i++) if (r[i].left < r[i - 1].right) { overlaps++; console.log("OVERLAP", JSON.stringify(r[i - 1]), "→", JSON.stringify(r[i])); } }
  console.log(TAG, "legend rows", rows.length, "overlapping pairs", overlaps);
  fs.writeFileSync(path.join(OUT, TAG + "-legend-boxes.json"), JSON.stringify({ tag: TAG, at: new Date().toISOString(), overlaps, rows }, null, 1));
  const box = await page.evaluate(() => { const b = document.getElementById("donutTop").getBoundingClientRect(); return { x: Math.max(0, b.left - 8), y: Math.max(0, b.top - 26), width: b.width + 16, height: b.height + 34 }; });
  await page.screenshot({ path: path.join(OUT, TAG + "-target-mix-1680.png"), clip: box });
  await page.screenshot({ path: path.join(OUT, TAG + "-first-screen-1680.png") });
  console.log("non-GET blocked:", P.nonGet.blocked, "page errors:", P.errors.length);
} finally { await P.close(); }
