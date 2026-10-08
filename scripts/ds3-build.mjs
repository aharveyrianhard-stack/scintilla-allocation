/* DS3 (8 Oct 2026) — the % invested number, round 3: the VIX counted, depth under the 50- and 100-day, fear in treasuries read as fear.
     node scripts/ds3-build.mjs <cacheDir>          writes study/ds3/data/ds3.json and study/ds3/data/ds3-live.json
   No key, no table, no network: it reads the cache folder DS1 and DS2 read, through scripts/ds2-lib.mjs — DS1's own loader, fit and replay
   (this build checks its lab against DS1's stored answers, and its version 2 against DS2's stored answers, before it scores anything).

   THE NUMBER THIS ROUND STARTS FROM — DS2's version 2 (study/ds2/number.mjs):
     % invested = 70 held + 30 tactical × the market reading ÷ 100
     the market reading = a typical day + the RSI part + the credit part (its subtraction faded out when the indices are washed out),
                          held to 0 … 100, halved while cash is raised (an extended high until the next washout)

   WRITTEN HERE BEFORE ANY CANDIDATE WAS RUN (version 2's own figures were known from DS2; no candidate below had been run):

   A · THE SCORECARD ON ALAN'S DATES — DS2's, unchanged: every line in points of the account, on the number the tool would show
     L25   the late-March 2025 low     the average over the last five sessions of March 2025, and on the lowest SPY close of them      HIGHER
     L26   the March 2026 low          the average over the five sessions to the low (24–30 Mar 2026), and on the low itself            HIGHER
     CUT   no cut into the low         the number on 30 Mar 2026 less the highest of the four sessions before it                       NOT NEGATIVE
     T25   the late-2025 top           the average over December 2025, and on SPY's highest close before the fall                       LOWER
     MOVE  how much it moves           the average day-to-day change, 7 Oct 2025 → 6 Oct 2026
     Beside them, for this round:  ADDS — what the candidate's own part adds, in points of the account, on each of those days;
                                   TODAY — what it would add at this morning's VIX of 15.7 (it should be about nothing);
                                   and for (f) the two stretches Alan named: 26 → 30 Mar 2026 and 7 Oct's close → 8 Oct before the open.

   B · THE WHOLE PERIOD — exactly DS1's replay, as DS2 ran it: the rule fitted on 10 Mar 2009 → end-2017, replayed on 2 Jan 2018 → 6 Oct 2026,
       which it never saw; the share set at a close earns the next session's blend of SPY and QQQ; cash earns the 3-month bill; no costs.
       TIMING = what 1 became ÷ what the same average share became untimed.
       Beside it, for every candidate: the same rule read on 2004 → 9 Mar 2009, which holds 2008 (DS2 found depth cost 4.4% there).

   C · THE PASS RULE — DS2's, with the 1% bar applied to every candidate, not only the smoother
     whole period   TIMING not more than 0.005 under version 2's; the worst fall not more than 1.0 point deeper; and THE 1% BAR: what 1
                    became, after a charge of 0.05% on every dollar moved, not more than 1% under version 2's
     his dates      at least one of L25, L26 (up) or T25 (down) better by 1.0 point of the account, none of them worse by 1.0
     for (f) only   its dates are the two stretches Alan named for it: it passes them if credit's share of the fall is at least halved on
                    one of the two (26 → 30 Mar 2026 as today's rule reads it; this morning) and no scorecard line is worse by 1.0
     A candidate goes into version 3 only if it passes BOTH. One that helps his dates and fails the whole period is reported with its cost.

   D · THE CANDIDATES (fixed here; thresholds are Alan's own numbers, round numbers, or come from the fitted years only)
     (e) THE VIX AS A COUNTED PART
       e1 — measured, DS1's method (a curve on the VIX's place in its own year, fitted beside the RSI and credit on the fitted years):
         e1c   the close's place                       as a third part
         e1h   the intraday high's place               as a third part
         e1    the two, half each (DS1's composite)    as a third part
         e1u   the composite, held so that a higher VIX never reads worse, as a third part
         e1a   the same held curve as an ADD-ON: nothing at or under the middle of its year, the two-part model untouched
       e2 — Alan's rule as steps (a touch counts at half, a close in full; under 20 it is exactly nothing):
         e2    a close at 20 or more adds 10 points of market reading (3 of the account); a close at 23 or more adds 20 (6 of the account)
         e2x   the same steps at twice the size (20 and 40: 6 and 12 of the account) — "both hands"
         e2m   the same steps with their sizes MEASURED on the fitted years (what such days added over what the RSI and credit already said)
         e2p   the same steps asked by place instead of level: the 80th and the 90th place of the VIX's own year, sizes as e2
     (b) DEPTH UNDER THE 50-DAY AND THE 100-DAY, on top of version 2 (one-sided, held so that deeper never reads worse)
         b50, b100, b (the two averaged)   as a third part        b100a, ba   as an add-on (the form DS2 measured)
     (f) TREASURIES RALLYING = FEAR, NOT CREDIT WEAKNESS
         f1    the rates leg counted only when treasuries FALL: credit's own move = HYG's move less half the treasury fund's move when
               that move is down, and HYG's move alone when treasuries rallied — read on the credit curve as it stands
         f1r   the same reading, with the credit curve re-fitted on it
         f2    a treasury rally of its own counted as a fear add: the treasury fund's ten-session rise (nothing when it fell) as a third
               part, held so that a bigger rally never reads worse; credit's own move unchanged
         f2a   the same as an add-on
         f3    Alan's sentence taken literally: when treasuries rallied and HYG, with its payouts, is no lower than ten sessions ago,
               the credit part may add but may not subtract
     Smoothing stays out (it failed DS2's bar). */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { lab, J, r1, r2, r3, fin, med, mean, sd, pctl, shareUp } from "./ds2-lib.mjs";
import * as V2 from "../study/ds2/number.mjs";
import * as V3 from "../study/ds3/number.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.argv[2]; if (!CACHE || !fs.existsSync(path.join(CACHE, "SPY_D.json"))) { console.error("usage: node scripts/ds3-build.mjs <cacheDir>"); process.exit(2); }
const log = (...a) => console.error(...a);
const L = lab(CACHE), { E, X, IND, dates, N, LAST, ix, bars, Y, spy, qqq, hygTR } = L;
const HELD = 70, TACT = 30, numOf = (reading) => (reading == null ? null : HELD + (TACT * Math.max(0, Math.min(100, reading))) / 100);
const idx = (d) => ix[d] ?? dates.findIndex((x) => x >= d), A0 = L.firstOf(2018), COST = 0.0005;
const TODAY_VIX = { close: 15.73, high: 16.02, note: "Alan, 8 Oct ~08:45: 'The VIX rose to 15.73'; 16.02 was the session's high on the tool's read of 09:05" };

/* ---------- the extra readings ---------- */
const O = V3.extraReadings(L.S, hygTR, X); for (const k of Object.keys(O)) X[k] = O[k];
const d200 = (o, i) => (o.c[i] != null && o.s200[i] != null ? (o.c[i] / o.s200[i] - 1) * 100 : null);
X.x200 = dates.map((_, i) => { const a = d200(IND.SPY, i), b = d200(IND.QQQ, i); return a == null || b == null ? null : Math.max(0, (a + b) / 2); });
const get = (i) => (k) => X[k][i];

/* ---------- the fits: DS1's additive fit through the lab, for the two parts that vote and for any third part beside them ---------- */
const WIN = { "17": [L.F17, 2018], all: [L.ALLROWS, 2018], "15": [L.F15, 2016], "19": [L.F19, 2020], "17w": [L.F17w, 2018] };
const PART_MONO = { depth50: "up", depth100: "up", depth: "up", tRally: "up", cVixUp: "up" }, PART_SRC = { cVixUp: "cVix" }; X.cVixUp = X.cVix;
const FITS = {}; function fitOf(which, creditKey = "creditOwn", extra = null) { const k = [which, creditKey, extra || ""].join("|");
  if (!FITS[k]) { const keys = extra ? ["rsi", creditKey, extra] : ["rsi", creditKey], hz = { rsi: [60], [creditKey]: [20], ...(extra ? { [extra]: [20, 60] } : {}) }, mono = { rsi: true, ...(extra && PART_MONO[extra] ? { [extra]: PART_MONO[extra] } : {}) };
    const M = L.fitAdditive(WIN[which][0], keys, undefined, hz, mono); FITS[k] = { M, base: 50 - M.scale.gain * M.scale.centre, rows: WIN[which][0] }; } return FITS[k]; }
