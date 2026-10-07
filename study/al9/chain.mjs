/* AL9 (7 Oct 2026) — the chain: how one number for the whole account becomes a size for every name.
   Pure arithmetic: no fetch, no file, no clock, no page. The panel (study/al9/panel.mjs), the pictures and the tests read this one file.

   THE CHAIN (Alan, 7 Oct: "the fact that I have to ask how Micron comes to 40 means the pies are not complete enough")
     1  THE ACCOUNT          invested (the number) + cash
     2  WHAT IS INVESTED     the held part (invested whatever the market does) + the tactical part (the market reading, 0 to 100, puts
                             that share of it to work)                                    the number = held + tactical × reading ÷ 100
     3  WHO GETS IT          conviction + core. Conviction is 1 dollar in 4 of what is invested (Alan's baseline), and a little more as
                             the market reading rises ("when the tool recommends more equity … a little bit more allowance for conviction")
     4  EACH NAME            conviction: Micron and Nebius · core: the core candidates by their weights, Micron's memory share among them

   IS IT ALWAYS DIRECTLY PROPORTIONAL? Inside conviction and inside the core, yes: a name is the same share of its part at any number, so
   when the number moves every name moves with it. Two things are not: conviction's share of what is invested rises with the market
   reading (the lift dial; at 0 lift the whole pie is proportional), and no name goes over its cap (Micron: 30% of the account, the
   approved rule) — what a capped name gives up goes to the other core names.

   CEILINGS  the same chain at a market reading of 100 — fully invested. A name's size there is the most the tool will ever ask for it.
   THE BREAKOUT BAND  the one way over the number: a conviction name that is breaking out may be held above its target by its part of the
   band (a stated number of points of the account), never above its ceiling; when the breakout ends that part is trimmed first. */
import { CORE } from "../ds1/engine.mjs";

export const CONVICTION = ["MU", "NBIS"];
export const ROWS = [...CONVICTION, ...CORE];                       // room to play, top to bottom: the conviction names, then the core in comps order
export const LABEL = { MU: "Micron", NBIS: "Nebius", NVDA: "Nvidia", AVGO: "Broadcom", TSM: "TSMC", ORCL: "Oracle", AMZN: "Amazon", GOOGL: "Alphabet" };
/* every dial with its baseline — each one is an input in the tool's assumptions panel */
export const DIALS = {
  heldPct: 70,        // the held part, % of the account (DS1's core 45 + conviction 25): invested whatever the market reading is
  tacticalPct: 30,    // the tactical part at full, % of the account: the market reading puts 0–100% of it to work
  convShare: 25,      // conviction's share of what is invested at a market reading of 0, % — Alan's 1 in 4
  convLift: 5,        // points of share conviction gains as the market reading goes from 0 to 100
  micronOfConv: 80,   // Micron's part of conviction, % (DS1's 20 against Nebius's 5); Nebius has the rest
  capMicron: 30,      // Micron is never more than this % of the account (the approved rule: "never more than 30% of the account")
  bandPts: 5,         // the breakout band, points of the account over the number — conviction names only, in their own proportions
  breakoutDays: 60,   // breaking out = the price is above its highest close of this many sessions
  smoothMin: 60,      // the number shown is the average of this many minutes (no averaging over days)
  buyFirst: 50,       // of a name's room, this % is placed at its first buy level; the rest at the second
  zonePct: 1,         // levels within this % of each other are one level in room to play, so a name's two buys (and its two trims) are two different prices
};
/* the lows and highs Alan named on 7 Oct 2026. scripts/al9-history.mjs decides low or high from SPY's own closes and writes them into the
   history file; this list is the same answer, used while that file is on its way (a test holds the two equal) */
export const NAMED = [{ d: "2025-04-08", kind: "low" }, { d: "2026-03-30", kind: "low" }, { d: "2026-07-29", kind: "low" }, { d: "2026-08-13", kind: "high" }, { d: "2026-09-16", kind: "low" }, { d: "2026-10-06", kind: "high" }];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sum = (a) => a.reduce((x, y) => x + y, 0);

