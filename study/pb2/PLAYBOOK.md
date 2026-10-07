# The playbook — the rules as they stand

Last measured **7 Oct 2026**, on daily bars through **6 Oct 2026**. Built by `study/pb2/tools/build_page.py` from `study/pb2/data/pb2.json`; the study page beside this file (`PB2.html`) shows the same numbers with their pictures.

**How to use it.** Before a new decision, find the rules it touches. Read what to do with each and the number behind it, then answer its check question. If the decision breaks a rule, say which one and why. A rule changes only when it is measured again — the date on it changes with it.

Intervals are 95% intervals. “Points” are points of return. “Planned money” is the full position the plan intends (for Micron, about 20% of the account).

## Tonight’s readings

| | 6 Oct 2026 |
|---|---|
| Micron | close 1,045.56 · 21-day 1,028.24 · 50-day 961.81 · 100-day 959.57 · 200-day 689.87 · −16.7% from its high of 1,255.00 (25 Jun 2026) |
| Does today meet the leader-pullback rule? | yes — and the 50- and 100-day are bunched (within 3%) |
| The drafts | 18 @ 1,036.13 (3D P1) · 22 @ 1,030.40 (21-day + 2W D3) · 27 @ 1,011.77 (3D P3) · then 37 @ 989.17 (1D D3 + 3D C3) after a fill |
| Micron’s usual day | 3.3% — about $34 (volatility model: 3.1% a day, the year’s middle 4.2%) |
| VIX | 15.01 — its past year: 80th percentile 19.9, 90th 23.6 |
| Credit (HYG with payouts) | UNDER its 200-day (77.27 against 77.90), since 23 Sep 2026 |
| 10-year yield | 5.27% · above its 200-day (4.46%) · RSI in the top 6% of its year |
| Market regime (hidden-Markov model) | choppy (98%), since 11 Sep 2026 |
| Sector | SMH −5.9% from its high; Micron −5.2% against SMH over 20 sessions |

## The base rates to quote

- **Leader pullbacks** (562 cases, 83 stocks, since 2003): 18% held the 21-day for 10 sessions · 61% touched the 50-day inside 20 sessions · 23% the 100-day · deepest dip −7.3% inside 20 sessions and −12.2% inside 60 (middle case) · 60 sessions on +4.9%, higher in 58% · new 52-week high inside 60 sessions 63%.
- **With the 50- and 100-day bunched** (31 cases — thin): 90% touched the 50-day inside 20 sessions · 55% the 100-day · 60 sessions on −1.5%, higher in 45%.
- **Micron’s own set-ups** (48 cases): deepest dip −6.1% inside 20 sessions · 60 sessions on +9.5%, higher in 77%.

## The rules

### 1. At most three working orders, re-priced each evening

- **What to do with it (7 Oct 2026):** **KEEP** — keep the cap · change the spacing
- **Whose rule, and when:** Alan, 7 Oct 2026 ~01:45 ET: “I would keep a few at a time … a massive falling knife would execute all of it … making things a little bit more mechanical will be good”
- **The evidence:** 1,036.13 and 1,030.40 are 0.55% apart; Micron’s usual day is 3.3% ($34). In its 48 set-ups the first two drafts filled in the same session 65% of the time and all three working drafts 23%. The cap only stops a falling knife when the orders are about a usual day apart. With the first two as one order at 1,036.13 and then 1,011.77 and 989.17 (gaps of 0.71 and 0.66 of a usual day), all three working orders filled in one session in 8% of the set-ups, and the chance that the very next session reaches the third falls from 23% to 7%; the 60-session result changed by +0.1 points (−0.1 to +0.5).
- **Measured with:** replay · arch
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Are the working orders at least one usual day apart? Two that are closer are one order — size them as one.

### 2. Sizes growing as price falls (18 / 22 / 27 / 37 shares)

- **What to do with it (7 Oct 2026):** **KEEP** — keep on the drafts as placed
- **Whose rule, and when:** Alan, 7 Oct 2026 ~01:45 ET: “I thought we said we would increase the quantities as price was lower to average our price down”
- **The evidence:** On the drafts it bought 0.4 points cheaper than equal quarters and changed the 60-session result by −0.5 points (−1.2 to 0.0). It turns costly only when the low rungs are far: on the 21 / 50 / 100-day ladder it changed the result by −1.4 points (−2.3 to −0.6), because the 100-day buy filled inside 60 sessions in 56% of Micron’s set-ups.
- **Measured with:** replay · bootstrap
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Is the lowest rung within reach (filled inside 20 sessions in at least half of the past set-ups)? If not, the weight on it is money that will not be in.

