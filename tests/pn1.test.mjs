/* PN1 tests (7 Oct 2026) — the deployment pane for TradingView: the script on disk is what the build writes from the tool's model; its
   numbers are the engine's numbers; a replay of its arithmetic equals the engine on every day there is; the TradingView protocol
   (plot budget stated and counted, no white, version 6); plain words in everything a person reads on the chart; and the proof file
   says what the code says. Nothing here writes, and only the last test touches the network (a read of the chart API, skipped if it
   does not answer). */
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import * as E from "../study/ds1/engine.mjs";
import { view, fetchDaily, fetchLive, baseline, alignBars, withLive, sessionRanges, hygWithPayouts } from "../study/ds1/live.mjs";
import { parsePine, replay, pointsAt, wilderRsi, moveOver, security, labelOf, labelsOf, adjustLikeTradingView, round1 } from "../study/pn1/pine-replay.mjs";
import { buildPine, pineNumbers } from "../scripts/pn1-build-pine.mjs";
import { engineOn, scriptOn, codeHash, codeOf } from "../scripts/pn1-prove.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8")), T = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const SRC = T("study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine"), K = parsePine(SRC), LV = J("study/ds1/data/ds1-live.json"), D = J("study/ds1/data/ds1.json"), M = LV.model, A = baseline(LV), F = J("tests/fixtures/pn1-closes-20261006.json"), P = J("study/pn1/data/pn1-proof.json");
const ix = Object.fromEntries(F.dates.map((d, i) => [d, i])), LAST = F.dates.length - 1, part = (k) => M.parts.find((p) => p.key === k), CODE = codeOf(SRC), near = (a, b, tol) => Math.abs(a - b) <= tol;
/* every string a person can read on the chart or in the script's settings: the quoted text in the code part */
const STRINGS = [...CODE.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
let ENG, SAME, TV; const sides = () => { ENG ??= engineOn(F, M, A); SAME ??= scriptOn(K, F, F.hygWithPayouts); TV ??= scriptOn(K, F, adjustLikeTradingView(F.dates, F.HYG, F.payouts)); return { eng: ENG, same: SAME, tv: TV }; };

test("1 · the script on disk is what the build writes from the tool's model, and its numbers are the model's", () => {
  assert.equal(SRC, buildPine(), "run node scripts/pn1-build-pine.mjs");
  assert.deepEqual(LV.kept, ["rsi", "creditOwn"], "the two parts that vote");
  assert.deepEqual(K.RSI_PLACES, part("rsi").q); assert.deepEqual(K.CREDIT_PLACES, part("creditOwn").q); assert.equal(K.RSI_PLACES.length, 101); assert.equal(K.RSI_POINTS.length, 21); assert.equal(K.CREDIT_POINTS.length, 21);
  const sc = M.scale; for (const [k, pts] of [["rsi", K.RSI_POINTS], ["creditOwn", K.CREDIT_POINTS]]) { const p = part(k); pts.forEach((v, i) => assert.ok(near(v, (sc.gain * (p.gm20[i] / sc.sM20 + p.gp20[i] / sc.sP20 + p.gm60[i] / sc.sM60 + p.gp60[i] / sc.sP60)) / 4, 1e-6), k + " mark " + i)); }
  assert.ok(near(K.TYPICAL_DAY, 50 - sc.gain * sc.centre, 1e-6)); assert.equal(K.RSI_DAYS, 14); assert.equal(K.CREDIT_DAYS, E.CREDIT_WINDOW); assert.equal(K.RATES_SHARE, E.RATES_SHARE);
  assert.equal(K.heldPct, LV.defaults.corePct + LV.defaults.micronPct + LV.defaults.nebiusPct); assert.equal(K.tacticalPct, LV.defaults.tacticalPct); assert.equal(K.heldPct, 70); assert.equal(K.tacticalPct, 30);
  assert.deepEqual(pineNumbers().rsiPlaces, K.RSI_PLACES);
  /* which fund is asked for how: the three plain, HYG with its payouts added back; each on its own regular-session daily bars */
  assert.deepEqual(K.funds, { spy: { symbol: "AMEX:SPY", adjustment: "splits" }, qqq: { symbol: "NASDAQ:QQQ", adjustment: "splits" }, hyg: { symbol: "AMEX:HYG", adjustment: "dividends" }, ief: { symbol: "NASDAQ:IEF", adjustment: "splits" } });
  assert.equal((CODE.match(/request\.security\(\w+T, "D", /g) || []).length, 4); assert.equal((CODE.match(/lookahead = barmerge\.lookahead_off/g) || []).length, 4, "no request looks ahead"); });

test("2 · a part's points in the script are the engine's vote times the gain, across and beyond both place tables", () => {
  const sc = M.scale; for (const [k, places, curve] of [["rsi", K.RSI_PLACES, K.RSI_POINTS], ["creditOwn", K.CREDIT_PLACES, K.CREDIT_POINTS]]) { const p = part(k), lo = places[0] - 3, hi = places[100] + 3; let worst = 0;
    for (let s = 0; s <= 4000; s++) { const z = lo + ((hi - lo) * s) / 4000, mine = pointsAt(places, curve, z), eng = sc.gain * E.voteOf(p, z, sc).vote; worst = Math.max(worst, Math.abs(mine - eng)); }
    for (const z of places) worst = Math.max(worst, Math.abs(pointsAt(places, curve, z) - sc.gain * E.voteOf(p, z, sc).vote));   /* exactly on a table value */
    assert.ok(worst < 1e-5, k + ": worst gap " + worst); }
  assert.equal(pointsAt(K.RSI_PLACES, K.RSI_POINTS, null), null, "no value, no points"); assert.equal(pointsAt(K.RSI_PLACES, K.RSI_POINTS, 5), K.RSI_POINTS[0], "flat below the table"); assert.equal(pointsAt(K.RSI_PLACES, K.RSI_POINTS, 99), K.RSI_POINTS[20], "flat above it");
  /* a lower RSI never lowers the reading (the tool's standing rule): the script's curve never rises */
  for (let i = 1; i < 21; i++) assert.ok(K.RSI_POINTS[i] <= K.RSI_POINTS[i - 1] + 1e-9, "RSI mark " + i); });

test("3 · the script's RSI and ten-session move are the engine's, bar for bar", () => {
  for (const s of ["SPY", "QQQ"]) { const eng = E.rsi(F[s]), f = wilderRsi(K)(); let worst = 0, n = 0; F[s].forEach((c, i) => { const v = f(c); assert.equal(v == null, eng[i] == null, s + " " + F.dates[i]); if (v != null) { worst = Math.max(worst, Math.abs(v - eng[i])); n++; } }); assert.ok(worst < 1e-9 && n > 5700, s + ": worst " + worst + " over " + n); }
  const up = Array.from({ length: 40 }, (_, i) => 100 + i), f = wilderRsi(K)(), out = up.map((c) => f(c)); assert.equal(out[13], null); assert.equal(out[14], 100, "the first reading comes with the fifteenth bar"); assert.equal(out[39], 100);
  const g = wilderRsi(K)(); assert.equal([5, null, 6].map((c) => g(c))[2], null, "a missing bar is skipped, never read as a change");
  const mv = moveOver(K)(), hist = []; const moves = F.IEF.map((c) => { hist.push(c); return mv(c, hist); }); assert.equal(moves[9], null); assert.ok(near(moves[10], F.IEF[10] / F.IEF[0] - 1, 1e-12)); assert.ok(near(moves[LAST], F.IEF[LAST] / F.IEF[LAST - 10] - 1, 1e-12));
  /* a fund's value shows on the chart bar of the same date, and holds over a chart bar the fund has none for */
  const own = [{ date: "2026-01-02", close: 1 }, { date: "2026-01-05", close: 2 }], seen = security(own, () => (c) => c * 10, ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-05", "2026-01-06"]); assert.deepEqual(seen, [null, 10, 10, 20, 20]); });

test("4 · fed the engine's own prices, the replay of the script equals the engine on every day there is", () => {
  const { eng, same } = sides(); let n = 0, worst = 0, worstInv = 0;
  for (let i = 0; i <= LAST; i++) { assert.equal(eng[i].reading == null, same[i].reading == null, F.dates[i] + ": one side has a reading and the other has not"); if (eng[i].reading == null) continue; n++; worst = Math.max(worst, Math.abs(eng[i].reading - same[i].reading)); worstInv = Math.max(worstInv, Math.abs(eng[i].invested - same[i].invested)); assert.ok(near(eng[i].rsi, same[i].rsiBoth, 1e-9)); assert.ok(near(eng[i].creditOwn, same[i].creditOwn, 1e-9)); }
  assert.equal(n, 4894); assert.ok(worst <= 0.1000001, "worst reading gap " + worst); assert.ok(worstInv <= 0.0300001, "worst gap in % invested " + worstInv);
  assert.equal(F.dates[same.findIndex((r) => r.reading != null)], "2007-04-25", "the first bar with a reading: ten sessions after HYG began trading"); });

test("5 · the lows and highs the deployment study lists, and 6 Oct: the study's stored reading, the engine and the script, to one point", () => {
  const { eng, same, tv } = sides(), listed = [...D.extremes.bottoms, ...D.extremes.tops]; assert.equal(listed.length, 17); assert.ok(listed.some((e) => e.date === "2026-10-06"));
  for (const e of listed) { const i = ix[e.date]; assert.equal(eng[i].reading, e.reading, e.date + ": the fixture is the study's own data"); assert.ok(Math.abs(same[i].reading - e.reading) <= 0.1000001, e.date + " on the engine's prices: " + same[i].reading + " against " + e.reading); assert.ok(Math.abs(tv[i].reading - e.reading) <= 1, e.date + " with TradingView's payouts: " + tv[i].reading + " against " + e.reading); assert.ok(Math.abs(tv[i].invested - eng[i].invested) <= 0.3000001); }
  for (const [d, v] of D.series) if (v != null) assert.ok(Math.abs(same[ix[d]].reading - v) <= 0.1000001, d);   /* the study's year of readings */
  const r = same[ix["2026-10-06"]]; assert.equal(r.reading, 21.9); assert.ok(near(r.invested, 76.57, 1e-9)); assert.equal(labelOf(r), "Invested 77% · market reading 22");
  /* with the two parts shown their labels carry the tool's own points: 49.1 − 7.7 − 19.5 = 21.9 */
  const tn = D.tonight; assert.equal(tn.base, 49.1); assert.equal(tn.parts.find((p) => p.key === "rsi").points, -7.7); assert.equal(tn.parts.find((p) => p.key === "creditOwn").points, -19.5);
  const all = labelsOf(r, { showReading: true, showParts: true }); assert.deepEqual(all.map((l) => l.text), ["Invested 77% · market reading 22", "SPY and QQQ −7.7", "credit −19.5", "market reading 22"], "from the highest line down");
  assert.deepEqual(all.map((l) => l.colour), [r.colour, "red", "red", "bright teal"]); for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].y - all[i].y >= 12 - 1e-9, "labels " + i + " and " + (i + 1) + " keep their space"); assert.equal(all[0].y, r.invested);
  assert.ok(near(all[1].at, 50 - 7.7, 0.06) && near(all[2].at, 50 - 19.5, 0.06), "each part is drawn as 50 plus its points"); assert.deepEqual(labelsOf(r, { showTag: false }), []); });

test("6 · fed HYG's payouts the way TradingView adds them back, the script stays within a point of the engine on all but a handful of early days", () => {
  const { eng, tv } = sides(), over = [], gaps = []; for (let i = 0; i <= LAST; i++) if (eng[i].reading != null) { const g = Math.abs(eng[i].reading - tv[i].reading); gaps.push(g); if (g > 1.0000001) over.push(F.dates[i]); }
  assert.ok(over.length <= 10, over.length + " days over one point: " + over.join(" ")); assert.ok(over.every((d) => d < "2013-01-01"), "none since 2013: " + over.join(" ")); assert.ok(Math.max(...gaps) <= 2.5);
  assert.ok(Math.max(...gaps.slice(-252)) <= 1, "the last year stays inside one point"); assert.ok(gaps.filter((g) => g <= 1.0000001).length / gaps.length >= 0.995);
  /* TradingView's way: the newest price is never changed, and a payout scales every price before its ex-date by (close before − payout) ÷ close before */
  const adj = adjustLikeTradingView(["a", "b", "c", "d"], [100, 100, 99, 99], [["c", 1]]); assert.deepEqual(adj.map((x) => +x.toFixed(6)), [99, 99, 99, 99]); assert.equal(adjustLikeTradingView(F.dates, F.HYG, F.payouts)[LAST], F.HYG[LAST]); });

test("7 · the money: % invested is the held part plus the tactical part times the reading, never over 100, and the inputs move it", () => {
  const { same } = sides(); for (const r of same) if (r.reading != null) assert.ok(near(r.invested, 70 + 0.3 * r.reading, 1e-9) && r.invested >= 70 && r.invested <= 100);
  for (const r of same.slice(-300)) assert.ok(near(r.invested, E.pie(r.reading, A).invested, 0.0051), r.date + ": the tool's own pie");
  const other = scriptOn(K, F, F.hygWithPayouts, { heldPct: 85, tacticalPct: 30 }); for (const r of other.slice(-300)) { assert.ok(r.invested <= 100); assert.ok(near(r.invested, Math.min(100, 85 + 0.3 * r.reading), 1e-9)); assert.ok(near(r.invested, E.pie(r.reading, { ...A, corePct: 60 }).invested, 0.0051), "the tool trims the tactical part the same way when the shape adds to more than 100"); }
  /* the line's colour: green on a day it has more invested than the day before, red on a day it has less, unchanged on a flat day */
  const rows = same.filter((r) => r.reading != null); for (let i = 1; i < rows.length; i++) { const want = rows[i].invested > rows[i - 1].invested ? "green" : rows[i].invested < rows[i - 1].invested ? "red" : rows[i - 1].colour; assert.equal(rows[i].colour, want, rows[i].date); }
  assert.equal(scriptOn(K, F, F.hygWithPayouts, { byDirection: false }).at(-1).colour, "teal"); assert.equal(round1(21.949), 21.9); assert.equal(round1(null), null); });

test("8 · the TradingView protocol: version 6, the plot budget stated in the header and counted from the code, four requests, no white", () => {
  assert.ok(SRC.startsWith("//@version=6\n")); assert.match(SRC, /^indicator\("SCINTILLA · DEPLOYMENT PANE", shorttitle = "DEPLOYMENT", overlay = false/m);
  /* the protocol's count: a plot with a constant colour 1, a plot whose colour changes from bar to bar 2, a fill 1; level lines and labels are free */
  const plots = [...CODE.matchAll(/^(?:\w+\s*=\s*)?plot\((.*)\)\s*$/gm)].map((m) => m[1]), fills = (CODE.match(/^fill\(/gm) || []).length, constCol = (a) => /color = (C_[A-Z_]+|color\.new\(C_[A-Z_]+, \d+\))(,|$)/.test(a);
  const count = plots.reduce((n, a) => n + (constCol(a) ? 1 : 2), 0) + fills, stated = SRC.match(/^\/\/ PLOTS (\d+)\/64/m); assert.ok(stated, "the header states PLOTS n/64"); assert.equal(plots.length, 8); assert.equal(fills, 1); assert.equal(count, 12); assert.equal(+stated[1], count); assert.ok(count <= 64);
  const req = (CODE.match(/request\.\w+\(/g) || []).length, statedReq = SRC.match(/^\/\/ REQUESTS (\d+)\/40/m); assert.equal(req, 4); assert.equal(+statedReq[1], req);
  /* no white, ever: no named white, and no colour whose three channels are all bright and near each other */
  assert.ok(!/color\.white|#fff\b|#ffffff/i.test(SRC)); const hexes = [...CODE.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => m[1]); assert.ok(hexes.length >= 8);
  for (const h of hexes) { const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); assert.ok(!(Math.min(r, g, b) >= 200 && Math.max(r, g, b) - Math.min(r, g, b) <= 40), "#" + h + " reads as white"); }
  assert.ok(!/color\.(gray|silver|black|red|green|blue|yellow|orange|purple|aqua|lime|teal|navy|olive|maroon|fuchsia)\b/.test(CODE), "only the named palette at the top of the script");
  /* shape: no tabs, wrapped lines indented by five spaces (never a multiple of four), every bracket and quote closed */
  assert.ok(!SRC.includes("\t")); const lines = CODE.split("\n"); let depth = 0;
  for (const [i, ln] of lines.entries()) { const bare = ln.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/\/\/.*$/, ""); if (depth > 0) assert.match(ln, /^ {5}\S/, "wrapped line " + (i + 1) + ": " + ln.slice(0, 40)); assert.equal((bare.match(/"/g) || []).length % 2, 0, "an open quote on line " + (i + 1)); depth += (bare.match(/\(/g) || []).length - (bare.match(/\)/g) || []).length; assert.ok(depth >= 0, "a stray bracket on line " + (i + 1)); }
  assert.equal(depth, 0); for (const ln of lines) if (!/^ {5}\S/.test(ln)) assert.equal(ln.match(/^ */)[0].length % 4, 0, "a block line indented off the four-space grid: " + ln.slice(0, 40)); });

test("9 · plain words: nothing a person reads on the chart or in the settings carries an internal code, a version tag or a banned word", () => {
  const banned = [/\bv\d\b/i, /\bevening/i, /\brung/i, /line vs reading/i, /\bDS1\b/, /\bPN1\b/, /\bDM\d\b/, /\blane\b/i, /\bE\b/, /\bn\/a\b/i, /\bNaN\b/, /undefined/];
  assert.ok(STRINGS.length > 30); for (const s of STRINGS) for (const b of banned) assert.ok(!b.test(s), JSON.stringify(s) + " carries " + b);
  for (const b of [/\bv\d\b/i, /\bevening/i, /\brung/i, /line vs reading/i, /\bDS1\b/, /\bPN1\b/, /\bDM\d\b/, /\blane\b/i]) assert.ok(!b.test(SRC), "the script's header carries " + b);
  for (const want of ["Invested ", "% · market reading ", "No reading yet · waiting for prices from", "% invested", "held through pullbacks", "market reading", "Held through pullbacks, % of the account", "Tactical at full, % of the account", "Labels on the last bar", "SPY and QQQ ", "credit "]) assert.ok(STRINGS.includes(want), "the script says " + JSON.stringify(want));
  /* the label's words in the script are the words the replay prints */
  for (const line of ['array.push(ts, "Invested " + whole(invested) + "% · market reading " + whole(reading))', 'array.push(ts, "market reading " + whole(reading))', 'array.push(ts, "SPY and QQQ " + signed1(ptsRsi))', 'array.push(ts, "credit " + signed1(ptsCredit))', "y := math.min(y, above - labelGap)", "array<int> rank = array.sort_indices(ys, order.descending)"]) assert.ok(CODE.includes(line), "the script still says: " + line); const { same } = sides(); assert.match(labelOf(same.at(-1)), /^Invested \d+% · market reading \d+$/);
  assert.equal(labelOf({ invested: null, spyRsi: 60, qqqRsi: 60, hygMove: null, iefMove: 0.1 }), "No reading yet · waiting for prices from HYG");
  /* the two parts are green while they add to the reading and red while they take away; the 50 line is the cut-off */
  for (const r of same.slice(-400)) { assert.equal(r.colA, r.ptsRsi >= 0 ? "green" : "red"); assert.equal(r.partA >= 50, r.colA === "green"); assert.equal(r.partB >= 50, r.colB === "green"); } });

test("10 · the proof file says what the code says: the named days, every day, and today's live row worked again from the prices it kept", () => {
  assert.equal(P.script.codeHash, codeHash(SRC), "the script's code changed after the proof was made — run node scripts/pn1-prove.mjs"); assert.equal(P.tolerance, 1); assert.equal(P.allWithinOnePoint, true);
  const { eng, same, tv } = sides(); assert.equal(P.rows.length, 17); for (const r of P.rows) { const i = ix[r.date]; assert.equal(r.engine.reading, eng[i].reading); assert.equal(r.script.reading, same[i].reading); assert.equal(r.scriptTradingViewPayouts.reading, tv[i].reading); assert.ok(r.gap <= 1 && r.gapTradingViewPayouts <= 1); }
  assert.equal(P.history.samePrices.days, 4894); assert.ok(P.history.samePrices.worst <= 0.1); assert.ok(P.history.tradingViewPayouts.shareWithin1 >= 99.5); assert.ok(P.history.lastYear.tradingViewPayouts.worst <= 1);
  /* today's row: the engine and the script worked again on the closes the row kept */
  const t = P.today; assert.ok(t && t.engine, "the proof holds a live row for today"); assert.ok(t.session >= "2026-10-07"); assert.ok(t.gap <= 1 && t.gapTradingViewPayouts <= 1 && t.gapOnTheLongHistory <= 1);
  const G = t.closes, chain = hygWithPayouts(G.dates, G.HYG, LV.hygPayouts).tr, e = engineOn(G, M, A, chain).at(-1), s = scriptOn(K, G, chain).at(-1), s2 = scriptOn(K, G, adjustLikeTradingView(G.dates, G.HYG, LV.hygPayouts)).at(-1);
  assert.equal(e.reading, t.engine.reading, "the engine on the kept closes gives the tool's live reading"); assert.equal(s.reading, t.script.reading); assert.equal(s2.reading, t.scriptTradingViewPayouts.reading); assert.ok(Math.abs(e.reading - s.reading) <= 0.1000001); assert.ok(near(e.invested, t.engine.invested, 0.0051));
  assert.equal(t.script.label, labelOf(s)); });

test("11 · live: the tool's own read of the chart API and the script on the very same prices agree to one point (skipped if the API does not answer)", async (t) => {
  const API = "https://scintilla-massive-chart-api.fly.dev", getApi = async (p) => { const r = await fetch(API + p, { headers: { Origin: "https://scintillahub.ai" }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(p.split("?")[0] + " " + r.status); return r.json(); };
  let candles, live; try { candles = await fetchDaily(getApi); live = await fetchLive(getApi); } catch (e) { t.skip("the chart API did not answer: " + e.message); return; }
  const v = view({ base: LV, candles, ...live, A }), S = withLive(alignBars(candles), live.quotes, live.macro, sessionRanges(live.intraday, live.quotes?.SPY?.price_session_et)).S, G = { dates: S.dates, SPY: S.bars.SPY.c, QQQ: S.bars.QQQ.c, IEF: S.bars.IEF.c, HYG: S.bars.HYG.c };
  const a = scriptOn(K, G, hygWithPayouts(S.dates, G.HYG, LV.hygPayouts).tr).at(-1), b = scriptOn(K, G, adjustLikeTradingView(S.dates, G.HYG, LV.hygPayouts)).at(-1);
  assert.ok(Math.abs(v.reading.reading - a.reading) <= 0.1000001, "tool " + v.reading.reading + " script " + a.reading); assert.ok(Math.abs(v.reading.reading - b.reading) <= 1, "tool " + v.reading.reading + " script with TradingView's payouts " + b.reading); assert.ok(Math.abs(v.pie.invested - a.invested) <= 0.0300001); });

test("12 · the task for the installer: its eight days are the proof's own numbers, and it holds the rules that keep every existing tab untouched", () => {
  const task = T("study/pn1/TASK-KIMI-DEPLOYMENT-LAYOUT.md"), rows = [...task.matchAll(/^\| (\d{4}-\d{2}-\d{2}) \| ([\d.]+) \| ([\d.]+) \| ([\d.]+) \| (-?[\d.]+) \|$/gm)]; assert.equal(rows.length, 8);
  for (const [, d, inv, rd, rsi, cr] of rows) { const r = P.rows.find((x) => x.date === d); assert.ok(r, d + " is one of the proved days"); assert.equal(+inv, r.scriptTradingViewPayouts.invested, d + " % invested"); assert.equal(+rd, r.scriptTradingViewPayouts.reading, d + " reading"); assert.equal(+rsi, r.script.rsi, d + " RSI"); assert.equal(+cr, r.scriptTradingViewPayouts.creditOwn, d + " credit"); }
  for (const want of ["Scintilla — Deployment", "Scintilla Deployment Pane", "create-new-tab-button", "/app/new-tab/index.html", "Create new layout", "NEVER navigate a tab to", "AMEX:SPY", "NASDAQ:QQQ", "TVC:VIX", "AMEX:HYG", "showWidget('scripteditor')", "Never type or paste the script", "out/SCINTILLA-DEPLOYMENT-PANE.as-saved.pine", "EVERY tab that exists when you start is forbidden", "\"authorized\": false", "25 Apr 2007", "30 minutes"]) assert.ok(task.includes(want), "the task says: " + want);
  /* the names the task tells the installer to look for are the names the script gives its plots */
  for (const name of ["% invested", "market reading", "SPY and QQQ's RSI, averaged", "credit's own move over ten sessions, %"]) { assert.ok(task.includes('"' + name + '"'), name); assert.ok(STRINGS.includes(name), "the script has a plot called " + name); }
  assert.match(CODE, /^indicator\("SCINTILLA · DEPLOYMENT PANE"/m); assert.ok(task.includes('"SCINTILLA · DEPLOYMENT PANE"')); });

test("13 · the check on what TradingView saved: identical passes, the one allowed fix passes with every line named, a changed number fails", async () => {
  const { checkSaved, lineDiff } = await import("../scripts/pn1-check-saved.mjs");
  const same = checkSaved(SRC); assert.equal(same.identical, true); assert.equal(same.ok, true); assert.equal(checkSaved(SRC.replace(/\n/g, "\r\n")).identical, true, "other line ends are not a change"); assert.equal(checkSaved(SRC.replace(/\n$/, "")).identical, true);
  const allowed = checkSaved(SRC.replaceAll(", display = display.none", "")); assert.equal(allowed.identical, false); assert.equal(allowed.numbersUnchanged, true); assert.equal(allowed.ok, true); assert.equal(allowed.differs.length, 10, "five lines, each named on both sides"); assert.ok(allowed.replay.worstOnTheEnginesPrices <= 0.1);
  const bad = checkSaved(SRC.replace("const float  TYPICAL_DAY = 49.075087", "const float  TYPICAL_DAY = 49.5")); assert.equal(bad.numbersUnchanged, false); assert.equal(bad.ok, false); assert.equal(bad.differs.length, 2);
  const cut = checkSaved(SRC.replace("65.02809, ", "")); assert.equal(cut.ok, false, "a place table short of a value is caught");
  const header = checkSaved(SRC.replace("// WHAT IT IS.", "// WHAT IT IS:")); assert.equal(header.codeIdentical, true); assert.equal(header.ok, true, "a change in the header comment alone does not un-prove the code");
  assert.deepEqual(lineDiff("a\nb\nc", "a\nx\nc").map((d) => d.side + d.line + d.text), ["proved2b", "saved2x"]); });