/* the number: % of the account to have invested, at a market reading */
export const numberAt = (reading, A) => clamp(+A.heldPct + (+A.tacticalPct * clamp(reading, 0, 100)) / 100, 0, 100);
/* conviction's share of what is invested, %, at a market reading */
export const convShareAt = (reading, A) => clamp(+A.convShare + (+A.convLift * clamp(reading, 0, 100)) / 100, 0, 100);

/* the whole chain at one market reading. Every pct is a % of the ACCOUNT; ofAbove is the slice's share of the level above it. */
export function chainAt(reading, A) {
  const r = clamp(reading, 0, 100), number = numberAt(r, A), held = Math.min(Math.max(0, +A.heldPct), number), tactical = number - held;
  const cDial = convShareAt(r, A), m = clamp(+A.micronOfConv, 0, 100) / 100, w = A.coreWeights || {}, coreSyms = [...CORE, "MU"].filter((s) => w[s] > 0), wTot = sum(coreSyms.map((s) => +w[s])) || 1;
  const conv0 = (number * cDial) / 100, core0 = number - conv0, slices = [];
  if (m > 0) slices.push({ key: "MU:conviction", sym: "MU", kind: "conviction", pct: conv0 * m });
  if (m < 1) slices.push({ key: "NBIS:conviction", sym: "NBIS", kind: "conviction", pct: conv0 * (1 - m) });
  for (const s of coreSyms) slices.push({ key: s + ":core", sym: s, kind: "core", pct: (core0 * w[s]) / wTot });
  /* the cap: a name over it gives up its core share first, then conviction; what it gives up goes to the other core names by their weights */
  const capped = [];
  for (const [s, cap] of [["MU", +A.capMicron]]) { if (!(cap > 0)) continue; const mine = slices.filter((x) => x.sym === s), total = sum(mine.map((x) => x.pct)); let over = total - cap; if (over <= 1e-9) continue;
    for (const sl of [...mine.filter((x) => x.kind === "core"), ...mine.filter((x) => x.kind === "conviction")]) { const cut = Math.min(over, sl.pct); sl.pct -= cut; sl.cut = (sl.cut || 0) + cut; over -= cut; }
    const others = slices.filter((x) => x.kind === "core" && x.sym !== s), wo = sum(others.map((x) => +w[x.sym])), given = total - cap; if (wo > 0) for (const o of others) o.pct += (given * w[o.sym]) / wo;
    capped.push({ sym: s, cap, wouldBe: total, givenUp: given, toCash: wo > 0 ? 0 : given }); }
  const conviction = sum(slices.filter((x) => x.kind === "conviction").map((x) => x.pct)), core = sum(slices.filter((x) => x.kind === "core").map((x) => x.pct)), invested = conviction + core;
  for (const sl of slices) { const above = sl.kind === "conviction" ? conviction : core; sl.ofAbove = above > 0 ? (100 * sl.pct) / above : 0; sl.ofInvested = invested > 0 ? (100 * sl.pct) / invested : 0; sl.heldPart = invested > 0 ? (sl.pct * Math.min(held, invested)) / invested : 0; sl.tacticalPart = sl.pct - sl.heldPart; }
  const names = {}; for (const sl of slices) { const n = (names[sl.sym] ||= { sym: sl.sym, pct: 0, parts: [] }); n.pct += sl.pct; n.parts.push(sl); }
  for (const n of Object.values(names)) { n.ofInvested = invested > 0 ? (100 * n.pct) / invested : 0; n.capped = capped.some((c) => c.sym === n.sym); }
  return { reading: r, number: invested, numberDial: number, held: Math.min(held, invested), tactical: Math.max(0, invested - Math.min(held, invested)), tacticalFull: +A.tacticalPct, cash: 100 - invested,
    convShareDial: cDial, conviction, core, convOfInvested: invested > 0 ? (100 * conviction) / invested : 0, coreOfInvested: invested > 0 ? (100 * core) / invested : 0, slices, names, capped }; }
