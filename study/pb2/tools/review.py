#!/usr/bin/env python3
"""PB2 · the open-source review. Every number here comes from a public, maintained library:

  arch.bootstrap   the resampling engine for every confidence interval (the stationary block bootstrap for daily series,
                   whose next-60-session results overlap; resampling whole calendar months for the case studies).
                   The brief named statsmodels for the bootstrap; statsmodels has no general bootstrap of its own, so the
                   resampling is arch's and statsmodels gives the second opinion below.
  statsmodels      a second, independent interval for each edge (regression with Newey–West errors for daily series,
                   month-clustered errors for cases) and Wilson intervals for shares.
  arch             GJR-GARCH with fat tails on Micron's daily moves -> tomorrow's expected range -> how far apart orders sit.
  hmmlearn         a hidden-Markov model of the market from SPY, the VIX and credit -> which regime today.
  ruptures         change points in Micron's trend.
An EDGE is always 'rule days minus the other days', in points of return."""
import warnings
import numpy as np
warnings.filterwarnings("ignore")
import statsmodels.api as sm
from statsmodels.stats.proportion import proportion_confint
from arch.bootstrap import StationaryBootstrap, IIDBootstrap
from arch import arch_model
from common import load, sma, rsi, year_pct, on_dates, med, mean, share

SEED = 20261007
REPS = 2000


def fwd(c, H):
    out = np.full(len(c), np.nan); out[:-H] = c[H:] / c[:-H] - 1; return out


def fwd_dip(l, c, H):
    out = np.full(len(c), np.nan)
    for i in range(len(c) - H): out[i] = l[i + 1:i + H + 1].min() / c[i] - 1
    return out


def daily_edge(flag, ret, H, label, reps=REPS):
    """Rule days against the other days for one forward horizon: means, shares higher, the stationary-bootstrap 95% interval
    (mean block = H sessions, because results H sessions ahead overlap) and the Newey–West interval from statsmodels."""
    m = np.isfinite(ret) & np.isfinite(flag); f = (flag[m] > 0.5); r = ret[m]
    n1 = int(f.sum()); n0 = int((~f).sum())
    if n1 < 8 or n0 < 8: return dict(label=label, H=H, n_rule=n1, n_other=n0, thin=True)
    d_mean = float(r[f].mean() - r[~f].mean()); d_share = float((r[f] > 0).mean() - (r[~f] > 0).mean()); d_med = float(np.median(r[f]) - np.median(r[~f]))
    bs = StationaryBootstrap(H, f.astype(float), r, seed=SEED); bm = []; bsh = []; bmd = []
    for data, _ in bs.bootstrap(reps):
        ff = data[0] > 0.5; rr = data[1]
        if ff.sum() < 5 or (~ff).sum() < 5: continue
        bm.append(rr[ff].mean() - rr[~ff].mean()); bsh.append((rr[ff] > 0).mean() - (rr[~ff] > 0).mean()); bmd.append(np.median(rr[ff]) - np.median(rr[~ff]))
    ci = lambda b: [float(np.percentile(b, 2.5)), float(np.percentile(b, 97.5))]
    ols = sm.OLS(r, sm.add_constant(f.astype(float))).fit(cov_type="HAC", cov_kwds={"maxlags": H})
    lo, hi = ols.conf_int()[1]
    w1 = proportion_confint(int((r[f] > 0).sum()), n1, method="wilson")
    return dict(label=label, H=H, n_rule=n1, n_other=n0, mean_rule=float(r[f].mean()), mean_other=float(r[~f].mean()), med_rule=float(np.median(r[f])), med_other=float(np.median(r[~f])),
                share_rule=float((r[f] > 0).mean()), share_other=float((r[~f] > 0).mean()), edge_mean=d_mean, edge_mean_ci=ci(bm), edge_median=d_med, edge_median_ci=ci(bmd),
                edge_share=d_share, edge_share_ci=ci(bsh), boot_reps=len(bm), block=H, nw_edge=float(ols.params[1]), nw_ci=[float(lo), float(hi)], nw_p=float(ols.pvalues[1]),
                share_rule_wilson=[float(w1[0]), float(w1[1])], proven=bool(ci(bm)[0] > 0 or ci(bm)[1] < 0))


