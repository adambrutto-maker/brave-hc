# HockeyOS Plan 03 — Official HTO game-tying goals source review

**Date:** October 21, 2026. **Lead:** Data & AI. **State:** `PARTIAL_HTO_GTGS_REVIEW_ONLY_NOT_FOR_WORKBOOK`. Source GTG is a distinct statistical credit, **not** a game-winning goal, and it is not a general zero-default field.

## Source finding and official coverage

The pinned GET-only HTO boxscore parser was run against all four source-verified 2026/27 completed games. The public HTO game skater-table headers differed between games:

| Game | Date | GTG header present? | GTG team total | Validity |
|---|---|---|---:|---|
| 3356177 | 2026-09-20 | No | Unknown | No per-player GTG values claimed |
| 3356178 | 2026-09-27 | Yes | **1** | 15 skater identities and source team total agree |
| 3369564 | 2026-10-04 | Yes | **2** | 13 skater identities and source team total agree |
| 3375601 | 2026-10-18 | No | Unknown | No per-player GTG values claimed |

The official source gives three explicit **one-GTG** player credits:

- **Justin Carosi**, September 27 (HTO game 3356178)
- **Justin Carosi**, October 4 (HTO game 3369564)
- **Henry Kong**, October 4 (HTO game 3369564)

They agree with the official GTG source header/row values, their game-date identities, the source team totals and the separately verified HTO feed's positive player-goal counts. These are **statistical source observations**, not new individual all-time record-holder approvals or additional manual scores.

**Coverage statement:** 28 of the 54 current skater game observations have an explicit GTG column and verified numeric per-player values; the other **26 observations remain unknown**. They must **not** become zero and should not be treated as proof that no tying-goal event occurred.

The historical legacy source workbook uses skater column `AA` for **GTG** (distinct from `Z` for GWG and `Y` for SHG). This additional field is potentially useful for the separate proposed 40-row skater import, but the full-schema import remains **held** for unsupported fields, the occupied `Y4674=360` source cell and dependent legacy Excel formula/pivot acceptance. These GTG values have **not** been written to any workbook.

## Evidence custody

The first source-preserving read-only pass captured the entire per-game explicit GTG column only when the column actually existed. It verified official HTO canonical URLs and game dates and unique player names against the source-verified four-game HTO feed; the GTG per-player sum reconciled to `Team Stats` for each GTG-supported game.

The detailed row-level GTG source evidence is **private**, saved on BRUTTECH 1 at:

`D:\BruTTech\Products\HockeyOS\Plan03\source-archive\261021_HTO_Game_Tying_Goals_Explicit_Source_PRIVATE.json`

SHA256: `9ab2f96b2b8463889fcbce13d1fd20d849498f303e974302c9d45cafef2fe9b2`.

It retains source-response fingerprints, official game dates and exact GTG rows. The private source body and any unavailable statistics are not uploaded to GitHub.

## Reproducible read-only acceptance

`scripts/audit_plan03_explicit_gtg_source.py` reconciles that private GTG observation file against the same pinned 4-game HTO verified feed. It rejects wrong/duplicate game identities, source drift, player-name ambiguity, noninteger GTG values, unsupported tying-goal credit without a corresponding recorded goal, mismatch with explicit HTO Team Stats, changed validated GTG credits, and any attempt to label a missing GTG header as a zero-valued field.

- Real source result on BRUTTECH 1: `PARTIAL_HTO_GTGS_REVIEW_ONLY_NOT_FOR_WORKBOOK`, 28 known GTG observations, **26 unknown**, three validated credits, **zero native HTO/Excel/public writes**.
- No-network regression: `tests/test_plan03_explicit_gtg_source.py`, **9/9 PASS**.
- The guarded record-source CI runs this offline contract; it does **not** upload or fetch private HTO evidence.
- Proposed workbook approval: **not** granted. This source must be explicitly mapped into the full-schema, collision-free disposable Excel import proposal and tested for downstream GTG/awards/records effects before any source-of-truth or public publication.

## Next gate

Preserve the source GTG values alongside existing game-level GP, G, A, Pts, +/- and supported PIM/POTG without replacing other missing stats with zeros. Obtain a source-approved, collision-free table extension and a fully evaluated **disposable** Excel import before any owner-approved update to the original workbook. The incomplete original game-359 PIM and goalie source conflicts and the upcoming October 25 HTO fixture remain held.

Related [Plan 03 tracker #30](https://github.com/adambrutto-maker/brave-hc/issues/30) and full-schema import review [PR #44](https://github.com/adambrutto-maker/brave-hc/pull/44).
