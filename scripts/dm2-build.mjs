/* DM2 (7 Oct 2026) — the deployment matrix, version 2, measured. Writes study/dm2/data/dm2.json (the study page's data) and
   study/dm2/data/dm2-live.json (the compact model the live line in index.html reads). Nothing else is written; no key is read.
     node scripts/dm2-build.mjs <cacheDir> [<hm1.json>]
     cacheDir   the folder scripts/dm2-pull.mjs filled, plus data/hyg_adjusted_fmp.json (DM1's keyed read) and data/geiger-series-gh1.json
     hm1.json   the heat-at-the-bottoms replay (today's ladder and the repaired heat, evening by evening) — default <cacheDir>/hm1.json
   Every evening from 2 Jan 2008 to the last close on SPY's sessions; returns on closes (no SPY payouts), cash earns the 3-month bill.

   THE KEEP RULE (set before the numbers were read; it is DM1's own materiality bar for the 10-year, applied out of sample):
     a factor's curve is fitted on the evenings whose 60-session outcome was known by the end of 2017, then read on every evening
     2018 → 2026. Those evenings are sorted by the factor's vote; the third it voted for most is compared with the third it voted against
     most, on the part the matrix (and the factors already kept) had not explained. The factor is kept when that gap is at least
     1 point of median 60-session return AND 3 points of share higher, AND it pointed the right way in more than half of the years in
     which it voted both ways. Factors are added one at a time, best first, each tested on top of the ones already kept. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import * as L from "./dm2-lib.mjs";
import { deploy2, placeOf, voteOf, edgeOf, pctFromEdge, lineOf, money, LADDER, RUNG_PCTL, THIN, NAME, SAY } from "../study/dm2/engine.mjs";
const { J, r1, r2, r3, r4, med, mean, sd, pctl, share, rsi14, sma, yearPct, loadSeries, GRID, BW, FGRID, buildSheet, fitModel, fitModelV1, readAt, readAtV1, inputsAt, readSheet } = L;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const OUT = path.join(ROOT, "study/dm2/data"); fs.mkdirSync(OUT, { recursive: true });
const CACHE = process.argv[2]; if (!CACHE || !fs.existsSync(path.join(CACHE, "SPY_D.json"))) { console.error("usage: node scripts/dm2-build.mjs <cacheDir> [hm1.json]"); process.exit(2); }
const HM1 = process.argv[3] || path.join(CACHE, "hm1.json"); const log = (...a) => console.error(...a);

/* ---------- the series and the readings ---------- */
const S = loadSeries(CACHE); const { dates, close, N, ix } = S; const LAST = N - 1;
if (!S.geigerCalendarMatches) throw new Error("the Geiger series is not on SPY's sessions");
const rsi = rsi14(close), s200 = sma(close, 200), s100 = sma(close, 100), q100 = sma(S.qqq, 100), vixPct = yearPct(S.vix), hygA200 = sma(S.hygA, 200), hygP200 = sma(S.hygP, 200);
const trend = s200.map((v, i) => (v == null || s200[i - 21] == null ? null : (v / s200[i - 21] - 1) * 100)), rising = trend.map((v) => (v == null ? null : v > 0));
const credit = S.hygA.map((v, i) => (v == null || hygA200[i] == null ? null : (v / hygA200[i] - 1) * 100)), creditAbove = credit.map((v) => (v == null ? null : v > 0));
const gPS = yearPct(S.gSpy), gPQ = yearPct(S.gQqq), geiger = gPS.map((v, i) => (v == null || gPQ[i] == null ? null : (v + gPQ[i]) / 2));
const dS = close.map((c, i) => (s100[i] == null ? null : (c / s100[i] - 1) * 100)), dQ = S.qqq.map((c, i) => (c == null || q100[i] == null ? null : (c / q100[i] - 1) * 100));
const break100 = dS.map((v, i) => (v == null || dQ[i] == null ? null : Math.min(v, dQ[i])));
const tltRsi = rsi14(S.tlt), gldRsi = rsi14(S.gld), bondsX = yearPct(tltRsi), goldX = yearPct(gldRsi);
const fwd = (n) => close.map((c, i) => (i + n < N ? close[i + n] / c - 1 : null)); const r20 = fwd(20), r60 = fwd(60), r120 = fwd(120);
const dipN = (n) => close.map((c, i) => { if (i + n >= N) return null; let m = c; for (let k = i + 1; k <= i + n; k++) m = Math.min(m, close[k]); return m / c - 1; }); const dip60 = dipN(60), dip120 = dipN(120);
const FROM = ix["2008-01-02"], cut = ix["2018-01-02"], REP_FROM = ix["2007-01-03"];
const ev = []; for (let i = FROM; i <= LAST; i++) if (rsi[i] != null && vixPct[i] != null) ev.push(i);
const evOut = ev.filter((i) => r60[i] != null), oosIdx = evOut.filter((i) => i >= cut);
/* THE DESIGN IS NOT BUILT AROUND 2008 (Alan, 7 Oct: "a really black swan … I'm not sure I'd design around it, but consider it"): version 2 is
   fitted on the evenings from the day after the 9 Mar 2009 closing low, and 2008 is then replayed as a stress test it never saw.
   DM2_FIT_FROM=2008-01-02 fits it with 2008 in (the comparison file dm2-with2008.json). Version 1 keeps its own fit, 2008 included. */
const FIT_FROM = process.env.DM2_FIT_FROM || "2009-03-10", WITH2008 = FIT_FROM < "2009-01-01", fitFromI = dates.findIndex((d) => d >= FIT_FROM);
const evFit = evOut.filter((i) => i >= fitFromI), fitIdx = evFit.filter((i) => i < cut - 60), fitIdxV1 = evOut.filter((i) => i < cut - 60);
const X = { rsi, fear: vixPct, r60, dip60, rising, creditAbove, vals: { trend, credit, geiger, break100, vixLevel: S.vix, bondsX, goldX } };
const CAND = [
  { key: "trend", name: "The 200-day's direction, as a slope", what: "SPY's 200-day average, % change over 21 sessions (version 1 read it as rising / falling)", unit: "% a month", band: 1, bandWords: "1 point of slope" },
  { key: "credit", name: "Credit as a distance", what: "HYG with its payouts added back, % above or under its own 200-day (version 1 read it as above / under)", unit: "% from its 200-day", band: 1, bandWords: "1% of distance" },
  { key: "geiger", name: "The index Geigers", what: "the Hub's seven-rung Geiger for SPY and for QQQ, each placed in its own past year, the two averaged", unit: "percentile of its year", band: 20, bandWords: "20 places of its year" },
  { key: "break100", name: "A 100-day break", what: "the nearer-to-broken of SPY and QQQ against its own 100-day average, % above or under", unit: "% from the 100-day", band: 2, bandWords: "2% of distance" },
  { key: "vixLevel", name: "The VIX at a long-run extreme", what: "the VIX itself, in points, against every evening since 2008 (the matrix already reads its place in its own year)", unit: "VIX points", band: 5, bandWords: "5 VIX points" },
  { key: "bondsX", name: "Long bonds at an extreme", what: "TLT's 14-day RSI placed in its own past year — near 100 is a rush into bonds, near 0 is bonds being dumped", unit: "percentile of its year", band: 20, bandWords: "20 places of its year" },
  { key: "goldX", name: "Gold at an extreme", what: "GLD's 14-day RSI placed in its own past year — near 100 is a rush into gold", unit: "percentile of its year", band: 20, bandWords: "20 places of its year" } ];
log("evenings", ev.length, "with outcome", evOut.length, "| fitted to 2017:", fitIdx.length, dates[fitIdx[0]], "→", dates[fitIdx.at(-1)], "| replayed:", oosIdx.length, dates[oosIdx[0]], "→", dates[oosIdx.at(-1)]);

