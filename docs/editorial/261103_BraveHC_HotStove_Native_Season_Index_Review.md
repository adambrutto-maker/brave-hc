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

Forfeits #2215007, #2215009 and #2215012 remain excluded **from played-game recap links** but are separately shown as three **official SVHL 1–0 administrative forfeit wins**, with both league-final and original HTO-source links. They are not presented as played games, 0–0 ties or newly authored HTO stories. The two separate March 22, 2026 Schmelts playoff games are indexed by separate IDs. This work does not change the six 2026/27 recap articles or the November 8 Other Way preview, homepage Media/Hot Stove widget, HTO site shell, lineup, LiveBarn or highlights.

## Acceptance before merge/public preview
1. Independent 24-row parity check against the published release receipt; unique IDs, URLs, title/date, exclusions.
2. Python editorial regression suite and `node --check widgets/hot-stove.js` pass in isolated checkout.
3. Browser QA at 390px and 1280px, with current recap and Next Game unchanged, a readable 24-link collapsible section and no horizontal overflow.
4. Founder review of the new seasonal archive presentation; only then merge to production. Retrospective story *publication* already happened in the separate native HTO release; **this draft is exclusively a discovery improvement**.

**Rollback:** Revert this small index PR; the already published native HTO stories remain untouched.

## Isolated execution evidence — November 3, 2026

- BRUTTECH 1 isolated branch checkout at `D:\\BruTTech-Private\\HockeyOS\\MediaQA\\261103_NativeIndexPreview`; no pre-existing dirty worktree changed.
- `node --check widgets/hot-stove.js` — **PASS**.
- New `test_hot_stove_native_archive.py` source parity tests — **7/7 PASS**.
- Existing `test_hot_stove_boxscore_parity.py`, `test_hot_stove_postgame.py`, `test_hto_native_article_readability.py` — **45/45 PASS** when run from `scripts/editorial` so existing local module imports resolve.
- Real local Edge headless browser, emulated **exact 390px and 1280px** viewport width through DevTools — **16/16 PASS**: current six archive entries, 24 unique historical HTO links, collapse/expand, current recap opening, Next Game navigation, and zero horizontal overflow.
- Unrelated favicon.ico absent in local static server; no content or QA failures.
- `hot-stove.html` asset query versions bumped for fresh approved code when this PR is eventually merged. No live deployment performed in this review.

## November 3 reconciliation continuation — full 27-result season discovery

Following the Founder's direction to reconcile administrative outcomes to official Sports Village final scores, the 2025/26 archive discovery candidate now has **24 published native HTO game-story links plus three separately labelled administrative results**. The three 1–0 Brave H.C. forfeit wins are precisely tied to league 547 / HTO game IDs (122674 / 2215007), (122678 / 2215009) and (122910 / 2215012). Two are **Brave H.C. away wins displayed as 0–1 by the league's home-first/visitor-second table**, not Brave losses.

The index's three administrative records were derived directly from the independently cross-checked dual-source canonical ledger in [PR #206](https://github.com/adambrutto-maker/brave-hc/pull/206), retaining exact league and original HTO game links. The league's 1–0 award applies to **official competitive team standings**; no goals, assists, goalie events or appearances are attributed to players and no played-game Recap article is fabricated. The historical HTO 0–0 WIN/Forfeit display remains intact.

The section is intentionally kept **inside the existing collapsible Winter 2025–26 Archive**, but visually separated below the 24 article links. The current-season six recap entries, November 8 preview, HTO site shell, original 24 native historical recaps, media and global layout remain untouched.

**Updated isolated BRUTTECH 1 validation:** **10/10 archive-index tests**, **45/45 established editorial tests**, JavaScript syntax **PASS**, and **20/20 real Edge mobile/desktop checks** at exact 390px and 1280px widths (six current recaps, 24 original native game links, three official administrative results, linked game IDs, Next Game navigation and zero horizontal overflow). **This remains a draft PR; no production GitHub Pages or HTO changes have been deployed.**
