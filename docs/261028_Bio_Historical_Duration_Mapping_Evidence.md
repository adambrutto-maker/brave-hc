# Brave H.C. Player Bio - Read-only 18-Season Game-Duration Crosswalk

Verified October 28, 2026 on BRUTTECH 1, against the unchanged private Master Workbook. This is a format-comparison evidence receipt, not evidence that every HTO player total matches every workbook game log.

## Exact source identity

- Master Workbook: 261001_Brave_HC_Master_Workbook.xlsx (private, not copied into GitHub)
- SHA-256: 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154
- Workbook Master Schedule has season code in column C, game type in D. Z/AC formulas use ×2/3 when Summer is converted to Winter, ×3/2 when Winter is converted to Summer.
- HTO Player Career Archive: widgets/player-career-insights.json; 109 separately verified player IDs and 18 distinct season labels.
- All 18 HTO seasons map to 18 original workbook codes, with no guessed source season.
- Regular and playoff schedules (where present) share the same season-defined time format. HTO career season rows aggregate published game types.
- 32-minute Winter and 48-minute Summer comparison is verified by the workbook conversion formulas and founder confirmation. Period counts/minutes remain unverified.

## Duration mappings

| HTO season | Workbook source code | Workbook games (regular / playoff) | Source comparison duration |
|---|---|---:|---|
| Summer 2013 | S2013 | 9 / 4 | 48-minute Summer |
| Summer 2014 | S2014 | 10 / 2 | 48-minute Summer |
| Summer 2015 | S2015 | 10 / 3 | 48-minute Summer |
| Summer 2016 | S2016 | 10 / 3 | 48-minute Summer |
| Summer 2017 | S2017 | 10 / 4 | 48-minute Summer |
| Winter 2013/2014 | W2013/14 | 24 / 6 | 32-minute Winter |
| Winter 2014/2015 | W2014/15 | 21 / 6 | 32-minute Winter |
| Winter 2015/2016 | W2015/16 | 23 / 6 | 32-minute Winter |
| Winter 2016/2017 | W2016/17 | 21 / 7 | 32-minute Winter |
| Winter 2017/2018 | W2017/18 | 22 / 5 | 32-minute Winter |
| Winter 2018/2019 | W2018/19 | 26 / 3 | 32-minute Winter |
| Winter 2019/2020 | W2019/20 | 22 / 2 | 32-minute Winter |
| Winter 2020/2021 | W2020/21 | 3 / 0 | 32-minute Winter |
| Winter 2022/2023 | W2022/23 | 23 / 2 | 32-minute Winter |
| Winter 2023/2024 | W2023/24 | 24 / 2 | 32-minute Winter |
| Winter 2024/2025 | W2024/25 | 24 / 2 | 32-minute Winter |
| Winter 2025/2026 | W2025/26 | 24 / 3 | 32-minute Winter |
| Winter 2026/2027 | W2026/27 | 24 / 0 | 32-minute Winter |

## Application controls

- Main Bio chart retains raw HTO goals and assists. Actual, Winter equivalent, or Summer equivalent changes ONLY the points-per-game line.
- Formula: adjusted Pts/GP = HTO Pts × target regulation game minutes / source regulation game minutes ÷ HTO GP. GP=0 produces no rate. No intermediate rounding.
- Explicit 18 Season::ALL_HTO_GAME_TYPES bindings live in widgets/league-game-formats.json. Unknown seasons must remain HELD.
- This mapping verifies game-duration format only, not statistical equivalence of workbook player logs to HTO official totals.
- The original private workbook was read-only and remains unchanged. Published metadata contains no private player rows.
- Source-specific exceptions require independent verified game-level overrides; no silent historic remapping after managers change the current format.

## Release verification

- Run the 17 normalization tests and all 109 Bio player browser checks.
- New season, conflicted format, missing player ID or unqualified source rate must fail closed.
- Official HTO stats, records, awards and the homepage projection are unchanged.
