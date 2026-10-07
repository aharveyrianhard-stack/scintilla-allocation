/* DS1 (7 Oct 2026) — the deployment system: how much equity, in which sleeves, at which levels.
   Pure arithmetic: no fetch, no file, no clock. The build (scripts/ds1-build.mjs), the tool (study/ds1/live.mjs) and the tests all read
   the market through this one file, so a number measured on twenty years of evenings and the number on the live page are the same sum.

   WHAT CHANGED AGAINST THE MATRIX (study/dm2/engine.mjs)
     · not an SPY table. Every index reading is SPY and QQQ together (the plain average of the two), and the outcome every part is
       measured against is the 50/50 blend of the two, 20 and 60 sessions on;
     · a set of named PARTS, each with its own measured curve, each shown in points. The points add: the reading is 50 plus their sum,
       so "the index is worth −8 today, breadth +3" is literally the arithmetic;
     · the reading no longer sets the whole account. The account is three kinds of money:
         CORE         held through ordinary pullbacks — this is what stops running light
         CONVICTION   the approved names, each with its own size
         TACTICAL     the only part that moves with the reading (0 = none of it deployed, 100 = all of it)
     · both ends: the low end of the reading is the stretched market, and the trim rules carry their own measured odds.

   THE MODEL (measured by the build, study/ds1/data/ds1-live.json → "model")
     parts[]   key, family, name, vote (true = counted, false = a light: shown, never added), q (101-point quantile table: a value's place
               among the evenings it was fitted on), and four curves on places 0–100: gm20 / gp20 / gm60 / gp60 — the extra median return
               of the blend and the extra share of times it was higher, 20 and 60 sessions on, at that place
     scale     sM20, sP20, sM60, sP60 (the spread of each summed curve), centre and gain (so a typical evening reads 50 and the
               2.5th–97.5th percentile of evenings spans 0–100) */

export const INDEX = ["SPY", "QQQ"];
export const SECTORS = ["XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLB", "XLRE", "XLC", "XLP", "XLU"];
export const BREADTH = [...SECTORS, "RSP"];                       // the eleven sector funds and the equal-weight fund
export const CORE = ["NVDA", "AVGO", "TSM", "ORCL", "AMZN", "GOOGL"];   // the core candidates in comps order (7 Oct): four ahead, Amazon in the middle, Alphabet last
export const CONVICTION = ["MU", "NBIS"];
export const NAMES = [...CORE, ...CONVICTION, "VST"];
export const ALL_SYMBOLS = [...INDEX, "VIX", "HYG", "IEF", ...BREADTH, ...NAMES];
/* the coordinator's 120-day betas to QQQ (7 Oct 2026): a 1% move in QQQ has gone with this many % in the name */
export const BETA_QQQ = { NVDA: 1.14, TSM: 1.54, AVGO: 1.45, MU: 3.11, GOOGL: 0.58, AMZN: 0.56, ORCL: 1.43, NBIS: 2.72, VST: 0.76 };
export const FGRID = []; for (let p = 0; p <= 100; p += 5) FGRID.push(p);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const avg2 = (a, b) => (a == null || b == null ? null : (a + b) / 2);