const mkSheet = (idx) => buildSheet(idx, { rsi, fear: vixPct, fields: { med60: r60, dip60 }, shares: { share60: r60 } }, "every evening");
const sheetAll = mkSheet(evFit), sheetFit = mkSheet(fitIdx);
const fitIn = (keys) => fitModel(evFit, keys, X, { sheet: sheetAll }), fitTo2017 = (keys) => fitModel(fitIdx, keys, X, { sheet: sheetFit });
const curveEdge = (f, B) => f.gm.map((v, q) => v / B.sdMed60 + f.gp[q] / B.sdShare60);
const corr = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let k = 0; k < x.length; k++) { sxy += (x[k] - mx) * (y[k] - my); sxx += (x[k] - mx) ** 2; syy += (y[k] - my) ** 2; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; };
const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(a.length); o.forEach(([, i], k) => (r[i] = k)); return r; };

/* ---------- 1 · each factor's added edge out of sample ---------- */
const SPLITS = {};   // the fit ends with the outcomes known by the end of that year; the replay starts the next January. other = the other design (2008 in ↔ out)
const splitOf = (y, other = false) => (SPLITS[y + (other ? "o" : "")] ??= (() => { const c = dates.findIndex((d) => d >= (y + 1) + "-01-01"), pool = other ? (WITH2008 ? evOut.filter((i) => i >= dates.findIndex((d) => d >= "2009-03-10")) : evOut) : evFit, fit = pool.filter((i) => i < c - 60); return { cut: c, fit, oos: evOut.filter((i) => i >= c), sheet: mkSheet(fit) }; })());
function testFactor(k, K, year = 2017, other = false) {
  const SP = splitOf(year, other), mdl = fitModel(SP.fit, [...K, k], X, { sheet: SP.sheet }), B = mdl.baseline, fk = mdl.factors.find((f) => f.key === k), others = mdl.factors.filter((f) => f.key !== k);
  const rows = []; for (const i of SP.oos) { const mr = L.matrixRead(mdl, rsi[i], vixPct[i]); if (!mr) continue;
    let bm = mr.m, bp = mr.p; for (const f of others) { const v = voteOf(f, X.vals[f.key][i], B); if (v) { bm += v.lambda * v.gm; bp += v.lambda * v.gp; } }
    const v = voteOf(fk, X.vals[k][i], B); if (!v) continue; rows.push({ y: dates[i].slice(0, 4), vote: v.add, resM: r60[i] - bm, resP: (r60[i] > 0 ? 1 : 0) - bp, raw: r60[i] }); }
  rows.sort((a, b) => a.vote - b.vote); const third = Math.floor(rows.length / 3), bot = rows.slice(0, third), top = rows.slice(rows.length - third);
  const gapM = med(top.map((r) => r.resM)) - med(bot.map((r) => r.resM)), gapP = mean(top.map((r) => r.resP)) - mean(bot.map((r) => r.resP));
  let right = 0, counted = 0; const byYear = []; for (const y of [...new Set(rows.map((r) => r.y))].sort()) { const t = top.filter((r) => r.y === y), b = bot.filter((r) => r.y === y); if (t.length < 10 || b.length < 10) { byYear.push({ year: y, voted: false }); continue; }
    const g = (med(t.map((r) => r.resM)) - med(b.map((r) => r.resM))) / B.sdMed60 + (mean(t.map((r) => r.resP)) - mean(b.map((r) => r.resP))) / B.sdShare60; counted++; if (g > 0) right++; byYear.push({ year: y, voted: true, right: g > 0 }); }
  const xs = rows.map((r) => r.vote), ys = rows.map((r) => r.resM / B.sdMed60 + r.resP / B.sdShare60), mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0; for (let q = 0; q < xs.length; q++) { sxy += (xs[q] - mx) * (ys[q] - my); sxx += (xs[q] - mx) ** 2; }
  return { key: k, onTopOf: K.slice(), fittedTo: year, evenings: rows.length, gapMed60: r4(gapM), gapShare60: r4(gapP), score: r3(gapM / B.sdMed60 + gapP / B.sdShare60), yearsRight: right, yearsVoted: counted, byYear, slope: r3(sxy / sxx),
    votedFor: { med60: r4(med(top.map((r) => r.raw))), share60: r4(share(top.map((r) => r.raw))), n: top.length }, votedAgainst: { med60: r4(med(bot.map((r) => r.raw))), share60: r4(share(bot.map((r) => r.raw))), n: bot.length },
    passes: gapM >= 0.01 && gapP >= 0.03 && right * 2 > counted, failsOn: [gapM >= 0.01 ? null : "under 1 point of median return", gapP >= 0.03 ? null : "under 3 points of share higher", right * 2 > counted ? null : "right in half the years or fewer"].filter(Boolean) }; }
const KEPT = [], rounds = []; { let pool = CAND.map((c) => c.key); while (pool.length) { const tests = pool.map((k) => testFactor(k, KEPT)); rounds.push({ onTopOf: KEPT.slice(), tests }); const ok = tests.filter((t) => t.passes).sort((a, b) => b.score - a.score); if (!ok.length) break; KEPT.push(ok[0].key); pool = pool.filter((k) => k !== ok[0].key); } }
/* THE SECOND HALF OF THE KEEP RULE — robustness. The first half is the brief's own test (fit to 2017, replay 2018 → 2026). A factor that
   passed it is then read in three other fits: the fit ending two years earlier (2015, replayed 2016 → 2026), two years later (2019,
   replayed 2020 → 2026), and the other design (2008 left in the fit when the design leaves it out, and the reverse).
   It STAYS only if it never points the wrong way in any of them: its median gap above zero and right in more than half the years.
   (Written down in two steps, and the page says so: the first version asked for the full bar in the 2015 and 2019 fits; by that
   strictest reading NO factor earns its place — reported as such in "standards" below. A factor whose direction never fails stays.) */
const dirOK = (t) => t.gapMed60 > 0 && t.yearsRight * 2 > t.yearsVoted;
const fits = (k, K) => ({ 2015: testFactor(k, K, 2015), 2017: testFactor(k, K, 2017), 2019: testFactor(k, K, 2019), otherDesign: testFactor(k, K, 2017, true) });
const robustness = {}; { let changed = true; while (changed) { changed = false; for (const k of KEPT.slice()) { const t = fits(k, KEPT.filter((x) => x !== k)); robustness[k] = t; if (!dirOK(t[2015]) || !dirOK(t[2019]) || !dirOK(t.otherDesign)) { KEPT.splice(KEPT.indexOf(k), 1); changed = true; break; } } } }
for (const c of CAND) if (!KEPT.includes(c.key)) robustness[c.key] = fits(c.key, KEPT);
const PASSED_FIRST = rounds.flatMap((r) => r.tests.filter((t) => t.passes).map((t) => t.key)).filter((k, i, a) => a.indexOf(k) === i);
const standards = { briefTestOnly: PASSED_FIRST.slice(), neverTheWrongWay: KEPT.slice(), fullBarInEveryFit: PASSED_FIRST.filter((k) => robustness[k][2015].passes && robustness[k][2019].passes && robustness[k].otherDesign.passes) };
const KEPT_ORDER = KEPT.slice(); KEPT.sort((a, b) => CAND.findIndex((c) => c.key === a) - CAND.findIndex((c) => c.key === b));   // they vote in the candidates' own order; the selection order only decided who got in
const DROPPED = CAND.map((c) => c.key).filter((k) => !KEPT.includes(k));
log("KEPT", KEPT, "DROPPED", DROPPED);