/* an add-on: the part fitted beside the two that vote, read on the two-part model's gain, less what it reads at its zero */
const ADDON_ZERO = { depth50: 0, depth100: 0, depth: 0, tRally: 0, cVixUp: 50 };
const ADDON = {}; function addonOf(which, key, creditKey = "creditOwn") { const k = which + "|" + key + "|" + creditKey; if (!ADDON[k]) { const J3 = fitOf(which, creditKey, key).M, part = J3.parts.find((p) => p.key === key), scale = { ...J3.scale, gain: fitOf(which, creditKey).M.scale.gain, centre: 0 }; ADDON[k] = { key, part, scale, zero: V3.partPoints(part, ADDON_ZERO[key], scale), oneSided: true }; } return ADDON[k]; }
/* the raise-cash rule's one measured threshold, per fit (DS2 rounds it to two places for the tool and the pane; so does this) */
const EXT = {}; const extOf = (which) => (EXT[which] ??= +pctl(WIN[which][0].map((i) => X.x200[i]), 80).toFixed(2));
/* (e2m) the steps' sizes measured on a fit's own days: what the days at each step added over what the two parts already said, by DS1's vote */
const MSTEP = {}; function measuredSteps(which) { if (!MSTEP[which]) { const F = fitOf(which), M = F.M, sc = M.scale, rows = F.rows, B = M.B, sizeOf = (g) => { if (g.length < 30) return { n: g.length, points: 0, thin: true }; const res = (t) => g.map((i) => { const y = L.yOf(i, t, B), f = L.fittedAt(M, i, t); return y == null || f == null ? null : y - f; });
      const m20 = med(res("m20")), p20 = mean(res("p20")), m60 = med(res("m60")), p60 = mean(res("p60")); return { n: g.length, m20: r3(m20 * 100), p20: r3(p20 * 100), m60: r3(m60 * 100), p60: r3(p60 * 100), points: sc.gain * ((m20 / sc.sM20 + p20 / sc.sP20 + m60 / sc.sM60 + p60 / sc.sP60) / 4) }; };
    const lo = sizeOf(rows.filter((i) => X.vixC[i] >= 20 && X.vixC[i] < 23)), hi = sizeOf(rows.filter((i) => X.vixC[i] >= 23));
    MSTEP[which] = { lo, hi, T: { lo: 20, hi: 23, addLo: Math.max(0, +lo.points.toFixed(1)), addHi: Math.max(0, +lo.points.toFixed(1), +hi.points.toFixed(1)), touch: 0.5 } }; } return MSTEP[which]; }

/* ---------- one version of the number, as a spec → its reading on every evening ----------
   spec = { v2: true|false, credit: null|"f1"|"f1r"|"f3", part: null|key, addons: [key], steps: null|"e2"|"e2x"|"e2m"|"e2p", params: {…} }
   which = "17" (fitted to 2017: the unseen test) or "all" (fitted on every day: what the tool shows) */
const STEP_T = { e2: V3.STEPS, e2x: { ...V3.STEPS, addLo: 20, addHi: 40 }, e2p: { ...V3.STEPS, lo: 80, hi: 90 } };
function planOf(spec, which) { const creditKey = spec.credit === "f1r" ? "creditF1" : "creditOwn", F = fitOf(which, creditKey, spec.part || null), Q = spec.params || {};
  const T = spec.steps ? { ...(spec.steps === "e2m" ? measuredSteps(which).T : STEP_T[spec.steps]), ...(Q.steps || {}) } : null;
  const rules = spec.v2 === false ? { ...V2.RULES, creditRule: 0, cashRule: 0 } : { ...V2.RULES, extPct: extOf(which) };
  return { model: F.M, base: F.base, creditKey, creditInput: spec.credit === "f1" ? "creditF1" : creditKey, creditBest: spec.credit === "f1x", floorHeld: spec.credit === "f3", part: spec.part || null, addons: (spec.addons || []).map((k) => addonOf(which, k, creditKey)), steps: T ? { by: spec.steps === "e2p" ? "place" : "level", T } : null, stepsOutsideCash: !!Q.stepsOutsideCash, rules }; }
const RUNS = new Map(); function readingsOf(spec, which) { const key = which + "|" + JSON.stringify(spec); if (RUNS.has(key)) return RUNS.get(key);
  const P = planOf(spec, which), has = dates.map((_, i) => V3.readPlan(P, get(i), false) != null), cash = V2.cashSeries({ rsi: X.rsi, spy, qqq, has }, P.rules).cash, rows = dates.map((_, i) => (has[i] ? V3.readPlan(P, get(i), cash[i]) : null));
  const out = { plan: P, r: rows.map((x) => (x ? x.reading : null)), rows, cash }; RUNS.set(key, out); return out; }

/* ---------- B · the whole period, DS1's replay ---------- */
function payoff(spec, which = "17", from = null, to = LAST) { const R = readingsOf(spec, which).r, a0 = from ?? L.firstOf(WIN[which][1]), inv = (i) => (R[i] == null ? null : numOf(R[i]) / 100), a = L.replay(inv, a0, to), flat = L.replay(() => a.invested / 100, a0, to), c = L.replay(inv, a0, to, COST);
  return { became: a.became, worstFall: a.worstFall, invested: a.invested, untimed: flat.became, timing: r3(a.became / flat.became), movedPerSession: a.movedPerSession, becameAfterCost: c.became }; }
const Y0409 = [idx("2004-01-02"), idx("2009-03-09")], through2008 = (spec) => payoff(spec, "17", Y0409[0], Y0409[1]);

/* ---------- A · the scorecard on Alan's dates (DS2's windows, found the same way) ---------- */
const MAR25 = dates.filter((d) => d >= "2025-03-01" && d <= "2025-03-31").slice(-5), LOW25 = MAR25.reduce((a, d) => (spy[ix[d]] < spy[ix[a]] ? d : a));
const LOW26 = "2026-03-30", MAR26 = dates.slice(ix[LOW26] - 4, ix[LOW26] + 1), DEC25 = dates.filter((d) => d >= "2025-12-01" && d <= "2025-12-31");
const TOP = (() => { let k = ix[LOW26] - 120; for (let i = k; i < ix[LOW26]; i++) if (spy[i] > spy[k]) k = i; return dates[k]; })();
const YEAR = [idx("2025-10-07"), LAST];
function scorecard(spec, which) { const R = readingsOf(spec, which).r, n = (d) => numOf(R[ix[d]]), avg = (ds) => mean(ds.map(n)); let mv = 0, k = 0; for (let i = YEAR[0] + 1; i <= YEAR[1]; i++) if (R[i] != null && R[i - 1] != null) { mv += Math.abs(numOf(R[i]) - numOf(R[i - 1])); k++; }
  const L25 = avg(MAR25), L26 = avg(MAR26), T25 = avg(DEC25);
  return { L25: r1(L25), L25low: r1(n(LOW25)), L26: r1(L26), L26low: r1(n(LOW26)), CUT: r1(n(LOW26) - Math.max(...MAR26.slice(0, 4).map(n))), T25: r1(T25), T25top: r1(n(TOP)), GAP: r1((L25 + L26) / 2 - T25), MOVE: r2(mv / k), jul21: r1(n("2025-07-21")), sep22: r1(n("2025-09-22")), feb23: r1(n("2026-02-23")), mar26: r1(n("2026-03-26")), apr8: r1(n("2025-04-08")), last: r1(n(dates[LAST])) }; }
/* what the candidate changes on a day, in points of the account: its number less version 2's, the same fit */
const NAMED = [[LOW25, "the late-March 2025 low"], ["2025-04-08", "the April 2025 low"], ["2025-07-21", "21 July 2025"], ["2025-09-22", "22 September 2025"], ["2025-12-11", "mid-December 2025"], [TOP, "SPY's highest close before the fall"], ["2026-02-23", "23 February 2026"], ["2026-03-26", "26 March 2026"], [LOW26, "the March 2026 low"], [dates[LAST], "the last day in the study"]];
const V2SPEC = { v2: true }, V1SPEC = { v2: false };
function addsOf(spec, which = "all") { const A = readingsOf(spec, which), B = readingsOf(V2SPEC, which); return NAMED.map(([d, what]) => { const i = ix[d], a = A.rows[i], b = B.rows[i]; return { d, what, vixClose: r2(X.vixC[i]), vixHigh: r2(X.vixH[i]), vixPlace: r1(X.vixPct[i]), number: r1(numOf(A.r[i])), number2: r1(numOf(B.r[i])), adds: r1(numOf(A.r[i]) - numOf(B.r[i])), ownPoints: a ? r1((TACT / 100) * (a.steps + a.extra)) : null, cash: A.cash[i] ? 1 : 0 }; }); }
/* the candidate asked on one made-up evening: the last day in the study with the VIX moved to a level (everything else as it was) */
function atVix(spec, close, high, which = "all") { const A = readingsOf(spec, which), P = A.plan, i = LAST, yr = [...fin(bars.VIX.c.slice(i - 251, i)), close], place = (v) => (100 * yr.filter((x) => x < v).length) / (yr.length - 1), cP = place(close), hP = place(Math.max(high, close));
  const g = (k) => (k === "vixC" ? close : k === "vixH" ? Math.max(high, close) : k === "vixPct" ? cP : k === "vixHiPct" ? hP : k === "cVix" || k === "cVixUp" ? (cP + hP) / 2 : X[k][i]), with_ = V3.readPlan(P, g, A.cash[i]), B = readingsOf(V2SPEC, which), was = B.rows[i];
  /* the two-part model is re-fitted when a third part is added, so "what it adds" is the whole number less version 2's on the same evening */
  return { close, high, closePlace: r1(cP), highPlace: r1(hP), number: r1(numOf(with_.reading)), number2: r1(numOf(was.reading)), adds: r1(numOf(with_.reading) - numOf(was.reading)), ownPoints: r1((TACT / 100) * (with_.steps + with_.extra) * (with_.cash && !P.stepsOutsideCash ? P.rules.cashCut : 1)) }; }

