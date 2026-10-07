#!/usr/bin/env python3
"""PB2 · the order layer, replayed one session at a time.

THE MECHANIC (the same for every strategy)
  * Each evening the working buy orders are re-priced from that evening's levels and stand for the next session only.
  * At most THREE buy orders work at once: the three highest-priced rungs not yet filled. A deeper rung starts working
    the evening after one above it fills — so one falling-knife session can fill three rungs at most.
  * A buy order at level L fills in the next session if that session's low reaches L. It fills at L — or at the open,
    when the session opens under L (a gap down buys cheaper than the order).
  * Sizes are DOLLARS, as a share of the planned money (1.00 = the whole planned position, e.g. the 20% of the account).
    A rung of 0.44 puts 44% of the planned money to work at whatever price it fills, so a name that runs up before it
    pulls back buys fewer shares, never more money. Every result is counted against the PLANNED money, so a strategy
    that never fills earns 0, not "n/a". One build never has more than the planned money at work at once; a strategy
    that sells and re-buys again and again can still lose more than that in total across its round trips (two cases of
    562 did, with the deep bid; the worst was Moderna from 20 Sep 2021), and the tables show that worst case.

THE STOPS
  * daily-close stop on the 100-day: the evening the close is under that evening's 100-day, the stoppable shares are sold
    at the NEXT session's open (Alan sees the close, then acts). While out, the rungs rest (most of them now sit above
    the price and would simply buy it straight back).
  * buy-back: the first evening the close is back above the 100-day, the same number of shares is bought back at the next open.
    A WHIPSAW is a buy-back at a higher price than the sale that preceded it.
  * deep bid: while out, three bids at 5%, 6.5% and 8% under the 100-day, a third of the planned money each (never past
    the planned money in total), placed only on evenings when the VIX closed at 20 or more.
  * fixed stop: a resting stop 13% under the first fill ("the old 900" against a 1,036 first fill); when a session's low
    reaches it everything is sold at the stop — or at the open, when the session opens under it — and nothing is re-bought.

Nothing here places, drafts or reads an order anywhere: it is arithmetic on stored daily bars."""
import numpy as np

GROW = (2 / 9, 3 / 9, 4 / 9)          # 21-day, 50-day, 100-day: sizes growing as price falls (2 : 3 : 4)
EQUAL = (1 / 3, 1 / 3, 1 / 3)
DRAFT_SHARES = (18, 22, 27, 37)        # the drafts of 7 Oct 2026: 104 shares
DRAFT_PRICES = (1036.13, 1030.40, 1011.77, 989.17)
DRAFT_NAMES = ("3D P1 1,036.13", "21-day + 2W D3 1,030.40", "3D P3 1,011.77", "1D D3 + 3D C3 989.17")
DRAFT_CLOSE = 1045.56                  # Micron's close on 6 Oct 2026
DEEP = (0.05, 0.065, 0.08)
MAX_WORKING = 3
HORIZONS = (20, 60, 120)

STRATEGIES = {
    "close":      dict(label="Buy it all at that day's close (no waiting)", kind="close"),
    "allin21":    dict(label="All in at the 21-day", kind="ladder", rungs="ma21"),
    "pyramid":    dict(label="Pyramid 21 / 50 / 100-day, bigger lower, no stop", kind="ladder", rungs="ma", w=GROW),
    "pyr_stop":   dict(label="Pyramid + stop on a daily close under the 100-day, buy back on a close above", kind="ladder", rungs="ma", w=GROW, stop="close100", stop_scope="all"),
    "pyr_stop_deep": dict(label="The same + deep bid 5–8% under the 100-day, only with the VIX at 20 or more", kind="ladder", rungs="ma", w=GROW, stop="close100", stop_scope="all", deep=True),
    "pyr_fixed13": dict(label="Pyramid + fixed stop 13% under the first fill (the old 900)", kind="ladder", rungs="ma", w=GROW, stop="fixed13"),
    # variants, reported under the main table
    "pyr_equal":  dict(label="Pyramid in equal thirds (no stop)", kind="ladder", rungs="ma", w=EQUAL),
    "pyr_stop_addons": dict(label="Pyramid + the 100-day close stop on the add-ons only (the first buy is kept)", kind="ladder", rungs="ma", w=GROW, stop="close100", stop_scope="addons"),
    "pyr_stop_atclose": dict(label="Pyramid + the 100-day close stop, sold and re-bought AT the close instead of the next open", kind="ladder", rungs="ma", w=GROW, stop="close100", stop_scope="all", exec_at="close"),
    "pyr_deep_anyvix": dict(label="Pyramid + close stop + deep bid 5–8% under the 100-day at ANY VIX", kind="ladder", rungs="ma", w=GROW, stop="close100", stop_scope="all", deep=True, deep_any_vix=True),
    "pyr_stop_2closes": dict(label="Pyramid + the 100-day stop only after TWO closes in a row under it (candidate)", kind="ladder", rungs="ma", w=GROW, stop="close100", stop_scope="all", confirm=2),
    "pyr_stop_band3": dict(label="Pyramid + the 100-day stop only on a close 3% or more under it (candidate)", kind="ladder", rungs="ma", w=GROW, stop="close100", stop_scope="all", band=0.03),
    "draft":      dict(label="The four drafts as placed (fixed prices, 18 / 22 / 27 / 37 shares)", kind="ladder", rungs="draft"),
    "draft_equal": dict(label="The four drafts at the same prices, a quarter of the money each", kind="ladder", rungs="draft", equal=True),
}
MAIN = ["allin21", "pyramid", "pyr_stop", "pyr_stop_deep", "pyr_fixed13"]


