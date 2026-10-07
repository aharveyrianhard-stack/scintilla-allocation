/* HC1 (6 Oct 2026) — the TARGET MIX legend never prints one text on another. Alan, on the live tool: "CONS. DISCRETIONARnone
   picked". The page's own drawDonutOn runs here on a recording canvas whose text is as wide as a monospace font's (0.6 of the
   font size per character), so the test fails the way the page did: the label measured in the note's smaller font. */
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
const page = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const fn = (name) => { const i = page.indexOf("\nfunction " + name + "("); assert.ok(i >= 0, name); return page.slice(i, page.indexOf("\n}\n", i) + 3); };
const WORD = { TECH: "Technology", HEALTH: "Health care", FINANCIALS: "Financials", DISCRET: "Consumer discretionary", INDUSTRIAL: "Industrials", MATERIALS: "Materials",
  ENERGY: "Energy", STAPLES: "Consumer staples", UTILITIES: "Utilities", REAL_ESTATE: "Real estate", COMMS: "Communications", CRYPTO: "Crypto", METALS: "Metals" };
function draw(shares, picked = {}, inv = 0.5) {
  const seen = []; let font = "10px monospace", align = "left";
  const px = () => +/(\d+(?:\.\d+)?)px/.exec(font)[1];
  const ctx = new Proxy({ measureText: (t) => ({ width: String(t).length * px() * 0.6 }),
    fillText: (t, x, y) => { const w = String(t).length * px() * 0.6; seen.push({ t: String(t), y, px: px(), left: align === "right" ? x - w : x, right: align === "right" ? x : x + w }); } },
    { get: (o, k) => (k in o ? o[k] : k === "font" ? font : k === "textAlign" ? align : () => {}), set: (o, k, v) => { if (k === "font") font = v; else if (k === "textAlign") align = v; return true; } });
  const cv = { style: {}, getContext: () => ctx };
  new Function("document", "window", "pickMix", "SLEEVE_COLOR", "groupColor", "groupWord", "shade", fn("drawDonutOn") + "\ndrawDonutOn('donut', arguments[7], arguments[8]);")(
    { getElementById: () => cv }, { devicePixelRatio: 1 },
    () => ({ sleeves: Object.fromEntries(Object.keys(shares).map((k) => [k, { names: picked[k] || [] }])) }), {}, () => "#445566", (k) => WORD[k] || k, (c) => c, shares, inv);
  const rows = {}; for (const s of seen) if (s.left >= 360 && s.y > 30) (rows[s.y] = rows[s.y] || []).push(s);
  return Object.values(rows).map((r) => r.sort((a, b) => a.left - b.left));
}
const ALL = Object.fromEntries(Object.keys(WORD).map((k, i) => [k, (i + 1) / 91]));

test("no legend text starts before the one on its left ends — every sector, nothing picked (the state Alan saw)", () => {
  const rows = draw(ALL);
  assert.equal(rows.length, 14, "thirteen sleeves and CASH");
  for (const r of rows) for (let i = 1; i < r.length; i++)
    assert.ok(r[i].left >= r[i - 1].right, `"${r[i - 1].t}" (ends ${r[i - 1].right.toFixed(1)}) runs into "${r[i].t}" (starts ${r[i].left.toFixed(1)})`);
  const disc = rows.find((r) => /DISCRETION/.test(r[0].t));
  assert.equal(disc[0].t, "CONS. DISCRETIONARY", "the longest label keeps its last letter");
  assert.deepEqual(disc.map((x) => x.t).slice(1, 2), ["none picked"]);
  assert.ok(disc[1].left - disc[0].right >= 4, "and there is clear room between the label and its note");
});
test("with names picked: '1 name' / 'N names' sit clear of the label and of the percent", () => {
  const rows = draw(ALL, { DISCRET: ["AMZN"], COMMS: ["GOOGL", "META", "NFLX"], STAPLES: ["WMT", "KO"] }, 1);
  const texts = rows.map((r) => r.map((x) => x.t).join(" | "));
  assert.ok(texts.some((t) => /^CONS\. DISCRETIONARY \| 1 name \| /.test(t)), texts.join("\n"));
  assert.ok(texts.some((t) => /^COMMUNICATIONS \| 3 names \| /.test(t)));
  for (const r of rows) for (let i = 1; i < r.length; i++) assert.ok(r[i].left >= r[i - 1].right + 3, r.map((x) => x.t).join(" | "));
});
test("the cause is gone: the label is measured in the font it is drawn in, not the note's", () => {
  const src = fn("drawDonutOn");
  assert.doesNotMatch(src, /ctx\.font='10px monospace';\s*ctx\.fillText\([^;]*ctx\.measureText\(lab\)/, "the old line measured the 12 px label after switching to 10 px");
  assert.match(src, /ctx\.font='12px monospace'; ctx\.fillText\(lab, lx\+24, ly\);\s*const pct=[^;]*labEnd=lx\+24\+ctx\.measureText\(lab\)\.width/);
});
