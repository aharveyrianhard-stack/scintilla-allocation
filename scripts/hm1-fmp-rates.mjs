/* HM1 (6 Oct 2026) · read-only: the 2-year and 10-year Treasury yields before the day the treasury_rates table starts (3 Aug 2020), and the
   3-month VIX before the day the vix_term table carries it (18 Sep 2009) — the two readings the heat's curve and VIX-term rows need at the
   2009, 2018 and 2020 lows. The FMP key exists only on Fly, so this runs on a throw-away batch machine and PRINTS one JSON line: never the
   key, never a URL, no table write.

     fly machine run registry.fly.io/scintilla-massive-stocks-batch:live-112d10c sleep 900 -a scintilla-massive-stocks-batch --rm --restart no \
       --region iad -e SERVICE=none --name hm1-rates-20261006 --file-local /app/hm1-fmp-rates.mjs=scripts/hm1-fmp-rates.mjs --detach
     fly ssh console -a scintilla-massive-stocks-batch --machine <id> -C "node /app/hm1-fmp-rates.mjs" > rates.raw
     fly machine stop <id> -a scintilla-massive-stocks-batch

   scripts/hm1-bottoms.mjs reads the result from <cacheDir>/data/treasury_fmp.json and <cacheDir>/data/vix3m_fmp.json when they are there. */
const K = process.env.FMP_API_KEY || process.env.FMP_KEY || "";
if (!K) { console.log(JSON.stringify({ error: "no FMP key in the environment" })); process.exit(0); }
const BASE = "https://financialmodelingprep.com/stable";
const N = (v) => (v == null || v === "" || !isFinite(+v) ? null : +v);
const iso = (t) => new Date(t).toISOString().slice(0, 10);
async function get(pathAndQuery) { let last = null; for (let k = 0; k < 4; k++) { try { const r = await fetch(BASE + pathAndQuery + "&apikey=" + K, { signal: AbortSignal.timeout(30000) }); if (r.ok) return await r.json(); last = "http " + r.status; if (r.status === 429) await new Promise((ok) => setTimeout(ok, 4000)); } catch (e) { last = String(e.name || "error"); } await new Promise((ok) => setTimeout(ok, 800 * (k + 1))); } return { failed: last }; }

/* Treasury par yields, 80 days a call (the route answers a quarter at a time), 1 Dec 2006 → 30 Sep 2020 (two months of overlap with the table) */
const FROM = Date.parse("2006-12-01T00:00:00Z"), TO = Date.parse("2020-09-30T00:00:00Z"), STEP = 80 * 864e5;
const treasury = new Map(); const failures = []; let calls = 0;
for (let a = FROM; a <= TO; a += STEP + 864e5) { const b = Math.min(TO, a + STEP); const j = await get(`/treasury-rates?from=${iso(a)}&to=${iso(b)}`); calls++;
  if (!Array.isArray(j)) { failures.push({ what: "treasury", from: iso(a), to: iso(b), why: (j && j.failed) || "not a list" }); continue; }
  for (const r of j) if (r && r.date) treasury.set(String(r.date).slice(0, 10), { date: String(r.date).slice(0, 10), y2: N(r.year2), y10: N(r.year10), m3: N(r.month3) });
  await new Promise((ok) => setTimeout(ok, 120)); }

/* the 3-month VIX, as far back as FMP holds it, up to the end of 2009 */
const vix3m = []; let vixNote = null;
{ const j = await get(`/historical-price-eod/light?symbol=${encodeURIComponent("^VIX3M")}&from=2002-01-01&to=2009-12-31`); calls++;
  if (Array.isArray(j)) { for (const r of j) { const p = N(r.price ?? r.close); if (r && r.date && p != null) vix3m.push({ date: String(r.date).slice(0, 10), vix3m: p }); } vix3m.sort((x, y) => (x.date < y.date ? -1 : 1)); }
  else vixNote = (j && j.failed) || "not a list"; }

const rows = [...treasury.values()].sort((x, y) => (x.date < y.date ? -1 : 1));
console.log(JSON.stringify({ hm1: "fmp-rates", read_utc: new Date().toISOString(), calls, failures, treasury: { n: rows.length, from: rows[0]?.date ?? null, to: rows.at(-1)?.date ?? null, rows }, vix3m: { n: vix3m.length, from: vix3m[0]?.date ?? null, to: vix3m.at(-1)?.date ?? null, note: vixNote, rows: vix3m } }));
