/* PN1 (7 Oct 2026) — a second witness, made by machine: the script's own text for its arithmetic, turned into JavaScript rule by rule and
   run. pine-replay.mjs is the script written again by hand; a slip in that copying would hide a slip in the script. Here nothing is
   copied by hand: the text of wilderRsi, of pointsAt, of the four requested expressions and of the six lines of the sum is read out of
   the .pine file and rewritten token by token with the fixed rules below. tests/pn1.test.mjs holds the two witnesses to the same
   reading on every day.

   THE RULES (the whole of the translation)
     blocks        four spaces of indentation are one level; a deeper line opens a block, a shallower one closes it
     if / else if / else / while <cond>      →  the same, with brackets and braces
     var <type> x = v                        →  a variable that keeps its value from bar to bar (declared once, outside the per-bar code)
     <type> x = e      x := e      x += e    →  let x = e      x = e      x += e
     a bare name on the last line            →  the value the function gives back
     array.get(a, i) → a[i]    array.size(a) → a.length    math.floor/min/max/abs → Math.…    math.round(x, n) → to n decimals
     int(x) → cut towards zero    na → not-a-number    na(x) → is it not-a-number    not / and / or → ! && ||
     close[n] inside a request               →  that fund's close n of its own bars ago (not-a-number until it has that many)
   ADDED FOR VERSION 2 (DS2, 7 Oct 2026 — none of these words occurs in version 1, so its translation is unchanged):
     array.new<float>() → an empty list    array.push(a, v) → add v at the end    array.shift(a) → drop the first
     array.max(a) → the greatest of the list    array.avg(a) → the list's sum over its length
     bool x = e → let x = e    code at the left margin (the sum) is translated by the same rules as a function's body

   WHAT THIS STILL TAKES ON TRUST, because only TradingView can show it: that arithmetic on a missing value gives a missing value and a
   comparison with one is false (JavaScript's not-a-number behaves that way, which is why it stands in for na here); that a `var` keeps
   its value between bars; and that request.security hands each chart bar the value of the fund's bar of the same day. */

const TYPE = "(?:float|int|bool|string|color|array<float>|array<int>)";
/* array.get(a, i) → a[i], with whatever sits inside the brackets kept whole */
function arrayGets(e) { for (;;) { const at = e.indexOf("array.get("); if (at < 0) return e; let depth = 0, comma = -1, end = -1; for (let k = at + 10; k < e.length; k++) { const c = e[k]; if (c === "(") depth++; else if (c === ")") { if (depth === 0) { end = k; break; } depth--; } else if (c === "," && depth === 0 && comma < 0) comma = k; }
    if (comma < 0 || end < 0) throw new Error("cannot read array.get in: " + e); e = e.slice(0, at) + e.slice(at + 10, comma).trim() + "[" + e.slice(comma + 1, end).trim() + "]" + e.slice(end + 1); } }
