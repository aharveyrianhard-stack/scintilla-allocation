# The allocation tool — its history, word for word

Moved out of the page by PA6 (6 Oct 2026). This was the STATE & ROADMAP panel's text as it stood at PA5 (main @4fa648e + C6b @682d7fb). Nothing was edited.

read this first if you are a new session

PA4 · 5 OCT 2026 (evening) — Alan's 14:15 additions, in his tool. "This is the old version without our new stuff." Added: ADVANCE / DECLINE and CONCENTRATION as MACRO HEAT voters (computed here from the daily bars over the served set); the VIX votes live from the chart API's macro board and the VIX term says its date; TARGET MIX says which sector methodology it uses — a dial (State Street · Hub compare · market bow tie, live · tree) with a stated 40/20/20/20 mix; the tree's close tier is an input, rolled up by sector and cohort beside the fund readings; ADD TO COMPS is a short list in the approved cards with KEEP / DROP written to the comps decisions table; the allocation writes what goes on the Hub (control/ALLOCATION-HUB-GUIDANCE.json); and the page folds — one screen per section, a sticky bar, the dials in a drawer. Open from PA3, now decided: the July ladder stays; the three new voters count by default; an ADD tag needs two measured readings.


PA3 · 5 OCT 2026 — strengthened in place, same look, same flow. Alan: "it measured market regime, and from the regime it recommended what percentage of cash to deploy; then the sectors, to decide where to allocate between sectors; then the comps, down to actual companies." What changed underneath: the Geiger now comes from the chart API's /geiger (the Hub's own, fresh every cycle; composite_staged had the index rows 6 weeks old), prices from /quotes (live_quotes was 7 weeks old), each sector from its State Street fund's Geiger with the Invesco equal-weight twin giving the bow tie (sector_rankings was 3 days old), peers from peer_sources with C5's outlier rule (ticker_peers did not exist), analyst targets from A4's checked notes, soundness of each aggregate from B1. HOW MUCH is the July policy ladder (100 · 80 · 50 · 30 · 15 by condition; five dials under RISK POLICY). Three voters added to MACRO HEAT with dials: SECTOR COMPARE, SECTOR BOW TIE, MARKET BOW TIE. Names rank fundamentals first, then the Geiger for timing. The chart API answers only the Hub's origin in a browser, so vercel.json rewrites /geiger and /quotes on this site to it. Still stale and saying so: vix_term (2 Oct — VIX not voting), market_breadth (no table). Everything below this line is the history as it was.


WHAT THIS IS. The SCINTILLA allocation module: market heat → % invested → LC/SC split → moves in % of equity / class / position, with ★FAV candidates ranked by their own geigers. Percent-only, never dollars. Canonical source: GitHub aharveyrianhard-stack/scintilla-allocation (main auto-deploys here). Served at scintillahub.ai/allocation and allocation.scintillahub.ai — same page.


DATA POLICY. Test lane = YAHOO via Supabase functions macro-feed + cohort-feed (5-min server cache). Symbol map: BTCUSD→BTC-USD, GCUSD→GC=F, SIUSD→SI=F, CLUSD→CL=F. Proven voters graduate to the SCINTILLA database as primary with Yahoo as fallback. FMP is PROHIBITED everywhere in this module.


CONSOLIDATION (2026-08-05 · C7). This module now reads the shared SCINTILLA source-of-truth directly: GEIGER = composite_staged (tf=D, the hub equalizer output — the client no longer computes scoring geigers; cohort-feed Yahoo primitives remain only as a flagged FALLBACK). UNIVERSE = ticker_cohorts + hub_favorites (hardcoded TICKER_STYLES retained only as fallback). QUOTE+RVOL = live_quotes ÷ company_profile.avg_volume. MACRO = treasury_rates (10Y) + vix_term (VIX; Yahoo fallback flagged when stale). SECTOR = sector_rankings, published hourly by the sector-rotation tool from the same composite_staged — displayed as a ranking strip and a per-name SECT chip (display/annotation only, no score-math change). Every data element carries a freshness/source badge in the strip under the title. etf_holdings/etf_info remain empty — nothing faked.


ANALYTICS SESSION 2026-08-11 — what changed, and the two gaps you inherit.

1 · The universe read was broken in production and is fixed. ticker_cohorts is now a VIEW over ticker_membership and emits EVERY membership kind (cohort + industry + size + sector + sector_ext) = 1,285 rows, past the PostgREST 1,000 cap. The old limit=1000 read tripped this module's own truncation guard, which correctly refused to run on a silently-cut universe and fell back to hardcoded TICKER_STYLES. The guard was right — the universe outgrew the read. Now read paged and ordered (sbGetPaged). [MEASURED] live before: universe status error, 0 cohort keys, 42 candidates — exactly hub_favorites, i.e. zero cohort-driven discovery. After: 387 tickers, 265 candidates, 182 of them ranking.