/* ---------- indicators (arrays in, arrays out; null where there is not enough history) ---------- */
/* Wilder's RSI(14), the same arithmetic as scripts/dm2-lib.mjs and the Hub's publisher */
export function rsi(c, p = 14) { const out = new Array(c.length).fill(null); let g = 0, l = 0, k = 0, prev = null; for (let i = 0; i < c.length; i++) { if (c[i] == null) continue; if (prev == null) { prev = c[i]; continue; } const d = c[i] - prev; prev = c[i]; const up = Math.max(d, 0), dn = Math.max(-d, 0); k++; if (k <= p) { g += up / p; l += dn / p; if (k === p) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } else { g = (g * (p - 1) + up) / p; l = (l * (p - 1) + dn) / p; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } } return out; }
export function sma(c, n) { const out = new Array(c.length).fill(null); let s = 0, k = 0; for (let i = 0; i < c.length; i++) { if (c[i] == null) { s = 0; k = 0; continue; } s += c[i]; k++; if (k > n) { s -= c[i - n]; k = n; } if (k === n) out[i] = s / n; } return out; }
export function ema(c, n) { const out = new Array(c.length).fill(null), a = 2 / (n + 1); let e = null; for (let i = 0; i < c.length; i++) { if (c[i] == null) continue; e = e == null ? c[i] : c[i] * a + e * (1 - a); out[i] = e; } return out; }
/* Williams %R(14): where the close sits in the 14-session high–low range, 0 (at the high) to −100 (at the low) */
export function willr(h, l, c, n = 14) { const out = new Array(c.length).fill(null); for (let i = n - 1; i < c.length; i++) { let hh = -Infinity, ll = Infinity, ok = true; for (let k = i - n + 1; k <= i; k++) { if (h[k] == null || l[k] == null) { ok = false; break; } if (h[k] > hh) hh = h[k]; if (l[k] < ll) ll = l[k]; } if (ok && c[i] != null) out[i] = hh > ll ? ((hh - c[i]) / (hh - ll)) * -100 : -50; } return out; }
/* the Geiger's two halves on the daily rung, the Hub publisher's own rule (provider geiger-rung-math; Hub deliverables/20260927/geiger-review):
     trend      the nine lines of the fan (EMA 5/8/13/21/34, SMA 50/100/150/200): of the eight neighbouring pairs, how many are in rising
                order, on a −1 … +1 scale
     momentum   0.6 × RSI placed on 23 … 77 plus 0.4 × Williams %R placed on −90 … −10, each on −1 … +1
   The Hub's live Geiger blends seven timeframes; this is its daily rung only — the one a daily history can replay. */
export function geigerDaily(h, l, c) {
  const E = [5, 8, 13, 21, 34].map((n) => ema(c, n)), M = [50, 100, 150, 200].map((n) => sma(c, n)), R = rsi(c), W = willr(h, l, c), N = c.length, trend = new Array(N).fill(null), mom = new Array(N).fill(null);
  for (let i = 0; i < N; i++) { if (M[3][i] == null) continue; const f = [...E.map((a) => a[i]), ...M.map((a) => a[i])]; let ord = 0; for (let k = 0; k < 8; k++) if (f[k] > f[k + 1]) ord++; trend[i] = (2 * ord - 8) / 8;
    if (R[i] != null && W[i] != null) mom[i] = 0.6 * clamp(((R[i] - 23) / 54) * 2 - 1, -1, 1) + 0.4 * clamp(((W[i] + 90) / 80) * 2 - 1, -1, 1); }
  return { trend, mom, rsi: R, wr: W }; }
/* the place of v[k] among the trailing year (252 sessions, itself included): the share strictly below it, 0–100. ref = another series
   to place against (the VIX's intraday high is placed among the year's closes) */
export function placeInYear(v, k, win = 252, need = 200, ref = null) { const x = ref ? ref[k] : v[k]; if (x == null) return null; let below = 0, n = 0; for (let i = Math.max(0, k - win + 1); i <= k; i++) { if (v[i] == null) continue; n++; if (v[i] < x) below++; } return n >= need ? (100 * below) / (n - 1 || 1) : null; }
export function yearPlaces(v, ref = null) { const out = new Array(v.length).fill(null); for (let k = 0; k < v.length; k++) out[k] = placeInYear(v, k, 252, 200, ref); return out; }

/* ---------- every reading of every part, for every session of an aligned series ----------
   S = { dates, bars: { SYM: { c, h, l } } } on SPY's sessions (see alignBars). hygTR = HYG's close with its payouts added back.
   Returns { per-part arrays, plus the per-symbol indicators the levels and the reset tracker read }. */
