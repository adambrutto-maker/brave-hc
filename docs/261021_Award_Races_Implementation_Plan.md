# Brave H.C. Award Races
## Consolidated Implementation Plan | Version 1.14

**Updated:** October 21, 2026 (America/Toronto)
**Sponsor:** Adam Brutto | **Delivery lead:** Engineering / Jacob AI role
**Current position:** All formula arithmetic stages and 220 eligibility decisions are implemented. Fifteen current display components are rebuilt; eligible Rookie skaters have 11 of 12 required components (PIM remains). Carlyle's native DI copy passes 1,956,786 cell checks. Corrected native input/reliability comparison passes 106 checks; saved-file/cache preservation passes, while legacy award-list population remains held. HOF downstream arithmetic passes 999 comparisons across 111 career players; career inputs, composite parity, integration and release remain open.

### Purpose and authority
Deliver a reliable Award Races widget that follows the original award methodology, explains its ratings clearly, and refreshes from accepted HockeyOS statistics without repeated manual reconstruction.

This is the detailed Award Races subplan under the existing Brave H.C. HockeyOS master workplan. It consolidates this chat's implementation work; it does not replace the parent plan or take over records, articles, attendance, WhatsApp or player-profile rollout. The repository copy is the working task record. The PDF is a dated reading copy generated from the same text. Update this file and its stable task IDs rather than creating a competing plan for each session.

### What is already established
- The review branch contains eleven category views, component cards, source-readiness controls and weekly-history handling. These are existing assets to reuse.
- Original AwardScoring formulas are captured: 146 columns, including 132 stored array-formula columns. Composition mapping covers eight composite models and two count titles; Hall of Fame requires its own career-rule validation.
- A disposable native Excel replay updated 14 matched rows and added 43 appearances. All 565 nonmissing input writes and untouched historical raw inputs passed saved-file checks. The 146 scoring formulas retained their modes; Excel reported no award-cell errors.
- The initial replay exposed stale season PivotTable caches. Explicit native refresh recovered all 40 added skater and three added goalie appearances and season outputs of 6 goals, 10 assists and 16 points. Never overwrite PivotTable output cells. The completed reference refreshed both caches, rebuilt all downstream formulas and saved with no award-cell errors.
- Adam confirmed Damian Pavaday is DI. A new review copy now contains his PlayerInfo and W2026/27 roster rows. Eight inputs and 1,955,411 existing cells passed preservation checks. Current DI status excludes him from the FT-only Rookie race without guessing a first FT year. The original 41 missing skater PIM and one missing goalie POTG observations remain null in the source fixture. A separate derived fixture resolves each to zero using matching season totals, complete appearance coverage and nonnegative additive counts; all 42 equations and their provenance are retained.
- The latest local validation passed 85 JavaScript tests; the expanded Python suite now passes 183 tests. Eight final-score models pass 192 saved native comparisons. Dedication now rounds to whole numbers by Adam's correction; one-decimal arithmetic remains audit-only. This is not complete current composite validation.

### Critical path
Reconcile all source inputs -> repair the disposable reference -> prove complete native results -> implement matching production calculations -> verify category displays -> release the reviewed candidate -> demonstrate repeatable refresh.

**Immediate next task: AW-02 / AW-08.** Validate the remaining composite input matrix and historical baselines, then assemble the corrected current chain. Reuse the verified internal, display and raw-composite stages rather than translating each remaining scalar branch separately.

<!-- PAGE -->
# 1. One data contract and one calculation path

### Source responsibilities
| Source | Authoritative role | Implementation requirement |
| --- | --- | --- |
| Accepted HTO statistics | Published game and season observations, including later corrections | Capture both game logs and season totals at the same cutoff; retain source IDs, raw values and observed time. |
| Original hockey workbook | Award methodology, historical inputs and legacy calculation reference | Preserve the original. Read it as evidence; validate repairs and imports in a separate copy. |
| HockeyOS accepted data | Joined, versioned inputs used for production | Reuse the existing data and collector infrastructure. Do not create a separate awards database with competing facts. |
| Native review copy | Reference output for a fully specified input version | Supply all required inputs, preserve calculation semantics, and export intermediate and final values for comparison. |
| Widget snapshot | Public presentation of verified category results | Carry season, cutoff, model version, input version, generation time and category status. Never calculate a different scoring model in the browser. |

