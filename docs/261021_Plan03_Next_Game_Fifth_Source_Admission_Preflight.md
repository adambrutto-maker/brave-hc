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

## Machine-readable pre-game source join — independently rechecked 2026-10-21

`scripts/audit_next_game_hto_admission.py` checks the saved public HTO Countdown fixture, the separately synchronized SVHL fixture, the exact archived private Master Schedule row and the verified four-game HTO source. It performs **no network I/O, source mutation, workbook write or collector update**. The source association is admitted only as a `PRE_GAME_SCHEDULE_ASSOCIATION_VERIFIED_NOT_ADMITTED` review finding; actual new HTO boxscore and participant evidence remain absent.

Validated source set:
- HTO fixture: game `3375682`, Big Bastones, October 25 at 6:15 p.m. EDT, official **preview** URL.
- SVHL synchronization: `assignmentKey=hto:3375682`, `htoSyncStatus=MATCH`, same date, opponent, home status and 18:15 time.
- Archived private `AllTimeSchedule` source extract: a unique `W2026/27` regular-season dated October 25 row `374` with game number `363`. Original cached opponent is **blank**; do not claim it was independently filled or that workbook stats are current. Local source extract SHA256 `34e2addedd84e9e8ed49bfebe6438c3d4673a259cada5f3950e770c9e345ef98`.
- Current verified HTO feed: four prior completed IDs, player parity/discovery true; **no fifth completed game**.

Results: 10/10 synthetic acceptance/refusal cases **PASS** and live private inputs yielded the stated pre-game disposition. Tests reject conflicting HTO fixture date/opponent/time, invalid preview URL, changed SVHL mapping, ambiguous workbook row/game number, broken four-game feed and premature fifth-game presence.

**No automatic admission on October 25.** Following the actual game, re-fetch its completed official boxscore (not a preview) and perform new goalie/skater, date, team final and workbook unique-identity reconciliation, then stage and QA an explicitly mapped five-game collector revision with rollback.
