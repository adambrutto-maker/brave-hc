# ENG CHAT 62 — HockeyOS Player Bio V3.6.9 Projection Card Refinement

Date: October 30, 2026
Lead: Engineering
System: Brave H.C. HockeyOS / Player Intelligence / Season Outlook
Authorized environment: BRUTTECH 1 / AdamPCDesktop
Baseline: V3.6.8; preserve V3.6.7 verified cross-season Scoring Form.

## User-approved visual change

Move Career Average into the Projected Current Season card beneath the five GP/G/A/PTS/PTS/GP tiles. Remove its separate standalone card. Replace the formerly visible "Forecast assumptions and source status" strip with a compact integrated Career Average label and single PTS / GP tile.

The career stat tile matches the projected tiles in computed value/label type, height, background, borders and corner radius. The rightmost projected PTS/GP tile, the career value and the smaller trend icon share the same horizontal centerline.

At reviewed 390px screenshot:
- Projected PTS/GP centre: 326.586px.
- Career Average centre: 326.602px.
- Trend badge centre: 325.305px.
- Projected and career stat tiles both 65px tall.
- Both stat values have 19.5px computed font size and identical colour/weight/line-height.
- Right column centre difference: less than 1.3px.

## Plain-language About these numbers

Move original forecast assumptions, source status, current HTO parity and detailed provenance into the existing About these numbers disclosure, accessible through a nested "Where this forecast comes from" control. Preserve all original data IDs without modifying their renderer.

Show in plain English first:
- Current Season: official results so far.
- Projected Current Season: full-season estimate that may change.
- Career Average: earlier PTS/GP on comparable Summer/Winter game-length basis.
- Trend arrow: model expected scoring-rate direction relative to career average.
- Estimates are not guaranteed; missing values are not zero.

A second nested control "More about the source records" retains the dated career source details. For goalie-only profiles, hide the skater-specific forecast disclosure and copy, and display a short relevant goalie/source explanation.

## Source and scope protection

No edits to projection.json, native HTO statistics, model formulas, career normalization, five-level threshold bands, evidence/GP strengths, original workbook source classifications, current actuals, Last 3/5/10 cross-season source, Awards, Game Night or Coaching.

Maintain the original programmatic IDs:
bioCareerModelRate, bioCareerModelBasis, bioProjectionFull, bioProjectionState, bioProjectionActual, bioModelContext, bioProjectionOpponent, bioProjectionTrendDetail and sourceDetail.

## Pre-existing upstream source-reconciliation hold

An official HTO October 25, 2026 game was corrected after the last individually verified player-season totals snapshot: assists were reassigned between named skaters. Re-captured boxscores now have an October 30 timestamp, but independently certified current totals remain dated October 27. The strict native appearance builder properly holds, and the cross-season raw source reconstruction also reports a reproducibility mismatch. These are actual source changes, not this UI patch.

This ENG62 release **does not change or re-certify those statistics**. GitHub PR validation has been carefully scoped: a layout-only change must prove the official appearance feeds, game evidence, parser, source tests and career history are unchanged and must still pass the published-feed tests plus all browser and source-model invariants. If a PR changes any relevant source file, full raw HTO current-appearance and cross-season reconciliation is mandatory and fails closed. Dedicated scheduled HTO source-refresh workflows remain separately active and may retain their held status until the official correction is independently reconciled.

No waiver of source-changing PR checks, official statistics correction, or false claim of HTO recertification is part of V3.6.9.

## QA and production gates

The new ENG62 browser test validates eight skater/goalie scenarios across 320, 390, 625 and 1280px; no overflow or metric overlap; fifth-column alignment within 2.5px; value and label computed style parity; correct default disclosure state; source-detail accessibility; exact published values; and goalie-specific privacy.

Existing Bio, Awards, current-source-hold, model-sigma-source, five-band arrows, historical ranking, canonical identity, and cross-season form regressions remain mandatory.

Require GitHub CI, production Pages deployment, actual live HTO Bio readback and screenshot before announcing completion.

Rollback only V3.6.9, preserving V3.6.8 team dispersion and V3.6.7 source-qualified cross-season Scoring Form.
