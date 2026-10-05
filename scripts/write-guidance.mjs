/* PA4 — writes control/ALLOCATION-HUB-GUIDANCE.json from the page's own list (headless, the same stand-in the tests use).
   node scripts/write-guidance.mjs */
import fs from "node:fs"; import path from "node:path";
import { openPage, ROOT } from "../tests/_harness.mjs";
const P = await openPage();
const g = await P.page.evaluate(() => hubGuidance());
await P.close();
fs.mkdirSync(path.join(ROOT, "control"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "control", "ALLOCATION-HUB-GUIDANCE.json"), JSON.stringify(g, null, 1) + "\n");
console.log("wrote control/ALLOCATION-HUB-GUIDANCE.json ·", g.counts, "· regime", g.regime, g.invested_pct + "%", "·", g.sector_method);
