# AW-02 progress: season PivotTable dependency

Observed October 20, 2026 Toronto. Read-only ZIP/XML inspection of the saved disposable replay; no workbook was modified.

## Verified dependency
- `Player Stats!A2:AT649` is PivotTable `PlayerStatsBySeason` (cacheId 9), sourced from the named table `SkaterStatsByGame`.
- `Player Stats!CN2:EA77` is PivotTable `GoalieStatsBySeason` (cacheId 15), sourced from `GoalieStatsByGame`.
- Skater cache retained 4666 records; replay table A2:FB4708 contains 4706 data rows. Difference: 40 inserted appearances.
- Goalie cache retained 361 records; replay table FD2:JO366 contains 364 data rows. Difference: three inserted appearances.
- Both caches have refreshOnLoad=1. This setting did not establish that the saved replay caches included inserted rows.
- Player Stats headers identify Q/R as winter/summer adjusted goals, S/T as adjusted assists and U/V as adjusted points. PlayerInfo's captured Current Total Raw G reads Q or R through SUMIFS keyed by season and website name.

## Consequence for AW-06/AW-07
Do not manually overwrite PivotTable output cells or create a competing season-input ledger. In a new disposable candidate, preserve source tables, apply reconciled inputs, calculate game-level helper columns, explicitly refresh the two relevant native PivotTables/caches, wait for refresh completion, then fully calculate downstream formulas. Verify saved cache coverage and per-player season totals against the pinned accepted input package, including the missing Damian identity. Capture actual runtime ordering and any additional refresh needed; no successful refresh is claimed here.

## Remaining AW-02 work
Ordinary cell/named-range dependency coverage, historical baselines, schedule context and field-level missing-data impacts remain incomplete. AW-02 is in progress, not complete. AW-03/AW-05 identity and missing-observation issues remain open. No current ratings or release are verified.

Evidence: saved replay at D:\BruTTech\Products\HockeyOS\261019_Award_GameLog_Staging_v1\Disposable_Awards_Replay_20261021_023525\Review_Only_Master_Workbook.xlsx; xl/pivotTables/pivotTable2.xml and pivotTable3.xml; xl/pivotCache/pivotCacheDefinition2.xml and pivotCacheDefinition3.xml. Prior native replay receipt and upstream parity review remain applicable.
