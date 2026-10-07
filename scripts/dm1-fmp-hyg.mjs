/* DM1 (7 Oct 2026) · read-only: HYG with its payouts added back (FMP's dividend-adjusted daily closes) and HYG's own dividend list, so the
   credit tie-breaker can be read on a total-return series instead of the price-only one the estate stores. The FMP key exists only on
   Fly, so this runs on a throw-away batch machine and PRINTS one JSON line: never the key, never a URL, no table write.

     fly machine run registry.fly.io/scintilla-massive-stocks-batch:live-112d10c sleep 900 -a scintilla-massive-stocks-batch --rm --restart no \
       --region iad -e SERVICE=none --name dm1-hyg-20261007 --file-local /app/dm1-fmp-hyg.mjs=scripts/dm1-fmp-hyg.mjs --detach
     fly ssh console -a scintilla-massive-stocks-batch --machine <id> -C "node /app/dm1-fmp-hyg.mjs" > hyg.raw
     fly machine stop <id> -a scintilla-massive-stocks-batch

   scripts/dm1-engine-build.mjs reads the result from <cacheDir>/data/hyg_adjusted_fmp.json when it is there. */
const K = process.env.FMP_API_KEY || process.env.FMP_KEY || "";
if (!K) { console.log(JSON.stringify({ error: "no FMP key in the environment" })); process.exit(0); }
const BASE = "https://financialmodelingprep.com/stable";
const N = (v) => (v == null || v === "" || !isFinite(+v) ? null : +v);
async function get(pathAndQuery) { let last = null; for (let k = 0; k < 4; k++) { try { const r = await fetch(BASE + pathAndQuery + "&apikey=" + K, { signal: AbortSignal.timeout(45000) }); if (r.ok) return await r.json(); last = "http " + r.status; if (r.status === 429) await new Promise((ok) => setTimeout(ok, 4000)); } catch (e) { last = String(e.name || "error"); } await new Promise((ok) => setTimeout(ok, 800 * (k + 1))); } return { failed: last }; }
const out = { dm1: "fmp-hyg", read_utc: new Date().toISOString(), adjusted: { n: 0, rows: [], note: null }, dividends: { n: 0, rows: [], note: null }, spyAdjusted: { n: 0, rows: [], note: null } };
/* the dividend-adjusted daily closes, in yearly slices (the route answers at most a few years a call) */
for (const sym of ["HYG", "SPY"]) { const tgt = sym === "HYG" ? out.adjusted : out.spyAdjusted; const seen = new Map();
  for (let y = 2007; y <= 2026; y += 3) { const j = await get(`/historical-price-eod/dividend-adjusted?symbol=${sym}&from=${y}-01-01&to=${y + 2}-12-31`);
    if (!Array.isArray(j)) { tgt.note = (tgt.note || "") + ` ${y}: ${(j && j.failed) || "not a list"}`; continue; }
    for (const r of j) if (r && r.date) seen.set(String(r.date).slice(0, 10), [String(r.date).slice(0, 10), N(r.adjClose ?? r.adjclose), N(r.close)]);
    await new Promise((ok) => setTimeout(ok, 150)); }
  tgt.rows = [...seen.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1)); tgt.n = tgt.rows.length; }
/* the dividend list, for the reconstruction check */
{ const j = await get(`/dividends?symbol=HYG&limit=1000`); if (Array.isArray(j)) { out.dividends.rows = j.map((r) => [String(r.date).slice(0, 10), N(r.dividend ?? r.adjDividend), N(r.adjDividend)]).filter((r) => r[1] != null).sort((a, b) => (a[0] < b[0] ? -1 : 1)); out.dividends.n = out.dividends.rows.length; } else out.dividends.note = (j && j.failed) || "not a list"; }
console.log(JSON.stringify(out));