def limit_fill(o, l, level):
    """A buy limit standing for one session: None when not reached, else the price paid."""
    if not np.isfinite(level): return None
    if o <= level: return float(o)
    if l <= level: return float(level)
    return None


def replay(o, h, l, c, ma21, ma50, ma100, i0, strat, H=120, vix=None, extra=None):
    """Replay one strategy from the signal day i0 (orders work from session i0+1). Prices come back divided by the
    signal-day close, so 0.97 means 3% under it. `extra` = optional fixed-price rungs [(name, price, weight)]."""
    S = STRATEGIES[strat] if isinstance(strat, str) else strat
    n = len(c); C0 = float(c[i0]); last = min(n - 1, i0 + H)
    out = {"strategy": strat if isinstance(strat, str) else S.get("key"), "C0": C0, "sessions": last - i0}
    if S["kind"] == "close":
        res = {}
        for Hh in HORIZONS:
            if i0 + Hh <= n - 1:
                res[str(Hh)] = dict(pnl=float(c[i0 + Hh] / C0 - 1), dd=float(min(0.0, l[i0 + 1:i0 + Hh + 1].min() / C0 - 1)), held=1.0, drop_vs_cost=float(l[i0 + 1:i0 + Hh + 1].min() / C0 - 1))
            else: res[str(Hh)] = None
        out.update(avg_cost=1.0, filled_any=True, first_fill_day=0, rungs=[dict(name="close", w=1.0, filled=True, day=0, px=1.0)], res=res, stops=0, whipsaws=0, whipsaw_cost=0.0, deep_fills=0, rebuys=0, max_same_day_fills=1, stop_days=[], never_back=False)
        return out

    # ---- the rungs
    if S["rungs"] == "ma21": rungs = [dict(name="21-day", w=1.0, f=lambda t: ma21[t])]
    elif S["rungs"] == "ma":
        w = S["w"]; lv = [("21-day", ma21), ("50-day", ma50), ("100-day", ma100)]
        if extra is None:
            order = sorted(range(3), key=lambda j: -lv[j][1][i0])          # highest level first: it gets the smallest size
            size = {order[r]: w[r] for r in range(3)}
            rungs = [dict(name=lv[j][0], w=size[j], f=(lambda t, a=lv[j][1]: a[t])) for j in range(3)]
        else:                                                              # the caller sized every rung (averages + fixed pivots) itself
            rungs = [dict(name=lv[j][0], w=w[j], f=(lambda t, a=lv[j][1]: a[t])) for j in range(3)] + [dict(name=nm, w=wt, f=(lambda t, p=px: p)) for nm, px, wt in extra]
    elif S["rungs"] == "draft":
        usd = [DRAFT_SHARES[k] * DRAFT_PRICES[k] for k in range(4)]; tot = float(sum(usd))      # 18 / 22 / 27 / 37 shares at their prices = 17.7 / 21.5 / 26.0 / 34.8% of the money
        rungs = [dict(name=DRAFT_NAMES[k], w=(0.25 if S.get("equal") else usd[k] / tot), f=(lambda t, p=DRAFT_PRICES[k] / DRAFT_CLOSE * C0: p)) for k in range(4)]
    else: raise ValueError(S["rungs"])
    for r in rungs: r.update(filled=False, day=None, px=None)

    stop = S.get("stop"); scope = S.get("stop_scope", "all"); at_close = S.get("exec_at") == "close"; confirm = S.get("confirm", 1); band = S.get("band", 0.0); under_run = 0
    sh = 0.0; cost = 0.0; real = 0.0             # shares held (1.0 = what the planned money buys at the signal close), what they cost and banked profit or loss (shares of the planned money)
    first_sh = 0.0; first_cost = 0.0             # the first buy, tracked apart for the add-ons-only stop
    state = "IN"; pre_stop_sh = 0.0; sale_px = None; pending = None     # pending = ("sell"| "buy", shares) to do at the next open
    deep_done = [False, False, False]
    stops = whips = rebuys = deep_fills = 0; whip_cost = 0.0; stop_days = []; fixed_px = None; dead = False
    first_fill_day = None; max_same = 0
    eq_low = np.zeros(last - i0 + 1); eq_close = np.zeros(last - i0 + 1); held = np.zeros(last - i0 + 1); vs_cost = np.full(last - i0 + 1, np.nan)

    def buy(shares, px):                          # a number of shares (the buy-back)
        nonlocal sh, cost
        sh += shares; cost += shares * px / C0

    def buy_usd(w, px):                           # a share of the planned money (a rung, a deep bid)
        nonlocal sh, cost
        sh += w * C0 / px; cost += w

    def sell(shares, px):
        nonlocal sh, cost, real
        if sh <= 1e-12: return
        frac = min(1.0, shares / sh); c_out = cost * frac
        real += shares * px / C0 - c_out; cost -= c_out; sh -= shares
        if sh < 1e-12: sh = 0.0; cost = 0.0

    def stoppable():
        return sh if scope == "all" else max(0.0, sh - first_sh)

    for t in range(i0 + 1, last + 1):
        k = t - i0; y = t - 1                                   # y = the evening the orders were set
        # 1 · what was decided last evening and happens at this open
        if pending and not dead:
            kind, q = pending; pending = None
            if kind == "sell" and q > 1e-12:
                sell(q, o[t]); sale_px = float(o[t])
            elif kind == "buy" and q > 1e-12:
                buy(q, o[t]); rebuys += 1
                if sale_px is not None and o[t] > sale_px: whips += 1; whip_cost += q * (o[t] - sale_px) / C0
        # 2 · the resting buy orders set last evening
        fills_today = 0
        if state == "IN" and not dead:
            open_r = [r for r in rungs if not r["filled"] and np.isfinite(r["f"](y))]
            open_r.sort(key=lambda r: -r["f"](y))
            for r in open_r[:MAX_WORKING]:
                px = limit_fill(o[t], l[t], r["f"](y))
                if px is not None:
                    r.update(filled=True, day=k, px=px / C0); buy_usd(r["w"], px); fills_today += 1
                    if first_fill_day is None:
                        first_fill_day = k; first_sh = r["w"] * C0 / px; first_cost = r["w"]
                        if stop == "fixed13": fixed_px = 0.87 * px
        elif state == "OUT" and not dead and S.get("deep") and vix is not None and (S.get("deep_any_vix") or (np.isfinite(vix[y]) and vix[y] >= 20)) and np.isfinite(ma100[y]):
            for j, x in enumerate(DEEP):
                if deep_done[j] or cost >= 1.0 - 1e-9: continue
                px = limit_fill(o[t], l[t], ma100[y] * (1 - x))
                if px is not None:
                    buy_usd(min(1 / 3, 1.0 - cost), px); deep_done[j] = True; deep_fills += 1; fills_today += 1
        max_same = max(max_same, fills_today)
        # 3 · the resting stops (a session's low decides)
        if not dead and stop == "fixed13" and fixed_px is not None and sh > 0 and l[t] <= fixed_px:
            sell(sh, min(o[t], fixed_px)); stops += 1; stop_days.append(k); dead = True
        # 4 · the evening: the daily-close rules
        if not dead and stop == "close100" and np.isfinite(ma100[t]):
            under_run = under_run + 1 if c[t] < ma100[t] * (1 - band) else 0          # closes in a row under the line (less the band, when one is set)
            if state == "IN" and stoppable() > 1e-12 and under_run >= confirm:
                q = stoppable(); pre_stop_sh = sh; stops += 1; stop_days.append(k); state = "OUT"; deep_done = [False, False, False]
                if at_close: sell(q, c[t]); sale_px = float(c[t])
                else: pending = ("sell", q)
            elif state == "OUT" and c[t] > ma100[t]:
                q = max(0.0, pre_stop_sh - sh); state = "IN"
                if q > 1e-12:
                    if at_close:
                        buy(q, c[t]); rebuys += 1
                        if sale_px is not None and c[t] > sale_px: whips += 1; whip_cost += q * (c[t] - sale_px) / C0
                    else: pending = ("buy", q)
        # 5 · the day's marks
        eq_low[k] = real + sh * l[t] / C0 - cost; eq_close[k] = real + sh * c[t] / C0 - cost; held[k] = cost
        if sh > 1e-12: vs_cost[k] = (l[t] / C0) / (cost / sh) - 1

    filled = [r for r in rungs if r["filled"]]
    wsum = sum(r["w"] for r in filled)
    res = {}
    for Hh in HORIZONS:
        if i0 + Hh <= n - 1:
            v = vs_cost[1:Hh + 1]; v = v[np.isfinite(v)]
            res[str(Hh)] = dict(pnl=float(eq_close[Hh]), dd=float(min(0.0, eq_low[1:Hh + 1].min())), held=float(held[Hh]), drop_vs_cost=(float(v.min()) if len(v) else None))
        else: res[str(Hh)] = None
    out.update(avg_cost=(wsum / sum(r["w"] / r["px"] for r in filled) if wsum else None), filled_any=bool(filled), first_fill_day=first_fill_day,
               rungs=[dict(name=r["name"], w=r["w"], filled=r["filled"], day=r["day"], px=r["px"]) for r in rungs], res=res, stops=stops, whipsaws=whips,
               whipsaw_cost=whip_cost, deep_fills=deep_fills, rebuys=rebuys, max_same_day_fills=max_same, stop_days=stop_days, never_back=(state == "OUT" or dead))
    return out
