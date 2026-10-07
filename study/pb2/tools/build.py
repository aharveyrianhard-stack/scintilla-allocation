#!/usr/bin/env python3
"""PB2 · build the study's numbers.   usage: build.py [cases] [layer] [stops] [review] [fixtures] [merge]   (no argument = all)

Each part writes study/pb2/data/parts/<part>.json; `merge` joins them into study/pb2/data/pb2.json, the one file the page,
the playbook and the tests read. Reads only the cached daily bars (pull_bars.py) and two read-only extracts."""
import datetime, json, os, sys, time
import numpy as np
from common import load, served, U, FUND_OF, DATA, CACHE, clean, med, mean, share, pctl, on_dates
import episodes as E
import layer as L
import stops as S

PARTS = os.path.join(DATA, "parts"); os.makedirs(PARTS, exist_ok=True)
FUNDS = set(U["sector_fund"].keys()) | set(U["market"])
STOCKS = [s for s in served() if s not in FUNDS]
C19 = U["coordinator19"]


def save(name, obj):
    json.dump(clean(obj), open(os.path.join(PARTS, name + ".json"), "w"), separators=(",", ":"))
    print("wrote", name, round(os.path.getsize(os.path.join(PARTS, name + ".json")) / 1024), "KB", flush=True)


def part(name): return json.load(open(os.path.join(PARTS, name + ".json")))


# ------------------------------------------------------------------ cases
def build_cases():
    ctx = E.market_context()
    reg = {}
    if os.path.exists(os.path.join(PARTS, "review.json")): reg = part("review").get("regimes", {}).get("by_date", {})
    ctx["regime"] = reg
    def rows(names, mode): return [E.outcome(s, i, ctx) for s in names for i in E.find_cases(s, mode)]
    c19 = rows(C19, "leader"); c19b = rows(C19, "bunched"); c19any = rows(C19, "leader_any_slope")
    wide = rows(STOCKS, "leader"); wideb = rows(STOCKS, "bunched")
    mu_own = rows(["MU"], "micron_own"); mu_lead = [r for r in wide if r["sym"] == "MU"]
    out = dict(rule=E.__doc__, counts=dict(coordinator19=len(c19), coordinator19_any_slope=len(c19any), coordinator19_bunched=len(c19b), wide=len(wide), wide_bunched=len(wideb), micron_own=len(mu_own), micron_leader=len(mu_lead),
                                          names_served=len(STOCKS), names_with_cases=len({r["sym"] for r in wide})),
               coordinator19=E.summarise(c19), coordinator19_bunched=E.summarise(c19b), coordinator19_any_slope=E.summarise(c19any), wide=E.summarise(wide), wide_bunched=E.summarise(wideb),
               wide_bunched_flag=E.summarise([r for r in wide if r["bunched"]]), wide_not_bunched=E.summarise([r for r in wide if not r["bunched"]]),
               micron_own=E.summarise(mu_own), micron_leader=E.summarise(mu_lead), wide_ex19=E.summarise([r for r in wide if r["sym"] not in C19]),
               since2016=E.summarise([r for r in wide if r["d"] >= "2016"]), before2016=E.summarise([r for r in wide if r["d"] < "2016"]))
    out["named_periods"] = []
    for p in U["named_periods"]:
        sub = [r for r in wide if r["sym"] == p["sym"] and p["from"] <= r["d"] <= p["to"]]
        out["named_periods"].append(dict(label=p["label"], sym=p["sym"], dates=[r["d"] for r in sub], **E.summarise(sub)))
    # sector context: the fund the name is read against
    ctxs = {}
    has = [r for r in wide if r["fund"] is not None]
    ctxs["fund near its high (within 3%)"] = E.summarise([r for r in has if r["fund_near_high"]]); ctxs["fund 3% or more off its high"] = E.summarise([r for r in has if not r["fund_near_high"]])
    ctxs["stock lagging its fund over 20 sessions"] = E.summarise([r for r in has if r["lagging20"]]); ctxs["stock ahead of its fund over 20 sessions"] = E.summarise([r for r in has if not r["lagging20"]])
    ctxs["fund near its high AND the stock lagging it (the lagging leader)"] = E.summarise([r for r in has if r["fund_near_high"] and r["lagging20"]])
    ctxs["fund off its high AND the stock lagging it"] = E.summarise([r for r in has if (not r["fund_near_high"]) and r["lagging20"]])
    ctxs["fund under its own 50-day"] = E.summarise([r for r in has if r["fund_over50"] is False]); ctxs["fund over its own 50-day"] = E.summarise([r for r in has if r["fund_over50"]])
    out["sector_context"] = ctxs; out["sector_context_n"] = len(has)
    byfund = {}
    for r in has: byfund.setdefault(r["fund"], []).append(r)
    out["by_fund"] = {f: E.summarise(v) for f, v in sorted(byfund.items(), key=lambda kv: -len(kv[1]))}
    mk = {}
    mk["VIX under 20 that evening"] = E.summarise([r for r in wide if r.get("vix") is not None and r["vix"] < 20]); mk["VIX at 20 or more that evening"] = E.summarise([r for r in wide if r.get("vix") is not None and r["vix"] >= 20])
    mk["credit over its 200-day"] = E.summarise([r for r in wide if r.get("credit_over200") is True]); mk["credit under its 200-day"] = E.summarise([r for r in wide if r.get("credit_over200") is False])
    for nm in ("calm", "choppy", "stress"): mk["market regime: " + nm] = E.summarise([r for r in wide if r.get("regime") == nm])
    out["market_context"] = mk; out["credit_basis"] = ctx["credit_basis"]
    byname = {}
    for r in wide: byname[r["sym"]] = byname.get(r["sym"], 0) + 1
    out["by_name"] = dict(sorted(byname.items(), key=lambda kv: -kv[1]))
    # today
    t = E.today_check("MU"); B = load("MU"); F = load("SMH"); i = B.n - 1; j = F.ix[B.d[i]]
    t.update(fund="SMH", fund_off_high=float(F.c[j] / F.h[j - 251:j + 1].max() - 1), fund_close=float(F.c[j]), fund_over50=bool(F.c[j] >= F.ma(50)[j]), rel20=float((B.c[i] / B.c[i - 20]) / (F.c[j] / F.c[j - 20]) - 1),
             rel60=float((B.c[i] / B.c[i - 60]) / (F.c[j] / F.c[j - 60]) - 1), vix=ctx["vix"].get(B.d[i]), credit_over200=ctx["credit"].get(B.d[i]), spy_rsi=ctx["spy_rsi"].get(B.d[i]), regime=reg.get(B.d[i]),
             high252_date=B.d[int(np.argmax(B.h[i - 251:i + 1])) + i - 251])
    out["today_mu"] = t
    keep = ("sym", "d", "close", "held21_10", "t50_20", "t100_20", "cu100_20", "t50_60", "t100_60", "dd20", "dd60", "low_day60", "r20", "r60", "r120", "nh60", "nh_day", "path60", "bunched", "fund", "fund_near_high", "lagging20", "vix", "credit_over200", "regime", "to50", "to100")
    out["rows"] = dict(wide=[{k: r.get(k) for k in keep} for r in wide], micron_own=[{k: r.get(k) for k in keep} for r in mu_own], coordinator19_bunched=[{k: r.get(k) for k in keep} for r in c19b])
    out["_idx"] = dict(wide=[[r["sym"], r["i"]] for r in wide], c19=[[r["sym"], r["i"]] for r in c19], mu_own=[[r["sym"], r["i"]] for r in mu_own])
    save("cases", out); return out