/* ---------- before any candidate: the lab is DS1's lab, and version 2 here is DS2's version 2 ---------- */
const ds2 = J(path.join(ROOT, "study/ds2/data/ds2.json")), ds1Live = J(path.join(ROOT, "study/ds1/data/ds1-live.json")), ds1 = J(path.join(ROOT, "study/ds1/data/ds1.json"));
const B1 = { payoff: payoff(V1SPEC), dates: scorecard(V1SPEC, "all"), dates17: scorecard(V1SPEC, "17"), y0409: through2008(V1SPEC) }, B2 = { payoff: payoff(V2SPEC), dates: scorecard(V2SPEC, "all"), dates17: scorecard(V2SPEC, "17"), y0409: through2008(V2SPEC) };
const labCheck = (() => { const M = fitOf("all").M; let w = 0; for (const p of M.parts) { const q = ds1Live.model.parts.find((x) => x.key === p.key); for (const c of ["q", "gm20", "gp20", "gm60", "gp60"]) for (let k = 0; k < p[c].length; k++) w = Math.max(w, Math.abs(p[c][k] - q[c][k])); }
  const want1 = ds1.pieReplay.lineTest.find((x) => x.readings === 1).core70, want2 = ds2.recommended.after, same = (a, b, ks) => ks.every((k) => a[k] === b[k]);
  return { modelWorstDifference: w, version1: { here: { became: B1.payoff.became, worstFall: B1.payoff.worstFall, invested: B1.payoff.invested }, ds1: want1, same: same(B1.payoff, want1, ["became", "worstFall", "invested"]) },
    version2: { here: B2.payoff, ds2: want2.payoff, samePayoff: same(B2.payoff, want2.payoff, ["became", "worstFall", "invested", "timing", "becameAfterCost"]), hereDates: B2.dates, ds2Dates: want2.dates, sameDates: same(B2.dates, want2.dates, ["L25", "L25low", "L26", "L26low", "CUT", "T25", "T25top", "MOVE", "jul21", "sep22"]) }, extPct: { all: extOf("all"), fittedTo2017: extOf("17"), ds2: [ds2.recommended.rules.extPct, ds2.recommended.extFittedTo2017] } }; })();
log("LAB · model against DS1's stored model, worst difference", labCheck.modelWorstDifference, "· version 1 = DS1's replay:", labCheck.version1.same, JSON.stringify(labCheck.version1.here), "· version 2 = DS2's:", labCheck.version2.samePayoff, labCheck.version2.sameDates, JSON.stringify(B2.payoff));
if (labCheck.modelWorstDifference > 1e-9 || !labCheck.version1.same || !labCheck.version2.samePayoff || !labCheck.version2.sameDates) throw new Error("this lab is not DS1's lab, or its version 2 is not DS2's: " + JSON.stringify(labCheck));

/* ---------- the candidates ---------- */
const C = (key, family, name, spec, more = {}) => ({ key, family, name, spec: { v2: true, ...spec }, ...more });
const CANDS = [
  C("e1c", "e1", "the VIX's close, placed in its own year — a measured third part", { part: "vixPct" }),
  C("e1h", "e1", "the VIX's intraday high, placed in its own year — a measured third part", { part: "vixHiPct" }),
  C("e1", "e1", "the two, half each (DS1's composite) — a measured third part", { part: "cVix" }),
  C("e1u", "e1", "the composite, held so a higher VIX never reads worse — a third part", { part: "cVixUp" }),
  C("e1a", "e1", "the same held curve as an add-on (nothing at or under the middle of its year)", { addons: ["cVixUp"] }),
  C("e2", "e2", "Alan's steps: a close at 20+ adds 10 points of reading, at 23+ adds 20; a touch counts half", { steps: "e2" }),
  C("e2x", "e2", "Alan's steps at twice the size (20 and 40) — both hands", { steps: "e2x" }),
  C("e2m", "e2", "Alan's steps, sizes measured on the fitted years", { steps: "e2m" }),
  C("e2p", "e2", "the same steps asked by place: the 80th and the 90th place of the VIX's own year", { steps: "e2p" }),
  C("b50", "b", "depth under the 50-day — a third part", { part: "depth50" }),
  C("b100", "b", "depth under the 100-day — a third part", { part: "depth100" }),
  C("b", "b", "depth under the 50-day and the 100-day, averaged — a third part", { part: "depth" }),
  C("b100a", "b", "depth under the 100-day — an add-on (the form DS2 measured)", { addons: ["depth100"] }),
  C("ba", "b", "depth under the two, averaged — an add-on", { addons: ["depth"] }),
  C("f1", "f", "the rates leg counted only when treasuries fall — on the credit curve as it stands", { credit: "f1" }),
  C("f1r", "f", "the same, with the credit curve re-fitted on it", { credit: "f1r" }),
  C("f2", "f", "a treasury rally of its own as a fear add — a third part", { part: "tRally" }),
  C("f2a", "f", "the same as an add-on", { addons: ["tRally"] }),
  C("f3", "f", "treasuries rallied and HYG held → the credit part may add, not subtract", { credit: "f3" }),
];
/* (f)'s own dates: credit's share of the fall on 26 → 30 Mar 2026 as TODAY's rule reads it (version 1 with the candidate's credit reading) */
const MARF = ["2026-03-26", "2026-03-30"];
function fStretch(spec, which = "all") { const one = (sp) => { const A = readingsOf(sp, which), a = A.rows[ix[MARF[0]]], b = A.rows[ix[MARF[1]]]; return { from: r1(numOf(a.reading)), to: r1(numOf(b.reading)), d: r1(numOf(b.reading) - numOf(a.reading)), byCredit: r1((TACT / 100) * (b.creditCounted - a.creditCounted)), byRsi: r1((TACT / 100) * (b.rsi - a.rsi)), byOwn: r1((TACT / 100) * (b.extra + b.steps - a.extra - a.steps)) }; };
  return { onToday: one({ ...spec, v2: false }), onVersion2: one(spec), own: MARF.map((d) => ({ d, hyg10: r2(X.hyg10[ix[d]]), ief10: r2(X.ief10[ix[d]]), creditOwn: r2(X.creditOwn[ix[d]]), creditF1: r2(X.creditF1[ix[d]]) })) }; }
const t0 = Date.now();
function score(c) { c.payoff = payoff(c.spec); c.dates = scorecard(c.spec, "all"); c.dates17 = scorecard(c.spec, "17"); c.y0409 = through2008(c.spec); c.adds = addsOf(c.spec); c.today = atVix(c.spec, TODAY_VIX.close, TODAY_VIX.high); c.at20 = atVix(c.spec, 20.5, 21); c.at23 = atVix(c.spec, 23.5, 24.5); c.touch20 = atVix(c.spec, 19.2, 20.6); c.stretch = fStretch(c.spec);
  const p = c.payoff, b = B2.payoff, d = c.dates, e = B2.dates;
  c.bar = { timing: p.timing >= b.timing - 0.005, worstFall: p.worstFall >= b.worstFall - 1.0, onePct: p.becameAfterCost >= 0.99 * b.becameAfterCost, afterCostPct: r2((p.becameAfterCost / b.becameAfterCost - 1) * 100), y0409Pct: r2((c.y0409.became / B2.y0409.became - 1) * 100) };
  c.passWhole = c.bar.timing && c.bar.worstFall && c.bar.onePct; const up = [d.L25 - e.L25, d.L26 - e.L26, e.T25 - d.T25]; c.datesUp = up.map(r1); c.noWorse = !up.some((v) => v <= -1.0);
  if (c.family === "f") { const base = fStretch(V2SPEC).onToday.byCredit, mine = c.stretch.onToday.byCredit; c.creditShare = { before: base, after: mine }; c.passDates = c.noWorse && (up.some((v) => v >= 1.0) || (base < 0 && mine >= base / 2)); }
  else c.passDates = c.noWorse && up.some((v) => v >= 1.0);
  c.verdict = c.passWhole && c.passDates ? "passes both" : c.passDates ? "helps his dates, fails the whole period" : c.passWhole ? "costs nothing, does nothing on his dates" : "fails both"; return c; }
