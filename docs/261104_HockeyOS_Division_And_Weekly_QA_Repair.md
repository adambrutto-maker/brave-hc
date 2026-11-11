# HockeyOS — Dynamic division history and weekly-source test repair

**Date:** November 4, 2026. **Status:** Review-only draft; no published league/source changes.

## Reproduced blocker
The November 4 all-division source-parity run failed on two tests that expected the *current* SVHL division source to reproduce October 26 membership unchanged. The latest source contains further movements while SVHL adjusts the Sunday league: Sugo Sundays returned to Cristillo, Young Guns entered Cristillo, and Degenerates changed divisions. The immutable October 26 source-ledger events (Sugo Sundays exit; Maplewolves arrival) remain preserved. Recomputing a historical membership test from November source rows was invalid.

A separate historical-weekly test set expected exactly one accepted week even though the current public ledger contains two weeks. That assumption would block all subsequent weekly rollovers.

## Implementation (tests only)
- Protect the immutable October 26 movement events directly in the accepted append-only ledger, including source basis, prior/next division and qualified first-arrival scouting context.
- Recompute a hypothetical *current* first-observation movement count using the pinned eight-team baseline and the latest team IDs, rather than asserting the historically observed count against a later snapshot.
- Ensure a repeated snapshot does not add events, overwrite archived teams or change already recorded arrival reports.
- Make weekly tests assert source-relative week counts and full preservation of previously closed weeks, not an obsolete constant of one or two weeks.

No change to `widgets/league-intelligence.json`, `track_svhl_division_movements.py`, `build_svhl_weekly_strength.py`, official HTO/SVHL, family calendar, goalie assignments or past game results.

## Tests (BRUTTECH 1 isolated checkout)
- Previously reproduced: 2/9 movement tests failed; 3/12 weekly tests failed on the accepted November 4 feed.
- After correction: 10/10 movement history, 12/12 weekly ledger, 10/10 league public integrity, 12/12 daily publication, 10/10 schedule-adjusted index, 12/12 trend history, and 6/6 fixture scouting tests passed (72 total).
- Independent source validator: `SVHL_ALL_DIVISIONS_PUBLIC_PARITY_PASS` for 27 tracked teams, 5 published division groups and 74 verified paired games.

## Release gate
This QA repair does not assert that the live schedule or division reshuffle is final. Keep the PR in draft pending the source-provider update and CI review. Schedule corrections under issue #209 remain separately held for manual approval.

## Additional downstream UI/model regression coverage
- Updated the division-fit, division-layout and historical-insights tests to compare source-observed week counts, not the obsolete assumption of exactly one week.
- Exercised the weekly-stability cold-start and synthetic future-week tests using an in-memory **one-week fixture**, leaving the real multiweek public ledger intact; added an assertion that the actual multiweek record is counted without inventing observations.
- Four corresponding JavaScript test suites passed locally on BRUTTECH 1.

## Outstanding independent source holds
Not all all-division CI steps are cleared. Separate checks still report drift in the adult reciprocal-game evidence and mismatches between roster-scoping source IDs/counts; Arena ranking expectations also depend on changing published divisions. These require independent source reconciliation. Do not relax roster identity or reciprocal-score controls merely to obtain a green CI status.
