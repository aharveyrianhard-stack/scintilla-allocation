/* DS3 (8 Oct 2026) — the number, round 3. Pure arithmetic: no fetch, no file, no clock. The study (scripts/ds3-build.mjs), the read of this
   morning (scripts/ds3-live-check.mjs) and the TradingView pane's proof all read the market through this one file and through the two
   under it (study/ds1/engine.mjs, study/ds2/number.mjs), so a candidate measured on 2018–2026 and the same candidate asked "what would
   you have said at 09:05 this morning" are the same sum.

   VERSION 2 (DS2)   market reading = a typical day + the RSI part + the credit part (its subtraction faded out in a washed-out market),
                     held to 0 … 100, halved while cash is raised
                     % invested     = the held part + the tactical part × market reading ÷ 100

   WHAT THIS FILE ADDS — the readings the three families of candidates use, and the one way a candidate is read:
     (e) the VIX            its close and its intraday high as LEVELS (Alan's rule: he buys above 20, both hands above 23; a touch counts,
                            a close strengthens it) and as PLACES in its own year (DS1's two lights, and the two half each)
     (b) depth              how far SPY and QQQ sit under their 50-day and their 100-day (nothing when they are above it)
     (f) treasuries         HYG's own ten-session move and the 7–10 year treasury fund's, kept apart — so a treasury rally can be read as
                            fear instead of being taken off credit */
import * as E from "../ds1/engine.mjs";
import * as V2 from "../ds2/number.mjs";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ---------- the extra readings, for every session of an aligned series ----------
   S and hygTR are what the engine's allReadings takes; X is what it returned (X.creditOwn = hyg10 − RATES_SHARE × ief10, exactly). */
export function extraReadings(S, hygTR, X) {
  const N = S.dates.length, vix = S.bars.VIX, ief = S.bars.IEF, W = E.CREDIT_WINDOW, col = () => new Array(N).fill(null);
  const O = { hyg10: col(), ief10: col(), creditF1: col(), tRally: col(), cVix: col(), vixC: col(), vixH: col(), depth50: col(), depth100: col(), depth: col() };
  for (let i = 0; i < N; i++) {
    if (hygTR && ief && i >= W && hygTR[i] != null && hygTR[i - W] != null && ief.c[i] != null && ief.c[i - W] != null) { const h = (hygTR[i] / hygTR[i - W] - 1) * 100, t = (ief.c[i] / ief.c[i - W] - 1) * 100;
      O.hyg10[i] = h; O.ief10[i] = t;
      O.creditF1[i] = h - E.RATES_SHARE * Math.min(0, t);   // the rates leg counted only when treasuries FELL: a treasury rally takes nothing off credit
      O.tRally[i] = Math.max(0, t); }                       // a treasury rally of its own: how far the 7–10 year fund rose in ten sessions, nothing when it fell
    if (X.vixPct[i] != null && X.vixHiPct[i] != null) O.cVix[i] = (X.vixPct[i] + X.vixHiPct[i]) / 2;   // DS1's composite: the close's place and the intraday high's place, half each
    if (vix && vix.c[i] != null) { O.vixC[i] = vix.c[i]; O.vixH[i] = Math.max(vix.h[i] ?? vix.c[i], vix.c[i]); }
    if (X.d50[i] != null) O.depth50[i] = Math.max(0, -X.d50[i]); if (X.d100[i] != null) O.depth100[i] = Math.max(0, -X.d100[i]);
    if (O.depth50[i] != null && O.depth100[i] != null) O.depth[i] = (O.depth50[i] + O.depth100[i]) / 2; }
  return O; }

/* ---------- (e2) Alan's rule as steps ----------
   T = { lo, hi, addLo, addHi, touch }. A CLOSE at lo or more adds addLo points of market reading; a close at hi or more adds addHi in all.
   A day whose HIGH reached a level its close did not counts that level's step at `touch` (a half). Below lo it is exactly nothing.
   The same function reads places (lo 80, hi 90 with the close's place and the high's place) when the rule is asked by place. */
export const STEPS = { lo: 20, hi: 23, addLo: 10, addHi: 20, touch: 0.5 };
export function vixSteps(close, high, T = STEPS) { if (close == null || !isFinite(close)) return null; const h = Math.max(high == null || !isFinite(high) ? close : high, close), at = (lv) => (close >= lv ? 1 : h >= lv ? T.touch : 0);
  return T.addLo * at(T.lo) + (T.addHi - T.addLo) * at(T.hi); }

