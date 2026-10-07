/* DM2 (7 Oct 2026) — the read-only pull for the deployment matrix, version 2. Prices come from the chart API (no key); the two small
   tables come from the database's read-only tables with the page's own public read key (read off index.html, never printed).
   Nothing is written anywhere but the cache folder named on the command line.
     node scripts/dm2-pull.mjs <cacheDir>
   Writes <cacheDir>/<SYM>_D.json (the chart API's own answer, full depth) and <cacheDir>/data/{vix,treasury}.json.
   Two files are NOT pulled here and must already be in <cacheDir>/data/:
     hyg_adjusted_fmp.json     HYG with payouts added back — DM1's keyed read on a throw-away Fly machine (scripts/dm1-fmp-hyg.mjs)
     geiger-series-gh1.json    the Hub's seven-rung Geiger per session for SPY and QQQ since 31 Oct 2003 — the Geiger-history study's
                               replay (Hub branch hub/gh1-geiger-history-20261006, deliverables/20261006/geiger-history/data/geiger-series.json) */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.argv[2]; if (!CACHE) { console.error("usage: node scripts/dm2-pull.mjs <cacheDir>"); process.exit(2); }
fs.mkdirSync(path.join(CACHE, "data"), { recursive: true });
const API = "https://scintilla-massive-chart-api.fly.dev", SB = "https://wadinxqplrggagkvrdag.supabase.co/rest/v1";
let _key = null; const pageKey = () => (_key ??= fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/const SB_ANON='([^']+)'/)[1]);
const iso = (t) => new Date(t).toISOString().slice(0, 10); const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);
async function getJson(url) { let last = null; for (let k = 0; k < 6; k++) { try { const r = await fetch(url, { headers: { Origin: "https://scintillahub.ai" }, signal: AbortSignal.timeout(120000) }); if (r.ok) return await r.json(); if (r.status === 404) return null; last = "http " + r.status; } catch (e) { last = e.message; } log("retry", k + 1, last, url.slice(0, 90)); await new Promise((ok) => setTimeout(ok, 1500 * (k + 1))); } throw new Error("fetch failed (" + last + ") " + url); }
async function table(q) { const KEY = pageKey(); const out = []; for (let off = 0; ; off += 1000) { const r = await fetch(`${SB}/${q}&limit=1000&offset=${off}`, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } }); if (!r.ok) throw new Error(q.split("?")[0] + " " + r.status); const rows = await r.json(); out.push(...rows); if (rows.length < 1000) break; } return out; }

/* SPY and QQQ (the two indices), credit (HYG price-only — the payouts come from the FMP file), long bonds (TLT), gold (GLD, the fund, and
   GCUSD, the future the tool's own gold voter reads), the VIX, the 10-year and the 3-month bill (the cash leg), and the eleven sector funds
   (the slow trend filter of the floor: SPY under its 200-day and most sectors under theirs) */
const SINGLE = ["SPY", "QQQ", "HYG", "TLT", "GLD", "GCUSD", "VIX", "US10Y", "US3M", "XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLB", "XLRE", "XLC", "XLP", "XLU"];
const got = {};
for (const s of SINGLE) { const f = path.join(CACHE, `${s}_D.json`); if (!fs.existsSync(f)) { const j = await getJson(`${API}/candles?symbol=${s}&tf=D&limit=7000`); if (j) fs.writeFileSync(f, JSON.stringify(j)); }
  if (fs.existsSync(f)) { const ser = JSON.parse(fs.readFileSync(f, "utf8")).series.filter((b) => b.c != null); got[s] = [ser.length, iso(ser[0].t), iso(ser.at(-1).t), ser.at(-1).c]; } else got[s] = null; log("D", s, JSON.stringify(got[s])); }
const T = { treasury: "treasury_rates?select=date,y2,y10&order=date.asc", vix: "vix_term?select=date,vix,vix3m,skew&date=gte.2003-01-01&order=date.asc" };
for (const [k, q] of Object.entries(T)) { const f = path.join(CACHE, "data", k + ".json"); if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify(await table(q))); const rows = JSON.parse(fs.readFileSync(f, "utf8")); got[k] = [rows.length, rows[0].date, rows.at(-1).date]; log("table", k, JSON.stringify(got[k])); }
for (const f of ["hyg_adjusted_fmp.json", "geiger-series-gh1.json"]) got[f] = fs.existsSync(path.join(CACHE, "data", f)) ? "present" : "MISSING";
console.log(JSON.stringify({ ok: true, cache: CACHE, got }));
