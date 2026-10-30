# HTO discovery and consumer compatibility review

Live validated code/test commit:73e36f2d8b826d462e10d245017c138716be7b05. Observed2026-10-20T20:08:45Z on BRUTTECH1 isolated review folder.13 discovery tests PASS; live discovery command exit0.

Scores page canonical identity verified; discovered IDs3356177,3356178,3369564,3375601. All four boxscores re-fetched and content-verified. Stats Team GP4 matches verified audited map. No retained pagination-only IDs needed in this live run. Tests cover pagination retention and required full reverification. New/unmapped IDs HOLD rather than receiving arithmetic workbook game numbers. Existing candidate retains its distinct schema and allGamesDiscovered=false; the outer discovery review reports its own coverageVerified=true. These flags have separate scopes and are not a production adapter.

Separate Randy technical review found no blocking defect for the bounded discovery-review purpose. Not authenticated release approval.

## Actual local consumer inspection (read only, not execution)

-261016_Projection_HTO_Model_Bridge.py: requires verified-game-feed/v1 schema,playerAggregateParity,allGamesDiscovered and season team totals/count parity.
-261017_Bounded_Record_Watch_From_HTO.py: same verified schema/flags; game-row baseline fields must match.
-261019_Build_Hot_Stove_Drafts.py: requires verified schema/parity and per-game/season validations.
-261019_HotStove_Roster_Context_Draft_Build.py: requires complete-discovery/parity flags and sourceReadback. Current candidate does not supply sourceReadback.
-261017_Publish_Independent_Widget.py: requires verified schema/parity and createdAt freshness under2hours for watch source.
-261019_Awards_Race_Weekly_Export.py: requires season/count/model reconciliation and complete-discovery/parity.

Candidate must not be relabeled verified or activated merely to satisfy these checks. These six source inspections do not establish all transitive consumers' compatibility. No consumers were executed, no publisher patched, no task changed.

## Next implementation

Build a reviewed operational adapter with truthful source observation timestamp and complete-discovery evidence; test against actual consumer requirements in isolation, then controlled activation/rollback only under required acceptance. Future game-to-workbook mappings require authoritative schedule admission. Original workbook calculation and website publication remain separate dependencies. No production collector/feed/workbook/site writes in this review.
