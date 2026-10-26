# HockeyOS — General preservation of verified current-season HTO opponents

Date: October 26, 2026
Lead department: Data & AI; supporting Engineering and QA.

## Objective

Retain **every HTO source-verified current-season opponent** when Sports Village reassigns Cristillo Division membership. This extends the previous one-off Michelob Morts archive implementation. A league roster move must not erase Brave H.C.'s current-season game or rename its historical franchise.

## Authority and source boundaries

Original Brave H.C. Master Workbook and its authored history, plus official HTO current-season games, are the primary match and identity sources. SVHL is authoritative for the eight current league standings keys only. Current SVHL display names, rankings and game totals are not edited by HockeyOS. Proper team branding remains **Brave H.C.**.

All current-season HTO events first pass the protected dynamic v3 collector's official Scores, boxscore, original workbook-date, player/goalie and team-stat parity gates, plus the private 358-game historical ledger reconciliation. The general archive builder operates **only after that source acceptance**.

## New behaviour

- Each update uses the seven current SVHL opponent keys as current-division entries. Any current-season HTO name no longer in that list becomes a source-qualified SEASON_OPPONENT_ARCHIVE if and only if the accepted HTO source has at least one completed game under that exact name.
- Reviewed cross-system names remain canonical: Mohawks H.C. from 49 original workbook meetings plus source-verified current HTO events; Michelob Morts from the accepted October 4 HTO/SVHL single-game identity proof. These are not inserted twice as a generic exact-name archive.
- Additional departed exact-HTO opponents preserve their original source key, regular-season, playoff, all-time and last-five events, with totals independently matching private source profiles. A new league franchise with no verified match receives NO_EXACT_HISTORY, not an artificial 0–0–0.
- A departed league name with historical workbook records but **no completed HTO game in the current season** is not automatically added to the season-opponent archive. Its historical rows are still preserved in the original Master Workbook.
- The public viewer supports up to the bounded current 24-game season's number of archive entries; it keeps the current division and past-opponent categories distinct and preserves all 22 model projections.
- The Monday publisher now compares old and new admitted HTO opponents before writing. Every previously qualified opponent with sourceHTOGames greater than zero must continue to exist under the same approved source identity, with nondecreasing game coverage and no loss of historical GP. A changed identity cannot silently replace an old approved one.
- No fictional future game, unsigned franchise rename, source rewrite, historical workbook edit or official HTO page modification is performed.

## Regression evidence

- The **real current five-game source** produces the same seven current division records plus archived Michelob record as the already accepted public release.
- Simulated future division membership replaces Big Bastones and Dateline Predators with hypothetical new league names without changing official HTO results. Both departing opponents retain exact-source records (Big Bastones eight all-time GP, Dateline Predators 11 regular-season / 13 all-time GP). The hypothetical replacements remain NO_EXACT_HISTORY.
- Reverting a former opponent to the division produces a single current entry, not a duplicate archive. Removing a league team with no current HTO meeting does not create an artificial archive.
- Additional public-only mutation tests check disappearing admitted opponents, reduced HTO counts, changed canonical mappings, erased history and multi-archive UI metadata. A source drift returns HOLD.
- Existing premium browser and mobile projection scrolling regressions must pass with no script errors.

## Release and rollback

Publish only audited HockeyOS source modules and tests via a reviewed GitHub PR. Extend the canonical read-only GitHub workflow to include both exact-source and canonical builders. After green CI, back up the three BRUTTECH 1 PublicPublisher modules with source SHA receipts and the existing scheduled-task configuration. Run a private no-write source replay and verify equality with the previously accepted public five-game opponent data. Then run the existing weekly publisher once and confirm its receipt, clean GitHub worktree, public Pages readback and actual embedded HTO widget.

Do not claim future games are verified until HTO has published their completed boxscores and current team/player/goalie totals.
