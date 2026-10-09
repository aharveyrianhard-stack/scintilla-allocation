/* DS2 (7 Oct 2026) — the % invested number at lows and tops: the diagnosis on Alan's dates, the candidate changes, their scorecard.
     node scripts/ds2-build.mjs <cacheDir>          writes study/ds2/data/ds2.json
   No key, no table, no network: it reads the cache folder DS1 read (scripts/dm2-pull.mjs + scripts/ds1-pull.mjs filled it) through
   scripts/ds2-lib.mjs, which is DS1's own loader, fit and replay (a test holds that lab to DS1's stored answers).

   THE NUMBER TODAY (DS1 + AL9):  % invested = 70 held + 30 tactical × the market reading ÷ 100
                                  the market reading = a typical day (49.1) + the RSI part + the credit part, held to 0 … 100
     the RSI part     SPY and QQQ's 14-day RSI, averaged          (+35 when both are washed out … −56 when both are stretched)
     the credit part  HYG's ten-session move, payouts added back, less half the 7–10 year treasury fund's move ("credit's own move")

   WRITTEN HERE BEFORE ANY CANDIDATE WAS RUN (the baseline on Alan's dates had been read, for the diagnosis; no candidate had):

   A · THE SCORECARD ON ALAN'S DATES — every line in points of the account (the % invested), on the number the tool would show
       (the rule fitted on every day, as the live tool's is), with the same line from the rule fitted to 2017 only beside it
     L25   the late-March 2025 low     the average of the number over the last five sessions of March 2025, and on the lowest SPY close of them   HIGHER is better
     L26   the late-March 2026 low     the average over the five sessions to the low (24–30 Mar 2026), and on the low itself (30 Mar)            HIGHER
     CUT   no cut into the low         the number on 30 Mar 2026 less the highest of the four sessions before it                              NOT NEGATIVE
     T25   the late-2025 top           the average over December 2025, and on SPY's highest close before the fall (found from the closes)        LOWER
     GAP   lows above the top          (L25 + L26) ÷ 2 − T25                                                                                    WIDER
     MOVE  how much it moves           the average day-to-day change, 7 Oct 2025 → 6 Oct 2026 (the year Alan scrolled)                           SMALLER
     Shown, not scored (Alan put them as questions): 21 Jul 2025 and 22 Sep 2025.

   B · THE WHOLE PERIOD — exactly DS1's replay: the rule fitted on 10 Mar 2009 → end-2017, replayed on 2 Jan 2018 → 6 Oct 2026, which it
       never saw; core 70 + tactical 30; the share set at a close earns the next session's blend of SPY and QQQ; cash earns the 3-month bill;
       no costs. Reported: what 1 became, the worst fall, the share invested on average, and what the SAME average share became with no
       timing at all — because in a rising market any change that simply holds more looks better, and that is not skill.
         TIMING = what 1 became ÷ what the same average share became untimed.

   C · THE PASS RULE
     whole period   TIMING not more than 0.005 under the baseline's, and the worst fall not more than 1.0 point deeper
     his dates      at least one of L25, L26 (up) or T25 (down) better by 1.0 point of the account, none of them worse by 1.0
     A candidate goes into the recommended version only if it passes BOTH. One that helps his dates and fails the whole period is offered
     as a dial that is OFF at the baseline, with its cost written beside it. The smoother is judged on its own terms: it must cut MOVE by a
     third, and its cost is stated before costs and after a charge of 0.05% on every dollar moved; it passes if the after-charge end value
     is within 1% of the unsmoothed one.

   D · THE CANDIDATES (three versions of each, fixed here; thresholds are round numbers or come from the fitted years only)
     (a) credit as contrarian at its extremes
         a1  a washout flips            HYG's RSI (payouts added back) under 30 → the credit part adds what it would have subtracted
         a2  no penalty in a panic      SPY and QQQ's average RSI under 40 → the credit part may add but may not subtract
         a3  credit never subtracts     the credit part may add (at either of its extremes) but never subtracts
     (b) distance below the 50-day and 100-day as an add at real pullbacks — a third part, one-sided (nothing when the indices are above the
         average), held so that deeper never reads worse, fitted on what the RSI and credit leave unexplained
         b50   how far SPY and QQQ sit under their 50-day        b100  under their 100-day        b  the two averaged
     (c) a smoother number
         c3   the average of the last 3 daily readings          c5   of the last 5
         cUp  quick to add, slow to cut: the higher of today's reading and the 5-day average
     (d) a raise-cash rule at extended highs
         d1  far above the 200-day      a third part: how far SPY and QQQ sit above their 200-day, held so that further never reads better
         d2  an extended high           both within 2% of their highest close of 252 sessions AND further above the 200-day than on four
                                        days in five of the fitted years → the tactical part is halved
         d3  a tired high               both within 2% of that high while their average RSI is under 60 → the tactical part is halved.
                                        DESIGNED AFTER LOOKING AT DECEMBER 2025 (the baseline diagnosis showed the top was made with the RSI
                                        at 55–60) — the one candidate here shaped by one of his dates, and marked so everywhere. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { lab, J, r1, r2, r3, fin, med, mean, sd, pctl, shareUp } from "./ds2-lib.mjs";
import * as V2 from "../study/ds2/number.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.argv[2]; if (!CACHE || !fs.existsSync(path.join(CACHE, "SPY_D.json"))) { console.error("usage: node scripts/ds2-build.mjs <cacheDir>"); process.exit(2); }
const log = (...a) => console.error(...a);
const L = lab(CACHE), { E, X, IND, dates, N, LAST, ix, bars, Y, spy, qqq, hygTR } = L;
const HELD = 70, TACT = 30, numOf = (reading) => (reading == null ? null : HELD + (TACT * Math.max(0, Math.min(100, reading))) / 100);
const KEPT = ["rsi", "creditOwn"], HZ = { rsi: [60], creditOwn: [20] }, MONO = { rsi: true };
const idx = (d) => ix[d] ?? dates.findIndex((x) => x >= d), A0 = L.firstOf(2018);

/* ---------- the extra readings the candidates use ---------- */
const col = () => new Array(N).fill(null);
X.depth50 = X.d50.map((v) => (v == null ? null : Math.max(0, -v))); X.depth100 = X.d100.map((v) => (v == null ? null : Math.max(0, -v)));
X.depth = X.depth50.map((v, i) => (v == null || X.depth100[i] == null ? null : (v + X.depth100[i]) / 2));
const d200 = (o, i) => (o.c[i] != null && o.s200[i] != null ? (o.c[i] / o.s200[i] - 1) * 100 : null);
X.x200 = dates.map((_, i) => { const a = d200(IND.SPY, i), b = d200(IND.QQQ, i); return a == null || b == null ? null : Math.max(0, (a + b) / 2); });
const offHigh = (c, i, n = 252) => { if (i < n - 1) return null; let hi = -Infinity; for (let k = i - n + 1; k <= i; k++) if (c[k] != null && c[k] > hi) hi = c[k]; return (c[i] / hi - 1) * 100; };
const nearHigh = dates.map((_, i) => { const a = offHigh(spy, i), b = offHigh(qqq, i); return a != null && b != null && a >= -2 && b >= -2; });

/* ---------- a model's parts as points, evening by evening: raw reading = base + the points of its parts ---------- */
function pointsOf(M) { const sc = M.scale, base = 50 - sc.gain * sc.centre, pts = {}; for (const p of M.parts) pts[p.key] = dates.map((_, i) => { const v = E.voteOf(p, X[p.key][i], sc); return v ? sc.gain * v.vote : null; }); return { base, pts, keys: M.parts.map((p) => p.key) }; }
const fitFor = (rows, extra = null, monoExtra = null) => L.fitAdditive(rows, extra ? [...KEPT, extra] : KEPT, undefined, extra ? { ...HZ, [extra]: [20, 60] } : HZ, extra ? { ...MONO, [extra]: monoExtra } : MONO);
const WIN = { "17": [L.F17, 2018], all: [L.ALLROWS, 2018], "15": [L.F15, 2016], "19": [L.F19, 2020], "17w": [L.F17w, 2018] };   // which → [the fitted days, the first replayed year]
const FITS = {}; const fitOf = (which, extra = null, monoExtra = null) => { const k = which + "|" + (extra || ""); if (!FITS[k]) { const M = fitFor(WIN[which][0], extra, monoExtra); FITS[k] = { M, P: pointsOf(M), rows: WIN[which][0] }; } return FITS[k]; };

