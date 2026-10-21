# HockeyOS Plan 03 — Legacy player game-log coverage and goalie-source conflicts

**Audit date:** 2026-10-21 on BRUTTECH 1. **Lead:** Data & AI. **State:** `GAME_LOG_INCOMPLETE_HOLD`, source-of-truth workbook unchanged.

## Why this audit is required

Plan 03's isolated Microsoft Excel copy successfully accepted the official HTO period scores for four completed Winter 2026/27 games. The `Master Schedule` counted-game formulas updated from one to four, and the season pivot caches expanded. **This does not mean the underlying Player Game Logs are complete.** The original workbook's `Player Game Logs` worksheets and HTO's actual four-game player/goalie statistics were therefore compared directly, independently of the recalculated pivot output.

A read-only ZIP/XML verifier inspected the exact immutable original workbook (`xl/worksheets/sheet3.xml`) and the `SkaterStatsByGame` / `GoalieStatsByGame` structured tables. The verifier read only the Winter 2026/27 Regular Season source game rows and matched player names/individual game numbers against the existing source-verified HTO feed. No default zeros, inferred players or future game outcomes were written.

## Verified baseline

| Recorded data | Official HTO four-game feed | Original workbook Player Game Logs | Missing from original source |
|---|---:|---:|---:|
| Skater game observations | **54** | **14** | **40** |
| Goalie game observations | **4** | **1** | **3** |
| Distinct recorded game numbers | 359, 360, 361, 362 | 359 only | 360–362 |

The 54 skater observations comprise 14 (Sept 20), 15 (Sept 27), 13 (Oct 4), 12 (Oct 18), as reported in the bounded official HTO boxscores. The official goalie feed includes one game observation per match. Official Brave H.C. team totals were **6 GF / 19 GA**.

The 14 existing workbook skater rows for game 359 match its official 14 skaters on basic GP, goals, assists and points; they carry no goals/points because Brave H.C. lost that game 0–3. The source workbook includes the published `Unknown, Johnny` placeholder; **do not transform it into a newly identified person**. The additional game-level records are not derivable by merely recalculating aggregate season totals.

## Existing goalie conflict in game 359

The original goalie log has Dev Leong with `GP=1, W=1, L=0, GA=0, POTG=0`. The official HTO game 3356177 source identifies Dev Leong with `GP=1, losses=1, GA=3, POTG=1` and Brave H.C. lost **0–3**.

The reviewer therefore reports four separately identifiable discrepancies: workbook **losses 0 vs official 1**, **GA 0 vs official 3**, **workbook win 1 incompatible with official loss**, and **POTG 0 vs official 1**. The original workbook row was **not edited**. HTO per-game POTG `null` values in other sources must always remain unknown rather than inferred as zero.

## Effect on dependent worksheets

A disposable-copy Excel `Master Schedule.Calculate()` changed the Winter 2026/27 game count from one to four, and the season pivot caches expanded. Read-only inspection showed:

- `PlayerStatsBySeason` grew from `A2:AT635` to `A2:AT649`, **14 new season rows**, representing the 14 skater game-359 entries only.
- `GoalieStatsBySeason` grew from `CN2:EA76` to `CN2:EA77`, **one new goalie season row**.
- Pivot-cache source rows changed from **4,652 to 4,666** for skaters and **360 to 361** for goalies. Cache ordering/IDs were rewritten by Excel Save and must not be trusted solely by numeric cache index.
- `Player Projections` recorded 267 formula-cache changes; `Awards & Records` recorded 307; `Player Information` 1,387, plus one removed cell; and `Player Stats` 4,609 formula-cache changes, 651 nonformula changes, and 33 added cells in the saved candidate. `Web Streaks` changed a date-heading cache but did not independently become live-current. No formula-definition change was found in these inspected major downstream sheets.
- Because player logs remain incomplete, **the newly recalculated player-season and awards/projection caches are not authorized to become source-of-truth or public content**. Pivot presence, successful Excel Save, or an eight-stage scheduled task PASS cannot substitute for missing individual game source records.

## Implementation

New `scripts/audit_plan03_player_game_log_coverage.py`:
1. Read original workbook bytes **only after exact SHA-256 validation** (`0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`). It loads the known source worksheet and checks exact source table identities before extracting 2026/27 regular-season rows.
2. Validate four known completed official HTO game IDs, aggregate player parity, exact 6 GF/19 GA and distinct player names.
3. Compare official player game observations to pre-existing workbook rows using explicit game number plus exact player identity, without merging placeholders or guessing unknown skater/goalie statistics.
4. Report missing skater/goalie records and field-by-field source conflicts. The result is always a **review-only finding**: no source editing, no public record publication and no fifth-game admission.
5. Preserve one private, source-hashed receipt at `D:\BruTTech\Products\HockeyOS\Plan03\source-archive\261021_Legacy_Player_Game_Log_Gap_Receipt_PRIVATE.json`. SHA256: `f2b2c6be1575fe73f846fdbc4be16584e9ea97de7dba677788b0576d5120296b`. The **receipt itself and original workbook remain off GitHub**.

Live independent audit: `GAME_LOG_INCOMPLETE_HOLD`, **54 / 14 skater**, **4 / 1 goalie**, **40 + 3** missing source observations, **four goalie conflicts**; no source writes. New offline tests: `tests/test_plan03_player_game_log_coverage.py` — **12/12 PASS**.

## Next workbook owner acceptance gate — not implemented here

1. Capture and approve exact HTO per-game skater/goalie source data for game numbers 360–362, including full existing workbook schema fields (not only basic GP/G/A/Pts); preserve unknown PIM, goalie POTG, unknown identities and historical omissions as unknown.
2. Reconcile **game 359 Dev Leong goalie values** with the official HTO source. Do not rewrite his cached season-level win/loss totals without a full row-level source change and formula check.
3. In a **new disposable workbook copy**, prepare a separate exact-cell/row-level import proposal. Validate structured tables, pivot refresh, formulas, all 17 sheets, controlled recalculation and independent source-vs-workbook totals. Do not modify the authoritative workbook or running HockeyOS task in this audit.
4. Only after human workbook-owner approval, backup, independent QA, and a reviewed rollback should any original source of truth be updated. A fully current Record Watch, player projections or award scoring release is **a separate** approval gate.
5. Preserve the Oct 25 HTO game 3375682 / workbook game 363 as pre-admission only until an official postgame boxscore exists and all previous mappings and goalie/POTG constraints revalidate.

**Release boundaries:** Neither HTO admin, historical Records, Awards, original Excel, the successful Master Schedule test copy, publishing scripts nor user-facing websites were altered by this audit. Related Plan 03 execution [#30](https://github.com/adambrutto-maker/brave-hc/issues/30).
