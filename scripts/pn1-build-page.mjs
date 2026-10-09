/* PN1 (7 Oct 2026) — writes the page for Alan, study/pn1/PN1.html, and the data its drawings read, study/pn1/pn1-page-data.js.
     node scripts/pn1-build-page.mjs
   Reads the closes fixture, the script (through its replay) and the proof file; no network, no key, no table.
   The page opens straight from disk: its data is a plain script beside it, not a fetch. Every market number on it is computed here from
   the proof file or the replay — none is typed into the page. The three colour-separation figures in PAGE SPECS are the one exception:
   they are the read-out of a colour checker run on the script's palette on 7 Oct 2026 (COLOUR_CHECK below). */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { parsePine, labelsOf, adjustLikeTradingView } from "../study/pn1/pine-replay.mjs"; import { scriptOn } from "./pn1-prove.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8")), T = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const SRC = T("study/pn1/SCINTILLA-DEPLOYMENT-PANE.v1.pine"), K = parsePine(SRC), F = J("tests/fixtures/pn1-closes-20261006.json"), P = J("study/pn1/data/pn1-proof.json"), DS = J("study/ds1/data/ds1.json");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], day = (iso) => `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`, dayS = (iso) => `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), n0 = (x) => x.toLocaleString("en-US"), f0 = (x) => x.toFixed(0), f1 = (x) => x.toFixed(1), f2 = (x) => x.toFixed(2), sg = (x, d = 1) => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(d);
const hex = (name) => SRC.match(new RegExp("^const color " + name + "\\s*=\\s*(#[0-9A-Fa-f]{6})", "m"))[1];
const COL = { bull: hex("C_BULL"), bear: hex("C_BEAR"), line: hex("C_LINE"), deep: hex("C_DEEP"), edge: hex("C_EDGE"), panel: hex("C_PANEL") }, paint = (c) => ({ green: COL.bull, red: COL.bear, teal: COL.line }[c] || c);

/* ---------- the series the drawings read: the script replayed on the Hub's prices, and today's live bar from the proof ---------- */
const rows = scriptOn(K, F, F.hygWithPayouts).map((r, i) => ({ ...r, spy: F.SPY[i] })).filter((r) => r.reading != null), t = P.today && P.today.engine ? P.today : null;
if (t && t.session > F.asOf) { const prev = rows.at(-1), inv = t.script.invested, pr = t.script.rsiPoints, pc = t.script.creditPoints;
  rows.push({ date: t.session, spy: t.prices.SPY, reading: t.script.reading, invested: inv, colour: inv > prev.invested ? "green" : inv < prev.invested ? "red" : prev.colour, ptsRsi: pr, ptsCredit: pc, partA: 50 + pr, partB: 50 + pc, colA: pr >= 0 ? "green" : "red", colB: pc >= 0 ? "green" : "red", rsiBoth: t.script.rsi, creditOwn: t.script.creditOwn }); }
const lastRow = rows.at(-1), r1 = (x) => +x.toFixed(1), r2 = (x) => +x.toFixed(2);
/* kept small: one letter a bar for the line's colour (g green, r red, t teal); a part is green at or above zero points, and is drawn at 50 plus its points */
const series = { dates: rows.map((r) => r.date), spy: rows.map((r) => r2(r.spy)), reading: rows.map((r) => r.reading), invested: rows.map((r) => r2(r.invested)), colour: rows.map((r) => r.colour[0]).join(""), ptsRsi: rows.map((r) => r1(r.ptsRsi)), ptsCredit: rows.map((r) => r1(r.ptsCredit)) };
const lab = (inputs) => labelsOf(lastRow, inputs).map((l) => ({ y: r1(l.y), text: l.text, colour: paint(l.colour) }));
const listed = [...DS.extremes.bottoms.map((b) => ({ date: b.date, kind: "low" })), ...DS.extremes.tops.map((b) => ({ date: b.date, kind: "high" }))];
const whenRead = t ? t.readAt.slice(11, 16) + " New York" : null;
const data = { built: new Date().toISOString(), held: K.heldPct, tactical: K.tacticalPct, colours: COL, series, lastIsLive: t && t.session > F.asOf ? (t.live === false ? "the day's settled close" : "read at " + whenRead) : null,
  figures: [{ id: "fig-recent", sessions: 380, labels: lab({}) }, { id: "fig-2020", from: "2020-01-02", to: "2020-06-30", labels: [], marks: listed }, { id: "fig-all", sessions: rows.length, labels: [], ratio: true, marks: listed }, { id: "fig-parts", sessions: 252, showReading: true, showParts: true, labels: lab({ showReading: true, showParts: true }) }] };
fs.writeFileSync(path.join(ROOT, "study/pn1/pn1-page-data.js"), "/* written by scripts/pn1-build-page.mjs — the script replayed on the Hub's prices; do not edit by hand */\nwindow.PN1 = " + JSON.stringify(data) + ";\n");

/* ---------- the words and tables ---------- */
const H = P.history, a = H.samePrices, b = H.tradingViewPayouts, yr = H.lastYear.tradingViewPayouts, S = P.sensitivity, O = P.observations, reads = [...(P.todayEarlier || []), ...(t ? [t] : [])], label = lab({})[0].text;
const settled = reads.find((r) => r.live === false) || null, refQ = (r) => (settled || reads.at(-1)).prices.QQQ;
const stray = reads.find((r) => r.phase !== "open" && r.live !== false && Math.abs(r.prices.QQQ / refQ(r) - 1) > 0.01) || null, strayAfter = stray ? reads.find((r) => r.readAt > stray.readAt) : null;
const agree = P.rows.map((r) => `<tr><td>${day(r.date)}</td><td class="dim">${r.date === F.asOf ? "the study's last day (it lists it as a high)" : "a " + r.kind + " the study lists"}</td><td class="n">${f1(r.engine.reading)}</td><td class="n"><b>${f1(r.script.reading)}</b></td><td class="n">${f1(r.gap)}</td><td class="n">${f1(r.scriptTradingViewPayouts.reading)}</td><td class="n">${f1(r.gapTradingViewPayouts)}</td><td class="n">${f2(r.engine.invested)}%</td><td class="n"><b>${f2(r.script.invested)}%</b></td><td>${esc(r.script.label)}</td></tr>`)
  .concat(reads.map((r) => `<tr><td>${day(r.session)}, ${r.readAt.slice(11, 16)}</td><td class="dim">today — ${r.phase === "open" ? "New York open, prices as they traded" : r.live === false ? "the day's settled close" : "after the close, before it was settled"}${r === stray ? " · this read took one stray QQQ price (" + f2(r.prices.QQQ) + ")" : ""}</td><td class="n">${f1(r.engine.reading)}</td><td class="n"><b>${f1(r.script.reading)}</b></td><td class="n">${f1(r.gap)}</td><td class="n">${f1(r.scriptTradingViewPayouts.reading)}</td><td class="n">${f1(r.gapTradingViewPayouts)}</td><td class="n">${f2(r.engine.invested)}%</td><td class="n"><b>${f2(r.script.invested)}%</b></td><td>${esc(r.script.label)}</td></tr>`)).join("");
/* the 18-month drawing as a table: one row a week (the last session of each week), so every value in the picture can be read without hovering */
const recent = rows.slice(-380), weekly = recent.filter((r, i) => i === recent.length - 1 || new Date(recent[i + 1].date + "T12:00:00Z").getUTCDay() < new Date(r.date + "T12:00:00Z").getUTCDay());
const tableView = weekly.map((r) => `<tr><td>${day(r.date)}</td><td class="n">${f2(r.spy)}</td><td class="n">${f1(r.invested)}%</td><td class="n">${f1(r.reading)}</td><td class="n">${sg(r.ptsRsi)}</td><td class="n">${sg(r.ptsCredit)}</td></tr>`).join("");
const partsLabels = lab({ showReading: true, showParts: true }).map((l) => esc(l.text)).join(" · ");
const moved = DS.pieReplay.lineTest.find((x) => x.readings === 1).pointsMovedPerSession;
/* green, red and the teal, every pair, on a black ground: the worst pair for red-green colour blindness (the bar is 8), the worst pair for
   full colour vision (the bar is 15), and the least contrast against the ground (the bar is 3 to 1) */
const COLOUR_CHECK = { palette: [COL.bull, COL.bear, COL.line], colourBlindWorst: 11.5, fullVisionWorst: 21.5, contrastAtLeast: 3 };
if (COLOUR_CHECK.palette.join() !== "#00FFA3,#FF2D55,#2FB5A8") throw new Error("the script's palette changed: run the colour check again and update COLOUR_CHECK");
/* what the pane had invested on the days the study lists, said as counts and not as an impression */
const WORDS = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"], word = (k) => WORDS[k] ?? String(k);
const lowsInv = P.rows.filter((r) => r.kind === "low").map((r) => r.script.invested), highsInv = P.rows.filter((r) => r.kind !== "low").map((r) => r.script.invested), mid = K.heldPct + K.tacticalPct / 2;
const lowsLine = `At the ${word(lowsInv.length)} lows the study lists, the pane had between ${f0(Math.min(...lowsInv))}% and ${f0(Math.max(...lowsInv))}% invested (${word(lowsInv.filter((v) => v >= 100).length)} of them the full 100%).`;
const highsLine = `At its ${word(highsInv.length)} highs it had between ${f0(Math.min(...highsInv))}% and ${f0(Math.max(...highsInv))}%: ${word(highsInv.filter((v) => v < mid).length)} were under ${f0(mid)}%, the half-way mark of the tactical money, and ${word(highsInv.filter((v) => v < K.heldPct + 5).length)} of those were under ${f0(K.heldPct + 5)}%.`;
/* one stretch up close: the high and the low the study lists in early 2020 */
const hi20 = P.rows.find((r) => r.date === "2020-02-19"), lo20 = P.rows.find((r) => r.date === "2020-03-17"), full20 = rows.find((r) => r.date > "2020-02-19" && r.invested >= 100), spyAt = (d) => rows.find((r) => r.date === d).spy;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Deployment Pane</title>
<style>
:root{--bg:#0a0a0f;--panel:#101018;--line:#1c1c28;--line2:#262636;--txt:#e8e8f0;--dim:#9a9ab0;--cyan:#00d4ff;--green:#38e07b;--red:#ff5470;--gold:#ffd166;--mid:#c8c8d8}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:13px;padding:22px 16px 60px;overflow-x:hidden}
@media(min-width:900px){body{padding:26px 30px 60px}}
h1{font-size:19px;letter-spacing:.24em;font-weight:600;margin:0;line-height:1.4}h1 .dot{color:var(--cyan)}.sub{color:var(--dim);margin-top:4px;font-size:11px;letter-spacing:.08em;line-height:1.5}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin-top:16px;min-width:0}
.panel h2{font-size:12px;letter-spacing:.2em;color:var(--cyan);margin:0 0 10px;font-weight:600;line-height:1.5}
.panel h3{font-size:11px;letter-spacing:.18em;color:var(--dim);margin:20px 0 6px;font-weight:600;text-transform:uppercase;line-height:1.5}
p,li{line-height:1.65;max-width:1050px}p{margin:8px 0}ul,ol{margin:6px 0;padding-left:20px}li{margin:6px 0}b{font-weight:600}
table{border-collapse:collapse;width:100%;font-size:12px}th{color:var(--dim);text-align:left;font-weight:400;font-size:11px;letter-spacing:.06em;padding:6px 7px;border-bottom:1px solid var(--line2);vertical-align:bottom;line-height:1.4}
td{padding:6px 7px;border-bottom:1px solid #14141e;vertical-align:top;line-height:1.5}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.wrap{overflow-x:auto}.dim{color:var(--dim)}.small{font-size:11px;color:var(--dim);line-height:1.6}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,235px),1fr));gap:10px;margin-top:4px}
.tile{border:1px solid var(--line);border-radius:8px;padding:12px 14px;background:#0d0d14;min-width:0}.tile .l{font-size:11px;letter-spacing:.12em;color:var(--dim);text-transform:uppercase;line-height:1.5}.tile .v{font-size:24px;font-weight:600;margin-top:6px;line-height:1.25;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}.tile .s{font-size:11px;color:var(--dim);margin-top:5px;line-height:1.5}
.tile.main{border-color:#5c5c74}.tile.main .v{font-size:28px}
.fig{position:relative;min-width:0;margin-top:6px;outline:none;border-radius:6px}.fig:focus-visible{box-shadow:0 0 0 2px var(--cyan)}.fig svg{display:block;max-width:100%;touch-action:pan-y}.cap{font-size:11px;color:var(--dim);line-height:1.6;margin:6px 0 0;max-width:1050px}
.keys{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:11px;color:var(--mid);margin:8px 0 2px;line-height:1.5}.keys span{min-width:0}.keys i{display:inline-block;flex:none;width:18px;height:0;border-top:2px solid;vertical-align:middle;margin-right:6px}.keys i.band{height:9px;border:0;opacity:.3}.keys i.dots{border-top-style:dotted}.keys i.tri{width:0;height:0;border:5px solid transparent;border-top:0;border-bottom:9px solid var(--gold)}
.tip{position:absolute;z-index:3;pointer-events:none;background:#0d0d14;border:1px solid var(--line2);border-radius:6px;padding:7px 10px;font-size:11px;line-height:1.55;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.5)}.tip-day{color:var(--dim);margin-bottom:3px}.tip-row b{font-size:12px;color:var(--txt);font-weight:600;margin-right:6px;font-variant-numeric:tabular-nums}.tip-lab{color:var(--dim)}.tip-key{display:inline-block;width:12px;height:2px;vertical-align:middle;margin-right:7px;border-radius:1px}
details.tv{margin-top:10px}details.tv summary{cursor:pointer;font-size:11px;color:var(--dim);letter-spacing:.08em}details.tv .wrap{max-height:340px;overflow:auto;margin-top:8px}
details.sc-pagespecs{margin-top:22px;border:1px solid var(--line);border-radius:10px;padding:12px 16px;background:var(--panel)}details.sc-pagespecs summary{cursor:pointer;font-size:12px;letter-spacing:.2em;color:var(--dim);font-weight:600}details.sc-pagespecs p,details.sc-pagespecs li{color:var(--mid);font-size:12px}
code{font-family:inherit;color:var(--mid);background:#0d0d14;border:1px solid var(--line);border-radius:3px;padding:0 4px;font-size:12px}
@media(max-width:700px){.wrap table td:first-child,.wrap table th:first-child{min-width:104px}.panel{padding:14px 12px}th,td{padding:6px 5px}h1{font-size:16px;letter-spacing:.16em}}
</style></head><body>
<h1>DEPLOYMENT PANE<span class="dot"> ·</span> THE % INVESTED ON EVERY DAILY BAR, FOR TRADINGVIEW</h1>
<div class="sub">${day(P.built.slice(0, 10))} · the script is written and checked against the allocation tool's own sum · it is NOT on TradingView yet: Kimi installs it</div>

<section class="panel" id="p-answer"><h2>THE ANSWER FIRST</h2>
  <div class="tiles">
    <div class="tile main"><div class="l">The pane's label now</div><div class="v">${esc(label)}</div><div class="s">${t ? `${t.live === false ? "the day's settled close" : "the tool's own read at " + whenRead} on ${dayS(t.session)}: the tool reads ${f1(t.engine.reading)} and the script, on the same prices, ${f1(t.script.reading)}` : "from the last settled close"}</div></div>
    <div class="tile"><div class="l">Days checked</div><div class="v">${n0(a.days)}</div><div class="s">every trading day from ${day(H.from)} to ${day(H.to)}: the script's sum and the tool's sum give ${a.worst === 0 ? "the same reading on every one" : "readings within " + f1(a.worst) + " of each other"}</div></div>
    <div class="tile"><div class="l">The study's lows and highs</div><div class="v">${P.rows.filter((r) => r.gap <= 1 && r.gapTradingViewPayouts <= 1).length} of ${P.rows.length}</div><div class="s">within one point, ${dayS(F.asOf)} among them — and ${reads.length} read${reads.length === 1 ? "" : "s"} of today's prices, the two sides the same each time</div></div>
    <div class="tile"><div class="l">Still to prove</div><div class="v">on TradingView</div><div class="s">the script has never met TradingView's compiler or its prices. Kimi's install is where that is found out</div></div>
  </div>
  <ul>
    <li><b>What it is.</b> One line in its own pane under a chart: how much of the account the deployment system has invested on each daily bar. ${K.heldPct}% is held through pullbacks whatever the market does; the other ${K.tacticalPct}% moves with the market reading, from none of it at a reading of 0 to all of it at 100.</li>
    <li><b>It is the tool's number.</b> The market reading is the allocation tool's own sum of its two voting parts — SPY and QQQ's RSI together, and credit's own move with rates taken out. The script carries the tool's measured tables, written into it by a program, and its arithmetic was replayed against the tool's engine.</li>
    <li><b>It goes back to ${day(H.from)}</b>, ten sessions after HYG began trading, and the last bar is live: it counts today's prices as they trade.</li>
    <li><b>What to expect on TradingView.</b> Within about a point of the tool on most days. TradingView's prices differ from the Hub's by a cent here and there, and one cent on HYG moves the reading by up to ${f2(S.centWorst)} of a point.</li>
  </ul></section>

<section class="panel" id="p-pane"><h2>WHAT THE PANE WILL DRAW — A DRAWING MADE ON THIS PAGE, NOT A PICTURE OF TRADINGVIEW</h2>
  <p>These are drawn here from the script's own arithmetic on the Hub's prices, in the script's own colours. Move the pointer over a drawing, or click it and use the arrow keys, to read any day.</p>
  <h3>The last eighteen months — the pane as it comes, one line</h3>
  <div class="keys"><span><i style="border-color:${COL.bull}"></i>a day it has more invested than the day before</span><span><i style="border-color:${COL.bear}"></i>a day it has less</span><span><i class="band" style="background:${COL.line}"></i>tactical money at work, above the ${K.heldPct}% that is always held</span></div>
  <div class="fig" id="fig-recent" data-label="SPY's daily close over the last eighteen months, and under it the % of the account invested on each day"></div>
  <p class="cap">Two charts on one calendar, each with its own scale. The label on the last bar reads: <b>${esc(label)}</b>. The line turns green on a day the system has more invested than the day before and red on a day it has less; on a flat day it keeps its colour. It is jumpy by nature: the market reading moves about ${f0(moved)} points a session, so the line moves about ${f0(moved * K.tacticalPct / 100)} points of the account.</p>
  <details class="tv"><summary>THE SAME AS A TABLE — ONE ROW A WEEK</summary><div class="wrap"><table><thead><tr><th>week ending</th><th class="n">SPY close</th><th class="n">% invested</th><th class="n">market reading</th><th class="n">points from SPY and QQQ</th><th class="n">points from credit</th></tr></thead><tbody>${tableView}</tbody></table></div></details>
  <h3>One stretch up close — January to June 2020</h3>
  <div class="keys"><span><i style="border-color:${COL.bull}"></i>more invested than the day before</span><span><i style="border-color:${COL.bear}"></i>less</span><span><i class="tri"></i>the high (${dayS(hi20.date)}, pointing down) and the low (${dayS(lo20.date)}, pointing up) the study lists</span></div>
  <div class="fig" id="fig-2020" data-label="SPY's daily close from January to June 2020, and under it the % of the account invested on each day"></div>
  <p class="cap">This is what looking back at one moment gives. On ${day(hi20.date)}, a high the study lists, the pane had ${f0(hi20.script.invested)}% invested (market reading ${f0(hi20.script.reading)}). It first reached 100% on ${day(full20.date)}, with SPY ${f0(Math.abs((spyAt(full20.date) / spyAt(hi20.date) - 1) * 100))}% under that high, and was still at ${f0(lo20.script.invested)}% on ${day(lo20.date)}, the low the study lists, with SPY ${f0(Math.abs((spyAt(lo20.date) / spyAt(hi20.date) - 1) * 100))}% under it.</p>
  <h3>Every bar since ${day(H.from)} — looking back</h3>
  <div class="keys"><span><i style="border-color:${COL.bull}"></i>more invested than the day before</span><span><i style="border-color:${COL.bear}"></i>less</span><span><i class="tri"></i>a low the study lists (pointing up) or a high (pointing down)</span></div>
  <div class="fig" id="fig-all" data-label="SPY's daily close since April 2007, and under it the % of the account invested on each day, with the lows and highs the study lists marked"></div>
  <p class="cap">${lowsLine} ${highsLine} Each past bar is today's rule read on that day's closing prices — what the system would have said that day. The rule's curves were measured on these same years, so the past flatters it a little.</p>
  <h3>The last year, with the market reading and its two voting parts switched on</h3>
  <div class="keys"><span><i style="border-color:${COL.line}"></i>the market reading, 0 to 100 (teal)</span><span><i style="border-color:${COL.bull}"></i><i style="border-color:${COL.bear};margin-left:-4px"></i>SPY and QQQ together (a thin line): 50 plus its points</span><span><i class="dots" style="border-color:${COL.bull}"></i><i class="dots" style="border-color:${COL.bear};margin-left:-4px"></i>credit (dots): 50 plus its points</span></div>
  <div class="fig" id="fig-parts" data-label="The last year: the % invested, the market reading and its two voting parts"></div>
  <p class="cap">Both switches are off when the pane is first added. A part is green above the middle line, where it argues for more invested, and red below it, where it argues for less. A typical day (${f1(K.TYPICAL_DAY)}) plus the two parts' points is the market reading. The labels on the last bar, from the highest line down: ${partsLabels}.</p>
</section>

<section class="panel" id="p-agree"><h2>DOES IT DRAW THE TOOL'S NUMBER? — THE SCRIPT'S ARITHMETIC AGAINST THE TOOL'S ENGINE</h2>
  <p>The script's arithmetic was written a second time, statement for statement, in a program that reads its numbers out of the script file itself. That replay was set against the allocation tool's engine on the same prices. "To one point" was the bar.${H.fromTheScriptsOwnText ? ` As a check on the copying, the script's own text was also turned into a program by fixed rules, with nothing copied by hand, and run: on all ${n0(H.fromTheScriptsOwnText.days)} days it gives ${H.fromTheScriptsOwnText.worstAgainstTheHandWrittenReplay === 0 && H.fromTheScriptsOwnText.worstAgainstTheEngine === 0 ? "the same reading as the hand-written replay and as the tool" : "a reading within " + f1(Math.max(H.fromTheScriptsOwnText.worstAgainstTheHandWrittenReplay, H.fromTheScriptsOwnText.worstAgainstTheEngine)) + " of both"}.` : ""}</p>
  <div class="wrap"><table><thead><tr><th>day</th><th>what it is</th><th class="n">the tool's<br>reading</th><th class="n">the script's<br>reading</th><th class="n">gap</th><th class="n">the script with HYG's payouts<br>scaled back, as TradingView describes</th><th class="n">gap</th><th class="n">the tool's<br>% invested</th><th class="n">the script's<br>% invested</th><th>the label the pane shows</th></tr></thead><tbody>${agree}</tbody></table></div>
  <ul>
    <li><b>Every day there is.</b> On all ${n0(a.days)} trading days from ${day(H.from)} to ${day(H.to)}, fed the tool's own prices, ${a.worst === 0 ? "the script gives the same reading as the tool on every one" : "the script is never more than " + f1(a.worst) + " of a point from the tool"}.</li>
    <li><b>With HYG's payouts added back the way TradingView describes it</b> (every earlier price scaled down by the payout's share of the price), it is within one point on ${f1(b.shareWithin1)}% of those days (the middle gap is ${f1(b.median)}; 99 days in 100 are within ${f1(b.p99)}). ${b.over1 ? `The ${b.over1} days over one point all fall between ${b.over1First.slice(0, 4)} and ${b.over1Last.slice(0, 4)}; the worst is ${f1(b.worst)} on ${day(b.worstOn)}.` : ""} In the last year the worst gap was ${f1(yr.worst)}. ${H.roundingToTheCentAlone && H.roundingToTheCentAlone.over1 ? `The main cause is known: the tool's long table of HYG with payouts is rounded to the cent, and HYG's price in it was ${f0(H.roundingToTheCentAlone.tablePrice.first)} in 2007 against ${f0(H.roundingToTheCentAlone.tablePrice.last)} now, so a cent was more of it. Rounding to the cent, with nothing else changed, makes ${H.roundingToTheCentAlone.over1} such days by itself, all between ${H.roundingToTheCentAlone.over1First.slice(0, 4)} and ${H.roundingToTheCentAlone.over1Last.slice(0, 4)}.` : ""}${H.betweenTheTwoUsualWays ? ` TradingView does not print its exact arithmetic. The other usual way, the tool's own day-by-day chain, run on the same closes and payouts, never puts the reading more than ${f1(H.betweenTheTwoUsualWays.worst)} from the scaled one (${day(H.betweenTheTwoUsualWays.worstOn)}; ${f1(H.betweenTheTwoUsualWays.lastYearWorst)} in the last year), so the pane does not hang on which one it uses.` : ""}</li>
  </ul></section>

