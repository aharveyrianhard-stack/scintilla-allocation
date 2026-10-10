/* DB1 (9 Oct 2026) — THE FIRST SCREEN: the rebalancing dashboard, live on the tool's own reading.
   Alan, 9 Oct, 09:50: "it needs to be wired to the live prices of whatever determines it — SPY, QQQ, VIX and HYG … I need to see it move
   throughout the day" · "pies would be a better look, and the total money invested should be the big item" · "a bit of a summary of how
   it recommends 78.4% — small, simple and executive" · "remove the you hold and such".

   WHAT IT READS   the live state of study/ds1/live.mjs (startDeploymentSystem hands it over after every drawing): view().reading is
                   version 3 of the market reading (DS3's recommended version, both its switches on, DS2's two on), read every minute while
                   New York trades; the number = the held part + the tactical part × the reading ÷ 100 (study/al9/chain.mjs numberAt),
                   on the dials in ASSUMPTIONS. The what-if chips are view().moves — the tool's own dip engine, credit selling as usual.
   WHAT IT NEVER READS   the account. Every dollar here is a percentage × the SIZE the viewer picks ($300K–$1.5M in $50K steps, $500K to
                   start, kept in this browser). No ticker, no level, no order, nothing held.
   THE ARITHMETIC (the review page's, deliverables/20261007/REBALANCING-DASHBOARD-REVIEW.html)
                   invested = number% × size · kept in cash = size − invested · conviction = balance% × invested · core = the rest
                   fully invested: conviction = balance% × size · core = the rest. Balance 0–100, 25 to start ("1 in 4"). */
import * as C from "../al9/chain.mjs";
import { pieSvg } from "../al9/panel.mjs";
import { ageWords, nextReadWords, phaseOf, day, dayY } from "../ds1/live.mjs";
import { howSteps, howHtml, HOW_CSS } from "../db2/how.mjs";   // DB2 (9 Oct, later): how it gets to the number, as a picture — the lines below are its captions

export const SIZE = { min: 300e3, max: 1.5e6, step: 50e3, def: 500e3 };
export const START = { size: SIZE.def, bal: 25 };
export const STORE = "db1.dashboard";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const trim = (s) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);
/* money, short: $0 · $392K · $1.2M (the review page's own) */
export const money = (x) => { if (x == null || !isFinite(x)) return "—"; const a = Math.abs(x), s = x < 0 ? "−" : "", kk = Math.round(a / 100 + 1e-6) / 10; return kk === 0 ? "$0" : kk >= 1000 ? s + "$" + trim((kk / 1000).toFixed(2)) + "M" : s + "$" + trim(kk.toFixed(1)) + "K"; };
export const pc = (x, d = 1) => (x == null || !isFinite(x) ? "—" : x.toFixed(d) + "%");
const f0 = (x) => (x == null || !isFinite(x) ? "—" : x.toFixed(0)), f1 = (x) => (x == null || !isFinite(x) ? "—" : x.toFixed(1));
const sg = (x, d = 0) => { if (x == null || !isFinite(x)) return "—"; const s = Math.abs(x).toFixed(d); return (+s === 0 ? "" : x > 0 ? "+" : "−") + s; };   // DB2: a move that rounds to nothing carries no sign — at the close of 9 Oct the credit line read "−0.0%"
const sgm = (m) => (m > 0 ? "+" : "−") + Math.abs(m) + "%";
export const okSize = (v) => typeof v === "number" && v >= SIZE.min && v <= SIZE.max && Math.abs(v / SIZE.step - Math.round(v / SIZE.step)) < 1e-9;

/* ---------- what the viewer picked, kept in this browser (never the account) ---------- */
export function loadState(store = typeof localStorage !== "undefined" ? localStorage : null) { const S = { ...START, last: null }; try { const o = JSON.parse((store && store.getItem(STORE)) || "null"); if (o) { if (okSize(o.size)) S.size = o.size; if (typeof o.bal === "number" && o.bal >= 0 && o.bal <= 100) S.bal = Math.round(o.bal); if (o.last && typeof o.last.number === "number") S.last = o.last; } } catch (e) { /* a broken saved value falls back to the start */ } return S; }
export const saveState = (S, store = typeof localStorage !== "undefined" ? localStorage : null) => { try { store && store.setItem(STORE, JSON.stringify({ size: S.size, bal: S.bal, last: S.last })); } catch (e) { /* private mode: the picks still work for this visit */ } };

