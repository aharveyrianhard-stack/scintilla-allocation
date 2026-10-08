/* PN1 (7 Oct 2026) — after the script is installed: is the text TradingView saved the text that was proved?
     node scripts/pn1-check-saved.mjs <the text read back from TradingView's editor after the save>
   Reads two files and the closes fixture; no network, no key, no table; writes nothing.
   Answers, in this order:
     1. identical to study/pn1/SCINTILLA-DEPLOYMENT-PANE.v1.pine → the proof stands as it is;
     2. else every line that differs, with its number on each side;
     3. else whether every NUMBER the script carries is unchanged (the tables, the constants, the two inputs, the four funds);
     4. and the saved text replayed against the engine on the days the study lists (the same comparison as scripts/pn1-prove.mjs).
   Exit 0 when the saved text is the proved text, or differs only outside its numbers and still agrees with the engine to one point
   on every listed day; exit 1 otherwise. */
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
import { parsePine, adjustLikeTradingView } from "../study/pn1/pine-replay.mjs"; import { engineOn, scriptOn, codeHash } from "./pn1-prove.mjs"; import { baseline } from "../study/ds1/live.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8")), sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

/* the lines that differ between two texts: the longest run of lines they share is kept, the rest is listed */
export function lineDiff(a, b) { const A = a.split("\n"), B = b.split("\n"), n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0; while (i < n && j < m) { if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push({ side: "proved", line: i + 1, text: A[i++] }); else out.push({ side: "saved", line: j + 1, text: B[j++] }); }
  while (i < n) out.push({ side: "proved", line: i + 1, text: A[i++] }); while (j < m) out.push({ side: "saved", line: j + 1, text: B[j++] }); return out; }
export function checkSaved(saved, proved = fs.readFileSync(path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.v1.pine"), "utf8")) {
  /* TradingView's editor may hand the text back with other line ends or without the last newline; neither is a change */
  const norm = (s) => s.replace(/\r\n/g, "\n").replace(/\n+$/, "") + "\n", s = norm(saved), p = norm(proved), res = { identical: s === p, sha256: { proved: sha(p), saved: sha(s) }, codeIdentical: null, differs: [], numbersUnchanged: null, replay: null, ok: false };
  if (res.identical) { res.codeIdentical = true; res.numbersUnchanged = true; res.ok = true; return res; }
  res.differs = lineDiff(p, s);
  try { res.codeIdentical = codeHash(p) === codeHash(s); const Kp = parsePine(p), Ks = parsePine(s); res.numbersUnchanged = JSON.stringify(Kp) === JSON.stringify(Ks);
    const F = J("tests/fixtures/pn1-closes-20261006.json"), base = J("study/ds1/data/ds1-live.json"), study = J("study/ds1/data/ds1.json"), eng = engineOn(F, base.model, baseline(base)), ix = Object.fromEntries(F.dates.map((d, k) => [d, k]));
    const same = scriptOn(Ks, F, F.hygWithPayouts), tv = scriptOn(Ks, F, adjustLikeTradingView(F.dates, F.HYG, F.payouts)), days = [...study.extremes.bottoms, ...study.extremes.tops].map((e) => e.date); let worst = 0, worstTv = 0;
    for (const d of days) { worst = Math.max(worst, Math.abs(eng[ix[d]].reading - same[ix[d]].reading)); worstTv = Math.max(worstTv, Math.abs(eng[ix[d]].reading - tv[ix[d]].reading)); }
    res.replay = { days: days.length, worstOnTheEnginesPrices: +worst.toFixed(1), worstWithTradingViewsPayouts: +worstTv.toFixed(1) }; res.ok = res.numbersUnchanged && worst <= 1 && worstTv <= 1;
  } catch (e) { res.replay = { failed: String((e && e.message) || e) }; res.ok = false; }
  return res; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const f = process.argv[2]; if (!f || !fs.existsSync(f)) { console.error("usage: node scripts/pn1-check-saved.mjs <the text read back from TradingView's editor>"); process.exit(2); }
  const r = checkSaved(fs.readFileSync(f, "utf8"));
  if (r.identical) console.log("IDENTICAL — TradingView saved the text that was proved. sha256", r.sha256.saved);
  else { console.log(r.ok ? "DIFFERENT, numbers unchanged, still agrees with the engine" : "DIFFERENT — do not present this until it is looked at", "\n  the code part", r.codeIdentical ? "is the same (only the header comment changed)" : "changed", "· every number the script carries", r.numbersUnchanged ? "is unchanged" : r.numbersUnchanged === false ? "— at least one CHANGED" : "— could not be read");
    console.log("  replayed against the engine on the listed days:", JSON.stringify(r.replay)); console.log("  " + r.differs.length + " line(s) differ:"); for (const d of r.differs.slice(0, 60)) console.log("   ", d.side.padEnd(6), String(d.line).padStart(4), "|", d.text.slice(0, 150)); }
  process.exit(r.ok ? 0 : 1); }
