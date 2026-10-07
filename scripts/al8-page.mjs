/* AL8 (7 Oct 2026) — writes study/al8/AL8.html, the before → after page for Alan: pictures first, plain words. Every number comes from the
   two readouts the picture run wrote (study/al8/pictures/before-readout.json, after-readout.json), and every "line N" in the audit table
   is found in index.html as this script runs — so the page, the pictures and the code agree. It also writes study/al8/audit.json, the
   same table as data. node scripts/al8-page.mjs */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), DIR = path.join(ROOT, "study", "al8"), PIC = path.join(DIR, "pictures");
const B = JSON.parse(fs.readFileSync(path.join(PIC, "before-readout.json"), "utf8")), A = JSON.parse(fs.readFileSync(path.join(PIC, "after-readout.json"), "utf8"));
const b = B["1680"], a = A["1680"], R = a.al8, old = b.al7.money;
const SRC = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").split("\n");
const TESTS = fs.existsSync(path.join(DIR, "tests.json")) ? JSON.parse(fs.readFileSync(path.join(DIR, "tests.json"), "utf8")) : null;
const esc = (x) => String(x).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const pc = (v, d = 0) => (v * 100).toFixed(d) + "%", f2 = (v) => (v == null ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2));
const WORD = { TECH: "Technology", HEALTH: "Health care", FINANCIALS: "Financials", DISCRET: "Consumer discretionary", INDUSTRIAL: "Industrials", MATERIALS: "Materials", ENERGY: "Energy", STAPLES: "Consumer staples", UTILITIES: "Utilities", REAL_ESTATE: "Real estate", COMMS: "Communications", CRYPTO: "Crypto", METALS: "Metals", OIL: "Oil", INDEX: "Equal-weight S&P",
  DC_PROPERTY: "Datacenter property", NEOCLOUDS_MINERS: "Neoclouds & AI miners", MEMORY_STORAGE: "Memory & storage", AI_POWERTRAIN: "AI powertrain", AI_ACCELERATORS: "AI accelerators & logic", AI_NETWORKING_OPTICAL: "AI networking & optical", AI_SERVERS_DC_KIT: "AI servers & datacenter kit", AI_SOFTWARE_DATA: "AI software & data platforms", ROBOTICS_AUTOMATION: "Robotics & automation" };
const w = (k) => WORD[k] || k.replace(/_/g, " ").toLowerCase();
const has = (n) => fs.existsSync(path.join(PIC, n));
const img = (n, alt) => (has(n) ? `<a href="pictures/${n}"><img loading="lazy" src="pictures/${n}" alt="${esc(alt)}"></a>` : `<div class="miss">picture not taken: ${n}</div>`);
const pair = (n, cap) => `<div class="pair"><figure><figcaption>BEFORE — the evening of 6 Oct</figcaption>${img("before-" + n, "before: " + cap)}</figure><figure><figcaption>AFTER — this branch</figcaption>${img("after-" + n, "after: " + cap)}</figure></div>`;
const one = (n, cap, cls = "") => `<figure class="one ${cls}"><figcaption>${esc(cap)}</figcaption>${img(n, cap)}</figure>`;
const shotAt = fs.statSync(path.join(PIC, "after-00-first-screen-1680.png")).mtime;
const when = (() => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(shotAt).map((x) => [x.type, x.value])); return p.day + " " + p.month + ", " + p.hour + ":" + p.minute + " ET"; })();