/* the same chain fully invested: each name's ceiling */
export const ceilingsOf = (A) => chainAt(100, A);

/* the answer to "is it always directly proportional?", from the dials themselves. shares = a name's share of what is invested at a
   market reading of 0, now, and 100; moves = true when any of them differ by a tenth of a point or more. */
export function proportional(A, readingNow) {
  const at = [0, readingNow, 100].map((r) => chainAt(r, A)), rows = ROWS.filter((s) => at.some((c) => c.names[s])).map((s) => { const v = at.map((c) => (c.names[s] ? c.names[s].ofInvested : 0)); return { sym: s, at0: v[0], now: v[1], at100: v[2], moves: Math.max(...v) - Math.min(...v) >= 0.1 }; });
  return { exact: rows.every((x) => !x.moves), rows, conv: at.map((c) => c.convOfInvested), capBinds: at.map((c) => c.capped.length > 0) }; }

/* is a name breaking out? its price is above its highest close of the past `days` sessions (closes[k] is today's own price) */
export function breakingOut(closes, k, days = DIALS.breakoutDays) { if (!closes || closes[k] == null || k < days) return false; let hi = -Infinity; for (let i = k - days; i < k; i++) if (closes[i] != null && closes[i] > hi) hi = closes[i]; return isFinite(hi) && closes[k] > hi; }
export function highOf(closes, k, days = DIALS.breakoutDays) { let hi = -Infinity; for (let i = Math.max(0, k - days); i < k; i++) if (closes && closes[i] != null && closes[i] > hi) hi = closes[i]; return isFinite(hi) ? hi : null; }

/* ---------- room to play ----------
   now / full = chainAt(reading) and ceilingsOf(). account = { nlv, positions: { SYM: { shares, price } } }. breaking = { SYM: true } for a name
   that is breaking out. For every name: its target, what is held, the room (target − held), its ceiling, and — conviction names only — its
   part of the breakout band. allowed = the most the account may hold of it right now. */
export function roomToPlay(now, full, account, A, breaking = {}) {
  const nlv = (account && account.nlv) || 0, pos = (account && account.positions) || {}, m = clamp(+A.micronOfConv, 0, 100) / 100, bandOf = { MU: +A.bandPts * m, NBIS: +A.bandPts * (1 - m) }, usd = (p) => (p / 100) * nlv, rows = [];
  for (const s of ROWS) { const t = now.names[s] ? now.names[s].pct : 0, ceil = full.names[s] ? full.names[s].pct : 0; if (!(t > 0) && !(ceil > 0) && !pos[s]) continue;
    const p = pos[s], shares = p ? +p.shares : 0, price = p ? p.price : null, held = nlv > 0 && p ? (100 * shares * p.price) / nlv : 0, isConv = CONVICTION.includes(s);
    const band = isConv ? Math.max(0, Math.min(bandOf[s] || 0, ceil - t)) : 0, open = isConv && !!breaking[s], allowed = t + (open ? band : 0), room = t - held, over = Math.max(0, held - allowed);
    rows.push({ sym: s, name: LABEL[s] || s, conviction: isConv, target: t, ceiling: ceil, held, shares, price, room, roomUsd: usd(room), targetUsd: usd(t), heldUsd: usd(held), band, bandOpen: open, allowed, over, overUsd: usd(over), inBand: Math.max(0, Math.min(held - t, band)), parts: now.names[s] ? now.names[s].parts : [], capped: !!(full.names[s] && full.names[s].capped) }); }
  const other = Object.entries(pos).filter(([s]) => !ROWS.includes(s)).map(([s, p]) => ({ sym: s, held: nlv > 0 ? (100 * p.shares * p.price) / nlv : 0 })).filter((x) => x.held > 0.005);
  const held = sum(rows.map((x) => x.held)) + sum(other.map((x) => x.held)), bandOpen = sum(rows.filter((x) => x.bandOpen).map((x) => x.band));
  return { rows, other, nlv, target: now.number, held, room: now.number - held, roomUsd: usd(now.number - held), ceiling: full.number, bandPts: +A.bandPts, bandOpen, allowed: now.number + bandOpen }; }