for (const c of CANDS) score(c);
const row = (c) => [c.key.padEnd(6), "became", String(c.payoff.became).padEnd(6), "fall", String(c.payoff.worstFall).padEnd(6), "inv", String(c.payoff.invested).padEnd(5), "TIMING", String(c.payoff.timing).padEnd(6), "afterCost", String(c.payoff.becameAfterCost).padEnd(6), "(" + c.bar.afterCostPct + "%)", "2008:", String(c.y0409.became).padEnd(6), "(" + c.bar.y0409Pct + "%)", "| L25", c.dates.L25, "(" + c.dates.L25low + ")", "L26", c.dates.L26, "(" + c.dates.L26low + ")", "CUT", c.dates.CUT, "T25", c.dates.T25, "(" + c.dates.T25top + ")", "MOVE", c.dates.MOVE, "| today", c.today.adds, "@20", c.at20.adds, "@23", c.at23.adds, "touch", c.touch20.adds, "|", c.verdict].join(" ");
log("candidates scored in", Date.now() - t0, "ms · late March 2025:", MAR25.join(" "), "low", LOW25, "· to the 2026 low:", MAR26.join(" "), "· top", TOP);
log(["v1    ", "became", B1.payoff.became, "fall", B1.payoff.worstFall, "inv", B1.payoff.invested, "TIMING", B1.payoff.timing, "afterCost", B1.payoff.becameAfterCost, "2008:", B1.y0409.became, "| L25", B1.dates.L25, "(" + B1.dates.L25low + ")", "L26", B1.dates.L26, "(" + B1.dates.L26low + ")", "CUT", B1.dates.CUT, "T25", B1.dates.T25, "MOVE", B1.dates.MOVE].join(" "));
log(["v2    ", "became", B2.payoff.became, "fall", B2.payoff.worstFall, "inv", B2.payoff.invested, "TIMING", B2.payoff.timing, "afterCost", B2.payoff.becameAfterCost, "2008:", B2.y0409.became, "| L25", B2.dates.L25, "(" + B2.dates.L25low + ")", "L26", B2.dates.L26, "(" + B2.dates.L26low + ")", "CUT", B2.dates.CUT, "T25", B2.dates.T25, "(" + B2.dates.T25top + ")", "MOVE", B2.dates.MOVE].join(" "));
for (const c of CANDS) log(row(c));
log("  the same dates with the rule fitted to 2017 only:"); for (const c of CANDS) log("  ", c.key.padEnd(6), "L25", c.dates17.L25, "(" + c.dates17.L25low + ")", "L26", c.dates17.L26, "(" + c.dates17.L26low + ")", "CUT", c.dates17.CUT, "T25", c.dates17.T25);
log("  (f) 26 → 30 Mar 2026:"); for (const c of CANDS.filter((x) => x.family === "f")) log("  ", c.key.padEnd(5), "on today's rule", JSON.stringify(c.stretch.onToday), "· on version 2", JSON.stringify(c.stretch.onVersion2)); log("   own:", JSON.stringify(fStretch(V2SPEC).own), "· today's rule alone:", JSON.stringify(fStretch(V2SPEC).onToday));
log("  measured steps (fitted to 2017):", JSON.stringify(measuredSteps("17")), "· on every day:", JSON.stringify(measuredSteps("all").T));

/* ---------- the evidence behind each family, on the years the rule had not seen ---------- */
const T = L.T18, sumOut = (g) => ({ n: g.length, med20: r2(med(g.map((i) => Y.r20[i])) * 100), share20: r3(shareUp(g.map((i) => Y.r20[i]))), med60: r2(med(g.map((i) => Y.r60[i])) * 100), share60: r3(shareUp(g.map((i) => Y.r60[i]))), dip20: r2(med(g.map((i) => Y.dip20[i])) * 100) });
const R17 = readingsOf(V2SPEC, "17"), P17 = (i) => R17.rows[i];
/* (e) what followed each state of Alan's rule — and the same inside the days version 2 already reads as a low (65 or more) and the rest */
const vState = [["a close at 23 or more", (i) => X.vixC[i] >= 23], ["a close from 20 to 23", (i) => X.vixC[i] >= 20 && X.vixC[i] < 23], ["touched 20, closed under it", (i) => X.vixC[i] < 20 && X.vixH[i] >= 20], ["never reached 20", (i) => X.vixH[i] < 20]];
const vixEvidence = { all: vState.map(([name, f]) => ({ name, ...sumOut(T.filter(f)) })), any: sumOut(T),
  byReading: [["version 2 already reads 65 or more", (i) => R17.r[i] >= 65], ["version 2 reads 35 to 65", (i) => R17.r[i] >= 35 && R17.r[i] < 65], ["version 2 reads under 35", (i) => R17.r[i] < 35]].map(([name, g]) => ({ name, rows: vState.map(([vn, f]) => ({ name: vn, ...sumOut(T.filter((i) => R17.r[i] != null && g(i) && f(i))) })) })),
  byYear: [...new Set(T.map((i) => dates[i].slice(0, 4)))].map((y) => { const g = T.filter((i) => dates[i].startsWith(y)), hi = g.filter((i) => X.vixC[i] >= 20), lo = g.filter((i) => X.vixC[i] < 20); return { year: y, at20: hi.length, under: lo.length, gap20: hi.length >= 10 && lo.length >= 10 ? r2((med(hi.map((i) => Y.r20[i])) - med(lo.map((i) => Y.r20[i]))) * 100) : null, gap60: hi.length >= 10 && lo.length >= 10 ? r2((med(hi.map((i) => Y.r60[i])) - med(lo.map((i) => Y.r60[i]))) * 100) : null }; }),
  levelsNow: (() => { const yr = fin(bars.VIX.c.slice(LAST - 251, LAST + 1)).sort((a, b) => a - b), pl = (v) => r1((100 * yr.filter((x) => x < v).length) / (yr.length - 1)); return { asOf: dates[LAST], place20: pl(20), place23: pl(23), place1573: pl(15.73), p80: r2(pctl(yr, 80)), p90: r2(pctl(yr, 90)), daysAt20: T.filter((i) => X.vixC[i] >= 20).length, daysAt23: T.filter((i) => X.vixC[i] >= 23).length, daysTouchOnly: T.filter((i) => X.vixC[i] < 20 && X.vixH[i] >= 20).length, days: T.length }; })() };
/* (f) the days the credit part subtracts: those where it would NOT subtract without the treasury rally, against the rest */
const fCred = (i) => P17(i) && P17(i).credit < 0, P17f = readingsOf({ v2: true, credit: "f1" }, "17"), onlyRates = (i) => fCred(i) && X.ief10[i] > 0 && P17f.rows[i].credit >= 0, fSets = [["credit subtracts only because treasuries rallied (HYG alone would not)", onlyRates], ["credit subtracts on HYG's own weakness", (i) => fCred(i) && !onlyRates(i)], ["credit adds or is neutral", (i) => P17(i) && P17(i).credit >= 0]];
const fearEvidence = { all: fSets.map(([name, f]) => ({ name, ...sumOut(T.filter(f)) })), any: sumOut(T),
  heldUp: [["treasuries rallied and HYG held, credit part subtracts", (i) => P17(i) && P17(i).heldUp && P17(i).credit < 0], ["treasuries rallied and HYG held, credit part adds", (i) => P17(i) && P17(i).heldUp && P17(i).credit >= 0]].map(([name, f]) => ({ name, ...sumOut(T.filter(f)) })),
  rally: [["treasuries up 1.5% or more in ten sessions", (i) => X.ief10[i] >= 1.5], ["up 0.5% to 1.5%", (i) => X.ief10[i] >= 0.5 && X.ief10[i] < 1.5], ["flat (−0.5% to 0.5%)", (i) => X.ief10[i] > -0.5 && X.ief10[i] < 0.5], ["down 0.5% or more", (i) => X.ief10[i] <= -0.5]].map(([name, f]) => ({ name, ...sumOut(T.filter((i) => X.ief10[i] != null && f(i))) })),
  byYear: [...new Set(T.map((i) => dates[i].slice(0, 4)))].map((y) => { const a = T.filter((i) => dates[i].startsWith(y) && onlyRates(i)), b = T.filter((i) => dates[i].startsWith(y) && !onlyRates(i)); return { year: y, days: a.length, gap20: a.length >= 10 ? r2((med(a.map((i) => Y.r20[i])) - med(b.map((i) => Y.r20[i]))) * 100) : null, gap60: a.length >= 10 ? r2((med(a.map((i) => Y.r60[i])) - med(b.map((i) => Y.r60[i]))) * 100) : null }; }) };
