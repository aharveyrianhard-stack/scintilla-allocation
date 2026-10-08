# TASK — the deployment pane on a NEW four-chart layout "Scintilla — Deployment" (7 Oct 2026)

## Owner's words
Alan, 7 Oct 2026 ~15:30 ET (dictated): "trading view pane would be pretty fucking great on a multi-chart. We should present
that and get Kimmy on it … With the multi-chart layout for me to be able to view it. That way I can really approve it." And:
"I care about being able to view every version going backwards to see what it would have looked like at a certain moment."

This covers ONLY what is listed under "Steps". Everything else stays forbidden by your standing scope rule.

## For the coordinator, before dispatch
- `job.json` in this folder is a draft with `"authorized": false`. It records nothing until you set it; one Kimi job at a time.
- Step 2 opens a new tab in the TradingView app. A new tab becomes the visible tab of that window, so pick a moment when
  Alan is not working in it, or tell him first.
- The script was written and proved WITHOUT access to TradingView: its arithmetic is proved against the allocation tool's
  engine, its syntax has never met TradingView's compiler. Step 6e is where that is found out.
- When Kimi returns, run in the allocation repo, branch `pn1-deployment-pane-20261007`:
  `node scripts/pn1-check-saved.mjs "<this folder>/out/SCINTILLA-DEPLOYMENT-PANE.as-saved.pine"`
  It says whether the text TradingView saved is the text that was proved, and if not, exactly which lines differ.
- If the automation stalls: the first fix is yours, not Kimi's — bring the exact TradingView window on screen (frontmost,
  on the current Space) and try again (TV_PINE_PROTOCOL.md, "FIRST FIX").

## What you are driving (the same as your tasks earlier today)
- TradingView Desktop on this Mac, already signed in, debug port http://127.0.0.1:9222 (`/json/list`).
- Node has a built-in `WebSocket`; `cdp.mjs` in this folder is a copy of the helper you wrote this morning. No npm installs.
- READ FIRST your own receipts `../kimi-tv-pine-install-20261007/out/receipt4.json` and `receipt5.json`: the editor method that
  worked (the widget is named `scripteditor`; the React-fiber path to Monaco; `setValue`; the markers; the "Save script" menu
  ROW, not its text node; the saved list on pine-facade).
- Pictures only through the page (`TradingViewApi.takeClientScreenshot()` or CDP `Page.captureScreenshot`). Never the OS:
  Stage Manager is on.

## Hard rules
1. EVERY tab that exists when you start is forbidden — Alan's layouts, the Indicator Lab's, and your own test tab
   (`/chart/Exxz8hhx/`, "Kimi test — Geiger"; Alan uses it now). Do not connect to them, focus, click, type, navigate, reload
   or close them. Save `/json/list` first: that list IS the forbidden list.
2. You work in ONE new tab that you open yourself in step 2, and nowhere else.
3. The new tab becomes a NEW layout through the app's own new-tab page. NEVER navigate a tab to
   `https://www.tradingview.com/chart/`: this morning that loaded Alan's last-used layout and its first pane was changed.
4. Before EVERY action that clicks, types or sets anything in a chart: read the page's URL and layout name. Go on only if the
   chart id in the URL is the new one (in no URL of the forbidden list) and the name is `Scintilla — Deployment` (or the app's
   name for a layout not yet saved, before step 3 names it).
5. Never save over, rename or delete an existing layout or script. Never open an existing saved script in the editor.
   Nothing published. No alerts, no orders, no account or app settings.
6. No keyboard shortcut sent to a window. No OS-level click. Never type or paste the script: pasting auto-indents and
   breaks Pine.
7. A sign-in prompt, a dialog you did not cause, or a forbidden target changing: stop.

## Steps

### 1 · Before
- `out/00-before.json` = `/json/list`.
- `out/00-saved-before.json` = `https://pine-facade.tradingview.com/pine-facade/list/?filter=saved` (credentials included).
- If a saved script named exactly `Scintilla Deployment Pane` already exists: STOP.
- If any open tab's layout is already named `Scintilla — Deployment`: STOP.

