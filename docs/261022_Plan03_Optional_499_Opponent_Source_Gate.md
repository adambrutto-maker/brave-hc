# HockeyOS Plan 03 — Optional 499-cell opponent metadata acceptance gate

**2026-10-22. Lead: Data & AI.** **State: `PRIVATE_499_OPPONENT_METADATA_SAVED_REVIEW_ONLY` (real private source check PASS). Full 499-cell recalculation and original adoption remain HELD.** The authoritative original workbook, HTO CMS, records and public website remain unchanged.

## Latest actually verified baseline

The original Master Workbook has SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`. [PR #56](https://github.com/adambrutto-maker/brave-hc/pull/56) and [PR #57](https://github.com/adambrutto-maker/brave-hc/pull/57) have already independently verified **497/497 source corrections together in one private integrated workbook** and then a separately calculated 17-sheet copy, with all 545,506 Excel formulas intact, no new formula errors and 20 skaters / three goalies matching supported HTO source observations.

The full-calculated, **accepted private 497-cell** source copy is:

`D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_FullRecalc_261021_01\01_Full_Calculation_Review_COPY.xlsx`

SHA256 `de9bc6ed615a7c330809a0b2f8888f42c357d641f2a2266e0fca20914521f979`.

The source-backed [PR #58](https://github.com/adambrutto-maker/brave-hc/pull/58) identified two additional name fields **not included in the existing 497-cell acceptance**:

| Original Master Schedule cell | Official date | HTO boxscore | Exact source-verified new name |
|---|---|---:|---|
| `H372` | 2026-10-04 | 3369564 | **Michelob Morts** |
| `H373` | 2026-10-18 | 3375601 | **Zamboner Crew** |

These two names, if later incorporated into the original workbook **after separate approval**, would increase the exact manual change count to **499**. PR #58's existing source review `TWO_OPPONENT_NAMES_VERIFIED_PRIVATE_REVIEW_ONLY` is evidence for those two **textual** values only.

Existing `H370 = Dateline Predators` is correct and must be preserved. The original `H371 = Mohawks HC` differs in punctuation from official `Mohawks H.C.` and must **not** be silently normalized. Adjacent game metadata (time F, home/away G, rink I) for rows 372/373 are unknown; the future 2026-10-25 Big Bastones game 3375682 (row 374) remains unplayed and uncounted.

## What has been implemented

New, pure read-only `scripts/audit_plan03_optional_499_opponents.py` enforces:

1. Exact immutable original workbook and accepted **full-calculated 497-cell** source hashes.
2. The previously validated official four-game HTO period source, via `scripts/audit_plan03_missing_schedule_opponents.py`, including exact dates/opponents, existing alias and two blank name cells.
3. A **third, separately saved private Excel candidate** with `H372/H373` as exactly the two official **text strings**, not numeric values or inferred aliases.
4. No changed Excel package members, worksheet identities or **any of the 545,506 formula definitions**, and no unrelated manual values in the **Master Schedule**, excluding only the two named HTO opponent cells.
5. Full previously accepted **497-cell source preservation**: 460 known player-game inputs, 32 official four-game numeric period inputs, four goalie corrections and an intentionally **blank**, not zero, Y4674 SHG source cell. All 41 unknown staged HTO fields must remain blank.
6. No change to the original supported four-game score caches or future game 374 admission.
7. Explicit `ownerOriginalWorkbookApproval=false`, `499FullWorkbookRecalculationCertified=false` and `publicWatchOrAwardReleaseAuthorized=false`.

Successful execution against a future private candidate may return **`PRIVATE_499_OPPONENT_METADATA_SAVED_REVIEW_ONLY`**. This checks the two additional HTO source names and source-preservation rules. It does **not** mean that Excel has completed full 17-sheet recalculation or that metadata-dependent article, award, projection or Record Watch content is publishable.

The reviewer uses ZIP/XML readback and never launches Excel, changes a cell, fetches external HTO websites, or uploads any private workbook. Synthetic tests in `tests/test_plan03_optional_499_opponents.py` check strict name/alias/unknown/future-game/formula/source approval gates and run under the repository's guarded CI workflow without access to private Excel data.

## Actual private 499-cell saved-file validation, October 22

The protected optional candidate **already exists** on BRUTTECH 1 and was verified **read-only**; no repeat of the one-time staging script is required.

- Accepted full-calculated 497-cell input: `D:\\BruTTech\\Products\\HockeyOS\\Plan03\\Excel_Disposable_Composite_FullRecalc_261021_01\\01_Full_Calculation_Review_COPY.xlsx`, SHA256 `de9bc6ed615a7c330809a0b2f8888f42c357d641f2a2266e0fca20914521f979`.
- Distinct private **optional 499-cell** candidate: `D:\\BruTTech\\Products\\HockeyOS\\Plan03\\Excel_Disposable_Optional499_261022_01\\01_Optional499_OpponentNames_COPY.xlsx`, SHA256 `d1512ed152284bbb578a067b1360324dbf56caf2d32afe4606b91e06e1c2c854`.
- Independent read-only source audit returned **`PRIVATE_499_OPPONENT_METADATA_SAVED_REVIEW_ONLY`** with exact H372=`Michelob Morts` and H373=`Zamboner Crew`, all **497 previously verified cell dispositions retained**, **41 unknown source values still blank**, other Master Schedule manual data unchanged, all **545,506 formula definitions preserved**, no change to `Mohawks HC` alias, no invented rink/home-away metadata, and the October 25 game still unplayed.
- **No original workbook edit, native HTO edit, public Watch or award change**. The source-hash acceptance is not a 499-cell full Excel recalculation or live-stat release.

### One false-positive source checker repaired

The first invocation of the original PR #59 source checker failed at `HISTORICAL_PLAYER_MANUAL_SOURCE_DRIFT`, **not** because historical skater/goalie source data changed, but because it compared a generic `Master Schedule` manual-cell digest that necessarily changes when the **two intended H372/H373 names** are entered.

The corrected checker explicitly verifies **skater and goalie historical manual-cell digests unchanged**, while its separate stable Master Schedule digest **excludes only H372/H373** and rejects any other schedule-source edits. Both branches of the original overbroad check (main audit path and `compare_499`) were corrected. Extra fail-closed regressions protect this distinction and still reject a changed historical player/goalie value, formula, unofficial name, alias normalization or fifth-game admission. **21/21 targeted offline tests PASS**; real 499 source check PASS. The original private evidence was not rewritten or lost.

### Next acceptance — still required

1. Preserve the accepted 497-cell source and the separately saved 499-cell candidate, with independently checked hashes and a byte-identical rollback.
2. In another **new disposable copy only**, run a separately controlled, bounded 17-sheet Excel `CalculateFull`. Confirm formulas, no newly introduced errors, official four-game team score parity and 20-skater/three-goalie supported HTO season-pivot parity.
3. Revalidate historical player sources, 41 missing source cells, original Skater Profile `I13/J13` errors and roster/awards/forecast/streak release holds. Opponent text acceptance alone does not solve them.
4. Obtain specific original-workbook owner approval and protected rollback before **any** original source-file edit or public publication. Leave future October 25 HTO 3375682 unadmitted.

## Other explicit holds

- 42 official current-season skater PIM observations remain unknown; one goalie POTG is unknown; GTG is source-explicit in two of four games.
- Original `Skater Profile I13/J13` remain formula-less `#REF!`; legacy 28 held-record entries and current HTO 25 published name mentions are different measurement scopes.
- Pavaday and Carlyle legacy roster eligibility and Hunt's double `SCR` projection entry need separate owner determinations.
- All historical HTO Records (558 entries), Awards (146 entries) and 32 privately preserved original bulletins remain unmodified.

**No original/website writes, no owner approval inferred.** Track this bounded optional metadata gate under [Plan 03 #30](https://github.com/adambrutto-maker/brave-hc/issues/30).
