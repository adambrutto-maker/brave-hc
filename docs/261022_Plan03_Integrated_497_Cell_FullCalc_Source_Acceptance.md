# Plan 03 — Integrated 497-cell HTO source and full-workbook calculation acceptance

**Date:** October 22, 2026 (BRUTTECH 1). **Lead department:** Data & AI, supported by Engineering and independent QA. **Disposition:** `COMBINED_497_HTO_BASIC_STATS_AND_FORMULAS_PASS_OWNER_RELEASE_HELD`.

## Executive acceptance result

**The two previously separate private Excel source correction branches are now verified together in one disposable workbook.** The integrated candidate contains all four confirmed 2026/27 HTO team game scores, all 43 previously absent player-game rows, the four reviewed Dev Leong game-359 goalie input corrections, and the whitespace-only Y4674 correction.

The source-to-original comparison, local Excel calculation, independent ZIP/XML formula audit and independent current-season HTO skater/goalie pivot tests all passed in **private disposable copies**, with **zero original workbook edits**. None of the accepted evidence authorizes automatic source-of-truth replacement, new native HTO records, public awards, current player forecasts, article republication or full live Record Watch activation.

### Exact source-change contract

| Source category | Cells or rows | Evidence and disposition |
|---|---:|---|
| Newly staged game-level skater/goalie HTO source inputs | **460 cells** in 40 skater + three goalie new rows | Exact per-cell match to private, source-hashed four-game HTO observation manifest |
| Master Schedule team period scores | **32 cells** across original rows 370–373 | Four official completed games GF–GA: **0–3, 3–6, 2–3, 1–7**; numeric zero periods are real values |
| Original game-359 Dev Leong input corrections | **4 cells** | `GJ363 W 1→0` (loss-derived), `GK363 L 0→1`, `GQ363 GA 0→3`, `HA363 POTG 0→1`; all match approved historical HTO evidence with stated derivation |
| Single-space `Y4674` outside the original skater source table | **1 cell** | Actual legacy shared-string value `" "` cleared to a **blank unknown**, not a numeric SHG=0 |
| **Total supported manual cell dispositions** | **497** | Accepted in one composite disposable workbook |
| Explicitly unsupported HTO source values | **41 withheld input cells** | **41/41 remained blank**, not normalized to zero |

Game `3375682` (October 25, 2026, Big Bastones) remains a future preview only. Master Schedule row 374 is unscored/unplayed; it is not a 0–0 final, tie, or fifth verified source game.

## Protected source and private QA artifacts

| Private artifact on BRUTTECH 1 | SHA-256 | Purpose |
|---|---|---|
| Original `Reference Implementations/Brave H.C/01 Team Records/261001_Brave_HC_Master_Workbook.xlsx` | `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154` | Original source of truth; **never opened for modification** in this phase |
| Earlier player-only full-calc review | `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b` | 460 player inputs, four goalie input corrections, Y4674 cleared; period scores still blank |
| New composite `Plan03/Excel_Disposable_Composite_261021_01/01_Integrated_497_Source_Review_COPY.xlsx` | `9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08` | All 497 reviewed input changes present in same workbook; Master Schedule recalculated and saved |
| Full recalculated composite `Plan03/Excel_Disposable_Composite_Full_Recalc_261022_01/01_Full_Calculation_Review_COPY.xlsx` | `231c1e91cdb833f23b4d49a10f3a3050c941205651ca7e9556c0badd029643e9` | Complete 17-sheet recalculation with source and formula integrity checks |
| `Plan03/source-archive/261022_Integrated_497_FullCalc_HTO_Acceptance_PRIVATE.json` | `b1a7c48d4003c109d4e0857d2aec47f7a640e136fcd658398f3ce57212bbafb6` | Final, source-hashed read-only review and publication-hold receipt |

**No private Excel copy, row-level HTO player manifest or internal receipt body was uploaded to the public GitHub repository.** The new composite full-calc directory additionally preserves a byte-identical rollback input, Excel's own saved calculation receipt, and an independent per-sheet ZIP/XML formula report.

## Real-world validation evidence

**1. Source-to-source integration:** `scripts/audit_plan03_integrated_497_cells.py` runs a no-network read-only comparison against original, player-only, composite, exact private HTO period/game-row inputs and saved Excel app receipt. The output status `INTEGRATED_497_INPUT_CELLS_SOURCE_PASS_NOT_PRODUCTION` confirms 497 source changes together, 41 still-blank unknown inputs and all original historic manual values preserved. The original 158-column skater and 116-column goalie table definitions were expanded only in disposable copies, as reviewed previously.

