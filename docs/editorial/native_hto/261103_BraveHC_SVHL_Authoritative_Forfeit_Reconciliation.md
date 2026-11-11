# Brave H.C. — Official SVHL / HTO administrative-forfeit reconciliation

**Date:** November 3, 2026 (Toronto)  
**Lead:** Media Department / HockeyOS; Data & AI source parity, independent QA  
**Status:** **SOURCE-RECONCILED — REVIEW CANDIDATE, NOT A LIVE HTO OR WEBSITE EDIT**

## Decision and hierarchy

At the Founder's instruction, the **Sports Village Hockey League (SVHL) published final score is authoritative for the competitive result of administrative forfeits**. HTO remains the authoritative custody source for the original per-game **forfeit classification, administrative flag and original displayed values**.

Crucial: Both opposing teams' SVHL team pages present the **same HOME-FIRST, VISITOR-SECOND** final score. The row is **not** dynamically reoriented to the team being viewed. Consequently, a **0–1** displayed on Braves' *Visitor* row is a **Braves 1–0 win**, not a loss.

All four identified games are **administrative forfeit wins credited as Brave H.C. 1–0 opponent in league standings**. HTO displays each 0–0 with *Brave H.C. – WIN* and *opponent – Forfeit*, which must be preserved as original evidence. These were not played 1–0 hockey games.

## Exact four-game crosswalk

| Season | Game date | Opponent | Exact HTO ID | Exact SVHL game ID | Braves role | League home–visitor score | Brave-first standings final | Outcome |
| --- | --- | --- | ---: | ---: | --- | ---: | ---: | --- |
| Winter 2024/25 | 2025-02-16 | Don's Cherries | 2148155 | 116721 | Home | 1–0 | **1–0** | **Win by forfeit** |
| Winter 2025/26 | 2026-01-25 | Royal Flushers | 2215007 | 122674 | Visitor | 0–1 | **1–0** | **Win by forfeit** |
| Winter 2025/26 | 2026-02-15 | Schmelts | 2215009 | 122678 | Home | 1–0 | **1–0** | **Win by forfeit** |
| Winter 2025/26 | 2026-03-08 | Schmelts | 2215012 | 122910 | Visitor | 0–1 | **1–0** | **Win by forfeit** |

Reciprocal verification read both the Brave H.C. and the relevant opponent's official SVHL team-season schedule for all four games. **8 of 8 exact game references** agreed on date, home/visitor orientation and final score. Original source page URLs, public HTML SHA-256 hashes, the exact original HTO boxscore, and official league game IDs are preserved in the canonical JSON.

## Both season standings independently rebuilt

Original played-game final scores from HTO, plus the league's **1–0 awarded forfeits**, reconstruct the published official SVHL team records exactly:

| Season | Regular season | Wins | Losses | Ties | Points | Goals for | Goals against |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Winter 2024/25 | 24 | 10 | 12 | 2 | 22 | 74 | 95 |
| Winter 2025/26 | 24 | 12 | 9 | 3 | 27 | 84 | 82 |

The full **2024/25** HTO audit identifies 23 played regular games, one forfeit, and two later playoffs. The full **2025/26** HTO audit identifies 21 played regular games, three forfeits and three later playoffs. In each season, 24 regular-season results reproduce the public SVHL standings **without adjustment to any genuine played-game goal result**.

**Statistic-domain policy:** Awarded forfeit goals count in *official team standings* GF/GA, and awarded wins count in official GP/W/points. They do **not** become an on-ice goal by a named player, an assist, a shot, a goalie goal-against, an attendance appearance or a played hockey recap. Keep team official season totals distinct from on-ice statistics and the unchanged HTO raw source score.

## Implemented candidate contract

