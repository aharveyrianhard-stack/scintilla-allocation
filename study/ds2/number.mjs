/* DS2 (7 Oct 2026) — the number, version 2. Pure arithmetic: no fetch, no file, no clock. The study (scripts/ds2-build.mjs), the live tool
   (study/ds1/live.mjs, study/al9/panel.mjs), the stored history and the TradingView pane's proof all read the market through this one file,
   so the version measured on 2018–2026 and the version on the screen are the same sum.

   VERSION 1 (DS1 + AL9)   market reading = a typical day + the RSI part + the credit part, held to 0 … 100
                           % invested     = the held part + the tactical part × market reading ÷ 100

   VERSION 2 changes two things in the market reading and nothing else:

   1 · CREDIT DOES NOT SUBTRACT IN A WASHED-OUT MARKET   (Alan, 7 Oct: "towards March 30th it tells us to drop right there … we would be
       selling into losses")
       When the credit part subtracts, what it subtracts is multiplied by a fade: 1 while SPY and QQQ's average RSI is 45 or more, 0 at 35
       and under, in proportion between. When the credit part adds, it adds in full, as before.
   2 · CASH IS RAISED AT AN EXTENDED HIGH AND PUT BACK AT THE NEXT WASHOUT   ("raise cash towards the end of 2025 … deploy harder towards
       the end of March")
       ON  at a close where SPY and QQQ are BOTH within 2% of their own highest close of the past 252 sessions AND their average distance
           above their 200-day average is in the top fifth of the days the rule was measured on;
       OFF at a close where their average RSI is under 40.
       While it is on, the market reading is halved — so half of the tactical money that would be at work is held as cash.

   Every threshold is in RULES below and is written into study/ds2/data/ds2-live.json by the build (the one measured number among them,
   the top-fifth distance, comes from the build; the rest are the round numbers the study fixed before it ran). */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const RULES = { creditRule: 1, fadeFrom: 45, fadeTo: 35, cashRule: 1, nearPct: 2, highDays: 252, avgDays: 200, extPct: 11.21, resetRsi: 40, cashCut: 0.5 };

/* how much of credit's subtraction counts at an index RSI: 1 … 0 */
export const fadeAt = (rsi, R = RULES) => (rsi == null || !isFinite(rsi) ? 1 : clamp((rsi - R.fadeTo) / ((R.fadeFrom - R.fadeTo) || 1), 0, 1));
/* the credit part's points as version 2 counts them */
export const creditCounted = (points, rsi, R = RULES) => (points == null ? null : R.creditRule && points < 0 ? points * fadeAt(rsi, R) + 0 : points);   // + 0: a subtraction faded to nothing is 0, never the "−0" a product of a negative and zero would print as

/* a fund's close against its highest close of the last n sessions (itself among them), in %: 0 at the high, −2 two per cent under it.
   null until it has n closes. */
export function offHighPct(c, k, n = RULES.highDays) { if (!c || k < n - 1 || c[k] == null) return null; let hi = -Infinity; for (let i = k - n + 1; i <= k; i++) { if (c[i] == null) return null; if (c[i] > hi) hi = c[i]; } return (c[k] / hi - 1) * 100; }
/* how far a fund's close sits above (+) or under (−) the plain average of its last n closes, in %. null until it has n closes. */
export function overAvgPct(c, k, n = RULES.avgDays) { if (!c || k < n - 1 || c[k] == null) return null; let s = 0; for (let i = k - n + 1; i <= k; i++) { if (c[i] == null) return null; s += c[i]; } return (c[k] / (s / n) - 1) * 100; }
/* the two things the raise-cash rule looks at, for SPY and QQQ together at session k */
export function topAt(spy, qqq, k, R = RULES) { const a = offHighPct(spy, k, R.highDays), b = offHighPct(qqq, k, R.highDays), p = overAvgPct(spy, k, R.avgDays), q = overAvgPct(qqq, k, R.avgDays);
  return { offSpy: a, offQqq: b, near: a != null && b != null && a >= -R.nearPct && b >= -R.nearPct, x200: p == null || q == null ? null : Math.max(0, (p + q) / 2) }; }
/* the rule's state after one close: was = its state after the close before */
export function cashStep(was, rsi, top, R = RULES) { if (!R.cashRule) return false; if (rsi == null || !isFinite(rsi)) return !!was; if (rsi < R.resetRsi) return false; if (top && top.near && top.x200 != null && top.x200 >= R.extPct) return true; return !!was; }
/* the rule's state on every session of a series. has[i] = the day has a market reading (the state only moves on such days — before HYG
   traded there is no reading and nothing to halve). seed = the state going into the first session (false, or what a longer history says) */
