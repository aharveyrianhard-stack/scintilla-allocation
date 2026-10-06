/* R3 (6 Oct 2026) — headless pictures of the regime step, and THE DECISION PICTURE.
   The decision picture is drawn HERE, by this script, into the headless page only: index.html carries no switch, no link and no markup for
   it, so it cannot reach the live page. It puts today's heat and rung beside the heat and rung with rates (the 10-year), credit (HYG) and
   long bonds (TLT) counted as reasons to hold back — their sign turned — using the page's own campSplit(), policyStep() and ladder,
   same page, same readings, same moment.   node scripts/r3-shots.mjs <outdir> */
import fs from "node:fs"; import path from "node:path";
import { openPage } from "../tests/_harness.mjs";
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const FLIP = ["US10Y", "CREDIT", "DURATION"];
const readout = {};
for (const [w, h] of [[1680, 1050], [390, 844]]) {
  const P = await openPage({ width: w, height: h });
  const { page } = P;
  await page.waitForFunction(() => document.getElementById("heatpast").textContent.length > 0, null, { timeout: 60000 });
  const shot = (n, full = false) => page.screenshot({ path: path.join(OUT, `${n}-${w}.png`), fullPage: full });
  const top = (sel, off = 56) => page.evaluate(([sel, off]) => { const el = document.querySelector(sel); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off }); }, [sel, off]);
  await page.evaluate(() => { for (const id of ["p-brief", "p-heat"]) if (document.getElementById(id) && window.setFold) setFold(id, false); });
  await shot("r3-00-first-screen-brief");
  await top("#gauges", 90); await page.waitForTimeout(300); await shot("r3-01-voters-top");
  await top("#heatnum", h - 330); await page.waitForTimeout(300); await shot("r3-02-heat-split-and-own-past");
  await page.evaluate(() => { document.getElementById("notvoting").open = true; }); await top("#notvoting", w < 600 ? 200 : 120); await page.waitForTimeout(300); await shot("r3-03-not-voting-open");
  await page.evaluate(() => { const g = [...document.querySelectorAll("#gauges .gauge")].find((x) => /PUT \/ CALL \(IB/.test(x.innerText)); g.style.outline = "1px solid #5b9dd9"; window.scrollTo({ top: g.getBoundingClientRect().top + window.scrollY - 200 }); }); await page.waitForTimeout(300); await shot("r3-04-put-call-row");
  await page.evaluate(() => { const g = [...document.querySelectorAll("#gauges .gauge")].find((x) => /PUT \/ CALL \(IB/.test(x.innerText)); g.style.outline = ""; document.getElementById("notvoting").open = false; });
  // ---- the decision picture: injected by this script, never part of the page ----
  readout[w] = await page.evaluate((FLIP) => {
    const V = voters(), flip = new Set(FLIP), A = campSplit(V), B = campSplit(V, flip);
    const f = (x) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2);
    const col = (hh, lit) => { const st = policyStep(hh), [, color] = heatLabel(hh), pc = plainCondition(hh);
      const rungs = policyLadder().map(([c, range, v]) => { const on = c === st.cond; return `<div style="flex:1;min-width:86px;border:1px solid ${on ? color : "var(--line)"};border-radius:6px;padding:6px 8px;opacity:${on ? 1 : .5};background:${on ? "rgba(255,255,255,.04)" : "transparent"}"><div style="font-size:9.5px;letter-spacing:.1em;color:${on ? color : "var(--dim)"}">${PLAIN_COND[c].word}</div><div style="font-size:19px;font-weight:700;color:${on ? "var(--txt)" : "var(--dim)"}">${v}%</div><div style="font-size:9.5px;color:var(--dim)">${range}</div></div>`; }).join("");
      return { st, html: `<div style="display:flex;align-items:baseline;gap:6px 14px;flex-wrap:wrap"><div style="font-size:40px;font-weight:700;color:${color}">${f(hh)}</div><div style="font-size:14px;letter-spacing:.14em;color:${color}">${pc.word}</div><div style="font-size:15px;color:var(--txt)"><b>${st.pct}% invested</b> · ${100 - st.pct}% cash</div></div><div style="display:flex;gap:5px;flex-wrap:wrap;margin:8px 0">${rungs}</div>` }; };
    const a = col(A.heat), b = col(B.heat), rowOf = (k) => V.find((v) => v.key === k);
    const three = FLIP.map((k) => { const v = rowOf(k), wt = S.wts[k] ?? 0; return `<tr><td style="padding:3px 14px 3px 0;color:var(--txt)">${VOTER_SHORT[k]}</td><td style="padding:3px 14px;color:var(--dim)">${v.sub.replace(/ · composite_staged| · treasury_rates \(db\)/, "")}</td><td style="padding:3px 14px">weight ${wt}</td><td style="padding:3px 14px">today ${f(v.val)}</td><td style="padding:3px 14px">turned ${f(-v.val)}</td><td style="padding:3px 0 3px 14px;color:var(--dim)">moves the heat by ${f(-2 * v.val * wt / A.W)}</td></tr>`; }).join("");
    const box = document.createElement("div"); box.id = "r3-decision";
    box.style.cssText = "border:1px solid var(--gold);border-radius:8px;padding:14px 16px;margin:14px 0;background:#0e0e16;min-width:0;overflow:hidden;overflow-wrap:anywhere";
    box.innerHTML = `<div style="font-size:11px;letter-spacing:.2em;color:var(--gold);margin-bottom:10px">THE DECISION PICTURE — drawn on the branch for Alan to decide · NOT ON THE LIVE PAGE</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:18px">
        <div><div style="font-size:11px;letter-spacing:.14em;color:var(--dim);margin-bottom:4px">TODAY, AS THE PAGE COUNTS IT — high rates, weak credit and weak long bonds read "washed out → invest more"</div>${a.html}<div style="font-size:11.5px;line-height:1.65;color:var(--txt)">${splitSentence(A)}</div></div>
        <div><div style="font-size:11px;letter-spacing:.14em;color:var(--dim);margin-bottom:4px">THE SAME READINGS, WITH RATES, CREDIT AND LONG BONDS COUNTED AS REASONS TO HOLD BACK (sign turned)</div>${b.html}<div style="font-size:11.5px;line-height:1.65;color:var(--txt)">${splitSentence(B)}</div></div>
      </div>
      <div style="overflow-x:auto"><table style="margin-top:10px;font-size:11.5px;border-collapse:collapse;white-space:nowrap">${three}</table></div>
      <div style="font-size:11.5px;color:var(--txt);margin-top:8px">Nothing else changes: the same ${A.n} voters, the same weights (${A.W} in all), the same ladder. The three rows together move the heat from ${f(A.heat)} to ${f(B.heat)}, and the rung from ${a.st.pct}% to ${b.st.pct}% invested.</div>`;
    const hl = document.querySelector(".heatline"); hl.parentNode.insertBefore(box, hl);
    const R = heatPastRead(), T = sectorTally();
    return { heat: A.heat, rung: a.st, split: document.getElementById("heatsplit").textContent, past: document.getElementById("heatpast").textContent,
      flippedHeat: B.heat, flippedRung: b.st, flippedSplit: splitSentence(B), three: FLIP.map((k) => ({ key: k, val: rowOf(k).val, weight: S.wts[k], sub: rowOf(k).sub })), weight: A.W, voters: A.n,
      hot: { avg: A.hot.avg, w: A.hot.w }, cold: { avg: A.cold.avg, w: A.cold.w }, flippedHot: { avg: B.hot.avg, w: B.hot.w }, flippedCold: { avg: B.cold.avg, w: B.cold.w },
      replay: { keys: R.replay.keys, today: R.replay.today, place: R.replay.place, series: R.replay.series }, year: { keys: R.year.keys, today: R.year.today, place: R.year.place, n: R.year.series.length }, carried: R.carried, noPast: R.noPast,
      sectors: { n: T.n, leading: T.leading.map((r) => r.key), lagging: T.lagging.map((r) => r.key), turning: T.turning.map((r) => r.key), pulling: T.pulling.map((r) => r.key), beside: T.beside.map((r) => r.key) },
      putcall: PUTCALL, notVoting: voters().map((v) => [v, notVoting(v)]).filter((x) => x[1]).map(([v, nv]) => ({ name: v.name, why: nv.why, asof: nv.asof, days: nv.days == null ? null : Math.round(nv.days) })),
      rows: voters().filter(canVote).filter((v) => (S.wts[v.key] ?? 0) > 0).map((v) => ({ key: v.key, val: +v.val.toFixed(4), w: S.wts[v.key] })), brief: document.getElementById("brief").innerText.split("\n")[0], errors: [] };
  }, FLIP);
  readout[w].errors = P.errors; readout[w].nonGet = P.nonGet;
  await top("#r3-decision", w < 600 ? 190 : 70); await page.waitForTimeout(350); await shot("r3-06-DECISION-PICTURE");
  await page.evaluate(() => { for (const el of document.querySelectorAll("body *")) { const p = getComputedStyle(el).position; if (p === "sticky" || p === "fixed") el.style.position = "static"; } });   // the page's own bar must not cover the panel in its close-up
  await page.locator("#r3-decision").screenshot({ path: path.join(OUT, `r3-06-DECISION-PICTURE-panel-${w}.png`) });
  await P.close();
}
fs.writeFileSync(path.join(OUT, "readout.json"), JSON.stringify(readout, null, 1));
console.log("pictures in", OUT, fs.readdirSync(OUT).length, "files");
