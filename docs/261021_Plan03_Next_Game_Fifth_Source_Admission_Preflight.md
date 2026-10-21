# HockeyOS Plan 03 — October 25 fifth-game admission preflight

**Evidence readback:** 2026-10-21 on BRUTTECH 1. **Disposition:** `PRELIMINARY_SCHEDULE_JOIN_ONLY / FUTURE_GAME_NOT_ADMITTED`.

## Grounded candidate association

| Attribute | Verified or archived value |
|---|---|
| Official upcoming HTO game ID | `3375682` |
| HTO preview status | Public HTTP 200; exact `gameID=3375682` and opponent name Big Bastones present |
| Official schedule/date | October 25, 2026, 6:15 p.m. ET; Big Bastones; Vaughan Sports Village - A Rink, as captured by current HTO schedule/countdown readback |
| Archived master workbook season | `W2026/27` |
| Archived `Master Schedule` sheet row | `374` |
| Archived `AllTimeSchedule` game number | `363` |
| Archived row game type | Regular Season |
| Archived row date | `2026-10-25` (Excel serial interpreted with the standard 1899-12-30 epoch) |
| Archived row opponent | Empty/not verified against source; must not invent or fill automatically |
| Archived row score/result | `0-0 / T` **stale unscored placeholder**, not a prediction or result |
| Saved source workbook SHA256 | `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154` |
| Source workbook evidence | `D:\BruTTech\Products\HockeyOS\261019_HotStove_V1\261019_AllTimeSchedule_ReadonlyExtract.json` (local; not a public source) |

The October 25 row is the next distinct, dated regular-season row after the four previously source-matched workbook entries 359–362. This is an **explicit date-and-season candidate**, **not** arithmetic `359 + index`, and does not yet establish the final actual scoring result or roster.

## Required after-game admission checks

1. Check that official HTO game 3375682 is truly **completed** and its actual boxscore (not preview) records the correct date, opponent, score, skaters and goalies; treat unavailable stats as unknown.
2. Refresh the source workbook extract or independently confirm `W2026/27`, row 374 and game 363 remain uniquely bound by the same date, game type and verified opponent, with no duplicate/conflicting HTO game IDs.
3. Admit the explicit mapping only through a separately reviewed collector contract/version and fixture, with exact source evidence and parity for **all five** games; do not silently drop game five or mark a four-game batch complete after it is played.
4. Carry forward verified unknown-vs-zero, goaltender POTG, PIM incompleteness, stable player identities, and source-observation timestamps. Keep the original master workbook immutable.
5. Back up active collector/feed/task before any future update; perform pinned-package, isolated QA, scheduled-task and rollback checks. Approval of this review **does not itself authorize a production five-game collector release**.

## Current production boundary

The pinned collector activated 2026-10-21 is a **four-completed-game** bounded runtime; it purposely fails closed on a newly completed/unmapped fifth game. This preflight reduces next-game mapping risk but does not remove that gate. Keep Game 5 admission under Plan 03 / Issue #30 with Engineering and independent QA.
