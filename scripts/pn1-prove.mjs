/* PN1 (7 Oct 2026) — the proof that the TradingView script draws the allocation tool's number: a replay of the script's arithmetic
   (study/pn1/pine-replay.mjs, reading its numbers out of the .pine file itself) set against the tool's own engine
   (study/ds1/engine.mjs, and study/ds1/live.mjs for today), on the lows and highs the deployment study lists, 6 Oct, and today.
     node scripts/pn1-prove.mjs <cacheDir>           the full proof: rebuilds the closes fixture from the cache folder the study was built from
     node scripts/pn1-prove.mjs                      the same from the fixture already in the repo (tests/fixtures/pn1-closes-20261006.json)
     add --no-live to skip today's row (no network at all); add --quiet to print only the summary line
   Reads: the fixture or the cache folder, the model file, and — for today's row only — the chart API (GETs, no key), the way the tool
   itself reads it. Writes: tests/fixtures/pn1-closes-20261006.json (with a cache folder) and study/pn1/data/pn1-proof.json. No table.

   THREE WAYS THE REPLAY IS FED
     samePrices          the engine's own prices: HYG with payouts from the table the study used (FMP's adjusted close, rounded to the cent)
     tradingViewPayouts  HYG's plain closes with the payouts added back the way TradingView does it (every earlier price scaled)
     today               the tool's own live read: its 540 daily bars plus today's prices, HYG chained the tool's way and TradingView's way */
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
import * as E from "../study/ds1/engine.mjs";
import { view, fetchDaily, fetchLive, baseline, alignBars, withLive, sessionRanges, hygWithPayouts, nyParts, phaseOf } from "../study/ds1/live.mjs";
import { parsePine, replay, adjustLikeTradingView, labelOf, pointsAt, round1 } from "../study/pn1/pine-replay.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), J = (f) => JSON.parse(fs.readFileSync(f, "utf8")), iso = (t) => new Date(t).toISOString().slice(0, 10);
const FIXTURE = path.join(ROOT, "tests/fixtures/pn1-closes-20261006.json"), OUT = path.join(ROOT, "study/pn1/data/pn1-proof.json"), PINE = path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine");
const args = process.argv.slice(2), CACHE = args.find((a) => !a.startsWith("--")), NO_LIVE = args.includes("--no-live"), QUIET = args.includes("--quiet");
const r1 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(1)), r2 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(2)), r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3)), r4 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(4));
const pctl = (a, q) => { const s = a.slice().sort((p, r) => p - r); if (!s.length) return null; const k = ((s.length - 1) * q) / 100, lo = Math.floor(k), hi = Math.ceil(k); return s[lo] + (s[hi] - s[lo]) * (k - lo); };

/* the script without its header comment: everything from the indicator() line on. The proof names the code it proved by this hash, so a
   change to the header's words does not un-prove the script and a change to its code does. */
export const codeOf = (src) => src.slice(src.indexOf("\nindicator(") + 1), codeHash = (src) => crypto.createHash("sha256").update(codeOf(src)).digest("hex").slice(0, 16);

/* ---------- the closes: from the cache folder the study was built from, kept in the repo as a fixture ---------- */
export function fixtureFromCache(cache) {
  const D = (s) => J(path.join(cache, `${s}_D.json`)).series.filter((b) => b.c != null), spy = D("SPY"), dates = spy.map((b) => iso(b.t));
  const onClock = (s) => { const m = new Map(D(s).map((b) => [iso(b.t), b.c])); let cur = null; return dates.map((d) => (m.has(d) ? (cur = m.get(d)) : cur)); };
  const f = J(path.join(cache, "data/hyg_adjusted_fmp.json")), adj = new Map(f.adjusted.rows.map((r) => [r[0], r[1]])); let cur = null;
  return { what: "PN1 — daily closes of the four funds the deployment pane reads, on SPY's sessions, as the deployment study's cache folder held them", asOf: dates.at(-1), from: dates[0],
    source: "the chart API's daily bars (split-adjusted, payouts not added back) for SPY, QQQ, HYG and IEF; HYG with payouts and the payout list from the study's FMP read of " + String(f.read_utc).slice(0, 10),
    dates, SPY: onClock("SPY"), QQQ: onClock("QQQ"), HYG: onClock("HYG"), IEF: onClock("IEF"), hygWithPayouts: dates.map((d) => (adj.has(d) ? (cur = adj.get(d)) : cur)), payouts: f.dividends.rows.map((r) => [r[0], r[1]]) }; }

