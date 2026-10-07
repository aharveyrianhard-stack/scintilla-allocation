#!/usr/bin/env python3
"""PB2 · the set-ups ("cases") every part of the study starts from, by the coordinator's own 7 Oct 2026 rule.

A LEADER PULLBACK, on one evening:
  1. SPY closes at or over its 200-day, and that 200-day is higher than 10 sessions before;
  2. the stock closes 25% or more over its own 200-day, and that 200-day is higher than 10 sessions before;
  3. the close is 8% or more under the highest high of the last 252 sessions;
  4. the close is 0% to 3% over its 21-day, and that 21-day is higher than 5 sessions before.
  5. the 50-day and the 100-day are each higher than 5 sessions before (the coordinator's script asked for this too:
     with it the 19 names give its 185 cases, without it 196).
A new case starts only when more than 10 sessions have passed since the last evening that met the rule.
"BUNCHED" adds: the 50-day and the 100-day are within 3% of each other.

MICRON'S OWN SET-UPS is a wider net used for the Micron replay only (so it has enough cases): rules 3 and 4 plus a
rising 50-day and 100-day; no demand on SPY and none on the 200-day."""
import numpy as np
from common import load, FUND_OF, U, on_dates, rsi


def _qualifies(B, i, spy, mode):
    c, h = B.c, B.h; a21, a50, a100, a200 = B.ma(21), B.ma(50), B.ma(100), B.ma(200)
    if not np.isfinite(a21[i]) or not (0 <= c[i] / a21[i] - 1 <= 0.03 and a21[i] > a21[i - 5]): return False
    if c[i] > 0.92 * B.hi252()[i]: return False
    rising50_100 = np.isfinite(a100[i - 5]) and a50[i] > a50[i - 5] and a100[i] > a100[i - 5]
    if mode == "micron_own": return bool(rising50_100)
    j = spy.ix.get(B.d[i]); s200 = spy.ma(200)
    if j is None or not np.isfinite(s200[j]) or spy.c[j] < s200[j] or s200[j] <= s200[j - 10]: return False
    if not (np.isfinite(a200[i]) and np.isfinite(a200[i - 10]) and c[i] >= 1.25 * a200[i] and a200[i] > a200[i - 10]): return False
    if mode == "leader_any_slope": return True                  # 196 cases on the coordinator's 19 names
    if mode == "leader": return bool(rising50_100)              # the coordinator's 185: its script also asked for a rising 50-day and 100-day
    if mode == "bunched": return bool(rising50_100 and abs(a50[i] / a100[i] - 1) <= 0.03)
    raise ValueError(mode)


def find_cases(sym, mode="leader", need_fwd=60, gap=10):
    """Case start indexes for one symbol. need_fwd sessions of outcome must exist after the case (60 = the coordinator's)."""
    B = load(sym); spy = load("SPY")
    if B is None: return []
    ev = []; last = -99
    for i in range(260, B.n - need_fwd):
        if _qualifies(B, i, spy, mode):
            if i - last > gap: ev.append(i)
            last = i
    return ev


def today_check(sym):
    """Does the newest stored evening meet each rule? (the reading behind 'Micron now')."""
    B = load(sym); spy = load("SPY"); i = B.n - 1; c = B.c[i]
    a21, a50, a100, a200 = B.ma(21)[i], B.ma(50)[i], B.ma(100)[i], B.ma(200)[i]
    return dict(date=B.d[i], close=float(c), ma21=float(a21), ma50=float(a50), ma100=float(a100), ma200=float(a200), over21=float(c / a21 - 1), over200=float(c / a200 - 1),
                off_high=float(c / B.hi252()[i] - 1), high252=float(B.hi252()[i]), gap50_100=float(a50 / a100 - 1),
                leader=_qualifies(B, i, spy, "leader"), bunched=_qualifies(B, i, spy, "bunched"), micron_own=_qualifies(B, i, spy, "micron_own"),
                ma21_5ago=float(B.ma(21)[i - 5]), ma50_5ago=float(B.ma(50)[i - 5]), ma100_5ago=float(B.ma(100)[i - 5]))


