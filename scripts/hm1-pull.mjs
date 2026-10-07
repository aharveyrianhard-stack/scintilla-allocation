/* HM1 (6 Oct 2026) — the read-only pull for the heat-at-the-bottoms study. Everything comes from the chart API (prices) and the
   database's read-only tables (the page's own anon key, read off index.html, never printed). Nothing is written anywhere but the
   cache folder named on the command line.
   node scripts/hm1-pull.mjs <cacheDir>
   Writes <cacheDir>/<SYM>_D.json (the chart API's own answer, full depth), <cacheDir>/data/{treasury,vix,internals,universe}.json and
   <cacheDir>/served_closes.json (every served name's daily closes, 5,000 sessions deep — the multi-symbol route's ceiling),
   <cacheDir>/intraday/<SYM>_<rung>.json (the four intraday rungs the Hub's Geiger weights — 3h, 4h, 6h, 12h — as the chart API serves
   them, full depth, kept as [t,h,l,c] rows) and <cacheDir>/geiger_live_evening.json (the Hub's own /geiger answer at the time of the
   pull — the engine checks its rebuilt Geiger against it). */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.argv[2]; if (!CACHE) { console.error("usage: node scripts/hm1-pull.mjs <cacheDir>"); process.exit(2); }
fs.mkdirSync(path.join(CACHE, "data"), { recursive: true });
const API = "https://scintilla-massive-chart-api.fly.dev", SB = "https://wadinxqplrggagkvrdag.supabase.co/rest/v1";
/* the page's own public read key, read off index.html only at the moment a table is actually asked for (never printed, never written) */
let _key = null; const pageKey = () => (_key ??= fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/const SB_ANON='([^']+)'/)[1]);
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);
async function getJson(url) { let last = null; for (let k = 0; k < 6; k++) { try { const r = await fetch(url, { headers: { Origin: "https://scintillahub.ai" }, signal: AbortSignal.timeout(120000) }); if (r.ok) return await r.json(); if (r.status === 404) return null; last = "http " + r.status; } catch (e) { last = e.message; } log("retry", k + 1, last, url.slice(0, 90)); await new Promise((ok) => setTimeout(ok, 1500 * (k + 1))); } throw new Error("fetch failed (" + last + ") " + url); }
async function table(q) { const KEY = pageKey(); const out = []; for (let off = 0; ; off += 1000) { const r = await fetch(`${SB}/${q}&limit=1000&offset=${off}`, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } }); if (!r.ok) throw new Error(q.split("?")[0] + " " + r.status); const rows = await r.json(); out.push(...rows); if (rows.length < 1000) break; } return out; }

/* the voters' own symbols, the eleven sector funds, and the provider's ready-made 3D / W bars for the check */
const SINGLE = ["SPY", "QQQ", "IWM", "SMH", "RSP", "HYG", "TLT", "XLP", "XLU", "BTCUSD", "CLUSD", "GCUSD", "VIX", "US10Y", "US3M", "XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLB", "XLRE", "XLC"];
for (const s of SINGLE) { const f = path.join(CACHE, `${s}_D.json`); if (fs.existsSync(f)) continue; const j = await getJson(`${API}/candles?symbol=${s}&tf=D&limit=7000`); if (j) fs.writeFileSync(f, JSON.stringify(j)); log("D", s, j && j.series ? j.series.length : "none"); }
for (const [s, tf] of [["SPY", "3D"], ["SPY", "W"], ["QQQ", "3D"], ["QQQ", "W"], ["IWM", "3D"], ["IWM", "W"]]) { const f = path.join(CACHE, `${s}_${tf}.json`); if (fs.existsSync(f)) continue; const j = await getJson(`${API}/candles?symbol=${s}&tf=${tf}&limit=6000`); if (j) fs.writeFileSync(f, JSON.stringify(j)); log(tf, s, j && j.series ? j.series.length : "none"); }

/* the tables the page reads */
const T = { treasury: "treasury_rates?select=date,y2,y10&order=date.asc", vix: "vix_term?select=date,vix,vix3m,skew&date=gte.2003-01-01&order=date.asc", internals: "market_internals?select=asof,advancers,decliners,trin,adv_volume,dec_volume,universe&order=asof.asc" };
for (const [k, q] of Object.entries(T)) { const f = path.join(CACHE, "data", k + ".json"); if (fs.existsSync(f)) continue; const rows = await table(q); fs.writeFileSync(f, JSON.stringify(rows)); log("table", k, rows.length); }

/* the tool's own candidate list (candidateSyms(): the pick cohorts of ticker_cohorts plus hub_favorites) — the set its advance/decline line counts */
const uf = path.join(CACHE, "data", "universe.json");
if (!fs.existsSync(uf)) { const rows = await table("ticker_cohorts?select=ticker,cohort&order=ticker.asc,cohort.asc"); const favs = await table("hub_favorites?select=ticker&order=ticker.asc");
  const pick = new Set(["GROWTH", "AI_HARDWARE", "AI_HW", "AI_SOFTWARE", "CRYPTO", "MEGACAP", "BLUE_CHIP", "THEMATIC", "INTL"]); const out = new Set();
  for (const r of rows) if (pick.has(r.cohort)) out.add(r.ticker); for (const f of favs) out.add(f.ticker);
  const CMDTY = new Set(["GCUSD", "SIUSD", "CLUSD", "USO", "SLV"]); const cands = [...out].filter((s) => !CMDTY.has(s) && !["SPY", "QQQ", "IWM", "SMH", "RSP", "XLP", "XLU"].includes(s)).sort();
  fs.writeFileSync(uf, JSON.stringify({ read_utc: new Date().toISOString(), cohort_rows: rows.length, favorites: favs.length, candidates: cands })); log("universe", cands.length); }