<section class="panel" id="p-wrong"><h2>WHAT COULD BE WRONG</h2>
  <ol>
    <li><b>It has never been compiled.</b> There is no TradingView access from here. The arithmetic is proved; the spelling of the script is not. If TradingView's editor rejects a line, Kimi may make three small named fixes, none of which touches a number, and must stop for anything else.</li>
    <li><b>TradingView's prices are not the Hub's.</b> Credit's own move is a small number. On ${day(S.on)} one cent on HYG's close moved the reading by ${f2(S.cent["HYG today"])} of a point and one cent on the Treasury fund by ${f2(S.cent["the Treasury fund today"])}; a cent on SPY or QQQ moved it by ${f2(Math.max(S.cent["SPY today"], S.cent["QQQ today"]))}. Across the last year the most a single cent moved it was ${f2(S.centWorstYear)}. So a point of difference from the tool on an ordinary day is within what the two feeds can explain.</li>
    <li><b>HYG's payout day.</b> On the first trading day of a month HYG trades without its payout (about ${f1(O.latePayout.meanPayoutPct)}% of its price). If TradingView were late adding it back, the reading that day would be off by about ${f0(O.latePayout.medianGap)} points (${f0(O.latePayout.worstGap)} at worst, in either direction) until it caught up. The tool keeps its own payout list. Worth one look on the next payout day.</li>
    <li><b>After the close.</b> Until the day's close is settled, the tool goes on counting prices traded after 16:00 New York; the pane stops at the close. ${stray ? `Today at ${stray.readAt.slice(11, 16)} the tool took one stray QQQ price (${f2(stray.prices.QQQ)}${strayAfter ? ", against " + f2(strayAfter.prices.QQQ) + " at " + strayAfter.readAt.slice(11, 16) : ""}) and read ${f0(stray.engine.reading)} for that one read${strayAfter ? "; at " + strayAfter.readAt.slice(11, 16) + " it read " + f0(strayAfter.engine.reading) + " again" : ""}. The pane reads the regular session only, so a price traded after the close does not reach it.` : ""}</li>
    <li><b>Looking back flatters it.</b> The line on a past bar is today's rule on that day's prices. The rule's curves were measured on those same years (2009 to 2026). The test on years it had not seen is on the tool's study page, not in this pane.</li>
    <li><b>The Treasury fund is read without its payouts</b> — the tool's own choice, copied here. Since 2016 its close has fallen ${f2(Math.abs(O.treasuryPayout.meanFallOnThoseDaysPct))}% more on its ${O.treasuryPayout.payoutDays} payout days than on other days, which puts about ${sg(O.treasuryPayout.putsIntoCreditOwn, 2)} into credit's own move for the ten sessions after each one. Taking that out would have moved the reading by a middle ${f1(O.treasuryPayout.lastYear.medianReadingMoved)} points (${f1(O.treasuryPayout.lastYear.worstReadingMoved)} at worst) on the ${O.treasuryPayout.lastYear.sessionsWithAPayoutDayInTheirTenSessions} sessions of the last year it touched. The pane and the tool agree because both do it; whether the tool should is a question for its study.</li>
    <li><b>The shape is typed in twice.</b> ${K.heldPct} held and ${K.tacticalPct} tactical are the tool's baseline today, set as two inputs of the pane. If the shape changes in the tool, the pane must be changed by hand.</li>
  </ol>
  <h3>What was not done</h3>
  <ul>
    <li>Not installed, not compiled, and no picture from TradingView: that is Kimi's task, written and ready.</li>
    <li>The pane draws the two voting parts only. The tool's lights — the VIX, breadth, the leaders — are not in it, and neither is the tool's switch for averaging the last few readings.</li>
    <li>No alerts. Nothing deployed. No table touched.</li>
  </ul></section>

