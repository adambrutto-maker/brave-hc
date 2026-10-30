# HockeyOS Bio V3.0 — Master Workbook roster-adjusted attendance and ranking parity
Date: October 29, 2026 · **DRAFT ONLY · NOT LIVE**

## Authority and source verification
The original private `261001_Brave_HC_Master_Workbook.xlsx` was inspected **read-only** on BRUTTECH 1, without copying the workbook to GitHub or overwriting any data. Its SHA-256 matches the standing trusted source `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.

This supersedes the earlier simplistic `historical player GP ÷ scheduled team games` attendance comparison. That is not the Master Workbook's official opportunity-adjusted attendance and must never be substituted in the public Bio.

### Verified workbook fields
- Worksheet **Player Information**, Excel table `RosterStatusBySeason`, source range `ZE5:ZW495`. Parsed 490 roster-status history rows across FT, CU and DI.
- Regular-season GP `ZI`; eligible regular games `ZJ`; contested regular games `ZK`.
- Playoff GP `ZN`; eligible playoff games `ZO`; contested playoff games `ZP`.
- Total GP `ZS` = regular GP + playoff GP; total eligible games `ZT` = eligible regular + eligible playoff; roster-adjusted attendance `ZV` = total GP / total eligible games.
- Raw all-team-game comparison `ZW` = total GP / all contested team games. This is **NOT** the main roster-adjusted rate.
- `PlayerInfo[Career Roster Adjusted Attd. % Score]` (column `BQ`) = 100 × SUMIFS(total player GP) / SUMIFS(total eligible games), by player.
- `PlayerInfo[Current True Attd. % Score]` (column `BO`) is a distinct current-season, team-games-only percentage. It must not be confused with roster-adjusted attendance.
- `BravesRegularSeasonProjection[Career Attnd%]` (column `G` of Player Projections) feeds the season's GP-projection baseline; FT uses the player career GP / career eligible games from `RosterStatusBySeason`, with rookie fallback logic; current CU/DI logic has its own projections. Do not copy the FT formula indiscriminately to CU/DI.

### Actual Excel rules
In each completed/contested game type for a roster-status season:
- **FT:** eligible games = actual team contests for that season and game type.
- **CU or DI:** eligible games = that player's games played for that season and game type. A CU/DI appearance therefore scores 100% of **its recorded opportunities**, NOT 100% of team games.
- **Zero CU/DI GP:** zero eligible opportunities. The public Bio should show **unavailable**, not a misleading zero attendance or full attendance.
- **Career:** sum GP / sum eligible games across the player's verified status history; do not average annual percentages unweighted. Seasons where the player has no verified workbook history are not assumed to be FT.
- **Current:** recalculate when team contests, player appearances and current roster status reconcile; never combine the one-game workbook snapshot with a five-game HTO feed without a dated cross-source update.

### Source parity and controls
Read-only QA on BRUTTECH 1 matched 101 workbook players to the verified 109 HTO identities. Two internal roster labels have no verified HTO crosswalk and are withheld; eight known HTO identities have no matching workbook roster history and remain held. All 101 matched career roster-adjusted scores reproduce `PlayerInfo BQ` cached percentages to approximately 1e-14.

The one-game workbook projection baseline and the newer public HTO five-game current snapshot are **different source dates and scopes**. A separate sanitized private QA dataset recalculates compatible skater current-season percentages under the same original FT/CU/DI rules and explicitly flags its current-season source classification as provisional; goalie current-season percentages remain held until separately reconciled. The dataset includes **no roster-status identity labels in its public-export shape**, but has NOT been copied to the public GitHub repository.

## Advanced-card ranking rules (draft)
- **Skater:** at least 25 verified career GP; **goalie:** at least 8 verified career GP; role-specific cohorts. Small samples remain visible as raw rates but unranked.
- Rank **workbook roster-adjusted attendance** only against verified workbook-crosswalk participants. Never rank naive GP / scheduled-team-games in place of the source measure.
- Rank **HTO event-frequency rates** only against official HTO `player-career-insights.json` participants with verified GP, metric numerator, and denominator; source-specific values are never mixed with the workbook GP basis.
- For goals-per-points and special-teams share, require at least 15 points or 10 goals respectively to avoid a single goal distorting the leaderboard.
- Ties share the same competition rank. Denominator is the qualified player population, not the entire raw 109-player historical registry.
- The corner chip reads `#rank/qualified`. No badge is awarded and no record, award, or Hall of Fame rank is changed. Goalies and skaters never share one pool.

## Release boundary
GitHub review candidate `#168` stages **only** the pure ranking functions, data-scope holds and source-derived UI. `widgets/player-bio-attendance-verified-v30-preview.json` contains only a hold stub; no actual named player attendance is publicly uploaded in this PR.

The full named roster-adjusted numeric source remains in the private QA folder on BRUTTECH 1, pending an explicit verified publication approval and correct current roster synchronization. No production HTO Bio/Stats/Milestones/Records, Master Workbook or original projection formula has been modified.

## Acceptance
- Read-only workbook SHA and all matched career-cache percentages pass independently.
- CU 6/6 = 100%, DI 2/2 = 100%; FT 24/28 = 85.71%; CU/DI 0/0 remains held.
- Source data missing → no attendance percentage and no attendance rank; no naive fallback.
- A named player with fewer than the GP threshold may see their supported rate but not a rank.
- Responsive 320/390px Bio preview has clear labels, correct nonzero event rates, no overflow or third-party video embeds.