/* ---------- the levels: a name's next two buy levels (under the price) and next two trim levels (above it), from our own data ----------
   cands = [{ id, level }] — its averages, the named lines Alan reviewed, its usual cool-off, its last top. Levels within `within` % of the
   nearest one of their group are one level carrying every name (0.15% is DS1's rule for its own list; room to play asks for 1%, the
   zonePct dial, so that two orders are never a few dollars apart). The level's price is the one nearest today's price. */
export function nextLevels(price, cands, n = 2, within = 0.15) { const merge = (list) => { const out = []; for (const c of list) { const last = out[out.length - 1]; if (last && Math.abs(last.level / c.level - 1) < within / 100) { if (!last.id.split(" / ").includes(c.id)) last.id += " / " + c.id; } else out.push({ id: c.id, level: c.level }); } return out; };
  const ok = (cands || []).filter((c) => c && c.level > 0 && isFinite(c.level)), below = merge(ok.filter((c) => c.level < price).sort((a, b) => b.level - a.level)).slice(0, n), above = merge(ok.filter((c) => c.level > price).sort((a, b) => a.level - b.level)).slice(0, n);
  for (const l of [...below, ...above]) l.awayPct = (l.level / price - 1) * 100; return { buys: below, trims: above }; }
/* the sizes. Buys: at the first level, buyFirst% of the room there; at the second, all the room left (the room is the target in dollars less
   what the shares are worth AT that level, so it grows as the price falls). Trims: at each level, whatever is over the allowed size at that
   price. The account's value is held where it is. Returns the levels with { shares, usd } or a plain reason for none. */
export function sizeOrders(row, levels, A, nlv) { const tgt = (row.target / 100) * nlv, allow = (row.allowed / 100) * nlv, first = clamp(+A.buyFirst, 0, 100) / 100; let sh = row.shares;
  const buys = levels.buys.map((l, i) => { const roomAt = tgt - sh * l.level, want = (i === 0 && levels.buys.length > 1 ? first : 1) * roomAt, n = want > 0 ? Math.floor(want / l.level) : 0; sh += n; return { ...l, shares: n, usd: n * l.level, why: n > 0 ? null : roomAt <= 0 ? "at target" : "under one share" }; });
  sh = row.shares; const trims = levels.trims.map((l) => { if (!(sh > 0)) return { ...l, shares: 0, usd: 0, why: "none held" }; const overAt = sh * l.level - allow, n = overAt > 0 ? Math.min(sh, Math.ceil(overAt / l.level)) : 0; const worth = (100 * sh * l.level) / (nlv || 1); sh -= n; return { ...l, shares: n, usd: n * l.level, why: n > 0 ? null : "under target", worthPct: worth }; });
  return { buys, trims }; }

/* ---------- the number through the day ----------
   readAt({ SPY, QQQ, HYG, IEF }) → the market reading at those four prices with every other day as it closed (the panel builds it from
   DS1's own sums). bars5 = { SYM: [{ t, o, c }] } five-minute bars; session = "2026-10-07"; clock = (ms) → { date, minutes }.
   One point at the open (09:30, each symbol's first print) and one at the end of every five minutes of the regular session. */
