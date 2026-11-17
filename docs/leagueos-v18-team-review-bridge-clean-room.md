# LeagueOS V18 → HockeyOS TeamOS: Game Results & Statistics Review Bridge

Date: 2026-11-17 (America/Toronto)
Status: DRAFT code review; **not an official stats integration or publishing authority**
Source baseline: LeagueOS V17 result/stat scorer, source-qualified November 16, 2026 public SVHL fixture snapshot.

## Independent product design and provenance

This implementation was authored independently as BruTTech source code. HTO was consulted as a *user-visible feature and workflow reference only* (score entry, game-level statistics, save/review, discrepancies). No HTO code, proprietary interface, credentials, assets, private records or live editing API is used. The public HTO and league source records remain authoritative.

## User workflow

1. LeagueOS Game sheets: select an upcoming source-qualified fixture and enter goal, shot or penalty practice events, optionally with anonymous jersey numbers and assists.
2. Enter a separate final practice score and regulation/overtime/shootout/draw outcome. A discrepancy indicator compares actual recorded goal-event counts with the proposed score. A 2–0 event count vs 0–2 final is a conflict, not a match.
3. Enter team power-play opportunities (PPO) and power-play goals (PPG), separately for home and away. Missing = unknown; explicit zero = recorded zero. PPG may not exceed PPO or the club's scored goals. PP% and PK% are derived when denominator inputs are available; zero opportunities produce an unavailable percentage rather than a fictitious 0%.
4. Save the practice result locally. Only future games tagged to the verified Braves HC source fixture list can appear in HockeyOS TeamOS's Game result review inbox on the *same browser profile*.
5. TeamOS shows Brave H.C. practice score, outcome, source fixture, goal-event agreement, anonymous jersey stats and special-teams performance. It cannot confirm roster identities or publish the result.
6. If goal events, player statistics or event classifications change, the earlier saved result is invalidated and TeamOS no longer treats it as a saved review item. A revised result must be saved deliberately.

## Nonnegotiable gates

- Browser-only local storage is not multi-user or cross-device synchronization; a browser draft can be deleted by the user.
- Score, game sheet, roster, game count, disciplinary status and outcome rules must be confirmed by league authority before production use.
- No save or server mutation to Sports Village, HomeTeamsONLINE, HTO player records, team AwardsScoring, historical workbook, source JSON or published standings.
- Anonymous jerseys never become HTO player IDs, season appearances, award credits or career milestones.
- PPG in the original Brave H.C. Master Workbook means **power-play goals**. Do not confuse with points per game.
- Historical completed official fixtures are not eligible for review-bridge intake; the local sample does not revise verified historical records.
- Later production design requires authenticated officials, actual roster IDs, per-game audit/revision and approval trails, conflict resolution, safe storage, privacy authorization and league-approved release.

## Automated acceptance evidence

- `node --test tests/test_leagueos_team_bridge_v18.cjs tests/test_player_performance_normalization.cjs` — **26 / 26 PASS** (9 V18 bridge tests plus 17 preexisting normalization safeguards).
- `node tests/qa_leagueos_team_bridge_v18.cjs` — **14 browser checks PASS**, after configuring an existing Puppeteer runtime via `PUPPETEER_MODULE_PATH` and local served widgets. Passed 1440-pixel desktop and 390-pixel mobile (document scroll width 390); no unhandled page errors, no HTTP mutations.
- Browser scenario: November 22 Brave H.C. vs Dateline Predators, fictitious final 2–1; PP: home 1 / 2, away 0 / 2. TeamOS locally displays PP% 50.0% and PK% 100.0%; edit after save removes the draft from the review inbox.
- Actual official score/game information was not changed. Keep screenshots and QA receipts in the external review-only directory, not public production.

## Review / release decision

This is a **reviewable candidate only**. Merge to main and publication are not part of this implementation action. Production federation between LeagueOS and HockeyOS must receive separate approval and infrastructure.