### 3. Wait for the levels instead of buying at the 21-day

- **What to do with it (7 Oct 2026):** **KEEP** — keep, knowing the price
- **Whose rule, and when:** Alan, 7 Oct 2026 ~01:45 ET: “three levels of orders, see if they fill, and we readjust them … a more persistent layer”
- **The evidence:** The four drafts against everything at the 21-day, Micron’s 48 set-ups: 2.3 points cheaper, 2.1 points less drawdown, 3.9 points less result at 60 sessions (−8.5 to −0.2). At least one draft filled inside 20 sessions in 92% of cases; in 6% none did inside 60 — the run-away case. Tonight’s readings favour waiting: in the 31 cases with the 50- and 100-day bunched as now, the fourth draft’s level was reached inside 20 sessions in 84%, and the middle case 60 sessions on was +1.8% for the drafts against −0.3% for everything at the 21-day.
- **Measured with:** replay · bootstrap
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** How much of the planned money is in if the stock turns up from the first level — and is that enough to live with if it runs?

### 4. The add-on stop: out on a daily close under the 100-day

- **What to do with it (7 Oct 2026):** **CHANGE** — keep it on the close · keep it off the buy line · candidate: a 3% band under the line
- **Whose rule, and when:** Alan, 7 Oct 2026 ~01:45 ET: “when the 100-day breaks, the thesis has to go away … we have to determine a process that works”
- **The evidence:** As it stands it changed the 60-session result by −2.5 points (−3.5 to −1.5) and the 120-session result by −6.4 (−8.4 to −4.5), for 5.2 points less drawdown inside 120 sessions, with 287 stops and 219 whipsaws per 100 cases. The 100-day buy was sold again inside five sessions in 86% of the cases where it filled. Requiring a close 3% or more under the line cut the whipsaws to 120 per 100 and changed the 120-session result by +0.7 points (+0.1 to +1.3); on Micron’s own set-ups +1.9 (+0.3 to +3.8). On Micron’s own 48 set-ups the stop as it stands changed the 60-session result by −1.6 (−3.8 to +0.6) for 5.3 points less drawdown. Tonight the stop line is 3.0% under the fourth draft; with Micron flat it is within 1% of it by 15 Oct 2026. Expect it to be used: in Micron’s 48 set-ups the close went under the 100-day inside 20 sessions in 40% and inside 60 in 54%.
- **Measured with:** replay · bootstrap
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Does the stop sit on a line where a buy order also sits? Is it judged on the close, with a band under the line?

### 5. Daily-close stops, not intraday prints

- **What to do with it (7 Oct 2026):** **KEEP** — keep
- **Whose rule, and when:** Agreed with Alan, 6–7 Oct 2026: “Daily-close stops, not intraday prints”
- **The evidence:** On 325 one-candle flushes through a rising 100-day the intraday stop sold 2.7% under that day’s close and the share ended −3.1% on average 60 sessions on, against −0.5% with the daily-close stop and +3.6% held. Over all 2,780 breaches the intraday stop traded 5.0 times a case against 2.7.
- **Measured with:** breach-day replay
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Is any stop in this plan a resting intraday order? If so, why here?

### 6. Buy back on a daily close above the 100-day

- **What to do with it (7 Oct 2026):** **KEEP** — keep — it is what makes a stop affordable
- **Whose rule, and when:** Measured with Alan, 7 Oct 2026: “a first close under a rising 100-day → buy back on a close above”
- **The evidence:** Micron: 31 first closes under a rising 100-day; 26 closed back over it inside 60 sessions (middle case: 1 session) and all 26 were bought back dearer than sold (+3.7% in the middle case). A stop with no way back did worse: the fixed stop changed the 120-session result by −12.0 points.
- **Measured with:** replay
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** What brings the position back after a stop? If nothing does, this is the fixed-stop case.

### 7. “A stop that kicks out the position but buys lower”

