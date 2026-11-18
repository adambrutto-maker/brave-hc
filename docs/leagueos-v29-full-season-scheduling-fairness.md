# LeagueOS V29 - Commissioner Full-Season Scheduling and Fairness

Date: November 17, 2026 (America/Toronto)
Lead: BruTTech Engineering, with Product direction and QA release gating
Source baseline: V28 merged release c406bbdab9894e05a77e513cf862c38e8d4dd80d, GitHub PR #257
Authority: FICTIONAL BROWSER-ONLY REVIEW, NO LIVE ARENA OR OFFICIAL LEAGUE BOOKINGS

## Purpose

V28 established a two-week ice feasibility and start-time fairness demonstration. V29 adds a single 24-week illustrative schedule under the existing V26 commissioner interface after V27 and V28, preserving navigation and all five fictional role views. This is an additive demonstration. No real team, HTO result, official source game sheet, arena contract, ice slot, referee, payment or external league record was read or written by the scheduler.

## Source boundaries

- V26 invented Northstar Adult Hockey League tenant has 24 entirely fictional teams. The illustrated recommended groups are A North (8), A South (9) and D Recreational (7); absent B/C groups remain absent.
- The sample season has 24 invented Sunday dates, starting 2026-10-25; fictional weeks 13/14 remain January 17 and 24, 2027 to match V28. Those are not verified official league season dates.
- Three invented rinks and four time starts each week at 18:00, 19:30, 21:00 and 22:30, with a 75-minute sample game and 15-minute turnover, produce 288 fictitious slots.
- Repeating the V26 round-robin algorithm across two illustrative 12-week phases produces 264 sample fixtures (11/week). This is a static fictional grouping assumption, NOT a historical season reconstruction or approved future schedule.
- Two invented prior commitments, one each in weeks 13 and 14 at fictional Rink A 18:00, may not be moved by the optimizer. They are NOT external bookings.
- The competing-program scenario blocks one additional fabricated Rink C 22:30 slot in each of the 24 weeks. None of these are verified other-program reservations.
- The generated fixture JSON carries full-file SHA-256 provenance for the V26 and V28 sample source files; unit tests compare both hashes against actual file bytes. Browser source validity also checks structure, immutable fantasy identifiers and denial of all booking authority.

## Capacity what-if decisions

1. All invented rink slots: 288 slots, 264 assignments, 24 buffers. FEASIBLE FICTIONAL DRAFT.
2. One fake other-program reservation per week: 264 available slots, 264 assignments, zero buffer. FEASIBLE FICTIONAL DRAFT.
3. Entire invented Rink C unavailable: 192 slots, 264 fixtures, deficit 72 across 24 weeks. SEASON CAPACITY HOLD, ZERO partial allocations returned.
4. Fixed fictional week-13 slot unavailable: 287 slots, but fixed existing game cannot be honoured. FIXED COMMITMENT CONFLICT HOLD, ZERO partial allocations returned.

The optimizer verifies unique imaginary slot IDs, no team twice in one week, exact week matching, two pinned-game reservations, 48-hour nominal rest and no source system writes. Capacity insufficiency or a missing source/approval snapshot fails closed. A fabricated unapproved B-grade singleton also holds. Final midseason division lock is a proposed product policy, not the official published SVHL rule; after week 12 a previously published FICTIONAL division snapshot is required.

## Start-time equity objective and measurable local results

For each fictitious team, V29 measures cumulative average start, participation-normalized late starts (at or after 21:00) and very-late starts (at or after 22:00), and consecutive late-game streaks. Its deterministic bounded local optimizer tests same-week slot swaps/free-slot substitutions while preserving all fixtures and pinned sample commitments. It only adopts a change when the artificial weighted model penalty decreases.

Full invented-season scenario:
- Slot-first fairness penalty 4549.1709; optimized penalty 50.8978; improvement 98.9 percent.
- Post-optimization spread in team average starts: 4.9 minutes.
- Nine PM or later cumulative starts per team: 9 to 12.
- Ten PM or later cumulative starts per team: 4 to 6.
- Optimizer: 328 accepted improving changes in five passes.
- Booked real slots: ZERO.