/* ---------- one version of the number, as a spec → its reading on every evening ----------
   spec = { credit: null|"a1"|"a2"|"a3", part: null|"depth50"|"depth100"|"depth"|"x200", top: null|"d2"|"d3", smooth: 1|3|5|"up5" }
   which = "17" (fitted to 2017: the unseen test) or "all" (fitted on every day: what the tool shows) */
const PART_MONO = { depth50: "up", depth100: "up", depth: "up", x200: true };
/* ADDED AFTER THE FIRST RUN, and marked so wherever they are shown:
     a2f  a2 with its cliff taken out. a2 switches at an RSI of exactly 40, so a day at 39.9 and a day at 40.1 can sit 7 points of the account
          apart, and the first run showed it moving MORE from day to day than today's number (1.88 against 1.63). a2f is the same rule faded
          in: credit's subtraction counts in full at an RSI of 45, not at all at 35 and under, in proportion between.
     d0   the part d2 and d3 share, alone: both indices within 2% of their 252-session high halves the tactical part. Run to see whether
          "extended" or "tired" adds anything to "near the high". */
const FADE = [35, 45];
/*   d2L  d2 that HOLDS. The first run showed d2 switching on and off every few sessions through late 2025 (the indices cross "within 2% of
          the high" back and forth), each switch moving the number about 8 points. d2L is the same extended high, but once it has halved
          the tactical part it stays halved until the market has reset — SPY and QQQ's average RSI under 40, the same line a2 uses for
          "washed out". In words: raise cash at an extended high, and put it back at the next washout. */
const RESET = 40;
/* the depth part as an ADD-ON to the two-part number (the form a dial on the screen can take without swapping the whole model): DS1's own
   "what a light would add" — the part fitted beside the two that vote, read on the two-part model's gain — less what it reads when the
   indices are above the average, so it is exactly nothing until they are under it. */
const ADDON = {}; function addonOf(which, key) { const k = which + "|" + key; if (!ADDON[k]) { const J3 = fitFor(WIN[which][0], key, PART_MONO[key]), lp = J3.parts.find((p) => p.key === key), sc = { ...J3.scale, gain: fitOf(which).M.scale.gain, centre: 0 }, at = (z) => { const v = E.voteOf(lp, z, sc); return v ? sc.gain * v.vote : null; }, zero = at(0); ADDON[k] = { part: lp, scale: sc, zero, pts: dates.map((_, i) => (X[key][i] == null ? null : at(X[key][i]) - zero)) }; } return ADDON[k]; }
function readingsOf(spec, which) {
  const Q = { near: 2, extPct: 80, reset: RESET, cut: 0.5, fade: FADE, ...(spec.params || {}) }, nearQ = Q.near === 2 ? nearHigh : dates.map((_, i) => { const a = offHigh(spy, i), b = offHigh(qqq, i); return a != null && b != null && a >= -Q.near && b >= -Q.near; });
  const F = fitOf(which, spec.part || null, spec.part ? PART_MONO[spec.part] : null), { base, pts } = F.P, ext80 = spec.top === "d2" ? pctl(F.rows.map((i) => X.x200[i]), 80) : null, ext80L = spec.top === "d2L" ? pctl(F.rows.map((i) => X.x200[i]), Q.extPct) : null, AD = spec.addon ? addonOf(which, spec.addon) : null, out = col(), on = col(); let latch = false;
  for (let i = 0; i < N; i++) { const r = pts.rsi[i]; let c = pts.creditOwn[i]; if (r == null || c == null) continue; let extra = spec.part ? pts[spec.part][i] : 0; if (extra == null) continue; if (AD) { if (AD.pts[i] == null) continue; extra += AD.pts[i]; }
    if (spec.credit === "a1" && X.hygRsi[i] != null && X.hygRsi[i] < 30) c = Math.abs(c); else if (spec.credit === "a2" && X.rsi[i] < 40) c = Math.max(0, c); else if (spec.credit === "a3") c = Math.max(0, c);
    else if (spec.credit === "a2f" && c < 0) c *= Math.max(0, Math.min(1, (X.rsi[i] - Q.fade[0]) / (Q.fade[1] - Q.fade[0])));
    let rd = Math.max(0, Math.min(100, base + r + c + extra));
    if (spec.top === "d2" && nearHigh[i] && X.x200[i] != null && X.x200[i] >= ext80) { rd *= 0.5; on[i] = true; } else if (spec.top === "d3" && nearHigh[i] && X.rsi[i] < 60) { rd *= 0.5; on[i] = true; } else if (spec.top === "d0" && nearHigh[i]) { rd *= 0.5; on[i] = true; }
    else if (spec.top === "d2L") { if (X.rsi[i] < Q.reset) latch = false; else if (nearQ[i] && X.x200[i] != null && X.x200[i] >= ext80L) latch = true; if (latch) { rd *= Q.cut; on[i] = true; } }
    out[i] = rd; }
  const sm = spec.smooth || 1; if (sm === 1) return { r: out, on, ext80: ext80 ?? ext80L };
  const n = sm === "up5" ? 5 : sm, avg = out.map((_, i) => { if (out[i] == null) return null; const v = []; for (let k = 0; k < n; k++) if (out[i - k] != null) v.push(out[i - k]); return mean(v); });
  return { r: sm === "up5" ? out.map((v, i) => (v == null ? null : Math.max(v, avg[i]))) : avg, on, ext80: ext80 ?? ext80L }; }

/* ---------- B · the whole period, DS1's replay ---------- */
const COST = 0.0005;   // the charge used for the smoother's after-cost line: 0.05% of every dollar moved
function payoff(spec, which = "17", from = null, to = LAST) { const R = readingsOf(spec, which).r, A0 = from ?? L.firstOf(WIN[which][1]), inv = (i) => (R[i] == null ? null : numOf(R[i]) / 100), a = L.replay(inv, A0, to), flat = L.replay(() => a.invested / 100, A0, to), c = L.replay(inv, A0, to, COST);
  return { became: a.became, worstFall: a.worstFall, invested: a.invested, untimed: flat.became, untimedWorstFall: flat.worstFall, timing: r3(a.became / flat.became), movedPerSession: a.movedPerSession, becameAfterCost: c.became }; }

/* ---------- A · the scorecard on Alan's dates ---------- */
const MAR25 = dates.filter((d) => d >= "2025-03-01" && d <= "2025-03-31").slice(-5), LOW25 = MAR25.reduce((a, d) => (spy[ix[d]] < spy[ix[a]] ? d : a));
const LOW26 = "2026-03-30", MAR26 = dates.slice(ix[LOW26] - 4, ix[LOW26] + 1), DEC25 = dates.filter((d) => d >= "2025-12-01" && d <= "2025-12-31");
/* SPY's highest close before the fall into the March 2026 low: the highest close of the 120 sessions before that low */
const TOP = (() => { let k = ix[LOW26] - 120; for (let i = k; i < ix[LOW26]; i++) if (spy[i] > spy[k]) k = i; return dates[k]; })();
const YEAR = [idx("2025-10-07"), LAST];
function scorecard(spec, which) { const R = readingsOf(spec, which).r, n = (d) => numOf(R[ix[d]]), avg = (ds) => mean(ds.map(n)); let mv = 0, k = 0; for (let i = YEAR[0] + 1; i <= YEAR[1]; i++) if (R[i] != null && R[i - 1] != null) { mv += Math.abs(numOf(R[i]) - numOf(R[i - 1])); k++; }
  const L25 = avg(MAR25), L26 = avg(MAR26), T25 = avg(DEC25);
  return { L25: r1(L25), L25low: r1(n(LOW25)), L26: r1(L26), L26low: r1(n(LOW26)), CUT: r1(n(LOW26) - Math.max(...MAR26.slice(0, 4).map(n))), T25: r1(T25), T25top: r1(n(TOP)), GAP: r1((L25 + L26) / 2 - T25), MOVE: r2(mv / k), jul21: r1(n("2025-07-21")), sep22: r1(n("2025-09-22")), feb23: r1(n("2026-02-23")), mar26: r1(n("2026-03-26")), apr8: r1(n("2025-04-08")) }; }