def case_edge(diff, months, label, reps=REPS):
    """A difference measured case by case (strategy A minus strategy B), with the cases of one calendar month resampled
    together (cases in the same month share the same market) and statsmodels' month-clustered interval beside it."""
    d = np.asarray(diff, float); m = np.isfinite(d); d = d[m]; mo = np.asarray(months)[m]
    if len(d) < 8: return dict(label=label, n=int(len(d)), thin=True)
    keys = sorted(set(mo)); idx = {k: i for i, k in enumerate(keys)}; g = np.array([idx[k] for k in mo])
    sums = np.bincount(g, weights=d, minlength=len(keys)); cnts = np.bincount(g, minlength=len(keys)).astype(float)
    bs = IIDBootstrap(sums, cnts, seed=SEED); b = []
    for data, _ in bs.bootstrap(reps):
        if data[1].sum() > 0: b.append(data[0].sum() / data[1].sum())
    ols = sm.OLS(d, np.ones(len(d))).fit(cov_type="cluster", cov_kwds={"groups": g}); lo, hi = ols.conf_int()[0]
    # the median's interval: whole months resampled, the cases they hold pooled
    rng = np.random.default_rng(SEED); by = [d[g == i] for i in range(len(keys))]; bmed = []
    for _ in range(reps):
        pick = rng.integers(0, len(keys), len(keys)); bmed.append(np.median(np.concatenate([by[i] for i in pick])))
    return dict(label=label, n=int(len(d)), months=len(keys), mean=float(d.mean()), median=float(np.median(d)), share_better=float((d > 0).mean()), share_worse=float((d < 0).mean()),
                ci=[float(np.percentile(b, 2.5)), float(np.percentile(b, 97.5))], median_ci=[float(np.percentile(bmed, 2.5)), float(np.percentile(bmed, 97.5))],
                cluster_ci=[float(lo), float(hi)], cluster_p=float(ols.pvalues[0]), proven=bool(np.percentile(b, 2.5) > 0 or np.percentile(b, 97.5) < 0))


def group_edge(vals, flags, months, label, reps=REPS):
    """Cases with a condition against cases without it (a difference between two groups, not a paired one): whole calendar
    months resampled together, and statsmodels' month-clustered regression beside it."""
    v = np.asarray([np.nan if x is None else x for x in vals], float); f = np.asarray([np.nan if x is None else float(bool(x)) for x in flags], float)
    m = np.isfinite(v) & np.isfinite(f); v = v[m]; f = f[m] > 0.5; mo = np.asarray(months)[m]
    if f.sum() < 8 or (~f).sum() < 8: return dict(label=label, n_yes=int(f.sum()), n_no=int((~f).sum()), thin=True)
    keys = sorted(set(mo)); idx = {k: i for i, k in enumerate(keys)}; g = np.array([idx[k] for k in mo]); rng = np.random.default_rng(SEED)
    by = [np.where(g == i)[0] for i in range(len(keys))]; bm = []; bmd = []
    for _ in range(reps):
        pick = np.concatenate([by[i] for i in rng.integers(0, len(keys), len(keys))]); ff = f[pick]; vv = v[pick]
        if ff.sum() < 4 or (~ff).sum() < 4: continue
        bm.append(vv[ff].mean() - vv[~ff].mean()); bmd.append(np.median(vv[ff]) - np.median(vv[~ff]))
    ols = sm.OLS(v, sm.add_constant(f.astype(float))).fit(cov_type="cluster", cov_kwds={"groups": g}); lo, hi = ols.conf_int()[1]
    return dict(label=label, n_yes=int(f.sum()), n_no=int((~f).sum()), mean_yes=float(v[f].mean()), mean_no=float(v[~f].mean()), med_yes=float(np.median(v[f])), med_no=float(np.median(v[~f])),
                pos_yes=float((v[f] > 0).mean()), pos_no=float((v[~f] > 0).mean()), edge_mean=float(v[f].mean() - v[~f].mean()), edge_mean_ci=[float(np.percentile(bm, 2.5)), float(np.percentile(bm, 97.5))],
                edge_median=float(np.median(v[f]) - np.median(v[~f])), edge_median_ci=[float(np.percentile(bmd, 2.5)), float(np.percentile(bmd, 97.5))], cluster_ci=[float(lo), float(hi)], cluster_p=float(ols.pvalues[1]),
                proven=bool(np.percentile(bm, 2.5) > 0 or np.percentile(bm, 97.5) < 0))