### 2 · One new tab, through the app's own new-tab page
a. In the app's tab-bar window (a target whose URL contains `/app/window/index.html`), click the element with class
   `create-new-tab-button` ONCE. There are two such windows: use the one whose tab strip shows the title
   "Kimi test — Geiger"; if neither shows it, the first.
b. `/json/list` again. Exactly one new page target must have appeared, and its URL must contain
   `/app/new-tab/index.html` — the app's own new-tab page. If the new target is already a chart
   (`https://www.tradingview.com/chart/…`), it is an EXISTING layout: do not touch it. Record its URL and layout name
   and STOP.
c. On the new-tab page, read the text of its buttons and links into the receipt. Then click the ONE item whose text is
   "Create new layout" (ignore case and a trailing "…"). I have not seen this page myself; the instruction is that it offers
   this item. If it does not: STOP. Do not click a layout tile, a recent chart or anything that opens a chart.
d. If a dialog asks for a name, enter `Scintilla — Deployment` (capital S, a space, an em dash U+2014, a space, capital D)
   and confirm.
e. Wait for the chart page. Confirm ALL of:
   - the URL is `https://www.tradingview.com/chart/<id>/` and `<id>` is in no URL of `out/00-before.json`;
   - `TradingViewApi.layoutName()` is `Scintilla — Deployment`, or the app's name for a layout not yet saved (record it exactly).
   Anything else: STOP without changing the page.
   From here on "the new tab" is this target id. Record it.

### 3 · Name and save the layout before anything else
If it is not named yet: the layout's own "Save", name `Scintilla — Deployment`. Confirm
`TradingViewApi.layoutName() === "Scintilla — Deployment"`. Record the URL.

### 4 · Four charts, daily
- A 2×2 grid of four charts (the layout picker's "4 charts"; `TradingViewApi.setLayout('4')` if it exists).
- Top-left `AMEX:SPY` · top-right `NASDAQ:QQQ` · bottom-left the VIX (`TVC:VIX`; if the symbol search does not offer it,
  `CBOE:VIX`) · bottom-right `AMEX:HYG`.
- Every chart on 1 day (`1D`).
- Read back and record: the number of charts, and each chart's symbol and interval.

### 5 · The four charts move together (this layout only)
Sync in layout: Interval ON · Crosshair ON · Time ON · Date range ON · Symbol OFF (each chart keeps its own symbol).
This is what lets Alan scroll back on one chart and see the same day on all four. If you cannot find a switch, leave it
as it is and say so.

### 6 · The script, as a NEW saved script
a. Make the SPY chart (top-left) the active chart.
b. Open the Pine editor: `window.TradingView.bottomWidgetBar.showWidget('scripteditor')`.
c. Start a NEW indicator through the editor's own menu (the script-name header → "Create new" → "Indicator", or however
   this build names a new, empty indicator). The editor may open with the last script you worked on: that is why this step
   comes first. Read the header after it: it must show the app's name for a script not yet saved. If it shows the name of
   ANY saved script in `out/00-saved-before.json`, STOP. Never `setValue` on a script that already has a saved name.
d. Set the text from `SCINTILLA-DEPLOYMENT-PANE.pine` in this folder with the proven path:
   `.monaco-editor.pine-editor-monaco` → the first parent with a `__reactFiber$` key → `.return` until
   `memoizedProps.value.monacoEnv` → `env.editor.getEditors()[0].setValue(text)`, the text passed as one JSON string.
   Confirm `getValue() === the file's text` (same length, same sha256).
e. Wait 4 s. Read the markers: `env.editor.getModelMarkers({ resource: editor.getModel().uri })`. Expected: none.
   - Warnings: record them and go on.
   - Errors: you may fix ONLY what a marker names and ONLY in these three ways —
     (i) remove the argument `display = display.none` from the `input.…(…)` call the marker points at;
     (ii) remove the argument `display = …` from the `plot(…)` call the marker points at;
     (iii) correct the indentation of a wrapped line (wrapped lines start with five spaces).
     Do NOT change a number, a table, a name, any text inside quotes, or any arithmetic. Anything else: STOP and put the
     marker's line, column and message in the receipt. At most 3 attempts. Never save with an error.
