#!/usr/bin/env python3
"""PB2 · daily-close stops against intraday stops, on the days a stock's LOW went under a rising average.

A BREACH DAY for an average (21-, 50- or 100-day): the average is higher than 10 sessions before, the previous 20 closes
were all at or over it, and today's low is under the level the average had LAST evening (the level a resting stop would
sit at). A new breach counts only when more than 10 sessions have passed since the last one.
  * FLUSH: the session closes back at or over that evening's average.
  * ONE-CANDLE FLUSH: a flush whose low is 5% or more under the previous close.
  * CLOSE BREAK: the session closes under it.

From one share held before the breach, four ways to run a stop are replayed for 60 sessions and each is scored AGAINST
SIMPLY HOLDING THE SHARE (positive = the stop left you better off than holding, in % of the close before the breach):
  intraday        a stop resting at the level: sold at the level, or at the open when the session opens under it;
                  bought back at the next open after the first close back over the average.
  daily close     sold at the next open after a close under the average; bought back the same way.
  intraday+lower  Alan's question: the resting stop kicks the share out and three buys rest lower, at 5%, 6.5% and 8% under
                  the average (a third of a share each); whatever they did not buy is bought back after a close over it.
  close+lower     the daily-close stop with the same three lower buys.
A stop that has been bought back is armed again."""
import numpy as np
from common import load, med, mean, share, pctl

DEEP = (0.05, 0.065, 0.08)


def breach_days(B, N, need_fwd=60, rising=10, above=20, gap=10):
    a = B.ma(N); ev = []; last = -99
    for t in range(max(N + rising + above, 130), B.n - need_fwd):
        y = t - 1
        if not np.isfinite(a[y - rising]) or a[y] <= a[y - rising]: continue
        if not bool(np.all(B.c[y - above + 1: y + 1] >= a[y - above + 1: y + 1])): continue
        if B.l[t] < a[y]:
            if t - last > gap: ev.append(t)
            last = t
    return ev


def run_policy(B, a, t, style, lower, H=60):
    """One share held into breach day t. Returns the money made or lost AGAINST HOLDING at 20 and 60 sessions (share of the
    close before the breach), the sales, the whipsaws (a buy-back dearer than the sale before it) and the lower buys filled."""
    o, l, c = B.o, B.l, B.c; base = c[t - 1]
    sh = 1.0; cash = 0.0; state = "IN"; pending = None; sale_px = None
    sales = whips = lowfills = 0; done = [False, False, False]; eff = {}; first_sale_px = None; first_rebuy_px = None
    for s in range(t, t + H + 1):
        y = s - 1
        if pending:                                                   # decided at last evening's close, done at this open
            kind, q = pending; pending = None
            if kind == "sell" and q > 1e-12:
                cash += q * o[s]; sh -= q; sale_px = float(o[s]); sales += 1; state = "OUT"; done = [False, False, False]
                if first_sale_px is None: first_sale_px = sale_px
            elif kind == "buy" and q > 1e-12:
                cash -= q * o[s]; sh += q
                if first_rebuy_px is None: first_rebuy_px = float(o[s])
                if sale_px is not None and o[s] > sale_px: whips += 1
        if state == "IN" and style == "intraday" and sh > 1e-12 and l[s] < a[y]:
            px = min(o[s], a[y]); cash += sh * px; sale_px = float(px); sh = 0.0; sales += 1; state = "OUT"; done = [False, False, False]
            if first_sale_px is None: first_sale_px = sale_px
        if state == "OUT" and lower and sh < 1.0 - 1e-9:                # (same session as the stop too: the candle that kicks the share out can reach them)
            for j, x in enumerate(DEEP):                                # the lower buys rest only while the share is out
                if done[j] or sh >= 1.0 - 1e-9: continue
                lv = a[y] * (1 - x)
                px = o[s] if o[s] <= lv else (lv if l[s] <= lv else None)
                if px is not None:
                    q = min(1 / 3, 1.0 - sh); cash -= q * px; sh += q; done[j] = True; lowfills += 1
            if sh >= 1.0 - 1e-9: state = "BELOW"                      # fully bought back under the line: no stop until it closes over it
        if state == "IN" and style == "close" and sh > 1e-12 and c[s] < a[s]: pending = ("sell", sh)
        elif state == "OUT" and c[s] > a[s]:
            state = "IN"
            if sh < 1.0 - 1e-9: pending = ("buy", 1.0 - sh)
        elif state == "BELOW" and c[s] > a[s]: state = "IN"
        k = s - t
        if k in (20, 60): eff[k] = (cash + (sh - 1.0) * c[s]) / base
    return dict(eff20=eff.get(20), eff60=eff.get(60), sales=sales, whips=whips, lowfills=lowfills, out_at_end=(state == "OUT"), first_sale_px=first_sale_px, first_rebuy_px=first_rebuy_px)


POLICIES = {"intraday": ("intraday", False), "close": ("close", False), "intraday_lower": ("intraday", True), "close_lower": ("close", True)}


