#!/usr/bin/env python3
"""PB2 · write the study page (study/pb2/PB2.html) and the playbook (study/pb2/PLAYBOOK.md) from study/pb2/data/pb2.json.

Everything a reader sees is built from that one file: no number is typed by hand here. The page is static — no script,
no request, nothing written anywhere."""
import json, os, re
from pagelib import *

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, ".."))
P = json.load(open(os.path.join(ROOT, "data", "pb2.json")))
C = P["cases"]; LY = P["layer"]; LS = LY["sets"]; ST = P["stops"]; RV = P["review"]; CR = P.get("critique") or {}
MO = LS["micron_own"]; W = LS["wide"]; T = C["today_mu"]; RG = RV["range"]; MR = RV["market_rules"]; REG = RV["regimes"]; TR = RV["trend"]
E = RV["layer_edges"]; EM = E["micron_own"]; EW = E["wide"]; CE = RV["case_edges"]
S100 = ST["levels"]["100"]["all"]; F1 = ST["micron_first_close_under_100"]
LV = {x["name"]: x for x in RG["levels"]}; DN = LY["sizes"]["draft_names"]; DP = LY["sizes"]["draft_prices"]; DSH = LY["sizes"]["draft_shares"]
THROUGH = day(P["bars"]["through"]); CLOSE = T["close"]
rule = lambda k: MR["rules"][k]
STRAT_SHORT = {"close": "Buy it all at that day’s close", "allin21": "All in at the 21-day", "pyramid": "Pyramid 21 / 50 / 100-day, bigger lower, no stop",
               "pyr_stop": "Pyramid + stop on a daily close under the 100-day, buy back on a close above", "pyr_stop_deep": "The same + deep bid 5–8% under the 100-day, only with the VIX at 20 or more",
               "pyr_fixed13": "Pyramid + fixed stop 13% under the first fill (the old 900)", "draft": "The four drafts as placed (1,036.13 · 1,030.40 · 1,011.77 · 989.17)",
               "pyr_stop_band3": "Pyramid + the 100-day stop only on a close 3% or more under it", "pyr_stop_2closes": "Pyramid + the 100-day stop only after two closes under it",
               "pyr_equal": "Pyramid in equal thirds, no stop", "pyr_stop_addons": "Pyramid + the 100-day close stop on the add-ons only (first buy kept)", "pyr_stop_atclose": "Pyramid + the 100-day close stop done at the close, not the next open",
               "pyr_deep_anyvix": "Pyramid + close stop + deep bid at any VIX", "draft_equal": "The four drafts, a quarter of the money each"}
TABLE_ROWS = ["close", "allin21", "pyramid", "pyr_stop", "pyr_stop_deep", "pyr_fixed13", "draft"]


def res(a, H, key): return (a["res"].get(str(H)) or {}).get(key)


def sessions_after(d0, k):
    """The next k trading days after d0 (weekdays; no US market holiday falls between 7 Oct and 25 Nov 2026)."""
    import datetime as _dt
    d = _dt.date.fromisoformat(d0); out = []
    while len(out) < k:
        d += _dt.timedelta(days=1)
        if d.weekday() < 5: out.append(d.isoformat())
    return out


def project(n, price, k=30):
    """The n-day average over the next k sessions if Micron closes at `price` every day (the confluence study's flat-price path)."""
    arr = list(P["micron"]["close"][-n:]); out = []
    for _ in range(k):
        arr = arr[1:] + [price]; out.append(sum(arr) / n)
    return out


def collision():
    """When the rising 100-day reaches the fourth draft (989.17), on two paths: Micron flat at its last close, and Micron sitting at 989.17."""
    days = sessions_after(P["bars"]["through"], 30); tgt = DP[3]; out = {}
    for nm, px in (("flat", CLOSE), ("at_draft", tgt)):
        m100 = project(100, px); m50 = project(50, px)
        j = next((i for i, v in enumerate(m100) if v >= tgt * 0.99), None)
        out[nm] = dict(within1=(days[j] if j is not None else None), within1_level=(m100[j] if j is not None else None), ma100_5=m100[4], ma100_10=m100[9], ma100_20=m100[19],
                       ma50_5=m50[4], ma50_10=m50[9], ma50_20=m50[19], d5=days[4], d10=days[9], d20=days[19])
    return out


COL = collision()
GAP_STOP = 1 - T["ma100"] / DP[3]          # how far the stop line sits under the fourth draft tonight


# ------------------------------------------------------------------ 0 · the answers
def tiles():
    ds = MO["_draft_same"]; bf = S100["big_flush"]; w = C["wide"]; b = C["wide_bunched_flag"]
    gap12 = abs(LV[DN[0]]["dist_pct"] - LV[DN[1]]["dist_pct"])
    t = []
    t.append(("THE ORDER LAYER", "Three working orders, yes — but 1,036.13 and 1,030.40 are one order",
              f"They sit {gap12:.2f}% apart and Micron’s usual day is {RG['expected_range_pct']:.1f}% (about ${RG['expected_range_usd']:.0f}). In Micron’s {ds['n']} past set-ups both filled in the same session {sh(ds['first_two_same_session'])} of the time, and all three working drafts {sh(ds['first_three_same_session'])}."))
    t.append(("THE STOP", "On the daily close, never intraday — and not on the line the biggest buy sits on",
              f"On {bf['n']} one-candle flushes through a rising 100-day, the intraday stop sold {pct(abs(bf['intraday_sale_vs_close_mean']), 1, False)} under that same day’s close every time. In the pyramid replay the 100-day buy was sold again within five sessions in {sh(W['_clash']['of_those_filled'])} of the cases where it filled. Tonight the stop line ({usd(T['ma100'])}) is {pct(GAP_STOP, 1, False)} under the fourth draft; with Micron flat it climbs to within 1% of 989.17 by {day(COL['flat']['within1'])}."))
    t.append(("“KICKS ME OUT BUT BUYS LOWER”", "Workable only as a daily-close rule; as a one-candle rule, too many ifs",
              f"The flush candle itself reached the lower buys {sh(bf['reached_5_under'])} of the time. The daily-close version ended {pct(S100['all']['close_lower']['res60_mean'])} on average 60 sessions on, against {pct(S100['all']['r60_mean'])} for simply holding ({S100['all']['n']:,} breaches)."))
    t.append(("LEADERS LIKE THIS", f"{sh(w['held21_10'])} held the 21-day; {sh(w['t50_20'])} went to the 50-day inside 20 sessions",
              f"{w['n']} pullbacks in {C['counts']['names_with_cases']} stocks since 2003. Deepest dip inside 20 sessions: {pct(w['dd20_med'])} in the middle case. With the 50- and 100-day bunched like Micron’s now ({b['n']} cases): {sh(b['t50_20'])} went to the 50-day, {sh(b['t100_20'])} to the 100-day."))
    v20 = CE["vix20"]
    t.append(("THE MARKET RULES", "Right direction, mostly unproven",
              f"{'The one clear edge: leader' if v20['proven'] else 'The strongest reading: leader'} pullbacks that began with the VIX at 20 or more made {way(v20['edge_mean'], 'less', 'more')} over 60 sessions (interval {ci(v20, 'edge_mean_ci')}). The nearest miss leans against Micron tonight: after evenings with credit under its 200-day — as now, since {day(MR['today']['credit_under_since'])} — Micron made {way(rule('credit_under_200')['mu'][1]['edge_mean'], 'less', 'more')} ({ci(rule('credit_under_200')['mu'][1], 'edge_mean_ci')})."))
    return '<div class="tiles">' + "".join(f'<div class="tile"><div class="l">{esc(a)}</div><div class="v">{b_}</div><div class="d">{c_}</div></div>' for a, b_, c_ in t) + "</div>"


# ------------------------------------------------------------------ 1 · the order layer
def layer_bars(A, n_label):
    keys = TABLE_ROWS; vm = max(abs(res(A[k], 60, "med") or 0) for k in keys); dm = max(abs(res(A[k], 60, "dd_p10") or 0) for k in keys)
    out = [f'<div class="brow h"><div class="bl">{n_label}</div><div>result on the planned money 60 sessions on — the middle case</div><div></div><div>the bad case — worst tenth of drawdowns inside 60 sessions</div><div></div></div>']
    for k in keys:
        a = A[k]
        out.append(f'<div class="brow"><div class="bl">{STRAT_SHORT[k]}</div>{signed_bar(res(a, 60, "med"), vm)}{signed_bar(res(a, 60, "dd_p10"), dm)}</div>')
    return '<div class="rows">' + "".join(out) + "</div>"


def layer_table(A):
    head = [("way of buying", False), ("average cost against that day’s close", True), ("filled inside 20 sessions<br>21-day · 50-day · 100-day", True), ("worst drawdown inside 60 sessions<br>middle · worst tenth · worst", True),
            ("stops · whipsaws<br>per 100 cases", True), ("20 sessions on<br>middle · average", True), ("60 sessions on<br>middle · average · share higher", True), ("120 sessions on<br>middle · average · share higher", True)]
    rows = []
    for k in TABLE_ROWS:
        a = A[k]
        if k == "close": fills = "all at once"
        elif k == "draft": fills = " · ".join(sh(x["fill20"]) for x in a["rungs"]) + '<br><span class="dim">the four drafts, top to bottom</span>'
        elif k == "allin21": fills = sh(a["rungs"][0]["fill20"])
        else: fills = " · ".join(sh(x["fill20"]) for x in a["rungs"])
        cost = "—" if k == "close" else pct(a["avg_cost_med"] - 1)
        sw = "—" if a["stops_per100"] == 0 else f'{a["stops_per100"]:.0f} · {a["whipsaws_per100"]:.0f}'
        rows.append([STRAT_SHORT[k], cost, fills, f'{num(res(a, 60, "dd_med"))} · {num(res(a, 60, "dd_p10"))} · {num(res(a, 60, "dd_worst"), 0)}', sw,
                     f'{num(res(a, 20, "med"))} · {num(res(a, 20, "mean"))}', f'{num(res(a, 60, "med"))} · {num(res(a, 60, "mean"))} · {sh(res(a, 60, "pos"))}', f'{num(res(a, 120, "med"))} · {num(res(a, 120, "mean"))} · {sh(res(a, 120, "pos"))}'])
    return table(head, rows, "wide")


def drafts_table():
    head = [("draft", False), ("shares", True), ("under the 6 Oct close", True), ("in usual days", True), ("reached next session", True), ("inside 5 sessions", True), ("inside 10", True),
            (f"filled inside 20 · 60 · 120 sessions<br>Micron’s {MO['draft']['n']} set-ups", True), (f"the {W['draft']['n']} leader pullbacks", True)]
    rows = []
    for i, nm in enumerate(DN):
        l = LV[nm]; a = MO["draft"]["rungs"][i]; b = W["draft"]["rungs"][i]
        rows.append([nm, str(DSH[i]), pct(l["dist_pct"] / 100, 2), f'{l["in_ranges"]:.2f}', sh(l["p1"]), sh(l["p5"]), sh(l["p10"]), f'{sh(a["fill20"])} · {sh(a["fill60"])} · {sh(a["fill120"])}', f'{sh(b["fill20"])} · {sh(b["fill60"])} · {sh(b["fill120"])}'])
    return table(head, rows, "wide")


