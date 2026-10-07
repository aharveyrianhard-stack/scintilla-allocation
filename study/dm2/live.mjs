/* DM2 (7 Oct 2026) — the matrix as a live line. Turns live prices into the engine's inputs, reads the engine, and draws the line that sits
   beside the ladder in index.html (section 2). Reads only: three GETs to the chart API through the page's own rewrites
   (/candles-multi, /quotes, /macro) and one static file (study/dm2/data/dm2-live.json). No write, no key, no table.

   WHAT IS LIVE AND WHAT IS NOT
     live every read      SPY, QQQ, HYG, TLT, GLD (the chart API's /quotes) and the VIX (/macro)
     daily closes         the last 420 sessions of the same six (/candles-multi) — read on load, and again after the close
     static, dated        the model itself and HYG's payout list (dm2-live.json, rebuilt by scripts/dm2-build.mjs). After the last payout
                          the file knows, a payout the size of the last one is assumed on last year's dates and the line says so.

   WHEN IT READS (the brief: every 5 minutes during the session and once after the close)
     on load · every 5 minutes while the NYSE session is open (09:30–16:00 New York time, Monday–Friday) · once from 16:10 New York time
     Not while the tab is hidden (the default of the public data-fetching libraries SWR and TanStack Query: no background polling);
     a tab that comes back reads at once if a reading is due. Times are New York wall-clock from the browser's own time-zone table. */
import { deploy2, money, NAME, SAY, LADDER, MICRON_SHARE, MICRON_CAP, ord } from "./engine.mjs";

export const SYMBOLS = ["SPY", "QQQ", "HYG", "TLT", "GLD", "VIX"], BARS = 420;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

/* ---------- the clock ---------- */
export function etParts(now = new Date()) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value])); return { date: `${p.year}-${p.month}-${p.day}`, weekday: p.weekday, minutes: +p.hour * 60 + +p.minute, hhmm: `${p.hour}:${p.minute}` }; }
export const SESSION = { open: 9 * 60 + 30, close: 16 * 60, afterClose: 16 * 60 + 10, everyMin: 5 };
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
/* is a reading due? now and last are etParts(); last = the last successful read (null = never) */
export function shouldRefresh(now, last) {
  if (!last) return true; if (now.weekday === "Sat" || now.weekday === "Sun") return false;
  if (now.minutes >= SESSION.open && now.minutes < SESSION.close) return last.date !== now.date || last.minutes < SESSION.open || now.minutes - last.minutes >= SESSION.everyMin;
  if (now.minutes >= SESSION.afterClose) return last.date !== now.date || last.minutes < SESSION.afterClose;
  return false; }
export function nextRead(now) {
  const wk = !(now.weekday === "Sat" || now.weekday === "Sun"); if (wk && now.minutes >= SESSION.open && now.minutes < SESSION.close - SESSION.everyMin) return `next reading ${hhmm(now.minutes + SESSION.everyMin)} New York`;
  if (wk && now.minutes < SESSION.afterClose && now.minutes >= SESSION.close - SESSION.everyMin) return "next reading after the close, 16:10 New York"; if (wk && now.minutes < SESSION.open) return "next reading at the open, 09:30 New York"; return "next reading at the next open"; }

