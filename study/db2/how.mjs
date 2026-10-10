/* DB2 (9 Oct 2026) — HOW IT GETS TO THE NUMBER, AS A PICTURE (the first screen's fourth card).
   Alan, 9 Oct, 12:20: "This dashboard tool — how it gets to 75.9 — I don't know, man. Can we do something a little bit more visual on
   this kind of thing?" DB1's card was four lines of text. The words stay — every caption here is one of those lines, to the letter — and
   each now sits beside the bar it describes.

   THE PICTURE, TOP TO BOTTOM
     the account, 0–100%   a solid block for the part that is always in, then the swing as a track, filled to the number; a bright mark
                           and the number at the fill's end; a faint tick at 100.
     the wedge             opens from the swing down to the scale under it: the swing, end to end, IS the market reading, 0 to 100.
     the market reading    one row per step on that one scale, left to right: a typical day · one bar per counted part, starting where
                           the row above ended (the up colour adds, the down colour takes away; a part that adds nothing is a bar of
                           no width and is still drawn) · the raise-cash state as a bracket while it is on · the market reading it
                           comes to. The dark bar under each step is the level so far.
   WHAT IT READS   nothing of its own. howSteps() takes the reading the dashboard already holds (view().reading now; at a what-if chip
                   that move's own reading, which study/ds1/live.mjs hands over as move.r) and the lines summaryLines() made from it: a
                   caption and its bar come from the same line, so the two cannot disagree. No fetch, no library, the tool's colours.
   THE SUM         a typical day + every bar = the level before cash; kept inside 0–100; halved while cash is raised = the market
                   reading. howSteps() does that sum itself and keeps the gap to the engine's own reading under .off. If a part ever
                   counts that no line names, the gap is drawn as a row of its own ("other parts") instead of being left out.
   ROUNDING        every bar is drawn at its exact value. A caption says a whole number, each rounded on its own, so three captions
                   can read one more or one less than the total beside them; hovering a row shows that row's sum to one decimal. */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), fin = (x) => x != null && isFinite(x);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/* a whole number and one decimal, with the tool's own minus sign and never a "−0" */
const num = (x, d = 0) => { if (!fin(x)) return "—"; const s = Math.abs(x).toFixed(d); return (x < 0 && +s !== 0 ? "−" : "") + s; };
const sg = (x, d = 0) => { if (!fin(x)) return "—"; const s = Math.abs(x).toFixed(d); return (+s === 0 ? "" : x > 0 ? "+" : "−") + s; };

/* the captions' column, % of the picture's width, when the captions sit beside the bars (the wedge needs to know where the scale starts) */
export const CAPTIONS = 50;

/* ---------- the steps, pure ----------
   r = one reading (what readWith returned: reading, readingExact, base, v2 = what version 2 did to it) · A = the dials ·
   number = % of the account at that reading (the dashboard's own numberOf) · typical = the model's typical day, unrounded ·
   lines = summaryLines() for that reading: [{ key, text, points }].
   Returns { number, reading, always, zoneEnd, steps } — steps is null when the typical day is not known (then only the account bar
   is drawn). A step is { key, kind: start | part | stop | cash | end, points, from, to, caption }: from and to are the level before and
   after it, as the sum runs (not held to 0–100 — the drawing does that). */
