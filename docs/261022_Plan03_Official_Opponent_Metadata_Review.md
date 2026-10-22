# HockeyOS Plan 03 — Verified opponent-name gaps in the integrated workbook

**Checked:** October 22, 2026, BRUTTECH 1. **Lead:** Data & AI, with Engineering and QA review. **Status:** `TWO_OPPONENT_NAMES_VERIFIED_PRIVATE_REVIEW_ONLY`. This is a **no-write** source-completeness review.

## Why this is separate from the 497-cell technical acceptance

The prior [integrated technical acceptance, PR #57](https://github.com/adambrutto-maker/brave-hc/pull/57), verified **497 intentional source-cell changes together**, all 41 unknown current player fields withheld, full 17-sheet Excel recalculation and basic HTO skater/goalie parity in private test files. Those 497 corrections consist of 460 sourced player-game inputs, 32 period-scoring inputs, four existing goalie corrections, and one whitespace-to-blank disposition.

**The Master Schedule's descriptive opponent names are a distinct source-completeness question.** They were not included in that signed 497-cell correction contract. A technically successful recalculation does not establish those metadata fields are complete.

## Read-only evidence and exact proposals

Inputs:

- Original immutable source `261001_Brave_HC_Master_Workbook.xlsx`, SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.
- Privately validated **full-calculated** integrated workbook, `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_FullRecalc_261021_01\01_Full_Calculation_Review_COPY.xlsx`, SHA256 `de9bc6ed615a7c330809a0b2f8888f42c357d641f2a2266e0fca20914521f979`.
- Private source-hashed official HTO period evidence for games 3356177/3356178/3369564/3375601, SHA256 `81790e38b0ff2a4563cb4fbf5d94911640e4bdd41a736d8e5c5fc419cee9066c`.

| Official game and date | Original Master Schedule cell | Existing legacy value | Official HTO name | Review disposition |
|---|---|---|---|---|
| 3356177, Sept 20 | `H370` | Dateline Predators | Dateline Predators | Existing name matches; preserve |
| 3356178, Sept 27 | `H371` | Mohawks HC | Mohawks H.C. | Exact spelling differs; **alias review, no automatic change** |
| 3369564, Oct 4 | `H372` | **Blank** | **Michelob Morts** | Source-backed **proposed** name |
| 3375601, Oct 18 | `H373` | **Blank** | **Zamboner Crew** | Source-backed **proposed** name |

The original workbook and already accepted private full-composite have **the same** blank/name state in those four opponent cells. No opponent input was written to either file during this review.

Both `H372` and `H373` are legitimate **additional source-change candidates**. They would raise the exact proposed Excel correction set from 497 to **499 manual-cell dispositions**, **only if separately approved and validated in another disposable workbook copy**. PR #57's existing 497-cell acceptance remains valid for its original scope and **does not automatically cover 499**.

The original and integrated copies also have blank time `F`, home/away `G` and rink `I` fields on rows 372/373. This source audit **does not infer** those fields, does not rewrite Mohawks spelling, and does not populate or count the future Oct 25 fixture 3375682 / game 363 / row 374.

## Implemented fail-closed check

`scripts/audit_plan03_missing_schedule_opponents.py` checks the official private HTO game names, source date/legacy Excel date, original and private composite book number, verified Brave game GF/GA and completed-game result, the unchanged original opponent spelling, exactly two blank-name rows and the unplayed fifth-game row.

Its result is `TWO_OPPONENT_NAMES_VERIFIED_PRIVATE_REVIEW_ONLY`. Every `newOpponentNamesProposed` row has `approvalToWriteOriginal=false`; all release/HTO-publication permissions remain false. It rejects source-date drift, changed 2026/27 rows, invented metadata, inappropriate alias normalization, prefilled source cells, new source opponents, incorrect team scores and premature fifth-game admission.

`tests/test_plan03_missing_schedule_opponents.py` contains **11 offline fail-closed tests** and is part of the guarded record-source CI. GitHub stores source code and public-facing provenance only: the 21MB workbooks and private HTO source remain off the public repository.

## Next controlled source-owner gate

Before adding either opponent name into the **original** workbook:

1. Verify current source hashes and confirm the owner-approved exact workbook release scope—497 already tested cells plus, potentially, **two additional** official opponent names.
2. In a **new, independently named disposable copy**, enter only approved `H372` and `H373`, check their exact source name/date/game associations, preserve row 371's alias unless separately approved, and ensure no unsupported adjacent F/G/I fields become guessed values.
3. Recalculate affected Excel tables and source keys, then independently verify Master Schedule 0–4/6GF/19GA, all 20 skater and three goalie supported source totals, full 17-sheet formula definitions, no new errors, 41 withheld HTO fields still blank, and the Oct 25 row unplayed.
4. Obtain precise workbook-owner approval, a protected binary rollback and an independently audited original-source admission receipt **before** any real source write. Do not publish current Record Watch or awards as an incidental side effect.
5. Keep existing historical profile `I13/J13 #REF!`, unknown PIM/POTG/GTG, missing Pavaday registration and duplicate Hunt SCR projection entries as **separate** business/adoption holds.

**No production action was taken in this review.** Native HTO Records (558 entries/119 groups), Awards & Honors (146/20), original articles and public historical Watch remain unaffected.

Related: [Plan 03 #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [source + full-calculation integration #57](https://github.com/adambrutto-maker/brave-hc/pull/57).