export function expr(e) { return arrayGets(e).replace(/array\.new<float>\(\)/g, "[]").replace(/array\.max\((\w+)\)/g, "Math.max(...$1)").replace(/array\.avg\((\w+)\)/g, "avgOf($1)").replace(/array\.size\((\w+)\)/g, "$1.length").replace(/\bmath\.(floor|min|max|abs)\(/g, "Math.$1(").replace(/\bmath\.round\(/g, "pineRound(").replace(/\bint\(/g, "Math.trunc(")
  .replace(/\bnot\s+/g, "!").replace(/\band\b/g, "&&").replace(/\bor\b/g, "||").replace(/\bna\(/g, "isNa(").replace(/\bna\b/g, "NaN").replace(/\bclose\[(\w+)\]/g, "ago($1)"); }
const strip = (ln) => ln.replace(/\s*\/\/.*$/, "");

/* the text of one function of the script: its parameter names and its body lines */
export function functionText(src, name) { const lines = src.split("\n"), at = lines.findIndex((l) => new RegExp("^" + name + "\\((.*)\\)\\s*=>\\s*$").test(l)); if (at < 0) throw new Error("the script has no function " + name);
  const params = lines[at].match(/\((.*)\)\s*=>/)[1].split(",").map((p) => p.trim().split(/\s+/).pop()), body = []; for (let k = at + 1; k < lines.length && (lines[k].startsWith(" ") || lines[k].trim() === ""); k++) if (strip(lines[k]).trim()) body.push(strip(lines[k]));
  return { params, body }; }
/* that function as JavaScript: make() gives one fresh copy with its own `var` state; calling the copy runs one bar */
export function functionJs(src, name) { const { params, body } = functionText(src, name), state = [], out = []; let level = 1;
  body.forEach((raw, n) => { const indent = raw.match(/^ */)[0].length; if (indent % 4) throw new Error(name + ": a line indented by " + indent + " spaces"); const lv = indent / 4, ln = raw.trim(); let m;
    while (level > lv) { out.push("}"); level--; }
    if ((m = ln.match(new RegExp("^var\\s+" + TYPE + "\\s+(\\w+)\\s*=\\s*(.+)$")))) { if (lv !== 1) throw new Error(name + ": a var inside a block"); state.push(`let ${m[1]} = ${expr(m[2])};`); }
    else if ((m = ln.match(/^else if\s+(.+)$/))) { out.push(`else if (${expr(m[1])}) {`); level++; }
    else if (ln === "else") { out.push("else {"); level++; }
    else if ((m = ln.match(/^if\s+(.+)$/))) { out.push(`if (${expr(m[1])}) {`); level++; }
    else if ((m = ln.match(/^while\s+(.+)$/))) { out.push(`while (${expr(m[1])}) {`); level++; }
    else if ((m = ln.match(new RegExp("^" + TYPE + "\\s+(\\w+)\\s*=\\s*(.+)$")))) out.push(`let ${m[1]} = ${expr(m[2])};`);
    else if ((m = ln.match(/^(\w+)\s*:=\s*(.+)$/))) out.push(`${m[1]} = ${expr(m[2])};`);
    else if ((m = ln.match(/^array\.push\((\w+),\s*(.+)\)$/))) out.push(`${m[1]}.push(${expr(m[2])});`);   /* DS2: a rolling window */
    else if ((m = ln.match(/^array\.shift\((\w+)\)$/))) out.push(`${m[1]}.shift();`);
    else if ((m = ln.match(/^(\w+)\s*\+=\s*(.+)$/))) out.push(`${m[1]} += ${expr(m[2])};`);
    else if (/^\w+$/.test(ln) && n === body.length - 1 && lv === 1) out.push(`return ${ln};`);
    else throw new Error(name + ": no rule for the line: " + ln); });
  while (level > 1) { out.push("}"); level--; }
  return { params, source: `${state.join("\n")}\nreturn function (${params.join(", ")}) {\n${out.join("\n")}\n};` }; }

const avgOf = (a) => a.reduce((p, q) => p + q, 0) / a.length;
const isNa = (x) => x == null || Number.isNaN(x), pineRound = (x, n = 0) => (Number.isNaN(x) ? NaN : n ? Math.round(x * 10 ** n) / 10 ** n : x < 0 ? -Math.round(-x) : Math.round(x));
/* the script's constants and tables, read from its text and handed to the translated code under their own names */
export function scope(src) { const S = {}; for (const m of src.matchAll(/^const\s+(?:int|float)\s+(\w+)\s*=\s*(-?[0-9.]+)/gm)) S[m[1]] = +m[2]; for (const m of src.matchAll(/^var array<float> (\w+) = array\.from\(([^)]*)\)/gm)) S[m[1]] = m[2].split(",").map((x) => +x.trim()); return S; }
function compile(js, S, extra = {}) { const names = [...Object.keys(S), ...Object.keys(extra), "isNa", "pineRound", "avgOf"]; return new Function(...names, js)(...Object.values(S), ...Object.values(extra), isNa, pineRound, avgOf); }

/* the whole arithmetic of the script, from its text: funds = { spy, qqq, hyg, ief }, each [{ date, close }] as TradingView would hand it;
   chartDates = the chart's daily bars; inputs = { heldPct, tacticalPct }. Returns [{ date, rsiBoth, creditOwn, ptsRsi, ptsCredit, reading, invested }] */
export function runFromText(src, funds, chartDates, inputs) {
  const S = scope(src), wilder = functionJs(src, "wilderRsi"), points = functionJs(src, "pointsAt"), pointsAt = compile(points.source, S);
  /* the four requests: which fund, and the expression asked of it */
  const req = {}; for (const m of src.matchAll(/^float (\w+)\s*=\s*request\.security\((\w+)T, "D", (.+), lookahead = barmerge\.lookahead_off\)\s*$/gm)) req[m[1]] = { fund: m[2], expression: m[3] };
  if (Object.keys(req).join() !== "spyRsi,qqqRsi,hygMove,iefMove") throw new Error("the script's requests are " + Object.keys(req).join());
  const seen = {}; for (const [name, r] of Object.entries(req)) { const own = funds[r.fund], closes = [], at = new Map(); let step;
    if (/^wilderRsi\(close\)$/.test(r.expression)) { const f = compile(wilder.source, S); step = (close) => f(close); }
    else { const f = new Function(...Object.keys(S), "close", "ago", "return " + expr(r.expression) + ";"); step = (close) => f(...Object.values(S), close, (n) => (closes.length - 1 - n >= 0 ? closes[closes.length - 1 - n] : NaN)); }
    for (const b of own) { closes.push(b.close); at.set(b.date, step(b.close)); }
    /* a chart bar shows the value of the fund's newest bar dated on or before it */
    const dates = own.map((b) => b.date), col = []; let j = -1; for (const d of chartDates) { while (j + 1 < dates.length && dates[j + 1] <= d) j++; col.push(j < 0 ? NaN : at.get(dates[j])); } seen[name] = col; }
  /* the six lines of the sum, in the script's order */
  const sum = []; for (const m of src.matchAll(/^float (rsiBoth|creditOwn|ptsRsi|ptsCredit|reading|invested)\s*=\s*(.+)$/gm)) sum.push([m[1], expr(strip(m[2]))]);
  if (sum.map((s) => s[0]).join() !== "rsiBoth,creditOwn,ptsRsi,ptsCredit,reading,invested") throw new Error("the script's sum lines are " + sum.map((s) => s[0]).join());
  const names = [...Object.keys(S), "spyRsi", "qqqRsi", "hygMove", "iefMove", "heldPct", "tacticalPct", "pointsAt", "isNa", "pineRound"], body = sum.map(([n, e]) => `const ${n} = ${e};`).join("\n") + "\nreturn { rsiBoth, creditOwn, ptsRsi, ptsCredit, reading, invested };", bar = new Function(...names, body);
  return chartDates.map((d, i) => ({ date: d, ...bar(...Object.values(S), seen.spyRsi[i], seen.qqqRsi[i], seen.hygMove[i], seen.iefMove[i], inputs.heldPct, inputs.tacticalPct, pointsAt, isNa, pineRound) })); }

/* ---------- VERSION 2 (DS2): the whole arithmetic of the version 2 script from its own text ----------
   Eight requests instead of four; the sum is a short program with one remembered value (whether cash is raised), so it is translated as
   a body of statements, by the same rules as a function's body, and run once per chart bar in order. inputs = { heldPct, tacticalPct,
   creditRule, cashRule }. Returns [{ date, rsiBoth, creditOwn, ptsRsi, ptsFitted, ptsCredit, cashOn, reading, invested, readingOld, investedOld }] */
export function sumText(src) { const lines = src.split("\n"), a = lines.findIndex((l) => l.startsWith("// ── the sum")), b = lines.findIndex((l, i) => i > a && l.startsWith("// ── the pane")); if (a < 0 || b < 0) throw new Error("the script has no sum block"); return lines.slice(a + 1, b).map(strip).filter((l) => l.trim()); }
export function bodyJs(body, name) { const state = [], out = []; let level = 0;
  body.forEach((raw) => { const indent = raw.match(/^ */)[0].length; if (indent % 4) throw new Error(name + ": a line indented by " + indent + " spaces"); const lv = indent / 4, ln = raw.trim(); let m;
    while (level > lv) { out.push("}"); level--; }
    if ((m = ln.match(new RegExp("^var\\s+" + TYPE + "\\s+(\\w+)\\s*=\\s*(.+)$")))) { if (lv !== 0) throw new Error(name + ": a var inside a block"); state.push(`let ${m[1]} = ${expr(m[2])};`); }
    else if ((m = ln.match(/^else if\s+(.+)$/))) { out.push(`else if (${expr(m[1])}) {`); level++; }
    else if (ln === "else") { out.push("else {"); level++; }
    else if ((m = ln.match(/^if\s+(.+)$/))) { out.push(`if (${expr(m[1])}) {`); level++; }
    else if ((m = ln.match(new RegExp("^" + TYPE + "\\s+(\\w+)\\s*=\\s*(.+)$")))) out.push(`let ${m[1]} = ${expr(m[2])};`);
    else if ((m = ln.match(/^(\w+)\s*:=\s*(.+)$/))) out.push(`${m[1]} = ${expr(m[2])};`);
    else throw new Error(name + ": no rule for the line: " + ln); });
  while (level > 0) { out.push("}"); level--; } return { state, out }; }
export function runFromText2(src, funds, chartDates, inputs) {
  const S = scope(src), fns = Object.fromEntries(["wilderRsi", "offHigh", "overAvg"].map((f) => [f, functionJs(src, f)])), pointsAt = compile(functionJs(src, "pointsAt").source, S);
  const req = {}; for (const m of src.matchAll(/^float (\w+)\s*=\s*request\.security\((\w+)T, "D", (.+), lookahead = barmerge\.lookahead_off\)\s*$/gm)) req[m[1]] = { fund: m[2], expression: m[3] };
  if (Object.keys(req).join() !== "spyRsi,qqqRsi,hygMove,iefMove,spyOff,qqqOff,spyOver,qqqOver") throw new Error("the script's requests are " + Object.keys(req).join());
  const seen = {}; for (const [name, r] of Object.entries(req)) { const own = funds[r.fund], closes = [], at = new Map(); let step; const call = r.expression.match(/^(\w+)\(close\)$/);
    if (call) { if (!fns[call[1]]) throw new Error("the script asks for " + call[1] + ", which has no translation"); const f = compile(fns[call[1]].source, S); step = (close) => f(close); }
    else { const f = new Function(...Object.keys(S), "close", "ago", "return " + expr(r.expression) + ";"); step = (close) => f(...Object.values(S), close, (n) => (closes.length - 1 - n >= 0 ? closes[closes.length - 1 - n] : NaN)); }
    for (const b of own) { closes.push(b.close); const v = step(b.close); at.set(b.date, v == null ? NaN : v); }
    const dates = own.map((b) => b.date), col = []; let j = -1; for (const d of chartDates) { while (j + 1 < dates.length && dates[j + 1] <= d) j++; col.push(j < 0 ? NaN : at.get(dates[j])); } seen[name] = col; }
  const { state, out } = bodyJs(sumText(src), "the sum"), want = ["rsiBoth", "creditOwn", "ptsRsi", "ptsFitted", "ptsCredit", "cashOn", "reading", "invested", "readingOld", "investedOld"];
  const names = [...Object.keys(S), "heldPct", "tacticalPct", "creditRule", "cashRule", "pointsAt", "isNa", "pineRound", "avgOf"], js = `${state.join("\n")}\nreturn function (spyRsi, qqqRsi, hygMove, iefMove, spyOff, qqqOff, spyOver, qqqOver) {\n${out.join("\n")}\nreturn { ${want.join(", ")} };\n};`;
  const bar = new Function(...names, js)(...Object.values(S), inputs.heldPct, inputs.tacticalPct, inputs.creditRule ?? true, inputs.cashRule ?? true, pointsAt, isNa, pineRound, avgOf);
  return chartDates.map((d, i) => ({ date: d, ...bar(seen.spyRsi[i], seen.qqqRsi[i], seen.hygMove[i], seen.iefMove[i], seen.spyOff[i], seen.qqqOff[i], seen.spyOver[i], seen.qqqOver[i]) })); }