- `widgets/brave-official-forfeit-results.json`: game-ID-linked read-only source ledger, canonical league final, original HTO source, reciprocal league hashes, and verified season totals.
- `widgets/brave-official-forfeit-results.js`: fail-closed, optional pure result lookup `getCanonicalForfeit(ledger, season, htoGameId)`. Validates original HTO 0–0 winner/forfeit evidence, both team pages, home-first/visitor-second orientation, and no fictitious skater credits. Returns `null` for unlisted played games. It is **not automatically loaded into the live homepage**.
- `scripts/editorial/test_official_forfeit_results.py`: source identity, season standings parity, original HTO preservation, and deployed historical SVHL standings parity.
- `scripts/editorial/test_official_forfeit_results.cjs`: JavaScript contract and negative-source tests, including the two away 0–1 results that must never be recorded as Braves losses.

This release adds **supplemental canonical data**, not a new HTO scoreboard editor or replacement for any native game/season source. Existing `widgets/historical-svhl-standings.json` is already correct; do not modify its official values merely to mark the reconciliation as complete.

## Acceptance / protection gates

1. Exactly four official, reciprocal game-ID matches; all canonical Brave H.C. outcomes are **1–0 administrative forfeit wins**.
2. Both 24-game regular-season reconstructions agree **exactly** with official SVHL points, W–L–T and GF/GA.
3. Preserve every original HTO 0–0 value and `WIN` / `Forfeit` label, public score tables, media and the original archival-source hashes.
4. Exclude forfeits from individual played statistics, scoring-event chronology and per-game retrospective coverage. Do not create an ordinary 1–0 played-game story.
5. **Do not** automatically modify HTO, the source workbook, the 2025/26 completed 24 native retrospective recaps, the 2026/27 native stories, LiveBarn/highlights, or the public homepage layout.
6. Review and approve this source policy before using the new supplemental feed in additional historical scoring or standings calculations.
7. Investigate the independent April 6, 2025 **Mid Ice Crisis 3–0 / Stephen Logue 2 GA** goalie discrepancy separately. It is not a forfeit, and this reconciliation does not explain it. SVHL postseason unscored 0–0 placeholders remain non-final.

**Rollback:** Revert the candidate contract PR. No authoritative league or HTO data are changed by the research or by this review branch.

## Independent HTO Records confirmation — two scoring domains

The authoritative public [Brave H.C. HTO Records](https://www.htosports.com/teams/default.asp?p=records&s=hockey&u=BRAVESHOCKEY) independently reports regular-season team scoring of **73 goals for in Winter 2024/25** and **81 in Winter 2025/26**, excluding the HTO 0–0 forfeit display rows. Official SVHL league standings show **74** and **84** respectively. The exact difference (**one** and **three**) equals the number of awarded 1–0 Brave H.C. forfeit wins in those seasons. Both sources agree on team goals against: **95** in 2024/25 and **82** in 2025/26.

The source-verified scoring-domain audit and HTO public Records checksum are retained in [the Records and playoff accounting evidence](261103_HTO_Records_Scoring_Domains_And_2025_Playoff_Goalie_Residual.json). The canonical JSON now separates `playedGameGoalsFor` from `officialLeagueStandingsGoalsFor` and `awardedAdministrativeGoalsFor`. The optional read-only JavaScript lookup `getSeasonGoalAccounting` validates that **played goals + awarded forfeits = official league goals**; it fails closed on any inconsistency. This prevents artificial player goals or double counting when HockeyOS calculates history and award scores.

### Separate April 2025 goalie record — not a forfeit correction

The original HTO Records page reports **six team goals against** in the 2024/25 playoffs. Exact March 30 and April 6 HTO playoff boxscores report three goals against each (6 total), but the only listed goalie Stephen Logue has **3 GA** and **2 GA** (5 total). Thus one team goal is absent from the listed goalie GA total **in the April 6 game**. Neither the event circumstances nor the reason for that difference are verified; do not assert an empty-net goal, substitute goalie or stat-entry error as fact. The original team and goalie records remain untouched and the April 6 editorial approval hold continues in [the 2024/25 research review](https://github.com/adambrutto-maker/brave-hc/pull/205).

**No live HTO changes, original source deletions, workbook modifications or retroactive player scoring credits were made.**
