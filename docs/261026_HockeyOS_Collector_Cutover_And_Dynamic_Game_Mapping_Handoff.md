# HockeyOS Five-game collector activation and future date-bound mapping
**Date:** October 26, 2026. **Lead:** Engineering. Supporting Data & AI, independent QA and Media.

## Completed activation
The five-game collector was promoted from an isolated versioned runtime following read-only source validation, strict first-four-game equivalence, consumer shadow replays, and verified atomic write/rollback tests.

Production version: D:\BruTTech\Products\HockeyOS\Runtime\HTOCollector\five-game-source-v1-261026.
Active launcher: D:\BruTTech\Products\HockeyOS\261017_Collect_HTO_Boxscore_Attendance_AUTO.py.
Existing scheduled task: BruTTech_HockeyOS_Workbook_Projection_Refresh (hourly), enabled after verified cutover.
Backup and rollback receipt: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\Publisher Recovery\261026_Five_Game_Collector_Cutover\cutover_receipt.json.
The four original game rows were preserved unchanged. New fifth HTO gameID 3375682 was admitted. Operational 5 GP, 12 G and 19 A from official HTO sources; historical source validation and unknown goalie POTG remain intact.
The original canonical Master Workbook SHA256 is unchanged: 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154.

## Shadow consumer replays
- Player projection bridge in isolated root: PASS, 22 model rows, 21 historical workbook formula rows replayed with zero mismatches, 181 team projected scoring points, modelCurrent=false and explicit two-player exception.
- Hot Stove draft build: PASS, five draft recaps and source-grounded October 25 Braves 6–4 Big Bastones recap. Nothing auto-approved or posted to native HTO.
- Hot Stove roster context: PASS, all five game sheets.
- Record Watch exporter: PASS. Updated 5-game source evidence and active supported streak candidates. The original workbook watch remains historical because its cached career helper and scoring rows are stale; full current milestone claims remain held.

## End-to-end scheduled execution
The existing hourly job was run manually after promotion. Result: exit code 0, eight stages PASS:
read_hto; reconcile_game_boxes; standings; countdown; hot_stove_drafts; projections; hot_stove_roster_context; record_watch.
The publisher staging repository remained clean and on the latest origin/main. The optional Record Watch JSON was published with its historical limitation; approved Hot Stove editorial was untouched. Public projection.json confirms five HTO source games and 181 provisional scoring points. Current player actuals feed remains independent and verified.

## Next Sunday — do not relapse into hardcoded-game failure
A new read-only mapper at scripts/plan_date_bound_hto_game_ids.py verifies source-completed HTO gameIDs against the original Master Schedule's 24 unique 2026–27 regular-season calendar dates and game numbers 359 through 382. The canonical source shows game 364 dated November 1, 2026.
It recognizes the original five audited game IDs/dates/scores as immutable. If another completed HTO Score card is published for a date matching exactly one Master Schedule slot, it can propose that source gameID-to-workbook-game-number link without guessing from opponent names or game sequence. Any altered source hash, unplayed future event, duplicate date/ID, unexpected HTO team, changed result or rescheduling without an exact source slot fails closed. Eight pure source/negative tests PASS, including a clearly synthetic November 1 scenario.
This mapper **is not yet installed in the active hourly collector**. The active v1 package still has a fixed five-game admission map; a newly completed sixth game will correctly HOLD until a versioned dynamic upgrade is accepted. Do not misrepresent this mapping test as end-to-end future-season activation.

## Remaining major gates
1. Integrate verified date-bound discovery into a new separately versioned operational collector; retain the per-player, goalie, canonical game-header, game-ID, season-stat and incomplete-field audits.
2. Replay a sixth-game synthetic fixture through the *complete* operational source adapter/writer and add fault-injection tests for reschedule, duplicate game, unknown goalie value and source/schema changes. Do not tamper with or overwrite the active pinned runtime.
3. After a real next completed HTO game, require official boxscore and HTO season statistics parity before publishing a new forecast.
4. Restore remaining native HTO homepage layout restrictions via backed-up native-editor action (redundant Record Watch/milestone card removal and iframe heights). GitHub widgets cannot delete HTO homepage modules.
5. Review Mohawks HC/Mohawks H.C. and Sugo Sundays/Michelob Morts franchise aliases before publishing combined historical records; preserve exact-name holds.
6. Leave original Master Workbook, original career trend cutoffs and all founder-approved editorials protected.

## Handoff
All current five-game collection and public actuals/standings/provisional projection components are operational. The key next Engineering issue is future completed-game dynamic admission. No further user action was required to perform these read-only safety checks.