def outcome(sym, i, ctx=None):
    """What happened after one case. Every 'touched' is a session LOW at or under that evening's average; every 'closed under'
    is a close under it — the coordinator's own tests, kept so its counts can be reproduced."""
    B = load(sym); c, h, l = B.c, B.h, B.l; a21, a50, a100 = B.ma(21), B.ma(50), B.ma(100); n = B.n
    r = dict(sym=sym, d=B.d[i], i=int(i), close=float(c[i]))
    w10 = range(i + 1, min(n, i + 11)); w20 = range(i + 1, min(n, i + 21)); w60 = range(i + 1, min(n, i + 61)); w120 = range(i + 1, min(n, i + 121))
    r["held21_10"] = not any(c[k] < a21[k] for k in w10)
    r["t50_20"] = any(l[k] <= a50[k] for k in w20); r["t100_20"] = any(l[k] <= a100[k] for k in w20); r["cu100_20"] = any(c[k] < a100[k] for k in w20)
    r["t50_60"] = any(l[k] <= a50[k] for k in w60); r["t100_60"] = any(l[k] <= a100[k] for k in w60); r["cu100_60"] = any(c[k] < a100[k] for k in w60)
    # the same four tests against where each average STOOD on the case day (so an average that climbs up to a flat price does not count)
    r["s50_20"] = any(l[k] <= a50[i] for k in w20); r["s100_20"] = any(l[k] <= a100[i] for k in w20); r["s50_60"] = any(l[k] <= a50[i] for k in w60); r["s100_60"] = any(l[k] <= a100[i] for k in w60)
    r["s21_20"] = any(l[k] <= a21[i] for k in w20); r["s21_10"] = any(l[k] <= a21[i] for k in w10)
    r["dd20"] = float(min(l[k] for k in w20) / c[i] - 1); r["dd60"] = float(min(l[k] for k in w60) / c[i] - 1)
    lows = [l[k] for k in w60]; r["low_day60"] = int(np.argmin(lows)) + 1
    r["r20"] = float(c[i + 20] / c[i] - 1) if i + 20 < n else None; r["r60"] = float(c[i + 60] / c[i] - 1) if i + 60 < n else None
    r["r120"] = float(c[i + 120] / c[i] - 1) if i + 120 < n else None
    hi = h[max(0, i - 251): i + 1].max()
    nh = next((k - i for k in w120 if h[k] >= hi), None); r["nh_day"] = nh; r["nh60"] = bool(nh is not None and nh <= 60)
    r["first_close_under21"] = next((k - i for k in w60 if c[k] < a21[k]), None)
    r["days_under21_20"] = int(sum(c[k] < a21[k] for k in w20))
    f50 = next((k - i for k in w60 if l[k] <= a50[k]), None); f100 = next((k - i for k in w60 if l[k] <= a100[k]), None)
    r["first_touch50"] = f50; r["first_touch100"] = f100
    # one path per case: the deepest average it reached inside the window (20 and 60 sessions)
    def path(win, t50, t100):
        under21 = any(c[k] < a21[k] for k in win)
        return "reached the 100-day" if t100 else ("reached the 50-day, not the 100-day" if t50 else ("closed under the 21-day, stopped short of the 50-day" if under21 else "never closed under the 21-day"))
    r["path60"] = path(w60, r["t50_60"], r["t100_60"]); r["path20"] = path(w20, r["t50_20"], r["t100_20"])
    r["gap50_100"] = float(a50[i] / a100[i] - 1) if np.isfinite(a100[i]) else None
    r["rising50_100"] = bool(np.isfinite(a100[i - 5]) and a50[i] > a50[i - 5] and a100[i] > a100[i - 5])
    r["bunched"] = bool(r["rising50_100"] and abs(r["gap50_100"]) <= 0.03)
    r["to50"] = float(a50[i] / c[i] - 1); r["to100"] = float(a100[i] / c[i] - 1) if np.isfinite(a100[i]) else None
    r["over200"] = float(c[i] / B.ma(200)[i] - 1) if np.isfinite(B.ma(200)[i]) else None; r["off_high"] = float(c[i] / hi - 1)
    # the sector fund the name is read against
    fund = FUND_OF.get(sym); F = load(fund) if fund else None
    if F is not None and B.d[i] not in F.ix: fund = U["fund_fallback"].get(fund); F = load(fund) if fund else None
    if F is not None and B.d[i] in F.ix and F.ix[B.d[i]] >= 60:
        j = F.ix[B.d[i]]; fh = F.h[max(0, j - 251): j + 1].max(); f50a = F.ma(50)
        r.update(fund=fund, fund_off_high=float(F.c[j] / fh - 1), fund_over50=bool(np.isfinite(f50a[j]) and F.c[j] >= f50a[j]),
                 rel20=float((c[i] / c[i - 20]) / (F.c[j] / F.c[j - 20]) - 1), rel60=float((c[i] / c[i - 60]) / (F.c[j] / F.c[j - 60]) - 1))
        r["fund_near_high"] = bool(r["fund_off_high"] >= -0.03); r["lagging20"] = bool(r["rel20"] < 0)
    else: r.update(fund=None, fund_off_high=None, fund_over50=None, rel20=None, rel60=None, fund_near_high=None, lagging20=None)
    if ctx is not None:
        d = B.d[i]; r["vix"] = ctx["vix"].get(d); r["credit_over200"] = ctx["credit"].get(d); r["spy_rsi"] = ctx["spy_rsi"].get(d); r["regime"] = ctx.get("regime", {}).get(d)
    return r


