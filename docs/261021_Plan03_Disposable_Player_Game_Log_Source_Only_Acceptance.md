# HockeyOS Plan 03 — Source-only 43-row disposable Player Game Logs admission

**Date:** October 21, 2026. **Lead:** Data & AI; QA and workbook-owner acceptance required. **Disposition:** `SOURCE_ONLY_STAGING_SAVED_VERIFIED_NOT_RELEASED`.

## Scope and protections

This work builds on the accepted **table-expansion-only** test of the 21 MB legacy Brave H.C. Master Workbook. It deliberately uses a **new disposable copy** of the already reviewed table-expanded workbook. The original Excel file and previous disposable Excel evidence remain unchanged.

- Immutable original source: `D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx`, SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.
- Previously validated **table-expanded** source: `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Table_Resize_261021_01\01_Table_Resize_Test_COPY.xlsx`, SHA256 `36ce65c7483cddd8d15cb8d7179e2b01b4065330e8212674a5f969fd938699c9`.
- New source-only Excel test folder: `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Source_Input_261021_01\`.
  - Untouched private rollback input: `00_Expanded_Table_Verbatim_DoNotEdit.xlsx`.
  - Excel-modified private test candidate: `01_Source_Only_Input_COPY.xlsx`, SHA256 `5c46e7fce2b5a29e5f92799892d168da5d0fbf298895b6f6af599beb11ec9f01`.
  - **Independent read-only acceptance:** `03_Source_Input_Independent_Review.json`, whose result is `SOURCE_ONLY_STAGING_SAVED_VERIFIED_NOT_RELEASED`.
- Private row-level source authority: `D:\BruTTech\Products\HockeyOS\Plan03\source-archive\261021_Game_Log_Staging_GTG_Joined_PRIVATE.json`, SHA256 `c83ad5ba1c5fef08ba3af7f5e91e9b39083b9a39f82776455992e89b61378f9b`. This joins the previous explicitly verified HTO GTG source to the 43 missing game-log observation proposals. **The private source plan and both Excel copies are not uploaded to GitHub.**

## Excel operation performed

The input Excel copy already contained the validated table dimensions:
- Skater `SkaterStatsByGame` = `A2:FB4708`, covering **158 columns** and 40 new source rows `4669–4708`.
- Goalie `GoalieStatsByGame` = `FD2:JO366`, covering **116 columns** and three new source rows `364–366`.
- The original, previously misinterpreted `Y4674` marker is a **single blank space** in a shared-string cell, not numeric 360/SHG, and was preserved.

The isolated Excel script used the exact, privately hashed review plan to insert **only** explicitly sourced HTO fields into the 43 new entries. It deliberately left manual/unknown fields blank and did not recalculate all sheets, refresh pivots, edit game-359 Dev Leong, alter native HTO, publish websites, or touch the source workbook.

The test script's first invocation stopped in precheck due to a local PowerShell helper named `H`, which conflicted with another command. This occurred **before creating/opening a workbook**. The helper was renamed; a syntax/source integrity check passed, and the controlled retry then created and saved the private candidate.

The retry's visible Excel output confirmed `HTO_SOURCE_ONLY_STAGING_COMPLETE ROWS=43 INPUT_CELLS=460 WITHHELD=41` and `DISPOSABLE_SOURCE_INPUT_COPY_SAVED`. Excel's COM shutdown subsequently remained hung and the expected script-authored `02_Source_Input_QA_Receipt.json` was **not** produced. We therefore independently audited the on-disk saved workbook rather than claiming the unfinished script completed cleanly.

Once its identity/start time and sole-instance ownership were verified, the isolated Excel automation process (PID 20788, launched at 2:17 p.m. Eastern) was stopped **only after** the candidate's save, SHA and independent audit had succeeded. Zero other Excel instances remained, and the original workbook SHA was unchanged. This shutdown condition is a separate automation reliability issue for any later Excel run; do not reuse the script without a bounded, safe COM-cleanup design.

## Independent saved-file acceptance

A separately executed ZIP/XML comparison checked the exact approved source-plan fields and two private test workbooks, decoding shared-string cell values before comparison. Its report `03_Source_Input_Independent_Review.json` returned:

| Check | Verified |
|---|---:|
| HTO-supported proposed cells | **460** |
| Exact saved HTO cell matches | **460/460** |
| Source unknowns explicitly withheld | **41** |
| Withheld fields accidentally filled | **0** |
| Unexplained new manual data values | **0** |
| Skater formulas in extended rows | **5,200** |
| Goalie formulas in extended rows | **276** |
| Decoded `Y4674` marker | Single space preserved |

Historical manual source values and existing formula definitions in both original skater and goalie table ranges matched the expanded baseline digest. Existing table ranges and workbook component count were preserved between the expanded and source-populated copies. The audit found **no unexpected new manual values** in the extension region.

**Interpretation:** The 43 missing game-log source observations can be staged non-destructively into a disposable, structurally expanded Excel workbook. This is a genuine source-only input gate, not approval of all 17 worksheets' recalculated output.

## Additional downstream read-only inspection — October 21, 2026

A separate, no-write ZIP/XML comparison inspected the SAVED source-only candidate against its immediate expanded-table baseline after the 460 source inputs had been entered. Although the import script **did not explicitly request** `CalculateFull` or PivotTable refresh, opening/writing/saving the legacy Excel workbook had side effects on dependent saved caches/metadata. **Do not equate the successful source-only import with an unchanged cached model.**

| Worksheet / structure | Observed persisted difference against expanded input copy | Acceptance |
|---|---:|---|
| Awards & Records | **1,873 formula-cache values changed** | HOLD — Awards eligibility and rankings not independently recalculated/verified |
| Player Projections | **317 formula-cache values changed** | HOLD — model source field and baseline validation pending |
| Web Streaks | **136 formula-cache values changed** | HOLD — current streak source/baseline not certified |
| Player Stats | **15,339 formula-cache values changed**, plus **61 added/removed cached cells** | HOLD — pivot/season/career result parity not independently established |
| Pivot-related XML | **8 of 15 components changed** | HOLD — exact cache identities, values and refresh effects need independent review |

The audit compared formula definitions and cached values by sheet cell reference, **without reopening Excel, writing private workbook bytes, or refreshing any pivot**. This source-diff result is evidence of downstream cache mutation, not proof of valid 2026/27 awards, PIM, POTG, GTG, career totals, rate statistics, or 17-sheet model parity. The 41 withheld HTO fields and separate original game-359 goalie conflict continue to block full certification. No native HTO records or public Watch output changed.

**Release rule:** the accepted `SOURCE_ONLY_STAGING_SAVED_VERIFIED_NOT_RELEASED` state must **not** be promoted to `FULL_WORKBOOK_RELEASED` or `CURRENT_PLAYER_STATS` until a separately reviewed, disposable full-workbook/pivot calculation validates every dependent worksheet, reports unknown-field handling, confirms existing player/goalie evidence and receives explicit workbook-owner authorization.

## What remains held

1. **Dev Leong game 359:** original workbook `W1/L0/GA0/POTG0` conflicts with official HTO `losses1/GA3/POTG1`; this test did not change that pre-existing record.
2. **Statistical source completeness:** 41 withheld cells within the 43 new rows remain unknown (including unsupported PIM, goalie POTG and absent GTG columns); numerous other legacy manual fields have no official values in the bounded feed. Do **not** convert missing values to zero or publish incomplete awards, standings, career rates or player statistics.
3. **Identity/jersey:** two previously identified name/number review flags, including a zero jersey and a placeholder identity, are unresolved. Do not assign player IDs by guesswork.
4. **Full workbook:** no fresh cross-sheet formula recalculation, full pivot refresh, Player Projections/Web Streaks certification, or AwardsScoring approval has occurred on the source-populated candidate.
5. **Owner release:** source-of-truth Excel changes require exact cell-level approval, fresh SHA, independent binary backup, rollback procedure, controlled calculation, player-level parity and explicit publishing approval. The current acceptance cannot be promoted automatically.
6. **Future game:** October 25 HTO fixture 3375682 is still pre-game only, not part of the four completed games or these 43 missing past observations.

## Next implementation gate

Use a **new copy of the saved source-only candidate**, preserving it immutably, for a controlled and bounded downstream formula/pivot review. Verify all 54 skater and four goalie game-level observations against the official source where values exist; explicitly report the 41 unknown staging fields plus all other unsupported legacy fields. Inspect and classify Player Stats, Awards & Records, Player Projections, Web Streaks and pivot outputs. Treat unsupported counts/rates and existing goalie conflict as **HOLD**, not as success. No original workbook, HTO or public-site changes are authorized by this runbook.

Related: [Integrated Plan 03 #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [full-schema import safeguards #44](https://github.com/adambrutto-maker/brave-hc/pull/44), [shared-string correction #46](https://github.com/adambrutto-maker/brave-hc/pull/46).
