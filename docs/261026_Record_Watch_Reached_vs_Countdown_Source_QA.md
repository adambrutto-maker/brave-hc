# Brave H.C. Record Watch — historical milestone / countdown contract repair
Date: October 26, 2026
Lead: QA & Testing; Supporting Data & AI / Engineering.

## Failure that triggered repair
GitHub Actions run 40347574231 (Brave H.C. record source refresh) failed at 'Verify HTO historical Watch source-matching rules (no publication)'. Six of twelve old Node tests failed after the valid five-game Watch export expanded its records array from two 'reached' milestones to four entries: two countdown entries and the two existing reached milestones.

Actual current source:
- Reached: Justin Carosi — 300 Game Club on September 20, 2026; Michael Provenzano — 50 Point Club on September 27, 2026. Both still require a unique matching HTO historical record line.
- Countdown: Adam Kober — 2 games away from 50 career games (48/50); Keith Pearsoll — 2 games away from 300 (298/300). Neither is treated as a completed milestone.
- Latest official completed game date in source: October 25, 2026 (the prior test incorrectly expected October 18).
- Watch source retains HISTORICAL_WORKBOOK_SNAPSHOT and verified-supported-categories-partial. Full career records are not proclaimed current.

## Correctness change
- widgets/watch-evidence.js validates countdown records separately: supported category, valid player name, integer threshold, positive current career total, 1–2 games remaining, current + remaining = threshold, eventDate null, source attribution and duplicate detection. Countdown never enters the HTO verified 'reached' history list.
- Existing reached milestone gate still requires historical HTO records archive authority, exact player/category/threshold/date match, no future event, one uniquely matching record and no duplicates.
- Historical capture/source chronology and existing partial-vs-current disclaimer remain.
- New return field 'countdownArithmeticChecks' means arithmetic and source attribution were checked, NOT that the countdown was independently verified as a completed HTO achievement.
- tests/test_watch_historical_evidence.js was updated to choose reached records explicitly in mutation tests, use October 25 as the source's current latest completed game date, and add three negative cases for countdown abuse.

## Acceptance and safety
Node local tests: 15 / 15 PASS. Both reached entries maintain the exact HTO archive match. Invalid countdown arithmetic, duplicate countdown or a false 'reached' conversion is held. No award category or false milestone is added. No Master Workbook, original HTO stats, verified public achievements or editorial copy changed.

## Release gate
Merge through an attributable PR. The existing GitHub record-source-refresh workflow has both a changed-file push trigger for this test and validator, and workflow_dispatch. Verify an actual successful GitHub Actions run at the merged commit before declaring the automated Record Source Refresh restored. If a later independent source gate holds, report the specific step without relaxing its controls.
