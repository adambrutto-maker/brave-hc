# HockeyOS Awards Centre — EA-style attribute completeness gate

Date: 2026-10-20. Engineering lead. **REVIEW BRANCH ONLY — NO FINAL RATINGS RELEASED.**

## Finding

The Awards UI previously allowed `VERIFIED_CURRENT_WORKBOOK_COMPONENTS` to
display a Rolaids EA-style attribute panel with any positive number of
arbitrarily named fields whose weights totalled 100%. A synthetic regression
fixture passed with two invented source weights (70% PTS, 30% CONS).

That was too weak: the original `AwardScoring` Rolaids source contract is
**11 distinct skater components** or **10 distinct goaltender components**,
each with its own original workbook field and exact percent weight.

## Implementation in PR #8

The review-branch `widgets/awards-races-v3.js` now requires, before rendering
a **current** Rolaids weighted attribute breakdown:

- `OFFICIAL_WORKBOOK_FINAL`, workbook eligibility true, the exact
  `VERIFIED_CURRENT_WEEK` race state and a matching model-verified season.
- Exact current player identity and games played in the HTO participant feed,
  including a separately appropriate skater or goalie roster role.
- Original workbook source-hash equality to the source-captured historical
  **formula/weight contract** in `awards-component-evidence.json`.
- All original 11 skater or 10 goalie source fields present exactly once.
- The original corresponding field weight; all weights sum to 100%.
- A unique readable abbreviation for each component and a valid 0–100
  component value whose weighted contribution is arithmetically correct.
- An original cached formula pair for every permitted field.

**Other awards may not borrow the Rolaids source weights.** Until each award
has separately extracted and independently validated its own exact component
field/weight contract, *current* attribute tiles are held rather than
generating made-up subratings.

The source historical Rolaids examples and historical scorecard display
remain available with their explicit historical labels. Current-season
ratings and weekly movements remain held until the original Excel model
recalculates all verified input games and the award-specific eligibility,
normalization and rank key match.

## QA and status

`node --test tests/test_awards_cards.js`:
**27/27 PASS** in a disposable isolated BRUTTECH 1 review checkout.

Coverage includes missing original fields, duplicate abbreviations, wrong
weights or contributions, forged field names, skater/goalie role crossover,
model-state hold, unknown player and reuse of Rolaids weights by Hart.

GitHub Actions run `39454095520` succeeded on PR head
`8acf4317b454ca9ed79f26e6620c922ae0e70ec0`. The run is
implementation-side automated QA, **not independently attributable signoff**.

## Remaining scoring release blockers

1. Canonical original Master Workbook is immutable, SHA256
   `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.
   Prior source-inspection/patch-generation actions were safety-blocked; do
   **not** circumvent those checks.
2. Saved `AwardScoring` current team GP is **one**, while four HTO game
   boxscores are verified. Source-equivalent replay on a permitted separate
   operational copy is not commissioned; missing data and historical
   normalization must not be fabricated.
3. A future operational copy will have changing file hashes; independently
   define **immutable formula-authority source hash** vs **changed verified
   operational recalculation snapshot hash**. Do not conflate the two while
   asserting current same-week attribute provenance.
4. Source-faithful per-award component contracts are not independently
   extracted for the remaining OVR awards. Art Ross / Rocket Richard are
   **stat counts**, not 50–100 normalized OVR.
5. Require authenticated independent QA/Security and Founder release decision
   before merging PR #8 or publishing current model scores.

**Disposition:** EA UI now enforces original Rolaids component completeness.
**Current OVR scores: HOLD. Website publication: NOT AUTHORIZED.**