def first_cross_up(x, line, gap=10):
    """A SPIKE the way the deployment study counts it: the first close above the line after a close at or under it, with at
    least `gap` sessions since the last one."""
    out = np.zeros(len(x)); last = -99
    for i in range(1, len(x)):
        if np.isfinite(x[i]) and np.isfinite(x[i - 1]) and x[i] > line and x[i - 1] <= line:
            if i - last >= gap: out[i] = 1; last = i
    return out


def market_rules(ctx):
    """The market rules, each as rule days against the other days on SPY (and on Micron where the rule is used for Micron)."""
    spy = load("SPY"); mu = load("MU"); vixB = load("VIX"); ten = load("US10Y")
    d = spy.d; c = spy.c
    vix = on_dates(vixB.d, vixB.c, d); mu_c = on_dates(mu.d, mu.c, d)
    hyg = on_dates(ctx["hyg_dates"], ctx["hyg_close"], d); hyg200 = on_dates(ctx["hyg_dates"], ctx["hyg_200"], d)
    credit_under = np.where(np.isfinite(hyg) & np.isfinite(hyg200), (hyg < hyg200).astype(float), np.nan)
    # the price-only reading the estate stores, for the comparison the deployment study flagged
    hp = load("HYG"); hpc = on_dates(hp.d, hp.c, d); hp200 = on_dates(hp.d, sma(hp.c, 200), d)
    credit_under_price = np.where(np.isfinite(hpc) & np.isfinite(hp200), (hpc < hp200).astype(float), np.nan)
    ten_c = on_dates(ten.d, ten.c, d); ten200 = on_dates(ten.d, sma(ten.c, 200), d); ten_rsi = on_dates(ten.d, rsi(ten.c), d); ten_pct = year_pct(ten_rsi)
    vix_pct = year_pct(vix)
    F = {H: fwd(c, H) for H in (20, 60, 120)}; FM = {H: fwd(mu_c, H) for H in (20, 60)}
    out = {"span": dict(first=d[0], last=d[-1], sessions=len(d)), "rules": {}}
    R = out["rules"]
    sp20 = first_cross_up(vix, 20); sp23 = first_cross_up(vix, 23)
    R["vix_spike_20"] = dict(name="VIX spike above 20 (first close above 20, 10+ sessions since the last)", spy=[daily_edge(sp20, F[H], H, f"SPY +{H}") for H in (20, 60, 120)], mu=[daily_edge(sp20, FM[H], H, f"Micron +{H}") for H in (20, 60)])
    R["vix_spike_23"] = dict(name="VIX spike above 23 (first close above 23, 10+ sessions since the last)", spy=[daily_edge(sp23, F[H], H, f"SPY +{H}") for H in (20, 60, 120)], mu=[daily_edge(sp23, FM[H], H, f"Micron +{H}") for H in (20, 60)])
    R["vix_at_or_over_20"] = dict(name="Any evening with the VIX at 20 or more", spy=[daily_edge((vix >= 20).astype(float), F[H], H, f"SPY +{H}") for H in (20, 60)], mu=[daily_edge((vix >= 20).astype(float), FM[H], H, f"Micron +{H}") for H in (20, 60)])
    R["vix_top_decile_of_its_year"] = dict(name="VIX in the top tenth of its own past year (an extreme, read contrarian)", spy=[daily_edge(np.where(np.isfinite(vix_pct), (vix_pct >= 90).astype(float), np.nan), F[H], H, f"SPY +{H}") for H in (20, 60)])
    R["credit_under_200"] = dict(name="Credit (HYG with payouts added back) under its 200-day", spy=[daily_edge(credit_under, F[H], H, f"SPY +{H}") for H in (20, 60, 120)], mu=[daily_edge(credit_under, FM[H], H, f"Micron +{H}") for H in (20, 60)],
                                 share_of_days=float(np.nanmean(credit_under)), price_only=[daily_edge(credit_under_price, F[H], H, f"SPY +{H} (price-only HYG)") for H in (60,)], price_only_share_of_days=float(np.nanmean(credit_under_price)))
    hi = np.where(np.isfinite(ten_pct), (ten_pct >= 80).astype(float), np.nan); lo = np.where(np.isfinite(ten_pct), (ten_pct <= 20).astype(float), np.nan)
    R["ten_short_stretched_high"] = dict(name="10-year, short clock: the yield's RSI in the top fifth of its own year (stretched high)", spy=[daily_edge(hi, F[H], H, f"SPY +{H}") for H in (20, 60, 120)])
    R["ten_short_washed_out"] = dict(name="10-year, short clock: the yield's RSI in the bottom fifth of its own year (washed out)", spy=[daily_edge(lo, F[H], H, f"SPY +{H}") for H in (20, 60, 120)])
    above = np.where(np.isfinite(ten_c) & np.isfinite(ten200), (ten_c > ten200).astype(float), np.nan)
    R["ten_long_above_200"] = dict(name="10-year, long clock: the yield above its 200-day", spy=[daily_edge(above, F[H], H, f"SPY +{H}") for H in (60, 120)])
    # extremes read contrarian: the flight-to-safety extremes Alan names (long bonds bid, gold bid, oil dumped)
    ex = {}
    for sym, side, nm in (("TLT", "hi", "Long bonds (TLT) RSI in the top tenth of its year — a rush into bonds"), ("GCUSD", "hi", "Gold RSI in the top tenth of its year — a rush into gold"), ("CLUSD", "lo", "Oil RSI in the bottom tenth of its year — oil dumped")):
        B = load(sym)
        if B is None: continue
        p = year_pct(on_dates(B.d, rsi(B.c), d)); fl = np.where(np.isfinite(p), ((p >= 90) if side == "hi" else (p <= 10)).astype(float), np.nan); ex[sym] = fl
        R["extreme_" + sym] = dict(name=nm, spy=[daily_edge(fl, F[H], H, f"SPY +{H}") for H in (20, 60)])
    if ex:
        stack = np.vstack([np.nan_to_num(v) for v in ex.values()] + [np.nan_to_num(np.where(np.isfinite(vix_pct), (vix_pct >= 90).astype(float), np.nan))])
        ok = np.all(np.vstack([np.isfinite(v) for v in ex.values()] + [np.isfinite(vix_pct)]), axis=0)
        two = np.where(ok, (stack.sum(axis=0) >= 2).astype(float), np.nan)
        R["extreme_two_or_more"] = dict(name="Two or more fear extremes at once (VIX, long bonds, gold, oil — each at its own one-year extreme)", spy=[daily_edge(two, F[H], H, f"SPY +{H}") for H in (20, 60)])
    i = len(d) - 1
    out["today"] = dict(date=d[i], vix=float(vix[i]), vix_pct=float(vix_pct[i]), credit_under=bool(credit_under[i] > 0.5), hyg=float(hyg[i]), hyg200=float(hyg200[i]), ten=float(ten_c[i]), ten200=float(ten200[i]),
                        ten_rsi=float(ten_rsi[i]), ten_rsi_pct=float(ten_pct[i]), ten_above_200=bool(above[i] > 0.5), spy=float(c[i]), spy_rsi=float(rsi(c)[i]),
                        credit_under_since=next((d[k + 1] for k in range(i, 0, -1) if not credit_under[k] > 0.5), None),
                        extremes={s: bool(v[i] > 0.5) for s, v in ex.items()})
    # the VIX's own past year, for the 20 / 23 lines
    w = vix[i - 251:i + 1]; out["vix_year"] = {str(q): float(np.percentile(w, q)) for q in (20, 50, 80, 90, 95)}; out["vix_year"]["max"] = float(w.max())
    return out