/* ---------- the models ---------- */
const model = fitIn(KEPT), modelOOS = fitTo2017(KEPT), m0 = fitIn([]), m0o = fitTo2017([]);
const X1 = { ...X }; const m1 = fitModelV1(evOut, X1), m1o = fitModelV1(fitIdxV1, X1);
/* the plain table (version 1's matrix read at face value, no protection where it is thin), on version 2's evenings — to show what the protection changes */
const mPlain = fitModel(evFit, KEPT, X, { sheet: sheetAll, plainTable: true });
/* a dropped factor's curve, fitted as the one extra on top of the kept ones — for the advisory line and "what it would have said" */
const advisory = Object.fromEntries(DROPPED.map((k) => { const m = fitIn([...KEPT, k]); return [k, { model: m, factor: m.factors.find((f) => f.key === k) }]; }));
model.advisory = DROPPED.map((k) => ({ ...advisory[k].factor, rungs: advisory[k].model.rungs }));   // each light carries the rungs of the model in which it was counted

/* ---------- the replays ---------- */
function replay(mdl, reader, from = REP_FROM, to = LAST) { const out = new Array(N).fill(null), seq = []; for (let i = from; i <= to; i++) { const d = reader(i, mdl, X, seq.slice(-2).reverse()); seq.push(d ? d.pct : null); out[i] = d ? { pct: d.pct, line: d.line, edge: d.edge, matrixPct: d.matrixPct ?? null } : null; } return out; }
const R2 = replay(model, readAt), R1 = replay(m1, readAtV1), R0 = replay(m0, readAt);
const R2o = replay(modelOOS, readAt, cut), R1o = replay(m1o, readAtV1, cut), R0o = replay(m0o, readAt, cut);
/* refitted every New Year: each year 2018 → 2026 is read with a model fitted only on the evenings whose outcome was known before it began */
function walkForward(build, reader, base) { const out = new Array(N).fill(null), seq = []; for (let y = 2018; y <= +dates[LAST].slice(0, 4); y++) { const a = dates.findIndex((d) => d >= y + "-01-01"), b = y === +dates[LAST].slice(0, 4) ? LAST : dates.findIndex((d) => d >= (y + 1) + "-01-01") - 1; const mdl = build(base.filter((i) => i < a - 60));
    for (let i = a; i <= b; i++) { const d = reader(i, mdl, X, seq.slice(-2).reverse()); seq.push(d ? d.pct : null); out[i] = d ? { pct: d.pct, line: d.line } : null; } } return out; }
const R2w = walkForward((idx) => fitModel(idx, KEPT, X), readAt, evFit), R1w = walkForward((idx) => fitModelV1(idx, X1), readAtV1, evOut);
/* today's ladder and the repaired heat (the heat-at-the-bottoms replay) */
const ladder = {}, ladderFix = {}; if (fs.existsSync(HM1)) { const h = J(HM1), cols = h.seriesCols, di = cols.indexOf("date"), hi = cols.indexOf("heat"), fi = cols.indexOf("fix"), Ld = h.ladder; const rung = (x) => (x == null ? null : x <= -0.5 ? Ld.deepCold : x <= -0.2 ? Ld.cold : x >= 0.5 ? Ld.deepHot : x >= 0.2 ? Ld.hot : Ld.mid); for (const row of h.series) { ladder[row[di]] = rung(row[hi]); ladderFix[row[di]] = rung(row[fi]); } }

/* ---------- the payoff: a share f of the money in SPY from this close to the next, the rest in the 3-month bill ---------- */
function payoff(fracOf, from, to) { let v = 1, peak = 1, mdd = 0, mddAt = null; const inv = []; for (let i = from; i < to; i++) { const f = fracOf(i); if (f == null || !isFinite(f)) continue; inv.push(f); v *= 1 + f * (close[i + 1] / close[i] - 1) + (1 - f) * ((S.bill[i] ?? 0) / 100 / 252); if (v > peak) peak = v; if (v / peak - 1 < mdd) { mdd = v / peak - 1; mddAt = dates[i + 1]; } }
  const yrs = (to - from) / 252; return { multiple: r3(v), perYear: r4(v ** (1 / yrs) - 1), worstFall: r4(mdd), worstFallAt: mddAt, avgInvested: r1(100 * mean(inv)), evenings: inv.length }; }
const lineF = (R) => (i) => (R[i] && R[i].line != null ? R[i].line / 100 : null);
/* the slow trend filter of the floor: SPY under its 200-day AND more than half of the sector funds under theirs, three closes running */
const sec200 = Object.fromEntries(S.SECTORS.map((s) => [s, sma(S.sectors[s], 200)]));
const secUnder = (i) => { let n = 0, u = 0; for (const s of S.SECTORS) { const c = S.sectors[s][i], m = sec200[s][i]; if (c == null || m == null) continue; n++; if (c < m) u++; } return { n, u }; };
const slowRaw = close.map((c, i) => { if (s200[i] == null) return false; const k = secUnder(i); return c < s200[i] && k.n > 0 && k.u > k.n / 2; }), slow = slowRaw.map((v, i) => v && slowRaw[i - 1] === true && slowRaw[i - 2] === true);
const floored = (R, floor) => (i) => { const f = lineF(R)(i); if (f == null) return null; return slow[i] ? f : Math.max(f, floor / 100); };
const FLOORS = [40, 50, 60];
function payoffTable(from, to, set) { const o = {}; for (const [k, f] of Object.entries(set)) o[k] = payoff(f, from, to); return o; }
const strategiesOOS = { "version 2 as it is": lineF(R2o), "version 2 over a 40% floor": floored(R2o, 40), "version 2 over a 50% floor": floored(R2o, 50), "version 2 over a 60% floor": floored(R2o, 60), "version 1 as it is": lineF(R1o), "version 1 over a 60% floor": floored(R1o, 60), "the matrix alone": lineF(R0o),
  "version 2, refitted every New Year": lineF(R2w), "version 1, refitted every New Year": lineF(R1w), "today's ladder": (i) => (ladder[dates[i]] != null ? ladder[dates[i]] / 100 : null), "the repaired heat": (i) => (ladderFix[dates[i]] != null ? ladderFix[dates[i]] / 100 : null),
  "always 60% invested": () => 0.6, "always 50% invested": () => 0.5, "buy and hold": () => 1 };
const strategiesIn = { "version 2 as it is": lineF(R2), "version 2 over a 40% floor": floored(R2, 40), "version 2 over a 50% floor": floored(R2, 50), "version 2 over a 60% floor": floored(R2, 60), "version 1 as it is": lineF(R1), "version 1 over a 60% floor": floored(R1, 60), "the matrix alone": lineF(R0),
  "today's ladder": strategiesOOS["today's ladder"], "the repaired heat": strategiesOOS["the repaired heat"], "always 60% invested": () => 0.6, "always 50% invested": () => 0.5, "buy and hold": () => 1 };
const IN_LABEL = WITH2008 ? "2008 → 2026, fitted on the same evenings (flattering)" : "2008 → 2026 (flattering after March 2009: those evenings were in the fit; 2008 itself was not)";
const payoffs = { "2018 → 2026, fitted to 2017 (the honest check)": payoffTable(cut, LAST, strategiesOOS), [IN_LABEL]: payoffTable(FROM, LAST, strategiesIn) };
payoffs["the 2008 fall on its own (2 Jan 2008 → 9 Mar 2009)" + (WITH2008 ? "" : " — a stress test version 2 never saw")] = payoffTable(FROM, ix["2009-03-09"], strategiesIn);
const two = dates.findIndex((d) => d >= "2024-10-07"); payoffs["the last two years (7 Oct 2024 → 6 Oct 2026), fitted to 2017"] = payoffTable(two, LAST, strategiesOOS);
/* what the floor's lift earned: on the sessions it held the engine up, the lift (floor − line) times SPY's next-day return, summed — against
   what a lift of the same average size would have earned if it had been spread evenly (no timing) */