/* (b) what followed each depth, as DS2 showed it */
const dBand = [["not under it", (v) => v === 0], ["under by up to 2%", (v) => v > 0 && v <= 2], ["under by 2% to 5%", (v) => v > 2 && v <= 5], ["under by more than 5%", (v) => v > 5]];
const depthBands = Object.fromEntries(["depth50", "depth100"].map((k) => [k, dBand.map(([name, f]) => ({ name, ...sumOut(T.filter((i) => X[k][i] != null && f(X[k][i]))) }))]));
/* DS1's keep rule for a part tried on top of the two that vote (DS2's copy of testPart, word for word) */
const BAR = { 20: { med: 0.5, share: 3 }, 60: { med: 1.0, share: 3 } }, KEPT = ["rsi", "creditOwn"];
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
/* the steps as a reading the keep rule can test: 0, a half-step, a step, … (Alan's rule by level) */
X.vixStep = dates.map((_, i) => V3.vixSteps(X.vixC[i], X.vixH[i]));
/* the two that earn a vote are also asked with their curve left free (DS1's own form: only the RSI's curve was held), so the vote is not owed to the holding */
X.vixStepFree = X.vixStep; X.tRallyFree = X.tRally;
const partTests = [["vixPct", null], ["vixHiPct", null], ["cVix", null], ["cVixUp", "up"], ["vixStep", "up"], ["depth50", "up"], ["depth100", "up"], ["depth", "up"], ["tRally", "up"], ["vixStepFree", null], ["tRallyFree", null]].map(([k, mono]) => { const main = testPart(KEPT, k, L.F17, L.T18, mono), p20 = passes(main[20], 20), p60 = passes(main[60], 60), others = { fit2015: testPart(KEPT, k, L.F15, L.T16, mono), fit2019: testPart(KEPT, k, L.F19, L.T20, mono), with2008: testPart(KEPT, k, L.F17w, L.T18, mono) }; let verdict = "light", why = "";
  if (!p20 && !p60) why = "missed the bar at both horizons"; else { const H = p20 ? 20 : 60, Oh = p20 ? 60 : 20; if (main[Oh].gapMed < 0 && !(p20 && p60)) why = `passed at ${H} sessions but pointed the wrong way at ${Oh}`; else { const bad = Object.entries(others).filter(([, t]) => t[H].gapMed < 0).map(([n]) => n); if (bad.length) why = `passed at ${H} sessions but reversed in another fit (${bad.join(", ")})`; else { verdict = "vote"; why = `passed at ${p20 && p60 ? "20 and 60" : H} sessions; never the wrong way in the three other fits`; } } }
  log("part", k.padEnd(9), verdict.padEnd(6), "20:", JSON.stringify([main[20].gapMed, main[20].gapShare, main[20].yearsRight + "/" + main[20].years]), "60:", JSON.stringify([main[60].gapMed, main[60].gapShare, main[60].yearsRight + "/" + main[60].years]), "|", why, "| others 20/60:", Object.entries(others).map(([n, t]) => n + " " + t[20].gapMed + "/" + t[60].gapMed).join(" · "));
  return { key: k, verdict, why, main, others }; });
log("VIX (unseen):", JSON.stringify(vixEvidence.all.map((r) => [r.name, r.n, r.med20, r.share20, r.med60, r.share60, r.dip20])), "any", JSON.stringify(vixEvidence.any), "levels", JSON.stringify(vixEvidence.levelsNow));
for (const b of vixEvidence.byReading) log("  ", b.name, JSON.stringify(b.rows.map((r) => [r.name.slice(0, 14), r.n, r.med20, r.share20, r.med60, r.share60])));
log("FEAR (unseen):", JSON.stringify(fearEvidence.all.map((r) => [r.name.slice(0, 40), r.n, r.med20, r.share20, r.med60, r.share60])), "· held up:", JSON.stringify(fearEvidence.heldUp.map((r) => [r.name.slice(-22), r.n, r.med20, r.share20, r.med60, r.share60])), "· rally:", JSON.stringify(fearEvidence.rally.map((r) => [r.name, r.n, r.med20, r.share20, r.med60, r.share60])));
log("  by year:", JSON.stringify(fearEvidence.byYear.map((r) => [r.year, r.days, r.gap20, r.gap60])));
log("DEPTH under the 100-day (unseen):", JSON.stringify(depthBands.depth100.map((r) => [r.name, r.n, r.med20, r.share20, r.med60, r.share60])));

/* ================= PASS 2 — written after pass 1 was read, before any line below was run =================
   WHAT PASS 1 SAID (study/ds3/data/ds3.json → candidates):
     · passed both, alone:   e2 (Alan's steps, 10 and 20)  and  f1r (the credit curve re-fitted with a treasury rally no longer taken off it)
     · cost nothing, changed nothing on his dates:   f1, f3
     · the best end result of all, with one of his dates worse:   f2a (a treasury rally as a fear add — December 2025 reads 1.7 heavier)
     · helped his dates and failed the whole period:   every measured VIX part (e1…), the bigger and the measured steps, the steps by place,
       and every form of depth (against version 2's timing — DS2 had set depth against today's rule, where it passed)
   THE COMBINATIONS (fixed here): the two that passed, together; e2 with each form of (f); e2 with depth; (f) alone in pairs.
   THE LEADING VERSION is named after they are run, by the rule in C: only candidates that passed both alone, and only if together they
   still pass both. HOW FIRM (fixed here, DS2's own checks): DS1's three other fits; year by year; 2004 → March 2009; each of the steps'
   thresholds and sizes moved one at a time; the steps counted in full while cash is raised. */
const K = (key, spec) => score(C(key, "combo", key, spec));
const COMBOS = [K("e2 + f1r", { steps: "e2", credit: "f1r" }), K("e2 + f1", { steps: "e2", credit: "f1" }), K("e2 + f3", { steps: "e2", credit: "f3" }), K("e2 + f2a", { steps: "e2", addons: ["tRally"] }), K("e2 + f1 + f2a", { steps: "e2", credit: "f1", addons: ["tRally"] }), K("e2 + f3 + f2a", { steps: "e2", credit: "f3", addons: ["tRally"] }), K("e2 + f1r + f2a", { steps: "e2", credit: "f1r", addons: ["tRally"] }),
  K("f1 + f2a", { credit: "f1", addons: ["tRally"] }), K("f3 + f2a", { credit: "f3", addons: ["tRally"] }), K("f1r + f2a", { credit: "f1r", addons: ["tRally"] }), K("e2 + b100a", { steps: "e2", addons: ["depth100"] }), K("e2 + f2a + b100a", { steps: "e2", addons: ["tRally", "depth100"] })];
log("\nCOMBINATIONS"); for (const c of COMBOS) log(row(c).replace(/^(\S+)\s+/, c.key.padEnd(18) + " "));

/* ADDED AFTER THE FIRST RUN, and marked so wherever it is shown:
     f1x  f1 with its fault taken out. Read day by day, f1 LOWERED the number on many of the days since 2018 on which treasuries had
          rallied — the big flight-to-safety days. There credit's own move is so far down that the credit curve already reads it as a
          washout and adds; f1 dropped the treasury half, the reading came back to "mildly weak", and the add turned into a subtraction.
          The counts are worked out below for both curves (evidence.fear.f1Days): the days it lowered were followed by a higher market
          more often than an ordinary day, not less. That is the opposite of what the rule is for. f1x: when treasuries rallied, the credit part is read both ways and the HIGHER counts — so a
          treasury rally can only ever raise it. */
const F1X = score(C("f1x", "f", "when treasuries rallied, the credit part is the higher of its two readings (never lower than today's)", { credit: "f1x" }, { addedAfterFirstRun: true })); CANDS.push(F1X); log("\nADDED AFTER THE FIRST RUN"); log(row(F1X)); log("   f1x 26 → 30 Mar: on today's rule", JSON.stringify(F1X.stretch.onToday));
for (const c of [K("e2 + f1x", { steps: "e2", credit: "f1x" }), K("e2 + f1x + f2a", { steps: "e2", credit: "f1x", addons: ["tRally"] }), K("e2 + f1x + b100a", { steps: "e2", credit: "f1x", addons: ["depth100"] })]) { c.addedAfterFirstRun = true; COMBOS.push(c); log(row(c).replace(/^(\S+)\s+/, c.key.padEnd(18) + " ")); }
/* what f1 did on the days treasuries had rallied (unseen years, the rule fitted to 2017): the days it lowered, and what followed them */
const f1DaysOf = (which) => { const Z = readingsOf(V2SPEC, which), A = readingsOf({ v2: true, credit: "f1" }, which), Bx = readingsOf({ v2: true, credit: "f1x" }, which), dif = (Q, i) => numOf(Q.r[i]) - numOf(Z.r[i]), g = T.filter((i) => Z.rows[i] && X.ief10[i] > 0), dn = g.filter((i) => dif(A, i) <= -0.05), up = g.filter((i) => dif(A, i) >= 0.05), upx = g.filter((i) => dif(Bx, i) >= 0.05), dnx = g.filter((i) => dif(Bx, i) <= -0.05);
  return { treasuriesUpDays: g.length, days: T.length, f1: { lowered: { ...sumOut(dn), biggest: r1(Math.min(...dn.map((i) => dif(A, i)))) }, raised: sumOut(up) }, f1x: { lowered: dnx.length, raised: { ...sumOut(upx), median: r1(med(upx.map((i) => dif(Bx, i)))), biggest: r1(Math.max(...upx.map((i) => dif(Bx, i)))) } }, any: sumOut(T) }; };