The game-log and season-total inputs must reconcile before they become one accepted input version. A disagreement becomes an exception; neither source is silently chosen because its value produces a plausible rating. Correcting the original workbook is not a prerequisite for delivering the production widget.

### Required input groups
- Stable player IDs and explicit aliases; skater/goalie roles, position groups and roster status by effective season/date.
- Per-game appearances and statistics; game identity, season, phase, accepted result and revision state.
- Separate skater and goalie season totals in the exact structures consumed by the workbook.
- PlayerInfo metadata, rookie year and role classification; RosterStatusBySeason denominators; SeasonInfo and Master Schedule selectors and phase controls.
- Prior-career, all-time and playoff baselines required by the captured formulas. Map all 255 distinct PlayerInfo dependencies already identified, plus direct cells, named ranges and other table dependencies.
- Missingness and provenance. A blank, unknown, zero, not-applicable value and excluded identity must remain distinguishable.

### Category contract
Hart; Conn Smythe; Norris; Art Ross; Rocket Richard; Rookie of the Year; Lady Byng; Most Improved; Rolaids Relief Man; Andrew Cristillo Dedication; Hall of Fame.

Each category must define its input dependencies, season/phase, eligible population, thresholds, score calculation, tie ordering, display fields and unavailable-data behaviour. Preserve workbook weights, role branches, rounding and summer/winter adjustments. Do not normalize the Norris utility weight total of 0.975 to 1.0 or replace its lower position constant.

Art Ross and Rocket display verified counting statistics, not invented OVRs. Hall of Fame remains a career-recognition view with its own verified rules. Count titles may ship independently when fully verified; missing PIM must not unnecessarily block an unrelated verified count title.

<!-- PAGE -->
# 2. Task register: source repair

Statuses describe evidence, not effort. Complete requires the stated output and acceptance evidence. Ready means work can start. Blocked identifies a specific dependency. Owner labels below are AI delivery/review responsibilities, not evidence that a named reviewer has already acted.

### AW-01 | Consolidate the delivery record
**Owner:** Delivery lead | **Status:** Complete - this plan | **Dependency:** None
Keep one task register, issue list, evidence index and next action. Link the review branch and parent workplan. Preserve prior findings as evidence rather than additional active plans.
**Acceptance:** This plan has stable IDs, scope boundaries, owners, checkpoints, rollout and refresh criteria. PDF and repository text match at issue time.

### AW-02 | Map every required source input
**Owner:** Jacob / Engineering | **Status:** In progress - eligibility sources reconciled for 22 players; complete composite/historical coverage open | **Dependency:** AW-01
Inventory the original season tables and raw columns; distinguish formulas from editable inputs. Map verified HTO game/season fields to those tables, PlayerInfo, roster denominators, schedule context and historical baselines. Include references outside structured tables and any named ranges. Classify each required field as available, derived by an original formula, missing or disputed.
**Acceptance:** Every calculation dependency has a source, transformation, season/cutoff and missing-value rule. No unmapped required input is silently treated as zero.

### AW-03 | Reconcile identities and player metadata
**Owner:** Jacob | **Status:** All 22 identities joined; Damian DI verified; Current identity/role/status reconciled; native DI copy preservation passes | **Dependency:** AW-02 for the final mapped contract
Damian and Carlyle are confirmed DI. Carlyle's identity, goalie role, DI master status and current roster row are now present in native review copies. Four DI metadata writes and 1,956,786 existing cells pass preservation. A separate native recalculation passes 106 goalie-input and reliability/consistency comparisons. Preserve Marco Congiusti's erroneous September 27 exclusion, keep Unknown Johnny distinct and retain historical records.
**Acceptance:** All current named participants join exactly once, or have a documented field-level exception. Any unresolved metadata holds the affected outputs, without dropping the player from participation reporting.