const liftStats = (R, floor, from, to) => { let n = 0, days = 0, lift = 0, earned = 0, all = 0; for (let i = from; i < to; i++) { const f = lineF(R)(i); if (f == null) continue; const ret = close[i + 1] / close[i] - 1; n++; all += ret; if (!slow[i] && f < floor / 100) { const d = floor / 100 - f; days++; lift += d; earned += d * ret; } }
  return { sessions: n, liftedOn: days, avgLiftPoints: r1(100 * lift / n), earned: r4(earned), untimed: r4(all * lift / n) }; };
const floorLift = { lastTwoYears: liftStats(R2o, 60, dates.findIndex((d) => d >= "2024-10-07"), LAST), since2018: liftStats(R2o, 60, cut, LAST) };
const slowStats = { evenings2018on: slow.slice(cut).filter(Boolean).length, of: LAST - cut + 1, spells: (() => { const out = []; let cur = null; for (let i = REP_FROM; i <= LAST; i++) { if (slow[i]) { if (cur && i - cur.toI <= 1) { cur.toI = i; cur.n++; } else { cur = { fromI: i, toI: i, n: 1 }; out.push(cur); } } } return out.filter((s) => s.n >= 5).map((s) => ({ from: dates[s.fromI], to: dates[s.toI], sessions: s.n })); })(), today: { on: slow[LAST], spyUnder200: close[LAST] < s200[LAST], sectorsUnder: secUnder(LAST) } };
/* the out-of-sample ranking: does a higher edge go with a better next 60 sessions? */
function ranking(R, idx) { const e = [], y = [], p = []; for (const i of idx) if (R[i] && r60[i] != null) { e.push(R[i].edge); y.push(r60[i]); p.push(R[i].pct); } const o = e.map((v, k) => k).sort((a, b) => e[a] - e[b]); const fifths = []; for (let q = 0; q < 5; q++) { const s = o.slice(Math.floor(o.length * q / 5), Math.floor(o.length * (q + 1) / 5)); fifths.push({ med60: r4(med(s.map((k) => y[k]))), share60: r4(share(s.map((k) => y[k]))), avgPct: r1(mean(s.map((k) => p[k]))), n: s.length }); } return { rankCorr: r3(corr(rank(e), rank(y))), fifths, evenings: e.length }; }
const Rb = replay(fitTo2017(["break100"]), readAt, cut), Rg = replay(fitTo2017(["goldX"]), readAt, cut), Rbg = replay(fitTo2017(["break100", "goldX"]), readAt, cut);
const combos = { "the matrix alone": { ranking: ranking(R0o, oosIdx), payoff: payoff(lineF(R0o), cut, LAST) }, "the matrix + the 100-day break": { ranking: ranking(Rb, oosIdx), payoff: payoff(lineF(Rb), cut, LAST) }, "the matrix + gold": { ranking: ranking(Rg, oosIdx), payoff: payoff(lineF(Rg), cut, LAST) }, "the matrix + the 100-day break + gold": { ranking: ranking(Rbg, oosIdx), payoff: payoff(lineF(Rbg), cut, LAST) } };
const rankings = { "2018 → 2026, fitted to 2017": { "the matrix alone": ranking(R0o, oosIdx), "version 1": ranking(R1o, oosIdx), "version 2": ranking(R2o, oosIdx) }, [WITH2008 ? "2008 → 2026, fitted on the same evenings" : "2008 → 2026 (flattering: every evening after March 2009 was in the fit)"]: { "the matrix alone": ranking(R0, evOut), "version 1": ranking(R1, evOut), "version 2": ranking(R2, evOut) } };

/* ---------- how much the matrix should lean on its table against its two lines: the same engine at four settings, three split years ---------- */
const tableWeight = (() => { const rows = []; for (const thin of [30, 100, 250, 600, 1e9]) { const row = { countsHalfAt: thin >= 1e9 ? null : thin, label: thin >= 1e9 ? "the two lines only (no table)" : thin === 30 ? "30 evenings (version 1's rule)" : thin === 250 ? "250 evenings (used)" : thin + " evenings", splits: {} };
    for (const y of [2015, 2017, 2019]) { const SP = splitOf(y), m = fitModel(SP.fit, KEPT, X, { sheet: SP.sheet, thinMatrix: thin }), R = replay(m, readAt, SP.cut); row.splits[y] = { rankCorr: ranking(R, SP.oos).rankCorr, ...payoff(lineF(R), SP.cut, LAST) }; } rows.push(row); } return rows; })();
/* ---------- each factor's sheet: the test, the curve, the payoff with and without it ---------- */
const basePay = payoff(lineF(R2o), cut, LAST);
const factorSheets = CAND.map((c) => { const kept = KEPT.includes(c.key); const alone = rounds[0].tests.find((t) => t.key === c.key); const onTop = kept ? testFactor(c.key, KEPT.filter((k) => k !== c.key)) : testFactor(c.key, KEPT);
  const withIt = kept ? modelOOS : fitTo2017([...KEPT, c.key]), without = kept ? fitTo2017(KEPT.filter((k) => k !== c.key)) : modelOOS; const pw = payoff(lineF(replay(withIt, readAt, cut)), cut, LAST), po = payoff(lineF(replay(without, readAt, cut)), cut, LAST);
  const fIn = kept ? model.factors.find((f) => f.key === c.key) : advisory[c.key].factor, mIn = kept ? model : advisory[c.key].model, fFit = withIt.factors.find((f) => f.key === c.key); const eIn = curveEdge(fIn, mIn.baseline), eFit = curveEdge(fFit, withIt.baseline);
  const today = voteOf(fIn, X.vals[c.key][LAST], mIn.baseline);
  const overlapWith = (arr) => { const a = [], b = []; for (const i of evFit) if (X.vals[c.key][i] != null && arr[i] != null) { a.push(X.vals[c.key][i]); b.push(arr[i]); } return r2(corr(rank(a), rank(b))); };
  const rb = robustness[c.key], brief = (t) => ({ gapMed60: t.gapMed60, gapShare60: t.gapShare60, yearsRight: t.yearsRight, yearsVoted: t.yearsVoted, passes: t.passes, evenings: t.evenings });
  return { ...c, kept, alone, onTop, passedFirstTest: PASSED_FIRST.includes(c.key), splits: { 2015: brief(rb[2015]), 2017: brief(rb[2017]), 2019: brief(rb[2019]), otherDesign: brief(rb.otherDesign) }, directionHeld: dirOK(rb[2015]) && dirOK(rb[2017]) && dirOK(rb[2019]) && dirOK(rb.otherDesign), overlap: { rsi: overlapWith(rsi), vixPct: overlapWith(vixPct), break100: overlapWith(break100) }, payoffWith: pw, payoffWithout: po, addedMultiple: r3(pw.multiple - po.multiple), addedWorstFall: r4(pw.worstFall - po.worstFall), shapeHeld: r2(corr(eIn, eFit)),
    curve: { places: FGRID, values: FGRID.map((u) => r3(fIn.q[u])), edge: eIn.map(r3), edgeFitTo2017: eFit.map(r3), valuesFitTo2017: FGRID.map((u) => r3(fFit.q[u])), near: fIn.near }, today: { value: r3(X.vals[c.key][LAST]), place: today ? r1(today.place) : null, edge: today ? r3(today.add) : null, words: today ? SAY[c.key](today.z) : null } }; });