/* ---------- the two sides on one set of closes ---------- */
/* the engine: the study's own call, fed closes only (the highs and lows it also takes are not read by either voting part) */
export function engineOn(F, model, A, hygTR = F.hygWithPayouts) {
  const bar = (c) => ({ c, h: c, l: c }), bars = {}; for (const s of E.ALL_SYMBOLS) bars[s] = F[s] ? bar(F[s]) : null;
  const X = E.allReadings({ dates: F.dates, bars }, hygTR).X;
  return F.dates.map((d, i) => { const inp = E.inputsAt(X, i); if (inp.rsi == null || inp.creditOwn == null) return { date: d, reading: null, invested: null, rsi: inp.rsi, creditOwn: inp.creditOwn }; const r = E.readSystem(inp, model); return { date: d, reading: r.reading, raw: r.raw, invested: E.pie(r.reading, A).invested, rsi: inp.rsi, creditOwn: inp.creditOwn, points: Object.fromEntries(r.parts.map((p) => [p.key, p.points])) }; }); }
/* the script: each fund as TradingView would hand it for the adjustment the script asks for */
export function scriptOn(K, F, hyg, inputs) { const ser = (c) => F.dates.map((d, i) => ({ date: d, close: c[i] })).filter((b) => b.close != null);
  for (const [k, want] of [["spy", "splits"], ["qqq", "splits"], ["ief", "splits"], ["hyg", "dividends"]]) if (K.funds[k].adjustment !== want) throw new Error("the script asks for " + k + " with adjustment." + K.funds[k].adjustment + "; this proof feeds it adjustment." + want);
  return replay(K, { spy: ser(F.SPY), qqq: ser(F.QQQ), ief: ser(F.IEF), hyg: ser(hyg) }, F.dates, inputs); }
