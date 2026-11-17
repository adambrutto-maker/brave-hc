# TeamOS Native Website — Clean-Room Implementation Boundary

**Product:** BruTTech TeamOS (Brave H.C. native website preview)  
**Lead:** BruTTech Product Department  
**Date:** November 17, 2026  
**Scope:** new static web interface under `/team-os/` only

## Owner instructions

The existing HTO/HockeyOS code may be proprietary. **Do not reuse, copy, modify, adapt or import its JavaScript, CSS, page templates, internal data models, logic or widget implementations.** This project uses the Brave H.C. website only as a **visual layout reference**: a centered dark-navy website, small club crest area, brand heading, horizontal header links, red active tabs, compact statistical KPI cards, standings tables, team-news layout and responsive mobile navigation.

This native site is **not** the HTO codebase migrated into a new folder. It is a fresh original implementation designed to maintain recognizable style and layout while separating data/code ownership.

## Sources, explicitly separated

**Reference-only visual screenshots** captured from the publicly visible Brave H.C. site on November 17, 2026. Their content may be subject to separate rights. No source snippets, stylesheet declarations, templates, SVGs, internal algorithms or existing crest artwork were copied into this site.

**Independent team-level public league data** used in `data/season.json`:
- Published SVHL Sunday/Cristillo standings from public-source `svhl-public-four-nights-v2.json`, captured November 16, 2026 at 19:58 UTC.
- Source-qualified completed game results and the one listed future fixture from independently assembled public `leagueos-source-qualified-current-fixtures-v4.json`.
- Game and league references are linked to original public `leagues.sportsvillage.ca` pages.
- Snapshot data is team-level only and reconciles eight completed results (23 GF / 42 GA) against the standings.
- Neither of the two public JSON data sources is an HTO code file or private HTO database.

## New original deliverables

`team-os/index.html`: a native, accessible website shell with club heading, original typographic crest placeholder, horizontal site navigation and main content area.

`team-os/styles.css`: independently authored responsive navy/red/ice-blue design system following layout cues only.

`team-os/app.js`: independently authored native navigation and page rendering for Home, Schedule & Results, Cristillo Standings, Team Statistics, Roster & Players layout and Team News (plain-language factual score summaries). No iframes, external widget scripts, preexisting HTO functions or player-identity joins.

`team-os/data/season.json`: curated, independently public team-level data snapshot. No player names, individual stats, rosters, paid HTO data, secret credentials, news articles or private files.

## Design/layout invariants

1. Brave H.C. club identification in the left header, small 2026–27 season identity and horizontal linked sections.
2. Recognizable active red navigation; restrained navy page and blue-outline content cards.
3. Native Team Stats dashboard with source-qualified KPI blocks, team scoring bars and recent results.
4. Native standings table with the Braves row visually distinguished; native schedule and team-news pages with public source links.
5. Roster/player pages are real native page layouts **with deliberate empty verified-data states** until independent permissioned player data is available.
6. Mobile header and link navigation adapt to a 390px viewport without horizontal page overflow.
7. All data is read only and the site has **zero official writes**. Source errors display a visible retry; no silent invented records.
8. No NHL, EA, SVHL/HTO proprietary art or logo usage. The `BH` typographic crest is an original temporary device, not copied team crest artwork.

## Clean-room acceptance checks

- Compare the new pages **visually only** with the user-specified Brave website screenshots, focusing on header hierarchy, navigation, cards, table and mobile layout.
- Search every new `team-os/` HTML, CSS and JS file for `iframe`, legacy `widgets/` imports, HTO script references and source references outside the approved public `data/season.json`; all must be absent.
- Validate navigation and deep-link reload, browser Back/Forward, Schedule filters, team stats, all 10 source standing rows, 8 complete + 1 listed game, correct scoreboard and no player identities.
- Mobile test at 390px: no page-level horizontal scroll. Keyboard navigation and visible focus state.
- Test failed source fetch: clear non-deceptive failure and manual retry; never substitute fake results.
- Validate no non-GET/HEAD requests or changes to existing HTO/HockeyOS files and pages.
- Keep the native TeamOS product separated from the independently branded LeagueOS franchise demo.

## Release rule

Deploy only the isolated `/team-os/` folder after QA. Existing HTO site and widgets must remain unchanged. Do **not** interpret this clean-room visual preview as a full production TeamOS migration or a licensed player-data feed. The user must review and approve visual fidelity and the intended data connectors before further operational integration.