### AW-04 | Reconcile game, season and schedule inputs
**Owner:** Jacob | **Status:** Fixture counts reconciled; schedule selector/phase/date denominator traced; result blanks recorded | **Dependency:** AW-02
Prepare a reviewable input package containing both game observations and season totals, with result/phase context. Compare per-player and team totals, appearances and goalie totals at one cutoff. Recheck the latest source before use; the four-game baseline is a dated fixture, not a permanent expected count.
**Acceptance:** For the retained fixture, 19 skaters and three goalies reconcile to 53 skater and four goalie appearances, 6 G, 10 A, 16 Pts and 19 GA. Other revisions reconcile to their own accepted snapshot. Every proposed copy write has a target and before/after value.

### AW-05 | Resolve missing observations by impact
**Owner:** Jacob; Adam only for genuinely unavailable facts or policy choices | **Status:** All 42 explicit fixture gaps resolved; broader category impact coverage remains open | **Dependency:** AW-02
Retain the pinned raw fixture unchanged. Its 41 unknown skater PIM and one unknown goalie POTG are now resolved in a derived fixture by exact season-remainder equations. Complete coverage and nonnegative counts force every residual to zero. These are derived observations, not direct game-source observations. Check other absent model inputs separately; this does not prove all model dependencies complete.
**Acceptance:** Each gap has verified data or a recorded disposition. No unsupported zero-fill or fabricated POTG. The category dependency matrix states exactly which ratings remain unavailable and why.

<!-- PAGE -->
# 3. Task register: reference and production scoring

### AW-06 | Build the complete native reference candidate
**Owner:** Jacob | **Status:** Native DI recalculation saved; 1,956,805 cells and 785,772 cache comparisons pass; mixed-season award population still open | **Dependencies:** AW-02 to AW-05 as applicable
Reuse the proven disposable-copy method. Apply verified player/schedule context to an identified candidate, calculate game-level helpers, explicitly refresh the two season PivotTables/caches, verify per-player totals, and then recalculate downstream formulas. Do not manually replace PivotTable output cells. Preserve all unrelated history and original formula modes. Carry forward the documented treatment of the three overridden goalie helper cells only where the reviewed copy requires it. No write to the original source workbook is assumed.
**Acceptance:** Every intended write is verified; untouched inputs and displaced content are preserved; original hash is unchanged; missing inputs remain explicit. The entire mapped input package is applied before full recalculation.

### AW-07 | Export and reconcile native calculation results
**Owner:** Jacob; Randy independently checks | **Status:** Partial pass - 19 skater totals and count titles exact; later 22-player raw join passes; composite population parity held | **Dependency:** AW-06
Run full native Excel recalculation and export PlayerInfo inputs/helpers, AwardScoring components, eligibility, raw composites, final scores, rank keys and Web Races output. Investigate errors and stale/mixed-season values. Compare season totals back to accepted observations, not just to the values written into the copy.
**Acceptance:** Complete player coverage and source-count parity; no unexplained Excel errors; correct regular/playoff context; every released category has a complete dependency chain. Save reference fixtures, source/model hashes and runtime receipts.

### AW-08 | Implement the production calculator
**Owner:** Jacob; Conky supports architecture | **Status:** All scalar/display, eligibility and final/rank stages implemented; current composite inputs and integration open | **Dependency:** AW-07 fixtures
Extend the existing HockeyOS calculation path with deterministic, versioned implementations of the captured award rules. Reuse composition inventories and contracts. Preserve rank normalization versus component min/max normalization, tie rules, signed improvement terms, role branches, blanks, rounding, historical baselines and sample thresholds. Avoid a daily dependency on manually opening Excel.
**Acceptance:** Given the same accepted inputs, the calculator reproduces the native intermediate values and final outputs for every implemented category. Existing code is reused where correct; no second ad hoc methodology is introduced.

### AW-09 | Prove parity and edge cases
**Owner:** Randy / independent QA role | **Status:** Counts pass 76; displays/scalars pass 2,400; saved finals pass 192; corrected current full-model parity open | **Dependencies:** AW-07, AW-08
Compare all eight composite models and both count titles; validate Hall of Fame separately. Exercise skater, goalie and utility branches; rookie and call-up metadata; threshold boundaries; zero/one/tied candidates; no playoffs; summer/winter context; missing observations; source corrections and removed erroneous appearances.
**Acceptance:** Counts, identities, eligibility, displayed rounded scores and ordering match exactly. Any tolerance for unrounded numeric intermediates is specified before comparison and cannot change ranking or display. Four-model historical parity alone is insufficient.