const f1Days = { fittedTo2017: f1DaysOf("17"), everyDay: f1DaysOf("all") };
fearEvidence.f1Days = f1Days; log("  f1 on treasury-up days (unseen):", JSON.stringify(f1Days));

/* ---------- how firm ---------- */
const byKey = (k) => [...CANDS, ...COMBOS].find((c) => c.key === k), VERS = [["today's rule", V1SPEC], ["version 2", V2SPEC], ...["e2", "f1", "f1x", "f1r", "f3", "f2a", "b100a", "e2 + f1x", "e2 + f1", "e2 + f1r", "e2 + f2a", "e2 + f3"].map((k) => [k, byKey(k).spec])];
const firm = { otherFits: {}, earlier: {}, years: [], sensitivity: [] };
for (const [w, label] of [["17", "fitted to 2017, replayed 2018 on (the main test)"], ["15", "fitted to 2015, replayed 2016 on"], ["19", "fitted to 2019, replayed 2020 on"], ["17w", "fitted to 2017 with 2008 left in, replayed 2018 on"]]) { firm.otherFits[w] = { label, rows: VERS.map(([name, spec]) => ({ name, ...payoff(spec, w) })) }; log("\nFIT", label); for (const r of firm.otherFits[w].rows) log("  ", r.name.padEnd(16), "became", String(r.became).padEnd(6), "fall", String(r.worstFall).padEnd(6), "inv", String(r.invested).padEnd(5), "TIMING", String(r.timing).padEnd(6), "afterCost", r.becameAfterCost); }
for (const [k, a, b, label] of [["y0409", "2004-01-02", "2009-03-09", "2 Jan 2004 → 9 Mar 2009 — unseen, and it holds 2008"], ["y0917", "2009-03-10", "2017-12-29", "10 Mar 2009 → end-2017 — the fitted years"]]) { firm.earlier[k] = { label, rows: VERS.map(([name, spec]) => ({ name, ...payoff(spec, "17", idx(a), idx(b)) })), buyAndHold: L.replay(() => 1, idx(a), idx(b)) }; log("\nEARLIER", label, "· buy and hold", JSON.stringify(firm.earlier[k].buyAndHold)); for (const r of firm.earlier[k].rows) log("  ", r.name.padEnd(16), "became", String(r.became).padEnd(6), "fall", String(r.worstFall).padEnd(6), "inv", String(r.invested).padEnd(5)); }
{ const R = Object.fromEntries(VERS.map(([name, spec]) => [name, readingsOf(spec, "17").r])); for (let y = 2018; y <= 2026; y++) { const a = Math.max(A0, L.firstOf(y) - 1), b = L.lastOf(y), rowY = { year: y }; for (const [name] of VERS) rowY[name] = r2((L.replay((i) => (R[name][i] == null ? null : numOf(R[name][i]) / 100), a, b).became - 1) * 100); rowY.buyAndHold = r2((L.replay(() => 1, a, b).became - 1) * 100); firm.years.push(rowY); }
  log("\nYEAR BY YEAR (% in the year)"); for (const r of firm.years) log("  ", r.year, VERS.map(([n]) => n + " " + r[n]).join(" · "), "· b&h", r.buyAndHold); }
for (const [what, params] of [["as built: 20 and 23, +10 and +20, a touch at half", {}], ["levels 19 and 22", { steps: { lo: 19, hi: 22 } }], ["levels 21 and 24", { steps: { lo: 21, hi: 24 } }], ["levels 18 and 21", { steps: { lo: 18, hi: 21 } }], ["levels 22 and 25", { steps: { lo: 22, hi: 25 } }], ["sizes halved (+5 and +10)", { steps: { addLo: 5, addHi: 10 } }], ["sizes +15 and +30", { steps: { addLo: 15, addHi: 30 } }], ["sizes doubled (+20 and +40)", { steps: { addLo: 20, addHi: 40 } }], ["one step only: +20 from 23", { steps: { addLo: 0, addHi: 20 } }], ["one step only: +10 from 20", { steps: { addLo: 10, addHi: 10 } }], ["a touch counts nothing", { steps: { touch: 0 } }], ["a touch counts in full", { steps: { touch: 1 } }], ["the steps counted in full while cash is raised", { stepsOutsideCash: true }]]) { const spec = { v2: true, steps: "e2", params }, P = payoff(spec), Dd = scorecard(spec, "all"), y = through2008(spec); firm.sensitivity.push({ what, params, ...P, y0409: y.became, L25: Dd.L25, L25low: Dd.L25low, L26: Dd.L26, L26low: Dd.L26low, T25: Dd.T25, MOVE: Dd.MOVE }); }
log("\nSENSITIVITY (e2 on version 2)"); for (const r of firm.sensitivity) log("  ", r.what.padEnd(48), "became", String(r.became).padEnd(6), "fall", String(r.worstFall).padEnd(6), "inv", String(r.invested).padEnd(5), "TIMING", String(r.timing).padEnd(6), "afterCost", String(r.becameAfterCost).padEnd(6), "2008", String(r.y0409).padEnd(6), "| L25", r.L25, "(" + r.L25low + ")", "L26", r.L26, "(" + r.L26low + ")", "T25", r.T25, "MOVE", r.MOVE);
/* ================= PASS 3 — THE RECOMMENDED VERSION, written after pass 2 was read =================
   VERSION 3 = version 2 + e2 (Alan's VIX steps) + f1x (a treasury rally can only raise the credit part).
     · e2 passed both bars alone, in all four fits, and its reading earns a vote by DS1's own keep rule.
     · f1x is in for a different reason, and the page says so: it does NOT pass the dates bar as written (it moves none of the three
       scored lines by a point). It is his standing rule; it lifts 23 Feb 2026 and 28 Mar 2025 — two days he named — by the mechanism
       he named; it can never lower the number; and it has to be no worse than version 2 in every one of the four fits to stay in.
     · f1 as first written is NOT in: it lowered the number on the big flight-to-safety days (see f1x above).
     · f1r passed both alone but is NOT in: its gain is 2.5% in the main fit, about nothing in two others and negative in the fourth; it
       swaps the measured credit curve for another; and it moves more.
     · f2a (a treasury rally as a fear add) had the best end result of anything tested, in all four fits, and is NOT in: as measured it is a
       switch, not a gauge — any ten-session rise in treasuries at all, even 0.1%, adds about 25 points of market reading. It is reported
       with its cost and needs a proper shape first. The same is true of the depth add-on (0.5% under the 100-day adds 48).
   It is read below through study/ds3/number.mjs (readingV3), and that sum must equal the grid's "e2 + f1x" on every day. */
const REC_KEY = "e2 + f1x", REC = byKey(REC_KEY).spec, RULES3 = { ...V3.RULES, extPct: extOf("all") }, RULES3_17 = { ...V3.RULES, extPct: extOf("17") };
function seriesV3(which, rules) { const F = fitOf(which), sc = F.M.scale, rs = F.M.parts.find((p) => p.key === "rsi"), cr = F.M.parts.find((p) => p.key === "creditOwn"), own = X.creditOwn;
  const rP = dates.map((_, i) => V3.partPoints(rs, X.rsi[i], sc)), cP = dates.map((_, i) => V3.creditPointsV3(cr, sc, X.creditOwn[i], X.hyg10[i], X.ief10[i], rules)), has = dates.map((_, i) => rP[i] != null && cP[i] != null && V3.vixAdd(X.vixC[i], X.vixH[i], rules) != null), cash = V2.cashSeries({ rsi: X.rsi, spy, qqq, has }, rules).cash;
  return { r: dates.map((_, i) => (has[i] ? V3.readingV3({ base: F.base, rsiPoints: rP[i], creditPoints: cP[i], rsi: X.rsi[i], cash: cash[i], vixClose: X.vixC[i], vixHigh: X.vixH[i] }, rules) : null)), cash, rP, cP, own, add: dates.map((_, i) => V3.vixAdd(X.vixC[i], X.vixH[i], rules)), base: F.base }; }
