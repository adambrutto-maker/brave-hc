# ENG CHAT 63 — HockeyOS Game Centre R3.2 Arena Power Rankings
Date: October 30, 2026 · BRUTTECH 1 · Engineering
Status: Isolated preview release candidate; production R3.1 initially untouched.

## User requirement
Replace the corporate / technical Power Rankings presentation with a compact video-game-like 22-team list. Each club opens Team View; separate Division Fit compares current assignments and research-only scenarios. 50 blue / 75 white / 100 red source-relative strength badge. Separate evidence-gated Hot/Cold form display. No original homepage layout, native Media, Weather, Projections or workbook changes.

## Delivered code
- `widgets/game-centre-arena-r32.html`: separate new preview path reusing existing R3.1 source widgets and all other Game Centre tabs.
- `widgets/arena-power-r32-core.js`: deterministic, source-verified and Node-testable 22-team pool/calibration/badge/contrast/rates/streak/split/comparison/form/observed movement functions.
- `widgets/arena-power-r32.js`: accessible full 22-team leaderboard, row selection, three internal views, compact Team View scouting and Division Fit research. All source names are textContent and not HTML-interpolated.
- `widgets/arena-power-r32.css`: console-hockey leaderboard, compact rows, score badges, rink navy/red/ice accents, responsive controls, high-contrast text, no nested scrollbars.
- `tests/test_arena_power_r32_model.cjs`, `tests/test_arena_r32_browser.cjs`, `tests/test_arena_r32_hto_shell.cjs`: evidence and acceptance tests.

## Data and safeguards
- New source: existing public `league-intelligence.json` on latest main as of 2026-10-30T14:15:06Z; no changes to the official source strength model. The 22 eligible adult Sunday clubs in Fazzari / Cristillo / Remax are individually verified by source ID, completed score and standings parity.
- Relative strength is mapped from accepted current cohort min / median / max to 50 / 75 / 100 (calibrated display only), and uses continuous blue / near-white / red badge. Text chooses black/white based on contrast; measured WCAG contrast >=4.5 across every sampled score from 50–100.
- League and division strength positions are separate. Form Hot/Cold is HELD: only one accepted complete weekly Sunday strength snapshot, insufficient data for opponent-adjusted longitudinal categories. Recent last-3 verified W/L/T can be shown descriptively.
- Team View division splits use opponents' CURRENT listed divisions, explicitly not game-date membership. An original Big Bastones game against x-playoff Schmelts is excluded from the adult-cohort comparison and disclosed as 1 excluded, rather than misclassified or hiding all of its verified adult split.
- Observed Sugo Sundays Cristillo→Remax and Maplewolves entry to Cristillo have unverified official effective dates; before/after impact comparisons remain HELD.
- Division Fit uses original accepted `BraveDivisionFit.analyze(league)`, original readiness gate (four verified weeks, ten games for at least 75% of 22 eligible teams, four cross-current-division source games), and original capacity-preserving pair-swap what-if scenarios. `proposalReady:false`; no official transfer recommendations or automated schedule changes.

## QA — isolated
1. Source model tests: PASS 22/22 teams, calibration endpoints, continuous badge contrast >=4.5, source race/standings parity and every split, actual outside-cohort exclusion, source-move impact holds, source-only Division Fit and stability gates.
2. Isolated browser 1100 / 768 / 625 / 390 / 358 / 326px: PASS; 22 rows without pagination; division filter (6/8/8), source-aware Pts/G and GD/G sorting, selected team views, Sugo move hold, Big Bastones disclosed exclusion, Division Fit what-if lab, existing six Game Centre tabs and authentic blank PDF preserved; no JS errors or 4xx first-party assets, no page overflow.
3. Compact leaderboard height measured 1645–1688px; Team View 1477–1606px; Division Fit 1601–1875px, all below the strict native 2200px iframe height bound.
4. Read-only exact Black Ice HTO-shell simulation: PASS at 1440 / 768 / 390 / 358px; parent listener already preserves strict origin/source, dynamically resizes all three Arena views; Media + Weather + Projections still present; original PDF/standings in other tabs preserved. No native production write occurred.
5. Screenshots at `docs/screenshots/ArenaR32_{wide,hta,tablet,mobile,smallmobile,tight}_{board,team,fit}.png`; QA JSON `docs/QA_ArenaR32_Model.json`, `docs/QA_ArenaR32_Browser.json`, `docs/QA_ArenaR32_HTOShell.json`.

## Controlled release
Publish only new HTML/CSS/JS under the separate new `game-centre-arena-r32.html` path first, while native HTO module `mod157965` still references reviewed R3.1 `game-centre-next.html`. Verify GitHub Pages HTTP 200 and actual public browser QA before any native HTO edit.
Then, if accepted, create native HTO backup template and exact before-source capture; change only iframe URL from next to arena r32 in existing guarded HTML; verify live public six Game Centre tabs, all three Arena internal views, heights <=2200 and preserved Media/Weather/Projections; rollback surgically on failure.