# ------------------------------------------------------------------ the order layer
def agg(results, rung_names):
    n = len(results); g = lambda f: [f(r) for r in results]
    out = dict(n=n, filled_any=share(g(lambda r: r["filled_any"])), first_fill_day_med=med(g(lambda r: r["first_fill_day"])),
               nofill20=share(g(lambda r: r["first_fill_day"] is None or r["first_fill_day"] > 20)), nofill60=share(g(lambda r: r["first_fill_day"] is None or r["first_fill_day"] > 60)),
               avg_cost_mean=mean(g(lambda r: r["avg_cost"])), avg_cost_med=med(g(lambda r: r["avg_cost"])), stops_per100=100 * mean(g(lambda r: r["stops"])), whipsaws_per100=100 * mean(g(lambda r: r["whipsaws"])),
               whipsaw_cost_mean=mean(g(lambda r: r["whipsaw_cost"])), deep_fills_per100=100 * mean(g(lambda r: r["deep_fills"])), deep_any=share(g(lambda r: r["deep_fills"] > 0)), stopped=share(g(lambda r: r["stops"] > 0)),
               whipped=share(g(lambda r: r["whipsaws"] > 0)), never_back=share(g(lambda r: r["never_back"])), same_day3=share(g(lambda r: r["max_same_day_fills"] >= 3)), same_day2=share(g(lambda r: r["max_same_day_fills"] >= 2)), rungs=[], res={})
    for nm in rung_names:
        rr = [next((x for x in r["rungs"] if x["name"] == nm), None) for r in results]; rr = [x for x in rr if x is not None]
        if not rr: continue
        out["rungs"].append(dict(name=nm, w_mean=mean([x["w"] for x in rr]), fill20=share([x["filled"] and x["day"] <= 20 for x in rr]), fill60=share([x["filled"] and x["day"] <= 60 for x in rr]),
                                 fill120=share([x["filled"] for x in rr]), px_med=med([x["px"] for x in rr if x["filled"]]), day_med=med([x["day"] for x in rr if x["filled"]])))
    for H in ("20", "60", "120"):
        rs = [r["res"][H] for r in results if r["res"].get(H) is not None]
        if not rs: out["res"][H] = dict(n=0); continue
        p = [x["pnl"] for x in rs]; dd = [x["dd"] for x in rs]; dv = [x["drop_vs_cost"] for x in rs if x["drop_vs_cost"] is not None]
        out["res"][H] = dict(n=len(rs), mean=mean(p), med=med(p), pos=share([v > 0 for v in p]), p10=pctl(p, 10), p90=pctl(p, 90), worst=min(p), dd_med=med(dd), dd_p10=pctl(dd, 10), dd_worst=min(dd), dd_mean=mean(dd),
                              held_mean=mean([x["held"] for x in rs]), drop_vs_cost_med=med(dv), drop_vs_cost_p10=pctl(dv, 10), drop_vs_cost_worst=(min(dv) if dv else None))
    return out


