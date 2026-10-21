# HockeyOS Plan 03 — Full-schema Player Game Logs pre-admission

**Date:** October 21, 2026. **Lead:** Data & AI. **Status:** `REVIEW_ONLY_HELD_FOR_EXISTING_CELLS_AND_UNSUPPORTED_STATS`. No source workbook edit, new Excel test copy, public HTO record, scheduled publisher change, or new player-profile assignment.

## Scope and source authority

The existing authoritative Master Workbook has a `SkaterStatsByGame` structured table with **158 columns** (`A2:FB4668`) and a separate `GoalieStatsByGame` table with **116 columns** (`FD2:JO363`). This work inspects the original immutable workbook only, SHA-256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`. It uses the **four completed**, independently validated HTO game boxscores `3356177,3356178,3369564,3375601` and the previously audited source Player Game Logs (14 current skater observations / 1 goalie observation; 40 and 3 missing).

The new `scripts/audit_plan03_full_schema_game_log_staging.py` classifies HTO source fields against the exact column headers of the two Excel tables and stages **review-only proposals** for each missing player-game observation. It never edits or recalculates Excel, writes to GitHub as a publisher, changes HTO admin, guesses manual stats, or admits a fifth game. Its result can be captured privately by a governed operator; the review's player-level body is not committed to the public repository.

## Verified source capability matrix

| Workbook source field | Exact source column | HTO status |
|---|---|---|
| Skater game ID, player name, jersey number, position | `A/P/Q/R` | HTO game + exact recorded player observation (jersey/placeholder identity flags still require review) |
| Skater GP/G/A/Pts | `S/T/U/V` | Values explicitly present and internally checked (`G+A=Pts`) |
| Skater PIM | `AB` | **Source incomplete:** 42 of all 54 official game observations have `pim=null`; **28 of the 40 proposed new skater rows** lack it |
| Skater +/- | `AJ` | Recorded in the verified HTO feed; preserve signed integers |
| Skater POTG | `AP` | Recorded 0/1 in all 54 HTO skater observations |
| Goalie game ID, jersey, name | `FD/GG/GH` | Exact HTO observation; a jersey number **0** is flagged as a possible placeholder |
| Goalie GP, losses, GA | `GI/GK/GQ` | Direct HTO numeric observations |
| Goalie POTG | `HA` | Three known observations; one goalie game has **`potg=null`**; must remain unknown |
| Goalie wins, OT wins/losses, shots against, saves, save %, shutouts | Various other legacy input columns | **Not supplied or not independently proven by this bounded HTO feed.** Do not automatically enter zero or derive an official result for individual goalie categories |
| Skater SOG, PPG, SHG, GWG/GTG, faceoff, blocked shots, giveaways, takeaways, checks/hits and other legacy manual columns | Various existing source inputs | **Not supplied by the bounded feed.** Do not infer from final goals, period scores or player aggregate statistics |
| Cumulative, season, web scoring and other calculated columns | Table-specific formulas | Preserve original Excel formula logic; require separate test of structured-table propagation, dependency recalculation and pivot refresh |

**Existing source caveat:** All 14 official skater observations for game 359 have `pim=null`, while the legacy workbook has zero PIM values for its 14 existing skater game rows. Those old zero values are not independently supported by the bounded official HTO PIM feed and must be treated as **source-provenance review items**, not silently deleted or rewritten.

## Proposed row allocation and collision blocker

| Legacy table | Existing final row | 2026/27 observations proposed | Nominal extension |
|---|---:|---:|---|
| `SkaterStatsByGame` | 4668 | 40 source rows | 4669–4708 |
| `GoalieStatsByGame` | 363 | 3 source rows | 364–366 |

**A direct, read-only source XML inspection found one populated cell in the intended skater extension area: `Y4674 = 360`.** Column `Y` is the skater table's SHG field. The cell is **outside the current structured table**, and its purpose is not established by the available evidence. It might be a partial/manual entry or another historical remnant. Its value must **not** be overwritten, moved, treated as a valid short-handed-goal statistic, or deleted without source-owner examination.

The three-row goalie extension area currently contains only style-only cells and no populated formulas/values. **This does not authorize appending goalies**, because full legacy goalie W/L/OT and shots/saves fields remain unverified.

The private proposal carries the collision `Y4674`, the exact 43 staged row targets, every source-supplied field, every `null` held field and identity/jersey review flags. **Two staged observations** carry such flags. It explicitly sets `approvedForExcelWrite=false`, `structuredTableResizeApproved=false` and `sourcePublicationAuthorized=false`.

## Existing source conflicts remain separate

The original game-359 goalie entry for Dev Leong says `GP1 W1 L0 GA0 POTG0`; official HTO says `GP1 losses1 GA3 POTG1` for a 0–3 loss. All four discrepancies remain documented for owner-reviewed source correction. This preflight does not supply or infer a replacement workbook win/OT result or overwrite existing rows.

## Acceptance for the next workbook implementation

1. **Resolve cell Y4674** with a documented original-source review and independent evidence. Either preserve it explicitly outside the expanded table or establish a separately approved, non-destructive relocation before any structured-table resize.
2. Review every proposed row's jersey/name identity. Preserve `Unknown, Johnny`, jersey `0`, rentals, call-ups and unresolved profile identities without guessed official IDs.
3. Obtain independently authoritative sources for unavailable legacy manual inputs, or design a documented and formula-safe **unknown/null** representation without presenting unrecorded statistics as zero. Note that many legacy formulas expect numeric inputs; do not assume leaving a blank is safe.
4. In a *new* disposable Excel copy, test extending exactly 158-column and 116-column structured tables, copying the appropriate calculated-column formulas, preserving historical rows and preventing collisions; validate 43 source observations, four known goalie results, pivots, all 17 sheets, AwardScoring, Player Projections and Web Streaks.
5. Require owner-approved full-schema source values and a specific source-of-truth write authorization, exact old/new Excel hashes, immutable rollback backup, independent QA and verified publishing status before altering the original workbook.
6. **Do not** add the October 25 HTO fixture `3375682` as a completed fifth game until official postgame score, roster, skater/goalie source parity and unique workbook game 363/row 374 join all pass.

## Tested implementation and private receipt

- Source script: `scripts/audit_plan03_full_schema_game_log_staging.py`.
- No-network tests: `tests/test_plan03_full_schema_game_log_staging.py` — **9/9 PASS**, including null PIM/POTG protection, goalie W non-inference, fifth-game refusal, identity holds and preservation of `Y4674`.
- **Real-input BRUTTECH 1 result:** `REVIEW_ONLY_HELD_FOR_EXISTING_CELLS_AND_UNSUPPORTED_STATS`, **40 skater + 3 goalie** proposed entries, **28** unknown staged PIM values, **1** unknown staged goalie POTG, **one** populated skater table-extension collision, and **two** identity/jersey review flags. No Excel write.
- Private, source-hashed detailed plan: `D:\BruTTech\Products\HockeyOS\Plan03\source-archive\261021_Full_Schema_Game_Log_Admission_PREVIEW_PRIVATE.json`, SHA256 `2e59bea0b23d74014aeb36864962c0ed66bd53046cee18de24d1158fe2f1557f`. **Do not upload the private row-level plan to the public repository.**
- The original workbook SHA-256 remains `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`; the already accepted four-game **disposable** Excel recalculation is separate and unaffected.

Related: [Plan 03 tracker #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [source gap PR #43](https://github.com/adambrutto-maker/brave-hc/pull/43). This document does not grant statistical publication approval.
