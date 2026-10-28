# HockeyOS Bio / League-Normalization Product Contract — v1
Date: October 28, 2026 (America/Toronto)  
Owner: HockeyOS Engineering; product decision from the founder's October 28 Bio/Milestone review.  
Status: Source-verified workbook conversion, stage-only code contract; **not an approved live Bio release**.

## Product decision that must survive future chats

The native HTO Stats tab is authoritative for raw season and career totals. The Records and Player Highlights views display **earned official actuals** in their appropriate historical category, including distinct Summer vs Winter records. The Bio is a separate advanced analytics and player-development visualization, not a copy of the Stats table. Never overwrite raw records, award results, milestones, career points, dated source events, game sheets or club records with an equivalent or projection.

The Bio visual style should match the newly polished Milestone Highlights (header, spacing, legible cards, mobile layout and in-place category tabs). User-visible top-level controls: **All, Production, Trends, Goaltending (where relevant), Coaching**. Avoid an obstructive collection of dropdowns, accordions and redundant raw season tables. Main skater historical chart: **stacked goals and assists with an overlaid points-per-game line**, with separate units/axes, accessible values and a source date. Respect missing values, zero-game seasons and zero-point appearances. Game-level charts require a reconciled game-event feed; no inferred appearances or ice time.

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
- [ ] Reconcile a full historical season/game-type mapping for each applicable HTO profile and workbook segment; compare original vs adjusted workbook outputs, preserving regular-season/playoff scope. This mapping is **not yet supplied** by the currently published Bio career feed.
- [ ] Wire a controlled, dated, validated public analytical feed to the Bio. Do not present normalized live player statistics until a source-verified season format and complete source parity exist.
- [ ] Implement Milestone-quality Bio header, five-button in-place category navigation, one combined scoring/rate chart with separate scales, accessible Actual/Winter/Summer toggle, source states and mobile QA.
- [ ] Build authenticated coach-approved lineup/role/season-status instructions; no private notes in public repository.
- [ ] Run all existing 109-player/leadership regression tests plus new normalization tests, confirm no change to HTO Records/Awards/Highlights and publish only after explicit release approval.

Relates to GitHub issue #79; its prior player-Bio installation is complete, but advanced normalization, refreshed UI and protected individual coaching are **separate incomplete milestones**.

## Acceptance examples

- Actual Summer 6 G with verified 48-minute source, selected 32-minute target → equivalent 4 G, actual record remains 6.
- Actual Winter 6 G with verified 32-minute source, selected 48-minute target → equivalent 9 G, actual record remains 6.
- Manager-configured 3×15-minute target compared with 3×12-minute source → factor 45/36; no hard-coded season-name conversion.
- Missing duration, mismatched period-minute totals, unverified season assignment, source/target ambiguity or source GP = 0 → explicit hold or unavailable rate, never fabricate.
- Neither a positive nor a negative normalization test writes to Excel, HTO, award-grant logic, records or a public coaching source.
