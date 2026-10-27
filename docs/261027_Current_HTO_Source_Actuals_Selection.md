# Brave H.C. — Most-current official HTO scoring in player Highlights

Date: October 27, 2026
Environment: BRUTTECH 1 / HockeyOS; not employer work.
Scope: current player scoring display, not historical achievement or award assignment.

## Verified data freshness problem

Published player Highlights were showing `awards-participants.json` captured October 19 despite a later official skater total readback in `player-actuals.json` as of October 26, 2026. The former is a source-verified participant snapshot (not award scoring). The latter is source-verified current HTO GP/G/A/Pts and team parity, so it should drive current scoring when newer.

## Implemented

- `widgets/player-highlights-v2.js` validates `player-actuals.json` independently: exact official HTO stats URL, verified status and schema, expected current season, valid UTC timestamp, unique source player names, bounded nonnegative skater stats, points = goals + assists, correct team GP/goal totals and exact player sums to source team goals, assists and points.
- Reads participant and official actuals feeds during initial load, selects the *newer validated* source only for that player's current scoring. No award winners are inferred.
- Skaters whose official HTO readback is newer display official GP, goals, assists and points, with exact source date and direct official HTO link. If official feed is absent/mismatched, existing participant snapshot continues as fallback. Goalie records outside skater feed are not overwritten.
- Both feeds are re-checked every 3,600 seconds while the iframe is visible; a new, valid and monotonic source readback replaces the older view. Existing historical badge-ledger refresh every 180 seconds remains intact.
- Source context paragraph is replaced, not accumulated, and source date is explicit.
- Historical `player-highlights-ledger.json`, record book and all 17 approved plus 22 official round badges remain untouched.

## Acceptance

- `node --check widgets/player-highlights-v2.js`
- `node scripts/test-player-highlights-v2.cjs` (109 identities, 306 historical highlights).
- `python tests/test_hourly_verified_current_feed_edge.py` PASS (retains existing hourly participant fallback and rejects invalid).
- `python tests/test_published_hto_current_actuals_edge.py` PASS (actual October 26 official feed used over October 19 snapshot, synthetic later verified readback adopted, invalid status and inconsistent team aggregate rejected, source context not duplicated, no awards changed).
- GitHub Chrome test included in `.github/workflows/player-highlights-integrity.yml`.

## Limits

This patch fixes which *already published* verified feed the widget uses. It does not claim that the official `player-actuals.json` publisher is itself scheduled every hour; that requires the separate authorized HTO source capture and publication flow. Hourly HTO records/boxscores source checks and 180-second certified Highlights polling continue per PRs #134/#133.
