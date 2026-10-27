# Brave H.C. — Verified hourly official skater statistics publishing

Date: October 27, 2026
Scope: authorized BRUTTECH 1 HockeyOS / independent public HTO website only.
Status: Controlled release candidate; review CI and live release receipts before closure.

## Gap addressed

Existing `player-actuals.json` contains a separately source-qualified roster/zero-appearance field. It must never be overwritten by a simplistic stat-table poll. Its publisher intentionally requires special workbook, game-level and roster crosschecks. The hourly publisher therefore writes a **new, skater-stat-only, independently verified** file: `widgets/player-actuals-hourly.json`.

## Hourly collection, independent checks, and publication

- `.github/workflows/brave-hto-player-actuals-hourly.yml`: cron `41 * * * *` UTC, manual dispatch, and direct push-trigger on source code changes.
- `scripts/refresh_verified_hto_player_actuals_hourly.py`: public HTTP GET only to official HTO `p=stats` and `p=scores` for BRAVESHOCKEY.
- Requires exact page identities, published Winter/Summer season agreement, unique player names, GP/G/A/points integer consistency, individual aggregate parity with Team Stats, GP/GF/GA parity with the official team summary, and all completed final scoreboards reconciling to team totals.
- Fails closed on incomplete scoreboard or source drift; no push and no affected existing feeds. Rejects backward changes to verified existing public players/team totals requiring manual reconciliation.
- Writes only the hourly skater-only JSON when totals change. Repeated identical checks create a GitHub Actions receipt but **no feed rewrite and no GitHub commit**. GitHub scheduling is best-effort, not guaranteed minute-exact.
- No token, authenticated HTO mutation, roster/attendance qualification rewrite, historical ledger change, award determination, workbook recalculation, or rank/nomination inference.
- Concurrent publication is safe: no force pushes; conflicting main commits cause a failed run and the next scheduled retry rather than overwriting a different writer.

## Widget freshness

- `widgets/player-highlights-v2.js` safely compares three independently source-qualified current data options: historical participant snapshot, original enriched `player-actuals.json`, and new standalone hourly `player-actuals-hourly.json`.
- Displays newest verified skater totals by HTO source timestamp; retains baseline and participant fallback for missing/unverified data and goalie details outside this skater feed.
- While visible, checks current feeds each 3,600 seconds. Original historical achievements ledger still checks each 180 seconds and only publishes already certified source entries.
- All-Star selection, Hart/Conn Smythe, milestones, Cristillo, discipline etc. remain a **separately verified achievement publication**, not computed from season points.

## Tests

- `tests/test_hourly_hto_player_actuals.py`: seven offline parser/decision checks for exact source, duplicate names, score mismatch, team totals, monotonic publication and refusal to overwrite original enriched actuals.
- `tests/test_hourly_hto_player_visual_refresh_edge.py`: source-qualified hourly browser test: prefer newer official readback, reject unverified and bad aggregates, preserve legacy icons.
- Existing official actuals and participant-fallback tests now deliberately simulate hourly source unavailability so every fail-safe route remains covered.
- Browser responsive integrity and 306 approved historical badges continue to be enforced in GitHub CI.

## Current verifiable baseline

October 27, 2026 public HTO currently reports five games, 12 team goals, 23 conceded, 20 skaters. Source independently checked through both stats/scores URL and first hourly file generated with original official row data. Second read reports `UNCHANGED_VERIFIED` without rewriting file.

## Unresolved governance

- A genuinely new current achievement does not enter the *published* Highlights record until a verified HTO achievement is admitted into the canonical ledger through its separate approval process. This workflow is intentionally **not** a self-awarding system.
- Game/point/win career thresholds require complete validated career stats and exact achievement dates, not current-season 5-game scoring alone.