/* ---------- the candidates ---------- */
const BASE = { credit: null, part: null, top: null, smooth: 1 };
const CANDS = [
  { key: "base", family: "", name: "the number today", spec: BASE },
  { key: "a1", family: "a", name: "a washout flips (HYG's RSI under 30 → credit adds what it would subtract)", spec: { ...BASE, credit: "a1" } },
  { key: "a2", family: "a", name: "no penalty in a panic (index RSI under 40 → credit may add, not subtract)", spec: { ...BASE, credit: "a2" } },
  { key: "a3", family: "a", name: "credit never subtracts", spec: { ...BASE, credit: "a3" } },
  { key: "b50", family: "b", name: "depth under the 50-day, as a third part", spec: { ...BASE, part: "depth50" } },
  { key: "b100", family: "b", name: "depth under the 100-day, as a third part", spec: { ...BASE, part: "depth100" } },
  { key: "b", family: "b", name: "depth under the 50-day and 100-day averaged, as a third part", spec: { ...BASE, part: "depth" } },
  { key: "c3", family: "c", name: "the average of the last 3 daily readings", spec: { ...BASE, smooth: 3 } },
  { key: "c5", family: "c", name: "the average of the last 5 daily readings", spec: { ...BASE, smooth: 5 } },
  { key: "cUp", family: "c", name: "quick to add, slow to cut (the higher of today and the 5-day average)", spec: { ...BASE, smooth: "up5" } },
  { key: "d1", family: "d", name: "far above the 200-day, as a third part", spec: { ...BASE, part: "x200" } },
  { key: "d2", family: "d", name: "an extended high (near the 252-session high and far above the 200-day) halves the tactical part", spec: { ...BASE, top: "d2" } },
  { key: "d3", family: "d", name: "a tired high (near the 252-session high with RSI under 60) halves the tactical part — designed after looking at December 2025", spec: { ...BASE, top: "d3" }, shapedByHisDate: true },
];
const t0 = Date.now(); for (const c of CANDS) { c.payoff = payoff(c.spec); c.dates = scorecard(c.spec, "all"); c.dates17 = scorecard(c.spec, "17"); }
const B0 = CANDS[0];
const passWhole = (c) => c.payoff.timing >= B0.payoff.timing - 0.005 && c.payoff.worstFall >= B0.payoff.worstFall - 1.0;
const passDates = (c) => { const up = [c.dates.L25 - B0.dates.L25, c.dates.L26 - B0.dates.L26, B0.dates.T25 - c.dates.T25]; return up.some((v) => v >= 1.0) && !up.some((v) => v <= -1.0); };
const passSmooth = (c) => c.dates.MOVE <= (2 / 3) * B0.dates.MOVE && c.payoff.becameAfterCost >= 0.99 * B0.payoff.becameAfterCost;
for (const c of CANDS.slice(1)) { c.passWhole = passWhole(c); c.passDates = passDates(c); if (c.family === "c") c.passSmooth = passSmooth(c); c.verdict = c.family === "c" ? (c.passSmooth ? "in" : "out") : c.passWhole && c.passDates ? "in" : c.passDates ? "dial, off" : "out"; }
log("candidates scored in", Date.now() - t0, "ms · SPY's high before the fall:", TOP, spy[ix[TOP]], "· late March 2025:", MAR25.join(" "), "low", LOW25, "· to the 2026 low:", MAR26.join(" "));
const row = (c) => [c.key.padEnd(5), "became", String(c.payoff.became).padEnd(6), "fall", String(c.payoff.worstFall).padEnd(6), "inv", String(c.payoff.invested).padEnd(5), "untimed", String(c.payoff.untimed).padEnd(6), "TIMING", String(c.payoff.timing).padEnd(6), "afterCost", String(c.payoff.becameAfterCost).padEnd(6), "| L25", c.dates.L25, "(" + c.dates.L25low + ")", "L26", c.dates.L26, "(" + c.dates.L26low + ")", "CUT", c.dates.CUT, "T25", c.dates.T25, "(" + c.dates.T25top + ")", "GAP", c.dates.GAP, "MOVE", c.dates.MOVE, "| jul21", c.dates.jul21, "sep22", c.dates.sep22, "|", c.verdict || ""].join(" ");
for (const c of CANDS) log(row(c));
log("  the same dates with the rule fitted to 2017 only:"); for (const c of CANDS) log("  ", c.key.padEnd(5), "L25", c.dates17.L25, "L26", c.dates17.L26, "(" + c.dates17.L26low + ")", "CUT", c.dates17.CUT, "T25", c.dates17.T25, "GAP", c.dates17.GAP, "MOVE", c.dates17.MOVE);


/* ---------- the two versions added after the first run, scored the same way ---------- */
const LATE = [
  { key: "a2f", family: "a", name: "no penalty in a panic, faded in (credit's subtraction counts in full at an index RSI of 45, not at all at 35 and under)", spec: { ...BASE, credit: "a2f" }, addedAfterFirstRun: true },
  { key: "d0", family: "d", name: "near the high, alone (both within 2% of their 252-session high) halves the tactical part", spec: { ...BASE, top: "d0" }, addedAfterFirstRun: true },
  { key: "d2L", family: "d", name: "an extended high that holds: the tactical part stays halved from an extended high until the next washout (index RSI under 40)", spec: { ...BASE, top: "d2L" }, addedAfterFirstRun: true }];
for (const c of LATE) { c.payoff = payoff(c.spec); c.dates = scorecard(c.spec, "all"); c.dates17 = scorecard(c.spec, "17"); c.passWhole = passWhole(c); c.passDates = passDates(c); c.verdict = c.passWhole && c.passDates ? "in" : c.passDates ? "dial, off" : "out"; CANDS.push(c); log(row(c)); }

/* ---------- the evidence behind each family, on the years the rule had not seen (fitted to 2017, read on 2018 → 2026) ---------- */
const P17 = fitOf("17").P, T = L.T18, F = L.F17, sumOut = (g) => ({ n: g.length, med20: r2(med(g.map((i) => Y.r20[i])) * 100), share20: r3(shareUp(g.map((i) => Y.r20[i]))), med60: r2(med(g.map((i) => Y.r60[i])) * 100), share60: r3(shareUp(g.map((i) => Y.r60[i]))), dip20: r2(med(g.map((i) => Y.dip20[i])) * 100) });
/* (a) inside a washed-out market, did credit's subtraction tell the bad days from the good ones? */
const cBand = [["credit subtracts hardest (15 points of reading or more)", (i) => P17.pts.creditOwn[i] <= -15], ["credit subtracts a little", (i) => P17.pts.creditOwn[i] > -15 && P17.pts.creditOwn[i] < 0], ["credit adds or is neutral", (i) => P17.pts.creditOwn[i] >= 0]];
const rBand = [["index RSI under 40 (washed out)", (i) => X.rsi[i] < 40], ["index RSI 40 to 50", (i) => X.rsi[i] >= 40 && X.rsi[i] < 50], ["index RSI 50 to 65", (i) => X.rsi[i] >= 50 && X.rsi[i] < 65], ["index RSI 65 or more", (i) => X.rsi[i] >= 65]];
const creditInPanic = { unseen: rBand.map(([name, f]) => { const g = T.filter(f); const years = [...new Set(g.map((i) => dates[i].slice(0, 4)))].map((y) => { const a = g.filter((i) => dates[i].startsWith(y) && P17.pts.creditOwn[i] <= -15), b = g.filter((i) => dates[i].startsWith(y) && P17.pts.creditOwn[i] > -15); return a.length >= 5 && b.length >= 5 ? { year: y, hard: a.length, other: b.length, gap20: r2((med(a.map((i) => Y.r20[i])) - med(b.map((i) => Y.r20[i]))) * 100), gap60: r2((med(a.map((i) => Y.r60[i])) - med(b.map((i) => Y.r60[i]))) * 100) } : null; }).filter(Boolean); return { name, all: sumOut(g), rows: cBand.map(([cn, cf]) => ({ name: cn, ...sumOut(g.filter(cf)) })), years }; }),
  fitted: rBand.slice(0, 1).map(([name, f]) => { const g = F.filter(f); return { name, all: sumOut(g), rows: cBand.map(([cn, cf]) => ({ name: cn, ...sumOut(g.filter(cf)) })) }; }), any: sumOut(T) };
