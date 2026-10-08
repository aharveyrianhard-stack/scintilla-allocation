# TASK — version 2 of "Scintilla Deployment Pane", on the layout "Scintilla — Deployment" (7 Oct 2026, evening)

> **SUPERSEDED on 8 Oct 2026 — do not dispatch this task as it stands.** Version 3 has its own task,
> `study/pn1/TASK-KIMI-DEPLOYMENT-PANE-VERSION-3.md`. The path `study/pn1/SCINTILLA-DEPLOYMENT-PANE.pine` now holds
> version 3; version 2's text, byte for byte, is `study/pn1/SCINTILLA-DEPLOYMENT-PANE.v2.pine` (the sha256 below is its).

## Owner's words
Alan, 7 Oct ~20:05 New York, scrolling the pane back in time: "towards March 30th it tells us to drop right there … we would be
selling into losses" · "right at the peak, no action" · "you raise cash towards the end of 2025 … deploy harder towards the end of
March" · "the scrolling is a game changer". Version 2 of the script answers those; this task puts it where version 1 is.

## For the coordinator, before dispatch
- This task is NOT authorised by being written. It waits for Alan's go on version 2 (the study page: `study/ds2/DS2.html`).
- It changes one thing on TradingView: the text of the saved script "Scintilla Deployment Pane". No new tab, no new layout.
- The way back is in the last section. Version 1 stays in the script's own version history and in the repo, byte for byte.

## What holds from the version 1 task, unchanged
Everything under **What you are driving**, **Hard rules** and **Stop conditions** in `study/pn1/TASK-KIMI-DEPLOYMENT-LAYOUT.md`:
the same control helper, the editor method from your own receipts, never type or paste the script, never navigate a tab to a chart
address, headless-quiet, and stop rather than improvise. One rule is tightened for this task:
- **You work in ONE tab: the one that holds the layout `Scintilla — Deployment`** (the tab you created for version 1). Find it by the
  layout's name and its four symbols (AMEX:SPY, NASDAQ:QQQ, TVC:VIX, AMEX:HYG). If there is not exactly one such tab, STOP.
  EVERY other tab is forbidden, as before.

## The two files
| file | what it is | sha256 |
|---|---|---|
| `SCINTILLA-DEPLOYMENT-PANE.v2.pine` | version 2, the text to save | `7a54375f36fca2fc70da59215069936f6ef84b65af16bb4dbaaeccba759bc0c9` |
| `SCINTILLA-DEPLOYMENT-PANE.v1.pine` | version 1, as installed today — for the way back only | `1e291cfdd4da1200ee3ecb9f4d5d3b6f78a6eda067d2af9c8926c27c11d40daa` |

## Steps
### 1 · Before
`out/00-before.json` = `/json/list`. Find the one tab. In it, read the saved script's current text from the editor into
`out/SCINTILLA-DEPLOYMENT-PANE.before.pine` and check it against version 1's sha256. If it is not version 1, say what it is and STOP.

### 2 · The script: the SAME saved script, new text
- Open "Scintilla Deployment Pane" in the Pine editor (`showWidget('scripteditor')`, then open the saved script by its name).
- Replace its whole text with version 2 by the editor method of your receipts. Do NOT use "Save as" or "Make a copy": the name
  stays `Scintilla Deployment Pane`, and TradingView keeps version 1 as the version before.
- Save. Read the compiler's result. **Zero errors is the only pass.**
- If the editor rejects a line you may make the three named fixes of the version 1 task (they touch no number), mark each one,
  and nothing else. Version 2 adds these constructs, which have never met the compiler — if one of them is what it rejects, STOP
  and send the exact message, do not rewrite it: `bgcolor(…)` with a title · `var array<float> … = array.new<float>()` inside a
  function called from `request.security` · `array.shift` / `array.max` / `array.avg` · `var bool cash` set inside an `if`.
- After the save, read the text back from the editor into `out/SCINTILLA-DEPLOYMENT-PANE.v2.as-saved.pine`.