def run_set(idx, strategies, vix_by_date):
    res = {s: [] for s in strategies}
    for sym, i in idx:
        B = load(sym); vix = on_dates(*vix_by_date, B.d) if not hasattr(B, "_vix") else B._vix; B._vix = vix
        for s in strategies:
            res[s].append(L.replay(B.o, B.h, B.l, B.c, B.ma(21), B.ma(50), B.ma(100), i, s, vix=vix))
    return res


def lab_pivots():
    """The Lab's horizontal pivots (label, price, the bar they were set on) from the read-only extract the confluence study took
    of the installed packs. Kept in study/pb2/data so the replay does not depend on another worktree being there."""
    f = os.path.join(DATA, "lab-pivots.json")
    src = "/Users/alanharvey/SCINTILLA 0.5/_worktrees/provider-cz1-confluence-20261006/evidence/cz1-confluence-20261006/reviewed-levels-v34.json"
    if os.path.exists(src):
        d = json.load(open(src)); out = dict(source="reviewed-levels-v34.json (the confluence study's read-only extract of the Lab's installed packs, V34)", generated_at=d.get("generated_at"), names={})
        for v in d["symbols"].values():
            piv = []
            for r in v["rows"]:
                lab = r.get("label") or ""; ni = (r.get("native_identity") or "").split(" + ")[0].split("|")
                if " P" in lab and not r.get("display_removed") and len(ni) >= 3 and ni[1].isdigit():
                    piv.append(dict(label=lab, tf=r.get("tf"), price=float(ni[2]), anchor=datetime.datetime.utcfromtimestamp(int(ni[1]) / 1000).strftime("%Y-%m-%d")))
            out["names"][v["ticker"]] = piv
        json.dump(out, open(f, "w"), indent=1)
    return json.load(open(f)) if os.path.exists(f) else dict(names={})


