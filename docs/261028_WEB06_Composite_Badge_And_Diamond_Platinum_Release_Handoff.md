# HockeyOS WEB-06 — Source-Faithful Multi-Achievement Badges and Diamond-Finish Platinum

Date: October 28, 2026
Lead department: Engineering
Environment: BRUTTECH 1 — AdamPCDesktop
Product: Brave H.C. HockeyOS / Four-View Trophy Room
Release basis: Production `main` at `0f27422` (v20).

## Founder feedback and implementation

**Reported defect:** Alex Pagnotta's Winter 2019/20 James Norris Award and Elected Assistant Captain appeared together as one badge. The root cause is an original HTO Highlights source item holding two distinct facts in a single multiline historical row.

A source analysis identified exactly three original historical composite rows. All three now receive **source-exact, source-ID-gated, display-only badge projections**, with the original HTO source item, complete multiline text, typography, player identity, award provenance, chronology and historical timeline preserved.

| Official player | Original HTO source record | Independently displayed components |
|---|---|---|
| Alex Pagnotta | `hto-legacy-354058-04` | James Norris Award — Winter 2019/20; Elected Assistant Captain — Winter 2019/20 |
| Daniel Buzzelli | `hto-legacy-354062-03` | 50 Game Club — Sep 23, 2018; SVHL Cup Champion — Winter 2012/13 |
| David Corasaniti | `hto-legacy-652571-01` | Conn Smythe Award Playoff MVP, Hart Award Team MVP, Rookie of the Year Award — all Winter 2019/20 |

**Strict authority:** The presentation split activates only when the literal player ID, official name, original HTO item ID, category, provenance, publication status, sourceText and displayText all match exact recorded preimages. A changed, unknown, provisional or unverified source displays un-split rather than granting a trophy. The original 343 HTO ledger records are not modified, duplicated in the source, sent to HTO, or supplemented with guessed honours.

**Counts:** Original historical Highlights remain **343** across 43 profiles; previously visible 343 raw items become **347 independently displayed badge cards** in the collection due to 4 additional splits. Current presentation: **135 milestone badges**, **209 honour/leadership/recognition/championship badges**, **3 disciplinary items**. Within the expanded original historical timeline the grouped multiline records remain intact; this is intentionally different from badge-card count.

## Distinct highest tier — prismatic diamond finish

The highest milestone tier remains **PLATINUM** semantically, with identical existing award thresholds (300+ for Game/Point/etc., and 30+ Shutouts). It now has a unique, deliberately saturated **diamond-like visual** rather than the pale near-silver treatment:

- Main cyan rim `#39C7F3`, icy text `#E5FCFF`, violet facet `#AB83FF`, deep blue `#103B79` to dark violet `#281552` card gradient.
- Prism accents and a small four-point sparkle distinguish platinum from silver without obscuring the authentic Brave H.C. crest or the centred number and category label.
- Same style in Milestones, All and synthetic future source-qualified milestone rendering.
- All 29 official full-crest templates regenerated deterministically; only 13 platinum source images and the manifest require updated bytes. Original 22 Game/Point/Win art files and tier policy remain unmodified.
- **PLATINUM name retained**, as the user requested a colour distinction like diamond, not a source-level reclassification or award grant.

## Source and visual acceptance

Local source-only Node proof `scripts/test_source_guarded_composite_badges.cjs` validates every composite and 9 fail-closed identity/text/publication negative cases. Original 343 history records remain immutable; four additional cards are presentation only.

Independent Edge/Chrome Selenium acceptance `tests/test_composite_badges_and_diamond_finish_browser.py` checks:
- Alex's distinct authentic James Norris and Assistant Captain images at 320/355/810px; dates exact.
- Daniel's proper milestone and Cup artwork on separate views; David's three individual award logos.
- Original historical entry remains one unchanged multiline source row per player within All's expanded complete dated history.
- Diamond-finish platinum cyan border, sapphire/violet background, sparkle accent, and visible separation from silver.
- No overflow and preserved Records content / 4 in-place tabs.

Existing 43-profile/86-session milestone, 4-view, and image integrity suites, 109 identity source-only checks, history correction guards and verified hourly HTO stats refresh must pass. No changes to 230 player-mapped statistical records, 463 native statistical HTO Records, 281 native HTO Awards, or approved award grants.

## Release and rollback

Submit a scope-limited GitHub PR against `main`. Require read-only source, image and Chrome responsive CI PASS prior to merge. Deploy through existing GitHub Pages, independently re-open live Alex/Daniel/David profiles and top-tier platinum examples at mobile/desktop widths, and verify HTO embeds show v21 without iframe changes. Fail closed on any missing badge, art mismatch, unintended History changes, or regression. Roll back only the v21 UI/art commit to previously verified v20; never modify original HTO records for presentation.

No external emails/messages or native HTO administrator writes are authorized or performed in this workstream.
