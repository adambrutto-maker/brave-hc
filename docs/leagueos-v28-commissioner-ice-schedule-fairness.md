# LeagueOS V28 — Commissioner ice capacity and start-time fairness planning

Date: November 17, 2026 (America/Toronto)
Lead: BruTTech Engineering; Product-approved V26 connected demonstration scope.
Status: Fictional, read-only browser demonstration. Not an official arena, league or ice inventory deployment.

## Implementation objective

Connect the V27 commissioner competitive-division recommendation to a **measurable scheduling-feasibility test** before any commissioner can treat proposed divisions as playable. A proposed competitive group is useful only if the operator can find ice, rotate early/late game starts fairly, protect existing division-placement approvals, and identify schedule conflicts before making commitments.

This is the next additive step in the approved LeagueOS → TeamOS → HockeyOS → rink → public-league journey. No new primary navigation or competing application is created. The V27 decision report remains the source of current-vs-proposed competitive placement analysis.

## Invented venue data

Builder: scripts/build_leagueos_fictional_ice_v28.cjs
Output: widgets/leagueos-fictitious-ice-v28.json

The V28 seed contains **exactly 24 invented Sunday ice slots** across two example dates, 2027-01-17 and 2027-01-24, labelled fictional weeks 13 and 14. Each week has 12 slots (three invented rinks A/B/C × four start times 18:00, 19:30, 21:00 and 22:30). Each slot is 75 minutes with a 15-minute transition buffer. These dates **do not claim the real league's Week 13 or Week 14 schedule**. The fictional venue does not assert that Sports Village or any other arena has ice available.

The underlying V26 fictional league has 24 invented teams and the V27 recommended A North 8, A South 9 and D Recreational 7 groups. The pre-existing V26 round-robin generator produces **11 matches per week, 22 in two weeks**, with byes for odd-sized groups. Source IDs are conserved: every proposed match has a known team, current program, division, week and unique hypothetical game ID.

## Capacity and feasible/unfeasible outputs

Commissioner capacity what-ifs:
- Full three-rink fictional inventory: 24 potential slots, 22 complete draft matches, two unused buffers. All 22 assigned a *fictional* rink/start and date, **zero actual bookings**.
- One slot per week unavailable: 22 fictional slots, 22 complete draft matches, no spare ice. Still a feasible **scenario** but not a reservation.
- Entire fictional Rink C unavailable: 16 slots total (eight/week), 22 matches needed (11/week). **Three unslotted games per week**, six total, so the entire proposal is held: no incomplete schedule is displayed as valid.

Capacity is checked before accepting any proposed assignment. The engine enforces unique slot IDs, reciprocal fictional team/weekly game membership, maximum one game per team per week in this example, no duplicate rink-time assignments, source-defined slot duration, rink and date, and explicitly disallows any source booking/edit flag. The output cannot be treated as the arena's confirmed schedule.

## Start-time fairness optimization

V28 compares a deterministic "slot-first" allocation with a local improvement search that swaps hypothetical slots within the same week or uses an initially unassigned slot. Its illustrative objective penalizes:
- differences in each participating team's average start time compared with the league-wide scenario average,
- different late-start exposures given each team's number of games,
- repeated early-only or late-only slots for teams with multiple example games,
- large differences in individual team late-start totals.

The objective is evaluated over **only these two invented Sunday weeks**. On the base fixture case the initial illustrative equity score is approximately **175.8**, optimized to **20.6**, with team late starts between 0 and 1. Lower score means a more even allocation **within this synthetic sample**, not a calibrated full-season equity guarantee or statistical claim of a causal reduction in player complaints.

Actual scheduling must eventually incorporate source-qualified arena-specific ice inventory, existing other program commitments, blackout dates, authorized referee assignments, rest and travel considerations, league round structure, weekday/night eligibility and an effective-dated count of early/late starts. Neither an invented score nor a complete synthetic two-week draft is enough to authorize real scheduling.

## Review-window and final-lock behavior

The source SVHL rulebook provides a week-5 realignment review with points carried. LeagueOS's proposed final division lock after a midseason review is **new optional product policy**, not an existing published SVHL rule.

Before the lock, V28 uses the current fictional proposed group memberships as a scenario only. If any grouping has a source hold (e.g. one B-strength team below the supported four-team minimum), the entire plan is held. After the final lock:
- If V26 has a previously **fictionally published** division snapshot, V28 uses that exact frozen group state to build/inspect sample future schedule matchups.
- Without that snapshot, the engine returns FINAL_LOCK_MISSING_SNAPSHOT_HOLD and allocates **zero** example slots.
- No new division group is silently substituted after the lock; source statistics may continue to evolve independently without changing the frozen placement.

Commissioner review and fictional public publication in V26 remain separate local-only interactions. V28 adds no authenticated role, official approval, inventory API or transactional booking action.

## Files and validation

- widgets/leagueos-ice-planning-v28.js and .css: original commissioner ice feasibility and start-time fairness panel, embedded immediately after V27 decision report.
- scripts/build_leagueos_fictional_ice_v28.cjs and widgets/leagueos-fictitious-ice-v28.json: explicit invented venue source, SHA-256-bound to the V26 fictional team seed.
- widgets/leagueos-connected-demo-v26.js and widgets/leagueos-team-os-demo.html: minimal additive integration preserving prior routes.
- tests/test_leagueos_ice_planning_v28.cjs: deterministic inventory, source, feasibility, optimizer, orphan grade, final-lock and forged-authority tests.
- tests/qa_leagueos_ice_planning_v28.cjs: full browser scenario, local export, mobile responsiveness, earlier role separation and tampered-input hold test.

Initial V28 local tests: **16/16 unit** and **38/38 browser** passed. Before publishing the increment, run full inherited V18–V27 source and browser regression, verify no JS errors/server writes, merge a reviewed PR, verify GitHub Pages success, confirm HTTPS source readback and rerun V28 and earlier hosted browser suites.

## No-production boundary and next steps

No actual SVHL/HTO game, league standings, player eligibility, rink contract, booked ice slot, referee, payment, team roster or commissioner decision is edited. All V28 data and exported JSON are plainly marked fictional and browser-local.

The next production-readiness gate must authorize actual rink/league scheduling data, multi-program conflicts, field-level role permissions, immutable plan versions, manual league-approved publication/appeal/rollback, and program-specific policies. Do not present this demo as already used by any arena or as a guaranteed method of attracting players or eliminating blowouts.