/* ---------- the arithmetic, pure ---------- */
export function modelAt({ number, size, bal }) { const n = clamp(number, 0, 100), b = clamp(bal, 0, 100), invested = (n / 100) * size, cash = size - invested, conv = (b / 100) * invested, core = invested - conv, convFull = (b / 100) * size, coreFull = size - convFull;
  return { number: n, bal: b, size, invested, cash, cashPct: 100 - n, conv, core, convPct: (n * b) / 100, corePct: n - (n * b) / 100, convFull, coreFull }; }

/* the number at a market reading, on the tool's dials */
export const numberOf = (reading, A) => (reading == null ? null : C.numberAt(reading, A || C.DIALS));

/* ---------- the executive summary: how it gets to the number, in a few plain lines ---------- */
const rsiWord = (r) => (r >= 70 ? "stretched" : r >= 60 ? "a little stretched" : r >= 45 ? "middling" : r >= 35 ? "cooling off" : "washed out");
/* DB2: at = a what-if move that carries its own reading (view().moves[i], its r and since) — the same lines, made from that move's
   reading; without it, the lines of the reading now, exactly as DB1 wrote them. */
export function summaryLines(v, A, at = null) { if (!v || !v.reading) return []; const mv = at && at.r && at.movePct !== 0 ? at : null, R = mv ? mv.r : v.reading, n = numberOf(R.reading, A), lines = [];
  lines.push({ key: "sum", text: `${f0(+A.heldPct)}% always in + ${f0(+A.tacticalPct)}% × the market reading (${f0(R.reading)} of 100) = ${pc(n)}` });
  const rsi = R.parts.find((p) => p.key === "rsi"), cr = R.parts.find((p) => p.key === "creditOwn");
  const w2 = mv ? (R.v2 ? { cash: R.v2.cash, since: mv.since, fade: R.v2.fade, beforeCash: R.v2.beforeCash } : null) : v.v2, w3 = mv ? (v.v3 && R.v3 ? { on: v.v3.on, rules: v.v3.rules, ...R.v3 } : null) : v.v3;
  if (rsi && !rsi.missing) lines.push({ key: "rsi", text: `SPY and QQQ's RSI ${f0(rsi.value)}: ${rsiWord(rsi.value)}, ${sg(rsi.points)}`, points: rsi.points });
  if (cr && !cr.missing) { const own = !mv && v.facts && v.facts.credit ? v.facts.credit.own : cr.value; let t = `credit ${sg(own, 1)}% over ten sessions, ${sg(cr.points)}`;
    if (w3 && w3.raisedByTheRally) t += ` · treasuries rallied, so it is read on HYG alone`; else if (w2 && w2.fade < 0.995 && cr.fitted != null && cr.fitted < 0) t += ` · softened from ${sg(cr.fitted)}: the market is washed out`;
    lines.push({ key: "credit", text: t, points: cr.points }); }
  if (w3) { const vx = !mv && v.facts && v.facts.vix ? v.facts.vix.price : w3.vixClose, add = w3.vixAdd || 0, lo = w3.rules.lo, hi = w3.rules.hi;
    lines.push({ key: "vix", points: add, text: !w3.on.vix ? `the VIX at ${f1(vx)}: not counted (switched off)` : add <= 0 ? `the VIX at ${f1(vx)}: under your ${lo}, adds nothing` : w3.vixClose >= hi ? `the VIX at ${f1(vx)}: over your ${hi}, both hands, ${sg(add)}` : w3.vixClose >= lo ? `the VIX at ${f1(vx)}: over your ${lo}, ${sg(add)}` : `the VIX touched ${w3.vixHigh >= hi ? hi : lo} today (${f1(w3.vixHigh)}): ${sg(add)}` }); }
  /* DB2: version 3 hands the VIX's add to version 2 through the same slot as the parts the viewer switched on (study/ds3/number.mjs
     applyV3), so R.lightsCounted holds both. The VIX has its own line above: only what is left over is "the parts you switched on". */
  { const own = (R.lightsCounted || 0) - (R.v3 && R.v3.vixAdd ? R.v3.vixAdd : 0); if (Math.abs(own) >= 0.05) lines.push({ key: "lights", text: `${sg(own)} from the parts you switched on`, points: own }); }
  if (w2 && w2.cash) lines.push({ key: "cash", text: `cash freed since ${day(w2.since)} near the highs: the swing is halved (${f0(w2.beforeCash)} → ${f0(R.reading)})` });
  return lines; }

