# HockeyOS Awards Centre — operational publication record gate (UI, review only)

Date: 2026-10-20 | Lead: Engineering / HockeyOS
PR: https://github.com/adambrutto-maker/brave-hc/pull/8

## Defect removed

Previously, the published Awards JavaScript could classify a synthetic
`VERIFIED_CURRENT_WEEK` race as displayable after a single model-verification
boolean in `awards-races.json` was changed, if its saved source hashes,
rank fields, player GP and dates were internally consistent.

That is necessary source validation but **not sufficient** to establish that
the original Excel formulas were recalculated faithfully or independently
accepted for public 2026/27 scores.

## Change

- New deliberately HELD file: `widgets/awards-operational-publication.json`.
  Its `status` is `AWAITING_SOURCE_FAITHFUL_EXCEL_RECALCULATION`,
  `publicationAuthorized:false`, `independentlyApproved:false` and all
  operational hash/11-award parity fields remain empty.
- `widgets/awards-races-v3.js` now loads the separate file with `no-store`.
  Missing/unreadable/unrecognized data fails closed **for current official
  award results**, without breaking the HTO observational views, historical
  scorecard explorer or published pilot form.
- `isVerifiedWeeklyRace` and the current EA-style Rolaids attribute
  component renderer require the additional record, with correct
  formula-authority SHA, distinct operational workbook SHA, matching original
  and operational formula fingerprints, exact HTO-source readback, current
  game count, score date, publisher receipt reference and **all 11**
  award-specific parity states.
- Even a structurally complete record cannot prove its own signature. The
  browser checks field *consistency* only. **Actual independent acceptance,
  publisher permissions and Founder release approval must be enforced in the
  upstream authorized release workflow.** No JavaScript checkbox or boolean
  is such an approval.

## Current source state

- Original Master Workbook immutable specification SHA256:
  `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.
- Official HTO has **4** verified completed 2026/27 team games; source
  saved `AwardScoring` currently includes **1**.
- Four-game source stage reconciles **58** player-game observations:
  13 preserve / 1 correction review / 44 candidate missing rows.
- Formula-safe table expansion / calculation in a governed operational Excel
  copy has **not** completed. Full current award scoring parity **0/11**.
- Separate Art Ross/Rocket **raw HTO points/goals watch** is not an award
  OVR, eligibility determination or vote.
- Five historical Rolaids raw composites passed cached weighted-sum arithmetic;
  that does not prove current 2026/27 model or final OVR normalization.

## Test coverage

`node --test tests/test_awards_cards.js`:

**44/44 PASS** in a disposable, isolated Engineering QA checkout on
BRUTTECH 1, including extra checks proving that a held or missing separate
publication receipt blocks a supposedly verified current award and cannot
produce official EA-style current attribute tiles.

The safe "verified" unit fixture creates a **fictional** release record in
memory. It does not alter the tracked held JSON, original Excel, live
public Awards page or operational publisher. Passing the fixture is
not independent approval or a production workflow.

## Next release gates

1. Independently authorized Excel calculation/runtime for a **separate**
   operational copy, preserving all formulas and historical rows. Do not
   retry earlier safety-blocked original source/patch operations through an
   alternate route.
2. Independently verifiable original-vs-operational formula-map parity,
   identity/row matching, eligibility, rank and normalizer parity for all
   11 awards. Missing goalie POTG stays unknown (not zero).
3. Authenticated QA and Security decisions, an attributable protected
   source/provenance receipt, explicit Founder release approval, and safe
   live-publisher cutover with rollback.
4. Only after these gates may a trusted publishing process populate the
   additional Awards publication record. Do not set it to RELEASED to make
   browser tests pass. Weekly OVR movement still needs two genuine, dated
   source-equivalent snapshots.

**Disposition: REVIEW-ONLY UI SAFETY HARDENING PASS; LIVE AWARDS OVR HOLD.**
