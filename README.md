# SCINTILLA · ALLOCATION

Continuous heat→balance allocation module. Approved geiger math (ribbon + RSI/W%R, equalizer TF blend), percent-only, no dollars.

- `index.html` — the module (single file, no build). Feeds: Supabase `macro-feed` + `cohort-feed` (Yahoo primitives, server-cached 5 min).
- Vercel deploys from `main`. Future: mounted at scintillahub.ai/allocation via hub rewrite.