### 3 · The pane on chart 0
The pane under SPY must now run version 2 (update the study to the saved version; if it has to be removed and added again, do
that on chart 0 only and put it back in the same place). Its status line still reads `DEPLOYMENT 70 30` and the % invested.
Leave both switches of the group "What version 2 changed" ON and "Show version 1's line beside it" OFF, as they come.

### 4 · What it must show — read it, do not guess
Read the pane's own numbers on the eight days below (Data Window / `exportData` with the study included): "% invested",
"market reading", "SPY and QQQ's RSI, averaged", "credit's own move over ten sessions, %", "cash raised at an extended high
(1 = yes)", "% invested, version 1". Put what you read beside ours.

| day | % invested | market reading | SPY and QQQ's RSI, averaged | credit's own move, % | cash raised | % invested, version 1 |
|---|---|---|---|---|---|---|
| 2026-10-06 | 73.27 | 10.9 | 65.97 | -0.227 | 1 | 76.57 |
| 2026-03-30 | 94.81 | 82.7 | 27.87 | -0.415 | 0 | 87.73 |
| 2026-01-27 | 77.05 | 23.5 | 59.12 | 0.264 | 1 | 84.16 |
| 2025-12-11 | 77.74 | 25.8 | 60.32 | 0.804 | 1 | 85.48 |
| 2025-07-21 | 71.44 | 4.8 | 71.10 | 0.182 | 0 | 71.41 |
| 2025-04-08 | 100.00 | 100.0 | 22.27 | -4.303 | 0 | 100.00 |
| 2025-03-28 | 91.42 | 71.4 | 37.18 | -0.424 | 0 | 85.87 |
| 2020-03-17 | 100.00 | 100.0 | 37.44 | -10.738 | 0 | 100.00 |

The match: the market reading within 1 point; % invested within 0.3; **"cash raised" exactly** (it is 1 or 0); "% invested,
version 1" within 0.3 of ours — it is what version 1 showed on that day. A day outside the match is reported, not explained away.
Then read the label on the last bar, whole.

### 5 · Pictures (the tab stays where it is; if a pane has no height because the tab is in the background, say so)
1. the layout as it loads with version 2;
2. the same with "Show version 1's line beside it" ON — then switch it OFF again;
3. December 2025 to April 2026 in view, as it loads (the shaded stretch from 3 Dec 2025 to 4 Feb 2026, and the line through
   the low of 30 Mar 2026).

### 6 · Save and wrap up
The layout's own Save; its name is still `Scintilla — Deployment`. `out/99-after.json` = `/json/list`: every target of
`out/00-before.json` with the same id, URL and title. `out/receipt.json`: each step and its result, the script's name, id and
version before and after, the three sha256 values (before, sent, as saved), every character you changed if any, the table of
numbers you read beside ours and which are outside the match, the label, the pictures, everything you could not do, the time.

## After it returns (the coordinator)
`node scripts/ds2-check-saved.mjs "<that folder>/out/SCINTILLA-DEPLOYMENT-PANE.v2.as-saved.pine"` says whether the text
TradingView saved is the text that was proved (exit 0), which lines differ if any, and whether it still gives the tool's reading
and the same raise-cash days on all 4,894 days.

## The way back
Version 1 is the version before in the script's own history. If it has to be put back by hand: the same steps with
`SCINTILLA-DEPLOYMENT-PANE.v1.pine`, and `node scripts/pn1-check-saved.mjs` on what was saved. In version 2 itself, switching
both switches of "What version 2 changed" off draws version 1 exactly (held to that on every day by the proof).

## What version 2 is, in two lines (for your receipt, not for you to check)
Credit's subtraction counts in full at an RSI of 45, not at all at 35 and under. Cash is raised at a close with SPY and QQQ both
within 2% of their 252-session high and 11.21% or more above their 200-day averages, and put back at a close with their RSI under 40.