def micron_range(levels):
    """arch: GJR-GARCH(1,1) with Student-t errors on Micron's daily % moves (last 10 years). Tomorrow's expected move and range,
    and — from Micron's own history of lows, scaled by the model's volatility that day — the chance each level is reached."""
    mu = load("MU"); c, l, h, o = mu.c, mu.l, mu.h, mu.o; n = mu.n; W = 2520
    r = 100 * np.diff(np.log(c)); r = r[-W:]; base = n - len(r)                    # r[k] is the move INTO session base+k
    am = arch_model(r, mean="Constant", vol="GARCH", p=1, o=1, q=1, dist="t"); res = am.fit(disp="off")
    fc = res.forecast(horizon=20, start=0).variance.values                           # row k: forecasts made after session base+k
    sig1 = np.sqrt(fc[:, 0]); cum = np.sqrt(np.cumsum(fc, axis=1))                   # cum[:, m-1] = m-session volatility
    last = len(r) - 1; s1 = float(sig1[last])
    # how lows and ranges related to the forecast, session by session (forecast made the evening before)
    z1 = []; rng = []; z5 = []; z10 = []; z20 = []
    for k in range(250, last):
        t = base + k                                                                  # forecast after session t covers t+1...
        if t + 20 >= n: break
        z1.append((l[t + 1] / c[t] - 1) * 100 / sig1[k]); rng.append((h[t + 1] - l[t + 1]) / c[t] * 100 / sig1[k])
        z5.append((l[t + 1:t + 6].min() / c[t] - 1) * 100 / cum[k, 4]); z10.append((l[t + 1:t + 11].min() / c[t] - 1) * 100 / cum[k, 9]); z20.append((l[t + 1:t + 21].min() / c[t] - 1) * 100 / cum[k, 19])
    z1, z5, z10, z20, rng = map(np.array, (z1, z5, z10, z20, rng))
    C = float(c[-1]); rk = float(np.median(rng)); exp_range_pct = rk * s1
    out = dict(model="GJR-GARCH(1,1), Student-t, constant mean", fit_from=mu.d[base], fit_to=mu.d[-1], sessions=len(r), params={k: float(v) for k, v in res.params.items()},
               sigma1_pct=s1, sigma_annual_pct=float(s1 * np.sqrt(252)), sigma5_pct=float(cum[last, 4]), sigma10_pct=float(cum[last, 9]), sigma20_pct=float(cum[last, 19]),
               sigma1_year_median=float(np.median(sig1[-252:])), sigma1_pctile_of_year=float(100 * (sig1[-252:] <= s1).mean()),
               range_ratio_median=rk, expected_range_pct=float(exp_range_pct), expected_range_usd=float(exp_range_pct / 100 * C), expected_abs_move_pct=float(np.median(np.abs(r[-252:]) / sig1[-253:-1]) * s1),
               typical_low_pct=float(np.median(z1) * s1), close=C, n_calibration=int(len(z1)),
               realised=dict(range_med_60=float(np.median((h[-60:] - l[-60:]) / c[-61:-1] * 100)), range_med_250=float(np.median((h[-250:] - l[-250:]) / c[-251:-1] * 100)),
                             abs_move_med_60=float(np.median(np.abs(r[-60:])))), levels=[])
    for nm, px in levels:
        dist = (px / C - 1) * 100
        out["levels"].append(dict(name=nm, price=float(px), dist_pct=float(dist), in_sigmas=float(dist / s1), in_ranges=float(-dist / exp_range_pct),
                                  p1=float((z1 <= dist / s1).mean()), p5=float((z5 <= dist / cum[last, 4]).mean()), p10=float((z10 <= dist / cum[last, 9]).mean()), p20=float((z20 <= dist / cum[last, 19]).mean())))
    return out


