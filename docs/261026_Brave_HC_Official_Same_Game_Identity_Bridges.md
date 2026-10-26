# Brave H.C. — 2026 Official Opponent Same-Game Identity Bridges
Date: October 26, 2026
Lead department: Data & AI. Supporting Engineering, QA and Media.

## Purpose
The earlier Opponent Intelligence implementation withheld all data for Mohawks HC and Sugo Sundays because HTO and SVHL name labels did not match. Independent official records establish **the same two current-season completed games**, which can safely be displayed without claiming that prior-year franchises or all historic opponents should be merged.

## Exact official game evidence
1. September 27, 2026, 6:15 p.m. EDT: SVHL Sunday Winter league 570, Mohawks HC TeamInfo team ID 13680, lists Mohawks HC as visitor against Braves HC, with home-away score 3-6. The corresponding official HTO Braves boxscore gameID 3356178 has the same date/time and reports Mohawks H.C. 6, Brave H.C. 3. This verifies the **single completed game** SVHL Mohawks HC ↔ HTO Mohawks H.C.
2. October 4, 2026, 8:15 p.m. EDT: SVHL league 570, Sugo Sundays team ID 13709, records visitor matchup against Braves HC, score 2-3; official HTO Braves boxscore gameID 3369564 same date/time reports Michelob Morts 3, Brave H.C. 2. This verifies the **single completed game** SVHL Sugo Sundays ↔ HTO Michelob Morts.

Each official source is independently read in the importer. It checks current division team identity, unique dated Braves fixture, opponent visitor/home position, start time, final score, canonical HTO boxscore period arithmetic, official HTO opponent label and date. An altered source identity or data forces a HOLD.

Official source URLs:
- https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=570&teamid=13680&page_type=Adult
- https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3356178&p=boxscore
- https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=570&teamid=13709&page_type=Adult
- https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3369564&p=boxscore

## Independent continuity evidence; not part of automatic approval
Official five-season winter league pages show Mohawks HC / H.C. / H/C with adjacent-season overlap of 2, 5, 6 and 10 unique player IDs from 2022–23 through 2026–27. Current Mohawks 2026 shares 10 of 17 players with Mohawks 2025–26. Sugo Sundays 2026–27 shares 6 of 8 player IDs from the smaller Michelob Morts Summer 2026 roster. These overlaps support continuity but are insufficient to authorize a merged historical franchise record. The private detailed evidence and source fingerprints are held on BRUTTECH 1 only.

## Implemented files and contracts
- scripts/verify_current_game_cross_system_identity.py: extracts precise official current game correspondence, source SHA-256 and links, producing a narrowly scoped proof with status OFFICIAL_SAME_GAME_PROOF_VERIFIED. No original workbook write, HTO CMS edit or historic source manipulation.
- widgets/current-opponent-identity-bridges.json: public-safe proof of exactly two game pairs with scope THIS_COMPLETED_GAME_ONLY and historicalFranchiseMergeAuthorized=false.
- widgets/home-premium.js: independently loads the optional proof, verifies schema/status/source links, shows the historical identity HOLD and an additional official single-game result only for the two held names; preserves all earlier franchise record and same-game future merge restrictions.
- widgets/home-premium.css: accessible, readable source-proof styling and official source links.
- tests/test_current_game_cross_system_identity.py: 7 source, tampering and release-state tests PASS.
- tests/test_current_alias_single_game_widget.cjs: browser integration PASS for both verified current-season records, other five opponent choices, historic all-time alias holds and source links.
- Existing premium full standings/full roster browser regression PASS.

## Deliberate limitations
- Mohawks HC 49 historical all-time meetings remain separate from HTO Mohawks H.C. current single-game evidence pending review. No automatic 50-game merged record is produced.
- Sugo Sundays / Michelob Morts historical/summer continuity remains unmerged. Only October 4 verified current game is shown.
- Other Way has no official completed exact-name Braves game in the accepted source; its status is unchanged.
- Current static proof is only for these two games. A future source-qualified new game requires a separate official HTO/SVHL admission; no new aliases are automatically invented.
- All workbook forecasting, five-arrow trend logic, standalone news and source histories remain unchanged.
- Native HTO homepage duplicate standalone milestone module requires a separately authenticated editor action and backup; this PR does not alter native HTO modules.

## Rollback
Revert this PR, removing the optional exact-game bridge and viewer addition. Existing historic alias holds remain fail-closed and source feeds/workbooks remain untouched.