/* ---------- 2 · proportionality: what one band of each thing is worth ---------- */
const E = model.rungs.edges, ptsPerEdge = (LADDER[4] - LADDER[0]) / (E[4] - E[0]); const eM = (r, p) => L.matrixRead(model, r, p).e;
const vixYear = S.vix.slice(LAST - 251, LAST + 1).filter((v) => v != null).sort((a, b) => a - b); const vixPctOf = (v) => Math.min(100, 100 * vixYear.filter((x) => x < v).length / (vixYear.length - 1)), vixAt = (q) => pctl(vixYear, q);
const rsiNow = rsi[LAST], pNow = vixPct[LAST]; const RS = [35, 40, 45, 50, 55, 60, 65, 70], PS = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const wAt = (r, p) => readSheet(model.sheets.all, GRID, "near", r, p) || 0; const wavg = (pairs) => { let s = 0, w = 0; for (const [v, k] of pairs) if (v != null) { s += v * k; w += k; } return w ? s / w : null; };
const proportion = { ptsPerEdge: r2(ptsPerEdge), rungs: E, note: "points = the vote in edge units × the ladder's average slope (85 points of % invested over the distance between the 15% and the 100% rung)",
  rsi: { band: "5 RSI points lower", atToday: r2(eM(rsiNow - 5, pNow) - eM(rsiNow, pNow)), average: r2(wavg(RS.flatMap((r) => PS.map((p) => [Math.abs(eM(r - 5, p) - eM(r, p)), wAt(r, p)])))), swing: r2(wavg(PS.map((p) => [Math.max(...RS.map((r) => eM(r, p))) - Math.min(...RS.map((r) => eM(r, p))), 1]))), swingWords: "RSI 35 to 70, the best row against the worst, averaged over the VIX columns" },
  vix: { band: "one tier: from the year's 80th percentile to its 90th (VIX " + vixAt(80).toFixed(1) + " → " + vixAt(90).toFixed(1) + " today)", atToday: r2(eM(rsiNow, 90) - eM(rsiNow, 80)), average: r2(wavg(RS.map((r) => [Math.abs(eM(r, 90) - eM(r, 80)), wAt(r, 85)]))), tiers: [[50, 80], [80, 90], [90, 97]].map(([a, b]) => ({ from: a, to: b, vixFrom: r1(vixAt(a)), vixTo: r1(vixAt(b)), atToday: r2(eM(rsiNow, b) - eM(rsiNow, a)), average: r2(wavg(RS.map((r) => [eM(r, b) - eM(r, a), wAt(r, (a + b) / 2)]))) })), swing: r2(wavg(RS.map((r) => [Math.max(...PS.map((p) => eM(r, p))) - Math.min(...PS.map((p) => eM(r, p))), 1]))), swingWords: "the year's 10th to 90th percentile, the best column against the worst, averaged over the RSI rows" },
  factors: factorSheets.map((s) => { const f = s.kept ? model.factors.find((o) => o.key === s.key) : advisory[s.key].factor, B = s.kept ? model.baseline : advisory[s.key].model.baseline; const at = (z) => voteOf(f, z, B).add; const z0 = X.vals[s.key][LAST]; const mids = [10, 20, 30, 40, 50, 60, 70, 80, 90].map((u) => f.q[u]);
    return { key: s.key, kept: s.kept, band: s.bandWords, atToday: r2(at(z0 - s.band) - at(z0)), atTodayWords: `${r2(z0)} → ${r2(z0 - s.band)} ${s.unit}`, average: r2(mean(mids.map((z) => Math.abs(at(z - s.band / 2) - at(z + s.band / 2))))), swing: r2(Math.max(...mids.map(at)) - Math.min(...mids.map(at))), swingWords: "its own 10th to 90th percentile, the best place against the worst" }; }) };

/* ---------- today, the scenarios, and the grid Alan asked for ---------- */
const hygHealed = med(evOut.filter((i) => credit[i] != null && credit[i] > 0).map((i) => credit[i]));   // "credit healed" = HYG back at its usual distance above its 200-day when it is above
const beta = (() => { const xs = [], ys = []; for (let i = LAST - 251; i <= LAST; i++) { xs.push(close[i] / close[i - 1] - 1); ys.push(S.qqq[i] / S.qqq[i - 1] - 1); } const mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0; for (let k = 0; k < xs.length; k++) { sxy += (xs[k] - mx) * (ys[k] - my); sxx += (xs[k] - mx) ** 2; } return sxy / sxx; })();
const geigerAtRsi = (r) => med(evOut.filter((i) => geiger[i] != null && Math.abs(rsi[i] - r) <= 2.5).map((i) => geiger[i])), geigerShift = geiger[LAST] - geigerAtRsi(rsi[LAST]);
const stepsOf = (base, n, total) => Array.from({ length: n }, (_, k) => base * (1 + total) ** ((k + 1) / n));
function inputsFor(dd, vixVal, creditVal) { const n = dd === 0 ? 0 : Math.max(1, Math.floor(Math.abs(dd))); const c2 = close.slice(0, LAST + 1).concat(stepsOf(close[LAST], n, dd / 100)), q2 = S.qqq.slice(0, LAST + 1).concat(stepsOf(S.qqq[LAST], n, beta * dd / 100));
  const a200 = sma(c2, 200), rs = rsi14(c2).at(-1), dSpy = (c2.at(-1) / sma(c2, 100).at(-1) - 1) * 100, dQqq = (q2.at(-1) / sma(q2, 100).at(-1) - 1) * 100;
  return { sessions: n, spy: c2.at(-1), rsi: rs, vix: vixVal, vixPct: vixPctOf(vixVal), trend: (a200.at(-1) / a200.at(-22) - 1) * 100, rising: a200.at(-1) > a200.at(-22), credit: creditVal, creditAbove: creditVal > 0, geiger: Math.max(0, Math.min(100, geigerAtRsi(rs) + geigerShift)), break100: Math.min(dSpy, dQqq), breakSpy: dSpy, breakQqq: dQqq, vixLevel: vixVal, bondsX: bondsX[LAST], goldX: goldX[LAST] }; }
const readV1 = (inp) => { try { return L.deployV1({ rsi: inp.rsi, vixPct: inp.vixPct, putCallPct: null, trendRising: inp.rising, creditAbove: inp.creditAbove, tenStretchPct: null, tenAbove200: null }, m1); } catch (e) { return null; } };   // version 1 refuses a spot history never sat at
const DDS = [0, -1.5, -3, -5, -7, -10], VIXES = [16, 20, 23.5, 25, 30, 40], vixNow = S.vix[LAST], creditNow = credit[LAST];
const mCredit = DROPPED.includes("credit") ? advisory.credit.model : model;   // the model with credit counted (the "if it were counted" grid when it is dropped)
const cell = (dd, v, cr) => { const inp = inputsFor(dd, v, cr), d = deploy2(inp, model), d1 = readV1(inp), dc = deploy2(inp, mCredit); return { dd, vix: v, rsi: r1(inp.rsi), vixPct: r1(inp.vixPct), break100: r2(inp.break100), v2: d.pct, thinSpot: d.thinSpot, near: d.matrix.near, plainTable: (() => { try { return deploy2(inp, mPlain).pct; } catch (e) { return null; } })(), matrix: d.matrixPct, v1: d1 ? d1.pct : null, v2creditCounted: dc.pct, micron: r1(money(d.pct).micron), votes: d.votes.map((x) => ({ key: x.key, points: r1(x.points) })) }; };
const grid = { drawdowns: DDS, vixes: VIXES, calmVix: vixNow, creditToday: r2(creditNow), creditHealed: r2(hygHealed), beta: r3(beta), creditCounts: KEPT.includes("credit"),
  asToday: DDS.map((dd) => [vixNow, ...VIXES].map((v) => cell(dd, v, creditNow))), healed: DDS.map((dd) => [vixNow, ...VIXES].map((v) => cell(dd, v, hygHealed))),
  note: "each drawdown is from the 6 Oct close in sessions of about 1% (−1.5% is one session); QQQ falls its past-year beta times as far; the 200-day and the 100-day are recomputed along the path; the VIX is placed in the year that ended 6 Oct" };
