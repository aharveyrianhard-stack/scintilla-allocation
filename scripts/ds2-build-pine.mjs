/* DS2 (7 Oct 2026) — writes VERSION 2 of the TradingView script to study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine, the path the installer reads.
     node scripts/ds2-build-pine.mjs            write the file
     node scripts/ds2-build-pine.mjs --check    exit 1 if the file on disk is not what this would write
   No key, no network, no table: it reads files in this repo and writes one.

   WHERE EVERY PART OF THE SCRIPT COMES FROM — nothing in it is typed by hand
     · the place tables, the points curves, the typical day, the account's shape: the tool's model file, through PN1's own pineNumbers()
     · version 2's thresholds: study/ds2/data/ds2-live.json → rules (study/ds2/number.mjs is the sum they belong to)
     · the lines that did not change — Wilder's RSI, pointsAt, the palette, the two number formats — are copied OUT OF VERSION 1's FILE
       (study/pn1/SCINTILLA-DEPLOYMENT-PANE.v1.pine), so the arithmetic PN1 proved is in version 2 byte for byte (a test holds it)
   The measured gaps quoted in the header come from study/ds2/data/ds2-pane-proof.json (scripts/ds2-prove-pane.mjs) when that file exists. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { pineNumbers } from "./pn1-build-pine.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PINE2 = path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.v2.pine")   /* DS3 (8 Oct): the installer's path now holds version 3; version 2 is kept beside it, byte for byte */, PINE1 = path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.v1.pine"), PROOF2 = path.join(ROOT, "study/ds2/data/ds2-pane-proof.json"), RULES_FILE = path.join(ROOT, "study/ds2/data/ds2-live.json");
const J = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
function wrapList(head, nums, tail = ")") { const lines = []; let cur = head; nums.forEach((v, i) => { const piece = String(v) + (i < nums.length - 1 ? ", " : tail); if ((cur + piece).length > 112) { lines.push(cur.replace(/\s+$/, "")); cur = "     " + piece; } else cur += piece; }); lines.push(cur); return lines.join("\n"); }
const day = (iso) => { const [y, m, d] = iso.split("-"); return `${+d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} ${y}`; };
const one = (x) => (Math.round(x * 10) / 10).toFixed(1), fl = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x)), pr = (x) => String(x);   // fl: a number as the code wants it (45.0) · pr: as a sentence wants it (45)
/* a block of version 1's own text, from the line that starts with `from` up to (not including) the line that starts with `to` */
export function blockOf(src, from, to) { const lines = src.split("\n"), a = lines.findIndex((l) => l.startsWith(from)), b = lines.findIndex((l, i) => i > a && l.startsWith(to)); if (a < 0 || b < 0) throw new Error("version 1 has no block from " + JSON.stringify(from) + " to " + JSON.stringify(to)); return lines.slice(a, b).join("\n").replace(/\n+$/, ""); }

function measuredLines(proof) { if (!proof) return ["//      The measured gaps are on the page beside this work (study/ds2/DS2.html)."];
  const a = proof.history.samePrices, b = proof.history.tradingViewPayouts, yr = proof.history.lastYear.tradingViewPayouts, n = (x) => x.toLocaleString("en-US");
  return [`//      Measured with a replay of this script's arithmetic against the allocation tool's own sum on the`,
    `//      ${n(a.days)} days from ${day(proof.history.from)} to ${day(proof.history.to)}:`,
    `//        · fed the tool's own prices, ${a.worst === 0 ? "the reading is the same on every one of those days" : `the reading never differs by more than ${one(a.worst)} of a point`}, and the`,
    `//          raise-cash rule is on and off on the same days;`,
    `//        · fed HYG's payouts the way TradingView adds them back, it is within one point on ${one(b.shareWithin1)}% of`,
    `//          days (median gap ${b.median.toFixed(1)}; 99 days in 100 within ${one(b.p99)}); the worst is ${one(b.worst)} on ${day(b.worstOn)},`,
    `//          and in the last year ${one(yr.worst)}.`]; }

