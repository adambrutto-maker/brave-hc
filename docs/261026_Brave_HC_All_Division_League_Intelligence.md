# HockeyOS League Intelligence — All SVHL Sunday Divisions
Date: October 26, 2026
Lead department: Data & AI. Supporting: Engineering, Media and QA.

## Purpose
Know incoming division teams *before* they play Brave H.C., even when Sports Village moves teams between divisions. Source-supported evaluation includes their existing winter game-by-game results against named opponents, official current-season record, opponent-strength context, properly qualified prior-winter results and any accepted Brave H.C. historical Master Workbook / HTO head-to-head record. No invented win probabilities or presumed historical team renames.

## Grounded public-source snapshot
- Current 2026/27 SVHL Sunday Winter: official league 570, four competitive divisions plus one playoff placeholder division, 27 total team entries (26 competitive).
- 49 completed reciprocal nonzero-score games: matched opponent team ID, date, scheduled time, home/visitor designation and final score on both teams' official TeamInfo pages. All 27 teams' game-derived GP/W/L/T/GF/GA agree with the official standings source.
- 62 public 0–0 fixture placeholders are NOT automatically counted as completed. True 0–0 ties, if any, require independent evidence and must not be manufactured from placeholders.
- Previous 2025/26 Winter league 547: 34 teams across eight published divisions. 394 reciprocal nonzero-score results; 27/34 teams have complete game-level parity with the published standings. Seven lack full game details (e.g. unconfirmed 0–0/forfeit/draw entries), so the official previous-season standings remain the authority for those teams' season totals.
- 19 of 23 possible returning team associations passed a separate official player-ID overlap gate (three or more shared IDs and at least 25% of smaller roster). Name similarity alone is insufficient. Only source-reviewed Mohawks punctuation can be considered a candidate alternate prior display name.

## Maplewolves incoming-team example
- Current division: Cristillo. First four results: 0–4–0, 9 GF, 17 GA against Primary Auto (3–4), Butcher Brothers (1–3), Mighty Drunks (2–6), Young Guns (3–4). All four opponents are CURRENTLY in Remax; team assignments at original game date are not assumed from the latest division table.
- Opponents' current average WIN% (source W + 0.5T per GP): 53.1%. This is a measure of opposition faced, not a predictive skill score.
- Previous winter 2025/26 official Maple Hyundai Division: 11–10–3, 100 GF, 84 GA. Seven official player IDs overlap (46.7% of the smaller roster). Previous and current season records remain separate.
- Original Brave H.C. historical Master Workbook: ten exact-name Maplewolves games, Brave H.C. 3–6–1, 39 GF, 56 GA (eight regular season, two playoffs). Never merge this WLT with Maplewolves' league standings.

## Implementation files
- scripts/collect_svhl_league_intelligence.py: public read-only current and prior winter standings, source team IDs, TeamInfo fixtures and reciprocal validations. Four parallel fetches at a time. Private report with source SHA-256 and game-level evidence. No official team pages modified.
- scripts/build_svhl_league_intelligence_public.py: source-provenance and Master/HTO opponent parity; release only public team-level division/season records, current opponent context and roster-ID-overlap counts. Raw roster player names/IDs and original workbook files are NOT published.
- scripts/check_svhl_league_intelligence.py: public-only source validation of every game from both team perspectives, consistent league standings, source links, approved Brave H.C. names and canonical head-to-head records; includes a three-day staleness threshold for scheduled QA.
- scripts/publish_svhl_league_intelligence.py: daily qualified source collection, private timestamped historical snapshots, no-regression check for prior verified game results, whitelisted JSON-only publication through a clean Git main with fetch/fast-forward and no force push. Fails closed on source discrepancies.
- widgets/league-intelligence.json: source-verified public team and game data (no player personal details).
- widgets/league-intelligence.html and .js: full league comparison dashboard with all-division filter, source-referenced current performance, detailed opponents faced, prior-winter continuity, and Brave H.C. historical records. A source link from the existing Cristillo Division Centre preserves normal HTO homepage.
- .github/workflows/brave-league-intelligence.yml: read-only PR/main and scheduled public-contract checks. Does NOT scrape SVHL itself or write to the workbook.
- tests/test_svhl_league_intelligence_public.py, tests/test_svhl_league_daily_publisher.py and tests/test_svhl_league_intelligence_browser.cjs: full source/consumer/mobility/rollover regression.

## Risks and explicit release holds
1. The league may lag real HTO results, especially immediately after Sunday's game. The league ledger remains independently dated, distinct from official Brave H.C. HTO completed-game actuals.
2. Public TeamInfo page shape or duplicated/mismatched home/visitor results cause HOLD; no guessed stats.
3. Previous-season team identity requires official player-ID continuity; league team IDs are season-scoped. Prior-year results are NEVER added into current standings.
4. Source-driven team-level comparative metrics are factual, not a promise of future scores or playoff strength. Current sample sizes are four or fewer games for most teams.
5. League divisions can change any day. The daily private snapshot history captures evidence of movement without renaming franchises from league strings.
6. The Original Master Workbook stays SHA256-pinned and unchanged. Hot Stove approvals and projections remain governed by separate pipelines.

## Daily scheduling / rollback
Install a BRUTTECH 1 daily publisher at 10:15 a.m. Eastern, after Monday's 09:05 private HockeyOS ledger and 09:10 public opponent release, with a six-minute limit, one instance, StartWhenAvailable. First perform a no-write check, then a manual Task Scheduler run. Confirm success receipt, clean GitHub publishing worktree, green Actions and public HTO-page navigation. Back up schedule, script hashes and public prior JSON before activation. Rollback by disabling the single new task and reverting only its whitelisted league-intelligence.json release.
