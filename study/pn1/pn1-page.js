/* PN1 (7 Oct 2026) — the drawings on study/pn1/PN1.html: what the TradingView pane will draw, made from the script's own arithmetic
   (window.PN1, written by scripts/pn1-build-page.mjs). No network, no storage. Each figure is two charts on one calendar — SPY's daily
   close on top, the pane under it — each with its own scale; they are never laid over each other.
   The pane is drawn the way the script draws it (its colours, its level lines, its labels on the last bar); everything around it —
   titles, axes, the hover read-out — is the page's own and wears the page's ink. Hover or use the arrow keys to read any day. */
(function () {
  "use strict";
  var D = window.PN1; if (!D) return;
  var C = D.colours, NS = "http://www.w3.org/2000/svg", MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var INK = "#e8e8f0", DIM = "#9a9ab0", GRID = "#16161f", SURFACE = "#101018", MARK = "#ffd166";
  function el(name, attrs, parent) { var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function text(parent, x, y, str, attrs) { var t = el("text", Object.assign({ x: x, y: y, "font-size": 11, fill: DIM }, attrs || {}), parent); t.textContent = str; return t; }
  function dayWords(iso) { return +iso.slice(8, 10) + " " + MON[+iso.slice(5, 7) - 1] + " " + iso.slice(0, 4); }
  function fix(v, n) { return v == null ? "—" : v.toFixed(n); }

  /* one figure. S = { dates, spy, reading, invested, colour, partA, partB, colA, colB, ptsRsi, ptsCredit } (arrays of one length);
     o = { showReading, showParts, labels: [{ y, text, colour }], marks: [{ i, kind }], ratio: true for a price scale in equal steps of % } */
  function figure(host, S, o) {
    var n = S.dates.length, last = n - 1, state = { i: null };
    host.setAttribute("tabindex", "0"); host.setAttribute("role", "group");
    var tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true;
    function draw() {
      var W = Math.max(300, Math.floor(host.clientWidth)), narrow = W < 700;
      /* the labels on the last bar sit to the right of it, as on TradingView; a phone has no room there, so the caption carries their words */
      var room = narrow || !o.labels.length ? 14 : 248, L = 6, R = 40, h1 = narrow ? 120 : 190, gap = 30, h2 = narrow ? 150 : 190, foot = 24, H = h1 + gap + h2 + foot;
      var x0 = L, x1 = W - R - room, x = function (i) { return x0 + ((x1 - x0) * i) / Math.max(1, last); };
      var lo = Infinity, hi = -Infinity; for (var i = 0; i < n; i++) { if (S.spy[i] < lo) lo = S.spy[i]; if (S.spy[i] > hi) hi = S.spy[i]; }
      var f = o.ratio ? Math.log : function (v) { return v; }, y1 = function (v) { return 16 + (h1 - 22) * (1 - (f(v) - f(lo)) / (f(hi) - f(lo))); };
      var pLo = o.showParts ? -10 : -6, pHi = 108, top2 = h1 + gap, y2 = function (v) { return top2 + 4 + (h2 - 8) * (1 - (v - pLo) / (pHi - pLo)); };
      host.textContent = ""; var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": host.getAttribute("data-label") || "" }, host);

      /* the calendar: a hairline at each new year (or month, on a short stretch), named at the foot */
      var byYear = n > 700, lastTick = -1e9;
      for (i = 1; i < n; i++) { var a = S.dates[i], b = S.dates[i - 1], turn = byYear ? a.slice(0, 4) !== b.slice(0, 4) : a.slice(0, 7) !== b.slice(0, 7); if (!turn) continue;
        el("line", { x1: x(i).toFixed(1), x2: x(i).toFixed(1), y1: 8, y2: top2 + h2, stroke: GRID, "stroke-width": 1 }, svg);
        if (x(i) - lastTick > (byYear ? 44 : 40) && x(i) < x1 - 16) { text(svg, x(i).toFixed(1), H - 7, byYear ? a.slice(0, 4) : (a.slice(5, 7) === "01" ? a.slice(0, 4) : MON[+a.slice(5, 7) - 1])); lastTick = x(i); } }

      /* the pane's own furniture, as the script draws it: solid edges at 0 and 100, a dotted middle at 50 */
      [[0, null], [50, "2 4"], [100, null]].forEach(function (lv) { var ln = el("line", { x1: x0, x2: x1 + room - 6, y1: y2(lv[0]).toFixed(1), y2: y2(lv[0]).toFixed(1), stroke: C.edge, "stroke-width": 1 }, svg); if (lv[1]) ln.setAttribute("stroke-dasharray", lv[1]); text(svg, W - R + 6, (y2(lv[0]) + 4).toFixed(1), String(lv[0])); });
      text(svg, x0, 11, "SPY, daily close" + (o.ratio && !narrow ? " (equal steps are equal % moves)" : ""));
      text(svg, x0, top2 - 8, narrow ? "the pane: % invested, 0 to 100" : "the pane: % of the account invested, on a scale of 0 to 100");
      text(svg, W - R + 6, (y1(S.spy[last]) + 4).toFixed(1), S.spy[last].toFixed(0), { fill: INK });

      /* a line whose colour changes from bar to bar: every stretch between two bars takes the colour of the bar it lands on, as TradingView paints it */
      /* painted in the order of the days, one run of a colour at a time, so neither colour is laid over the other where the bars are dense */
      function twoTone(vals, cols, y, width, opacity) { var run = "", runCol = null, flush = function () { if (run) el("path", { d: run, fill: "none", stroke: runCol, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: opacity }, svg); run = ""; };
        for (var k = 1; k < n; k++) { if (vals[k] == null || vals[k - 1] == null) { flush(); runCol = null; continue; } var c = cols[k]; if (c !== runCol) { flush(); runCol = c; run = "M" + x(k - 1).toFixed(1) + " " + y(vals[k - 1]).toFixed(1); } run += "L" + x(k).toFixed(1) + " " + y(vals[k]).toFixed(1); } flush(); }
      var spyCols = S.spy.map(function (v, k) { return k && v < S.spy[k - 1] ? C.bear : C.bull; });
      twoTone(S.spy, spyCols, y1, 1.4, 0.75);

      /* the held floor, the band of tactical money at work above it, and the % invested line */
      var held = D.held, band = "M" + x(0).toFixed(1) + " " + y2(held).toFixed(1); for (i = 0; i < n; i++) band += "L" + x(i).toFixed(1) + " " + y2(S.invested[i]).toFixed(1); band += "L" + x(last).toFixed(1) + " " + y2(held).toFixed(1) + "Z";
      el("path", { d: band, fill: C.line, opacity: 0.15 }, svg);
      el("line", { x1: x0, x2: x(last).toFixed(1), y1: y2(held).toFixed(1), y2: y2(held).toFixed(1), stroke: C.deep, "stroke-width": 1, opacity: 0.65 }, svg);
      text(svg, W - R + 6, (y2(held) + 4).toFixed(1), String(held));
      if (o.showReading) { var pr = ""; for (i = 0; i < n; i++) pr += (i ? "L" : "M") + x(i).toFixed(1) + " " + y2(S.reading[i]).toFixed(1); el("path", { d: pr, fill: "none", stroke: C.line, "stroke-width": 1.25, "stroke-linejoin": "round" }, svg); }
      if (o.showParts) { twoTone(S.partA, S.colA, y2, 1.25, 1); for (i = 0; i < n; i++) el("circle", { cx: x(i).toFixed(1), cy: y2(S.partB[i]).toFixed(1), r: 1.3, fill: S.colB[i] }, svg); }
      twoTone(S.invested, S.colour, y2, 2, 1);

      /* the study's lows and highs: a mark on the line, ringed in the surface colour so it stays readable where it crosses */
      (o.marks || []).forEach(function (m) { var cx = x(m.i), cy = y2(S.invested[m.i]), s = 5.5, up = m.kind === "low";
        el("path", { d: "M" + (cx - s) + " " + (cy + (up ? s : -s)) + "L" + (cx + s) + " " + (cy + (up ? s : -s)) + "L" + cx + " " + (cy + (up ? -s : s)) + "Z", fill: MARK, stroke: SURFACE, "stroke-width": 2, "stroke-linejoin": "round" }, svg); });

      /* the labels on the last bar, where the script puts them: two bars to the right, each at its own level */
      if (!narrow) o.labels.forEach(function (lb) { var lx = x(last) + 12, ly = y2(lb.y), g = el("g", {}, svg), t = text(g, lx + 9, ly + 4, lb.text, { fill: lb.colour, "font-size": 12 }), w = t.getComputedTextLength() + 18;
        var chip = el("path", { d: "M" + lx + " " + ly + "l6 -10h" + (w - 6) + "v20h" + (6 - w) + "Z", fill: C.panel, stroke: C.edge, "stroke-width": 1 }); g.insertBefore(chip, t); });

      /* the hover layer: one hairline through both charts, a dot on each line, one read-out for the day */
      var hair = el("line", { y1: 8, y2: top2 + h2, stroke: DIM, "stroke-width": 1, visibility: "hidden" }, svg);
      var dotA = el("circle", { r: 4, fill: INK, stroke: SURFACE, "stroke-width": 2, visibility: "hidden" }, svg), dotB = el("circle", { r: 4, fill: INK, stroke: SURFACE, "stroke-width": 2, visibility: "hidden" }, svg);
      host.appendChild(tip);
      function show(k) { state.i = k; if (k == null) { hair.setAttribute("visibility", "hidden"); dotA.setAttribute("visibility", "hidden"); dotB.setAttribute("visibility", "hidden"); tip.hidden = true; return; }
        var px = x(k); hair.setAttribute("x1", px); hair.setAttribute("x2", px); hair.setAttribute("visibility", "visible");
        dotA.setAttribute("cx", px); dotA.setAttribute("cy", y1(S.spy[k])); dotA.setAttribute("visibility", "visible"); dotB.setAttribute("cx", px); dotB.setAttribute("cy", y2(S.invested[k])); dotB.setAttribute("fill", S.colour[k]); dotB.setAttribute("visibility", "visible");
        tip.textContent = ""; var h = document.createElement("div"); h.className = "tip-day"; h.textContent = dayWords(S.dates[k]) + (D.lastIsLive && S.dates[k] === D.series.dates[N - 1] ? " · " + D.lastIsLive : ""); tip.appendChild(h);
        var rows = [[S.colour[k], fix(S.invested[k], 1) + "%", "invested"], [o.showReading ? C.line : null, fix(S.reading[k], 1), "market reading"]];
        if (o.showParts) { rows.push([S.colA[k], (S.ptsRsi[k] > 0 ? "+" : S.ptsRsi[k] < 0 ? "−" : "") + Math.abs(S.ptsRsi[k]).toFixed(1), "points from SPY and QQQ"]); rows.push([S.colB[k], (S.ptsCredit[k] > 0 ? "+" : S.ptsCredit[k] < 0 ? "−" : "") + Math.abs(S.ptsCredit[k]).toFixed(1), "points from credit"]); }
        rows.push([spyCols[k], S.spy[k].toFixed(2), "SPY close"]);
        rows.forEach(function (r) { var row = document.createElement("div"); row.className = "tip-row"; var key = document.createElement("span"); key.className = "tip-key"; if (r[0]) key.style.background = r[0]; else key.style.visibility = "hidden"; var v = document.createElement("b"); v.textContent = r[1]; var l = document.createElement("span"); l.className = "tip-lab"; l.textContent = r[2]; row.appendChild(key); row.appendChild(v); row.appendChild(l); tip.appendChild(row); });
        tip.hidden = false; var tw = tip.offsetWidth, left = px + 14; if (left + tw > W - 4) left = px - tw - 14; tip.style.left = Math.max(2, left) + "px"; tip.style.top = (narrow ? 4 : 22) + "px"; }
      function nearest(evt) { var r = svg.getBoundingClientRect(), px = ((evt.clientX - r.left) * W) / r.width; return Math.max(0, Math.min(last, Math.round(((px - x0) / (x1 - x0)) * last))); }
      svg.addEventListener("pointermove", function (e) { show(nearest(e)); }); svg.addEventListener("pointerdown", function (e) { show(nearest(e)); }); svg.addEventListener("pointerleave", function () { if (document.activeElement !== host) show(null); });
      if (state.i != null) show(Math.min(state.i, last));
      host._show = show; }
    host.addEventListener("keydown", function (e) { var k = state.i == null ? last : state.i, step = e.shiftKey ? 20 : 1;
      if (e.key === "ArrowLeft") k = Math.max(0, k - step); else if (e.key === "ArrowRight") k = Math.min(last, k + step); else if (e.key === "Home") k = 0; else if (e.key === "End") k = last; else if (e.key === "Escape") { host._show(null); return; } else return;
      e.preventDefault(); host._show(k); });
    host.addEventListener("focus", function () { if (state.i == null) host._show(last); }); host.addEventListener("blur", function () { host._show(null); });
    draw(); var timer = null, seen = host.clientWidth; window.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(function () { if (host.clientWidth !== seen) { seen = host.clientWidth; draw(); } }, 120); }); }

  /* the data is kept small: one letter a bar for the line's colour; a part is drawn at 50 plus its points, green at or above zero */
  var LETTER = { g: C.bull, r: C.bear, t: C.line }, sign = function (v) { return v >= 0 ? C.bull : C.bear; };
  function slice(from, to) { var S = {}; ["dates", "spy", "reading", "invested", "ptsRsi", "ptsCredit"].forEach(function (k) { S[k] = D.series[k].slice(from, to); });
    S.colour = D.series.colour.slice(from, to).split("").map(function (c) { return LETTER[c]; }); S.partA = S.ptsRsi.map(function (v) { return 50 + v; }); S.partB = S.ptsCredit.map(function (v) { return 50 + v; }); S.colA = S.ptsRsi.map(sign); S.colB = S.ptsCredit.map(sign); return S; }
  var N = D.series.dates.length;
  (D.figures || []).forEach(function (fg) { var host = document.getElementById(fg.id); if (!host) return;
    /* a stretch is either the last so-many sessions or the days between two dates */
    var from = fg.from ? D.series.dates.findIndex(function (d) { return d >= fg.from; }) : Math.max(0, N - fg.sessions), to = N; if (fg.to) { to = D.series.dates.findIndex(function (d) { return d > fg.to; }); if (to < 0) to = N; } var S = slice(from, to);
    figure(host, S, { showReading: !!fg.showReading, showParts: !!fg.showParts, labels: fg.labels || [], ratio: !!fg.ratio, marks: (fg.marks || []).map(function (m) { return { i: D.series.dates.indexOf(m.date) - from, kind: m.kind }; }).filter(function (m) { return m.i >= 0 && m.i < to - from; }) }); });
  window.PN1_PAGE_READY = true;
})();
