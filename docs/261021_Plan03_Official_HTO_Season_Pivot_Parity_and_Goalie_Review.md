# HockeyOS Plan 03 — Real Excel season pivot refresh and HTO parity

**Date:** October 21, 2026. **Lead:** Data & AI with Engineering/QA. **Acceptance:** `DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED` after a separately staged goalie correction. **Authoritative original workbook unchanged; no public statistics release.**

## Purpose

The legacy Excel Master Workbook now has a source-verified **43-row, 460-cell player game-log import staged in a private disposable copy**. The import source contains **41 withheld fields** and has not yet been approved for the original Excel workbook. Previous source-only saving left the Winter 2026/27 season pivots showing game-359 data. This checkpoint explicitly tests pivot refresh and independently compares their core results with the four completed HTO boxscores.

## Pivot refresh (first fresh disposable copy)

Input: `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Source_Input_261021_01\01_Source_Only_Input_COPY.xlsx`, SHA256 `5c46e7fce2b5a29e5f92799892d168da5d0fbf298895b6f6af599beb11ec9f01`.

In a separate private Excel copy, the two *local* pivots on `Player Stats` were explicitly refreshed using their internal tables `SkaterStatsByGame` and `GoalieStatsByGame`. **No `RefreshAll`, no external connection refresh, no full 17-sheet recalc, no original Excel changes.**

| Pivot | Saved post-refresh range |
|---|---|
| `PlayerStatsBySeason` | `A2:AT655` |
| `GoalieStatsBySeason` | `CN2:EA79` |

The private refresh saved successfully. Candidate: `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Pivot_QA_261021_01\01_Season_Pivot_Refresh_COPY.xlsx`, SHA256 `61c125e1e185250f4ea8a7813d20b807af3a4095528c0748a2ed89e1f88515ef`.

**Independent comparison to the verified HTO four-game feed** found the skater pivot correct for **all 20 unique players**. Exact combined skater results were **54 GP, six G, ten A, sixteen Pts and nine POTG**. The initial goalie pivot had **three goalie identities** but retained **Dev Leong's existing workbook error**: GP2 / W1 / L1 / GA7 versus HTO GP2 / L2 / GA10. This is the known game-359 discrepancy, not an error introduced by the new 43-row source import.

## Four-cell goalie source correction (second, separate disposable copy)

A second independently preserved Excel copy used the first pivot-refresh copy as its source. Source game 3356177 officially records **Dev Leong GP1, L1, GA3, POTG1** in Brave H.C.'s 0–3 loss. The original workbook game-359 goalie log erroneously recorded `GJ363=1` (W), `GK363=0` (L), `GQ363=0` (GA) and `HA363=0` (POTG).

The *second disposable copy only* staged exactly these changes, retaining the official source and table identity checks:

| Game-359 source cell | Before | Disposable review value | Support |
|---|---:|---:|---|
| `GJ363` — W | 1 | 0 | Derived from an official team/goalie **loss**, not a directly supplied HTO win number |
| `GK363` — L | 0 | 1 | Explicit official HTO loss |
| `GQ363` — GA | 0 | 3 | Explicit official HTO goals against |
| `HA363` — POTG | 0 | 1 | Explicit official HTO POTG |

Excel then refreshed **only** `GoalieStatsBySeason` and saved the private candidate. A separate ZIP/XML auditor independently verified the save, **exactly four changed manual source cells, no changed formula definitions**, preserved skater source data, and full HTO goalie GP/L/GA parity for all **three** goalies.

The tested Dev Leong season pivot became **GP2 / W0 / L2 / GA10**. Stephen Logue and Adam Carlyle also matched GP/L/GA. The zero W must retain its separate **derived** provenance qualifier. One goalie POTG observation — Dev Leong's October 18 game — remains **unknown**, so the displayed one-credit POTG season total is not a certified complete value.

- Private second candidate: `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Goalie_Review_261021_01\01_Goalie_Game359_Candidate_COPY.xlsx`, SHA256 `a9069bffe4227311d9e8b22822aa0be3e5c849d00cf3b97f05961446ec22bcea`.
- Independent goalie acceptance: `03_Independent_Goalie_Pivot_Review.json`, SHA256 `d8d89d4152bf4c62d6d7048b5c0b87ebfd4157942ead877761cf12dd9d4f4991`.
- **All private review files remain on BRUTTECH 1.** Neither original workbook nor public HTO site was modified.

## Reproducible source gate

New `scripts/audit_plan03_hto_season_pivot_parity.py` reads the local Excel ZIP/XML pivot data **without Excel**, and the HTO-verified four-game source feed, then validates:

- Accepted four game IDs with no unadmitted fifth game, source player parity and distinct official per-game player identities.
- The skater season pivot's complete **20-player** GP/G/A/Pts/POTG identity and per-player totals.
- The goalie pivot's complete **three-player** GP/L/GA identity and totals; a nonzero goalie W in a four-loss official source is flagged as requiring review.
- Explicit unknown-data coverage: **42 skater PIM observations** and **one goalie POTG observation** are not fully recorded by HTO.
- No automatic approval of AwardsScoring, current PIM rates, streaks/droughts, full 17-sheet recalc, source-of-truth workbook edits or public player-stat release.

The verifier reproduces **`DISPOSABLE_HTO_PIVOT_PARITY_HELD`** on the first pivot copy and **`DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED`** on the second. New offline synthetic tests: `tests/test_plan03_hto_season_pivot_parity.py`, **7/7 PASS**. Hosted record-source CI runs the tests without accessing private Excel.

## Critical remaining gates

1. Resolve all unsupported PIM/goalie POTG/GTG/manual inputs without silently converting unknown to zero. The legacy sheet contains formulas/pivots that may aggregate blanks as zeros.
2. Independently validate **all 17 worksheets**, full pivot metadata/caches, Player Projections, AwardsScoring and Web Streaks under controlled recalculation; the two-pivot stage is not a full-workbook pass.
3. Validate the two earlier identity/jersey flags and source placeholders without assigning unknown HTO IDs.
4. Obtain **explicit workbook-owner approval** for any original-workbook source write (including the four goalie source cells), with source hashes, protected backup, rollback and independent QA.
5. Keep the future Oct 25 HTO game 3375682 outside completed-game records until its official postgame boxscore is available and a separate five-game collector version passes QA.

**Disposition:** Basic HTO skater/goalie pivot data are source-parity validated **in disposable test workbooks only**. Full player statistics, awards, live Record Watch and original workbook promotion remain `HELD`.

Related [Plan 03 tracker #30](https://github.com/adambrutto-maker/brave-hc/issues/30).
