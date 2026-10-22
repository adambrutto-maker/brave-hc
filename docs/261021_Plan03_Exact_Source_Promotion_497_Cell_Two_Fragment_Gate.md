# HockeyOS Plan 03 — Exact source-of-truth promotion preflight (two fragments)

**2026-10-21, BRUTTECH 1.** **Lead: Data & AI.** Engineering, QA and workbook-owner review required. **Current disposition: `TWO_FRAGMENTS_SOURCE_PARITY_PASS_SINGLE_COMPOSITE_NOT_VALIDATED`.** The original 21 MB Master Workbook remains immutable. This work runs a source-backed, read-only audit; **no changes are authorized to the original, native HTO or the public website**.

## Critical integration finding

Earlier controlled Excel tests validated **two separate branches of the proposed 2026/27 corrections**. Both were useful, but they have **never been demonstrated together in a single validated workbook**. Do not add independent checkmarks together and label the original workbook ready to overwrite.

| Private source artifact | Exact baseline | Tested changes | What is **not** included |
|---|---|---|---|
| **Period-only Excel test** | `Plan03/Excel_Disposable_QA_261021_03/01_Excel_QA_Period_Input_COPY.xlsx`, SHA256 `6c125066eff2c4c6f211df8cec4c827676881495d76464c3cb0512abe474a034` | Official numeric period-scoring cells in Master Schedule rows 370–373 | The 43 missing player-game rows, four Dev Leong source changes or whitespace cleanup |
| **Player-only (fully calculated) Excel test** | `Plan03/Excel_Disposable_Full_Recalc_261021_01/01_Full_Calculation_Review_COPY.xlsx`, SHA256 `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b` | 43 reviewed player-game rows, four goalie corrections, Y4674 whitespace-only cleanup, 17-sheet calculation and basic HTO season pivot parity | **All 32 period-scoring inputs remain blank** in Master Schedule rows 370–373 |
| **Original immutable workbook** | `Reference Implementations/Brave H.C/01 Team Records/261001_Brave_HC_Master_Workbook.xlsx`, SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154` | No original correction made | All source corrections require independent release acceptance |

**The player-only full-calculated copy is not a score-integrated source-of-truth candidate**, even though its skater/goalie GP/G/A/Pts source values and formula-error checks pass in the private QA. The Master Schedule still has the original unrecorded 0–0/T placeholders for those four completed games, and associated workbook season/game-count logic is not fully integrated.

## Exact source-backed change contract

The combined change set, derived from two private source-hashed HTO review manifests, contains **497 intentional manual-value dispositions**:

| Source domain | Exact proposed change set | Qualification |
|---|---:|---|
| HTO verified skater and goalie game-log observations for games 360–362 | **460 supported cells** across 40 skater + three goalie rows | 41 source-unknown fields remain **blank** |
| Official four-game team period scores | **32 numeric period-input cells**, `K:N` and `P:S` for Master Schedule rows 370–373 | Includes intentional **numeric zero** periods; HTO totals 6 GF/19 GA |
| Previously incorrect goalie game-359 source record | **Four** values: `GJ363 1→0` W, `GK363 0→1` L, `GQ363 0→3` GA, `HA363 0→1` POTG | Zero wins is **loss-derived**, while L/GA/POTG were explicitly HTO observed |
| Stray legacy SHG input Y4674 | **One** whitespace-only shared-string `" "` → genuinely **blank** | **Not numeric zero**, and not an official SHG value |
| **Total** | **497 reviewed source changes** | Must be observed together in one private composite workbook before any source promotion |

No missing opponent names were written in these branches. October 25 HTO `3375682` remains **not completed/admitted** and is not part of this four-game contract.

The audit also checks source-table identity and verifies manual source preservation. On BRUTTECH 1 the real read-only audit compared **694,249 existing skater-table manual values**, **39,239 existing goalie-table manual values**, and **6,836 existing Master Schedule manual values** without an unexpected source-value change. Legacy formulas, pivot-generated caches, awards and projection model outputs require **separate** correctness checks; this is a manual-source change gate.

## Reproducible source checker

`scripts/audit_plan03_exact_promotion_preflight.py` (read-only) requires:

- `--original` original immutable workbook
- `--period-only-copy` independently validated Master Schedule period-only Excel copy
- `--private-calculated` independently validated player/goalie/Y4674 fully calculated Excel copy
- `--private-joined-hto` complete privately verified 43-row GTG-joined game-log plan
- `--private-period-evidence` official per-game five-period HTO scoreboard evidence

It verifies all exact source fingerprints; HTO 4-game IDs and score/period parity; 15/13/12 skater and one-per-game goalie roster additions; 460 typed HTO input values; all 41 withheld source fields; exact 32 numeric period values; original and corrected goalie cells; Y4674 typed shared-string handling; structured-table ranges; and unchanged historical manual-cell digests. It **deliberately returns**:

`TWO_FRAGMENTS_SOURCE_PARITY_PASS_SINGLE_COMPOSITE_NOT_VALIDATED`

with `combined497CellCandidateVerified=false`, `sourceOfTruthWriteAuthorized=false`, and `allStatsAwardsAndLiveWatchReleasable=false`.

No user private XLSX, player-level game records, source IDs beyond known HTO game IDs, or source-row evidence are pushed to the public repository. Synthetic fail-closed tests in `tests/test_plan03_exact_promotion_preflight.py` protect against conflating separate fragments, unexpected source edits, false numeric zeros, goalie source drift, altered table boundaries, missing scores, unknown-source fields being populated, or accidental fifth-game admission. The guarded public record-source CI runs these tests without accessing private files.

## Next exact acceptance gate (new composite disposable copy only)

1. Preserve both existing private QA branches and their SHA receipts. Do **not** overwrite either. Create a **third, independently named disposable composite candidate** from a reviewed source branch and an isolated byte-identical rollback.
2. Add the **missing complementary 32 numeric period input values** to the verified player-only candidate, or use another explicitly source-equivalent merge process, without changing the existing reviewed 460 player cells, four goalie input corrections or Y4674 blank disposition.
3. Confirm **all 497 source changes together**, no unexpected manual edits, original formula definitions maintained, 41 unknown fields still blank, and row 374 untouched. Independently check all source hashes and record the candidate hash.
4. Execute controlled `Master Schedule.Calculate()`, refresh only the known two internal season pivots, and run a **separately budgeted** full 17-sheet recalculation. Verify 0–4/6GF/19GA, correct season/game count, all 20 HTO skaters (54 GP/6G/10A/16Pts/9 skater POTG), all three goalies' supported GP/L/GA, and no newly introduced formula errors beyond the two original Skater Profile `#REF!` cells.
5. Validate original-versus-composite **all manual-source changes**, historical source preservation, eligibility/identity and relevant Awards/Projection/Web Streaks rule results. Unknown PIM/POTG/GTG/manual fields remain unknown and current rankings, career rates and live Watch remain **held** unless separately source-certified.
6. Obtain explicit workbook-owner approval for precise cells and original-source update, protected backup, rollback procedure and independent QA. **No original Excel, HTO CMS or public Watch editing before that approval.** The existing 28 legacy holder vs 25 HTO published-mention scope and the original two profile `#REF!` definitions are separate unresolved decisions.

**Owner decision and scope separation:** This runbook documents readiness for a *private composite test*, not permission for production promotion. Historical HTO Records (558/119), Awards & Honors (146/20) and 32 privately archived original articles remain independently preserved and unmodified. Additional Plan 03 progress remains tracked in [issue #30](https://github.com/adambrutto-maker/brave-hc/issues/30).
