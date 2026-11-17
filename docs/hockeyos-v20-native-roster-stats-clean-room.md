# HockeyOS V20 — Native roster and official source statistics

Date: 2026-11-17 (America/Toronto)
Lead: Engineering (SportsOS / HockeyOS)
Status: New public read-only HockeyOS site views; independent original presentation, not HTO administration.

## Decision and requested continuity

The founder requested the HTO site layout model as the basis for HockeyOS and the LeagueOS administrative counterpart. The V19 public site shell and V18 practice scorer remain in place. V20 replaces the two TeamOS roster/statistics link-only pages with native, accessible, responsive interfaces that use public verified HTO source facts. It does not replace official records or copy the HTO user interface.

## Source capture

- Explicit public URLs: `https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=roster` and `...&p=stats`.
- Season: **Winter 2026/2027**, verified from both page titles.
- Manual read-only Edge browser capture: `scripts/capture_hockeyos_hto_public_v20.cjs` (no credentials, no authenticated HTO CMS access, no source HTML/HTO CSS or images saved).
- Curation: only publicly displayed player names, jersey numbers, positions, official stats and direct HTO profile playerID links are stored. Hometown, height, weight, contact information, photos and other nonessential biographical fields are excluded.
- Dated source artifact: `widgets/hockeyos-hto-current-v20.json`, schema `bruttech-hockeyos-hto-public-current/v20`. It is **not a live API**. An updated capture is a new reviewable evidence change; no background auto-publish.
- No unofficial player count, attendance or game played is inferred from a roster listing.

## Reconciliation

HTO's *current roster page* contains **28 listed entries**. The public statistical tables contain **24 skater rows and six goaltender rows including a `Team Stats` aggregate row in each**. Excluding those aggregates leaves **23 named skaters and five named goalies**. The two aggregate rows are retained *separately*, not added as extra players.

Published and independently reconciled current-season totals:
- Skater team row: **8 team GP, 23 goals, 38 assists, 61 points and 1 power-play goal**.
- Goaltender team row: **8 team GP, one win, seven losses, 41 goals against, source GAA 5.12**.
- Named individual skater G+A and goalie GA match the respective HTO team totals; fail closed if a future capture disagrees.
- **PPG in HTO and the original workbook means power-play goals**, not points per game. `Pts/G` is the separate source rate and remains displayed as originally published.
- Both 0 jerseys and absent numbers are distinct; the blank roster number for a listed player remains unassigned.
- The roster list does not directly provide individual `playerID` links, so all 28 roster entries are rendered without invented profile joins. The 23 named skaters and five named goaltenders have directly linked HTO profile IDs on the statistics page. No identity mapping is inferred from name/jersey coincidence.
- Distinct source names such as `Provenzano, Mario` and `Provenzano, Michael` are **not** silently merged. If the user wants a verified identity crosswalk later, it requires a separately governed evidence step.

## Shipped UI (V20)

- HockeyOS Team Roster: search current players, filter by published position, list/card toggle, mobile responsive, official roster link, captured-at/source status. Player list uses original BruTTech initials placeholders, never HTO copyrighted photographs.
- HockeyOS Statistics: skater/goaltender tabs; HTO source actuals with sortable columns and name/jersey search; official HTO player profile links with source-validated IDs; mobile stat cards; separate team source aggregates; explanations for PPG, points per game, GAA and missing data.
- HockeyOS Home: a compact top-scoring leaderboard from the same validated source snapshot with link to native Stats page. It does not alter official team standings.
- LeagueOS commissioner, scheduling, playoff, calendar, game-sheet and competition functionality remains unchanged.
- Failed/missing/invalid source JSON results in a visible source hold and official HTO links; no guessed values or fallback to historical year totals.

## Source-protection and security controls

- No HTO code, original CSS, native editor markup, private records, authenticated APIs or photo/media rights reused.
- A direct HTO playerID must be present in the public source row to enable a profile link. The app does not invent records or connect players by names alone.
- Client validation checks schema, authority, season, source domains, player ID patterns, unique IDs, team-total parity, numeric types, source row counts and absence of aggregate rows in player lists.
- Text is escaped before rendering. All source player URLs are exact validated HTTPS HTO profile links; other links are fixed official pages.
- Source files are committed to the public site only after source and visual review. Neither official HTO actuals, records, awards, forecasts, nor the Master Workbook is changed.

## Validation

- **14** V20 source/logic unit tests added, including forged player IDs, aggregate double counting, PPG, invalid source fields and source naming discrepancy.
- **28** V20 browser checks passed on 1440px desktop and 390px mobile with complete player lists, searches, stat sorting, role switching, safe profile links, leaderboards and LeagueOS fallback. Zero JS errors and zero server writes.
- Existing **27** normalisation and LeagueOS V18 source tests also passed (total 41 unit tests). The V19 and V18 browser integration suites must pass again before release and on HTTPS following publication.
- Local screenshots and browser evidence are in review-only folders outside the public repository.

## Next controlled increments

1. Source-qualified schedule and scored game cards using official HTO game IDs and dated SVHL reciprocity (not generic fixture matching), calendar/list presentation and navigation.
2. Authoritative per-player HockeyOS Bio links only after an exact and independently checked HTO ID ↔ Bio coverage crosswalk. Do not join roster identities by name alone.
3. More complete HockeyOS profile/record navigation; retain separate analytical equivalence and unapproved forecasts.
4. LeagueOS commissioner game approval, referee/manager signatures and audit trail as authenticated future work; no public write authority.
