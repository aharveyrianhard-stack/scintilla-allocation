/* HM1 (6 Oct 2026) — the Hub's Geiger, rebuilt for any past evening from the bars the chart API serves.

   This is the publisher's reading, rule for rule (provider repo, live code line provider/p9-prevclose-hold-20261002, read only):
     services/hot-query/geiger-rung-math.mjs      one rung = the newest 230 bars: TREND = order of the nine-line fan (EMA 5 8 13 21 34,
                                                  SMA 50 100 150 200, a line joins once there are enough bars), MOMENTUM = 0.6 × RSI(14)
                                                  on 23..77 + 0.4 × Williams %R(14) on −90..−10, the rung = half trend, half momentum
     services/rest-accel/provider-bar-finality.mjs only COMPLETED bars are read: a bar counts once the last possible trading close inside
                                                  it has passed. On the evening of a session that is every intraday bar of that day, the
                                                  day's own bar, a 3-day bar only if no later session falls inside it, and a weekly bar
                                                  only once its last session has closed (so Monday to Thursday the weekly rung is last week)
     services/hot-query/geiger-source-contract.mjs an intraday rung whose newest bar is older than the day's own bar is left out, and the
                                                  rungs present are blended by the Equalizer's weights, renormalised
   The seven rungs and their weights are the ones the live /geiger names (participating_rungs): 3h 4h 6h 12h 1d 3d 1w.

   HEAT1 rebuilt three of the seven (D, 3D, W — 41% of the weight) because it took the intraday bars to be unavailable. They are served
   back to each fund's first day, so this file reads all seven. scripts/hm1-bottoms.mjs checks the result against the Hub's own /geiger. */
import fs from "node:fs"; import path from "node:path";

export const DAY = 864e5;
export const dayNumOf = (t) => Math.floor(t / DAY);                 // every bar the chart API serves starts between 00:00 and 19:00 New York time, so its UTC date is its New York date
export const isoOfDayNum = (n) => new Date(n * DAY).toISOString().slice(0, 10);
export const dayNum = (d) => Math.round(Date.parse(d + "T00:00:00Z") / DAY);
const clamp = (x) => Math.max(-1, Math.min(1, x));

/* the Equalizer as the live /geiger publishes it (key → the chart API's timeframe token, weight) */
export const RUNGS = [["3h", "180", 1.235817], ["4h", "240", 2.278755], ["6h", "6h", 3.178477], ["12h", "12h", 3.172702], ["1d", "D", 3.178477], ["3d", "3D", 2.576738], ["1w", "W", 0.987499]];
export const INTRADAY = new Set(["3h", "4h", "6h", "12h"]);
export const BARS_PER_RUNG = 230;
const FAN = [["e", 5], ["e", 8], ["e", 13], ["e", 21], ["e", 34], ["s", 50], ["s", 100], ["s", 150], ["s", 200]];
const RSI_OS = 23, RSI_OB = 77, W_OS = -90, W_OB = -10, W_RSI = 0.6, W_WILL = 0.4, FAM_TREND = 0.5, FAM_MOM = 0.5;

/* one rung's reading on bars [a, b) of the arrays C, H, L — the publisher's geigerRungRead, without copying the window */
export function rungRead(C, H, L, a, b) {
  const n = b - a; let lines = 0, prev = 0, inOrder = 0, pairs = 0;
  for (const [ty, len] of FAN) { if (n < len) continue; let v;
    if (ty === "e") { const k = 2 / (len + 1); v = C[a]; for (let i = a + 1; i < b; i++) v = C[i] * k + v * (1 - k); }
    else { let s = 0; for (let i = b - len; i < b; i++) s += C[i]; v = s / len; }
    if (lines > 0) { pairs++; if (prev > v) inOrder++; } prev = v; lines++; }
  if (pairs <= 0) return null;
  const trend = (2 * inOrder - pairs) / pairs; let mom = null, rsi = null, wr = null;
  if (n >= 15) { let g = 0, l = 0; for (let i = a + 1; i <= a + 14; i++) { const d = C[i] - C[i - 1]; if (d > 0) g += d; else l -= d; } g /= 14; l /= 14;
    for (let i = a + 15; i < b; i++) { const d = C[i] - C[i - 1]; g = (g * 13 + (d > 0 ? d : 0)) / 14; l = (l * 13 + (d < 0 ? -d : 0)) / 14; }
    rsi = 100 - 100 / (1 + (l === 0 ? 1e9 : g / l)); let hh = -1e18, ll = 1e18; for (let i = b - 14; i < b; i++) { if (H[i] > hh) hh = H[i]; if (L[i] < ll) ll = L[i]; }
    const close = C[b - 1]; wr = hh > ll ? (hh - close) / (hh - ll) * -100 : -50;
    mom = (clamp((rsi - RSI_OS) / (RSI_OB - RSI_OS) * 2 - 1) * W_RSI + clamp((wr - W_OS) / (W_OB - W_OS) * 2 - 1) * W_WILL) / (W_RSI + W_WILL); }
  const read = mom == null ? trend : (FAM_TREND * trend + FAM_MOM * mom) / (FAM_TREND + FAM_MOM);
  return { trend, mom, read, rsi, wr, lines };
}

