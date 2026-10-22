# HockeyOS Plan 03 — Integrated 497-cell workbook acceptance

**Evidence date:** October 22, 2026. **Lead:** Data & AI; Engineering and independent QA review. **Disposition:** `497_SOURCE_AND_BASIC_SEASON_PARITY_PASS_REVIEW_ONLY`.

## What has changed since the previous checkpoint

Previous Plan 03 QA proved two **separate** Excel branches: one contained four official HTO game period scores; the other contained 43 verified player-game entries, four goalie corrections, and the Y4674 whitespace fix. Both individually passed useful tests, but **neither was a combined, fully calculated source-of-truth candidate**. That was correctly documented in [PR #55](https://github.com/adambrutto-maker/brave-hc/pull/55).

**This gate is now completed in one PRIVATE, disposable Excel workbook**: all 497 source-level changes were combined and independently checked, then a separate copy was fully recalculated with Microsoft Excel and checked again. The original authoritative workbook, native HTO CMS and public HockeyOS statistic feeds were not changed.

## Protected source files — BRUTTECH 1 only

| Artifact | Private path under `D:\BruTTech\Products\HockeyOS` | SHA-256 |
|---|---|---|
| Original immutable 21 MB Excel Master Workbook | `Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx` | `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154` |
| First **combined 497-input** candidate | `Plan03\Excel_Disposable_Composite_261021_01\01_Integrated_497_Source_Review_COPY.xlsx` | `9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08` |
| Protected exact duplicate of the combined candidate | `Plan03\Excel_Disposable_Composite_Full_Recalc_261022_01\00_Input_Verbatim_DoNotEdit.xlsx` | `9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08` |
| Saved private **fully recalculated combined** workbook | `Plan03\Excel_Disposable_Composite_Full_Recalc_261022_01\01_Full_Calculation_Review_COPY.xlsx` | `231c1e91cdb833f23b4d49a10f3a3050c941205651ca7e9556c0badd029643e9` |

The full calculation completed on October 22: **17 Excel worksheets, 545,506 formulas, 531.61 seconds**. Input/rollback hashes match. No external connection `RefreshAll`, HTO update, original workbook edit or public-stat publishing was performed.

**Private evidence** (also not uploaded):
- `Plan03\Excel_Disposable_Composite_261021_01\02_Excel_Composite_Source_Receipt.json` — completed 32 verified numeric period-input additions and Master Schedule result check.
- `Plan03\Excel_Disposable_Composite_Full_Recalc_261022_01\02_Excel_Calculation_Receipt.json` — Excel's full-calculation save receipt.
- `Plan03\Excel_Disposable_Composite_Full_Recalc_261022_01\03_Independent_Full_Calculation_Audit.json` — independent ZIP/XML formula and error audit.
- `Plan03\source-archive\261022_Composite_497_Cell_FullCalc_Independent_Acceptance_PRIVATE.json` — independent combined source/HTO/pivot reviewer with fingerprints for all input evidence; SHA256 `8ca527e80b4128c3ee0398d89d022d35c29108e2c54d881128b77bdfce19ebe2`.

## Exact source-level acceptance

The new `scripts/audit_plan03_integrated_497_fullcalc.py` checks the *real saved fully calculated composite* against the original workbook and private HTO evidence. Exact intentional source dispositions:

| Source category | Accepted cell count |
|---|---:|
| Newly sourced 2026/27 skater/goalie per-game fields | **460** |
| Four official team-game periods `Master Schedule!K:N/P:S` | **32** |
| Existing game-359 Dev Leong goalie source corrections | **4** |
| Original single-space `Player Game Logs!Y4674` disposition to **empty**, not SHG zero | **1** |
| **Total** | **497** |

**All 497/497 accepted.** The **41 fields withheld as unknown in the 43 new player-game rows remain blank**, including unavailable PIM/POTG/GTG fields. The audit independently compared unchanged prior manual-source digests across **694,249 legacy skater inputs, 39,239 goalie inputs, and 6,836 Master Schedule inputs**. It found zero source-value conflicts or unexpected populated cells in the table extensions.

The original structured tables `SkaterStatsByGame` and `GoalieStatsByGame` remain untouched in the original Excel file. In the private composite they are the previously QA-reviewed dimensions `A2:FB4708` and `FD2:JO366`. The 2026/27 fifth scheduled game is not counted as completed.

## Exact HTO score + season pivot acceptance

| Official HTO game ID | Workbook game / row | Verified Brave H.C. result |
|---|---|---|
| 3356177 | 359 / 370 | L 0–3 |
| 3356178 | 360 / 371 | L 3–6 |
| 3369564 | 361 / 372 | L 2–3 |
| 3375601 | 362 / 373 | L 1–7 |

Both official team-goal period sums and Excel cached GF/GA, W/L/T, goal-difference and contested-game flags agree. **Team record: 0–4, 6 GF, 19 GA**. The Winter 2026/27 Regular Season counted-game formula returns **4**. The upcoming October 25 HTO game `3375682` / Excel row 374 remains **unplayed**, with empty periods and counted-game flag 0.

The independently re-run official HTO 4-game season-pivot checker returned `DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED` on the **same** fully recalculated composite:

- **20/20 HTO skater identities** reconcile on individual basic GP/G/A/Pts/POTG: collectively **54 GP, 6 G, 10 A, 16 Pts and nine skater POTG**.
- **Three goalie identities** reconcile on source-backed GP, recorded losses and goals against, including the separately sourced Dev Leong game-359 correction in the private copy.
- The HTO source is still incomplete for **42 of 54 skater PIM observations** and **one of four goalie POTG observations**. Other manual statistics and two player identity/eligibility review flags remain unresolved.

## Full calculation / integrity limits

The independent full-calculation audit found:

- **545,506/545,506 original formula definitions preserved** across all 17 worksheets;
- **zero new Excel calculation errors**;
- only the two original **`Skater Profile!I13/J13 #REF!`** error cells remain, unchanged from the original Master Workbook;
- manual Excel calculation mode retained; no external connections refreshed.

This proves **full calculation integrity and basic verified source parity of the complete composite**, **not every award/projection/streak formula's business meaning**.

In particular, the following remain HELD:

1. Current 2026/27 PIM, goalie POTG, partial GTG, SHG/special-teams, career and rate statistics that lack complete source coverage. Unknown must not silently become a reported zero.
2. `AwardScoring` eligibility, Rookie/DI/CU rules, Most Improved/Dedication weighting, Player Projections forward model, Web Streaks droughts and complete Record Watch validation. Their formula caches calculate, but **business/source correctness is unproven**.
3. Legacy profile's `Active Records` / `Total Records` cells **I13/J13** lost their formulas; legacy record-holder 28 entries and official HTO player mentions 25 have different scopes and must not be interchanged.
4. Pavaday's missing legacy roster/projection entry and original Hunt SCR duplicate; unresolved call-up, DI and player identity eligibility cannot be inferred.
5. **Original-source promotion** requires a separately approved workbook-owner change set, protected original/rollback receipts, negative/recovery controls and independent postwrite parity checks. **No original edits are authorized by this QA pass.**
6. Future fifth game `3375682` must not be automatically admitted before a verified final HTO boxscore after October 25.

## Reproducible acceptance gate and handoff

The no-network, no-Excel-write `scripts/audit_plan03_integrated_497_fullcalc.py` requires seven explicit local inputs: immutable original XLSX; fully calculated composite XLSX; joined private player-game HTO source; official private team-period evidence; verified four-game HTO feed; private Excel full-calc application receipt; private independent full-calc ZIP/XML audit. It validates source hashes, all 497 cell values, source unknowns, structure/legacy preservation, exact team score and game-count states, 17-sheet formulas/errors, and source-aligned skater/goalie season pivots.

The regression suite in `tests/test_plan03_integrated_497_fullcalc.py` intentionally blocks any changed goalie result, future-game admission, numeric-zero invention, incorrect source cell, historical manual-value drift, altered formula, extra Excel error, substituted receipt hash or attempted public-awards claim.

**Implementation handoff:** Plan 03 now has one fully calculated and independently source-verified private 497-cell candidate. Its technical integrity gate is satisfied. The original workbook has **not** been updated; the next blocker is **owner-defined source handling and publication/eligibility approval**, not another independent fragment reconciliation. Documented source holds must remain visibly attached to all further implementation steps.

Related [Plan 03 — Integrated Execution #30](https://github.com/adambrutto-maker/brave-hc/issues/30) and prior two-fragment guard [PR #55](https://github.com/adambrutto-maker/brave-hc/pull/55).