/* ---------- a measured part's points, and an add-on's ----------
   part = { key, q, gm20, gp20, gm60, gp60 } and scale as the engine reads them: points = gain × the part's vote. */
export const partPoints = (part, z, scale) => { const v = E.voteOf(part, z, scale); return v ? scale.gain * v.vote : null; };
/* an ADD-ON (DS2's form, DS1's "what a light would add"): the part fitted beside the two that vote, read on the two-part model's gain,
   less what it reads at its own zero — so it is exactly nothing at the zero, and (oneSided) never negative. */
export const addonPoints = (A, z) => { if (z == null || !isFinite(z)) return null; const p = partPoints(A.part, z, A.scale); if (p == null) return null; const d = p - A.zero; return A.oneSided ? Math.max(0, d) + 0 : d; };

/* ---------- ONE CANDIDATE, READ ON ONE EVENING ----------
   plan = { model: { parts, scale }, base, creditKey, creditInput, floorHeld, part, addons: [{ key, part, scale, zero, oneSided }],
            steps: null | { by: "level" | "place", T }, stepsOutsideCash, rules }
   get(key) = that evening's value of a reading (from X or from extraReadings). cash = the raise-cash state after that evening's close.
   Returns null when a counted part has no reading; else { reading, held, rsi, credit, creditCounted, extra, steps, parts: {…} }. */
export function readPlan(plan, get, cash) {
  const sc = plan.model.scale, P = (key) => plan.model.parts.find((p) => p.key === key), rsi = get("rsi"), rP = partPoints(P("rsi"), rsi, sc);
  let cP = partPoints(P(plan.creditKey), get(plan.creditInput), sc); if (rP == null || cP == null) return null;
  /* (f1x) a treasury rally may only ever RAISE the credit part: it is read both ways — with the treasury half taken off, and on HYG's move
     alone — and the higher of the two counts. (creditF1 is credit's own move itself whenever treasuries did not rally.) */
  if (plan.creditBest) { const alone = partPoints(P(plan.creditKey), get("creditF1"), sc); if (alone != null) cP = Math.max(cP, alone); }
  /* (f3) "HYG held": treasuries rallied and HYG, with its payouts, is no lower than ten sessions ago → credit may add but may not subtract */
  const heldUp = get("ief10") != null && get("hyg10") != null && get("ief10") > 0 && get("hyg10") >= 0; if (plan.floorHeld && heldUp) cP = Math.max(0, cP);
  const parts = {}; let extra = 0;
  if (plan.part) { const p = partPoints(P(plan.part), get(plan.part), sc); if (p == null) return null; parts[plan.part] = p; extra += p; }
  for (const A of plan.addons || []) { const p = addonPoints(A, get(A.key)); if (p == null) return null; parts["+" + A.key] = p; extra += p; }
  let steps = 0; if (plan.steps) { const s = plan.steps.by === "place" ? vixSteps(get("vixPct"), get("vixHiPct"), plan.steps.T) : vixSteps(get("vixC"), get("vixH"), plan.steps.T); if (s == null) return null; steps = s; }
  const R = plan.rules, counted = V2.creditCounted(cP, rsi, R), inside = plan.stepsOutsideCash ? 0 : steps, held = clamp(plan.base + rP + counted + extra + inside, 0, 100), on = !!(R.cashRule && cash);
  let reading = on ? held * R.cashCut : held; if (plan.stepsOutsideCash) reading = clamp(reading + steps, 0, 100);
  return { reading, held, rsi: rP, credit: cP, creditCounted: counted, extra, steps, parts, cash: on, heldUp }; }