def regimes(ctx, K=3, seeds=12):
    """hmmlearn: a Gaussian hidden-Markov model on four daily readings — SPY's day, SPY's 20-session realised volatility, the
    VIX and credit's distance from its 200-day. States are named by their average VIX. 'Today' and every past day are read
    with the FORWARD filter only (what could be known that evening); the model's parameters are fitted on the whole span."""
    from hmmlearn.hmm import GaussianHMM
    from scipy.special import logsumexp
    spy = load("SPY"); vixB = load("VIX"); d = spy.d; c = spy.c
    vix = on_dates(vixB.d, vixB.c, d); hyg = on_dates(ctx["hyg_dates"], ctx["hyg_close"], d); hyg200 = on_dates(ctx["hyg_dates"], ctx["hyg_200"], d)
    ret = np.full(len(c), np.nan); ret[1:] = np.diff(np.log(c)) * 100
    vol = np.full(len(c), np.nan)
    for i in range(20, len(c)): vol[i] = ret[i - 19:i + 1].std() * np.sqrt(252)
    cred = (hyg / hyg200 - 1) * 100
    X = np.column_stack([ret, np.log(vol), np.log(vix), cred]); ok = np.all(np.isfinite(X), axis=1); i0 = int(np.argmax(ok)); X = X[i0:]; dd = d[i0:]; cc = c[i0:]
    mu_, sd_ = X.mean(axis=0), X.std(axis=0); Z = (X - mu_) / sd_
    bic = {}
    def fit(k):
        best = None
        for s in range(seeds):
            try:
                m = GaussianHMM(n_components=k, covariance_type="full", n_iter=400, tol=1e-4, random_state=SEED + s).fit(Z); sc = m.score(Z)
                if best is None or sc > best[0]: best = (sc, m)
            except Exception: pass
        return best
    for k in (2, 3, 4):
        b = fit(k)
        if b: p = k * k - 1 + k * Z.shape[1] + k * Z.shape[1] * (Z.shape[1] + 1) / 2; bic[k] = float(-2 * b[0] + p * np.log(len(Z)))
        if k == K: sc, model = b
    # forward filter (no look ahead in the state reading)
    logB = model._compute_log_likelihood(Z); logA = np.log(model.transmat_ + 1e-300); a = np.log(model.startprob_ + 1e-300) + logB[0]; filt = np.zeros_like(logB)
    a -= logsumexp(a); filt[0] = np.exp(a)
    for t in range(1, len(Z)):
        a = logsumexp(a[:, None] + logA, axis=0) + logB[t]; a -= logsumexp(a); filt[t] = np.exp(a)
    state = filt.argmax(axis=1)
    order = np.argsort([np.exp(X[state == k, 2]).mean() if (state == k).any() else 1e9 for k in range(K)])       # by average VIX, calm first
    names = (["calm", "choppy", "stress"] if K == 3 else [f"state {j + 1}" for j in range(K)]); name_of = {int(order[j]): names[j] for j in range(K)}
    F60 = fwd(cc, 60); F20 = fwd(cc, 20); mu = load("MU"); muc = on_dates(mu.d, mu.c, dd); M60 = fwd(muc, 60)
    out = dict(model=f"GaussianHMM, {K} states, full covariance", features=["SPY day %", "log of SPY 20-session realised volatility", "log VIX", "credit % from its 200-day"], first=dd[0], last=dd[-1], sessions=len(Z),
               loglik=float(sc), bic=bic, states=[], seeds=seeds)
    for k in order:
        k = int(k); m = state == k; f60 = F60[m]; f60 = f60[np.isfinite(f60)]; m60 = M60[m]; m60 = m60[np.isfinite(m60)]; f20 = F20[m]; f20 = f20[np.isfinite(f20)]
        out["states"].append(dict(name=name_of[k], share_of_days=float(m.mean()), vix_mean=float(np.exp(X[m, 2]).mean()), vol_mean=float(np.exp(X[m, 1]).mean()), credit_mean=float(X[m, 3].mean()), day_mean=float(X[m, 0].mean()),
                                  stays=float(model.transmat_[k, k]), expected_run_sessions=float(1 / max(1e-9, 1 - model.transmat_[k, k])), spy60_mean=float(f60.mean()), spy60_med=float(np.median(f60)),
                                  spy60_pos=float((f60 > 0).mean()), spy20_med=float(np.median(f20)), mu60_med=float(np.median(m60)), mu60_pos=float((m60 > 0).mean()), n=int(m.sum())))
    T = len(Z) - 1
    out["today"] = dict(date=dd[T], state=name_of[int(state[T])], prob={name_of[int(k)]: float(filt[T, int(k)]) for k in order}, reading=dict(spy_day=float(X[T, 0]), vol20=float(np.exp(X[T, 1])), vix=float(np.exp(X[T, 2])), credit_vs_200=float(X[T, 3])))
    # what holds today's reading where it is: the same model, the last 30 sessions read again with credit put 1% OVER its 200-day
    X2 = X.copy(); X2[-30:, 3] = np.maximum(X2[-30:, 3], 1.0); logB2 = model._compute_log_likelihood((X2 - mu_) / sd_); a = np.log(model.startprob_ + 1e-300) + logB2[0]; a -= logsumexp(a)
    for t in range(1, len(Z)): a = logsumexp(a[:, None] + logA, axis=0) + logB2[t]; a -= logsumexp(a)
    alt = np.exp(a); out["today"]["if_credit_over_its_line"] = dict(state=name_of[int(alt.argmax())], prob={name_of[int(k)]: float(alt[int(k)]) for k in order})
    run = 1
    while T - run >= 0 and state[T - run] == state[T]: run += 1
    out["today"]["in_state_since"] = dd[T - run + 1]; out["today"]["sessions_in_state"] = run
    out["by_date"] = {dd[t]: name_of[int(state[t])] for t in range(len(Z))}
    out["recent"] = [[dd[t], name_of[int(state[t])], round(float(filt[t].max()), 3)] for t in range(len(Z) - 130, len(Z))]
    return out


