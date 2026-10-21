# Native Excel replay findings

The disposable replay completed in native Excel. It updated 14 matched rows, added 43 appearances, wrote 565 nonmissing input values, rebuilt the workbook, and saved only the review copy. The original workbook SHA-256 remained unchanged. No live widget or feed was changed.

The saved-file review passed all 565 staged input comparisons, preserved untouched historical raw inputs, and found no differences in the 146 AwardScoring first-row formulas or their 132 stored array modes. Excel reported calculationState 0 and no errors in the 50 by 146 AwardScoring output. These are execution and preservation checks, not score verification.

## Concrete remaining dependency gap

The rebuilt game logs contain 53 named skater appearances, six goals, ten assists and sixteen points. PlayerInfo updates GP from the logs, but Current Total Raw G reads the separate Player Stats worksheet using SUMIFS over A3:A1500 (season), C3:C1500 (name), and Q3:Q1500 or R3:R1500 (season-adjusted goal totals). Those season totals were outside the game-log-only import and remain zero for the current participants. The rebuilt awards therefore still have zero count-title scores. Recalculation alone cannot synchronize these independent inputs.

18 of the 19 named current skaters have exact PlayerInfo identities; their GP sum is 52. Pavaday, Damian has one staged appearance and no exact PlayerInfo entry or same-surname variant in the saved master table. Do not silently drop this participant, invent master metadata, or map another player to this identity.

Before another score-producing replay, stage the verified current season totals into the original season input structure, reconcile Damian's PlayerInfo master metadata, and resolve the Master Schedule result context. Keep the 41 absent skater PIM observations and one absent goalie POTG observation explicit; never fill them with zero. These gaps prevent publication of current normalized scores.

## Source helper overrides

Three calculated goalie flags at row 363 contained literals 1, -3 and 0. In the disposable copy only, each was restored from the existing row 362 formula after comparison with the original table column definition. The displaced values and source row are recorded in the native receipt. Original and historical overrides were preserved.

The original workbook stores calcMode=manual. That supports stale saved caches as a possible factor, but the native result proves a separate season-input dependency must also be supplied.

## Evidence

- 261021_Awards_Native_Disposable_Replay_Receipt.json
- 261021_Awards_Native_Upstream_Parity_Review.json
- scripts/hockeyos_awards_disposable_native_replay.ps1
- scripts/hockeyos_awards_loaded_formula_compare.py
- scripts/hockeyos_awards_disposable_postcheck.py
- scripts/hockeyos_awards_native_upstream_review.py

Validation: 85 JavaScript tests and seven Python tests passed. Current scores, eligibility and publication remain unverified. PR8 remains a review branch.