export function howSteps({ r, A, number, typical = null, lines = [] }) {
  if (!r || !fin(r.reading) || !fin(number) || !A) return null;
  const always = clamp(+A.heldPct, 0, 100), zoneEnd = clamp(always + Math.max(0, +A.tacticalPct), always, 100), H = { number, reading: r.reading, always, zoneEnd, steps: null };
  const base = fin(typical) ? typical : fin(r.base) ? r.base : null; if (base == null) return H;
  const line = (k) => lines.find((l) => l.key === k) || null, steps = [{ key: "base", kind: "start", points: base, from: 0, to: base, caption: `a typical day, ${num(base)}` }]; let lv = base;
  const add = (key, kind, points, caption) => { steps.push({ key, kind, points, from: lv, to: lv + points, caption }); lv += points; };
  for (const k of ["rsi", "credit", "vix", "lights"]) { const l = line(k); if (l) add(k, "part", fin(l.points) ? l.points : 0, l.text); }
  /* the engine's own reading: exact where versions 2 and 3 made it, to a tenth where version 1 did (its sum is rounded twice) */
  const exact = fin(r.readingExact) ? r.readingExact : r.reading, tol = fin(r.readingExact) ? 1e-6 : 0.11, cash = !!(r.v2 && r.v2.cash), cut = cash ? (fin(r.v2.cashCut) && r.v2.cashCut > 0 ? r.v2.cashCut : 0.5) : 1;
  /* a part that counts and that no line names: what the engine's reading says is still to come before the cash step */
  { const want = exact / cut, got = clamp(lv, 0, 100); if (Math.abs(want - got) > tol / cut) add("other", "part", want - lv, `other parts, ${sg(want - lv)}`); }
  const raw = lv, level = clamp(raw, 0, 100);
  if (raw > 100 + 1e-9 || raw < -1e-9) steps.push({ key: "stop", kind: "stop", points: level - raw, from: raw, to: level, caption: `the parts add to ${num(raw)}: the market reading stops at ${num(level)}` });
  let end = level; if (cash) { const l = line("cash"); end = level * cut; steps.push({ key: "cash", kind: "cash", points: end - level, from: level, to: end, caption: l ? l.text : `cash is raised: the swing is cut (${num(level)} → ${num(end)})` }); }
  steps.push({ key: "end", kind: "end", points: end, from: 0, to: end, caption: `the market reading, ${num(r.reading)} of 100` });
  return { ...H, base, raw, level, cut, steps, sumsTo: end, off: exact - end }; }

/* one row's own sum to one decimal — what hovering it shows */
const tipOf = (s, H) => (s.kind === "start" ? `a typical day: ${num(s.to, 1)}` : s.kind === "end" ? `the market reading: ${num(s.to, 1)} of 100` : s.kind === "cash" ? `${num(s.from, 1)} × ${H.cut} = ${num(s.to, 1)}` : s.kind === "stop" ? `${num(s.from, 1)} is past the end of the scale: ${num(s.to, 1)}` : `${num(s.from, 1)} ${s.points < 0 ? "−" : "+"} ${num(Math.abs(s.points), 1)} = ${num(s.to, 1)}`);

/* ---------- the picture as HTML (pure). narrow = the captions go above their bars (a phone) ----------
   Every class here starts with hw-: the dashboard's own sheet has rules for plain names (its .under is the line under the big number),
   and a bar that shared one was drawn 2px tall. */