def micron_trend():
    """ruptures: where Micron's trend changed. Method 1: PELT with a continuous piecewise-linear fit of the log price, at three
    strictness settings (how big a bend must be to count). Method 2: PELT with a kernel cost on daily moves (a change in the
    character of the moves). The newest change point each finds, and the slope since."""
    import ruptures as rpt
    mu = load("MU"); N = 520; d = mu.d[-N:]; y = np.log(mu.c[-N:]); sig = y.reshape(-1, 1)
    algo = rpt.Pelt(model="clinear", min_size=15, jump=1).fit(sig)
    grid = np.geomspace(0.02, 3.0, 40); sols = []
    for pen in grid:
        b = algo.predict(pen=float(pen)); sols.append((float(pen), b[:-1]))
    def pick(target):
        return min(sols, key=lambda s: (abs(len(s[1]) - target), -s[0]))
    def segs(bk):
        edges = [0] + list(bk) + [N]; out = []
        for a, b in zip(edges[:-1], edges[1:]):
            x = np.arange(b - a); k, c0 = np.polyfit(x, y[a:b], 1)
            out.append(dict(start=d[a], end=d[b - 1], sessions=int(b - a), slope_pct_per_session=float((np.exp(k) - 1) * 100), move_pct=float((np.exp(y[b - 1] - y[a]) - 1) * 100),
                            fit_end=float(np.exp(c0 + k * (b - a - 1))), close_end=float(np.exp(y[b - 1]))))
        return out
    out = dict(method="PELT, continuous piecewise-linear cost on the log close (ruptures)", from_=d[0], to=d[-1], sessions=N, settings=[])
    for nm, target in (("coarse (only the big bends)", 4), ("medium", 8), ("fine (every bend)", 14)):
        pen, bk = pick(target); S = segs(bk)
        out["settings"].append(dict(name=nm, penalty=pen, change_points=[d[k] for k in bk], last_change=(d[bk[-1]] if bk else None), segments=S[-4:], current=S[-1], previous=(S[-2] if len(S) > 1 else None)))
    r = np.diff(y).reshape(-1, 1); a2 = rpt.Pelt(model="rbf", min_size=20, jump=1).fit(r); k2 = {}
    for pen in (3, 5, 8):
        b = a2.predict(pen=pen)[:-1]; k2[str(pen)] = [d[k + 1] for k in b]
    out["moves_character"] = dict(method="PELT, kernel (rbf) cost on daily log moves", change_points=k2)
    # how many of the three settings place a change point inside the last 30 / 60 sessions
    def within(days): return sum(1 for s in out["settings"] if s["last_change"] and d.index(s["last_change"]) >= N - days)
    out["agree_last30"] = within(30); out["agree_last60"] = within(60)
    return out
