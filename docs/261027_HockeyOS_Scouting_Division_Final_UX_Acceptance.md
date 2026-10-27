# HockeyOS — Final Opponent Scouting and Division Fit UX Acceptance
Date: 2026-10-27
Lead: Engineering
Scope: Presentation-only completion of the source-qualified League Intelligence and Division Fit Lab interface.

## What changed
- The existing source-qualified "Copy scouting brief for WhatsApp" and "Copy roster-aware pregame plan" controls now appear directly in Essentials rather than requiring All data expansion.
- No duplicate click handlers are created; this change only moves the original DOM controls and feedback messages.
- Both copy actions explain that they put text on the clipboard, not that they send messages.
- Player selections remain optional and clearly marked PLANNED ONLY when named assignments are made.
- Assets use an incremented cache key in both League Intelligence and Division Fit pages for a predictable public rollout.
- All 22 original adult Sunday team records, historical source-qualified player and game data, and responsive source-backed decision cards remain available.

## Test evidence
- New CI-backed tests/test_hockeyos_quick_actions.cjs source contract PASS.
- Existing simple/full-data source contract and opponent decision-card source contract PASS.
- Node source and optimizer tests: 14 roster scouting; 6 roster/lineup; 11 scouting; 15 layout; 12 lineup refinement; 10 division fit; 13 weekly stability, all PASS.
- Independent official current league, historical roster, and Brave H.C. historical game source parity: PASS.
- Browser at desktop 1140 px and mobile 358 px: actual copy with controlled clipboard, 2 copy callbacks, verified selected opponent in WhatsApp text, planned-only assignment in matchup text, zero application JavaScript errors and zero horizontal overflow.
- Browser regression: switching teams, 4 priority players, all 22 standings rows, proposed divisions and their 22 team placements, available All data, zero application JS errors / overflow.

## Constraints / acceptance
- No alteration to source statistics, historical player identity joins, team assignments, workbook, HTO/SVHL, official scores, VAHL, or any scheduled publisher.
- WhatsApp and player messages are not sent automatically.
- Division Fit Lab proposals remain provisional. No formal league recommendation before sufficient real weekly/game evidence and manager review.
- Public release only after independent GitHub Actions succeeds and real production browser testing passes.
- Rollback: revert the small UX commit; underlying source data and scheduled collectors remain intact.
