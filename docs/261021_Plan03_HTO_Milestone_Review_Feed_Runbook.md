# Plan 03 — Verified HTO milestone review feed (publication held)

**Date:** 2026-10-21. **Lead:** Data & AI; Engineering/QA support. **State:** read-only source validation implemented; original Excel, HTO native records, public Watch widget and scheduled publisher unchanged.

## Purpose
The current HockeyOS scheduled Watch exporter fails before its record calculation when the external SVHL team page returns `Error: Uncaught` without the expected `tables` collection. The independently verified HTO collector/feed is healthy. To avoid coupling **source verification** to **public publishing**, `scripts/reconcile_hto_milestone_review.py` now accepts three explicit evidence objects and creates a **review-only** reconciliation result.

1. The pinned HTO v1 verified game feed: complete four-game discovery, HTO player aggregate parity, allowed official game IDs, exact official URLs and an offset-aware source timestamp no older than two hours.
2. The original, read-only legacy `261017_Bounded_Record_Watch_From_HTO.py` calculation: `VERIFIED_SUPPORTED_CATEGORIES_ONLY` milestone report with current `sourceAsOf`, game count, recorded event totals and baseline exclusions. The legacy source is private on BRUTTECH 1, not committed here.
3. The published native HTO historical Records snapshot: verified authority, complete entry count, exact Career Club record title, player name and recorded milestone date.

This design validates official game-event crossing and confirms that the milestone is **already published in the native HTO Records book**. It never proposes new official records from unsourced results and does not replace the original workbook-based scoring model.

## Live read-only verification
Source: BRUTTECH 1 HockeyOS, October 21, 2026. The official game feed contains 4 completed HTO games, 6 team goals for and 19 against. The source-level legacy threshold calculator returns 2 reached milestones, 0 live countdown candidates, and explicitly lacks career baselines for Damian Pavaday and Jamie Rosenberg.

| Verified existing milestone | Native HTO Records evidence | Official scoring sheet |
|---|---|---|
| Justin Carosi, 300 Game Club, September 20, 2026 | 3 - Justin Carosi (September 20, 2026) | game 3356177 |
| Michael Provenzano, 50 Point Club, September 27, 2026 | 20 - Michael Provenzano (September 27, 2026) | game 3356178 |

The historical book contains progression placements and numbers (3, 20 above): those are **not** the career milestone thresholds or invented game statistics. The milestones pre-existed in official HTO; this audit does not add them.

## How to reproduce
On BRUTTECH 1, run the unchanged private legacy calculation through its imported `calculate(verified_feed, saved_baseline)` function in a read-only session. Write that intermediate result only in a protected private Plan03 review directory. Then execute:

```text
python scripts/reconcile_hto_milestone_review.py --feed <PRIVATE_VERIFIED_HTO_GAME_FEED> --milestones <PRIVATE_CALCULATED_THRESHOLD_REVIEW_JSON> --records widgets/history-records.json
```

The CLI only prints review JSON; it performs **no output file write, HTTP request, HTO CMS update or public website publication**. Direct standalone `--milestones` inputs must carry exact recorded-threshold evidence from the immutable workbook, not manually prepared claims.

## Safety and QA
- Reject stale/future source observations, unsupported source schemas, new/fifth games, duplicate game IDs, wrong team boxscore URLs and missing/ambiguous player identities.
- Reject missing event stat delta, nonpositive or mathematically invalid threshold crossing, duplicate event, native record missing or date mismatch.
- Exclude PIM, goalie career milestones, unsupported streak/drought rules, and players lacking historical baseline rather than manufacturing values.
- Output is **REVIEW_ONLY_MATCHES_PUBLISHED_HISTORICAL_RECORDS** and `publicationAuthorized=false`. It does **not** fix stale 0–0/T original workbook scores, missing SVHL league tables, or the Git publisher divergence.
- Run `python -m unittest discover -s tests -p test_hto_milestone_review.py` (11 no-network cases), independently checked on BRUTTECH 1 against actual HTO source input and exact existing native record lines.
- Record-source refresh CI runs these tests before reading official HTO pages, so future changes cannot silently weaken their preservation gates.

## Next bounded integration gate
Separate downstream work may adapt this **existing-record-only** feed for a specifically labelled partial Watch panel while retaining `HISTORICAL_WORKBOOK_SNAPSHOT` for unverified workbook calculations. This requires reviewed UI semantics, a documented data-status contract, fresh independent QA, separate approval for public publication, and resolution of the Git publisher divergence. Do not replace `widgets/watch.json` with this review-only output or automatically advertise new record claims.

The October 25 HTO game 3375682 / workbook row 374 / game 363 remains a **future admission candidate**, not part of this four-game contract. It must only be admitted after the completed official boxscore and source join are verified.