/* (b) what followed each depth under the 100-day and the 50-day */
const dBand = [["not under it", (v) => v === 0], ["under by up to 2%", (v) => v > 0 && v <= 2], ["under by 2% to 5%", (v) => v > 2 && v <= 5], ["under by more than 5%", (v) => v > 5]];
const depthBands = Object.fromEntries(["depth50", "depth100"].map((k) => [k, dBand.map(([name, f]) => ({ name, ...sumOut(T.filter((i) => X[k][i] != null && f(X[k][i]))) }))]));
/* DS1's keep rule (testPart, ds1-build.mjs lines 84–99) for a part tried on top of the two that vote. One addition: a one-sided part is
   silent on most days, so its thirds collapse; then the days it speaks on are set against the days it is silent on. */
const BAR = { 20: { med: 0.5, share: 3 }, 60: { med: 1.0, share: 3 } };
function testPart(baseKeys, cand, fRows, tRows, monoCand = null) {
  const B = L.baselineOf(fRows), A = baseKeys.length ? L.fitAdditive(fRows, baseKeys, B) : null, M = L.fitAdditive(fRows, [...baseKeys, cand], B, null, monoCand ? { [cand]: monoCand } : null), cp = M.parts.find((p) => p.key === cand), out = {};
  for (const H of [20, 60]) { const tm = "m" + H, tp = "p" + H, sM = sd(fRows.map((i) => L.yOf(i, tm, B))) || 1, sP = sd(fRows.map((i) => L.yOf(i, tp, B))) || 1, rows = [];
    for (const i of tRows) { const ym = L.yOf(i, tm, B), yp = L.yOf(i, tp, B), z = X[cand][i]; if (ym == null || z == null) continue; let bm = 0, bp = 0; if (A) { bm = L.fittedAt(A, i, tm); bp = L.fittedAt(A, i, tp); if (bm == null) continue; }
      const u = E.placeOf(cp.q, z); rows.push({ i, y: dates[i].slice(0, 4), rm: ym - bm, rp: yp - bp, v: E.curveAt(cp[L.CUR[tm]], u) / sM + E.curveAt(cp[L.CUR[tp]], u) / sP }); }
    const vs = rows.map((r) => r.v), hi = pctl(vs, 200 / 3), lo = pctl(vs, 100 / 3); let top, bot, how = "the third it votes for most against the third it votes against most";
    if (hi - lo > 1e-9) { top = rows.filter((r) => r.v >= hi); bot = rows.filter((r) => r.v <= lo); }
    else { const m = pctl(vs, 50), up = rows.filter((r) => r.v > m + 1e-9), dn = rows.filter((r) => r.v < m - 1e-9), silent = rows.filter((r) => Math.abs(r.v - m) <= 1e-9); if (up.length >= dn.length) { top = up; bot = silent; } else { top = silent; bot = dn; } how = "the days it speaks on against the days it is silent on"; }
    if (!rows.length || top.length < 30 || bot.length < 30) { out[H] = { n: rows.length, gapMed: 0, gapShare: 0, yearsRight: 0, years: 0, flat: true, how }; continue; }
    const years = [...new Set(rows.map((r) => r.y))]; let right = 0, counted = 0; const byYear = [];
    for (const y of years) { const t = top.filter((r) => r.y === y), b = bot.filter((r) => r.y === y); if (t.length < 15 || b.length < 15) continue; counted++; const g = med(t.map((r) => r.rm)) - med(b.map((r) => r.rm)); if (g > 0) right++; byYear.push([y, r2(g * 100)]); }
    out[H] = { n: rows.length, top: top.length, bottom: bot.length, how, gapMed: r2((med(top.map((r) => r.rm)) - med(bot.map((r) => r.rm))) * 100), gapShare: r1((mean(top.map((r) => r.rp)) - mean(bot.map((r) => r.rp))) * 100), yearsRight: right, years: counted, byYear }; }
  return out; }
const passes = (t, H) => !t.flat && t.gapMed >= BAR[H].med && t.gapShare >= BAR[H].share && t.years > 0 && t.yearsRight > t.years / 2;
const partTests = ["depth50", "depth100", "depth", "x200"].map((k) => { const main = testPart(KEPT, k, L.F17, L.T18, PART_MONO[k]), p20 = passes(main[20], 20), p60 = passes(main[60], 60), others = { fit2015: testPart(KEPT, k, L.F15, L.T16, PART_MONO[k]), fit2019: testPart(KEPT, k, L.F19, L.T20, PART_MONO[k]), with2008: testPart(KEPT, k, L.F17w, L.T18, PART_MONO[k]) }; let verdict = "light", why = "";
  if (!p20 && !p60) why = "missed the bar at both horizons"; else { const H = p20 ? 20 : 60, O = p20 ? 60 : 20; if (main[O].gapMed < 0 && !(p20 && p60)) why = `passed at ${H} sessions but pointed the wrong way at ${O}`; else { const bad = Object.entries(others).filter(([, t]) => t[H].gapMed < 0).map(([n]) => n); if (bad.length) why = `passed at ${H} sessions but reversed in another fit (${bad.join(", ")})`; else { verdict = "vote"; why = `passed at ${p20 && p60 ? "20 and 60" : H} sessions; never the wrong way in the three other fits`; } } }
  log("part", k.padEnd(9), verdict.padEnd(6), "20:", JSON.stringify([main[20].gapMed, main[20].gapShare, main[20].yearsRight + "/" + main[20].years]), "60:", JSON.stringify([main[60].gapMed, main[60].gapShare, main[60].yearsRight + "/" + main[60].years]), "|", why, "| others 20/60:", Object.entries(others).map(([n, t]) => n + " " + t[20].gapMed + "/" + t[60].gapMed).join(" · "));
  return { key: k, verdict, why, main, others }; });
/* (d) DS1's own trade for a trim rule (lines 215–224): sell at the signal's close; buy back at the first close 2% or more lower inside
   20 sessions, else at the close of session 20. It PAID when the buy-back was lower. Cases counted once per stretch. */
