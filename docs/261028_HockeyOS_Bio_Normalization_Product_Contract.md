# HockeyOS Bio / League-Normalization Product Contract — v1
Date: October 28, 2026 (America/Toronto)  
Owner: HockeyOS Engineering; product decision from the founder's October 28 Bio/Milestone review.  
Status: Source-verified workbook conversion, stage-only code contract; **not an approved live Bio release**.

## Product decision that must survive future chats

The native HTO Stats tab is authoritative for raw season and career totals. The Records and Player Highlights views display **earned official actuals** in their appropriate historical category, including distinct Summer vs Winter records. The Bio is a separate advanced analytics and player-development visualization, not a copy of the Stats table. Never overwrite raw records, award results, milestones, career points, dated source events, game sheets or club records with an equivalent or projection.

The Bio visual style should match the newly polished Milestone Highlights (header, spacing, legible cards, mobile layout and in-place category tabs). User-visible top-level controls: **All, Production, Trends, Goaltending (where relevant), Coaching**. Avoid an obstructive collection of dropdowns, accordions and redundant raw season tables. Main skater historical chart: **raw actual goals and assists remain the stacked bars** while **ONLY the overlaid points-per-game line** changes with No adjustment / Winter-adjusted / Summer-adjusted. Provide separate axes, accessible values, source date, and missing-rate gaps for unverified historic format mappings. Respect missing values, zero-game seasons and zero-point appearances. Game-level charts require a reconciled game-event feed; no inferred appearances or ice time.

## Verified original Master Workbook calculations

Read-only workbook inspection (2026-10-28) of:
D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx

Verified structured table: **SkaterStatsByGame** on **Player Game Logs**.

- **W Adj. G:** if Summer, G × (32/48); otherwise unchanged.
- **S Adj. G:** if Winter, G × (48/32); otherwise unchanged.
- **W Adj. A** and **S Adj. A:** identical corresponding factors for assists.
- **W Adj. Pts:** sum of adjusted goals plus adjusted assists.
- **S Adj. Pts:** sum of Summer-adjusted goals plus Summer-adjusted assists.
- **GoalieStatsByGame:** separate **W Adj. GA** and **S Adj. GA** using the same respective duration factors for goals against. Do not apply this to goalkeeper wins or official GAA without its own source specification.
- **Master Schedule:** also contains Summer/Winter season-length parameters (10 and 23 games as saved). These are **not** part of the game-duration conversion.
- **Workbook field PPG means power-play goals.** True points-per-game = points / actual games played, with no rate when GP = 0.

The Brave H.C. historical reference configurations are 48 regulation minutes per Summer game and 32 regulation minutes per Winter game, as confirmed by these workbook formulas. Individual period durations have not been verified: do not invent periods. The source workbook is not in this public repository and has not been modified.

## Bidirectional and commercial definition

Given a manager-approved source game format and target game format:

**factor = target_regulation_game_minutes / source_regulation_game_minutes**

- equivalent_goals = actual_goals × factor
- equivalent_assists = actual_assists × factor
- equivalent_points = equivalent_goals + equivalent_assists
- equivalent_points_per_game = equivalent_points / actual_GP (only GP > 0)

No rounding before aggregation; display rounding is optional and never persisted to authoritative sources.

For Brave H.C.: six Summer goals × 32/48 = **four Winter-equivalent goals**; six Winter goals × 48/32 = **nine Summer-equivalent goals**. Both are analytic examples. Official Summer and Winter record lines remain six goals, each in its recorded context.

Managers of other leagues must be able to set **league/team context, regulation game minutes, period count and durations, season-format history, current comparison reference, and per-game-type exceptions**. Game minutes and summed period minutes must reconcile if both provided. Save a historical snapshot for each supported season/game type; do not apply the latest settings retrospectively. No public team defaults should be confused with a verified per-season mapping.

Recommended comparative views:
1. **Actual** — raw recorded statistics, no equivalence claim.
2. **Current league format** — the manager-selected reference format; for current Brave H.C. Winter operations, default to Winter-equivalent.
3. **Alternate/custom format** — e.g. Summer-equivalent or a manager-approved custom target.

A separate **season-length projection** may eventually be implemented as a clearly labelled scenario, using actual appearances, chosen target-game count and properly normalized per-game production. Never pass a projected total to the Records or Awards pipelines.

## Native player Bio projection — share data, not homepage UI

- Homepage Projections and the player Bio both consume the same already-published widgets/projection.json: schema brave-hc-workbook-projection/v1, model BravesRegularSeasonProjection. Do not fork or recompute the workbook forecast or make a points-per-game extrapolation.
- The selected player has their OWN polished, responsive projection panel INSIDE the Bio, with model-published projected GP, G, A, PTS and projected Pts/GP. The model Pts/GP is not the ratio of rounded display totals.
- Match each row by the verified official HTO player ID through the shared name resolver; reject duplicates, ambiguous names and missing source, never assign invented zeros.
- October 28, 2026 published feed is provisional: modelCurrent=false, projectionComplete=false, publicationStatus=HTO_MODEL_RECONCILIATION_PENDING, five verified HTO games versus the older one-game workbook baseline. Never describe it as a certified current projection or actual stats. Explicitly disclose source dates and both input coverages.
- HTO current GP/G/A/PTS actuals are separate, source dated, and never added to the projected full-season model values.
- Homepage redesign remains deliberately deferred until Bio first; never embed the homepage widget or merely link to it as the player Bio experience.
- No changes to official HTO records, AwardsScoring, original Master Workbook, private player coaching, or native HTO profile editors.