/* the little drop: 1.5–2% in one session, with the VIX where it has usually gone on such a day (the last five years) */
const vixMove = (lo, hi) => { const a = []; for (let i = LAST - 1259; i <= LAST; i++) { const r = (close[i] / close[i - 1] - 1) * 100; if (r <= hi && r > lo && S.vix[i] != null && S.vix[i - 1] != null) a.push(S.vix[i] / S.vix[i - 1]); } return { n: a.length, ratio: med(a) }; };
const littleDrop = [[-1.5, vixMove(-1.75, -1.25)], [-2, vixMove(-2.25, -1.75)]].map(([dd, m]) => { const calm = inputsFor(dd, vixNow, creditNow), usual = inputsFor(dd, vixNow * m.ratio, creditNow); const a = deploy2(calm, model), b = deploy2(usual, model);
  return { dd, days: m.n, vixRatio: r3(m.ratio), vixUsual: r2(vixNow * m.ratio), calm: { v2: a.pct, v1: readV1(calm)?.pct ?? null, rsi: r1(calm.rsi), break100: r2(calm.break100), reasons: a.reasons }, usual: { v2: b.pct, v1: readV1(usual)?.pct ?? null, rsi: r1(usual.rsi), vixPct: r1(usual.vixPct), break100: r2(usual.break100), micron: r1(money(b.pct).micron), reasons: b.reasons } }; });
/* the calm-dip result explained: version 1 on the 6 Oct close and after a calm −1.5%, sheet by sheet */
const v1Parts = (inp) => { const base = { rsi: inp.rsi, vixPct: inp.vixPct, putCallPct: null, tenStretchPct: null, tenAbove200: null }; const run = (o) => L.deployV1({ ...base, ...o }, m1); const full = run({ trendRising: inp.rising, creditAbove: inp.creditAbove });
  const sheetName = inp.creditAbove ? "creditAbove" : "creditBelow", near = readSheet(m1.sheets[sheetName], GRID, "near", inp.rsi, inp.vixPct) || 0, cm = readSheet(m1.sheets[sheetName], GRID, "med60", inp.rsi, inp.vixPct), cp = readSheet(m1.sheets[sheetName], GRID, "share60", inp.rsi, inp.vixPct);
  return { rsi: r1(inp.rsi), vixPct: r1(inp.vixPct), full: full.pct, matrixAlone: run({ trendRising: null, creditAbove: null }).pct, withTrendOnly: run({ trendRising: inp.rising, creditAbove: null }).pct, withCreditOnly: run({ trendRising: null, creditAbove: inp.creditAbove }).pct, edge: full.edge, parts: { matrix: r3(full.parts.main), trendSheet: r3(full.parts.trend), creditSheet: r3(full.parts.credit) },
    creditSheet: { name: sheetName, eveningsNear: Math.round(near), countsPct: Math.round(100 * near / (near + THIN)), med60: r4(cm), share60: r4(cp) } }; };
const calmDip = { today: v1Parts(inputsFor(0, vixNow, creditNow)), dip15: v1Parts(inputsFor(-1.5, vixNow, creditNow)), dip3: v1Parts(inputsFor(-3, vixNow, creditNow)), healedToday: v1Parts(inputsFor(0, vixNow, hygHealed)), healedDip15: v1Parts(inputsFor(-1.5, vixNow, hygHealed)),
  v2: { today: deploy2(inputsFor(0, vixNow, creditNow), model).pct, dip15: deploy2(inputsFor(-1.5, vixNow, creditNow), model).pct, dip3: deploy2(inputsFor(-3, vixNow, creditNow), model).pct, matrixToday: deploy2(inputsFor(0, vixNow, creditNow), m0).pct, matrixDip15: deploy2(inputsFor(-1.5, vixNow, creditNow), m0).pct, matrixDip3: deploy2(inputsFor(-3, vixNow, creditNow), m0).pct },
  /* the same spot walked down the RSI rows with the VIX held: where the credit-under sheet starts to count */
  walk: [62, 60, 58, 56, 54, 52, 50, 48, 46, 44].map((r) => { const base = { rsi: r, vixPct: vixPct[LAST], putCallPct: null, tenStretchPct: null, tenAbove200: null }; const near = readSheet(m1.sheets.creditBelow, GRID, "near", r, vixPct[LAST]) || 0; return { rsi: r, matrix: L.deployV1({ ...base, trendRising: null, creditAbove: null }, m1).pct, v1: L.deployV1({ ...base, trendRising: true, creditAbove: false }, m1).pct, creditNear: Math.round(near), creditCounts: Math.round(100 * near / (near + THIN)), v2: deploy2({ ...inputsFor(0, vixNow, creditNow), rsi: r }, model).pct }; }) };
const todayIn = inputsAt(LAST, X), priorV2 = [R2[LAST - 1]?.pct, R2[LAST - 2]?.pct], dToday = deploy2(todayIn, model, priorV2), dTodayV1 = readAtV1(LAST, m1, X, [R1[LAST - 1]?.pct, R1[LAST - 2]?.pct]);
const today = { date: dates[LAST], spy: close[LAST], qqq: S.qqq[LAST], rsi: r1(rsi[LAST]), vix: S.vix[LAST], vixPct: r1(vixPct[LAST]), sma100: r3(s100[LAST]), qqq100: r3(q100[LAST]), breakSpy: r2(dS[LAST]), breakQqq: r2(dQ[LAST]), break100: r2(break100[LAST]), sma200: r3(s200[LAST]), trend: r2(trend[LAST]), hygAdj: S.hygA[LAST], hygAdj200: r3(hygA200[LAST]), credit: r2(credit[LAST]), creditUnderSince: (() => { let i = LAST; while (i > 0 && creditAbove[i] === false) i--; return dates[i + 1]; })(),
  geiger: r1(geiger[LAST]), geigerSpy: r3(S.gSpy[LAST]), geigerQqq: r3(S.gQqq[LAST]), geigerSpyPct: r1(gPS[LAST]), geigerQqqPct: r1(gPQ[LAST]), tlt: S.tlt[LAST], bondsX: r1(bondsX[LAST]), gld: S.gld[LAST], goldX: r1(goldX[LAST]), ten: S.ten[LAST],
  v2: { pct: dToday.pct, line: dToday.line, matrixPct: dToday.matrixPct, edge: dToday.edge, votes: dToday.votes.map((v) => ({ key: v.key, value: r3(v.z), place: r1(v.place), edge: r3(v.add), points: r1(v.points) })), reasons: dToday.reasons, money: dToday.money, moneyTonight: dToday.moneyTonight, prior: priorV2 },
  v1: { pct: dTodayV1.pct, line: dTodayV1.line }, ladder: ladder[dates[LAST]] ?? null,
  lastEvenings: Array.from({ length: 8 }, (_, k) => { const i = LAST - 7 + k; return { date: dates[i], spy: close[i], rsi: r1(rsi[i]), vix: S.vix[i], break100: r2(break100[i]), goldX: r1(goldX[i]), v2: R2[i] ? R2[i].pct : null, line: R2[i] ? R2[i].line : null, v1line: R1[i] ? R1[i].line : null, ladder: ladder[dates[i]] ?? null }; }),
  advisory: DROPPED.map((k) => { const a = advisory[k], d = deploy2(todayIn, a.model), v = d.votes.find((x) => x.key === k); return { key: k, value: r3(X.vals[k][LAST]), words: v && !v.missing ? SAY[k](v.z) : null, wouldSay: d.pct, points: v ? r1(v.points) : null }; }),
  vixYear: { p20: r1(vixAt(20)), p50: r1(vixAt(50)), p80: r1(vixAt(80)), p90: r1(vixAt(90)), p95: r1(vixAt(95)), max: Math.max(...vixYear), pctOf: Object.fromEntries(VIXES.map((v) => [v, r1(vixPctOf(v))])) } };
