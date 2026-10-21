# HockeyOS Plan 03 — Legacy record-holder counts versus official HTO Record Book mentions

**Checked:** October 21, 2026. **Lead:** Data & AI. **State:** `RECORD_COUNT_METHODS_DISTINCT_PROFILE_FORMULAS_UNRECOVERED`. This is a **read-only source-scope audit**, not a correction or adoption of new individual record counts.

## Sources

1. The **original, immutable** Brave H.C. Master Workbook `261001_Brave_HC_Master_Workbook.xlsx`, SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.
2. The **current source-verified HTO Record Book** captured in `widgets/history-records.json`, with `source.authority=OFFICIAL_HTO_PUBLIC_READBACK`, **558 published entries across 119 category/period groups**.
3. The original workbook `Skater Profile` and `PlayerInfo` / `RecordLedger` definitions, as checked by [the profile/record audit](261021_Plan03_Profile_Record_Streak_Dependency_Review.md).

Do not interpret the existing public HTO 558-entry all-team record feed as if it were the old workbook `RecordLedger` table. They were built for different publication and scoring functions.

## Precisely verified evidence

| Measurement | Source | Matched rows for Brutto, Adam / Adam Brutto |
|---|---|---:|
| Legacy Major record-holder entries | Excel `RecordLedger` major flags | 15 |
| Legacy Minor record-holder entries | Excel `RecordLedger` minor flags | 13 |
| **Legacy counted holder entries** | Major + Minor, independently matches `PlayerInfo HOF Total Records Held` | **28** |
| Legacy display-only occurrences | `RecordLedger` class Display, zero holder flags | 51 |
| All historical ledger rows mentioning player | `RecordLedger` | 79 |
| Legacy points attributed to counted record-holder rows | `RecordLedger` and `PlayerInfo` | 196 |
| **Published official HTO Record Book entries mentioning player** | Exact `Adam Brutto` name match across 558 HTO entries | **25** |

The 25 matching native HTO entries break down into **10 game**, **2 season**, **7 playoff**, and **6 career** published rows.

These are **not directly interchangeable totals**. HTO's published entries may include career-club milestones and historical category formats that do not use the legacy holder-scoring structure; legacy entries may include additional record occurrences or different holder classifications. The numeric difference **28 - 25 = 3** is *not evidence* of precisely three lost records. Neither source alone authorizes a new “Active Records” or “Total Records” profile count.

## Existing profile cells are unrecoverable by plain recalculation

The original `Skater Profile` row 11 labels `I13` **Active Records** and `J13` **Total Records**. Both row 13 cells store `#REF!` with no surviving Excel formula XML. The original formula's intended definition is unavailable. Replacing both with 28, hard-coding 25/28 or counting the 79 ledger rows as profile records would be **inventing unvalidated semantics**.

The HTO record source is considered authoritative for **what is publicly published**, but even a verified exact-name entry count is not necessarily the official *active-holder count*. An independent specification, exact record-group/occurrence mapping, and separate owner-approved profile definition are needed.

## Implemented review gate

The read-only `scripts/audit_plan03_legacy_vs_hto_record_scope.py`:

- Verifies the immutable original workbook SHA256, current public HTO records snapshot schema, official readback authority, 558/119 entry coverage, and 25 current exact-name mentions in the expected 10/2/7/6 group distribution.
- Rechecks the original, formula-less `#REF!` profile cells, the immutable `PlayerInfo` 15/13/28/196 summary, and the independently counted 15/13/51 legacy `RecordLedger` classes.
- Explicitly emits **`RECORD_COUNT_METHODS_DISTINCT_PROFILE_FORMULAS_UNRECOVERED`** and `activeProfileRecordsDefinitionCertified=false`, `totalProfileRecordsDefinitionCertified=false`.
- Rejects changed source counts, unsupported record authority, altered names or any attempt to count display-only rows as record holders.
- Performs **no Excel COM, HTO admin writes, public profile modifications, new record claims, or speculative identity matching**.
- Runs an offline, fail-closed suite in `tests/test_plan03_legacy_vs_hto_record_scope.py` (**8/8 PASS**) through the guarded source refresh workflow. A future verified source change requires explicit reviewed baseline update, not silent acceptance.

## Remaining Plan 03 decision

1. Reconcile legacy holder definitions with official HTO categories and source holder histories, including category changes, joint records, record-occurrence dates and career milestones. No forced 1:1 record translation.
2. Define precisely what **Active Records** means (current holders, active roster holders, currently unbroken records, or something else), and separately what **Total Records** means for this profile widget, with owner approval.
3. Only after the definitions are approved, test any new formulas against source groups **in a disposable workbook copy**; preserve `#REF!` baseline receipt and do not edit original Excel without separate backup and release gate.
4. Preserve HTO's native historical record book and current public player highlights; do not republish or edit as a side effect of this analysis.
5. The upcoming October 25 HTO game `3375682` is **pre-game** and not a new counted performance or milestone.

Related: [Plan 03 integrated tracker #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [record/profile source guard PR #51](https://github.com/adambrutto-maker/brave-hc/pull/51).
