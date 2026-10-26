# 261026 HockeyOS Opponent History Stage — source and schedule receipt

## Purpose
Supply the opponent-history half of a future ONLINE HockeyOS Game Ledger from the original Brave H.C. Master Workbook without modifying its 17 sheets and extensive formulas.

## Source
Original file (BRUTTECH 1): D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx
SHA256: 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154.
Read-only ZIP/XML import of the exact Master Schedule worksheet fields B/C/D/E/H/O/T/U/X. Unplayed X=0 schedule placeholders never count as ties. Exact opponent names remain distinct pending aliases.

## First verified private stage
- Source completed games: 358.
- Distinct exact opponent identities: 81.
- Future/unplayed schedule placeholders excluded: 24.
- Admitted current-season workbook results: 0 (master is not current).
- Score/result disagreements among admitted source rows: 0.
- Mid Ice Crisis through workbook snapshot: RS 1-2-2 (13 GF/19 GA), including playoffs 1-4-2 (15 GF/25 GA), consistent with independently approved HTO game preview.
- Big Bastones through the workbook snapshot: RS 3-2-1 (18 GF/23 GA), before the October 25 Braves victory.
- Source original workbook: ZERO writes, hash unchanged.
- Private file: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\261026_Master_Complete_Game_History_PRIVATE_STAGE.json
- The private output has the deliberate status PRIVATE_HISTORICAL_REVIEW_ONLY. It is not an approved publication feed.

## Weekly stage installation
- Windows Scheduled Task: BruTTech_HockeyOS_Weekly_Opponent_History_Stage
- Schedule: Mondays at 08:30 machine local time; run when available.
- Executable Python 3.12 and stable private script:
  D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\stage_master_opponent_history.py
- First authorized dry run: result 0 (success), no workbook writes, no GitHub publication.
- Script in repo: scripts/stage_master_opponent_history.py
- QA: tests/test_stage_master_opponent_history.py; three tests passed on BRUTTECH 1.
- A changed workbook SHA FAILS CLOSED until re-admitted by source-owner review. Weekly staging is NOT a claim that the master is now automatically updated with games.

## Existing refresh conflict
An older scheduled task already runs hourly:
BruTTech_HockeyOS_Workbook_Projection_Refresh
Command: D:\BruTTech\Products\HockeyOS\Run_Brave_Projection_Refresh.cmd
Last inspected task result: 2 (DEGRADED). Logs include HTO source holds and Git push non-fast-forward failures; this currently does not auto-write the authoritative Master Workbook. Do not start a second publisher or rebase/push stale model data blindly. Repair the existing collector/publisher with a serialized source admission and fail-closed release before promising automatic live updates.

## Recommended online replacement model
1. Immutable Master history import (this stage) -> privately held normalized game ledger.
2. HTO boxscores joined by actual unique official game IDs; each HTO game after source verification becomes a ledger event.
3. Exact opponent identity registry with separately reviewed team aliases.
4. Current game reconciliation with result, scores, season, game type, date and historical totals; missing or mismatched input placed in a Data Review queue.
5. Release-gated public opponent-intelligence.json with sourceAt, season range, completed game IDs, H2H RS/playoff/all-time counts, last five verified meetings and verified division-context values.
6. Public website reads only release-qualified records. The current hold display should remain until the online historical-plus-current feed passes QA.
7. Player projections can be migrated from Excel only after full formula parity, not by simplifying the career-history or conditional-formatting thresholds.

## Do not misstate completion
Historical read-only import and Monday scheduling are implemented. Automatic refresh of full workbook current season, online HTO game joins, H2H release gate and current projections are still OPEN. No native HTO page editor writes or private workbook commits were made.
