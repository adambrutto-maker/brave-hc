# HockeyOS — Sports Village Individual Game Scoring Reconciliation
**Captured:** October 27, 2026  
**Stage:** Official public GameInfo evidence, independent research dataset. Do not overwrite the official player season totals.

## Objective and verified data

Sports Village `TeamInfo.aspx` presents season-level public player GP/G/A/PTS/PIM, and its `gameinfo.aspx?leagueid=...&gameid=...` pages expose per-period scoring events. Goals link directly to an official `playerid` and `teamid`. Assists are *text names only* and are resolved only when the exact normalized name uniquely matches a player on that specific official league-season team roster. Scoring source events do **not** prove a player dressed, participated without scoring, or received a particular number of penalty minutes.

The read-only audit fetched official game/schedule/roster pages for the 22 current adult Sunday clubs and the accepted historical adult competition cohorts. VAHL and noncompetitive placeholder categories were not admitted into this reconciliation. The source is the official Sports Village website, not invented fixtures or names.

### Captured game-sheet counts

| Official season | Sports Village league ID | Reciprocal nonzero-score game sheets read | Score-matched full goal sheets | Held/partial goal sheets |
|---|---:|---:|---:|---:|
| Sunday Winter 2026/27 | 570 | 54 | 52 | 2 |
| Sunday Winter 2025/26 | 547 | 350 | 318 | 32 |
| Sunday Winter 2024/25 | 531 | 343 | 333 | 10 |
| Sunday Winter 2023/24 | 512 | 335 | 309 | 26 |
| Sunday Winter 2022/23 | 494 | 344 | 335 | 9 |
| Sunday Winter 2021/22 | 476 | 321 | 287 | 34 |
| Sunday Winter 2018/19 | 420 | 247 | 238 | 9 |
| Sunday Winter 2016/17 | 375 | 212 | 197 | 15 |
| **Total** | | **2,206** | **2,069** | **137** |

**Scoring event parity** means that every published nonzero final-score goal for both teams in a reciprocal schedule can be attributed to one source-linked official scorer ID. It does not prove that the game sheet's assist text was complete or error-free. Even a score-matched GameInfo sheet can contain unresolved or incorrectly recorded assists; those are separately held.

The first reconciled current 2026/27 GameInfo snapshot contained 54 completed source pairs. At the time, only 43 matched the then-accepted HockeyOS league data by date, exact opponent-team IDs and score. This is explicitly recorded as **source timing disagreement**, not a phantom result or retrospective score correction. The accepted league feed may have updated since the snapshot; consumers must retain source capture dates rather than claiming all games always agree with the newest league feed.

### Player-season comparison results

Across **3,222 archived and current public roster/player-season entries**, game-scoped G/A was accumulated from score-complete sheets only.

- **43 player-season rows** have the published G/A equal to game-event G/A in the admitted complete source-team event-scope (subject to team schedule-scope limitations).
- **2,743** rows have numerical agreement but incomplete source-scope coverage. These are **partial evidence**, *not* fully verified player totals.
- **435** rows show differences between published season G/A and accepted events, or have incomplete source sheets.
- **1** published archived row has an internal G+A versus PTS contradiction and is explicitly **held**.

A difference can arise because GameInfo scoring sheets are missing/incomplete, an opponent team is outside the verified adult archive scope, an assist uses an ambiguous name, the source roster is not up to date, or the Sports Village season statistics are inaccurate. We do not silently repair or reinterpret source data.

**GP and PIM remain unverified.** Goal-scoring logs cannot establish all non-scoring appearances or total penalty minutes. The site may contain penalty rows but converting them to verified player PIM/GP requires a separate independently tested source schema and complete individual game participation source. No such proof is asserted here.

## Data and audit boundaries

The sensitive/full source staging and raw diagnostic audit files remain confined to the authorized BRUTTECH 1 personal environment, separate from TCDSB WORK PC. No workbook values or personal contact data are copied to the public site.

Public, source-scoped read-only evidence is published as:
- `widgets/svhl-player-game-index.json` — current team/player ID bridge, seasonal evidence summaries and original evidence scope/caveats.
- `widgets/svhl-player-game-{570,547,531,512,494,476,420,375}.json` — source game IDs, GameInfo URLs, game page SHA256, final-score parity and player-season G/A event evidence.
- `widgets/player-game-audit.html` and `widgets/player-game-audit.js` — browse the officially sourced league-season team, player and per-game goal/assist evidence, source holds and copy an internal audit.
- `widgets/league-intelligence.html` — link to the game audit from opponent scouting, preserving the exact selected source team name.

No publication is an HTO edit, Sports Village edit, revised published player statistic or verified career record. Historical source ID correspondence relies on original playerID and season-team ID, never display-name-only identity guesses.

## Validation and rollback

Independent validator `scripts/check_svhl_player_game_evidence.py` checks schema; all eight source season shards; unique `gameId` by league; source GameInfo URL and page SHA fingerprints; reciprocal home/away final-score goal parity; scorer IDs and cautiously joined assists against the same season-team roster; season G/A accumulation and source year-count arithmetic. Any incomplete game is held and contributes no accepted scoring events.

Negative tests in `tests/test_svhl_player_game_sources.py` independently reject a fabricated goal, unknown scorer, invalid assist player, changed source hash, duplicate event IDs, incomplete-event promotion and false GP/PIM claims. Chromium `tests/test_svhl_player_game_browser.cjs` tests responsive desktop and 358px phone team/player/season navigation, real event source links, copying an audit and independent source-failure holds.

**Rollback:** revert this scoped feature PR, leaving previously published league results, previous player roster evidence, official source systems, original Master Workbook, previous weekly schedules and live match preparations intact. Do not remove private source receipts while performing a public release rollback.

## Remaining work

Obtain a reliable independently evidenced per-game player appearance source before claiming GP parity; reconcile individual penalty durations against published PIM only when their schema and unique player identities are verified; review 137 held/partial game sheets; and keep the current-season game audit aligned with accepted source snapshots as the league publishes new results. Any future scheduled collector must use source-acceptance gates and must not overwrite historical evidence on a partial failure.