- **What to do with it (7 Oct 2026):** **CHANGE** — daily-close version only
- **Whose rule, and when:** Alan, 7 Oct 2026 ~01:45 ET: “a big drop on a candle down to another level — a stop loss that kicks away our existing position but executes buys lower — does that make sense or does it require too many ifs?”
- **The evidence:** One-candle version: the flush candle reached the lower buys 10% of the time. Daily-close version (out at the next open, three buys 5 / 6.5 / 8% under the line, buy back the rest on a close over it): the share ended +2.6% on average against +3.3% held; worst tenth −17.7% against −19.4%.
- **Measured with:** breach-day replay
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Is every step decided in the evening, on the close? A step that needs an intraday decision comes out.

### 8. Deep bid 5–8% under the 100-day, only with the VIX at 20 or more

- **What to do with it (7 Oct 2026):** **KEEP** — keep — the VIX test is a risk filter
- **Whose rule, and when:** Alan, 7 Oct 2026 ~01:45 ET: “if we get a 5 to 7% drop below the 100-day, that’d be pretty great … it would coincide with a broader pullback”
- **The evidence:** Added to the stop it made +2.6 points at 60 sessions (+1.4 to +4.1) and +7.2 at 120 (+4.6 to +9.6), and gave back 4.3 points of the stop’s drawdown protection (−5.7 to −2.9). At any VIX it earned about the same (−0.1, −0.9 to +0.6) with 1.2 points more drawdown (−2.0 to −0.5). Off today (VIX 15.01); the bids would sit at 912 to 883, 3.9–4.7 usual days away, reached inside 10 sessions 14% to 8% of the time.
- **Measured with:** replay · bootstrap · arch
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Did the VIX close at 20 or more tonight? If not, the deep bid stays off.

### 9. A fixed stop 13% under the first fill (the old 900)

- **What to do with it (7 Oct 2026):** **DROP** — drop
- **Whose rule, and when:** Alan, 7 Oct 2026 ~01:45 ET: “the stop at 900 seems very far away … why would I eat a 10% drop without doing anything”
- **The evidence:** Hit in 58% of 562 leader pullbacks and 42% of Micron’s 48 inside 120 sessions, with nothing bought back: −3.7 points at 60 sessions (−5.7 to −2.0), −12.0 at 120 (−16.7 to −7.7). The usual pullback is as deep as the stop: the deepest dip inside 60 sessions was −12.2% in the middle case.
- **Measured with:** replay · bootstrap
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Is the stop closer than the usual pullback? Then expect it to be hit about half the time, and decide what brings the position back.

### 10. Buy on a VIX spike above 20, with both hands above 23

- **What to do with it (7 Oct 2026):** **KEEP** — keep as the trigger for buying leaders — not as a market call
- **Whose rule, and when:** Alan, 7 Oct 2026 ~00:50 ET, corrected ~01:45 ET: “I’ll buy with both hands on a VIX spike above 23, and I would buy on a VIX spike above 20 … not meant to supersede anything the regime says”
- **The evidence:** For SPY the spike itself shows no edge: after 93 spikes above 20, −0.2 points at 60 sessions (−1.8 to +1.2); above 23 (71 spikes) −0.7 (−3.0 to +1.5). For leader pullbacks it does: the 213 that began with the VIX at 20 or more made 7.5 points more over 60 sessions than the 349 that did not (+0.7 to +15.0). The 20 and 23 lines still sit on the VIX’s 80th and 90th percentiles of the past year (19.9 and 23.6).
- **Measured with:** arch bootstrap · statsmodels
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Is this a leader pulling back with the VIX at 20 or more (the measured edge) — or a market call on the VIX alone (no measured edge)?

### 11. Credit under its 200-day is a caution

- **What to do with it (7 Oct 2026):** **KEEP** — keep — and it is on now
- **Whose rule, and when:** Read on 7 Oct 2026: “credit with payouts added back closed about 0.8% under its own 200-day”
- **The evidence:** With payouts added back, credit has been under its 200-day since 23 Sep 2026. SPY 60 sessions on: +0.9% against +3.1%, edge −2.2 points (−6.4 to +2.4), share higher 62% against 77%. Micron: +2.2% against +12.6%, edge −10.4 points (−20.3 to +0.3) — the nearest thing here to a proven rule, and it leans against Micron today.
- **Measured with:** arch bootstrap · statsmodels
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Is credit under its 200-day tonight? Then Micron’s own record is weaker: a smaller first size, or wait for a fear reading.

### 12. The 10-year, short clock: a stretched yield read contrarian

