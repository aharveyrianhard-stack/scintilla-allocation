# The Micron order layer, the stops, the leader comparison and the rules through open tools

Study of 7 Oct 2026, on daily bars through 6 Oct 2026. Branch only: nothing here is on the live tool, no table is written, no order is placed, drafted or read.

| file | what it is |
|---|---|
| `PB2.html` | the study page: the answers, the pictures, the tables, the keep / change / drop sheet, what could be wrong |
| `PLAYBOOK.md` | the rules as they stand, each with its evidence, the date it was last measured and a question to check a new decision against |
| `data/pb2.json` | every number the page and the playbook show |
| `data/sheet.json` | the keep / change / drop sheet as data |
| `data/fixtures.json` | five real cases with their bars and the engine's answers, for the second engine in `tests/pb2.test.mjs` |
| `data/bars-manifest.json` | each daily series read from the chart API: bars, first and last session, last close, hash |
| `data/hyg-adjusted-fmp.json` | credit with payouts added back (read once from FMP by the deployment study; kept here because it cannot be re-pulled without the key) |
| `data/lab-pivots.json` | the Lab's horizontal pivots, copied from the confluence study's read-only extract of the installed packs |
| `data/parts/` | the same numbers part by part, with the case-by-case results the intervals are built from |
| `pictures/` | headless pictures of the page at 1680 and 390 wide |
| `tools/` | the code: `pull_bars.py`, `episodes.py` (the cases), `layer.py` (the replay), `stops.py`, `review.py` (arch, statsmodels, hmmlearn, ruptures), `critique.py` (local models under llama.cpp), `build.py`, `build_page.py`, `test_layer.py` |

## Measure again

```
python study/pb2/tools/pull_bars.py --refresh       # daily bars from the chart API, read-only (about 25 MB, not committed)
python study/pb2/tools/build.py                     # cases, the replay, the stops, the open-source review  (under a minute)
python study/pb2/tools/critique.py qwen2.5-7b=<gguf> fin-o1-8b=<gguf>   # optional: the local models, then `build.py merge`
python study/pb2/tools/build_page.py                # PB2.html, PLAYBOOK.md, data/sheet.json
python study/pb2/tools/test_layer.py                # the engine against sums worked by hand
node --test tests/pb2.test.mjs                      # a second engine on real cases, the coordinator's counts, the page headless
node scripts/pb2-shots.mjs                          # the pictures
```

Python 3.11 with `tools/requirements.txt`. Every random draw is seeded, so a rebuild on the same bars gives the same numbers.