function trimTrade(i) { if (i + 20 > LAST) return null; let run = 0; for (let k = 1; k <= 20; k++) { const p = L.blendPath(i, k) - 1; if (p <= -0.02) return { paid: true, result: 1 / (1 + p) - 1 }; if (p > run) run = p; } const p = L.blendPath(i, 20) - 1; return { paid: p < 0, result: 1 / (1 + p) - 1 }; }
function episodes(cond, gap = 10, from = 0, to = LAST) { const out = []; let last = -1e9; for (let i = from; i <= to; i++) { if (!cond(i)) continue; if (i - last > gap) out.push(i); last = i; } return out; }
const EXT80 = pctl(L.F17.map((i) => X.x200[i]), 80), START = Math.max(260, ix["2004-01-02"] ?? 260);
const TOPRULE = { d0: (i) => nearHigh[i], d2: (i) => nearHigh[i] && X.x200[i] != null && X.x200[i] >= EXT80, d3: (i) => nearHigh[i] && X.rsi[i] != null && X.rsi[i] < 60, any: () => true };
const trimRow = (f, a, b, every = false) => { const hit = []; for (let i = a; i <= Math.min(b, LAST - 20); i++) if (f(i)) hit.push(i); const set = new Set(hit), eps = every ? hit : episodes((i) => set.has(i), 10, a, Math.min(b, LAST - 20)), TT = eps.map(trimTrade).filter(Boolean); return { days: hit.length, cases: eps.length, paid: r3(mean(TT.map((t) => (t.paid ? 1 : 0)))), medResult: r2(med(TT.map((t) => t.result)) * 100), med20: r2(med(eps.map((i) => Y.r20[i])) * 100), med60: r2(med(eps.map((i) => Y.r60[i])) * 100) }; };
const topRules = Object.fromEntries(Object.entries(TOPRULE).map(([k, f]) => [k, { all: trimRow(f, START, LAST, k === "any"), to2017: trimRow(f, START, L.lastOf(2017), k === "any"), from2018: trimRow(f, A0, LAST, k === "any"), shareOfDays2018: r3(mean(dates.map((_, i) => (i >= A0 ? (f(i) ? 1 : 0) : null)))), after: sumOut(T.filter(f)) }]));
log("EXT80 (the fitted years' 80th percentile of the distance above the 200-day):", r2(EXT80), "%"); for (const [k, v] of Object.entries(topRules)) log(" top rule", k.padEnd(4), "on", v.shareOfDays2018, "of days 2018+ · trim paid: all", v.all.paid, "of", v.all.cases, "· to 2017", v.to2017.paid, "of", v.to2017.cases, "· 2018 on", v.from2018.paid, "of", v.from2018.cases, "· what followed (unseen):", JSON.stringify(v.after));
log("CREDIT IN A PANIC (unseen):", JSON.stringify(creditInPanic.unseen[0].rows.map((r) => [r.name.slice(0, 22), r.n, r.med20, r.share20, r.med60, r.share60])), "years", JSON.stringify(creditInPanic.unseen[0].years));
log("DEPTH under the 100-day (unseen):", JSON.stringify(depthBands.depth100.map((r) => [r.name, r.n, r.med20, r.share20, r.med60, r.share60])));

/* ---------- the combinations (fixed before they were run): the versions that passed, together; with and without the depth part;
   with and without the 3-day average; a2 as declared and faded ---------- */
const COMBOS = []; for (const credit of ["a2", "a2f"]) for (const [tag, extra] of [["", {}], [" + d2", { top: "d2" }], [" + d3", { top: "d3" }], [" + d0", { top: "d0" }], [" + d2L", { top: "d2L" }], [" + b100 + d2L", { part: "depth100", top: "d2L" }], [" + b100", { part: "depth100" }], [" + b100 + d2", { part: "depth100", top: "d2" }], [" + b100 + d3", { part: "depth100", top: "d3" }], [" + b100 + d0", { part: "depth100", top: "d0" }]]) for (const smooth of [1, 3, "up5"]) COMBOS.push({ key: credit + tag + (smooth === 3 ? " + c3" : smooth === "up5" ? " + cUp" : ""), spec: { ...BASE, credit, ...extra, smooth } });
for (const c of COMBOS) { c.payoff = payoff(c.spec); c.dates = scorecard(c.spec, "all"); c.dates17 = scorecard(c.spec, "17"); c.passWhole = passWhole(c); c.passDates = passDates(c); c.steadier = c.dates.MOVE <= B0.dates.MOVE; c.afterCostOk = c.payoff.becameAfterCost >= 0.99 * B0.payoff.becameAfterCost; }
log("\nCOMBINATIONS"); for (const c of COMBOS) log(c.key.padEnd(24), "became", String(c.payoff.became).padEnd(6), "fall", String(c.payoff.worstFall).padEnd(6), "inv", String(c.payoff.invested).padEnd(5), "TIMING", String(c.payoff.timing).padEnd(6), "afterCost", String(c.payoff.becameAfterCost).padEnd(6), "| L25", c.dates.L25, "(" + c.dates.L25low + ")", "L26", c.dates.L26, "(" + c.dates.L26low + ")", "CUT", c.dates.CUT, "T25", c.dates.T25, "(" + c.dates.T25top + ")", "GAP", c.dates.GAP, "MOVE", c.dates.MOVE, "|", c.passWhole ? "whole✓" : "whole✗", c.passDates ? "dates✓" : "dates✗", c.steadier ? "steadier✓" : "steadier✗", c.afterCostOk ? "cost✓" : "cost✗");

/* ---------- how firm is the leading version? every check below was fixed before it was run ----------
   LEAD = a2f + d2L (the two that passed alone and together). LEADB = the same with the depth add-on switched on. */
const LEAD = { ...BASE, credit: "a2f", top: "d2L" }, LEADB = { ...LEAD, addon: "depth100" }, A2F = { ...BASE, credit: "a2f" }, D2L = { ...BASE, top: "d2L" }, ADDB = { ...BASE, addon: "depth100" };
const VERS = [["today", BASE], ["a2f", A2F], ["d2L", D2L], ["depth add-on", ADDB], ["a2f + d2L", LEAD], ["a2f + d2L + depth add-on", LEADB]];
const firm = { otherFits: {}, earlier: {}, years: [], sensitivity: [] };
/* 1 · DS1's three other fits */
for (const [w, label] of [["17", "fitted to 2017, replayed 2018 on (the main test)"], ["15", "fitted to 2015, replayed 2016 on"], ["19", "fitted to 2019, replayed 2020 on"], ["17w", "fitted to 2017 with 2008 left in, replayed 2018 on"]]) { firm.otherFits[w] = { label, rows: VERS.map(([name, spec]) => ({ name, ...payoff(spec, w) })) }; log("\nFIT", label); for (const r of firm.otherFits[w].rows) log("  ", r.name.padEnd(26), "became", String(r.became).padEnd(6), "fall", String(r.worstFall).padEnd(6), "inv", String(r.invested).padEnd(5), "TIMING", String(r.timing).padEnd(6), "moved", r.movedPerSession); }
/* 2 · the years before: the rule fitted on 2009–2017 read on 2004 → 9 Mar 2009 (it never saw them, and they hold the 2007 top and 2008),
       and on its own fitted years 2009 → 2017 (the curves saw those; the credit change and the raise-cash rule have nothing fitted but one threshold) */
for (const [k, a, b, label] of [["y0409", "2004-01-02", "2009-03-09", "2 Jan 2004 → 9 Mar 2009 — unseen, and it holds 2008"], ["y0917", "2009-03-10", "2017-12-29", "10 Mar 2009 → end-2017 — the fitted years"]]) { firm.earlier[k] = { label, rows: VERS.map(([name, spec]) => ({ name, ...payoff(spec, "17", idx(a), idx(b)) })), buyAndHold: L.replay(() => 1, idx(a), idx(b)) }; log("\nEARLIER", label, "· buy and hold", JSON.stringify(firm.earlier[k].buyAndHold)); for (const r of firm.earlier[k].rows) log("  ", r.name.padEnd(26), "became", String(r.became).padEnd(6), "fall", String(r.worstFall).padEnd(6), "inv", String(r.invested).padEnd(5), "TIMING", String(r.timing).padEnd(6)); }
/* 3 · year by year on the unseen years: what 1 became inside each year */
{ const R = Object.fromEntries(VERS.map(([name, spec]) => [name, readingsOf(spec, "17").r])); for (let y = 2018; y <= 2026; y++) { const a = Math.max(A0, L.firstOf(y) - 1), b = L.lastOf(y), row = { year: y }; for (const [name] of VERS) row[name] = r2((L.replay((i) => (R[name][i] == null ? null : numOf(R[name][i]) / 100), a, b).became - 1) * 100); row.buyAndHold = r2((L.replay(() => 1, a, b).became - 1) * 100); firm.years.push(row); }
  log("\nYEAR BY YEAR (% in the year)"); for (const r of firm.years) log("  ", r.year, VERS.map(([n]) => n + " " + r[n]).join(" · "), "· b&h", r.buyAndHold); }
