/* DS3 (8 Oct 2026) — after version 3 of the script is installed: is the text TradingView saved the text that was proved?
     node scripts/ds3-check-saved.mjs <the text read back from TradingView's editor after the save>
   PN1's check and DS2's, for version 3. Reads two files, the two fixtures and the rule file; no network, no key, no table; writes nothing.
   Answers, in this order:
     1. identical to study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine → the proof stands as it is;
     2. else every line that differs, with its number on each side;
     3. else whether every NUMBER the script carries is unchanged (the tables, the constants, the inputs, the four switches, the symbols);
     4. and the saved text replayed against the tool's sum on every day there is: the worst gap, the raise-cash days that differ, and the
        days the VIX's add or the Treasury flag differs.
   Exit 0 when the saved text is the proved text, or differs only outside its numbers and still gives the same reading, the same
   raise-cash days and the same version 3 parts; exit 1 otherwise. */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { parsePine3 } from "../study/ds3/pane-replay.mjs"; import { engineV3On, scriptV3On, codeHash } from "./ds3-prove-pane.mjs"; import { lineDiff } from "./ds2-check-saved.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8")), norm = (t) => t.replace(/\r\n/g, "\n").replace(/\n+$/, "") + "\n";
export function checkSaved3(saved, proved = fs.readFileSync(path.join(ROOT, "study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine"), "utf8")) {
  const a = norm(proved), b = norm(saved); if (a === b) return { identical: true, ok: true, codeHash: codeHash(a) };
  const differs = lineDiff(a, b); let K1, K2; try { K1 = parsePine3(a); K2 = parsePine3(b); } catch (e) { return { identical: false, ok: false, differs, cannotRead: String(e.message || e) }; }
  const numbersUnchanged = JSON.stringify(K1) === JSON.stringify(K2), F = J("tests/fixtures/pn1-closes-20261006.json"), VX = J("tests/fixtures/ds3-vix-20261006.json"), base = J("study/ds1/data/ds1-live.json"), R = J("study/ds3/data/ds3-live.json").rules, eng = engineV3On(F, VX, base.model, R); let worst = 0, cashDiffer = 0, partsDiffer = 0, days = 0, failed = null;
  try { const scr = scriptV3On(K2, F, VX, F.hygWithPayouts); for (let i = 0; i < eng.length; i++) { if (eng[i].reading == null && scr[i].reading == null) continue; if (eng[i].reading == null || scr[i].reading == null) { cashDiffer++; continue; } days++; worst = Math.max(worst, Math.abs(eng[i].reading - scr[i].reading)); if (!!eng[i].cash !== !!scr[i].cashOn) cashDiffer++; if (eng[i].vixAdd !== scr[i].ptsVix || !!eng[i].raisedByRally !== !!scr[i].raisedByRally) partsDiffer++; } } catch (e) { failed = String(e.message || e); }
  return { identical: false, differs, numbersUnchanged, replay: failed ? { failed } : { days, worstOnTheToolsPrices: +worst.toFixed(2), raiseCashDaysThatDiffer: cashDiffer, daysVersion3sPartsDiffer: partsDiffer }, ok: numbersUnchanged && !failed && worst <= 0.1000001 && cashDiffer === 0 && partsDiffer === 0 }; }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const f = process.argv[2]; if (!f || !fs.existsSync(f)) { console.error("usage: node scripts/ds3-check-saved.mjs <the saved text>"); process.exit(2); }
  const r = checkSaved3(fs.readFileSync(f, "utf8")); console.log(JSON.stringify({ ...r, differs: r.differs ? r.differs.slice(0, 40) : undefined, linesThatDiffer: r.differs ? r.differs.length : 0 }, null, 1)); process.exit(r.ok ? 0 : 1); }