/* every served name's daily closes — 5,000 sessions deep (the multi-symbol route refuses more), ten names a call, one call at a time */
const sf = path.join(CACHE, "served_closes.json");
if (!fs.existsSync(sf)) { const G = await getJson(`${API}/geiger`); const served = Object.keys(G.symbols).sort(); const cands = JSON.parse(fs.readFileSync(uf, "utf8")).candidates; const want = [...new Set([...served, ...cands])].sort();
  const spy = JSON.parse(fs.readFileSync(path.join(CACHE, "SPY_D.json"), "utf8")).series.slice(-5000); const sessions = spy.map((b) => iso(b.t)); const ix = Object.fromEntries(sessions.map((d, i) => [d, i]));
  const closes = {}; let refused = 0;
  for (let i = 0; i < want.length; i += 10) { const b = want.slice(i, i + 10); const j = await getJson(`${API}/candles-multi?symbols=${encodeURIComponent(b.join(","))}&tf=1d&limit=5000`); refused += (j && j.refused_count) || 0;
    for (const [s, c] of Object.entries((j && j.candles) || {})) { const ser = c && Array.isArray(c.series) ? c.series.filter((x) => x && x.c != null) : null; if (!ser || !ser.length) continue; const row = new Array(sessions.length).fill(null); for (const x of ser) { const k = ix[iso(x.t)]; if (k != null) row[k] = x.c; } closes[s] = row; }
    if ((i / 10) % 6 === 0) log("served", Math.min(i + 10, want.length), "/", want.length); }
  fs.writeFileSync(sf, JSON.stringify({ read_utc: new Date().toISOString(), served: served.length, wanted: want.length, got: Object.keys(closes).length, refused, sessions, closes })); log("served closes", Object.keys(closes).length, "of", want.length, "refused", refused); }
/* every served name's daily volume on the same sessions — so the two tape rows (TRIN, up vs down volume) can be rebuilt for the years before the
   market_internals table starts (5 Jan 2015), the way that table was built until Aug 2026: from a few hundred of the Hub's own names */
const vf = path.join(CACHE, "served_volumes.json");
if (!fs.existsSync(vf)) { const base = JSON.parse(fs.readFileSync(sf, "utf8")); const sessions = base.sessions; const ix = Object.fromEntries(sessions.map((d, i) => [d, i])); const want = Object.keys(base.closes).sort(); const vols = {};
  for (let i = 0; i < want.length; i += 10) { const b = want.slice(i, i + 10); const j = await getJson(`${API}/candles-multi?symbols=${encodeURIComponent(b.join(","))}&tf=1d&limit=5000`);
    for (const [s, c] of Object.entries((j && j.candles) || {})) { const ser = c && Array.isArray(c.series) ? c.series.filter((x) => x && x.c != null) : null; if (!ser || !ser.length) continue; const row = new Array(sessions.length).fill(null); for (const x of ser) { const k = ix[iso(x.t)]; if (k != null && x.v != null) row[k] = Math.round(x.v); } vols[s] = row; }
    if ((i / 10) % 6 === 0) log("volumes", Math.min(i + 10, want.length), "/", want.length); }
  fs.writeFileSync(vf, JSON.stringify({ read_utc: new Date().toISOString(), got: Object.keys(vols).length, sessions, volumes: vols })); log("served volumes", Object.keys(vols).length, "of", want.length); }

/* the four intraday rungs of the Hub's Geiger (provider-built bars, extended hours included), for every symbol /geiger carries that a voter
   or the sector row reads. HEAT1 took these to be unavailable; the chart API serves them back to each fund's first day when asked for
   enough bars. One request at a time. Oil, gold and bitcoin are FMP symbols with a month of intraday bars only — they stay on D / 3D / W. */
const INTRA_SYMS = ["SPY", "QQQ", "IWM", "SMH", "RSP", "HYG", "TLT", "XLP", "XLU", "XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLB", "XLRE", "XLC"];
const INTRA_TFS = ["180", "240", "6h", "12h", "3D", "W"];   // the four intraday rungs, and the provider's own 3-day and weekly bars (the Hub reads those, not a roll-up)
fs.mkdirSync(path.join(CACHE, "intraday"), { recursive: true });
for (const s of INTRA_SYMS) for (const tf of INTRA_TFS) { const f = path.join(CACHE, "intraday", `${s}_${tf}.json`); if (fs.existsSync(f)) continue;
  const j = await getJson(`${API}/candles?symbol=${s}&tf=${tf}&limit=60000`); const ser = j && Array.isArray(j.series) ? j.series.filter((b) => b && b.c != null) : [];
  fs.writeFileSync(f, JSON.stringify({ symbol: s, tf, provider: j && j.provider, price_basis: j && j.price_basis, bar_authority: j && j.bar_authority, full_series_count: j && j.full_series_count, newest: ser.length ? new Date(ser[ser.length - 1].t).toISOString() : null, read_utc: new Date().toISOString(), rows: ser.map((b) => [b.t, b.h ?? b.c, b.l ?? b.c, b.c]) }));
  log("intraday", s, tf, ser.length, ser.length ? iso(ser[0].t) : ""); }
/* the Hub's own Geiger at the time of the pull (taken after the evening settle it is the reading the replay's last day must reproduce) */
const gf = path.join(CACHE, "geiger_live_evening.json"); if (!fs.existsSync(gf)) { const G2 = await getJson(`${API}/geiger`); fs.writeFileSync(gf, JSON.stringify(G2)); log("geiger", G2 && G2.published_utc); }
console.log(JSON.stringify({ ok: true, cache: CACHE }));