export const RATES_SHARE = 0.5;   // HYG moves about half as far as the 7–10 year treasury fund (IEF) for the same move in rates: its bonds are about half as long
export const CREDIT_WINDOW = 10;  // credit's own move is read over ten sessions
export function allReadings(S, hygTR) {
  const N = S.dates.length, B = S.bars, ind = {}; const I = (s) => (ind[s] ??= (() => { const b = B[s]; if (!b) return null; const g = geigerDaily(b.h, b.l, b.c); return { c: b.c, h: b.h, l: b.l, rsi: g.rsi, wr: g.wr, trend: g.trend, mom: g.mom, s21: sma(b.c, 21), s50: sma(b.c, 50), s100: sma(b.c, 100), s200: sma(b.c, 200) }; })());
  const spy = I("SPY"), qqq = I("QQQ"), vix = B.VIX, hyg = B.HYG, ief = B.IEF, col = () => new Array(N).fill(null);
  const X = { rsi: col(), wr: col(), d21: col(), d50: col(), d100: col(), gTrend: col(), gMom: col(), vixPct: col(), vixHiPct: col(), br50: col(), br200: col(), hygRsi: col(), hygWr: col(), creditOwn: col(), ld21: col(), ld50: col(), ldHot: col(), ldD50: col() };
  const dist = (o, a, i) => (o && o.c[i] != null && o[a][i] != null ? (o.c[i] / o[a][i] - 1) * 100 : null);
  /* credit: HYG with its payouts added back; its highs and lows are scaled by the same day's ratio so an ex-payout drop is not read as selling */
  const tr = hygTR || (hyg ? hyg.c : null), fac = tr && hyg ? tr.map((v, i) => (v != null && hyg.c[i] ? v / hyg.c[i] : null)) : null;
  const hRsi = tr ? rsi(tr) : col(), hWr = tr && fac ? willr(hyg.h.map((v, i) => (v != null && fac[i] != null ? v * fac[i] : null)), hyg.l.map((v, i) => (v != null && fac[i] != null ? v * fac[i] : null)), tr) : col();
  const vP = vix ? yearPlaces(vix.c) : col(), vH = vix ? yearPlaces(vix.c, vix.h.map((v, i) => (v != null && vix.c[i] != null ? Math.max(v, vix.c[i]) : vix.c[i]))) : col();
  const share = (list, a, i, need) => { let n = 0, up = 0; for (const s of list) { const o = I(s); if (!o || o.c[i] == null || o[a][i] == null) continue; n++; if (o.c[i] > o[a][i]) up++; } return n >= need ? (100 * up) / n : null; };
  for (let i = 0; i < N; i++) {
    X.rsi[i] = avg2(spy.rsi[i], qqq.rsi[i]); X.wr[i] = avg2(spy.wr[i], qqq.wr[i]); X.d21[i] = avg2(dist(spy, "s21", i), dist(qqq, "s21", i)); X.d50[i] = avg2(dist(spy, "s50", i), dist(qqq, "s50", i)); X.d100[i] = avg2(dist(spy, "s100", i), dist(qqq, "s100", i));
    X.gTrend[i] = avg2(spy.trend[i], qqq.trend[i]); X.gMom[i] = avg2(spy.mom[i], qqq.mom[i]); X.vixPct[i] = vP[i]; X.vixHiPct[i] = vH[i];
    X.br50[i] = share(BREADTH, "s50", i, 8); X.br200[i] = share(BREADTH, "s200", i, 8); X.hygRsi[i] = hRsi[i]; X.hygWr[i] = hWr[i];
    if (tr && ief && i >= CREDIT_WINDOW && tr[i] != null && tr[i - CREDIT_WINDOW] != null && ief.c[i] != null && ief.c[i - CREDIT_WINDOW] != null) X.creditOwn[i] = ((tr[i] / tr[i - CREDIT_WINDOW] - 1) - RATES_SHARE * (ief.c[i] / ief.c[i - CREDIT_WINDOW] - 1)) * 100;
    X.ld21[i] = share(CORE, "s21", i, 4); X.ld50[i] = share(CORE, "s50", i, 4);
    { let n = 0, hot = 0, d = 0; for (const s of CORE) { const o = I(s); if (!o || o.rsi[i] == null || o.s50[i] == null) continue; n++; if (o.rsi[i] >= 70) hot++; d += (o.c[i] / o.s50[i] - 1) * 100; } if (n >= 4) { X.ldHot[i] = (100 * hot) / n; X.ldD50[i] = d / n; } } }
  for (const s of [...NAMES, ...BREADTH]) I(s);
  return { X, ind, hygTR: tr, vixPct: vP, vixHiPct: vH }; }

