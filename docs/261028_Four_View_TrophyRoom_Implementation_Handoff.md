# Brave H.C. HockeyOS — Four-View Trophy Room Implementation

Date: October 28, 2026 (America/Toronto)
Lead department: Engineering
Authorized source computer: BRUTTECH 1 — AdamPCDesktop
System: HockeyOS / Brave H.C. Player Highlights widget
Starting branch: latest verified GitHub main (1604131 at build creation).

## Founder-approved behavior

One embedded Trophy Room panel uses exactly four top-level views: **Milestones, Awards, All, Records**. Clicking a tab swaps the visible content in place; it must never jump or point to a separate section lower on the page.

- **Milestones:** previously verified and earned bronze/silver/gold/platinum club badges, historical achievement dates and internal metric filters.
- **Awards:** approved historic award, championship, recognition and leadership artwork only. Discipline is excluded from this view and retained as a distinctly labelled historical entry under All, explicitly *not an award*.
- **All:** unified chronological collection of milestone badges, historic awards and verified individual statistical records, with in-panel progressive expansion and optional source-history/performance disclosure.
- **Records:** official per-player records as numeric inventory cards with record category, scope, Summer/Winter label and readable date. No "View published entries" accordion below the locker.
- All four tab buttons remain available even when a category is empty, with an informative empty state.
- Current HTO statistics and personal season highs remain accessible only within All's optional **Season performance details** disclosure.
- Accessible tablist roles, keyboard arrow/Home/End navigation, visible focus, responsive 320–1280px layout, no layout shift/scroll-jump when switching tabs.

## Source authority and preservation

This UI-only release edits no HTO administrator record, award grant, historical ledger, player identity or statistical feed.

- Source snapshot: 109 officially mapped player identities.
- Historical Highlights: 343 entries across published history; 134 earned milestones, 206 awards/honours/recognition, and 3 disciplinary records available only under All.
- Player statistical book: 230 mapped individual official records; full native HTO Records 463 entries and original 558-entry milestone-era archive are unchanged by this branch.
- Original 97 historical milestone emblems plus 37 separately verified new Goal/Assist/Shutout achievements are retained; verified artwork and award winner status cannot be inferred from projected scoring.
- Two legacy rental-goalie records without trustworthy player identity remain in the full HTO book and are not falsely assigned.
- Existing source-aware 3-minute historical Highlights recheck and hourly current HTO statistics refresh are retained.
- Readable date notation is display-only; original source and exact season/game context remain unchanged.

## Validation evidence on BRUTTECH 1

- 10 focused browser scenarios, 40 top-tab switches, seven direct Records pagination and eight All pagination checks; 320/355/810/1280px widths; no horizontal overflow.
- 86 browser sessions / 43 published player Highlights profiles: 134 milestone badges, 206 honours/recognition, 3 separate discipline items (All only), and 225 player-record entries on those 43 profiles, all source counts preserved.
- 86 earned milestone image/filter scenarios PASS; 134 exact published badges.
- 86 original icon/image integrity scenarios PASS: 343 historic Highlights; 209 approved artwork, 97 original club emblems; 0 broken images, 0 incorrect icon sizes, 0 horizontal overflows; 11 original black memorial patches and 2 Rolaids awards retained.
- Existing source-only Node validation PASS for 109 player identities, all 343 Highlights and 230 mapped records, original award artwork and historical corrections, negative forgery tests.
- Existing source-aware hourly HTO refresh, stale-source rejection and historical-awards nonmutation browser tests PASS.
- All images remain existing authentic artwork; no new badge design invented.

## Release gates and maintenance

1. Commit only relevant widget, regression tests, this runbook and read-only PR CI workflow changes. Do **not** commit local Windows CRLF-only SVG checkout normalizations or unapproved source data.
2. Open PR against the latest main; require read-only source/pixel regression CI PASS. No publish on draft or failed CI.
3. After approved merge, verify GitHub Pages published widget v18, four in-place tabs, direct Records cards and desktop/mobile screenshots with a known player (e.g., Ben Sherritt).
4. Preserve all published data feeds, badge artwork and original HTO Records/Awards pages. For any failure, revert only the UI commit / restore last verified HTML and JS.
5. Update HOS-IP-08 and HockeyOS Master Implementation Register with exact merge/deployment proof; do not mark complete without live readback.

No emails, chat messages or external sports-site administrative changes are authorized or performed by this implementation.