/* how much of version 1's number is the thin credit sheet */
const thin = { ...calmDip.today, moved: r1(calmDip.today.full - calmDip.today.withTrendOnly), words: null };

/* ---------- 4 · bottoms and tops ---------- */
const row = (d) => { const i = ix[d]; if (i == null) return { date: d, missing: true }; const a = R2[i], b = R1[i]; const dd = readAt(i, model, X); return { date: d, spy: close[i], rsi: r1(rsi[i]), vix: S.vix[i], vixPct: r1(vixPct[i]), break100: r2(break100[i]), breakSpy: r2(dS[i]), breakQqq: r2(dQ[i]), credit: r2(credit[i]), geiger: r1(geiger[i]), bondsX: r1(bondsX[i]), goldX: r1(goldX[i]), trend: r2(trend[i]),
  v2: a ? a.pct : null, v2line: a ? a.line : null, matrix: a ? a.matrixPct : null, v1: b ? b.pct : null, v1line: b ? b.line : null, v2fitTo2017: R2o[i] ? R2o[i].line : null, ladder: ladder[d] ?? null, repaired: ladderFix[d] ?? null, slowFilter: slow[i], beforeFit: i < FROM,
  next20: r4(r20[i]), next60: r4(r60[i]), next120: r4(r120[i]), dip60: r4(dip60[i]), votes: dd ? dd.votes.map((v) => ({ key: v.key, points: r1(v.points) })) : [] }; };
const SEVEN = [["2026-03-26", "2026-03-30"], ["2025-04-04", "2025-04-08"], ["2023-10-30", "2023-10-27"], ["2022-10-17", "2022-10-12"], ["2020-03-17", "2020-03-23"], ["2018-12-21", "2018-12-24"], ["2009-03-02", "2009-03-09"]];
const bottoms = { seven: SEVEN.map(([d, low]) => ({ ...row(d), low: row(low) })), recent: ["2026-07-29", "2026-07-30", "2026-09-16"].map(row) };
/* the 2026 highs: every record close of 2026 that was followed by a fall of 3% or more before the next record, and the latest record */
const highs2026 = (() => { const out = []; let best = Math.max(...close.slice(0, ix[dates.find((d) => d >= "2026-01-01")])); const first = dates.findIndex((d) => d >= "2026-01-01"); let cand = null, low = null;
  for (let i = first; i <= LAST; i++) { if (close[i] > best) { if (cand != null && low / close[cand] - 1 <= -0.03) out.push({ i: cand, fall: low / close[cand] - 1 }); best = close[i]; cand = i; low = close[i]; } else if (cand != null) low = Math.min(low, close[i]); }
  if (cand != null) out.push({ i: cand, fall: low / close[cand] - 1, latest: true }); return out.map((o) => ({ date: dates[o.i], fall: r4(o.fall), latest: !!o.latest })); })();
const topRow = (d, label) => { const i = ix[d]; const base = row(d); let lowI = i; for (let k = i; k <= Math.min(LAST, i + 250); k++) if (close[k] < close[lowI]) lowI = k; const avg = (R, n) => r1(mean(Array.from({ length: n }, (_, k) => (R[i + 1 + k] ? R[i + 1 + k].line : null))));
  const firstDown = (p) => { for (let k = i + 1; k <= Math.min(LAST, i + 250); k++) if (close[k] / close[i] - 1 <= -p) return { date: dates[k], v2line: R2[k] ? R2[k].line : null, v1line: R1[k] ? R1[k].line : null, ladder: ladder[dates[k]] ?? null }; return null; };
  return { ...base, label, fallToLow: r4(close[lowI] / close[i] - 1), lowDate: dates[lowI], lowV2line: R2[lowI] ? R2[lowI].line : null, lowV1line: R1[lowI] ? R1[lowI].line : null, next20avgV2: avg(R2, 20), next20avgV1: avg(R1, 20), at5down: firstDown(0.05), at10down: firstDown(0.10) }; };
const tops = [["2007-10-09", "the 2007 high"], ["2018-01-26", "January 2018"], ["2020-02-19", "before the pandemic"], ["2022-01-03", "the start of 2022"], ["2024-07-16", "July 2024"], ["2025-02-19", "February 2025"], ...highs2026.map((h) => [h.date, h.latest ? "the latest record close" : "2026 high, then " + (h.fall * 100).toFixed(1) + "%"])].map(([d, l]) => topRow(d, l));
/* 2008, reported and not designed around: the first evening the line said 100% (and 80%+), and how much further SPY fell */
const earlyCall = (R, from, to, p) => { let lowI = ix[from]; for (let i = ix[from]; i <= ix[to]; i++) if (close[i] < close[lowI]) lowI = i; let first = null; for (let i = ix[from]; i <= lowI; i++) if (R[i] && R[i].line >= p) { first = i; break; } const seg = []; for (let i = ix[from]; i <= lowI; i++) if (R[i]) seg.push(R[i].line);
  return { threshold: p, first: first == null ? null : dates[first], furtherFall: first == null ? null : r4(close[lowI] / close[first] - 1), low: dates[lowI], avgToLow: r1(mean(seg)), eveningsAtOrAbove: seg.filter((v) => v >= p).length, evenings: seg.length }; };
const early = { "2008": { v2: [earlyCall(R2, "2008-01-02", "2009-03-09", 99.5), earlyCall(R2, "2008-01-02", "2009-03-09", 80)], v1: [earlyCall(R1, "2008-01-02", "2009-03-09", 99.5), earlyCall(R1, "2008-01-02", "2009-03-09", 80)] }, "2022": { v2: [earlyCall(R2, "2022-01-03", "2022-10-12", 99.5), earlyCall(R2, "2022-01-03", "2022-10-12", 80)], v1: [earlyCall(R1, "2022-01-03", "2022-10-12", 99.5), earlyCall(R1, "2022-01-03", "2022-10-12", 80)] } };
const distOf = (R) => { const a = []; for (let i = FROM; i <= LAST; i++) if (R[i]) a.push(R[i].line); const j = []; for (let i = FROM + 1; i <= LAST; i++) if (R[i] && R[i - 1]) j.push(Math.abs(R[i].line - R[i - 1].line)); return { avg: r1(mean(a)), median: r1(med(a)), share100: r4(a.filter((v) => v >= 99.5).length / a.length), shareAtLeast80: r4(a.filter((v) => v >= 80).length / a.length), shareAtMost30: r4(a.filter((v) => v <= 30).length / a.length), meanAbsChange: r1(mean(j)), changesOf20: j.filter((x) => x >= 20).length, evenings: a.length }; };
const dist = { v2: distOf(R2), v1: distOf(R1), matrix: distOf(R0) };
const lastSaid = (R, p) => { for (let i = LAST; i >= FROM; i--) if (R[i] && R[i].line >= p) return dates[i]; return null; };