export const OPEN_MIN = 9 * 60 + 30, CLOSE_MIN = 16 * 60, VOTERS = ["SPY", "QQQ", "HYG", "IEF"];
export function dayPath(bars5, session, clock, readAt, A, lastClose = {}) {
  const ser = {}; for (const s of VOTERS) ser[s] = ((bars5 && bars5[s]) || []).filter((b) => b && b.c != null && b.t != null).map((b) => ({ ...b, ...clock(b.t) })).sort((a, b) => a.t - b.t);
  const reg = (b) => b.date === session && b.minutes >= OPEN_MIN && b.minutes < CLOSE_MIN, spy = ser.SPY.filter(reg); if (!spy.length) return [];
  /* a symbol's price at a moment: its last five-minute close at or before it; before its first bar of the day, yesterday's close */
  const at = (s, endMs) => { let p = lastClose[s] ?? null; for (const b of ser[s]) { if (b.t + 300000 <= endMs) p = b.c; else break; } return p; };
  const pts = [], push = (ms, minutes, px) => { if (VOTERS.some((s) => px[s] == null)) return; const reading = readAt(px); if (reading == null || !isFinite(reading)) return; pts.push({ t: ms, minutes, hm: String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0"), reading, number: numberAt(reading, A), spy: px.SPY, qqq: px.QQQ }); };
  const first = spy[0], openPx = {}; for (const s of VOTERS) { const b = ser[s].find((x) => reg(x) && x.minutes === first.minutes); openPx[s] = b && b.o != null ? b.o : at(s, first.t); }
  push(first.t, first.minutes, openPx);
  for (const b of spy) { const end = b.t + 300000, px = {}; for (const s of VOTERS) px[s] = s === "SPY" ? b.c : at(s, end); push(end, b.minutes + 5, px); }
  return pts; }
/* the number shown: the average of the day's points inside the last smoothMin minutes, with the live point ({ number, reading }) counted as
   one of them. Outside the regular session (the last five-minute point is more than ten minutes old) the last hour of it is what is averaged. */
export function smoothed(points, live, A, nowMs) { const mins = Math.max(1, +A.smoothMin || 60), win = mins * 60000, last = points.length ? points[points.length - 1].t : null, stale = last != null && nowMs - last > 10 * 60000, edge = stale ? last : nowMs;
  const inWin = points.filter((p) => p.t > edge - win && p.t <= edge), all = live && !stale ? [...inWin, live] : inWin.length ? inWin : live ? [live] : []; if (!all.length) return null; const mean = (f) => sum(all.map(f)) / all.length;
  return { number: mean((p) => p.number), reading: mean((p) => p.reading), points: all.length, minutes: mins, min: Math.min(...all.map((p) => p.number)), max: Math.max(...all.map((p) => p.number)), sessionOver: stale }; }
/* the three moments beside the number: the open, the moment SPY and QQQ together were lowest, and the range of the number itself */
export function dayMarks(points) { if (!points.length) return { open: null, low: null, hi: null, lo: null }; const b0 = points[0], blend = (p) => 0.5 * (p.spy / b0.spy) + 0.5 * (p.qqq / b0.qqq); let low = points[0], hi = points[0], lo = points[0];
  for (const p of points) { if (blend(p) < blend(low)) low = p; if (p.number > hi.number) hi = p; if (p.number < lo.number) lo = p; } return { open: points[0], low: { ...low, offOpenPct: (blend(low) - 1) * 100 }, hi, lo }; }

/* ---------- the number's history: the stored replay (study/al9/data/history.json), then the sessions since from the page's own daily bars ----------
   H = { d, r, s } · tail = { dates, reading, spy } from the live page (its last element may be today's live bar). */
export function dailyHistory(H, tail, A) { const d = [], r = [], s = []; if (H && H.d) for (let i = 0; i < H.d.length; i++) { if (H.r[i] == null) continue; d.push(H.d[i]); r.push(H.r[i]); s.push(H.s[i]); }
  const last = d.length ? d[d.length - 1] : ""; if (tail) for (let i = 0; i < tail.dates.length; i++) if (tail.dates[i] > last && tail.reading[i] != null) { d.push(tail.dates[i]); r.push(tail.reading[i]); s.push(tail.spy[i]); }
  return { d, r, s, n: r.map((x) => numberAt(x, A)) }; }