def build_layer():
    cases = part("cases"); vixB = load("VIX"); vbd = (vixB.d, vixB.c)
    strategies = list(L.STRATEGIES.keys()); ma_names = ["21-day", "50-day", "100-day"]
    sets = dict(micron_own=cases["_idx"]["mu_own"], coordinator19=cases["_idx"]["c19"], wide=cases["_idx"]["wide"])
    wrows = cases["rows"]["wide"]
    sets["wide_bunched"] = [ix for ix, r in zip(cases["_idx"]["wide"], wrows) if r["bunched"]]
    sets["micron_leader"] = [ix for ix in cases["_idx"]["wide"] if ix[0] == "MU"]
    out = dict(strategies={k: v["label"] for k, v in L.STRATEGIES.items()}, main=L.MAIN, sizes=dict(grow=list(L.GROW), equal=list(L.EQUAL), draft_shares=list(L.DRAFT_SHARES), draft_prices=list(L.DRAFT_PRICES), draft_names=list(L.DRAFT_NAMES), draft_close=L.DRAFT_CLOSE, deep=list(L.DEEP), max_working=L.MAX_WORKING),
               mechanic=L.__doc__, sets={}, raw={})
    for nm, idx in sets.items():
        t0 = time.time(); res = run_set(idx, strategies, vbd); A = {}
        for s in strategies:
            names = ma_names if L.STRATEGIES[s].get("rungs") in ("ma", "ma21") else (list(L.DRAFT_NAMES) if L.STRATEGIES[s].get("rungs") == "draft" else ["close"])
            A[s] = agg(res[s], names)
        # the built-in clash: the 100-day rung is bought, then the close stop sells within 5 sessions
        clash = []
        for r in res["pyr_stop"]:
            x = next((q for q in r["rungs"] if q["name"] == "100-day"), None)
            clash.append(bool(x and x["filled"] and any(x["day"] <= sd <= x["day"] + 5 for sd in r["stop_days"])))
        filled100 = [bool(next((q for q in r["rungs"] if q["name"] == "100-day"), {}).get("filled")) for r in res["pyr_stop"]]
        A["_clash"] = dict(n=len(clash), rung100_filled=share(filled100), stopped_within5_of_fill=share(clash), of_those_filled=(sum(clash) / max(1, sum(filled100))))
        fd = [[x["day"] if x["filled"] else None for x in r["rungs"]] for r in res["draft"]]
        A["_draft_same"] = dict(n=len(fd), first_two_same_session=share([x[0] is not None and x[0] == x[1] for x in fd]), first_three_same_session=share([x[0] is not None and x[0] == x[1] == x[2] for x in fd]),
                                first_next_session=share([x[0] == 1 for x in fd]), three_next_session=share([x[0] == 1 and x[1] == 1 and x[2] == 1 for x in fd]), any_within20=share([any(v is not None and v <= 20 for v in x) for x in fd]),
                                all_four_within20=share([all(v is not None and v <= 20 for v in x) for x in fd]), all_four_within60=share([all(v is not None and v <= 60 for v in x) for x in fd]), none_within60=share([not any(v is not None and v <= 60 for v in x) for x in fd]))
        fm = [[x["day"] if x["filled"] else None for x in r["rungs"]] for r in res["draft_merged"]]
        A["_draft_merged_same"] = dict(n=len(fm), all_three_same_session=share([x[0] is not None and x[0] == x[1] == x[2] for x in fm]), first_two_same_session=share([x[0] is not None and x[0] == x[1] for x in fm]))
        fp = [[x["day"] if x["filled"] else None for x in r["rungs"]] for r in res["pyramid"]]
        A["_pyramid_same"] = dict(lower_two_same_session=share([x[1] is not None and x[1] == x[2] for x in fp]), all_three_within20=share([all(v is not None and v <= 20 for v in x) for x in fp]), all_three_within60=share([all(v is not None and v <= 60 for v in x) for x in fp]), only_first_within60=share([x[0] is not None and x[0] <= 60 and not any(v is not None and v <= 60 for v in x[1:]) for x in fp]))
        out["sets"][nm] = A
        # per-case numbers kept for the intervals (review) and the Micron table
        out["raw"][nm] = dict(sym=[ix[0] for ix in idx], d=[load(ix[0]).d[ix[1]] for ix in idx],
                              **{s: dict(p20=[(r["res"]["20"] or {}).get("pnl") for r in res[s]], p60=[(r["res"]["60"] or {}).get("pnl") for r in res[s]], p120=[(r["res"]["120"] or {}).get("pnl") for r in res[s]],
                                         dd60=[(r["res"]["60"] or {}).get("dd") for r in res[s]], dd120=[(r["res"]["120"] or {}).get("dd") for r in res[s]], cost=[r["avg_cost"] for r in res[s]],
                                         first=[r["first_fill_day"] for r in res[s]], stops=[r["stops"] for r in res[s]], whips=[r["whipsaws"] for r in res[s]], deep=[r["deep_fills"] for r in res[s]],
                                         fills=[[x["day"] if x["filled"] else None for x in r["rungs"]] for r in res[s]], fillpx=[[x["px"] if x["filled"] else None for x in r["rungs"]] for r in res[s]]) for s in strategies})
        # the single worst case of the stop with the deep bid, named (its round trips can add up to more than the planned money)
        dd = [(r["res"]["120"] or {}).get("dd") for r in res["pyr_stop_deep"]]; ok = [k for k, v in enumerate(dd) if v is not None]
        if ok:
            k = min(ok, key=lambda j: dd[j]); B = load(idx[k][0]); r = res["pyr_stop_deep"][k]
            A["_worst_deep"] = dict(sym=idx[k][0], d=B.d[idx[k][1]], dd120=dd[k], stops=r["stops"], deep_fills=r["deep_fills"], stock120=(res["close"][k]["res"]["120"] or {}).get("pnl"), beyond_100=sum(1 for v in dd if v is not None and v < -1), n=len(ok))
        print("layer", nm, len(idx), "cases", round(time.time() - t0, 1), "s", flush=True)
    # ---- the Lab's horizontal pivots as extra rungs, where the packs have them
    piv = lab_pivots(); rows = []; base_res = []; piv_res = []
    for (sym, i), r in zip(cases["_idx"]["wide"], wrows):
        P = piv["names"].get(sym)
        if not P: continue
        B = load(sym); a100 = B.ma(100)[i]; C0 = B.c[i]
        usable = [p for p in P if p["anchor"] in B.ix and B.ix[p["anchor"]] + 10 <= i and a100 * 0.92 <= p["price"] < C0]      # set 10+ sessions before the case; between the close and 8% under the 100-day
        if not usable: continue
        usable = sorted(usable, key=lambda p: -p["price"])[:3]
        lv = [("21-day", B.ma(21)[i]), ("50-day", B.ma(50)[i]), ("100-day", a100)] + [(p["label"], p["price"]) for p in usable]
        order = sorted(range(len(lv)), key=lambda j: -lv[j][1]); wts = np.arange(2, 2 + len(lv), dtype=float); wts /= wts.sum(); size = {order[k]: float(wts[k]) for k in range(len(lv))}
        strat = dict(key="pyr_pivots", label="pyramid + the Lab's pivots", kind="ladder", rungs="ma", w=(size[0], size[1], size[2]))
        extra = [(lv[3 + k][0], lv[3 + k][1], size[3 + k]) for k in range(len(usable))]
        vix = on_dates(vixB.d, vixB.c, B.d)
        a = L.replay(B.o, B.h, B.l, B.c, B.ma(21), B.ma(50), B.ma(100), i, strat, vix=vix, extra=extra); b = L.replay(B.o, B.h, B.l, B.c, B.ma(21), B.ma(50), B.ma(100), i, "pyramid", vix=vix)
        piv_res.append(a); base_res.append(b)
        rows.append(dict(sym=sym, d=B.d[i], close=float(C0), pivots=[dict(label=p["label"], price=p["price"], anchor=p["anchor"], filled=bool(next(x for x in a["rungs"] if x["name"] == p["label"])["filled"])) for p in usable],
                         cost_with=a["avg_cost"], cost_without=b["avg_cost"], p60_with=(a["res"]["60"] or {}).get("pnl"), p60_without=(b["res"]["60"] or {}).get("pnl")))
    out["pivots"] = dict(source=piv.get("source"), names_in_packs=len(piv["names"]), cases=len(rows), rows=rows,
                         with_pivots=(dict(avg_cost_med=med([r["avg_cost"] for r in piv_res]), p60_med=med([(r["res"]["60"] or {}).get("pnl") for r in piv_res]), p60_mean=mean([(r["res"]["60"] or {}).get("pnl") for r in piv_res])) if rows else None),
                         without=(dict(avg_cost_med=med([r["avg_cost"] for r in base_res]), p60_med=med([(r["res"]["60"] or {}).get("pnl") for r in base_res]), p60_mean=mean([(r["res"]["60"] or {}).get("pnl") for r in base_res])) if rows else None),
                         rule="a pivot counts for a case only if its bar is 10 or more sessions before the case and its price sits between that day's close and 8% under the 100-day; at most three; sizes grow 2 : 3 : 4 : 5 … from the highest rung down")
    save("layer", out); return out


