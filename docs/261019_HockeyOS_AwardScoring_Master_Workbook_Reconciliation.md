# HockeyOS Awards Centre — Master Workbook reconciliation

Date: 2026-10-19
Lead: Engineering / HockeyOS
Status: SOURCE MAPPING VERIFIED, LIVE AWARD SCORING HELD, NO ORIGINAL WORKBOOK MUTATION
Source workbook: `261001_Brave_HC_Master_Workbook.xlsx` (saved snapshot dated 2026-09-22)
Verified workbook SHA256: `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`

## Governing principle

**The Master Workbook is the specification and source of truth for awards methods.** The application is an automated, traceable implementation of its source tables, formulas, normalization, eligibility, and ranked output. HTO is an up-to-date external source of roster and game results, **not** authority to change award rules. No arbitrary scoring logic or nomination should replace the workbook. Historical workbook cached scores are not current 2026/27 ratings.

## Exact workbook lineage

1. `Player Game Logs` and `Master Schedule`: `SkaterStatsByGame`, `GoalieStatsByGame`, and `AllTimeSchedule` are the original per-game inputs.
2. `Player Information`: `PlayerInfo` contains player identity, `Current Roster Status`, `Rookie Year`, `First Season`, `Recent Season`, GP, career baselines, helpers, and normalized metrics. `RosterStatusBySeason` tracks historical FT/CU/DI status and total games.
3. `Awards & Records`: `AwardScoring` is the original source for eligible flags, award-specific rank keys, raw composites, calculated award scores, and supporting subscores.
4. `Web Races`: authoritative published-display formulas; list length bounded by `MIN(5, COUNTIF(AwardScoring[<award> Eligible],1))` for the relevant award.
5. HOF calculations also draw from `PlayerInfo` HOF award/legacy rank and eligible source fields; treat these separately from ordinary current-season shortlist ratings.

### Award-specific source field contracts

| Award | Eligible | Rank key | Public score |
|---|---|---|---|
| Hart | `Hart Eligible` | `Hart Rank Key` | `Hart Award Score` |
| Conn Smythe | `Conn Smythe Eligible` | `Conn Smythe Rank Key` | `Conn Smythe Award Score` |
| Norris | `Norris Eligible` | `Norris Rank Key` | `Norris Award Score` |
| Art Ross | `Art Ross Eligible` | `Art Ross Rank Key` | `Art Ross Award Score` (statistical count, not OVR) |
| Rocket Richard | `Rocket Richard Eligible` | `Rocket Richard Rank Key` | `Rocket Richard Award Score` (statistical count, not OVR) |
| Rookie of the Year | `Rookie Eligible` | `Rookie Rank Key` | `Rookie of the Year Award Score` |
| Lady Byng | `Lady Byng Eligible` | `Lady Byng Rank Key` | `Lady Byng Award Score` |
| Most Improved | `Most Improved Eligible` | `Most Improved Player Rank Key` | `Most Improved Player Award Score` |
| Rolaids | `Rolaids Eligible` | `Rolaids Relief Man Rank Key` | `Rolaids Relief Man Award Score` |
| Dedication | `Dedication Eligible` | `Andrew Cristillo Dedication Rank Key` | `Andrew Cristillo Dedication Award Score` |
| Hall of Fame | `HOF Eligible` (`PlayerInfo`) | `HOF Rank Key` | HOF workbook scoring fields; do not imply weekly seasonal award equivalence |

## Verified Rookie of the Year example

The original `PlayerInfo` sheet includes:
- `Rookie Year` is calculated from the earliest `RosterStatusBySeason` season marked FT **and with at least one game**.
- `Rookie Status` compares the season-year extracted from `Recent Season` to the computed `Rookie Year`.
- `Recent Season` and `First Season` derive from games recorded in the original game-log/schedule tables.
- `Rookie Eligible`: `Rookie Status=1` **AND** `Current Roster Status="FT"` **AND** current skater GP > 0 or current goalie GP > 0.
- `Rookie Rank Key` sorts by final award score, then raw composite, then deterministic row-order tiebreak.
- `Rookie of the Year Award Score` is normalized among eligible player scores (single candidate = 75; top raw score = 100; otherwise the workbook's 50–99 min/max normalization). Do not derive this directly from HTO points.
- `Web Races!B39:D43` displays up to **five actually eligible** players. If four are eligible, exactly four display. If five are eligible, all five display.

| Player | Source workbook Rookie Year | Cached Rookie Status | Cached Rookie Eligible | Current verified HTO GP | Reconciliation |
|---|---:|---:|---:|---:|---|
| Henry Kong | 2026 | 1 | 1 | 4 | Refresh original current GP and all scoring inputs |
| Adam Povegliano | 2026 | 1 | 1 | 3 | Refresh original current GP and all scoring inputs |
| Sanjay Rajkumar | 2026 | 1 | 1 | 3 | Refresh original current GP and all scoring inputs |
| Francesco Triumbari | 2026 | 1 | 1 | 4 | Refresh original current GP and all scoring inputs |
| Jamie Rosenberg | 2026 | **0** | **0** | 3 | **Missing original game-log and season linkage** |

Specific trace for Jamie: `Player Information!AX106` has Rookie Year **2026**, `E106` FT; `AV106` Oldest Player Game blank, `AW106` First Season blank, `BA106` Recent Season blank, `BC106` Current Skater GP 0, `AY106` Rookie Status 0. Consequently `AwardScoring` row 24 has Rookie Eligible 0. The current HTO roster corroborates the source year and the official current HTO season feed reports 3 GP. **Do not flip Rookie Status or Rookie Eligible manually**. Reconstruct actual source-authorized game records and recompute their dependencies.

Sources: authoritative local workbook by verified SHA256, and official public HTO current roster
https://www.htosports.com/teams/default.asp?p=roster&s=hockey&u=BRAVESHOCKEY

## Next controlled automation build

1. Capture and maintain immutable official HTO game/roster source IDs with exact date, participant identity, goal/assist/PIM/POTG events and role/position; exclude placeholders and double counts.
2. Reconstruct **source-equivalent** `AllTimeSchedule`, `SkaterStatsByGame`, `GoalieStatsByGame`, and `RosterStatusBySeason` in an isolated read-only-to-original replica. Carry historical seasons intact.
3. Compare every `PlayerInfo` derived field affected by new games, including Jamie's recent/first season and GP. Only then run original `AwardScoring` eligibility and rankings.
4. Reproduce historical original saved snapshot results exactly before attempting current-week formula parity. Confirm distinctions between skater and goaltender award weighting and field-level normalizations.
5. Derive the web **official top five** from the original `Web Races` contract. Keep independent, unranked game-participation/rookie watch distinct while the actual score is held.
6. Publish current ratings only after evidence, source freshness, independent QA and approval. Store weekly immutable score/rank snapshots after verification.

## Current disposition

- Five 2026 rookies can be shown in an **unranked first-year watch**, using the original workbook Rookie Year and corroborating current HTO roster/GP; the 5th Jamie entry must not be labelled as a workbook-calculated eligible/official shortlist entry until current input replay.
- Four cached Rookie of the Year eligible values and their tied historical scores are **stale** (one-game source versus four current HTO games); do not publish as 2026/27 ratings.
- Original source workbook, HTO admin, ballot and live Pages deployment remain untouched.
- PR #8 is presentation/data-bridge only and remains **UNMERGED** until independent reviewer approval.
