/* HM1 — (a) read tonight's voters off the live tool's own code in a headless browser → study/hm1/data/live.json (the replay's last day is
   checked against it); (b) picture the study page at 1680 and 390.
   node scripts/hm1-shots.mjs [outdir] [--live-only | --page-only]      Study only; nothing on the live page changes; every non-GET is blocked. */
import fs from "node:fs"; import path from "node:path";
import { openPage, ROOT } from "../tests/_harness.mjs";
const args = process.argv.slice(2); const flags = new Set(args.filter((a) => a.startsWith("--"))); const OUT = args.find((a) => !a.startsWith("--")) || path.join(ROOT, "study/hm1/pictures"); fs.mkdirSync(OUT, { recursive: true });
const DATA = path.join(ROOT, "study/hm1/data");
if (!flags.has("--page-only")) {
  const P = await openPage({ width: 1680, height: 1050 }); const { page } = P;
  try { await page.waitForFunction(() => document.getElementById("heatnum").textContent !== "—", null, { timeout: 90000 }); await page.waitForTimeout(1500);
    const live = await page.evaluate(() => { const V = voters(); const can = (v) => (typeof canVote === "function" ? canVote(v) : v.val != null);
      const rows = V.map((v) => ({ key: v.key, name: v.name, val: v.val == null ? null : +v.val.toFixed(4), w: S.wts[v.key] ?? 0, sub: v.sub || "", counts: can(v) && (S.wts[v.key] ?? 0) > 0 }));
      return { read_utc: new Date().toISOString(), heat: heat(), rung: policyStep(heat()), sentence: plainCondition(heat()).sentence, rows: rows.filter((r) => r.counts).map(({ counts, ...r }) => r), notVoting: V.filter((v) => !can(v) || !(S.wts[v.key] > 0)).map((v) => ({ key: v.key, name: v.name, weight: S.wts[v.key] ?? 0, why: v.val == null ? "no reading" : (S.wts[v.key] > 0 ? "folded" : "weight 0") })), weightsAreDefaults: JSON.stringify(S.wts) === JSON.stringify(DEFAULTS.wts) }; });
    live.pageErrors = P.errors; live.nonGet = P.nonGet;
    fs.writeFileSync(path.join(DATA, "live.json"), JSON.stringify(live, null, 1));
    console.log("live", live.heat, JSON.stringify(live.rung), "voters", live.rows.length, "weight", live.rows.reduce((t, r) => t + r.w, 0), "defaults", live.weightsAreDefaults, "errors", P.errors.length, "non-GET blocked", P.nonGet.blocked);
  } finally { await P.close(); }
}
if (!flags.has("--live-only")) {
  const readout = {};
  for (const [w, h] of [[1680, 1050], [390, 844]]) {
    const P = await openPage({ width: w, height: h, path: "study/hm1/HM1.html" }); const { page } = P;
    try { await page.waitForFunction(() => window.HM1_READY === true, null, { timeout: 60000 }); await page.waitForTimeout(600);
      const shot = (n, sel) => (sel ? page.locator(sel).screenshot({ path: path.join(OUT, `${n}-${w}.png`) }) : page.screenshot({ path: path.join(OUT, `${n}-${w}.png`) }));
      await shot("hm1-00-first-screen");
      for (const [n, sel] of [["hm1-01-seven-dates", "#p-seven"], ["hm1-02-why", "#p-why"], ["hm1-03-the-repair", "#p-fix"], ["hm1-04-history-line", "#p-history"], ["hm1-05-200-day-and-clouds", "#p-events"], ["hm1-06-last-100-and-80", "#p-last"]]) await shot(n, sel);
      await page.evaluate(() => { document.querySelectorAll("details").forEach((d) => (d.open = true)); }); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `hm1-99-full-page-open-${w}.png`), fullPage: true });
      readout[w] = await page.evaluate(() => ({ stamp: document.getElementById("stamp").textContent, seven: document.querySelector("#seven table") ? document.querySelector("#seven table").innerText : null, verdict: document.getElementById("verdict") ? document.getElementById("verdict").innerText : null, last: document.getElementById("last") ? document.getElementById("last").innerText : null, scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, smallText: [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11 && e.getClientRects().length).length }));
      readout[w].errors = P.errors; readout[w].nonGet = P.nonGet;
    } finally { await P.close(); }
  }
  fs.writeFileSync(path.join(OUT, "readout.json"), JSON.stringify(readout, null, 1));
  console.log("pictures in", OUT, fs.readdirSync(OUT).length, "files; page errors", JSON.stringify(readout[1680].errors), "overflow", readout[390].scrollW, "vs", readout[390].clientW, "small text", readout[1680].smallText, readout[390].smallText);
}