/* ---------- the arithmetic (the same as scripts/dm2-lib.mjs, on the short window a browser holds) ---------- */
export function rsiSeries(c) { const out = new Array(c.length).fill(null); let g = 0, l = 0, k = 0, prev = null; for (let i = 0; i < c.length; i++) { if (c[i] == null) continue; if (prev == null) { prev = c[i]; continue; } const d = c[i] - prev; prev = c[i]; const up = Math.max(d, 0), dn = Math.max(-d, 0); k++; if (k <= 14) { g += up / 14; l += dn / 14; if (k === 14) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } else { g = (g * 13 + up) / 14; l = (l * 13 + dn) / 14; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } } return out; }
export function smaAt(c, n, k) { if (k - n + 1 < 0) return null; let s = 0; for (let i = k - n + 1; i <= k; i++) { if (c[i] == null) return null; s += c[i]; } return s / n; }
/* the place of v[k] among the trailing year (252 sessions, itself included): the share strictly below it, 0–100 */
export function placeInYear(v, k, win = 252, need = 200) { if (v[k] == null) return null; let below = 0, n = 0; for (let i = Math.max(0, k - win + 1); i <= k; i++) { if (v[i] == null) continue; n++; if (v[i] < v[k]) below++; } return n >= need ? 100 * below / (n - 1 || 1) : null; }
/* HYG with its payouts added back, chained from the price-only closes: each session's return counts the payout that went ex that day.
   Beyond the last payout the file knows, last year's ex-dates are repeated with the last known amount (HYG pays monthly; no payout in
   January, two in December) — "estimated" counts how many such payouts were assumed. */
export function hygWithPayouts(dates, price, payouts) {
  const known = new Map(payouts), last = payouts[payouts.length - 1], proj = new Map(); let estimated = 0;
  if (last) for (const [d] of payouts) { const next = (+d.slice(0, 4) + 1) + d.slice(4); if (next <= last[0]) continue; const at = dates.find((x) => x >= next); if (at && !known.has(at) && !proj.has(at)) { proj.set(at, last[1]); estimated++; } }
  const tr = []; let prev = null, cur = null; for (let i = 0; i < dates.length; i++) { const p = price[i]; if (p == null) { tr.push(null); continue; } if (prev == null) cur = p; else cur *= (p + (known.get(dates[i]) ?? proj.get(dates[i]) ?? 0)) / prev; prev = p; tr.push(cur); }
  return { tr, estimated }; }

/* ---------- the chart API's answers → series on SPY's sessions ---------- */
export function alignCloses(candles) {
  const spy = (candles.SPY?.series || []).filter((b) => b && b.c != null); const dates = spy.map((b) => iso(b.t));
  const on = (sym) => { const m = new Map((candles[sym]?.series || []).filter((b) => b && b.c != null).map((b) => [iso(b.t), b.c])); let cur = null; return dates.map((d) => (m.has(d) ? (cur = m.get(d)) : cur)); };
  return { dates, SPY: spy.map((b) => b.c), QQQ: on("QQQ"), HYG: on("HYG"), TLT: on("TLT"), GLD: on("GLD"), VIX: on("VIX") }; }
/* a quote's price for the session: the session's own completed close once the provider has it (after 16:00), else the live price */
export const quotePrice = (q) => (!q ? null : q.today_session_close != null && q.today_session_close_state && q.today_session_close_state !== "ABSENT" ? q.today_session_close : q.price ?? null);
/* add today's live prices as one more bar when the session is newer than the last settled daily bar */
export function withLive(S, quotes, macro) {
  const q = quotes || {}, session = q.SPY?.price_session_et, spy = quotePrice(q.SPY); const lastBar = S.dates[S.dates.length - 1];
  if (!session || spy == null || session <= lastBar) return { S, live: false, session: lastBar, missing: [] };
  const vq = macro?.VIX?.quote, vix = vq && vq.price != null && (!vq.session_et || vq.session_et === session) ? vq.price : null; const missing = [];
  const pick = (sym, v) => { if (v == null) { missing.push(sym); return S[sym][S[sym].length - 1]; } return v; };
  const T = { dates: S.dates.concat(session) }; T.SPY = S.SPY.concat(spy); for (const sym of ["QQQ", "HYG", "TLT", "GLD"]) T[sym] = S[sym].concat(pick(sym, quotePrice(q[sym]))); T.VIX = S.VIX.concat(pick("VIX", vix));
  return { S: T, live: true, session, missing }; }

