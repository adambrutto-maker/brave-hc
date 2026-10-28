# HockeyOS RCD-05 — Logical statistical Records category order

Date: October 28, 2026. Lead Engineering. Authorized computer BRUTTECH 1 (AdamPCDesktop). User-approved current HTO **Records** page; separate Awards page stays intact.

## Completed native editor change

The authenticated native HTO Records editor now keeps the **Summer** section ahead of **Winter**, with individual categories grouped by actual statistic. Goals are followed immediately by Games with 2+ Goals and Hat Tricks, then Game-Winning/Tying and special-team goals; Assists are followed by Games with 3+ Assists; Points are followed by Games with 3+ Points and Player of the Game; goalie Wins/Shutouts/GAA stay together, then PIM. Team Records group points and win/point streaks, offensive metrics, defensive metrics and penalty metrics in that order.

Only HTO category ordering changed. No renamed category, threshold, season label, playoff scope, record holder, date, value, or record count was changed. The user gave an example of "2+a", but the native source is **Games with 3+ Assists**, so no unverified 2+ Assist category or mislabeled result was created.

Native HTO acceptance receipt: `D:\BruTTech\Products\HockeyOS\Implementation Control\PlayerCoaching\261028_Records_Family_Order_CANDIDATE\261028_Records_FamilyReorder_Independent_Live_Acceptance.json` — PASS; 57 categories, 460 individual/team statistics (231+229), all values and Summer/Winter and Game/Season/Playoffs scopes preserved. Native HTO Awards still 281.

## Website/widget synchronization

Existing `widgets/history-records.json` now follows exactly those category families; no new page, tab, or duplicate Records data. `widgets/player-record-book.json` remains the same 229 source-mapped player statistical entries, and `widgets/history-records-legacy-558.json` remains an immutable historical archive for Watch and prior milestones. `scripts/refresh_record_sources.py` now updates the history feed on order-only native changes even when its source multiset is identical; it preserves the player book unchanged in that case.

Acceptance: all 57 categories match the order spec, all 460 original statistical rows retain exact public source values/scope, all 98 legacy milestone source rows remain solely in the separate immutable archive and in current Awards, browser history companion desktop/mobile category heading order matches spec, CI passes, production Pages readback follows the order, and current 281 Awards / 134 player achievement badges remain intact.

Never fabricate unverified statistical thresholds, reinsert old club entries into statistical Records, or assign the two ambiguous historic rental-goalie rows to an unverified player.


## Final live 463 source: Summer GTG, continuous team streaks, dates

The official native HTO Records page now holds 463 entries in 60 category headings: the original 460 exact historical statistics and three independently verified additions. Summer - Game Tying Goals is located immediately after Summer - Game Winning Goals and records Ben Sherritt, 2 GTGs (2014), based on a direct 109-player official profile audit. There is no unsupported 2+ Assist record.

Streaks may cross regular season into playoffs and from season to season. The official chronological source audit covered 371 completed boxscores over all 18 advertised seasons. The career-wide All Seasons - Longest Winning Streak is 7 consecutive games, Jul 10 - Sep 25, 2016, crossing Summer into Winter and game-type boundaries. The All Seasons - Longest Point Streak is 14 games, Oct 29, 2017 - Feb 11, 2018. Those two categories appear above the existing Summer/Winter Team Records categories. All original record values, year scopes and playoff distinctions remain intact.

The individual streak review currently has 14 player careers with full game/season source parity and 71 player careers held for missing appearance evidence. Xav O'Krafka's 8-game verified goal run and David Corasaniti's 21-game verified point run are candidates, NOT yet certified global all-time individual records; no speculative native individual record has been added. All future individual streaks must respect consecutive player appearances across playoffs and seasons, subject to full game-source coverage.

The website history widget now uses 463 official statistical entries and 230 verified player-specific records including Ben Sherritt's Summer GTG. Two ambiguous historic rental-goalie entries stay in the complete Records source rather than being attributed to any player. The original 558-entry milestone-era HTO Records source is archived verbatim. The history widget formats confirmed full dates as e.g. Sep 2, 2026 without altering official source strings, and leaves year-only records as year-only rather than guessing a date.

Release gates: 460 old stat rows exact; 3 new direct official-source rows verified; all 463 current Records entries ordered across 32 individual and 28 team categories; original 281 native HTO Awards intact; 230 player-stat mappings and 2 unresolved source identities; archived 558 preserved; responsive browser CI and production readback required.

## October 28 — exact human-readable date presentation and cross-season streak gate

The authorized HTO Records page has 463 entries: 460 preserved source statistical records, independently verified Summer 2014 Ben Sherritt 2 GTG, All Seasons 7-game team winning streak (Jul 10 - Sep 25, 2016), and 14-game team standings-point streak (Oct 29, 2017 - Feb 11, 2018). All original 281 Awards remain. Category orders group related Goal/2+ Goals/Hat Tricks, Assists/3+ Assist games, Points/3+ Point games, goalie and team statistics. Summer GTG was independently verified against all 109 public player profiles.

For the HTO native Records editor, exactly six records were manually changed to human-readable verified dates without altering their native record IDs/statistics/scope. A public-source readback certifies the six original-to-current ID/date mappings in docs/261028_RCD05_HTO_Native6_Date_Source_Adoption.json. The other 25 official ISO date text rows remain unmodified in native HTO because the editor is shared with other actively used Chrome windows and the safe edit workflow failed closed. No fabricated date: the existing public HockeyOS History widget widgets/history.js now formats ISO YYYY-MM-DD and source ISO 'to' ranges for display using abbreviated month/day/year, including Jun 18, 2017 and May 28 - Jun 25, 2017. This is presentation only; the widget data retains the untouched 25 exact official raw strings. Year-only and Winter season spans (e.g., 2013/14) do not acquire false day dates. The exact frozen old 558 source remains for historical Watch and publication traceability.

Streaks are measured across regular-season/playoff boundaries and successive seasons by design. The official 371-game HTO cross-season source audit supports the two published team all-seasons streaks. Individual goal/point candidate streaks are not certified all-time: only 14 exact-career player source IDs qualified; 71 incomplete career player histories are held. Some held candidate upper bounds exceed the strict certified individual leaders. Preserve 261028_Official_Continuous_TeamPlayer_Streaks_PRIVATE.json and 261028_IndividualStreaks_PotentialUpperBounds_PRIVATE.json as private evidence and do not publish deceptive all-time individual goal/point streak entries until individual appearance parity and upper-bound conflicts resolve. Keep the source-book and game links, source-value/period/season and raw date unchanged.

The live HTO source verification on October 28 confirms 463 Records and 281 Awards; committed HockeyOS snapshots and responsive browser tests are release gates for the History and player Records widgets.
