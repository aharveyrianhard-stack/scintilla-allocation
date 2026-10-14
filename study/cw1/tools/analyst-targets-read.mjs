/* CW1 (13 Oct 2026) · the analyst targets the allocation tool itself uses, read the tool's own way (tests/_harness.mjs sbGet, a GET):
   checked analyst notes of the last 90 days (kind TARGET, quality ok), one per firm (the newest), the median and the range,
   and the firms by name so the page can say who is behind the number.   node study/cw1/tools/analyst-targets-read.mjs <out.json> TICKER … */
import fs from "node:fs"; import { sbGet } from "../../../tests/_harness.mjs";
const [out, ...tickers] = process.argv.slice(2);
const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
const byT = {}; let rows = 0;
for (let i = 0; i < tickers.length; i += 40) { const b = tickers.slice(i, i + 40);
  const rs = await sbGet("analyst_target_news?select=ticker,firm,adj_target_checked,published_utc&kind=eq.TARGET&quality=eq.ok&adj_target_checked=not.is.null&published_utc=gte." + since + "&ticker=in.(" + b.join(",") + ")&order=ticker.asc,published_utc.desc&limit=5000");
  for (const r of rs) { rows++; const t = (byT[r.ticker] = byT[r.ticker] || {}); const f = r.firm || "(no firm)"; if (!(f in t)) t[f] = { target: +r.adj_target_checked, published: r.published_utc }; } }
const names = {};
for (const T of tickers) { const firms = byT[T] || {}; const v = Object.values(firms).map((x) => x.target).filter((x) => x > 0).sort((a, b) => a - b); if (!v.length) { names[T] = { n: 0 }; continue; }
  const med = v.length % 2 ? v[v.length >> 1] : (v[(v.length >> 1) - 1] + v[v.length >> 1]) / 2;
  names[T] = { median: med, n: v.length, low: v[0], high: v[v.length - 1], firms: Object.entries(firms).filter(([, x]) => x.target > 0).sort((a, b) => a[1].target - b[1].target).map(([f, x]) => ({ firm: f, target: x.target, published: x.published.slice(0, 10) })) }; }
fs.writeFileSync(out, JSON.stringify({ what: "CW1 · analyst targets as the allocation tool reads them (analyst_target_news: kind TARGET, quality ok, last 90 days, one per firm, the median)", read_utc: new Date().toISOString(), since, rows, names }, null, 1));
console.log(JSON.stringify({ read: new Date().toISOString(), rows, names: Object.fromEntries(Object.entries(names).map(([t, x]) => [t, x.n ? `${x.median} (n ${x.n}, ${x.low}–${x.high})` : "none"])) }, null, 1));