2 · Parity re-run and clean. Live page vs composite_staged: EXACT 9/9 to the decimal (SPY/QQQ/GOOGL × trend/momentum/composite). The hardcoded equalizer curve still matches operator_weights 8/8 in shape (constant ×2.93 scale, a no-op once normalized); families 50/50 and momentum mix 60/40 both match. Note the doc's old "operator_weights 0 rows" line was already stale — it holds 42 rows dated 30 Jun / 13 Jul, and the module reads it LIVE.

3 · GAP — the geiger only covers 210 of 390 tickers (46.2% missing). refresh_geiger is healthy (rows seconds old) but scoped to the old 210-name universe. 83 of the 265 candidates have no geiger; tickerG() drops them safely so nothing is corrupted, but they are invisible rather than flagged. P5 sleeve-competition and comparables cannot be trusted as "the whole universe" until this closes. Cross-lane: the geiger spine belongs to the hub/data session — filed, not touched. See system_facts #45.

4 · GAP — fundamentals cover 41% of the universe. ratios_history carries exactly your P5 list (P/E, P/S, P/B, margins, ROE, D/E) and is all-or-nothing per ticker: 161 of 390 have every field, 229 have none. Newest fiscal date 2026-06-30. Peer comparison does have a real axis — ticker_membership holds 93 industries. Also seen on screen: FWD P/E renders 0.0 for every row in COMPARABLES, i.e. forward estimates are not landing. See system_facts #49.

5 · SECTOR_ROTATION was already done by someone else. The deployed page already reads ohlcv_history and has AUM charts the local file lacks (live 122KB vs local 32KB). The local SECTOR_ROTATION.html is a superseded 20 Jul snapshot — refresh it FROM the deployment; never push it over the live one. See system_facts #47.


PROXY MENU. LC→SPY · SC→IWM · Growth→QQQ · Value→RSP · Semis→SMH · Crypto→BTC-USD · Oil→CL=F (LIVE as its own independent voter, inverted — per Alan; no other commodity voters unless Alan asks) · Defensives→XLP+XLU. Mechanics when added: SLEEVES are sized by relative coldness — colder sleeve earns more, its coldest favorites get ADD-tagged. STYLES (growth/value — cross-cap by nature) never become sleeves; they re-rank candidates INSIDE sleeves (cold QQQ pushes growth names up the ADD list in both classes). Sector geigers (already in macro-feed, all 11) will re-rank by sector the same way — integrates with the hub sectorrotation tool.


PARITY — EQUALIZER REVIEWED ON THE HUB 2026-07-19 (logo menu → Weight Equalizer). Read-back of the live surface: TF curve 2h 1.2 · 3h 3.6 · 4h 6.7 · 6h 9.3 · 12h 9.3 · 1d 9.3 · 3d 7.6 · 1w 2.9 (1m–1h and 2w–1M at 0) · families TRND 50 / MOM 50 (only those two carry weight live) · momentum mix 60 RSI / 40 Williams · SAVE persists to operator_weights (currently 0 rows = hub running these defaults). THIS MODULE NOW RUNS THAT EXACT CURVE: cohort-feed v4 computes the primitives per TF, intraday resampled from Yahoo 60m bars (2h=2×60m, 3h=3, 4h=4, 6h=6, 12h=13 bars — test-lane approximation; database bars replace them on graduation). Remaining differences vs the hub can only come from Yahoo data lag/timestamps — by design, per Alan's doctrine. When operator_weights gains rows, read it live and drop the hardcoded curve.


RSI LEVELS — verified vs GOOGL_GEIGER_v2 (GEIGER!A24): momentum is "mapped straight from its range to −1…+1". 23/77 are the ends of the map, not gates — every intermediate RSI level feeds proportionally, continuously.


PARITY TEST — RUN 2026-07-20, vs database table board_rsi. RSI: EXACT match 3/3 to the decimal (SPY 48.42=48.42 · QQQ 42.00=42.00 · GOOGL 42.23=42.23) — same Wilder math, same close-series convention, Alan's post-market worry cleared (DB bar = Friday close; Google Finance's SPY ~752 was the outlier quote, Yahoo+hub+DB all agree). Williams %R: fixed to TRUE bar highs/lows in cohort-feed v5 (was close-only); QQQ now −85.4 vs DB −83.2. Residual gap on SPY/GOOGL (−33 vs −52 · −64 vs −82) is the LOOKBACK convention: this module uses 25 bars per the approved GOOGL_GEIGER_v2 spec; board_rsi appears to use a different period. RESOLVED BY ALAN 2026-07-20: indicators are calculated as normally calculated — Williams %R = standard 14-period on true highs/lows. With that, parity is EXACT 6/6 (RSI and W%R, SPY/QQQ/GOOGL all match the database to the decimal). Still open: wire operator_weights when it gains rows.


