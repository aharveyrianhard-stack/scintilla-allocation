/* PN1 (7 Oct 2026) — writes the TradingView script study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine from the allocation tool's own model file
   (study/ds1/data/ds1-live.json), so every number in the script is the engine's number and none is typed by hand.
     node scripts/pn1-build-pine.mjs            write the file
     node scripts/pn1-build-pine.mjs --check    exit 1 if the file on disk is not what this would write
   No key, no network, no table: it reads two files in this repo and writes one.

   WHAT THE SCRIPT CARRIES
     · for each of the two parts that vote (the engine's "kept" list): its place table (101 values — the engine's q) and ONE points curve
       of 21 marks. The engine reads four measured curves per part and averages them in units of the model's spread, then multiplies by
       the gain; straight-line reading is linear, so the same four curves summed mark by mark and read once give the same points
       (to the fourteenth decimal — tests/pn1.test.mjs holds it to 1e-9);
     · the reading on a typical day: 50 − gain × centre;
     · the account's shape: the part held through pullbacks (core + the conviction slots) and the tactical part, from the model's defaults.
   The measured gaps quoted in the script's header come from study/pn1/data/pn1-proof.json (scripts/pn1-prove.mjs) when that file exists. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PINE = path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine"), PROOF = path.join(ROOT, "study/pn1/data/pn1-proof.json");
const J = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

/* the numbers the script carries, from the model */
export function pineNumbers(base = J(path.join(ROOT, "study/ds1/data/ds1-live.json"))) {
  const m = base.model, sc = m.scale, d = base.defaults, part = (k) => m.parts.find((p) => p.key === k);
  if (JSON.stringify(base.kept) !== JSON.stringify(["rsi", "creditOwn"])) throw new Error("the model's voting parts are " + JSON.stringify(base.kept) + "; this script is written for the index RSI and credit's own move");
  const points = (p) => p.gm20.map((_, i) => +((sc.gain * (p.gm20[i] / sc.sM20 + p.gp20[i] / sc.sP20 + p.gm60[i] / sc.sM60 + p.gp60[i] / sc.sP60)) / 4).toFixed(6));
  for (const k of base.kept) { const p = part(k); if (!p || !p.vote || p.q.length !== 101 || p.gm20.length !== 21) throw new Error("part " + k + " is not a voting part with a 101-value place table and 21-mark curves"); }
  return { typical: +(50 - sc.gain * sc.centre).toFixed(6), rsiPlaces: part("rsi").q, rsiPoints: points(part("rsi")), creditPlaces: part("creditOwn").q, creditPoints: points(part("creditOwn")),
    held: d.corePct + d.micronPct + d.nebiusPct, tactical: d.tacticalPct, core: d.corePct, micron: d.micronPct, nebius: d.nebiusPct, days: m.evenings, from: m.fittedFrom, to: m.fittedTo, asOf: base.asOf }; }

/* a long list of numbers as Pine arguments: the first on the opening line, the rest wrapped at five spaces (never a multiple of four) */
function wrapList(head, nums, tail = ")") { const lines = []; let cur = head;
  nums.forEach((v, i) => { const piece = String(v) + (i < nums.length - 1 ? ", " : tail); if ((cur + piece).length > 112) { lines.push(cur.replace(/\s+$/, "")); cur = "     " + piece; } else cur += piece; }); lines.push(cur); return lines.join("\n"); }
const day = (iso) => { const [y, m, d] = iso.split("-"); return `${+d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} ${y}`; };
const one = (x) => (Math.round(x * 10) / 10).toFixed(1);

