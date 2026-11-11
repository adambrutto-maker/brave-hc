# HockeyOS Awards — 44-row source workbook expansion: verified planning boundary

**Date:** 2026-10-20  
**Lead department:** Engineering / HockeyOS  
**PR:** https://github.com/adambrutto-maker/brave-hc/pull/11  
**Status:** SAVED SOURCE-PLAN PARITY PASS; EXCEL FORMULA EXPANSION, RECALCULATION AND PUBLICATION HOLD

## Purpose

Review the *previously saved*, read-only original Master Workbook audit manifests for completeness and internal consistency **without inspecting or modifying the original Excel file, generating any workbook patch or changing the live publisher**.

Two pure, no-writer reviewers are now supplied in PR #11:

- `tests/lib/hockeyos_saved_table_expansion_preflight.js`: compare saved field-level import plan, original table-capacity audit and proposed row expansion layout.
- `tests/lib/hockeyos_saved_game_mapping_crosscheck.js`: compare **all 44** planned additions and corresponding missing inputs to the saved authoritative four-game `HTO → AllTimeSchedule` schedule join.

### Previously saved private inputs (BRUTTECH 1)

Under `D:\BruTTech\Products\HockeyOS\261019_Award_GameLog_Staging_v1`:

| Read-only source audit | Saved SHA-256 |
|---|---|
| `Disposable_Master_Test_20261019/261019_HockeyOS_Source_Formula_Table_Expansion_Plan_v1.json` | `3992faeb1c4be7108533f5dfdbdf49557c6e4c82bf79f14ca0160475666079cb` |
| `Disposable_Master_Test_20261019/261019_HockeyOS_Master_Copy_Table_Capacity_QA_v1.json` | `081bb6f8968c23d8febbb701d06aeb85d1205f1b22b8a623f8` |
| `Disposable_Master_Test_20261019/261019_HockeyOS_Master_Copy_Field_Level_Import_Plan_v1.json` | `4c617fefe4c39f8c776ee975a22b819419432d500c74426555e461f3259dd2b5` |
| `261019_HockeyOS_HTO_to_AllTimeSchedule_GameNumber_Join_v1.json` | Separately hashed in private source-mapping receipt |

The canonical original source workbook SHA-256 remains:
`0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.

**Important:** This is an inventory of existing audits; no new original workbook/formula inspection was attempted. A previously blocked source operation was **not retried or bypassed**.

## Observed plan reconciliation

Four official HTO boxscore games correctly map to original
`AllTimeSchedule` Games #359–362:

| HTO Game ID | Original Game # | Date |
|---:|---:|---|
| 3356177 | 359 | 2026-09-20 |
| 3356178 | 360 | 2026-09-27 |
| 3369564 | 361 | 2026-10-04 |
| 3375601 | 362 | 2026-10-18 |

**58** staged player-game source observations:
- **13** existing workbook records match cached source inputs, preserve.
- **One** Game #359 existing Dev Leong goalie record requires independently reviewed correction of **two input fields**: GA 0→3 at `GQ363`, POTG 0→1 at `HA363`. Two changed *fields*, not two corrected *players*.
- **44** missing source records must be considered for separate formula-safe insertion: **41 skaters + 3 goalies**.
- `Unknown, Johnny` remains an **unverified cached-only** workbook identity. Never silently delete/reassign.
- Last existing named skater row **4668**, candidate **4669–4709**.
- Last existing named goalie row **363**, candidate **364–366**.
- **Known physical collision:** `Y4674` is occupied (nonformula cached/whitespace content). Requires human disposition. Zero formula collisions observed in the **saved plan** does **not** verify original formula propagation.
- Entire `SkaterStatsByGame` and `GoalieStatsByGame` tables are filled. Existing final-row formulas mean naive pasting, copying or table append is forbidden until independently accepted.

### Additional four-game schedule findings

- **Three saved opponent labels differ from corresponding official current HTO observations.** The original source join relies on verified season and unique schedule date, not unchecked opponent-text equivalence.
- All four saved original schedule results are explicitly marked **stale, unscored placeholders**. Their cached GF/GA/result cannot replace the official HTO game score or be presented as a verified result.
- Each of the 44 candidate player-game records matches its source HTO ID and workbook Game # through the saved join; no key mismatch was observed in the private read-only check.
- A saved opponent or result discrepancy is **not** independent authority to edit historical schedule metadata; that needs separate source/QA review.

## QA results and receipts

At creation:
- Ten no-write table expansion plan tests PASSED.
- Four supplemental schedule join tests PASSED, including source ID substitutions, duplicate game numbers, untrusted HTO URLs, invalid dates and stale cached result controls.
- Full PR #11 pipeline also includes earlier raw HTO data, freshness and source manifest contract tests. Verify latest exact head in CI.

**Private actual-source receipts**, both under `261019_Award_GameLog_Staging_v1`:

- `261020_HockeyOS_Saved_44Row_Table_Expansion_Preflight_REVIEW_ONLY.json`, SHA-256 `5adf4c0101abeca60879b1bd8d96a134d8b1112f0c1d8e3c5e9056a60471532f`.
- `261020_HockeyOS_Saved_FourGame_SourceMapping_44Rows_PREVIEW_ONLY.json`, SHA-256 `e6d68e563b391fa5b6b40558ab58929d934cd8bfbe55e09646527d309889cb17`.

The validators return `writeAuthorized:false`, `originalWorkbookOpened:false`,
`currentAwardScoresVerified:false` and `publicationAuthorized:false`.

## Independent acceptance still needed

1. Confirm independent reviewer identity/authority and release scope; review saved audit hashes against original approved source baseline.
2. Explicitly disposition `Y4674` and assess all original structured-table formulas before considering candidate row insertion. Use **only an explicitly permitted separate operational copy** with full rollback.
3. Validate propagation of the original **158 skater columns / 116 goalie columns**, preserving cached historical rows and formula structure. No blind copy, no dropping `Unknown, Johnny`.
4. Reconcile Dev Leong Game #359 GA/POTG source corrections separately; missing October 18 per-game goalie POTG stays **unknown**, not zero.
5. Perform compatible Excel runtime recalculation and independently inspect `PlayerInfo`, `RosterStatusBySeason`, `AwardScoring` and `Web Races` for all 11 awards. Validate original eligibility/rank/normalization, not simplified HTO formulas.
6. Verify a fresh official HTO readback and full per-game input parity, then independent Security/QA acceptance and a separate Founder publication decision.
7. Publishing is a separate step from Excel update, and the existing divergent Git checkout remains under PR #13. No force push, reset or automatic deployment.

**Excel runtime presence:** `EXCEL.EXE` 16.0.19127.20860 was located on BRUTTECH 1 by file metadata; **no Excel session or workbook was opened**. Presence is not compatible unattended recalculation proof.

**Disposition:** `PLAN_PARITY_PASS / LIVE_EXCEL_AND_11_AWARD_REPLAY_HOLD`. This brings the workbook integration closer to an independently executable specification, not to approved public OVR values.
