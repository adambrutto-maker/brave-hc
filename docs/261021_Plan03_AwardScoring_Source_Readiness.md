# HockeyOS Plan 03 — AwardScoring source readiness and publication hold

**Verified October 21, 2026. Lead: Data & AI. Supporting award-races owner: Media/QA. State: `AWARDS_CACHED_COMPONENTS_PRESENT_OFFICIAL_SOURCE_INCOMPLETE_HOLD`.**

## Purpose

The historical Games/Records/Articles program has validated four game scores, 43 missing player-game observations, basic skater/goalie season pivots, and 17-sheet Excel `CalculateFull` **in private disposable copies**. This checkpoint does **not** calculate or change award winners. It records why existing `AwardScoring` cached values are not sufficient evidence for an independently certified 2026/27 award or public record claim.

The immutable source is `261001_Brave_HC_Master_Workbook.xlsx` (SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`). The acceptance input is the **private** validated 17-sheet calculated copy (SHA256 `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b`). HTO source is the verified four-game feed containing official completed game IDs `3356177,3356178,3369564,3375601`. No source files or private row-level data are uploaded to GitHub.

## Actual legacy award table

The original `Awards & Records` worksheet has the **146-column `AwardScoring` structured table `FJ5:KY55`**. The full-calculated private snapshot has 50 allocated scoring rows, of which **24 contain player names**. The associated legacy roster statuses are **14 FT, eight CU and two DI**. Presence in this table is not proof of actual award eligibility, rookie status, call-up eligibility or 2026/27 score accuracy.

Verified component and business-rule columns include:

| Model component | Web-display columns | Internal-score columns |
|---|---|---|
| Playoff / total PIM scores | `GG` / `GH` | `HY` / `HZ` |
| Playoff / total POTG scores | `GK` / `GL` | `IC` / `ID` |
| League/club eligibility and rankings | Hart, Conn Smythe, Norris, Art Ross, Rocket, Rookie, Lady Byng, Most Improved, Relief Man and Dedication fields `JD:KY` | Existing formula-gated logic must be reviewed independently |

All 50 table rows have formulas in the required scoring, eligibility and player-selection columns. The current private workbook contains **24 nonzero cached entries each** in the total PIM and total POTG web/internal scoring components (`GH, GL, HZ, ID`); the Art Ross and Rocket eligibility flags are nonzero for **21 named entries each**. **These values can reflect historical records and legacy formula zero-handling; their existence does not establish current-season source completeness or a valid live award race.**

## Official source coverage and rationale for the hold

The bounded verified HTO game-level feed includes **54 skater-game observations** and **four goalie-game observations**. It has **42 skater PIM values missing (`null`)** and **one goalie POTG value missing (`null`)**. GTG exists in an explicit HTO source column only for two of four games; other legacy manual metrics such as special-teams and save statistics also lack complete evidence.

Therefore:
- Do not convert unavailable current-season PIM, goalie POTG, GTG or other manual fields into a verified numerical zero.
- Do not take a normalized scoring/display value such as cached `Total Final PIM Web Display Score` or `Total Award POTG Internal Score` as evidence of an independently verified actual/award result.
- Do not infer winner, weekly movement, dedication eligibility, rookie eligibility or player-record milestone from cached AwardScoring positions alone.
- The separate official **146-entry native HTO Awards & Honors** archive remains independently preserved; it is historical publication, not a validation of the current workbook's calculated award scoring.
- Existing Dev Leong source-error corrections, Pavaday's absent projection/roster record and duplicate Hunt SCR projection rows were verified **only in private QA** and are not owner-authorized original Excel edits.

## Implemented read-only release gate

`scripts/audit_plan03_award_source_readiness.py` validates immutable private full-calc file identity, exact AwardScoring table schema, 146 ordered columns and precise PIM/POTG/eligibility headers, the legacy 24-name/14 FT-8 CU-2 DI subset, formula presence across 50 rows, and known source-missing HTO observations. Its result explicitly states:

`AWARDS_CACHED_COMPONENTS_PRESENT_OFFICIAL_SOURCE_INCOMPLETE_HOLD`

It does not read hidden email, create award winners, alter Excel, update HTO or publish online records. If source coverage, roster statuses, player names, critical formula columns, or cached award baseline changes, the audit stops for fresh review instead of silently adopting unknowns.

`tests/test_plan03_award_source_readiness.py` provides **10 offline fail-closed tests** and is wired into the existing guarded public-source CI; tests do not need access to private workbooks. Run the real audit locally using the explicit verified HTO feed and private calculated Excel copy paths.

## Next owner acceptance

1. Define **which 2026/27 award scores may use historical model components** and how incomplete/current season PIM/POTG/GTG values are handled; separate valid historical values from unverified recent input.
2. Confirm award eligibility and DI/CU/rookie treatment independently with the dedicated award-races implementation, including goalie/rookie restrictions and dedication scoring semantics; do not conflate AwardSummary history with current derived race tables.
3. On a disposable model, replay any proposed source adjustments with QA comparisons, rank/eligibility/duplicate player guards, unknown-field rules and actual period/date sources. Obtain explicit owner approval before original Excel write or public award-races publication.
4. Keep Plan 03's historical HTO Records and Articles read-only. Preserve the original workbook source SHA and independent rollback.
5. October 25 HTO `3375682` is a future scheduled game and not admitted as a completed boxscore.

Related [Plan 03 #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [projection actuals #53](https://github.com/adambrutto-maker/brave-hc/pull/53), and legacy source/HTO record scope checks [#51](https://github.com/adambrutto-maker/brave-hc/pull/51) and [#52](https://github.com/adambrutto-maker/brave-hc/pull/52).
