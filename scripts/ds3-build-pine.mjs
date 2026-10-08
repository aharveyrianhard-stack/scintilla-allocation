/* DS3 (8 Oct 2026) — writes VERSION 3 of the TradingView script to study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine, the path the installer reads.
     node scripts/ds3-build-pine.mjs            write the file (and keep version 2 beside it as SCINTILLA-DEPLOYMENT-PANE.v2.pine)
     node scripts/ds3-build-pine.mjs --check    exit 1 if the file on disk is not what this would write
   No key, no network, no table: it reads files in this repo and writes one.

   HOW VERSION 3 IS MADE — nothing in it is typed twice
     · it starts as the text DS2's own builder writes for version 2 (scripts/ds2-build-pine.mjs → buildPine2), so every line version 3 did
       not change is version 2's line, byte for byte (a test holds it);
     · each change is one exact replacement below. A replacement whose anchor is not found exactly once stops the build — so if version 2's
       text ever moves, this fails loudly instead of writing a script nobody proved;
     · version 3's numbers come from the study's rule file (study/ds3/data/ds3-live.json → rules; study/ds3/number.mjs is their sum), and
       the two percentages quoted in the header from the study itself (study/ds3/data/ds3.json);
     · the measured gaps quoted in the header come from study/ds3/data/ds3-pane-proof.json (scripts/ds3-prove-pane.mjs) when it exists. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { pineNumbers } from "./pn1-build-pine.mjs"; import { buildPine2, stretches } from "./ds2-build-pine.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PINE3 = path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine"), PINE2 = path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.v2.pine"), PINE1 = path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.v1.pine"), PROOF3 = path.join(ROOT, "study/ds3/data/ds3-pane-proof.json"), RULES_FILE = path.join(ROOT, "study/ds3/data/ds3-live.json"), STUDY = path.join(ROOT, "study/ds3/data/ds3.json");
const J = (f) => JSON.parse(fs.readFileSync(f, "utf8")), fl = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x)), pr = (x) => String(x), pct = (x) => Math.round(x * 100);
/* one exact replacement: the anchor must be in the text exactly once */
function rep(text, from, to, what) { const k = text.split(from).length - 1; if (k !== 1) throw new Error("version 3's build: the anchor for \"" + what + "\" is in version 2's text " + k + " times, not once"); return text.replace(from, () => to); }

