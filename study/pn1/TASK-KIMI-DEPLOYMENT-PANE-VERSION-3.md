# TASK — version 3 of "Scintilla Deployment Pane", on the layout "Scintilla — Deployment" (8 Oct 2026)

## Owner's words
Alan, 8 Oct ~08:45 and ~09:00 New York: "The VIX rose to 15.73. Shouldn't that tell us to invest a little bit more?" · on the lows
of 30 March 2026 and late March 2025: "we would want it to … invest more at those lows, don't you think?". His standing rules: he
buys with the VIX above 20, with both hands above 23; a flight to safety is fear, and fear is a buy. Version 3 of the script
counts both; this task puts it where the installed version is.

## For the coordinator, before dispatch
- This task is NOT authorised by being written. It waits for Alan's go on version 3 (the study page: `study/ds3/DS3.html`).
- It changes one thing on TradingView: the text of the saved script "Scintilla Deployment Pane". No new tab, no new layout.
- The way back is in the last section. Versions 1 and 2 stay in the repo, byte for byte, and the installed one stays in the
  script's own version history.
- Version 3 reads one more feed than before: the VIX, under `TVC:VIX` — the symbol the layout's own VIX chart already uses.

## What holds from the version 1 task, unchanged
Everything under **What you are driving**, **Hard rules** and **Stop conditions** in `TASK-KIMI-DEPLOYMENT-LAYOUT.md` (this
folder): the same control helper, the editor method from your own receipts, never type or paste the script, never navigate a tab
to a chart address, headless-quiet, and stop rather than improvise. One rule is tightened for this task:
- **You work in ONE tab: the one that holds the layout `Scintilla — Deployment`** (the tab you created for version 1). Find it by the
  layout's name and its four symbols (AMEX:SPY, NASDAQ:QQQ, TVC:VIX, AMEX:HYG). If there is not exactly one such tab, STOP.
  EVERY other tab is forbidden, as before.

## The three files (all in this folder)
| file | what it is | sha256 |
|---|---|---|
| `SCINTILLA-DEPLOYMENT-PANE.pine` | version 3, the text to save | `198c3a91a95776cf42894aa93e1400ed28a8eefcb66c20c371ef81bb01df391e` |
| `SCINTILLA-DEPLOYMENT-PANE.v2.pine` | version 2 — to recognise what is installed, and for the way back | `7a54375f36fca2fc70da59215069936f6ef84b65af16bb4dbaaeccba759bc0c9` |
| `SCINTILLA-DEPLOYMENT-PANE.v1.pine` | version 1 — to recognise what is installed, and for the way back | `1e291cfdd4da1200ee3ecb9f4d5d3b6f78a6eda067d2af9c8926c27c11d40daa` |

## Steps
### 1 · Before
`out/00-before.json` = `/json/list`. Find the one tab. In it, read the saved script's current text from the editor into
`out/SCINTILLA-DEPLOYMENT-PANE.before.pine` and check it against the sha256 of version 1 and of version 2. Write down which of
the two it is. If it is neither, say what it is and STOP.

### 2 · The script: the SAME saved script, new text
- Open "Scintilla Deployment Pane" in the Pine editor (`showWidget('scripteditor')`, then open the saved script by its name).
- Replace its whole text with version 3 by the editor method of your receipts. Do NOT use "Save as" or "Make a copy": the name
  stays `Scintilla Deployment Pane`, and TradingView keeps the installed version as the version before.
