# HockeyOS Plan 03 — First integrated 497-cell private workbook

**Source checkpoint:** October 22, 2026. **Lead department:** Data & AI; Engineering and QA independent review. **State:** `COMPOSITE_497_SOURCE_AND_MASTER_FORMULA_PARITY_PASS_PUBLICATION_HELD`.

## The integration gap is now closed at the source-input level

The original 21 MB Brave H.C. Master Workbook has **not been modified**. Earlier Plan 03 QA accepted the four-game Master Schedule correction and the player-game log/recalculation work in **different** disposable copies. Those two source branches were not interchangeable and could not justify an original-workbook release. The [two-fragment gate in PR #55](https://github.com/adambrutto-maker/brave-hc/pull/55) protects that distinction.

On BRUTTECH 1, a new **third disposable test workbook** was created from the previously validated player/goalie source candidate (SHA256 `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b`). Its original byte-identical copy remains protected.

Only **32 HTO-authoritative numeric period cells**, including explicitly verified numeric zeros, were added to `Master Schedule` games 359–362 (sheet rows 370–373). The previous 460 HTO player-game input cells, four reviewed Dev Leong goalie corrections, and the reviewed `Y4674` whitespace-to-blank disposition were not rewritten.

The private combined workbook:

`D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_261021_01\01_Integrated_497_Source_Review_COPY.xlsx`

SHA256: `9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08`.

**This is the first preserved workbook containing the full 497-cell source correction proposal.**

## Independent saved-file acceptance

A **separate, read-only ZIP/XML checker** directly verified the saved workbook against:
- Original immutable workbook, SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.
- The previously verified private 43-row HTO game-log/GTG joined source, SHA256 `c83ad5ba1c5fef08ba3af7f5e91e9b39083b9a39f82776455992e89b61378f9b`.
- Official per-game 2026/27 HTO period evidence, SHA256 `81790e38b0ff2a4563cb4fbf5d94911640e4bdd41a736d8e5c5fc419cee9066c`.
- The saved, separately validated player-only and combined private XLSX copies.

| Exact source change type | Verified |
|---|---:|
| Supported HTO player game-log source cells | **460/460** |
| Supported HTO numeric period cells `K:N, P:S` on rows 370–373 | **32/32** |
| Existing game-359 Dev Leong source corrections | **4/4** |
| Unrecorded SHG cell `Y4674`, single whitespace to genuinely blank | **1/1** |
| **Total combined manual-source changes** | **497/497** |
| HTO fields withheld because original source is unknown | **41/41 remain blank** |
| Existing historical manual-source values outside changes | **Preserved** |

The source-approved team results in the composite are HTO games 3356177 0–3, 3356178 3–6, 3369564 2–3, 3375601 1–7, for **zero wins, four losses, six GF, nineteen GA**. `Master Schedule` formula fields `O/T/W/U/X` recalculated consistently. The preview/unplayed Oct 25 game 3375682 on row 374 remains **blank and not counted**.

Read-only package comparison:
- **545,506 formula definitions preserved across all 17 worksheets** after the Master Schedule recalculation.
- **No new cached Excel error cells** in the combined workbook; the two original `Skater Profile!I13/J13 #REF!` errors remain separately documented.
- All native original and prior QA workbook sources remain unchanged.
- Exact retained manual-cell counts/digests match the original historic model for the existing skater, goalie and Master Schedule records.

The private, source-hashed independent acceptance receipt is:

`D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_261021_01\03_Independent_497_Cell_Composite_Audit.json`

SHA256 `9fcd2acefcdde1d4a18d54c1d16d8e53c4dab0f2c7aa097dd39107b76cbe4b8c`.

**These private XLSX and receipt files are not uploaded to GitHub.**

## Repeatable CI contract

`scripts/audit_plan03_integrated_497cell_source.py` provides a strict, **no-network/no-write** audit using original + player-only + combined XLSX files and the two private source evidence manifests. It checks all 497 cells, protected source values, exact table ranges, no default-zero unknowns, goalie provenance and no future fifth-game admission.

`tests/test_plan03_integrated_497cell_source.py` provides synthetic fail-closed tests wired into the public record-source CI workflow; no private workbooks are required to execute those tests.

## Separate remaining acceptance gates

The new composite source accepted the 497 changes, **but a full 17-sheet `CalculateFull` has not yet been independently certified against the combined candidate**. A new source-preserving disposable full-calc test is separate from the accepted 497-cell candidate; its completion, output checksum, formula preservation, cached error baseline, season-count and player/goalie HTO parity must be verified before claiming full integrated workbook QA.

Even a successful full recalculation will **not** authorize:
- Filling 41 unknown source fields with zero or certifying 42 missing skater PIM, one goalie POTG, partial GTG or other legacy manual statistics.
- Automatically changing awards, player projections, full career droughts/streaks or record-holder profiles.
- Resolving unapproved Pavaday player eligibility, duplicate Hunt SCR projection entries, or the original `Skater Profile I13/J13 #REF!` Active/Total Records meanings.
- Writing the canonical original workbook, modifying native HTO records, sending messages or publishing website widgets.
- Treating October 25 HTO 3375682 as completed.

**Next owner release path:** independently verify full combined `CalculateFull` source parity and original/rollback integrity; reconcile known schema and missing-stat source limitations; obtain exact workbook-owner source write authorization, protected backup/restore and separate publication approval. Until then the answer is **validated private source candidate — no production release**.

Related: [Plan 03 tracker #30](https://github.com/adambrutto-maker/brave-hc/issues/30); [first two-fragment gate PR #55](https://github.com/adambrutto-maker/brave-hc/pull/55).
