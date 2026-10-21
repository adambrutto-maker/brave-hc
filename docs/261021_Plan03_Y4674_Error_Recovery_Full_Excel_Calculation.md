# HockeyOS Plan 03 — Y4674 source correction and full-workbook Excel calculation

**Observed:** October 21, 2026, BRUTTECH 1. **Lead department:** Data & AI, with Engineering and QA support. **Disposition:** `FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY`; source of truth, native HTO and public player statistics **unchanged**.

## Evidence and root cause

The original 21 MB Brave H.C. Master Workbook stores `Player Game Logs!Y4674` as Excel shared-string index **360**, decoding to the text **one literal space (`" "`)**. This value lies outside the original skater table, but inside the disposable 40-row skater table extension; when the table was expanded, its blank-looking SHG manual-input cell became an arithmetic input to season-normalized formula columns.

The goalies-corrected, source-verified 43-row disposable workbook had **five** cached error cells:

| Sheet / cell | Cached error | Classification |
|---|---|---|
| Player Game Logs `BC4674` | `#VALUE!` | Newly induced by the shared-string whitespace in SHG |
| Player Game Logs `BP4674` | `#VALUE!` | Newly induced by the shared-string whitespace in SHG |
| Player Stats `Z649` | `#VALUE!` | Derived from the affected skater pivot |
| Skater Profile `I13` | `#REF!` | Already present in the original, untouched source workbook |
| Skater Profile `J13` | `#REF!` | Already present in the original, untouched source workbook |

The **original** workbook contains only the last two `#REF!` cells. The added three `#VALUE!` errors are not evidence of missing goals, legitimate SHG values, or acceptable numerical zeros.

## First disposable test — targeted Y4674 cleanup

An isolated **new copy** of the goalie-corrected Excel QA workbook was created, leaving the original and private rollback copies hash-identical to their approved sources. Inside the test copy only:

1. Confirmed `Y4674` was exactly one space, not a numeric stat or a formula.
2. Cleared `Y4674` to an **empty cell**, **not a zero SHG statistic**.
3. Recalculated the `Player Game Logs` sheet.
4. Refreshed only `PlayerStatsBySeason` and recalculated `Player Stats`.
5. Saved the private candidate, without touching the original Master Workbook, native HTO records, external connections or a public publisher.

**Independent ZIP/XML verification** compared the original, pre-repair and post-repair workbook error sets. Result `THREE_NEW_VALUE_ERRORS_CLEARED_PRIVATE_ONLY`, with **zero unexpected changes**:

- Three new `#VALUE!` errors **cleared**.
- The original two `#REF!` errors in Skater Profile **remain**, correctly recorded as a distinct historical defect.
- **All 17 worksheets' exact formula definitions preserved**, formula count **545,506 before and after**.
- Four previously verified Dev Leong goalie input corrections preserved.
- Y4674 source changed from `" "` to a genuinely **empty/unknown** value only in the test copy.

Private evidence:
- Source before cleanup: `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Goalie_Review_261021_01\01_Goalie_Game359_Candidate_COPY.xlsx`, SHA256 `a9069bffe4227311d9e8b22822aa0be3e5c849d00cf3b97f05961446ec22bcea`.
- Repaired private copy: `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Y4674_Formula_QA_261021_01\01_Y4674_Blank_Formula_QA_COPY.xlsx`, SHA256 `bdf5ae1482c5ca5f439b2d073684e8e862cb74f1d0123d77a965497726c27cbd`.
- Independent read-only receipt: `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Y4674_Formula_QA_261021_01\03_Independent_Formula_Error_Review.json`.

## Second disposable test — genuine full-workbook calculation

A **separate new copy** of the repaired `bdf5ae...` workbook was opened in isolated Microsoft Excel with alerts, events and external-link updates disabled. The source workbook was preserved in its **manual** calculation mode. Excel's `Application.CalculateFull()` recalculated all **17 worksheets**, approximately **545,506 formulas**, and saved successfully after **529.64 seconds** (~8 minutes 50 seconds). It exited without leaving an Excel process.

Independent after-save ZIP/XML review returned `FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY`:

| Test | Result |
|---|---|
| Original workbook SHA | Unchanged: `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154` |
| Input/rollback copy SHA | Unchanged: `bdf5ae1482c5ca5f439b2d073684e8e862cb74f1d0123d77a965497726c27cbd` |
| Calculated output SHA | `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b` |
| Formula count | **545,506 before and after** |
| Formula definitions | **All 17 worksheets preserved** |
| Errors before full calculation | Two original `#REF!` cells |
| Errors after full calculation | The **same two** original `#REF!` cells, no new errors |

Private Excel and independent receipts remain in:
`D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Full_Recalc_261021_01\02_Excel_Calculation_Receipt.json` and `03_Independent_Full_Calculation_Audit.json`.

## Independent HTO parity after full calculation

Ran the already merged, no-network `scripts/audit_plan03_hto_season_pivot_parity.py` against the fully calculated private copy and the official verified four-game HTO feed. It returned `DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED`:

- Skaters: **20/20 source identities**, per-player GP/G/A/Pts/POTG source parity; **54 total GP, six goals, ten assists, sixteen points, nine POTG**.
- Goalies: **three source identities**, basic GP/L/GA parity and no nonzero unverified win claims following the separately reviewed game-359 Dev Leong source correction.
- **Still unavailable:** 42 skater-game PIM observations, one goalie POTG observation and other unsupported legacy manual source fields; these are **unknown**, not complete zero-valued statistics.
- This is not approval of individual career rates, AwardsScoring, clutch records, drought watch, historic 2013 gaps, or the future October 25 game.

## Scope and remaining acceptance

The successful `CalculateFull` proves an isolated, saved, source-integrity-preserving calculation with **no new cached Excel errors**, *not that every business calculation is correct*. Original Skater Profile `I13` and `J13` `#REF!` remain a separate source defect.

**Still HELD** until specifically reviewed:
1. The 42 unknown skater PIM values, one unknown goalie POTG, incomplete GTG and other legacy manual fields, plus identity/jersey flags.
2. AwardScoring eligibility, Player Projections numerical reasonableness and Web Streaks / Record Watch temporal/business-rule source parity, not just formula syntax and error-free execution.
3. The original source-of-truth workbook owner approval, protected backup, rollback and exact reviewed change set; the private copies are **not** permitted to replace it.
4. The October 25 HTO game 3375682 remains a scheduled, unadmitted fixture pending completed official HTO source data.
5. Full website/HTO publication remains independently gated. No new historical record or milestone is inferred by Excel.

## Repeatable QA

`scripts/audit_plan03_formula_error_recovery.py` is a read-only acceptance check for original, pre-repair and post-repair XLSX files. It validates the exact error baseline, removes only the three added `#VALUE!` conditions, verifies all formula definitions/counts and preserves original goalie inputs. Its synthetic no-network regression is `tests/test_plan03_formula_error_recovery.py`. Neither the 21 MB private workbooks nor row-level player source files are committed.

Related: [Plan 03 #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [pivot source parity PR #49](https://github.com/adambrutto-maker/brave-hc/pull/49).