# ------------------------------------------------------------------ stops
def build_stops():
    out = dict(rule=S.__doc__, levels={})
    for N in (21, 50, 100):
        t0 = time.time(); allr = S.breach_study(STOCKS, N); mur = [r for r in allr if r["sym"] == "MU"]
        out["levels"][str(N)] = dict(all=S.summarise(allr), micron=S.summarise(mur), names=len({r["sym"] for r in allr}),
                                     micron_big_flushes=[dict(d=r["d"], low_vs_prev=r["low_vs_prev"], intraday_sale_vs_close=r["intraday_sale_vs_close"], r20=r["r20"], r60=r["r60"], intraday60=r["intraday"]["eff60"], close60=r["close"]["eff60"]) for r in mur if r["big_flush"]],
                                     micron_rows=[dict(d=r["d"], flush=r["flush"], big=r["big_flush"], low_vs_prev=r["low_vs_prev"], sale_vs_close=r["intraday_sale_vs_close"], r60=r["r60"], i60=r["intraday"]["eff60"], c60=r["close"]["eff60"], il60=r["intraday_lower"]["eff60"], cl60=r["close_lower"]["eff60"]) for r in mur])
        print("stops", N, len(allr), "breach days", round(time.time() - t0, 1), "s", flush=True)
    f = S.first_close_under("MU", 100); n = len(f)
    vixB = load("VIX"); vd = dict(zip(vixB.d, vixB.c.tolist()))
    for r in f: r["vix"] = vd.get(r["d"])
    out["micron_first_close_under_100"] = dict(n=n, back_within20=sum(r["back_within20"] for r in f), dd20_med=med([r["dd20"] for r in f]), dd20_worst=min(r["dd20"] for r in f), dd60_med=med([r["dd60"] for r in f]),
                                               r20_med=med([r["r20"] for r in f]), r60_med=med([r["r60"] for r in f]), r60_pos=sum(1 for r in f if r["r60"] > 0), back_day_med=med([r["back_day60"] for r in f]),
                                               back_within60=sum(1 for r in f if r["back_day60"] is not None), whipsaws=sum(1 for r in f if r["whipsaw"]), rebuy_vs_sale_med=med([r["rebuy_vs_sale"] for r in f]),
                                               rebuy_vs_sale_mean=mean([r["rebuy_vs_sale"] for r in f]), reached_5=sum(1 for r in f if r["reached_50"]), reached_65=sum(1 for r in f if r["reached_65"]), reached_8=sum(1 for r in f if r["reached_80"]),
                                               reached_5_vix20=sum(1 for r in f if r["reached_50"] and (r["vix"] or 0) >= 20), vix20=sum(1 for r in f if (r["vix"] or 0) >= 20), deepest_under_level_med=med([r["deepest_under_level"] for r in f]), rows=f)
    save("stops", out); return out