export function howHtml(H, { narrow = false } = {}) {
  if (!H) return ""; const P = (x) => +clamp(x, 0, 100).toFixed(3), pc = (x) => x.toFixed(1) + "%", n = P(H.number), zone = H.zoneEnd - H.always, fill = zone > 0 ? +clamp(((H.number - H.always) / zone) * 100, 0, 100).toFixed(3) : 0;
  const side = n > 93 ? " hw-r" : n < 7 ? " hw-l" : "", x0 = narrow ? 0 : CAPTIONS, tk = (v) => num(v, v % 1 ? 1 : 0) + "%";
  const acct = `<div class="hw-acct" data-acct data-always="${H.always}" data-zone-end="${H.zoneEnd}" data-number="${H.number.toFixed(2)}" title="${esc(`${tk(H.always)} always in, and ${pc(H.number - H.always)} of the ${tk(zone)} that swings = ${pc(H.number)}`)}"><b class="hw-mk${side}" style="left:${n}%">${pc(H.number)}</b><i class="hw-pin" data-pin style="left:${n}%"></i><div class="hw-rail" data-rail><span class="hw-in" style="width:${H.always}%">${H.always >= 25 ? "always in" : ""}</span><span class="hw-sw" style="left:${H.always}%;width:${zone}%"><i data-fill style="width:${fill}%"></i></span>${H.always > 0 && zone > 0 ? `<i class="hw-gap" style="left:${H.always}%"></i>` : ""}<i class="hw-tk" style="left:100%"></i></div></div>`;
  /* the wedge: from the swing's two ends on the account bar down to the two ends of the market reading's scale; the account bar's own marks ride on it */
  const fan = `<div class="hw-fan"><svg viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true"><polygon points="${H.always},0 ${H.zoneEnd},0 100,16 ${x0},16"/><path d="M${H.always} 0L${x0} 16M${H.zoneEnd} 0L100 16"/></svg><span style="left:0">0%</span>${H.always >= 8 && zone >= 12 ? `<span style="left:calc(${H.always}% + 5px)">${tk(H.always)}</span>` : ""}${H.zoneEnd <= 90 ? `<span style="right:calc(${100 - H.zoneEnd}% + 5px)">${tk(H.zoneEnd)}</span>` : ""}<span style="right:${H.zoneEnd > 90 ? 5 : 0}px">100%</span></div>`;
  const head = `<div class="hw${narrow ? " hw-stack" : ""}" data-how data-layout="${narrow ? "stacked" : "beside"}" data-number="${H.number.toFixed(2)}" data-reading="${H.reading}"`;
  if (!H.steps) return `${head} role="img" aria-label="${esc(`the account: ${tk(H.always)} always in, the swing filled to ${pc(H.number)}`)}">${acct}${fan}</div>`;
  const ghost = (x) => (x > 0.6 ? `<i class="hw-g" style="width:calc(${x}% - 2px)"></i>` : "");
  const lane = (s) => { const a = P(Math.min(s.from, s.to)), b = P(Math.max(s.from, s.to)), w = +(b - a).toFixed(3), after = P(s.to), tone = s.points > 0.05 ? " hw-up" : s.points < -0.05 ? " hw-dn" : ""; let m;
    if ((s.kind === "start" || s.kind === "end") && after >= 0.05) m = `<i class="hw-b hw-${s.kind}" data-bar style="left:0;width:${after}%"></i>`;
    else if (s.kind === "start" || s.kind === "end") m = `<i class="hw-z" data-bar style="left:0%"></i>`;   // a market reading of 0 is still drawn, as a bar of no width
    /* the bracket: the level before cash end to end, its mark where the cut lands; what is freed is drawn in outline */
    else if (s.kind === "cash" && w >= 0.05) m = `${ghost(a)}<i class="hw-o" data-bar style="left:${a}%;width:${w}%"></i><i class="hw-k" style="left:0;width:${b}%"></i><i class="hw-km" style="left:${a}%"></i>`;
    else if (s.kind === "stop" || s.kind === "cash") m = `${ghost(after)}<i class="hw-z" data-bar style="left:${after}%"></i>`;
    /* a bar of no width is still drawn: a part that adds nothing (the VIX under 20), or one that lies wholly past the end of the scale */
    else if (w < 0.05) m = `${ghost(a)}<i class="hw-z${tone}" data-bar style="left:${a}%"></i>`;
    else m = `${ghost(a)}<i class="hw-b${tone}${Math.max(s.from, s.to) > 100 + 1e-9 ? " hw-past" : ""}${Math.min(s.from, s.to) < -1e-9 ? " hw-low" : ""}" data-bar style="left:${a}%;width:${w}%"></i>`;
    const tip = esc(tipOf(s, H)); return `<div class="hw-cap" data-line="${s.key}" title="${tip}">${esc(s.caption)}</div><div class="hw-plot hw-lane${s.kind === "cash" && w >= 0.05 ? " hw-cash" : ""}" data-step="${s.key}" data-kind="${s.kind}" data-from="${s.from.toFixed(4)}" data-to="${s.to.toFixed(4)}" data-points="${s.points.toFixed(4)}" title="${tip}">${m}</div>`; };
  const label = `the account: ${tk(H.always)} always in, the swing filled to ${pc(H.number)}. The market reading: ${H.steps.map((s) => s.caption).join("; ")}`;
  return `${head} data-base="${H.base.toFixed(4)}" data-sum="${H.sumsTo.toFixed(4)}" data-off="${H.off.toFixed(6)}" role="img" aria-label="${esc(label)}">${acct}${fan}${H.steps.map(lane).join("")}<div class="hw-plot hw-ax" aria-hidden="true"><span>0 · stretched</span><span class="hw-mid">50</span><span>washed out · 100</span></div></div>`; }

