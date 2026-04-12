# SPRINT 14 — Notes & Known Limitations

## Factual corrections (SPRINT 14.3)

**Commit b9819e0 (SPRINT 14.3) stated images are 832x1216.**
Actual dimensions: **635x928** (Pollinations.ai FLUX returned smaller image
than requested — URL width/height params were not respected by server).

Impact: Aesthetic only. Aspect ratio ~0.68 is close to requested 832/1216 ≈ 0.68.
No broken layout, bubbles render via `max-width: 240px` in CSS anyway.

## Image provider status

**Current:** Pollinations.ai FLUX (free, no API key).

**Codex decision audit (2026-04-12) flagged this as NOT production-ready for:**
- No SLA / reliability guarantees
- Unclear commercial-use rights for generated outputs
- Pipeline discrepancy (reported vs actual dimensions)
- FLUX tends toward generic photo-real, may be tonally off for narrative

**Next sprint should:**
- Replace OpenRouter key (current `sk-or-v1-c6da7...` revoked)
- Re-generate critical narrative images via Gemini 2.5 Flash Image with
  visual QA pass (face integrity, no weird hands, narrative fit)

## Asset lifecycle (after 14.2 + 14.3)

**Currently orphaned (not deleted — save compat):**
- `cinema_ticket.webp` — was day 6 Denis photo until 14.2 swap to `denis_coffee_spot.webp`
- `denis_paris.webp` — was day 15 Denis photo until 14.3 swap to `denis_yacht.webp`

Classification: `compat-retained`. Old save threads still reference these paths.
Policy: do not delete until save compat window closes (TBD).

## Versioning policy

**Current cadence:** app VERSION bumped per sprint (2.2.0 → .1 → .2 → .3 in one session).
`COMPATIBLE_VERSIONS` array extended each time.

**Codex recommendation — adopt next sprint:**
- Split APP_VERSION (cache bust / deploy) from SAVE_SCHEMA_VERSION (persistence shape)
- Bump schema only on state structure changes
- Stop manually extending COMPATIBLE_VERSIONS array

## Follow-ups scheduled for SPRINT 15+

1. Procure new OpenRouter API key or switch to stable image provider
2. Visual QA gate before wiring narrative images
3. Split app-version from save-schema-version
4. Asset lifecycle policy (active / compat-retained / deprecated / deletable)
5. Clean up contradictory user-facing version strings (play.html has v2.1.0 in footer, v2.1.2 brand subtitle, v=2.2.3 in script refs)
6. Diegetic-photo style guide (lightweight, not full brand calibration)