# ------------------------------------------------------------------ the review
def build_review():
    import review as R
    ctx = E.market_context(); out = {}
    t0 = time.time(); out["regimes"] = R.regimes(ctx); print("regimes", round(time.time() - t0, 1), "s", out["regimes"]["today"], flush=True)
    t0 = time.time(); out["market_rules"] = R.market_rules(ctx); print("market rules", round(time.time() - t0, 1), "s", flush=True)
    mu = load("MU"); a50 = mu.ma(50)[-1]; a100 = mu.ma(100)[-1]; a21 = mu.ma(21)[-1]
    levels = [(L.DRAFT_NAMES[k], L.DRAFT_PRICES[k]) for k in range(4)] + [("21-day", a21), ("50-day", a50), ("100-day", a100), ("5% under the 100-day", a100 * 0.95), ("6.5% under the 100-day", a100 * 0.935), ("8% under the 100-day", a100 * 0.92), ("13% under 1,036.13 (the old 900)", 1036.13 * 0.87)]
    t0 = time.time(); out["range"] = R.micron_range(levels); print("range", round(time.time() - t0, 1), "s", flush=True)
    t0 = time.time(); out["trend"] = R.micron_trend(); print("trend", round(time.time() - t0, 1), "s", flush=True)
    if os.path.exists(os.path.join(PARTS, "layer.json")):
        lay = part("layer"); ed = {}
        for nm in ("micron_own", "coordinator19", "wide", "wide_bunched"):
            raw = lay["raw"][nm]; months = [d[:7] for d in raw["d"]]; E_ = {}
            def diff(a, b, key): return [None if (x is None or y is None) else x - y for x, y in zip(raw[a][key], raw[b][key])]
            pairs = [("pyramid_vs_allin21", "pyramid", "allin21"), ("pyramid_vs_close", "pyramid", "close"), ("allin21_vs_close", "allin21", "close"), ("stop_vs_pyramid", "pyr_stop", "pyramid"), ("deep_vs_stop", "pyr_stop_deep", "pyr_stop"),
                     ("deep_vs_pyramid", "pyr_stop_deep", "pyramid"), ("fixed13_vs_pyramid", "pyr_fixed13", "pyramid"), ("grow_vs_equal", "pyramid", "pyr_equal"), ("addons_vs_all", "pyr_stop_addons", "pyr_stop"),
                     ("atclose_vs_nextopen", "pyr_stop_atclose", "pyr_stop"), ("deep_anyvix_vs_deep", "pyr_deep_anyvix", "pyr_stop_deep"), ("draft_vs_pyramid", "draft", "pyramid"), ("draft_vs_allin21", "draft", "allin21"),
                     ("draft_grow_vs_equal", "draft", "draft_equal"), ("merged_vs_draft", "draft_merged", "draft"), ("band3_vs_stop", "pyr_stop_band3", "pyr_stop"), ("twocloses_vs_stop", "pyr_stop_2closes", "pyr_stop"), ("band3_vs_pyramid", "pyr_stop_band3", "pyramid")]
            for key, a, b in pairs:
                E_[key] = dict(p60=R.case_edge(diff(a, b, "p60"), months, f"{a} − {b}, result at 60"), p120=R.case_edge(diff(a, b, "p120"), months, f"{a} − {b}, result at 120"),
                               dd60=R.case_edge(diff(a, b, "dd60"), months, f"{a} − {b}, worst drawdown inside 60"), dd120=R.case_edge(diff(a, b, "dd120"), months, f"{a} − {b}, worst drawdown inside 120"))
                if a in ("pyramid", "allin21", "draft", "draft_merged") and b in ("allin21", "close", "pyr_equal", "pyramid", "draft_equal", "draft"):
                    E_[key]["cost"] = R.case_edge(diff(a, b, "cost"), months, f"{a} − {b}, average cost")
            ed[nm] = E_
        out["layer_edges"] = ed
        # the set-up itself, and the market context, measured on the wide cases
        cases = part("cases"); rows = cases["rows"]["wide"]; months = [r["d"][:7] for r in rows]
        def split(flag, key="r60"):
            a = [r[key] for r in rows if flag(r) is True and r[key] is not None]; b = [r[key] for r in rows if flag(r) is False and r[key] is not None]
            return dict(n_yes=len(a), n_no=len(b), med_yes=med(a), med_no=med(b), mean_yes=mean(a), mean_no=mean(b), pos_yes=share([v > 0 for v in a]), pos_no=share([v > 0 for v in b]))
        def ge(flag, lab, key="r60"): return R.group_edge([r[key] for r in rows], [flag(r) for r in rows], months, lab)
        out["case_edges"] = dict(
            vix20=ge(lambda r: (None if r["vix"] is None else r["vix"] >= 20), "the case began with the VIX at 20 or more"),
            credit_under=ge(lambda r: (None if r["credit_over200"] is None else (not r["credit_over200"])), "the case began with credit under its 200-day"),
            bunched=ge(lambda r: r["bunched"], "the 50-day and 100-day were within 3% of each other"),
            lagging_leader=ge(lambda r: (None if r["fund_near_high"] is None else (r["fund_near_high"] and r["lagging20"])), "the sector fund was within 3% of its high and the stock was lagging it"),
            fund_off_high_lagging=ge(lambda r: (None if r["fund_near_high"] is None else ((not r["fund_near_high"]) and r["lagging20"])), "the sector fund was 3% or more off its high and the stock was lagging it"),
            fund_near_high=ge(lambda r: r["fund_near_high"], "the sector fund was within 3% of its high"),
            regime_calm=ge(lambda r: (None if r.get("regime") is None else r["regime"] == "calm"), "the market regime was calm"),
            regime_stress=ge(lambda r: (None if r.get("regime") is None else r["regime"] == "stress"), "the market regime was stress"),
            bunched_dd=ge(lambda r: r["bunched"], "bunched: the deepest dip inside 20 sessions", "dd20"))
        out["case_splits"] = dict(credit_under=split(lambda r: (None if r["credit_over200"] is None else (not r["credit_over200"]))), vix20=split(lambda r: (None if r["vix"] is None else r["vix"] >= 20)),
                                  bunched=split(lambda r: r["bunched"]), lagging_leader=split(lambda r: (None if r["fund_near_high"] is None else (r["fund_near_high"] and r["lagging20"]))))
        print("layer edges done", flush=True)
    save("review", out); return out