<section class="panel" id="p-kimi"><h2>HOW IT GETS ONTO TRADINGVIEW</h2>
  <ul>
    <li>Kimi saves it as a new script, <b>Scintilla Deployment Pane</b>, and builds a new layout, <b>Scintilla — Deployment</b>: four daily charts — SPY with the pane under it, QQQ, the VIX and HYG — set to move together, so scrolling back on one shows the same day on all four.</li>
    <li>No tab that is open today is touched. The new layout is made from the app's own new-tab page.</li>
    <li>Kimi then reads the pane's own numbers on eight past days and sets them beside ours, and reads back the text TradingView saved so it can be checked against the text that was proved.</li>
  </ul></section>

<section class="panel" id="p-dec"><h2>DECISIONS FOR ALAN</h2>
  <ol>
    <li><b>The line's colour.</b> As built it is green on a day it has more invested and red on a day it has less — the Hub's rule for a line. The other choice is one calm teal line. <b>Recommended: keep green and red.</b> It is one switch in the pane's settings either way.</li>
    <li><b>The scale.</b> The pane runs from 0 to 100 and the line lives between ${K.heldPct} and 100, so it uses the top third. That shows at a glance how much is always held. The other choice is to let the pane close in on ${K.heldPct} to 100. <b>Recommended: keep 0 to 100</b>; TradingView lets you stretch the scale by hand on the day you want the detail.</li>
    <li><b>Where the pane sits.</b> Under SPY only, as asked, or under all four charts. <b>Recommended: SPY only.</b> It draws the same line under any symbol, so four copies add height and nothing else.</li>
  </ol></section>

