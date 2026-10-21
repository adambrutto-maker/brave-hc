# Final QA addendum: original formula inspection

Implementation: ded91029bcedd535f9bc58a8e527bdf2e17512fd.

Randy AI found that missing cached eligibility could silently shrink the historical comparison cohort. The checker now requires a cached identity cell on every row and explicit numeric 0/1 eligibility for named rows across all four reviewed models. Missing eligible raw inputs also reject. Regression tests cover the missing-eligibility and missing-identity cases.

Randy AI independently confirmed the reproduction now rejects, the complete capture still reproduces 20 saved final ratings with zero mismatches, and all78 tests pass. This supersedes the earlier77-test count and closes that P2 finding. Acceptance remains limited to captured historical final-stage arithmetic and UI/source-rule corrections, not source authenticity, eligibility/raw recalculation, current ratings or publication.

CI78 passed for the implementation commit: https://github.com/adambrutto-maker/brave-hc/actions/runs/39532662618 . No workbook was opened in Excel or edited, and no live deployment occurred.