/* ---------- the reading ---------- */
/* a value's place among the evenings the model was fitted on, 0–100: straight lines through the quantile table, flat beyond its ends */
export function placeOf(q, z) { const n = q.length - 1; if (z <= q[0]) return 0; if (z >= q[n]) return 100; let lo = 0, hi = n; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (q[mid] <= z) lo = mid; else hi = mid; } return (100 / n) * (q[hi] === q[lo] ? lo : lo + (z - q[lo]) / (q[hi] - q[lo])); }
export function curveAt(arr, u) { const x = clamp(u, 0, 100), i = Math.min(FGRID.length - 2, Math.floor(x / 5)), t = (x - FGRID[i]) / 5; return arr[i] + t * (arr[i + 1] - arr[i]); }
/* one part's vote at a value: its four measured extras, and their plain average in units of the model's own spread */
export function voteOf(part, z, scale) { if (z == null || !isFinite(z)) return null; const u = placeOf(part.q, z), m20 = curveAt(part.gm20, u), p20 = curveAt(part.gp20, u), m60 = curveAt(part.gm60, u), p60 = curveAt(part.gp60, u);
  return { z, place: u, m20, p20, m60, p60, vote: (m20 / scale.sM20 + p20 / scale.sP20 + m60 / scale.sM60 + p60 / scale.sP60) / 4 }; }
/* inputs: { key: number } for every part → the reading, 0–100, and each part's points. The points of the counted parts add to reading − 50
   (before the 0–100 clamp); a light's points are what it WOULD add, and are never added. */
export function readSystem(inputs, model) {
  const sc = model.scale, parts = [], lights = []; let sum = 0, missing = 0;
  for (const p of model.parts) { const v = voteOf(p, inputs[p.key], p.vote ? sc : p.scale || sc); const row = { key: p.key, family: p.family, name: p.name, vote: !!p.vote, value: inputs[p.key] ?? null, missing: !v, place: v ? v.place : null, m20: v ? v.m20 : null, p20: v ? v.p20 : null, m60: v ? v.m60 : null, p60: v ? v.p60 : null, points: v ? sc.gain * v.vote : 0 };
    if (p.vote) { parts.push(row); if (v) sum += v.vote; else missing++; } else lights.push(row); }
  const raw = 50 + sc.gain * (sum - sc.centre), reading = clamp(raw, 0, 100);
  /* the centre is spread over the counted parts in proportion to nothing — it is one constant, shown as its own line ("a typical evening") */
  return { reading: +reading.toFixed(1), raw: +raw.toFixed(1), base: +(50 - sc.gain * sc.centre).toFixed(1), parts, lights, missing, families: familyPoints(parts) }; }
export const FAMILY = { index: "SPY and QQQ together", vix: "the VIX as it trades", breadth: "breadth", credit: "credit", leaders: "the leaders' own state" };
export function familyPoints(parts) { const out = []; for (const f of Object.keys(FAMILY)) { const rows = parts.filter((p) => p.family === f); if (rows.length) out.push({ family: f, name: FAMILY[f], points: rows.reduce((a, p) => a + p.points, 0), parts: rows.length }); } return out; }
/* the odds that go with a reading: the band of the out-of-sample table it falls in */
export function oddsAt(reading, model) { const b = (model.odds || []).find((r) => reading >= r.lo && reading < r.hi) || (model.odds || []).at(-1); return b || null; }

/* ---------- the three kinds of money: the pie ----------
   A = the assumptions (every one an editable input with its baseline, DEFAULTS below). account = { nlv, positions: { SYM: { shares, price } } }.
   The reading moves ONLY the tactical part. The trend switch (model.trendFilter, read by the build's replay) is the one thing that may
   undercut the core, and it is shown as a state, never applied silently. */