YOUR STATE / IBKR. Panel 3 seeds from storage file inbox/ibkr-state.json (percentages only, never dollars). It updates ONLY when Alan tells a session "sync IBKR" (scheduled auto-sync was proposed and REJECTED — do not create one). IBKR connector is read-only OAuth; never touch orders.


ARCHITECTURE (v11, Alan doctrine): SCORE = HOW MUCH (total risk from heat); SLEEVES = WHERE (GROWTH/SMALL/BROAD/SEMIS/CRYPTO/CMDTY, shares proportional to coldness, capped 5-35%). Every proxy does real work in WHERE regardless of its score weight. Tickers can live in several sleeves. LC/SC survives as a lens readout only. Per-sleeve CURRENT arrives with IBKR position sync (all-cash today, so every sleeve reads BUILD). Schedule is multi-factor (vol + heat + breadth + style discounts), not VIX-only. Open on Alan word: breadth voters as RATIO geigers (IWM/SPY, RSP/SPY from macro-feed) instead of straight geigers.


STYLE LAYER — LIVE (2026-07-20): style proxies vs SPY (GROWTH=QQQ, SEMIS=SMH, VALUE=RSP, CRYPTO=BTC, DEFENSIVE=XLP+XLU) produce STYLE TILTS in the MOVES panel (lean into / avoid on adds) and re-rank the candidate list by style-adjusted coldness (geiger + 0.5 × avg style spread). Styles tilt WITHIN sleeves; sleeves remain LC/SC. Cold QQQ literally pushes growth names up the ADD list. THE BRIEF panel at the top is generated from the same numbers.


AGREED BASE (2026-07-20, starting point for testing): weights SPY 1 · QQQ 1 · IWM 0.5 · SMH 0.5 · VIX 0.5 · US10Y 0.5 · OIL 0.5 · VALUE 0 (reading) · CRYPTO 0.25 · DEF 0.25. Policy: invested 100% at max cold, 15% at max hot, linear. LC/SC split data-driven (IWM vs SPY), tilt OFF. Positions 4 LC / 2 SC. All of it testable, none of it sacred.


ECOSYSTEM DIRECTION — ALAN 2026-07-23 (the tool must become one connected system, not stacked panels). Core problem Alan named: nothing flows downstream — TARGET MIX is pure sleeve-coldness % and ignores his PICKS; PICK only highlights; the cap doesn't reach the pie; sleeves don't "compete." The spine to build: HEAT → total %invested → SLEEVES COMPETE (coldness + undervaluation) for the % → within each sleeve your PICKED names split that sleeve's % → cadence front-loads the most undervalued sleeves/names → the pies redraw live as you pick. Phases:

P1 legibility — dials show a live readout of their effect; explain why manual names-per-sleeve greys under AUTO; label the build cadence explicitly as TRANCHES.

P2 close the loop — ✅ BUILT 2026-08-11 — PICKS flow into TARGET MIX. Two-ring donut: outer = sleeves (WHERE), inner = your actual picked names sized inside each sleeve. Fewer names → bigger each; TOTAL cap limits count; diversification flows downstream so the pie moves as you select. Shipped as specified: split is EQUAL within a sleeve (the literal reading of "fewer names → bigger each") — leaning it toward the cheaper name is P4 and was deliberately left alone. A name in several sleeves earns a slice in each and its combined real size is shown. A sleeve with no picks keeps its share as an explicit UNASSIGNED arc, never quietly handed to the sleeves that do have picks.

P3 selection workflow — PICK opens a dedicated SELECTION stage: cards of the tickers, slide through to finalize takers, then it generates the per-name tranche plan in a visual way (Alan wants it to look cool, maybe its own pies).

P4 smarter cadence — replace blind thirds. Build leans toward the MORE UNDERVALUED sleeves first; same per-name (which name is better to buy right now). Needs value signal (P5) + more data; Alan: "you don't have everything to decide with confidence, but you will."

P5 sleeves compete + VALUE OVERLAY — fundamentals (P/E, P/S, rev growth, margins, D/E — Alan's list) enter ranking as a value axis alongside geiger; sleeves compete on cold + cheap, more automatically. Kept separate from geiger. Answers the SNDK-vs-MU question. Also parked here: ETF fund-level fundamentals (weighted P/E, P/B, yield, expense) so a sleeve proxy can sit in comps; empty-sleeve targets pulled from the hub-at-large by theme (not just blue-chips; RSP is the blue-chip case), favorites tagged.


AWAITING ALAN'S GO: multi-class sleeve engine (classes beyond LC/SC) · style re-ranking wiring · sector re-ranking wiring · database graduation of voters · volume conviction coefficient (proposal exists: RVOL time-of-day, VWAP position, volume shelves — scales loudness + gates execution, never votes direction).
