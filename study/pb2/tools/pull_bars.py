#!/usr/bin/env python3
"""PB2 · pull daily bars from the chart API (read-only GETs) into the local cache.

  usage: pull_bars.py            (pulls every symbol in universe.json that is not cached yet)
         pull_bars.py --refresh  (pulls all again)

The cache is study/pb2/.cache/bars/<SYMBOL>.json (not committed: about 60 MB). What IS committed is
study/pb2/data/bars-manifest.json: per symbol the bar count, first and last session, last close and a
sha256 of the series, so a later run can tell whether it is reading the same bars."""
import hashlib, json, os, sys, time, urllib.request
API = "https://scintilla-massive-chart-api.fly.dev"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.environ.get("PB2_CACHE") or os.path.join(HERE, "..", ".cache")
BARS = os.path.join(CACHE, "bars"); os.makedirs(BARS, exist_ok=True)
U = json.load(open(os.path.join(HERE, "universe.json")))
syms = list(U["market"]) + list(U["sector_fund"].keys())
for fund, names in U["sector_fund"].items():
    for s in names:
        if s not in syms: syms.append(s)
for s in U["coordinator19"]:
    if s not in syms: syms.append(s)
refresh = "--refresh" in sys.argv
man_path = os.path.join(HERE, "..", "data", "bars-manifest.json")
manifest = json.load(open(man_path)) if os.path.exists(man_path) else {}
day = lambda t: time.strftime("%Y-%m-%d", time.gmtime(t / 1000))
for sym in syms:
    f = os.path.join(BARS, sym + ".json")
    if os.path.exists(f) and not refresh and sym in manifest and "bars" in manifest[sym]: continue
    d = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(f"{API}/candles?symbol={sym}&tf=D&limit=10000", timeout=120) as r: d = json.load(r)
            break
        except Exception as e:
            d = {"error": repr(e)}; time.sleep(2 + 2 * attempt)
    s = (d or {}).get("series")
    if not s:
        manifest[sym] = {"error": str((d or {}).get("error"))[:160], "state": (d or {}).get("state")}; print(sym, "NOT SERVED", manifest[sym], flush=True); continue
    rows = [[day(b["t"]), b["o"], b["h"], b["l"], b["c"], b.get("v")] for b in s if b.get("c") is not None and b.get("o") is not None]
    raw = json.dumps(rows, separators=(",", ":"))
    open(f, "w").write(raw)
    manifest[sym] = {"bars": len(rows), "first": rows[0][0], "last": rows[-1][0], "last_close": rows[-1][4], "provider": d.get("provider"),
                     "price_basis": d.get("price_basis"), "sha256": hashlib.sha256(raw.encode()).hexdigest()}
    print(sym, len(rows), rows[0][0], rows[-1][0], rows[-1][4], d.get("provider"), flush=True)
    json.dump(manifest, open(man_path, "w"), indent=1, sort_keys=True)
    time.sleep(0.25)
json.dump(manifest, open(man_path, "w"), indent=1, sort_keys=True)
print("PULL_DONE", sum(1 for v in manifest.values() if "bars" in v), "served;", sum(1 for v in manifest.values() if "error" in v), "not served")