/* ---------- the write ---------- */
const slim = (m) => ({ grid: m.grid, bandwidth: m.bandwidth, factorBandwidth: m.factorBandwidth, thinMatrix: m.thinMatrix, marg: m.marg, sheets: { all: { med60: m.sheets.all.med60, share60: m.sheets.all.share60, dip60: m.sheets.all.dip60, near: m.sheets.all.near, thin: m.sheets.all.thin, evenings: m.sheets.all.evenings } }, baseline: m.baseline, factors: m.factors, rungs: m.rungs, advisory: m.advisory || [] });
const out = { built_utc: new Date().toISOString(), fitFrom: dates[evFit[0]], with2008: WITH2008, from: dates[ev[0]], to: dates[LAST], outcomesTo: dates[evOut.at(-1)], evenings: ev.length, evWithOutcome: evOut.length, fitTo2017: { evenings: fitIdx.length, to: dates[fitIdx.at(-1)] }, replayed: { evenings: oosIdx.length, from: dates[oosIdx[0]], to: dates[oosIdx.at(-1)] },
  sources: { prices: "chart API daily closes (split-adjusted, no payouts): SPY, QQQ, HYG, TLT, GLD, the eleven sector funds; the 3-month bill for cash", vix: "vix_term table with the chart API's series where the table has a hole", hygAdjusted: "FMP dividend-adjusted HYG, " + S.hygAdjRows.length + " sessions to " + S.hygAdjRows.at(-1)[0] + " (DM1's keyed read on a throw-away Fly machine; not re-read here)", geiger: "the Geiger-history study's seven-rung replay for SPY and QQQ, one reading per session since 31 Oct 2003, as of " + S.geigerAsOf, ladder: "the heat-at-the-bottoms replay (today's ladder and the repaired heat, evening by evening)" },
  keepRule2: "and it must never point the wrong way (its median gap above zero, right in more than half the years) in three other fits: the fit ending in 2015, the fit ending in 2019, and the other design (2008 " + (WITH2008 ? "left out of" : "left in") + " the fit)", standards,
  keepRule: "kept when, fitted to 2017 and replayed on 2018 → 2026, the third of evenings it voted for most beat the third it voted against most — on what the matrix and the factors already kept had not explained — by at least 1 point of median 60-session return and 3 points of share higher, and it pointed the right way in more than half of the years in which it voted both ways",
  kept: KEPT, keptInOrderOfEntry: KEPT_ORDER, dropped: DROPPED, rounds, factorSheets, model: slim(model), modelFitTo2017: { rungs: modelOOS.rungs, baseline: modelOOS.baseline }, v1: { rungs: m1.rungs, baseline: m1.baseline, rungsFitTo2017: m1o.rungs },
  rankings, combos, tableWeight, payoffs, floors: FLOORS, floorLift, slowFilter: { rule: "SPY under its 200-day and more than half of the sector funds under their own 200-day, three closes running (eleven funds today; nine before real estate and communications had 200 sessions)", ...slowStats },
  proportion, today, thin, calmDip, littleDrop, grid, bottoms, tops, highs2026, early, dist, lastSaid: { v2: { p100: lastSaid(R2, 99.5), p80: lastSaid(R2, 80) }, v1: { p100: lastSaid(R1, 99.5), p80: lastSaid(R1, 80) } },
  replay: { cols: ["date", "spy", "v2line", "v2", "matrix", "v1line", "ladder", "repaired", "v2fitTo2017", "slow"], series: Array.from({ length: LAST - REP_FROM + 1 }, (_, k) => { const i = REP_FROM + k; return [dates[i], close[i], R2[i] ? R2[i].line : null, R2[i] ? R2[i].pct : null, R2[i] ? R2[i].matrixPct : null, R1[i] ? R1[i].line : null, ladder[dates[i]] ?? null, ladderFix[dates[i]] ?? null, R2o[i] ? R2o[i].line : null, slow[i] ? 1 : 0]; }) } };
/* the comparison run (2008 left in the fit) writes one small file and stops: what was kept, how it ranked, what it paid, what it says today, its grid */
if (WITH2008) { fs.writeFileSync(path.join(OUT, "dm2-with2008.json"), JSON.stringify({ built_utc: out.built_utc, fitFrom: out.fitFrom, kept: KEPT, dropped: DROPPED, factorSheets: factorSheets.map((f) => ({ key: f.key, kept: f.kept, passedFirstTest: f.passedFirstTest, alone: f.alone, onTop: f.onTop, splits: f.splits })), rankings, payoffs, today: { v2: today.v2, advisory: today.advisory }, grid: { asToday: grid.asToday.map((r) => r.map((c) => ({ dd: c.dd, vix: c.vix, v2: c.v2, thinSpot: c.thinSpot }))) }, rungs: model.rungs, early, dist, bottoms: bottoms.seven.map((b) => ({ date: b.date, v2: b.v2, v2line: b.v2line, low: { date: b.low.date, v2: b.low.v2, v2line: b.low.v2line } })) }));
  console.log(JSON.stringify({ ok: true, alt: "with 2008 in the fit", kept: KEPT, today: today.v2.pct, rankCorr: rankings["2018 → 2026, fitted to 2017"]["version 2"].rankCorr })); process.exit(0); }
fs.writeFileSync(path.join(OUT, "dm2.json"), JSON.stringify(out));
/* the compact copy the live line reads: the model, and what a browser cannot rebuild from live prices alone */
const live = { built_utc: out.built_utc, asOf: dates[LAST], model: { grid: model.grid, thinMatrix: model.thinMatrix, marg: model.marg, sheets: { all: { med60: model.sheets.all.med60, share60: model.sheets.all.share60, near: model.sheets.all.near } }, baseline: model.baseline, factors: model.factors, rungs: model.rungs, advisory: model.advisory },
  kept: KEPT, dropped: DROPPED, names: NAME,
  /* HYG's payouts (ex-date, amount) so the browser can add them back to the price-only closes the chart API serves; after the last one known, a payout the size of the last is assumed on each month's first session and the line says so */
  hygPayouts: S.hygDividends.filter((d) => d[0] >= dates[LAST - 520]).map((d) => [d[0], d[1]]),
  /* the check a browser runs on itself: rebuilt from the chart API's closes for the same session, the inputs must come out as these */
  check: { date: dates[LAST], inputs: Object.fromEntries(Object.entries(todayIn).map(([k, v]) => [k, r3(v)])), pct: dToday.pct, prior: priorV2, line: dToday.line, spy: close[LAST], vix: S.vix[LAST], hygAdj: S.hygA[LAST], hygPrice: S.hygP[LAST] } };
fs.writeFileSync(path.join(OUT, "dm2-live.json"), JSON.stringify(live));
const P = payoffs["2018 → 2026, fitted to 2017 (the honest check)"];
console.log(JSON.stringify({ ok: true, kept: KEPT, dropped: DROPPED, rungs: model.rungs.edges, today: { v2: dToday.pct, line: dToday.line, matrix: dToday.matrixPct, v1: dTodayV1.pct, votes: today.v2.votes, advisory: today.advisory },
  factorTests: factorSheets.map((s) => ({ key: s.key, kept: s.kept, alone: [s.alone.gapMed60, s.alone.gapShare60, s.alone.yearsRight + "/" + s.alone.yearsVoted], onTop: [s.onTop.gapMed60, s.onTop.gapShare60, s.onTop.yearsRight + "/" + s.onTop.yearsVoted], addedMultiple: s.addedMultiple, addedWorstFall: s.addedWorstFall, shapeHeld: s.shapeHeld })),
  payoffOOS: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, [v.multiple, v.worstFall, v.avgInvested]])), rankCorr: Object.fromEntries(Object.entries(rankings["2018 → 2026, fitted to 2017"]).map(([k, v]) => [k, v.rankCorr])), highs2026, sizes: { dm2: fs.statSync(path.join(OUT, "dm2.json")).size, live: fs.statSync(path.join(OUT, "dm2-live.json")).size } }, null, 1));
