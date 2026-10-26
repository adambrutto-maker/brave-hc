# HockeyOS — Cross-checked v3 Collector Activation & Source QA
**Date:** October 26, 2026
**Lead:** Engineering. Supporting: Data & AI, QA & Testing.

## Reason for upgrade
The v2 dynamic collector already discovered completed HTO game IDs via the original Master Schedule calendar, but a newly discovered opponent/score on the public HTO Scores list was not independently compared with its individual canonical boxscore. Separately, the official HTO team GP/GF/GA footer and season-wide skater and goalie Team Stats rows were not all included in the operational release gate.

## New versioned runtime
- Production runtime: D:\BruTTech\Products\HockeyOS\Runtime\HTOCollector\dynamic-source-crosscheck-v3-261026.
- Previous rollback runtime: D:\BruTTech\Products\HockeyOS\Runtime\HTOCollector\dynamic-date-bound-v2-261026.
- Existing hourly task: BruTTech_HockeyOS_Workbook_Projection_Refresh; active and enabled.
- The official Scores card and canonical boxscore must agree on exact opponent name, game date, GP/game ID, goals for/against, and independent period-total arithmetic. Each original workbook date and number must match uniquely.
- The official HTO Stats footer GP/GF/GA must match all completed boxscores, and its Team Stats skater totals GP/G/A/Pts and goalie GP/W/L/GA must match the source-derived game totals. Per-player and per-goalie seasonal field comparisons remain intact. Unknown goalie POTG remains unknown.
- The original 17-sheet Master Workbook SHA256 stays exactly 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154. No workbook or native HTO write-back.

## Independent acceptance
- Source-only readback PASS against the five real official 2026/27 HTO games.
- Full offline synthetic sixth game uses an **invented test-only ID 9900001**, fictitious November 1 Brave H.C. 6–4 Mid Ice Crisis result and generated mock HTO HTML. It is not a claim that the future game happened.
- 11 offline source/negative tests PASS, including date mapping to Master game 364, all five earlier game rows unchanged, boxscore vs Scores opponent and score mismatch refusal, bad canonical URL, invalid periods, altered independent goalie/skater/team totals, future-date refusal, and isolated synthetic six-game atomic writer/backup/rollback.
- The test fixture was corrected to include the goalie Team Stats row, matching what the real HTO Stats page provides. Positive test and invalid-source refusals all pass.
- Live private writer/compare-and-swap/backup/rollback test PASS; all five real player/goalie game rows exactly identical to previous v2, with production outputs untouched during tests.

## Controlled cutover
- First activation attempt caught a stale backup filename after the v3 source had been independently validated. Its rollback restored both the former launcher and former source-feed SHA exactly; hourly job was re-enabled; no original workbook or public site changes.
- The corrected retry preserved its prior failed receipt, used a new recovery directory, validated source fingerprints, wrote the v3 feed, backed up prior v2 files, and produced state CUTOVER_VERIFIED_SOURCE_CROSSCHECK_V3_ACTIVE with previousFiveUnchanged and rollbackBackupsVerified both true.
- A stale final status-string check in the wrapper initially returned exit code 2 despite the verified receipt. That status check was corrected **without redoing the cutover**.
- The subsequent full scheduled hourly run completed with **8/8 PASS and exit code 0**: read_hto, reconcile_game_boxes, standings, countdown, hot_stove_drafts, projections, hot_stove_roster_context, and record_watch.

## Public-data boundaries
Five real games (HTO IDs 3356177, 3356178, 3369564, 3375601, 3375682) remain the only actual 2026/27 completed games as of this acceptance. The real public projection is the 181-point **provisional** five-game scenario; the fictional six-game 195-point scenario stays in private QA. All 22 model rows and five original career-trend arrow boundary formulas are preserved.

Record Watch still discloses historical workbook limitations. Approved Hot Stove article text has not been automatically overwritten. Mohawks HC and Sugo Sundays aliases remain held. Native HTO homepage duplicate milestone-module removal is outstanding.

## Recovery
Private cutover recovery directory: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\Publisher Recovery\261026_SourceCrosschecked_V3_Cutover_Retry01. Restore the backed-up launcher and source feed together only after disabling the hourly task and independently verifying both SHA256 values, then re-enable and re-run source checks. Do not use Git force-push or edit workbook formulas.

## Next acceptance
The next real completed game, originally Master game 364 on November 1, must independently pass official HTO completed-game, game/date, boxscore, player/goalie and GP/GF/GA tests. A synthetic test never grants admission of an actual future result. A changed or rescheduled official source is held for review.
