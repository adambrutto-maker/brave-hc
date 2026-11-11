# HockeyOS Awards — BRUTTECH 1 Excel COM synthetic runtime check

**Date:** 2026-10-20  
**Lead:** Engineering / HockeyOS  
**Scope:** Technology commissioning only, **no original or operational workbook opened**.

## Why tested

Previously saved read-only source-plan QA reconciled the four official HTO games to 58 player-game records and 44 proposed missing rows. That does **not** establish whether BRUTTECH 1's installed Microsoft Excel can be invoked for governed recalc.

A minimal synthetic in-memory evaluation was conducted via a **fresh normal-user COM `Excel.Application` instance**, not via the original Brave H.C. workbook or its disposable source copy. Excel reported `Version 16.0`, zero workbooks open. The session was asked to quit and its COM wrapper released.

## Synthetic results

| Representative Excel operation | In-memory expression | Expected | Result |
|---|---|---:|---|
| Maximum rank-field helper | `=AGGREGATE(14,6,{10,20,30},1)` | 30 | PASS |
| Minimum rank-field helper | `=AGGREGATE(15,6,{10,20,30},1)` | 10 | PASS |
| Lookup | `=SUM(IFERROR(INDEX({10;20;30},MATCH(20,{10;20;30},0)),0))` | 20 | PASS |
| 50–100 normalization arithmetic | `=ROUND(50+((20-10)/(30-10))*50,1)` | 75 | PASS |

**Final: 4/4 PASS.** An initial direct `Excel.Evaluate(INDEX/MATCH)` returned an array-shaped COM value containing the correct number; wrapping in `SUM` established scalar-valued comparison. This is a marshaling/fixture issue, **not** an indication that actual table lookups or the whole award model have been tested.

Private receipt:
`D:\BruTTech\Products\HockeyOS\261019_Award_GameLog_Staging_v1\261020_HockeyOS_ExcelCOM_InMemory_Formula_Runtime_QA_REVIEW_ONLY.json`.

A separate fictional QA workbook was also prepared in the ChatGPT sandbox as a future *manual* structured-reference test fixture; it was **not copied to BRUTTECH 1 or used in this Excel COM evaluation**. This document must not imply that a real workbook successfully recalculated.

## What this does and does not unblock

**Confirmed:** an Excel 16 COM automation instance can activate and perform representative `AGGREGATE`, `INDEX/MATCH` and normalization arithmetic. There is no need to guess whether the Excel executable or these basic functions exist.

**Not confirmed:** compatible calculation/relinking of the massive real source workbook, structured table expansion, preserving 158 original skater and 116 original goalie source columns, 130/89 formula cells in last saved rows, `Y4674` collision, historical formula equivalence, 11-award eligibility/OVR rankings, actual HTO source freshness, protected writer key custody or unattended host scheduler integration.

**Still blocked:** earlier safety-blocked original-workbook inspection and patch-generation routes must not be retried through alternative tools; this synthetic probe is not an attempt to circumvent those safeguards. Review-controlled and independently authorized access to a *separate operational copy* with rollback is a distinct release gate.

No original Master Workbook opened or modified; no Game #359 Dev Leong correction performed; no official HTO results rewritten; no live publisher, Awards Centre OVR or GitHub main changed. No security reviewer/Founder acceptance claimed.

**Disposition:** `EXCEL_COM_BASIC_FORMULA_RUNTIME_PASS / REAL_WORKBOOK_RECALCULATION_NOT_TESTED / AWARDS_MODEL_HOLD`.
