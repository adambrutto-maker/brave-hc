# HockeyOS Plan 03 — five-game HTO collector source-only acceptance (October 26, 2026)

## Scope and authority
Lead: Data & AI. Supporting: Engineering and independent QA. Review state: PRIVATE_FIVE_GAME_SOURCE_ACCEPTANCE_PASS. This is source-only technical validation, not a production collector activation or authority to alter the protected Master Workbook, HTO website, or Awards / Record Watch / Player Projections publication.

## Original pinned operational collector
- Runtime root: D:\BruTTech\Products\HockeyOS\Runtime\HTOCollector\ae64a29212198fe8d474a3276827b67509575007.
- Current production source recognizes four games: HTO 3356177 (workbook 359), 3356178 (360), 3369564 (361), 3375601 (362). Unknown completed HTO game 3375682 correctly triggers UNMAPPED_COMPLETED_GAMES.
- Production collector validates per-game player and goalie performance, plus source completeness. Adding an ID to the active map without adapting the validation contracts is unsafe.

## Disposable source-only sandbox
- Private test root: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\261026_Five_Game_Collector_SourceOnly.
- Copied pinned scripts/tests, with source SHA256 manifest, rather than editing the pinned operational runtime. Independent current source re-hash confirms original unchanged.
- Tested fifth verified mapping: HTO 3375682, workbook Game 363, Sunday October 25, 2026, Braves 6 / Big Bastones 4, 13 skater rows, one goalie.
- Parser differences: current official skater headers include GP/Pts/G plus optional GWG, and the winning goalie row has W rather than L. The previous goalie matcher ambiguously matched the skater table.
- Only in sandbox: distinguish goalie table by absence of POS; permit only observed skater header fields; require per-game skater GP=1; accept goalie W=1 only with independent scoreboard Braves win and goalie GP=1, deriving losses=0 only in that bounded verified situation. Existing losing-game L rows retain source-explicit losses. Missing goalie POTG stays null.

## Verified result
- Every first-four accepted game record matches the existing production verified feed exactly, including skater and goalie rows.
- Five-game totals: 5 GP, 12 goals, 19 assists, 23 goals against. Skater comparisons 120/120 PASS; goalie comparisons 11/12 complete, with one independently documented Leong POTG observation left unknown; zero discrepancies in comparable fields.
- New HTO gameID 3375682: 13 skaters, one goalie. Stephen Logue now has two games, one win and one loss with 10 goals against. Previous accepted four games remain identical.
- Private acceptance receipt: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\261026_Five_Game_Collector_SourceOnly\261026_Five_Game_Official_Source_Acceptance_Receipt.json.
- Receipt state PRIVATE_FIVE_GAME_SOURCE_ACCEPTANCE_PASS; productionAcceptance=false; originalWorkbookWritten=false; productionFeedWritten=false.
- Source audit utility scripts/audit_hto_five_game_candidate.py; seven synthetic/private regression tests in tests/test_hto_five_game_source_candidate.py PASS, including intentionally changed historical rows, wrong fifth scores, incomplete skater parity, invented goalie POTG and falsely raised production flags.

## Next gated work
1. Port and independently test the whole pinned discovery, content provenance, operational adapter and writer for the five-game/dynamic-game case, not merely the source candidate. Existing gates include hardcoded 4-game map and quantitative parity expectations; retain equivalent checks rather than bypassing.
2. Independently QA the new operational contract on replay fixtures and verify zero historical source changes.
3. Promote a separately versioned collector with rollback and explicit authorized release. Do not mutate the original hashed pinned runtime.
4. Recalculate workbook projections using verified actuals while preserving full Excel formula parity. The original workbook contains 545,506 formulas. Current public five-game actuals are correctly displayed beside a separate held forecast.
5. Only then consider unlocking hourly model publication and future automated season rollover.

This source-only review does not alter the 363-game online opponent ledger or its separate opponent-alias release gates.
