# HockeyOS — Verified Weekly Stability and Division-Band Monitoring
**Release date:** October 26, 2026  
**Status:** Read-only analytical feature. Not an official division proposal.

## Goal
Help Brave H.C. and, eventually, Sports Village distinguish early-season noise from repeatable competitive strength. Existing one-week source observations must never be described as performance trends, stable groupings or confirmed division-fit improvements.

## Connected source
This feature exclusively consumes the already admitted `widgets/league-intelligence.json`:

- `weeklyLedger` v1, sourced from the private BRUTTECH 1 10:15 a.m. source-qualified league publisher.
- Accepted Toronto Monday-starting source weeks, each carrying original source timestamp, SHA256 fingerprint, 27 source season-team IDs, actual recorded divisions, verified GP/W/L/T/GF/GA and the existing descriptive context index.
- The adult-league policy admits **22 current teams in only Fazzari, Cristillo and Remax**. The original 27-team provider evidence, including VAHL and the playoff placeholder, is not deleted or changed. Adult comparison uses all 22 same source IDs.
- No supplemental model score, extra live fixture, private roster table or Master Workbook data is fabricated or modified.

## Calculations
`widgets/weekly-strength-stability.js` is a pure deterministic browser and Node module.

1. Validate original public league source identity, weekly ledger schema/count, official source timestamps and fingerprint shape. Verify that every accepted weekly adult team ID is unique and matches the current official team ID and name.
2. **One week:** show baseline only, no week-over-week change, stable percentage, rising/falling list, or band crossing. Until the next distinct source week is accepted, these quantities are **not measurable**—never zero.
3. **Two or more real weeks:** per team show observed context-index difference, adult source rank movement, original official division changes, and whether the team crosses a *research* band. Keep all accepted observed week points individually sourced; do not interpolate a missing Monday.
4. Define the same three fixed-capacity research bands (sizes derived from the current adult division capacities) for all observed weeks, sorted by source descriptor. These bands are descriptive index ranges, not current or proposed league divisions.
5. Summarize how many teams shift research bands in each observed transition, the average absolute index movement, observed official division moves, and the fraction of clubs retaining their research band across the latest actual interval. Explicitly mark skipped calendar weeks and hold a missing/incomplete latest-week cohort.
6. The report's **dataReadyForHumanReview** remains false until at least four complete source observations, 75% of adult teams have ten completed official current games, no missed complete weeks, and qualified source evidence. Even then `recommendationIssued` is hardcoded false; human division governance remains necessary.

## Public UI
The existing `widgets/division-fit-lab.html` now includes **Are team ratings and division bands stable?**, a source-backed team selector (default Brave H.C.), small-screen week-by-week cards, source rank/index/date/GP, observed transition history and clear source uncertainty. The existing Copy research note adds a new weekly-source section and explicitly describes missing measurable history.

No new scheduled task is created. The daily publisher already updates the current week with accepted source results and appends the following Monday's observation while preserving closed weeks.

## Tests and release
The new `tests/test_weekly_strength_stability.cjs` includes 12 cases for the real source baseline; clearly synthetic **QA-only future source snapshots**; actual time gaps; numeric input holds; source IDs/score parity; newly observed official division changes; and source-file immutability. These synthetic records never appear in the public JSON or provider sources.

Independent CI runs these tests on PR and main. Desktop and 358px phone Chromium checks cover the baseline-only status, 22 team selector, actual Brave source card, separate research-scenario views, copied internal notes, and no JavaScript errors/overflow. The actual source publisher, Master Workbook, HTO and official SVHL source never receive write calls.

**Rollback:** revert this scoped UI/module/test/CI PR, leaving source JSON, existing weekly collector and other HockeyOS features untouched.
