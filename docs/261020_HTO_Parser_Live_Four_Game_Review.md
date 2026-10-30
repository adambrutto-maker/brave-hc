# HTO parser live-source review — October 20, 2026

Review candidate: `2c287fba3c0e3738fde3c6343432b6f83d73944f`.
Observed at 2026-10-20T19:41:19Z on BRUTTECH 1. This is implementer validation, not independent acceptance.

Initial live execution of f7e4402 passed September 20 but rejected September 27 due to the legitimate GTG named column. Header-only inspection confirmed GTG also occurs October 4. The candidate now explicitly accepts GTG without using it as an award component.

Read-only validation loaded the pinned helper in memory, extracted only the existing HTML parser class through AST (did not execute the active collector), fetched four official HTO boxscores, parsed named skater/goalie columns and compared each game's goals and goalie GA against its scoreboard.

| HTO game | Skater rows | Goalie rows | GF | Assists | GA |
|---|---:|---:|---:|---:|---:|
|3356177|14|1|0|0|3|
|3356178|15|1|3|5|6|
|3369564|13|1|2|3|3|
|3375601|12|1|1|2|7|
|Total|54|4|6|10|19|

All four per-game checks passed. October 18 goalie POTG remained unknown. Known PIM sum is 2; 42 skater rows have no PIM column and remain unknown. Do not claim complete PIM parity from that sum. Current season aggregate player-level parity was not rechecked in this run. These results do not establish workbook mapping, eligibility or award formula parity.

CI for the code commit passed: https://github.com/adambrutto-maker/brave-hc/actions/runs/39485565278

## Remaining integration requirements

- Obtain attributable independent review before production integration.
- Use the independently audited game-ID-to-workbook mapping; active collector currently derives workbook numbers using 359 + list index.
- Preserve unknown per-game goalie POTG in aggregate completeness metadata; the active collector initializes aggregate POTG to zero and skips unknown inputs.
- Demonstrate fresh player-level season aggregate parity, including explicit missing-stat handling.
- No active collector, scheduled task, workbook, publishing checkout or website was modified by this validation. No messages were sent.
- Earlier blocked workbook and publisher operations were not retried. Workbook recalculation and publication remain held under their separate gates.

## Fresh season-stat comparison — 2026-10-20T19:43:31Z

Fetched the four boxscores again and the official current HTO season stats page in one read-only process. Compared identity sets and all complete relevant integer fields by exact published player name:

- 20 skater identities, 3 goalie identities; no identity-set discrepancies.
- 131 complete field comparisons; zero mismatches.
- Skater fields: GP, G, A, Pts, +/-, POTG.
- Goalie fields: GP, L, GA, POTG where complete.
- Dev Leong POTG: known game subtotal 1, one game unknown, published season total 1. The omitted game remains unknown; no per-game inference or zero substitution.
- PIM parity remains incomplete because 42 game rows omit that column.
- This supersedes the earlier statement that season aggregate parity had not been rechecked, for the complete fields listed here only.
- Original workbook and production collector were not changed.

## Existing workbook mapping readback

Read the existing private AllTimeSchedule join manifest on BRUTTECH 1. It associates HTO 3356177/3356178/3369564/3375601 with workbook games 359/360/361/362 at Master Schedule rows 370/371/372/373.

The saved workbook scores for all four are 0-0 with result T, explicitly classified as stale unscored placeholders in the manifest. Verified source scores are 0-3, 3-6, 2-3 and 1-7. Operational commissioning must include the schedule results, not only 44 player-row additions and Dev's existing-row correction. Do not modify the immutable original.

This readback confirms the archived mapping contract; it is not a new independent workbook audit or formula recalculation. Attributable independent review, controlled integration, workbook commissioning and release authorization remain outstanding.

## Repeatable review tool

Code commit: 8a690457b06ab26af942ca4d4cc86f1123a29b69.

Run from the checked-out review branch:

```
python -m unittest discover -s tests -p test_hockeyos_hto_boxscore_header_review.py
python scripts/hockeyos_review_four_game_source_parity.py --live-read-only
```

The second command performs public GET requests and emits JSON to stdout; it never imports the production collector, writes workbook/feed files or invokes a publisher. It intentionally covers only the four audited game IDs, not future game discovery or operational ingestion. It exits nonzero on complete-field discrepancies. Incomplete fields remain separately reported, not promoted to complete parity.

Isolated BRUTTECH 1 verification: 21 unit tests PASS, including the actual GTG header regression. The repeatable command completed its live comparisons at 2026-10-20T19:46:26Z: four games, 54 skater rows, four goalie rows, 131 complete season-field comparisons, zero discrepancies, one unknown goalie POTG, 42 missing skater PIM entries. This is implementer verification, not independent signoff.

Production correction, schedule-row updates, controlled Excel calculation and website release remain unperformed.