function gaps(eng, scr, from = 0) { const g = [], rows = []; for (let i = from; i < eng.length; i++) { if (eng[i].reading == null && scr[i].reading == null) continue; if (eng[i].reading == null || scr[i].reading == null) { rows.push({ date: eng[i].date, onlyOne: eng[i].reading == null ? "script" : "engine" }); continue; } g.push({ date: eng[i].date, gap: Math.abs(eng[i].reading - scr[i].reading) }); }
  const v = g.map((x) => x.gap), worst = g.reduce((a, b) => (b.gap > a.gap ? b : a), { gap: -1 });
  return { days: g.length, oneSided: rows.length, worst: r2(worst.gap), worstOn: worst.date, median: r3(pctl(v, 50)), p99: r2(pctl(v, 99)), shareWithin1: r2((100 * v.filter((x) => x <= 1.0000001).length) / v.length), shareWithinTenth: r2((100 * v.filter((x) => x <= 0.1000001).length) / v.length), over1: g.filter((x) => x.gap > 1.0000001).length, over1First: (g.find((x) => x.gap > 1.0000001) || {}).date || null, over1Last: (g.filter((x) => x.gap > 1.0000001).pop() || {}).date || null }; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const say = (...a) => { if (!QUIET) console.log(...a); };
  if (CACHE) { const F0 = fixtureFromCache(CACHE); fs.writeFileSync(FIXTURE, JSON.stringify(F0)); say("fixture written:", path.relative(ROOT, FIXTURE), F0.dates.length, "sessions", F0.from, "→", F0.asOf, "·", F0.payouts.length, "payouts"); }
  const F = J(FIXTURE), base = J(path.join(ROOT, "study/ds1/data/ds1-live.json")), study = J(path.join(ROOT, "study/ds1/data/ds1.json")), model = base.model, A = baseline(base), K = parsePine(fs.readFileSync(PINE, "utf8"));
  const ix = Object.fromEntries(F.dates.map((d, i) => [d, i])), LAST = F.dates.length - 1;
  const eng = engineOn(F, model, A), tvHyg = adjustLikeTradingView(F.dates, F.HYG, F.payouts), same = scriptOn(K, F, F.hygWithPayouts), tv = scriptOn(K, F, tvHyg);
  /* the study's own stored numbers must be what the engine gives on this fixture, or the fixture is not the study's data */
  const listed = [...study.extremes.bottoms.map((b) => ({ ...b, kind: "low" })), ...study.extremes.tops.map((b) => ({ ...b, kind: "high" }))];
  for (const e of listed) if (eng[ix[e.date]].reading !== e.reading) throw new Error("on " + e.date + " the engine gives " + eng[ix[e.date]].reading + " on this fixture; the study stored " + e.reading);
  for (const [d, v] of study.series) if (v != null && eng[ix[d]].reading !== v) throw new Error("on " + d + " the engine gives " + eng[ix[d]].reading + "; the study's series stored " + v);

  /* ---------- the named days ---------- */
  const rowOf = (d, kind) => { const i = ix[d], e = eng[i], a = same[i], b = tv[i]; return { date: d, kind, engine: { reading: e.reading, invested: e.invested, rsi: r2(e.rsi), creditOwn: r3(e.creditOwn), rsiPoints: r1(e.points.rsi), creditPoints: r1(e.points.creditOwn) },
    script: { reading: a.reading, invested: r2(a.invested), rsi: r2(a.rsiBoth), creditOwn: r3(a.creditOwn), rsiPoints: r1(a.ptsRsi), creditPoints: r1(a.ptsCredit), label: labelOf(a) },
    scriptTradingViewPayouts: { reading: b.reading, invested: r2(b.invested), creditOwn: r3(b.creditOwn) }, gap: r1(Math.abs(e.reading - a.reading)), gapTradingViewPayouts: r1(Math.abs(e.reading - b.reading)), gapInvested: r2(Math.abs(e.invested - a.invested)), gapInvestedTradingViewPayouts: r2(Math.abs(e.invested - b.invested)) }; };
  const rows = listed.map((e) => rowOf(e.date, e.date === F.asOf ? "6 Oct (the study's last day; also its last high)" : e.kind)).sort((x, y) => (x.date < y.date ? -1 : 1));

  /* ---------- every day there is ---------- */
  const first = F.dates[eng.findIndex((e) => e.reading != null)], history = { from: first, to: F.asOf, samePrices: gaps(eng, same), tradingViewPayouts: gaps(eng, tv), lastYear: { samePrices: gaps(eng, same, LAST - 251), tradingViewPayouts: gaps(eng, tv, LAST - 251) },
    firstScriptReading: F.dates[same.findIndex((r) => r.reading != null)], investedWorst: { samePrices: null, tradingViewPayouts: null } };
  for (const [k, s] of [["samePrices", same], ["tradingViewPayouts", tv]]) { let w = 0; for (let i = 0; i <= LAST; i++) if (eng[i].invested != null && s[i].invested != null) w = Math.max(w, Math.abs(eng[i].invested - s[i].invested)); history.investedWorst[k] = r2(w); }
  /* how far apart the two ways of adding HYG's payouts back are, as credit's own move sees them */
  { let w = 0, on = null; const v = []; for (let i = 0; i <= LAST; i++) if (same[i].creditOwn != null && tv[i].creditOwn != null) { const g = Math.abs(same[i].creditOwn - tv[i].creditOwn); v.push(g); if (g > w) { w = g; on = F.dates[i]; } } history.creditOwnBetweenTheTwoWays = { worst: r3(w), worstOn: on, median: r4(pctl(v, 50)), p99: r3(pctl(v, 99)) }; }

  /* ---------- a cent on a closing price: how far it moves the reading ---------- */
  const centAt = (i) => { const base0 = scriptOn(K, { ...F, dates: F.dates.slice(0, i + 1), SPY: F.SPY.slice(0, i + 1), QQQ: F.QQQ.slice(0, i + 1), IEF: F.IEF.slice(0, i + 1) }, F.hygWithPayouts.slice(0, i + 1)).at(-1).raw, out = {};
    for (const [name, key, at] of [["SPY today", "SPY", i], ["QQQ today", "QQQ", i], ["HYG today", "HYG", i], ["HYG ten sessions ago", "HYG", i - K.CREDIT_DAYS], ["the Treasury fund today", "IEF", i], ["the Treasury fund ten sessions ago", "IEF", i - K.CREDIT_DAYS]]) { let w = 0;
      for (const dx of [0.01, -0.01]) { const G = { dates: F.dates.slice(0, i + 1), SPY: F.SPY.slice(0, i + 1), QQQ: F.QQQ.slice(0, i + 1), IEF: F.IEF.slice(0, i + 1) }, hyg = F.hygWithPayouts.slice(0, i + 1); if (key === "HYG") hyg[at] += dx; else G[key][at] += dx; w = Math.max(w, Math.abs(scriptOn(K, G, hyg).at(-1).raw - base0)); } out[name] = w; } return out; };
  const centNow = centAt(LAST), worstNow = Object.entries(centNow).reduce((a, b) => (b[1] > a[1] ? b : a));
  let centWorstYear = 0, centWorstYearOn = null, centWorstYearOf = null; for (let i = LAST - 251; i <= LAST; i += 1) { const c = centAt(i); for (const [nm, v] of Object.entries(c)) if (v > centWorstYear) { centWorstYear = v; centWorstYearOn = F.dates[i]; centWorstYearOf = nm; } }
  const sensitivity = { on: F.asOf, cent: Object.fromEntries(Object.entries(centNow).map(([k, v]) => [k, r3(v)])), centWorst: r2(worstNow[1]), centWorstOf: worstNow[0], centWorstYear: r2(centWorstYear), centWorstYearOn, centWorstYearOf, note: "the reading before it is held between 0 and 100, moved one cent up and one cent down" };

  /* ---------- two things worth knowing about the payouts ---------- */
  /* (a) if TradingView were late adding HYG's payout back on its ex-date: that day's reading with the payout left out, for the last two years */
  const late = []; for (const [d, amt] of F.payouts.filter((p) => p[0] >= F.dates[LAST - 504])) { const i = ix[d]; if (i == null) continue; const cut = { dates: F.dates.slice(0, i + 1), SPY: F.SPY.slice(0, i + 1), QQQ: F.QQQ.slice(0, i + 1), IEF: F.IEF.slice(0, i + 1) }, hc = F.HYG.slice(0, i + 1);
    const without = scriptOn(K, cut, adjustLikeTradingView(cut.dates, hc, F.payouts.filter((p) => p[0] < d))).at(-1).reading; late.push({ date: d, payoutPct: (100 * amt) / F.HYG[i - 1], with: tv[i].reading, without, gap: Math.abs(tv[i].reading - without) }); }
  /* (b) the Treasury fund is read without its payouts (the tool's own choice, copied here). Its payout days are the same first-of-month
     days as HYG's. How far its plain close falls on those days (against every other day, since 2016), what that puts into credit's own
     move for the ten sessions after, and what taking it out again would do to the reading on those sessions of the last year */
  const exIx = F.payouts.map((p) => ix[p[0]]).filter((k) => k != null), exSet = new Set(exIx), i2016 = F.dates.findIndex((d) => d >= "2016-01-01"), onEx = [], other = [];
  for (let i = i2016; i <= LAST; i++) (exSet.has(i) ? onEx : other).push((F.IEF[i] / F.IEF[i - 1] - 1) * 100);
  const meanOf = (a) => a.reduce((p, q) => p + q, 0) / (a.length || 1), fall = meanOf(onEx) - meanOf(other), lift = -K.RATES_SHARE * fall, moved = [];
  for (let i = LAST - 251; i <= LAST; i++) { if (!exIx.some((k) => k > i - K.CREDIT_DAYS && k <= i) || same[i].raw == null) continue; const without = round1(Math.max(0, Math.min(100, K.TYPICAL_DAY + same[i].ptsRsi + pointsAt(K.CREDIT_PLACES, K.CREDIT_POINTS, same[i].creditOwn - lift)))); moved.push(Math.abs(without - same[i].reading)); }
  const observations = { latePayout: { exDates: late.length, meanPayoutPct: r2(late.reduce((p, x) => p + x.payoutPct, 0) / late.length), medianGap: r1(pctl(late.map((x) => x.gap), 50)), worstGap: r1(Math.max(...late.map((x) => x.gap))), last: late.slice(-3).map((x) => ({ date: x.date, with: x.with, without: x.without, gap: r1(x.gap) })), next: "the first trading day of next month" },
    treasuryPayout: { since: F.dates[i2016], payoutDays: onEx.length, meanFallOnThoseDaysPct: r3(fall), putsIntoCreditOwn: r3(lift), lastYear: { sessionsWithAPayoutDayInTheirTenSessions: moved.length, of: 252, medianReadingMoved: r1(pctl(moved, 50)), worstReadingMoved: r1(Math.max(...moved)) }, note: "the pane copies the tool here: both read the Treasury fund's plain close" } };

  /* ---------- today: the tool's own live read, and the script on the very same prices ---------- */
  let today = null;
  if (!NO_LIVE) { try {
    const API = "https://scintilla-massive-chart-api.fly.dev", getApi = async (p) => { const r = await fetch(API + p, { headers: { Origin: "https://scintillahub.ai" }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(p.split("?")[0] + " " + r.status); return r.json(); };
    const now = nyParts(), candles = await fetchDaily(getApi), live = await fetchLive(getApi), v = view({ base, candles, ...live, A });
    const S0 = alignBars(candles), S = withLive(S0, live.quotes, live.macro, sessionRanges(live.intraday, live.quotes?.SPY?.price_session_et)).S, G = { dates: S.dates, SPY: S.bars.SPY.c, QQQ: S.bars.QQQ.c, IEF: S.bars.IEF.c, HYG: S.bars.HYG.c };
    const chain = hygWithPayouts(S.dates, S.bars.HYG.c, base.hygPayouts || []).tr, a = scriptOn(K, G, chain).at(-1), b = scriptOn(K, G, adjustLikeTradingView(S.dates, S.bars.HYG.c, base.hygPayouts || [])).at(-1);
    /* the same day on the long history: the fixture's closes to 6 Oct, then the live bars after it */
    const extra = S.dates.map((d, i) => [d, i]).filter(([d]) => d > F.asOf), long = { dates: F.dates.concat(extra.map(([d]) => d)), SPY: F.SPY.concat(extra.map(([, i]) => G.SPY[i])), QQQ: F.QQQ.concat(extra.map(([, i]) => G.QQQ[i])), IEF: F.IEF.concat(extra.map(([, i]) => G.IEF[i])), HYG: F.HYG.concat(extra.map(([, i]) => G.HYG[i])) };
    const cRow = scriptOn(K, long, adjustLikeTradingView(long.dates, long.HYG, F.payouts.concat((base.hygPayouts || []).filter((p) => p[0] > F.payouts.at(-1)[0])))).at(-1), c = cRow;
    today = { readAt: now.date + " " + now.hms + " New York", phase: phaseOf(now), session: v.session, live: v.live, lastSettledBar: v.lastBar, missing: v.missing, prices: { SPY: G.SPY.at(-1), QQQ: G.QQQ.at(-1), HYG: G.HYG.at(-1), IEF: G.IEF.at(-1) },
      engine: { reading: v.reading.reading, invested: v.pie.invested, rsi: r2(v.inputs.rsi), creditOwn: r3(v.inputs.creditOwn), rsiPoints: r1(v.reading.parts.find((p) => p.key === "rsi").points), creditPoints: r1(v.reading.parts.find((p) => p.key === "creditOwn").points) },
      script: { reading: a.reading, invested: r2(a.invested), rsi: r2(a.rsiBoth), creditOwn: r3(a.creditOwn), rsiPoints: r1(a.ptsRsi), creditPoints: r1(a.ptsCredit), label: labelOf(a) },
      scriptTradingViewPayouts: { reading: b.reading, invested: r2(b.invested), creditOwn: r3(b.creditOwn) }, scriptOnTheLongHistory: { reading: c.reading, invested: r2(c.invested), bars: long.dates.length },
      gap: r1(Math.abs(v.reading.reading - a.reading)), gapTradingViewPayouts: r1(Math.abs(v.reading.reading - b.reading)), gapOnTheLongHistory: r1(Math.abs(v.reading.reading - c.reading)), gapInvested: r2(Math.abs(v.pie.invested - a.invested)), gapInvestedTradingViewPayouts: r2(Math.abs(v.pie.invested - b.invested)),
      /* kept so the row can be worked again without the network: the sessions the row was computed on */
      closes: { dates: S.dates, SPY: G.SPY, QQQ: G.QQQ, HYG: G.HYG, IEF: G.IEF } };
  } catch (e) { today = { failed: String(e && e.message || e) }; } }
  const before = fs.existsSync(OUT) ? J(OUT) : null, earlier = ((before && before.todayEarlier) || []).concat(before && before.today && before.today.engine ? [before.today] : []);
  if (NO_LIVE || !(today && today.engine)) { const keep = earlier.pop() || null; if (!today || !today.engine) today = keep || today; }   /* a run without the network keeps the last live row it has, with its own time on it */
  const todayEarlier = earlier.filter((t) => today && today.engine && t.session === today.session && t.readAt !== today.readAt).slice(-4).map((t) => ({ ...t, closes: undefined }));

  const worstNamed = Math.max(...rows.map((r) => r.gap), today && today.gap != null ? today.gap : 0), worstNamedTv = Math.max(...rows.map((r) => r.gapTradingViewPayouts), today && today.gapTradingViewPayouts != null ? today.gapTradingViewPayouts : 0);
  const proof = { what: "PN1 — the deployment pane's script against the allocation tool's engine", built: new Date().toISOString(), script: { file: path.relative(ROOT, PINE), codeHash: codeHash(fs.readFileSync(PINE, "utf8")), typicalDay: K.TYPICAL_DAY, held: K.heldPct, tactical: K.tacticalPct, funds: K.funds },
    fixture: { file: path.relative(ROOT, FIXTURE), sessions: F.dates.length, from: F.from, to: F.asOf }, tolerance: 1, rows, today, todayEarlier, namedDays: rows.length + (today && today.engine ? 1 : 0), worstNamed: { samePrices: worstNamed, tradingViewPayouts: worstNamedTv }, allWithinOnePoint: worstNamed <= 1 && worstNamedTv <= 1, history, sensitivity, observations };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(proof, null, 1));

  const pad = (s, n) => String(s).padStart(n), line = (r, d = r.date) => `${d}  ${pad(r.engine.reading, 6)} ${pad(r.script.reading, 7)} ${pad(r.gap, 5)}   ${pad(r.scriptTradingViewPayouts.reading, 7)} ${pad(r.gapTradingViewPayouts, 5)}   ${pad(r.engine.invested, 7)} ${pad(r.script.invested, 7)}   ${r.script.label}`;
  say("\nday          engine  script   gap   TV-payouts gap    invested: engine script   the label the pane shows");
  for (const r of rows) say(line(r), "·", r.kind); if (today && today.engine) say(line(today, today.session), "· today,", today.readAt, today.phase, today.live ? "(live prices)" : "(settled)", "· on the long history", today.scriptOnTheLongHistory.reading); else say("today: not read —", today && today.failed);
  say("\nevery day", history.from, "→", history.to, "\n  the engine's own prices:", JSON.stringify(history.samePrices), "\n  HYG's payouts TradingView's way:", JSON.stringify(history.tradingViewPayouts), "\n  credit's own move between the two ways:", JSON.stringify(history.creditOwnBetweenTheTwoWays), "\n  % invested, worst gap:", JSON.stringify(history.investedWorst), "\n  the last year:", JSON.stringify(history.lastYear.tradingViewPayouts));
  for (const t of todayEarlier) say(line(t, t.session), "· today, earlier:", t.readAt, t.phase, t.live ? "(live prices)" : "(settled)");
  say("\nif TradingView were late with a payout:", JSON.stringify(observations.latePayout), "\nthe Treasury fund on its payout days:", JSON.stringify(observations.treasuryPayout));
  say("\na cent on a close, on", sensitivity.on, JSON.stringify(sensitivity.cent), "· worst in the last year", sensitivity.centWorstYear, "on", sensitivity.centWorstYearOn, "(" + sensitivity.centWorstYearOf + ")");
  console.log(JSON.stringify({ ok: proof.allWithinOnePoint, namedDays: proof.namedDays, worstNamed: proof.worstNamed, today: today && today.engine ? { session: today.session, engine: today.engine.reading, script: today.script.reading } : (today && today.failed) || null, wrote: path.relative(ROOT, OUT) }));
  process.exit(proof.allWithinOnePoint ? 0 : 1); }
