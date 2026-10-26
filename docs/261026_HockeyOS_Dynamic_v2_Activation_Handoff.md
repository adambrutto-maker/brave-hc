# HockeyOS dynamic HTO collector v2 — activation and validation handoff
**Date:** October 26, 2026
**Lead department:** Engineering. Supporting: Data & AI, QA & Testing, Media.

## Executive outcome
BruTTech's BRUTTECH 1 HockeyOS hourly workflow is again operating successfully with a **dynamic date-bound source collector**, rather than a hardcoded five-game map. The collector discovers completed official HTO game IDs and maps them to exact original Master Workbook game-number slots by unique official game date. It never writes the original workbook and never infers a completed game from an upcoming fixture.

Current active runtime: D:\BruTTech\Products\HockeyOS\Runtime\HTOCollector\dynamic-date-bound-v2-261026.
Previous rollback runtime: D:\BruTTech\Products\HockeyOS\Runtime\HTOCollector\five-game-source-v1-261026.
Active hourly task: BruTTech_HockeyOS_Workbook_Projection_Refresh, running each hour around :31.
Active launcher: D:\BruTTech\Products\HockeyOS\261017_Collect_HTO_Boxscore_Attendance_AUTO.py.

## Read-only source and provenance
- Original Master Workbook, 17 sheets, unchanged SHA256: 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154.
- Accepted original schedule has 24 unique regular-season dates, workbook game numbers 359–382 for Winter 2026/27.
- Accepted five completed HTO game IDs: 3356177, 3356178, 3369564, 3375601 and 3375682 map exactly to workbook games 359–363. HTO official skater stats: five team games, 12 goals, 19 assists. Goalie/source parity: one originally documented POTG remains unavailable, never inferred.
- Next scheduled game is November 1, 2026, mapped to Master game number 364. It must not be admitted until official completed HTO boxscore results and season stats exist.
- New HTO results with an unknown date, mismatch to Master Schedule, altered official canonical boxscore URL, missing player/goalie table, invalid score sum, duplicate ID or unverified workbook hash are HELD. A rescheduled game requires review if no unique canonical workbook date matches.
- A source player's PIM/POTG unknown status is preserved as an unknown value with evidence; no false zero replacement.

## Versioned release tests
1. Pure date-bound mapper: eight read-only source/negative tests PASS, including a clearly synthetic sixth game on November 1 mapping to workbook game 364, plus duplicate, future, rescheduled, score and foreign URL refusals.
2. Versioned dynamic operational collector: live five-game check-only PASS with existing source fields.
3. Entire five-game historical accepted player/goalie game data identical to the previous active v1 collector.
4. Isolated HTO dynamic write + backup + compare-and-swap + rollback PASS, source-only private QA root. Production launcher, task, feed and original workbook unchanged throughout these isolated tests.
5. Controlled production cutover: active hourly task temporarily disabled; original five-game launcher/feed copied to a protected recovery directory; new launcher activated; a five-game readback and complete first-five semantic parity PASS; rollback backup verified; task re-enabled. No GitHub/HTO original content or workbook writes during cutover.
6. Manually started full scheduled hourly orchestration after dynamic v2 activation: **ALL EIGHT STAGES PASS**, task exit code 0. Stages: read_hto, reconcile_game_boxes, standings, countdown, hot_stove_drafts, projections, hot_stove_roster_context, record_watch.
7. Production activation attestation: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\261026_Dynamic_Collector_Production_Activation_Receipt.json; state DYNAMIC_DATE_BOUND_COLLECTOR_ACTIVE_VALIDATED. Source SHA hashes rechecked.

## Protected rollback assets
- Dynamic v2 pre-cutover launcher and five-game feed backups with exact SHA256: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\Publisher Recovery\261026_Dynamic_v2_Collector_Cutover.
- Prior v1 cutover original four-game backup (separate); immutable canonical workbook unchanged.
- The historical protected HTO operational v1 source and new v2 source both remain versioned.
- Fail-safe restore: disable hourly task, restore launcher and feed from verified local cutover backups, verify both SHA256, re-enable task and rerun source checks. Do not use git force push or edit original HTO game sheets.

## Public functionality and independent source limits
- Eight-team Cristillo Division standings remain SVHL-published league data. A league posting can lag the official Braves HTO game feed; never rewrite league rows from HTO.
- Team projections show five-game verified current HTO player actuals in parentheses and an independent provisional 181-point workbook-formula scoring scenario. The original 21 historical formula rows replay without discrepancy, but two historical workbook players are not on current HTO. Forecast status remains HTO_MODEL_RECONCILIATION_PENDING and modelCurrent=false.
- Five-game Hot Stove drafts and roster context are generated automatically. Article publication still requires Founder editorial approval; generated copy is not posted automatically.
- Record Watch properly discloses historical workbook milestones and partial source-qualified streak information. It does not claim complete current career records.
- Four exact-match opponents have published historical Brave H.C. W/L/T and GF/GA. Mohawks HC and Sugo Sundays remain unapproved aliases; Other Way is no-exact-history, not 0–0–0.
- Native HTO homepage standalone duplicate milestone module removal and optional fixed iframe height adjustment remain outstanding editor-only actions. GitHub changes do not delete native HTO modules.

## Continuation
The active dynamic source now has no artificial per-game ID list limit for W2026/27. The next real completed HTO result must still pass canonical source, unique workbook date, full individual game boxscore and complete-field season parity. Confirm first new-game acceptance after November 1 using a real source receipt; a synthetic test is not equivalent to a completed official game. Investigate any HOLD before attempting manual overrides.
