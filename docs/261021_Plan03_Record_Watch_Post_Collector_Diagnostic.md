# Plan 03 — Record Watch post-collector diagnostic and guarded remediation
**Observed:** 2026-10-21, BRUTTECH 1. **Release state:** `READ_ONLY_DIAGNOSIS / WATCH_PUBLICATION_HELD`. Related: [integrated tracker #30](https://github.com/adambrutto-maker/brave-hc/issues/30).

## What is proved
The previously pinned HTO collector was successfully installed without changing HTO admin, the original workbook or the website publisher. Its first hourly post-activation scheduled run (14:31 UTC) passed `read_hto`, `reconcile_game_boxes`, `countdown` and `hot_stove_drafts`. The actual verified feed contains completed HTO games 3356177/3356178/3369564/3375601, respectively (0–3, 3–6, 2–3, 1–7), with `allGamesDiscovered=true` and `playerAggregateParity=true`.

However, the scheduled `record_watch` stage was HELD with the unhelpful message `KeyError('tables')`. Read-only inspection of the exact local source shows the key access in `261017_Export_Watch_Workbook_Verified.py`:

```python
pages = {p["name"]: p for p in readback["pages"]}
league = pages["svhl_brave"]
matches = [t["rows"] for t in league["tables"] if ...]
```

The contemporaneous source file `261016_HTO_SVHL_Latest_Readback.json` has for **both** `svhl` and `svhl_brave` only `name,url,error`, with `error="Error: Uncaught"`, **no `tables` key**. This is a failed **external SVHL page readback**, distinct from the repaired **HTO collector schema**. Do not cast absent tables as an empty season, do not treat an old cached SVHL source as fresh, and do not infer official final scores.

The source exporter also reads `Web Streaks` and `Master Schedule` from the original Excel workbook without mutating it. Those four saved schedule results are still 0–0/T placeholders, so workbook final-score parity is **false** against official HTO games even when SVHL is available. A full current workbook-level Watch claim is blocked independently.

## Verified partial calculations — read-only, not published
Invoked the existing `calculate(feed,baseline)` function from `261017_Bounded_Record_Watch_From_HTO.py` without entering its write-producing `__main__`. The same source feed has four games, 2 supported historical-threshold milestone events, 0 countdowns and 2 absent historical baselines:

| HTO-supported event | Date | Interpretation |
|---|---|---|
| Justin Carosi — 300 Game Club | 2026-09-20 | Recorded-stat milestone crossing, also present in the existing approved historical book |
| Michael Provenzano — 50 Point Club | 2026-09-27 | Derived from recorded workbook baseline plus official HTO game point values; separate official public-record adoption required |

Missing history: `Pavaday, Damian`, `Rosenberg, Jamie`. Do not calculate unsupported career totals. The calculator explicitly excludes PIM milestones without complete game PIM, goalie career milestones, single-game record announcements and hat-trick record watches.

## Bounded next implementation
1. **Diagnostic:** make the SVHL readback check explicit: `SVHL_BRAVE_FINAL_SCORE_SOURCE_UNAVAILABLE`, with source status/checkedAt; never `KeyError('tables')` or stale-as-fresh.
2. **HTO-only partial option:** in an isolated copy, calculate current completed game dates and team finals from the verified HTO collector feed, **validate** exact unique official game IDs, dates, discovery completeness, team final scores, score parity and source recency, then compare with immutable archived workbook rows. Do not silently claim full parity when the original workbook has stale 0–0/T placeholders.
3. **Watch publication schema:** maintain distinctions between `VERIFIED_SUPPORTED_CATEGORIES_PARTIAL`, `HISTORICAL_WORKBOOK_SNAPSHOT` and `VERIFIED_CURRENT`. Preserve independent game-level identity and streak verification and fail closed on missing current HTO season stats or baseline.
4. **Isolated tests:** feed valid/invalid, SVHL page missing `tables`, HTO boxscore missing/duplicate/stale, data source conflict, missing workbook historical identity, and rollback on failure. Never run the original publisher during isolated QA.
5. **Release:** only after Engineering and independent QA validate exact reviewed local source and output, back up old scripts, staging worktree and widget feed. Stage a bounded change and separately resolve Git main divergence (#12). Do **not** force-push or overwrite the immutable workbook to make publication green.

## Cross-track status (do not conflate)
- **Standings publishing:** failed Git history/non-fast-forward — handled by #12, not an HTO parser failure.
- **Projections:** original workbook model `Unavailable readback` — separate workbook/model remediation.
- **Record Watch:** external SVHL readback unavailable + stale original workbook, while HTO-supported partial milestone derivation succeeds.
- **HTO collector:** succeeded on production scheduled run; do not roll back the working collector to mask other failures.
