#!/usr/bin/env python3
"""PB2 · the playbook: one file of the rules as they stand, each with its evidence and the date it was last measured, so a
new decision can be checked against it. Written by build_page.py from the same sheet the page shows."""
import re
from pagelib import day, pct, sh, usd

WHO = {
    "three_orders": ("Alan, 7 Oct 2026 ~01:45 ET", "I would keep a few at a time … a massive falling knife would execute all of it … making things a little bit more mechanical will be good"),
    "bigger_lower": ("Alan, 7 Oct 2026 ~01:45 ET", "I thought we said we would increase the quantities as price was lower to average our price down"),
    "wait_for_levels": ("Alan, 7 Oct 2026 ~01:45 ET", "three levels of orders, see if they fill, and we readjust them … a more persistent layer"),
    "stop_100_close": ("Alan, 7 Oct 2026 ~01:45 ET", "when the 100-day breaks, the thesis has to go away … we have to determine a process that works"),
    "daily_not_intraday": ("Agreed with Alan, 6–7 Oct 2026", "Daily-close stops, not intraday prints"),
    "buy_back": ("The coordinator’s measurement, 7 Oct 2026", "a first close under a rising 100-day → buy back on a close above"),
    "kick_out_buy_lower": ("Alan, 7 Oct 2026 ~01:45 ET", "a big drop on a candle down to another level — a stop loss that kicks away our existing position but executes buys lower — does that make sense or does it require too many ifs?"),
    "deep_bid_vix": ("Alan, 7 Oct 2026 ~01:45 ET", "if we get a 5 to 7% drop below the 100-day, that’d be pretty great … it would coincide with a broader pullback"),
    "fixed_13": ("Alan, 7 Oct 2026 ~01:45 ET", "the stop at 900 seems very far away … why would I eat a 10% drop without doing anything"),
    "vix_rule": ("Alan, 7 Oct 2026 ~00:50 ET, corrected ~01:45 ET", "I’ll buy with both hands on a VIX spike above 23, and I would buy on a VIX spike above 20 … not meant to supersede anything the regime says"),
    "credit_200": ("The coordinator’s reading, 7 Oct 2026", "credit with payouts added back closed about 0.8% under its own 200-day"),
    "ten_short": ("Alan, 7 Oct 2026 ~00:50 ET", "how do we make the 10-year yield vote as a contrarian now, but if it pulls back, go back to being a little negative longer term?"),
    "ten_long": ("Alan, 7 Oct 2026 ~00:50 ET", "… go back to being a little negative longer term"),
    "extremes": ("Alan, 7 Oct 2026 ~01:45 ET", "the extremes of things … reading those kinds of things at extremes should be a contrarian thing"),
    "twentyone_safe": ("Alan, 6 Oct 2026", "if it reaches a 21-day moving average, I feel like that’s safe — check against those rebounds"),
}
CHECK = {
    "three_orders": "Are the working orders at least one usual day apart? Two that are closer are one order — size them as one.",
    "bigger_lower": "Is the lowest rung within reach (filled inside 20 sessions in at least half of the past set-ups)? If not, the weight on it is money that will not be in.",
    "wait_for_levels": "How much of the planned money is in if the stock turns up from the first level — and is that enough to live with if it runs?",
    "stop_100_close": "Does the stop sit on a line where a buy order also sits? Is it judged on the close, with a band under the line?",
    "daily_not_intraday": "Is any stop in this plan a resting intraday order? If so, why here?",
    "buy_back": "What brings the position back after a stop? If nothing does, this is the fixed-stop case.",
    "kick_out_buy_lower": "Is every step decided in the evening, on the close? A step that needs an intraday decision comes out.",
    "deep_bid_vix": "Did the VIX close at 20 or more tonight? If not, the deep bid stays off.",
    "fixed_13": "Is the stop closer than the usual pullback? Then expect it to be hit about half the time, and decide what brings the position back.",
    "vix_rule": "Is this a leader pulling back with the VIX at 20 or more (the measured edge) — or a market call on the VIX alone (no measured edge)?",
    "credit_200": "Is credit under its 200-day tonight? Then Micron’s own record is weaker: a smaller first size, or wait for a fear reading.",
    "ten_short": "Which side is the stretch on? Only a washed-out yield counts as a plus.",
    "ten_long": "Is it used as backdrop only — never as a reason to hold back in a panic?",
    "extremes": "Is the extreme in the VIX, long bonds or gold? Oil does not count.",
    "twentyone_safe": "Is there an order — and money — for the 50-day, where three in five of these go?",
}


def plain(s): return re.sub(r"<[^>]+>", "", s)


