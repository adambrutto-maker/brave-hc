# ENG CHAT 61 — Season-Agnostic Last 3 / 5 / 10 Player Scoring Form

Date: October 29, 2026
Release candidate: HockeyOS Player Bio V3.6.7
Lead: Engineering; Data & AI historical eligibility and QA support
System: Brave H.C. Player Intelligence → Career Trends → Scoring Form
Source policy: Public HTO skater boxscore evidence and official historical season GP parity only; original workbook, statistics and HTO-native content read-only.

## Approved user correction

Last 10 means the ten most recent verified games actually played by that skater for Brave H.C., whether those appearances come from the current season, previous seasons, or source-qualified playoffs. The season boundary does not reset the last-ten counter. The same principle applies to Last 3 and Last 5. Forfeits without player appearance are not games played by a skater.

Results are ordered by actual official game date and scheduled start time, not game ID or season row position. Two different games played on the same day are distinct player appearances if both are supported.

## Independently matched HTO sources

- Current Winter 2026/27: widgets/player-form-appearances-v364.json, verified against all five official HTO scorecards, including explicitly named zero-point GP=1 appearances.
- Historical team game index: docs/hto-highlights-rollout/261020_Historical_Boxscore_Index.json.
- Archived HTO game readbacks: docs/hto-highlights-rollout/261020_Game_Level_Readbacks.json and qualified docs/hto-highlights-rollout/game-audit-evidence/261020_Continued_Boxscores_*.json.
- Per-player historical GP/G/A/PTS: widgets/player-career-insights.json, with exact verified HTO profile IDs.
- Official Winter/Summer game-duration normalization: widgets/league-game-formats.json.

An archived skater stat row is only accepted as an appearance after the entire indexed season is source-complete and that player's accumulated game-row GP/G/A/PTS exactly matches independently verified HTO player-season totals. This includes official nonscoring appearances.

Any season with gaps or ambiguous published statistics remains held. A player's timeline stops at that player's first intervening unqualified season rather than jumping over missing appearances to manufacture Last 10.

The generated feed records source hashes and qualified game IDs, dates, start times, phases and game durations. The client validates the current feed's as-of timestamp, game coverage and individual scoring totals, plus season-scoped historical game provenance.

## Verified coverage at release preparation

| Source evidence | Count |
| --- | ---: |
| Current players / official GP | 20 / 67 |
| Current players with 10 verified Brave appearances | 12 |
| HTO career timelines with at least 10 verified appearances | 30 |
| Total qualified player timelines | 88 |
| Winter 2026/27 games | 5 |
| Winter 2025/26 games | 27 (three no-player forfeits) |
| Winter 2024/25 games | 26 (one no-player forfeit) |

Older official seasons are used only after full indexing, game scoreboard, verified duration, player identity and historical season total parity. Older years with gaps remain held.

Examples from independently certified sources:

- Justin Carosi: five Winter 2026/27 and five Winter 2025/26 (including both separate March 22 doubleheader games). Last 10 = 0.90 raw PTS/GP.
- Stéphane Saindon: four current plus six previous Winter 2025/26. Last 10 = 1.20 raw PTS/GP.
- Stefano Ardizzi: one current, one Winter 2025/26 and eight Winter 2024/25. Last 10 = 0.90 raw PTS/GP.
- Nolan Atkins: fewer than ten fully qualified Brave appearances; Last 10 stays held.

## Rate and adaptive icon

Displayed PTS/GP is the raw verified points divided by the number of real player appearances across season boundaries, including eligible playoffs.

For a verified 48-minute Summer source, the adaptive arrow comparison uses only a separately calculated Winter 32-minute equivalent scoring rate (per game points multiplied by 32 / source game minutes). The raw displayed PTS/GP is preserved without adjustment.

Five display levels remain COLD / COOL / NEUTRAL / WARM / HOT. Original workbook classifications and forecast calculations remain unchanged.

## Source and client fail-closed gates

The new derived JSON is widgets/player-form-cross-season-v367.json. It does not replace the already verified current-season feed.

The browser requires exact current feed season/time/GP/game ID match, original game scoring parity and historical source-season coverage, duration, date, start time, phase, URL and game identity.

If the derived cross-season feed is stale, missing or malformed, independently certified current-only Last 3 or Last 5 can still display, but no unverified prior-season Last 10 is invented.

The Bio user interface shows source-qualified P/GP, matching adaptive five-level badges, source-season coverage and accessible provenance covering the oldest and newest verified appearances. Unsupported player windows continue to display SOURCE HELD.

## Source refresh, verification and rollback

The new automated workflow revalidates after updates to the current verified HTO appearances, HTO career or historical game sources and is also scheduled for routine source verification.

The workflow can write only the derived source-qualified cross-season JSON. It never edits native HTO games, scorecards, historical player records, projected workbook statistics, attendance or game-night assignments. A mismatch fails closed.

Independent tests include first and last verified games, current/prior/older season inclusion, previous Winter playoff games, the March 22 doubleheader ordering, non-participating forfeits, unsupported historical source gaps, game URL/date/player identity tampering, missing current feed, browser accessibility and responsive 320/390/625/1280px presentation.

Rollback: revert only the V3.6.7 source and form release. V3.6.6's verified current-season feed and V3.6.5's historical team dispersion stay independently usable.

Remaining dependency: The original workbook projection remains provisional. Live team-dispersion weighting cannot activate until its separate reconciliation checks pass; real historic Last N P/GP does not require approval of that forecast.