/* ---------- the pies: whole cake slices, labelled on leader lines with % and $ at the size ---------- */
export function pies(M, r) { const big = pieSvg([{ kind: "conviction", name: "conviction", acct: M.convPct, of: money(M.conv), frac: M.convPct }, { kind: "core", name: "core", acct: M.corePct, of: money(M.core), frac: M.corePct }, { kind: "cash", name: "kept in cash", acct: M.cashPct, of: money(M.cash), frac: M.cashPct }], { r, label: "the whole account at " + pc(M.number) });
  const full = pieSvg([{ kind: "conviction", name: "conviction", acct: M.bal, of: money(M.convFull), frac: M.bal }, { kind: "core", name: "core", acct: 100 - M.bal, of: money(M.coreFull), frac: 100 - M.bal }], { r: Math.round(r * 0.62), label: "fully invested" });
  return { big, full }; }

const CSS = `.db1{--conv:var(--gold,#ffd166);--core:var(--cyan,#00d4ff);--cashc:#1a1a28;--a9-ink:#0a0a0f;--dimc:var(--dim,#8a8aa0);max-width:1180px;margin:14px 0 0;display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:1.45;color:var(--txt,#e8e8f0)}
.db1 .card{background:var(--panel,#101018);border:1px solid var(--line,#1c1c28);border-radius:10px;padding:16px 18px;min-width:0}
.db1 .lab{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--dimc);font-weight:600}
.db1 .top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 16px}
.db1 .size{display:inline-flex;align-items:center;gap:8px}.db1 .size b{font-size:22px;font-weight:700;min-width:96px;text-align:center;font-variant-numeric:tabular-nums;text-shadow:0 0 14px rgba(232,232,240,.25)}
.db1 .step,.db1 .chip,.db1 .reset{appearance:none;-webkit-appearance:none;border:1px solid #2a2a3a;background:#14141f;color:var(--txt,#e8e8f0);font:inherit;border-radius:6px;cursor:pointer}
.db1 .step{width:32px;height:32px;font-size:18px;font-weight:700;line-height:1;padding:0}.db1 .step:disabled{opacity:.3;cursor:default}
.db1 .hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 28px;align-items:center}
.db1 .big{font-size:64px;font-weight:700;line-height:.95;letter-spacing:-.01em;font-variant-numeric:tabular-nums;text-shadow:0 0 22px rgba(255,209,102,.28)}
.db1 .big.old{opacity:.45;text-shadow:none}
.db1 .under{margin-top:8px;font-size:13px;color:var(--dimc)}.db1 .under b{color:var(--txt,#e8e8f0);font-weight:600}
.db1 .age{margin-top:6px;font-size:11.5px;color:var(--dimc);display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center}.db1 .age .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green,#38e07b);box-shadow:0 0 8px var(--green,#38e07b)}.db1 .age .dot.off{background:#3a3a4a;box-shadow:none}
.db1 .age .warn{color:var(--gold,#ffd166)}
.db1 .pies{display:flex;flex-wrap:wrap;gap:8px 28px;align-items:center;justify-content:center}
.db1 .pie{display:flex;flex-direction:column;align-items:center;gap:4px}.db1 .pie .t{font-size:11px;letter-spacing:.14em;color:var(--dimc);text-transform:uppercase}.db1 .pie svg{filter:drop-shadow(0 0 10px rgba(0,212,255,.18)) drop-shadow(0 0 10px rgba(255,209,102,.16));max-width:100%;height:auto}
.db1 .bal{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:10px 28px;align-items:center}
.db1 .ratio{font-size:34px;font-weight:700;line-height:1;margin:8px 0 10px;font-variant-numeric:tabular-nums}.db1 .ratio .c1{color:var(--conv);text-shadow:0 0 14px rgba(255,209,102,.35)}.db1 .ratio .c2{color:var(--core);text-shadow:0 0 14px rgba(0,212,255,.35)}.db1 .ratio small{font-size:12px;color:var(--dimc);margin-left:10px;letter-spacing:.06em}
.db1 input[type=range]{width:100%;height:28px;-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;margin:0}
.db1 input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:linear-gradient(90deg,var(--conv) 0 var(--p,25%),var(--core) var(--p,25%) 100%)}
.db1 input[type=range]::-moz-range-track{height:8px;border-radius:4px;background:linear-gradient(90deg,var(--conv) 0 var(--p,25%),var(--core) var(--p,25%) 100%)}
.db1 input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:var(--txt,#e8e8f0);margin-top:-7px;box-shadow:0 0 0 3px var(--bg,#0a0a0f),0 0 14px rgba(232,232,240,.35)}
.db1 input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:var(--txt,#e8e8f0);border:3px solid var(--bg,#0a0a0f)}
.db1 input:focus-visible,.db1 button:focus-visible{outline:2px solid var(--cyan,#00d4ff);outline-offset:2px}
.db1 .ends{display:flex;justify-content:space-between;color:var(--dimc);font-size:11px}
.db1 .split{display:grid;grid-template-columns:auto auto;gap:4px 18px;justify-content:start;color:var(--dimc);font-size:13px}.db1 .split b{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--txt,#e8e8f0)}.db1 .split .c1{color:var(--conv)}.db1 .split .c2{color:var(--core)}
.db1 .sum{margin:6px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--txt,#e8e8f0)}.db1 .sum li{display:flex;gap:10px;align-items:baseline}.db1 .sum li::before{content:"·";color:var(--dimc)}.db1 .sum li:first-child{font-weight:600}.db1 .sum li:first-child::before{content:"="}
.db1 .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.db1 .chip{padding:6px 10px;min-width:70px;display:flex;flex-direction:column;align-items:center;gap:1px}.db1 .chip .m{font-size:13px;font-weight:600}.db1 .chip .m.dn{color:var(--red,#ff5470)}.db1 .chip .m.up{color:var(--green,#38e07b)}.db1 .chip .n{font-size:12px;color:var(--dimc)}
.db1 .chip[aria-pressed="true"]{border-color:var(--cyan,#00d4ff);box-shadow:0 0 0 1px var(--cyan,#00d4ff) inset,0 0 12px rgba(0,212,255,.25)}
.db1 .foot{color:var(--dimc);font-size:12px;display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap}.db1 .reset{color:var(--dimc);font-size:11px;letter-spacing:.08em;padding:5px 9px}
@media (max-width:820px){.db1 .hero,.db1 .bal{grid-template-columns:minmax(0,1fr)}.db1 .big{font-size:48px}.db1 .ratio{font-size:28px}}
@media (max-width:480px){.db1 .big{font-size:42px}.db1 .size b{font-size:18px;min-width:80px}}`;
function ensureCss() { if (typeof document === "undefined" || document.getElementById("db1-css")) return; const s = document.createElement("style"); s.id = "db1-css"; s.textContent = CSS + HOW_CSS; document.head.appendChild(s); }