**2. Controlled Excel `CalculateFull` and independent review:** A separate disposable copy of the verified composite was fully recalculated by Microsoft Excel across **17 worksheets / 545,506 formulas** and saved. An independent ZIP/XML audit reported `FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY`, preserving **545,506/545,506 formula definitions**, zero new formula errors, and exactly the **two pre-existing `Skater Profile!I13/J13 #REF!`** cells. Those profile cells have no original formula text and remain **unrepaired**, with original “Active Records” and “Total Records” definitions not certified.

**3. Final integrated recheck:** `scripts/audit_plan03_integrated_fullcalc_acceptance.py` independently verifies original/prior/composite/full-calculated checksums, exact 497 source values before and after `CalculateFull`, both Excel application and independent source-integrity receipts, the four official team-game scores and workbook counted-game logic, and current official HTO season pivots. Result `COMBINED_497_HTO_BASIC_STATS_AND_FORMULAS_PASS_OWNER_RELEASE_HELD`.

| HTO-aligned private metric | Accepted result |
|---|---|
| Completed Brave H.C. regular-season games | Four losses, **6 goals for / 19 against** |
| Winter 2026/27 `SeasonInfo!AN37` completed-game formula | **4**, independently read in final full-calculated copy |
| Skater-season HTO identity/GP/G/A/Pts/POTG | **20/20 source players**: 54 GP, six G, ten A, sixteen points, nine POTG |
| Goalie-season HTO identity/basic GP/losses/GA | **3/3 source players**, exact current four-game parity |
| Four game-359 Dev Leong correction inputs | All present; W=0 remains **loss-derived**, not a separate HTO win observation |
| Missing HTO skater PIM | **42 observations unknown** across 54 skater game rows |
| Missing HTO goalie POTG | **One observation unknown** across four goalie games |
| New source/formula errors | **None**, beyond two pre-existing Skater Profile `#REF!` values |
| Upcoming HTO game 3375682 | Excluded from completed results |

## Reproducible quality assurance

Read-only scripts:
- `scripts/audit_plan03_integrated_497_cells.py` — exact per-cell integrated source contract and bounded score/cache checks.
- `scripts/audit_plan03_integrated_fullcalc_acceptance.py` — binds verified input, 17-sheet formula receipts, and HTO season-pivot checks while enforcing explicit publication holds.

Synthetic regression tests:
- `tests/test_plan03_integrated_497_cells.py` — 13 fail-closed source-data tests.
- `tests/test_plan03_integrated_fullcalc_acceptance.py` — 11 fail-closed calculation/receipt/publication tests.

Actual BRUTTECH 1 test result: **210/210 Python tests** (including all existing Plan03 guarded source/HTO/Watch suites) and **23/23 JavaScript tests** pass. Hosted CI runs only the synthetic tests and public source-refresh checks; private XLSX/HTO row evidence are never exported to GitHub.

## What this DOES NOT clear

The **original workbook has not been edited and remains on its original SHA**. Workbook owner signoff, protected binary backup, source-diff authorization and a specifically scoped rollback/release procedure are still required for any actual promotion.

Business correctness outside the accepted source fields remains separately held:
- Missing/unknown current-season PIM and goalie POTG, incompletely observable GTG and other legacy manual inputs; **unknown does not equal numerical zero**.
- Original Skater Profile `I13` “Active Records” and `J13` “Total Records” formula-less `#REF!` cells. Legacy HOF holder entries (28) and official HTO published-name record mentions (25) have different scopes and cannot be substituted blindly.
- Player Projections have an unreviewed original duplicate Hunt `SCR` entry and lack Pavaday in their source roster. HTO-aligned actual GP/G/A/Pts do not certify future forecast results.
- Legacy Awards & Records scoring/eligibility, rookie/DI/CU conditions, dedication scoring and current record/streak/drought/historical career baselines; successful Excel formulas and pivot source parity are **not** full current awards/Watch publication approval.
- Original July 1, 2026 Offseason feature narrative privately recovered without original CMS HTML/media/revision evidence; native HTO Bulletin history, 558-entry Records and 146-entry Awards archive remain preserved without republishing.

**Next gate:** produce an explicit original-workbook owner approval and release dossier, identifying exactly the intended 497 reviewed source edits, 41 withheld/unknown values, 2 original Skater Profile defects, identity/eligibility scope, rollback, and separate public Watch and award-races release criteria. Do not apply to original Excel or upload to HTO without that authorization.

Related [Plan 03 tracker #30](https://github.com/adambrutto-maker/brave-hc/issues/30) and previous two-fragment source hold [PR #55](https://github.com/adambrutto-maker/brave-hc/pull/55).