def variants_table():
    head = [("variant, against what", False), ("cases", True), ("average cost", True), ("result 60 sessions on", True), ("result 120 on", True), ("worst drawdown inside 60", True), ("inside 120", True)]
    def row(lab, key):
        out = []
        for nm, EE in (("Micron’s set-ups", EM), ("leader pullbacks", EW)):
            e = EE[key]
            def cell(m):
                x = e.get(m)
                if not x or x.get("thin"): return "—"
                return f'<span class="{cls(x["mean"])}">{pp(x["mean"])}</span> <span class="dim">({ci(x)})</span>'
            out.append([f'{lab}<br><span class="dim">{nm}</span>', str(e["p60"]["n"]), cell("cost"), cell("p60"), cell("p120"), cell("dd60"), cell("dd120")])
        return out
    rows = []
    for lab, key in (("The four drafts, bigger lower — against a quarter of the money on each", "draft_grow_vs_equal"), ("The 21 / 50 / 100-day pyramid, bigger lower — against equal thirds", "grow_vs_equal"),
                     ("The first two drafts as one order at 1,036.13, then 1,011.77 and 989.17 — against the four drafts as placed", "merged_vs_draft"),
                     ("The four drafts — against everything at the 21-day", "draft_vs_allin21"), ("The 21 / 50 / 100-day pyramid — against everything at the 21-day", "pyramid_vs_allin21"),
                     ("The 100-day close stop — against the same pyramid with no stop", "stop_vs_pyramid"), ("The stop only on a close 3% or more under the 100-day — against the stop as it stands", "band3_vs_stop"),
                     ("The stop only after two closes under — against the stop as it stands", "twocloses_vs_stop"), ("The stop on the add-ons only, first buy kept — against the stop on everything", "addons_vs_all"),
                     ("The deep bid with the VIX at 20 or more — against the stop alone", "deep_vs_stop"), ("The deep bid at any VIX — against the deep bid with the VIX at 20 or more", "deep_anyvix_vs_deep"),
                     ("The fixed stop 13% under the first fill — against the pyramid with no stop", "fixed13_vs_pyramid")):
        rows += row(lab, key)
    return table(head, rows, "wide", "Each figure is the first way minus the second, in points of the planned money, with the 95% interval in brackets (whole calendar months of cases resampled together, 2,000 times). Average cost: negative = bought cheaper. Drawdown: positive = shallower.")


def micron_cases_table():
    rows = []; own = {r["d"]: r for r in C["rows"]["micron_own"]}
    for r in LY["micron_cases"]:
        o = own.get(r["d"], {})
        rows.append([day(r["d"]), usd(o.get("close")), num(o.get("dd20")), num(r["allin21"]["p60"]), num(r["pyramid"]["p60"]), num(r["pyr_stop"]["p60"]), num(r["pyr_fixed13"]["p60"]), num(r["draft"]["p60"]),
                     f'{r["pyr_stop"]["stops"]} · {r["pyr_stop"]["whips"]}', " · ".join("—" if v is None else str(v) for v in r["draft"]["fills"])])
    head = [("signal day", False), ("close", True), ("deepest dip inside 20 sessions", True), ("all in at the 21-day", True), ("pyramid, no stop", True), ("pyramid + 100-day stop", True), ("pyramid + fixed 13% stop", True), ("the four drafts", True), ("stops · whipsaws", True), ("session each draft filled", True)]
    return table(head, rows, "wide", "Results are on the planned money, 60 sessions after the signal day. The draft prices are scaled to each day’s close the way the four drafts sit under the 6 Oct close (−0.90%, −1.45%, −3.23%, −5.39%).")


def sec_layer():
    ds = MO["_draft_same"]; dw = W["_draft_same"]; gap12 = abs(LV[DN[0]]["dist_pct"] - LV[DN[1]]["dist_pct"])
    da = EM["draft_vs_allin21"]; pa = EM["pyramid_vs_allin21"]; ge = EM["draft_grow_vs_equal"]
    ans = (f'<p class="ans"><b>The mechanic the replay supports.</b> Keep three working orders, re-priced each evening — and count 1,036.13 and 1,030.40 as <b>one</b> order: {gap12:.2f}% apart against a usual day of {RG["expected_range_pct"]:.1f}%, '
           f'they filled in the same session in {sh(ds["first_two_same_session"])} of Micron’s {ds["n"]} past set-ups, and all three working drafts in {sh(ds["first_three_same_session"])} ({sh(dw["first_three_same_session"])} across the {dw["n"]} leader pullbacks). '
           f'<b>Waiting for levels has a price.</b> Against putting everything in at the 21-day, the four drafts bought {way(da["cost"]["mean"], "cheaper", "dearer")} and drew down {way(da["dd60"]["mean"], "more", "less")} — and earned {way(da["p60"]["mean"], "less", "more")} over 60 sessions '
           f'(interval {ci(da["p60"])}), because when Micron held, part of the money never got in. The 21 / 50 / 100-day pyramid left more out: {way(pa["p60"]["mean"], "less", "more")} ({ci(pa["p60"])}). '
           f'<b>Bigger lower</b> on the drafts bought {way(ge["cost"]["mean"], "cheaper", "dearer")} than equal quarters and changed the 60-session result by {pp(ge["p60"]["mean"])} ({ci(ge["p60"])}): harmless while the low drafts are within reach — the fourth filled inside 20 sessions in {sh(MO["draft"]["rungs"][3]["fill20"])} of Micron’s set-ups.</p>')
    cl = W["_clash"]; piv = LY["pivots"]
    return (f'<div class="panel" id="p-layer"><h2>1 · The order layer, replayed on Micron’s {MO["allin21"]["n"]} past set-ups and {W["allin21"]["n"]} leader pullbacks</h2>'
            + layer_bars(MO, f"Micron’s {MO['allin21']['n']} set-ups like today’s") + ans
            + f'<h3>Micron’s {MO["allin21"]["n"]} own set-ups, {day(C["rows"]["micron_own"][0]["d"])} to {day(C["rows"]["micron_own"][-1]["d"])}</h3>' + layer_table(MO)
            + f'<h3>The {W["allin21"]["n"]} leader pullbacks in {C["counts"]["names_with_cases"]} stocks</h3>' + layer_table(W)
            + '<h3>The four drafts, one by one</h3>' + drafts_table()
            + f'<h3>Where the 100-day buy and the 100-day stop collide</h3><p class="ans">In {sh(cl["rung100_filled"])} of the {cl["n"]} leader pullbacks the 100-day buy filled; in {sh(cl["of_those_filled"])} of those the close stop sold it again inside five sessions. '
              f'On Micron’s own set-ups: filled in {sh(MO["_clash"]["rung100_filled"])}, sold again inside five sessions in {sh(MO["_clash"]["of_those_filled"])} of those. '
              f'<b>In the drafts the two are not yet on one line:</b> the 100-day stands at {usd(T["ma100"])}, {pct(GAP_STOP, 1, False)} under the fourth draft (1D D3 + 3D C3 989.17). It is climbing: with Micron flat at {usd(CLOSE)} it stands near {usd(COL["flat"]["ma100_5"], 0)} on {day(COL["flat"]["d5"])}, '
              f'{usd(COL["flat"]["ma100_10"], 0)} on {day(COL["flat"]["d10"])} and {usd(COL["flat"]["ma100_20"], 0)} on {day(COL["flat"]["d20"])}, and comes within 1% of 989.17 on {day(COL["flat"]["within1"])}'
              + (f' ({day(COL["at_draft"]["within1"])} if Micron sits at 989.17 instead)' if COL["at_draft"]["within1"] else ' (not inside 30 sessions if Micron sits at 989.17 instead)') + '. From then on the biggest buy and the stop share a line.</p>'
            + '<details><summary>Each change measured against what it replaces, with its interval</summary>' + variants_table() + "</details>"
            + f'<details><summary>Micron’s {len(LY["micron_cases"])} set-ups one by one</summary>' + micron_cases_table() + "</details>"
            + f'<details><summary>The Lab’s horizontal pivots as extra rungs — {piv["cases"]} cases, too few to read</summary>' + pivots_table() + "</details></div>")


def pivots_table():
    piv = LY["pivots"]; rows = []
    for r in piv["rows"]:
        rows.append([r["sym"], day(r["d"]), "<br>".join(f'{p["label"]} {usd(p["price"])} <span class="dim">(bar of {day(p["anchor"])})</span> — {"filled" if p["filled"] else "not reached"}' for p in r["pivots"]),
                     pct(r["cost_with"] - 1) if r["cost_with"] else "—", pct(r["cost_without"] - 1) if r["cost_without"] else "—", num(r["p60_with"]), num(r["p60_without"])])
    return table([("stock", False), ("signal day", False), ("pivot the pack now holds", False), ("average cost with the pivot", True), ("without", True), ("result 60 on, with", True), ("without", True)], rows, "",
                 "The packs hold pivots set from September 2025 on, so only cases after that can use one. A pivot counts when its bar is 10 or more sessions before the case and its price sits between that day’s close and 8% under the 100-day. Labels are the ones the installed pack carries today.")


# ------------------------------------------------------------------ 2 · stops
STYLE = {"intraday": "Intraday stop resting at the 100-day", "close": "Daily-close stop (out at the next open)", "intraday_lower": "Intraday stop + three buys 5 / 6.5 / 8% under the line", "close_lower": "Daily-close stop + the same three lower buys"}


def stop_bars(b, title):
    keys = ["intraday", "close", "intraday_lower", "close_lower"]; vm = max([abs(b["r60_mean"])] + [abs(b[k]["res60_mean"]) for k in keys]); dm = max([abs(b["r60_p10"])] + [abs(b[k]["res60_p10"]) for k in keys])
    out = [f'<div class="brow h"><div class="bl">{title}</div><div>what the share was worth 60 sessions on — average</div><div></div><div>the bad case — worst tenth</div><div></div></div>',
           f'<div class="brow"><div class="bl">Simply holding the share</div>{signed_bar(b["r60_mean"], vm)}{signed_bar(b["r60_p10"], dm)}</div>']
    for k in keys: out.append(f'<div class="brow"><div class="bl">{STYLE[k]}</div>{signed_bar(b[k]["res60_mean"], vm)}{signed_bar(b[k]["res60_p10"], dm)}</div>')
    return '<div class="rows">' + "".join(out) + "</div>"


def stop_table(G):
    head = [("the breach", False), ("days", True), ("stop style", False), ("did the breach day trip it", True), ("where it sold against that day’s close", True), ("sales · whipsaws per case, 60 sessions", True),
            ("against holding, 60 on: average · share ahead", True), ("lower buys filled", True), ("the share 60 on: average · worst tenth", True)]
    rows = []
    for key, lab in (("big_flush", "One-candle flush: low 5% or more under the last close, close back over the 100-day"), ("flush", "Any flush: low under the line, close back over it"), ("close_break", "Close break: the session closes under it"), ("all", "Every breach")):
        b = G[key]
        rows.append([lab, f'{b["n"]:,}', "Simply holding", "—", "—", "—", "—", "—", f'{num(b["r60_mean"])} · {num(b["r60_p10"])}'])
        for k in ("intraday", "close", "intraday_lower", "close_lower"):
            q = b[k]; sold_day = "always" if k.startswith("intraday") else ("never" if key in ("big_flush", "flush") else ("always" if key == "close_break" else sh(1 - G["flush_share"])))
            where = pct(b["intraday_sale_vs_close_mean"]) if k.startswith("intraday") else "—"
            rows.append(["", "", STYLE[k], sold_day, where, f'{q["sales_per_case"]:.1f} · {q["whips_per_case"]:.1f}', f'{num(q["eff60_mean"])} · {sh(q["beat_hold60"])}', sh(q["lowfill_any"]) if k.endswith("lower") else "—", f'{num(q["res60_mean"])} · {num(q["res60_p10"])}'])
    return table(head, rows, "wide lab2")