/* 4 · each threshold moved, one at a time (the leading version, unseen years) */
for (const [what, params] of [["as built", {}], ["within 1% of the high", { near: 1 }], ["within 3% of the high", { near: 3 }], ["extended = top 30% of days", { extPct: 70 }], ["extended = top 10% of days", { extPct: 90 }], ["reset at an RSI of 35", { reset: 35 }], ["reset at an RSI of 45", { reset: 45 }], ["tactical cut to a quarter", { cut: 0.25 }], ["tactical cut to three quarters", { cut: 0.75 }], ["credit fades 30 → 40", { fade: [30, 40] }], ["credit fades 40 → 50", { fade: [40, 50] }]]) { const spec = { ...LEAD, params }, P = payoff(spec), Dd = scorecard(spec, "all"); firm.sensitivity.push({ what, params, ...P, L25: Dd.L25, L26: Dd.L26, L26low: Dd.L26low, T25: Dd.T25, GAP: Dd.GAP, MOVE: Dd.MOVE }); }
log("\nSENSITIVITY (a2f + d2L)"); for (const r of firm.sensitivity) log("  ", r.what.padEnd(30), "became", String(r.became).padEnd(6), "fall", String(r.worstFall).padEnd(6), "inv", String(r.invested).padEnd(5), "TIMING", String(r.timing).padEnd(6), "| L25", r.L25, "L26", r.L26, "T25", r.T25, "GAP", r.GAP, "MOVE", r.MOVE);
/* 5 · every time the raise-cash rule was on since 2018 (the rule fitted to 2017): when, how long, what the market did meanwhile */
const latchEps = (which) => { const O = readingsOf(D2L, which).on, eps = []; let a = -1; for (let i = idx("2004-01-02"); i <= LAST + 1; i++) { const on = i <= LAST && !!O[i]; if (on && a < 0) a = i; if (!on && a >= 0) { const b = i - 1; let lo = 0; for (let k = a; k <= b; k++) { const p = (0.5 * spy[k]) / spy[a] + (0.5 * qqq[k]) / qqq[a] - 1; if (p < lo) lo = p; } eps.push({ from: dates[a], to: dates[b], sessions: b - a + 1, open: i > LAST, blendPct: r2(((0.5 * spy[Math.min(b + 1, LAST)]) / spy[a] + (0.5 * qqq[Math.min(b + 1, LAST)]) / qqq[a] - 1) * 100), worstInsidePct: r2(lo * 100) }); a = -1; } } return eps; };
firm.latch17 = latchEps("17"); firm.latchAll = latchEps("all"); { const e = firm.latch17.filter((x) => x.from >= "2018-01-01"); log("\nRAISE-CASH EPISODES since 2018 (fitted to 2017):", e.length, "· sessions on", e.reduce((a, x) => a + x.sessions, 0), "of", LAST - A0 + 1, "· higher at the reset than at the start:", e.filter((x) => x.blendPct > 0).length); for (const x of e) log("  ", x.from, "→", x.to, String(x.sessions).padStart(4), "sessions · blend", String(x.blendPct).padStart(7) + "%", "· worst inside", x.worstInsidePct + "%", x.open ? "(still on)" : ""); }

/* ================= THE RECOMMENDED VERSION, through the one file the tool and the pane read (study/ds2/number.mjs) ================= */
const liveFit = fitOf("all"), PL = liveFit.P, EXT_ALL = pctl(L.ALLROWS.map((i) => X.x200[i]), 80), EXT_17 = pctl(L.F17.map((i) => X.x200[i]), 80);
const RULES = { ...V2.RULES, extPct: +EXT_ALL.toFixed(2) }, has = dates.map((_, i) => PL.pts.rsi[i] != null && PL.pts.creditOwn[i] != null);
function seriesV2(P, rules) { const { cash, top } = V2.cashSeries({ rsi: X.rsi, spy, qqq, has: dates.map((_, i) => P.pts.rsi[i] != null && P.pts.creditOwn[i] != null) }, rules), r = dates.map((_, i) => V2.readingV2({ base: P.base, rsiPoints: P.pts.rsi[i], creditPoints: P.pts.creditOwn[i], rsi: X.rsi[i], cash: cash[i] }, rules)); return { r, cash, top }; }
const REC = seriesV2(PL, RULES), REC17 = seriesV2(P17, { ...RULES, extPct: +EXT_17.toFixed(2) });
/* the grid above and this file must be the same sum (the grid keeps the threshold unrounded, so a day can differ only at the threshold's second decimal) */
{ const G = readingsOf(LEAD, "all").r; let w = 0, n = 0; for (let i = 0; i < N; i++) if (G[i] != null && REC.r[i] != null) { const g = Math.abs(G[i] - REC.r[i]); if (g > 1e-9) n++; if (g > w) w = g; } log("\nthe grid's a2f + d2L against study/ds2/number.mjs: days that differ", n, "worst", r2(w)); if (n > 3) throw new Error("the scorecard's leading version is not the sum in study/ds2/number.mjs: " + n + " days differ"); }
const v1r = dates.map((_, i) => (has[i] ? Math.max(0, Math.min(100, PL.base + PL.pts.rsi[i] + PL.pts.creditOwn[i])) : null));
const recSpec = { payoff: (() => { const inv = (i) => (REC17.r[i] == null ? null : numOf(REC17.r[i]) / 100), a = L.replay(inv, A0, LAST), flat = L.replay(() => a.invested / 100, A0, LAST), c = L.replay(inv, A0, LAST, COST); return { became: a.became, worstFall: a.worstFall, invested: a.invested, untimed: flat.became, timing: r3(a.became / flat.became), movedPerSession: a.movedPerSession, becameAfterCost: c.became }; })() };

/* ---------- 1 · THE DIAGNOSIS: Alan's dates, day by day, which part moved the number and by how many points of the account ---------- */
const rowAt = (i) => ({ d: dates[i], spy: r2(spy[i]), qqq: r2(qqq[i]), rsi: r1(X.rsi[i]), own: r2(X.creditOwn[i]), hyg10: r2((hygTR[i] / hygTR[i - 10] - 1) * 100), ief10: r2((bars.IEF.c[i] / bars.IEF.c[i - 10] - 1) * 100), hygRsi: r1(X.hygRsi[i]), pR: r1(PL.pts.rsi[i]), pC: r1(PL.pts.creditOwn[i]), reading: r1(v1r[i]), number: r1(numOf(v1r[i])),
  pC2: r1(V2.creditCounted(PL.pts.creditOwn[i], X.rsi[i], RULES)), cash: REC.cash[i] ? 1 : 0, reading2: r1(REC.r[i]), number2: r1(numOf(REC.r[i])), d50: r2(X.d50[i]), d100: r2(X.d100[i]), x200: r2(X.x200[i]) });
