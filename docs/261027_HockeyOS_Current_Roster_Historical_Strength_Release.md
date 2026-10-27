# HockeyOS — Current-Roster Historical Strength by Verified Player ID
Date: 2026-10-27
Lead department: Engineering
Public scope: verified 22 current adult Sunday SVHL clubs only (Fazzari, Cristillo, Remax); VAHL, playoffs, other leagues excluded.

## Objective
Compare teams' current results and current-ROSTER player scoring with the exact same players' official past winter statistics, including archived seasons as early as 2016–17. Historical franchise/team names are not sufficient proof of roster continuity.

## Source and identity validation
- Source-qualified current adult Sunday league intelligence (official team IDs, current descriptor, standings, verified reciprocal results).
- Source-qualified current 22-team roster snapshot, 348 present rostered player observations, each with exact official player ID.
- Public archived roster-season evidence: 191 historical team-season pages, 3,222 archived player-season rows scanned; 596 source-verified historical observations linked to current rostered player IDs.
- Official archived competitive Sunday winter team standings for 2016/17, 2018/19, 2021/22, 2022/23, 2023/24, 2024/25 and 2025/26.
- Excludes off-scope VAHL even when a historical publisher erroneously labels that group as competitive.
- Observations without exact historical season + league ID + team ID + player-ID source agreement are not admitted into roster-strength arithmetic. Separate missing-year gaps are not interpolated.

## Method
1. Current team source strength context: ORIGINAL published descriptive team index /100; it already includes verified schedule context. It remains unchanged.
2. Current roster production: public-season points per game averaged over players rostered to the actual current source team who have published games. Current GP is observed, not lineup confirmation.
3. Historical same-player cohort: previous seasons only for exact player IDs CURRENTLY rostered. Current active returning players are compared only to THEIR own historical scoring; no name/fuzzy franchise matching.
4. Historical recency: each past source season PPG weighted by 0.82 raised to elapsed season years from 2025/26. A verified 2016/17 appearance is kept, at about 0.168 relative weight, rather than treated equal to last winter.
5. History-informed roster scoring reference (an EXPLORATORY early-season offensive context, NOT a prediction): for each currently active listed player, public current points and GP are combined with an individual archived recency-weighted PPG prior worth min(8, effective prior GP / 5) pseudo-games. Active players without archived source evidence get no history prior; no missing-data penalty or invented past score. Aggregate the resulting per-player PPG references weighted by each player's current source GP. This reference is a comparative scoring indicator, not a 0–100 calibrated overall skill, defensive measure, real opponent adjustment, win probability or fantasy forecast.
6. Historical competition context: archived standings show each previous source TEAM'S finish percentile-like position INSIDE ITS OWN ARCHIVED DIVISION. This describes success in its actual historical opponent grouping, not division skill tier equivalence across years, and is NOT silently used to boost the roster or official team descriptor.
7. Historical comparison is explicitly held for teams with fewer than four currently active source-ID linked returners or fewer than 30 effective historical source games; unverified future game-night attendance is never assumed.

## User interface
- League Intelligence Essentials: current team descriptive strength, source current roster PPG, history-informed scoring reference, returning-player current and previous PPG, roster-history coverage and archived team-context overview.
- Expand complete per-rostered-player current / historical official observations, links to official player profile, prior team division name, archived finishing rank, source GP/points, by winter back to 2016/17 where linked.
- Copy source-labelled roster history research note to clipboard; no messaging.
- Division Fit Lab: for each selected actual legal source-ID grouping, present average current roster rate, historical-informed reference, prior returning cohort scoring, and count of clubs with or without adequate historical evidence. Compare all 22 clubs in an expandable table. Copy only research notes; do not alter actual Sports Village assignments.
- Read-only separate module; no new scheduled publisher or source JSON write.

## Evidence boundaries
Historical player event totals are league-published counts, not independently game-sheet reconciled. A multi-team season may contain overlapping per-team game appearances; the interface presents published-source evidence, not claims of unique match attendance. Some historical official seasons are missing, and archived divisions are not calibrated against one another. A poor team record in a stronger division cannot be equated with a dominant record in a weaker division on raw win percentage alone. No standings change, player-talent optimizer weight, official redivision recommendation or automatic player assignment was authorized.

## QA and rollback
- New source-bound Node model tests must validate all 22 current teams, 348 roster observations, the 191 archival team-season index, 2016/17 downweighting, no-historical-evidence handling, VAHL exclusion, tampered IDs and all-22 division grouping integrity.
- Existing roster/league/division/weekly strength source regressions and independent public source validators must remain green.
- Real Chromium desktop 1140px and mobile 358px test verifies current-vs-historical data, source archives, missing history hold, changing the opponent, new division grouping cards, all 22 teams, clipboard-only copy and no errors/overflow.
- Rollback only the added roster-era JS/CSS integration + source-ID row metadata; preserve original team strength, prior roster modules and published immutable source files.