## Data contract and safeguards

- Save format definitions with IDs, game minutes/period durations and a verification state; each historic season/game type binds to its source format with its own evidence/version. An unverified, conflicting or missing assignment results in HELD, not a guessed number.
- The analytics engine must be pure, preserve the input row, return explicit actual vs equivalent namespaces, and never generate a new official record field or publish raw player-private data.
- Existing HTO archive captures may contain all game types under a single season. A mismatch with a regular-season-only workbook should hold rather than silently claim parity.
- Goals, assists and points require source-verified values; GP is unchanged. Current-season and career archive snapshots can have different dates; show both, do not combine on an implied common date.
- Goalie views may show separate equivalent goals-against if provenance supports the role-specific calculation. Wins, shutouts, save rate, official GAA, appearances and game-level outcomes remain actual.
- Provenance and the selected reference should be visible beside comparisons. An approximate equivalent is not an earned milestone or record; no badge or award is generated.
- Private game-specific coaching comes from a separately authenticated source and requires confirmed lineup/attendance status, role, coach authorization, and appropriate visibility. The public Bio may show approved general system cues only.

## Implementation inventory and release gates

- [x] Verify original 32/48 and 48/32 workbook source formulas via read-only inspection.
- [x] Capture standing requirements in repository instructions and product contract.
- [x] Stage pure duration-normalization module, format configuration and positive/negative regression tests on a feature branch.
- [x] Read-only verification: all **18 of 18** career-archive season labels map to original Master Schedule season codes and S/W duration factors for all published game types. Source receipt: docs/261028_Bio_Historical_Duration_Mapping_Evidence.md. Note: full player-level HTO versus Master Workbook game-stat parity remains a separate outstanding data-quality task.
- [x] Wire a source-gated historic season-length conversion reference to the Bio's Pts/GP line using original HTO season totals and separately verified 18 season code/duration mappings. Never change raw G/A chart bars, official records or career statistics. Preserve distinct source capture dates and all-game-type scope.
- [x] Stage Milestone-quality Bio header, five in-place category buttons, RAW stacked G/A plus adjustable rate line (Actual/Winter/Summer), responsive screen layout and accessible season inspection. 109-player browser regression passed; production release still gated.
- [x] Stage native individual skater projection cards driven by the single homepage forecast JSON, with provisional status and source date/identity validation; homepage redesign intentionally out of scope. Numerical goalie projection is separately held.
- [ ] Build authenticated coach-approved lineup/role/season-status instructions; no private notes in public repository.
- [x] Execute 109-profile premium mobile/desktop browser tests and 17 normalization contract tests. [ ] Complete final source checks, visual review, draft PR CI and human release approval; no live publication has yet occurred.

Relates to GitHub issue #79; its prior player-Bio installation is complete, but advanced normalization, refreshed UI and protected individual coaching are **separate incomplete milestones**.

## Acceptance examples

- Actual Summer 6 G with verified 48-minute source, selected 32-minute target → equivalent 4 G, actual record remains 6.
- Actual Winter 6 G with verified 32-minute source, selected 48-minute target → equivalent 9 G, actual record remains 6.
- Manager-configured 3×15-minute target compared with 3×12-minute source → factor 45/36; no hard-coded season-name conversion.
- Missing duration, mismatched period-minute totals, unverified season assignment, source/target ambiguity or source GP = 0 → explicit hold or unavailable rate, never fabricate.
- Neither a positive nor a negative normalization test writes to Excel, HTO, award-grant logic, records or a public coaching source.


## New goaltender projection and schedule-adjustment contract (2026-10-28)

- **Skaters:** retain the existing workbook-authoritative BravesRegularSeasonProjection. The Bio renders its published model-derived forecast directly. An opponent-aware extension must build on that model, not replace its existing attendance, FT/CU/DI and career/current coefficients with a simplified extrapolation. It must be separately versioned, source-checked and back-tested before modifying live values.
- **Goalies:** build a distinct Goalie Projection v0.1 with the same principles of historical attendance and increasing current-season weighting over completed team games. Inputs require verified current goalie appearances/W-L-T/GA, original historical goalie appearances and corresponding team season game counts, remaining verified schedule, and verified goalie participation eligibility. Output would include expected appearances, wins, total goals allowed, and goals against per appearance; all as estimates, never official results.
- **Game time:** historical Summer vs Winter game duration must be normalized before comparing goalie goals allowed per appearance. Official goalie GAA and saves are not automatically inferred; HTO historical shots-against fields have known reliability questions. No fantasy-style fabricated save percentage or shutouts.
- **Opponent context:** the existing source-qualified opponent-intelligence.json and SVHL fixtures can be shown descriptively in the Bio immediately. Use only verified exact-team/source-game identity. When a future matchup-adjustment model has independently validated predictive effects, apply it only to approved future fixtures. A never-before-met opponent uses a broad neutral baseline instead of a fabricated head-to-head comparison. The current descriptive strength index is not a calibrated win probability.
- **Coaching:** game-specific coaching is private, accessible only when the player is confirmed in an authorized lineup and a coach-approved position/assignment exists. Public users see general system cues and publicly verified schedule context only.
- **Important data gap:** the browser may show a polished goalie chart of actual historical W/GAA, but numerical 2026/27 goalie forecasts remain HELD until a complete dated team-game attendance denominator and verified current goalie W/L/T/GA source join exist. This must be explicit in the view.
- **2026/27 source alignment:** the HTO five-game current team readback and the older one-game workbook model baseline remain different snapshots. Do not silently merge them.
