/* DS2 (7 Oct 2026) — the proof that VERSION 2 of the TradingView script draws the tool's version 2 number. PN1's method, step for step:
   a replay of the script's arithmetic (study/ds2/pane-replay.mjs, reading its numbers out of the .pine file itself) set against the
   tool's own sum (study/ds1/engine.mjs + study/ds2/number.mjs, and study/ds1/live.mjs for today), on the days Alan named, the lows and
   highs the deployment study lists, every day there is, and today.
     node scripts/ds2-prove-pane.mjs               from the closes fixture PN1 keeps in the repo (tests/fixtures/pn1-closes-20261006.json)
     add --no-live to skip today's row (no network at all); add --quiet to print only the summary line
   Reads: that fixture, the model file, the rule file, the script — and, for today's row only, the chart API (GETs, no key), the way the
   tool itself reads it. Writes: study/ds2/data/ds2-pane-proof.json. No table.

   WHAT IS SET AGAINST WHAT
     samePrices            the tool's sum and the script's replay on the same closes — must be the same reading and the same raise-cash days
     tradingViewPayouts    the script fed HYG's payouts the way TradingView adds them back (every earlier price scaled)
     fromTheScriptsOwnText the script's text turned into a program by rule (study/pn1/pine-transliterate.mjs) — a second witness
     bothSwitchesOff       version 2 with its two switches off against version 1's own replay — must be version 1 exactly
     aHairOnAThreshold     the raise-cash rule's three thresholds each nudged a hair: on how many days would the state differ? */
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
import * as E from "../study/ds1/engine.mjs"; import * as V2 from "../study/ds2/number.mjs"; import { numberAt } from "../study/al9/chain.mjs";
import { parsePine2, replay2, labelOf2 } from "../study/ds2/pane-replay.mjs"; import { parsePine, replay as replay1, adjustLikeTradingView } from "../study/pn1/pine-replay.mjs"; import { runFromText2 } from "../study/pn1/pine-transliterate.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), J = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const FIXTURE = path.join(ROOT, "tests/fixtures/pn1-closes-20261006.json"), OUT = path.join(ROOT, "study/ds2/data/ds2-pane-proof.json"), PINE = path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.v2.pine")   /* DS3 (8 Oct): version 2's own file, kept beside version 3 */, PINE1 = path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.v1.pine");
const args = process.argv.slice(2), NO_LIVE = args.includes("--no-live"), QUIET = args.includes("--quiet");
const r1 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(1)), r2 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(2)), r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3));
const pctl = (a, q) => { const s = a.slice().sort((p, r) => p - r); if (!s.length) return null; const k = ((s.length - 1) * q) / 100, lo = Math.floor(k), hi = Math.ceil(k); return s[lo] + (s[hi] - s[lo]) * (k - lo); };
export const codeOf = (src) => src.slice(src.indexOf("\nindicator(") + 1), codeHash = (src) => crypto.createHash("sha256").update(codeOf(src)).digest("hex").slice(0, 16);

/* ---------- the two sides on one set of closes ---------- */
/* the tool's sum: DS1's engine for the two parts, study/ds2/number.mjs for version 2, the chain's own number for % invested */
export function engineV2On(F, model, rules, shape = { heldPct: 70, tacticalPct: 30 }, hygTR = F.hygWithPayouts, seed = false) {
  const bar = (c) => ({ c, h: c, l: c }), bars = {}; for (const s of E.ALL_SYMBOLS) bars[s] = F[s] ? bar(F[s]) : null;
  const X = E.allReadings({ dates: F.dates, bars }, hygTR).X, has = F.dates.map((_, i) => X.rsi[i] != null && X.creditOwn[i] != null), { cash, top } = V2.cashSeries({ rsi: X.rsi, spy: F.SPY, qqq: F.QQQ, has }, rules, seed), base = V2.typicalDay(model);
  return F.dates.map((d, i) => { if (!has[i]) return { date: d, reading: null, invested: null, cash: false }; const r = V2.applyV2(E.readSystem(E.inputsAt(X, i), model), { rsi: X.rsi[i], cash: cash[i], base }, rules);
    return { date: d, reading: r.reading, invested: numberAt(r.reading, shape), cash: !!(rules.cashRule && cash[i]), readingOld: r.v1.reading, investedOld: numberAt(r.v1.reading, shape), rsi: X.rsi[i], creditOwn: X.creditOwn[i], creditFitted: r.v2.creditFitted, creditCounted: r.v2.creditCounted, fade: r.v2.fade, x200: top[i].x200, offSpy: top[i].offSpy, offQqq: top[i].offQqq }; }); }