Fictional competing-program scenario:
- Baseline penalty 4549.1709, improved to 24.7575 (99.5 percent).
- Zero spare imaginary slots after accommodating all fabricated games.
- Individual-team mean-start-time spread: 18.4 minutes.

These are synthetic model scores only, not calibrated real-player fairness outcomes, complaints reduction, verified arena feasibility, or actual season performance. The V29 24-week score uses a different sample/objective from the V28 two-week 175.8 to 20.6 score and MUST NOT be compared directly.

## Workbench controls

- One panel under the V28 ice planning view inside the existing commissioner experience; no new sidebar item or competing app.
- Four selectable invented ice scenarios and 24 fictional week options.
- Season feasibility, available slots, assigned sample fixtures, and ZERO actual bookings displayed.
- Equity penalty before/after; 9 PM+ and 10 PM+ counts; mock commitments retained.
- Individual game list for each week, complete 24-team season exposure table with game counts, late rates, mean start and streaks, and a 24-week capacity/buffer table.
- Responsive 390px phone layout with internally scrollable tables and no document horizontal overflow.
- Browser-local JSON export with explicit zero real reservations, source transactions, approvals and authentication.

## Implementation files

- scripts/build_leagueos_fictional_season_v29.cjs - deterministic full-season invented source builder.
- scripts/audit_leagueos_season_v29.cjs - reproducible fictional scenario analysis and equity evidence.
- widgets/leagueos-fictitious-season-v29.json - 288 invented slots, 2 pinned fake commitments, 24 fake competing-program blocks.
- widgets/leagueos-season-scheduling-v29.js - qualification, planner, optimizer, UI and browser-local export.
- widgets/leagueos-season-scheduling-v29.css - responsive commissioner panel design.
- widgets/leagueos-connected-demo-v26.js and widgets/leagueos-team-os-demo.html - strictly additive commissioner integration.
- tests/test_leagueos_season_fairness_v29.cjs - 17 V29 source, capacity, policy and tampering unit tests.
- tests/qa_leagueos_season_fairness_v29.cjs - 30 V29 Edge desktop/mobile and zero-write checks.

## Validation evidence on HOME BRUTTECH 1

Checkout root: D:\BruTTech\Products\HockeyOS\LeagueOS_History_Staging_261116\v29-full-season-scheduling-fairness-checkout

- V29-only Node source and logic checks: 17/17 passed.
- Full targeted V18 through V29 Node source regression: 230/230 passed, 0 failures.
- Existing Python source fixtures and settlement checks: 15/15 passed.
- V29 new local Edge browser integration and mobile: 30/30 passed, zero browser errors and zero HTTP mutation requests.
- Reproducible source scenario audit: D:\BruTTech\Products\HockeyOS\LeagueOS_History_Staging_261116\V29_Season_Scheduling_Audit_261117.json
- Edge QA receipt and images: D:\BruTTech\Products\HockeyOS\LeagueOS_History_Staging_261116\v29_qa_V29
- Complete inherited Edge V18-V28 browser regression: 433/433 checks across 11 suites PASS on the V29 local build (the V19 suite reports its count under total=29). New V29 suite 30/30. Full local V18-V29 Edge acceptance: 463/463 checks across 12 suites, no failures.
- Master full-browser results: D:\BruTTech\Products\HockeyOS\LeagueOS_History_Staging_261116\V29_All_Regression_Results_261117.json; individual receipts/screenshots under v29_regress_V18 through v29_regress_V29.
- GitHub Pages success and hosted Edge acceptance remain separate release gates and must be recorded after a reviewed merge.

## Release and further product development gates

V29 can be published only as an explicitly labeled fictional demonstration after clean diff, no-write regression, reviewed PR, successful Pages workflow and hosted readback. No real commissioner is authenticated and no true facility inventory is accessible.

Before actual scheduling, secure written league and facility data authorizations, season/source IDs, complete ice inventory provenance and immutable revisions, other-program conflicts, effective-dated fixture commitments, weekday/team preferences, timezone and DST-aware rest constraints, referee/ice contract constraints, season-long equity baselines, audit trail, commissioner-reviewed approvals, appeal/cancellation/rollback, security/privacy review, and verified integration-specific tests. Real source edits, bookings or venue claims remain prohibited.