/* ---------- the engine's inputs at session k of the series ---------- */
export function inputsAt(S, k, base) {
  const c = S.SPY, s100 = smaAt(c, 100, k), q100 = smaAt(S.QQQ, 100, k), s200 = smaAt(c, 200, k), s200b = smaAt(c, 200, k - 21);
  const dSpy = s100 ? (c[k] / s100 - 1) * 100 : null, dQqq = q100 ? (S.QQQ[k] / q100 - 1) * 100 : null; const hyg = hygWithPayouts(S.dates.slice(0, k + 1), S.HYG.slice(0, k + 1), base.hygPayouts || []), h200 = smaAt(hyg.tr, 200, k);
  return { rsi: rsiSeries(c.slice(0, k + 1))[k], vixPct: placeInYear(S.VIX, k), trend: s200 && s200b ? (s200 / s200b - 1) * 100 : null, credit: h200 ? (hyg.tr[k] / h200 - 1) * 100 : null, break100: dSpy != null && dQqq != null ? Math.min(dSpy, dQqq) : null,
    vixLevel: S.VIX[k], bondsX: placeInYear(rsiSeries(S.TLT.slice(0, k + 1)), k), goldX: placeInYear(rsiSeries(S.GLD.slice(0, k + 1)), k), geiger: null,
    detail: { date: S.dates[k], spy: c[k], qqq: S.QQQ[k], vix: S.VIX[k], hyg: S.HYG[k], gld: S.GLD[k], tlt: S.TLT[k], spy100: s100, qqq100: q100, spy200: s200, breakSpy: dSpy, breakQqq: dQqq, weaker: dSpy != null && dQqq != null ? (dSpy <= dQqq ? "SPY" : "QQQ") : null, hygEstimatedPayouts: hyg.estimated } }; }

/* ---------- the reading ---------- */
export function readLive({ base, candles, quotes, macro }) {
  const S0 = alignCloses(candles); if (S0.dates.length < 260) throw new Error("the chart API served " + S0.dates.length + " daily bars; 260 are needed");
  const L = withLive(S0, quotes, macro), S = L.S, k = S.dates.length - 1; const inNow = inputsAt(S, k, base), in1 = inputsAt(S, k - 1, base), in2 = inputsAt(S, k - 2, base);
  const d2 = deploy2(in2, base.model), d1 = deploy2(in1, base.model), d = deploy2(inNow, base.model, [d1.pct, d2.pct]);
  /* the lights: each factor that did not earn its place, read as if it were counted (its own fitted curve and rungs) — shown, never added */
  const lights = (base.model.advisory || []).map((f) => { const z = inNow[f.key]; if (z == null || !isFinite(z)) return { key: f.key, missing: true };
    const alt = deploy2(inNow, { ...base.model, factors: [...base.model.factors, f], rungs: f.rungs || base.model.rungs }); const v = alt.votes.find((x) => x.key === f.key); return { key: f.key, value: z, words: (SAY[f.key] || (() => f.key))(z), points: v ? v.points : 0, wouldSay: alt.pct }; });
  return { session: L.session, live: L.live, missing: L.missing, lastBar: S0.dates[S0.dates.length - 1], inputs: inNow, reading: d, prior: [{ date: S.dates[k - 1], pct: d1.pct }, { date: S.dates[k - 2], pct: d2.pct }], lights, money: money(d.line), moneyNow: money(d.pct), modelAsOf: base.asOf, payoutsEstimated: inNow.detail.hygEstimatedPayouts }; }

/* ---------- the fetches (the page passes its own apiGet; a study page or a test passes its own) ---------- */
export async function fetchCandles(getApi) { const j = await getApi(`/candles-multi?symbols=${SYMBOLS.join(",")}&tf=1d&limit=${BARS}`); if (!j || !j.candles || !j.candles.SPY) throw new Error("no daily bars"); return j.candles; }
export async function fetchQuotes(getApi) { const [q, m] = await Promise.all([getApi(`/quotes?symbols=${SYMBOLS.filter((s) => s !== "VIX").join(",")}`), getApi("/macro").catch(() => null)]); return { quotes: (q && q.quotes && !Array.isArray(q.quotes) ? q.quotes : {}) || {}, macro: (m && m.macro) || null, generated: q && q.generated_utc }; }

