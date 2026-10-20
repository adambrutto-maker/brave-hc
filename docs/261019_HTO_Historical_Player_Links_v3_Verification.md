# HTO historical player-profile registry — v3
**Date:** 2026-10-19
**Status:** Verification complete; native HTO admin deployment separate
**Source authority:** Public Brave H.C. HTO player-statistics and profile anchors

## Method and evidence
- Read all **18 available HTO seasons** from the public Stats season selector and collected public player-profile hyperlinks without editing HTO.
- Reconciled full names against the publicly rendered `Records & Achievements` and `Awards & Honors` items.
- Found **105 unique named public profile records**, with **no conflicting player IDs** across available seasons.
- Added **26 previously missing alumni** with a unique public profile ID and matching presence on Records and/or Awards; retained the 25 existing profile identities for a total of **51 mapped names**.
- Explicitly excluded the `Rènt Goaliê` rental-goalie placeholder and unresolved/ambiguous initials. Do not infer a playerID from name similarity.
- HTO currently renders 483 Records line items and 146 Awards line items, including many team-only or non-person entries. The name-mapping exercise does **not** interpret those categories as 629 individual player records.

## Alumni with verified public HTO IDs

| Full name | HTO playerID | Full name | HTO playerID |
|---|---:|---|---:|
| Andrew Buchanan | 453662 | Andrew Pozzebon | 618956 |
| Anthony Guerra | 453661 | Ben Sherritt | 354285 |
| Cameron Buchanan | 354049 | Carmine Cerrone | 376086 |
| Damian Aidemirski | 354051 | Daniel Buzzelli | 354062 |
| David Corasaniti | 652571 | Dylan Brennan | 525407 |
| Jeff Micheli | 354053 | Julian Kercz | 382708 |
| Kourosh Adeli | 733003 | Lucas Brutto | 354042 |
| Luke Leddy | 354063 | Mark Arruda | 612364 |
| Mark Pastore | 354061 | Medi Brancatella | 763309 |
| Michael Congiusti | 354059 | Neil Baghel | 355501 |
| Ryan Finlay | 399966 | Ryan Logue | 354046 |
| Stephen Keane | 533806 | Will Cawkell | 378632 |
| Xav O'Krafka | 426873 | Zach Kercz | 383322 |

## Non-destructive regression results
- `node --check widgets/player-links.js`: PASS.
- `node --test tests/test_player_links.js`: **11/11 PASS**, including 26 alumni IDs, non-linking placeholders and ambiguous abbreviations, and existing page integrations.
- Isolated Chrome test of HTO Records with staged v3: **289 hyperlinks** generated; full Records item text and existing hyperlinks unchanged; no nested links or page errors.
- Isolated Chrome test of HTO Awards with staged v3: **147 hyperlinks** generated; full Awards item text and existing hyperlinks unchanged; no nested links or page errors.
- These are hyperlink **occurrences**, not unique players. They improve on the earlier 25-player build's 132 (Records) and 68 (Awards) links under the same read-only test pattern.
- Not every historical recipient necessarily has a matching profile in the available public HTO season-stat sources. Unverified identities remain plain text.

## Release boundary and future refresh
The v3 shared asset is served from `widgets/player-links.js` and is referenced as `?v=3` by HockeyOS pages and the optional HTO-native Script Area snippet. It does **not** modify HTO content. Native Awards/Records installation remains conditional on HTO-supported site-wide or page-scoped script placement, a module backup, and an authenticated administrative review.

Future public HTO roster/season data may introduce new legitimate names. Add only when a unique official HTO playerID is verified, update tests and version the asset reference to avoid cached mappings. No scheduled private-data collectors are needed.
