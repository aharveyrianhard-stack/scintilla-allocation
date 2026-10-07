/* AL9 (7 Oct 2026) — the number's own history, every session from 2 Jan 2018. Reads the same cache folder as scripts/ds1-build.mjs
   (scripts/dm2-pull.mjs + scripts/ds1-pull.mjs filled it) and writes study/al9/data/history.json.
     node scripts/al9-history.mjs <cacheDir>
   No key, no table, no network: it only reads the cache folder and study/ds1/data/ds1-live.json.

   WHAT IS REPLAYED
     The market reading (0 to 100) of every past session, worked out by the SAME sum the live page uses today (study/ds1/engine.mjs,
     readSystem on the model in ds1-live.json) from that session's own closing prices. So a point on the chart answers "what would the
     tool have said that day, with today's rule" — not "what an older rule said at the time". The page turns each reading into the %
     invested with the dials on the screen (held part + tactical × reading), so the whole line follows a dial when it is moved.
     The rule's curves were measured on prices to July 2026, so the past readings are today's rule looked back on; the test on years the
     rule had never seen is in study/ds1/DS1.html.

   THE DATES ALAN NAMED (7 Oct 2026) are written into the file with what SPY was doing around each one: a low or a high, decided here from
   SPY's own closes (the lowest or the highest close of the 21 sessions centred on the date), never typed in by hand. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import * as E from "../study/ds1/engine.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.argv[2]; if (!CACHE || !fs.existsSync(path.join(CACHE, "SPY_D.json"))) { console.error("usage: node scripts/al9-history.mjs <cacheDir>"); process.exit(2); }
const J = (f) => JSON.parse(fs.readFileSync(f, "utf8")), iso = (t) => new Date(t).toISOString().slice(0, 10);
export const FROM = "2018-01-02";
export const NAMED = ["2025-04-08", "2026-03-30", "2026-07-29", "2026-08-13", "2026-09-16", "2026-10-06"];

/* the series on SPY's sessions — the same loader as scripts/ds1-build.mjs */
const D = (s) => J(path.join(CACHE, `${s}_D.json`)).series.filter((b) => b.c != null);
const dates = D("SPY").map((b) => iso(b.t)), N = dates.length, ix = Object.fromEntries(dates.map((d, i) => [d, i]));
function onClock(s) { if (!fs.existsSync(path.join(CACHE, `${s}_D.json`))) return null; const m = new Map(D(s).map((b) => [iso(b.t), b])); let cur = null; const c = [], h = [], l = []; for (const d of dates) { const b = m.get(d); if (b) { cur = b.c; c.push(b.c); h.push(Math.max(b.h ?? b.c, b.c)); l.push(Math.min(b.l ?? b.c, b.c)); } else { c.push(cur); h.push(cur); l.push(cur); } } return { c, h, l }; }
const bars = {}; for (const s of E.ALL_SYMBOLS) bars[s] = onClock(s);
{ const f = path.join(CACHE, "data/vix.json"); if (fs.existsSync(f) && bars.VIX) { const t = new Map(J(f).filter((r) => r.vix != null).map((r) => [r.date, +r.vix])); for (let i = 0; i < N; i++) if (t.has(dates[i])) { bars.VIX.c[i] = t.get(dates[i]); bars.VIX.h[i] = Math.max(bars.VIX.h[i] ?? 0, bars.VIX.c[i]); bars.VIX.l[i] = Math.min(bars.VIX.l[i] ?? 1e9, bars.VIX.c[i]); } } }
const hygTR = (() => { const m = new Map(J(path.join(CACHE, "data/hyg_adjusted_fmp.json")).adjusted.rows.map((r) => [r[0], r[1]])); let cur = null; return dates.map((d) => (m.has(d) ? (cur = m.get(d)) : cur)); })();
const X = E.allReadings({ dates, bars }, hygTR).X, live = J(path.join(ROOT, "study/ds1/data/ds1-live.json")), model = live.model, kept = model.parts.filter((p) => p.vote).map((p) => p.key);
const readAt = (i) => { const inp = E.inputsAt(X, i); return kept.every((k) => inp[k] != null) ? E.readSystem(inp, model) : null; };

const a = dates.findIndex((d) => d >= FROM), d = [], r = [], s = [], q = [], pts = {}; for (const k of kept) pts[k] = [];
for (let i = a; i < N; i++) { const R = readAt(i); d.push(dates[i]); r.push(R ? R.reading : null); s.push(+bars.SPY.c[i].toFixed(2)); q.push(+bars.QQQ.c[i].toFixed(2)); for (const k of kept) pts[k].push(R ? +R.parts.find((p) => p.key === k).points.toFixed(1) : null); }
/* a named date is a low or a high by SPY's own closes around it */
const marks = NAMED.map((day) => { const i = ix[day]; if (i == null) return { d: day, kind: null, missing: true }; const lo = Math.max(0, i - 10), hi = Math.min(N - 1, i + 10), win = bars.SPY.c.slice(lo, hi + 1), mn = Math.min(...win), mx = Math.max(...win), c = bars.SPY.c[i];
  const kind = c - mn <= mx - c ? "low" : "high", at = kind === "low" ? lo + win.indexOf(mn) : lo + win.indexOf(mx); const R = readAt(i);
  return { d: day, kind, spy: +c.toFixed(2), reading: R ? R.reading : null, extremeAt: dates[at], extremeSpy: +bars.SPY.c[at].toFixed(2), sessionsFromExtreme: i - at, readingAtExtreme: (readAt(at) || {}).reading ?? null }; });
const out = { what: "AL9 — the market reading of every session since 2 Jan 2018, today's rule on that session's own closing prices; the page turns it into the % invested with the dials on screen",
  built: new Date().toISOString(), modelAsOf: live.asOf, from: d[0], to: d[d.length - 1], sessions: d.length, votes: kept, d, r, s, q, points: pts, marks };
fs.mkdirSync(path.join(ROOT, "study/al9/data"), { recursive: true }); fs.writeFileSync(path.join(ROOT, "study/al9/data/history.json"), JSON.stringify(out));
const fin = r.filter((v) => v != null); console.log(JSON.stringify({ file: "study/al9/data/history.json", bytes: fs.statSync(path.join(ROOT, "study/al9/data/history.json")).size, from: out.from, to: out.to, sessions: d.length, withReading: fin.length, min: Math.min(...fin), max: Math.max(...fin), mean: +(fin.reduce((x, y) => x + y, 0) / fin.length).toFixed(1), last: [d.at(-1), r.at(-1), s.at(-1), q.at(-1)], marks }, null, 1));
