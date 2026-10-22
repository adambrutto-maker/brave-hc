# HockeyOS Plan 03 — Optional 499-cell opponent metadata acceptance gate

**2026-10-22. Lead: Data & AI.** **State: Prepared for private disposable verification; not executed against a 499-cell workbook.** The authoritative original workbook, HTO CMS, records and public website remain unchanged.

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

## Next controlled execution, BRUTTECH 1 only

At the time of this checkpoint, BRUTTECH 1's remote connection was **unavailable**, so **no new 499-cell candidate was created in this implementation step**. Do not interpret the previous 497-cell private workbook as a 499-cell candidate, and do not rerun any of the already accepted 497-cell tests destructively.

Once BRUTTECH 1 is reachable:

1. Verify that no existing Excel automation instance is active and source input SHA still matches. Create a newly named isolated private test directory with an untouched binary backup of the accepted full-calculated 497-cell copy.
2. Open **only a third disposable copy** in Excel with external links/macros/events disabled, source manual calculation mode retained. Confirm `H372/H373` blank, four game/date/source joins intact, `H371` alias preserved and future row 374 unplayed.
3. Set exactly `H372 = Michelob Morts`, `H373 = Zamboner Crew`; save **only** the new private candidate and retain a source SHA + intended-change receipt. Do not guess schedule time, venue, home/away or change native HTO.
4. Run the new independent read-only 499 metadata checker. It must explicitly hold on unreviewed source/manual changes, changed formula definitions, unexpected filled unknown HTO data or any counted fifth game.
5. In another protected private copy, perform a controlled full 17-sheet calculation and validate no new Excel errors, exact previously accepted 20-skater/three-goalie HTO source parity and unchanged 0–4/6GF/19GA team results. Source missing-field and profile error holds remain.
6. **Separate original-file owner approval** is required before any real source promotion. An optional 499 technical pass cannot authorize the original workbook write or live Record Watch, awards and article publication.

## Other explicit holds

- 42 official current-season skater PIM observations remain unknown; one goalie POTG is unknown; GTG is source-explicit in two of four games.
- Original `Skater Profile I13/J13` remain formula-less `#REF!`; legacy 28 held-record entries and current HTO 25 published name mentions are different measurement scopes.
- Pavaday and Carlyle legacy roster eligibility and Hunt's double `SCR` projection entry need separate owner determinations.
- All historical HTO Records (558 entries), Awards (146 entries) and 32 privately preserved original bulletins remain unmodified.

**No original/website writes, no owner approval inferred.** Track this bounded optional metadata gate under [Plan 03 #30](https://github.com/adambrutto-maker/brave-hc/issues/30).
