/* DS3 (8 Oct 2026) — writes the page for Alan, study/ds3/DS3.html, from the study's own files. No network, no key, no table.
     node scripts/ds3-build-page.mjs ["pictures taken …"]
   Every figure on the page is read from study/ds3/data/ds3.json (the study), ds3-live.json (the rules), ds3-pane-proof.json (the pane's
   proof) and ds3-morning.json (this morning's stored reads); none is typed. The page opens straight from disk: its data and its drawing
   code are inside the one file. The look is DS2's page (the same styles), so the two read as one series. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const S = J("study/ds3/data/ds3.json"), LIVE = J("study/ds3/data/ds3-live.json"), P = J("study/ds3/data/ds3-pane-proof.json"), M = J("study/ds3/data/ds3-morning.json"), R = LIVE.rules;
const SHOTS = fs.existsSync(path.join(ROOT, "study/ds3/data/ds3-shots.json")) ? J("study/ds3/data/ds3-shots.json") : null, STAMP = process.argv[2] || (SHOTS ? SHOTS.stamp : "pictures not taken yet");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], day = (d) => `${+d.slice(8)} ${MON[+d.slice(5, 7) - 1]}`, dayY = (d) => `${day(d)} ${d.slice(0, 4)}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const f1 = (x) => (x == null ? "—" : (+x).toFixed(1)), f2 = (x) => (x == null ? "—" : (+x).toFixed(2)), f0 = (x) => (x == null ? "—" : (+x).toFixed(0)), sg = (x, d = 1) => { if (x == null) return "—"; const a = Math.abs(x).toFixed(d); return (+a === 0 ? "" : x > 0 ? "+" : "−") + a; }, pct = (x, d = 1) => (x == null ? "—" : (x < 0 ? "−" : "") + Math.abs(+x).toFixed(d) + "%"), x3 = (x) => (x == null ? "—" : (+x).toFixed(2) + "×"), sh = (x) => (x == null ? "—" : (x * 100).toFixed(0) + "%"), n0 = (x) => (+x).toLocaleString("en-US");
const tbl = (head, rows, cls = "") => `<div class="wrap"><table class="${cls}"><tr>${head.map((h) => `<th${h.n ? ' class="n"' : ""}>${h.t ?? h}</th>`).join("")}</tr>${rows.map((r) => `<tr${r.cls ? ` class="${r.cls}"` : ""}>${(r.c || r).map((c, i) => `<td${head[i] && head[i].n ? ' class="n"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
const N = (t) => ({ t, n: 1 });
const ALL = [...S.candidates, ...S.combos], C = Object.fromEntries(ALL.map((c) => [c.key, c])), V1 = S.version1, V2 = S.version2, REC = S.recommended, A = REC.after, B = REC.before, rec = C[REC.key], named = Object.fromEntries(REC.named.map((n) => [n.d, n])), W = S.windows;
const up = (a, b) => sg(((a / b) - 1) * 100, 1) + "%", ord = (x) => { const n = Math.round(x), t = n % 100; return n + (t >= 11 && t <= 13 ? "th" : ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"][n % 10]); };

/* ---------- a candidate's verdict in plain words, from its own numbers ---------- */
function verdictOf(c) { const [l25, l26, t25] = c.datesUp, worse = [[l25, "the late-March 2025 low"], [l26, "the March 2026 low"], [t25, "December 2025"]].filter(([v]) => v <= -1).map(([v, w]) => `${w} ${f1(Math.abs(v))} ${w === "December 2025" ? "heavier" : "lower"}`), failed = [!c.bar.timing && "timing", !c.bar.worstFall && "the worst fall", !c.bar.onePct && "the 1% bar"].filter(Boolean);
  if (c.passWhole && c.passDates) return `<b class="in">passes both</b>`;
  if (c.passWhole && worse.length) return `passes the whole period · <b>one of his dates is worse</b>: ${worse.join(", ")}`;
  if (c.passWhole) return `costs nothing · moves none of the three scored dates by a point`;
  if (c.passDates) return `helps his dates · fails the whole period on ${failed.join(" and ")}`;
  return `fails both` + (worse.length ? ` (${worse.join(", ")})` : ""); }
const NAMES = { e1c: "measured · the VIX's close, placed in its own year", e1h: "measured · the VIX's intraday high, placed in its own year", e1: "measured · the two, half each", e1u: "measured · the two, held so that a higher VIX never reads worse", e1a: "measured · the same held curve as an add-on (nothing at or under the middle of its year)",
  e2: "his steps · a close at 20 adds 10 points of market reading, at 23 adds 20; a touch counts half", e2x: "his steps · twice the size (20 and 40)", e2m: "his steps · sizes measured on the fitted years", e2p: "his steps · asked by place: the 80th and the 90th place of the VIX's own year",
  b50: "under the 50-day · a third part", b100: "under the 100-day · a third part", b: "under the two, averaged · a third part", b100a: "under the 100-day · an add-on (the form the last round measured)", ba: "under the two, averaged · an add-on",
  f1: "the treasury half taken off only when treasuries fell (HYG's move alone when they rallied)", f1x: "when treasuries rallied, the higher of the two credit readings counts (never lower than today's)", f1r: "the same as the first line, with the credit curve measured again on it", f2: "a treasury rally as a fear add · a third part", f2a: "a treasury rally as a fear add · an add-on", f3: "treasuries rallied and HYG held → credit may add, not subtract" };
const SHORT = { e1c: "measured: the close's place", e1h: "measured: the high's place", e1: "measured: both, half each", e1u: "measured: held", e1a: "measured: held, add-on", e2: "<b>his steps</b>", e2x: "his steps, twice the size", e2m: "his steps, measured sizes", e2p: "his steps, by place" };
const candRow = (c, name = NAMES[c.key] || c.key) => { const d = c.dates, p = c.payoff; return { cls: c.key === REC.key ? "ok rec" : c.passWhole && c.passDates ? "ok" : "", c: [`<b>${esc(name)}</b>${c.addedAfterFirstRun ? ` <span class="tag">added after the first run</span>` : ""}`, `${f1(d.L25)} · ${f1(d.L25low)}`, `${f1(d.L26)} · ${f1(d.L26low)}`, sg(d.CUT), f1(d.T25), f2(d.MOVE), x3(p.became), pct(p.worstFall), pct(p.invested), f2(p.timing) + ` <span class="dim">(${sg(p.timing - V2.payoff.timing, 3)})</span>`, sg(c.bar.afterCostPct, 1) + "%", sg(c.bar.y0409Pct, 1) + "%", verdictOf(c)] }; };
const baseRow = (v, name) => ({ cls: "base", c: [`<b>${name}</b>`, `${f1(v.dates.L25)} · ${f1(v.dates.L25low)}`, `${f1(v.dates.L26)} · ${f1(v.dates.L26low)}`, sg(v.dates.CUT), f1(v.dates.T25), f2(v.dates.MOVE), x3(v.payoff.became), pct(v.payoff.worstFall), pct(v.payoff.invested), f2(v.payoff.timing), "", "", ""] });
const candHead = ["the change, alone on version 2", N("late-Mar 2025 low<br>five sessions · the low"), N("Mar 2026 low<br>five sessions · the low"), N("26 → 30 Mar"), N("Dec 2025"), N("moves a day"), N("1 became"), N("worst fall"), N("invested on average"), N("timing"), N("end result after a charge, against version 2"), N("through 2008, against version 2"), "verdict"];
const fam = (f) => S.candidates.filter((c) => c.family === f || (f === "e" && (c.family === "e1" || c.family === "e2")));
const scoreTable = (list) => tbl(candHead, [baseRow(V2, "version 2 — where this round starts"), ...list.map((c) => candRow(c))]);