const S3 = seriesV3("all", RULES3), S3_17 = seriesV3("17", RULES3_17), G3 = readingsOf(REC, "all"), G3_17 = readingsOf(REC, "17"), G2 = readingsOf(V2SPEC, "all"), G1 = readingsOf(V1SPEC, "all"), G2_17 = readingsOf(V2SPEC, "17");
{ let n = 0, w = 0; for (const [a, b] of [[S3.r, G3.r], [S3_17.r, G3_17.r]]) for (let i = 0; i < N; i++) { if ((a[i] == null) !== (b[i] == null)) { n++; continue; } if (a[i] != null) { const g = Math.abs(a[i] - b[i]); if (g > 1e-9) n++; if (g > w) w = g; } } log("\nthe grid's", REC_KEY, "against study/ds3/number.mjs: days that differ", n, "worst", w); if (n) throw new Error("the scorecard's leading version is not the sum in study/ds3/number.mjs"); }
/* with both of version 3's switches off the same function must give version 2 */
{ const off = seriesV3("all", { ...RULES3, vixRule: 0, fearRule: 0 }); let n = 0; for (let i = 0; i < N; i++) if ((off.r[i] == null) !== (G2.r[i] == null) || (off.r[i] != null && Math.abs(off.r[i] - G2.r[i]) > 1e-9)) n++; log("version 3 with both switches off against version 2: days that differ", n); if (n) throw new Error("version 3 with its switches off is not version 2"); }
const recC = byKey(REC_KEY), n1 = (i) => numOf(G1.r[i]), n2 = (i) => numOf(G2.r[i]), n3 = (i) => numOf(S3.r[i]);
const rowAt = (i) => ({ d: dates[i], spy: r2(spy[i]), rsi: r1(X.rsi[i]), vixClose: r2(X.vixC[i]), vixHigh: r2(X.vixH[i]), vixPlace: r1(X.vixPct[i]), hyg10: r2(X.hyg10[i]), ief10: r2(X.ief10[i]), own: r2(X.creditOwn[i]), raisedByRally: G2.rows[i] && G3.rows[i] && G3.rows[i].credit > G2.rows[i].credit + 1e-9 ? 1 : 0, number1: r1(n1(i)), number2: r1(n2(i)), number3: r1(n3(i)), vixAdd: r1((TACT / 100) * S3.add[i] * (S3.cash[i] ? RULES3.cashCut : 1)), creditPts2: r1(G2.rows[i] ? G2.rows[i].creditCounted : null), creditPts3: r1(G3.rows[i] ? G3.rows[i].creditCounted : null), cash: S3.cash[i] ? 1 : 0, d50: r2(X.d50[i]), d100: r2(X.d100[i]) });
const named = [["2025-03-13", "a March 2025 low"], [LOW25, "the late-March 2025 low"], ["2025-04-08", "the April 2025 low"], ["2025-07-21", "21 July 2025"], ["2025-09-22", "22 September 2025"], ["2025-12-11", "mid-December 2025"], [TOP, "SPY's highest close before the fall"], ["2026-02-23", "23 February 2026"], ["2026-03-26", "26 March 2026"], [LOW26, "the March 2026 low"], ["2026-07-29", "29 July 2026"], ["2026-09-16", "16 September 2026"], [dates[LAST], "the last day in the study"]].filter(([d]) => ix[d] != null).map(([d, what]) => ({ what, ...rowAt(ix[d]) }));
/* a stretch under each version: which part moved the number */
const moveOf = (a, b) => { const i = ix[a], j = ix[b], leg = (G, f) => (G.rows[i] && G.rows[j] ? r1((TACT / 100) * (f(G.rows[j]) - f(G.rows[i]))) : null), one = (G) => ({ from: r1(numOf(G.r[i])), to: r1(numOf(G.r[j])), d: r1(numOf(G.r[j]) - numOf(G.r[i])), byRsi: leg(G, (x) => x.rsi), byCredit: leg(G, (x) => x.creditCounted), byVix: leg(G, (x) => x.steps) });
  return { from: a, to: b, spyPct: r2((spy[j] / spy[i] - 1) * 100), hygPct: r2((hygTR[j] / hygTR[i] - 1) * 100), iefPct: r2((bars.IEF.c[j] / bars.IEF.c[i] - 1) * 100), legs: [i, j].map((k) => ({ d: dates[k], hyg10: r2(X.hyg10[k]), ief10: r2(X.ief10[k]), own: r2(X.creditOwn[k]), creditPts2: r1(G2.rows[k] ? G2.rows[k].credit : null), creditPts3: r1(G3.rows[k] ? G3.rows[k].credit : null), vixClose: r2(X.vixC[k]), vixHigh: r2(X.vixH[k]), rsi: r1(X.rsi[k]) })), today: one(G1), version2: one(G2), version3: one(G3), fearOnToday: one(readingsOf({ v2: false, credit: "f1x" }, "all")) }; };
const stretches = { feb23: moveOf("2026-02-20", "2026-02-23"), mar26: moveOf("2026-03-26", "2026-03-30"), mar25: moveOf("2025-03-27", "2025-03-28") };
const wrongWay = (R) => { let n = 0, days = 0; for (let i = ix["2026-02-23"]; i <= ix[LOW26]; i++) { days++; if (L.dayRet[i] < 0 && numOf(R[i]) - numOf(R[i - 1]) <= -0.5) n++; } return { cutOnADownDay: n, sessions: days }; };
const BANDS = [[0, 20], [20, 35], [35, 50], [50, 65], [65, 80], [80, 100.01]], oddsOf = (R) => BANDS.map(([lo, hi]) => { const g = T.filter((i) => R[i] != null && R[i] >= lo && R[i] < hi); return { lo, hi: Math.min(hi, 100), ...sumOut(g) }; });
const odds = { v2: oddsOf(G2_17.r), v3: oddsOf(S3_17.r), any: sumOut(T) };
/* every stretch since 2018 on which the VIX rule added something (stretches a fortnight apart or less are one) */
const vixStretches = (() => { const on = (i) => S3.add[i] != null && S3.add[i] > 0, out = []; let a = -1, last = -1e9; for (let i = A0; i <= LAST; i++) { if (!on(i)) continue; if (i - last > 10) { if (a >= 0) out.push([a, last]); a = i; } last = i; } if (a >= 0) out.push([a, last]);
  return out.map(([a, b]) => { let pk = a, days = 0, full = 0; for (let i = a; i <= b; i++) { if (on(i)) { days++; if (X.vixC[i] >= 23) full++; } if (X.vixC[i] > X.vixC[pk]) pk = i; } const bl = (i, h) => (i + h > LAST ? null : r2((L.blendPath(i, h) - 1) * 100)); return { from: dates[a], to: dates[b], sessions: b - a + 1, daysOn: days, daysAt23: full, peak: r2(X.vixC[pk]), peakOn: dates[pk], after20: bl(a, 20), after60: bl(a, 60), worstAfter: (() => { let m = 0; for (let h = 1; h <= 60 && a + h <= LAST; h++) { const p = L.blendPath(a, h) - 1; if (p < m) m = p; } return r2(m * 100); })(), number2: r1(n2(a)), number3: r1(n3(a)) }; }); })();
const fearDays = (() => { const g = []; for (let i = A0; i <= LAST; i++) if (G2.rows[i] && G3.rows[i] && X.ief10[i] > 0) g.push(i); const moved = g.filter((i) => Math.abs(n3(i) - numOf(readingsOf({ v2: true, steps: "e2" }, "all").r[i])) >= 0.05), by = moved.map((i) => n3(i) - numOf(readingsOf({ v2: true, steps: "e2" }, "all").r[i]));
  return { treasuriesUpDays: g.length, days: LAST - A0 + 1, numberChangedOn: moved.length, raisedOn: by.filter((v) => v > 0).length, loweredOn: by.filter((v) => v < 0).length, medianChange: r1(med(by)), biggestRise: r1(Math.max(...by)), biggestCut: r1(Math.min(...by)), lastYear: moved.filter((i) => i >= YEAR[0]).length }; })();