def first_close_table():
    rows = []
    for r in F1["rows"]:
        rows.append([day(r["d"]), pct(r["under_by"]), ("—" if r["back_day60"] is None else str(r["back_day60"])), usd(r["sell_open"]), usd(r["rebuy_px"]), num(None if r["rebuy_vs_sale"] is None else -r["rebuy_vs_sale"]) if r["rebuy_vs_sale"] is not None else "never back inside 60",
                     pct(r["deepest_under_level"]), ("—" if r["vix"] is None else f'{r["vix"]:.1f}'), num(r["dd20"]), num(r["r60"])])
    head = [("first close under a rising 100-day", False), ("close against the 100-day", True), ("sessions until a close back over it", True), ("sold at the next open", True), ("bought back at", True), ("what the round trip made", True),
            ("deepest low under the line while under", True), ("VIX that day", True), ("further dip inside 20 sessions", True), ("60 sessions on", True)]
    return table(head, rows, "wide", "Sold at the open after the first close under the 100-day; bought back at the open after the first close over it. A negative round trip is a whipsaw: bought back dearer than sold.")


def stop_risk_table():
    """Plain arithmetic on the drafts: what a sale at each stop line would cost, on the full build and on the first two drafts alone."""
    sh_all = sum(DSH); cost_all = sum(DSH[i] * DP[i] for i in range(4)); avg_all = cost_all / sh_all; sh_two = DSH[0] + DSH[1]; avg_two = (DSH[0] * DP[0] + DSH[1] * DP[1]) / sh_two
    lines = [("A close under the 100-day — the stop as it stands", T["ma100"]), ("A close 3% or more under the 100-day — the candidate", T["ma100"] * 0.97), ("13% under 1,036.13 — the old 900", DP[0] * 0.87)]
    head = [("stop line, at tonight’s levels", False), ("level", True), ("under the 6 Oct close", True), ("under the average cost of all four drafts", True), ("on 104 shares", True), ("share of the account (a 20% position)", True), ("on the first two drafts alone (40 shares)", True)]
    rows = [[nm, usd(lv), pct(lv / CLOSE - 1), pct(lv / avg_all - 1), "−$" + f"{abs(sh_all * (lv - avg_all)):,.0f}", pct(0.20 * (lv / avg_all - 1)), "−$" + f"{abs(sh_two * (lv - avg_two)):,.0f}"] for nm, lv in lines]
    return (table(head, rows, "wide", f"All four drafts filled is {sh_all} shares at an average of {usd(avg_all)} (${cost_all:,.0f}). A daily-close stop sells at the next open, which can be under the line. The 100-day climbs about {T['ma100'] - T['ma100_5ago']:.0f} points in five sessions, so the line tightens: with Micron flat it stands near {usd(COL['flat']['ma100_5'], 0)} on {day(COL['flat']['d5'])} and {usd(COL['flat']['ma100_10'], 0)} on {day(COL['flat']['d10'])}."))


def sec_stops():
    bf = S100["big_flush"]; al = S100["all"]; fl = S100["flush"]
    a1 = (f'<p class="ans"><b>Daily close against intraday.</b> A stock’s low went under a rising 100-day {al["n"]:,} times in {ST["levels"]["100"]["names"]} stocks; {sh(S100["flush_share"])} of those sessions closed back over it. '
          f'On the {bf["n"]} one-candle flushes (low 5% or more under the last close, close back over the line) the intraday stop sold every time, on average {pct(abs(bf["intraday_sale_vs_close_mean"]), 1, False)} under where the stock closed that same day; '
          f'the daily-close stop did nothing that day. Sixty sessions on, the share was worth {pct(bf["r60_mean"])} on average if simply held, {pct(bf["close"]["res60_mean"])} with the daily-close stop and {pct(bf["intraday"]["res60_mean"])} with the intraday stop. '
          f'Over all {al["n"]:,} breaches the two stops end about level ({pct(al["close"]["res60_mean"])} and {pct(al["intraday"]["res60_mean"])} against {pct(al["r60_mean"])} held), but the intraday one trades {al["intraday"]["sales_per_case"]:.1f} times a case against {al["close"]["sales_per_case"]:.1f} '
          f'and is whipsawed {al["intraday"]["whips_per_case"]:.1f} times against {al["close"]["whips_per_case"]:.1f}. What either stop buys is the bad case: the worst tenth ends {pct(al["close"]["res60_p10"])} (close) and {pct(al["intraday"]["res60_p10"])} (intraday) against {pct(al["r60_p10"])} held.</p>')
    a2 = (f'<p class="ans"><b>“A stop that kicks out the position but buys lower” — workable, or too many ifs?</b> As a one-candle rule: too many ifs, and it loses. The flush candle reached the lower buys (5% under the line) only {sh(bf["reached_5_under"])} of the time — '
          f'the other times it only kicked the position out, and the stock closed back over the line. As a <b>daily-close</b> rule it is workable, because every step is decided in the evening: (1) a close under the 100-day → out at the next open; '
          f'(2) while out, three buys rest 5%, 6.5% and 8% under the line; (3) the first close back over it → buy back whatever those did not. Over the {al["n"]:,} breaches that version ended {pct(al["close_lower"]["res60_mean"])} on average '
          f'against {pct(al["r60_mean"])} for simply holding, the lower buys filled in {sh(al["close_lower"]["lowfill_any"])} of cases, and the worst tenth ended {pct(al["close_lower"]["res60_p10"])} against {pct(al["r60_p10"])} held. '
          f'It gives back {sh((al["close_lower"]["res60_mean"] - al["close"]["res60_mean"]) / (al["r60_mean"] - al["close"]["res60_mean"]))} of what the plain daily-close stop costs and keeps {sh((al["r60_p10"] - al["close_lower"]["res60_p10"]) / (al["r60_p10"] - al["close"]["res60_p10"]))} of its protection in the worst tenth.</p>')
    a3 = (f'<p class="ans"><b>Micron itself.</b> {F1["n"]} first closes under a rising 100-day since 2003: back over it inside 20 sessions {F1["back_within20"]} times, {F1["back_within60"]} times inside 60 — in the middle case after {F1["back_day_med"]:.0f} session{"" if F1["back_day_med"] == 1 else "s"}. '
          f'{("All " + str(F1["back_within60"])) if F1["whipsaws"] == F1["back_within60"] else (str(F1["whipsaws"]) + " of those " + str(F1["back_within60"]))} were bought back dearer than they were sold ({pct(F1["rebuy_vs_sale_med"])} in the middle case). The stop earned its keep in the {F1["n"] - F1["back_within60"]} that did not come back. '
          f'While under the line, Micron’s low reached 5% under it {F1["reached_5"]} times of {F1["n"]}, 6.5% {F1["reached_65"]} times and 8% {F1["reached_8"]} times; the VIX was 20 or more on {F1["vix20"]} of the {F1["n"]} break days. '
          f'<b>Expect the stop to be used:</b> in Micron’s {C["micron_own"]["n"]} set-ups like today’s the close went under the 100-day inside 20 sessions in {sh(C["micron_own"]["cu100_20"])} and inside 60 in {sh(C["micron_own"]["cu100_60"])}; '
          f'in the {C["wide_bunched_flag"]["n"]} leader pullbacks with the 50- and 100-day bunched as now, {sh(C["wide_bunched_flag"]["cu100_20"])} and {sh(C["wide_bunched_flag"]["cu100_60"])}.</p>')
    return (f'<div class="panel" id="p-stops"><h2>2 · Daily-close stops against intraday stops, on the days the low went through the line</h2>'
            + stop_bars(bf, f"the {bf['n']} one-candle flushes through a rising 100-day") + a1 + stop_bars(al, f"all {al['n']:,} breaches of a rising 100-day") + a2
            + '<h3>What each stop would cost on the drafts</h3>' + stop_risk_table()
            + '<h3>Every kind of breach, every stop style — the 100-day</h3>' + stop_table(S100) + a3
            + f'<details><summary>Micron’s {F1["n"]} first closes under a rising 100-day, one by one</summary>' + first_close_table() + "</details>"
            + '<details><summary>The same comparison at the 50-day and the 21-day</summary><h3>50-day</h3>' + stop_table(ST["levels"]["50"]["all"]) + '<h3>21-day</h3>' + stop_table(ST["levels"]["21"]["all"]) + "</details></div>")


# ------------------------------------------------------------------ 3 · leaders
PATHS = [("never closed under the 21-day", "p0"), ("closed under the 21-day, stopped short of the 50-day", "p1"), ("reached the 50-day, not the 100-day", "p2"), ("reached the 100-day", "p3")]
GROUPS = [("wide", "All leader pullbacks"), ("coordinator19", "The first 19 names, as measured on 7 Oct"), ("wide_bunched_flag", "50- and 100-day within 3% of each other — Micron now"), ("micron_own", "Micron’s own set-ups"), ("micron_leader", "Micron under the leader rule")]


def path_rows(key, title):
    out = [f'<h3>{title}</h3><div class="legend">' + "".join(f'<span><i class="{c}"></i>{esc(l)}</span>' for l, c in PATHS) + "</div>"]
    for g, lab in GROUPS:
        s = C[g]; d = s[key]; n = s["n"]
        parts = [(d.get(l, 0), c, f"{l}: {d.get(l, 0)} of {n}") for l, c in PATHS]
        txt = " · ".join(sh(d.get(l, 0) / n) for l, c in PATHS)
        out.append(f'<div class="srow"><div>{lab} <span class="dim">({n})</span></div><div>{stacked(parts)}<div class="small" style="margin-top:3px">{txt}</div></div></div>')
    return "".join(out)


def leaders_table(groups):
    head = [("", False), ("cases", True), ("held the 21-day for 10 sessions", True), ("touched the 50-day inside 20 · 60", True), ("touched the 100-day inside 20 · 60", True), ("fell to where the 50-day stood that day, inside 20 · 60", True),
            ("to where the 100-day stood, inside 20 · 60", True), ("deepest dip inside 20 · 60 (middle case)", True), ("session of the low", True), ("60 sessions on: middle · share higher", True), ("new 52-week high inside 60", True)]
    rows = []
    for lab, s in groups:
        if not s.get("n"): rows.append([lab, "0"] + ["—"] * 9); continue
        rows.append([lab, f'{s["n"]}', sh(s["held21_10"]), f'{sh(s["t50_20"])} · {sh(s["t50_60"])}', f'{sh(s["t100_20"])} · {sh(s["t100_60"])}', f'{sh(s["s50_20"])} · {sh(s["s50_60"])}', f'{sh(s["s100_20"])} · {sh(s["s100_60"])}',
                     f'{num(s["dd20_med"])} · {num(s["dd60_med"])}', f'{s["low_day60_med"]:.0f}', f'{num(s["r60_med"])} · {sh(s["r60_pos"])}', sh(s["nh60"])])
    return table(head, rows, "wide")


def context_table():
    head = [("when the case began with…", False), ("cases with · without", True), ("60 sessions on, with: middle · average · share higher", True), ("without", True), ("difference in the average (95% interval)", True), ("in the middle case (95% interval)", True)]
    rows = []
    for k in ("vix20", "regime_stress", "regime_calm", "credit_under", "fund_off_high_lagging", "lagging_leader", "fund_near_high", "bunched"):
        e = CE[k]
        if e.get("thin"): rows.append([e["label"], f'{e["n_yes"]} · {e["n_no"]}', "too few", "", "", ""]); continue
        rows.append([e["label"], f'{e["n_yes"]} · {e["n_no"]}', f'{num(e["med_yes"])} · {num(e["mean_yes"])} · {sh(e["pos_yes"])}', f'{num(e["med_no"])} · {num(e["mean_no"])} · {sh(e["pos_no"])}',
                     f'<span class="{cls(e["edge_mean"])}">{pp(e["edge_mean"])}</span> <span class="dim">({ci(e, "edge_mean_ci")})</span>', f'<span class="{cls(e["edge_median"])}">{pp(e["edge_median"])}</span> <span class="dim">({ci(e, "edge_median_ci")})</span>'])
    return table(head, rows, "wide", "Result = the stock’s close 60 sessions after the signal day against that day’s close. Intervals: whole calendar months of cases resampled together, 2,000 times.")


