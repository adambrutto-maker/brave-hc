# HockeyOS — Evidence-aware Source-ID Lineup Refinement
**Release basis:** October 26, 2026 accepted Sports Village Sunday Winter league, adult-only Fazzari/Cristillo/Remax pool.

## Why
The initial capacity-flexible architect assigned clubs to **contiguous bands of the descriptive source index**. This minimized rating spread under each legal size arrangement but did not actively test whether a limited change could improve historical matchup evidence and minimize hypothetical team reassignment. HockeyOS now lets the user **compare the baseline ranked-band lineup with a source-ID-safe, bounded swap-refined lineup** for each permitted capacity combination and objective.

## Source and non-negotiable constraints
- Read-only `widgets/league-intelligence.json` and `widgets/brave-historical-verified-games.json` provide the same accepted, independently validated data as the existing Division Fit Lab; no private Master Workbook data, HTO admin actions, real standings writes or additional scheduled tasks.
- All 22 accepted adult Sunday source-team IDs are included **exactly once**. VAHL and playoff placeholders are out-of-scope. Legal capacity pattern from the existing architect is immutable throughout refinement.
- The approved structural parity rule remains: **even total -> zero odd-sized divisions; odd total -> exactly one 5/7-team group and all other groups 4/6/8**. Synthetic 21-club tests are QA-only.
- No roster continuity across different years is assumed. The current season source has one accepted weekly observation, so no source-backed stability or predictive probability can yet be asserted.

## Implementation
Pure, deterministic, browser/Node-compatible `widgets/division-lineup-refinement.js`:

1. Validate accepted adult-source identities, completed reciprocal source game count, full proposed group membership and the exact selected objective.
2. Compute baseline descriptive index dispersion, retrospective within-group **source-verified** team pair coverage, actual game comparisons and maximum assignment retention against three currently published divisions.
3. Inspect every cross-group, same-capacity source-ID pair swap, up to six improving iterations. Accept only the largest deterministic decrease of the selected editorial objective, with explicit stopping threshold. Division size and every team's actual source ID remain unchanged.
4. Preserve a receipt for each improving swap, number of candidate swaps checked, starting and ending objective, rating dispersion, real completed games with both participants together in the hypothetical group, and number of hypothetical team reassignments.
5. Return `NO_ADMISSIBLE_IMPROVEMENT` when no beneficial swap exists. Never force a swap just to populate a proposal.
6. Use the **same named editorial objective weights** as the existing architect: tightest rating balance, practical league operations, and continuity, respectively. These are not fitted to outcomes or approved by Sports Village.

## First actual source observation
For **Continuity / 4+4+6+8**, source IDs **13708 Mid Ice Crisis** and **13711 Butcher Brothers** can be exchanged in the research lineup: the total **combined continuity objective decreases from 8.673854 to 8.633850**, while previously observed source-confirmed games between hypothetical same-group opponents change **13 -> 17** and clubs hypothetically reclassified **12 -> 11**. The index dispersion increases **2.423 -> 2.661**, showing why a practical research choice cannot be judged on spread alone. These are retrospective descriptions, **not projected results or approved realignment**.

## User interface
The existing Division Fit Lab adds a **Team placement method** selection beneath the structure choices:

- **Source score-ranked bands:** original, unchanged evidence-supported baseline.
- **Evidence-aware pair-swap refinement:** show the admitted source-ID swaps, comparative objective/membership and observed head-to-head totals, updated source-qualified proposed members, and warning about model limits.

The user-triggered **Copy proposed division layout** and existing overall **Copy research note** include the currently selected placement method and swap evidence, never send any communication, and clearly state approval is outstanding.

## Quality and rollback
- Node tests reject forged games, duplicate/unknown IDs, unsupported capacities, wrong objective, game count mismatches, illegal odd/even composition and source mutation.
- QA explicitly tests **no forced swaps** when balance cannot improve and a genuine small continuity improvement for one 4-division arrangement.
- Live browser tests must pass desktop and phone, selecting the original/modified placements, copying both, preserving existing scenario/weekly UI, no JS errors and zero horizontal overflow.
- Rollback is reverting this scoped PR. All existing source snapshots, 10:15 publisher, Master Workbook, historical audit, league assignments and existing features remain untouched.

**Research limitation:** The source provider's current adult sample contains 43 reciprocal games, including 16 games crossing present divisions. Optimizing retrospectively observed coverage may reflect scheduling choices, not necessarily true team-skill equivalence. Source indices are descriptive, not actual probabilities. New verified weekly observations are needed before a Sports Village proposal.
