# HockeyOS Plan 03 — Disposable Microsoft Excel recalculation acceptance

**2026-10-21, BRUTTECH 1.** **Result:** `DISPOSABLE_MASTER_SCHEDULE_SOURCE_FORMULAS_PASS`. This verifies **only** a *disposable workbook copy* and the `Master Schedule` calculation layer; original Excel source, native HTO backend, Git publishers, player awards and public Watch were **not** modified.

## Sources and isolation

- Authoritative original: `D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx` — SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`, 21,382,236 bytes. Hash was independently checked **before and after** the test.
- Official HTO source: four validated game boxscores, 32 first/second/third/OT numeric period inputs and a separately reviewed [private source manifest](261021_Plan03_Four_Game_Period_Workbook_Shadow_Review.md). None of these contained a fifth completed game.
- Test location: private `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_QA_261021_03\`, comprising an **untouched byte-for-byte rollback copy** and an independently copied `01_Excel_QA_Period_Input_COPY.xlsx`. **Neither is published to GitHub.**
- Excel 16.0 was instantiated in a separate, noninteractive COM application, external-link updates and events disabled, macro security restricted. Before starting the test no Excel instance was running. The original was **never opened in Excel**. Two earlier local QA attempts were held during Excel COM app initialization **before opening any workbook**; their private receipts/copies were preserved. The successful third attempt opened and saved *only the disposable candidate*.
- The original workbook was authored with manual calculation mode and contains 17 worksheets, 35 structured tables and three pivot-cache definitions. This acceptance used `Master Schedule.Calculate()` on the private copy; it deliberately did **not** use `Application.CalculateFull`, refresh PivotTables, recalculate all 17 sheets or edit the source of truth.

## Observed Excel results

The exact 32 source-backed numeric period input cells `K:N` and `P:S` were inserted **only in the disposable candidate**, into Excel source rows 370–373 (workbook game numbers 359–362). No formula cells were changed manually. The `O/T/W/U/X` formulas recalculated with these results:

| Source HTO game | Schedule row | Excel GF | Excel GA | Goal difference | Result | Game Contested |
|---|---:|---:|---:|---:|---|---:|
| 3356177 (Sept 20) | 370 | 0 | 3 | -3 | L | 1 |
| 3356178 (Sept 27) | 371 | 3 | 6 | -3 | L | 1 |
| 3369564 (Oct 4) | 372 | 2 | 3 | -1 | L | 1 |
| 3375601 (Oct 18) | 373 | 1 | 7 | -6 | L | 1 |
| **Four games** | | **6** | **19** | **-13** | **0–4** | **4** |

Within `Master Schedule`, the `SeasonInfo` formula cell `AN37` corresponds to `W2026/27 Regular Season` and changed from an old cached **1** to **4** recorded games. Existing numerical zeros in individual periods were necessary for the workbook `COUNT(K:N,P:S)>0` game-contested rule. The pre-game October 25 HTO ID `3375682` remained on **unplayed row 374** with period inputs blank, `X374=0`, cached result `U374=T` (a placeholder, **not** an official tie).

## Independent saved-file QA

The private Excel COM pilot saved the candidate, exited, and left **no running Excel process**. The resulting candidate SHA256 is `6c125066eff2c4c6f211df8cec4c827676881495d76464c3cb0512abe474a034`. The original **and rollback copy** remained hash-identical to source.

A separate, no-Excel ZIP/XML readback confirmed:

- The source and saved candidate each retain **142 package components, 17 worksheets, 35 Excel tables and three pivot-cache definitions**; both ZIP CRC checks pass.
- The source `Master Schedule` contains 14,866 cells; after Excel Save the exact same cell identifiers and original formula definitions remain.
- **32** changes are the intentional numeric period inputs. **60** are recalculated formula-cache values (19 direct O/T/U/W/X changes and 41 additional recalculated caches, including season totals and date-dependent formulas). **Zero unapproved raw/manual input changes and zero changed formula definitions** were found on `Master Schedule`.
- Formula changes under the heading `SeasonInfo` include `AN37` changing from 1 to 4.
- Future row 374 remains entirely unscored, and the original workbook has not been written.

The read-only, portable `scripts/audit_plan03_excel_disposable_recalc.py` rechecks original/rollback SHA, receipt/candidate SHA, package structure, exact 32 inputs, four official results, unchanged workbook formulas/manual values, the 1→4 season count and future game exclusion. Private real-file validation: `DISPOSABLE_MASTER_SCHEDULE_SOURCE_FORMULAS_PASS`. Synthetic tests: **12/12 PASS**. This source/protection test is executed by the guarded record-source CI workflow without importing any private Excel file.

## Protected receipts (remain on BRUTTECH 1 only)

- Excel application QA receipt: `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_QA_261021_03\02_Excel_QA_Receipt.json`.
- Private original workbook copy: `...\Excel_Disposable_QA_261021_03\00_Source_Verbatim_DO_NOT_EDIT.xlsx` (source SHA above).
- Private saved QA result: `...\Excel_Disposable_QA_261021_03\01_Excel_QA_Period_Input_COPY.xlsx` (candidate SHA above).
- Private original HTO-period source and workbook shadow manifests are referenced in [the source review](261021_Plan03_Four_Game_Period_Workbook_Shadow_Review.md). Their full bodies are deliberately not uploaded.

## Explicit limits and next gate

This proves that **Master Schedule period inputs, per-game final/result formulas and the season's counted-game formula work in a disposable Excel copy**. It does **not** certify all dependent sheets, current projections, formulas in Player Stats or Web Streaks, pivot-cache refresh, hidden profile values, complete player career milestones, current AwardsScoring, new Hot Stove editorial publication, or the native HTO admin site. It is **not** authorization to overwrite the original 21MB workbook.

Before promoting any correction, the responsible workbook implementation plan must:

1. Review and validate a disposable **full-workbook dependency recalculation** (including source-managed player logs, dependent projections, Web Streaks and any pivot caches), with an approved timeout and independent formula-error checks. Preserve the untouched source copy and rollback receipt.
2. Distinguish the independent official HTO player-stat feed from older/manual workbook scoring where data is incomplete. Do not infer missing Summer 2013 skater appearances, goalie POTG, absent player baselines or current 2026/27 awards.
3. Obtain **separate source-owner authorization** to write exact numeric period cells/opponent labels, then verify a fresh source hash, binary backup, Excel recalculation and independent readback. No U/W/X/O/T formula overwrites.
4. Coordinate publisher state in its separate track; the October 21 12:31 run's countdown push was held for Git non-fast-forward divergence. Do not use a green task exit as evidence of a current live Watch when the underlying workbook or publisher is not current.
5. Keep Oct 25 game 3375682 outside completed game statistics until real official boxscore, roster identities, skater/goalie parity and the unique row 374 workbook join are validated after the game.

**Rollback:** delete the disposable QA directory after evidence retention requirements, without touching the original workbook. Reverting this repository QA code affects only its read-only checker/tests; no production workbook, HTO record or widget changes were made.
