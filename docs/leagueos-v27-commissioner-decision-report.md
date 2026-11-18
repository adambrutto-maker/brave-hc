# LeagueOS V27 — Commissioner decision report and historical evidence

Date: November 17, 2026 (America/Toronto)
Lead: BruTTech Engineering / Product / QA.
Status: Fictional, browser-local interactive product demo. No official league, HTO, registration, player, standings or facility-booking authority.

## Scope

Build the next **decision-ready commissioner screen** inside the V26 five-role connected LeagueOS / TeamOS / HockeyOS demo, preserving the approved Product direction. Do not add another crowded primary navigation tab or replace the underlying V25 research.

The V27 commissioner review compares:

1. **Current versus proposed competition:** fictional 12 / 12 source divisions compared against proposed A North 8 / A South 9 / D Recreational 7. There are no source B/C teams; do not invent B/C divisions.
2. **Fictional team-strength pairwise gap:** mean source-score distance per within-division team pair, and proportion of large-gap pairs. Commissioner can select illustrative rating thresholds of 250, 300, or 400 points. Current and proposed denominators differ because their division sizes differ. These are not real upcoming matches or win forecasts.
3. **Team movement:** all 24 fictional teams retain original division and proposed division, grade, and an explicit review-move/retain/hold state. An isolated B-strength team produces an under-size hold.
4. **Schedule impact:** the proposed groups generate 22 unslotted matchups across two example weeks; the invented existing game is checked for within-group continuity. No date, rink, referee, facility inventory or booking exists. External league fixture references remain unchanged.
5. **Approval windows:** demonstrate week-5 review and a second midseason review. The final lock activates from week 13 onward. Source rulebook section 2.7.2 concerns the week-5 review and points carry; the midseason final division lock is a new proposed operator policy, not current SVHL law.
6. **Governance and export:** simulated commissioner review and simulated public publication remain separate. JSON download explicitly contains officialLeagueWriteAllowed=false, approvalAuthority=NONE_BROWSER_ONLY, zero official moves and zero booked ice slots. No API writes, notifications or real signatures.

## Retrospective evidence separated from fictional scenario

The strict evidence builder (scripts/build_leagueos_decision_research_v27.cjs) summarizes the previously validated V25 source analysis without copying historical game rows, player IDs or proprietary source code into the demo. The output (widgets/leagueos-decision-research-v27.json) contains source SHA-256, dates, counts, exclusion caveats and a noncausal warning.

The prior result-only prequential Elo study used **15,468 eligible completed games across 116 league seasons**. Model-balanced games had a 16.86% observed five-goal-margin rate across 14,055 games; moderately mismatched games had a 26.65% observed rate across 1,407 games. The association is 9.79 percentage points. The strongest-mismatch bucket had only six source games and is not generalizable.

These are retrospective, observational associations. They do not prove that changing real divisions reduces blowouts, nor that the additional player-roster forecast algorithm improves prediction. The fictional V27 team-score gap is not calibrated to a future goal margin or winning percentage. The commissioner screen retains this separation explicitly.

## Files and integrity

- widgets/leagueos-decision-report-v27.js and .css: independent commissioner decision report with controlled threshold and browser-local export.
- scripts/build_leagueos_decision_research_v27.cjs and widgets/leagueos-decision-research-v27.json: bounded, source-fingerprinted retrospective research context.
- widgets/leagueos-connected-demo-v26.js and widgets/leagueos-team-os-demo.html: minimal additive integration on #league-connected-demo.
- tests/test_leagueos_decision_v27.cjs and tests/qa_leagueos_decision_v27.cjs: source/logic/negative and desktop/mobile acceptance checks.
- This document: Engineering implementation handoff.

Do not copy private workbook files, original HTO HTML/CSS/JS, actual player secrets or raw archived games into the repo. Do not state the browser-local workflows are authenticated or cross-device synchronized.

## Acceptance gates

- 12 new deterministic unit checks; all V18–V26 source/unit suites and Python validation remain passing.
- Desktop and 390px Edge browser checks confirm four KPIs, all 24 team placement evidence rows, threshold sensitivity, orphan-grade hold, week-5/week-12 review, week-13 lock, local export, historic noncausal research and tamper rejection.
- Mobile movement table must scroll **inside** its panel; the document must not overflow.
- No unhandled page errors, official record modifications, league contacts or POST/PUT/PATCH external writes.
- No release claim before PR review, merge, Pages deployment success, public file readback and hosted acceptance.

Next separate work package: source-qualified ice inventory and commissioner decision authorization (with permissions, immutable revisions, conflict resolution, grievances and documented playoff safeguards). A production pilot requires written league agreements and dedicated security/privacy approval.

This increment demonstrates transparent competitive-integrity decision support, **not a proven causal reduction in blowouts or increase in registration**.
