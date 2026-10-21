# HockeyOS Awards — Rolaids cached formula dependency inventory

Date: 2026-10-20. Lead: Engineering / HockeyOS. **REVIEW ONLY, NOT RELEASE**.

## Goal

Preserve the original workbook's AwardScoring calculations while integrating the
four verified HTO 2026/27 games. Do not substitute HTO points, goals or goalie
GA for the original role-specific award formulas. This inventory examines
**previously extracted historical formula evidence only**; the original Master
Workbook was not opened or modified.

- Canonical original source SHA256: `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.
- Evidence input: `widgets/awards-component-evidence.json` (historical
  `AwardScoring` cache, **not a 2026/27 recalculation**).
- Audit: `node scripts/hockeyos_awards_historical_dependency_audit.js`
  produces JSON to stdout only. It neither computes OVR nor touches Excel,
  HTO, the scheduler, GitHub publication or any workbook writer.

## Observed dependency map

| Scope | Historical source evidence |
|---|---:|
| Weighted skater component slots | 11 (100% total weight) |
| Weighted goalie component slots | 10 (100% total weight) |
| Unique component formula pairs, after shared fields | 18 |
| Unique `PlayerInfo` field references across those pairs | 111 |
| Historical team comparator fields | 15 |
| Historical player baseline fields | 18 |
| Current derived or field-comparator fields | 77 |
| Player identity join | 1 (`Website Name`) |

These categories are **lexical groupings based on field names**, not proof
that every `Current` reference can be calculated from HTO alone. For example,
the original normalized components depend on peer fields, league/team rates,
career-prior GP, and nested `PlayerInfo` helpers. The audit retains per-component
formula SHA256 and lists exactly which fields each component references;
it does not evaluate formula text or claim a valid current score.

Separate audited raw source coverage (`261019_Rolaids_HTO_to_AwardScoring_Input_Coverage_v2.json` on BRUTTECH 1) currently shows:
- Skater: 5 raw-present component inputs, 6 partial, 0 unverified-event-input.
- Goalie: 4 raw-present, 4 partial, **2 missing**.
- **Current original-workbook component/normalization parity: 0/21.**
  A raw HTO observation is not an official normalized 50–100 attribute.

## Relevant implementation gates

1. **Reconcile authoritative HTO game logs** for workbook Games #359–362;
   current HTO team GP 4 versus saved workbook AwardScoring GP 1. Preserve
   zero versus unknown distinctions, including the unresolved per-game goalie
   POTG for Dev Leong.
2. **Restore original formula dependency chain** in an approved separate
   operational workbook, with all historical seasons and formula references.
   A previous source-inspection attempt was safety-blocked; this audit does
   not retry or bypass it.
3. Independently verify full `PlayerInfo` field calculations,
   `AwardScoring` eligibility/rank/composite/public score and `Web Races`
   display for each of 11 awards.
4. **Art Ross and Rocket Richard remain STAT counts**, not an OVR.
   Other current-season OVR ratings and weekly OVR movement stay blocked
   until authentic snapshots and independent acceptance exist.
5. Require attributable independent QA and Founder release decision before
   merging PR #8 or activating any current award score or widget publisher.

## QA

`node --test tests/test_awards_cards.js`

**20/20 tests PASS in isolated Engineering review checkout (2026-10-20)**.
Coverage now includes malformed formula evidence, wrong component counts or
weights, 111-field lineage audit, calendar validity, scoring-title
STAT-vs-OVR enforcement, prior dated snapshots and Rookie hold behavior.
CI success must be checked for the exact latest commit.

**Status:** Historical formula dependencies traced, current 2026/27 award
ratings and source-write eligibility unverified. All current score release
and original-workbook-write flags remain false.
