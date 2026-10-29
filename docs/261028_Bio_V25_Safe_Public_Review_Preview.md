# HockeyOS Bio V2.5/2.6 — isolated public design-review preview

**Date:** October 28, 2026 (America/Toronto). **Lead:** BruTTech Engineering.
**Purpose:** Let the founder inspect the actual interactive Milestone-style revised Player Bio in a regular browser without replacing the official HTO Bio or waiting for a GitHub image download.

## Review link — after Pages deployment

https://adambrutto-maker.github.io/brave-hc/widgets/player-bio-v25-preview.html?playerID=354060&embed=1

Other source-identified player IDs may be substituted in the query: Stephen Logue #354055, Dylan Brennan #525407, Adam Brutto #354054 and the rest of the 109 verified HTO identities. The URL is a **standalone preview page** and is not inserted into an official HTO profile or indexed by search engines.

## Preview visual rules

- Retains premium Milestone Highlights visual shell, authentic Brave H.C. crest, exactly three collection tabs (Production, Trends, Coaching).
- The Production chart uses raw goals/assists bars, a visible two-decimal Pts/GP right Y-axis, and a source-qualified rolling past-only career baseline.
- Actual vs Winter/Summer game-length equivalence is a rate-line selector. Raw points, medals and official award totals never change with the normalization toggle.
- Gold RR = Rocket Richard and gold AR = Art Ross seasonal award markers, separately shown for two titles in the same season. User can select the award season for details.
- Founder-selected Rookie model presentation: a white horizontal arrow and Neutral · Rookie Year. It has no numeric deviation or fabricated baseline.
- Veteran model arrows use original workbook deviation and sigma, keep its 5 categories and compare each trend to zero.
- Pts/GP display at two decimal places, projected GP at one; game-by-game Last 3/5/10 rates are still source held due incomplete appearance evidence.
- No standalone Peak Season statistic; only context-qualified career scoring pace, matched to the chart comparison basis.
- Longer projection and model sources are collapsed by default.

## Isolation / no unauthorized mutation

The canonical official production widget remains widgets/player-bio.html and its original production scripts. This review-only page loads uniquely suffixed CSS, JS and source-derived award-reference JSON copied exactly from the founder's separately developed V2.6 candidate; it does **not** overwrite the production Bio HTML or its JS/CSS.

The preview deliberately consumes the current **public** HockeyOS authoritative feeds (projection.json, player-career-insights.json, original HTO source records), so current model and verified HTO stats do not diverge from the homepage. No private video files, coaching assignments, work/transportation data, credentials or other personal sources are introduced.

The optional goalie-projection-verified-inputs.json remains absent/held; the candidate handles that by withholding numerical goalie forecasts. A missing source is not permission to fill in estimates.

## Acceptance

1. 109/109 verified published profile IDs load through the preview with exact HTO name identity and three category tabs.
2. Mobile widths 320 and 390 and desktop 1280 pass with no overflow or page JS errors.
3. RR/AR source-only award markers, original G/A bars, rolling career benchmark, selected-rate basis and Pts/GP two-decimal right-axis ticks remain readable and functional.
4. Source-qualified provisional skater projection is the same as the homepage; projected GP is 1 decimal. Goalies remain held.
5. Source-only static preview banner and search noindex keep it visibly distinguished from the live official HTO Bio.
6. The public production files and HTO profile CMS editors are unchanged. To remove the preview later, delete only the isolated suffixed assets through a reviewed commit; do not reset other site changes.

**Important:** Publication of this independent preview is NOT approval to merge the entire Bio V2.5 PR #158, nor a claim that unverified recent-game advanced analytics are complete.
