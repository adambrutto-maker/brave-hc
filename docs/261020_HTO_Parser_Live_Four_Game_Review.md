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