def build(P, rows):
    C = P["cases"]; T = C["today_mu"]; MR = P["review"]["market_rules"]; REG = P["review"]["regimes"]; RG = P["review"]["range"]; w = C["wide"]; b = C["wide_bunched_flag"]; m = C["micron_own"]
    thr = day(P["bars"]["through"]); L = []
    L += ["# The playbook — the rules as they stand", "",
          f"Last measured **7 Oct 2026**, on daily bars through **{thr}**. Built by `study/pb2/tools/build_page.py` from `study/pb2/data/pb2.json`; the study page beside this file (`PB2.html`) shows the same numbers with their pictures.", "",
          "**How to use it.** Before a new decision, find the rules it touches. Read what to do with each and the number behind it, then answer its check question. If the decision breaks a rule, say which one and why. A rule changes only when it is measured again — the date on it changes with it.", "",
          "Intervals are 95% intervals. “Points” are points of return. “Planned money” is the full position the plan intends (for Micron, about 20% of the account).", "",
          "## Tonight’s readings", "",
          f"| | {thr} |", "|---|---|",
          f"| Micron | close {usd(T['close'])} · 21-day {usd(T['ma21'])} · 50-day {usd(T['ma50'])} · 100-day {usd(T['ma100'])} · 200-day {usd(T['ma200'])} · {pct(T['off_high'])} from its high of {usd(T['high252'])} ({day(T['high252_date'])}) |",
          f"| Does today meet the leader-pullback rule? | {'yes' if T['leader'] else 'no'} — and the 50- and 100-day are {'bunched (within 3%)' if T['bunched'] else 'not bunched'} |",
          f"| The drafts | 18 @ 1,036.13 (3D P1) · 22 @ 1,030.40 (21-day + 2W D3) · 27 @ 1,011.77 (3D P3) · then 37 @ 989.17 (1D D3 + 3D C3) after a fill |",
          f"| Micron’s usual day | {RG['expected_range_pct']:.1f}% — about ${RG['expected_range_usd']:.0f} (volatility model: {RG['sigma1_pct']:.1f}% a day, the year’s middle {RG['sigma1_year_median']:.1f}%) |",
          f"| VIX | {MR['today']['vix']:.2f} — its past year: 80th percentile {MR['vix_year']['80']:.1f}, 90th {MR['vix_year']['90']:.1f} |",
          f"| Credit (HYG with payouts) | {'UNDER' if MR['today']['credit_under'] else 'over'} its 200-day ({MR['today']['hyg']:.2f} against {MR['today']['hyg200']:.2f}), since {day(MR['today']['credit_under_since'])} |",
          f"| 10-year yield | {MR['today']['ten']:.2f}% · above its 200-day ({MR['today']['ten200']:.2f}%) · RSI in the top {100 - MR['today']['ten_rsi_pct']:.0f}% of its year |",
          f"| Market regime (hidden-Markov model) | {REG['today']['state']} ({sh(REG['today']['prob'][REG['today']['state']])}), since {day(REG['today']['in_state_since'])} |",
          f"| Sector | SMH {pct(T['fund_off_high'])} from its high; Micron {pct(T['rel20'])} against SMH over 20 sessions |", "",
          "## The base rates to quote", "",
          f"- **Leader pullbacks** ({w['n']} cases, {C['counts']['names_with_cases']} stocks, since 2003): {sh(w['held21_10'])} held the 21-day for 10 sessions · {sh(w['t50_20'])} touched the 50-day inside 20 sessions · {sh(w['t100_20'])} the 100-day · deepest dip {pct(w['dd20_med'])} inside 20 sessions and {pct(w['dd60_med'])} inside 60 (middle case) · 60 sessions on {pct(w['r60_med'])}, higher in {sh(w['r60_pos'])} · new 52-week high inside 60 sessions {sh(w['nh60'])}.",
          f"- **With the 50- and 100-day bunched** ({b['n']} cases — thin): {sh(b['t50_20'])} touched the 50-day inside 20 sessions · {sh(b['t100_20'])} the 100-day · 60 sessions on {pct(b['r60_med'])}, higher in {sh(b['r60_pos'])}.",
          f"- **Micron’s own set-ups** ({m['n']} cases): deepest dip {pct(m['dd20_med'])} inside 20 sessions · 60 sessions on {pct(m['r60_med'])}, higher in {sh(m['r60_pos'])}.", "",
          "## The rules", ""]
    for i, r in enumerate(rows, 1):
        who, quote = WHO.get(r["id"], ("", ""))
        L += [f"### {i}. {plain(r['rule'])}", "",
              f"- **What to do with it (7 Oct 2026):** **{r['verdict'].upper()}** — {plain(r['change'])}",
              f"- **Whose rule, and when:** {who}: “{quote}”",
              f"- **The evidence:** {plain(r['number'])}",
              f"- **Measured with:** {plain(r['tool'])}",
              f"- **Last measured:** 7 Oct 2026, bars through {thr}",
              f"- **Check a new decision against it:** {CHECK.get(r['id'], '')}", ""]
    L += ["## Standing rules this study did not measure", "",
          "- **Micron’s size:** 20% of the account at full build; up to 30% only when market fear lifts the % invested; Micron = 0.4 × % invested, capped at 30% (Alan, 6–7 Oct 2026: “leave that as the for-now rule and we monitor”). Measured by the deployment study, not here.",
          "- **The order drafts:** the drafts are prepared; Alan submits. Never a live order from the coordinator or a helper.",
          "- **The comps flag:** Micron trades near 6.0 times next year’s earnings against SK hynix 3.6, Samsung 3.9 and Kioxia 3.7 — the upside holds only against US peers (from the comps work, 7 Oct 2026).",
          "- **Line names:** every line is named as the Lab’s chart labels it — source timeframe plus id (3D P1, 2W D3, 3D P3, 1D D3, 3D C3) — never a bare “P1”.", "",
          "## How to measure again", "",
          "```", "python study/pb2/tools/pull_bars.py --refresh     # daily bars from the chart API (read-only)", "python study/pb2/tools/build.py                  # cases, the replay, the stops, the open-source review",
          "python study/pb2/tools/critique.py <label>=<gguf> # the local model critique (optional)", "python study/pb2/tools/build.py merge && python study/pb2/tools/build_page.py", "node --test tests/pb2.test.mjs", "```", "",
          "Needs Python 3.11 with `study/pb2/tools/requirements.txt`. Nothing in it writes a table, places an order or reads a key.", ""]
    return "\n".join(L)
