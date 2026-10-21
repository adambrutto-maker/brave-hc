# HockeyOS Plan 03 — Four-game official HTO period ledger and workbook correction review

**Evidence checked:** 2026-10-21 (read-only BRUTTECH 1). **Status:** `FOUR_VERIFIED_RESULTS_READY_FOR_WORKBOOK_OWNER_REVIEW_NOT_APPLIED`. Lead department: Data & AI; workbook-owner Engineering/QA approval required before any source-of-truth spreadsheet change.

## Why this matters

The official HTO four-game source reports Brave H.C. at **0–4**, six goals for and nineteen against. The immutable, archived legacy Master Workbook continues to cache these 2026/27 schedule games as **0–0 / T**, with no accepted source-period values in rows **370–373**. The difference affects more than a scoreboard: the workbook's *per-game counted-row formula* for `X` explicitly tests numeric period-input cells `K:N,P:S`. Merely updating final-score cache columns `O/T` or overwriting the calculated `U` result could fail to mark games as recorded and break downstream calculations. The period cells, formula dependencies and manual source-authority workflow must be reviewed first.

The original workbook is **unchanged**, as confirmed by SHA-256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`. The previously reviewed workbook extraction is `261019_AllTimeSchedule_ReadonlyExtract.json`, SHA-256 `34e2addedd84e9e8ed49bfebe6438c3d4673a259cada5f3950e770c9e345ef98`. The official 2026/27 HTO game feed and private official scoreboards were separately read and reconciled.

## Authoritative results and four-period shadow

HTO public official per-game boxscores supplied all listed values. Each HTO scoreboard provides periods **1, 2, 3, OT, 2OT, Final**; **2OT was zero for both clubs in all four games**. The legacy workbook presents four first/second/third/OT-style period inputs, so the proposed review only aligns the first four. Any future nonzero 2OT entry must HOLD and require a separately reviewed schema change.

| Date | Official game ID | Book game / sheet row | Brave K:N (1,2,3,OT) | Opponent P:S (1,2,3,OT) | Expected GF–GA | Expected result |
|---|---:|---|---|---|---|---|
| 2026-09-20 | 3356177 | 359 / 370 | 0,0,0,0 | 0,2,1,0 | 0–3 | L |
| 2026-09-27 | 3356178 | 360 / 371 | 0,1,2,0 | 1,2,3,0 | 3–6 | L |
| 2026-10-04 | 3369564 | 361 / 372 | 2,0,0,0 | 2,0,1,0 | 2–3 | L |
| 2026-10-18 | 3375601 | 362 / 373 | 1,0,0,0 | 2,3,2,0 | 1–7 | L |

Original cached opponent entries were present for Dateline Predators and an explicitly reconciled shorthand `Mohawks HC`. They were **blank** for the October 4 Michelob Morts and October 18 Zamboner Crew games. Both are confirmed in the HTO source but are **not** silently populated into the original workbook by this Plan 03 activity.

## Source and private evidence

- Direct fresh official HTO boxscore pages were parsed through the existing pinned `hockeyos_review_four_game_source_parity.py` GET-only verifier, including canonical URL, official game date, team identities, all six scoreboard columns, numeric-period sums and score parity with the active four-game HTO verified feed.
- The privately stored four-source-period receipt is `D:\BruTTech\Products\HockeyOS\Plan03\source-archive\261021_HTO_Official_Four_Game_Periods_PRIVATE.json`, SHA256 `81790e38b0ff2a4563cb4fbf5d94911640e4bdd41a736d8e5c5fc419cee9066c`. It records per-source response hashes; **no raw official page HTML** was published.
- `scripts/plan03_review_workbook_period_reconciliation.py` is **read-only**. It requires explicitly supplied period snapshot, archived schedule extract, verified HTO feed and original workbook path (hash check only). It does not open Excel for editing, write any XLSX, publish statistics, change the HTO CMS or infer future-game results.
- Strict checks include original source hashes, complete known four-game IDs and explicit HTO game-date/workbook-number mapping, 2OT zeros, official date/canonical URL/scoreboard source, positive evidence for all period values (including numeric zeros), unchanged 0–0/T stale baselines, existing formula signature, unique row joins, and allowed exact-name historical opponent cases. Anything unexpected stops the proposal.
- First verified read-only real-input execution: **4/4 matching official games, GF=6, GA=19, four expected L results, no original workbook writes**.
- Private reviewer manifest and source-hash receipt: `D:\BruTTech\Products\HockeyOS\Plan03\source-archive\261021_HTO_Workbook_Period_Shadow_Review_PRIVATE.json`, SHA256 `1822ac438d43747ab25fcd9a3f68cc807812b36f2f210ca259d62c5888c9f022`.

## Safety-critical formula and business validation

The legacy result `U` is driven by `AllTimeSchedule[[#This Row],[+/-]]`; `X` (game counted) depends on game-number numeric validation and **COUNT(K:N,P:S) > 0**, including explicitly entered numeric zero values. The cached `W` goal difference is currently 0 and the proposed source-derived differences are **-3, -3, -1, -6**. The original workbook's full calculation and dependency chain is **not certified**, even though its cached formula text is available. This package is **not** authority to overwrite formula cells `U`, `X`, `Y` or any derived values, nor to alter the original 21 MB workbook.

### Required approval before changing the workbook

1. Confirm the live source workbook still matches the approved SHA and create a protected, independent binary backup/rollback receipt.
2. Inspect and validate the **actual 2026/27 Excel input columns**, structured-table formulas, sheet protections, external links and recalculation behaviour, not only the cached JSON extraction.
3. In a **disposable copy only**, apply the four reviewed numeric period inputs and approved missing opponent names. Ensure the game count, GF/GA, W +/- , result, team/player statistics, historical calculations, source rules, and downstream projection/Watch views agree after **real Excel recalculation**. Do not force cached `Result=T` to another value outside its formula logic.
4. Obtain explicit workbook-owner authorization for exactly which cells and downstream formula handling will change; identify what remains intentionally stale or outside scope. Native HTO statistics remain independently authoritative.
5. Preserve independently reviewed QA and rollback receipts before any source-of-truth promotion. Publication of a full live Record Watch/projections is a **separate** release gate, not automatically granted by this four-game review.

## Test and cross-plan handoff

No-network tests: `python -m unittest discover -s tests -p test_plan03_workbook_shadow_periods.py` — **15/15 PASS**, including source SHA drift, fifth-game/duplicate IDs, stale evidence, period-vs-final conflict, duplicate workbook join, nonzero 2OT refusal, opposing club conflict, already-modified period cells, missing formulas and preserved no-edit status.

**Handoff to the existing workbook/projection implementation plan:** this package supplies exact four-game HTO periods, full provenance, cell-location suggestions and hard stopping conditions. It is not an instruction to edit on the TCDSB work computer, nor a blanket workbook correction approval. Keep plan ownership separate.

## Future fifth game

The pending **October 25, 2026** Big Bastones game `3375682`, provisional workbook game `363` / row `374`, is **not** in this four-game manifest. Revalidate completed official HTO source, fifth-game season statistics, goalie POG unknowns, new player identities, and the unique source-book join before advancing the pinned collector. A preview/countdown is never evidence of a final result.
