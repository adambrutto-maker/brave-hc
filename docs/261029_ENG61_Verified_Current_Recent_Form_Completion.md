# ENG CHAT 61 — Verified HTO Player-Game Appearance Completion

Date: October 29, 2026
System: HockeyOS Player Intelligence → Career Trends → Scoring Form
Release: Current HTO source expansion V3.6.6
Lead: Engineering, with independent source and browser QA

## Purpose and source authority

V3.6.4/V3.6.5 correctly held Last 3, 5 and 10 P/GP because scoring-event logs alone cannot establish individual game participation.

Stronger official current-season evidence was qualified:

- docs/hto-highlights-rollout/game-audit-evidence/live_boxscores.json — five HTO game boxscore readbacks, including named skater rows and explicit GP.
- docs/hto-highlights-rollout/261020_Historical_Boxscore_Index.json — exact official current-season game IDs.
- widgets/player-actuals-hourly.json — independently verified official season-to-date individual GP/G/A/PTS totals.
- widgets/player-career-insights.json — source-qualified historical HTO player identities. One currently registered HTO player without certified historical career data retains game evidence but receives no invented career baseline.

All five completed matches (Sep 20, Sep 27, Oct 4, Oct 18 and Oct 25, 2026) are included.

## Verified audit

| Source check | Verified result |
| --- | ---: |
| Completed official HTO games | 5 |
| Individual skaters reconciled | 20 |
| Explicit skater appearances | 67 |
| Goals / assists / points | 12 / 19 / 31 |
| Skaters eligible for Last 3 | 13 |
| Skaters eligible for Last 5 | 6 |
| Skaters eligible for Last 10 | 0 |

On Sep 20, the final Brave H.C. goal total was zero and the boxscore omitted the individual G/A/Pts columns. Explicit skater identity/GP=1 rows still prove actual appearances. Only those named rows receive a verified zero-point game; missing rows never imply a player attended.

Every skater's cumulative game GP/G/A/PTS exactly matches the official season-to-date totals.

## Interface result

Career and Current Season P/GP retain their previously source-verified calculations.

Last 3 and Last 5 now display player-specific P/GP and adaptive five-level icons only where the individual has enough complete verified appearances. Insufficient player-specific appearance windows remain SOURCE HELD.

Last 10 remains held; no player has ten individually verified appearances. No extrapolation or inferred roster attendance is introduced.

The source feed uses the preexisting schema brave-hc-individual-verified-appearances/v1, now at source status VERIFIED_COMPLETE_PLAYER_APPEARANCES for the five complete current-season games.

## Automated updates

scripts/build_hto_verified_player_appearances_v366.py verifies the complete source chain. --write emits only the derived public feed, and --check reproduces it exactly from qualified evidence.

The new scheduled GitHub workflow can recheck after official index, boxscore and player-actuals updates and commits only the derived appearance JSON when all source and unit tests pass.

If boxscores or individual season totals have not yet caught up to each other after a new game, the update fails closed without overwriting the last qualified feed. It will retry after the independent source refresh.

## Protection and rollback

No HTO game, official player statistic, historical record, Award, attendance poll, coaching assignment, workbook forecast, or private master workbook was edited.

Independent negative tests reject duplicate/missing game IDs, invalid official source hosts, incomplete team or player evidence, missing explicitly attended GP, unbalanced G/A/Pts and wrongly inferred zero-point games.

Rollback: revert V3.6.6 source qualification and form presentation only. Retain the separately deployed V3.6.5 dynamic team dispersion model.
