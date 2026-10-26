# HockeyOS — Source-qualified game-day WhatsApp preparation
Date: October 26, 2026

## Scope

Extends the newly deployed SVHL–HTO next-game scouting dashboard with **a user-triggered copy control**, not a WhatsApp sending service.

## Method

- The existing SVHL↔HTO schedule workflow continues to supply dates, local times, home/away, Sports Village rink, and HTO `MATCH`/game-ID evidence in `widgets/svhl-upcoming.json`.
- `widgets/league-intelligence.json` remains the only qualified source for the opponent's verified completed games, goals for/against, schedule-adjusted context, approved Brave H.C. history, and roster-qualified previous-winter context.
- `widgets/league-scouting.js` now accepts an optional fixture only when its original schedule signature matches the opponent name and the HTO preview URL matches the exact sanctioned host, game ID, team account and `p=preview`. A mismatched identity fails closed.
- When a user clicks **Copy game-day WhatsApp brief**, the application assembles the next game's source-labelled schedule and existing verified scouting facts, including source timestamps, uncertainty notices and the league source URL.
- Goalie status is never inferred from absence of the `requiresGoalieReconfirmation` flag. The briefing directs readers to the approved goalie-manager record. A positive reconfirmation flag is explicitly noted.
- Copying requires a user click and browser clipboard permission. Nothing is sent or scheduled, and no HTO or SVHL record is modified.
- The copy action is disabled when the reconciled schedule source is more than eight hours old.
- The original **Copy scouting brief for WhatsApp** control still works and deliberately does not assert a future fixture, because it is a separate report scoped only to verified results.

## Validation

- 11 source/negative JavaScript tests include source-matched game-day schedules, goalie disclaimers, correct HTO preview URL and refusal of altered names or game IDs.
- Desktop/mobile Chromium tests check the actual clipboard interaction, no false future-match claims, existing profile navigation and no JavaScript errors.
- The existing League Intelligence GitHub source-parity workflow runs the completed scaffolding. No second source task, publisher, workbook edit or paid infrastructure.

## Rollback

Revert this scoped UI/module/test change. The existing SVHL schedule, source league standings, published next-matchup detection and daily scheduling remain intact.