/* ---------- the whole screen as HTML (pure: the tests call it with a recorded state) ----------
   st = the live state (null before the first read) · S = { size, bal, last } · pick = the chip picked (a move, % — 0 is now) · width = px */
export function dashboardHtml(st, S, pick = 0, width = 1400) {
  const v = st && st.view, A = (st && st.A) || C.DIALS, narrow = width < 700, r = narrow ? 74 : 104;
  const mv = v ? (v.moves || []).find((m) => Math.abs(m.movePct - pick) < 1e-9) || null : null, atMove = mv && mv.movePct !== 0;
  const readingNow = v ? v.reading.reading : null, reading = mv ? mv.reading : readingNow, number = reading != null ? numberOf(reading, A) : S.last ? S.last.number : null;
  const M = number != null ? modelAt({ number, size: S.size, bal: S.bal }) : null, P = M ? pies(M, r) : null, old = !v && !!S.last;
  const ph = st && st.now ? phaseOf(st.now) : null, liveNow = v && v.live && ph === "open" && !st.error;
  const marks = []; if (st && st.error) marks.push(`last try failed — showing the reading before it`); if (v && v.missing && v.missing.length) marks.push(`no live price for ${esc(v.missing.join(", "))}: the close of ${esc(day(v.lastBar))} is used`);
  if (v && !v.v3) marks.push(v.v2 ? "version 3's rule file did not load — this is version 2's number" : "the rule files did not load — this is version 1's number");
  const when = !v ? (old ? `last read ${esc(S.last.readAt || "")}${S.last.date ? " on " + esc(dayY(S.last.date)) : ""} · reading live prices…` : "reading live prices…") : v.live ? `${ph === "open" ? "live" : esc(ph || "")} · the session of ${esc(dayY(v.session))}` : `at the close of ${esc(dayY(v.session))} · New York is not trading`;
  /* DB2: the fourth card follows the chip — its lines and its picture are that move's own (moves carry their reading); a state without it keeps the lines of now */
  const chipHas = !!(atMove && mv.r), how = v ? (chipHas ? { r: mv.r, number } : { r: v.reading, number: numberOf(readingNow, A) }) : null;
  const typical = v && v.v2 && v.v2.typical != null ? v.v2.typical : st && st.base && st.base.model && st.base.model.scale ? 50 - st.base.model.scale.gain * st.base.model.scale.centre : null;
  const lines = v ? summaryLines(v, A, chipHas ? mv : null) : [], H = how ? howSteps({ ...how, A, typical, lines }) : null, chips = v ? v.moves.map((m) => `<button type="button" class="chip" data-move="${m.movePct}" aria-pressed="${Math.abs(m.movePct - pick) < 1e-9}" title="SPY ${f1(m.spy)} · QQQ ${f1(m.qqq)} · the VIX ${f1(m.vix)} · market reading ${f0(m.reading)}"><span class="m ${m.movePct < 0 ? "dn" : m.movePct > 0 ? "up" : ""}">${m.movePct === 0 ? "now" : sgm(m.movePct)}</span><span class="n">${pc(numberOf(m.reading, A))}</span></button>`).join("") : `<span class="lab">waiting for the first read</span>`;
  return `<div class="db1" id="db1-root"${number != null ? ` data-number="${number.toFixed(2)}"` : ""}${reading != null ? ` data-reading="${reading}"` : ""} data-move="${pick}" data-size="${S.size}" data-bal="${S.bal}" data-live="${liveNow ? 1 : 0}"${v ? ` data-version="${v.v3 ? 3 : v.v2 ? 2 : 1}"` : ""}>
  <div class="top"><span class="lab">The rebalancing dashboard · live on SPY, QQQ, the VIX, HYG and treasuries</span>
    <span class="size" role="group" aria-label="Size of the account the dollars are shown at"><span class="lab">Size</span><button type="button" class="step" data-size="-1" aria-label="Size down by $50K"${S.size <= SIZE.min ? " disabled" : ""}>−</button><b data-size-val>${money(S.size)}</b><button type="button" class="step" data-size="1" aria-label="Size up by $50K"${S.size >= SIZE.max ? " disabled" : ""}>+</button></span></div>
  <section class="card" aria-label="Total money invested">
    <div class="hero"><div>
      <div class="lab">Total money invested${atMove ? ` · if SPY &amp; QQQ move ${sgm(mv.movePct)}` : ""}</div>
      <div class="big${old ? " old" : ""}" data-invested>${M ? money(M.invested) : "—"}</div>
      <div class="under">${M ? `<b>${pc(M.number)}</b> of ${money(M.size)} · <b>${pc(M.cashPct)}</b> kept in cash, ${money(M.cash)}` : "the first read of the market is on its way"}</div>
      <div class="age"><span class="dot${liveNow ? "" : " off"}"></span><span>${when}</span><span data-ds1-age>${st ? esc(ageWords(st)) : ""}</span>${st && st.now ? `<span>${esc(nextReadWords(st.now))}</span>` : ""}${marks.map((m) => `<span class="warn">${m}</span>`).join("")}</div>
    </div>
    <div class="pies">${P ? `<div class="pie" data-pie="account"><div class="t">the whole account at ${pc(M.number)}</div>${P.big}</div><div class="pie" data-pie="full"><div class="t">fully invested</div>${P.full}</div>` : ""}</div></div>
  </section>
  <section class="card bal" aria-label="The balance between conviction and core">
    <div><div class="lab">Conviction ↔ Core · the balance of what is invested</div>
      <div class="ratio"><span class="c1">${S.bal}</span> : <span class="c2">${100 - S.bal}</span><small>${S.bal === 25 ? "1 in 4" : S.bal === 50 ? "even" : S.bal === 0 ? "all core" : S.bal === 100 ? "all conviction" : ""}</small></div>
      <input type="range" data-bal min="0" max="100" step="1" value="${S.bal}" style="--p:${S.bal}%" aria-label="Conviction share of what is invested">
      <div class="ends"><span>all core</span><span>50 : 50</span><span>all conviction</span></div></div>
    <div class="split"><span class="lab">Conviction</span><span class="lab">Core</span><b class="c1">${M ? money(M.conv) : "—"}</b><b class="c2">${M ? money(M.core) : "—"}</b><span>fully invested ${M ? money(M.convFull) : "—"}</span><span>fully invested ${M ? money(M.coreFull) : "—"}</span></div>
  </section>
  <section class="card" aria-label="How it gets to the number">
    <div class="lab">How it gets to ${chipHas ? `${pc(number)} · if SPY &amp; QQQ move ${sgm(mv.movePct)}` : `${readingNow != null ? pc(numberOf(readingNow, A)) : "the number"}${atMove ? ` now · at ${sgm(mv.movePct)} the market reading is ${f0(mv.reading)}, so ${pc(numberOf(mv.reading, A))}` : ""}`}</div>
    ${lines.length ? `<ul class="sum"><li data-line="sum">${esc(lines[0].text)}</li></ul>${howHtml(H, { narrow })}` : `<div class="under">the first read of the market is on its way</div>`}
  </section>
  <section class="card" aria-label="What if SPY and QQQ move"><div class="lab">If SPY &amp; QQQ move together · today's engine, credit selling as it usually does</div><div class="chips">${chips}</div></section>
  <div class="foot"><span>No prices, levels or orders here — the long version below has them.</span><button type="button" class="reset" data-reset>Reset</button></div>
</div>`; }

