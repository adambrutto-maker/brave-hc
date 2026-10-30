# Broader component range diagnostic: compatibility HOLD

Date: 2026-10-20 (Toronto)
Scope: unsaved blank workbook only, published captured component formulas and fictional inputs. No original or existing workbook opened, no file saved, no structured table created.

## Actual observations
The prior attendance-component range diagnostic passed. A subsequent batch attempted all eighteen captured Rolaids display formulas with ordinary range substitutions, serialized _xlfn.AGGREGATE normalized to AGGREGATE, and legacy Range.Formula assignment.

The batch stopped at Total Award Goalie W Web Display Score: fictional internal values 10,20,30 returned 75,75,75 rather than the intended spread 50,75,100. The remaining components were not completed. This is a failure of the diagnostic's compatibility assumptions, not proof of a defect in the original workbook formula or actual player scores.

A comparison using Range.Formula2 stopped on setter HRESULT 0x800A03EC. A separate capability probe established:
- Excel version 16.0, build 19127.
- Range.Formula = SUM(1,2) returned 3.
- Range.Formula2 = SUM(1,2) raised HRESULT 0x800A03EC.

The underlying cause of Formula2 rejection is not established. Do not equate this observation to a documented product-wide lack of support. Legacy implicit-intersection/array behavior is a hypothesis for the tied-score result, not independently proven by this probe.

## Engineering consequence
Do not claim eighteen-component compatibility or use a generic Formula-to-range translation as original-model parity. Preserve the original structured-table/array semantics in any future permitted source-native calculation workflow. Passing simple scalar calculations and one adapted component cannot certify complex source formula behavior. No model formula was changed to force the diagnostic to pass.

Current state: RANGE_TRANSLATION_COMPATIBILITY_HOLD; full eighteen-component pass false; original model parity false; award-score publication false. Existing file/workbook operations previously blocked were not repeated.