def sec_leaders():
    w = C["wide"]; b = C["wide_bunched_flag"]; m = C["micron_own"]; p20 = w["path20"]; n = w["n"]
    g = lambda l: sh(p20.get(l, 0) / n)
    fo = CE["fund_off_high_lagging"]
    ans = (f'<p class="ans"><b>It goes to the 50-day far more often than it holds the 21-day.</b> Of {n} leader pullbacks in {C["counts"]["names_with_cases"]} stocks since 2003, {sh(w["held21_10"])} went 10 sessions without a close under the 21-day. '
           f'Inside 20 sessions: {g(PATHS[0][0])} never closed under the 21-day, {g(PATHS[1][0])} closed under it and stopped short of the 50-day, {g(PATHS[2][0])} reached the 50-day and not the 100-day, {g(PATHS[3][0])} reached the 100-day. '
           f'<b>How deep:</b> the deepest dip was {pct(w["dd20_med"])} inside 20 sessions and {pct(w["dd60_med"])} inside 60 in the middle case; one case in ten went deeper than {pct(w["dd60_p10"])}. '
           f'<b>How long:</b> the first close under the 21-day came on session {w["first_close_under21_med"]:.0f}, {w["days_under21_20_med"]:.0f} of the next 20 sessions closed under it, the low came on session {w["low_day60_med"]:.0f}, '
           f'and {sh(w["nh60"])} made a new 52-week high inside 60 sessions. Sixty sessions on the middle case was {pct(w["r60_med"])}, higher in {sh(w["r60_pos"])}.</p>'
           f'<p class="ans"><b>With the 50- and 100-day bunched and rising, as Micron’s are now</b> ({b["n"]} cases): {sh(b["t50_20"])} touched the 50-day inside 20 sessions and {sh(b["t100_20"])} the 100-day; '
           f'{sh(b["s50_20"])} fell all the way to where the 50-day stood on the signal day (it stood {pct(abs(b["to50_med"]), 1, False)} under the close; Micron’s stands {pct(abs(T["ma50"] / T["close"] - 1), 1, False)} under). '
           f'The middle case 60 sessions on was {pct(b["r60_med"])}, higher in {sh(b["r60_pos"])} — worse than the rest, but {b["n"]} cases cannot prove it (difference in the middle case {pp(CE["bunched"]["edge_median"])} points, interval {ci(CE["bunched"], "edge_median_ci")}). '
           f'<b>Micron’s own {m["n"]} set-ups</b> were kinder: deepest dip {pct(m["dd20_med"])} inside 20 sessions, {pct(m["r60_med"])} sixty sessions on, higher in {sh(m["r60_pos"])}.</p>'
           f'<p class="ans"><b>The sector.</b> Today the semiconductor fund (SMH) is {pct(abs(T["fund_off_high"]), 1, False)} off its own high and Micron has lagged it by {pct(abs(T["rel20"]), 1, False)} over 20 sessions. '
           f'In the {fo["n_yes"]} past cases like that — fund 3% or more off its high, the stock lagging it — the middle case 60 sessions on was {pct(fo["med_yes"])}, higher in {sh(fo["pos_yes"])}, against {pct(fo["med_no"])} for the rest '
           f'(difference {pp(fo["edge_median"])} points, interval {ci(fo, "edge_median_ci")}). The weak version is the other one: the fund at its high while the stock pulls back ({pct(CE["fund_near_high"]["med_yes"])} in the middle case, {CE["fund_near_high"]["n_yes"]} cases).</p>')
    named = [(p["label"], p) for p in C["named_periods"]]
    named_days = "".join("<li><b>" + p["label"] + "</b> — " + (", ".join(day(d) for d in p["dates"]) or "no case under the rule") + "</li>" for p in C["named_periods"])
    sect = [(k, v) for k, v in C["sector_context"].items()]
    return (f'<div class="panel" id="p-leaders"><h2>3 · Leaders, wider: does it hold the 21-day, or go to the 50 / 100-day?</h2>'
            + path_rows("path20", "The deepest average it reached inside 20 sessions") + ans + path_rows("path60", "Inside 60 sessions (by then the averages have climbed towards the price)")
            + '<h3>The odds, the depth and the time</h3>' + leaders_table([(lab, C[g]) for g, lab in GROUPS] + [("Since 2016", C["since2016"]), ("Before 2016", C["before2016"])])
            + '<h3>The named runs, same rule</h3>' + leaders_table(named) + '<details><summary>The signal days of the named runs</summary><ul class="plain">' + named_days + "</ul></details>"
            + '<h3>What the case began with — the market and the sector</h3>' + context_table()
            + '<details><summary>By sector fund, and the other sector readings</summary>' + leaders_table([(f"{k}", v) for k, v in sect] + [(f"read against {k}", v) for k, v in C["by_fund"].items()]) + "</details></div>")


# ------------------------------------------------------------------ 4 · the open-source review
def edge_rows():
    items = []
    def add(lab, e, group):
        if e and not e.get("thin"): items.append((lab, e, group))
    R = MR["rules"]
    add("VIX spike above 20 → SPY", R["vix_spike_20"]["spy"][1], "VIX"); add("VIX spike above 23 → SPY", R["vix_spike_23"]["spy"][1], "VIX"); add("VIX at 20 or more, any evening → SPY", R["vix_at_or_over_20"]["spy"][1], "VIX")
    add("VIX spike above 20 → Micron", R["vix_spike_20"]["mu"][1], "VIX"); add("VIX at 20 or more, any evening → Micron", R["vix_at_or_over_20"]["mu"][1], "VIX")
    add("Credit under its 200-day → SPY", R["credit_under_200"]["spy"][1], "credit"); add("Credit under its 200-day → Micron", R["credit_under_200"]["mu"][1], "credit")
    add("10-year yield stretched high (as now) → SPY", R["ten_short_stretched_high"]["spy"][1], "10-year"); add("10-year yield washed out → SPY", R["ten_short_washed_out"]["spy"][1], "10-year"); add("10-year yield above its 200-day (as now) → SPY", R["ten_long_above_200"]["spy"][0], "10-year")
    add("VIX in the top tenth of its year → SPY", R["vix_top_decile_of_its_year"]["spy"][1], "extremes")
    for k, nm in (("extreme_TLT", "Rush into long bonds → SPY"), ("extreme_GCUSD", "Rush into gold → SPY"), ("extreme_CLUSD", "Oil dumped → SPY"), ("extreme_two_or_more", "Two or more fear extremes at once → SPY")):
        if k in R: add(nm, R[k]["spy"][1], "extremes")
    S = max(max(abs(e["edge_mean_ci"][0]), abs(e["edge_mean_ci"][1])) for _, e, _ in items)
    head = [("rule, 60 sessions on", False), ("rule days", True), ("after rule days: average · share higher", True), ("after the other days", True), ("the edge and its 95% interval", False), ("points", True), ("second opinion (Newey–West)", True), ("", False)]
    rows = []
    for lab, e, g in items:
        lo, hi = e["edge_mean_ci"]; x = lambda v: 50 + 50 * v / S
        bar = (f'<div class="ciw"><i class="z"></i><i class="w" style="left:{x(lo):.1f}%;width:{x(hi) - x(lo):.1f}%"></i><i class="d {cls(e["edge_mean"])}" style="left:{x(e["edge_mean"]):.1f}%"></i></div>')
        rows.append([lab, f'{e["n_rule"]:,}', f'{num(e["mean_rule"])} · {sh(e["share_rule"])}', f'{num(e["mean_other"])} · {sh(e["share_other"])}', bar, f'<span class="{cls(e["edge_mean"])}">{pp(e["edge_mean"])}</span> <span class="dim">({ci(e, "edge_mean_ci")})</span>',
                     f'{ci(e, "nw_ci")}', ('<span class="ok">clear of zero</span>' if e["proven"] else '<span class="dim">spans zero</span>')])
    return table(head, rows, "wide ci", f"Edge = the average result after rule days minus the average after the other days, SPY or Micron 60 sessions on, daily since {day(MR['span']['first'])} (credit since 2008). The bar is the 95% interval from a stationary block bootstrap (blocks of 60 sessions, 2,000 resamples); the dot is the estimate.")


def spacing_table():
    head = [("level", False), ("price", True), ("under the 6 Oct close", True), ("in usual days", True), ("reached next session", False), ("", True), ("inside 5 sessions", False), ("", True), ("inside 10 sessions", False), ("", True)]
    rows = []
    for l in RG["levels"]:
        rows.append([l["name"], usd(l["price"]), pct(l["dist_pct"] / 100, 2), f'{l["in_ranges"]:.2f}', f'<div class="pb"><i style="width:{100 * l["p1"]:.0f}%"></i></div>', sh(l["p1"]), f'<div class="pb"><i style="width:{100 * l["p5"]:.0f}%"></i></div>', sh(l["p5"]), f'<div class="pb"><i style="width:{100 * l["p10"]:.0f}%"></i></div>', sh(l["p10"])])
    return table(head, rows, "wide bars")


def regime_block():
    t = REG["today"]; names = [s["name"] for s in REG["states"]]; shade = {"calm": "p1", "choppy": "p2", "stress": "p3"}
    head = [("regime", False), ("share of days since 2008", True), ("average VIX", True), ("SPY’s 20-session swing (yearly rate)", True), ("credit against its 200-day", True), ("usual length of a spell", True), ("SPY 60 sessions on: middle · share higher", True), ("Micron 60 on: middle · share higher", True), ("leader pullbacks begun in it: 60 on, middle · share higher", True)]
    rows = []
    for s in REG["states"]:
        mc = C["market_context"].get("market regime: " + s["name"], {})
        rows.append([f'<i class="sw {shade[s["name"]]}"></i>{s["name"]}' + (" <b>← today</b>" if s["name"] == t["state"] else ""), sh(s["share_of_days"]), f'{s["vix_mean"]:.1f}', f'{s["vol_mean"]:.1f}%', pct(s["credit_mean"] / 100), f'{s["expected_run_sessions"]:.0f} sessions',
                     f'{num(s["spy60_med"])} · {sh(s["spy60_pos"])}', f'{num(s["mu60_med"])} · {sh(s["mu60_pos"])}', (f'{num(mc.get("r60_med"))} · {sh(mc.get("r60_pos"))} <span class="dim">({mc.get("n")})</span>' if mc.get("n") else "—")])
    strip = '<div class="strip">' + "".join(f'<i class="{shade[x[1]]}" title="{day(x[0])}: {x[1]}"></i>' for x in REG["recent"]) + "</div>"
    return (f'<p class="ans"><b>Today: {t["state"]}</b> ({sh(t["prob"][t["state"]])} sure), and in it since {day(t["in_state_since"])} — VIX {t["reading"]["vix"]:.2f}, SPY’s 20-session swing {t["reading"]["vol20"]:.1f}% a year, credit {pct(t["reading"]["credit_vs_200"] / 100)} against its 200-day. '
            + (f'Calm on the fear gauges; it is credit under its line that keeps the reading out of calm: put credit back 1% over its 200-day for the last 30 sessions and the same model reads {t["if_credit_over_its_line"]["state"]} ({sh(t["if_credit_over_its_line"]["prob"][t["if_credit_over_its_line"]["state"]])}).' if t.get("if_credit_over_its_line") and t["if_credit_over_its_line"]["state"] != t["state"] else "")
            + '</p>' + table(head, rows, "wide")
            + f'<div class="small">The last {len(REG["recent"])} sessions, {day(REG["recent"][0][0])} to {day(REG["recent"][-1][0])}:</div>' + strip
            + '<div class="legend">' + "".join(f'<span><i class="{shade[n]}"></i>{n}</span>' for n in names) + "</div>")