const moveOf = (a, b) => { const i = ix[a], j = ix[b], dN = numOf(v1r[j]) - numOf(v1r[i]), byR = (TACT / 100) * (PL.pts.rsi[j] - PL.pts.rsi[i]), byC = (TACT / 100) * (PL.pts.creditOwn[j] - PL.pts.creditOwn[i]); return { from: a, to: b, spyPct: r2((spy[j] / spy[i] - 1) * 100), qqqPct: r2((qqq[j] / qqq[i] - 1) * 100), numberFrom: r1(numOf(v1r[i])), numberTo: r1(numOf(v1r[j])), d: r1(dN), byRsi: r1(byR), byCredit: r1(byC), heldAtAStop: r1(dN - byR - byC), rsiFrom: r1(X.rsi[i]), rsiTo: r1(X.rsi[j]), ownFrom: r2(X.creditOwn[i]), ownTo: r2(X.creditOwn[j]), hygPct: r2((hygTR[j] / hygTR[i] - 1) * 100), iefPct: r2((bars.IEF.c[j] / bars.IEF.c[i] - 1) * 100), number2From: r1(numOf(REC.r[i])), number2To: r1(numOf(REC.r[j])) }; };
const span = (a, b) => { const out = []; for (let i = idx(a); i <= idx(b); i++) out.push(rowAt(i)); return out; };
const avgOf = (ds, f) => r1(mean(ds.map((d) => f(ix[d]))));
const diagnosis = {
  feb23: { title: "23 February 2026, and the five weeks after it", moves: [moveOf("2026-02-20", "2026-02-23"), moveOf("2026-02-25", "2026-03-06"), moveOf("2026-03-13", "2026-03-16"), moveOf("2026-03-20", "2026-03-25")], rows: span("2026-02-18", "2026-04-02") },
  mar26: { title: "26 to 30 March 2026 — the low", moves: [moveOf("2026-03-25", "2026-03-26"), moveOf("2026-03-26", "2026-03-30"), moveOf("2026-03-30", "2026-03-31")], rows: span("2026-03-23", "2026-04-02") },
  jul21: { title: "21 July 2025", moves: [moveOf("2025-07-15", "2025-07-21"), moveOf("2025-07-21", "2025-07-31")], rows: span("2025-07-11", "2025-08-01") },
  sep22: { title: "22 September 2025", moves: [moveOf("2025-09-12", "2025-09-22"), moveOf("2025-09-22", "2025-09-24")], rows: span("2025-09-11", "2025-09-25") },
  end25: { title: "the end of 2025 — the top", moves: [moveOf("2025-12-01", "2025-12-31"), moveOf("2025-12-31", TOP), moveOf("2026-01-16", "2026-01-20")], rows: span("2025-12-01", "2026-02-05"),
    december: { sessions: DEC25.length, number: avgOf(DEC25, (i) => numOf(v1r[i])), reading: avgOf(DEC25, (i) => v1r[i]), rsi: avgOf(DEC25, (i) => X.rsi[i]), pR: avgOf(DEC25, (i) => PL.pts.rsi[i]), pC: avgOf(DEC25, (i) => PL.pts.creditOwn[i]), own: r2(mean(DEC25.map((d) => X.creditOwn[ix[d]]))), rsiMax: r1(Math.max(...DEC25.map((d) => X.rsi[ix[d]]))), numberMin: r1(Math.min(...DEC25.map((d) => numOf(v1r[ix[d]])))), numberMax: r1(Math.max(...DEC25.map((d) => numOf(v1r[ix[d]])))), x200: avgOf(DEC25, (i) => X.x200[i]), number2: avgOf(DEC25, (i) => numOf(REC.r[i])) }, top: rowAt(ix[TOP]) },
  spring25: { title: "late March and April 2025", moves: [moveOf("2025-03-27", "2025-03-28"), moveOf("2025-03-28", "2025-04-02"), moveOf("2025-04-02", "2025-04-04"), moveOf("2025-04-08", "2025-04-09")], rows: span("2025-03-10", "2025-04-24") } };
/* how the two curves read a value: the marks the page's plain words lean on */
const curveMarks = { typicalDay: r1(PL.base), rsi: [25, 30, 35, 40, 45, 50, 55, 60, 65, 67, 69, 70, 72, 75, 80].map((z) => [z, r1(PL.gainVote ? null : liveFit.M.scale.gain * E.voteOf(liveFit.M.parts[0], z, liveFit.M.scale).vote)]), credit: [-4, -3, -2, -1.5, -1.3, -1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.5, 1, 1.5, 2, 3].map((z) => [z, r1(liveFit.M.scale.gain * E.voteOf(liveFit.M.parts[1], z, liveFit.M.scale).vote)]) };
/* how much of the day-to-day movement each part makes, the year Alan scrolled, in points of the account */
const moveSplit = (() => { let a = 0, b = 0, k = 0; for (let i = YEAR[0] + 1; i <= YEAR[1]; i++) { a += Math.abs(PL.pts.rsi[i] - PL.pts.rsi[i - 1]); b += Math.abs(PL.pts.creditOwn[i] - PL.pts.creditOwn[i - 1]); k++; } return { rsiPart: r2(((TACT / 100) * a) / k), creditPart: r2(((TACT / 100) * b) / k), together: B0.dates.MOVE, sessions: k }; })();
/* the days the number fell while SPY and QQQ fell too, 23 Feb → 30 Mar 2026 (his "the market dips and we decrease") */
const wrongWay = (R) => { let n = 0, days = 0; for (let i = ix["2026-02-23"]; i <= ix[LOW26]; i++) { days++; if (L.dayRet[i] < 0 && numOf(R[i]) - numOf(R[i - 1]) <= -0.5) n++; } return { cutOnADownDay: n, sessions: days }; };

/* ---------- 3 · before → after ---------- */
const recDates = scorecard(LEAD, "all"), recDates17 = scorecard(LEAD, "17");
const named = [["2025-03-13", "a March 2025 low"], [LOW25, "the late-March 2025 low"], ["2025-04-02", "the day before the April fall"], ["2025-04-08", "the April 2025 low"], ["2025-07-21", "21 July 2025"], ["2025-09-22", "22 September 2025"], ["2025-10-29", "the Nasdaq's high of autumn 2025"], ["2025-12-11", "mid-December 2025"], ["2025-12-26", "late December 2025"], [TOP, "SPY's highest close before the fall"], ["2026-02-23", "23 February 2026"], ["2026-03-13", "13 March 2026"], ["2026-03-26", "26 March 2026"], [LOW26, "the March 2026 low"], [dates[LAST], "the last day in the study"]].map(([d, what]) => ({ what, ...rowAt(ix[d]) }));
const afterWrong = { before: wrongWay(v1r), after: wrongWay(REC.r) };
/* the odds that go with a version-2 reading, unseen years, DS1's own bands */
const BANDS = [[0, 20], [20, 35], [35, 50], [50, 65], [65, 80], [80, 100.01]], oddsOf = (R) => BANDS.map(([lo, hi]) => { const g = T.filter((i) => R[i] != null && R[i] >= lo && R[i] < hi); return { lo, hi: Math.min(hi, 100), ...sumOut(g) }; });
const v1r17 = dates.map((_, i) => (P17.pts.rsi[i] != null && P17.pts.creditOwn[i] != null ? Math.max(0, Math.min(100, P17.base + P17.pts.rsi[i] + P17.pts.creditOwn[i])) : null));
const odds = { v1: oddsOf(v1r17), v2: oddsOf(REC17.r), any: sumOut(T) };

/* ---------- the series the page draws: every session since 2 Jan 2025 ---------- */
const s0 = idx("2025-01-02"), series = { d: dates.slice(s0), spy: spy.slice(s0).map(r2), qqq: qqq.slice(s0).map(r2), n1: v1r.slice(s0).map((v) => r1(numOf(v))), n2: REC.r.slice(s0).map((v) => r1(numOf(v))), cash: REC.cash.slice(s0).map((v) => (v ? 1 : 0)) };
const lSince = idx("2018-01-02"), long = { d: dates.slice(lSince), spy: spy.slice(lSince).map(r2), n1: v1r.slice(lSince).map((v) => r1(numOf(v))), n2: REC.r.slice(lSince).map((v) => r1(numOf(v))), cash: REC.cash.slice(lSince).map((v) => (v ? 1 : 0)) };

