# C7 consolidation (CC-BOARD-004 ITEM 3) — 2026-08-05

This public repo now carries three things:

1. `index.html` — the ALLOCATION MODULE (allocation.scintillahub.ai). v18 consolidation pending
   final push (see receipt doc): geiger SSOT = composite_staged; universe = ticker_cohorts +
   hub_favorites; quote+RVOL = live_quotes ÷ company_profile.avg_volume; macro = treasury_rates +
   vix_term (flagged Yahoo fallback when stale); sector lens = sector_rankings (published by the
   sector-rotation tool); per-element freshness badges. Rollback anchor: commit 3669d2d.
2. `dcf.html` — Scintilla DCF V1.1 (DB-wired NVDA projection + 3-stage DCF), hosted at
   allocation.scintillahub.ai/dcf.html. DB overlay: live_quotes, fundamentals, company_profile,
   analyst_estimates, treasury_rates. Static Jul-24 FMP pull remains ONLY as flagged fallback
   baseline (netDebt, D&A%, capex%, NWC%, margins, MRP). The page never calls FMP.
3. `_surfaces/scintilla-sector/` — source-of-record for the scintilla-sector Vercel project
   (sectorrotation.scintillahub.ai), which has NO git link of its own. Hosted here because this
   repo is PUBLIC: the sector Vercel deploy build-fetches `index.html` from this repo pinned to a
   commit SHA (raw.githubusercontent.com), so the deployed bytes are provably the committed bytes.
   (The private aharveyrianhard-stack/scintilla repo carries the pointer README + rollback pack
   under surfaces/scintilla-sector/.)

SSOT doctrine enforced across all surfaces: composite_staged = THE geiger · ticker_cohorts +
hub_favorites = THE universe · fundamentals/ratios_history/analyst_estimates = THE value layer ·
treasury_rates/vix_term/operator_weights = macro truth · live_quotes = quote+RVOL · price bars
from ohlcv_history · Yahoo only as visibly-flagged fallback · never FMP from pages.