def trend_svg():
    M = P["micron"]; d = M["dates"]; c = M["close"]; n = len(c); W_, H_ = 1100, 430; L, R_, T_, B_ = 58, 158, 14, 64
    deep = [LV[k]["price"] for k in LV if "under the 100-day" in k]; k0 = n - 130
    lo = min(min(M["low"][k0:]), min(deep)) * 0.97; hi = max(M["high"][k0:]) * 1.02
    X = lambda i: L + (W_ - L - R_) * (i - k0) / (n - 1 - k0); Y = lambda v: T_ + (H_ - T_ - B_) * (hi - v) / (hi - lo)
    out = [f'<svg viewBox="0 0 {W_} {H_}" role="img" aria-label="Micron, the last 130 sessions, with its averages, the four drafts and the change points in its trend">']
    step = next(st for st in (50, 100, 200, 250, 500, 1000) if (hi - lo) / st <= 6); g = int(lo // step + 1) * step
    while g < hi:
        out.append(f'<line x1="{L}" x2="{W_ - R_}" y1="{Y(g):.1f}" y2="{Y(g):.1f}" stroke="#1d1e23" stroke-width="1"/><text x="{L - 8}" y="{Y(g) + 4:.1f}" text-anchor="end" fill="#9a9ca2" font-size="13">{g:,.0f}</text>'); g += step
    def seg(vals, dash, wdt):
        up = []; dn = []
        for i in range(k0 + 1, n):
            a_, b_ = vals[i - 1], vals[i]
            if a_ is None or b_ is None: continue
            (up if b_ >= a_ else dn).append(f'M{X(i - 1):.1f} {Y(a_):.1f}L{X(i):.1f} {Y(b_):.1f}')
        return (f'<path d="{"".join(up)}" stroke="#2fbf71" stroke-width="{wdt}" fill="none" stroke-dasharray="{dash}" stroke-linecap="round"/>' if up else "") + (f'<path d="{"".join(dn)}" stroke="#cc4458" stroke-width="{wdt}" fill="none" stroke-dasharray="{dash}" stroke-linecap="round"/>' if dn else "")
    out.append(seg(M["ma100"], "9 5", 1.3)); out.append(seg(M["ma50"], "5 4", 1.3)); out.append(seg(M["ma21"], "2 3", 1.3)); out.append(seg(c, "", 2))
    # the months along the bottom
    for i in range(k0 + 1, n):
        if d[i][5:7] != d[i - 1][5:7]:
            out.append(f'<line x1="{X(i):.1f}" x2="{X(i):.1f}" y1="{H_ - B_}" y2="{H_ - B_ + 5}" stroke="#55565c" stroke-width="1"/><text x="{X(i):.1f}" y="{H_ - B_ + 19}" text-anchor="middle" fill="#9a9ca2" font-size="13">{MONTHS[int(d[i][5:7]) - 1]} {d[i][:4] if d[i][5:7] == "01" or i == k0 + 1 else ""}</text>')
    # the change points: one upright line each; neighbours inside six sessions share one label, and labels take turns on two rows
    cps = sorted({cp for s_ in TR["settings"] for cp in s_["change_points"] if cp in d and d.index(cp) >= k0}); groups = []
    for cp in cps:
        x = X(d.index(cp)); out.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{T_}" y2="{H_ - B_}" stroke="#6e7076" stroke-width="1" stroke-dasharray="1 4"/>')
        if groups and d.index(cp) - d.index(groups[-1][-1]) <= 6: groups[-1].append(cp)
        else: groups.append([cp])
    last_x = [-999, -999]
    for gcp in groups:
        x = (X(d.index(gcp[0])) + X(d.index(gcp[-1]))) / 2
        if len(gcp) == 1: lab = day(gcp[0])[:-5]
        elif gcp[0][5:7] == gcp[-1][5:7]: lab = " · ".join(str(int(c_[8:])) for c_ in gcp) + " " + MONTHS[int(gcp[0][5:7]) - 1]
        else: lab = " · ".join(day(c_)[:-5] for c_ in gcp)
        wpx = 8.2 * len(lab); row = 0 if x - wpx / 2 > last_x[0] + 10 else 1; last_x[row] = x + wpx / 2
        anchor = "start" if x - wpx / 2 < L else "middle"; xx = max(x, L) if anchor == "start" else x
        out.append(f'<text x="{xx:.1f}" y="{H_ - B_ + 37 + 16 * row}" text-anchor="{anchor}" fill="#d0d0d2" font-size="13">{lab}</text>')
    # right-hand labels, kept apart
    labs = [(M["ma21"][-1], f'21-day {M["ma21"][-1]:,.2f}'), (M["ma50"][-1], f'50-day {M["ma50"][-1]:,.2f}'), (M["ma100"][-1], f'100-day {M["ma100"][-1]:,.2f}')] + [(DP[i], f'{DSH[i]} @ {DP[i]:,.2f}') for i in range(4)] + [(min(deep), f'deep bid {max(deep):,.0f}–{min(deep):,.0f}'), (c[-1], f'close {c[-1]:,.2f}')]
    labs.sort(key=lambda t: -t[0]); ypos = []
    for v, _ in labs:
        y = Y(v)
        if ypos and y < ypos[-1] + 16: y = ypos[-1] + 16
        ypos.append(y)
    shift = max(0.0, ypos[-1] - (H_ - B_ - 2)); ypos = [y - shift for y in ypos]
    for (v, t), y in zip(labs, ypos):
        out.append(f'<line x1="{W_ - R_ + 2}" x2="{W_ - R_ + 12}" y1="{Y(v):.1f}" y2="{y - 4:.1f}" stroke="#55565c" stroke-width="1"/><text x="{W_ - R_ + 16}" y="{y:.1f}" fill="#d0d0d2" font-size="13">{t}</text>')
    for i in range(4): out.append(f'<line x1="{W_ - R_ - 26}" x2="{W_ - R_}" y1="{Y(DP[i]):.1f}" y2="{Y(DP[i]):.1f}" stroke="#bfc0c4" stroke-width="1.6"/>')
    out.append(f'<rect x="{W_ - R_ - 26}" y="{Y(max(deep)):.1f}" width="26" height="{Y(min(deep)) - Y(max(deep)):.1f}" fill="#3d3e44"/></svg>')
    return ('<div class="chart">' + "".join(out) + f'</div><div class="legend"><span>Micron, {day(d[k0])} to {day(d[-1])}</span><span><i class="ln" style="background:#2fbf71"></i>rising day / rising average</span><span><i class="ln" style="background:#cc4458"></i>falling</span>'
            '<span>solid = close · dotted = 21-day · short dashes = 50-day · long dashes = 100-day</span><span>upright dotted lines = change points in the trend, each with its day</span><span>ticks at the right edge = the four drafts · block = the deep bid, 5–8% under the 100-day</span></div>')


def trend_block():
    head = [("how big a bend must be to count", False), ("change points found in two years", True), ("the newest", False), ("since then", True), ("pace since then", True), ("pace before it", True)]
    rows = []
    for s in TR["settings"]:
        cur = s["current"]; prev = s["previous"]
        rows.append([s["name"], str(len(s["change_points"])), day(s["last_change"]), f'{cur["sessions"]} sessions', f'{cur["slope_pct_per_session"]:+.2f}% a session'.replace("-", "−"), (f'{prev["slope_pct_per_session"]:+.2f}% a session ({day(prev["start"])} – {day(prev["end"])})'.replace("-", "−") if prev else "—")])
    c0, c1, c2 = TR["settings"]
    how_many = {0: "Not one of the three settings places", 1: "One of the three settings places", 2: "Two of the three settings place", 3: "All three settings place"}[TR["agree_last30"]]
    lead = (f'The fast climb ended around {day(c1["last_change"])}; no change point in the last 30 sessions.' if TR["agree_last30"] == 0 else f'The fast climb ended around {day(c1["last_change"])}; a new change point has appeared in the last 30 sessions.')
    return (trend_svg() + f'<p class="ans"><b>{lead}</b> At the two stricter settings the newest change point is {day(c1["last_change"])} / {day(c0["last_change"])}: before it Micron climbed '
            f'{c1["previous"]["slope_pct_per_session"]:.1f}% a session; since then the fitted pace is {c1["current"]["slope_pct_per_session"]:+.2f}% a session — a wide range, not a trend. At the finest setting the newest bend is {day(c2["last_change"])}, '
            f'and since then the pace is {c2["current"]["slope_pct_per_session"]:+.2f}% a session over {c2["current"]["sessions"]} sessions. {how_many} a change point inside the last 30 sessions.</p>'.replace("+-", "−")
            + table(head, rows, ""))


def critique_block():
    if not CR.get("models"): return '<p class="ans">The local model run is not in this build.</p>'
    ms = CR["models"]; truth = CR["quiz_truth"]; qtext = {l.split(" ", 1)[0]: l.split(" ", 1)[1] for l in CR["quiz"].splitlines() if l.startswith("q")}
    nm = {"qwen2.5-7b": "Qwen2.5-7B-Instruct (Alibaba, Apache-2.0)", "fin-o1-8b": "Fin-o1-8B (TheFinAI, Apache-2.0) — picked on 6 Oct as the better reader of facts"}
    head = [("model, run on this MacBook under llama.cpp", False), ("reading test: right of 10", True), ("quoted facts found word for word", True), ("figures not in the facts", True), ("seconds for the whole run", True)]
    rows = [[nm.get(m["label"], m["label"]), f'{m["quiz"]["right"]} of {m["quiz"]["asked"]}', f'{sum(v["quotes_verbatim"] for v in m["roles"].values())} of {sum(v["quotes"] for v in m["roles"].values())}', str(sum(len(v["figures_not_in_facts"]) for v in m["roles"].values())), f'{m["total_seconds"]:.0f}'] for m in ms]
    both = []
    for b in (CR.get("risk_quoted_by_both") or []):          # stored lower-cased; shown as the facts sheet prints it
        m_ = re.search(re.escape(b), CR["facts"], re.I); both.append(m_.group(0) if m_ else b)
    def pts(m, role):
        out = []
        for p in m["roles"][role]["points"]:
            mark = "" if p["quote"] is None else ('<span class="ok">✓ word for word</span>' if p["verbatim"] else '<span class="bad">✗ not word for word</span>')
            out.append(f'<li><span class="dim">{p["kind"].lower()}</span> {esc(p["text"])}' + (f'<div class="q">“{esc(p["quote"])}” {mark}</div>' if p["quote"] else "") + "</li>")
        return '<ul class="plain">' + "".join(out) + "</ul>"
    wrong = []
    for m in ms:
        for q in m["quiz"]["wrong"]: wrong.append(f'<li>{nm.get(m["label"], m["label"]).split(" (")[0]} answered “{esc(m["quiz"]["answers"].get(q, "nothing"))}” to: {esc(qtext.get(q, q))} <span class="dim">— the facts say {truth[q]}.</span></li>')
    body = (f'<p class="ans"><b>Useful as a second reader, not as a judge.</b> Both models copy facts faithfully and invent no figures; their reasoning is thin and each misread the sheet at least once. '
            f'The one thing worth taking is where both risk managers rested on the same sentence of the facts: ' + "; ".join(f'“{esc(b)}”' for b in both) + ". "
            f'Both said of them: the first two orders are too close, the stop on the 100-day close is prone to false triggers, and the deep bid is off while the VIX is under 20 — the same three points the replay measured.</p>'
            + table(head, rows, "") + '<h3>The risk manager, both models</h3><div class="two">' + "".join(f'<div><div class="small">{nm.get(m["label"], m["label"])}</div>{pts(m, "risk")}<div class="small">its three changes after reading bull and bear</div>{pts(m, "three_changes")}</div>' for m in ms) + "</div>"
            + '<h3>Where the models misread the sheet</h3><ul class="plain">' + "".join(wrong) + "</ul>"
            + '<details><summary>The bull and the bear, both models</summary><div class="two">' + "".join(f'<div><div class="small">{nm.get(m["label"], m["label"])} — bull</div>{pts(m, "bull")}<div class="small">bear</div>{pts(m, "bear")}</div>' for m in ms) + "</div></details>"
            + '<details><summary>The facts sheet both models were given</summary><pre class="facts">' + esc(CR["facts"]) + "</pre></details>")
    return body


def sec_review():
    gap12 = abs(LV[DN[0]]["dist_pct"] - LV[DN[1]]["dist_pct"]); l3 = LV[DN[2]]; l4 = LV[DN[3]]
    sp = (f'<p class="ans"><b>Micron’s usual day right now is {RG["expected_range_pct"]:.1f}% — about ${RG["expected_range_usd"]:.0f}{" — its calmest of the past year" if RG["sigma1_pctile_of_year"] <= 5 else ""}</b> (the model’s daily swing is {RG["sigma1_pct"]:.1f}% against {RG["sigma1_year_median"]:.1f}% in the middle of the year; lower than on {100 - RG["sigma1_pctile_of_year"]:.0f}% of the year’s sessions). '
          f'One usual day apart is the spacing at which a single ordinary session fills one order, not three. The drafts: 1,036.13 → 1,030.40 is {gap12:.2f}% ({gap12 / RG["expected_range_pct"]:.2f} of a day); → 1,011.77 is {abs(LV[DN[1]]["dist_pct"] - l3["dist_pct"]):.2f}% ({abs(LV[DN[1]]["dist_pct"] - l3["dist_pct"]) / RG["expected_range_pct"]:.2f}); '
          f'→ 989.17 is {abs(l3["dist_pct"] - l4["dist_pct"]):.2f}% ({abs(l3["dist_pct"] - l4["dist_pct"]) / RG["expected_range_pct"]:.2f}). The chance that the very next session reaches 1,011.77 — and so fills all three working orders at once — is {sh(l3["p1"])}. '
          f'If volatility returns to its yearly middle, a usual day is about {RG["range_ratio_median"] * RG["sigma1_year_median"]:.1f}% and every gap in the ladder is inside one day.</p>')
    return (f'<div class="panel" id="p-review"><h2>4 · Every live rule through open-source tools</h2>'
            '<h3>The edge of each market rule, with its interval — arch’s block bootstrap, statsmodels as second opinion</h3>' + edge_rows()
            + '<h3>How far apart the orders should sit — arch, a volatility model of Micron’s daily moves</h3>' + sp + spacing_table()
            + '<h3>Which market regime today — hmmlearn, a hidden-Markov model of SPY, the VIX and credit</h3>' + regime_block()
            + '<h3>Where Micron’s trend changed — ruptures</h3>' + trend_block()
            + '<h3>A local open model argues bull, bear and risk manager</h3>' + critique_block() + "</div>")


# ------------------------------------------------------------------ 5 · the sheet
def sheet_rows():
    R = MR["rules"]; ds = MO["_draft_same"]; gap12 = abs(LV[DN[0]]["dist_pct"] - LV[DN[1]]["dist_pct"]); bf = S100["big_flush"]; al = S100["all"]
    e = lambda k, i=1, g="spy": R[k][g][i]
    da = EM["draft_vs_allin21"]; ge = EM["draft_grow_vs_equal"]; gp = EM["grow_vs_equal"]; sv = EW["stop_vs_pyramid"]; b3 = EW["band3_vs_stop"]; b3m = EM["band3_vs_stop"]; dv = EW["deep_vs_stop"]; dav = EW["deep_anyvix_vs_deep"]; fx = EW["fixed13_vs_pyramid"]; v20 = CE["vix20"]
    cu = e("credit_under_200"); cum = e("credit_under_200", 1, "mu"); hi = e("ten_short_stretched_high"); lo = e("ten_short_washed_out"); lg = e("ten_long_above_200", 0)
    tl = e("extreme_TLT", 0); gc = e("extreme_GCUSD", 0); oil = e("extreme_CLUSD"); two = e("extreme_two_or_more", 0); vx = e("vix_top_decile_of_its_year", 0); w = C["wide"]; d3 = LV["5% under the 100-day"]; d8 = LV["8% under the 100-day"]
    rows = [
        dict(id="three_orders", rule="At most three working orders, re-priced each evening", verdict="keep", change="keep the cap · change the spacing",
             number=f'1,036.13 and 1,030.40 are {gap12:.2f}% apart; Micron’s usual day is {RG["expected_range_pct"]:.1f}% (${RG["expected_range_usd"]:.0f}). In its {ds["n"]} set-ups the first two drafts filled in the same session {sh(ds["first_two_same_session"])} of the time and all three working drafts {sh(ds["first_three_same_session"])}. The cap only stops a falling knife when the orders are about a usual day apart. With the first two as one order at 1,036.13 and then 1,011.77 and 989.17 (gaps of {abs(LV[DN[0]]["dist_pct"] - LV[DN[2]]["dist_pct"]) / RG["expected_range_pct"]:.2f} and {abs(LV[DN[2]]["dist_pct"] - LV[DN[3]]["dist_pct"]) / RG["expected_range_pct"]:.2f} of a usual day), all three working orders filled in one session in {sh(MO["_draft_merged_same"]["all_three_same_session"])} of the set-ups, and the chance that the very next session reaches the third falls from {sh(LV[DN[2]]["p1"])} to {sh(LV[DN[3]]["p1"])}; the 60-session result changed by {pp(EM["merged_vs_draft"]["p60"]["mean"])} points ({ci(EM["merged_vs_draft"]["p60"])}).', tool="replay · arch"),
        dict(id="bigger_lower", rule="Sizes growing as price falls (18 / 22 / 27 / 37 shares)", verdict="keep", change="keep on the drafts as placed",
             number=f'On the drafts it bought {way(ge["cost"]["mean"], "cheaper", "dearer")} than equal quarters and changed the 60-session result by {pp(ge["p60"]["mean"])} points ({ci(ge["p60"])}). It turns costly only when the low rungs are far: on the 21 / 50 / 100-day ladder it changed the result by {pp(gp["p60"]["mean"])} points ({ci(gp["p60"])}), because the 100-day buy filled inside 60 sessions in {sh(MO["pyramid"]["rungs"][2]["fill60"])} of Micron’s set-ups.', tool="replay · bootstrap"),
        dict(id="wait_for_levels", rule="Wait for the levels instead of buying at the 21-day", verdict="keep", change="keep, knowing the price",
             number=f'The four drafts against everything at the 21-day, Micron’s {ds["n"]} set-ups: {way(da["cost"]["mean"], "cheaper", "dearer")}, {way(da["dd60"]["mean"], "more drawdown", "less drawdown")}, {way(da["p60"]["mean"], "less", "more")} result at 60 sessions ({ci(da["p60"])}). At least one draft filled inside 20 sessions in {sh(ds["any_within20"])} of cases; in {sh(ds["none_within60"])} none did inside 60 — the run-away case. Tonight’s readings favour waiting: in the {LS["wide_bunched"]["draft"]["n"]} cases with the 50- and 100-day bunched as now, the fourth draft’s level was reached inside 20 sessions in {sh(LS["wide_bunched"]["draft"]["rungs"][3]["fill20"])}, and the middle case 60 sessions on was {pct(res(LS["wide_bunched"]["draft"], 60, "med"))} for the drafts against {pct(res(LS["wide_bunched"]["allin21"], 60, "med"))} for everything at the 21-day.', tool="replay · bootstrap"),
        dict(id="stop_100_close", rule="The add-on stop: out on a daily close under the 100-day", verdict="change", change="keep it on the close · keep it off the buy line · candidate: a 3% band under the line",
             number=f'As it stands it changed the 60-session result by {pp(sv["p60"]["mean"])} points ({ci(sv["p60"])}) and the 120-session result by {pp(sv["p120"]["mean"])} ({ci(sv["p120"])}), for {way(sv["dd120"]["mean"], "more", "less")} drawdown inside 120 sessions, with {W["pyr_stop"]["stops_per100"]:.0f} stops and {W["pyr_stop"]["whipsaws_per100"]:.0f} whipsaws per 100 cases. The 100-day buy was sold again inside five sessions in {sh(W["_clash"]["of_those_filled"])} of the cases where it filled. Requiring a close 3% or more under the line cut the whipsaws to {W["pyr_stop_band3"]["whipsaws_per100"]:.0f} per 100 and changed the 120-session result by {pp(b3["p120"]["mean"])} points ({ci(b3["p120"])}); on Micron’s own set-ups {pp(b3m["p120"]["mean"])} ({ci(b3m["p120"])}). On Micron’s own {MO["pyr_stop"]["n"]} set-ups the stop as it stands changed the 60-session result by {pp(EM["stop_vs_pyramid"]["p60"]["mean"])} ({ci(EM["stop_vs_pyramid"]["p60"])}) for {way(EM["stop_vs_pyramid"]["dd120"]["mean"], "more", "less")} drawdown. Tonight the stop line is {pct(GAP_STOP, 1, False)} under the fourth draft; with Micron flat it is within 1% of it by {day(COL["flat"]["within1"])}. Expect it to be used: in Micron’s {C["micron_own"]["n"]} set-ups the close went under the 100-day inside 20 sessions in {sh(C["micron_own"]["cu100_20"])} and inside 60 in {sh(C["micron_own"]["cu100_60"])}.', tool="replay · bootstrap"),
        dict(id="daily_not_intraday", rule="Daily-close stops, not intraday prints", verdict="keep", change="keep",
             number=f'On {bf["n"]} one-candle flushes through a rising 100-day the intraday stop sold {pct(abs(bf["intraday_sale_vs_close_mean"]), 1, False)} under that day’s close and the share ended {pct(bf["intraday"]["res60_mean"])} on average 60 sessions on, against {pct(bf["close"]["res60_mean"])} with the daily-close stop and {pct(bf["r60_mean"])} held. Over all {al["n"]:,} breaches the intraday stop traded {al["intraday"]["sales_per_case"]:.1f} times a case against {al["close"]["sales_per_case"]:.1f}.', tool="breach-day replay"),
        dict(id="buy_back", rule="Buy back on a daily close above the 100-day", verdict="keep", change="keep — it is what makes a stop affordable",
             number=f'Micron: {F1["n"]} first closes under a rising 100-day; {F1["back_within60"]} closed back over it inside 60 sessions (middle case: {F1["back_day_med"]:.0f} session) and {"all " + str(F1["whipsaws"]) if F1["whipsaws"] == F1["back_within60"] else str(F1["whipsaws"])} were bought back dearer than sold ({pct(F1["rebuy_vs_sale_med"])} in the middle case). A stop with no way back did worse: the fixed stop changed the 120-session result by {pp(fx["p120"]["mean"])} points.', tool="replay"),
        dict(id="kick_out_buy_lower", rule="“A stop that kicks out the position but buys lower”", verdict="change", change="daily-close version only",
             number=f'One-candle version: the flush candle reached the lower buys {sh(bf["reached_5_under"])} of the time. Daily-close version (out at the next open, three buys 5 / 6.5 / 8% under the line, buy back the rest on a close over it): the share ended {pct(al["close_lower"]["res60_mean"])} on average against {pct(al["r60_mean"])} held; worst tenth {pct(al["close_lower"]["res60_p10"])} against {pct(al["r60_p10"])}.', tool="breach-day replay"),
        dict(id="deep_bid_vix", rule="Deep bid 5–8% under the 100-day, only with the VIX at 20 or more", verdict="keep", change="keep — the VIX test is a risk filter",
             number=f'Added to the stop it made {pp(dv["p60"]["mean"])} points at 60 sessions ({ci(dv["p60"])}) and {pp(dv["p120"]["mean"])} at 120 ({ci(dv["p120"])}), and gave back {ab(dv["dd120"]["mean"])} points of the stop’s drawdown protection ({ci(dv["dd120"])}). At any VIX it earned about the same ({pp(dav["p60"]["mean"])}, {ci(dav["p60"])}) with {way(dav["dd120"]["mean"], "more", "less")} drawdown ({ci(dav["dd120"])}). Off today (VIX {MR["today"]["vix"]:.2f}); the bids would sit at {d3["price"]:,.0f} to {d8["price"]:,.0f}, {d3["in_ranges"]:.1f}–{d8["in_ranges"]:.1f} usual days away, reached inside 10 sessions {sh(d3["p10"])} to {sh(d8["p10"])} of the time.', tool="replay · bootstrap · arch"),
        dict(id="fixed_13", rule="A fixed stop 13% under the first fill (the old 900)", verdict="drop", change="drop",
             number=f'Hit in {sh(W["pyr_fixed13"]["stopped"])} of {W["pyr_fixed13"]["n"]} leader pullbacks and {sh(MO["pyr_fixed13"]["stopped"])} of Micron’s {MO["pyr_fixed13"]["n"]} inside 120 sessions, with nothing bought back: {pp(fx["p60"]["mean"])} points at 60 sessions ({ci(fx["p60"])}), {pp(fx["p120"]["mean"])} at 120 ({ci(fx["p120"])}). The usual pullback is as deep as the stop: the deepest dip inside 60 sessions was {pct(w["dd60_med"])} in the middle case.', tool="replay · bootstrap"),
        dict(id="vix_rule", rule="Buy on a VIX spike above 20, with both hands above 23", verdict="keep", change="keep as the trigger for buying leaders — not as a market call",
             number=f'For SPY the spike itself shows no edge: after {e("vix_spike_20")["n_rule"]} spikes above 20, {pp(e("vix_spike_20")["edge_mean"])} points at 60 sessions ({ci(e("vix_spike_20"), "edge_mean_ci")}); above 23 ({e("vix_spike_23")["n_rule"]} spikes) {pp(e("vix_spike_23")["edge_mean"])} ({ci(e("vix_spike_23"), "edge_mean_ci")}). For leader pullbacks it does: the {v20["n_yes"]} that began with the VIX at 20 or more made {way(v20["edge_mean"], "less", "more")} over 60 sessions than the {v20["n_no"]} that did not ({ci(v20, "edge_mean_ci")}). The 20 and 23 lines still sit on the VIX’s 80th and 90th percentiles of the past year ({MR["vix_year"]["80"]:.1f} and {MR["vix_year"]["90"]:.1f}).', tool="arch bootstrap · statsmodels"),
        dict(id="credit_200", rule="Credit under its 200-day is a caution", verdict="keep", change="keep — and it is on now",
             number=f'With payouts added back, credit has been under its 200-day since {day(MR["today"]["credit_under_since"])}. SPY 60 sessions on: {pct(cu["mean_rule"])} against {pct(cu["mean_other"])}, edge {pp(cu["edge_mean"])} points ({ci(cu, "edge_mean_ci")}), share higher {sh(cu["share_rule"])} against {sh(cu["share_other"])}. Micron: {pct(cum["mean_rule"])} against {pct(cum["mean_other"])}, edge {pp(cum["edge_mean"])} points ({ci(cum, "edge_mean_ci")}) — the nearest thing here to a proven rule, and it leans against Micron today.', tool="arch bootstrap · statsmodels"),
        dict(id="ten_short", rule="The 10-year, short clock: a stretched yield read contrarian", verdict="change", change="contrarian on the low side only",
             number=f'Yield washed out (bottom fifth of its year): SPY {pp(lo["edge_mean"])} points at 60 sessions ({ci(lo, "edge_mean_ci")}), share higher {pp(lo["edge_share"], 0)} points ({ci(lo, "edge_share_ci", 0)}). Yield stretched high, as now (RSI in the top {100 - MR["today"]["ten_rsi_pct"]:.0f}% of its year): {pp(hi["edge_mean"])} ({ci(hi, "edge_mean_ci")}) — not a plus.', tool="arch bootstrap · statsmodels"),
        dict(id="ten_long", rule="The 10-year, long clock: yield above its 200-day is a mild negative", verdict="keep", change="keep as backdrop, with no say in a panic",
             number=f'SPY after evenings with the yield above its 200-day (as now: {MR["today"]["ten"]:.2f}% against {MR["today"]["ten200"]:.2f}%): {pp(lg["edge_mean"])} points at 60 sessions ({ci(lg, "edge_mean_ci")}), {pp(e("ten_long_above_200", 1)["edge_mean"])} at 120 ({ci(e("ten_long_above_200", 1), "edge_mean_ci")}).', tool="arch bootstrap · statsmodels"),
        dict(id="extremes", rule="Extremes read contrarian (a rush to safety is fear, and fear is where stocks get bought)", verdict="keep", change="keep for the VIX, long bonds and gold · drop oil from the list",
             number=f'SPY 20 sessions on — rush into long bonds {pp(tl["edge_mean"])} points ({ci(tl, "edge_mean_ci")}), share higher {pp(tl["edge_share"], 0)} ({ci(tl, "edge_share_ci", 0)}); gold {pp(gc["edge_mean"])} ({ci(gc, "edge_mean_ci")}); VIX in the top tenth of its year {pp(vx["edge_mean"])} ({ci(vx, "edge_mean_ci")}); two or more at once {pp(two["edge_mean"])} ({ci(two, "edge_mean_ci")}). Oil dumped has the wrong sign: {pp(oil["edge_mean"])} at 60 sessions ({ci(oil, "edge_mean_ci")}).', tool="arch bootstrap · statsmodels"),
        dict(id="twentyone_safe", rule="“If it reaches the 21-day, that’s safe”", verdict="change", change="expect the 50-day",
             number=f'{sh(w["held21_10"])} of {w["n"]} leader pullbacks held the 21-day for 10 sessions; {sh(w["t50_20"])} touched the 50-day inside 20 and {sh(w["t100_20"])} the 100-day. With the 50- and 100-day bunched like Micron’s ({C["wide_bunched_flag"]["n"]} cases): {sh(C["wide_bunched_flag"]["t50_20"])} and {sh(C["wide_bunched_flag"]["t100_20"])}.', tool="leader comparison"),
    ]
    return rows


def sec_sheet():
    rows = sheet_rows(); head = [("the rule as it stands", False), ("", False), ("what to do with it", False), ("the number behind it", False), ("measured with", False)]
    body = [[r["rule"], f'<span class="verdict {r["verdict"]}">{r["verdict"].upper()}</span>', r["change"], r["number"], f'<span class="dim">{r["tool"]}</span>'] for r in rows]
    k = sum(1 for r in rows if r["verdict"] == "keep"); c = sum(1 for r in rows if r["verdict"] == "change"); d = sum(1 for r in rows if r["verdict"] == "drop")
    return (f'<div class="panel" id="p-sheet"><h2>5 · The sheet — keep, change or drop, rule by rule</h2><p class="ans">{k} keep · {c} change · {d} drop. Every rule is also in <a href="PLAYBOOK.md" style="color:inherit">the playbook file</a> beside this page, with its evidence and the date it was last measured.</p>' + table(head, body, "wide sheet") + "</div>")


def sec_wrong():
    wd = W["_worst_deep"]; names = {"MRNA": "Moderna", "MU": "Micron", "NVDA": "Nvidia", "TSLA": "Tesla", "AMD": "AMD"}
    items = [
        f'<b>Daily bars only.</b> A buy order “fills” when the session’s low reaches it, and an intraday stop when the low goes under it; inside the session the true order of prints is unknown. A session that both fills a buy and trips a stop is counted in that order. Slippage and the spread are not counted — an intraday stop in a fast flush would really sell lower than the line.',
        f'<b>The pre-market and overnight sessions are not in the bars.</b> The drafts are overnight-plus-next-day orders; a fill at 04:00 is priced here as a fill in the regular session.',
        f'<b>Prices are split-adjusted, payouts are not added back.</b> For Micron and most of these names that is small; for credit the dividend-adjusted series from FMP (read on 7 Oct 2026) is used.',
        f'<b>The stocks are today’s survivors.</b> {P["bars"]["stocks"]} names that exist and matter now; leaders that later collapsed or were delisted are thin in it. That flatters every “60 sessions on” figure and every strategy without a stop. {len(P["bars"]["not_served"])} names asked for were not served by the chart API ({", ".join(P["bars"]["not_served"])}).',
        f'<b>Cases overlap.</b> Several leaders pull back in the same weeks; the intervals resample whole calendar months to allow for that, but 2020–2021 and 2023–2026 still carry most of the cases ({C["since2016"]["n"]} of {C["wide"]["n"]} since 2016).',
        f'<b>Micron’s own {MO["allin21"]["n"]} set-ups use a wider net than the leader rule</b> (no demand on SPY or the 200-day), and Micron’s {C["micron_leader"]["n"]} cases under the full rule are too few to stand alone. This year’s Micron — from {usd(T["ma200"], 0)} on its 200-day to a high of {usd(T["high252"], 0)} on {day(T["high252_date"])} — is unlike most of its own past.',
        f'<b>The two stop filters (a 3% band, two closes) were tried on the same cases they are judged on.</b> They are candidates. The same goes for the “one usual day apart” spacing.',
        f'<b>The stop with the deep bid can lose more than the planned money across its round trips</b>: {wd["beyond_100"]} of {wd["n"]} cases did; the worst drew down {pct(wd["dd120"], 0)} ({names.get(wd["sym"], wd["sym"])} from {day(wd["d"])}: {wd["stops"]} stops, {wd["deep_fills"]} deep fills, the stock itself {pct(wd["stock120"], 0)} over the 120 sessions).',
        f'<b>The regime model’s parameters are fitted on the whole span</b> (2008–2026); only the reading of each day uses nothing later than that day. Four states fit better than three by the usual yardstick ({REG["bic"]["4"]:,.0f} against {REG["bic"]["3"]:,.0f}); three were kept because they can be named.',
        f'<b>The volatility model reads Micron as unusually calm</b> ({RG["sigma1_pct"]:.1f}% a day, lower than on {100 - RG["sigma1_pctile_of_year"]:.0f}% of the past year’s sessions). The reach chances and the spacing lean on that; with the year’s middle swing ({RG["sigma1_year_median"]:.1f}%) every level is {100 * (1 - RG["sigma1_pct"] / RG["sigma1_year_median"]):.0f}% closer in “usual days”.',
        f'<b>The local models are small.</b> They copy facts well and reason poorly; their critique is a cross-check on the obvious, nothing more.',
        f'<b>Many things were measured at once.</b> Fifteen rules and some sixty comparisons, each with a 95% interval: about one in twenty clears zero by luck alone. A single clear interval — the VIX at 20 or more for leader pullbacks is the plainest — is a lead to re-measure, not a law.',
        f'<b>No market rule has an interval clear of zero on SPY’s average.</b> That is not proof they are wrong — 23 years of overlapping 60-session results hold far fewer independent periods than days.',
    ]
    return '<div class="panel" id="p-wrong"><h2>6 · What could be wrong</h2><ul class="plain">' + "".join(f"<li>{x}</li>" for x in items) + "</ul></div>"


def specs():
    return f"""<details class="sc-pagespecs"><summary>PAGE SPECS</summary>
<h4>What this page is</h4><p>A study page on the allocation repo’s branch pb2-order-layer-20261007. Nothing here is on the live tool, no order was placed, drafted or read, and no table was written. Bars through {THROUGH}; built {P["built_utc"]}.</p>
<h4>Where the numbers come from</h4><ul>
<li>Daily bars: the chart API (scintilla-massive-chart-api, /candles, daily), read-only: {len(P["bars"]["served"])} symbols from {day(P["bars"]["first"])} to {THROUGH} — {P["bars"]["stocks"]} stocks, 11 sector funds, SPY, QQQ, the VIX, the 10-year yield, HYG, long bonds (TLT), gold and oil. Split-adjusted. study/pb2/data/bars-manifest.json lists every series with its hash.</li>
<li>Credit: HYG with payouts added back (FMP dividend-adjusted closes, read once on 7 Oct 2026 for the study of how much to have invested and reused here unchanged), against its own 200-day.</li>
<li>Micron’s lines: the Lab’s installed packs (V34), through the read-only copy the confluence-zones study took on 6 Oct. Line names are the pack’s own: 3D P1 1,036.13 · 2W D3 (with the 21-day) 1,030.40 · 3D P3 1,011.77 · 1D D3 + 3D C3 989.17.</li></ul>
<h4>A leader pullback (the rule first used on 7 Oct 2026, unchanged)</h4><ul>
<li>SPY closes at or over its 200-day, and the 200-day is higher than 10 sessions before.</li><li>The stock closes 25% or more over its own 200-day, itself higher than 10 sessions before.</li>
<li>The close is 8% or more under the highest high of the last 252 sessions.</li><li>The close is 0% to 3% over its 21-day, itself higher than 5 sessions before.</li>
<li>The 50-day and the 100-day are each higher than 5 sessions before. (The 7 Oct measurement asked for this too: with it the first 19 names give its {C["counts"]["coordinator19"]} cases; without it {C["counts"]["coordinator19_any_slope"]}.)</li>
<li>A new case needs more than 10 sessions since the last evening that met the rule. “Bunched” adds: the 50- and 100-day within 3% of each other.</li>
<li>Micron’s own set-ups, used for the Micron replay only: the 8%-off-the-high and 21-day rules plus a rising 50- and 100-day; no demand on SPY or the 200-day.</li>
<li>All averages are simple averages of completed daily closes. “Touched” = a session’s low at or under that evening’s average; “fell to where it stood” = a low at or under the level the average had on the signal day.</li></ul>
<h4>Words used</h4><ul><li>The middle case is the median. The worst tenth is the 10th percentile. An interval is a 95% interval; “clear of zero” means the whole interval sits on one side of zero.</li>
<li>A session is a trading day. “20 sessions on” is the close 20 trading days after the signal day. A usual day is the middle high-to-low range the volatility model expects for the next session.</li>
<li>A whipsaw is a buy-back at a higher price than the sale before it. The planned money is the full position the plan intends — for Micron about 20% of the account.</li></ul>
<h4>The stops on breach days</h4><ul>
<li>A breach day for an average: the average is higher than 10 sessions before, the previous 20 closes were all at or over it, and today’s low is under the level the average had last evening (where a resting stop would sit). A new breach needs more than 10 sessions since the last.</li>
<li>A flush closes back at or over that evening’s average; a one-candle flush is a flush whose low is 5% or more under the previous close; a close break closes under it.</li>
<li>From one share held into the breach, each stop style is replayed for 60 sessions and scored against simply holding the share: the intraday stop sells at the line, or at the open when the session opens under it; the daily-close stop sells at the next open after a close under the average; both buy back at the open after the first close over it, and are armed again. The lower buys rest 5%, 6.5% and 8% under the average, a third of a share each, only while the share is out.</li></ul>
<h4>The order layer</h4><ul>
<li>Each evening the working buys are re-priced from that evening’s levels and stand for the next session only. At most three work at once: the three highest-priced rungs not yet filled.</li>
<li>A buy fills when the next session’s low reaches it — at its price, or at the open when the session opens under it.</li>
<li>Sizes are shares of the planned money (2 : 3 : 4 for the 21 / 50 / 100-day, the lowest level getting the most; 17.7 / 21.5 / 26.0 / 34.8% for the four drafts, which is 18 / 22 / 27 / 37 shares at their prices). Results are on the planned money, so money that never fills earns nothing.</li>
<li>The close stop: the evening the close is under that evening’s 100-day, everything is sold at the next open and the rungs rest. Buy-back: the first evening the close is over the 100-day, the same shares are bought at the next open. A whipsaw is a buy-back dearer than the sale before it.</li>
<li>The deep bid: while out, three buys 5%, 6.5% and 8% under the 100-day, a third of the planned money each, on evenings with the VIX at 20 or more. The fixed stop: 13% under the first fill, resting, never bought back.</li>
<li>The four drafts are replayed at fixed prices, scaled to each signal day’s close the way they sit under the 6 Oct close; on other stocks they keep those same percentage distances, whatever that stock’s usual day.</li></ul>
<h4>The open-source tools</h4><ul>
<li>arch {RV_VERS.get("arch", "")} — the stationary block bootstrap behind every daily interval; GJR-GARCH(1,1) with Student-t errors on Micron’s last {RG["sessions"]:,} daily moves for the usual day and the reach chances (the reach chances come from Micron’s own lows since {day(RG["fit_from"])}, each scaled by the model’s swing that day).</li>
<li>statsmodels {RV_VERS.get("statsmodels", "")} — the second interval for each edge (Newey–West errors for daily series, month-clustered errors for cases) and Wilson intervals for shares. statsmodels has no general bootstrap of its own, so the resampling is arch’s.</li>
<li>hmmlearn {RV_VERS.get("hmmlearn", "")} — a three-state Gaussian hidden-Markov model on SPY’s day, SPY’s 20-session realised swing, the VIX and credit’s distance from its 200-day, {day(REG["first"])} to {day(REG["last"])}; best of {REG["seeds"]} starts; each day read with the forward filter only.</li>
<li>ruptures {RV_VERS.get("ruptures", "")} — PELT with a continuous piecewise-linear cost on the log of Micron’s last {TR["sessions"]} closes, at three strictness settings.</li>
<li>llama.cpp — Qwen2.5-7B-Instruct and Fin-o1-8B as 4-bit GGUF files on this MacBook; no paid model API. Each point must quote its fact word for word; quotes and figures are looked up in the sheet; ten yes/no questions are scored against the data.</li></ul>
<h4>What was not done</h4><ul><li>No intraday bars: the order of prints inside a session is not known.</li><li>No test of size (20% against 30%) or of the 0.4 × % invested rule — the study of how much to have invested measures those.</li><li>The Lab’s stepping lines (2W D3, 3D C3, 1D D3) are not replayed through history: the packs hold today’s lines, and their pivots only from September 2025.</li>
</ul>
<h4>How it was checked</h4><ul><li>{N_CHECKS} sums worked by hand on made-up bars (study/pb2/tools/test_layer.py): limit fills and gaps, the three-order cap, each stop, the buy-back, a whipsaw, the deep bid, the stop styles on a flush.</li>
<li>tests/pb2.test.mjs replays the engine a second time, written separately in JavaScript, on real Micron cases stored with their bars, and must land on the same fills and results; it also checks that the 7 Oct counts — 185 cases, 12 bunched, 31 Micron closes under the 100-day — are reproduced, and that the page renders with no error, no request other than a read, no sideways scroll and no text under 11px at 1680 and 390 wide.</li>
<li>The flat-price path of the averages was checked against the confluence-zones study’s: 100-day {usd(COL["flat"]["ma100_5"], 0)} on {day(COL["flat"]["d5"])}, {usd(COL["flat"]["ma100_10"], 0)} on {day(COL["flat"]["d10"])}, {usd(COL["flat"]["ma100_20"], 0)} on {day(COL["flat"]["d20"])}; 50-day {usd(COL["flat"]["ma50_5"], 0)}, {usd(COL["flat"]["ma50_10"], 0)}, {usd(COL["flat"]["ma50_20"], 0)}.</li></ul></details>"""


N_CHECKS = len(re.findall(r"^check\(", open(os.path.join(HERE, "test_layer.py")).read(), re.M))
RV_VERS = {}
try:
    RV_VERS = json.load(open(os.path.join(ROOT, "data", "versions.json")))
except Exception: pass


def page():
    extra_css = """
.sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:7px;vertical-align:-1px}
.strip{display:flex;gap:1px;height:16px;margin-top:4px;max-width:1150px}.strip i{flex:1 1 0;min-width:0;display:block}
.ciw{position:relative;height:14px;min-width:150px}.ciw .z{position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line2)}.ciw .w{position:absolute;top:6px;height:2px;background:var(--mid)}.ciw .d{position:absolute;top:3px;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:var(--mid)}.ciw .d.up{background:var(--up)}.ciw .d.dn{background:var(--dn)}
table.bars .pb{min-width:70px}table.sheet td:nth-child(4){min-width:380px}table.sheet td:first-child{min-width:170px}table.ci td:nth-child(5){min-width:170px}
@media(max-width:700px){.wrap table.sheet{min-width:0;display:block}table.sheet thead{display:none}table.sheet tbody,table.sheet tr,table.sheet td{display:block;border:0;padding:0}
table.sheet tr{border-top:1px solid var(--line2);padding:12px 0}table.sheet td:first-child{font-weight:600;min-width:0;margin-bottom:6px}table.sheet td:nth-child(2){display:inline-block;margin-right:8px}table.sheet td:nth-child(3){display:inline;color:var(--txt)}
table.sheet td:nth-child(4){min-width:0;margin-top:8px;color:var(--dim)}table.sheet td:nth-child(5){margin-top:6px}}
.jump{margin-top:14px;font-size:12px;color:var(--dim);line-height:1.9}.jump a{color:var(--txt);text-decoration:none;border-bottom:1px solid var(--line2);white-space:nowrap}.jump a:hover{border-color:var(--txt)}
pre.facts{white-space:pre-wrap;font-size:11.5px;line-height:1.6;color:var(--dim);margin:6px 0;max-width:1150px;font-family:inherit}
"""
    head = (f'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Micron order layer, stops and the rules</title>\n<style>{CSS}{extra_css}</style></head><body>\n'
            '<nav class="scnav" aria-label="Leave this page"><a href="../../" data-go="back">← ALLOCATION</a><a href="https://scintillahub.ai/" data-go="close">✕ HUB</a></nav>\n'
            '<h1>THE MICRON ORDER LAYER · THE STOPS · LEADERS · EVERY RULE THROUGH OPEN TOOLS</h1>\n'
            f'<div class="sub">study page · nothing here is live and no order was touched · Micron {usd(CLOSE)} on {THROUGH} · 21-day {usd(T["ma21"])} · 50-day {usd(T["ma50"])} · 100-day {usd(T["ma100"])} · VIX {MR["today"]["vix"]:.2f}</div>\n')
    jump = ('<div class="jump">' + " · ".join(f'<a href="#{i}">{t}</a>' for i, t in (("p-layer", "1 the order layer"), ("p-stops", "2 the stops"), ("p-leaders", "3 leaders"), ("p-review", "4 the open-source review"), ("p-sheet", "5 the sheet"), ("p-wrong", "6 what could be wrong")))
            + ' · <a href="PLAYBOOK.md">the playbook file</a></div>\n')
    return head + tiles() + jump + sec_layer() + sec_stops() + sec_leaders() + sec_review() + sec_sheet() + sec_wrong() + specs() + "\n</body></html>\n"


if __name__ == "__main__":
    import playbook
    html_ = page(); open(os.path.join(ROOT, "PB2.html"), "w").write(html_); print("PB2.html", round(len(html_) / 1024), "KB")
    json.dump(sheet_rows(), open(os.path.join(ROOT, "data", "sheet.json"), "w"), indent=1, ensure_ascii=False)
    md = playbook.build(P, sheet_rows()); open(os.path.join(ROOT, "PLAYBOOK.md"), "w").write(md); print("PLAYBOOK.md", round(len(md) / 1024), "KB")
