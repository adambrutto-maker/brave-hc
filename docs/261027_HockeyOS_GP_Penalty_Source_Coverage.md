# HockeyOS — Individual Attendance and Penalty Evidence Boundaries

**Source audit date:** October 27, 2026  
**Status:** Source-qualified scoring-game appearance *minimum*, not verified player GP or PIM.

## What the official Sports Village source provides

Sports Village's public `PlayerInfo.aspx` shows aggregated season GP, G, A, PTS, PIM but, in the inspected 2026/27 player pages, does not provide game-by-game participation lists. `GameInfo.aspx` contains goal scorer events (linked player IDs) and assists as name text, which HockeyOS already qualifies only when uniquely joined to that same official season/team roster. A goal or admitted assist is positive evidence of involvement in a particular game; a missing scoring event provides **no evidence of absence**.

GameInfo pages expose four `ctl00_MainContent_GridViewPenaltiesPeriod{1,2,3,4}` table elements. The observed schema reuses the headings `Period / Player / Team / Assist`, so a header alone is not a penalty and does not establish an attributed penalty duration. A deterministic read-only sample of **17 games from each of eight independently admitted winter seasons** was collected with page SHA256 source fingerprints: **136 sampled GameInfo pages, all four period tables present, zero populated penalty-event rows**. This means the sampled source pages have no per-game penalty information to reconcile, **not** that no players were penalized or have zero PIM.

No private Master Workbook, HTO game administration, Sports Village system or player records were modified.

## What HockeyOS now derives

Pure module `widgets/player-participation-evidence.js` calculates **source-proven minimum distinct scoring-game appearances** for a selected player on a particular season-team. It admits only:
- A GameInfo scoring event from a **full final-score-matched source game sheet**.
- An official scorer player ID, or an assist admitted by the existing same-team, unique-name source gate.
- A GameInfo game ID, date, URL and source-page hash that exactly match the independent season evidence shard.
- The same source team/league ID as the player's season record.

Multiple goals/assists in one game count as **one minimum appearance**. The result compares that number with *published* season GP and labels the difference **published GP without independent game-level appearance evidence**, never absent games. If the minimum exceeds published GP, it displays a **source contradiction** rather than correcting the roster automatically.

The public Player Game Audit now shows distinct source-proven scoring-game appearances, published GP, the unverified remainder, direct links to the supporting game sheets and a separate penalty coverage section. Its copied internal audit includes the same precise limitation. Existing player-season G/A discrepancies, score-scope holds and official profile links remain intact.

## Source completeness and limits

- **Eight official season game datasets, 2,206 reciprocal completed game sheets, 2,069 with full scorer-to-final-score parity, 137 with held scoring data**, as in the existing accepted GameInfo release.
- **136 additional deterministic penalty schema source pages sampled**. Not an exhaustive check of every GameInfo sheet. The sample does not allow inference about the other 2,070 games.
- The published `widgets/svhl-penalty-source-coverage.json` retains league ID, game ID, canonical source URL, SHA256 fingerprint, four table count and populated-row count for each sampled page, with an explicit no-GP/PIM qualification.
- The existing source-scoped scorer-event index is unchanged. Sampled source pages may later change, and the timestamp is retained.
- The user-selected player and season must pass GameInfo player/team/source proof validation; a source error holds the new insight rather than displaying false attendance.

## QA and governance

`scripts/check_svhl_penalty_coverage.py` validates all 136 captured URLs, source hashes, unique game identities and their deterministic membership in the previously admitted official season files. `tests/test_player_participation_evidence.cjs` checks ten cases, including distinct-game deduplication, no-score not implying absence, a player-GP contradiction, unknown GameInfo IDs, tampered source hashes, attempted promotion of partial events, nonzero penalty row refusal, PIM nonclaims and source immutability. Existing `tests/test_svhl_player_game_browser.cjs` checks that desktop and phone UI and copied player report display these limits.

Do **not** change the published GP or PIM using this research. To reconcile full attendance and penalties, acquire a truly player-linked official game participation record and per-penalty player identity/duration source; then perform a separate independently reviewed data model and full coverage proof. No speculative join by player name or team roster alone.

**Rollback:** Revert the scoped feature PR, leaving already admitted GameInfo scoring and roster sources unchanged.
