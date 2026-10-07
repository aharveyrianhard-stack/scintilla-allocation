#!/usr/bin/env python3
"""PB2 · shared pieces: the cached daily bars, the averages, and the definitions every part of the study uses.

Averages are SIMPLE moving averages of completed daily closes (21, 50, 100, 200) — the same ones the confluence study
and the coordinator's 7 Oct measurement used. Nothing here reads a key or writes outside study/pb2."""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
CACHE = os.environ.get("PB2_CACHE") or os.path.join(ROOT, ".cache")
DATA = os.path.join(ROOT, "data")
U = json.load(open(os.path.join(HERE, "universe.json")))
FUND_OF = {s: f for f, names in U["sector_fund"].items() for s in names}


class Bars:
    """One symbol's daily bars as arrays, with the averages worked out once."""

    def __init__(self, sym, rows):
        self.sym = sym
        self.d = [r[0] for r in rows]
        self.o = np.array([r[1] for r in rows], float); self.h = np.array([r[2] for r in rows], float)
        self.l = np.array([r[3] for r in rows], float); self.c = np.array([r[4] for r in rows], float)
        self.n = len(rows); self.ix = {d: i for i, d in enumerate(self.d)}
        self._ma = {}

    def ma(self, n):
        if n not in self._ma: self._ma[n] = sma(self.c, n)
        return self._ma[n]

    def hi252(self):
        """The highest high of the last 252 sessions, today included (the coordinator's 'its high')."""
        if "hi" not in self._ma:
            out = np.full(self.n, np.nan)
            for i in range(self.n): out[i] = self.h[max(0, i - 251): i + 1].max()
            self._ma["hi"] = out
        return self._ma["hi"]


_cache = {}


def load(sym):
    if sym not in _cache:
        f = os.path.join(CACHE, "bars", sym + ".json")
        _cache[sym] = Bars(sym, json.load(open(f))) if os.path.exists(f) else None
    return _cache[sym]


def served():
    m = json.load(open(os.path.join(DATA, "bars-manifest.json")))
    return [s for s, v in m.items() if "bars" in v]


def sma(a, n):
    out = np.full(len(a), np.nan)
    if len(a) >= n:
        cs = np.cumsum(np.insert(np.asarray(a, float), 0, 0.0))
        out[n - 1:] = (cs[n:] - cs[:-n]) / n
    return out


def rsi(c, n=14):
    """Wilder's RSI, the same recursion the coordinator's script used."""
    out = np.full(len(c), np.nan); g = l = 0.0
    for i in range(1, len(c)):
        d = c[i] - c[i - 1]; up = max(d, 0.0); dn = max(-d, 0.0)
        if i <= n:
            g += up; l += dn
            if i == n: g /= n; l /= n; out[i] = 100 - 100 / (1 + (g / l if l else 1e9))
        else:
            g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; out[i] = 100 - 100 / (1 + (g / l if l else 1e9))
    return out


def year_pct(a, win=252):
    """Each day's place inside its own past year (0-100): the share of the last `win` readings at or under today's."""
    a = np.asarray(a, float); out = np.full(len(a), np.nan)
    for i in range(win - 1, len(a)):
        w = a[i - win + 1: i + 1]
        if np.isnan(w).any() or np.isnan(a[i]): continue
        out[i] = 100.0 * (w <= a[i]).mean()
    return out


def on_dates(src_dates, src_vals, dst_dates):
    """src values carried onto dst's dates (last known value on or before each date)."""
    m = dict(zip(src_dates, src_vals)); out = np.full(len(dst_dates), np.nan); last = np.nan
    keys = sorted(m.keys()); k = 0
    for i, d in enumerate(dst_dates):
        while k < len(keys) and keys[k] <= d: last = m[keys[k]]; k += 1
        out[i] = last
    return out


def med(x):
    x = [v for v in x if v is not None and not (isinstance(v, float) and np.isnan(v))]
    return float(np.median(x)) if x else None


def mean(x):
    x = [v for v in x if v is not None and not (isinstance(v, float) and np.isnan(v))]
    return float(np.mean(x)) if x else None


def share(x):
    x = [bool(v) for v in x if v is not None]
    return (float(np.mean(x)) if x else None)


def pctl(x, q):
    x = [v for v in x if v is not None and not (isinstance(v, float) and np.isnan(v))]
    return float(np.percentile(x, q)) if x else None


def r4(v, k=4):
    if v is None: return None
    if isinstance(v, (bool, np.bool_)): return bool(v)
    if isinstance(v, (int, np.integer)): return int(v)
    v = float(v)
    return None if (np.isnan(v) or np.isinf(v)) else round(v, k)


def clean(o, digits=6):
    """Make any nested result JSON-safe (numpy scalars, NaN). Six decimals for the study's numbers; the test fixtures keep twelve."""
    if isinstance(o, dict): return {str(k): clean(v, digits) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [clean(v, digits) for v in o]
    if isinstance(o, np.ndarray): return [clean(v, digits) for v in o.tolist()]
    if isinstance(o, (np.bool_, bool)): return bool(o)
    if isinstance(o, (np.integer,)): return int(o)
    if isinstance(o, (float, np.floating)):
        f = float(o); return None if (np.isnan(f) or np.isinf(f)) else round(f, digits)
    return o
