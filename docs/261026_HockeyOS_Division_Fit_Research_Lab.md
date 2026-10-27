# HockeyOS — Division Fit Research Lab
**Date:** October 26, 2026  
**Release scope:** Source-backed exploratory comparisons and a separate league-facing research workspace. No live division assignment changes.

## Why the feature exists
The old League Intelligence page explains current team form but is not a complete model for deciding which teams should share a division. This feature adds a reproducible, transparent, capacity-preserving what-if comparison so BruTTech can prepare evidence for Sports Village while its weekly source history matures.

## Current research sample and exclusions
- Official Sunday Winter 2026/27 (SVHL league 570), accepted HockeyOS public feed and model v1.
- **22 teams in the initial adult Sunday comparison pool:** Fazzari Partners (6), Cristillo (8), Remax (8).
- VAHL's four season entries are shown as a **separate, pending-eligibility competition** and are not casually mixed into the adult team-realignment example. Noncompetitive playoff placeholder also excluded.
- **43** distinct verified completed games have both current participants inside this pool, **16** of which were played between teams in different **currently recorded** divisions; **27** are within current divisions. The divisions at the date of each game are not inferred.
- Current season source only has one weekly observation; sample counts are early, not statistically validated.
- Separate historical source: 79 previously admitted Brave H.C. matches against 35 historical team-seasons, 24 held comparisons. They contextualize historical competition but **do not** silently boost 2026/27 strength or prove continuing roster identity.

## Analysis design
Read-only `widgets/division-fit-model.js` runs in Node and the browser with the identical code. `analyze(league,history)` confirms source schema, official W/L/T and completed-game parity, stable team IDs, a nonpredictive strength index, accepted weekly history, and historic source-provenance restrictions before returning its report.

### Competitive context
- Compute current group average score, min/max range, mean absolute score deviation, and pooled within-group root mean squared dispersion using the existing smoothed descriptive context index.
- Build a once-per-match reciprocal game graph from official participant IDs, date and source score. Count current cross-division links and actual observed goal margins. Treat current division labels as current, not historical game-date assignments.
- Display source date, total games, adult team count, excluded competition, weekly observation count, and historical verification limitations.

### Scenarios (no authority to reassign)
- **CURRENT:** original published divisions, unchanged.
- **LIMITED:** at most two source-ID-based, non-repeating pair swaps between existing groups. Deterministically choose the largest decrease in within-group dispersion. Keep capacities 6/8/8.
- **BANDED:** rank all 22 source-supported adult teams by the accepted descriptive score and create sorted score bands with the same existing capacities, in current average-score order. Retains no claim that the resulting bands represent viable divisions or club consent.

The resulting comparison describes mathematical spread only. It does **not** account fully for roster changes, scheduling conflicts, cost or arena ice-time distribution, promotion/relegation rules, league consent, or future head-to-head results. The model does **not** calculate winning probabilities. The displayed labels say `WHAT_IF_UNAPPROVED`.

## Evidence-release gate
An automated recommendation remains hard-disabled even if numerical indicators improve. An eventual league-facing *proposal for discussion* requires independent review and:
1. At least **four** accepted weekly observations.
2. At least **10** verified games for **75%** of the adult pool.
3. At least **four** source-confirmed games linking present divisions.
4. Human checks on team identities, roster strength/continuity, ice schedules and fairness, league policy and consent.

These conditions are minimum safeguards rather than a guarantee of adequate modelling or league approval.

## UI and outputs
- `widgets/division-fit-lab.html` and `division-fit-lab.js` create a responsive, standalone research dashboard reachable directly from League Intelligence.
- Clickable three-scenario comparison, grouped team-by-team view with actual home division, game-source connection cards, readiness progress, historical match source limits, and a user-triggered **Copy research note** control.
- Research note explicitly marks status as **not an official realignment recommendation**, documents source constraints, and includes numerical results for internal review. A print view supports later presentation prep but nothing is emailed/sent.
- No server, paid service or new scheduled job required; existing 10:15 BRUTTECH 1 publisher and four-hour SVHL↔HTO schedule reconcile tasks are unchanged.

## QA and release / rollback
- Source integrity and scenario invariants: 10 Node model tests cover input holds, adult-pool exclusions, 43 reciprocal current games, 16 cross-division games, 6/8/8 capacities, limited swap upper bound, deterministic output, historical exclusion and no source mutation.
- Chromium desktop (1140 px) and mobile (358 px) runs verify scenario buttons, copied evidence note, no JavaScript errors, source-card counts, and no horizontal page overflow.
- Existing independent league-source CI includes model source tests. Site promotion only after green GitHub CI and live public browser verification.
- **Rollback:** revert the scoped feature PR (standalone research files, link and CI step). Existing league-intelligence and original Master Workbook remain unchanged.