### AW-10 | Package category-level release evidence
**Owner:** Delivery lead with QA | **Status:** Planned | **Dependencies:** AW-05, AW-09
Produce one manifest listing input/model versions, category readiness, comparison coverage, open exceptions and historical-reference dates. Separate verified counts, provisional watches, verified current ratings and historical examples.
**Acceptance:** A reviewer can identify what is eligible for release without reading chat history. A category with unresolved required inputs cannot masquerade as a current verified race.

<!-- PAGE -->
# 4. Task register: widget, release and routine operation

### AW-11 | Finish the public widget contract
**Owner:** Jacob / Engineering | **Status:** Existing implementation; final review pending | **Dependency:** AW-10
Reuse the current eleven-category interface. Show clear category names, relevant ranking/counts, qualification progress and concise explanations. Keep six prominent component tiles with the remaining components expandable. Display current cutoff and readable unavailable/stale states; keep internal review text out of normal public cards. Verify mobile, keyboard access and both Awards entrypoints.
**Acceptance:** All eleven views display the correct category state and player population. Historical data is dated. Ineligible/unscored players are not presented as scored leaders. Narrow screens remain readable.

### AW-12 | Validate weekly movement and history
**Owner:** Jacob; Randy verifies | **Status:** Existing controls; real snapshot validation pending | **Dependencies:** AW-09, AW-11
Keep immutable accepted snapshots by season, cutoff and model version. Compare only compatible snapshots. Track score movement separately from ranking movement and distinguish missing history from no change. A historical correction produces a revised version with provenance.
**Acceptance:** Known paired snapshots produce the correct deltas. No fabricated movement on first publication, future data, changed model/cohort rules or an incompatible baseline. Explanations identify any unavailable comparison.

### AW-13 | Prepare and execute the release
**Owner:** Bill / reliability; Jacob / integration; Erica / security review | **Status:** Planned | **Dependencies:** AW-10 to AW-12
Prepare one tested candidate, changed-file list, live baseline, rollback artifact and smoke test. Review PR8 and its latest checks; confirm actual hosting/feed targets before release. Use existing user authorization where applicable; request a decision only for a new action outside that authorization. This planning request itself does not publish or merge anything.
**Acceptance:** Released bytes and snapshot match the reviewed versions; both public entrypoints load correctly; category statuses, assets and caching are checked; rollback restores the last accepted version without damaging unrelated widgets.

### AW-14 | Integrate refresh into HockeyOS
**Owner:** Bill with Jacob | **Status:** Planned | **Dependencies:** AW-08, AW-13
Hook award processing to an accepted statistics revision in the existing HockeyOS workflow, including corrections to prior games. Capture input -> reconcile -> calculate -> validate -> publish allowed categories -> archive snapshot. Repeated identical inputs are a no-op. Write candidates separately and switch to the validated snapshot atomically. A failed refresh retains the last accepted data and identifies its actual cutoff.
**Acceptance:** A new accepted game and a later correction both refresh correctly; interrupted/duplicate runs do not duplicate appearances or history. A source/reconciliation failure cannot replace valid results with zeros. Exceptions reach the existing operator review surface. No standalone reminder task is required as the production mechanism.

### AW-15 | Prove operation and close implementation
**Owner:** Bill; Randy independently verifies | **Status:** Planned | **Dependency:** AW-14
Demonstrate initial run, identical rerun, corrected-source replay, interrupted-run recovery and two subsequent real accepted-game updates. Record runtime, manual work, exceptions and recovery steps. Provide one operator command/workflow and a concise troubleshooting guide.
**Acceptance:** Repeatable updates succeed with traceable inputs and rollback; no manual reconstruction of the same award package is needed. Until two real updates are observed, label the release operationally provisional rather than claiming full completion.

<!-- PAGE -->
# 5. Four checkpoints and the definition of done

### C1 - Inputs reconciled
**Tasks:** AW-02 to AW-06. Game logs, season totals, player metadata, roster denominators, historical baselines and schedule/phase context agree at one cutoff. Missing data is resolved or assigned an explicit category impact. Damian's absence cannot be hidden by reducing coverage. Native copy changes are reviewable and the original remains protected.