def breach_study(syms, N):
    rows = []
    for sym in syms:
        B = load(sym)
        if B is None or B.n < 400: continue
        a = B.ma(N)
        for t in breach_days(B, N):
            y = t - 1; lvl = a[y]
            r = dict(sym=sym, d=B.d[t], level=float(lvl), prev_close=float(B.c[y]), low_vs_prev=float(B.l[t] / B.c[y] - 1), close_vs_level=float(B.c[t] / a[t] - 1),
                     gap_open_under=bool(B.o[t] < lvl), flush=bool(B.c[t] >= a[t]), r20=float(B.c[t + 20] / B.c[y] - 1), r60=float(B.c[t + 60] / B.c[y] - 1),
                     low_under_level=float(B.l[t] / lvl - 1), reached_5_under=bool(B.l[t] <= lvl * 0.95), dd20=float(B.l[t:t + 21].min() / B.c[y] - 1))
            r["big_flush"] = bool(r["flush"] and r["low_vs_prev"] <= -0.05)
            r["intraday_sale_vs_close"] = float(min(B.o[t], lvl) / B.c[t] - 1)          # where the resting stop sold, against that same day's close
            for name, (style, lower) in POLICIES.items(): r[name] = run_policy(B, a, t, style, lower)
            rows.append(r)
    return rows


def summarise(rows):
    def block(sub):
        n = len(sub)
        if not n: return dict(n=0)
        out = dict(n=n, r60_mean=mean([r["r60"] for r in sub]), r60_p10=pctl([r["r60"] for r in sub], 10), r60_worst=min(r["r60"] for r in sub), r20_med=med([r["r20"] for r in sub]), r60_med=med([r["r60"] for r in sub]), r60_pos=share([r["r60"] > 0 for r in sub]), dd20_med=med([r["dd20"] for r in sub]),
                   low_vs_prev_med=med([r["low_vs_prev"] for r in sub]), intraday_sale_vs_close_mean=mean([r["intraday_sale_vs_close"] for r in sub]),
                   intraday_sale_vs_close_med=med([r["intraday_sale_vs_close"] for r in sub]), reached_5_under=share([r["reached_5_under"] for r in sub]), gap_open_under=share([r["gap_open_under"] for r in sub]))
        for p in POLICIES:
            e60 = [r[p]["eff60"] for r in sub]; e20 = [r[p]["eff20"] for r in sub]
            res = [r["r60"] + r[p]["eff60"] for r in sub if r[p]["eff60"] is not None]          # what the share plus the stop's trades was worth 60 sessions on
            out[p] = dict(res60_mean=mean(res), res60_med=med(res), res60_p10=pctl(res, 10), res60_worst=min(res), res60_pos=share([v > 0 for v in res]),
                          eff20_mean=mean(e20), eff20_med=med(e20), eff60_mean=mean(e60), eff60_med=med(e60), eff60_p10=pctl(e60, 10), eff60_p90=pctl(e60, 90), beat_hold60=share([v > 0 for v in e60 if v is not None]),
                          lost_to_hold60=share([v < 0 for v in e60 if v is not None]), same_as_hold60=share([v == 0 for v in e60 if v is not None]),
                          sales_per_case=mean([r[p]["sales"] for r in sub]), whips_per_case=mean([r[p]["whips"] for r in sub]), whipped=share([r[p]["whips"] > 0 for r in sub]),
                          lowfill_any=share([r[p]["lowfills"] > 0 for r in sub]), out_at_end=share([r[p]["out_at_end"] for r in sub]), sold=share([r[p]["sales"] > 0 for r in sub]))
        return out
    return dict(all=block(rows), flush=block([r for r in rows if r["flush"]]), big_flush=block([r for r in rows if r["big_flush"]]), close_break=block([r for r in rows if not r["flush"]]),
                flush_share=share([r["flush"] for r in rows]), big_flush_share=share([r["big_flush"] for r in rows]))


def first_close_under(sym, N=100):
    """The coordinator's 7 Oct count: the first daily close under a RISING average after 20 or more sessions over it."""
    B = load(sym); c, l, o = B.c, B.l, B.o; a = B.ma(N); rows = []
    for i in range(130, B.n - 60):
        if np.isfinite(a[i - 10]) and c[i] < a[i] and bool(np.all(c[i - 20:i] >= a[i - 20:i])) and a[i] > a[i - 10]:
            back = next((j - i for j in range(i + 1, i + 21) if c[j] > a[j]), None)
            back60 = next((j - i for j in range(i + 1, i + 61) if c[j] > a[j]), None)
            r = dict(d=B.d[i], close=float(c[i]), level=float(a[i]), under_by=float(c[i] / a[i] - 1), back_within20=back is not None, back_day=back, back_day60=back60,
                     dd20=float(l[i + 1:i + 21].min() / c[i] - 1), dd60=float(l[i + 1:i + 61].min() / c[i] - 1), r20=float(c[i + 20] / c[i] - 1), r60=float(c[i + 60] / c[i] - 1),
                     sell_open=float(o[i + 1]), sell_open_vs_close=float(o[i + 1] / c[i] - 1))
            # the stop as Alan frames it: out at the next open, back in at the open after the first close over the 100-day
            if back60 is not None and i + back60 + 1 < B.n:
                rb = float(o[i + back60 + 1]); r.update(rebuy_px=rb, rebuy_vs_sale=float(rb / o[i + 1] - 1), whipsaw=bool(rb > o[i + 1]))
            else: r.update(rebuy_px=None, rebuy_vs_sale=None, whipsaw=None)
            # the deepest it traded under the average while it stayed under (inside 60 sessions)
            end = (i + back60) if back60 is not None else (i + 60)
            r["deepest_under_level"] = float(min(l[k] / a[k - 1] - 1 for k in range(i + 1, end + 1)))
            for x in (0.05, 0.065, 0.08): r[f"reached_{int(round(x * 1000))}"] = bool(any(l[k] <= a[k - 1] * (1 - x) for k in range(i + 1, end + 1)))
            rows.append(r)
    return rows