- **What to do with it (7 Oct 2026):** **CHANGE** — contrarian on the low side only
- **Whose rule, and when:** Alan, 7 Oct 2026 ~00:50 ET: “how do we make the 10-year yield vote as a contrarian now, but if it pulls back, go back to being a little negative longer term?”
- **The evidence:** Yield washed out (bottom fifth of its year): SPY +1.0 points at 60 sessions (−0.6 to +2.4), share higher +9 points (+1 to +17). Yield stretched high, as now (RSI in the top 6% of its year): −0.7 (−2.2 to +0.8) — not a plus.
- **Measured with:** arch bootstrap · statsmodels
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Which side is the stretch on? Only a washed-out yield counts as a plus.

### 13. The 10-year, long clock: yield above its 200-day is a mild negative

- **What to do with it (7 Oct 2026):** **KEEP** — keep as backdrop, with no say in a panic
- **Whose rule, and when:** Alan, 7 Oct 2026 ~00:50 ET: “… go back to being a little negative longer term”
- **The evidence:** SPY after evenings with the yield above its 200-day (as now: 5.27% against 4.46%): −0.7 points at 60 sessions (−2.4 to +1.0), −0.9 at 120 (−3.9 to +2.1).
- **Measured with:** arch bootstrap · statsmodels
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Is it used as backdrop only — never as a reason to hold back in a panic?

### 14. Extremes read contrarian (a rush to safety is fear, and fear is where stocks get bought)

- **What to do with it (7 Oct 2026):** **KEEP** — keep for the VIX, long bonds and gold · drop oil from the list
- **Whose rule, and when:** Alan, 7 Oct 2026 ~01:45 ET: “the extremes of things … reading those kinds of things at extremes should be a contrarian thing”
- **The evidence:** SPY 20 sessions on — rush into long bonds +0.6 points (−0.4 to +1.5), share higher +11 (+1 to +19); gold +0.6 (−0.1 to +1.4); VIX in the top tenth of its year +0.6 (−1.0 to +2.0); two or more at once +0.8 (−0.5 to +2.0). Oil dumped has the wrong sign: −1.7 at 60 sessions (−4.9 to +0.7).
- **Measured with:** arch bootstrap · statsmodels
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Is the extreme in the VIX, long bonds or gold? Oil does not count.

### 15. “If it reaches the 21-day, that’s safe”

- **What to do with it (7 Oct 2026):** **CHANGE** — expect the 50-day
- **Whose rule, and when:** Alan, 6 Oct 2026: “if it reaches a 21-day moving average, I feel like that’s safe — check against those rebounds”
- **The evidence:** 18% of 562 leader pullbacks held the 21-day for 10 sessions; 61% touched the 50-day inside 20 and 23% the 100-day. With the 50- and 100-day bunched like Micron’s (31 cases): 90% and 55%.
- **Measured with:** leader comparison
- **Last measured:** 7 Oct 2026, bars through 6 Oct 2026
- **Check a new decision against it:** Is there an order — and money — for the 50-day, where three in five of these go?

## Standing rules this study did not measure

- **Micron’s size:** 20% of the account at full build; up to 30% only when market fear lifts the % invested; Micron = 0.4 × % invested, capped at 30% (Alan, 6–7 Oct 2026: “leave that as the for-now rule and we monitor”). Measured by the study of how much to have invested, not here.
- **The order drafts:** the drafts are prepared; Alan submits. Never a live order from Claude.
- **The comps flag:** Micron trades near 6.0 times next year’s earnings against SK hynix 3.6, Samsung 3.9 and Kioxia 3.7 — the upside holds only against US peers (from the comps work, 7 Oct 2026).
- **Line names:** every line is named as the Lab’s chart labels it — source timeframe plus id (3D P1, 2W D3, 3D P3, 1D D3, 3D C3) — never a bare “P1”.

## How to measure again

```
python study/pb2/tools/pull_bars.py --refresh     # daily bars from the chart API (read-only)
python study/pb2/tools/build.py                  # cases, the replay, the stops, the open-source review
python study/pb2/tools/critique.py <label>=<gguf> # the local model critique (optional)
python study/pb2/tools/build.py merge && python study/pb2/tools/build_page.py
node --test tests/pb2.test.mjs
```

Needs Python 3.11 with `study/pb2/tools/requirements.txt`. Nothing in it writes a table, places an order or reads a key.
