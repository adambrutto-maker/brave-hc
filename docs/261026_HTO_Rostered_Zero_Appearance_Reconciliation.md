# Brave H.C. 2026/27 — Qualified Rostered Zero-Appearance Actuals
Date: October 26, 2026
Lead: Data & AI; Supporting Engineering, QA and Media.

## Objective
Resolve the final two apparent five-game model/current-HTO roster discrepancies without deleting historical players, fabricating playing time, inferring non-participation from an unverified source or modifying workbook forecasting formulas.

## Source-derived findings
Official Brave H.C. Winter 2026/2027 HTO Roster has 25 unique roster members. Public HTO Stats has 20 named skaters with completed-game production; the separate accepted five-game HTO boxscore feed records exactly the same 20 skaters and 3 goalies. The remaining 2 official roster members have no recorded appearance in any of the five completed official HTO games:
- Marco Congiusti, jersey #3, accepted model classification FT. Historical workbook model row 88 remains active.
- Stefano Mazzei, jersey #88, accepted model classification CU. Historical workbook model row 83 remains active.

HTO roster display labels append - Captain or - Asst. Capt. to four active names; narrowly scoped normalization removes only these display role suffixes. Position labels containing a middle-dot delimiter (C·LW) are recognized as multiple valid source positions. No goalie is treated as a skater.

Original workbook PlayerInfo records Congiusti career skater GP 278 and Mazzei GP 63. No 2026/27 recorded appearance does not erase career scoring rates, imply future unavailability or disprove FT/CU classification.

## Implemented source contract
- scripts/enrich_hto_rostered_zero_appearances.py retrieves the public HTO Roster read-only; checks exact Winter 2026/27 roster table, source membership, role suffix normalization and valid positions.
- Audited current HTO actuals must match accepted boxscore skater names, team GP and freshness. The 22-player model reconciles to 20 named HTO skaters plus two rostered zero-appearance skaters, and 3 independent goalies.
- widgets/player-actuals.json gains rosterCoverage schema brave-hc-hto-rostered-no-appearance/v1, source-qualified status, teamGP 5 and names for which current actual GP/G/A/PTS are verified zero. The source 20 actual skater rows retain original values.
- widgets/home-premium.js overlays the zero actuals only if schema/status/season/teamGP, roster uniqueness, classification and GP/G/A/PTS=0 checks pass. Otherwise unavailable values remain (—). A qualifying row indicates Rostered / 0 GP.
- scripts/publish_hto_player_actuals.py checks official roster, actuals, accepted game sheets, classification and freshness at each publication. When a rostered player appears in official HTO boxscores, they leave this no-appearance group. The publisher whitelists player-actuals.json only.
- Forecast values, trend thresholds, original Master Workbook and Hot Stove editorial are unchanged.

## Tests
Nine Python source tests PASS, covering qualified zeros, captain suffixes, bad identity, missing roster, mismatched scorer, changed FT/CU classification, stale source, stage integrity and first appearance. Premium homepage browser regression PASS: eight standings, seven opponent options, published exact opponent records, held alias, all 22 projections, mobile, verified (0) actuals, five-arrow colours and zero JS errors.

The source forecast retains HTO_MODEL_RECONCILIATION_PENDING. Qualified current zero appearances do not certify all historical workbook formulas/roster policy as current.

## Deployment and rollback
BRUTTECH 1 Monday 09:20 publisher must receive versioned/backed-up helper and publisher source after the PR release. Task definition is unchanged. Rollback via GitHub revert and restoring prior Python operational scripts from protected backups with hash verification.

## Other holds
Mohawks HC and Sugo Sundays alias identities unreviewed. Other Way has no exact-name history. The duplicate native HTO milestone module still requires an authenticated editor and backed-up homepage action.
