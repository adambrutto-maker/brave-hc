# Brave H.C. HockeyOS public pages and HTO widgets

## Current public deployment — 2026-10-19

Primary HTO site: https://www.htosports.com/teams/?u=BRAVESHOCKEY&s=hockey
GitHub Pages is the public presentation layer; HTO remains authoritative for team-maintained official information. No direct HockeyOS-to-HTO write API has been activated.

Current routed navigation:
- **Hot Stove:** https://adambrutto-maker.github.io/brave-hc/widgets/hot-stove.html (live)
- **Analytics:** https://adambrutto-maker.github.io/brave-hc/widgets/analytics.html (live)
- **Award Races:** https://adambrutto-maker.github.io/brave-hc/widgets/awards-races.html (live)
- Existing legacy HTO Analytics link targeting repository root now automatically redirects to `/widgets/analytics.html`; no HTO navigation field changed.

Analytics sublinks for the optional HTO dropdown:
- **Division standings:** https://adambrutto-maker.github.io/brave-hc/widgets/standings-v2.html
- **Player projections:** https://adambrutto-maker.github.io/brave-hc/widgets/projection-v2.html
- **Streaks and record watch:** https://adambrutto-maker.github.io/brave-hc/widgets/watch-v2.html

Modern public CSS is `hockeyos-modern.css`. The three standalone V2 pages are accessible at any width and are not based on scaled original HTO raster artwork. Original widget markup is preserved under `archive/261019_before_home_compact_*.html`.

HTO homepage currently embeds the historical URLs `standings.html?embed=1`, `projection.html?embed=1` and `watch.html?embed=1`. Those now redirect within their existing HTO iframes to verified compact sections on `home-panels.html?panel=...`. Their fixed frame maxima are respectively 460px, 700px, and for record watch `min(64vw,390px)`. Actual public URL and browser QA passed in 625px and 358px widths; source evidence on BRUTTECH 1: `261019_HotStove_V1/261019_HTO_True_Mobile_Frame_QA.json`. This did not edit the HTO homepage markup.

Source-specific guardrails:
- Standings use official SVHL published league rows, which can lag team-maintained HTO box scores (SVHL shows 3 GP; HTO 4 GP at latest verified snapshot).
- Projections use HTO-fed workbook-derived models, marked as scenario/model-parity pending when the saved workbook contains fewer games.
- Record-watch displays only independently verified milestones and qualified streak categories; full career/goalie/PIM watches remain gated.
- Current AwardScoring calculation is **not** verified current despite HTO-fed projections. Saved award scorecards are in `awards-workbook-reference.json`, conspicuously labelled historical; W2025/26 player rows must never be called current 2026/27 scores. The current `awards-races.json` contains the verified HTO performance watch, the eligible-first provisional-fill-to-five ranking rule, and the real 2026/27 Pilot Awards ballot terms, but live awards ratings remain held.
- No original workbook, live HTO website native pages, Google Form, or nav dropdowns were edited during the modern widget rollout.

### Earlier Phase 0 historical prototype notes

The initial widgets prototype was unlinked and not authorized for HTO production at the time it was drafted. The content below is preserved as historical Phase 0 evidence.

- URL: https://adambrutto-maker.github.io/brave-hc/widgets/
- Single widget: append ?widget=game, standings, projection, leaders, or media.
- Data: data.json — public-only snapshot contract, last read back 2026-10-16.
- Source authority: HTO for team-maintained players and goalies; Sports Village for league standings.
- Unresolved: player-stat disagreements, potential Sugo Sundays / Michelob Morts identity change.
- Projection and media remain withheld pending verification.
- The HTO embed, private HockeyOS services, DNS cutover and manager approval are NOT authorized by this publication.
- Do not add credentials, unpublished players' personal contact information, private manager notes, LiveBarn source video, or publishing queue data.
- To roll back this static preview, revert the Git commit adding the widgets folder.

## Brave H.C. branded projection widget

Embed URL: https://adambrutto-maker.github.io/brave-hc/widgets/projection.html?embed=1

Projections are exact cached outputs of Brave H.C. Master Workbook > Player Projections > BravesRegularSeasonProjection. Never replace with a PPG extrapolation. Current preview is marked STALE_MODEL_HOLD because the source workbook recorded one game and SVHL recorded three. The source workbook must be recalculated and saved before current outputs can be released.

The published JSON is served from projection.json; HTML polls it every five minutes. A BRUTTECH 1 scheduled publisher checks the master workbook for validated updated cached calculations and updates the public JSON without changing the HTO embed code. Updates are blocked if source GP is behind SVHL or the workbook model is older than seven days.
