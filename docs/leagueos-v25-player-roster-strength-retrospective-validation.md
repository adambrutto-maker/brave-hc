# LeagueOS V25 — Player-level competitive intelligence and division planning

Date: November 17, 2026 (America/Toronto)
Lead: BruTTech Engineering / LeagueOS
Status: Source-qualified public demonstration, NOT an official league classification, schedule or HTO editing service.

## Why the feature exists

Commissioners should see current divisions alongside A–D research-grade recommendations for every night, supported by simple past/current/projected team performance indicators. Behind the scenes, the model considers qualified exact-ID historical player G/A, roster composition, current goal differential and results strength, source-connected leagues and verified cross-night observations. A commissioner should understand what grouping is proposed, why, how strong the evidence is, and how adoption would affect future schedules.

Commercially supportable positioning: **Build divisions with evidence, not guesswork. Make the second half more predictable.** No guarantee of fewer blowouts or increased registration is established.

## Source evidence and privacy

- Verified public SVHL archive: 20,730 reciprocal final games since Winter 2011/12 across 116 league seasons. Disputed games and zero–zero placeholders are excluded.
- Public current four-night roster research: 96 teams rated; 92 qualified team roster pages; four held; 1,440 team-player observations and 70 exact source player IDs seen across nights. Six other playoff-labelled source teams remain outside the rated cohort.
- Public historical player research: 1,350 current exact public source player IDs with appearances; 1,086 have source-qualified earlier seasons and 264 have no admissible earlier stats; 4,384 historical player-stat rows qualify. Private archive database and original source pages are not published.
- Brave H.C. master workbook (local, October 19, 2026): 26 founder-recorded historical A–D division-season labels. Its 168 strength-labelled Brave games break down to B=20, C=82, D=66, A=0. Source win records are recorded only as coach context, not authorized SVHL strength tiers. No private player career rates, contact data, coaching notes or workbook formulas are published in the derived commissioner evidence file.
- HTO public Brave H.C. V20: 23 current source skaters; 21 strict same-team name-and-jersey coach-baseline research matches; two public-only priors. No cross-provider official identity binding.
- Separate league-strength governance: 15 current and 39 historical division-season names remain **without officially approved strength assignments**.

Private inputs must stay outside GitHub. To rerun private historical prior extraction or retrospective testing locally, set the environment variable LEAGUEOS_V25_PRIVATE_ARCHIVE_DB to the already authorized read-only archival SQLite path. The private master source extractor and coach aggregate live outside the repository; a future authorized reviewer must provide the original file before recalculating private coach evidence.

## V25 individual and team projection methods

Player G/A/points and appearance probabilities are modelled from exact public current-season source GP and earlier-season scoring via empirical-Bayes shrinkage toward public league means. Sparse histories have lower confidence. A hypothetical 24-game season produces projected GP/G/A/PTS, not guaranteed future statistics or official records.

Team scores use verified public final game outcomes and source-connected competition context. Historical player continuity, roster scoring concentration and cross-night exact player-ID observations are analyzed. A bounded +/-6% future GF scenario can move research team-rating values by at most +/-15 Elo, but this additive roster adjustment has **not** independently proved a prospective accuracy gain.

The provisional A–D team bands are relative within each night, program and game-connected pool. They are NOT league-certified absolute levels across arenas. Masters and separate programs are protected. No goalie ability, signed lineup, official ice inventory or certified cross-night strength equivalence has been added.

Summer 48-minute and Winter 32-minute source game-duration effects on private career rates have not been completely normalized in the extracted research prior. Predictions therefore remain exploratory and clearly separated from official actuals. The existing polished HockeyOS Player Bio's own canonical projection model is not altered by this TeamOS page.

## Historical prospective-time-ordered backtest

Independent script: scripts/backtest_leagueos_competitive_balance_v25.py.
Public aggregate only: widgets/leagueos-competitive-balance-backtest-v25.json.

For each of 116 archived source league seasons, predict each game BEFORE incorporating its outcome. Then update sequential Elo and rolling prior W-L-T. Evaluate only after 35 calendar days from the first source game of that league season and only where both teams already had at least 3 completed games. This is an approximation of a Week-5 review, NOT verified SVHL official game week 5. No end-of-season roster totals or future scores enter predictions.

| Retrospective classification | Eligible matches | Actual games decided by 5+ goals |
|---|---:|---:|
| All accepted post-35-day matches | 15,468 | 17.77% |
| Pre-game predicted balanced (35–65%) | 14,055 | 16.86% |
| Pre-game predicted moderate mismatch (20–35% or 65–80%) | 1,407 | 26.65% |
| Predicted strong mismatch (outside 20–80%) | 6 | 50%, too few to generalize |

The sequential-Elo Brier-style score was 0.2036, versus 0.2076 for prior rolling records and 0.2190 for neutral 50–50. Relative error improved about **1.9% versus rolling records** and **7.0% versus neutral**. Ties were scored as 0.5 and these are not a three-outcome properly calibrated win/draw/loss probability scores.

The observed moderate-minus-balanced five-goal-blowout difference was 9.79 percentage points. A 1,000-resample fixed-seed **whole-league-season** bootstrap yielded an indicative 95% interval of 7.05–12.47 percentage points.

**This is observational historical discrimination, not causal evidence that changing divisions eliminates blowouts.** Scheduling selection, team composition and strength drift can confound the association. The strong-mismatch sample of six cannot support a separate promotion claim. Roster-weighted incremental predictive gain remains unvalidated.

## Memorial identity and commissioner policies

The Cristillo Division is documented with Brave H.C. in Winter 2025/26 and Winter 2026/27. Its memorial identity is independent of its competitive grade. The simulation can attach the identity to the anchored Braves team across hypothetical group changes; future league adoption and naming approval are required.

Section 2.7.2 of the published SVHL rulebook supports a review after Week 5 and points carried between divisions. A midseason **final lock after Week 12** is an additional proposed policy, not an existing rulebook requirement. The app supports one or two locally adjustable review windows and a six-week minimum buffer before playoffs. After the local final lock, later strength signals can be monitored but do not authorize actual moves. Official publishing needs authenticated commissioner sign-off and a versioned, auditable decision.

The V25 preview generated 552 second-half **UNSLOTTED** draft matchups and identified 66 future source fixtures requiring review if proposed groups were adopted. All 127 original public future fixture references remain source-controlled; no game was rescheduled, cancelled, or booked and no arena ice availability was inferred. Early/late ice-time rotation requires verified facility inventory before it can be enforced.

## Daily update and release safeguards

The existing scheduled postgame workflow rechecks public exact game IDs, admits only independent reciprocal non-placeholder finals after the Toronto game date, rebuilds the league-wide player/team research scenario and refreshes schedule-impact evidence. Newly announced but unplayed fixtures update the discovery and unslotted schedule-review context only, never numeric ratings. A dynamic invariants test separately verifies file SHA-256, all 96 team memberships, output arithmetic, source holds and no official modifications.

The private HTO coach baseline is unavailable to GitHub CI and is **not** rebuilt there automatically. Its TeamOS forecast is a dated, separately qualified manual research snapshot, not live official HTO synchronization. Public league-only derived JSON changes may publish after every source/QA gate is passed; no HTO/SVHL backend writes are possible.

Release gates: unit and source tests; independent browser E2E and 390px mobile; prior V18–V24 regressions; GitHub PR and hosted Pages readback. No official statistics, standings, league schedules, player identities, official division levels, fees, awards or original workbook are modified.
