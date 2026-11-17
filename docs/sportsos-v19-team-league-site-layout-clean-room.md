# SportsOS V19 — HockeyOS / LeagueOS two-mode site layout

Date: November 17, 2026 (America/Toronto)
Lead: Engineering / SportsOS
Status: Source-controlled website improvement; independent demo, no official result or roster publishing.

## Product decision

Model the **information architecture** of the founder's public Brave H.C. HTO site, using original BruTTech code and approved Brave H.C. identity. Preserve familiar, predictable league and team navigation, not the HTO software code, proprietary design assets, admin interface or hidden data.

Research on the publicly visible Brave H.C. website confirmed: a team crest/name masthead; horizontal Home/About/Hot Stove/Roster/Schedule/Scores/Stats/Analytics/Awards/Photos/Records navigation; a team home with last game, upcoming schedule, leaderboards and media; season-scoped calendar and player-stat views. Public page screenshots were consulted in a separate local read-only research folder and are **not included** in this repository.

## Implemented in V19

- Shared responsive website shell, with separate Brave H.C. HockeyOS crest, crimson/navy palette and a LeagueOS commissioner identity with teal/navy styling. No copied HTO markup or CSS.
- Team top navigation: Home, News, Roster, Schedule, Scores, Stats, Analytics, Awards, Records; additional menu: About, Hot Stove, Award Races, Photos, History & Alumni, Team Fees, Attendance, Lines & Goalies, upgrades.
- League top navigation: League Home, Schedule, Results, Standings, Teams, Playoffs, Statistics, League Admin; extended menu links to the previously implemented game scorer, fair scheduler, schedule audit, ice inventory, division review, registration, eligibility, discipline, rulebook, payments and archive.
- HockeyOS homepage presents season/team record from source-qualified published data, direct official score link, the verified next-game fixture, an approved Hot Stove recap loaded from the public `hot-stove-approved.json` feed, and links to all accepted player/club widgets.
- LeagueOS commissioner homepage presents dated fixture evidence, verified/held counts and first-class access to the competition and administration tools.
- New team subpages are **navigation and source-linked shells**, not claims that all native data tables have been migrated. Official HTO remains the authoritative roster, scores, player stats, records and awards source.
- V18 browser-local practice result review remains present in TeamOS. All existing scorer, playoff and fair-scheduling modules remain accessible.
- Team fees are deliberately restricted to a conceptual route, without copying individual balances or financial records into SportsOS.

## Source and privacy rules

- All original HTO score/roster/stat records remain on HTO; the publicly available league snapshots are dated independent evidence.
- No HTO editor changes, credential use, proprietary HTO code/images or automated official result submission.
- The public demo does not authenticate managers, officials or players. No private record or actual fee transaction is created by navigating these pages.
- Approved editorial readback on the homepage requires the exact schema, founder-approval state, explicit publication decision and verified native publication flag; an unavailable/unapproved feed falls back to a neutral Hot Stove link.
- Mobile site navigation scrolls within its own container. More-menu secondary routes are marked active but not automatically opened over other controls.

## Verification — staging

- V19 browser acceptance: 29 of 29 checks passed across 1440px desktop and 390px mobile, with no horizontal document overflow, JS page errors or HTTP mutations.
- V18 scorer + TeamOS integration regression: 14 of 14 checks passed after shell integration, including final-score entry, anonymous jersey stats, power-play input, saved-result invalidation and mode switching.
- Prior HockeyOS normalisation and scorer unit suite: 27 of 27 passed. No original Master Workbook, AwardsScoring or official record change.
- Screenshots, HTO research and test receipts remain local review-only artifacts and are not copied to this public repository.

## Next product increments

1. Native team Roster and Stats views using verified HTO player IDs, clean source dates and the existing HockeyOS Bio components.
2. Native Schedule and Scores pages with source-qualified HTO vs SVHL reconciliation, game cards and a calendar/list toggle.
3. Game-night Home and Postgame media cards populated only from approved feeds.
4. League administrator source status, game-sheet dispute/approval workflow and fair-scheduling/playoff operations. These remain drafts until authenticated production authority exists.

## Release standard

Reviewable PR → GitHub Pages staging checks → authorized merge → public HTTPS readback → desktop/mobile browser regression. Preserve the existing demo URL and the separate authoritative HTO workflow.