log("\nRECOMMENDED", REC_KEY, "· rules", JSON.stringify(RULES3)); log("  payoff version 2", JSON.stringify(B2.payoff)); log("  payoff version 3", JSON.stringify(recC.payoff)); log("  dates v2", JSON.stringify(B2.dates)); log("  dates v3", JSON.stringify(recC.dates)); log("  2008 v2", B2.y0409.became, "v3", recC.y0409.became);
log("  wrong-way days 23 Feb → 30 Mar 2026: today", JSON.stringify(wrongWay(G1.r)), "v2", JSON.stringify(wrongWay(G2.r)), "v3", JSON.stringify(wrongWay(S3.r)));
for (const [k, m] of Object.entries(stretches)) log("  STRETCH", k, m.from, "→", m.to, "SPY", m.spyPct + "% HYG", m.hygPct + "% IEF", m.iefPct + "%", "| today", JSON.stringify(m.today), "| v2", JSON.stringify(m.version2), "| v3", JSON.stringify(m.version3), "| legs", JSON.stringify(m.legs));
log("  named:", named.map((x) => x.d.slice(2) + " " + x.number1 + "/" + x.number2 + "/" + x.number3 + " vix " + x.vixClose).join(" | "));
log("  VIX stretches since 2018:", vixStretches.length, "· higher 60 sessions after the first day:", vixStretches.filter((x) => x.after60 > 0).length, "of", vixStretches.filter((x) => x.after60 != null).length, "· median after60", r2(med(vixStretches.map((x) => x.after60))), "· median worst inside 60", r2(med(vixStretches.map((x) => x.worstAfter)))); for (const x of vixStretches) log("    ", x.from, "→", x.to, String(x.sessions).padStart(4), "sessions · peak", x.peak, "· +20:", x.after20, "+60:", x.after60, "worst", x.worstAfter, "| number", x.number2, "→", x.number3);
log("  fear rule:", JSON.stringify(fearDays)); log("  odds v2:", JSON.stringify(odds.v2.map((b) => [b.lo + "-" + b.hi, b.n, b.share20, b.med20, b.share60, b.med60]))); log("  odds v3:", JSON.stringify(odds.v3.map((b) => [b.lo + "-" + b.hi, b.n, b.share20, b.med20, b.share60, b.med60])));
/* the series the page draws */
const s0 = idx("2025-01-02"), series = { d: dates.slice(s0), spy: spy.slice(s0).map(r2), n1: G1.r.slice(s0).map((v) => r1(numOf(v))), n2: G2.r.slice(s0).map((v) => r1(numOf(v))), n3: S3.r.slice(s0).map((v) => r1(numOf(v))), vix: X.vixC.slice(s0).map(r2), vixHi: X.vixH.slice(s0).map(r2), cash: S3.cash.slice(s0).map((v) => (v ? 1 : 0)) };
const lSince = idx("2018-01-02"), long = { d: dates.slice(lSince), spy: spy.slice(lSince).map(r2), n2: G2.r.slice(lSince).map((v) => r1(numOf(v))), n3: S3.r.slice(lSince).map((v) => r1(numOf(v))), vix: X.vixC.slice(lSince).map(r2) };
const cashEpisodes = (() => { const o = []; let a = -1; for (let i = 0; i <= LAST + 1; i++) { const on = i <= LAST && S3.cash[i]; if (on && a < 0) a = i; if (!on && a >= 0) { o.push([dates[a], i > LAST ? null : dates[i - 1]]); a = -1; } } return o; })();
const strip = (c) => ({ key: c.key, family: c.family, name: c.name, addedAfterFirstRun: !!c.addedAfterFirstRun, spec: c.spec, payoff: c.payoff, dates: c.dates, dates17: c.dates17, y0409: c.y0409, bar: c.bar, datesUp: c.datesUp, passWhole: c.passWhole, passDates: c.passDates, verdict: c.verdict, adds: c.adds, today: c.today, at20: c.at20, at23: c.at23, touch20: c.touch20, stretch: c.stretch || null, creditShare: c.creditShare || null });
const marks = { credit: [-3, -2, -1.5, -1, -0.75, -0.5, -0.43, -0.29, -0.14, 0, 0.1, 0.25, 0.5, 1, 2].map((z) => [z, r1(V3.partPoints(fitOf("all").M.parts[1], z, fitOf("all").M.scale))]), fearAddOn: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 3].map((z) => [z, r1(V3.addonPoints(addonOf("all", "tRally"), z))]), depthAddOn: [0, 0.5, 1, 2, 3, 5, 8].map((z) => [z, r1(V3.addonPoints(addonOf("all", "depth100"), z))]), typicalDay: r1(fitOf("all").base) };
const out = { what: "DS3 — the % invested number, round 3: the VIX counted, depth under the 50- and 100-day, fear in treasuries read as fear", labCheck, asOf: dates[LAST], built: new Date().toISOString(), held: HELD, tactical: TACT, cost: COST, todayVix: TODAY_VIX,
  windows: { MAR25, LOW25, MAR26, LOW26, DEC25: [DEC25[0], DEC25.at(-1), DEC25.length], TOP, year: [dates[YEAR[0]], dates[YEAR[1]]], unseen: [dates[A0], dates[LAST]], fitted: [dates[L.F17[0]], dates[L.F17.at(-1)]], y0409: [dates[Y0409[0]], dates[Y0409[1]]], fittedDays: L.F17.length, replayedDays: L.T18.length },
  version1: B1, version2: B2, candidates: CANDS.map(strip), combos: COMBOS.map(strip), measuredSteps: { fittedTo2017: measuredSteps("17"), everyDay: measuredSteps("all") }, evidence: { vix: vixEvidence, fear: fearEvidence, depthBands, partTests }, firm, marks,
  recommended: { key: REC_KEY, rules: RULES3, extFittedTo2017: extOf("17"), before: { payoff: B2.payoff, dates: B2.dates, dates17: B2.dates17, y0409: B2.y0409 }, after: { payoff: recC.payoff, dates: recC.dates, dates17: recC.dates17, y0409: recC.y0409, bar: recC.bar }, today: { payoff: B1.payoff, dates: B1.dates, y0409: B1.y0409 }, named, stretches, wrongWay: { today: wrongWay(G1.r), version2: wrongWay(G2.r), version3: wrongWay(S3.r) }, odds, vixStretches, fearDays },
  now: { date: dates[LAST], number1: r1(n1(LAST)), number2: r1(n2(LAST)), number3: r1(n3(LAST)), cash: !!S3.cash[LAST], vixClose: X.vixC[LAST], vixHigh: X.vixH[LAST] }, cashEpisodes, series, long };
const keep = ["e2", "e2x", "e1", "e1a", "b100a", "f1", "f1x", "f1r", "f2a", "f3", "e2 + f1x", "e2 + f1", "e2 + f1r", "e2 + f2a"], plansAll = { v1: planOf(V1SPEC, "all"), v2: planOf(V2SPEC, "all"), ...Object.fromEntries(keep.map((k) => [k, planOf(byKey(k).spec, "all")])), ...Object.fromEntries(["f1", "f1x", "f1r", "f3", "f2a"].map((k) => [k + "@v1", planOf({ ...byKey(k).spec, v2: false }, "all")])) };
/* the VIX's close and intraday high on SPY's sessions, kept in the repo beside PN1's closes fixture: what the pane's proof feeds the script */
{ const pn1 = J(path.join(ROOT, "tests/fixtures/pn1-closes-20261006.json")); if (pn1.dates.length !== N || pn1.dates.at(-1) !== dates[LAST]) throw new Error("PN1's closes fixture is not on this cache folder's sessions");
  fs.writeFileSync(path.join(ROOT, "tests/fixtures/ds3-vix-20261006.json"), JSON.stringify({ what: "DS3 — the VIX's daily close and intraday high on SPY's sessions, as the deployment study's cache folder held them (the same sessions as pn1-closes-20261006.json)", asOf: dates[LAST], from: dates[0], source: "the chart API's daily bars for the VIX (close and high); the close from the Hub's vix_term table where it has one, as DS1 read it; the high is never under the close", dates, close: bars.VIX.c, high: bars.VIX.c.map((c, i) => (c == null ? null : Math.max(bars.VIX.h[i] ?? c, c))) })); }
const liveOut = { what: "DS3 — version 3 of the market reading (study/ds3/number.mjs is the sum), and every version the study scored as a plan on the every-day fit", asOf: dates[LAST], built: out.built, rules: RULES3, recommended: REC_KEY, cashEpisodes, typicalDay: fitOf("all").base, plans: plansAll };
fs.mkdirSync(path.join(ROOT, "study/ds3/data"), { recursive: true }); fs.writeFileSync(path.join(ROOT, "study/ds3/data/ds3.json"), JSON.stringify(out)); fs.writeFileSync(path.join(ROOT, "study/ds3/data/ds3-live.json"), JSON.stringify(liveOut));
for (const f of ["ds3-pass1.json", "ds3-pass2.json", "ds3-plans-pass1.json"]) { const q = path.join(ROOT, "study/ds3/data", f); if (fs.existsSync(q)) fs.unlinkSync(q); }
console.log(JSON.stringify({ ok: true, asOf: dates[LAST], recommended: REC_KEY, files: ["study/ds3/data/ds3.json", "study/ds3/data/ds3-live.json"].map((f) => [f, fs.statSync(path.join(ROOT, f)).size]) }));
