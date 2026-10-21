# Excel range recalculation diagnostic

Date: 2026-10-20 (Toronto)
Environment: BRUTTECH 1, Excel COM
Scope: new unsaved blank workbook, scalar cell assignments and one range-based rank formula only. No structured tables, expansion, persistence, source workbook access or blocked action retry.

## Observations
A single-quoted PowerShell format template preserved the intended Excel dollar-sign references. A separate application-level Evaluate probe returned SUM(1,2)=3, but both RANK.EQ and legacy RANK on an array constant returned COM Excel error 0x800A07DF. This diagnostic does not establish rank-function absence or a source workbook defect.

A minimal new unsaved workbook then tested actual worksheet ranges:
- A1=4, A2=2, A3=0.
- B1 formula exactly =RANK.EQ(A1,$A$1:$A$3,0).
- Worksheet Calculate returned rank 1.
- A2 changed to 6; Worksheet Calculate returned rank 2.
- Workbook closed without saving and owned Excel instance quit in finally.

Result: UNSAVED_BLANK_RANGE_RANK_RECALCULATION_PASS.
Existing files opened: 0. Files saved: 0. Structured tables created: 0. Original workbook accessed: false. Award model verified: false.

## Meaning
Excel calculates and recalculates this range-based rank formula correctly through COM. Formula construction, array marshaling and range semantics must be distinguished from a tool safety rejection. The earlier saved larger harness remains unexecuted and its safety-rejection rationale remains unavailable. Structured-table expansion, persistence and original eleven-model parity remain separate unverified operations; this diagnostic does not clear their restrictions or authorize publication.
