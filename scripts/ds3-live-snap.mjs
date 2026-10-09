/* DS3 (8 Oct 2026) — one read of the market the way the tool reads it (the tool's own GETs: study/ds1/live.mjs fetchDaily + fetchLive),
   kept as a file so the study can ask "what would each version have said at that minute" again and again without reading live twice.
   Read-only: GETs to the chart API (no key). Nothing is written but the file named on the command line.
     node scripts/ds3-live-snap.mjs <out.json> */
import fs from "node:fs";
import { fetchDaily, fetchLive, nyParts, phaseOf } from "../study/ds1/live.mjs";
const OUT = process.argv[2]; if (!OUT) { console.error("usage: node scripts/ds3-live-snap.mjs <out.json>"); process.exit(2); }
const API = "https://scintilla-massive-chart-api.fly.dev";
const getApi = async (p) => { const r = await fetch(API + p, { headers: { Origin: "https://scintillahub.ai" }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(p.split("?")[0] + " " + r.status); return r.json(); };
const now = nyParts(), candles = await fetchDaily(getApi), live = await fetchLive(getApi);
fs.writeFileSync(OUT, JSON.stringify({ readAt: now.date + " " + now.hms + " New York", phase: phaseOf(now), now, candles, live }));
const q = live.quotes || {}, m = live.macro || {}, px = (s) => (q[s] ? q[s].price : null);
console.log(JSON.stringify({ ok: true, readAt: now.date + " " + now.hms, phase: phaseOf(now), session: q.SPY && q.SPY.price_session_et, SPY: px("SPY"), QQQ: px("QQQ"), HYG: px("HYG"), IEF: px("IEF"), VIX: m.VIX && m.VIX.quote ? { price: m.VIX.quote.price, high: m.VIX.quote.day_high, low: m.VIX.quote.day_low, session: m.VIX.quote.session_et } : null, dailyBars: (candles.SPY.series || []).length, bytes: fs.statSync(OUT).size }));
