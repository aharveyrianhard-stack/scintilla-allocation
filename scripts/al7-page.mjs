/* AL7 (6 Oct 2026) — writes study/al7/AL7.html, the before → after page for Alan: pictures first, plain words, every number taken from
   the two readouts the picture run wrote (study/al7/pictures/before-readout.json, after-readout.json), so the page and the pictures agree.
   node scripts/al7-page.mjs */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), DIR = path.join(ROOT, "study", "al7"), PIC = path.join(DIR, "pictures");
const B = JSON.parse(fs.readFileSync(path.join(PIC, "before-readout.json"), "utf8")), A = JSON.parse(fs.readFileSync(path.join(PIC, "after-readout.json"), "utf8"));
const b = B["1680"], a = A["1680"], x = a.al7;
const f2 = (v) => (v == null ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2)), pc = (v, d = 0) => (v * 100).toFixed(d) + "%";
const WORD = { TECH: "Technology", HEALTH: "Health care", FINANCIALS: "Financials", DISCRET: "Consumer discretionary", INDUSTRIAL: "Industrials", MATERIALS: "Materials", ENERGY: "Energy", STAPLES: "Consumer staples", UTILITIES: "Utilities", REAL_ESTATE: "Real estate", COMMS: "Communications", CRYPTO: "Crypto", METALS: "Metals", OIL: "Oil", INDEX: "Equal-weight index (RSP)",
  DC_PROPERTY: "Datacenter property", NEOCLOUDS_MINERS: "Neoclouds & AI miners", MEMORY_STORAGE: "Memory & storage", AI_POWERTRAIN: "AI powertrain", AI_ACCELERATORS: "AI accelerators & logic", AI_NETWORKING_OPTICAL: "AI networking & optical", AI_SERVERS_DC_KIT: "AI servers & datacenter kit", AI_SOFTWARE_DATA: "AI software & data platforms", ROBOTICS_AUTOMATION: "Robotics & automation" };