- Save. Read the compiler's result. **Zero errors is the only pass.**
- If the editor rejects a line you may make the three named fixes of the version 1 task (they touch no number), mark each one,
  and nothing else. Version 3 has never met the compiler. If one of the constructs below is what it rejects, STOP and send the
  exact message, do not rewrite it:
  - new in version 3: `string vixT = vixSym` (an input symbol copied to a plain name and used as a request's ticker) ·
    `request.security(vixT, "D", high, …)` on an index · a second group of switches (`G_RULE3`) · a ternary that gives `na`
    (`na(ptsOwn) ? na : …`, `not vixRule ? 0.0 : na(vixClose) ? na : …`) · `bool rally = iefMove > 0.0` on a value that can be missing;
  - from version 2, if version 1 is what is installed: `bgcolor(…)` with a title · `var array<float> … = array.new<float>()`
    inside a function called from `request.security` · `array.shift` / `array.max` / `array.avg` · `var bool cash` set inside an `if`.
- After the save, read the text back from the editor into `out/SCINTILLA-DEPLOYMENT-PANE.v3.as-saved.pine`.

### 3 · The pane on chart 0
The pane under SPY must now run version 3 (update the study to the saved version; if it has to be removed and added again, do
that on chart 0 only and put it back in the same place). Its status line still reads `DEPLOYMENT 70 30` and the % invested.
Leave all four switches ON — the two of "What version 2 changed" and the two of "What version 3 changed" — and both "Show
version … line beside it" OFF, as they come. Leave "The VIX" under "Where the prices come from" at `TVC:VIX`.

### 4 · What it must show — read it, do not guess
Read the pane's own numbers on the nine days below (Data Window / `exportData` with the study included): "% invested", "market
reading", "SPY and QQQ's RSI, averaged", "credit's own move over ten sessions, %", "cash raised at an extended high (1 = yes)",
"the VIX adds, points of the market reading", "a Treasury rally raised the credit part (1 = yes)", "% invested, version 2",
"% invested, version 1". Put what you read beside ours.

| day | % invested | market reading | SPY and QQQ's RSI, averaged | credit's own move, % | cash raised | the VIX adds | a Treasury rally raised credit | % invested, version 2 | % invested, version 1 |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-06 | 73.27 | 10.9 | 65.97 | -0.227 | 1 | 0 | 0 | 73.30 | 76.57 |
| 2026-03-30 | 100.00 | 100.0 | 27.87 | -0.415 | 0 | 20 | 0 | 94.81 | 87.73 |
| 2026-02-23 | 90.10 | 67.0 | 43.78 | -0.639 | 0 | 10 | 1 | 82.93 | 82.09 |
| 2026-01-27 | 77.05 | 23.5 | 59.12 | 0.264 | 1 | 0 | 0 | 77.08 | 84.16 |
| 2025-12-11 | 77.74 | 25.8 | 60.32 | 0.804 | 1 | 0 | 0 | 77.74 | 85.48 |
| 2025-07-21 | 71.98 | 6.6 | 71.10 | 0.182 | 0 | 0 | 1 | 71.41 | 71.41 |
| 2025-04-08 | 100.00 | 100.0 | 22.27 | -4.303 | 0 | 20 | 0 | 100.00 | 100.00 |
| 2025-03-28 | 95.02 | 83.4 | 37.18 | -0.424 | 0 | 10 | 1 | 91.42 | 85.87 |
| 2020-03-17 | 100.00 | 100.0 | 37.44 | -10.738 | 0 | 20 | 0 | 100.00 | 100.00 |

The match: the market reading within 1 point; % invested within 0.3; **"cash raised" exactly** (it is 1 or 0); **"the VIX adds"
exactly** (it is 0, 5, 10, 15 or 20); "a Treasury rally raised the credit part" exactly; the two earlier versions within 0.3 of
ours. A day outside the match is reported, not explained away.
- If "the VIX adds" differs on a day, also read the VIX chart's own daily bar for that day — its close and its high — and write
  both down. Ours come from the Hub's daily bar for the VIX; a different high there is a known difference between the two feeds,
  and it is what we need to see.
Then read the label on the last bar, whole.

### 5 · Pictures (the tab stays where it is; if a pane has no height because the tab is in the background, say so)
1. the layout as it loads with version 3;
2. the same with "Show version 2's line beside it" ON — then switch it OFF again;
3. February to April 2026 in view, as it loads (the line through 23 Feb 2026, and at 100 through the low of 30 Mar 2026);
4. March and April 2025 in view, as it loads.

### 6 · Save and wrap up
The layout's own Save; its name is still `Scintilla — Deployment`. `out/99-after.json` = `/json/list`: every target of
`out/00-before.json` with the same id, URL and title. `out/receipt.json`: each step and its result, the script's name, id and
version before and after, which version was installed before, the three sha256 values (before, sent, as saved), every character
you changed if any, the table of numbers you read beside ours and which are outside the match, the label, the pictures,
everything you could not do, the time.

## After it returns (the coordinator)
`node scripts/ds3-check-saved.mjs "<that folder>/out/SCINTILLA-DEPLOYMENT-PANE.v3.as-saved.pine"` says whether the text
TradingView saved is the text that was proved (exit 0), which lines differ if any, and whether it still gives the same reading,
the same raise-cash days and the same VIX and Treasury parts on all 4,894 days.

## The way back
The installed version is the version before in the script's own history. If it has to be put back by hand: the same steps with
`SCINTILLA-DEPLOYMENT-PANE.v2.pine` (then `node scripts/ds2-check-saved.mjs` on what was saved) or
`SCINTILLA-DEPLOYMENT-PANE.v1.pine` (then `node scripts/pn1-check-saved.mjs`). In version 3 itself, switching both switches
of "What version 3 changed" off draws version 2 exactly, and all four off draws version 1 exactly (held to that on every day by
the proof).

## What version 3 is, in two lines (for your receipt, not for you to check)
The VIX is counted: a close at 20 or more adds 10 points to the market reading, a close at 23 or more adds 20 in all, a touch
counts at a half, under 20 nothing. And when Treasuries are up over ten sessions the credit part is read with and without the
Treasury half, and the higher of the two counts. Everything else is version 2.