def market_context():
    """The market readings on every date: the VIX close, whether credit (dividend-adjusted HYG when the file is there) is over
    its 200-day, and SPY's RSI."""
    import json, os
    from common import DATA, sma
    spy = load("SPY"); vix = load("VIX"); hyg = load("HYG")
    ctx = dict(vix=dict(zip(vix.d, vix.c.tolist())), spy_rsi=dict(zip(spy.d, rsi(spy.c).tolist())))
    f = os.path.join(DATA, "hyg-adjusted-fmp.json")            # kept with the study: this series cannot be re-pulled without the FMP key
    if os.path.exists(f):
        rows = json.load(open(f))["rows"]; hd = [r[0] for r in rows]; hc = np.array([r[1] for r in rows], float); ctx["credit_basis"] = "dividend-adjusted"
    else:
        hd, hc = hyg.d, hyg.c; ctx["credit_basis"] = "price only"
    h200 = sma(hc, 200); ctx["credit"] = {d: (bool(hc[k] > h200[k]) if np.isfinite(h200[k]) else None) for k, d in enumerate(hd)}
    ctx["hyg_dates"] = hd; ctx["hyg_close"] = hc; ctx["hyg_200"] = h200
    return ctx


def summarise(rows):
    from common import med, share, pctl
    n = len(rows)
    if not n: return dict(n=0)
    g = lambda k: [r.get(k) for r in rows]
    out = dict(n=n, held21_10=share(g("held21_10")), t50_20=share(g("t50_20")), t100_20=share(g("t100_20")), cu100_20=share(g("cu100_20")),
               t50_60=share(g("t50_60")), t100_60=share(g("t100_60")), cu100_60=share(g("cu100_60")),
               s50_20=share(g("s50_20")), s100_20=share(g("s100_20")), s50_60=share(g("s50_60")), s100_60=share(g("s100_60")), s21_20=share(g("s21_20")), s21_10=share(g("s21_10")),
               to50_med=med(g("to50")), to100_med=med(g("to100")),
               dd20_med=med(g("dd20")), dd60_med=med(g("dd60")), dd60_p10=pctl(g("dd60"), 10), dd20_p10=pctl(g("dd20"), 10), low_day60_med=med(g("low_day60")),
               r20_med=med(g("r20")), r60_med=med(g("r60")), r120_med=med(g("r120")), r60_pos=share([None if v is None else v > 0 for v in g("r60")]),
               r20_pos=share([None if v is None else v > 0 for v in g("r20")]), r120_pos=share([None if v is None else v > 0 for v in g("r120")]),
               n120=sum(1 for v in g("r120") if v is not None), nh60=share(g("nh60")), nh_day_med=med(g("nh_day")),
               first_close_under21_med=med(g("first_close_under21")), days_under21_20_med=med(g("days_under21_20")))
    paths = {}
    for r in rows: paths[r["path60"]] = paths.get(r["path60"], 0) + 1
    out["path60"] = paths
    p20 = {}
    for r in rows: p20[r["path20"]] = p20.get(r["path20"], 0) + 1
    out["path20"] = p20
    return out
