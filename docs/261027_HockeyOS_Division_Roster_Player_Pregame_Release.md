# Brave H.C. HockeyOS — Division-Aware Roster Construction & Pregame Scouting

**Release:** October 26–27, 2026  
**Scope:** Current Sunday Winter Fazzari, Cristillo and Remax only. VAHL remains excluded; original Sports Village league and HTO sources unchanged.

## Implemented public source expansion

A read-only official Sports Village collector reads the exact public roster table from each source-qualified `TeamInfo.aspx` page. It admits only original **leagueId, teamId and playerId** associations; names are display labels, never the basis for cross-season identity joins.

**Verified first capture**
- Current adult Sunday teams: **22**, with **348** current player-roster observations.
- Historical adult team-season pages: **191** across seven archived Sunday Winter seasons: 2016/17, 2018/19, 2021/22 and 2022/23–2025/26.
- Published player-season rows examined: **3,222**.
- Earlier official player observations connected to a current player by the same source player ID: **596**. All historical page URLs and SHA256 source hashes are retained in `historicalRosterManifest` and on linked player entries.
- Current-season scorer stats: published GP, goals, assists, points and PIM. Historical source stats are treated as *published counts only*, not independently verified game-by-game events. Source arithmetic conflicts are held.
- No private Master Workbook, player contact, personal health, birth dates, address, account credentials, private files or unofficial roster in the published roster feed.

The new `widgets/svhl-roster-intelligence.json` is a public-source derivative, independent of `league-intelligence.json`; the latter remains a strictly team-level, official reciprocal completed-game authority.

## Full evidence stack: interpret divisional record in context

**Do not assume a bad team record in a strong division equates to a bad team in another division.** HockeyOS now shows a league-spanning source-qualified strength context alongside actual cross-division results:

- Direct current-season **43** verified completed games within the 22-team adult competition, including **16** source-confirmed games between clubs now in different divisions.
- Cross-division observations by original current division: Fazzari **5–1–2** across 8 games, Cristillo **1–7–0** across 8, Remax **8–6–2** across 16. These are from source-verified reciprocal results and current division labels, **not an equal-division strength projection**.
- Separate division mean of the existing source-qualified descriptive schedule-adjusted context index; team difference from division mean; source verified Brave H.C. historic H2H where allowed.
- Source age, competition opponent strength, nonrandom scheduling, small sample size and unverified roster continuity must remain clear. Raw W/L/T cannot be compared across divisions as though the underlying level of opposition were equal.
- The new model does **not** automatically modify the existing 0–100 numeric score using arbitrary career point weighting.

## Team-building evidence without false certainty

The new `widgets/roster-strength-scouting.js` derives and explains:
- Official published roster size and how many listed players have at least one recorded game;
- Historical player IDs traceable to earlier seasons, players with at least ten archived public games, and number with multiple previous source seasons;
- Top two scorer contribution to **reported** current-season player points, highlighting concentrated versus distributed scoring; and
- Named player priorities with linked official player profiles, their registered goals/assists/appearances, previous confirmed player-ID experience and situation-specific tactical cues.

Players' historical source scores are **not** attendance confirmation, game-specific matchup effectiveness or proof of position if the official POS field is blank. 2026/27 SVHL roster and Brave H.C. HTO game/stat updates can differ in time; one never overwrites the other.

## Pregame named assignments — optional, human-controlled

Each selected opponent’s League Intelligence profile now shows top publicly recorded player threats, plus two optional controls:

1. Choose a Brave H.C. teammate only from the separately admitted official **HTO current-season** roster and recorded player actuals (excluding unidentified placeholders).
2. Choose a specific tactical responsibility: F1 pressure outside, strong winger deny central lane, weak winger protect far lane, defender protect slot/net front, or centre middle/backcheck.

User-triggered **Copy roster-aware pregame plan** produces the source-labelled facts, selected player assignments and explicit `PLANNED ONLY` warnings. Users must confirm actual attendance and role manually before using it. No player message, WhatsApp transmission, attendance write or game-lineup edit is performed.

## New Division Fit Lab roster evidence

The existing source-verified 4/5/6/7/8-team parity-constrained architect and bounded swap-refinement remain unchanged. When the independent roster dataset is admitted, the candidate group cards add:

- Average number of current recorded rostered players,
- Average prior 10+ GP player experience,
- Average returning officially linked player IDs,
- Mean two-player share of registered scoring.

These are additional **qualitative/group evidence factors**; the optimizer does not claim a calibrated talent evaluation or silently put historical points into today's index. Historical player source errors cannot change admitted standings.

## Independent refresh and fail-closed gates

The guarded `scripts/publish_svhl_roster_intelligence.py` can run weekly **Tuesday 11:00 a.m. America/Toronto** on BRUTTECH 1, after the existing 10:15 a.m. main league results publisher. It:
1. Requires clean, checked-out public repo on `main`, fast-forwards verified upstream.
2. Reads only official HTTPS `TeamInfo` league-season/player links; errors hold all publication.
3. Stores a private candidate/QA receipt on BRUTTECH 1, validates all 22 current source teams and each of the 191 archived page SHA fingerprints and player-ID cross-links.
4. Writes **only** `widgets/svhl-roster-intelligence.json` if all independent checks pass and uses non-force git push. Any source format change, changed source counts or team membership requires manual review, never invented rows.
5. Keeps a time-stamped receipt and never edits Master Workbook, HTO admin, official league or current league standings statistics.

**Before installing the weekly task:** successful GitHub independent CI, Pages live browser tests, and a check-only live collection on BRUTTECH 1. Preserve original daily publisher and other tasks. No installation or production publisher run happens from CI.

## QA
- 14 focused source/consumer tests and 6 proposed-division roster tests.
- Independent Python parity check across 22 current and 191 historical source team pages, the 3,222 original player-season observations, 596 current-player historical ID links.
- Desktop and phone Chromium browser tests for cross-division tier explanation, named player priorities, source profile navigation, HTO roster assignment menus, manual role selection, clipboard copy, switching teams, independent source failure, no JS errors and zero page overflow.
- Regression tests for original League Intelligence, schedule, athlete stats, existing division architect and weekly state remain intact.

**Rollback:** Disable only the standalone weekly roster task, revert this feature PR and retain the untouched canonical published official records and source historian files. Retained historic evidence is source-specific and must not be treated as a longitudinal proof that today's roster has always represented a particular franchise.