/* ================= VERSION 3 — the recommended version, as one sum =================
   VERSION 3 changes two things in version 2's market reading and nothing else:

   1 · THE VIX IS COUNTED, BY ALAN'S OWN RULE   (8 Oct: "The VIX rose to 15.73. Shouldn't that tell us to invest a little bit more?" —
       his rule: he buys above 20, both hands above 23; an intraday touch counts, a close strengthens it)
       A close at 20 or more adds 10 points of market reading; a close at 23 or more adds 20 in all. A day whose high reached a level its
       close did not counts that level's step at a half. Under 20 it adds exactly nothing — so at 15.7 it adds nothing.
   2 · A TREASURY RALLY CAN ONLY RAISE THE CREDIT PART, NEVER LOWER IT   (his standing view: a flight to safety is fear, and fear is a buy)
       Credit's own move is HYG's ten-session move less half the treasury fund's, so a treasury rally pulls it down. When treasuries
       rallied over those ten sessions the credit part is now read both ways — on credit's own move as before, and on HYG's move alone —
       and the HIGHER of the two counts. When treasuries fell, nothing changes.
       (Why "the higher" and not simply "HYG's move alone": on the big flight-to-safety days the old reading is so far down that the
       credit curve already reads it as a washout and ADDS. Dropping the treasury half there would take that add away.)

   Every threshold is in RULES; the first ten are version 2's own (the raise-cash distance, extPct, comes from DS2's rule file). */
export const RULES = { ...V2.RULES, vixRule: 1, vixLo: 20, vixHi: 23, vixAddLo: 10, vixAddHi: 20, vixTouch: 0.5, fearRule: 1 };
export const stepsOf = (R = RULES) => ({ lo: R.vixLo, hi: R.vixHi, addLo: R.vixAddLo, addHi: R.vixAddHi, touch: R.vixTouch });
/* what the VIX adds, in points of market reading (before the 0–100 stops and before the raise-cash halving, like every other part) */
export const vixAdd = (close, high, R = RULES) => (R.vixRule ? vixSteps(close, high, stepsOf(R)) : 0);   // switched off it adds nothing and needs no VIX; switched on, a day with no VIX has no reading
/* the credit part's points as version 3 reads them (before version 2's fade): creditPart and scale are the model's; own = credit's own
   move as the engine worked it out (HYG's ten-session move less half the treasury fund's); hyg10 and ief10 = the two moves, in % */
export function creditPointsV3(creditPart, scale, own, hyg10, ief10, R = RULES) { const a = partPoints(creditPart, own, scale); if (a == null || !R.fearRule || hyg10 == null || ief10 == null || !(ief10 > 0)) return a; const b = partPoints(creditPart, hyg10, scale); return b == null ? a : Math.max(a, b); }
/* VERSION 3 OF ONE READING from bare points: creditPoints = creditPointsV3. With vixRule and fearRule off it is version 2's reading;
   with creditRule and cashRule off as well it is version 1's. */
export function readingV3({ base, rsiPoints, creditPoints, rsi, cash, vixClose, vixHigh }, R = RULES) { if (rsiPoints == null || creditPoints == null) return null; const add = vixAdd(vixClose, vixHigh, R); if (add == null) return null;
  return V2.readingV2({ base, rsiPoints, creditPoints, rsi, cash, extra: add }, R); }
/* VERSION 3 OF ONE READING the way the tool holds it: r = what DS1's readSystem returned, model = the model it was read on,
   ctx = { rsi, cash, base, hyg10, ief10, vixClose, vixHigh }. Returns version 2's shape with .v3 = what version 3 did.
   (Not wired into the tool in this round: it is here so the tool and the pane can read one file when it is.) */
export function applyV3(r, model, ctx, R = RULES) { const sc = model.scale, cr = model.parts.find((p) => p.key === "creditOwn"), row = r.parts.find((p) => p.key === "creditOwn"), pts3 = row && !row.missing ? creditPointsV3(cr, sc, row.value, ctx.hyg10, ctx.ief10, R) : null, add = vixAdd(ctx.vixClose, ctx.vixHigh, R);
  if (add == null) return null;   // the VIX is counted and has no price: no reading, as in readingV3
  const parts = r.parts.map((p) => (p.key === "creditOwn" && pts3 != null ? { ...p, points: pts3, v2points: p.points } : p)), out = V2.applyV2({ ...r, parts, lightsCounted: (r.lightsCounted || 0) + add }, ctx, R);
  return { ...out, v3: { vixAdd: add, vixClose: ctx.vixClose ?? null, vixHigh: ctx.vixHigh ?? null, creditPointsV2: row ? row.points : null, creditPointsV3: pts3, treasuryRally: ctx.ief10 != null && ctx.ief10 > 0, raisedByTheRally: pts3 != null && row != null && pts3 > row.points + 1e-9 } }; }
