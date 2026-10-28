# HockeyOS — Full-Crest Metallic Milestone Badge Refinement

**Date:** October 28, 2026 (America/Toronto)
**Lead:** Engineering
**Implementation scope:** Brave H.C. / HockeyOS player Highlights · four-view Trophy Room
**Environment:** BRUTTECH 1 — AdamPCDesktop
**Source:** Latest published GitHub `main` after PR148 (Trophy Room v18).

## User's approved design direction

Existing Game, Point and Win round milestones are an approved baseline and must be preserved. Newly earned Goal, Assist, and Shutout icons looked inconsistent because their browser-generated badge used a small centered crest, separate navy circle, and difficult-to-read number/category.

The new design uses the **entire authentic Brave H.C. round logo as the medallion's background** (no enlarged generic replacement, no new logo). The milestone number and metric label appear **in the foreground over the crest**, on a high-contrast navy translucent plaque. Surrounding rings use a tier-specific metallic palette. Corresponding individual badge **card backgrounds** in both Milestones and All have subtle bronze/silver/gold/platinum tints and metallic trim, rather than recolouring the entire page when mixed-tier badges appear together.

This style applies **only** to Goal, Assist and Shutout clubs. Game, Point and Win artwork, text and card backgrounds remain unchanged. Future published Goal/Assist/Shutout milestones use the same full-crest treatment without an invented award or new tier above platinum.

## Authentic artwork / protected source

- Canonical original logo: `D:\Desktop\Hockey\BraveHC-Video-Agent\Old Braves Files\Logo Files.zip`, internal `Logo Files/For Print And Vector/PNG/logo-nobackground-5000.png`, SHA-256 `e245640bd0c1f3c3c8e3caea89e69a446d465f97724d9c6878992670229730b5`.
- Public source-derived 1000px authentic widget crest: `widgets/brave_hc_logo.png`, SHA-256 `d27f74ca6c64ebcd1cd7d1a7f4758315987c10ad0ef2f7da5f99e8757568d51e`.
- Reproducible artwork generator (BRUTTECH 1): `scripts/build_fullcrest_milestones.py --write`; read-only regeneration integrity: `--check`. The original 5000px private zip is **never** committed.
- Approved static 200px transparent-corner WebP badge art: `widgets/assets/full-crest-clubs/` with seven exact documented hashed outputs and new `source-manifest.json`.
- Existing 22 original Game/Point/Win assets in `widgets/assets/round-clubs/` are untouched; no replacements in the previous manifest.

## Seven verified badge thresholds

| Metric | Milestone | Tier | Source events in current published ledger |
|---|---:|---|---:|
| Goals | 50 | Bronze | 8 |
| Goals | 100 | Silver | 6 |
| Assists | 50 | Bronze | 14 |
| Assists | 100 | Silver | 6 |
| Assists | 200 | Gold | 1 |
| Shutouts | 5 | Bronze | 1 |
| Shutouts | 10 | Silver | 1 |

**37/37** existing Goal/Assist/Shutout award events are preserved, with the same official player IDs, source-game IDs, exact dates and publication authority. No added award, synthetic production data, change to source value, or direct HTO administrator action.

## Runtime and future thresholds

- `clubArtFor()` uses the exact seven source manifest assets for the verified new clubs. Original Game/Point/Win asset paths are identical to v18.
- `paintVerifiedFutureClub()` retains the existing Game/Point/Win generation branch, while new source-approved Goal/Assist/Shutout thresholds receive the full-bleed logo, dark number plaque, and matching metallic ring.
- Caps at platinum. Shutouts: 5 Bronze; 10 Silver; 20 Gold; 30+ Platinum. Other metric families: 50 Bronze; 100 Silver; 200 Gold; 300+ Platinum.
- Four-view Trophy Room keeps working. Only per-badge Milestones tiles and All inventory milestone cards carry the new category/tier card gradients.
- Browser CSS cannot infer a badge from totals. Official published verified ledger remains the sole milestone authorization.

## Acceptance gates

1. Read-only asset integrity: seven source hash and 200px alpha/branding/metal checks; unchanged 22 original assets; exact 37 event histogram.
2. Real browser 355px/810px: existing medals and official 37 events, 7 static full-crest asset paths, corresponding tier ring/card CSS, readable foreground and no layout overflow.
3. Fictional and **nonpublished** local future Goal 300 fixture: platinum ring and full-crest dynamic canvas path, source-source validator remains unchanged.
4. Existing 109-player source-only tests, 343 Highlights, 230 mapped player statistical records, 281 native HTO Awards and 463 native HTO statistical records are unmodified.
5. Existing 43-profile / 86-session milestone, four-tab and icon integrity browser tests pass, as do stale-source rejection and verified hourly refresh tests.
6. GitHub PR CI must pass, then reviewed deployment through Pages and independent production browser readback; record exact commit, deployment and live checks before marking complete.

**Release boundary:** no direct member communications, no alteration to HTO's native Records or Awards, no database changes, no newly earned award inferred from statistics. Any failed source, checksum or browser validation blocks release.
