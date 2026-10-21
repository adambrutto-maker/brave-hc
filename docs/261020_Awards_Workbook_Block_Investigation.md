# Awards workbook blocker investigation

Date: 2026-10-20 (Toronto)
Scope: static review of existing saved test script and receipts; no workbook opened or execution retried.

## Findings from existing private evidence
The saved Excel compatibility receipt records Excel 16 COM activation and four in-memory formula checks passing. It does not prove structured-table expansion, persistence or original model recalculation.

The saved larger synthetic PowerShell test is present, but its expected output workbook and QA receipt are absent from the staging directory inventory. Its planned operations are: hash immutable source; create a fictional workbook; create/extend a table; calculate lookup/rank formulas; apply a fictional correction; save and reopen the fictional workbook read-only; compare original hash. The earlier action was safety-blocked. Neither the saved script nor handoff records the actual rejection rationale. An execution result cannot be inferred.

A separate confirmed source-code defect exists in its rank-formula strings. PowerShell does not use backslash to escape a dollar sign. The saved double-quoted strings use backslash-dollar-B sequences, so PowerShell attempts to interpolate variable B instead of preserving Excel absolute column B references. Intended Excel baseline formula at row 2: `=RANK.EQ(B2,$B$2:$B$4,0)`; expanded four-player formula: `=RANK.EQ(B2,$B$2:$B$5,0)`. A future permitted implementation must preserve literal dollar signs, for example through a single-quoted format template. No replacement script was generated or executed here. This defect is not asserted to be the safety rejection reason.

## Existing import-plan evidence
A previously audited byte-identical disposable source copy exists and is marked read-only. The saved import handoff classifies 13 matching records, one two-field correction review, 44 missing rows (41 skater/3 goalie), one quarantined placeholder and a whitespace-cell collision requiring disposition. These are archived planning results, not current authority to write or proof of formula fidelity. The original remains immutable.

## Corrected disposition
Do not describe this as proof that Excel is unavailable or globally prohibited. The specific recorded preparation/execution paths were blocked, their rationale is missing, and no permitted alternative has been established. Repeating that blocked operation after changing escaping or moving it to another tool would not clear the restriction. Separate AI Security review confirmed this boundary.

The next workbook milestone remains a permitted disposable structured-table calculation trial, followed by source-formula preservation/recalculation and eleven award-model parity. Static defect diagnosis and reviewed plans are progress toward that milestone, not a successful trial or production scoring release. No workbook, scheduled task, original file, production branch or live website change occurred.
