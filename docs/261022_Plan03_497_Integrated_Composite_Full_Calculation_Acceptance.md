# HockeyOS Plan 03 — Full integrated 497-cell technical acceptance

**Execution:** October 21–22, 2026, BRUTTECH 1. **Lead:** Data & AI; independent QA and Engineering support. **Technical result:** `COMBINED_497_FULL_CALC_AND_HTO_PARITY_PASS_PRIVATE_ONLY`. **Owner source-of-truth approval: NOT GRANTED. Public live stats/Records/Awards publication: NOT GRANTED.**

## Resolved integration gap

Earlier Plan 03 tests verified a four-game period-score correction and 43 missing player-game entries **in separate Excel files**. [PR #55](https://github.com/adambrutto-maker/brave-hc/pull/55) correctly held any claim that those tests constituted a single fully reconciled workbook.

A **new independently named, private Excel candidate** now contains all intended changes together:

| Official source area | Exact independently verified disposition |
|---|---:|
| Four HTO game-score period rows in `Master Schedule` | **32 numeric input cells** |
| Newly sourced skater/goalie game-log observations | **460 input cells** in **40 new skater rows plus 3 goalie rows** |
| Existing Dev Leong game-359 goalie corrections | **4** W/L/GA/POTG source cells |
| Previously misleading `Y4674=" "` SHG field | **1 cell cleared to blank/unknown** |
| **Total source-cell dispositions in ONE saved workbook** | **497/497** |
| HTO missing source fields intentionally held blank | **41/41** |
| Unexpected new manual inputs or changed original history | **0** |

The authoritative original `261001_Brave_HC_Master_Workbook.xlsx` was never opened for editing and remains SHA-256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`. Original Excel, HTO CMS, public HockeyOS and earlier private test copies are unchanged.

## Two accepted, separately preserved private copies

**Source-integrated version:** `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_261021_01\01_Integrated_497_Source_Review_COPY.xlsx`

SHA256 `9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08`.

Excel source-stage procedure used the validated player-only full-calc copy as a **disposable base**, verified both source manifests against their SHA, inserted **only 32** HTO numeric periods and ran `Master Schedule.Calculate()`. It saved a new private composite, left an untouched byte-identical rollback of the player-only input, and exited. A separate typed ZIP/XML checker independently read the **SAVED** composite, confirmed all 497 manual source changes, all 41 withheld cells, preserved existing original skater/goalie/schedule manual data and accurate table boundaries `SkaterStatsByGame A2:FB4708`, `GoalieStatsByGame FD2:JO366`.

**Fully calculated integrated version:** `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_FullRecalc_261021_01\01_Full_Calculation_Review_COPY.xlsx`

SHA256 `de9bc6ed615a7c330809a0b2f8888f42c357d641f2a2266e0fca20914521f979`.

Another **new, isolated source-preserving Excel copy** ran `Application.CalculateFull()` over all 17 legacy sheets. It completed after **508.16 seconds**, saved successfully, and Excel exited. No external connection `RefreshAll`, live HTO write, source workbook replacement or Git publisher action was requested.

**Independent full saved-file audit:** `FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY`, with:
- All **545,506 existing formula definitions** preserved across all 17 sheets;
- **zero newly introduced Excel error cells**;
- The original **two `Skater Profile I13/J13 #REF!`** retained as known, unresolved pre-existing errors;
- All 497 reviewed source-cell changes still present **after** full calculation, all 41 source unknowns still blank;
- All source-independent Master Schedule final-score caches correct.

## Integrated four-game and player/goalie parity

The combined full-calculated copy's Master Schedule now records the following exact **source-verified completed** Brave H.C. results:

| Date 2026 | HTO game ID | Book game / Excel row | Official Brave score |
|---|---:|---|---|
| September 20 | 3356177 | 359 / 370 | **L 0–3** |
| September 27 | 3356178 | 360 / 371 | **L 3–6** |
| October 4 | 3369564 | 361 / 372 | **L 2–3** |
| October 18 | 3375601 | 362 / 373 | **L 1–7** |

**Totals 0–4, GF6, GA19**. Numeric game-count flags `X370:X373` are all **1**. The upcoming October 25 HTO `3375682` / Excel row 374 retains blank source-period cells and **`X374=0`**. Its cached `U374=T` is a legacy **unplayed placeholder**, never an official tie.

A separately executed source-to-pivot verifier returned `DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED` on the **fully calculated integrated copy**: **all 20 source-verified skaters, 54 GP, six G, ten A, sixteen Pts and nine skater POTG** match individually on supported metrics, and **all three goalies** match the official supported GP/losses/goals-against. No unverified goalie win claim. The earlier Dev Leong game-359 error is corrected **only in the private composite**.

## Repeatable independent technical release gate

`scripts/audit_plan03_integrated_497_source.py`: validates one saved composite XLSX against immutable original, typed 497 HTO-source dispositions and 41 withheld unknowns, goalie corrections, Master Schedule final/cache counts, unchanged historical manual data and explicit original-workbook nonmutation.

`scripts/audit_plan03_full_composite_technical.py`: independently accepts **both** source-integrated and fully calculated SHA-pinned private copies, the two Excel save receipts, formula/error report and official HTO four-game feed. It verifies each source-value group **before and after** full recalculation, plus independent source-to-season pivot parity and exact known original `#REF!` errors. It returns:

`COMBINED_497_FULL_CALC_AND_HTO_PARITY_PASS_PRIVATE_ONLY`

All acceptance flags remain **false** for owner source-of-truth approval, live Record Watch, award winners, current projections, business-rule certification, HTO CMS modifications and future fifth-game admission.

Offline fail-closed tests in `tests/test_plan03_integrated_497_source.py` and `tests/test_plan03_full_composite_technical.py` enforce integration rather than two-fragment conflation and prevent acceptance on unknown-as-zero fields, changed history, wrong team scores, unapproved profile error masking, altered formula definitions, incomplete HTO source parity, or public-release claims. Hosted CI tests require **no private XLSX or row-level source upload**.

## Technical acceptance is not source-of-truth or business-rule adoption

The verified private combined workbook technically integrates the 497 changes and recalculates without new Excel errors. That is a major Plan 03 QA gate, **not** blanket correctness of every inherited formula or the right to promote the Excel copy into the original:

- Current official feed has **42 unknown skater PIM observations** and **one unknown goalie POTG**; GTG and other legacy input fields remain partially unobserved. **Unknown does not mean zero.**
- The projection source contains an original `Hunt, Quenton` duplicate SCR entry and lacks `Pavaday, Damian` (status/eligibility review required).
- `AwardScoring` caches can reflect historic/internal normalizations and are not certified current winner/rank evidence.
- `WebStreaksHelper` latest-game parity was only source-verified for 21 represented player identities. Career baseline, streak/drought and milestone publication is a separate release gate.
- `Skater Profile I13/J13` are original formula-less `#REF!` records fields; their **Active/Total Records** definitions are not recoverable by recalculation. Legacy 28 counted holder entries and official public HTO 25 name-mention rows have different statistical scopes; no formula/value invented.
- The October 25 HTO game `3375682` remains **unplayed/pre-admission** as of this acceptance. The reviewed release is a four-completed-game snapshot only.
- Historical native HTO records (558/119), Awards & Honors (146/20), 32 archived bulletin posts and unreleased July feature were **not modified**.

**Next owner-controlled step:** establish a separate workbook-owner decision packet with precise proposed source edits, source SHA, immutable backup, independent QA receipts, unknown-field semantics, player registry and record definitions, rollback steps and authorized publication boundaries. Do **not** replace the canonical workbook, publish new public statistics, modify native HTO records or add a fifth game without distinct approval.

Related: [Plan 03 integrated issue #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [two-fragment blocker and earlier QA #55](https://github.com/adambrutto-maker/brave-hc/pull/55).
