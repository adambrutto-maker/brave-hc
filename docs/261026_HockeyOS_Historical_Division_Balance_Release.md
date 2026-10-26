# Brave H.C. HockeyOS — Historical League Intelligence & Division Balance

**Implementation date:** October 26, 2026  
**Scope:** Source-verified historical Sports Village standings, historical Brave H.C. game linkage, plain-language opponent profiles and weekly division-strength evidence.

## Objective

Support game preparation and an eventual evidence-backed Sports Village division review. This release measures and preserves **what the verified data says**, but does not yet create a proposed or league-endorsed divisional reshuffle.

## Historical sources admitted

- **Official Sports Village Sunday Winter standings:** 2018/19 (league 420), 2021/22 (476), 2022/23 (494), 2023/24 (512), 2024/25 (531) and 2025/26 (547). Six source-hash-pinned seasons, 49 published division tables and 175 competitive team-season entries (excluding auxiliary old-timers and playoff-placeholder tables).
- Sports Village's archived page markup changed around the earlier seasons; the standalone historical parser accepts both the older logo-bearing division headings and newer ones, without altering the existing live collector.
- The original Brave H.C. **Master Workbook is unchanged** and SHA256-pinned to `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`. Its private source stage covers 358 completed games from May 5, 2013 through March 22, 2026, across 17 source-labelled seasons.
- A private season/name matching review identified 41 same-season, exact-name candidates. A second independent check against the official archived TeamInfo game schedule admitted **79 game-date/opponent/opposite-perspective-score comparisons** across 35 season-team sources and held **24** game comparisons, including cases where the public site displayed unverified 0–0 placeholders. All 15 2018/19 Master candidate comparisons remained held; no invented bridge was created.
- Only the **79 admitted**, privacy-minimal team-season game facts are published in `widgets/brave-historical-verified-games.json`, with official original team page URL, source page SHA, Master source SHA, season, date, opponent, Brave GF/GA/result and qualified aggregate. No player roster details, private file paths or unrelated Master game rows are exported.
- **2019/20 and 2020/21 official league archives remain unresolved.** The Brave Master still supplies historical context for those seasons privately; missing official archives are not silently reconstructed.

## Identity and statistical separation

Every official Sports Village team ID is **league-season-scoped**. Same-name team entries across years are discoverable as possible historical records, but **not assumed** to be the same franchise or returning roster.

Three evidence levels must remain distinct:

1. A currently admitted SVHL 2026/27 roster/team linked to qualified 2025/26 official player-ID continuity (existing strength-model gate).
2. Verified Brave H.C. head-to-head history against a currently approved opponent identity (existing independent Master/HTO public opponent admission).
3. A specific archived Sports Village **team-season** whose source game date, opponent and opposite-perspective score match a dated Brave H.C. Master game. This proves that historical game comparison for that season only, not ongoing 2026/27 roster strength or a 2018-to-2026 franchise chain.

The 79 historical game joins can be discussed by the division an opponent was competing in **that season**. Those old results do not directly raise or lower a current team's schedule-adjusted score.

## Weekly strength tracking

New `scripts/build_svhl_weekly_strength.py` appends an evidence-based weekly ledger into the existing `widgets/league-intelligence.json` publisher result.

- Toronto-local week starts on Monday. The current open week is replaced with the latest accepted source capture; all previous closed-week snapshots are immutable.
- Each observed week retains every official source team ID, published current division, source game record (GP/W/L/T/GF/GA), descriptive index, rank, current form, difficulty, prior qualification flag, sample caveat and source fingerprint.
- The **first weekly baseline** is the accepted October 26 capture of 27 team entries. No earlier score values are invented.
- The existing daily BRUTTECH 1 publisher continues at **10:15 a.m. Eastern**. It calculates the weekly snapshot after verified results, movement and scoring, and before public-source acceptance. It is not a new scheduled task.
- Independent source validation checks latest-week numeric parity and the source model, while publish-time monotonic checks forbid rewriting past closed weeks.

## Plain-language dashboard

The League Intelligence page now adds:
- Simple descriptions of current team wins/losses/ties, goals scored and allowed per game, uncertainty and how often opponents currently belong to other divisions.
- Qualified previous-winter performance and Brave H.C. historical head-to-head records clearly separated from same-name unqualified historical archive entries.
- Links to **source-confirmed Brave H.C. game observations** for matching archived team-seasons, each labelled not proof of a current roster link.
- Current division balance summaries (team count, average games, range/spread of 0–100 descriptive index, and cross-division game observations).
- A six-season browsable original standings archive, with original official links and visibly separated ancillary/noncompetitive sections.
- A human-readable **Copy division review notes** action; no sending to league management or other staff.

## Readiness threshold for division realignment

The status is `EARLY_RESEARCH_NOT_A_DIVISION_RECOMMENDATION` until:
- At least four accepted weekly observations;
- At least 75% of current competitive teams have played ten source-confirmed games; and
- A human review reconciles roster continuity, cross-division actual results, travel and scheduling constraints and league governance.

Even after the numeric threshold, modelled division groups remain a **proposal for review** rather than an automatic reclassification. Group score averages and spread are descriptive measures, not calibrated skill probabilities.

## Quality gates and rollback

- Independent checks for every archived division standings record and every public admitted historical game link against the official historical league index, including dates, scores, source IDs and hashes.
- Tests cover weekly Toronto time boundaries, immutable older weeks, same-week latest replacement, division transfer retention, historical name-only joins, standings parity, unknown franchise identities and no invented predicted outcomes.
- Chromium desktop/mobile tests cover archive browsing, readable opponent reports, division research clipboard and preservation of the original scouting/next-game functions.
- GitHub CI runs historical/weekly checks alongside the existing live collector and source-preservation suite.
- Production promotion follows CI PASS, versioned local runtime script backup, a no-write collector replay, controlled original Task Scheduler run, independent GitHub Pages release check and live desktop/mobile browser QA.
- Original Master Workbook, private snapshot records, authenticated HTO, SVHL source, goalie assignments and editorial content are never modified.

**Rollback:** Revert the scoped historical UI and publisher-model changes after preserving the previous public league JSON and restoring the local runtime scripts; do not delete prior private evidence snapshots.