f. Save through the header menu ROW "Save script", name `Scintilla Deployment Pane`. Confirm on pine-facade that a script of
   that name exists at version 1.0 and that EVERY other saved script has the same version as in `out/00-saved-before.json`.
   Save that list as `out/69-saved-after.json`.
g. Read the editor's text back after the save into `out/SCINTILLA-DEPLOYMENT-PANE.as-saved.pine`. Put the sha256 of the file
   you were given and of this one in the receipt, and say whether they are identical.
h. With the SPY chart active, "Add to chart" (the editor's own button). Confirm that chart 0's studies include
   "SCINTILLA · DEPLOYMENT PANE" and that charts 1, 2 and 3 do not carry it.

### 7 · What it must show — read it, do not guess
- A pane under SPY on a 0–100 scale: one line that lives between 70 and 100, green on days it rose and red on days it fell;
  a thin line at 70 with the band between the two shaded teal; level lines at 0, 50 and 100; and one label on the last bar
  reading `Invested NN% · market reading NN`. No white anywhere.
- The status line beside the pane's name should read `DEPLOYMENT 70 30` and then one number, the % invested. Record it.
- Read the label's text and record it with the time. (It moves with prices. For reference only: at 15:56 New York on 7 Oct
  our tool read "Invested 79% · market reading 30".)
- Read the pane's own numbers on the eight past days below (the script's values on chart 0: "% invested", "market reading",
  "SPY and QQQ's RSI, averaged", "credit's own move over ten sessions, %" — `activeChart().exportData(…)` with the study
  included if that exists; if you cannot read them, say so, do not estimate from a picture). Put what you read beside ours:

| day | % invested | market reading | SPY and QQQ's RSI, averaged | credit's own move, % |
|---|---|---|---|---|
| 2026-10-06 | 76.57 | 21.9 | 65.97 | -0.227 |
| 2026-08-13 | 84.19 | 47.3 | 63.74 | 0.842 |
| 2026-06-02 | 70.00 | 0.0 | 77.49 | 0.555 |
| 2026-03-26 | 91.39 | 71.3 | 33.42 | 0.033 |
| 2025-04-04 | 100.00 | 100.0 | 23.68 | -3.444 |
| 2024-07-16 | 73.90 | 13.0 | 70.66 | 0.751 |
| 2020-03-17 | 100.00 | 100.0 | 37.44 | -10.738 |
| 2018-01-26 | 70.00 | 0.0 | 84.03 | 0.450 |

  Ours are a replay of the script on the Hub's prices. TradingView's prices differ by a cent here and there, and a cent on
  HYG moves the reading by up to half a point. So: market reading within 1.5, % invested within 0.5, RSI within 0.3, credit
  within 0.05 is a match. A number outside that: do NOT change anything — put both values in the receipt and flag it.
- The first bar that has a value should be 25 Apr 2007. Record what you find.

### 8 · Pictures
- `out/10-layout.png`: the whole layout, four charts, the pane under SPY.
- `out/11-pane.png`: the SPY chart with its pane, large enough to read the label.
- If the label is cut off at the right edge of the SPY chart, give that chart more empty space to the right of its last bar
  until the whole label shows (with Date range sync on, the other three follow). If you cannot, say so.
- If a pane comes out with no height because the tab is in the background, do NOT bring it forward: say so, and the
  coordinator takes the picture.

### 9 · Save and leave it open
The layout's own Save; confirm the name is still `Scintilla — Deployment`. Leave the new tab open on it so Alan can look.

### 10 · Wrap up
- `out/99-after.json` = `/json/list`: every target of `out/00-before.json` with the same id, URL and title, plus your new tab.
- `out/receipt.json`: each step and its result; the new tab's target id and URL; the layout's name; the grid; each chart's
  symbol and interval; the sync switches; the markers of every attempt and every character you changed, if any; the saved
  script's name, id and version; the two sha256 values; the label you read; the table of numbers you read beside ours and
  which are outside the match; the pictures; everything you could not do; the total time.

## Stop conditions
- Any of the STOPs above.
- A sign-in prompt; a dialog you did not cause; a forbidden target changing.
- An error marker you may not fix, or one still there after 3 attempts.
- The automation stalling (an action that reports success and changes nothing, twice): stop and say so.
- 30 minutes.