/* the provider's buckets for a 3-day and a weekly bar (a 3-day bar starts every third calendar day from 10 Sep 2003; a week on Sunday) */
const A3 = dayNum("2003-09-10"), AW = dayNum("2003-09-07");
export const bucketStart = { "3d": (dn) => A3 + 3 * Math.floor((dn - A3) / 3), "1w": (dn) => AW + 7 * Math.floor((dn - AW) / 7) };
export const SPAN = { "3d": 3, "1w": 7 };
/* daily bars rolled up into the provider's buckets — used only where the provider's own 3-day or weekly series has no bar (QQQ's 3-day bars
   are missing from Dec 2004 to Mar 2011, the years it traded as QQQQ; oil, gold and bitcoin have no provider-built series at all) */
export function rollup(D, key) { const out = { dn: [], h: [], l: [], c: [] }; let id = null; for (let i = 0; i < D.dn.length; i++) { const s = bucketStart[key](D.dn[i]);
    if (s !== id) { out.dn.push(s); out.h.push(D.h[i]); out.l.push(D.l[i]); out.c.push(D.c[i]); id = s; } else { const j = out.dn.length - 1; if (D.h[i] > out.h[j]) out.h[j] = D.h[i]; if (D.l[i] < out.l[j]) out.l[j] = D.l[i]; out.c[j] = D.c[i]; } } return out; }

const cols = (rows) => { const o = { t: new Array(rows.length), dn: new Array(rows.length), h: new Array(rows.length), l: new Array(rows.length), c: new Array(rows.length) }; for (let i = 0; i < rows.length; i++) { const r = rows[i]; o.t[i] = r[0]; o.dn[i] = dayNumOf(r[0]); o.h[i] = r[1]; o.l[i] = r[2]; o.c[i] = r[3]; } return o; };
/* every rung's bars for one symbol, from the cache scripts/hm1-pull.mjs filled */
export function loadSymbol(cache, sym) { const out = { sym, bars: {}, source: {} };
  const df = path.join(cache, `${sym}_D.json`); if (!fs.existsSync(df)) return null;
  const seen = new Set(), rows = []; for (const b of JSON.parse(fs.readFileSync(df, "utf8")).series || []) { if (!b || b.c == null) continue; const dn = dayNumOf(b.t); if (seen.has(dn)) continue; seen.add(dn); rows.push([b.t, b.h ?? b.c, b.l ?? b.c, b.c]); }
  out.bars["1d"] = cols(rows); out.source["1d"] = "provider";
  for (const [key, tok] of RUNGS) { if (key === "1d") continue; const f = path.join(cache, "intraday", `${sym}_${tok}.json`);
    if (fs.existsSync(f)) { out.bars[key] = cols(JSON.parse(fs.readFileSync(f, "utf8")).rows || []); out.source[key] = "provider"; } }
  for (const key of ["3d", "1w"]) out.bars[key + "_rolled"] = rollup(out.bars["1d"], key);
  return out; }

/* The Geiger of one symbol on the evening of every session.
   sessions: [{dn}] in order (the equity sessions); next[i] = the day number of the session after i.
   Returns an array (one entry per session, or null): { g, trend, mom, used:[keys], left:[{key, why}], per:{key:{trend,mom,read,rsi,wr,lines,newest}} } */
