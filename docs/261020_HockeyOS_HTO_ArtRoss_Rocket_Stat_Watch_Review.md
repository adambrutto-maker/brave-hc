# HockeyOS Awards — current HTO Art Ross and Rocket observed-stat watch

**Date:** 2026-10-20  
**Lead:** Engineering / HockeyOS  
**Status:** **PR REVIEW ONLY — NO OFFICIAL AWARDS RANKING OR OVR RELEASE**

## Why this addition helps

The original Master Workbook's `AwardScoring` saved calculation remains at
one completed 2026/27 team game, whereas HTO has four verified games. That
means no workbook-calculated current-season award shortlist can yet be
released. However, actual HTO points and goals **are** supported by the
independently reconciled named season stat feed.

Before this review change, the held Art Ross and Rocket widgets showed
**all HTO skaters alphabetically** in the unranked appearance watch.
The new PR branch instead shows a bounded **HTO scoring-stat watch** for
those two awards, **separate** from the unavailable official award board.

## Source-checked observed HTO values

Official data as represented in
`widgets/awards-participants.json` after the 2026-10-18 game:

**Art Ross points watch (not the eligible/ranked award shortlist):**
- 3 PTS: Justin Carosi, Alex Pagnotta, Michael Provenzano.
- 2 PTS: Adam Kober, Henry Kong.

**Rocket Richard goals watch (not the eligible/ranked award shortlist):**
- 3 G: Justin Carosi.
- 1 G: Adam Kober, Henry Kong, Keith Pearsoll.

There are five positive-point HTO statistical leaders and four positive-goal
scorers in the watch at present. These player counts are **not normalized
overall ratings** and have **not** been assigned eligibility or internal
`AwardScoring` rank keys.

## Presentation and privacy rules

- The visible label reads `HTO points/goals leaders · official game statistics only`.
- A separate paragraph warns that the original workbook's award eligibility,
  ranking and tiebreak procedures remain unverified.
- Display GP, G, A and the raw statistical count for each skater. The existing
  sourced game-by-game detail and provenance drilldown remain available.
- Display only players with **positive** current HTO goals/points; no
  zero-stat filler. Normally show a top-five raw-stat group, **including all
  equal-value players tied at fifth place**. Do not invent an award tiebreak
  to hide a tied player. The order inside an observational tie is alphabetical
  for reproducible display, not an award tie resolution.
- The complete HTO skater population must match the source readback and
  independently reconciled official HTO game IDs; all named per-player
  HTO `gamesPlayed`, `goals`, `assists`, `points` and totals must
  reconcile before any leaders can be shown.
- The watch remains under the held official board; it never becomes an
  `OFFICIAL_WORKBOOK_FINAL` rating, shortlist, published score or vote.

## QA

`node --test tests/test_awards_cards.js` — **42/42 PASS** on isolated
BRUTTECH 1 checkout at PR commit
`7642f174b1c5f7eaeec6f400dd42ba439f2db0f7`.

Added five feature tests with additional negative cases covering source
row changes, HTO game-ID substitution/duplication, season total mismatches,
tie preservation and clear source-label differentiation.

**The original Master Workbook, existing live site, hourly publisher and
official Awards scoring remain untouched.** This is not a source model
recalculation or a substitute OVR.

## Still blocked

The official 11-award scores and eligibility require original formula
recalculation on a separately authorized compatible operational workbook.
PR #8 also requires independently attributable reviewer approval and an
explicit Founder release decision before merge/publication. Do not construe
Engineering QA green as those approvals.

PR: https://github.com/adambrutto-maker/brave-hc/pull/8  
Source gate: https://github.com/adambrutto-maker/brave-hc/issues/9
