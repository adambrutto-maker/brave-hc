# HockeyOS — Canonical team identities from Brave H.C. and HTO
Date: October 26, 2026
Lead: Data & AI. Supporting Engineering, Media and QA.

## Source hierarchy
1. The original Brave H.C. Master Workbook and team-created historical reports establish the long-run opponent game histories and original opponent names.
2. Official Brave H.C. HTO records and completed boxscores provide the current canonical name, game opponents, dates, final results and player/goalie data. Source rows are reconciled but never overwritten.
3. Sports Village league (SVHL) names determine division membership, league standings and fixtures but are lower-priority name aliases. Its Braves HC label is not the team's proper Brave H.C. name.
4. Each cross-system fixture identity requires date/time/score and HTO game-ID proof. Player-roster overlap is supporting evidence, not independent historical franchise authorization.

## Name evidence
Brave H.C.: Master Workbook historical articles and official HTO both use Brave H.C.; SVHL uses Braves HC. User-facing displays use Brave H.C., while preserving the league's original name key, ranking and scores.

Mohawks H.C.: Original Master Schedule contains 49 completed games under Mohawks HC through September 14, 2025 (42 regular season, seven playoff). The same workbook includes a Brave H.C.-authored game report dated September 22, 2024 titled “Brave H.C. Triumphs 4-2 in 'Battle of the Tribes' Against Mohawks H.C.” at Master Schedule!J317. Official HTO game 3356178 on September 27, 2026 uses Mohawks H.C. (Brave H.C. lost 3-6). SVHL league 570, team 13680 uses Mohawks HC for that exact completed fixture. Thus these are verified workbook/HTO orthographic variants, not separate franchises. Qualified all-time: 50 GP, 19-20-11, 193 GF, 176 GA. Regular season: 43 GP, 16-19-8, 164 GF, 161 GA. Playoffs: seven games 3-1-3, 29 GF, 15 GA. No original game rows modified.

Michelob Morts (SVHL listing Sugo Sundays): Official HTO game 3369564 October 4, 2026 at 8:15 p.m. uses Michelob Morts and Brave H.C. lost 2-3. SVHL league 570/team 13709 labels the same match Sugo Sundays. The original workbook contains no completed game under either of those two names. Qualified match history therefore contains the one verified game only: 1 GP, 0-1-0, 2 GF, 3 GA. No prior franchise lineage or unseen games inferred.

Other Way still has no verified exact-name completed game in accepted sources and remains held, not 0-0-0.

## Runtime and release controls
- Source adapter scripts/build_canonical_opponent_feed.py requires original workbook SHA256, historical editorial J317, the 358-game private Master Schedule stage, the complete operational HTO game-feed verification, separately reconciled HTO Scores and Stats, and two independent single-game HTO/SVHL proof objects.
- The new public source status is PUBLIC_VERIFIED_SOURCE_IDENTITY; each qualified row includes canonicalName, leagueDisplayAlias, sourceNames, precise scope notice and source links. Six opponent records qualified, of which only one is a new full historical canonical merge; one is strictly a single recorded current game.
- The corrected private source reconciler no longer assumes the old four-game operational feed; instead it requires the current fully verified feed to match all completed HTO Score events by game ID/date/GF/GA, while retaining the original five-game acceptance conditions.
- The website displays canonical labels but leaves official SVHL standings calculations and source keys unchanged.
- The Monday opponent publisher must commit only widgets/opponent-intelligence.json after dynamic source parity, original workbook validation and approval. No automatic franchise inference for future unverified Mohawks/Michelob games.
- The protected original workbook, official game sheets, Hot Stove approved editorial, Record Watch claims and five-arrow projection formulas are unchanged.

## QA and continuation
Nine source-integrity tests and the canonical-name browser test PASS. Existing full eight-team standings, 22-player projections, qualified exact records, one current-only history and Other Way hold all remain.
The HTO-original naming preference applies across future HockeyOS identity registry versions, avoiding accidental display of the league's Braves HC variant as the user's own team name.
Reverting this PR restores the former alias-hold display; the operational weekly Python publisher has a protected backup/rollback requirement, and the original workbook needs no restoration.