export const DEFAULTS = {
  corePct: 45,          // CORE, % of the account — held through ordinary pullbacks
  tacticalPct: 30,      // TACTICAL at full stretch, % of the account — the reading deploys 0–100% of it
  micronPct: 20,        // Micron's conviction slot, % of the account (Alan approved 20–30)
  nebiusPct: 5,         // Nebius's conviction slot, % of the account
  coreWeights: { NVDA: 3, AVGO: 3, TSM: 3, ORCL: 3, AMZN: 2, GOOGL: 1, MU: 2 },   // rank weights inside the core, comps order; MU = Micron's core share (the memory sleeve)
  dips: [1.5, 3, 5],    // the dips drawn, % in SPY and QQQ together
  dipCredit: 0,         // on the dips drawn: 0 = a calm dip, credit holds where it is (the headline number); the same dip with credit sold off as usual is always shown beside it
  spyPerQqq: 0.70,      // a 1% move in QQQ has gone with this many % in SPY (the build re-measures it over 120 sessions)
  lineEvenings: 1,      // how many readings are averaged into the number that moves the tactical part: 1 = this minute's own (replayed 2018–2026 it did better than an average of 3 or 5, before costs, and moves about twice as much a session)
};
export function pie(reading, A = DEFAULTS, account = null) {
  const w = A.coreWeights, tot = Object.values(w).reduce((a, b) => a + b, 0) || 1, tactical = (A.tacticalPct * clamp(reading, 0, 100)) / 100;
  const slices = [{ key: "MU:conviction", sym: "MU", kind: "conviction", name: "Micron — conviction slot", pct: A.micronPct }, { key: "NBIS:conviction", sym: "NBIS", kind: "conviction", name: "Nebius — conviction slot", pct: A.nebiusPct }];
  for (const s of [...CORE, "MU"]) if (w[s] > 0) slices.push({ key: s + ":core", sym: s, kind: "core", name: s === "MU" ? "Micron — its core share (memory)" : s, pct: (A.corePct * w[s]) / tot });
  slices.push({ key: "tactical", sym: null, kind: "tactical", name: "tactical — moves with the reading", pct: tactical });
  const invested = slices.reduce((a, s) => a + s.pct, 0), over = Math.max(0, invested - 100); if (over > 0) { const t = slices.find((s) => s.kind === "tactical"); t.pct = Math.max(0, t.pct - over); }
  const inv = slices.reduce((a, s) => a + s.pct, 0); slices.push({ key: "cash", sym: null, kind: "cash", name: "cash", pct: Math.max(0, 100 - inv) });
  const out = { reading, invested: +inv.toFixed(2), core: A.corePct, conviction: A.micronPct + A.nebiusPct, tactical: +slices.find((s) => s.kind === "tactical").pct.toFixed(2), tacticalMax: A.tacticalPct, slices };
  if (account && account.nlv > 0) { const held = {}; let heldTot = 0; for (const [s, p] of Object.entries(account.positions || {})) { held[s] = (100 * p.shares * p.price) / account.nlv; heldTot += held[s]; }
    /* what is held fills a name's conviction slot first, then its core share */
    const left = { ...held }; for (const sl of slices) { if (!sl.sym) continue; const use = Math.min(left[sl.sym] || 0, sl.pct); sl.held = +use.toFixed(2); left[sl.sym] = (left[sl.sym] || 0) - use; sl.toBuy = +(sl.pct - use).toFixed(2); sl.dollars = Math.round((sl.pct / 100) * account.nlv); sl.toBuyDollars = Math.round((sl.toBuy / 100) * account.nlv); }
    for (const sl of slices) if (!sl.sym) { sl.dollars = Math.round((sl.pct / 100) * account.nlv); sl.held = sl.kind === "cash" ? +(100 - heldTot).toFixed(2) : 0; }
    out.held = +heldTot.toFixed(2); out.cashNow = +(100 - heldTot).toFixed(2); out.extraHeld = Object.fromEntries(Object.entries(left).filter(([, v]) => v > 0.005).map(([s, v]) => [s, +v.toFixed(2)])); out.nlv = account.nlv; }
  return out; }

/* ---------- levels per name ----------
   For one name: its 21-, 50-, 100- and 200-day and the named pivots under the price, each with how far away it is and the QQQ and SPY
   level it maps to through the name's beta ("QQQ at its own 21-day puts TSMC near its 21-day"). lines = [{ id, level, kind }] or []. */
export function levelsFor(sym, o, k, price, idx, lines = [], beta = BETA_QQQ[sym], spyPerQqq = DEFAULTS.spyPerQqq, maxLines = 4) {
  const rows = []; for (const [id, a] of [["21-day", "s21"], ["50-day", "s50"], ["100-day", "s100"], ["200-day", "s200"]]) if (o[a][k] != null) rows.push({ id, kind: "average", level: o[a][k] });
  /* the named pivots: the nearest few under the price; two lines within 0.15% of each other are one level with both names */
  const under = lines.filter((ln) => ln.level > 0 && ln.level < price).sort((a, b) => b.level - a.level), merged = [];
  for (const ln of under) { const last = merged[merged.length - 1]; if (last && Math.abs(last.level / ln.level - 1) < 0.0015) { if (!last.id.split(" / ").includes(ln.id)) last.id += " / " + ln.id; } else merged.push({ id: ln.id, kind: ln.kind || "line", level: ln.level }); }
  rows.push(...merged.slice(0, maxLines));
  for (const r of rows) { r.awayPct = (r.level / price - 1) * 100; r.below = r.level < price;
    if (beta > 0 && idx) { const q = r.awayPct / beta; r.qqqMovePct = q; r.qqqAt = idx.qqq * (1 + q / 100); r.spyAt = idx.spy * (1 + (q * spyPerQqq) / 100);
      /* which of QQQ's own averages that level sits nearest (within 1%) */
      let best = null; for (const [nm, lv] of Object.entries(idx.qqqLevels || {})) { if (lv == null) continue; const gap = Math.abs(r.qqqAt / lv - 1) * 100; if (best == null || gap < best.gap) best = { name: nm, gap }; } r.qqqNear = best && best.gap <= 1.0 ? best.name : null; } }
  return rows.sort((a, b) => b.level - a.level); }