/* ---------- the audit: every input, what it moves, and the line of index.html that proves it (found now, so the number is right) */
const at = (needle) => { const i = SRC.findIndex((l) => l.includes(needle)); if (i < 0) throw new Error("audit anchor not found: " + needle.slice(0, 70)); return i + 1; };
const every = (re) => SRC.map((l, i) => (re.test(l) ? i + 1 : 0)).filter(Boolean);
const AUDIT = [
  ["The ladder — five rungs (5 sliders)", "INPUTS · how much", "the % invested", null, [[at("const v = lbl==='DEEP OVERSOLD'?S.maxInv"), "the heat's condition picks one of the five numbers"], [at("function investedNow(){ return investedAt(heat()); }"), "and that number is how much is invested, everywhere"]]],
  ["The voters' weights (a slider on each of the " + (b.al7.voting + b.al7.readOnly + b.al7.cannot) + " voters)", "step 1, on each voter's row", "the % invested", "the names", [[at("for (const v of voters()) { if (!canVote(v)) continue; const w = S.wts[v.key] ?? 0; num += v.val * w; den += w; }"), "the heat is the weighted average of the voting rows"], [at("function namesPer(h){"), "the heat also sets how many names AUTO offers"]]],
  ["VIX — where it reads fully cold", "INPUTS · how much (moved from step 1)", "the % invested", null, [[at("v.push({key:'VIX', speed:0.15, name:'VIX (inv)'"), "sets the VIX voter's reading"]]],
  ["10-year yield — where it reads fully cold", "INPUTS · how much (moved from step 1)", "the % invested", null, [[at("v.push({key:'US10Y', speed:0.85, name:'US 10Y (inv)'"), "sets the 10-year voter's reading"]]],
  ["The blended sector reading — five weights (5 sliders)", "INPUTS · where it goes", "the mix", "the % invested, slightly", [[at("const parts=blendParts(k), w=mixWeights();"), "each sector's reading is the weighted average of five methods"], [at("o.cold=Math.max(0.05,(1-o.score)/2); o.turn=REGIME_FIT[o.kind]??1.0;"), "the reading is two of a sleeve's three ranking answers"], [at("v.push({key:'SECTORS', speed:0.6, name:'SECTOR BOW TIE (blended)'"), "the same blend is one voter in the heat — the one way these reach the %"]]],
  ["The ranking — growth, regime fit, opportunity (3 sliders, new)", "INPUTS · where it goes", "the mix", null, [[at("o.rankScore=(W.growth*(o.pGrowth??0.5)+W.regime*(o.pRegime??0.5)+W.opportunity*(o.pOpp??0.5))/wt;"), "a sleeve's score is its three places, weighed"]]],
  ["Smallest sleeve", "INPUTS · where it goes", "the mix", null, [[at("let eq=size(); while(keep.length && Math.min(...eq)<minEq-1e-12){ keep=keep.slice(0,-1); eq=size(); }"), "the last of the ranking is left out while any sleeve would be smaller"]]],
  ["A conviction name's own size (a figure on each name, new)", "step 6, on the name's row", "the mix", null, [[at("if(own!=null&&isFinite(own)){ want=Math.max(0,Math.min(100,+own))/100; how='own';"), "his figure is the name's size; the core is what is left"]]],
  ["KEEP and DROP", "steps 5, 8 and 8b", "the names", "the mix", [[at("if(off) PICKS.delete(sym); else PICKS.add(sym);"), "a kept name joins the picks"], [at("const syms=[...new Set([...Object.keys((APPROVED&&APPROVED.names)||{}), ...PICKS])];"), "the conviction list is the approved names and the picks"]]],
  ["The cohort in the knockout", "step 4", "the names", null, [[at("function setKoCohort(c){ KO_COHORT=c;"), "which companies face off"]]],
  ["Names — AUTO or MANUAL · most per sleeve · concentration lean · names per sleeve (a toggle and 3 sliders)", "INPUTS · where it goes", "the names", null, [[at("function namesPer(h){"), "the count of pick cards"], [at("const picks=K.podium.slice(0,Math.max(1,n));"), "the knockout offers that many"]]],
  ["Most names in all", "INPUTS · where it goes", "the names", null, [[at("if(PICKS.size>=(S.maxTotal??12)){"), "the comps sheet refuses a pick past it"]]],
  ["★ on a name", "step 8", "the names", null, [[at("function toggleCompare(sym){"), "adds the name to the comps sheet"]]],
  ["Invested now", "INPUTS · where you are", "the gap only", null, [[at("const dTot = inv - cInv, dLC = lcEq - cLC, dSC = scEq - cSC;"), "the move is the target minus this; the target is not touched"]]],
  ["Conviction, as one share", "INPUTS · listed for removal", "nothing", null, [[at("set('maxSleeves', S.maxSleeves, 'unused'); set('convShare', S.convShare, 'unused'); set('coreIndexShare', S.coreIndexShare, 'unused');"), "nothing computes with it: its only mentions are its own read-out and its row in this audit (lines " + every(/S\.convShare/).join(", ") + ")"]]],
  ["Index sleeve", "INPUTS · listed for removal", "nothing", null, [[at("const indexEq=keep.length?0:coreEq, sleeveEq=coreEq-indexEq;"), "the equal-weight fund is all or nothing now — the split does not read the dial; its only mentions are its read-out and its audit row (lines " + every(/S\.coreIndexShare/).join(", ") + ")"]]],
  ["Most sleeves", "INPUTS · listed for removal", "nothing", null, [[at("let keep=cands.slice();"), "every candidate starts in — no cap is read; its only mentions are its read-out and its audit row (lines " + every(/S\.maxSleeves/).join(", ") + ")"]]],
  ["…of which large caps", "INPUTS · listed for removal", "nothing", null, [[at("const cInv = S.curInv/100, cLC = S.curLC/100, cSC = cInv - cLC;"), "it only feeds two numbers that are handed to three functions and read by none of them (every line that names them: " + every(/\bdLC\b/).join(", ") + ")"]]],
  ["Heat tilt toward large caps", "INPUTS · listed for removal", "nothing", null, [[at("return Math.min(.8, Math.max(.2, 0.5 + (i - s) * 0.5 + (S.lcTilt || 0) * (h || 0)));"), "it tilts a large / small split"], [at("a reading only since 6 Oct: no money follows it"), "that is printed in one line of the audit trace and used nowhere else"]]],
  ["Positions, large and small (stored, no control)", "the saved settings", "nothing", null, [[at("const perLC = lcEq / S.nLC, perSC = scEq / S.nSC;"), "they divide a split that is handed on and read by nothing (every line that names the result: " + every(/\bperLC\b/).join(", ") + ")"]]],
  ["Three Geiger dials from July (stored, no control)", "the saved settings", "nothing", null, [[at("dTrend:0.5, dRsi:0.6, dTf:0.763,"), "their default is the only line that names them"]]],
  ["The sector method (stored, no control)", "the saved settings", "nothing", null, [[at("function setMixMethod(m){ S.mixMethod='BLEND'; save(); render(); }"), "it is only ever set to one word; nothing computes with it (every mention: " + every(/S\.mixMethod/).join(", ") + " — set here, two old migrations, its audit row)"]]],
  ["Sectors or cohorts (stored, no control)", "the saved settings", "the mix — and nothing on the page can set it", null, [[at("let AXIS = localStorage.getItem('alloc-axis') || 'sector';"), "read at load from the device"], [at("function setAxis(v){ AXIS=v;"), "the only line that could change it — nothing calls it (every mention of setAxis: " + every(/setAxis\(/).join(", ") + ")"]]],
  ["A section open or folded · what each voter is · refresh feeds", "every section · step 1 · step 8", "what is drawn — no number", null, [[at("function setFold(id, folded){"), "the fold"], [at("document.getElementById('refresh').onclick = loadFeeds;"), "reads every source again"]]],
];
fs.writeFileSync(path.join(DIR, "audit.json"), JSON.stringify(AUDIT.map(([input, where, moves, also, proof]) => ({ input, where, moves, also, proof: proof.map(([line, says]) => ({ line, says })) })), null, 1));
const MV = { "the % invested": "pct", "the mix": "mix", "the names": "mix", "nothing": "none" };
const auditRows = AUDIT.map(([input, where, moves, also, proof]) => `<tr><td>${esc(input)}</td><td>${esc(where)}</td><td><u class="mv ${MV[moves] || (moves.startsWith("the mix") ? "mix" : "")}">${esc(moves)}</u>${also ? `<small>and ${esc(also)}</small>` : ""}</td><td>${proof.map(([line, says]) => `<b>line ${line}</b> — ${esc(says)}`).join("<br>")}</td></tr>`).join("\n");

const scen = R.scen, mu = a.mu, feed = (mu && mu.feed) || {}, FH = R.feed, L = R.leak, funded = R.ranking.filter((r) => r.funded), out = R.ranking.filter((r) => !r.funded);
const scenRows = scen.map((r) => `<tr><td>${esc(r.title)}<small>${esc(r.sub)}</small></td><td>${pc(r.inv)}</td><td>${pc(r.cash)}</td><td>${pc(r.core)}</td><td>${pc(r.conv, r.conv < 0.0995 ? 1 : 0)}</td><td>${[r.spy != null ? "S&amp;P " + (+r.spy).toFixed(0) : "", r.rsi != null ? "RSI " + (+r.rsi).toFixed(0) : "", r.vix != null ? "VIX " + (+r.vix).toFixed(1) : ""].filter(Boolean).join(" · ")}</td></tr>`).join("\n");
const rankRows = R.ranking.map((r) => `<tr class="${r.funded ? "in" : "out"}"><td>${r.rank} · ${esc(w(r.key))}</td><td>${r.growth == null ? "not read" : (r.growth >= 0 ? "+" : "−") + Math.abs(r.growth * 100).toFixed(0) + "%"}</td><td>${{ improve: "improving", go: "leading", buy: "pulling back", avoid: "breaking down" }[r.kind] || "—"}</td><td>${f2(r.score)}</td><td>${r.rankScore.toFixed(2)}</td><td>${r.funded ? "<b>" + pc(R.sleeves.find((x) => x.key === r.key).equity, 1) + "</b> · " + (R.sleeves.find((x) => x.key === r.key).parked ? "parked in " + esc(R.sleeves.find((x) => x.key === r.key).parked) : "no fund tracks it") : esc(r.why)}</td></tr>`).join("\n");
const testsLine = TESTS ? `<b>${TESTS.before.pass} of ${TESTS.before.tests}</b> passed before (the evening of 6 Oct's code, run ${esc(TESTS.before.when)}) → <b>${TESTS.after.pass} of ${TESTS.after.tests}</b> pass now (run ${esc(TESTS.after.when)}). ${esc(TESTS.note || "")}` : "the counts are in the return that came with this page";

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Allocation · how much, and where it goes</title>
<style>
:root{--bg:#0a0a0f;--panel:#101018;--line:#1c1c28;--txt:#e8e8f0;--dim:#8a8aa0;--cyan:#00d4ff;--gold:#ffd166}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:13px;line-height:1.6;padding:22px 16px 60px;overflow-x:hidden}
@media(min-width:900px){body{padding:26px 30px 60px}}
h1{font-size:19px;letter-spacing:.28em;font-weight:600;margin:0}h1 span{color:var(--cyan)}.sub{color:var(--dim);margin-top:4px;font-size:11px;letter-spacing:.06em;max-width:1200px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin-top:16px;min-width:0;max-width:1700px}
.panel h2{font-size:12px;letter-spacing:.2em;color:var(--cyan);margin:0 0 8px;font-weight:600}
.said{color:var(--gold);font-size:12px;margin:0 0 8px;max-width:1100px}.what{margin:0 0 10px;max-width:1000px}
ul{margin:6px 0 10px;padding-left:18px;max-width:1000px}li{margin:3px 0}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px;align-items:start;margin:10px 0}
figure{margin:0;min-width:0}figcaption{font-size:11px;letter-spacing:.14em;color:var(--dim);margin-bottom:4px}
img{display:block;max-width:100%;height:auto;border:1px solid var(--line);border-radius:6px}.one{margin:12px 0}.phone img{max-height:900px;width:auto}
.phones{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start}.phones figure{flex:0 1 300px}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:10px 0 2px}.kpi div{border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:#0c0c13}
.kpi b{display:block;font-size:20px;font-weight:700}.kpi span{font-size:11px;color:var(--dim);display:block;line-height:1.45}
table{border-collapse:collapse;width:100%;font-size:12px;max-width:1500px}th{color:var(--dim);text-align:left;font-weight:400;font-size:11px;letter-spacing:.12em;padding:5px 8px;border-bottom:1px solid var(--line)}
td{padding:6px 8px;border-bottom:1px solid #14141e;vertical-align:top;color:#c8c8d8}td:first-child{color:var(--txt)}td small{display:block;color:var(--dim);font-size:11px}.wrap{overflow-x:auto}
tr.out td{color:var(--dim)}tr.out td:first-child{color:#a8a8ba}
.mv{text-decoration:none;display:inline-block;font-size:11px;letter-spacing:.08em;font-weight:700;border:1px solid var(--line);border-radius:3px;padding:1px 7px;color:var(--txt)}.mv.pct{border-color:var(--cyan);color:var(--cyan)}.mv.mix{border-color:var(--gold);color:var(--gold)}.mv.none{color:var(--dim)}
.miss{color:var(--dim);font-size:11px;border:1px dashed var(--line);padding:10px;border-radius:6px}.dim{color:var(--dim)}b{font-weight:600}
.ph{font-size:11px;letter-spacing:.14em;font-weight:700;color:#0a0a0f;background:var(--gold);border-radius:3px;padding:1px 7px}
</style></head><body>
<h1>ALLOCATION <span>·</span> HOW MUCH, AND WHERE IT GOES</h1>
<div class="sub">branch al8-split-and-cards-20261007 of the allocation tool, on top of the evening of 6 Oct's branch · pictures taken headless at ${when}, before and after back to back · nothing on this page is live — the tool at allocation.scintillahub.ai is unchanged until you say so</div>

<div class="panel"><h2>0 · THE SAME MOMENT, BEFORE AND AFTER</h2>
<div class="kpi">
<div><b>1 list → 2 sections</b><span>INPUTS: what moves the % invested, and what only moves where it goes · ${AUDIT.length} inputs audited, one by one</span></div>
<div><b>${AUDIT.filter((x) => x[2] === "nothing").length} change nothing</b><span>five dials and six stored settings — listed for removal, not removed</span></div>
<div><b>${old.sleeves.length + 2} → ${R.sleeves.length} + ${R.conviction.filter((x) => x.size > 0).length}</b><span>places the invested money goes: before, the index, four sleeves and a conviction pot · now ${R.sleeves.length} ranked sleeves and Micron at its own size</span></div>
<div><b>${pc(old.conviction)} → ${pc(R.conviction.reduce((t, x) => t + x.size, 0))}</b><span>conviction, of the account: a fifth of what is invested, unnamed → Micron by your rule</span></div>
<div><b>${f2(b.heat)} → ${f2(a.heat)}</b><span>the heat · ${b.rung.pct}% invested before, ${a.rung.pct}% after — how much is invested did not move</span></div>
<div><b>${B["390"].pageWidth} → ${A["390"].pageWidth} px</b><span>page width on a 390 px phone — still no sideways scroll</span></div>
</div></div>

<div class="panel"><h2>1 · THE MONEY AT THE TOP — one bar per market</h2>
<p class="said">"How do we visualize this on the tool, in some kind of concise and visual way, very important, visual, visual, visual."</p>
<ul><li><b>Five rows, each the whole account:</b> cash, then the core, then conviction (Micron). Today, the S&amp;P down 1.5%, the VIX at 20, the VIX at 23.5, a panic.</li>
<li><b>How much is invested in each row</b> is the deployment study's number. It is marked <span class="ph">PLACEHOLDER</span> on the panel: that study sits on its own branch, not reviewed and not wired. Nothing under the panel uses it — every step below still runs on the ladder, which says <b>${pc(R.invested)}</b> today. The dashed line through the bars is that ladder number, so the two answers are seen against each other.</li>
<li><b>How the invested part splits</b> is the page's own rule and no other: Micron takes two fifths of what is invested and never more than 30% of the account, the core is the rest. The study's own Micron figure agrees with it in all five rows.</li>
<li><b>When the engine's own file is put beside the page</b> the same bars read it and the word PLACEHOLDER goes. No code changes for that.</li></ul>
${pair("00-first-screen-1680.png", "the first screen")}
<div class="wrap"><table><tr><th>MARKET</th><th>INVESTED</th><th>CASH</th><th>CORE</th><th>MICRON</th><th>THE READING</th></tr>
${scenRows}</table></div>
<div class="phones">${one("after-00-first-screen-390.png", "ON A PHONE — the first screen", "phone")}${one("after-01-the-money-in-five-markets-390.png", "ON A PHONE — the five bars", "phone")}</div></div>

<div class="panel"><h2>2 · EVERY INPUT, AND THE ONE THING IT MOVES</h2>
<p class="said">"I don't know if all of those toggles are going to even be used anymore … at least in the equity deployment recommendation. And if they're not, they need to be separated into a separate toggle section if they only really cover sector compare … that's important to know and to do."</p>
<p class="what">Each dial, toggle, button and stored setting was moved in a hidden browser, one at a time, and the page was read before and after: did the % invested change, the mix, the names, or nothing. The table is the answer, with the line of the page's code that proves each. The tests repeat it every time they run.</p>
<div class="wrap"><table><tr><th>INPUT</th><th>WHERE IT IS NOW</th><th>IT MOVES</th><th>THE LINE OF index.html THAT PROVES IT</th></tr>
${auditRows}</table></div>
<p class="what dim">One honest exception, measured as it stands: the five sector-compare weights also reach the % through a single voter, the sectors row, which holds ${pc(L.share)} of the vote. Pushing any one of the five end to end moves the heat by at most ${L.reach.toFixed(3)} today (${f2(L.lo)} to ${f2(L.hi)} — it rounds to the same number); the rung ${L.rung ? "would change" : "stays at " + L.pct + "%"}. The page prints this sentence live, beside those dials.</p></div>

<div class="panel"><h2>3 · WHAT MOVED WHERE — INPUTS in two sections</h2>
<ul><li><b>HOW MUCH TO INVEST</b> — only what moves the %: the ladder's five rungs (now in order, washed out to stretched), and the two dials for where the VIX and the 10-year read fully cold, which came over from step 1. The voters' own weights stay on their rows in step 1; the section says how many vote.</li>
<li><b>WHERE IT GOES — SECTOR COMPARE</b> — what moves the mix and the names and never the ladder: the five weights of the blended sector reading, the three weights of the ranking (new), the smallest sleeve, a pointer to each conviction name's own size (set in step 6), and the dials for how many names.</li>
<li><b>WHERE YOU ARE</b> — the one dial that only sets the gap in step 7.</li>
<li><b>LISTED FOR REMOVAL</b> — folded at the foot, still working, still stored: conviction as one share, the index sleeve, most sleeves (the three you turned down on 7 Oct), and the two large-cap dials nothing has read since 6 Oct. Under them, six stored settings that have no control at all.</li>
<li><b>One stored setting is not nothing:</b> the sector / cohort switch. No control sets it, but a device that stored "cohort" in August would rank cohorts instead of sectors. It is listed so it can be fixed.</li></ul>
${pair("03-inputs-1680.png", "INPUTS, the whole drawer")}
${one("after-04-inputs-listed-for-removal-1680.png", "LISTED FOR REMOVAL, opened")}
${one("after-09-what-each-input-moves-1680.png", "STEP 9 ON THE PAGE — the same table, live")}</div>

<div class="panel"><h2>4 · HOW THE MONEY SPLITS — conviction by name, sleeves in rank order</h2>
<p class="said">"the conviction doesn't always have to be a fifth of what's invested" · "the index sleeve, half of the core — I don't think I'm understanding … Micron can take a parent sleeve" · "at most six sleeves — I don't think it makes sense to limit it. It makes more sense to force ourselves through the process of picking which sleeves we prefer in the regime, which have better growth, which present better opportunities."</p>
<ul><li><b>Conviction is each approved name at its own size.</b> Micron: two fifths of what is invested, at most 30% of the account — ${pc(R.conviction.find((x) => x.sym === "MU").size)} today. A name you KEEP in the knockout joins the list and takes no money until you type its size in step 6.</li>
<li><b>The core is what is left</b> (${pc(R.core)} today). Every candidate sleeve — ${R.ranking.length} of them: the eleven sectors, crypto, metals, oil and the tree's AI cohorts — answers three questions: <b>growth</b> (the expected sales growth of its companies, the middle one), <b>regime fit</b> (improving, leading, pulling back, breaking down) and <b>opportunity</b> (how washed out its reading is). Each answer is the sleeve's place among the ${R.ranking.length}; the score weighs them ${R.weights.growth} / ${R.weights.regime} / ${R.weights.opportunity} — growth the most, and all three are dials.</li>
<li><b>Funded in rank order, no cap.</b> The last of the ranking is left out while any funded sleeve would be under ${pc(R.minEq)} of the account. Today that funds ${funded.length}; with everything invested it would be about twice that. The table says once where the core stops, and each sleeve under the line says what holds it back.</li>
<li><b>Each funded sleeve parks in its branch's parent fund</b> until the knockout places it in names — the memory fund for memory and storage, the sector's own fund for a sector. The broad equal-weight fund holds the core only when no branch is funded.</li></ul>
${pair("05-how-the-money-splits-1680.png", "3b · how the money splits")}
<div class="wrap"><table><tr><th>SLEEVE</th><th>GROWTH</th><th>REGIME</th><th>READING</th><th>SCORE</th><th>% OF THE ACCOUNT · OR WHAT HOLDS IT BACK</th></tr>
${rankRows}</table></div>
<div class="phones">${one("after-05-how-the-money-splits-390.png", "ON A PHONE — one block per sleeve, no sideways swipe", "phone")}</div></div>

<div class="panel"><h2>5 · THE PICKS READ THE DECISION CARDS — and Micron's ladder is its three zones</h2>
<ul><li><b>Step 6 is each conviction name as its card:</b> the comps range per share drawn low to high with the centre marked and the price as a needle; growth as sales over the next twelve months; where its Geiger sits in its own year; the nearest named line under and over the price; its own size; its parent fund.</li>
<li><b>Micron's ladder</b> is the three confluence zones under the price, each with its named members to the cent: 1,028–1,036 (21-day + 2W D3 + 3D P1), 980–989 (1D D3 + 3D C3), 960–962 (100-day + 50-day). The 3D P3 at 1,011.77 stands alone between the first two and is listed as that, not as a zone.</li>
<li><b>In the knockout</b> a name with a card reads its growth and its price multiples from the card; a name without one reads the feed and its card says NO CARD · FEED.</li>
<li><b>Why it matters tonight:</b> for Micron the feed said sales growth of <b>${feed.rev_growth == null ? "—" : (feed.rev_growth * 100).toFixed(0) + "%"}</b> and a forward P/E of <b>${feed.fwd_pe == null ? "none" : feed.fwd_pe}</b>; the card says <b>+${(mu.rev_growth * 100).toFixed(0)}%</b> and <b>${mu.fwd_pe.toFixed(1)}</b>. ${R.overlaid.length} names read from their card. For the rest the feed gave a forward P/E to only ${FH.fwd} of the ${FH.earn} names with earnings, so the sources line marks it; that mark clears by itself when the repaired feed is deployed.</li></ul>
${pair("06-the-picks-1680.png", "6 · the picks")}
${one("after-13-knockout-microns-line-1680.png", "THE KNOCKOUT — Micron's own business line, both names read from their cards")}
${pair("07-knockout-the-pick-cards-1680.png", "the knockout's pick cards")}
${one("after-12-a-kept-name-waits-for-a-size-1680.png", "A NAME KEPT IN THE KNOCKOUT — on the list, no money until it has a size")}
<div class="phones">${one("after-06-the-picks-390.png", "ON A PHONE — Micron's card and ladder", "phone")}${one("after-03-inputs-390.png", "ON A PHONE — INPUTS", "phone")}</div></div>

<div class="panel"><h2>6 · WHERE EACH NUMBER COMES FROM</h2>
<div class="wrap"><table><tr><th>WHAT</th><th>FROM</th><th>NOTE</th></tr>
<tr><td>% invested, in the five bars</td><td>the deployment study's five scenario rows, from the 6 Oct close</td><td>a dated copy kept with the page, marked placeholder; the engine's own file wins the moment it is beside the page</td></tr>
<tr><td>% invested, everywhere else</td><td>the ladder, read from the heat — as before</td><td>one function says how much; it is the engine's seat when you approve it</td></tr>
<tr><td>Micron's size</td><td>your rule of 6–7 Oct, kept with the page in your words</td><td>two fifths of what is invested, at most 30%; your own figure in step 6 overrides it</td></tr>
<tr><td>A sleeve's growth</td><td>stored analyst estimates: next fiscal year's sales against the year before, per company; the middle company</td><td>three companies with an estimate are needed; a metal has no sales and counts as the middle</td></tr>
<tr><td>Regime fit, opportunity</td><td>the sleeve's own blended reading — trend, momentum, level</td><td>the two numbers of the 6 Oct ranking rule, kept as they were</td></tr>
<tr><td>Comps range, growth, Geiger's place in its year</td><td>the 26 decision cards dated 6 Oct</td><td>a dated copy kept with the page: the Hub does not serve them yet</td></tr>
<tr><td>Nearest named line</td><td>the Lab's reviewed lines, the dated extract of 6 Oct; the card's levels, then the zones file's, when a name is not in it</td><td>measured from the live price</td></tr>
<tr><td>The ladder's zones</td><td>the confluence-zones study, levels as of the 6 Oct close</td><td>two or more named levels within 1% of each other</td></tr>
</table></div></div>

<div class="panel"><h2>7 · WHAT COULD BE WRONG, AND WHAT WAS NOT DONE</h2>
<ul><li><b>Two answers for "how much" are on the first screen.</b> The bars say ${pc(scen[0].inv)} today (the study); the ladder says ${pc(R.invested)}. That is deliberate and labelled, but it is two numbers until you choose.</li>
<li><b>The ranking is a proposal.</b> Places among the candidates, weighed 50 / 25 / 25, is one transparent rule; it has no history behind it. "Regime fit" reads what the sleeve itself is doing; the market's own regime does not yet change which kind of sleeve is preferred.</li>
<li><b>Growth is the middle company's</b> and is the same for a sleeve of five names and of ninety. Metals and crypto have no growth reading and sit in the middle on that question.</li>
<li><b>Micron's +99% on comps is thin</b> — three peers, and the three foreign memory makers have no figures yet. The card says so and the page prints the card's own warnings.</li>
<li><b>The zones are as of the 6 Oct close.</b> A two-week line steps on 12 Oct; the page shows the date and does not move the levels itself.</li>
<li><b>The cards and the zones are dated copies</b> kept with the page. They go stale until the Hub serves fresh ones each evening.</li>
<li><b>Steps 4 and 5 still stand on the older cohorts</b>, not the tree, as on 6 Oct.</li>
<li><b>Not done:</b> nothing is deployed; the deployment engine is not wired (by design); no table was written beyond the suite's own two labelled test rows.</li></ul></div>

<div class="panel"><h2>8 · TESTS</h2>
<p class="what">${testsLine}</p>
<p class="what dim">Older checks that changed, and why: the 6 Oct fixed shape (a fifth to conviction, half the core to the index, six sleeves) — replaced by your 7 Oct direction; the sample decision card — replaced by the real cards' field names; "the index sleeve's bet" and one study named by its code — reworded; fifteen sections — sixteen, the money first; a kept name "takes its part of the conviction share" — it now waits for its own size; two more sources may read "old", each for a stated reason.</p></div>

<div class="panel"><h2>9 · DECISIONS FOR YOU</h2>
<ul><li><b>1 · Which number says how much?</b> The ladder (${pc(R.invested)}) or the deployment study (${pc(scen[0].inv)} today, 88% at VIX 23.5). <b>Recommend:</b> keep the ladder driving the page until you have read the study; the bars let you watch both.</li>
<li><b>2 · Should the sector-compare weights stop reaching the heat?</b> They do, through one voter, by at most ${L.reach.toFixed(3)} today. <b>Recommend yes:</b> let that voter read the blend at equal weights, so "where it goes" is cleanly separate from "how much".</li>
<li><b>3 · The ranking's weights — growth 50, regime fit 25, opportunity 25?</b> <b>Recommend yes as a start;</b> they are dials, and the table shows each answer so you can argue with any row.</li></ul></div>
</body></html>
`;
fs.writeFileSync(path.join(DIR, "AL8.html"), html);
console.log("study/al8/AL8.html", html.length, "bytes ·", AUDIT.length, "audit rows · pictures", fs.readdirSync(PIC).filter((f) => f.endsWith(".png")).length);
