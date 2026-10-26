# Brave H.C. opponent intelligence — source-qualified public-release preparation
**Date:** October 26, 2026. Lead: Data & AI. Media / Engineering / QA support.

## Purpose
Prepare the public homepage Opponent Intelligence tab to show workbook-derived Brave H.C. opponent history **only** when a release-certified public feed is present. Continue to preserve the hold state for stale source data or unreviewed aliases. No original workbook or player projection formulas may be modified.

## Private source
The private HockeyOS online ledger now contains 358 historical Master Schedule games plus five official 2026–27 HTO games: 363 unique source events, 84 exact opponent identities, total HTO season 5 GP / 12 GF / 23 GA. It retains its PRIVATE_PARITY_PASS_EXACT_NAMES_ONLY state and is not itself publishable.
The canonical original workbook SHA256 remains 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154. Future HTO game IDs are discovered from native completed-game Box Score and Summary links.

## Reviewed division coverage
Public release preview against the eight SVHL Cristillo Division rows:
- Four opponents have valid exact-name history: Big Bastones, Mid Ice Crisis, Dateline Predators and Zamboner Crew.
- Two opponents require identity review: Mohawks HC vs. HTO Mohawks H.C.; Sugo Sundays vs. HTO Michelob Morts. No historical merging is permitted merely from similarity, spelling or league speculation.
- Other Way has no current exact-name history in the accepted source. This is not a zero-game record.

Big Bastones source-qualified regular-season through October 25: 4-2-1, 24 GF / 27 GA (the approved 6-4 win included). Mid Ice Crisis original historical regular-season: 1-2-2, 13 GF / 19 GA; all-time including playoffs 1-4-2, 15 GF / 25 GA. Exact-name qualification is critical to accurate analytics.

## Implemented work
- scripts/build_public_opponent_preview.py accepts only the private parity-passed ledger and exactly eight league division teams; exports at most seven concise public-review team objects with W/L/T, GF/GA, last-five results and explicit source states. The *full private game ledger is never exported*.
- The generated preview remains local under D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\Opponents_Public_Review_Preview.json and has status REVIEW_PREVIEW_ONLY, publishable=false.
- widgets/home-premium.js will render source-qualified aggregates ONLY if an optional data feed exists with schema brave-hc-opponent-intelligence/v1, exact seven opponent names, a status of PUBLIC_VERIFIED_EXACT_ONLY, publishable=true, verified current-season coverage and asOf no older than ten days. A missing, stale or review-only feed preserves an explicit hold.
- If released, the viewer displays verified Regular Season, All-Time and Playoff W-L-T / GF-GA, dates and final outcomes of recent verified meetings. Unreviewed aliases and no-match states still do not get artificial 0-0-0 records.
- tests/test_public_opponent_preview.py passes six source contracts and mutation cases; tests/test_opponent_widget_release_gate.cjs passes the qualified-feed, alias hold and no-match UI using browser interception and synthetic data.
- Existing full standings, projection roster, red/white/blue trend arrows and internal scrolling regressions still pass.

## Mandatory release gate
The public website does NOT yet contain widgets/opponent-intelligence.json.
To admit the release, complete source-ownership and independent QA acceptance for these seven exact scoped entries; do not silently merge aliases. Run the exporter, check each public aggregate against the independent HTO/source ledger, mark approved feed as PUBLIC_VERIFIED_EXACT_ONLY and publishable=true only after the signed review decision, and publish to GitHub via a source-controlled change. Ensure automatic scheduled publication is separate from the still-failing legacy projection publisher and cannot overwrite unrelated site components.

## Rollback
The optional consumer is inert without a valid released feed. Reverting its GitHub change restores the old hold implementation. No original workbook, HTO native CMS or public game records were written in this preparation stage.