def build_fixtures():
    """A handful of real cases stored WITH their bars (121 sessions from the signal day) and what the engine made of them, so
    tests/pb2.test.mjs can replay them with a second engine written separately in JavaScript. Chosen for what happens in
    them: the case with the most stops, one where the deep bid filled, one where the fixed stop was hit, Micron's newest,
    and the worst case of all (Moderna from 20 Sep 2021)."""
    lay = part("layer"); raw = lay["raw"]["micron_own"]; vixB = load("VIX"); picks = []
    def pick(key, strat, f):
        vals = raw[strat][key]; i = max(range(len(vals)), key=lambda k: f(vals[k]))
        if ("MU", raw["d"][i]) not in picks: picks.append(("MU", raw["d"][i]))
    pick("stops", "pyr_stop", lambda v: v); pick("deep", "pyr_stop_deep", lambda v: v); pick("stops", "pyr_fixed13", lambda v: v); picks.append(("MU", raw["d"][-1]))
    picks.append(("MRNA", "2021-09-20")); picks = list(dict.fromkeys(picks)); out = dict(note=build_fixtures.__doc__, strategies=["allin21", "pyramid", "pyr_stop", "pyr_stop_deep", "pyr_fixed13", "draft", "pyr_stop_band3"], sizes=dict(grow=list(L.GROW), draft_shares=list(L.DRAFT_SHARES), draft_prices=list(L.DRAFT_PRICES), draft_close=L.DRAFT_CLOSE, deep=list(L.DEEP)), cases=[])
    for sym, d in picks:
        B = load(sym)
        if B is None or d not in B.ix: continue
        i = B.ix[d]; j = min(B.n, i + 121); r6 = lambda a: [round(float(x), 6) for x in a[i:j]]
        o, h, l, c = map(lambda a: np.array(r6(a)), (B.o, B.h, B.l, B.c)); m21, m50, m100 = map(lambda n_: np.array(r6(B.ma(n_))), (21, 50, 100)); vx = np.array(r6(on_dates(vixB.d, vixB.c, B.d)))
        res = {}
        for st in out["strategies"]:
            r = L.replay(o, h, l, c, m21, m50, m100, 0, st, vix=vx)
            res[st] = dict(fills=[[x["name"], x["day"], x["px"], x["w"]] for x in r["rungs"]], res={H: (None if r["res"][H] is None else dict(pnl=r["res"][H]["pnl"], dd=r["res"][H]["dd"], held=r["res"][H]["held"])) for H in ("20", "60", "120")},
                           stops=r["stops"], whipsaws=r["whipsaws"], deep_fills=r["deep_fills"], rebuys=r["rebuys"], stop_days=r["stop_days"], avg_cost=r["avg_cost"])
        out["cases"].append(dict(sym=sym, d=d, o=o.tolist(), h=h.tolist(), l=l.tolist(), c=c.tolist(), ma21=m21.tolist(), ma50=m50.tolist(), ma100=m100.tolist(), vix=vx.tolist(), expect=res))
    json.dump(clean(out, 12), open(os.path.join(DATA, "fixtures.json"), "w"), separators=(",", ":")); print("fixtures", [(x["sym"], x["d"]) for x in out["cases"]], round(os.path.getsize(os.path.join(DATA, "fixtures.json")) / 1024), "KB")


