# Dedication score rounding correction

Adam confirmed on October 21, 2026 that the Dedication decimal score was a legacy inconsistency. The default final-score implementation now rounds to whole numbers using Excel half-away-from-zero rounding. The existing 50–100 range, tied-score rule and ineligible blank remain intact.

Example: a normalized score of 66.666… now returns 67, rather than 66.7. Internal component precision is unchanged.

The one-decimal behaviour remains available only through explicit legacy_reference audit mode, so the original Excel reference can still be reproduced. Saved legacy parity evidence describes this audit mode, not acceptance of the decimal behaviour for current scoring.

Validation: all 111 Python tests pass, including a fractional-score correction case and the 192 legacy native comparisons. The original workbook and live widget were not modified. This decision supplements implementation plan v1.7 pending its next consolidated update.