### C2 - Calculations proven
**Tasks:** AW-07 to AW-10. Native reference and production outputs agree for the complete required population and supported model branches. All count titles, eight composite models and separate Hall of Fame rules are assessed. The release manifest identifies verified categories and any exceptions. Passing file-preservation tests alone does not satisfy this checkpoint.

### C3 - Widget released correctly
**Tasks:** AW-11 to AW-13. Public presentation, mobile behaviour, component explanations, qualification rules and weekly movement are verified against the accepted snapshot. The released version is traceable and can be rolled back. A verified subset can be released without falsely implying that all categories are complete.

### C4 - Refresh proven in operation
**Tasks:** AW-14 and AW-15. New data and corrections run through the existing HockeyOS workflow, with duplicate protection, failure recovery, archived snapshots and understandable exceptions. Two real game updates demonstrate continued operation. There is one operator guide and one task record.

### What completion means
All eleven category views are accounted for; their source rules and display states are correct; every published current score is supported by complete evidence; the raw titles remain actual counts; historical baselines are dated; weekly changes are valid; and the system refreshes reliably after accepted statistics change.

An intentionally inapplicable category, such as a playoff race before playoffs, may be complete with the correct empty/qualification state. A category withheld because required data is missing remains an explicit limitation. Implementation can be partially released, but must not be reported as fully complete while required category functionality or operational proof is outstanding.

### Decisions and exceptions
| Issue | Default action | When Adam is needed |
| --- | --- | --- |
| Missing legacy facts | Seek source evidence and hold only affected outputs. | Fact cannot be recovered, or an explicit missing-data policy choice is required. |
| Player identity or rookie metadata | Retain the player in participation; prevent unsupported eligibility claims. | Authoritative records cannot establish the correct identity/status. |
| Formula behaviour differs from intent | Preserve and document the source rule; isolate proposed changes. | A genuine scoring-policy change is proposed. |
| Publication or source-workbook modification | Finish the reviewable candidate and check existing authorization. | The specific proposed action is outside authorization already given. |
| Runtime or platform failure | Use the existing safe recovery path and report the concrete failure. | Resolution would require a destructive or newly authorized action. |

Do not add a new approval document after each successful task. Technical checks close with evidence; only genuine user decisions remain decisions.

<!-- PAGE -->
# 6. Ownership, continuity and immediate work package

### Accountable responsibilities
| Role | Responsibility |
| --- | --- |
| Adam Brutto | Sponsor, unresolved factual/policy decisions and any release action outside existing authorization. |
| Delivery lead / Bubbles engineering role | Maintain this plan, sequence dependencies, resolve handoffs and report the exact next task. |
| Jacob engineering role | Input mapping, adapters, reference candidate, production scoring and widget integration. |
| Conky architecture role | Keep the calculation/data contract simple and integrated with existing HockeyOS. |
| Bill reliability role | Refresh trigger, atomic publication, recoverability, runtime observation and operator guide. |
| Randy QA role | Independent source, formula, output, UI and repeatability review with explicit coverage. |
| Erica security role | Review access boundaries, protected source handling and the release/feed change path. |

These are AI work assignments, not human signatures or completed reviews. Independent review must identify the actual reviewed version and its findings.

### Working rules that prevent fragmentation
1. Start each implementation session from this plan's active task and the latest repository evidence. Read any newer source or changed input before relying on a prior snapshot.
2. Keep one principal critical-path task active. Necessary source collection and independent review may proceed without creating separate delivery plans.
3. Update the same task IDs with status, evidence, remaining blocker and next action. New ideas enter a short backlog here, not a new implementation chat by default.
4. A session close records: task IDs changed, exact commit/input version, result, unresolved exceptions and one next task. Do not equate a draft, generated report or clean script exit with accepted functionality.
5. Regenerate the reading PDF after material plan changes. The PDF is not a second editable master. The broader HockeyOS master remains the parent; integrate this subplan link during its next coordinated update rather than overwriting other workstreams' progress.

<!-- PAGE -->
# 7. Evidence and next work package

