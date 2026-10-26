# HockeyOS Plan 03 — five-game task health and release-hold contract update
Date: October 26, 2026
Lead: QA & Testing, supporting Engineering and Data & AI.

## Failure addressed
GitHub Actions Record Source Refresh run 40358482335 advanced past the earlier Watch test repair but failed at "Check Plan 03 task-success versus publication-hold contract (offline)". The health test and script still assumed the previous four-game HTO feed and exactly two Watch record-array entries. The authorized current feed contains five source-verified completed HTO games, while Watch contains two reached historical milestones plus two unreached source-countdown entries.

## Updated review contract
- Source acceptance now pins the original first five HTO game identities/dates/results/workbook numbers: 3356177, 3356178, 3369564, 3375601 and 3375682. The fifth is the October 25 Braves 6–4 Big Bastones win, Master game 363.
- The review consumes only an HTO feed already holding sourceValidationState=PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS, allGamesDiscovered=true and playerAggregateParity=true. It is a **secondary status classifier**, not a replacement for the primary HTO Scores, team/player/goalie data audits.
- Qualified future additions must be unique, dated, source-verification controlled and cannot overwrite first-five totals; source-authenticated records are still separately governed by the versioned HTO dynamic collector.
- The source watch's completedGames and latestOfficialCompletedGameDate are checked against the accepted HTO feed, without hardcoding Oct 18 / 4 games.
- Two genuine reached milestones remain pinned to unique published HTO Records lines: Carosi 300 GP (September 20) and Provenzano 50 points (September 27). Two 1–2 game countdowns are validated separately for positive threshold arithmetic, remaining counts, no eventDate and source provenance. A countdown does not count as a completed milestone.
- The HTO career Records archive authority/count are unchanged. Full workbook records, full live streaks, full projection model parity and new record publication remain explicitly **HELD**.
- Official score summary is derived from the five exact source rows (12 GF / 23 GA), rather than the obsolete four-game 6 GF / 19 GA.
- The secondary audit reports websitePublication=NOT_VERIFIED_BY_SCHEDULED_TASK even when all eight controller steps pass. No HTO/native CMS or original workbook writes occur.

## QA
- 18 offline Python tests PASS. Negative cases include false source currentness, wrong source hash/metadata counts, missing stages, future/stale receipt, modified historic game result, unverified new sixth game, duplicate/malformed countdown, fake milestone promotion, and unsupported full-release claims.
- This audit is not authorization to promote a still-provisional 181-point five-game projection to fully reconciled workbook status.

## Release
Change to scripts/audit_hockeyos_plan03_release_health.py and tests/test_hockeyos_plan03_release_health.py triggers the existing GitHub Record Source Refresh workflow. Require a completed GitHub Actions run and inspect all later steps independently; local test PASS alone does not confirm the entire workflow recovered.