/* ---------- its look: the dashboard's own colours (study/db1/dashboard.mjs sets them on .db1) ---------- */
export const HOW_CSS = `
.db1 .hw{--trk:#22222e;--lane:#16161f;--ghost:#34344a;margin-top:8px;display:grid;grid-template-columns:${CAPTIONS}% minmax(0,1fr);row-gap:2px;align-items:center;font-size:13px;line-height:1.3}
.db1 .hw.hw-stack{grid-template-columns:minmax(0,1fr)}
.db1 .hw-acct,.db1 .hw-fan{grid-column:1/-1;position:relative;min-width:0}
.db1 .hw-acct{padding-top:18px}
.db1 .hw-mk{position:absolute;top:0;transform:translateX(-50%);font-size:13px;font-weight:700;line-height:16px;white-space:nowrap;color:var(--txt,#e8e8f0);text-shadow:0 0 12px rgba(232,232,240,.4)}.db1 .hw-mk.hw-r{transform:translateX(-100%)}.db1 .hw-mk.hw-l{transform:none}
.db1 .hw-pin{position:absolute;top:15px;height:20px;width:2px;margin-left:-1px;border-radius:1px;background:var(--txt,#e8e8f0);box-shadow:0 0 8px rgba(232,232,240,.85)}
.db1 .hw-rail{position:relative;height:14px}
.db1 .hw-in{position:absolute;left:0;top:0;bottom:0;box-sizing:border-box;background:var(--dimc);border-radius:3px 0 0 3px;color:var(--a9-ink,#0a0a0f);font-size:11px;font-weight:700;letter-spacing:.1em;line-height:14px;padding-left:8px;white-space:nowrap;overflow:hidden}
.db1 .hw-sw{position:absolute;top:0;bottom:0;background:var(--trk);border-radius:0 3px 3px 0;overflow:hidden}
.db1 .hw-sw i{position:absolute;left:0;top:0;bottom:0;background:var(--txt,#e8e8f0)}
.db1 .hw-gap{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--panel,#101018)}
.db1 .hw-tk{position:absolute;top:-3px;bottom:-3px;width:1px;margin-left:-1px;background:#3a3a4a}
.db1 .hw-fan{height:16px;margin-bottom:2px;font-size:11px;line-height:14px;color:var(--dimc)}
.db1 .hw-fan svg{position:absolute;left:0;top:0;width:100%;height:100%;display:block}.db1 .hw-fan polygon{fill:rgba(138,138,160,.1)}.db1 .hw-fan path{fill:none;stroke:#2a2a3a;stroke-width:1;vector-effect:non-scaling-stroke}
.db1 .hw-fan span{position:absolute;top:1px;white-space:nowrap}
.db1 .hw-cap{grid-column:1;min-width:0;padding-right:14px;color:var(--txt,#e8e8f0)}
.db1 .hw-stack .hw-cap{padding-right:0;margin-top:5px}
.db1 .hw-plot{grid-column:2;position:relative;min-width:0}.db1 .hw-stack .hw-plot{grid-column:1}
.db1 .hw-lane{height:10px;background:var(--lane);border-radius:2px}.db1 .hw-lane.hw-cash{margin-bottom:7px}
.db1 .hw-lane i{position:absolute;top:0;bottom:0;box-sizing:border-box}
.db1 .hw-lane .hw-g{left:0;background:var(--ghost);border-radius:2px}
.db1 .hw-lane .hw-b{border-radius:2px;min-width:2px}.db1 .hw-lane .hw-start{background:var(--dimc)}.db1 .hw-lane .hw-end{background:var(--txt,#e8e8f0);box-shadow:0 0 10px rgba(232,232,240,.35)}
.db1 .hw-lane .hw-b.hw-up{background:var(--green,#38e07b);box-shadow:0 0 8px rgba(56,224,123,.45)}.db1 .hw-lane .hw-b.hw-dn{background:var(--red,#ff5470);box-shadow:0 0 8px rgba(255,84,112,.45)}
.db1 .hw-lane .hw-b.hw-past{clip-path:polygon(0 0,calc(100% - 5px) 0,100% 50%,calc(100% - 5px) 100%,0 100%)}.db1 .hw-lane .hw-b.hw-low{clip-path:polygon(5px 0,100% 0,100% 100%,5px 100%,0 50%)}
.db1 .hw-lane .hw-z{top:-3px;bottom:-3px;width:2px;margin-left:-1px;border-radius:1px;background:var(--txt,#e8e8f0)}.db1 .hw-lane .hw-z.hw-up{background:var(--green,#38e07b)}.db1 .hw-lane .hw-z.hw-dn{background:var(--red,#ff5470)}
.db1 .hw-lane .hw-o{border:1px solid var(--dimc);border-radius:2px}
.db1 .hw-lane .hw-k{top:calc(100% + 2px);bottom:auto;height:5px;border:1px solid var(--dimc);border-top:0}.db1 .hw-lane .hw-km{top:calc(100% + 2px);bottom:auto;height:5px;width:1px;background:var(--dimc)}
.db1 .hw-ax{height:15px;display:flex;justify-content:space-between;font-size:11px;line-height:15px;color:var(--dimc)}.db1 .hw-ax .hw-mid{position:absolute;left:50%;transform:translateX(-50%)}`;