export const seriesOf = (F, c) => F.dates.map((d, i) => ({ date: d, close: c[i] })).filter((b) => b.close != null);
export function scriptV2On(K, F, hyg, inputs) { for (const [k, want] of [["spy", "splits"], ["qqq", "splits"], ["ief", "splits"], ["hyg", "dividends"]]) if (K.funds[k].adjustment !== want) throw new Error("the script asks for " + k + " with adjustment." + K.funds[k].adjustment + "; this proof feeds it adjustment." + want);
  return replay2(K, { spy: seriesOf(F, F.SPY), qqq: seriesOf(F, F.QQQ), ief: seriesOf(F, F.IEF), hyg: seriesOf(F, hyg) }, F.dates, inputs); }
function gaps(eng, scr, from = 0) { const g = []; let oneSided = 0, cashDiffer = 0; for (let i = from; i < eng.length; i++) { if (eng[i].reading == null && scr[i].reading == null) continue; if (eng[i].reading == null || scr[i].reading == null) { oneSided++; continue; } if (!!eng[i].cash !== !!scr[i].cashOn) cashDiffer++; g.push({ date: eng[i].date, gap: Math.abs(eng[i].reading - scr[i].reading) }); }
  const v = g.map((x) => x.gap), worst = g.reduce((a, b) => (b.gap > a.gap ? b : a), { gap: -1 });
  return { days: g.length, oneSided, raiseCashDaysThatDiffer: cashDiffer, worst: r2(worst.gap), worstOn: worst.date, median: r3(pctl(v, 50)), p99: r2(pctl(v, 99)), shareWithin1: r2((100 * v.filter((x) => x <= 1.0000001).length) / v.length), over1: g.filter((x) => x.gap > 1.0000001).length }; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const say = (...a) => { if (!QUIET) console.log(...a); };
  const F = J(FIXTURE), base = J(path.join(ROOT, "study/ds1/data/ds1-live.json")), study = J(path.join(ROOT, "study/ds1/data/ds1.json")), ds2 = J(path.join(ROOT, "study/ds2/data/ds2.json")), rulesFile = J(path.join(ROOT, "study/ds2/data/ds2-live.json")), R = rulesFile.rules, model = base.model, SRC = fs.readFileSync(PINE, "utf8"), K = parsePine2(SRC);
  const ix = Object.fromEntries(F.dates.map((d, i) => [d, i])), LAST = F.dates.length - 1;
  /* the script carries the rule file's thresholds */
  for (const [k, v] of [["FADE_FROM", R.fadeFrom], ["FADE_TO", R.fadeTo], ["HIGH_DAYS", R.highDays], ["AVG_DAYS", R.avgDays], ["NEAR_PCT", R.nearPct], ["EXT_PCT", R.extPct], ["RESET_RSI", R.resetRsi], ["CASH_CUT", R.cashCut]]) if (K[k] !== v) throw new Error("the script's " + k + " is " + K[k] + "; the rule file says " + v);
  const eng = engineV2On(F, model, R), tvHyg = adjustLikeTradingView(F.dates, F.HYG, F.payouts), same = scriptV2On(K, F, F.hygWithPayouts), tv = scriptV2On(K, F, tvHyg);
  /* the study's own stored numbers must be what the tool's sum gives on this fixture, or the fixture is not the study's data */
  for (const n of ds2.recommended.named) { const e = eng[ix[n.d]]; if (Math.abs(e.reading - n.reading2) > 0.1000001 || Math.abs(e.readingOld - n.reading) > 0.1000001) throw new Error("on " + n.d + " the tool's sum gives " + e.reading + " (version 1 " + e.readingOld + ") on this fixture; the study stored " + n.reading2 + " (" + n.reading + ")"); }
  for (const e of [...study.extremes.bottoms, ...study.extremes.tops]) if (eng[ix[e.date]].readingOld !== e.reading) throw new Error("on " + e.date + " version 1 reads " + eng[ix[e.date]].readingOld + " here; the deployment study stored " + e.reading);

  /* ---------- the named days: Alan's, then the lows and highs the deployment study lists ---------- */
  const rowOf = (d, kind) => { const i = ix[d], e = eng[i], a = same[i], b = tv[i]; return { date: d, kind, engine: { reading: e.reading, invested: r2(e.invested), cash: e.cash, version1: { reading: e.readingOld, invested: r2(e.investedOld) }, rsi: r2(e.rsi), creditOwn: r3(e.creditOwn), creditCounted: r1(e.creditCounted), fade: r2(e.fade) },
    script: { reading: a.reading, invested: r2(a.invested), cash: a.cashOn, version1: { reading: a.readingOld, invested: r2(a.investedOld) }, rsi: r2(a.rsiBoth), creditOwn: r3(a.creditOwn), creditCounted: r1(a.ptsCredit), label: labelOf2(a) },
    scriptTradingViewPayouts: { reading: b.reading, invested: r2(b.invested), cash: b.cashOn, creditOwn: r3(b.creditOwn) }, gap: r1(Math.abs(e.reading - a.reading)), gapTradingViewPayouts: r1(Math.abs(e.reading - b.reading)), gapInvested: r2(Math.abs(e.invested - a.invested)), gapInvestedTradingViewPayouts: r2(Math.abs(e.invested - b.invested)), sameRaiseCashState: e.cash === a.cashOn && e.cash === b.cashOn }; };
  const alan = ds2.recommended.named.map((n) => rowOf(n.d, n.what)), listed = [...study.extremes.bottoms.map((b) => ({ ...b, kind: "a low the deployment study lists" })), ...study.extremes.tops.map((b) => ({ ...b, kind: "a high the deployment study lists" }))].filter((e) => !alan.some((a) => a.date === e.date)).map((e) => rowOf(e.date, e.kind)).sort((x, y) => (x.date < y.date ? -1 : 1)), rows = [...alan, ...listed];

  /* ---------- every day there is ---------- */
  const first = F.dates[eng.findIndex((e) => e.reading != null)], history = { from: first, to: F.asOf, samePrices: gaps(eng, same), tradingViewPayouts: gaps(eng, tv), lastYear: { samePrices: gaps(eng, same, LAST - 251), tradingViewPayouts: gaps(eng, tv, LAST - 251) }, firstScriptReading: F.dates[same.findIndex((r) => r.reading != null)], raiseCashDays: { engine: eng.filter((e) => e.cash).length, script: same.filter((r) => r.cashOn).length } };
  { let w = 0; for (let i = 0; i <= LAST; i++) if (eng[i].invested != null && same[i].invested != null) w = Math.max(w, Math.abs(eng[i].invested - same[i].invested)); history.investedWorst = r2(w); }
  /* the second witness: the script's own text, translated by rule and run */
  { const funds = { spy: seriesOf(F, F.SPY), qqq: seriesOf(F, F.QQQ), ief: seriesOf(F, F.IEF), hyg: seriesOf(F, F.hygWithPayouts) }, mech = runFromText2(SRC, funds, F.dates, { heldPct: K.heldPct, tacticalPct: K.tacticalPct, creditRule: true, cashRule: true }); let n = 0, wHand = 0, wEng = 0, oneSided = 0, cashDiffer = 0, wOld = 0;
    for (let i = 0; i <= LAST; i++) { const has = !(mech[i].reading == null || Number.isNaN(mech[i].reading)); if (has !== (same[i].reading != null)) { oneSided++; continue; } if (!has) continue; n++; wHand = Math.max(wHand, Math.abs(mech[i].reading - same[i].reading)); wEng = Math.max(wEng, Math.abs(mech[i].reading - eng[i].reading)); wOld = Math.max(wOld, Math.abs(mech[i].readingOld - same[i].readingOld)); if (!!mech[i].cashOn !== !!same[i].cashOn) cashDiffer++; }
    history.fromTheScriptsOwnText = { days: n, oneSided, raiseCashDaysThatDiffer: cashDiffer, worstAgainstTheHandWrittenReplay: r2(wHand), worstAgainstTheToolsSum: r2(wEng), worstVersion1Line: r2(wOld) }; if (oneSided || cashDiffer || wHand > 1e-9) throw new Error("the script's own text and its hand-written replay disagree: " + JSON.stringify(history.fromTheScriptsOwnText)); }
  /* both switches off: version 2 is version 1 — against version 1's own script, replayed by PN1's replay */
  { const K1 = parsePine(fs.readFileSync(PINE1, "utf8")), v1 = replay1(K1, { spy: seriesOf(F, F.SPY), qqq: seriesOf(F, F.QQQ), ief: seriesOf(F, F.IEF), hyg: seriesOf(F, F.hygWithPayouts) }, F.dates), off = scriptV2On(K, F, F.hygWithPayouts, { creditRule: false, cashRule: false }); let n = 0, w = 0, wOld = 0;
    for (let i = 0; i <= LAST; i++) { if ((v1[i].reading == null) !== (off[i].reading == null)) throw new Error("on " + F.dates[i] + " one of version 1 and version 2-with-both-switches-off has a reading and the other has not"); if (v1[i].reading == null) continue; n++; w = Math.max(w, Math.abs(v1[i].reading - off[i].reading)); wOld = Math.max(wOld, Math.abs(v1[i].reading - same[i].readingOld)); }
    history.bothSwitchesOff = { days: n, worstAgainstVersion1: r2(w), worstOfTheThinLineAgainstVersion1: r2(wOld) }; if (w > 1e-9 || wOld > 1e-9) throw new Error("with both switches off the script is not version 1: " + JSON.stringify(history.bothSwitchesOff)); }
  /* a hair on a threshold: TradingView's closes can sit a cent from the Hub's, and the raise-cash rule remembers. Each of its thresholds is
     nudged a hair both ways; the days on which the state would differ are counted, and the longest run of such days. */
  { const nudges = [["within 2% of the high", "nearPct", 0.02], ["11.21% above the long average", "extPct", 0.02], ["an RSI of 40", "resetRsi", 0.1]], out = [];
    for (const [what, key, by] of nudges) for (const sgn of [-1, 1]) { const alt = engineV2On(F, model, { ...R, [key]: R[key] + sgn * by }); let n = 0, run = 0, worstRun = 0, lastYear = 0; for (let i = 0; i <= LAST; i++) { if (eng[i].reading == null) continue; if (alt[i].cash !== eng[i].cash) { n++; run++; worstRun = Math.max(worstRun, run); if (i > LAST - 252) lastYear++; } else run = 0; } out.push({ what, movedTo: +(R[key] + sgn * by).toFixed(2), daysTheStateDiffers: n, longestRun: worstRun, inTheLastYear: lastYear }); }
    history.aHairOnAThreshold = { of: history.samePrices.days, nudges: out, worst: out.reduce((a, b) => (b.daysTheStateDiffers > a.daysTheStateDiffers ? b : a)) }; }

  /* ---------- today: the tool's own live read, and the script on the very same prices ---------- */
  let today = null;
  if (!NO_LIVE) { try { const L = await import("../study/ds1/live.mjs");
    const API = "https://scintilla-massive-chart-api.fly.dev", getApi = async (p) => { const r = await fetch(API + p, { headers: { Origin: "https://scintillahub.ai" }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(p.split("?")[0] + " " + r.status); return r.json(); };
    const now = L.nyParts(), candles = await L.fetchDaily(getApi), live = await L.fetchLive(getApi), baseV2 = { ...base, v2: rulesFile }, A = L.baseline(baseV2), v = L.view({ base: baseV2, candles, ...live, A });
    const S = L.withLive(L.alignBars(candles), live.quotes, live.macro, L.sessionRanges(live.intraday, live.quotes?.SPY?.price_session_et)).S, G = { dates: S.dates, SPY: S.bars.SPY.c, QQQ: S.bars.QQQ.c, IEF: S.bars.IEF.c, HYG: S.bars.HYG.c };
    /* the pane has the whole history; so the script is run on the fixture's closes to 6 Oct with the tool's live bars after them */
    const extra = S.dates.map((d, i) => [d, i]).filter(([d]) => d > F.asOf), long = { dates: F.dates.concat(extra.map(([d]) => d)), SPY: F.SPY.concat(extra.map(([, i]) => G.SPY[i])), QQQ: F.QQQ.concat(extra.map(([, i]) => G.QQQ[i])), IEF: F.IEF.concat(extra.map(([, i]) => G.IEF[i])), HYG: F.HYG.concat(extra.map(([, i]) => G.HYG[i])) };
    const pay = F.payouts.concat((base.hygPayouts || []).filter((p) => p[0] > F.payouts.at(-1)[0])), chainLong = L.hygWithPayouts(long.dates, long.HYG, pay).tr, a = scriptV2On(K, long, chainLong).at(-1), b = scriptV2On(K, long, adjustLikeTradingView(long.dates, long.HYG, pay)).at(-1);
    today = { readAt: now.date + " " + now.hms + " New York", phase: L.phaseOf(now), session: v.session, live: v.live, lastSettledBar: v.lastBar, prices: { SPY: G.SPY.at(-1), QQQ: G.QQQ.at(-1), HYG: G.HYG.at(-1), IEF: G.IEF.at(-1) },
      engine: { reading: v.reading.reading, invested: r2(numberAt(v.reading.reading, A)), cash: !!(v.v2 && v.v2.cash), cashSince: v.v2 ? v.v2.since : null, version1: v.reading.v1 ? { reading: v.reading.v1.reading, invested: r2(numberAt(v.reading.v1.reading, A)) } : null, rsi: r2(v.inputs.rsi), creditOwn: r3(v.inputs.creditOwn), toolsWindowBars: S.dates.length },
      script: { reading: a.reading, invested: r2(a.invested), cash: a.cashOn, version1: { reading: a.readingOld, invested: r2(a.investedOld) }, rsi: r2(a.rsiBoth), creditOwn: r3(a.creditOwn), label: labelOf2(a), bars: long.dates.length },
      scriptTradingViewPayouts: { reading: b.reading, invested: r2(b.invested), cash: b.cashOn }, gap: r1(Math.abs(v.reading.reading - a.reading)), gapTradingViewPayouts: r1(Math.abs(v.reading.reading - b.reading)), sameRaiseCashState: !!(v.v2 && v.v2.cash) === a.cashOn };
  } catch (e) { today = { failed: String((e && e.message) || e) }; } }
  const before = fs.existsSync(OUT) ? J(OUT) : null; if ((NO_LIVE || !(today && today.engine)) && before && before.today && before.today.engine) today = before.today;   /* a run without the network keeps the last live row it has, with its own time on it */

  const worstNamed = Math.max(...rows.map((r) => r.gap), today && today.gap != null ? today.gap : 0), worstNamedTv = Math.max(...rows.map((r) => r.gapTradingViewPayouts), today && today.gapTradingViewPayouts != null ? today.gapTradingViewPayouts : 0), statesAgree = rows.every((r) => r.sameRaiseCashState) && (!today || !today.engine || today.sameRaiseCashState);
  const proof = { what: "DS2 — version 2 of the deployment pane's script against the allocation tool's version 2 sum", built: new Date().toISOString(), script: { file: path.relative(ROOT, PINE), codeHash: codeHash(SRC), bytes: SRC.length, typicalDay: K.TYPICAL_DAY, held: K.heldPct, tactical: K.tacticalPct, funds: K.funds, rules: { FADE_FROM: K.FADE_FROM, FADE_TO: K.FADE_TO, HIGH_DAYS: K.HIGH_DAYS, AVG_DAYS: K.AVG_DAYS, NEAR_PCT: K.NEAR_PCT, EXT_PCT: K.EXT_PCT, RESET_RSI: K.RESET_RSI, CASH_CUT: K.CASH_CUT } },
    fixture: { file: path.relative(ROOT, FIXTURE), sessions: F.dates.length, from: F.from, to: F.asOf }, tolerance: 1, rows, today, namedDays: rows.length + (today && today.engine ? 1 : 0), worstNamed: { samePrices: worstNamed, tradingViewPayouts: worstNamedTv }, allWithinOnePoint: worstNamed <= 1 && worstNamedTv <= 1 && statesAgree, history };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(proof, null, 1));
  const pad = (s, n) => String(s).padStart(n), line = (r, d = r.date) => `${d}  ${pad(r.engine.reading, 6)} ${pad(r.script.reading, 7)} ${pad(r.gap, 5)}   ${pad(r.scriptTradingViewPayouts.reading, 7)} ${pad(r.gapTradingViewPayouts, 5)}   ${pad(r.engine.invested, 7)} ${pad(r.script.invested, 7)}  v1 ${pad(r.engine.version1 ? r.engine.version1.invested : "-", 6)}  ${r.script.label}`;
  say("\nday          tool   script   gap   TV-payouts gap    invested: tool  script  version 1   the label the pane shows");
  for (const r of rows) say(line(r), "·", r.kind); if (today && today.engine) say(line(today, today.session), "· today,", today.readAt, today.phase, today.live ? "(live prices)" : "(settled)", "· cash since", today.engine.cashSince); else say("today: not read —", today && today.failed);
  say("\nevery day", history.from, "→", history.to, "\n  the tool's own prices:", JSON.stringify(history.samePrices), "\n  HYG's payouts TradingView's way:", JSON.stringify(history.tradingViewPayouts), "\n  the last year:", JSON.stringify(history.lastYear.tradingViewPayouts), "\n  raise-cash days:", JSON.stringify(history.raiseCashDays), "· % invested, worst gap", history.investedWorst,
    "\n  the script's own text:", JSON.stringify(history.fromTheScriptsOwnText), "\n  both switches off:", JSON.stringify(history.bothSwitchesOff), "\n  a hair on a threshold:", JSON.stringify(history.aHairOnAThreshold.nudges));
  console.log(JSON.stringify({ ok: proof.allWithinOnePoint, namedDays: proof.namedDays, worstNamed: proof.worstNamed, today: today && today.engine ? { session: today.session, tool: today.engine.reading, script: today.script.reading, cash: today.engine.cash } : (today && today.failed) || null, wrote: path.relative(ROOT, OUT) }));
  process.exit(proof.allWithinOnePoint ? 0 : 1); }