export function geigerSeries(S, sessDn, nextDn, { keep = false, only = null } = {}) {
  const out = new Array(sessDn.length).fill(null); const ptr = {}; const keys = RUNGS.filter(([k]) => !only || only.includes(k));
  for (const [k] of keys) { ptr[k] = 0; ptr[k + "_rolled"] = 0; }
  /* the day's own bar first: it is the reference session for the staleness rule */
  const order = [...keys].sort((a, b) => (b[0] === "1d") - (a[0] === "1d"));
  for (let i = 0; i < sessDn.length; i++) { const dn = sessDn[i], nx = nextDn[i]; const reads = [], left = []; let dailyNewest = null;
    for (const [k, , w] of order) { let B = S.bars[k], src = "provider", cnt;
      const count = (bars, pk) => { let p = ptr[pk]; const limit = (j) => (k === "3d" || k === "1w" ? bars.dn[j] + SPAN[k] <= nx : bars.dn[j] <= dn); while (p < bars.dn.length && limit(p)) p++; ptr[pk] = p; return p; };
      if (B) cnt = count(B, k);
      if (k === "3d" || k === "1w") { const R = S.bars[k + "_rolled"]; const rc = count(R, k + "_rolled");
        /* the provider's own bars when they reach the newest completed bucket; the roll-up of the daily bars where they do not */
        if (!B || cnt === 0 || (rc > 0 && B.dn[cnt - 1] !== R.dn[rc - 1])) { B = R; cnt = rc; src = "rolled from daily bars"; } }
      if (!B || !cnt) { left.push({ key: k, why: "no bars" }); continue; }
      const newest = B.dn[cnt - 1];
      if (k === "1d") dailyNewest = newest;
      if (INTRADAY.has(k) && dailyNewest != null && newest < dailyNewest) { left.push({ key: k, why: "newest bar " + isoOfDayNum(newest) + " is older than the day's own bar" }); continue; }
      const r = rungRead(B.c, B.h, B.l, Math.max(0, cnt - BARS_PER_RUNG), cnt); if (!r) { left.push({ key: k, why: "too few bars for the fan" }); continue; }
      reads.push({ key: k, w, r, newest, src }); }
    if (!reads.length || dailyNewest == null || dn - dailyNewest > 5) continue;   // no bar of its own within five days: no reading
    let W = 0, c = 0, t = 0, mW = 0, m = 0; for (const x of reads) { W += x.w; c += x.w * x.r.read; t += x.w * x.r.trend; if (x.r.mom != null) { mW += x.w; m += x.w * x.r.mom; } }
    const row = { g: c / W, trend: t / W, mom: mW ? m / mW : null, n: reads.length, w: W, asof: dailyNewest };
    if (keep) { row.per = Object.fromEntries(reads.map((x) => [x.key, { trend: x.r.trend, mom: x.r.mom, read: x.r.read, rsi: x.r.rsi, wr: x.r.wr, lines: x.r.lines, newest: isoOfDayNum(x.newest), src: x.src }])); row.left = left; }
    else if (left.length) row.left = left.map((x) => x.key);
    out[i] = row; }
  return out; }

/* The same reading at any instant T (UTC ms), with the publisher's finality rule in full rather than its end-of-day shortcut: a bar counts once the
   last possible trading close inside it has passed — an intraday bar at its own end or at 20:00 New York, whichever is first; the day's bar at
   16:00 New York; a 3-day or weekly bar once no session that has not yet closed falls inside it. Used only to check the rebuild against a /geiger
   answer saved in the middle of an evening; the replay itself reads every session at its end (geigerSeries). */
const NYF = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const nyOffset = (t) => { const p = {}; for (const x of NYF.formatToParts(new Date(t))) p[x.type] = +x.value; return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000; };
export const nyClock = (t, hour) => { const off = nyOffset(t); return Math.floor((t + off) / DAY) * DAY + hour * 3600e3 - off; };   // HH:00 New York on the New York day of t, as a UTC instant
const HOURS = { "3h": 3, "4h": 4, "6h": 6, "12h": 12 };
export function geigerAt(S, T, sessDn) { let li = -1; for (let i = sessDn.length - 1; i >= 0; i--) if (nyClock(sessDn[i] * DAY + 12 * 3600e3, 20) <= T) { li = i; break; }
  let nx; if (li + 1 < sessDn.length) nx = sessDn[li + 1]; else { nx = sessDn[li] + 1; while ([0, 6].includes(new Date(nx * DAY).getUTCDay())) nx++; }
  const reads = []; let dailyNewest = null;
  for (const [k, , w] of [...RUNGS].sort((a, b) => (b[0] === "1d") - (a[0] === "1d"))) { let B = S.bars[k]; if (!B && (k === "3d" || k === "1w")) B = S.bars[k + "_rolled"]; if (!B) continue;
    let cnt = 0; const fin = (j) => (k === "1d" ? nyClock(B.t[j], 16) <= T : HOURS[k] ? Math.min(B.t[j] + HOURS[k] * 3600e3, nyClock(B.t[j], 20)) <= T : B.dn[j] + SPAN[k] <= nx);
    for (let j = B.dn.length - 1; j >= 0; j--) if (fin(j)) { cnt = j + 1; break; }
    if (!cnt) continue; const newest = B.dn[cnt - 1]; if (k === "1d") dailyNewest = newest; if (INTRADAY.has(k) && dailyNewest != null && newest < dailyNewest) continue;
    const r = rungRead(B.c, B.h, B.l, Math.max(0, cnt - BARS_PER_RUNG), cnt); if (r) reads.push({ key: k, w, r, newest }); }
  if (!reads.length) return null; let W = 0, c = 0, t = 0, mW = 0, m = 0; for (const x of reads) { W += x.w; c += x.w * x.r.read; t += x.w * x.r.trend; if (x.r.mom != null) { mW += x.w; m += x.w * x.r.mom; } }
  return { g: c / W, trend: t / W, mom: mW ? m / mW : null, n: reads.length }; }
