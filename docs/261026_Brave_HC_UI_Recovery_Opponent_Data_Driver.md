# 261026 Brave H.C. UI Recovery and Opponent Data Engine

## Immediate defects and remedies
- WIN% must be W / GP shown as a three-place decimal without leading zero; .500 rather than 50.0%.
- HTO homepage embeds use fixed heights. Restore accessibility to all 8 standings teams and 22 projection player rows by making the widget shell itself keyboard/mouse/touch scrollable. Keep a prominent full-page link. Mobile projection players render as readable two-line cards with large values, projected first and actual totals in parentheses.
- Withdraw opponent-history and unqualified team-comparison claims from the current Opponent Intelligence widget. Show a source hold until the historical ledger has undergone workbook and HTO reconciliation.
- No changes to Hot Stove, HTO official game data, original workbook formulas or source JSON.

## Verified workbook evidence
Canonical read-only source: D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx
SHA256 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154.
Master Schedule (sheet12): B game number, C season, D game type, E date, H exact opponent, O GF, T GA, U result, X game contested.
Historical data span 2013–26. Never count placeholder zero-zero/T rows with X=0. Exact-match opponent identities; no guessed team aliases. This workbook is stale for the current season and not a reliable online source.
Existing QA reviews explicitly held several proposed opponent metadata changes outside the original 497-cell acceptance.

## Architecture recommendation
Create a normalized online HockeyOS Game Ledger, preserving the Excel workbook as a protected historical and formula reference:
1. Import historical completed Master Schedule rows read-only with source row/hash.
2. Append official current HTO completed games by unique game ID, retaining score/date/opponent/provenance.
3. Reconcile exact opponent names and dates; queue unapproved aliases for human review.
4. Publish a versioned Opponent Intelligence public JSON feed only when historical plus live parity is satisfied.
5. Feed the Opponent Intelligence tab from that verified feed, including W-L-T/GF-GA, last meetings, recent form and official league context.
6. Schedule weekly Monday reconciliation and optional after-game ingestion, but NEVER automatically rewrite the authoritative private workbook.
7. Only replace the workbook's formula calculation engine after a separate side-by-side exact formula parity acceptance.

## Release and acceptance
Browser tests require correct WIN%, complete all-row DOM coverage, visible/working in-frame wheel scroll in 358x460, 650x460, 358x700 and 650x700 viewport conditions, higher mobile font readability, verified status holds and no JavaScript errors. Preserve existing legacy iframe URLs.
Deployment through a reviewed GitHub PR, post-merge readback. Separate native HTO iframe height edits require a backed-up administrative session. Rollback by reverting GitHub merge, with no private workbook modification.
