# HockeyOS — Embedded Projection Readability and Native HTO Audit
Date: October 26, 2026
Lead: Media. Supporting Engineering and QA.

## Live native-homepage findings
Public HTO Braves homepage is not authenticated for native page editing. A read-only browser inspection identifies six current iframe modules:
- Hot Stove: widgets/hot-stove.html?embed=1, HTO height 1150 px.
- Goaltender Schedule: goalie-schedule-v1.2-HTO-embed.html, 540 px.
- Next Game: widgets/countdown.html?embed=1, HTO height 245 px.
- Standings: widgets/standings.html?embed=1, HTO height 460 px.
- Projections: widgets/projection.html?embed=1, HTO height 700 px.
- Strategies video iframe, 315 px.

The standings.html and projection.html entrypoints ALREADY redirect to the same home-panels.html premium UI used by standalone v2 links, with panel=standings/projection and embed=1. This is not a stale duplicate source. The real native HTO 625 px embedded browser test showed all eight standings rows and all 22 projection rows with their own vertical scrollbar. Before the legibility pass, the standard embedded player names were only 13 px; on 358 px narrow screens, they were 14 px. No horizontal overflow was present.

## Implemented legibility improvement
- widgets/home-premium.css: projection player names 15 px (standard iframe), 16 px (narrow phone); projected season total 14/15 px respectively; source-qualified actuals 12 px; source-roster role 11 px. Keeps colour coding, exact career trend arrows and complete roster.
- widgets/home-panels.html: stylesheet cache-busting query updated so HTO clients refresh the amended CSS.
- tests/test_embedded_projection_readability.cjs: real Chromium local serving of HTO-compatible projection.html legacy redirect at 625×700 and 358×700 viewports; 22 players, exact required font sizes, shell vertical scroll >500px, shell/table zero horizontal overflow, zero JavaScript page errors.
- Existing full standings, roster, actuals, opponent-source and limited alias checks remain unaffected.

## Native module / milestone scope
No separately titled or embedded 'Milestone' module appears on the CURRENT publicly rendered HTO homepage. The previous standalone duplicate milestone card does not appear among its live embed modules. The page still provides a nav link 'Streaks & Records', which is not proof of a redundant homepage module. It would be unsafe to delete any HTO native module without an authenticated editor session, its explicit intended module and an owner-reviewed backup.
- Current public HTO view still shows Admin Log In, not edit controls.
- HTO public fixed iframe heights cannot be edited through GitHub widgets; internal scrolling and complete tables are verified.
- No native HTO homepage, approved article, protected Master Workbook, or franchise history was changed.

## Release
Public site CSS legibility-only PR; no source data changes, no forecast model changes. Rollback by reverting the CSS/cache query change. Verify deployed HTO embed browser font and scroll before calling live release complete.
