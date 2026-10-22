# HockeyOS Plan 03 — Fully calculated 497-cell composite acceptance

**Verified:** October 22, 2026, on BRUTTECH 1. **Lead:** Data & AI; Engineering and independent QA. **Disposition:** `COMBINED_497_SOURCE_CALCFULL_BASIC_HTO_PARITY_PASS_RELEASE_HELD`.

## Why this is a new checkpoint

PR #55 proved that the four-game **period-only** and 43-player-row **player-only** corrections were in separate successful Excel QA copies. PR #61 subsequently combined **all 497 source changes in one private disposable Excel workbook** and accepted it by independent ZIP/XML review. This checkpoint goes further: a **new isolated private copy of that integrated workbook** was subjected to an actual, full Microsoft Excel `CalculateFull()` across all 17 worksheets, and both the saved file and HTO season pivots were independently checked.

**Neither this work nor the original source-checker release has changed the authoritative 21 MB Master Workbook, native HTO administration, any historical article, any player profile or public Record Watch.**

## Protected chain of custody

| Evidence | Private artifact | SHA-256 |
|---|---|---|
| Authoritative original Excel | `Reference Implementations/Brave H.C/01 Team Records/261001_Brave_HC_Master_Workbook.xlsx` | `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154` |
| Prior player-only QA | `Plan03/Excel_Disposable_Full_Recalc_261021_01/01_Full_Calculation_Review_COPY.xlsx` | `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b` |
| Source-verified integrated **input** | `Plan03/Excel_Disposable_Composite_261021_01/01_Integrated_497_Source_Review_COPY.xlsx` | `9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08` |
| Newly full-calculated integrated **output** | `Plan03/Excel_Disposable_Composite_Full_Recalc_261022_01/01_Full_Calculation_Review_COPY.xlsx` | `231c1e91cdb833f23b4d49a10f3a3050c941205651ca7e9556c0badd029643e9` |

The newly isolated test also preserves a byte-identical rollback of the integrated input (`00_Input_Verbatim_DoNotEdit.xlsx`). The private Excel application receipt is `02_Excel_Calculation_Receipt.json`, and the separate ZIP/XML audit is `03_Independent_Full_Calculation_Audit.json`, both in the same private output directory. **These files and all raw player-level source evidence remain on BRUTTECH 1, not the public GitHub repository.**

## Real Excel execution

The previously tested source-preserving automation was adapted to point **only to the new composite input** and a new, non-overwriting review directory. It validated source and rollback hashes, source manual calculation mode, 17 worksheet count and isolation (no other Excel session), then called `Application.CalculateFull()`.

The full calculation **returned successfully**, saved and exited; measured calculation time was **531.61 seconds**. No external `RefreshAll` or other connection refresh was requested. The original Excel source was never opened for editing.

## Independently verified results

The saved-file ZIP/XML comparison reported `FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY` with **zero issues**:

- Exact **545,506 formula definitions preserved** across all 17 worksheets.
- **No new cached Excel errors.** The two existing `Skater Profile!I13/J13 #REF!` remain, intentionally not masked or reconstructed.
- New output matches the independent Excel application receipt's SHA-256; input and rollback hashes are unchanged.

The original-to-composite **497-cell source-integrity checker was rerun on the post-`CalculateFull` output**, not merely the pre-calculated copy. It still validates:

| Verified source domain | Count | Status |
|---|---:|---|
| Additional skater and goalie game-level official HTO inputs | **460** | PASS |
| Four completed games' numerical period-scoring inputs | **32** | PASS |
| Existing Dev Leong game-359 goalie corrections | **4** | PASS |
| Whitespace-only `Y4674` → genuinely blank unknown | **1** | PASS |
| Unsupported source fields kept blank | **41** | PASS |
| **Total source dispositions together** | **497** | PASS |

Completed official scores remain **0–3, 3–6, 2–3 and 1–7**, totaling **0–4, six goals for and nineteen against**. October 25 HTO game 3375682 still has no result and is not admitted.

The previously merged source-to-season-pivot checker was also run on the **new fully calculated composite output**, returning `DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED`: **20/20 skater identities** and **3/3 goalie identities** agree with source-supported per-player/game totals for the four verified official games. This does **not** make the official feed's **42 missing PIM observations** and **one missing goalie POTG observation** complete; absent GTG and other legacy manual statistics also remain explicitly unknown.

## Permanent, reproducible QA gate

`scripts/audit_plan03_integrated_postcalc_release_gate.py` is a **no-network, no-Excel/no-write** acceptance gate consuming original and private test XLSX files, both official source manifests, the bounded HTO collector feed, and *both independent Excel/calculation receipts*. It checks all fingerprints and only returns:

`COMBINED_497_SOURCE_CALCFULL_BASIC_HTO_PARITY_PASS_RELEASE_HELD`

when the composite source integrity, 17-sheet formula/error audit and bounded official HTO season pivots pass **together**. It never marks awards, record-watch, full career rates, forecasts or an original-source write authorized merely from those successes.

`tests/test_plan03_integrated_postcalc_release_gate.py` has **13 fail-closed offline tests** for unknown-field-to-zero coercion, altered source counts/hashes, missing goalies, new formula errors, altered original profile error baselines, bad Excel receipts, unauthorized `RefreshAll`, and the upcoming fifth game. The hosted source-refresh workflow executes these tests without private files.

## Remaining gates

1. **Owner authority to change the original**: no source-of-truth promotion has been approved; prepare an exact 497-change workbook-owner acceptance/backup/rollback procedure, confirm any extra opponent-label changes separately, and require independent validation after any approved application.
2. **Awards and forecast business semantics**: cached Excel scores and numerically calculated projections are not evidence that missing PIM/POTG/GTG, special-teams, keeper stats or eligibility rules are complete. Historical Awards & Honors (146 verified HTO entries) and current award-races ranking releases remain separate projects.
3. **Profile/registry and current Watch**: resolve two existing Skater Profile `#REF!` formulas whose meanings are unknown (legacy 28 counted holder entries vs 25 different-scope native HTO published mentions), absent Carlyle/Pavaday roster entries, original duplicate Hunt SCR projection entry and career baseline validity. Do not assume latest-game parity certifies streak/record milestones.
4. **Future-game admission**: Oct 25 HTO 3375682 is not a fifth completed game; only official postgame boxscore and fresh source/identity/career parity can trigger any collector expansion.
5. **Publication separation**: Current public `widgets/watch.json` remains historical-only. This private success must **not** overwrite original Excel, modify native HTO game records, or produce claims about unverified newly broken records without distinct owner approval.

Related [Plan 03 #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [two-fragment PR #55](https://github.com/adambrutto-maker/brave-hc/pull/55), [integrated-source PR #61](https://github.com/adambrutto-maker/brave-hc/pull/61).
