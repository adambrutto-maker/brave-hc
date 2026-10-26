# HockeyOS — Upcoming Matchups Connected to Existing SVHL↔HTO Schedule Feed

**Release date:** October 26, 2026  
**Lead:** HockeyOS Engineering and Hockey Data & AI

## Objective

Automatically surface Brave H.C.'s next published games and show the matching League Intelligence scouting reports, without creating a second scheduling service or changing the existing publishing controls.

## Source of truth

The existing HockeyOS `.github/workflows/brave-svhl-sync.yml` workflow already fetches the **official Sports Village hockey league calendar** and reconciles HTO game IDs. Its checked public feed is `widgets/svhl-upcoming.json`, with fields:

- `schema=brave-hc-svhl-schedule/v1`, official `source`, timezone-aware `checkedAt`
- `games[]` with exact date, local time, original opponent, rink, home/away, and signed-off `fixtureSignature`
- `htoSyncStatus=MATCH` and `htoGameId` with `assignmentKey=hto:<ID>` only when the existing reconciler has verified the HTO game record
- `requiresGoalieReconfirmation` and `missingFixtureReviews` from the existing goalie/schedule review process

The Sports Village reconciliation is scheduled every four hours and more frequently around Sunday games. There is no second publisher, no new scheduled task and no competing upcoming-matchup JSON.

## Dashboard behaviour

The existing `league-intelligence.html/js` now fetches the independently maintained `svhl-upcoming.json` as optional data. Existing standings, historical opponent records, schedule-adjusted context, movement history and WhatsApp scouting briefs still load if the schedule source is unavailable.

- Display current and future scheduled dates based on **Toronto local date**, with earliest first.
- Show exact local time, home/away and Sports Village rink.
- Link directly to the HTO game-preview page **only** when `htoSyncStatus`, numeric game ID and `assignmentKey` reconcile. Otherwise display the official Sports Village league schedule link, with the HTO game ID explicitly unavailable.
- Resolve opponent scouting solely against a unique normalized official league-team name in the independently validated League Intelligence feed; unrecognized opponents receive no invented historical or comparative statistics.
- If the schedule was checked within eight hours and the user has not explicitly selected a team, open the next official listed opponent's existing scouting profile automatically. Never automatically select based on a stale feed.
- Do not show past games as upcoming. Show source age, missing-fixture-review count and goalkeeper reconfirmation flag. All score-related predictions remain excluded.

## Initial cross-system record

The source-synchronized October 26 feed documented four `MATCH` game IDs: November 1 Mid Ice Crisis (8:15 p.m. D Rink, away), November 8 Other Way (9:15 p.m. D Rink, home), November 15 Dateline Predators (8:15 p.m. A Rink, home), November 22 Mohawks HC (8:15 p.m. A Rink, home). This is source-reconciled scheduling information, not game-result admission.

## Safety and tests

- Dedicated dynamic fixture-view tests validate the existing upstream feed and do not assume future fixture counts or game outcomes.
- Desktop/phone Chromium tests (1150px/358px) check source-aware fixture selection, independent source hold, existing scouting/clipboard workflows, and zero horizontal overflow or JavaScript errors.
- Existing League Intelligence GitHub workflow invokes the extra source-compatibility tests when UI code changes.
- Read-only scope: no writes to the Master Workbook, HTO administration, source SVHL systems, goalie assignments, approved editorial, player actuals or existing schedule collectors.
- **PR #104 was closed without merging** because a second HTO collector and 10:25 a.m. task would have duplicated the already operational, source-reconciled schedule publisher.

## Rollback

Revert the UI-only pull request; retain the upstream `svhl-upcoming.json` and all source, HTO, goalie and league publishing tasks intact.