/* ---------- the reset tracker ----------
   A PUSH is a session where the name closes at its highest close of 60 sessions with its RSI at or above its own usual hot mark (the
   75th percentile of its own past year). It starts a leg; the leg's TOP is the highest close since. The COOL-OFF is everything from
   that top until the close is back above it (the next leg). Inside a cool-off the tracker keeps the lowest RSI, the lowest Williams %R and the lowest Geiger momentum.
   The build measures every past cool-off of each name (how low each gauge went before the leader resumed); the live page asks: how far
   has THIS cool-off gone against that name's own usual one? */
export const PUSH = { window: 60, hotPct: 75, hotYears: 252, minSessions: 5, giveUp: 120, lookBack: 250 };   // hotYears + lookBack must fit inside the bars the live page holds (540)
export function hotMark(R, k) { const v = []; for (let i = Math.max(0, k - PUSH.hotYears + 1); i <= k; i++) if (R[i] != null) v.push(R[i]); if (v.length < 150) return null; v.sort((a, b) => a - b); return v[Math.floor((v.length - 1) * (PUSH.hotPct / 100))]; }
export function isPush(o, k) { if (o.c[k] == null || o.rsi[k] == null || k < PUSH.window) return false; for (let i = k - PUSH.window + 1; i < k; i++) if (o.c[i] != null && o.c[i] >= o.c[k]) return false; const hot = hotMark(o.rsi, k); return hot != null && o.rsi[k] >= hot; }
/* every finished cool-off in a name's history. A leg starts at a push; its TOP is the highest close since. A cool-off runs from a top until
   the close is back above it (resumed — that close is the leg's new top, hot RSI or not) or until 120 sessions pass with no new high
   (gave up — the leg is over, and the next one needs a new push). Only cool-offs of five sessions or more are kept. */
export function coolOffs(o, dates) { const out = [], N = o.c.length; let k = PUSH.window;
  while (k < N) { if (!isPush(o, k)) { k++; continue; }
    let T = k, lowR = Infinity, lowW = Infinity, lowM = Infinity, lowC = Infinity, j = k + 1, over = false; const rec = (how, end) => { if (end - T - 1 >= PUSH.minSessions && isFinite(lowR)) out.push({ push: dates[T], end: dates[Math.min(end, N - 1)], sessions: end - T - 1, how, lowRsi: lowR, lowWr: lowW, lowMom: lowM, dipPct: (lowC / o.c[T] - 1) * 100, rsiAtPush: o.rsi[T], wrAtPush: o.wr[T], momAtPush: o.mom[T] }); };
    for (; j < N; j++) { if (o.c[j] == null) continue; if (o.c[j] > o.c[T]) { rec("resumed", j); T = j; lowR = lowW = lowM = lowC = Infinity; continue; }
      if (o.rsi[j] != null && o.rsi[j] < lowR) lowR = o.rsi[j]; if (o.wr[j] != null && o.wr[j] < lowW) lowW = o.wr[j]; if (o.mom[j] != null && o.mom[j] < lowM) lowM = o.mom[j]; if (o.c[j] < lowC) lowC = o.c[j];
      if (j - T >= PUSH.giveUp) { rec("gave up", j); over = true; break; } }
    k = over ? j : N; }
  return out; }
/* where a name stands now: the last push inside the look-back, the top of the leg it started (the highest close since), and the lows
   since that top, each with its date. gaveUp = 120 sessions or more without a new high (the leg is over). */
