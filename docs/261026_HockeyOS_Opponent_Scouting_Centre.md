# HockeyOS — Source-qualified opponent scouting centre

Date: October 26, 2026  
Scope: Existing Brave H.C. all-division League Intelligence page. No new private source or API.

## Release objective

Give Brave H.C. a concise game-preparation view of **every team currently in the Cristillo Division**, with a per-team brief that can be copied into WhatsApp. The dashboard remains an evidence viewer; the feature does not send a message, infer future fixtures, predict winning probabilities, or recommend an unverified game plan.

## Source and computation

- Input is the **existing accepted** `widgets/league-intelligence.json` after the independent league-source, reciprocal match, identity, movement, trend, and schedule-adjusted context checks.
- `widgets/league-scouting.js` is a browser/Node-compatible **read-only pure module**. It selects all source-listed Cristillo opponents other than the canonical `Braves HC`, and builds records only for those source-backed team IDs.
- Season W-L-T, GP, goals for/against, per-game rates, source date, current division, observed cross-division opponent counts, and latest five reciprocal verified results are derived directly from accepted `teams[].record` and `teams[].completedGames`. Recent results are sorted by verified game date; no scheduled 0-0 fixtures are interpreted as completed.
- The schedule-adjusted context index and confidence are displayed with existing caveats and the separately recorded Brave H.C. league context. **These are descriptive scores, not win probabilities.**
- Head-to-head records appear only when `bravesMatchHistory.state === SOURCE_VERIFIED_H2H`. Missing history is explicitly unknown, never inferred as 0-0-0.
- Qualified prior-winter evidence is cited separately from the current-season record. The Brave H.C. HTO source may have a more recent completed game than the official SVHL league source: the briefs preserve this source-date boundary.
- The copied report states that no future fixture or date was verified through this component.

## Public UI

The existing League Intelligence page now provides:

1. A source-generated Cristillo opponent board (seven opponents in the October 26 snapshot), opening the matching profile without leaving the page.
2. A selected-team scouting section: league record, GF/GP, GA/GP, verified Brave H.C. H2H where supported, descriptive context comparison and last five source-confirmed results.
3. A **Copy scouting brief for WhatsApp** button: text is written to the clipboard only following the user's click, with success/failure feedback. No message is sent and no external WhatsApp API is invoked.

The original division standings, incoming-team movement history, strength rankings, trend ledger and existing HTO homepage widgets remain unchanged.

## Verification and boundaries

- Node source tests assert current division coverage, mathematical parity, missing-H2H behavior, no future fixture invention, zero-game handling, no mutation, and rejection of mismatched source data.
- Chromium desktop (1150px) and phone (358px) tests assert the seven current opponents, accurate rendered scouting content, actual clipboard event, unchanged historical profiles, no JavaScript errors and no horizontal overflow.
- Future official results and division membership can change. Tests read the accepted source dynamically rather than requiring old scores, identities or historical game counts.
- GitHub League Intelligence workflow runs the independent Node checks alongside existing Python source integrity checks.
- The daily BRUTTECH 1 publisher schedule and source writing scope stay unchanged; static UI publishes through normal GitHub Pages deployment. No Master Workbook, private snapshot, HTO admin or official league data writes.

## Rollback

Revert this scoped PR to remove the new scouting module, UI section, tests and CI step. The previous dashboard and private collector remain independently operational. Do not remove or rewrite accepted league JSON history during rollback.