export function cashSeries({ rsi, spy, qqq, has = null }, R = RULES, seed = false) { const N = rsi.length, cash = new Array(N).fill(false), top = new Array(N).fill(null); let st = !!seed;
  for (let i = 0; i < N; i++) { top[i] = topAt(spy, qqq, i, R); if (!has || has[i]) st = cashStep(st, rsi[i], top[i], R); cash[i] = st; } return { cash, top }; }
/* when the state now in force began: the first session of the unbroken run that ends at k (null when it is off) */
export function cashSince(dates, cash, k) { if (!cash[k]) return null; let i = k; while (i > 0 && cash[i - 1]) i--; return dates[i]; }
/* was a date inside one of the stored episodes? eps = [[from, to | null], …] (study/ds2/data/ds2-live.json) — the seed for a short window */
export const inEpisode = (eps, date) => !!(eps || []).find(([a, b]) => date >= a && (b == null || date <= b));

/* VERSION 2 OF ONE READING. r = what DS1's readSystem (or the tool's readWith) returned for these inputs; ctx = { rsi, cash, base } — the
   index RSI that evening, the raise-cash state AFTER that evening's close, and the model's typical day unrounded (50 − gain × centre: DS1
   hands back a rounded one). Returns a copy with reading and raw replaced, DS1's own kept under .v1, and what version 2 did under .v2.
   With both rules off it gives DS1's reading. */
export const typicalDay = (model) => 50 - model.scale.gain * model.scale.centre;
export function applyV2(r, ctx, R = RULES) {
  const v1 = { reading: r.reading, raw: r.raw }, cr = r.parts.find((p) => p.key === "creditOwn"), fitted = cr && !cr.missing ? cr.points : null, fade = fitted != null && fitted < 0 && R.creditRule ? fadeAt(ctx.rsi, R) : 1, counted = fitted == null ? null : creditCounted(fitted, ctx.rsi, R);
  let raw = (ctx.base != null ? ctx.base : r.base) + (r.lightsCounted || 0); for (const p of r.parts) if (!p.missing) raw += p.key === "creditOwn" ? counted : p.points;
  const held = clamp(raw, 0, 100), cash = !!(R.cashRule && ctx.cash), reading = cash ? held * R.cashCut : held;
  /* the parts as counted: credit's row shows what was counted, with what its curve said kept beside it */
  const parts = r.parts.map((p) => (p.key === "creditOwn" && fitted != null ? { ...p, points: counted, fitted } : p)), families = (r.families || []).map((f) => (f.family === "credit" && fitted != null ? { ...f, points: f.points - fitted + counted } : f));
  return { ...r, parts, families, reading: +reading.toFixed(1), raw: +raw.toFixed(1), readingExact: reading, v1, v2: { creditFitted: fitted, creditCounted: counted, fade, cash, cashCut: cash ? R.cashCut : 1, beforeCash: +held.toFixed(1) } }; }
/* the rule's state on a SHORT window (the live tool holds 540 daily bars; the rule needs 252 of them before it can see a high). The first
   highDays − 1 sessions take their state from the stored stretches (study/ds2/data/ds2-live.json → cashEpisodes, the full history);
   from there on the state is worked out day by day as in cashSeries. asOf = the stored stretches' last day: a window that starts after
   it is seeded with the last state known. */
export function cashWindow({ dates, rsi, spy, qqq, has = null }, R = RULES, episodes = [], asOf = null) { const N = dates.length, cash = new Array(N).fill(false), top = new Array(N).fill(null), from = Math.min(N, R.highDays - 1), known = (d) => inEpisode(episodes, asOf && d > asOf ? asOf : d); let st = false;
  for (let i = 0; i < N; i++) { top[i] = topAt(spy, qqq, i, R); if (i < from) st = R.cashRule ? known(dates[i]) : false; else if (!has || has[i]) st = cashStep(st, rsi[i], top[i], R); cash[i] = st; } return { cash, top, seededTo: from > 0 ? dates[from - 1] : null }; }
/* the same from bare points (the build and the pane's proof have the points, not a readSystem result) */
export function readingV2({ base, rsiPoints, creditPoints, rsi, cash, extra = 0 }, R = RULES) { if (rsiPoints == null || creditPoints == null) return null; const held = clamp(base + rsiPoints + creditCounted(creditPoints, rsi, R) + extra, 0, 100); return R.cashRule && cash ? held * R.cashCut : held; }
