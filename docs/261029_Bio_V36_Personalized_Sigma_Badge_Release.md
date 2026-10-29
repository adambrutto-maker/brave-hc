# HockeyOS Bio V3.6 — personalized source-standard-deviation trend badge

Date: October 29, 2026. Surface: public HTO Player Bio. Approved design-only implementation.

## Source and authenticity

The Bio still calls HockeyOSBioProjectionTrend.directionalArrow(row, projection), which validates the existing published projection.json source, its exact sampleStandardDeviation and the original 5Arrows ratios. No source data, score, projection, workbook, record, or category is updated.

The current source sample sigma is 0.12046170786292325. Workbook 5Arrows thresholds:
- AB100 = -2σ = -0.2409234157258465
- AB99 = -1σ = -0.12046170786292325
- AB97 = +0.5σ = +0.060230853931461624
- AB96 = +1σ = +0.12046170786292325

For each player, z = row.trend / source sigma. Values are source verified; no seven-state preset or manually chosen angle is substituted. The five official workbook states remain Cold, Cool, Neutral, Warm, Hot by the original thresholds. The underlying projection feed remains provisional.

## Angles

The approved angle convention is 0° up (hot), 90° right (neutral), 180° down (cold). Seven visual reference states illustrate increasing intensity; they are not preset values assigned to players.

The design uses a continuous strictly decreasing function with a 10° margin at the original threshold extrema to preserve individual values beyond the category limits:
- Negative z between -2 and 0: angle = 90 + 40 × |z|. At -2, 170°.
- Negative z below -2: angle = 180 - 10 × exp((z+2)/0.6), approaching 180 without snapping.
- Positive z between 0 and 1: angle = 90 - 80 × z. At +1, 10°.
- Positive z above +1: angle = 10 × exp(-(z-1)/0.6), approaching 0 without snapping.

Identical verified trend values share identical rotation; distinct trend values retain different rotations, even beyond the hot/cold category thresholds. CSS angle precision is eight decimals. Full-hot 0° and full-cold 180° are direction guides, not buckets that cause several distinct players to share one final rotation.

## Visual effects and safeguards

The approved short, broad arrow rotates about the actual center. The dark badge remains within the current rectangular inset dimensions, and ice/flame detail lives in a small top-right corner inside it. Frost shimmer, icicle growth, flame flicker and sparks use CSS animation. Arrow motion is not looped. Reduced-motion accessibility disables the effects. The visual temperature color and icon scale use standardized z and may reach full intensity without flattening the actual source-bearing angle. A slightly negative trend may have ice even when the original workbook category is Neutral; the official text is never reclassified.

A rookie has a white horizontal neutral arrow without a numeric z-score; malformed/missing source is held instead of being guessed. No public attendance, protected coaching, Game Night, or underlying player source data is published by this change.

## QA and deployment scope

Pure source checks: test_bio_v36_source_angle.cjs plus unchanged original five-category model test.
Browser checks: test_bio_v36_angular_animation_browser.cjs, 60 valid scenarios at 320, 390, 625 and 1280 pixels, including source coefficients, continuous custom angle, real SVG center and orientation, corner containment, color gradient, motion, rookie, and reduced-motion.
Additional existing Bio tests including the 109-player sweep, original normalization, V3.1, V3.2, V3.3, award trend and mobile regressions are required before release.
Historical V3.4 visual behavior tests remain in the repository for reference but are superseded by V3.6 coverage. The production code change is limited to independent Player Bio JS/CSS, HTML asset references and related tests; the demo review branch remains unmerged.

Rollback: revert the V3.6 Bio squash release only, do not hard reset main because scheduled workflows also update the repository. No native HTO editing is necessary because HTO embeds this GitHub Pages Bio.

## Authorization

The founder reviewed the separate V3.6 animation demo and approved its incorporation into the live Bio on October 29, 2026, specifying continuous unique player bearings based on real source sigma values. The seven demo checkpoints are illustrative only.
