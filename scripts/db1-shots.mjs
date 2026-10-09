/* DB1 — the pictures, headless, every non-GET blocked, ONE page at a time: the tool's first screen at 1680 and 390 as it loads, with a
   what-if chip picked, with the balance moved, and with THE LONG VERSION opened (nothing is deleted — it is below).
     node scripts/db1-shots.mjs
   The private account file is never served to a picture run (tests/_harness.mjs). Pictures land in study/db1/pictures; the report printed at
   the end says what was on the screen when each was taken. */
import fs from "node:fs"; import path from "node:path"; import { openPage, ROOT } from "../tests/_harness.mjs";
const OUT = path.join(ROOT, "study/db1/pictures"); fs.mkdirSync(OUT, { recursive: true }); for (const f of fs.readdirSync(OUT)) if (f.endsWith(".png")) fs.unlinkSync(path.join(OUT, f));
const ny = () => new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()), report = [];
for (const [w, h] of [[1680, 1050], [390, 844]]) { const P = await openPage({ width: w, height: h }); const { page } = P, shot = (name, full = false) => page.screenshot({ path: path.join(OUT, `db1-${name}-${w}.png`), fullPage: full });
  try { await page.waitForFunction(() => window.DB1_READY === true, null, { timeout: 60000 }); await shot("0-before-the-first-read");
    await page.waitForFunction(() => window.DS1_LIVE_READY === true && window.DS1_LIVE.view && document.querySelector("#db1-root[data-version]"), null, { timeout: 150000 }); await page.waitForTimeout(600);
    const info = async () => page.evaluate(() => { const d = document.getElementById("db1-root"); return { ...d.dataset, big: d.querySelector("[data-invested]").textContent, under: d.querySelector(".under").textContent, lines: [...d.querySelectorAll(".sum li")].map((l) => l.textContent), scrollW: document.scrollingElement.scrollWidth, firstScreenHeight: document.getElementById("longversion").getBoundingClientRect().top, longOpen: document.getElementById("longversion").open }; });
    await shot("1-first-screen"); await shot("1-first-screen-full", true); const now = await info();
    await page.locator('.chip[data-move="-3"]').click(); await page.waitForTimeout(250); await shot("2-what-if-minus-3"); const dip = await info();
    await page.locator(".chip[data-move=\"0\"]").click(); await page.locator("input[data-bal]").fill("50"); await page.locator("input[data-bal]").dispatchEvent("change"); await page.waitForTimeout(250); await shot("3-balance-50-50"); const half = await info();
    await page.locator('#db1-root [data-size="1"]').click(); await page.locator('#db1-root [data-size="1"]').click(); await page.waitForTimeout(200); await shot("4-size-600k"); const bigger = await info();
    await page.locator("#db1-root [data-reset]").click(); await page.waitForTimeout(200); const reset = await info();
    await page.evaluate(() => { document.getElementById("longversion").open = true; }); await page.waitForTimeout(1500); await page.evaluate(() => document.getElementById("longversion").scrollIntoView()); await page.waitForTimeout(400); await shot("5-the-long-version-opened");
    const long = await page.evaluate(() => ({ open: document.getElementById("longversion").open, money: !!document.querySelector("#ds1money-host .a9"), panels: document.querySelectorAll(".grid > .panel").length, specs: !!document.querySelector("details.sc-pagespecs") }));
    report.push({ width: w, errors: P.errors, nonGet: P.nonGet.blocked + P.nonGet.allowed, now, dip, half, bigger, reset, long }); } finally { await P.close(); } }
fs.writeFileSync(path.join(ROOT, "study/db1/data/db1-shots.json"), JSON.stringify({ stamp: "pictures taken " + ny() + " New York", takenAt: new Date().toISOString(), report }, null, 1));
console.log(JSON.stringify(report, null, 1)); console.log("pictures in", OUT, fs.readdirSync(OUT).filter((f) => /\.png$/.test(f)).length);