export function coolNow(o, dates, k) { let p = -1; for (let i = k; i >= Math.max(PUSH.window, k - PUSH.lookBack); i--) if (isPush(o, i)) { p = i; break; }
  if (p < 0) return { push: null, rsi: o.rsi[k], wr: o.wr[k], mom: o.mom[k], trend: o.trend[k] }; let T = p; for (let j = p + 1; j <= k; j++) if (o.c[j] != null && o.c[j] > o.c[T]) T = j;
  let lowR = Infinity, lowW = Infinity, lowM = Infinity, lowC = Infinity, rAt = null, wAt = null, mAt = null, cAt = null;
  for (let j = T + 1; j <= k; j++) { if (o.c[j] == null) continue; if (o.rsi[j] != null && o.rsi[j] < lowR) { lowR = o.rsi[j]; rAt = dates[j]; } if (o.wr[j] != null && o.wr[j] < lowW) { lowW = o.wr[j]; wAt = dates[j]; } if (o.mom[j] != null && o.mom[j] < lowM) { lowM = o.mom[j]; mAt = dates[j]; } if (o.c[j] < lowC) { lowC = o.c[j]; cAt = dates[j]; } }
  const fin = (x) => (isFinite(x) ? x : null); return { push: dates[T], firstPush: dates[p], pushClose: o.c[T], sessions: k - T, atHigh: T === k, gaveUp: k - T >= PUSH.giveUp, resumed: null, lowRsi: fin(lowR), lowRsiAt: rAt, lowWr: fin(lowW), lowWrAt: wAt, lowMom: fin(lowM), lowMomAt: mAt, dipPct: isFinite(lowC) ? (lowC / o.c[T] - 1) * 100 : 0, dipAt: cAt, offPushPct: (o.c[k] / o.c[T] - 1) * 100, rsi: o.rsi[k], wr: o.wr[k], mom: o.mom[k], trend: o.trend[k] }; }
/* one gauge against the name's own usual cool-off. usual = { q25, med, q75, start } of the lows of its past cool-offs (start = where the
   gauge stood at the push). Two marks, both the name's own:
     COOLED       at or under the mark the shallowest quarter of its past cool-offs reached (q75) — "reset, not necessarily oversold"
     FULLY RESET  at or under the low of its usual cool-off (the median)
   done = how much of a usual cool-off this one has covered (0 = still at the push, 1 = the usual low). */
export function resetState(low, usual) { if (low == null || !usual || usual.med == null) return { state: "no measure", done: null }; const state = low <= usual.med ? "fully reset" : low <= usual.q75 ? "cooled" : "not yet";
  return { state, done: clamp((usual.start - low) / ((usual.start - usual.med) || 1), 0, 1.5) }; }

/* ---------- a dip, drawn: SPY and QQQ fall x% together from the last bar, and everything else moves the way it usually has ----------
   scn = { vixPerPct, hygPerPct, iefPerPct, fundBeta: { SYM: beta to the blend } } (measured by the build). Names move by their beta to QQQ.
   creditHolds = true draws the CALM dip: HYG and treasuries stay where they are, so only the indices, the VIX, the funds and the names move.
   Returns a copy of S whose LAST bar is the dip; the averages behind it are untouched. hygTR is moved with HYG. */
export function dipSeries(S, hygTR, x, scn, beta = BETA_QQQ, creditHolds = false) {
  const k = S.dates.length - 1, bars = {}, mv = (s) => (s === "SPY" || s === "QQQ" ? -x : s === "VIX" ? x * scn.vixPerPct : s === "HYG" ? (creditHolds ? 0 : -x * scn.hygPerPct) : s === "IEF" ? (creditHolds ? 0 : x * scn.iefPerPct) : beta[s] != null ? -x * beta[s] : -x * ((scn.fundBeta || {})[s] ?? 1));
  for (const [s, b] of Object.entries(S.bars)) { if (!b || b.c[k] == null) { bars[s] = b; continue; } const c = b.c.slice(), h = b.h.slice(), l = b.l.slice(), n = c[k] * (1 + mv(s) / 100); c[k] = n; h[k] = Math.max(h[k] ?? n, n); l[k] = Math.min(l[k] ?? n, n); bars[s] = { c, h, l }; }
  let tr = hygTR; if (hygTR && hygTR[k] != null) { tr = hygTR.slice(); tr[k] = hygTR[k] * (1 + mv("HYG") / 100); }
  return { S: { dates: S.dates, bars }, hygTR: tr }; }
