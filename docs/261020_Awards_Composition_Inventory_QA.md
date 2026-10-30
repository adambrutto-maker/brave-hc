# Captured award composition inventory

Implementation: 2893f5e3310a90404a3a4c21f50bb6ea6db28d60, PR8 review branch only.

The inventory reads the previously captured original146 AwardScoring formulas. It does not open Excel, execute source formulas, update inputs, alter the workbook or load into the public widget.

Coverage:

- Eight composite models: Hart, Conn Smythe, Norris, Rookie, Lady Byng, Most Improved, Rolaids and Dedication. Each retains its source raw, eligibility, final-score and rank-key formulas with hashes.
- Six ordinary models have separate skater/goalie source branches:12 coefficient sets, each totaling1.
- Norris defence/utility source expressions retain differing points coefficients (.1 versus .075) and position constants (100 versus88, weighted .02). The utility coefficient total .975 is intentionally not renormalized.
- Most Improved retains seven signed relative-rate change expressions for each role. Full expressions preserve denominator floors and reversed GAA/PIM direction. These are not normalized web component scores.
- Art Ross and Rocket remain source counting-title chains. Hall of Fame remains a separate ballot outside this AwardScoring inventory.
- An independent traversal corroborated internal AwardScoring and external PlayerInfo, RosterStatusBySeason and SeasonInfo references for all ten chains. Eight composite models require254 distinct PlayerInfo fields (173 Current,40 Career Prior,34 All-Time,7 other). Including both count-title chains gives255 distinct PlayerInfo fields.

The inventory identifies required source fields; it does not prove their current values exist, are complete or are recalculated. It does not authenticate arbitrary supplied captures, compute current eligibility or authorize ratings. These flags remain false.

Randy AI independently accepted the supplied-expression inventory and dependency coverage. All85 combined tests passed independently. Module SHA-256:30322785d95b8e30ce452680d51efe7de577177ae2952344f336b729c807e0ae.

Generated JSON was checked against its Git blob after upload:81af55559cbd993c849516547a9ac4442fe14bd5. Source formula capture and generated inventory remain separately identified so source expressions can be inspected without treating them as calculation results.

Next calculation work must verify current inputs, historical baselines and roster/season denominators before source-faithful execution. No current score or deployment is approved by this inventory.
