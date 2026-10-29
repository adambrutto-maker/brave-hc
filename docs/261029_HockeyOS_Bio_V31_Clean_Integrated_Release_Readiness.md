# HockeyOS Player Bio V3.1 — integrated clean candidate / release readiness

**Date:** October 29, 2026  
**Lead:** Engineering Department, HockeyOS / Brave H.C.  
**Branch:** `feat/hockeyos-bio-v31-integrated-clean-review-261029`  
**Foundation:** clean Bio V2.7 draft PR #163 (not the older superseded #158 branch)  
**Supplementary isolated UI / QA reference:** PR #168; Highlights independent link correction PR #167.  
**Status:** **DRAFT — not deployed or authorized to merge into production.**

## Objective
Complete an actual working source-preserving integration of the approved Bio improvements rather than just another static mockup. Maintain the existing clean candidate's game-night lineup contract, coach-approved role separation, current stats/award authority, source parity, and tested 109-player identity resolver.

## Approved layout
- Exactly three collections: **Season Outlook**, **Career Trends**, **Coaching**.
- Short Brave H.C. crest/stripe header without a redundant player image, jersey number, or repeated native HTO profile name.
- **Season Outlook:** Current Season actuals → model Career Average with **Summer + Winter history / current-season-equivalent** explanation → Projected Current Season (GP rounded as **display only**) → the existing workbook sigma-based career-trend arrow in its own shaded panel. Comparison text explicitly separates model career baseline from the 1.06 projected PTS/GP.
- Current actuals require source-verified HTO profile identity and the separate `player-actuals-hourly.json` feed. No actuals are inferred for unmatched or stale goalie observations.
- Model calculations, statuses, trend coefficients, and shared `widgets/projection.json` feed remain unchanged; no new forecast algorithm is introduced. Unsupported forecasts display a specific **No forecast published** source hold, not invented zeros.
- **Career Trends:** historical raw G/A scoring bars, separately controlled Actual/Winter/Summer equivalent PTS/GP line and benchmark, source-earned scoring award markers, developmental charts, and source-calculated advanced-stat details with quiet role-specific qualifying rank badges.
- **Coaching:** existing general 1–2–2 and positional descriptions retained; eight moving-player/puck elements in a first-party interactive tactic board (1–2–2, breakout, D-zone coverage); six publisher-owned resource URLs as external **links only**. No dead/unverified iframe embeds, private film, autoplay, or fabricated personalized coaching.

## Source boundaries
- **HTO archive:** `player-career-insights.json`, all **109 verified HTO identities**, six with `NO_PUBLISHED_STATS` (source-held).
- **HTO current skater actuals:** `player-actuals-hourly.json`, independently dated; the actuals feed is not merged into the older historical archive.
- **Workbook model:** existing `projection.json` is current **provisional**, and displays 22 source-modelled rows without assuming non-model players scored zero.
- **Historical normalization:** `league-game-formats.json` 18 source-verified season assignments (32-minute Winter equivalent / 48-minute Summer equivalent). Raw actual goals and assists remain official.
- **Career attendance:** original Master Workbook `RosterStatusBySeason` and `PlayerInfo BQ`, read-only SHA-256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`. FT eligible games are actual team contests; CU/DI seasons count as **100%** of verified appearance opportunities. 101 exact source-to-HTO identity matches reproduced cached scores; eight public identities have no verified workbook crosswalk.
- **Publication hold:** `player-bio-attendance-verified-v31.json` contains only an explicit **HELD** stub and zero named score entries. The private source-derived QA dataset is not copied to GitHub. Live client displays attendance unavailable unless a separately approved, identity-reconciled public derived feed exists; never silently substitutes naive GP ÷ team schedule.

## Review implementation inventory
Updated on this **draft** branch (not main):
- `widgets/player-bio.html` — clean canonical template extended surgically; #163 source and game-night controls preserved.
- `widgets/player-bio-premium.js` — final three-tab visibility, status-held projections, whole-number projected GP, normalized career strip. Other clean release logic retained.
- Added `player-bio-current-v31.js`, `player-bio-expanded-analytics-v31.js`, `player-bio-attendance-rank-v31.js`, `player-bio-rink-tactics-v31.js`, `player-bio-coaching-library-v31.js` and their scoped CSS/public hold/reference manifest.
- CI workflow expanded for the new asset guards, rank tests, source-failure cases, 109-profile narrow acceptance, and previous regression suites.

## Acceptance evidence (local BRUTTECH 1)
- **8/8 V3.1 integrated skater/goalie × 320/390/625/1280** responsive browser cases: PASS.
- **3/3 missing/tampered HTO or forecast source** failures: source holds PASS.
- **4/4 skater/goalie × 320/390** coaching+ranking+private-stub browser cases: PASS.
- **109/109 public HTO identity pages** at narrow 320px: PASS, 19 source-matched current skater rows, 90 properly held; six no-published-stats profiles preserved. No errors or horizontal overflow.
- **6/6 pure workbook FT/CU/DI, rank, sample and data-boundary tests:** PASS on local source-independent fixture.
- Existing clean-candidate collection, V2.7 charts/roles, source-verified award/trend, and legacy identity/retry/regression suites updated for the new tab locations and passed.
- No production HTO/HTO CMS, original Master Workbook, official Awards/Records/Milestones, or private game film modified.

## Remaining release gates — do not bypass
1. Confirm clean branch workflow **hosted GitHub CI** for the actual integrated commit, including historic-source parity; run the original 109-player premium browser suite and the V3.1 109-profile suite.
2. Obtain founder approval of the final integrated narrow UI. Local screenshot/fixture review cannot substitute for actual in-HTO embed acceptance.
3. Keep named workbook-derived attendance **held** until identity crosswalk, distinct source dates, permitted public data fields and publication signoff are verified.
4. Keep all poll-response, game-night role/position and private coaching gates held until source, authentication and manager approvals under #163 are satisfied. The Bio redesign does not itself authorize a lineup.
5. Obtain a distinct **production release approval** before merging a draft into main. After merge and verified GitHub Pages deployment, test the **real native HTO Bio iframe** for representative skater, goalie, historical non-model player, and captain/dual-role player; verify the HTO tab does not duplicate identity or expose private material.
6. Rollback: retain and restore last separately accepted production Player Bio anchor from PR #155 / commit `248be3d001c104b28842451696bbe4385b0b104e` if new JS or HTO integration fails; do not force push historical public records, remove Milestones, or modify original Excel.

**No one has been contacted. No user approval of a live production release was inferred from the instruction to continue the implementation.**