### Next work package: AW-02 / AW-08
Resolve four missing goalie PIM observations and corrected current-cohort normalization. Current Rookie assembly has 11 of 12 components; the PIM display remains held. Preserve explicit missing-data holds. Assemble the corrected current chain, compare the corrected current cohort before integration. All 44 internal and display components, eight raw composites, ten eligibility rules and eight final/rank stages are implemented; complete current composite acceptance remains open.

### Evidence index
- Review implementation: https://github.com/adambrutto-maker/brave-hc/pull/8
- Branch: feat/hockeyos-award-cards-weekly-movement-20261019
- docs/261020_Awards_Original_Formula_Capture.json - captured source formula inventory.
- Brave_HC_Master_Workplan.xlsx - parent plan, saved v4 / internal v1.3; September 25 statuses are historical.
- Brave_HC_Awards_Methodology_Audit.md - historical reference; newer captured formulas control.

**Session record - October 21, 2026 Toronto:** HOF downstream arithmetic passes 999 exact comparisons across all 111 saved career players: eligibility, role, award totals, raw composite, final display and rank key. Career component inputs are still native observations, not rebuilt evidence; no current HOF shortlist is accepted. The Python suite passes 183 tests. Weekly races retain 15 rebuilt displays and Rookie 11/12; four missing goalie PIM observations remain open. Corrected current-cohort native parity, career reconciliation, integration and release remain open. The original workbook and live feed remain unchanged.

### Retained implementation evidence
- docs/261021_Awards_Carlyle_DI_Native_Replay_Receipt.json - saved-cell/cache preservation and 106 current comparisons; legacy cohort hold.
- docs/261021_Awards_HOF_Arithmetic_Parity.json - 999 exact downstream comparisons; career inputs still open.
- docs/261021_Awards_Streak_Ledger.json - 37,705 career streak comparisons.
- docs/261021_Awards_Extended_Game_Input_Candidate.json - public ES derivations and goalie +/- observations.
- docs/261021_Awards_Rookie_Input_Assembly.json - 11 rebuilt components; PIM held.
- docs/261021_Awards_Goalie_Baseline_Ledger.json - 380 comparisons and explicit native cohort correction.
- docs/261021_Awards_Current_Goalie_Component_Replay.json - five goalie components and 12 derivations.
- docs/261021_Awards_Current_Category_Readiness.json - ten category states; HOF tracked separately.
- docs/261021_Awards_Skater_Support_Baseline_Ledger.json - 4,934 checks; playoff PIM source exception preserved.
- docs/261021_Awards_Special_Teams_Baseline_Ledger.json / Current_Special_Teams_Replay.json - 9,469 checks and full display.
- docs/261021_Awards_Goalie_Support_Baseline_Ledger.json / Current_Plus_Minus_Replay.json - corrected mixed +/- display.
- docs/261021_Awards_Confirmed_Metadata.json - Carlyle DI and Rookie exclusion confirmed by Adam.
- docs/261021_Awards_Production_Baseline_Ledger.json - 9,640 historical production input checks.
- docs/261021_Awards_Current_Production_Component_Rebuilt_Replay.json - current counts with rebuilt historical baselines.
- docs/261021_Awards_Eligibility_Source_Ledger.json - reconciled source inputs and historical roster lineage.
- docs/261021_Awards_Validated_Eligibility_Replay.json - 220 resolved decisions with Carlyle DI confirmation.
- docs/261021_Awards_Dedication_Rounding_Decision.md - approved whole-number correction.
- docs/261021_Awards_Season_Pivot_Dependency.md - season controls, 30 ordinary column ranges and refresh ordering.
- docs/261021_Awards_Current_Population_Join.json - complete 22-player / 57-appearance identity join.

- docs/261021_Awards_Schedule_Context_Review.json - exact schedule formulas, selected context and unresolved result-input distinctions.
- docs/261021_Awards_Observation_Remainder_Receipt.json - 42 additive equations, coverage and provenance.
- docs/261021_Awards_Resolved_Game_Input_Candidate.json - versioned derived fixture; original source nulls retained separately.

- docs/261021_Awards_Downstream_Native_Postcheck.json - preservation/cache passes and measured population holds.

**Next task:** Resolve goalie PIM in games 359-362, then finish corrected current-cohort parity. AW-02, AW-03 and C1 remain open. The original workbook and live widget remain unchanged.