const w = (k) => WORD[k] || k.replace(/_/g, " ").toLowerCase();
const has = (n) => fs.existsSync(path.join(PIC, n));
const img = (n, alt) => has(n) ? `<a href="pictures/${n}"><img loading="lazy" src="pictures/${n}" alt="${alt}"></a>` : `<div class="miss">picture not taken: ${n}</div>`;
const pair = (bn, an, cap) => `<div class="pair"><figure><figcaption>BEFORE — live today</figcaption>${img(bn, "before: " + cap)}</figure><figure><figcaption>AFTER — this branch</figcaption>${img(an, "after: " + cap)}</figure></div>`;
const one = (n, cap) => `<figure class="one"><figcaption>${cap}</figcaption>${img(n, cap)}</figure>`;
const tree = x.tree.sleeves.find((r) => r[0] === "MEMORY_STORAGE") ? "memory-storage" : x.tree.sleeves[0][0].toLowerCase().replace(/_/g, "-");
const shotAt = fs.statSync(path.join(PIC, "after-00-first-screen-1680.png")).mtime;
const when = shotAt.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " ET";
const sleeves = x.money.sleeves.map((r) => `${w(r[0])} ${pc(r[1], 1)}`).join(" · ");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Allocation · next iteration (AL7)</title>
<style>
:root{--bg:#0a0a0f;--panel:#101018;--line:#1c1c28;--txt:#e8e8f0;--dim:#8a8aa0;--cyan:#00d4ff;--gold:#ffd166}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:13px;line-height:1.6;padding:22px 16px 60px;overflow-x:hidden}
@media(min-width:900px){body{padding:26px 30px 60px}}
h1{font-size:19px;letter-spacing:.28em;font-weight:600;margin:0}h1 span{color:var(--cyan)}.sub{color:var(--dim);margin-top:4px;font-size:11px;letter-spacing:.06em}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin-top:16px;min-width:0;max-width:1700px}
.panel h2{font-size:12px;letter-spacing:.2em;color:var(--cyan);margin:0 0 8px;font-weight:600}
.said{color:var(--gold);font-size:12px;margin:0 0 8px}.what{margin:0 0 10px;max-width:1000px}
ul{margin:6px 0 10px;padding-left:18px;max-width:1000px}li{margin:3px 0}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px;align-items:start;margin:10px 0}
figure{margin:0;min-width:0}figcaption{font-size:11px;letter-spacing:.14em;color:var(--dim);margin-bottom:4px}
img{display:block;max-width:100%;height:auto;border:1px solid var(--line);border-radius:6px}.one{margin:12px 0}.phone img{max-height:900px;width:auto}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:10px 0 2px}.kpi div{border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:#0c0c13}
.kpi b{display:block;font-size:22px;font-weight:700}.kpi span{font-size:11px;color:var(--dim);display:block;line-height:1.45}
table{border-collapse:collapse;width:100%;font-size:12px;max-width:1300px}th{color:var(--dim);text-align:left;font-weight:400;font-size:11px;letter-spacing:.12em;padding:5px 8px;border-bottom:1px solid var(--line)}
td{padding:6px 8px;border-bottom:1px solid #14141e;vertical-align:top}td:first-child{white-space:nowrap;color:var(--txt)}td{color:#c8c8d8}.wrap{overflow-x:auto}
.miss{color:var(--dim);font-size:11px;border:1px dashed var(--line);padding:10px;border-radius:6px}.dim{color:var(--dim)}b{font-weight:600}
</style></head><body>
<h1>ALLOCATION <span>·</span> NEXT ITERATION</h1>
<div class="sub">AL7 · branch al7-visual-tree-20261006 of the allocation tool · pictures taken headless at ${when}, before and after inside the same two minutes · nothing on this page is live — the tool at allocation.scintillahub.ai is unchanged until you say so</div>

<div class="panel"><h2>0 · THE SAME MOMENT, BEFORE AND AFTER</h2>
<div class="kpi">
<div><b>${f2(b.heat)} → ${f2(a.heat)}</b><span>the heat · ${b.rung.pct}% invested before, ${a.rung.pct}% after — the rung does not move</span></div>
<div><b>${x.weightBefore ? Math.round(x.weightBefore * 4) / 4 : "—"} → ${x.weight}</b><span>weight voting · ${x.voting} rows vote, ${x.readOnly} are read only, ${x.cannot} cannot</span></div>
<div><b>${b.sleeves.length} → ${a.sleeves.length + 1}</b><span>places the invested money goes · smallest ${b.sleeves[b.sleeves.length - 1][1]}% of equity before, ${Math.min(...x.money.sleeves.map((r) => r[1] * 100)).toFixed(1)}% after</span></div>
<div><b>${b.brief.length} → ${a.brief.length}</b><span>characters in THE BRIEF, the gauge's and bars' labels counted in</span></div>
<div><b>${B["390"].pageWidth} → ${A["390"].pageWidth} px</b><span>page width on a 390 px phone — it scrolled sideways before</span></div>
</div>
<p class="what dim">The heat by the old rule, on the very readings the new page used, is ${f2(x.heatBefore)} — the number the live page showed in the same minute. So the move from ${f2(b.heat)} to ${f2(a.heat)} is the rule, not the clock: breadth read over every pair instead of one, three rows that now vote.</p></div>

<div class="panel"><h2>1 · THE FIRST SCREEN — a picture in place of three paragraphs</h2>
<p class="said">"making me read paragraphs is going to be tough … reference lines, highlight areas … bullets, walkthroughs, visuals" · "saying none picked a million times"</p>
<ul><li><b>One sentence</b> says the answer; the scale is no longer explained in it.</li>
<li><b>The heat is one gauge:</b> the five rungs are bands, their edges are the reference lines, the needle is today, and under each band is what is invested there. The line under it gives the two edges that would change the rung and how far away each is.</li>
<li><b>The two camps are two bars:</b> the hot camp at ${f2(x.camps.hot)} carrying ${pc(x.camps.hotShare)} of the vote, the cold camp at ${f2(x.camps.cold)} carrying ${pc(x.camps.coldShare)}. What is left between them is the heat.</li>
<li><b>Six bullets at most</b>, and beside them <b>the money as one bar</b>: cash, core, conviction. "None picked" is said nowhere; that no name is kept yet is said once.</li></ul>
${pair("before-00-first-screen-1680.png", "after-00-first-screen-1680.png", "the first screen")}
<div class="pair phone">${one("before-01-the-brief-390.png", "PHONE · BEFORE")}${one("after-01-the-brief-390.png", "PHONE · AFTER")}</div></div>

<div class="panel"><h2>2 · THE VOTERS — five families, and every row says how much it counts</h2>
<p class="said">"advance/decline — isn't that a breadth metric?" · "is all this being used?" · "market % above the 200-day not voting — we have that now … put/call, why aren't we adding that?" · "the equal-weight vs index only considers RSP vs SPY"</p>
<div class="wrap"><table><tr><th>FAMILY</th><th>ITS READING</th><th>SHARE OF THE VOTE</th><th>WHO VOTES IN IT</th></tr>
${x.families.map((f) => `<tr><td>${{ index: "INDEX", breadth: "BREADTH", rates: "RATES & CREDIT", sentiment: "SENTIMENT", defensives: "DEFENSIVES" }[f.id]}</td><td>${f2(f.avg)}</td><td>${pc(f.share, f.share < 0.0995 ? 1 : 0)}</td><td>${f.rows.map((r) => r[0] + " " + f2(r[1])).join(" · ")}</td></tr>`).join("")}</table></div>
<ul><li><b>Breadth reads every pair.</b> The equal-weight fund against its index in ${x.pairs.n} pairs — the S&amp;P, the Nasdaq-100 and the eleven sectors: <b>${x.pairs.below} trail, ${x.pairs.above} lead${x.pairs.level ? ", " + x.pairs.level + " level" : ""}</b>; the average gap is ${f2(x.pairs.avg)}. The S&amp;P pair alone reads ${f2((x.pairs.rows.find((r) => r[0] === "S&P 500") || [])[1])}; it is one of the ${x.pairs.n} and no longer votes on its own.</li>
<li><b>Our own companies vote.</b> ${x.longBars.pct200.toFixed(1)}% of ${x.longBars.n} companies closed above their 200-day average and ${x.longBars.pct50.toFixed(1)}% above their 50-day on ${x.longBars.asof}. Half above reads zero.</li>
<li><b>The put/call votes.</b> ${x.putcall.reading.toFixed(3)} on ${x.putcall.asof}: higher than ${x.putcall.place.below} of its ${x.putcall.place.n} other measured sessions, so it sits on the low-fear side — and it is counted at ${x.putcall.place.n}/20 strength because ${x.putcall.place.n} sessions are few. Its vote is ${f2(x.putcall.val)}.</li>
<li><b>Used or not, at a glance.</b> A row's share of the vote is printed on the row; a row at weight 0 says "0% · unused"; a row that cannot vote is in the list at the foot with its reason.</li></ul>
${pair("before-02-heat-voters-1680.png", "after-02-heat-voters-1680.png", "step 1, the voters")}
${one("after-12-heat-families-open-1680.png", "AFTER · the breadth and sentiment families opened")}
${one("after-13-heat-not-voting-open-1680.png", "AFTER · the rows that cannot vote, with why")}</div>

<div class="panel"><h2>3 · SECTORS THAT KNOW THE TREE — AI beside Technology, metals from the metal, the five methods side by side</h2>
<p class="said">"technology 2%, technology at large, and no AI at all" · "metals — what are all of these tickers? gold and silver miners? I measure the commodity" · "how are you blending between the methods? Are there mismatches? Do they share companies?"</p>
<ul><li><b>The tree is read as it stands</b> (${x.tree.rows} rows, ${x.tree.companies} companies). The ${x.tree.sleeves.length} cohorts of its AI heading sit under the sectors, hot to cold: ${x.tree.sleeves.map((r) => w(r[0]) + " " + f2(r[1])).join(" · ")}.</li>
<li><b>Metals are read from the metal:</b> gold ${f2(x.metals.lines[0][1])} and silver ${f2(x.metals.lines[1][1])} from their bullion trusts, so metals read <b>${f2(x.metals.score)}</b>. Copper has no commodity line in the estate and the row says so. The ${x.metals.miners} miners are folded in the metals branch and never enter the reading (their average is ${f2(x.metals.minersScore)}).</li>
<li><b>How the blend is made</b> is drawn: one chip per method, the blend, the spread from the highest method to the lowest, and how many companies sit in every method's set. A cell far from the blend is ringed; a spread of a whole rung is marked "they disagree".</li></ul>
${pair("before-04-sectors-1680.png", "after-04-sectors-1680.png", "step 3a, the sectors")}
${one("after-14-how-the-blend-is-made-1680.png", "AFTER · the five methods side by side, then the metal and the tree's cohorts")}</div>

<div class="panel"><h2>4 · BRANCHES — press a sector, see its funds and the names that pass</h2>
<p class="said">"if from here I had a clickable way that shows me consumer discretionary and some of the names that pass through comps filters … it should at least show me the funds to track … we should start to see branches from here"</p>
<ul><li><b>Funds to track:</b> the State Street fund, its equal-weight twin, and the Vanguard and iShares copies the tree lists; a tree cohort shows the funds the tree names for it; metals show the two trusts.</li>
<li><b>Names that pass the comps filter,</b> fundamentals first, the best eight. Each row: growth (next fiscal year's expected revenue against the reported year before), the fundamentals score, the Geiger, the nearest reviewed line above and below the price with the Lab's own label, the analysts' target.</li></ul>
${one("after-15-branch-consumer-discretionary-1680.png", "AFTER · Consumer discretionary")}
${one("after-16-branch-technology-1680.png", "AFTER · Technology — the five methods disagree here: the two fund readings against the three that count names")}
${one("after-17-branch-tree-cohort-" + tree + "-1680.png", "AFTER · a tree cohort")}
${one("after-18-branch-metals-the-commodity-1680.png", "AFTER · Metals — the metal, its trust, its future, its nearest reviewed line; the miners folded")}</div>

<div class="panel"><h2>5 · THE MONEY — few sleeves, core and conviction</h2>
<p class="said">"I would never diversify to this degree" · "this would recommend more small caps right now … I think it'd be a safer gamble to bet on breadth returning than small caps returning"</p>
<div class="kpi">
<div><b>${pc(x.money.cash)}</b><span>cash — the rung, unchanged</span></div>
<div><b>${pc(x.money.index)}</b><span>core · the index sleeve: the equal-weight S&amp;P (RSP), the bet on breadth returning</span></div>
<div><b>${pc(x.money.core - x.money.index)}</b><span>core · ${x.money.sleeves.length} sleeves held through their funds: ${sleeves}</span></div>
<div><b>${pc(x.money.conviction)}</b><span>conviction — the names you keep in the knockout, whatever their sector</span></div>
</div>
<ul><li><b>Before:</b> ${b.sleeves.length} sleeves from ${b.sleeves[0][1]}% down to ${b.sleeves[b.sleeves.length - 1][1]}% of equity. <b>After:</b> at most six sleeves in all, none under ${pc(x.money.minEq)} of equity.</li>
<li>The ranking rule is the one of 5 Oct, unchanged (coldness × the turn). Only the first ${x.money.maxN} candidates are funded; the full ranking of all ${x.money.ranking.length}, with why each is in or out, is folded under the bar.</li>
<li><b>Small caps or breadth:</b> the two reads are side by side and the index sleeve says it bets on breadth returning. Small caps still vote in the heat; they hold no sleeve.</li>
<li>The four numbers (most sleeves, smallest sleeve, conviction's share, the index sleeve's share) are dials in INPUTS. They are proposals.</li></ul>
${pair("before-05-money-split-1680.png", "after-05-money-split-1680.png", "step 3b, the money")}
${one("after-20-money-full-ranking-open-1680.png", "AFTER · the full ranking opened")}
${pair("before-06-picks-and-mix-1680.png", "after-06-picks-and-mix-1680.png", "step 6, the picks")}</div>

<div class="panel"><h2>6 · ON A PHONE</h2>
<div class="pair phone">${one("before-02-heat-voters-390.png", "HEAT · BEFORE")}${one("after-02-heat-voters-390.png", "HEAT · AFTER")}</div>
<div class="pair phone">${one("before-04-sectors-390.png", "SECTORS · BEFORE")}${one("after-04-sectors-390.png", "SECTORS · AFTER")}</div>
<div class="pair phone">${one("before-05-money-split-390.png", "MONEY · BEFORE")}${one("after-05-money-split-390.png", "MONEY · AFTER")}</div></div>

<div class="panel"><h2>7 · WHERE EACH NUMBER COMES FROM</h2><div class="wrap"><table>
<tr><th>WHAT</th><th>SOURCE</th><th>HOW</th></tr>
<tr><td>Every Geiger</td><td>the chart API's Geiger, the Hub's own</td><td>read when the page loads; the sectors, the funds, the tree's members and the trusts all on this one ruler</td></tr>
<tr><td>The tree</td><td>cohort_tree, cohort_tree_members</td><td>read as they stand; only the AI heading's cohorts become rows and candidate sleeves</td></tr>
<tr><td>Every-pair breadth</td><td>the same Geiger call</td><td>equal-weight fund minus cap-weight fund, 13 pairs, averaged — BT1 checked each pair against the feed</td></tr>
<tr><td>Above the 200-day / 50-day</td><td>225 daily bars per company, chart API</td><td>the tree's companies; last close against its own average; read after the first paint and kept for the session</td></tr>
<tr><td>Put/call</td><td>putcall_daily, the IB collector</td><td>today's ratio placed among its own measured sessions</td></tr>
<tr><td>Metals</td><td>GLD and SLV on the chart API's Geiger</td><td>the futures row (GCUSD, SIUSD, the Hub's second source) is shown beside it, never averaged in</td></tr>
<tr><td>Growth on a branch row</td><td>analyst_estimates, fundamentals_history</td><td>R4's rule: next fiscal year's consensus revenue ÷ the reported year before</td></tr>
<tr><td>Fundamentals score, the filter</td><td>the page's own comps (peers, C6b outliers out)</td><td>unchanged; pass = two measured readings and 0.50 or more</td></tr>
<tr><td>Nearest reviewed line</td><td>the Lab's lines, LB1's extract of 6 Oct</td><td>a dated file beside the page, 19 names; CP1's decision card when the Hub serves one</td></tr>
<tr><td>The sleeve ranking</td><td>the 3a readings</td><td>coldness × the turn, the rule of 5 Oct, unchanged</td></tr>
<tr><td>The count on the breadth card</td><td>R4's study, 5 Oct</td><td>dated; not recomputed here</td></tr>
</table></div></div>

<div class="panel"><h2>8 · WHAT COULD BE WRONG</h2><ul>
<li><b>Two readings of the same metal disagree.</b> Gold's trust reads ${f2(x.metals.lines[0][1])} on the chart API's Geiger while the gold future reads ${f2(x.metals.lines[0][2])} on the Hub's second source; gold is under its 50-day and 100-day average. I read metals from the trusts. The same second source still feeds two heat voters — oil and gold — and that is decision 2 below.</li>
<li><b>The filter still uses the comps feed's growth inside its score,</b> and that feed answers differently from call to call (PA6 found it). The growth shown on the row is from the stored estimates instead; the pass/fail can still be nudged by the feed.</li>
<li><b>Breadth now votes milder.</b> The average gap over ${x.pairs.n} pairs (${f2(x.pairs.avg)}) is far from the S&amp;P pair alone, so breadth pulls the heat down less than it did. The count — ${x.pairs.below} of ${x.pairs.n} trail — is shown but does not vote.</li>
<li><b>Thin sleeves.</b> A tree cohort can be funded with few members (datacenter property has four). The rule does not look at how many names stand behind a sleeve.</li>
<li><b>Our companies, not the market.</b> The share above the 200-day is ${x.longBars.n} companies we follow.</li>
<li><b>The put/call has ${x.putcall.place.n} other sessions.</b> It votes at ${x.putcall.place.n}/20 strength for that reason.</li>
<li><b>Reviewed lines are 19 names, dated 6 Oct.</b> A sloped line has moved a little since; gold and silver lines are compared with the futures price.</li>
<li><b>"Companies the methods share"</b> takes the sector ranking's set to be our own membership table — my reading of what that ranking averages.</li>
<li><b>CP1's cards are not served yet,</b> so that path is proven with a sample card in the tests, not with the real file.</li>
</ul></div>

<div class="panel"><h2>9 · NOT DONE</h2><ul>
<li>Nothing is deployed and no table was written by the page. The suite's two older write tests appended their labelled test rows, as they do on every run.</li>
<li>R4's two dials are not on the page: conviction's share is a dial you set, not something the regime moves.</li>
<li>Steps 4 and 5 (the cohorts and the knockout) still stand on the Hub's older cohorts, not on the tree.</li>
<li>The reviewed_lines table is not applied yet, so the lines come from a dated file.</li>
<li>No test of whether "few sleeves" would have done better in the past.</li>
</ul></div>

<div class="panel"><h2>10 · DECISIONS</h2><ul>
<li><b>1 · Core and conviction at these shares?</b> Conviction a fifth of what is invested, the index sleeve half the core, six sleeves at most, none under 4% of equity. <b>Recommend yes</b> as the starting point — they are four dials.</li>
<li><b>2 · One ruler for oil and gold in the heat too?</b> ${x.oneRuler ? `The oil and gold voters still read the second source: the oil future reads ${f2(x.oneRuler.oil.future)} there while the oil fund reads ${f2(x.oneRuler.oil.fund)} on the Hub's Geiger; the gold future ${f2(x.oneRuler.gold.future)} against the gold trust ${f2(x.oneRuler.gold.trust)}. Reading both on the Hub's Geiger would put the heat at ${f2(x.oneRuler.heat)} instead of ${f2(x.heat)} — ${x.oneRuler.rung.pct}% invested${x.oneRuler.rung.pct === x.rung.pct ? ", the same rung today" : ", a different rung"}.` : "The oil and gold voters still read the Hub's second source."} <b>Recommend yes</b>, but it moves the heat, so it is yours.</li>
<li><b>3 · The put/call's weight.</b> The brief said "as the CBOE row", but that row never carried a weight. I gave it 0.25, what SKEW and the VIX term carry. <b>Recommend keeping 0.25.</b></li>
</ul></div>
</body></html>
`;
fs.writeFileSync(path.join(DIR, "AL7.html"), html);
console.log("wrote study/al7/AL7.html", (html.length / 1024).toFixed(1) + " KB · pictures referenced:", (html.match(/src="pictures\//g) || []).length, "· missing:", (html.match(/picture not taken/g) || []).length);
