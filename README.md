# SCINTILLA · ALLOCATION

Continuous heat→balance allocation module. Approved geiger math (ribbon + RSI/W%R, equalizer TF blend), percent-only, no dollars.

- `index.html` — the module (single file, no build). Since 9 Oct 2026 (DB1) its first screen is the rebalancing dashboard (`study/db1/dashboard.mjs`), live on version 3 of the market reading; everything else is under THE LONG VERSION, closed to start. Its card "how it gets to the number" is a picture (DB2, `study/db2/how.mjs`): the account bar filled to the number, and the market reading built up row by row under it. Feeds: Supabase `macro-feed` + `cohort-feed` (Yahoo primitives, server-cached 5 min).
- Vercel deploys from `main`. Future: mounted at scintillahub.ai/allocation via hub rewrite.