export function buildPine3(n = pineNumbers(), R = J(RULES_FILE).rules, proof = fs.existsSync(PROOF3) ? J(PROOF3) : null, v1 = fs.readFileSync(PINE1, "utf8"), study = J(STUDY)) {
  const V = study.evidence.vix, at23 = V.all.find((r) => r.name === "a close at 23 or more"), any = V.any;
  /* version 2's text with version 3's measured gaps in the place of version 2's (the builder takes the proof as a parameter; with none
     yet it writes the pointer line, which the first replacement below turns to this study's page) */
  let t = buildPine2(n, R, proof, v1, stretches());
  if (!proof) t = rep(t, "//      The measured gaps are on the page beside this work (study/ds2/DS2.html).", "//      The measured gaps are on the page beside this work (study/ds3/DS3.html).", "the pointer to the measured gaps");
  else t = rep(t, "//      Measured with a replay of this script's arithmetic against the allocation tool's own sum on the", "//      Measured with a replay of this script's arithmetic against the sum the study tested, on the", "whose sum the gaps are measured against");
  /* ---------- the header ---------- */
  t = rep(t, "// SCINTILLA · DEPLOYMENT PANE  ·  version 2  ·  7 Oct 2026", "// SCINTILLA · DEPLOYMENT PANE  ·  version 3  ·  8 Oct 2026", "the title line");
  t = rep(t, `// PLOTS 17/64  (the % invested line coloured by its daily direction = 2 · the held floor = 1 · the
//              shading between the two = 1 · version 1's line = 1 · the market reading = 1 · its two
//              voting parts, each green or red by its sign = 4 · five Data Window numbers = 5 · the
//              band behind the stretches where cash is raised = 2 · the three level lines and the
//              labels are outside the plot budget)
// REQUESTS 8/40  (SPY and QQQ: their RSI, their distance from their 252-session high and from their
//              200-day average · HYG and the 7–10 year Treasury fund IEF: their ten-session move)`,
`// PLOTS 23/64  (the % invested line coloured by its daily direction = 2 · the held floor = 1 · the
//              shading between the two = 1 · version 1's line = 1 · version 2's line = 1 · the market
//              reading = 1 · its three counted parts, each coloured by its sign = 6 · eight Data
//              Window numbers = 8 · the band behind the stretches where cash is raised = 2 · the
//              three level lines and the labels are outside the plot budget)
// REQUESTS 10/40  (SPY and QQQ: their RSI, their distance from their 252-session high and from their
//              200-day average · HYG and the 7–10 year Treasury fund IEF: their ten-session move ·
//              the VIX: its close and its high)`, "the plot and request budget");
  t = rep(t, `// WHICH BARS COUNT. Every finished daily bar`, `// WHAT VERSION 3 CHANGES (8 Oct 2026). Two more things, each with its own switch; with these two
// switched off this pane draws version 2 exactly, and with all four off version 1.
//   C. THE VIX IS COUNTED, BY ITS LEVEL. A close at ${pr(R.vixLo)} or more adds ${pr(R.vixAddLo)} points to the market reading; a
//      close at ${pr(R.vixHi)} or more adds ${pr(R.vixAddHi)} in all. A day whose high reached a level its close did not counts
//      that level's step at a half. Under ${pr(R.vixLo)} it adds nothing. The VIX's points go into the reading with
//      the other parts, so they are held to 0–100 and halved while cash is raised.
//      Why: these are the levels the account's owner buys at. On years the rule had not seen, the
//      days the VIX closed at ${pr(R.vixHi)} or more were followed by a higher market a month later ${pct(at23.share20)}% of the
//      time (any day: ${pct(any.share20)}%).
//   D. A TREASURY RALLY CAN ONLY RAISE THE CREDIT PART. Credit's own move takes half of the Treasury
//      fund's move off HYG's, so a rally in Treasuries pulls it down. When the Treasury fund is up
//      over the ten sessions the credit part is read both ways — on credit's own move, and on HYG's
//      move alone — and the higher of the two counts. When Treasuries fell, nothing changes.
//      Why: money running to Treasuries is fear, not credit weakness. It is "the higher of the two"
//      because on the big flight-to-safety days the first reading is already so low that the curve
//      reads a washout and adds; HYG's move alone would take that add away.
//
// WHICH BARS COUNT. Every finished daily bar`, "what version 3 changes");
  t = rep(t, `//   6. The tool lets you switch a light on so that it counts. This pane shows the two voting parts only.`, `//   6. The tool lets you switch a light on so that it counts. This pane shows the counted parts only.`, "known difference 6");
  t = rep(t, `//      past day's reading appears on that day's last bar, and the live bar is live.
//`, `//      past day's reading appears on that day's last bar, and the live bar is live.
//   9. The VIX. Its close and its high are TradingView's own daily bar for the VIX. If that bar's high
//      differs from the Hub's, a touch of ${pr(R.vixLo)} or ${pr(R.vixHi)} can count on one and not on the other: half a step,
//      ${pr(Math.max(R.vixAddLo, R.vixAddHi - R.vixAddLo) * R.vixTouch)} points of the market reading at most. While "Count the VIX" is switched on there is no reading
//      on a bar with no price for the VIX.
//  10. The allocation tool does not show version 3 on 8 Oct 2026. This pane is ahead of it.
//`, "known differences 9 and 10");
  t = rep(t, `// four funds on any symbol's chart, so it shows the same line under SPY, QQQ, the VIX or anything else.`, `// four funds and the VIX on any symbol's chart, so it shows the same line under SPY, QQQ or anything else.`, "the paste line");
  /* ---------- the numbers ---------- */
  t = rep(t, `const float  CASH_CUT    = ${fl(R.cashCut)}         // while cash is raised, the market reading is multiplied by this
`, `const float  CASH_CUT    = ${fl(R.cashCut)}         // while cash is raised, the market reading is multiplied by this
// version 3's numbers (written from the study's rule file)
const float  VIX_LO      = ${fl(R.vixLo)}        // a VIX close at this or more adds VIX_ADD_LO points to the market reading
const float  VIX_HI      = ${fl(R.vixHi)}        // a VIX close at this or more adds VIX_ADD_HI points in all
const float  VIX_ADD_LO  = ${fl(R.vixAddLo)}
const float  VIX_ADD_HI  = ${fl(R.vixAddHi)}
const float  VIX_TOUCH   = ${fl(R.vixTouch)}         // a day whose high reached a level its close did not counts that step at this share
`, "version 3's constants");
  /* ---------- the inputs ---------- */
  t = rep(t, `
const string G_LOOK = "Look"`, `
const string G_RULE3 = "What version 3 changed — switch either off to see the line without it"
bool vixRule  = input.bool(true, "Count the VIX: adds from ${pr(R.vixLo)}, more from ${pr(R.vixHi)}", group = G_RULE3,
     tooltip = "On: a VIX close at ${pr(R.vixLo)} or more adds ${pr(R.vixAddLo)} points to the market reading, a close at ${pr(R.vixHi)} or more adds ${pr(R.vixAddHi)} in all; a day whose high reached a level its close did not counts that step at a half; under ${pr(R.vixLo)} it adds nothing. Off: the VIX is not counted, as in version 2.")
bool fearRule = input.bool(true, "A Treasury rally can only raise the credit part", group = G_RULE3,
     tooltip = "On: when the 7–10 year Treasury fund is up over the ten sessions, the credit part is read both ways — on credit's own move, and on HYG's move alone — and the higher of the two counts. Off: credit's own move alone, as in version 2.")

const string G_LOOK = "Look"`, "version 3's two switches");
  t = rep(t, `     tooltip = "A thin line: the % invested with neither of version 2's two changes. Where the two lines part, version 2 changed the number.")`, `     tooltip = "A thin line: the % invested with none of the four changes of versions 2 and 3.")
bool showV2      = input.bool(false, "Show version 2's line beside it", group = G_LOOK,
     tooltip = "A thin line: the % invested with version 2's two changes as they are switched and neither of version 3's. Where the two lines part, version 3 changed the number.")`, "the version 2 line's switch");
  t = rep(t, `bool showParts   = input.bool(false, "Show the reading's two voting parts", group = G_LOOK,
     tooltip = "SPY and QQQ together (a thin line) and credit (dots). Each is drawn as 50 plus the points it adds to the market reading: green above the middle line, where it argues for more invested, red below it, where it argues for less. Credit is drawn as it is counted, after version 2's fade.")`, `bool showParts   = input.bool(false, "Show the reading's counted parts", group = G_LOOK,
     tooltip = "SPY and QQQ together (a thin line), credit (dots) and the VIX (a thin line). Each is drawn as 50 plus the points it adds to the market reading: green above the middle line, where it argues for more invested, red below it, where it argues for less. Credit is drawn as it is counted, after version 2's fade and version 3's Treasury rule. The VIX sits on the middle line while it adds nothing.")`, "the parts switch");
  t = rep(t, `string iefSym = input.symbol("NASDAQ:IEF", "7–10 year Treasury fund (rates)",  group = G_FEED, display = display.none)`, `string iefSym = input.symbol("NASDAQ:IEF", "7–10 year Treasury fund (rates)",  group = G_FEED, display = display.none)
string vixSym = input.symbol("TVC:VIX",    "The VIX",                          group = G_FEED, display = display.none)`, "the VIX's symbol");   /* TVC:VIX is the symbol the layout "Scintilla — Deployment" already charts */
  /* ---------- the requests ---------- */
  t = rep(t, `string hygT = ticker.modify(hygSym, session.regular, adjustment.dividends)`, `string hygT = ticker.modify(hygSym, session.regular, adjustment.dividends)
string vixT = vixSym`, "the VIX's ticker");
  t = rep(t, `float qqqOver = request.security(qqqT, "D", overAvg(close), lookahead = barmerge.lookahead_off)`, `float qqqOver = request.security(qqqT, "D", overAvg(close), lookahead = barmerge.lookahead_off)
// version 3: the VIX's own daily bar — its close and its high
float vixClose = request.security(vixT, "D", close, lookahead = barmerge.lookahead_off)
float vixHigh  = request.security(vixT, "D", high, lookahead = barmerge.lookahead_off)`, "the VIX's two requests");
  /* ---------- the sum ---------- */
  t = rep(t, `float ptsFitted = pointsAt(CREDIT_PLACES, CREDIT_POINTS, creditOwn)`, `float ptsOwn    = pointsAt(CREDIT_PLACES, CREDIT_POINTS, creditOwn)
// version 3, D: when the Treasury fund is up over the ten sessions, credit is read both ways and the higher counts
float hygAlone  = hygMove * 100.0
float ptsAlone  = pointsAt(CREDIT_PLACES, CREDIT_POINTS, hygAlone)
bool  rally     = iefMove > 0.0
float ptsFitted = na(ptsOwn) ? na : fearRule and rally and not na(ptsAlone) ? math.max(ptsOwn, ptsAlone) : ptsOwn`, "the Treasury rule");
  t = rep(t, `// version 2, B: on at an extended high, off at the next washout; the state is kept from bar to bar`, `// version 3, C: the VIX by its level — a close at ${pr(R.vixLo)} adds ${pr(R.vixAddLo)}, at ${pr(R.vixHi)} adds ${pr(R.vixAddHi)} in all; a touch counts at a half
float vixTop    = na(vixHigh) ? vixClose : math.max(vixHigh, vixClose)
float stepLo    = vixClose >= VIX_LO ? 1.0 : vixTop >= VIX_LO ? VIX_TOUCH : 0.0
float stepHi    = vixClose >= VIX_HI ? 1.0 : vixTop >= VIX_HI ? VIX_TOUCH : 0.0
float ptsVix    = not vixRule ? 0.0 : na(vixClose) ? na : VIX_ADD_LO * stepLo + (VIX_ADD_HI - VIX_ADD_LO) * stepHi
// version 2, B: on at an extended high, off at the next washout; the state is kept from bar to bar`, "the VIX's steps");
  t = rep(t, `if not na(ptsRsi) and not na(ptsFitted)
    if rsiBoth < RESET_RSI`, `if not na(ptsRsi) and not na(ptsFitted) and not na(ptsVix)
    if rsiBoth < RESET_RSI`, "the days the raise-cash state moves on");
  t = rep(t, `// no reading unless both parts have one (before 25 Apr 2007 HYG did not trade)
float beforeCut = na(ptsRsi) or na(ptsCredit) ? na : math.max(0.0, math.min(100.0, TYPICAL_DAY + ptsRsi + ptsCredit))`, `// no reading unless every counted part has one (before 25 Apr 2007 HYG did not trade)
float beforeCut = na(ptsRsi) or na(ptsCredit) or na(ptsVix) ? na : math.max(0.0, math.min(100.0, TYPICAL_DAY + ptsRsi + ptsCredit + ptsVix))`, "the sum itself");
  t = rep(t, `// version 1, for the thin line: neither change
float readingOld  = na(ptsRsi) or na(ptsFitted) ? na : math.round(math.max(0.0, math.min(100.0, TYPICAL_DAY + ptsRsi + ptsFitted)), 1)
float investedOld = math.min(100.0, heldPct + tacticalPct * readingOld / 100.0)`, `// version 1, for the thin line: none of the four changes
float readingOld  = na(ptsRsi) or na(ptsOwn) ? na : math.round(math.max(0.0, math.min(100.0, TYPICAL_DAY + ptsRsi + ptsOwn)), 1)
float investedOld = math.min(100.0, heldPct + tacticalPct * readingOld / 100.0)
// version 2, for its thin line: version 2's two changes as they are switched, neither of version 3's
float ptsCredit2 = creditRule and ptsOwn < 0.0 ? ptsOwn * fade : ptsOwn
float before2    = na(ptsRsi) or na(ptsCredit2) ? na : math.max(0.0, math.min(100.0, TYPICAL_DAY + ptsRsi + ptsCredit2))
float reading2   = na(before2) ? na : math.round(cashOn ? before2 * CASH_CUT : before2, 1)
float invested2  = math.min(100.0, heldPct + tacticalPct * reading2 / 100.0)`, "the two earlier versions' lines");
  /* ---------- the pane ---------- */
  t = rep(t, `// the two voting parts, each as 50 plus its points: green while it adds to the reading, red while it takes away`, `// the counted parts, each as 50 plus its points: green while it adds to the reading, red while it takes away`, "the parts' comment");
  t = rep(t, `color colB  = ptsCredit >= 0 ? C_BULL : C_BEAR`, `color colB  = ptsCredit >= 0 ? C_BULL : C_BEAR
float partC = 50.0 + ptsVix
color colC  = ptsVix > 0 ? C_BULL : C_AXIS`, "the VIX's part");
  t = rep(t, `plot(showOld ? investedOld : na, "version 1 (line)", color = color.new(C_LINE, 45), linewidth = 1, display = display.all - display.status_line)`, `plot(showOld ? investedOld : na, "version 1 (line)", color = color.new(C_LINE, 45), linewidth = 1, display = display.all - display.status_line)
plot(showV2 ? invested2 : na, "version 2 (line)", color = color.new(C_DEEP, 20), linewidth = 1, display = display.all - display.status_line)`, "version 2's line");
  t = rep(t, `plot(showParts ? partB : na, "credit: 50 + its points", color = colB, linewidth = 1, style = plot.style_circles, display = display.all - display.status_line)`, `plot(showParts ? partB : na, "credit: 50 + its points", color = colB, linewidth = 1, style = plot.style_circles, display = display.all - display.status_line)
plot(showParts ? partC : na, "the VIX: 50 + its points", color = colC, linewidth = 1, display = display.all - display.status_line)`, "the VIX's line");
  t = rep(t, `plot(investedOld, "% invested, version 1",                   color = C_AXIS, display = display.data_window)`, `plot(investedOld, "% invested, version 1",                   color = C_AXIS, display = display.data_window)
plot(invested2,   "% invested, version 2",                   color = C_AXIS, display = display.data_window)
plot(ptsVix,      "the VIX adds, points of the market reading", color = C_AXIS, display = display.data_window)
plot(na(invested) ? na : fearRule and rally and ptsAlone > ptsOwn ? 1.0 : 0.0, "a Treasury rally raised the credit part (1 = yes)", color = C_AXIS, display = display.data_window)`, "the three new Data Window numbers");
  /* ---------- the labels ---------- */
  t = rep(t, `string waiting = (na(spyRsi) ? " SPY" : "") + (na(qqqRsi) ? " QQQ" : "") + (na(hygMove) ? " HYG" : "") + (na(iefMove) ? " IEF" : "")`, `string waiting = (na(spyRsi) ? " SPY" : "") + (na(qqqRsi) ? " QQQ" : "") + (na(hygMove) ? " HYG" : "") + (na(iefMove) ? " IEF" : "") + (vixRule and na(vixClose) ? " VIX" : "")`, "the waiting label");
  t = rep(t, `array.push(ts, "Invested " + whole(invested) + "% · market reading " + whole(reading) + (cashOn ? " · cash raised" : ""))`, `array.push(ts, "Invested " + whole(invested) + "% · market reading " + whole(reading) + (cashOn ? " · cash raised" : "") + (ptsVix > 0 ? " · VIX +" + whole(ptsVix) : ""))`, "the first label");
  t = rep(t, `        if showReading
            array.push(ys, reading)`, `        if showV2
            array.push(ys, invested2)
            array.push(ts, "version 2: " + whole(invested2) + "%")
            array.push(cs, C_LINE)
        if showReading
            array.push(ys, reading)`, "version 2's label");
  t = rep(t, `            array.push(ts, "credit " + signed1(ptsCredit))
            array.push(cs, colB)`, `            array.push(ts, "credit " + signed1(ptsCredit))
            array.push(cs, colB)
            array.push(ys, partC)
            array.push(ts, "the VIX " + signed1(ptsVix))
            array.push(cs, colC)`, "the VIX's label");
  return t; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = buildPine3();
  if (process.argv.includes("--check")) { const on = fs.existsSync(PINE3) ? fs.readFileSync(PINE3, "utf8") : null; if (on !== text) { console.error("study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine is not what scripts/ds3-build-pine.mjs writes — run it again"); process.exit(1); } console.log("the version 3 script on disk is what the build writes"); }
  else { /* version 2's file is kept beside it, byte for byte, the first time version 3 is written over its path */
    if (!fs.existsSync(PINE2)) { const cur = fs.readFileSync(PINE3, "utf8"); if (!/DEPLOYMENT PANE  ·  version 2  ·/.test(cur)) throw new Error("the file at the installer's path is not version 2, and no version 2 copy exists to keep"); fs.writeFileSync(PINE2, cur); }
    fs.writeFileSync(PINE3, text); console.log(JSON.stringify({ wrote: path.relative(ROOT, PINE3), bytes: text.length, lines: text.split("\n").length, kept: path.relative(ROOT, PINE2) })); } }