/* ---------- the picture ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const CSS = `.dm2l{margin:16px 0 0;border-top:1px solid var(--line,#1c1c28);padding-top:12px;font-size:12px;line-height:1.6;color:var(--txt,#c8c8d2)}
.dm2l .hd{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;color:var(--dim,#8a8aa0);font-size:11px;letter-spacing:.08em}
.dm2l .hd b{color:var(--txt,#c8c8d2);font-weight:600;letter-spacing:.12em}
.dm2l .big{display:flex;flex-wrap:wrap;gap:8px 26px;align-items:flex-end;margin:8px 0 4px}
.dm2l .big .n{font-size:34px;font-weight:700;line-height:1}.dm2l .big .n small{font-size:11px;font-weight:400;color:var(--dim,#8a8aa0);letter-spacing:.04em}
.dm2l .big .s{font-size:12px;color:var(--dim,#8a8aa0)}.dm2l .big .s b{color:var(--txt,#c8c8d2);font-weight:600}
.dm2l .up{color:var(--green,#38e07b)}.dm2l .dn{color:var(--red,#ff5470)}
.dm2l .track{position:relative;height:66px;margin:6px 0 2px}
.dm2l .track .bar{position:absolute;left:0;right:0;top:20px;height:6px;border-radius:3px;background:#22222e}
.dm2l .track .fill{position:absolute;left:0;top:20px;height:6px;border-radius:3px;background:#8a8aa0}
.dm2l .track .rung{position:absolute;top:14px;width:1px;height:18px;background:#3a3a4a}
.dm2l .track .rl{position:absolute;top:34px;transform:translateX(-50%);font-size:11px;color:var(--dim,#8a8aa0)}.dm2l .track .rl.end{transform:translateX(-100%)}
.dm2l .track .mk{position:absolute;top:0;transform:translateX(-50%);font-size:11px;white-space:nowrap;color:var(--txt,#c8c8d2)}
.dm2l .track .mk i{display:block;width:2px;height:22px;margin:1px auto 0;background:#c8c8d2}
.dm2l .track .mk.r{transform:translateX(-100%)}.dm2l .track .mk.r i{margin-right:0}.dm2l .track .mk.l{transform:none}.dm2l .track .mk.l i{margin-left:0}
.dm2l .track .mk.lad{top:14px;color:var(--dim,#8a8aa0)}.dm2l .track .mk.lad i{background:#5a5a6c;width:1px;height:34px;margin-top:0;margin-bottom:1px}
.dm2l .track .mk.now i{background:#8a8aa0;width:1px}
.dm2l .cols{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:8px 30px;margin-top:8px}
.dm2l h4{margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:.14em;color:var(--dim,#8a8aa0)}
.dm2l ul{margin:0;padding:0;list-style:none}.dm2l li{padding:3px 0;border-bottom:1px solid #14141e}.dm2l li:last-child{border-bottom:0}
.dm2l li .pt{float:right;margin-left:10px;font-weight:600}
.dm2l .money{display:flex;height:16px;border-radius:4px;overflow:hidden;margin:6px 0 6px}
.dm2l .money span{display:block;height:100%}
.dm2l .cash{background:#3a3a4a}.dm2l .core{background:#8a8aa0}.dm2l .mu{background:#c8c8d2}
.dm2l .sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:8px;vertical-align:-1px}
.dm2l .lights li{color:var(--dim,#8a8aa0)}.dm2l .lights li b{color:var(--txt,#c8c8d2);font-weight:500}
.dm2l .warn{color:var(--dim,#8a8aa0);font-size:11px}
@media (max-width:760px){.dm2l .cols{grid-template-columns:minmax(0,1fr)}.dm2l .big .n{font-size:28px}.dm2l .track .mk{font-size:11px}}`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; export const day = (d) => +d.slice(8, 10) + " " + MON[+d.slice(5, 7) - 1], dayY = (d) => day(d) + " " + d.slice(0, 4);
const side = (p) => (p > 78 ? " r" : p < 22 ? " l" : "");   // a mark near either end keeps its label inside the track
const sign = (x) => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(0);
export function renderLiveLine(el, st) {
  if (!document.getElementById("dm2l-css")) { const s = document.createElement("style"); s.id = "dm2l-css"; s.textContent = CSS; document.head.appendChild(s); }
  if (st.error && !st.read) { el.innerHTML = `<div class="dm2l"><div class="hd"><b>THE MATRIX, LIVE</b><span>no reading: ${esc(st.error)}</span></div></div>`; return; }
  const R = st.read, d = R.reading, M = R.money, now = st.now, lad = st.ladderPct, x = (p) => Math.max(0, Math.min(100, p));
  const when = R.live ? `live at ${esc(st.readAt.hhmm)} New York, ${esc(dayY(R.session))}` : `at the close of ${esc(dayY(R.session))} (the market is not open)`;
  const delta = lad == null ? "" : d.line > lad + 0.5 ? `<span class="up">${Math.abs(d.line - lad).toFixed(0)} points above the ladder</span>` : d.line < lad - 0.5 ? `<span class="dn">${Math.abs(d.line - lad).toFixed(0)} points under the ladder</span>` : `<span>on the ladder's rung</span>`;
  const rows = [`<li>the matrix on its own — SPY's daily RSI ${R.inputs.rsi.toFixed(0)}, the VIX ${R.inputs.vixLevel.toFixed(1)} (the ${ord(R.inputs.vixPct)} percentile of its year)<span class="pt">${d.matrixPct.toFixed(0)}%</span></li>`]
    .concat(d.votes.map((v) => (v.missing ? `<li>${esc(NAME[v.key] || v.key)}: no reading<span class="pt">—</span></li>` : `<li>${esc((SAY[v.key] || (() => v.key))(v.z))}<span class="pt ${v.points > 0.5 ? "up" : v.points < -0.5 ? "dn" : ""}">${sign(v.points)}</span></li>`)))
    .concat([`<li>this minute's reading<span class="pt">${d.pct.toFixed(0)}%</span></li>`, `<li>the two closes before it — ${esc(day(R.prior[0].date))} ${R.prior[0].pct.toFixed(0)}%, ${esc(day(R.prior[1].date))} ${R.prior[1].pct.toFixed(0)}% — averaged in: the line<span class="pt">${d.line.toFixed(0)}%</span></li>`]);
  const lights = (R.lights || []).filter((l) => !l.missing && Math.abs(l.points) >= 3).sort((a, b) => a.points - b.points).map((l) => `<li><b>${esc(l.words)}</b> — counted, it would ${l.points < 0 ? "take " + Math.abs(l.points).toFixed(0) + " points off" : "add " + l.points.toFixed(0) + " points"}</li>`);
  const w = (v) => Math.max(0, v).toFixed(1) + "%";
  el.innerHTML = `<div class="dm2l" id="dm2l-root" data-line="${d.line}" data-reading="${d.pct}" data-session="${esc(R.session)}" data-live="${R.live ? 1 : 0}">
  <div class="hd"><b>THE MATRIX, LIVE</b><span>${when}</span><span>${esc(nextRead(now))}</span>${st.error ? `<span>last try failed (${esc(st.error)}) — showing the reading before it</span>` : ""}</div>
  <div class="big"><div class="n">${d.line.toFixed(0)}%<small> invested — the matrix's line</small></div><div class="s">this minute <b>${d.pct.toFixed(0)}%</b> · the ladder says <b>${lad == null ? "—" : lad.toFixed(0) + "%"}</b> · ${delta}</div></div>
  <div class="track"><div class="bar"></div><div class="fill" style="width:${x(d.line)}%"></div>${LADDER.map((r) => `<div class="rung" style="left:${r}%"></div><div class="rl${r >= 100 ? " end" : ""}" style="left:${r}%">${r}</div>`).join("")}
    ${lad == null ? "" : `<div class="mk lad${side(lad)}" style="left:${x(lad)}%"><i></i>the ladder ${lad.toFixed(0)}%</div>`}<div class="mk${side(d.line)}" style="left:${x(d.line)}%">the matrix ${d.line.toFixed(0)}%<i></i></div></div>
  <div class="cols"><div><h4>WHY — IN POINTS OF % INVESTED</h4><ul>${rows.join("")}</ul></div>
  <div><h4>THE MONEY THAT FOLLOWS — OF EVERY 100</h4><div class="money"><span class="mu" style="width:${w(M.micron)}"></span><span class="core" style="width:${w(M.core)}"></span><span class="cash" style="width:${w(M.cash)}"></span></div>
    <ul><li><i class="sw mu"></i>Micron = ${MICRON_SHARE} × ${d.line.toFixed(0)}%${M.micron >= MICRON_CAP - 1e-9 ? ", held at the " + MICRON_CAP + "% cap" : ""}<span class="pt">${M.micron.toFixed(1)}%</span></li><li><i class="sw core"></i>the rest of the core<span class="pt">${M.core.toFixed(1)}%</span></li><li><i class="sw cash"></i>cash<span class="pt">${M.cash.toFixed(1)}%</span></li></ul>
    ${lights.length ? `<h4 style="margin-top:10px">LIGHTS — SHOWN, NOT COUNTED</h4><ul class="lights">${lights.join("")}</ul>` : ""}</div></div>
  ${R.missing.length || R.payoutsEstimated ? `<div class="warn">${R.missing.length ? "no live price for " + esc(R.missing.join(", ")) + " — its last close is used. " : ""}${R.payoutsEstimated ? R.payoutsEstimated + " HYG payout" + (R.payoutsEstimated > 1 ? "s" : "") + " after " + esc(dayY(st.base.hygPayouts[st.base.hygPayouts.length - 1][0])) + " assumed at the last known size." : ""}</div>` : ""}</div>`; }

/* ---------- the loop ---------- */
export async function startLiveMatrix({ el, getApi, baseUrl = "study/dm2/data/dm2-live.json", ladderPct = () => null, clock = () => new Date(), tickMs = 30000, onRead = null }) {
  const st = { base: null, candles: null, candlesAt: null, read: null, readAt: null, error: null, now: etParts(clock()), ladderPct: null, reads: 0 }; if (typeof window !== "undefined") window.DM2_LIVE = st;
  const lad = () => { try { const v = ladderPct(); return v == null || !isFinite(v) ? null : +v; } catch (e) { return null; } };
  async function read() { const now = etParts(clock()); st.now = now; st.ladderPct = lad();
    try { if (!st.base) { const r = await fetch(baseUrl, { cache: "no-store" }); if (!r.ok) throw new Error("the model file " + r.status); st.base = await r.json(); }
      /* the daily bars: on load, on a new day, and once after the close (the settled bar) */
      if (!st.candles || st.candlesAt.date !== now.date || (now.minutes >= SESSION.afterClose && st.candlesAt.minutes < SESSION.afterClose)) { st.candles = await fetchCandles(getApi); st.candlesAt = now; }
      const { quotes, macro } = await fetchQuotes(getApi); st.read = readLive({ base: st.base, candles: st.candles, quotes, macro }); st.readAt = now; st.error = null; st.reads++; if (onRead) onRead(st);
    } catch (e) { st.error = String((e && e.message) || e); }
    renderLiveLine(el, st); if (typeof window !== "undefined") window.DM2_LIVE_READY = true; }
  await read();
  const tick = () => { if (typeof document !== "undefined" && document.hidden) return; const now = etParts(clock()); if (shouldRefresh(now, st.readAt)) read(); else { st.now = now; const lp = lad(); if (st.read && lp !== st.ladderPct) { st.ladderPct = lp; renderLiveLine(el, st); } } };
  const timer = setInterval(tick, tickMs); if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  return { state: st, read, stop: () => clearInterval(timer) }; }
