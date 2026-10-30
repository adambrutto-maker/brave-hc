# Brave H.C. Bio V3.6.3 — Near-Career Neutral Visual Tolerance

**Date:** 2026-10-29
**Surface:** Player Intelligence > Season Outlook > Projected Finish vs Established Career
**Change type:** Visual-only; prior V3.6.2 panel, V3.6.1 layout and workbook source model preserved.

## Authorized interpretation

The historical five-category workbook model remains authoritative: Cold, Cool, Neutral, Warm and Hot, with asymmetric thresholds based on the published sample standard deviation 0.12046170786292325. V3.6.3 does **not** adjust those classifications or their source percentages.

A player whose **verified source trend is within ±5%** of the established career average *and* whose published classification is Neutral gets the visual treatment of neutral slate/white, without flames, frost or sparks. This is a tolerance for **presentation only**. Examples: −2.5%, +2.5%, and the inclusive boundary ±5.0%; outside at ±5.1% the original signed icy/fiery gradient remains. Rookie or held-source cases never claim a calculated career-average comparison.

The actual percentage and unique standard-deviation-based arrow angle stay unchanged. Near-zero arrows still point slightly up or down as appropriate, rather than being snapped to 90°. Matching source trends still have matching angles.

## Reader clarity

- Headline retains the original workbook category and signed change: **Neutral · −2.5%**.
- Supporting line: **Within ±5% of career average** (or **At career average** only for exactly zero).
- The existing model-current/provisional status remains visible.
- The expandable source details clarify that the tolerance affects appearance only.

## Implementation

- `widgets/player-bio-trend-visual-v36.js`: shared `nearCareerAverage` predicate and neutral skin override in the existing badge renderer.
- `widgets/player-bio-premium.js`: use the exact source-verified predicate for panel status and reader text. The existing V3.6.2 panel copies the badge palette automatically.
- `widgets/player-bio.html`: cache-bust V3.6.3 JS modules.
- `tests/test_bio_v36_source_angle.cjs` and `tests/test_bio_v36_angular_animation_browser.cjs`: source integrity, symmetric ±5% limits, exact boundary behavior, distinct angles, palette congruence, 320/390/625/1280 px layouts, no animation within tolerance, reduced motion, and held/rookie states.

**Rollback:** Revert the V3.6.3 release commit only. Do not touch the homepage model, workbook, projection feed, HTO editor or unrelated HockeyOS workstreams.