def merge():
    out = dict(built_utc=datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), brief="PB2 — the Micron order layer and stops, the leader comparison, and every live rule through open-source tools (7 Oct 2026)")
    man = json.load(open(os.path.join(DATA, "bars-manifest.json")))
    out["bars"] = dict(source="chart API https://scintilla-massive-chart-api.fly.dev /candles tf=D (read-only)", served=sorted(s for s, v in man.items() if "bars" in v), not_served=sorted(s for s, v in man.items() if "error" in v),
                       through=man["MU"]["last"], first=man["MU"]["first"], micron_last_close=man["MU"]["last_close"], stocks=len(STOCKS))
    for p in ("cases", "layer", "stops", "review", "critique"):
        f = os.path.join(PARTS, p + ".json")
        if os.path.exists(f): out[p] = json.load(open(f))
    # Micron's last 260 sessions with its averages, so the page and the playbook can be rebuilt from this one file
    mu = load("MU"); k = 260; sl = slice(mu.n - k, mu.n)
    out["micron"] = dict(dates=mu.d[-k:], open=mu.o[sl].tolist(), high=mu.h[sl].tolist(), low=mu.l[sl].tolist(), close=mu.c[sl].tolist(), ma21=mu.ma(21)[sl].tolist(), ma50=mu.ma(50)[sl].tolist(), ma100=mu.ma(100)[sl].tolist(), ma200=mu.ma(200)[sl].tolist())
    if "layer" in out:
        raw = out["layer"].get("raw", {}).get("micron_own")
        if raw:   # the 48 Micron cases one by one, for the table under the picture
            out["layer"]["micron_cases"] = [dict(d=raw["d"][i], **{s: dict(p60=raw[s]["p60"][i], p120=raw[s]["p120"][i], dd60=raw[s]["dd60"][i], cost=raw[s]["cost"][i], stops=raw[s]["stops"][i], whips=raw[s]["whips"][i], fills=raw[s]["fills"][i]) for s in ("close", "allin21", "pyramid", "pyr_stop", "pyr_stop_deep", "pyr_fixed13", "draft")}) for i in range(len(raw["d"]))]
    if "layer" in out: out["layer"].pop("raw", None)
    if "cases" in out: out["cases"].pop("_idx", None)
    if "review" in out and "regimes" in out["review"]: out["review"]["regimes"].pop("by_date", None)
    json.dump(out, open(os.path.join(DATA, "pb2.json"), "w"), separators=(",", ":")); print("pb2.json", round(os.path.getsize(os.path.join(DATA, "pb2.json")) / 1024), "KB")


if __name__ == "__main__":
    want = sys.argv[1:] or ["cases", "layer", "stops", "review", "cases", "fixtures", "merge"]
    for w in want: {"cases": build_cases, "layer": build_layer, "stops": build_stops, "review": build_review, "fixtures": build_fixtures, "merge": merge}[w]()
