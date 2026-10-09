/* DS2 (7 Oct 2026) — after version 2 of the script is installed: is the text TradingView saved the text that was proved?
     node scripts/ds2-check-saved.mjs <the text read back from TradingView's editor after the save>
   PN1's check (scripts/pn1-check-saved.mjs), for version 2. Reads two files, the closes fixture and the rule file; no network, no key,
   no table; writes nothing. Answers, in this order:
     1. identical to study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine → the proof stands as it is;
     2. else every line that differs, with its number on each side;
     3. else whether every NUMBER the script carries is unchanged (the tables, the constants, the two inputs, the two switches, the funds);
     4. and the saved text replayed against the tool's sum on every day there is: the worst gap, and the raise-cash days that differ.
   Exit 0 when the saved text is the proved text, or differs only outside its numbers and still gives the tool's reading and the same
   raise-cash days; exit 1 otherwise. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { parsePine2 } from "../study/ds2/pane-replay.mjs"; import { engineV2On, scriptV2On, codeHash } from "./ds2-prove-pane.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8")), norm = (t) => t.replace(/\r\n/g, "\n").replace(/\n+$/, "") + "\n";
export function lineDiff(a, b) { const A = a.split("\n"), B = b.split("\n"), out = []; for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) out.push({ line: i + 1, proved: A[i] ?? null, saved: B[i] ?? null }); return out; }
export function checkSaved2(saved, proved = fs.readFileSync(path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.v2.pine"), "utf8")) {
  const a = norm(proved), b = norm(saved); if (a === b) return { identical: true, ok: true, codeHash: codeHash(a) };
  const differs = lineDiff(a, b); let K1, K2; try { K1 = parsePine2(a); K2 = parsePine2(b); } catch (e) { return { identical: false, ok: false, differs, cannotRead: String(e.message || e) }; }
  const numbersUnchanged = JSON.stringify(K1) === JSON.stringify(K2), F = J("tests/fixtures/pn1-closes-20261006.json"), base = J("study/ds1/data/ds1-live.json"), R = J("study/ds2/data/ds2-live.json").rules, eng = engineV2On(F, base.model, R); let worst = 0, cashDiffer = 0, days = 0, failed = null;
  try { const scr = scriptV2On(K2, F, F.hygWithPayouts); for (let i = 0; i < eng.length; i++) { if (eng[i].reading == null && scr[i].reading == null) continue; if (eng[i].reading == null || scr[i].reading == null) { cashDiffer++; continue; } days++; worst = Math.max(worst, Math.abs(eng[i].reading - scr[i].reading)); if (!!eng[i].cash !== !!scr[i].cashOn) cashDiffer++; } } catch (e) { failed = String(e.message || e); }
  return { identical: false, differs, numbersUnchanged, replay: failed ? { failed } : { days, worstOnTheToolsPrices: +worst.toFixed(2), raiseCashDaysThatDiffer: cashDiffer }, ok: numbersUnchanged && !failed && worst <= 0.1000001 && cashDiffer === 0 }; }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const f = process.argv[2]; if (!f || !fs.existsSync(f)) { console.error("usage: node scripts/ds2-check-saved.mjs <the saved text>"); process.exit(2); }
  const r = checkSaved2(fs.readFileSync(f, "utf8")); console.log(JSON.stringify({ ...r, differs: r.differs ? r.differs.slice(0, 40) : undefined, linesThatDiffer: r.differs ? r.differs.length : 0 }, null, 1)); process.exit(r.ok ? 0 : 1); }