/* ---------- the figures the words lean on ---------- */
const VE = S.evidence.vix, vAt = (name) => VE.all.find((r) => r.name === name), v23 = vAt("a close at 23 or more"), v20 = vAt("a close from 20 to 23"), vTouch = vAt("touched 20, closed under it"), vNone = vAt("never reached 20"), any = VE.any, LV = VE.levelsNow;
const FE = S.evidence.fear, fOnly = FE.all[0], fOwn = FE.all[1], F1D = FE.f1Days.everyDay, F1D17 = FE.f1Days.fittedTo2017, PT = Object.fromEntries(S.evidence.partTests.map((p) => [p.key, p]));
const fits = S.firm.otherFits, fitOf = (k, name) => fits[k].rows.find((r) => r.name === name), yrs = S.firm.years, early = S.firm.earlier, earlyOf = (k, name) => early[k].rows.find((r) => r.name === name);
const sens = S.firm.sensitivity, m0 = M.reads[0], m1 = M.reads[M.reads.length - 1], rowM = (r, k) => r.rows.find((x) => x.key === k), saw = M.asAlanSawIt;
const TIMES = { 2: "twice", 3: "three times", 4: "four times" }, hm = (r) => r.readAt.slice(11, 16), hyg0841 = saw.creditOwn[1] - saw.ratesLeg[1], hygDay0841 = hyg0841 - m0.inputs[0].hyg10 - m0.roll.ofWhich.hygWindow;
const st = REC.stretches, VS = REC.vixStretches, vsDone = VS.filter((x) => x.after60 != null), vsUp = vsDone.filter((x) => x.after60 > 0), vsBad = vsDone.filter((x) => x.worstAfter <= -10), odds = REC.odds, o80 = (o) => o.find((b) => b.lo === 80);
const hair = P.history.aHairOnAThreshold.nudges, vixHair = hair.filter((h) => h.state === "what the VIX adds"), cashHair = hair.filter((h) => h.state === "cash raised"), tv = P.history.tradingViewPayouts, proofToday = P.today.filter((t) => t.engine);
const yearsBetter = yrs.filter((y) => y[REC.key] > y["version 2"] + 0.049).length, yearsWorse = yrs.filter((y) => y[REC.key] < y["version 2"] - 0.049);
for (const k of Object.keys(fits)) if (!(fitOf(k, REC.key).became > fitOf(k, "version 2").became)) throw new Error("the page says version 3 was ahead every way the test was run; it was not in: " + fits[k].label);
for (const k of Object.keys(fits)) for (const n of ["e2", "f1x", "f2a"]) if (!(fitOf(k, n).became > fitOf(k, "version 2").became)) throw new Error("the page says " + n + " was ahead every way the test was run; it was not in: " + fits[k].label);
if (!(Math.min(...sens.filter((s) => /^levels/.test(s.what)).map((s) => s.became)) > V2.payoff.became)) throw new Error("the page says the VIX steps were ahead at every level they were moved to; they were not");
if (PT.vixStep.verdict !== "vote" || PT.vixStepFree.verdict !== "vote") throw new Error("the page says Alan's steps earn a vote held and free; they do not");
if (PT.tRally.verdict !== "vote" || PT.tRallyFree.verdict !== "light") throw new Error("the page says a treasury rally earns a vote only while its curve is held; the data says otherwise");
const PIC = (file, cap, cls = "") => `<figure class="${cls}"><img src="pictures/${file}" alt="${esc(cap)}" loading="eager"><figcaption>${cap}</figcaption></figure>`, hasPic = (f) => fs.existsSync(path.join(ROOT, "study/ds3/pictures", f));
const PAGE_DATA = { series: S.series, long: S.long, lo: R.vixLo, hi: R.vixHi, marks: [["2025-03-28", "28 Mar 25"], ["2025-04-08", "8 Apr 25"], ["2025-07-21", "21 Jul 25"], ["2025-12-11", "Dec 25"], [W.TOP, "27 Jan 26"], ["2026-02-23", "23 Feb 26"], ["2026-03-30", "30 Mar 26"]] };
const WHY = { "2025-07-21": "the number fell and the market went on rising", "2025-09-22": "the same", "2026-02-23": "the first day you named to the last round", "2026-03-26": "two sessions before the low", "2026-07-29": "a day you named on 7 Oct", "2026-09-16": "a day you called a low" }, noteOf = (n) => WHY[n.d] || n.what;
const stretchRows = (m) => [["today's rule", m.today], ["version 2", m.version2], ["version 3", m.version3]].map(([n, x]) => [n, `${f1(x.from)} → ${f1(x.to)}`, `<b>${sg(x.d)}</b>`, sg(x.byRsi), sg(x.byCredit), sg(x.byVix)]), stretchHead = ["", N("the number"), N("change"), N("of it: the RSI part"), N("the credit part"), N("the VIX")];
const legs = (m) => `HYG's ten-session move ${sg(m.legs[0].hyg10, 2)}% → ${sg(m.legs[1].hyg10, 2)}% · treasuries' ten-session move ${sg(m.legs[0].ief10, 2)}% → ${sg(m.legs[1].ief10, 2)}% · the VIX closed ${f2(m.legs[0].vixClose)} → ${f2(m.legs[1].vixClose)}`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Number, Round 3</title>
<style>
:root{--bg:#0a0a0f;--panel:#101018;--surf:#0d0d15;--line:#1c1c28;--line2:#262636;--txt:#e8e8f0;--dim:#9a9ab0;--cyan:#00d4ff;--gold:#ffd166;--mid:#c8c8d8;--after:#2196b8;--before:#b38d3c}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:13px;padding:22px 16px 60px;overflow-x:hidden}
@media(min-width:900px){body{padding:26px 30px 60px}}
h1{font-size:19px;letter-spacing:.24em;font-weight:600;margin:0;line-height:1.4}h1 .dot{color:var(--cyan)}.sub{color:var(--dim);margin-top:4px;font-size:11px;letter-spacing:.08em;line-height:1.5}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin-top:16px;min-width:0}
.panel h2{font-size:12px;letter-spacing:.2em;color:var(--cyan);margin:0 0 10px;font-weight:600;line-height:1.5}.panel h3{font-size:12px;letter-spacing:.12em;color:var(--txt);margin:18px 0 6px;font-weight:600;line-height:1.5}
p,li{line-height:1.65;max-width:1050px}p{margin:8px 0}ul,ol{margin:6px 0;padding-left:20px}li{margin:6px 0}b{font-weight:600}q{color:var(--mid)}
table{border-collapse:collapse;width:100%;font-size:12px}th{color:var(--dim);text-align:left;font-weight:400;font-size:11px;letter-spacing:.04em;padding:6px 7px;border-bottom:1px solid var(--line2);vertical-align:bottom;line-height:1.4}
td{padding:6px 7px;border-bottom:1px solid #14141e;line-height:1.5;vertical-align:top}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}td.n{white-space:nowrap}.wrap{overflow-x:auto;max-width:100%}.dim{color:var(--dim)}
tr.base td{color:var(--mid)}tr.ok td:first-child{border-left:2px solid var(--after)}tr.rec td{background:#0f1620}b.in{color:var(--txt)}.tag{display:inline-block;font-size:11px;color:var(--gold);border:1px solid #4a4326;border-radius:4px;padding:0 5px;margin-left:4px;white-space:nowrap}
table.score td:last-child{white-space:normal;min-width:190px}table.score td:first-child{min-width:230px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px;margin-top:4px}
.tile{border:1px solid var(--line);border-radius:8px;padding:12px 14px;background:var(--surf);min-width:0}.tile .l{font-size:11px;letter-spacing:.12em;color:var(--dim);text-transform:uppercase;line-height:1.5}.tile .v{font-size:24px;font-weight:600;margin-top:6px;line-height:1.2}.tile .v small{font-size:13px;color:var(--dim);font-weight:400}.tile .s{font-size:11px;color:var(--dim);margin-top:5px;line-height:1.5}
.tile.main{border-color:#5c5c74}.tile.main .v{font-size:34px}
.fig{background:var(--surf);border:1px solid var(--line);border-radius:8px;padding:10px 12px 8px;min-width:0}.fig .bar{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:space-between;margin-bottom:6px}
.fig .lg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;color:var(--mid);line-height:1.6}.fig .lg i{display:inline-block;vertical-align:middle;margin-right:5px}
.fig button{background:none;border:1px solid var(--line);color:var(--dim);border-radius:5px;font:inherit;font-size:11px;padding:3px 9px;cursor:pointer;letter-spacing:.06em}.fig button.on{color:var(--txt);border-color:#6a6a80}
.fig svg{display:block;max-width:100%;cursor:crosshair;touch-action:pan-y}.fig svg text{font-family:inherit}.fig .read{min-height:18px;margin:5px 0 0;font-size:11.5px;color:var(--dim);font-variant-numeric:tabular-nums;line-height:1.5}.fig .read b{color:var(--txt);font-weight:600}
.cap{font-size:11px;color:var(--dim);margin-top:6px;line-height:1.55}
.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr));gap:16px}.shots figure{margin:0;min-width:0}.shots img{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:6px}.shots figcaption{font-size:11px;color:var(--dim);margin-top:5px;line-height:1.55}
.shots figure.own img{width:auto;max-width:100%}.shots figure.wide{grid-column:1/-1}.shots figure.phone img{width:auto;max-width:100%;max-height:820px;margin:0 auto}
.rule{border-left:2px solid var(--after);padding:2px 0 2px 12px;margin:10px 0}.warn{border-left:2px solid var(--gold);padding:2px 0 2px 12px;margin:10px 0}
details.sc-pagespecs{margin-top:22px;border:1px solid var(--line);border-radius:10px;padding:12px 16px;background:var(--panel)}details.sc-pagespecs summary{cursor:pointer;font-size:12px;letter-spacing:.2em;color:var(--dim);font-weight:600}details.sc-pagespecs p{color:var(--mid);font-size:12px}
@media(max-width:700px){.panel{padding:14px 12px}th,td{padding:6px 5px}}
</style></head><body>
<h1>THE NUMBER<span class="dot"> ·</span> ROUND 3</h1>
<div class="sub" id="stamp">the VIX counted by your own rule, depth under the 50- and 100-day, fear in treasuries read as fear · ${esc(STAMP)} · on a branch, not on the live tool</div>

