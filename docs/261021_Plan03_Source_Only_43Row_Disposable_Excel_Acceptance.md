# HockeyOS Plan 03 — 43-row source-only disposable Excel import QA

**Date:** October 21, 2026. **Lead:** Data & AI. **State:** `DISPOSABLE_43ROW_SOURCE_FIELDS_VALIDATED_NOT_FOR_PUBLICATION`. This records a **private Excel-copy test**, not an original workbook edit or new public HockeyOS stats release.

## Basis and exact source

The original immutable 17-worksheet Master Workbook remained SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.

The input was the separately validated **table-expanded disposable copy**, SHA256 `36ce65c7483cddd8d15cb8d7179e2b01b4065330e8212674a5f969fd938699c9`, containing 158-column `SkaterStatsByGame A2:FB4708` and 116-column `GoalieStatsByGame FD2:JO366`. The base input, new candidate, and source-manifest receipt remain private on BRUTTECH 1. The exact Y4674 source cell is a **single space** decoded from the original Excel shared-string index 360; no existing numeric short-handed goal was overwritten.

The input plan was the hash-verified private GTG-enriched 43-row source review: `261021_Game_Log_Staging_GTG_Joined_PRIVATE.json`, SHA256 `c83ad5ba1c5fef08ba3af7f5e91e9b39083b9a39f82776455992e89b61378f9b`. It contains 40 missing 2026/27 skater-game rows and three missing goalie-game rows from previously verified official HTO boxscores and the partial explicit GTG source review.

## Actual private Excel execution

A new private working folder was created:

`D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Source_Input_261021_01\`

It contains:
- `00_Expanded_Table_Verbatim_DoNotEdit.xlsx` — unchanged byte-identical copy of the reviewed expanded-table Excel candidate, retained for rollback.
- `01_Source_Only_Input_COPY.xlsx` — the **source-only trial import** with 43 staged observations. Saved candidate SHA256 `5c46e7fce2b5a29e5f92799892d168da5d0fbf298895b6f6af599beb11ec9f01`.
- `02_Source_Input_QA_RECOVERED_Receipt.json` — private evidence recovery receipt; its unique SHA is recorded in the local evidence directory. It **does not** claim normal Excel COM shutdown.

The controlled import inserted **460 known HTO input cells** into the correct 40 + 3 new rows. The **41 withheld source fields** remained blank (**28 new skater PIM**, **12 unsupported October 18 skater GTG**, **one unknown goalie POTG**). No unknown was silently coerced to zero, and all 43 rows remained in a **review-only, not-publication-authorized** status.

Source column scope remains limited: skater game number, jersey, name, position, GP, G, A, Pts, +/- and supported PIM/POTG/GTG; goalie game number, jersey, name, GP, official loss, goals against and supported POTG. Legacy goalie wins/OT results, shots/saves, most special-teams/faceoff fields and other unsupported manual statistics were not invented. The existing Dev Leong game-359 conflicts remain unchanged. The October 25 future fifth game `3375682` was not admitted.

## Honest application lifecycle note

The first controlled import attempt stopped at preflight because a one-letter PowerShell helper conflicted with a built-in alias. **No workbook was opened** during that failed attempt. The helper was corrected and the rerun passed source SHA validation, opened a new disposable copy, wrote exactly 43 row observations / 460 cells, and emitted `DISPOSABLE_SOURCE_INPUT_COPY_SAVED`.

After that save, the isolated Excel COM cleanup process stalled. Excel eventually exited; two **verified script-specific QA PowerShell workers** were terminated after confirming no other Excel instance was active and the saved candidate had a valid ZIP CRC. Because the application did not produce its usual close receipt, a distinct **recovery receipt** was created. Its state is `SAVED_CANDIDATE_APP_CLEANUP_INTERRUPTED` and `sourceAppCleanShutdownVerified=false`. The public repository must never claim normal shutdown from this test.

## Independent saved-file acceptance

The new **read-only** verifier `scripts/audit_plan03_disposable_source_input_readback.py` compares both private XLSX ZIP/XML sources and the private HTO row plan, checks SHA256 source and candidate hashes, and independently validates:

- All **40 skater and three goalie rows** are in reviewed, unchanged table boundaries.
- Exactly **460 source-supplied numeric/text cell values** match the GTG-enriched HTO reviewer, with no substitutions or missing staged values.
- Exactly **41 unsupported source values remain blank**; explicit zero in a missing PIM or goalie POTG cell is a rejection condition.
- **All prior player-log manual data and Excel formula definitions are unchanged** across the original 158-column skater and 116-column goalie table regions, using decoded shared-string values rather than raw string indices.
- The whitespace-only `Y4674` marker is preserved, and no extra unrelated manual value is introduced in the new rows.
- The future unplayed game, native HTO admin, original Master Workbook, public Awards, Record Watch and production publisher are not changed.
- The resulting acceptance explicitly retains `fullWorkbookAndPivotRecalculationCertified=false`, `publicReleaseApproved=false`, `originalWorkbookModified=false`, and `applicationCleanShutdownVerified=false`.

**Actual private source run:** `DISPOSABLE_43ROW_SOURCE_FIELDS_VALIDATED_NOT_FOR_PUBLICATION`; **460 matching inputs, 41 blank withheld fields, source contents/formulas preserved**, candidate SHA256 as above. The independent checker passed **13/13 offline safety tests** on BRUTTECH 2 and BRUTTECH 1. The test-only recovery receipt is not a substitute for source validation; the checker independently enforces the field-level contract.

## Next acceptance requirements

This finishes the **source-only Player Game Logs insertion and original-data preservation gate in a disposable copy**. It does **not** mean that the full workbook, dependent pivot tables, 2026/27 career player totals, goalie ratios, awards scoring, projections or live Record Watch are now current.

Next:
1. Independently inspect the staged copy’s source and derived caches for errors, missing official fields and formula propagation; verify the three new goalie rows and season player totals against source.
2. Create a **separate disposable full-recalculation experiment**, with bounded resources, reliable process cleanup and independent pivot validations. Do not reuse an Excel process that stalled during COM cleanup.
3. Resolve the four existing game-359 Dev Leong source contradictions and unknown goalie win/shots/percentage data before authorizing goalie-based career statistics.
4. Preserve 42 null PIM values in the four-game HTO feed (including the existing 14 game-359 PIM-zero legacy entries as unverified); maintain unknown GTG source for games without a GTG table and unknown Oct 18 goalie POTG.
5. Obtain **separate owner approval and rollback QA** for any future update to the original workbook. No original XLSX, public widget or official HTO record edit is approved here.
6. Admit the fifth October 25 game only after independently verifying a completed official postgame boxscore and unique mapping.

Related [integrated Plan 03 tracker #30](https://github.com/adambrutto-maker/brave-hc/issues/30). This runbook contains no private player-log rows or full workbook files.
