# ENG CHAT 59 — HockeyOS Opponent Scouting & Division Intelligence
**Date:** 2026-10-27 | **Status:** Engineering release candidate, not deployed | **Scope:** SVHL only

## Verified source baseline
- Repository: `adambrutto-maker/brave-hc`; integration starting at `d0dbe914824bc29254bdbf197f71e3cfb23e01e9`.
- Separate BRUTTECH 1 checkout: `Implementation Control/ENG_CHAT59_HockeyOS_20261027`, branch `feat/hockeyos-eng59-game-reconciliation-division-intel-261027`. The heavily modified wider `D:/BruTTech` monorepo was not used for commits.
- Existing functionality preserved: live league intelligence, source-linked opponent reports, 109 Bio profiles, historical roster-era research, existing source-only division layouts, lineup refinement, mobile Essentials/All data UX, copyable game-day notes, Awards, GO-06 and other workstreams.
- The CI source check reports 27 published league teams, 61 reciprocal completed games; **the adult Sunday research scope is narrower**, 22 current source-team IDs in Fazzari Partners, The Cristillo Division and Remax Division, with 54 paired games, including 19 cross-current-division games. VAHL is a separate league and excluded.
- Eight player-game leagues: 2,206 official GameInfo game pages; 2,069 pass full scoring-goal parity; 137 partial or held. This is **scoring-game reconciliation**, not proof of complete player attendance/GP.
- Historical Brave H.C. comparison: 79 source-matched games across 35 season-team groups, 43 unresolved/held comparisons. Season/name overlaps are not automatically continuing-franchise identities.
- Roster-history scope: 348 current player identities, 3,222 historical player-season observations, 191 verified historical team source entries. Identity uses published official player ID, not names alone.
- Penalty audit: 136 sampled GameInfo pages across 8 seasons, zero populated penalty rows observed. This **cannot** certify zero penalties or complete PIM/GP.

## This branch's completed implementation
1. **Explicit individual-game identity holds:** `widgets/division-fit-model.js` now rejects a second same-team/same-date/opponent entry with no distinct official game ID (`AMBIGUOUS_SAME_DAY_PAIR_NO_SOURCE_GAME_ID`). It also rejects games without their reciprocal team-side source record (`RECIPROCAL_SOURCE_GAME_SIDE_MISSING`). A game is no longer silently coalesced, and provenance limitations appear in the analytic result. Official canonical league data remains untouched.
2. **Regression tests:** Added doubleheader ambiguity, missing reciprocal source, and evidence-policy tests to `tests/test_division_fit_model.cjs`. A legitimate two-sided same-day pair continues to count once.
3. **Auditable reconciliation coverage report:** `scripts/report_hockeyos_scouting_coverage.py` generates a deterministic, read-only, schema-validated source coverage and limitation report. Checked JSON is at `docs/ENG59_HockeyOS_Scouting_Coverage_20261027.json`. Source capture times are separately reported rather than represented as a single synchronized snapshot.
4. **Failure-mode QA:** `tests/test_hockeyos_scouting_coverage_report.py` rejects fabricated full-goal parity, manufactured franchise continuity, mismatched roster totals, and overstated penalty sampling.
5. **CI:** Extended league-intelligence workflow triggers and parity job to run the independent coverage report and new failure-mode tests.
6. **Browser QA modernization:** Updated stale game totals in division, roster and full-league browser tests from historic hard-coded scores to current source-comparison checks; All data controls are now explicitly revealed before testing advanced interactions. Verified that a former swap proposal must not be forced when accepted source results no longer support an objective improvement.

## QA evidence
- Five key published-source integrity scripts: PASS (league, historical Brave, roster, player-game, sampled penalties).
- 25 pre-existing targeted Python/Node source suites: PASS, zero failed.
- 13 division-fit source tests (including three new identity tests), 15 layout optimizer, 12 refinement tests: PASS.
- Five new coverage-report failure-mode tests: PASS.
- Edge/Puppeteer independent local browser smoke (no source repo npm install): `test_svhl_player_game_browser.cjs`, `test_division_fit_browser.cjs`, `test_svhl_roster_scout_browser.cjs`, `test_svhl_league_intelligence_browser.cjs` all PASS at desktop and 358px width, with no page overflow or uncaught JS errors. Source-failure holds and copy affordances checked. Dependencies installed outside Git checkout in `Implementation Control/ENG_CHAT59_Browser_Tooling`.
- `git diff --check`: PASS at local pre-PR review.

## Model and user-facing interpretation
- Individual games supplement overall standings with same-opponent and shared-opposition context, but the score model is descriptive and source-limited; cross-division difficulty is not equated across unlike divisions.
- Player histories can identify recorded roster experience and recorded goal production; they do not establish an upcoming active lineup or fully verified player ability, shift counts, defensive reliability, GP or fitness.
- Proposed divisions use actual source ID inventories, 4/6/8-team even groups, and one 5/7-team odd group *only* when the total is odd. The model considers rating dispersion, verified previous matchups, schedule/administrative burden, continuity and limited bounded evidence-aware swaps; no actual fixture is simulated.
- A source week cannot establish stable division skill tiers. Counterfactuals and player assignments remain research/coach approval items.
- Existing Essentials/All data progressive disclosure is preserved for seniors on narrow phones. Pre-game summaries are copyable but no WhatsApp message or lineup is sent.

## Unresolved evidence and control gates
- The 137 incomplete or unsupported GameInfo pages remain explicitly held; pursue official boxscores or original source correction rather than invented remediation.
- The 43 historical comparison holds remain untouched and no reconstructed franchise continuity is asserted.
- Official distinct IDs are still required to safely admit same-day rematches. New validation deliberately holds such source ambiguity, so there is no fabricated automatic reconciliation of those doubleheaders.
- GoalInfo/roster totals do not establish complete individual appearances; penalty sample is not full season coverage and missing rows do not imply zero PIM.
- Current results, roster and penalty captures have different timestamps, so a daily refresh is not inherently source-synchronous.
- Division structure cannot be adopted without league authorization, scheduling constraints, verified team continuity and meaningful weekly sample depth.
- Player matchups are proposed based on history and coached system concepts; verified future game attendance and individual coaching approval remain necessary.
- **Publication held:** draft PR/CI success must be checked independently before any merge, website deployment or native Bio edits. No public widget publication, league realignment, player Bio edits, Awards/GO-06 changes or external messages were authorized by this work.

## Controlled release
Review the draft PR's changed-file list (only HockeyOS division model, tests, coverage report and league-intelligence CI). Confirm fresh GitHub CI source parity and browser evidence. Merge only after explicit release review; do not modify scheduled automation or canonical league data to advance this change.
