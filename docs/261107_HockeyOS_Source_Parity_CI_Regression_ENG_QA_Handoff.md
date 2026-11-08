# HockeyOS — Source-based CI regression correction

**Date:** November 7, 2026 (Eastern)
**Implementation:** Isolated Engineering/QA test branch
**Status:** Source-preserving QA candidate, no official records or application behaviour changed

## Defects reproduced on unchanged main

The repository's existing `source-parity` CI workflow fails two tests because they assume the live current-source reconstruction always sees the **October 26, 2026** initial two events and one incoming team. The current source instead includes later league changes, including Sugo Sundays returning to Cristillo and Young Guns entering. The historical public ledger continues to record the original Sugo departure and Maplewolves entry, plus subsequent transfers. The initial Maplewolves report retains its recorded 4 GP.

The `verify-normalization-contract` CI workflow also fails one test that hardcodes Justin Carosi's previous career-model trend of `-0.025228`. The current, pre-existing projection feed records `p.trend=-0.030273`, based on its recorded career rate `1.1377777777777778` and model component rate `1.1033333333333333`. That model remains a **forecast input**, not a verified current final team forecast.

## Changes in this branch

- Division-movement tests distinguish the append-only **published history** from a **new reconstruction based on the latest observed division memberships and the pinned October 26 baseline**. Derived expected event identities/counts come from the two source membership sets, not a stale constant.
- Verify the historical Sugo departure, Maplewolves first detection, 4-GP archive, event uniqueness, original period and unknown-effective-date markers are preserved. Repeated identical source observations must not add events.
- Add a synthetic future-membership regression that detects Sugo's hypothetical new exit without overwriting the existing source history. It does not assert this happened in the actual league.
- Player Bio trend test checks the current workbook-derived raw career/model rate relationship, exactly preserves the source trend and state arrow, and distinguishes the model's current/complete flags from any actual publication authority.
- No public source JSON, model coefficients, player records, HTO CMS, original workbook, game-night lineup, or publisher job files are edited.

## Validation and release scope

Execute the exact repository CI commands from the isolated feature worktree:

`python -m unittest discover -s tests -p test_svhl_division_movement_history.py`

`node --test tests/test_player_bio_projection_trend.cjs tests/test_player_bio_season_titles.cjs`

Additional smoke tests should cover division intelligence readback, player-performance normalization, and the published Game365 tentative-card digest.

The branch is limited to tests and documentation. Independent source review is appropriate before merge, and the existing homepage forecast source gate PR #214 remains a separate held production decision. Fixing CI's stale expectations **does not** resolve the workbook-versus-HTO game coverage mismatch or authorize current award scores.

**Rollback:** Revert this PR's test-only commit; do not manipulate current league or player source data to make older assertions pass.

## Additional source-driven test corrections after full GitHub CI feedback

The published weekly ledger now contains **two accepted Toronto-local weeks**, starting October 26 and November 2. Three earlier tests incorrectly assumed that the published ledger would always contain exactly one week. Revised coverage checks the currently accepted week's date, the exact open-week snapshot and its update, every previous frozen week, and a one-week rollover adding precisely one new snapshot.

The Bio form's V3.6 legacy percentage comparison is legitimately `COOL` under the current verified sigma rather than the earlier hard-coded `COLD`. More importantly, the actual **Oct 30 dispersion model** does not match the newer **Nov 2 projection export**. Its independent adaptive comparator correctly returns `HELD: DISPERSION_PROJECTION_SNAPSHOT_MISMATCH`. The revised test now checks that this current-source mismatch remains held (with no numeric level), while an explicitly constructed, source-matched historical-only test fixture validates the comparator's `COOL` positive control. No published model input is corrected or reclassified.

Targeted tests now cover 10 division-movement cases, 12 weekly ledger cases, 18 Bio trend/title cases, 5 Bio form cases, and 20 normalization/Game365 preservation cases: **65/65 pass locally**. The independent all-division source checker reports 27 teams, five divisions and 74 paired games.

A broader, bounded 32-suite source-only matrix returned **22 passing suites, 10 failing suites** against the candidate. Failures remain in roster-source time validation, multiple division model/scouting comparisons and dispersion-vs-projection snapshot reconciliation. These are explicit outstanding source/QA dependencies, not permission to fabricate data or relax a true release gate.

The matrix receipt is retained privately on BRUTTECH 1 as `261107_HockeyOS_CI_Matrix_PRIVATE.txt` (not uploaded). PR #215 remains unmerged until its required checks and independent source-owner review are resolved; PR #214 remains separate and unmerged. No official source data, HTO CMS, Master Workbook or published November 8 tentative lineup is modified.
