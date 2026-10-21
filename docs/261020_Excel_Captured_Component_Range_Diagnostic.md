# Captured component range diagnostic

Date: 2026-10-20 (Toronto)
Component: Current True Attd. % Web Display Score, from previously captured awards-component-evidence.json. No original workbook opened.

## Bounded diagnostic
A new unsaved blank Excel workbook held three fictional names in A2:A4 and fictional internal scores in B2:B4. The captured display formula was mechanically adapted: current-row structured references mapped to same-row cells; named table columns mapped to fixed A/B ranges; stored _xlfn.AGGREGATE serialized prefix converted to runtime AGGREGATE name. No award rules or actual player values were supplied. This tests adapted range behavior, not exact original table formula propagation.

Observed checks:
- Internal values 10,20,30 returned display components 50,75,100.
- Equal internal values 20,20,20 returned 75,75,75.
- Clearing the first fictional name suppressed that row's component.

All checks passed. Existing files opened 0; files saved 0; structured tables created 0. Unsaved workbook closed without saving and owned Excel application quit in finally.

## Limits
This is one captured attendance component's fictional range diagnostic. It is not final award OVR normalization, eleven-model parity, current-player scoring, a structured-table expansion trial or proof of preserved historical formulas. The earlier blocked workbook actions were not repeated. The original workbook, scheduler and production website were untouched.
