/* DS1 (7 Oct 2026) — the read-only pull for the deployment system. Adds to the folder scripts/dm2-pull.mjs filled:
     the equal-weight fund (RSP), two treasury funds (IEI 3–7 year, IEF 7–10 year — the rates leg that tells a rates-led dip from a
     credit scare), the semis fund (SMH), and the nine names (the six core candidates, the two conviction names, and Vistra);
     and the high-yield spread from FRED (series BAMLH0A0HYM2, the public CSV, no key — FRED serves its last three years only).
   Prices come from the chart API (no key). Nothing is written anywhere but the cache folder named on the command line.
     node scripts/ds1-pull.mjs <cacheDir>
   Still needed in <cacheDir>/data/ (not pulled here, see scripts/dm2-pull.mjs): hyg_adjusted_fmp.json, vix.json. */
import fs from "node:fs"; import path from "node:path";
const CACHE = process.argv[2]; if (!CACHE) { console.error("usage: node scripts/ds1-pull.mjs <cacheDir>"); process.exit(2); }
fs.mkdirSync(path.join(CACHE, "data"), { recursive: true });
const API = "https://scintilla-massive-chart-api.fly.dev";
const iso = (t) => new Date(t).toISOString().slice(0, 10); const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);
async function get(url, asText = false) { let last = null; for (let k = 0; k < 6; k++) { try { const r = await fetch(url, { headers: { Origin: "https://scintillahub.ai" }, signal: AbortSignal.timeout(120000) }); if (r.ok) return asText ? await r.text() : await r.json(); if (r.status === 404) return null; last = "http " + r.status; } catch (e) { last = e.message; } log("retry", k + 1, last, url.slice(0, 90)); await new Promise((ok) => setTimeout(ok, 1500 * (k + 1))); } throw new Error("fetch failed (" + last + ") " + url); }

export const NAMES = ["NVDA", "AVGO", "TSM", "ORCL", "AMZN", "GOOGL", "MU", "NBIS", "VST"];
const EXTRA = ["RSP", "IEI", "IEF", "SMH", ...NAMES];
const got = {};
for (const s of EXTRA) { const f = path.join(CACHE, `${s}_D.json`); if (!fs.existsSync(f)) { const j = await get(`${API}/candles?symbol=${s}&tf=D&limit=7000`); if (j) fs.writeFileSync(f, JSON.stringify(j)); }
  if (fs.existsSync(f)) { const ser = JSON.parse(fs.readFileSync(f, "utf8")).series.filter((b) => b.c != null); got[s] = [ser.length, iso(ser[0].t), iso(ser.at(-1).t), ser.at(-1).c]; } else got[s] = null; log("D", s, JSON.stringify(got[s])); }
const fred = path.join(CACHE, "data", "hy-spread-fred.csv");
if (!fs.existsSync(fred)) { const t = await get("https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2", true); if (t && /^observation_date,BAMLH0A0HYM2/.test(t)) fs.writeFileSync(fred, t); }
if (fs.existsSync(fred)) { const rows = fs.readFileSync(fred, "utf8").trim().split("\n").slice(1).map((l) => l.split(",")).filter((r) => r[1] && r[1] !== "."); got.hySpread = [rows.length, rows[0][0], rows.at(-1)[0], +rows.at(-1)[1]]; } else got.hySpread = null;
for (const f of ["hyg_adjusted_fmp.json", "vix.json"]) got[f] = fs.existsSync(path.join(CACHE, "data", f)) ? "present" : "MISSING";
for (const s of ["SPY", "QQQ", "HYG", "VIX", "XLK"]) got[s + "_D"] = fs.existsSync(path.join(CACHE, `${s}_D.json`)) ? "present" : "MISSING";
console.log(JSON.stringify({ ok: true, cache: CACHE, got }));