/* the lines of the header that quote what the replay measured (scripts/pn1-prove.mjs) */
function measuredLines(proof) {
  if (!proof) return ["//      The measured gaps are on the page beside this file (study/pn1/PN1.html)."];
  const a = proof.history.samePrices, b = proof.history.tradingViewPayouts, s = proof.sensitivity, yr = proof.history.lastYear.tradingViewPayouts, n = (x) => x.toLocaleString("en-US"), rc = proof.history.roundingToTheCentAlone && proof.history.roundingToTheCentAlone.over1 ? proof.history.roundingToTheCentAlone : null;
  const same = a.worst === 0 ? "the reading is the same on every one of those days" : `the reading never differs by more than ${one(a.worst)} of a point`;

  return [
    `//      Measured with a replay of this script's arithmetic against the allocation tool's own engine on`,
    `//      the ${n(a.days)} days from ${day(proof.history.from)} to ${day(proof.history.to)}:`,
    `//        · fed the engine's own prices, ${same};`,
    `//        · fed HYG's payouts the way TradingView adds them back, it is within one point on ${one(b.shareWithin1)}% of`,
    `//          days (median gap ${b.median.toFixed(1)}; 99 days in 100 within ${one(b.p99)}).`,
    ...(b.over1 === 0 ? [`//          No day is over one point; the worst is ${one(b.worst)} on ${day(b.worstOn)}.`] : [`//          The ${b.over1} days over one point all fall in ${b.over1First.slice(0, 4)}–${b.over1Last.slice(0, 4)}, when HYG's price with payouts was`, `//          lower and a cent of rounding was more of it${rc ? ` (rounding to the cent alone makes ${rc.over1} such days,` : ";"}`, ...(rc ? [`//          all in ${rc.over1First.slice(0, 4)}–${rc.over1Last.slice(0, 4)}).`] : []), `//          The worst is ${one(b.worst)} on ${day(b.worstOn)}. In the last year the worst gap was ${one(yr.worst)}.`]),
    `//        · one cent on one closing price moves the reading by up to ${s.centWorst.toFixed(2)} of a point on ${day(s.on)} (the cent`,
    `//          that matters most is on HYG); across the last year the most a cent moved it was ${s.centWorstYear.toFixed(2)}.`];
}
function latePayoutLines(proof) { const o = proof && proof.observations && proof.observations.latePayout;
  return [`//   3. HYG's payout day. On the first trading day of a month HYG trades without its payout (about ${o ? one(o.meanPayoutPct) : "0.5"}%).`,
    `//      If TradingView were late adding that payout back, credit's own move would read too low that day`,
    o ? `//      and the reading would be off by about ${Math.round(o.medianGap)} points (${Math.round(o.worstGap)} at worst, in either direction) until it caught` : `//      and the reading would be off by several points until it caught`,
    `//      up. The tool keeps its own payout list and is not affected. Worth a look on the next payout day.`]; }

export function buildPine(n = pineNumbers(), proof = fs.existsSync(PROOF) ? J(PROOF) : null) {
  const L = [];
  L.push(`//@version=6
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SCINTILLA · DEPLOYMENT PANE  ·  7 Oct 2026
// PLOTS 12/64  (the % invested line coloured by its daily direction = 2 · the held floor = 1 · the
//              shading between the two = 1 · the market reading = 1 · its two voting parts, each green
//              or red by its sign = 4 · three Data Window numbers = 3 · the three level lines and the
//              labels are outside the plot budget)
// REQUESTS 4/40  (one daily call each for SPY, QQQ, HYG and the 7–10 year Treasury fund IEF)
//
// WHAT IT IS. The allocation tool's deployment system drawn in its own pane, with its history: how
// much of the account the system has invested on every daily bar, on a scale from 0 to 100.
//     % invested = the part held through pullbacks (${n.held}) + the tactical part (${n.tactical}) × the market reading ÷ 100
// A market reading of 0 leaves all the tactical money in cash (${n.held}% invested); 100 puts all of it to
// work (${Math.min(100, n.held + n.tactical)}% invested). The held part is the core ${n.core} + Micron's slot ${n.micron} + Nebius's slot ${n.nebius}.
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
// The VIX, breadth and the leaders' own state are shown in the allocation tool as lights and are not
// counted there, so they are not counted here.
//
// WHICH BARS COUNT. Every finished daily bar shows the reading at that day's close. The last bar is
// live: it counts today's prices as they trade and settles at the close. Before the New York open it
// still shows yesterday's close.
//
// LOOKING BACK. Each past bar is today's rule read on that day's closing prices: what the system
// would have said on that day. The rule's curves were measured on those same years, so the past
// flatters it a little; the tool's study page has the test on years it had not seen. The first bar
// with a reading is 25 Apr 2007, ten sessions after HYG began trading.
//
// KNOWN DIFFERENCES FROM THE ALLOCATION TOOL
//   1. Prices come from TradingView's feed, not the Hub's. Credit's own move is a small number, so a
//      cent on HYG or on the Treasury fund can move the reading by a few tenths of a point.
//   2. HYG's payouts. TradingView adds them back by scaling every earlier price; the tool chains them
//      day by day, and its long history comes from a table rounded to the cent. The two agree closely,
//      not exactly.
${measuredLines(proof).join("\n")}
${latePayoutLines(proof).join("\n")}
//   4. After the close. Until the day's close is settled the tool goes on counting prices traded after
//      16:00 New York; this pane reads the regular session only, so for a while the two can differ.
//   5. The tool lets you average the last few readings, and switch a light on so that it counts. This
//      pane always shows the bar's own reading with the two voting parts only: the tool's baseline.
//   6. The account's shape (${n.held} held, ${n.tactical} tactical) is the tool's baseline on 7 Oct 2026. If you change
//      it in the tool, change the two inputs here as well.
//   7. Made for a daily chart. On a weekly chart each bar shows its last day. On an intraday chart a
//      past day's reading appears on that day's last bar, and the live bar is live.
//
// PASTE: Pine Editor → new indicator → select all → paste → Save → Add to chart. It reads the same
// four funds on any symbol's chart, so it shows the same line under SPY, QQQ, the VIX or anything else.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
indicator("SCINTILLA · DEPLOYMENT PANE", shorttitle = "DEPLOYMENT", overlay = false, precision = 1, max_labels_count = 50)

// ── the rule's numbers (written from the allocation tool's model file — do not edit by hand) ────
const int    RSI_DAYS    = 14
const int    CREDIT_DAYS = 10          // credit's own move is read over ten sessions
const float  RATES_SHARE = 0.5         // HYG moves about half as far as the 7–10 year Treasury fund for the same move in rates
const float  TYPICAL_DAY = ${n.typical}   // the market reading on a typical day, before the two parts add or take away

// place tables: the value that sat at each whole place, 0 … 100, among the days the rule was measured on
${wrapList("var array<float> RSI_PLACES = array.from(", n.rsiPlaces)}
${wrapList("var array<float> CREDIT_PLACES = array.from(", n.creditPlaces)}
// points curves: the points each part adds to the reading at places 0, 5, 10 … 100
${wrapList("var array<float> RSI_POINTS = array.from(", n.rsiPoints)}
${wrapList("var array<float> CREDIT_POINTS = array.from(", n.creditPoints)}

// colours — the Hub's up and down, two tones of one teal family for everything else, greys with no white
// (green, red and the teal were measured apart from each other, for full colour vision and for red-green colour blindness)
const color C_BULL   = #00FFA3
const color C_BEAR   = #FF2D55
const color C_LINE   = #2FB5A8
const color C_DEEP   = #1C7D75
const color C_AXIS   = #3A3A52
const color C_EDGE   = #252538
const color C_PANEL  = #0D0D14

// ── inputs ─────────────────────────────────────────────────────────────────────────────────────
const string G_SHAPE = "The account's shape (the allocation tool's baseline, 7 Oct 2026)"
float heldPct     = input.float(${n.held}.0, "Held through pullbacks, % of the account", minval = 0, maxval = 100, step = 1, group = G_SHAPE,
     tooltip = "The part that stays invested whatever the market reading says: the core ${n.core} + Micron's slot ${n.micron} + Nebius's slot ${n.nebius}. If you change the shape in the allocation tool, change it here too.")
float tacticalPct = input.float(${n.tactical}.0, "Tactical at full, % of the account", minval = 0, maxval = 100, step = 1, group = G_SHAPE,
     tooltip = "The part that moves with the market reading: a reading of 0 deploys none of it, a reading of 100 deploys all of it.")

const string G_LOOK = "Look"
bool byDirection = input.bool(true,  "Colour the % invested line by its daily direction", group = G_LOOK,
     tooltip = "On: green on a day the system has more invested than the day before, red on a day it has less. Off: one teal line, the same teal as the market reading, which it follows.")
bool showReading = input.bool(false, "Show the market reading (0–100)", group = G_LOOK)
bool showParts   = input.bool(false, "Show the reading's two voting parts", group = G_LOOK,
     tooltip = "SPY and QQQ together (a thin line) and credit (dots). Each is drawn as 50 plus the points it adds to the market reading: green above the middle line, where it argues for more invested, red below it, where it argues for less. A typical day (${one(n.typical)}) plus the two parts' points is the market reading, held between 0 and 100.")
bool showTag     = input.bool(true,  "Labels on the last bar", group = G_LOOK)
float labelGap   = input.float(12.0, "Least space between two labels, in points of the scale", minval = 0, maxval = 40, step = 1, group = G_LOOK, display = display.none,
     tooltip = "When more than one label is shown they are stacked from the highest value down, each at its own line. Raise this if two labels touch on a short pane.")

const string G_FEED = "Where the prices come from"
string spySym = input.symbol("AMEX:SPY",   "S&P 500 fund",                     group = G_FEED, display = display.none)
string qqqSym = input.symbol("NASDAQ:QQQ", "Nasdaq 100 fund",                  group = G_FEED, display = display.none)
string hygSym = input.symbol("AMEX:HYG",   "High-yield bond fund (credit)",    group = G_FEED, display = display.none)
string iefSym = input.symbol("NASDAQ:IEF", "7–10 year Treasury fund (rates)",  group = G_FEED, display = display.none)

// ── Wilder's RSI, written out so the arithmetic is the allocation tool's own ───────────────────
// the first average is the plain mean of the first 14 daily changes; every later one is (13 × the last + today's) ÷ 14
wilderRsi(float src) =>
    var float prev = na
    var float upAvg = 0.0
    var float dnAvg = 0.0
    var int   k    = 0
    float out = na
    if not na(src)
        if na(prev)
            prev := src
        else
            float d  = src - prev
            float up = math.max(d, 0.0)
            float dn = math.max(-d, 0.0)
            prev := src
            k    += 1
            if k <= RSI_DAYS
                upAvg += up / RSI_DAYS
                dnAvg += dn / RSI_DAYS
            else
                upAvg := (upAvg * (RSI_DAYS - 1) + up) / RSI_DAYS
                dnAvg := (dnAvg * (RSI_DAYS - 1) + dn) / RSI_DAYS
            if k >= RSI_DAYS
                out := dnAvg == 0 ? 100.0 : 100.0 - 100.0 / (1.0 + upAvg / dnAvg)
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

// ── a part's points: its value → its place among the measured days → the points on its curve ────
pointsAt(array<float> placeTab, array<float> curve, float z) =>
    float out = na
    if not na(z)
        // the place, 0 … 100: straight lines through the place table, flat beyond its two ends
        int   n = array.size(placeTab) - 1
        float u = 0.0
        if z <= array.get(placeTab, 0)
            u := 0.0
        else if z >= array.get(placeTab, n)
            u := 100.0
        else
            int lo = 0
            int hi = n
            while hi - lo > 1
                int mid = int(math.floor((lo + hi) / 2.0))
                if array.get(placeTab, mid) <= z
                    lo := mid
                else
                    hi := mid
            float a  = array.get(placeTab, lo)
            float b  = array.get(placeTab, hi)
            float fl = lo
            u := (100.0 / n) * (b == a ? fl : fl + (z - a) / (b - a))
        // the points at that place: straight lines through the curve's 21 marks
        int   i = math.min(array.size(curve) - 2, int(math.floor(u / 5.0)))
        float t = (u - i * 5.0) / 5.0
        out := array.get(curve, i) + t * (array.get(curve, i + 1) - array.get(curve, i))
    out

// ── the sum ────────────────────────────────────────────────────────────────────────────────────
float rsiBoth   = (spyRsi + qqqRsi) / 2.0
float creditOwn = (hygMove - RATES_SHARE * iefMove) * 100.0
float ptsRsi    = pointsAt(RSI_PLACES, RSI_POINTS, rsiBoth)
float ptsCredit = pointsAt(CREDIT_PLACES, CREDIT_POINTS, creditOwn)
// no reading unless both parts have one (before 25 Apr 2007 HYG did not trade)
float reading   = math.round(math.max(0.0, math.min(100.0, TYPICAL_DAY + ptsRsi + ptsCredit)), 1)
float invested  = math.min(100.0, heldPct + tacticalPct * reading / 100.0)

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

// only the % invested shows its number in the status line; the floor and the optional lines stay out of it
pInv   = plot(invested, "% invested", color = lineCol, linewidth = 2, style = plot.style_line)
pFloor = plot(na(invested) ? na : heldPct, "held through pullbacks", color = color.new(C_DEEP, 35), linewidth = 1, display = display.pane)
fill(pInv, pFloor, color = color.new(C_LINE, 85), title = "tactical money at work")
plot(showReading ? reading : na, "market reading (line)", color = C_LINE, linewidth = 1, display = display.all - display.status_line)
plot(showParts ? partA : na, "SPY and QQQ together: 50 + its points", color = colA, linewidth = 1, display = display.all - display.status_line)
plot(showParts ? partB : na, "credit: 50 + its points", color = colB, linewidth = 1, style = plot.style_circles, display = display.all - display.status_line)
// the reading and the two raw numbers behind it — Data Window only (hover a bar to read them)
plot(reading,   "market reading",                          color = C_AXIS, display = display.data_window)
plot(rsiBoth,   "SPY and QQQ's RSI, averaged",             color = C_AXIS, display = display.data_window)
plot(creditOwn, "credit's own move over ten sessions, %", color = C_AXIS, display = display.data_window)

hline(100.0, "100", color = C_EDGE, linestyle = hline.style_solid)
hline(50.0,  "50",  color = C_EDGE, linestyle = hline.style_dotted)
hline(0.0,   "0",   color = C_EDGE, linestyle = hline.style_solid)

// numbers as the allocation tool writes them: whole for the two headline numbers, signed points to one decimal
whole(float v)   => na(v) ? "—" : str.tostring(math.round(v))
signed1(float v) => na(v) ? "—" : (math.round(v, 1) > 0 ? "+" : math.round(v, 1) < 0 ? "−" : "") + str.tostring(math.abs(math.round(v, 1)), "0.0")

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
        array.push(ts, "Invested " + whole(invested) + "% · market reading " + whole(reading))
        array.push(cs, lineCol)
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
`);
  return L.join("\n"); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = buildPine();
  if (process.argv.includes("--check")) { const on = fs.existsSync(PINE) ? fs.readFileSync(PINE, "utf8") : null; if (on !== text) { console.error("study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine is not what scripts/pn1-build-pine.mjs writes — run it again"); process.exit(1); } console.log("the script on disk is what the build writes"); }
  else { fs.mkdirSync(path.dirname(PINE), { recursive: true }); fs.writeFileSync(PINE, text); console.log(JSON.stringify({ wrote: path.relative(ROOT, PINE), bytes: text.length, lines: text.split("\n").length, typical: pineNumbers().typical, held: pineNumbers().held, tactical: pineNumbers().tactical })); } }
