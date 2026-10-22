# HockeyOS Plan 03 — 2026/27 Player Projections actuals versus official HTO

**Reviewed:** October 21, 2026. **Lead:** Data & AI; Engineering/QA support. **Disposition:** `PROJECTION_REPRESENTED_ACTUALS_MATCH_HTO_DUPLICATE_LEGACY_ROW_HOLD`.

## Scope and evidence

The private, saved and independently validated **17-sheet full-recalculation Excel copy** (`D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Full_Recalc_261021_01\01_Full_Calculation_Review_COPY.xlsx`, SHA256 `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b`) was compared to the **four completed, source-verified HTO games** (`3356177,3356178,3369564,3375601`).

The legacy Excel projection is table `BravesRegularSeasonProjection`, `Player Projections!C5:AC94`. Its selected season is `W2026/27`. Only **current-season ACTUAL columns S/V** (GP, G, A, Pts) are evaluated by this audit. Forecast attendance, predicted GP/G/A/Pts/rates in columns Y:AC, current/career rates and awards are **not** source-verified.

## Confirmed actuals and coverage

| Source check | Result |
|---|---|
| Official unique skaters across the four HTO games | **20** |
| Source-verified four-game GP/G/A/Pts totals | **54 / 6 / 10 / 16** |
| Rows in original/current Excel projection table | **89** |
| Distinct player names in projection table | **88** |
| Current HTO skaters actually represented in projection table | **19** |
| Represented players with exact GP/G/A/Pts source parity | **19 of 19** |
| Unrepresented current official skater | **Pavaday, Damian** |
| Actual totals for represented players only | **53 GP / 6 G / 9 A / 15 Pts** |

The difference between the 20-player HTO source total and 19-player projection representation is precisely **one Pavaday game appearance, one assist and one point** in the four-game HTO feed. This is a **roster/projection-eligibility coverage gap**, not authority to add him to an FT/CU/DI or awards registry without a separate reviewed player identity and status decision.

## Original source duplicate

Both the **original 21MB Master Workbook** and the independent full-calculation copy contain **two `Hunt, Quenton` projection entries**, rows **42 and 43**. Both carry the legacy status code `SCR`, with distinct stored jersey numbers **0 and 6**. The duplicate was **not caused by the 43-row import or recalculation**. Both rows have 0 recorded 2026/27 GP/G/A and no earned Pts values in that source snapshot.

The source code `SCR` is preserved verbatim; this audit does **not** assume it means the player is eligible or ineligible for a particular program. Do not delete one of the entries, merge jersey identities, alter player source IDs or count either as an HTO 2026/27 skater without source-owner review.

The legacy projection has **89 occupied rows but only 88 distinct names**. Thus, an audit that demands 89 unique names fails on the actual source. This has now been **corrected in the checker** to report an explicit, bounded duplicate-row HOLD while independently validating all 19 official source-matching actuals.

## Implemented reproducible gate

New `scripts/audit_plan03_projection_actuals_hto.py` checks:

- Exact hash and identity of the **private full-calc workbook**, `BravesRegularSeasonProjection C5:AC94`, and `X2=W2026/27`.
- Four known completed official HTO games only, unique within-game skater names and source-verified season aggregate totals.
- Exact 19 represented skater identities, missing `Pavaday, Damian`, and actual source-per-player GP/G/A/Pts parity.
- The pre-existing and explicitly documented `Hunt, Quenton` twice-occurring name; any **other** unexpected duplicate name or duplicate current HTO player forces a fail-closed review.
- No use of source-missing PIM/POTG/GTG/goalie statistics to certify projected scoring models, AwardsScoring or the public Record Watch.

New `tests/test_plan03_projection_actuals_hto.py` contains **12 synthetic fail-closed tests**, and CI runs it without loading private Excel. The real on-host checker returned `PROJECTION_REPRESENTED_ACTUALS_MATCH_HTO_DUPLICATE_LEGACY_ROW_HOLD`, 19 exact actual matches, zero supported-field discrepancies, and **two distinct coverage blockers** (Pavaday missing / original Hunt duplication).

## Release conditions and next step

1. Review **Pavaday's eligibility** for the legacy projection and any player-profile/streak/award scopes. Never infer based on official HTO appearance alone.
2. Review the historical original **Hunt SCR double entry**, including distinct jersey 0/6 rows and any valid duplicate/alias/scenario logic. Preserve both source records until separately authorized.
3. Evaluate the projections' **predicted** values using specific accepted historical/availability assumptions. Accurate source actuals do not certify forward projections.
4. Hold complete 2026/27 award scores and streak/drought outputs while 42 skater PIM, one goalie POTG and other manual statistics remain unknown; retain partial official GTG source coverage.
5. Keep the original workbook hash `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`, native HTO, public website and previously approved private QA copies unchanged. Any source-of-truth edit requires explicit owner approval, backup, exact cell scope and rollback verification.
6. Do not count the future HTO October 25 fixture `3375682` as a completed game.

Related: [Plan 03 tracker #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [full workbook source audit #50](https://github.com/adambrutto-maker/brave-hc/pull/50), [record/streak audit #51](https://github.com/adambrutto-maker/brave-hc/pull/51).
