#!/usr/bin/env python3
"""PB2 · the replay engine checked against sums done by hand on made-up bars (no market data needed).

  run:  python study/pb2/tools/test_layer.py        (needs numpy only)

Each check builds a few sessions where the right answer can be worked out on paper, then asks the engine."""
import sys
import numpy as np
import layer as L
import stops as S

FAILS = []


def check(name, got, want, tol=1e-9):
    ok = (abs(got - want) <= tol) if isinstance(want, float) else (got == want)
    print(("ok   " if ok else "FAIL ") + name + ("" if ok else f"   got {got!r} want {want!r}"))
    if not ok: FAILS.append(name)


def bars(rows, n_after=130, c0=100.0):
    """rows = [(o, h, l, c), ...] for the sessions after the signal day; then flat at the last close."""
    o = [c0]; h = [c0]; l = [c0]; c = [c0]
    for a, b, d, e in rows: o.append(a); h.append(b); l.append(d); c.append(e)
    while len(c) < n_after + 1: o.append(c[-1]); h.append(c[-1]); l.append(c[-1]); c.append(c[-1])
    return np.array(o, float), np.array(h, float), np.array(l, float), np.array(c, float)


def flat(v, n): return np.full(n, float(v))


# ---- 1 · two rungs fill, one of them on a gap; the third is never reached
o, h, l, c = bars([(99.5, 100, 97.5, 98.5), (94, 95, 93.5, 94.5), (94, 94.5, 91, 92)])
n = len(c); r = L.replay(o, h, l, c, flat(98, n), flat(95, n), flat(90, n), 0, "pyramid")
sh1 = (2 / 9) * 100 / 98; sh2 = (3 / 9) * 100 / 94                    # 2/9 of the money at 98, 3/9 at the OPEN 94 (it opened under the 95 order)
check("1 the 21-day rung fills at its limit", r["rungs"][0]["px"], 0.98)
check("1 the 50-day rung fills at the open on a gap down", r["rungs"][1]["px"], 0.94)
check("1 the 100-day rung is not reached", r["rungs"][2]["filled"], False)
check("1 fill days", [x["day"] for x in r["rungs"]], [1, 2, None])
check("1 result at 20 sessions on the planned money", r["res"]["20"]["pnl"], (sh1 + sh2) * 0.92 - 5 / 9)
check("1 average cost is money over shares", r["avg_cost"], (5 / 9) / (sh1 + sh2))
check("1 worst drawdown is marked at the session lows", r["res"]["20"]["dd"], min(sh1 * 0.975 - 2 / 9, (sh1 + sh2) * 0.935 - 5 / 9, (sh1 + sh2) * 0.91 - 5 / 9))
check("1 money at work at 20 sessions", r["res"]["20"]["held"], 5 / 9)

# ---- 2 · the 100-day rung is bought, the close is under the 100-day, out at the next open, back in after a close above
o, h, l, c = bars([(99.5, 100, 97.5, 98.5), (94, 95, 93.5, 94.5), (94, 94.5, 89.5, 89), (88, 89, 87.5, 88.5), (89, 91.5, 88.8, 91), (92, 92.5, 91.5, 92)])
n = len(c); r = L.replay(o, h, l, c, flat(98, n), flat(95, n), flat(90, n), 0, "pyr_stop")
sh3 = (4 / 9) * 100 / 90; tot = sh1 + sh2 + sh3
check("2 all three rungs filled", [x["day"] for x in r["rungs"]], [1, 2, 3])
check("2 one stop, on the evening of session 3", (r["stops"], r["stop_days"]), (1, [3]))
check("2 one buy-back and it is a whipsaw (92 paid, 88 received)", (r["rebuys"], r["whipsaws"]), (1, 1))
check("2 what the whipsaw cost", r["whipsaw_cost"], tot * (92 - 88) / 100)
check("2 result at 20 sessions = the loss banked at 88, the shares re-bought at 92 and now 92", r["res"]["20"]["pnl"], tot * 0.88 - 1.0)
r0 = L.replay(o, h, l, c, flat(98, n), flat(95, n), flat(90, n), 0, "pyramid")
check("2 the same bars with no stop", r0["res"]["20"]["pnl"], tot * 0.92 - 1.0)
ra = L.replay(o, h, l, c, flat(98, n), flat(95, n), flat(90, n), 0, "pyr_stop_addons")
check("2 the add-ons-only stop keeps the first buy", ra["res"]["20"]["pnl"], sh1 * 0.92 + (sh2 + sh3) * 0.88 - 1.0)
rc = L.replay(o, h, l, c, flat(98, n), flat(95, n), flat(90, n), 0, "pyr_stop_atclose")
check("2 sold and re-bought at the closes instead (89, then 91)", rc["res"]["20"]["pnl"], tot * 0.89 - 1.0 + tot * (0.92 - 0.91))
r2 = L.replay(o, h, l, c, flat(98, n), flat(95, n), flat(90, n), 0, "pyr_stop_2closes")
check("2 two closes under the 100-day are needed: sessions 3 and 4 qualify, sold at the open of 5", (r2["stops"], r2["stop_days"]), (1, [4]))
rb = L.replay(o, h, l, c, flat(98, n), flat(95, n), flat(90, n), 0, "pyr_stop_band3")
check("2 a 3% band (87.3) is never closed under: no stop", rb["stops"], 0)