/* ---------- mount it: draws at once from what the browser remembers, then after every drawing of the live module ---------- */
export function mountDashboard(host, { store = typeof localStorage !== "undefined" ? localStorage : null } = {}) {
  ensureCss(); const S = loadState(store); let st = null, pick = 0;
  const draw = () => { host.innerHTML = dashboardHtml(st, S, pick, host.clientWidth || (typeof innerWidth !== "undefined" ? innerWidth : 1400)); if (typeof window !== "undefined") window.DB1_READY = true; };
  host.addEventListener("click", (ev) => { const t = ev.target.closest && ev.target.closest("[data-size],[data-move],[data-reset]"); if (!t) return;
    if (t.dataset.size) S.size = clamp(S.size + (+t.dataset.size) * SIZE.step, SIZE.min, SIZE.max); else if (t.dataset.move != null) pick = +t.dataset.move; else if (t.dataset.reset != null) { S.size = START.size; S.bal = START.bal; pick = 0; }
    saveState(S, store); draw(); });
  host.addEventListener("input", (ev) => { const t = ev.target; if (!t || t.dataset.bal == null) return; S.bal = clamp(Math.round(+t.value), 0, 100); saveState(S, store);
    /* the slider keeps the caret: only the figures move while it is dragged */
    const M = st && st.view ? modelAt({ number: numberOf((st.view.moves.find((m) => Math.abs(m.movePct - pick) < 1e-9) || st.view).reading, st.A), size: S.size, bal: S.bal }) : null; t.style.setProperty("--p", S.bal + "%");
    const q = (s) => host.querySelector(s); if (q(".ratio")) q(".ratio").innerHTML = `<span class="c1">${S.bal}</span> : <span class="c2">${100 - S.bal}</span><small>${S.bal === 25 ? "1 in 4" : S.bal === 50 ? "even" : S.bal === 0 ? "all core" : S.bal === 100 ? "all conviction" : ""}</small>`;
    if (M) { const sp = q(".split"); if (sp) sp.innerHTML = `<span class="lab">Conviction</span><span class="lab">Core</span><b class="c1">${money(M.conv)}</b><b class="c2">${money(M.core)}</b><span>fully invested ${money(M.convFull)}</span><span>fully invested ${money(M.coreFull)}</span>`; const P = pies(M, (host.clientWidth || 1400) < 700 ? 74 : 104), a = q('[data-pie="account"]'), f = q('[data-pie="full"]'); if (a) a.innerHTML = `<div class="t">the whole account at ${pc(M.number)}</div>${P.big}`; if (f) f.innerHTML = `<div class="t">fully invested</div>${P.full}`; } });
  host.addEventListener("change", (ev) => { if (ev.target && ev.target.dataset.bal != null) draw(); });
  if (typeof window !== "undefined") { let timer = null, w = host.clientWidth; window.addEventListener("resize", () => { clearTimeout(timer); timer = setTimeout(() => { if (host.clientWidth !== w) { w = host.clientWidth; draw(); } }, 150); }); }
  draw();
  /* the live module hands its state over after every drawing: the number, the age and the chips follow it; what the viewer picked stays */
  const update = (state) => { st = state; if (st && st.view && st.readAt) { S.last = { number: +numberOf(st.view.reading.reading, st.A).toFixed(2), reading: st.view.reading.reading, readAt: st.readAt.hms.slice(0, 5) + " New York", date: st.view.session }; saveState(S, store); } draw(); };
  const api = { update, state: S, get pick() { return pick; }, redraw: draw, modelAt, summaryLines }; if (typeof window !== "undefined") window.DB1 = api; return api; }
