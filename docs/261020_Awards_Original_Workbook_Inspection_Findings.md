# Original workbook inspection findings

Adam specifically authorized read-only inspection of the original workbook formulas and calculation metadata. Inspection used Python standard-library ZIP/XML reads, without opening Excel, evaluating formulas, refreshing links or saving the workbook. SHA-256 before and after both matched 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154.

## Findings

- Stored workbook calculation properties are calcMode=manual and calcId=181029. Manual mode means merely changing inputs is not proof that dependent saved results were refreshed.
- AwardScoring FJ5:KY55 has 146 calculated columns. 132 columns contain stored worksheet array-formula elements. All 146 table formulas exactly match their captured first stored worksheet formula. This is first-row text parity, not every-row or calculation parity. Array metadata is preserved in 261020_Awards_Original_Formula_Capture.json.
- Web Races has 91 stored array-formula elements. These findings support treating evaluation mode as significant; they do not alone prove runtime compatibility or that every stored array originated in legacy rather than dynamic-array Excel.
- Rolaids skaters require MAX(6, ROUNDUP(roster-season games * 25%, 0)); goalies require MAX(4, ROUNDUP(roster-season games * 15%, 0)). Full-time and blank roster statuses are excluded. The earlier five/three-game description was incorrect.
- Hart skater eligibility uses 50% for FT/CU/DI, rather than the earlier 40% call-up/drop-in wording. Norris uses MAX(7, rounded-up 35%), with source-defined defence/utility classifications. Lady Byng, Most Improved and Dedication descriptions were reconciled to the captured expressions.
- Rolaids goalie weights: attendance20%, reliability18%, discipline12%, GAA10%, POTG10%, win-rate8%, plus/minus8%, wins8%, shutouts3%, offense3%. Dedication: attendance45%, playoff attendance20%, tenure5%, role reliability20%, discipline10%.
- Final normalization is award-specific. Rolaids uses the difference from the highest eligible raw score, a rank-based ceiling and a floor of50. Rookie permits tied maximum raw scores to each receive100. Do not apply one shared scaling rule to every award.

## Implementation and verification

Source-rule prose and the six-game skater BASE progress bar were corrected in the review branch. The bar explicitly states that the roster-percentage denominator is still unverified; reaching the base does not assert qualification. Hall of Fame remains a separately configured ballot, not an AwardScoring formula model captured here.

A read-only independent arithmetic review of captured final formulas reproduces 20 saved eligible final ratings: Rolaids7, Conn Smythe6, Norris3 and Rookie4. It uses saved eligible/raw/rank values, so it does not verify eligibility, component arithmetic, other award models, current season inputs or native Excel recalculation. Full results are in 261020_Awards_Saved_Final_Score_Review.json.

Local77 tests passed. CI77 suite succeeded for implementation4af5071e8bc3361efc4c6afb5105027733a2b8da: https://github.com/adambrutto-maker/brave-hc/actions/runs/39532546601 . Randy AI independently accepted the UI/source-rule correction and ran its72 tests; the additional five historical-final audit tests are separately scoped.

Exact-commit browser preview verified the six-game base, percentage caveat, absence of the old five-game text, continued model hold, no horizontal overflow and no console errors. No live deployment occurred.

## Remaining work

Replay current authorized game inputs into a controlled calculation environment while preserving formula semantics, historical comparator data, roster-season denominators, blank-versus-zero behavior and source eligibility. Then verify native recalculation and all current award models before releasing ratings. This read-only inspection did not expand tables, modify the source, refresh its data or authorize publication.