/* ---------- what the tool and the pane read ---------- */
const cashEpisodes = (() => { const out = []; let a = -1; for (let i = 0; i <= LAST + 1; i++) { const on = i <= LAST && REC.cash[i]; if (on && a < 0) a = i; if (!on && a >= 0) { out.push([dates[a], i > LAST ? null : dates[i - 1]]); a = -1; } } return out; })();
const liveOut = { what: "DS2 — version 2 of the market reading, as the allocation tool and the TradingView pane read it (study/ds2/number.mjs is the sum)", asOf: dates[LAST], built: new Date().toISOString(), modelAsOf: dates[LAST],
  rules: RULES, measured: { extPct: { value: RULES.extPct, what: "the distance of SPY and QQQ above their 200-day average, averaged, that four days in five of the measured days sat under", days: L.ALLROWS.length, from: dates[L.ALLROWS[0]], to: dates[L.ALLROWS.at(-1)], fittedTo2017: +EXT_17.toFixed(2) } },
  cashEpisodes, now: { date: dates[LAST], cash: !!REC.cash[LAST], since: V2.cashSince(dates, REC.cash, LAST), readingV1: r1(v1r[LAST]), readingV2: r1(REC.r[LAST]), numberV1: r1(numOf(v1r[LAST])), numberV2: r1(numOf(REC.r[LAST])), rsi: r1(X.rsi[LAST]), x200: r2(X.x200[LAST]), offSpy: r2(REC.top[LAST].offSpy), offQqq: r2(REC.top[LAST].offQqq) } };

/* the lab against the deployment study's stored answers (tests/ds2.test.mjs reads this record, and runs the comparison again when it is given the cache folder) */
const labCheck = (() => { const ds1Live = J(path.join(ROOT, "study/ds1/data/ds1-live.json")), ds1 = J(path.join(ROOT, "study/ds1/data/ds1.json")); let w = 0; for (const p of liveFit.M.parts) { const q = ds1Live.model.parts.find((x) => x.key === p.key); for (const c of ["q", "gm20", "gp20", "gm60", "gp60"]) for (let k = 0; k < p[c].length; k++) w = Math.max(w, Math.abs(p[c][k] - q[c][k])); }
  const sc = Object.fromEntries(Object.entries(liveFit.M.scale).map(([k, v]) => [k, +v.toFixed(6)])), want = ds1.pieReplay.lineTest.find((x) => x.readings === 1).core70, bh = L.replay(() => 1, A0, LAST);
  return { modelWorstDifference: w, scale: sc, scaleIsTheStudys: JSON.stringify(sc) === JSON.stringify(ds1Live.model.scale), replay: { became: B0.payoff.became, worstFall: B0.payoff.worstFall, invested: B0.payoff.invested }, theStudysReplay: want, buyAndHold: { became: bh.became, worstFall: bh.worstFall }, theStudysBuyAndHold: ds1.pieReplay.buyAndHold, fittedDays: L.F17.length, replayedDays: L.T18.length }; })();
if (labCheck.modelWorstDifference > 1e-9 || !labCheck.scaleIsTheStudys || labCheck.replay.became !== labCheck.theStudysReplay.became || labCheck.replay.worstFall !== labCheck.theStudysReplay.worstFall || labCheck.replay.invested !== labCheck.theStudysReplay.invested) throw new Error("the lab is not the deployment study's lab: " + JSON.stringify(labCheck));
const out = { what: "DS2 — the % invested number at lows and tops: the diagnosis, the candidates, the scorecard, the recommended version", labCheck, asOf: dates[LAST], built: new Date().toISOString(), held: HELD, tactical: TACT, cost: COST,
  windows: { MAR25, LOW25, MAR26, LOW26, DEC25: [DEC25[0], DEC25.at(-1), DEC25.length], TOP, topSpy: r2(spy[ix[TOP]]), year: [dates[YEAR[0]], dates[YEAR[1]]], unseen: [dates[A0], dates[LAST]], fitted: [dates[L.F17[0]], dates[L.F17.at(-1)]], liveFit: [dates[L.ALLROWS[0]], dates[L.ALLROWS.at(-1)], L.ALLROWS.length] },
  diagnosis, curveMarks, moveSplit,
  candidates: CANDS.map((c) => ({ key: c.key, family: c.family, name: c.name, shapedByHisDate: !!c.shapedByHisDate, addedAfterFirstRun: !!c.addedAfterFirstRun, payoff: c.payoff, dates: c.dates, dates17: c.dates17, passWhole: c.passWhole ?? null, passDates: c.passDates ?? null, passSmooth: c.passSmooth ?? null, verdict: c.verdict || "" })),
  combos: COMBOS.map((c) => ({ key: c.key, payoff: c.payoff, dates: c.dates, dates17: c.dates17, passWhole: c.passWhole, passDates: c.passDates, steadier: c.steadier, afterCostOk: c.afterCostOk })),
  evidence: { creditInPanic, depthBands, partTests, topRules, EXT80: r2(EXT80) }, firm,
  recommended: { key: "a2f + d2L", rules: RULES, extFittedTo2017: +EXT_17.toFixed(2), before: { payoff: B0.payoff, dates: B0.dates, dates17: B0.dates17 }, after: { payoff: recSpec.payoff, dates: recDates, dates17: recDates17 }, named, wrongWay: afterWrong, odds, withDepthAddOn: { payoff: payoff(LEADB), dates: scorecard(LEADB, "all"), dates17: scorecard(LEADB, "17") }, withC3: { payoff: payoff({ ...LEAD, smooth: 3 }), dates: scorecard({ ...LEAD, smooth: 3 }, "all") }, withCUp: { payoff: payoff({ ...LEAD, smooth: "up5" }), dates: scorecard({ ...LEAD, smooth: "up5" }, "all") }, a2Hard: { payoff: payoff({ ...BASE, credit: "a2", top: "d2L" }), dates: scorecard({ ...BASE, credit: "a2", top: "d2L" }, "all") } },
  now: liveOut.now, cashEpisodes, series, long };
fs.mkdirSync(path.join(ROOT, "study/ds2/data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "study/ds2/data/ds2.json"), JSON.stringify(out)); fs.writeFileSync(path.join(ROOT, "study/ds2/data/ds2-live.json"), JSON.stringify(liveOut));
for (const f of ["ds2-pass1.json", "ds2-pass2.json"]) { const q = path.join(ROOT, "study/ds2/data", f); if (fs.existsSync(q)) fs.unlinkSync(q); }
log("\nRECOMMENDED a2f + d2L · rules", JSON.stringify(RULES)); log("  payoff before", JSON.stringify(B0.payoff)); log("  payoff after ", JSON.stringify(recSpec.payoff)); log("  dates before", JSON.stringify(B0.dates)); log("  dates after ", JSON.stringify(recDates)); log("  dates (2017 fit) before", JSON.stringify(B0.dates17)); log("  dates (2017 fit) after ", JSON.stringify(recDates17));
log("  with the depth add-on:", JSON.stringify(out.recommended.withDepthAddOn.payoff), JSON.stringify(out.recommended.withDepthAddOn.dates)); log("  wrong-way days 23 Feb → 30 Mar 2026:", JSON.stringify(afterWrong)); log("  now:", JSON.stringify(liveOut.now)); log("  move split:", JSON.stringify(moveSplit));
log("  odds v1:", JSON.stringify(odds.v1.map((b) => [b.lo + "-" + b.hi, b.n, b.share20, b.med20, b.share60, b.med60]))); log("  odds v2:", JSON.stringify(odds.v2.map((b) => [b.lo + "-" + b.hi, b.n, b.share20, b.med20, b.share60, b.med60])));
for (const m of [...diagnosis.feb23.moves, ...diagnosis.mar26.moves, ...diagnosis.jul21.moves, ...diagnosis.sep22.moves, ...diagnosis.end25.moves, ...diagnosis.spring25.moves]) log("  MOVE", m.from, "→", m.to, "SPY", m.spyPct + "%", "| number", m.numberFrom, "→", m.numberTo, "(" + m.d + ")", "= RSI part", m.byRsi, "+ credit part", m.byCredit, m.heldAtAStop ? "+ held at a stop " + m.heldAtAStop : "", "| v2:", m.number2From, "→", m.number2To);
log("  December 2025:", JSON.stringify(diagnosis.end25.december));
console.log(JSON.stringify({ ok: true, asOf: dates[LAST], files: ["study/ds2/data/ds2.json", "study/ds2/data/ds2-live.json"].map((f) => [f, fs.statSync(path.join(ROOT, f)).size]) }));