<section class="panel" id="p-answer"><h2>THE ANSWER FIRST</h2>
<div class="tiles">
  <div class="tile main"><div class="l">the March 2026 low · 30 Mar</div><div class="v">${f0(named[W.LOW26].number3)}% <small>was ${f0(named[W.LOW26].number2)}%</small></div><div class="s">version 2 → version 3. Today's rule read ${f0(named[W.LOW26].number1)}%.</div></div>
  <div class="tile"><div class="l">the late-March 2025 low · ${day(W.LOW25)}</div><div class="v">${f0(named[W.LOW25].number3)}% <small>was ${f0(named[W.LOW25].number2)}%</small></div><div class="s">today's rule read ${f0(named[W.LOW25].number1)}%.</div></div>
  <div class="tile"><div class="l">23 February 2026</div><div class="v">${f0(named["2026-02-23"].number3)}% <small>was ${f0(named["2026-02-23"].number2)}%</small></div><div class="s">the first day you named to the last round. It goes up into the fall instead of down.</div></div>
  <div class="tile"><div class="l">December 2025 · the top</div><div class="v">${f0(A.dates.T25)}% <small>was ${f0(B.dates.T25)}%</small></div><div class="s">unchanged. Neither new rule speaks at a quiet top.</div></div>
  <div class="tile"><div class="l">years it had not seen · 1 became</div><div class="v">${x3(A.payoff.became)} <small>was ${x3(B.payoff.became)}</small></div><div class="s">2018 → 6 Oct 2026. Worst fall ${pct(A.payoff.worstFall)} (was ${pct(B.payoff.worstFall)}); invested on average ${pct(A.payoff.invested)} (was ${pct(B.payoff.invested)}).</div></div>
  <div class="tile"><div class="l">at this morning's VIX of ${f1(S.todayVix.close)}</div><div class="v">${sg(rec.today.adds)} <small>points</small></div><div class="s">${f2(S.todayVix.close)} is the ${ord(LV.place1573)} place of the VIX's own year. Your rule starts at 20, the ${ord(LV.place20)} place.</div></div>
</div>
<ul>
<li><b>"The VIX rose to 15.73. Shouldn't that tell us to invest a little bit more?" — by your own rule, no.</b> You buy above 20 and with both hands above 23. Over the last year 20 was the ${ord(LV.place20)} place of the VIX's range and 23 the ${ord(LV.place23)}; ${f2(S.todayVix.close)} is the ${ord(LV.place1573)} — a calm reading. Counted the way you trade it, the VIX adds nothing at 15.7. It would start adding at a touch of 20.</li>
<li><b>Recommended version 3 — two changes on top of version 2:</b>
  <ol><li><i>The VIX is counted, by your rule.</i> A close at ${R.vixLo} or more adds ${R.vixAddLo} points to the market reading (${f0((R.vixAddLo * S.tactical) / 100)} points of the account); a close at ${R.vixHi} or more adds ${R.vixAddHi} (${f0((R.vixAddHi * S.tactical) / 100)} of the account). A day whose high touched a level its close did not counts half. Under ${R.vixLo}, nothing.</li>
  <li><i>A treasury rally can only raise the credit part, never lower it.</i> When treasuries are up over the ten sessions the credit part is read with and without the treasury half, and the higher of the two counts.</li></ol></li>
<li><b>"We would want it to invest more at those lows" — it does.</b> The March 2026 low goes ${f0(named[W.LOW26].number2)}% → <b>${f0(named[W.LOW26].number3)}%</b>, the late-March 2025 low ${f0(named[W.LOW25].number2)}% → <b>${f0(named[W.LOW25].number3)}%</b>, 23 February 2026 ${f0(named["2026-02-23"].number2)}% → <b>${f0(named["2026-02-23"].number3)}%</b>. December 2025 stays at ${f0(A.dates.T25)}%.</li>
<li><b>On the years the rule had not seen (2018–2026), tested the way the first two rounds were tested:</b> what 1 became ${x3(B.payoff.became)} → <b>${x3(A.payoff.became)}</b>, worst fall ${pct(B.payoff.worstFall)} → ${pct(A.payoff.worstFall)}, invested on average ${pct(B.payoff.invested)} → ${pct(A.payoff.invested)}. It was better than version 2 in all four ways the test was run, and in ${yearsBetter} of the 9 years.</li>
<li><b>What it costs.</b> It is bolder in a fall, so it does worse in a fall that does not turn: through 2008 it ended ${f1(Math.abs(A.bar.y0409Pct))}% under version 2, and it lost more in ${yearsWorse.map((y) => `${y.year} (${sg(y[REC.key] - y["version 2"], 1)} points)`).join(" and ")}. It also moves a little more from day to day: ${f2(A.dates.MOVE)} points against ${f2(B.dates.MOVE)}.</li>
<li><b>This morning was not a treasury rally.</b> I measured it ${TIMES[M.reads.length] || M.reads.length + " times"}. At ${hm(m0)}, before the open, treasuries were <i>down</i> ${f2(Math.abs(m0.roll.iefToday))}% on the day and HYG's pre-market quote was down ${f2(Math.abs(m0.roll.hygToday))}%; at ${hm(m1)}, after the open, HYG was down ${f2(Math.abs(m1.roll.hygToday))}% and today's rule was back at ${f0(rowM(m1, "v1").to)}%. The dip to 78 you saw at 08:41 was HYG's thin pre-market quote, not treasuries. Details below.</li>
<li><b>Depth under the 50- and 100-day takes both lows to 100%, and is not in.</b> Against version 2 it holds about two points more on average and ends no higher, and it cost ${f1(Math.abs(C.b100a.bar.y0409Pct))}% through 2008. With the VIX counted the two lows already read ${f0(named[W.LOW25].number3)}% and ${f0(named[W.LOW26].number3)}%.</li>
</ul></section>

<section class="panel" id="p-chart"><h2>BEFORE AND AFTER, EVERY SESSION</h2>
  <div class="fig" id="fig"><div class="bar"><div class="lg"><span><i style="width:18px;height:0;border-top:2.5px solid var(--after)"></i>after — version 3</span><span><i style="width:18px;height:0;border-top:2px dashed var(--before)"></i>before — version 2</span><span><i style="width:14px;height:10px;background:#1b2c38;border:1px solid #2b4656"></i>cash raised at an extended high</span><span><i style="width:0;height:11px;border-left:1px solid #8a8aa0"></i>a day you named</span></div><div id="rg"><button data-r="series" class="on">JAN 2025 → NOW</button> <button data-r="long">SINCE 2018</button></div></div>
  <div id="chart"></div><div class="read" id="read">point at any day to read it</div></div>
  <p class="cap">Three panels, each on its own scale: SPY's daily close; the % of the account to invest by version 2 and by version 3; the VIX's daily close with your two levels drawn across it. Where the two lines of the middle panel part, version 3 changed the number — nearly always where the VIX is above ${R.vixLo}. Every session to ${dayY(S.asOf)}.</p>
</section>

<section class="panel" id="p-morning"><h2>THIS MORNING — WHAT MOVED THE NUMBER FROM 79 TO 78</h2>
<p>The number that went from 79 to 78 is today's rule (version 1). Its credit part reads credit's own move: HYG's move over ten sessions less half the treasury fund's move over the same ten sessions. Each read below is a read of the market taken the way the tool takes it, kept, and put through every version.</p>
${tbl(["when (New York, 8 Oct)", N("HYG on the day"), N("treasuries on the day"), N("credit's own move"), N("today's rule"), N("version 2"), N("version 3")], [
  [`7 Oct, the close`, "", "", sg(m0.inputs[0].creditOwn, 2) + "%", pct(rowM(m0, "v1").from), pct(rowM(m0, "v2").from), pct(rowM(m0, REC.key).from)],
  [`08:41, before the open — as you saw it`, `about ${sg(hygDay0841, 1)}%`, `<span class="dim">not kept</span>`, sg(saw.creditOwn[1], 2) + "%", `${saw.number[1]}%`, `<span class="dim">—</span>`, `<span class="dim">—</span>`],
  ...M.reads.map((r) => [`${hm(r)}, ${r.phase === "open" ? "after the open" : "before the open"}`, sg(r.roll.hygToday, 2) + "%", sg(r.roll.iefToday, 2) + "%", sg(r.inputs[1].creditOwn, 2) + "%", pct(rowM(r, "v1").to), pct(rowM(r, "v2").to), pct(rowM(r, REC.key).to)])])}