/* the inputs of every part at session k of a readings table */
export function inputsAt(X, k) { const o = {}; for (const key of Object.keys(X)) o[key] = X[key][k]; return o; }

/* ---------- the stretched end: the rules tried for trimming the tactical part ----------
   One list, read by the build (which scores each rule on history) and by the live page (which says which are on now), so "on now" and
   "paid x times in y" are the same rule. ctx = stretchCtx(readings); i = a session. */
export function stretchCtx(RD, S) { const spy = S.bars.SPY.c, qqq = S.bars.QQQ.c; return { X: RD.X, rsS: RD.ind.SPY.rsi, rsQ: RD.ind.QQQ.rsi, wrS: RD.ind.SPY.wr, wrQ: RD.ind.QQQ.wr, d50pl: yearPlaces(RD.X.d50), ldDpl: yearPlaces(RD.X.ldD50),
  offHigh: (i, n) => { let hi = 0; for (let k = 0; k < n && i - k >= 0; k++) hi = Math.max(hi, (0.5 * spy[i - k]) / spy[i] + (0.5 * qqq[i - k]) / qqq[i]); return hi; } }; }
const both70 = (c, i) => c.rsS[i] >= 70 && c.rsQ[i] >= 70, pinned3 = (c, i) => i >= 2 && [0, 1, 2].every((k) => c.wrS[i - k] >= -10 && c.wrQ[i - k] >= -10), vixLow = (c, i) => c.X.vixPct[i] != null && c.X.vixPct[i] <= 10, ldHot = (c, i) => c.X.ldHot[i] != null && c.X.ldHot[i] >= 50;
export const STRETCH = [
  { key: "rsi70", name: "SPY and QQQ both at RSI 70 or more", f: both70 },
  { key: "rsi75", name: "their average RSI at 75 or more", f: (c, i) => c.X.rsi[i] >= 75 },
  { key: "wr3", name: "both pinned at the top of their range (Williams %R above −10) three sessions running", f: pinned3 },
  { key: "vixLow", name: "the VIX in the lowest tenth of its own year", f: vixLow },
  { key: "d50top", name: "SPY and QQQ further above their 50-day than on nine evenings in ten of the past year", f: (c, i) => c.d50pl[i] != null && c.d50pl[i] >= 90 },
  { key: "ldHot", name: "half or more of the core candidates at RSI 70 or more", f: ldHot },
  { key: "ldExt", name: "the core candidates further above their 50-day than on nine evenings in ten of the past year", f: (c, i) => c.ldDpl[i] != null && c.ldDpl[i] >= 90 },
  { key: "rsi70+vixLow", name: "both at RSI 70+ and the VIX in its lowest tenth", f: (c, i) => both70(c, i) && vixLow(c, i) },
  { key: "rsi70+ldHot", name: "both at RSI 70+ and half the core candidates at RSI 70+", f: (c, i) => both70(c, i) && ldHot(c, i) },
  { key: "rsi70+wr3", name: "both at RSI 70+ and pinned at the top three sessions", f: (c, i) => both70(c, i) && pinned3(c, i) },
  { key: "all3", name: "all three: both at RSI 70+, the VIX in its lowest tenth, half the core candidates at RSI 70+", f: (c, i) => both70(c, i) && vixLow(c, i) && ldHot(c, i) },
  { key: "narrow", addedAfterFirstRun: true, name: "SPY and QQQ within 1% of their 60-session high while a third or fewer of the sector and equal-weight funds hold their 50-day", f: (c, i) => i >= 60 && c.X.br50[i] != null && c.X.br50[i] <= 34 && c.offHigh(i, 60) <= 1.01 },
  { key: "rsiCool", name: "RSI was 70+ within ten sessions and has cooled under 60 with price within 2% of the high", f: (c, i) => { if (i < 12 || !(c.X.rsi[i] < 60)) return false; let was = false; for (let k = 1; k <= 10; k++) if (c.X.rsi[i - k] >= 70) was = true; return was && c.offHigh(i, 21) <= 1.02; } },
];
export function stretchNow(ctx, i, reading) { const on = {}; for (const r of STRETCH) { try { on[r.key] = !!r.f(ctx, i); } catch (e) { on[r.key] = false; } } on.readingLow = reading != null && reading < 20; return on; }
