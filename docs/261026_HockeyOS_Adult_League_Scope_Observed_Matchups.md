# HockeyOS — Adult Sunday Division Scope & Retrospective Evidence
**Implementation date:** October 26, 2026  
**Authority:** Founder clarification — VAHL is a separate league and must not be included in Brave H.C.'s adult Sunday competitive division analysis.

## Implemented competition boundary
The adult Sunday HockeyOS comparison contains **only** Fazzari Partners, The Cristillo Division and Remax Division. Source team IDs and current records are used as-is.

- **22 current adult team entries** and **three actual adult Sunday divisions**, rather than the 26 competitive entries and four division titles in the mixed Sports Village source page.
- Four VAHL entries and one x-playoff placeholder are outside the public adult team list, selectable team profiles, adult ratings rank, division summary/research counts, scenario comparison and league-facing research copy. The raw source retains 27 records/49 league-wide reciprocal games in order to preserve exact Sports Village evidence, independent validation, snapshots and other systems.
- The 0–100 context index values are unchanged; only the displayed ordinal **adult division context rank** is recalculated 1 through 22, excluding out-of-scope entries. No artificial model recalibration or game result is introduced.
- Archived standings remain available in their original source files. The *adult HockeyOS historic browser* omits separately titled VAHL division material; it now displays **191 adult-scope competitive team-season rows** from seven verified winters, rather than all 195 source rows. Historical same-name leads are also scoped to this comparison.
- The historical Brave source-matched game ledger remains **79 independently date/score-matched games with 43 held comparisons**. Accepted historical facts are not converted to today's roster strength.

A single read-only `widgets/adult-league-scope.js` module defines the three group names, adult team selection, adult rank derivation and archival view filter. Both League Intelligence and Division Fit Lab use this policy, so scope changes cannot silently diverge.

## What actual results add to the division scenario comparison
The source-confirmed adult pool contains 43 distinct completed games (not the full mixed-league source total), including 16 cross-current-division games. New retrospective diagnostics compare how those *actual* games align with each fixed-size hypothetical grouping:

| Grouping | Descriptive context dispersion | Real past games between clubs assigned together in grouping | Across proposed groups | Historical pairing coverage |
|---|---:|---:|---:|---:|
| Current Fazzari / Cristillo / Remax | 6.79 | 27 | 16 | 27/71 potential pairings (38.0%) |
| At most two pair swaps | 5.35 | 16 | 27 | 16/71 (22.5%) |
| Strict score bands (sizes 6/8/8) | 3.11 | 13 | 30 | 13/71 (18.3%) |

For games where both opponents are grouped together under each hypothetical assignment, the UI also shows the verified count decided by one or two goals, mean observed absolute margin, and explicit low-sample warnings.

**Interpretation:** An artificially lower rating dispersion is not sufficient evidence that future games will be closer. The observed matches took place under the *real* competition schedule. The groupings do not simulate a future game, infer an unplayed matchup or assert that the same players will return. The sorted-band idea has especially weak direct matchup coverage.

## Protection and tests
- One read-only scope module, existing consumer scripts and lightweight UI changes only; no new scheduled tasks, databases, source scrapers, roster modifications or workbook writes.
- Public League Intelligence: source team/filter options, three division summary cards and adult-only ranking across 22 teams. Existing incoming-team scouting, HTO game preparation and WhatsApp copy continue.
- Division Fit Lab: no separate-league card; source counts and report match the 22-club, 43-game analysis pool, with additional retrospective evidence rather than predictions.
- Model guards against conflicting reciprocal results on the same date/opponents, future score invention, reused source IDs and cross-league games in scenario calculations.
- Independent source/parity and 11 adult-scope tests, 10 Division Fit tests, 10 historical model tests, actual desktop (1140/1150 px) and mobile (358 px) browser tests. Source and existing historic Master Workbook remain unchanged.
- Release only after GitHub checks and live website tests confirm scope and interactive evidence counters; reverse by reverting this feature PR without deleting original Sports Village source observations.

## Research gate
The model never issues a league-approved grouping. At least four recorded source weeks, ten completed current games for 75% of adult teams, independent cross-division source games, and a human review of schedules, roster continuity and league consent are required for a draft evidence discussion. None of these gates alone proves proposed groups will play more competitive games.