# ---- 3 · at most three working orders: a one-session collapse fills three drafts, the fourth only the day after
o, h, l, c = bars([(100, 100, 90, 93), (93, 93, 93, 93)])
n = len(c); r = L.replay(o, h, l, c, flat(98, n), flat(95, n), flat(90, n), 0, "draft")
px = [p / L.DRAFT_CLOSE for p in L.DRAFT_PRICES]
check("3 three drafts fill in the falling-knife session, the fourth the next day", [x["day"] for x in r["rungs"]], [1, 1, 1, 2])
check("3 the first three fill at their own prices", [round(x["px"], 9) for x in r["rungs"][:3]], [round(v, 9) for v in px[:3]])
check("3 the fourth was not working during the collapse and is bought at the next open (93)", r["rungs"][3]["px"], 0.93)
check("3 three fills in one session are counted", r["max_same_day_fills"], 3)

# ---- 4 · the fixed stop 13% under the first fill: at the stop, or at the open on a gap, and never bought back
o, h, l, c = bars([(99.5, 100, 97.5, 98.5), (98, 98, 86, 86), (86, 86, 85, 85.5), (90, 99, 90, 99)])
n = len(c); r = L.replay(o, h, l, c, flat(98, n), flat(80, n), flat(70, n), 0, "pyr_fixed13")
check("4 stopped at 0.87 x 98 = 85.26", r["res"]["20"]["pnl"], sh1 * 0.8526 - 2 / 9)
check("4 nothing is held afterwards", r["res"]["20"]["held"], 0.0)
o, h, l, c = bars([(99.5, 100, 97.5, 98.5), (84, 84.5, 83, 84)])
n = len(c); r = L.replay(o, h, l, c, flat(98, n), flat(80, n), flat(70, n), 0, "pyr_fixed13")
check("4 a gap under the stop sells at the open (84)", r["res"]["20"]["pnl"], sh1 * 0.84 - 2 / 9)

# ---- 5 · the deep bid rests only on evenings with the VIX at 20 or more
rows = [(99.5, 100, 97.5, 98.5), (94, 95, 93.5, 94.5), (94, 94.5, 89.5, 89), (88, 89, 84, 86), (86, 86, 82, 85)]
o, h, l, c = bars(rows); n = len(c)
calm = L.replay(o, h, l, c, flat(98, n), flat(95, n), flat(90, n), 0, "pyr_stop_deep", vix=flat(15, n))
fear = L.replay(o, h, l, c, flat(98, n), flat(95, n), flat(90, n), 0, "pyr_stop_deep", vix=flat(25, n))
check("5 no deep bid with the VIX at 15", calm["deep_fills"], 0)
check("5 all three deep bids fill with the VIX at 25 (85.5, 84.15 on session 4; 82.8 on session 5)", fear["deep_fills"], 3)
dsh = (1 / 3) * 100 / 85.5 + (1 / 3) * 100 / 84.15 + (1 / 3) * 100 / 82.8
check("5 the deep bids put the whole planned money back to work, a third at each price", fear["res"]["20"]["pnl"], (tot * 0.88 - 1.0) + dsh * 0.85 - 1.0)

# ---- 6 · one build never loses more than the planned money, even when the name runs up before it pulls back and then collapses
#        (the strategies that sell and re-buy are left out: their round trips can add up to more, and the tables say so)
rng = np.random.default_rng(7); worst = 0.0
for trial in range(200):
    steps = rng.normal(0.004, 0.05, 260); cc = 100 * np.exp(np.cumsum(steps)); cc[130:] *= np.linspace(1, 0.15, 130)
    oo = np.r_[cc[0], cc[:-1]] * (1 + rng.normal(0, 0.01, 260)); hh = np.maximum(oo, cc) * 1.01; ll = np.minimum(oo, cc) * 0.99
    from common import sma
    m21, m50, m100 = sma(cc, 21), sma(cc, 50), sma(cc, 100)
    for s in ("allin21", "pyramid", "pyr_equal", "pyr_fixed13", "draft"):
        r = L.replay(oo, hh, ll, cc, m21, m50, m100, 110, s, vix=flat(25, 260))
        worst = min(worst, r["res"]["120"]["dd"])
check("6 the worst drawdown over 1,000 made-up collapses stays inside -100% of the planned money", worst >= -1.0, True)

# ---- 7 · the stop styles on one made-up flush: the low goes through the line, the close is back above it
class B: pass
b = B(); b.o = np.array([100.0] * 60 + [100, 99, 103] + [103] * 70); b.l = np.array([100.0] * 60 + [99, 94, 102] + [103] * 70); b.c = np.array([100.0] * 60 + [100, 101, 103] + [103] * 70)
a = np.full(len(b.c), 98.0)
t = 61                                                                # the flush: opens 99, trades down to 94, closes 101; the line is 98
i = S.run_policy(b, a, t, "intraday", False); cl = S.run_policy(b, a, t, "close", False); il = S.run_policy(b, a, t, "intraday_lower" if False else "intraday", True)
check("7 the intraday stop sells at the line (98) and buys back at the next open (103): 5 points worse than holding", i["eff60"], (98 - 103) / 100)
check("7 it is a whipsaw", i["whips"], 1)
check("7 the daily-close stop does nothing on a flush", (cl["eff60"], cl["sales"]), (0.0, 0))
check("7 with lower buys, 5% under the line (93.1) is just missed by a low of 94: kicked out, nothing bought lower", (il["lowfills"], il["eff60"]), (0, (98 - 103) / 100))

print()
print("ALL", "PASS" if not FAILS else "FAIL", f"({len(FAILS)} failed)" if FAILS else "")
sys.exit(1 if FAILS else 0)
