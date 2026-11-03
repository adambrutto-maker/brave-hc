# Brave H.C. — Hot Stove season-grouped native HTO archive discovery

**Date:** November 3, 2026 (Toronto)
**Lead:** Media Department / HockeyOS
**Stage:** DRAFT REVIEW — not released to GitHub Pages or embedded HTO
**Source release:** Already completed Winter 2025/26 24-game native HTO publication, evidence PR #203

## Editorial objective
Make the current Hot Stove **Archive** view useful beyond the six 2026/27 recaps. Add a collapsible **Winter 2025–26 · 24 historical game recaps** section linking *only* to the already published, independently verified **native HTO game summaries**. Do not copy the retrospective articles into the GitHub Pages widget.

## Changes staged
- `widgets/hot-stove-native-history.json`: exactly 24 exact-game HTO URLs, headlines, dates and IDs copied from the merged independent readback receipt (not guessed from fixture sequence).
- `widgets/hot-stove.js`: loads the optional historic link index; validates schema, status, 24 unique game IDs, excluded forfeits, official HTO host, exact game identity and archived season. Fails closed if any constraint fails; original current-season Archive remains.
- `widgets/hot-stove.css`: styled collapsible historical season discovery, legible desktop/mobile text and keyboard focus; only archive-specific class selectors added.
- `scripts/editorial/test_hot_stove_native_archive.py`: source parity, guard and static regression tests.

## Source and publication controls
The source of truth is `docs/editorial/native_hto/2025-26/261103_Historical_Native_HTO_24_Recap_Publication_Verification.json` (24/24 game recaps, 272/272 text blocks, 33 preserved photos, original Andrew Cristillo tribute, 78 unchanged stats-table groups). This index does **not** modify native HTO, its private editor field HTML, game scores, official statistics, photos, the season state or the original workbook.

Forfeits #2215007, #2215009 and #2215012 are excluded. The two separate March 22, 2026 Schmelts playoff games are indexed by separate IDs. This work does not change the six 2026/27 recap articles or the November 8 Other Way preview, homepage Media/Hot Stove widget, HTO site shell, lineup, LiveBarn or highlights.

## Acceptance before merge/public preview
1. Independent 24-row parity check against the published release receipt; unique IDs, URLs, title/date, exclusions.
2. Python editorial regression suite and `node --check widgets/hot-stove.js` pass in isolated checkout.
3. Browser QA at 390px and 1280px, with current recap and Next Game unchanged, a readable 24-link collapsible section and no horizontal overflow.
4. Founder review of the new seasonal archive presentation; only then merge to production. Retrospective story *publication* already happened in the separate native HTO release; **this draft is exclusively a discovery improvement**.

**Rollback:** Revert this small index PR; the already published native HTO stories remain untouched.