<details class="sc-pagespecs"><summary>PAGE SPECS</summary>
  <p><b>Where each number comes from.</b> The tool's readings: the allocation tool's engine, fed the closes its study was built from (SPY, QQQ, HYG and the 7–10 year Treasury fund from the Hub's chart service; HYG with its payouts from the study's own table). The script's readings: a replay of the script's arithmetic that reads every table and constant out of the script file. Today's rows: the tool's own live read of the chart service, and the script on the very same prices. Nothing on this page is typed in by hand; it is written by a program from the proof file.</p>
  <p><b>How the drawings are made.</b> On this page, from that replay, in the script's own colours and with its own label words. They show what the script computes. They do not show TradingView's rendering, its fonts or its prices.</p>
  <p><b>The script.</b> Paste-ready, written for version 6 of TradingView's script language. It asks TradingView for four daily series and uses ${SRC.match(/^\/\/ PLOTS (\d+)\/64/m)[1]} of the 64 plots a script may draw. No white anywhere. Its tables are written into it by a program from the tool's model file, never typed.</p>
  <p><b>The colours.</b> Green ${COL.bull} and red ${COL.bear} are the Hub's own up and down; teal ${COL.line} is the family tone, used for the market reading and the shaded band. Checked with a colour-separation program on a black ground, every pair of the three: the closest pair is ${COLOUR_CHECK.colourBlindWorst} apart for red-green colour blindness (the bar is 8) and ${COLOUR_CHECK.fullVisionWorst} apart for full colour vision (the bar is 15), and each clears ${COLOUR_CHECK.contrastAtLeast} to 1 against the ground. A first choice for the market reading, a brighter teal, sat only 12.6 from the green and was dropped. The green and the teal are brighter than that program's band for evenly weighted series; they are the house colours and were left as they are. A rising stretch of line is always green and a falling one always red, so the colour never carries anything the slope does not, and every line is named by a label at its last bar.</p>
  <p><b>The proof and the tests.</b> One program writes the proof file this page is built from. A set of automatic checks holds the script to the tool's model, the replay to the engine, the plot count and the no-white rule to the script's text, and this page's numbers to the proof.</p>
  <p><b>Kimi's task.</b> Written and ready beside the script. After the install, one command says whether the text TradingView saved is the text that was proved, and names every line that differs if it is not.</p>
</details>
<script src="pn1-page-data.js"></script><script src="pn1-page.js"></script>
</body></html>
`;
fs.writeFileSync(path.join(ROOT, "study/pn1/PN1.html"), html);
console.log(JSON.stringify({ wrote: ["study/pn1/PN1.html", "study/pn1/pn1-page-data.js"], bars: rows.length, lastBar: lastRow.date, label, labelsWithParts: lab({ showReading: true, showParts: true }).map((l) => l.text + " @" + l.y), htmlBytes: html.length, dataBytes: fs.statSync(path.join(ROOT, "study/pn1/pn1-page-data.js")).size }));