<p class="cap">The 08:41 row was not kept: its HYG figure is worked back from the two figures in the brief (credit's own move ${sg(saw.creditOwn[1], 2)}%, the treasury half +${f2(saw.ratesLeg[1])}). The other rows are reads I took and kept.</p>
<ul>
<li><b>Treasuries did not rally.</b> The treasury fund was ${m0.roll.iefToday < 0 ? "down" : "up"} ${f2(Math.abs(m0.roll.iefToday))}% at ${hm(m0)} and ${Math.abs(m1.roll.iefToday) < 0.05 ? "flat" : (m1.roll.iefToday < 0 ? "down " : "up ") + f2(Math.abs(m1.roll.iefToday)) + "%"} at ${hm(m1)}. Over the ten sessions it is down ${f2(Math.abs(m1.inputs[1].ief10))}%.</li>
<li><b>Why the treasury half looked as if it had moved.</b> It went from +${f2(m0.inputs[0].ratesLeg)} to +${f2(m0.inputs[1].ratesLeg)} because the ten sessions moved on by a day. ${dayY(m0.roll.theDayThatLeftTheWindow.date)} dropped out of them, a day treasuries fell ${f2(Math.abs(m0.roll.theDayThatLeftTheWindow.treasuries))}% and HYG fell ${f2(Math.abs(m0.roll.theDayThatLeftTheWindow.hyg))}%. Losing that day took ${f2(Math.abs(m0.roll.ofWhich.treasuriesWindow))} off the treasury half and put ${f2(m0.roll.ofWhich.hygWindow)} back on HYG's own. The two cancel.</li>
<li><b>What was left is HYG's own quote.</b> At ${hm(m0)} it was marked ${f2(Math.abs(m0.roll.hygToday))}% under yesterday's close; at ${hm(m1)}, after the open, it was only ${f2(Math.abs(m1.roll.hygToday))}% under. Credit's own move sits just under zero, the steepest stretch of its curve, so a quarter of a percent on a thin pre-market quote was worth ${f1(Math.abs(rowM(m0, "v1").byCredit))} points of the account.</li>
<li><b>Neither new rule would have changed this morning.</b> The VIX is under ${R.vixLo}, and treasuries are down over the ten sessions, so there is no rally to set aside. Under versions 2 and 3 the move was ${sg(rowM(m0, REC.key).d)} of a point, because cash has been raised since 13 Aug and the swing is halved.</li>
</ul>
<h3>The two days where your reading is right</h3>
<p>The same mechanism you describe — treasuries rally, HYG holds, credit's own move subtracts — did happen on two of the days you named. On 26–30 March 2026 it did not: treasuries were down over the ten sessions on both days, so there was no rally in the sum.</p>
<p><b>20 → 23 February 2026.</b> ${legs(st.feb23)}. HYG had held; treasuries had rallied.</p>
${tbl(stretchHead, stretchRows(st.feb23))}
<p><b>${day(st.mar25.from)} → ${dayY(st.mar25.to)}.</b> ${legs(st.mar25)}.</p>
${tbl(stretchHead, stretchRows(st.mar25))}
<p><b>26 → 30 March 2026.</b> ${legs(st.mar26)}. Version 2 had already stopped this cut; the VIX takes both days to 100.</p>
${tbl(stretchHead, stretchRows(st.mar26))}
</section>

<section class="panel" id="p-dates"><h2>YOUR DATES, UNDER EACH VERSION</h2>
${tbl(["day", N("SPY"), N("the VIX: close · high"), N("today's rule"), N("version 2"), N("version 3"), N("the VIX adds"), "a treasury rally raised credit", ""], REC.named.map((n) => ({ cls: n.number3 - n.number2 >= 1 ? "ok" : "", c: [`${dayY(n.d)} <span class="dim">· ${esc(noteOf(n))}</span>`, f2(n.spy), `${f2(n.vixClose)} · ${f2(n.vixHigh)}`, pct(n.number1), pct(n.number2), `<b>${pct(n.number3)}</b>`, n.vixAdd > 0 ? sg(n.vixAdd) : "—", n.raisedByRally ? "yes" : "—", n.cash ? `<span class="dim">cash raised</span>` : ""] })))}
<p class="cap">"The VIX adds" is in points of the account, after the halving while cash is raised. On ${dayY("2026-09-16")}, which you called a low, nothing changes: the VIX closed at ${f2(named["2026-09-16"].vixClose)}, under your first level.</p>
</section>

<section class="panel" id="p-cands"><h2>THE CANDIDATES, ONE AT A TIME ON TOP OF VERSION 2</h2>
<p>Each line is one change by itself. The dates are the number the tool would show. The whole period is the first study's replay, unchanged: the rule fitted on ${dayY(W.fitted[0])} → ${dayY(W.fitted[1])}, replayed on ${dayY(W.unseen[0])} → ${dayY(W.unseen[1])}, which it never saw. <b>Timing</b> = what 1 became ÷ what the same average share became untimed. The scorecard, the test and the pass rule were written into the build before any candidate was run; one line was added after the first run and is marked.</p>
<p class="rule"><b>The pass rule.</b> Whole period: timing not more than 0.005 under version 2's; worst fall not more than 1.0 deeper; and what 1 became, after a charge of 0.05% on every dollar moved, not more than 1% under version 2's. His dates: one of the two lows up, or December down, by 1.0 point of the account, and none of the three worse by 1.0.</p>

<h3>(e) The VIX as a counted part</h3>
${tbl(candHead, [baseRow(V2, "version 2 — where this round starts"), ...fam("e").map((c) => candRow(c))], "score")}
${tbl(["at a VIX of…", ...fam("e").map((c) => N(SHORT[c.key]))], [[`${f1(S.todayVix.close)} — this morning`, ...fam("e").map((c) => sg(c.today.adds))], [`a touch of 20 (high 20.6, close 19.2)`, ...fam("e").map((c) => sg(c.touch20.adds))], [`a close of 20.5`, ...fam("e").map((c) => sg(c.at20.adds))], [`a close of 23.5`, ...fam("e").map((c) => sg(c.at23.adds))]])}
<p class="cap">What each would add to the number, in points of the account, on the last day in the study with only the VIX changed. Cash is raised today, so every add is halved: his steps add ${sg(C.e2.at20.adds)} at 20.5 and ${sg(C.e2.at23.adds)} at 23.5 today, and twice that when cash is not raised.</p>
<ul>
<li><b>Measured, the first study's way — it fails.</b> A curve on the VIX's place in its own year, fitted beside the RSI and credit. Every form took the two lows up and cost ${f1(Math.abs(Math.max(...fam("e").filter((c) => c.family === "e1").map((c) => c.bar.afterCostPct))))}% to ${f1(Math.abs(Math.min(...fam("e").filter((c) => c.family === "e1").map((c) => c.bar.afterCostPct))))}% of the end result. The free curves also add about a point at 15.7 — for the wrong reason: they read a <i>low</i> VIX as mildly good. By the first study's own keep rule the place of the VIX still does not earn a vote (${esc(PT.cVix.why)}).</li>
<li><b>Your rule as steps — it passes both.</b> Late-March 2025 ${f1(V2.dates.L25low)} → ${f1(C.e2.dates.L25low)} at the low, March 2026 ${f1(V2.dates.L26low)} → ${f1(C.e2.dates.L26low)}, the end result ${x3(V2.payoff.became)} → ${x3(C.e2.payoff.became)}. As a reading it also earns a vote by the first study's keep rule, where the VIX's place did not: ${esc(PT.vixStep.why)} (right in ${PT.vixStep.main[60].yearsRight} of ${PT.vixStep.main[60].years} years at 60 sessions). It earns it with its curve left free as well as held.</li>
<li><b>Twice the size fails on timing only</b> (${f2(C.e2x.payoff.timing)} against ${f2(V2.payoff.timing)}): it holds more and earns no more for it. <b>Measured sizes say "all in"</b>: the fitted years put the first step at ${f0(S.measuredSteps.fittedTo2017.T.addLo)} points of market reading, which pins the number at 100% whenever the VIX closes above 20; that also fails on timing. <b>By place instead of level</b> (the 80th and 90th place) fails on timing too.</li>
</ul>
<h3>What followed each state of your rule, on the years it had not seen</h3>
${tbl(["the VIX that day", N("days"), N("higher 20 sessions on"), N("median"), N("higher 60 sessions on"), N("median"), N("median worst dip inside 20")], [...VE.all.map((r) => [esc(r.name), n0(r.n), sh(r.share20), sg(r.med20, 2) + "%", sh(r.share60), sg(r.med60, 2) + "%", sg(r.dip20, 2) + "%"]), { cls: "base", c: ["any day", n0(any.n), sh(any.share20), sg(any.med20, 2) + "%", sh(any.share60), sg(any.med60, 2) + "%", sg(any.dip20, 2) + "%"] }])}
<p class="cap">The 50/50 blend of SPY and QQQ. A close at 23 or more was followed by a higher market a month later ${sh(v23.share20)} of the time (any day: ${sh(any.share20)}). Between 20 and 23 the next month was <i>worse</i> than an ordinary day (${sh(v20.share20)}) and the next quarter better (${sh(v20.share60)} against ${sh(any.share60)}). A touch alone was the weakest of the three over a month (${sh(vTouch.share20)}).</p>

<h3>(b) Depth under the 50-day and the 100-day</h3>
${tbl(candHead, [baseRow(V2, "version 2 — where this round starts"), ...fam("b").map((c) => candRow(c))], "score")}
<ul>
<li><b>Both lows go to 100% under every form.</b> And every form fails the whole period against version 2, on timing: the add-on the last round measured holds ${pct(C.b100a.payoff.invested)} on average against ${pct(V2.payoff.invested)} and ends at ${x3(C.b100a.payoff.became)} against ${x3(V2.payoff.became)}.</li>
<li><b>Why the last round said it passed, and this one says it fails.</b> The last round set it against today's rule, whose timing is ${f2(V1.payoff.timing)}. Version 2's is ${f2(V2.payoff.timing)}, and this round's bar is version 2. Against today's rule it still passes; against version 2 it does not.</li>
<li><b>As measured it is a switch, not a gauge.</b> Half a percent under the 100-day adds ${f0(S.marks.depthAddOn.find((m) => m[0] === 0.5)[1])} points of market reading at once (${f0((S.marks.depthAddOn.find((m) => m[0] === 0.5)[1] * S.tactical) / 100)} of the account); five percent under adds ${f0(S.marks.depthAddOn.find((m) => m[0] === 5)[1])}. That is why both lows read 100: anything under the average pins it.</li>
<li><b>Through 2008 it ended ${f1(Math.abs(C.b100a.bar.y0409Pct))}% under version 2</b> (the figure the last round gave). On top of the VIX steps it adds nothing to the end result (${x3(C["e2 + b100a"].payoff.became)} against ${x3(C.e2.payoff.became)}).</li>
</ul>

<h3>(f) Treasuries rallying read as fear, not as credit weakness</h3>
${tbl(candHead, [baseRow(V2, "version 2 — where this round starts"), ...fam("f").map((c) => candRow(c))], "score")}
${tbl(["26 → 30 March 2026, as today's rule would read it with each change", N("the number"), N("change"), N("of it: the credit part")], [["today's rule, unchanged", `${f1(st.mar26.today.from)} → ${f1(st.mar26.today.to)}`, sg(st.mar26.today.d), sg(st.mar26.today.byCredit)], ...fam("f").map((c) => [esc(NAMES[c.key]), `${f1(c.stretch.onToday.from)} → ${f1(c.stretch.onToday.to)}`, sg(c.stretch.onToday.d), sg(c.stretch.onToday.byCredit)])])}
<ul>
<li><b>None of them changes 26–30 March 2026 by the mechanism</b>, because on those days treasuries were down over the ten sessions (${sg(st.mar26.legs[0].ief10, 2)}% and ${sg(st.mar26.legs[1].ief10, 2)}%). The one line that changes it is the re-measured curve, and it changes it by having a different shape, not by reading the rally.</li>
<li><b>The first form did the opposite of what it is for.</b> "HYG's move alone when treasuries rallied" <i>lowered</i> the number on ${n0(F1D.f1.lowered.n)} of the ${n0(F1D.treasuriesUpDays)} days since 2018 on which treasuries had rallied, by up to ${f1(Math.abs(F1D.f1.lowered.biggest))} points of the account. Those are the big flight-to-safety days: credit's own move is so far down that the curve already reads a washout and adds, and taking the treasury half away turned that add into a subtraction. The days it lowered were followed by a higher market a month later ${sh(F1D.f1.lowered.share20)} of the time (any day: ${sh(F1D.any.share20)}).</li>
<li><b>The corrected form is in.</b> When treasuries rallied, the credit part is read both ways and the higher counts, so the rally can only raise it. It raised the number on ${n0(F1D.f1x.raised.n)} days since 2018 (median ${sg(F1D.f1x.raised.median)} points of the account, ${sg(F1D.f1x.raised.biggest)} at most) and lowered it on none. It moves none of the three scored dates by a point, so by the dates bar as written it does not pass; it is in because it is your rule, it lifts 23 Feb 2026 and 28 Mar 2025 by the mechanism you named, and it was better than version 2 every one of the four ways the test was run.</li>
<li><b>Where credit subtracted only because treasuries had rallied</b> (${n0(fOnly.n)} days the rule had not seen), the market was higher a month later ${sh(fOnly.share20)} of the time and a quarter later ${sh(fOnly.share60)} — an ordinary month and a better quarter (any day: ${sh(any.share20)} and ${sh(any.share60)}). The subtraction was not earned there.</li>
<li><b>A treasury rally counted as a fear add had the best end result of anything tested</b> — ${x3(C.f2a.payoff.became)} against ${x3(V2.payoff.became)}, and better every one of the four ways the test was run. <b>It is not in.</b> As measured it is a switch: any rise in treasuries over ten sessions, even 0.1%, adds ${f0(S.marks.fearAddOn.find((m) => m[0] === 0.1)[1])} points of market reading (${f1((S.marks.fearAddOn.find((m) => m[0] === 0.1)[1] * S.tactical) / 100)} of the account). It is on about half of all days, it moves the number ${f2(C.f2a.dates.MOVE)} points a day against ${f2(V2.dates.MOVE)}, and it makes December 2025 ${f1(Math.abs(C.f2a.datesUp[2]))} heavier. By the first study's keep rule the reading behind it earns a vote only while its curve is held so that a bigger rally never reads worse (${esc(PT.tRally.why)}). Left free it does not: it ${esc(PT.tRallyFree.why)}. So there is something in the idea, and neither its shape nor its strength is settled.</li>
</ul>
</section>

<section class="panel" id="p-rec"><h2>THE RECOMMENDED VERSION 3</h2>
${tbl(["", N("version 2 — before"), N("version 3 — after")], [
  [`late-March 2025 low — the five sessions · the low itself`, `${f1(B.dates.L25)} · ${f1(B.dates.L25low)}`, `<b>${f1(A.dates.L25)} · ${f1(A.dates.L25low)}</b>`],
  [`March 2026 low — the five sessions · the low itself`, `${f1(B.dates.L26)} · ${f1(B.dates.L26low)}`, `<b>${f1(A.dates.L26)} · ${f1(A.dates.L26low)}</b>`],
  [`26 → 30 March 2026`, sg(B.dates.CUT), `<b>${sg(A.dates.CUT)}</b>`], [`23 February 2026`, f1(B.dates.feb23), `<b>${f1(A.dates.feb23)}</b>`],
  [`December 2025 · SPY's high of ${day(W.TOP)} 2026`, `${f1(B.dates.T25)} · ${f1(B.dates.T25top)}`, `${f1(A.dates.T25)} · ${f1(A.dates.T25top)}`],
  [`21 July 2025 · 22 September 2025`, `${f1(B.dates.jul21)} · ${f1(B.dates.sep22)}`, `${f1(A.dates.jul21)} · ${f1(A.dates.sep22)}`],
  [`this morning, ${hm(m1)}`, pct(rowM(m1, "v2").to), pct(rowM(m1, REC.key).to)],
  [`moves a day`, f2(B.dates.MOVE), f2(A.dates.MOVE)],
  [`days the number was cut on a down day, 23 Feb → 30 Mar 2026 (of ${REC.wrongWay.version2.sessions})`, `${REC.wrongWay.version2.cutOnADownDay} <span class="dim">(today's rule: ${REC.wrongWay.today.cutOnADownDay})</span>`, `${REC.wrongWay.version3.cutOnADownDay}`],
  { cls: "base", c: [`<b>unseen 2018–2026:</b> what 1 became`, x3(B.payoff.became), `<b>${x3(A.payoff.became)}</b>`] }, [`worst fall`, pct(B.payoff.worstFall), pct(A.payoff.worstFall)], [`invested on average`, pct(B.payoff.invested), pct(A.payoff.invested)], [`timing`, f2(B.payoff.timing), f2(A.payoff.timing)],
  [`what 1 became after a charge of 0.05% on every dollar moved`, x3(B.payoff.becameAfterCost), x3(A.payoff.becameAfterCost)], [`2004 → March 2009 (it holds 2008)`, x3(B.y0409.became), x3(A.y0409.became)]])}
<h3>The same test three other ways</h3>
${tbl(["the test", N("1 became"), N("worst fall"), N("invested"), N("timing")], Object.keys(fits).map((k) => { const a = fitOf(k, "version 2"), b = fitOf(k, REC.key); return [esc(fits[k].label), `${x3(a.became)} → <b>${x3(b.became)}</b>`, `${pct(a.worstFall)} → ${pct(b.worstFall)}`, `${pct(a.invested)} → ${pct(b.invested)}`, `${f2(a.timing)} → ${f2(b.timing)}`]; }))}
<p class="cap">Version 2 → version 3. Ahead in all four. In the fit that kept 2008 in, the worst fall is ${f1(Math.abs(fitOf("17w", REC.key).worstFall - fitOf("17w", "version 2").worstFall))} deeper.</p>
<h3>Year by year, on the years it had not seen</h3>
${tbl(["", ...yrs.map((y) => N(String(y.year)))], [["today's rule", ...yrs.map((y) => sg(y["today's rule"], 1))], ["version 2", ...yrs.map((y) => sg(y["version 2"], 1))], { cls: "ok", c: ["<b>version 3</b>", ...yrs.map((y) => `<b>${sg(y[REC.key], 1)}</b>`)] }, { cls: "base", c: ["buy and hold", ...yrs.map((y) => sg(y.buyAndHold, 1))] }])}
<p class="cap">% in the year. Version 3 was ahead of version 2 in ${yearsBetter} of 9 years and behind in ${yearsWorse.map((y) => y.year).join(" and ")}, the two years the market fell.</p>
<h3>Every stretch since 2018 on which the VIX rule added something</h3>
<p>${VS.length} stretches. Sixty sessions after the first day the market was higher in ${vsUp.length} of ${vsDone.length}. In ${vsBad.length} of them it first fell 10% or more: ${vsBad.map((x) => `${dayY(x.from)} (${sg(x.worstAfter, 1)}%)`).join(", ")}. The rule adds on the first day and all the way down.</p>
${tbl(["from", "to", N("sessions"), N("the VIX's highest close"), N("the market 20 sessions after the first day"), N("60 sessions after"), N("its worst point inside those 60"), N("the number on the first day")], VS.map((x) => [dayY(x.from), dayY(x.to), n0(x.sessions), f2(x.peak), x.after20 == null ? "—" : sg(x.after20, 1) + "%", x.after60 == null ? "—" : sg(x.after60, 1) + "%", sg(x.worstAfter, 1) + "%", `${f1(x.number2)} → ${f1(x.number3)}`]))}
<h3>What bolder costs in the odds</h3>
${tbl(["the market reading", N("days · version 2"), N("higher a month on"), N("a quarter on"), N("days · version 3"), N("higher a month on"), N("a quarter on")], odds.v2.map((b, i) => [`${b.lo} to ${b.hi}`, n0(b.n), sh(b.share20), sh(b.share60), n0(odds.v3[i].n), sh(odds.v3[i].share20), sh(odds.v3[i].share60)]))}
<p class="cap">Years the rule had not seen. Version 3 reads 80 or more on ${n0(o80(odds.v3).n)} days where version 2 did on ${n0(o80(odds.v2).n)}. Those days were higher a month later ${sh(o80(odds.v3).share20)} of the time (version 2's: ${sh(o80(odds.v2).share20)}) and a quarter later ${sh(o80(odds.v3).share60)} (${sh(o80(odds.v2).share60)}).</p>
<h3>The VIX rule's numbers, each moved one at a time</h3>
${tbl(["", N("1 became"), N("worst fall"), N("invested"), N("timing"), N("through 2008"), N("late-Mar 2025 low"), N("Mar 2026 low"), N("moves a day")], sens.map((s, i) => ({ cls: i === 0 ? "base" : "", c: [esc(s.what), x3(s.became), pct(s.worstFall), pct(s.invested), f2(s.timing), x3(s.y0409), f1(s.L25low), f1(s.L26low), f2(s.MOVE)] })))}
<p class="cap">The VIX steps alone on version 2. Every line ends between ${x3(Math.min(...sens.map((s) => s.became)))} and ${x3(Math.max(...sens.map((s) => s.became)))}: the result does not hang on 20 and 23 being exactly right, nor on the half for a touch.</p>
</section>

<section class="panel" id="p-pane"><h2>THE TRADINGVIEW PANE — VERSION 3, AND ITS PROOF</h2>
<p>The script is written and proved; it is <b>not installed</b> and has never met TradingView's compiler. It has one switch per change — four now — so you can scroll with each on and off, and it can draw version 2 and version 1 beside it as thin lines. With version 3's two switches off it draws version 2 exactly.</p>
${tbl(["what was set against what", "result"], [
  ["the study's sum against a hand-written replay of the script, same closes", `the same reading on all <b>${n0(P.history.samePrices.days)}</b> days (${dayY(P.history.from)} → ${dayY(P.history.to)}); cash raised on the same ${n0(P.history.raiseCashDays.engine)} days`],
  ["the script's own text, turned into a program by fixed rules", `the same on all ${n0(P.history.fromTheScriptsOwnText.days)}`],
  ["the VIX's add and the treasury flag, day by day", `the VIX adds on ${n0(P.history.version3Parts.daysTheVixAdds)} days and a rally raised credit on ${n0(P.history.version3Parts.daysARallyRaisedCredit)}; both sides agree on every one`],
  ["version 3 with its two switches off against version 2's own script", `identical on all ${n0(P.history.newSwitchesOff.days)}`], ["with all four off against version 1's own script", `identical on all ${n0(P.history.allSwitchesOff.days)}`],
  ["the high-yield fund's payouts added back TradingView's way", `within one point on ${f1(tv.shareWithin1)}% of days; worst ${f1(tv.worst)} on ${dayY(tv.worstOn)}; ${f1(P.history.lastYear.tradingViewPayouts.worst)} in the last year`],
  ["each raise-cash threshold nudged a hair", `the state would differ on at most ${Math.max(...cashHair.map((h) => h.days))} of ${n0(P.history.aHairOnAThreshold.of)} days, ${Math.max(...cashHair.map((h) => h.inTheLastYear)) === 0 ? "none" : Math.max(...cashHair.map((h) => h.inTheLastYear))} in the last year`],
  ["the VIX's two levels nudged by five cents", `what the VIX adds would differ on ${Math.min(...vixHair.map((h) => h.days))} to ${Math.max(...vixHair.map((h) => h.days))} days, ${Math.max(...vixHair.map((h) => h.inTheLastYear))} at most in the last year; it moves the number ${f1(Math.max(...vixHair.map((h) => h.mostItMovesTheNumber)))} points at most on such a day`],
  ...proofToday.map((t) => [`this morning, ${t.readAt.slice(11, 16)} New York (${esc(t.phase)})`, `study ${f1(t.engine.reading)}, script ${f1(t.script.reading)}; label <b>"${esc(t.script.label)}"</b>`])])}
${tbl(["day", N("study"), N("script"), N("% invested"), N("version 2"), N("version 1"), "label"], P.rows.filter((r) => REC.named.some((n) => n.d === r.date)).map((r) => [dayY(r.date), f1(r.engine.reading), f1(r.script.reading), f2(r.script.invested), f2(r.script.version2.invested), f2(r.script.version1.invested), esc(r.script.label)]))}
<p><b>For the installer:</b> <code>study/pn1/TASK-KIMI-DEPLOYMENT-PANE-VERSION-3.md</code>, beside the script. Not dispatched. It reads the VIX under the symbol your layout already charts. <b>One thing only TradingView can show:</b> whether its daily bar for the VIX has the same high as the Hub's. A touch counts half a step, so a different high moves the number by ${f1((Math.max(R.vixAddLo, R.vixAddHi - R.vixAddLo) * R.vixTouch * S.tactical) / 100)} points of the account at most on that day; the task tells the installer to read both and report.</p>
</section>

<section class="panel" id="p-privacy"><h2>PRIVACY — THE ACCOUNT IS OUT OF THE CODE</h2>
<ul>
<li><b>Moved.</b> The account (cash and share counts) was written into the tool's code. It is now in a file on this machine that the repository ignores. The code carries a made-up example — $100,000 in cash, no shares — and the screen says "EXAMPLE ACCOUNT" while it is in use.</li>
<li><b>What you will see, once this branch is the public tool.</b> It starts from the example until you type your cash and shares under ASSUMPTIONS once; from then on they stay in your browser. Until then the sizes it prints are the example's, not yours. Dials you saved before are not carried over: the last round already gave the saved set a new name.</li>
<li><b>What this cannot undo.</b> The account's line is <b>already on GitHub</b>, in two branches that were pushed on 7 Oct: <code>ds1-deployment-system-20261007</code> and <code>pn1-deployment-pane-20261007</code>. Pictures in those branches show the account in dollars too. Taking it out of this branch stops it spreading; only making the repository private, or removing those branches and their history, takes it down. That is the coordinator's to do. The public tool itself does not serve the account: that file is not on it (checked 8 Oct, 10:13).</li>
<li><b>Still in this branch, from earlier rounds:</b> the pictures earlier rounds took of the tool show the account, and one stored check (<code>study/ds2/data/ds2-tonight.json</code>) holds its total. I did not rewrite other rounds' pictures or data.</li>
</ul>
${hasPic("ds3-tool-example-account-mark-1680.png") ? `<div class="shots">${PIC("ds3-tool-example-account-mark-1680.png", "The tool on this branch: the account's own label, as it reads until your cash and shares are entered.", "own")}${hasPic("ds3-tool-example-account-assumptions-390.png") ? PIC("ds3-tool-example-account-assumptions-390.png", "The title of the ASSUMPTIONS fold says the same (here at phone width).", "own") : ""}</div>` : ""}
</section>

<section class="panel" id="p-wrong"><h2>WHAT COULD BE WRONG</h2>
<ul>
<li><b>Version 3 is bolder exactly when it hurts most to be wrong.</b> Both new rules add in a fall. Every panic in the nine unseen years turned within months. In 2004–2009 version 3 ended at ${x3(A.y0409.became)}, version 2 at ${x3(B.y0409.became)}, buying and holding at ${x3(early.y0409.buyAndHold.became)}.</li>
<li><b>${S.candidates.length} candidates were tried.</b> ${S.candidates.filter((c) => c.passWhole && c.passDates).length} passed both bars alone. With that many tries one can pass by luck; the VIX steps were ahead of version 2 every one of the four ways the test was run, and at every level I moved them to, which is why I trust them more than a single pass.</li>
<li><b>The treasury rule is in on judgement, not on the bar.</b> It does not move a scored date by a point. It was added after the first run, when the first form turned out to cut the number on flight-to-safety days. It has its own switch on the pane.</li>
<li><b>The VIX's high.</b> The study used the Hub's daily bar for the VIX. If TradingView's bar has a different high, a touch can count on one and not the other.</li>
<li><b>"Both hands above 23" is ${f0((R.vixAddHi * S.tactical) / 100)} points of the account here, not all of it.</b> Bigger steps held more and earned no more, so they failed on timing. If you mean more than that, it is a number to set with you, with its cost beside it.</li>
<li><b>The steps' sizes are round numbers I fixed before the run</b>, not measured ones. Measured, they say "all in above 20", which failed.</li>
<li>No costs, taxes or payouts in the replay, as in the first two rounds.</li>
</ul></section>

<section class="panel" id="p-notdone"><h2>NOT DONE, NOT VERIFIED</h2>
<ul>
<li><b>Not pushed, not deployed.</b> The pane is not installed and has never been compiled. The installer's task is written, not sent.</li>
<li><b>The tool is not changed to version 3.</b> The public allocation tool does not show this number at all yet: I opened it at 10:13 and it is still the release of 7 Oct, with its five-markets panel. The number lives on branches and on your TradingView pane (version 1 there). Version 3 is a study, one file that holds its sum, and the pane's new script. The screen's dials were not touched.</li>
<li><b>The fear add and depth are measured, not built.</b> Both need a proper shape — an add that grows with the size of the move — before they go on a screen.</li>
<li><b>08:41 itself was not kept.</b> My reads are ${M.reads.map((r) => hm(r)).join(", ")}. The 08:41 row is worked back from the two figures in the brief.</li>
<li>No new prices were pulled for the study: it ran on the same days the last round ran on, to 6 Oct, so that its version 2 is that round's to the last digit.</li>
</ul></section>

<section class="panel" id="p-decide"><h2>DECISIONS FOR YOU</h2>
<ol>
<li><b>Version 3: your VIX rule counted, and a treasury rally never lowering credit — go?</b> Both lows read ${f0(named[W.LOW25].number3)}% and ${f0(named[W.LOW26].number3)}%; the end result was ${up(A.payoff.became, B.payoff.became)} better on the unseen years and ${f1(Math.abs(A.bar.y0409Pct))}% worse through 2008. <b>Recommendation: yes — on the pane first.</b> Its four switches show the line with and without each change.</li>
<li><b>"Both hands above 23": ${f0((R.vixAddHi * S.tactical) / 100)} points of the account, or more?</b> Twice the size (${f0((2 * R.vixAddHi * S.tactical) / 100)} points) reads ${f0(C.e2x.dates.L26)}% on all five sessions into the March 2026 low (as built: ${f1(C.e2.dates.L26)}% on average) and failed the test on timing. <b>Recommendation: keep ${f0((R.vixAddHi * S.tactical) / 100)}.</b> The two lows already read ${f0(named[W.LOW25].number3)}% and ${f0(named[W.LOW26].number3)}%.</li>
<li><b>A treasury rally as a buy of its own: shape it properly next?</b> It had the best end result of anything tested, ${up(C.f2a.payoff.became, V2.payoff.became)}, but as measured it is an on/off switch worth ${f1((S.marks.fearAddOn.find((m) => m[0] === 0.1)[1] * S.tactical) / 100)} points of the account that flips when treasuries cross flat. <b>Recommendation: yes, as the next round</b> — an add that grows with the size of the rally, tested the same way. Not in version 3.</li>
</ol></section>

<details class="sc-pagespecs"><summary>PAGE SPECS</summary>
<p><b>Where each number comes from.</b> Every figure is read from the study's own files when the page is built: <code>study/ds3/data/ds3.json</code> (the candidates, the dates, the replay), <code>ds3-live.json</code> (version 3's rules), <code>ds3-pane-proof.json</code> (the pane) and <code>ds3-morning.json</code> (this morning's two reads). The study is <code>scripts/ds3-build.mjs</code>; version 3's sum is <code>study/ds3/number.mjs</code>.</p>
<p><b>The number.</b> % invested = ${S.held} held + ${S.tactical} tactical × the market reading ÷ 100. The market reading = a typical day (${f1(S.marks.typicalDay)}) + the RSI part + the credit part + what the VIX adds, held to 0–100, halved while cash is raised. A point of market reading is ${f2(S.tactical / 100)} of a point of the account.</p>
<p><b>The test.</b> The first study's replay, through the same code the last round used. Before scoring anything the build checks that it gives the first study's stored replay (${x3(V1.payoff.became)}, ${pct(V1.payoff.worstFall)}, ${pct(V1.payoff.invested)}) and that its version 2 gives the last round's stored result and dates to the last digit. Fitted on ${n0(W.fittedDays)} days, replayed on ${n0(W.replayedDays)}. The share set at a close earns the next session's blend of SPY and QQQ; cash earns the 3-month bill.</p>
<p><b>The VIX.</b> The Hub's daily bar: its close (from the Hub's own table where it has one) and its high. A year's place = the share of the last 252 closes under it.</p>
<p><b>This morning.</b> ${M.reads.length} reads of the market taken with the tool's own requests at ${M.reads.map((r) => r.readAt.slice(11, 19)).join(", ")} New York and kept as files, then put through every version by the same sum the study scored. No account is involved in any figure on this page.</p>
<p><b>The chart colours</b> were checked for colour-blind separation on the dark surface (the two lines are also named at their right end and one is dashed).</p>
</details>

<script>
const DATA = ${JSON.stringify(PAGE_DATA)};
(function () {
  const host = document.getElementById("chart"), read = document.getElementById("read"), MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], day = (d) => +d.slice(8) + " " + MON[+d.slice(5, 7) - 1] + " " + d.slice(0, 4);
  let range = "series", geo = null;
  function draw() { const D = DATA[range], n = D.d.length, W = Math.max(280, Math.floor(host.clientWidth)), narrow = W < 640, H = narrow ? 500 : 590, pl = 38, pr = narrow ? 8 : 96, x0 = pl, x1 = W - pr, yS0 = 26, yS1 = Math.round(H * 0.33), yN0 = yS1 + 32, yN1 = Math.round(H * 0.72), yV0 = yN1 + 34, yV1 = H - 24;
    const X = (i) => x0 + (n > 1 ? (i / (n - 1)) * (x1 - x0) : 0), smin = Math.min(...D.spy), smax = Math.max(...D.spy), YS = (v) => yS1 - ((v - smin) / (smax - smin || 1)) * (yS1 - yS0), YN = (v) => yN1 - ((v - 70) / 30) * (yN1 - yN0), vmax = Math.max(...D.vix.filter((v) => v != null)), vmin = 10, YV = (v) => yV1 - ((Math.min(v, vmax) - vmin) / (vmax - vmin || 1)) * (yV1 - yV0), o = [];
    /* the stretches with cash raised: one band per run, behind everything in the number's panel */
    if (D.cash) { let a = -1; for (let i = 0; i <= n; i++) { const on = i < n && D.cash[i]; if (on && a < 0) a = i; if (!on && a >= 0) { o.push('<rect x="' + X(a).toFixed(1) + '" y="' + yN0 + '" width="' + Math.max(1.5, X(i - 1) - X(a)).toFixed(1) + '" height="' + (yN1 - yN0) + '" fill="#1b2c38"/>'); a = -1; } } }
    /* recessive grid and the scale of each panel */
    for (const v of [70, 80, 90, 100]) o.push('<line x1="' + x0 + '" x2="' + x1 + '" y1="' + YN(v).toFixed(1) + '" y2="' + YN(v).toFixed(1) + '" stroke="#1c1c28"/><text x="' + (x0 - 6) + '" y="' + (YN(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#9a9ab0">' + v + '</text>');
    for (const v of [smin, smax]) o.push('<text x="' + (x0 - 6) + '" y="' + (YS(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#9a9ab0">' + v.toFixed(0) + '</text>');
    /* the VIX panel: his two levels drawn across it, each named in the page's ink */
    for (const lv of [[DATA.lo, "20 · he buys"], [DATA.hi, "23 · both hands"]]) { o.push('<line x1="' + x0 + '" x2="' + x1 + '" y1="' + YV(lv[0]).toFixed(1) + '" y2="' + YV(lv[0]).toFixed(1) + '" stroke="#5c5c74" stroke-dasharray="3 3"/><text x="' + (x0 - 6) + '" y="' + (YV(lv[0]) + (lv[0] === DATA.lo ? 9 : 1)).toFixed(1) + '" text-anchor="end" font-size="11" fill="#9a9ab0">' + lv[0] + '</text>'); }
    o.push('<text x="' + (x0 - 6) + '" y="' + (yV0 + 4) + '" text-anchor="end" font-size="11" fill="#9a9ab0">' + vmax.toFixed(0) + '</text>');
    o.push('<text x="' + x0 + '" y="15" font-size="11" fill="#c8c8d8">SPY, daily close</text><text x="' + (narrow ? x0 : x1) + '" y="' + (yN0 - 9) + '"' + (narrow ? '' : ' text-anchor="end"') + ' font-size="11" fill="#c8c8d8">% of the account to invest</text><text x="' + x0 + '" y="' + (yV0 - 9) + '" font-size="11" fill="#c8c8d8">' + (narrow ? 'the VIX, daily close' : 'the VIX, daily close · your two levels dashed') + '</text>');
    /* the time axis: a mark at each new year, and at each quarter on the short range */
    let last = ""; for (let i = 0; i < n; i++) { const d = D.d[i], k = range === "long" ? d.slice(0, 4) : d.slice(0, 7); if (k === last) continue; last = k; const q = range === "long" ? true : (narrow ? [1, 7] : [1, 4, 7, 10]).includes(+d.slice(5, 7)); if (!q || i === 0) continue; if (narrow && range === "long" && +d.slice(0, 4) % 2) continue; o.push('<line x1="' + X(i).toFixed(1) + '" x2="' + X(i).toFixed(1) + '" y1="' + yV1 + '" y2="' + (yV1 + 4) + '" stroke="#3a3a4a"/><text x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" fill="#9a9ab0">' + (range === "long" ? d.slice(0, 4) : MON[+d.slice(5, 7) - 1] + (d.slice(5, 7) === "01" || i < 70 ? " " + d.slice(2, 4) : "")) + '</text>'); }
    /* the days he named: a hairline through the three panels, labelled where there is room */
    if (range === "series") DATA.marks.forEach(function (m, j) { const i = D.d.indexOf(m[0]); if (i < 0) return; o.push('<line x1="' + X(i).toFixed(1) + '" x2="' + X(i).toFixed(1) + '" y1="' + (yS0 - 2) + '" y2="' + yV1 + '" stroke="#8a8aa0" stroke-width="1" stroke-dasharray="2 3"/>'); if (!narrow) o.push('<text x="' + X(i).toFixed(1) + '" y="' + (yS1 + (j % 2 ? 24 : 12)) + '" text-anchor="middle" font-size="11" fill="#c8c8d8" paint-order="stroke" stroke="#0d0d15" stroke-width="4">' + m[1] + '</text>'); });
    const path = (a, Y) => a.map((v, i) => (v == null ? "" : (i && a[i - 1] != null ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1))).join("");
    o.push('<path d="' + path(D.spy, YS) + '" fill="none" stroke="#c9c9d6" stroke-width="1.5" stroke-linejoin="round"/>');
    o.push('<path d="' + path(D.vix, YV) + '" fill="none" stroke="#c9c9d6" stroke-width="' + (range === "long" ? 1 : 1.5) + '" stroke-linejoin="round"/>');
    o.push('<path d="' + path(D.n2, YN) + '" fill="none" stroke="#b38d3c" stroke-width="' + (range === "long" ? 1 : 2) + '" stroke-dasharray="5 3" stroke-linejoin="round"/><path d="' + path(D.n3, YN) + '" fill="none" stroke="#2196b8" stroke-width="' + (range === "long" ? 1.3 : 2.5) + '" stroke-linejoin="round"/>');
    /* the two lines named at their right end, in the page's ink, each beside a dot of its colour; pushed apart so they never touch */
    if (!narrow) { const a = D.n3[n - 1], b = D.n2[n - 1]; let ya = YN(a), yb = YN(b); if (Math.abs(ya - yb) < 14) { const mid = (ya + yb) / 2, s = ya <= yb ? -1 : 1; ya = mid + s * 7; yb = mid - s * 7; }
      o.push('<circle cx="' + (x1 + 8) + '" cy="' + ya.toFixed(1) + '" r="4" fill="#2196b8" stroke="#0d0d15" stroke-width="2"/><text x="' + (x1 + 16) + '" y="' + (ya + 4).toFixed(1) + '" font-size="11" fill="#e8e8f0">after ' + a.toFixed(0) + '%</text><circle cx="' + (x1 + 8) + '" cy="' + yb.toFixed(1) + '" r="4" fill="#b38d3c" stroke="#0d0d15" stroke-width="2"/><text x="' + (x1 + 16) + '" y="' + (yb + 4).toFixed(1) + '" font-size="11" fill="#e8e8f0">before ' + b.toFixed(0) + '%</text>');
      o.push('<text x="' + (x1 + 8) + '" y="' + (YV(D.vix[n - 1]) + 4).toFixed(1) + '" font-size="11" fill="#e8e8f0">VIX ' + D.vix[n - 1].toFixed(1) + '</text>'); }
    o.push('<line id="cross" x1="-10" x2="-10" y1="' + (yS0 - 2) + '" y2="' + yV1 + '" stroke="#8a8aa0" stroke-width="1" pointer-events="none"/>');
    host.innerHTML = '<svg id="svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Three panels: SPY; the percent of the account to invest by version 2 and by version 3; the VIX with the levels 20 and 23, every session">' + o.join("") + '</svg>'; geo = { W: W, x0: x0, x1: x1, n: n, X: X }; }
  function at(ev) { if (!geo) return; const svg = document.getElementById("svg"), b = svg.getBoundingClientRect(), x = ((ev.clientX - b.left) / (b.width || 1)) * geo.W, D = DATA[range], i = Math.max(0, Math.min(geo.n - 1, Math.round(((x - geo.x0) / (geo.x1 - geo.x0 || 1)) * (geo.n - 1)))), c = document.getElementById("cross"); c.setAttribute("x1", geo.X(i).toFixed(1)); c.setAttribute("x2", geo.X(i).toFixed(1));
    read.innerHTML = day(D.d[i]) + " · SPY <b>" + D.spy[i].toFixed(2) + "</b> · before <b>" + D.n2[i].toFixed(1) + "%</b> · after <b>" + D.n3[i].toFixed(1) + "%</b> · VIX <b>" + D.vix[i].toFixed(2) + "</b>" + (D.vixHi ? " (high " + D.vixHi[i].toFixed(2) + ")" : "") + (D.cash && D.cash[i] ? " · cash raised" : ""); }
  host.addEventListener("pointermove", function (ev) { if (ev.target.closest && ev.target.closest("#svg")) at(ev); }); host.addEventListener("click", function (ev) { if (ev.target.closest && ev.target.closest("#svg")) at(ev); });
  document.getElementById("rg").addEventListener("click", function (ev) { const b = ev.target.closest("button"); if (!b) return; range = b.dataset.r; for (const x of document.querySelectorAll("#rg button")) x.classList.toggle("on", x === b); draw(); read.textContent = "point at any day to read it"; });
  let w = host.clientWidth, timer = null; window.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(function () { if (host.clientWidth !== w) { w = host.clientWidth; draw(); } }, 150); });
  draw(); window.DS3_PAGE_READY = true;
})();
</script>
</body></html>
`;
fs.writeFileSync(path.join(ROOT, "study/ds3/DS3.html"), html);
console.log(JSON.stringify({ wrote: "study/ds3/DS3.html", bytes: html.length, stamp: STAMP, sections: (html.match(/<section /g) || []).length, tables: (html.match(/<table/g) || []).length, pictures: (html.match(/<img /g) || []).length }));