/* how the raise-cash stretches of the rule AS THE PANE CARRIES IT turned out since 2018 (study/ds2/data/ds2.json → firm.latchAll) */
export function stretches(study = J(path.join(ROOT, "study/ds2/data/ds2.json"))) { const e = study.firm.latchAll.filter((x) => x.from >= "2018-01-01" && !x.open); return { n: e.length, higher: e.filter((x) => x.blendPct > 0).length }; }
export function buildPine2(n = pineNumbers(), R = J(RULES_FILE).rules, proof = fs.existsSync(PROOF2) ? J(PROOF2) : null, v1 = fs.readFileSync(PINE1, "utf8"), st = stretches()) {
  const palette = blockOf(v1, "// colours —", "// ── inputs"), wilder = blockOf(v1, "// ── Wilder's RSI", "// ── requests"), points = blockOf(v1, "// ── a part's points", "// ── the sum"), formats = blockOf(v1, "// numbers as the allocation tool writes them", "// ── labels on the last bar");
  return `//@version=6
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SCINTILLA · DEPLOYMENT PANE  ·  version 2  ·  7 Oct 2026
// PLOTS 17/64  (the % invested line coloured by its daily direction = 2 · the held floor = 1 · the
//              shading between the two = 1 · version 1's line = 1 · the market reading = 1 · its two
//              voting parts, each green or red by its sign = 4 · five Data Window numbers = 5 · the
//              band behind the stretches where cash is raised = 2 · the three level lines and the
//              labels are outside the plot budget)
// REQUESTS 8/40  (SPY and QQQ: their RSI, their distance from their 252-session high and from their
//              200-day average · HYG and the 7–10 year Treasury fund IEF: their ten-session move)
//
// WHAT IT IS. The allocation tool's deployment system drawn in its own pane, with its history: how
// much of the account the system has invested on every daily bar, on a scale from 0 to 100.
//     % invested = the part held through pullbacks (${n.held}) + the tactical part (${n.tactical}) × the market reading ÷ 100
// A market reading of 0 leaves all the tactical money in cash (${n.held}% invested); 100 puts all of it to
// work (${Math.min(100, n.held + n.tactical)}% invested).
//
// THE MARKET READING (0–100) is the allocation tool's own sum, from the two parts that earned a vote
// when the tool was tested on years it had not seen:
//   1. SPY AND QQQ TOGETHER — the plain average of the two funds' 14-day RSI (Wilder's).
//   2. CREDIT'S OWN MOVE — HYG's move over ten sessions with its payouts counted, less half of the
//      7–10 year Treasury fund's move over the same ten sessions, in %. HYG's bonds are about half as
//      long as that fund's, so this takes the rates part out and leaves what credit did by itself.
//   Each of the two is given its place among the ${n.days.toLocaleString("en-US")} days the rule was measured on (${day(n.from)} –
//   ${day(n.to)}; 0 = the lowest seen, 100 = the highest), and that place is read off the part's own
//   measured curve as points.
//   Market reading = ${one(n.typical)} (a typical day) + the two parts' points, held between 0 and 100.
//
// WHAT VERSION 2 CHANGES (7 Oct 2026). Two things in the market reading, each with its own switch in
// the settings; with both switched off this pane draws version 1 exactly.
//   A. CREDIT DOES NOT SUBTRACT IN A WASHED-OUT MARKET. When the credit part would take points away,
//      what it takes is counted in full while SPY and QQQ's average RSI is ${pr(R.fadeFrom)} or more, not at all at
//      ${pr(R.fadeTo)} and under, and in proportion between. When credit adds, it adds in full, as before.
//      Why: at the lows of late March 2025 and late March 2026 the indices were washed out and credit
//      was a little weak, and version 1 cut the number on the very days the market made its low.
//   B. CASH IS RAISED AT AN EXTENDED HIGH AND PUT BACK AT THE NEXT WASHOUT. It switches ON at a close
//      where SPY and QQQ are both within ${pr(R.nearPct)}% of their own highest close of the past ${R.highDays} sessions and
//      sit, on average, ${R.extPct}% or more above their ${R.avgDays}-day averages — further than on four days in five
//      of the measured days. It switches OFF at a close where their average RSI is under ${pr(R.resetRsi)}. While it
//      is on, the market reading is halved, so half of the tactical money that would be at work is held
//      as cash. The pane shades those stretches.
//      What it is not: a call on the top. Since 2018 the market was higher when the cash went back than
//      when it was raised in ${st.higher} finished stretches out of ${st.n}. Tested on years the rule had not seen it
//      cost nothing in the end result and made nothing either; it makes the line lighter after a long run-up.
//
// WHICH BARS COUNT. Every finished daily bar shows the reading at that day's close. The last bar is
// live: it counts today's prices as they trade and settles at the close. Before the New York open it
// still shows yesterday's close.
//
// LOOKING BACK. Each past bar is today's rule read on that day's closing prices: what the system
// would have said on that day. The rule's curves were measured on those same years, so the past
// flatters it a little; the study page has the test on years it had not seen. The first bar with a
// reading is 25 Apr 2007, ten sessions after HYG began trading.
//
// KNOWN DIFFERENCES FROM THE ALLOCATION TOOL
//   1. Prices come from TradingView's feed, not the Hub's. Credit's own move is a small number, so a
//      cent on HYG or on the Treasury fund can move the reading by a few tenths of a point.
//   2. HYG's payouts. TradingView adds them back by scaling every earlier price; the tool chains them
//      day by day, and its long history comes from a table rounded to the cent. The two agree closely,
//      not exactly. (TradingView does not print its arithmetic; "scaling" is the standard form.)
${measuredLines(proof).join("\n")}
//   3. HYG's payout day. On the first trading day of a month HYG trades without its payout (about 0.5%).
//      If TradingView were late adding that payout back, credit's own move would read too low that day
//      and the reading would be off by several points until it caught up. The tool keeps its own
//      payout list and is not affected.
//   4. After the close. Until the day's close is settled the tool goes on counting prices traded after
//      16:00 New York; this pane reads the regular session only, so for a while the two can differ.
//   5. The raise-cash rule remembers. Its state on a bar depends on every bar before it, so it needs
//      the chart's full daily history: with fewer than ${R.highDays} daily bars of SPY and QQQ loaded it stays off.
//   6. The tool lets you switch a light on so that it counts. This pane shows the two voting parts only.
//   7. The account's shape (${n.held} held, ${n.tactical} tactical) is the tool's baseline on 7 Oct 2026. If you change
//      it in the tool, change the two inputs here as well.
//   8. Made for a daily chart. On a weekly chart each bar shows its last day. On an intraday chart a
//      past day's reading appears on that day's last bar, and the live bar is live.
//
// PASTE: Pine Editor → open "Scintilla Deployment Pane" → select all → paste → Save. It reads the same
// four funds on any symbol's chart, so it shows the same line under SPY, QQQ, the VIX or anything else.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
indicator("SCINTILLA · DEPLOYMENT PANE", shorttitle = "DEPLOYMENT", overlay = false, precision = 1, max_labels_count = 50)

// ── the rule's numbers (written from the allocation tool's model file — do not edit by hand) ────
const int    RSI_DAYS    = 14
const int    CREDIT_DAYS = 10          // credit's own move is read over ten sessions
const float  RATES_SHARE = 0.5         // HYG moves about half as far as the 7–10 year Treasury fund for the same move in rates
const float  TYPICAL_DAY = ${n.typical}   // the market reading on a typical day, before the two parts add or take away
// version 2's numbers (written from the study's rule file)
const float  FADE_FROM   = ${fl(R.fadeFrom)}        // at this RSI and above, what credit subtracts counts in full
const float  FADE_TO     = ${fl(R.fadeTo)}        // at this RSI and under, what credit subtracts does not count
const int    HIGH_DAYS   = ${R.highDays}         // the high is the highest close of this many sessions
const int    AVG_DAYS    = ${R.avgDays}         // the long average is of this many closes
const float  NEAR_PCT    = ${fl(R.nearPct)}         // "at the high" = within this % of it
const float  EXT_PCT     = ${fl(R.extPct)}       // "extended" = SPY and QQQ this % or more above their long average, averaged
const float  RESET_RSI   = ${fl(R.resetRsi)}        // the cash goes back at a close with the average RSI under this
const float  CASH_CUT    = ${fl(R.cashCut)}         // while cash is raised, the market reading is multiplied by this

// place tables: the value that sat at each whole place, 0 … 100, among the days the rule was measured on
${wrapList("var array<float> RSI_PLACES = array.from(", n.rsiPlaces)}
${wrapList("var array<float> CREDIT_PLACES = array.from(", n.creditPlaces)}
// points curves: the points each part adds to the reading at places 0, 5, 10 … 100
${wrapList("var array<float> RSI_POINTS = array.from(", n.rsiPoints)}
${wrapList("var array<float> CREDIT_POINTS = array.from(", n.creditPoints)}

${palette}

// ── inputs ─────────────────────────────────────────────────────────────────────────────────────
const string G_SHAPE = "The account's shape (the allocation tool's baseline, 7 Oct 2026)"
float heldPct     = input.float(${n.held}.0, "Held through pullbacks, % of the account", minval = 0, maxval = 100, step = 1, group = G_SHAPE,
     tooltip = "The part that stays invested whatever the market reading says. If you change the shape in the allocation tool, change it here too.")
float tacticalPct = input.float(${n.tactical}.0, "Tactical at full, % of the account", minval = 0, maxval = 100, step = 1, group = G_SHAPE,
     tooltip = "The part that moves with the market reading: a reading of 0 deploys none of it, a reading of 100 deploys all of it.")

const string G_RULE = "What version 2 changed — switch either off to see the line without it"
bool creditRule = input.bool(true, "Credit does not subtract in a washed-out market", group = G_RULE,
     tooltip = "On: when the credit part would take points away, what it takes is counted in full while SPY and QQQ's average RSI is ${pr(R.fadeFrom)} or more, not at all at ${pr(R.fadeTo)} and under, in proportion between. Off: credit subtracts in full whatever the RSI, as in version 1.")
bool cashRule   = input.bool(true, "Raise cash at an extended high, put it back at the next washout", group = G_RULE,
     tooltip = "On: from a close where SPY and QQQ are both within ${pr(R.nearPct)}% of their highest close of ${R.highDays} sessions and on average ${R.extPct}% or more above their ${R.avgDays}-day averages, the market reading is halved, until a close where their average RSI is under ${pr(R.resetRsi)}. Off: the reading is never halved, as in version 1.")

const string G_LOOK = "Look"
bool byDirection = input.bool(true,  "Colour the % invested line by its daily direction", group = G_LOOK,
     tooltip = "On: green on a day the system has more invested than the day before, red on a day it has less. Off: one teal line.")
bool showOld     = input.bool(false, "Show version 1's line beside it", group = G_LOOK,
     tooltip = "A thin line: the % invested with neither of version 2's two changes. Where the two lines part, version 2 changed the number.")
bool showCash    = input.bool(true,  "Shade the stretches where cash is raised", group = G_LOOK)
bool showReading = input.bool(false, "Show the market reading (0–100)", group = G_LOOK)
bool showParts   = input.bool(false, "Show the reading's two voting parts", group = G_LOOK,
     tooltip = "SPY and QQQ together (a thin line) and credit (dots). Each is drawn as 50 plus the points it adds to the market reading: green above the middle line, where it argues for more invested, red below it, where it argues for less. Credit is drawn as it is counted, after version 2's fade.")
bool showTag     = input.bool(true,  "Labels on the last bar", group = G_LOOK)
float labelGap   = input.float(12.0, "Least space between two labels, in points of the scale", minval = 0, maxval = 40, step = 1, group = G_LOOK, display = display.none,
     tooltip = "When more than one label is shown they are stacked from the highest value down, each at its own line. Raise this if two labels touch on a short pane.")

const string G_FEED = "Where the prices come from"
string spySym = input.symbol("AMEX:SPY",   "S&P 500 fund",                     group = G_FEED, display = display.none)
string qqqSym = input.symbol("NASDAQ:QQQ", "Nasdaq 100 fund",                  group = G_FEED, display = display.none)
string hygSym = input.symbol("AMEX:HYG",   "High-yield bond fund (credit)",    group = G_FEED, display = display.none)
string iefSym = input.symbol("NASDAQ:IEF", "7–10 year Treasury fund (rates)",  group = G_FEED, display = display.none)

${wilder}

// ── version 2: where a fund stands against its own high and its own long average ───────────────
// its close against its highest close of the last 252 sessions, itself among them, in %: 0 at the high,
// −2 two per cent under it. No value until the fund has 252 closes.
offHigh(float src) =>
    var array<float> win = array.new<float>()
    float out = na
    if not na(src)
        array.push(win, src)
        if array.size(win) > HIGH_DAYS
            array.shift(win)
        if array.size(win) == HIGH_DAYS
            out := (src / array.max(win) - 1.0) * 100.0
    out
// how far its close sits above (+) or under (−) the plain average of its last 200 closes, in %.
// No value until the fund has 200 closes.
overAvg(float src) =>
    var array<float> win = array.new<float>()
    float out = na
    if not na(src)
        array.push(win, src)
        if array.size(win) > AVG_DAYS
            array.shift(win)
        if array.size(win) == AVG_DAYS
            out := (src / array.avg(win) - 1.0) * 100.0
    out

// ── requests: each fund is read on its own daily bars; the last bar is today's, as it trades ────
// SPY, QQQ and the Treasury fund without payouts (the tool's own basis); HYG with its payouts added back
string spyT = ticker.modify(spySym, session.regular, adjustment.splits)
string qqqT = ticker.modify(qqqSym, session.regular, adjustment.splits)
string iefT = ticker.modify(iefSym, session.regular, adjustment.splits)
string hygT = ticker.modify(hygSym, session.regular, adjustment.dividends)
float spyRsi  = request.security(spyT, "D", wilderRsi(close), lookahead = barmerge.lookahead_off)
float qqqRsi  = request.security(qqqT, "D", wilderRsi(close), lookahead = barmerge.lookahead_off)
float hygMove = request.security(hygT, "D", close / close[CREDIT_DAYS] - 1.0, lookahead = barmerge.lookahead_off)
float iefMove = request.security(iefT, "D", close / close[CREDIT_DAYS] - 1.0, lookahead = barmerge.lookahead_off)
float spyOff  = request.security(spyT, "D", offHigh(close), lookahead = barmerge.lookahead_off)
float qqqOff  = request.security(qqqT, "D", offHigh(close), lookahead = barmerge.lookahead_off)
float spyOver = request.security(spyT, "D", overAvg(close), lookahead = barmerge.lookahead_off)
float qqqOver = request.security(qqqT, "D", overAvg(close), lookahead = barmerge.lookahead_off)

${points}

// ── the sum ────────────────────────────────────────────────────────────────────────────────────
float rsiBoth   = (spyRsi + qqqRsi) / 2.0
float creditOwn = (hygMove - RATES_SHARE * iefMove) * 100.0
float ptsRsi    = pointsAt(RSI_PLACES, RSI_POINTS, rsiBoth)
float ptsFitted = pointsAt(CREDIT_PLACES, CREDIT_POINTS, creditOwn)
// version 2, A: what credit takes away counts in full at an RSI of 45, not at all at 35 and under
float fade      = math.max(0.0, math.min(1.0, (rsiBoth - FADE_TO) / (FADE_FROM - FADE_TO)))
float ptsCredit = creditRule and ptsFitted < 0.0 ? ptsFitted * fade : ptsFitted
// version 2, B: on at an extended high, off at the next washout; the state is kept from bar to bar
float extended  = math.max(0.0, (spyOver + qqqOver) / 2.0)
bool  atHigh    = spyOff >= -NEAR_PCT and qqqOff >= -NEAR_PCT
var bool cash = false
if not na(ptsRsi) and not na(ptsFitted)
    if rsiBoth < RESET_RSI
        cash := false
    else if atHigh and extended >= EXT_PCT
        cash := true
bool  cashOn    = cashRule and cash
// no reading unless both parts have one (before 25 Apr 2007 HYG did not trade)
float beforeCut = na(ptsRsi) or na(ptsCredit) ? na : math.max(0.0, math.min(100.0, TYPICAL_DAY + ptsRsi + ptsCredit))
float reading   = na(beforeCut) ? na : math.round(cashOn ? beforeCut * CASH_CUT : beforeCut, 1)
float invested  = math.min(100.0, heldPct + tacticalPct * reading / 100.0)
// version 1, for the thin line: neither change
float readingOld  = na(ptsRsi) or na(ptsFitted) ? na : math.round(math.max(0.0, math.min(100.0, TYPICAL_DAY + ptsRsi + ptsFitted)), 1)
float investedOld = math.min(100.0, heldPct + tacticalPct * readingOld / 100.0)

// ── the pane ───────────────────────────────────────────────────────────────────────────────────
// the % invested line: green on a day the system has more invested than the day before, red on a day it has less
var color dirCol = C_LINE
if not na(invested) and not na(invested[1])
    if invested > invested[1]
        dirCol := C_BULL
    else if invested < invested[1]
        dirCol := C_BEAR
color lineCol = byDirection ? dirCol : C_LINE
// the two voting parts, each as 50 plus its points: green while it adds to the reading, red while it takes away
float partA = 50.0 + ptsRsi
float partB = 50.0 + ptsCredit
color colA  = ptsRsi >= 0 ? C_BULL : C_BEAR
color colB  = ptsCredit >= 0 ? C_BULL : C_BEAR

// the band behind the stretches where cash is raised
bgcolor(showCash and cashOn and not na(invested) ? color.new(C_DEEP, 86) : na, title = "cash raised at an extended high")
// only the % invested shows its number in the status line; the floor and the optional lines stay out of it
pInv   = plot(invested, "% invested", color = lineCol, linewidth = 2, style = plot.style_line)
pFloor = plot(na(invested) ? na : heldPct, "held through pullbacks", color = color.new(C_DEEP, 35), linewidth = 1, display = display.pane)
fill(pInv, pFloor, color = color.new(C_LINE, 85), title = "tactical money at work")
plot(showOld ? investedOld : na, "version 1 (line)", color = color.new(C_LINE, 45), linewidth = 1, display = display.all - display.status_line)
plot(showReading ? reading : na, "market reading (line)", color = C_LINE, linewidth = 1, display = display.all - display.status_line)
plot(showParts ? partA : na, "SPY and QQQ together: 50 + its points", color = colA, linewidth = 1, display = display.all - display.status_line)
plot(showParts ? partB : na, "credit: 50 + its points", color = colB, linewidth = 1, style = plot.style_circles, display = display.all - display.status_line)
// the numbers behind the line — Data Window only (hover a bar to read them)
plot(reading,     "market reading",                          color = C_AXIS, display = display.data_window)
plot(rsiBoth,     "SPY and QQQ's RSI, averaged",             color = C_AXIS, display = display.data_window)
plot(creditOwn,   "credit's own move over ten sessions, %", color = C_AXIS, display = display.data_window)
plot(na(invested) ? na : cashOn ? 1.0 : 0.0, "cash raised at an extended high (1 = yes)", color = C_AXIS, display = display.data_window)
plot(investedOld, "% invested, version 1",                   color = C_AXIS, display = display.data_window)

hline(100.0, "100", color = C_EDGE, linestyle = hline.style_solid)
hline(50.0,  "50",  color = C_EDGE, linestyle = hline.style_dotted)
hline(0.0,   "0",   color = C_EDGE, linestyle = hline.style_solid)

${formats}

// ── labels on the last bar: each at its own line, the highest first, never on top of each other ─
var array<label> tags = array.new<label>()
if barstate.islast and showTag
    while array.size(tags) > 0
        label.delete(array.pop(tags))
    if na(invested)
        string waiting = (na(spyRsi) ? " SPY" : "") + (na(qqqRsi) ? " QQQ" : "") + (na(hygMove) ? " HYG" : "") + (na(iefMove) ? " IEF" : "")
        array.push(tags, label.new(bar_index + 2, 50.0, "No reading yet · waiting for prices from" + waiting, style = label.style_label_left, color = C_PANEL, textcolor = C_LINE, size = size.small))
    else
        array<float>  ys = array.new<float>()
        array<string> ts = array.new<string>()
        array<color>  cs = array.new<color>()
        array.push(ys, invested)
        array.push(ts, "Invested " + whole(invested) + "% · market reading " + whole(reading) + (cashOn ? " · cash raised" : ""))
        array.push(cs, lineCol)
        if showOld
            array.push(ys, investedOld)
            array.push(ts, "version 1: " + whole(investedOld) + "%")
            array.push(cs, C_LINE)
        if showReading
            array.push(ys, reading)
            array.push(ts, "market reading " + whole(reading))
            array.push(cs, C_LINE)
        if showParts
            array.push(ys, partA)
            array.push(ts, "SPY and QQQ " + signed1(ptsRsi))
            array.push(cs, colA)
            array.push(ys, partB)
            array.push(ts, "credit " + signed1(ptsCredit))
            array.push(cs, colB)
        // the highest value first; each label at its own value, pushed down so no two sit closer than the chosen space
        array<int> rank = array.sort_indices(ys, order.descending)
        float above = na
        for i = 0 to array.size(rank) - 1
            int   j = array.get(rank, i)
            float y = array.get(ys, j)
            if not na(above)
                y := math.min(y, above - labelGap)
            above := y
            array.push(tags, label.new(bar_index + 2, y, array.get(ts, j), style = label.style_label_left, color = C_PANEL, textcolor = array.get(cs, j), size = size.small))
`; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = buildPine2();
  if (process.argv.includes("--check")) { const on = fs.existsSync(PINE2) ? fs.readFileSync(PINE2, "utf8") : null; if (on !== text) { console.error("study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine is not what scripts/ds2-build-pine.mjs writes — run it again"); process.exit(1); } console.log("the version 2 script on disk is what the build writes"); }
  else { fs.writeFileSync(PINE2, text); console.log(JSON.stringify({ wrote: path.relative(ROOT, PINE2), bytes: text.length, lines: text.split("\n").length })); } }
