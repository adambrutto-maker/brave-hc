# HockeyOS — Canonical opponent publisher structural release gate
Date: October 26, 2026
Lead: Engineering; supporting Data & AI and QA & Testing.

## Defect
After SVHL replaced Sugo Sundays with Maplewolves in the Cristillo Division, the verified public opponent feed switched to the correct source-aware status PUBLIC_VERIFIED_SOURCE_IDENTITY and release scope DYNAMIC_SVHL_DIVISION_KEYS; WORKBOOK_HTO_HISTORICAL_NAME_LINK; VERIFIED_HTO_SEASON_ARCHIVE. The original weekly publisher still rejected any releaseScope text lacking the substring EXACT. It would therefore HOLD a fully source-verified and correctly structured release, regardless of its contents.

## Repair
scripts/publish_dynamic_exact_opponent_feed.py now uses require_public_scope(new, officialStandings) rather than testing arbitrary prose strings. The gate checks schema, canonical Brave H.C. and SVHL source key, publishable state, seven current division opponents matching the eight-team SVHL source, explicit season-archive count, unique opponent keys, the two previously source-qualified canonical HTO identities and nonempty official HTO participation in archived opponents. It must refuse erased Mohawks history, lost Michelob archival games, fabricated identities or presenting an archived team as a current division member.

The publisher continues to fetch + fast-forward the current GitHub main branch, require a clean staging repository, validate source-qualified private Master Workbook and HTO inputs through the canonical builder, whitelist only widgets/opponent-intelligence.json, and push without force. No original workbook or official HTO edits occur.

## Acceptance
Nine tests in tests/test_public_canonical_publisher_release.py pass, including current newly scoped release, deleted/falsely current archives, removed Maplewolves membership, incorrect Brave H.C. canonical name and mismatched standings. The read-only canonical GitHub workflow now runs the nine-test suite on relevant PR and main changes.

## Rollback and operational rollout
Version/back up the BRUTTECH 1 PublicPublisher modules. Copy the merged publisher and both dynamic/canonical source adapters with exact SHA checks while its weekly scheduled task is disabled. Validate the current five-game release against the already accepted public source without a public write. Re-enable the scheduled task and run once; a publication receipt, GitHub commit and public HTO widget must confirm successful deployment before claiming the automation restored.
