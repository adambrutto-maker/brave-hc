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

## Shared player hyperlinks (staged 2026-10-19)

All linked custom pages load `player-links.js`, a single shared player-identity resolver. It recognizes 25 public HTO player identities, including first-last and last-comma-first spellings. This uses HTO's native `playerID` in `p=profile` and links all verified name mentions in static and asynchronously rendered content. Existing hyperlinks, form controls and unrecognized names are never rewritten.

HTO itself retains control of native roster, box-score, profile and historical-season views. The official profile season selector uses `pageLoad=ProfileTabStats&viewseas=Winter_YYYY/YYYY` or `Summer_YYYY`; that URL and the resulting per-game season table were verified in a live public browser test on 2026-10-19. Pages with `data-hto-season` and their player-name mentions link to that specific season. `data-hto-game-url` may link the mention to a supplied, validated, actual HTO game boxscore URL. A distinct player-specific game page or game-row anchor has NOT been verified; never fabricate `gameID` from a date or roster link. If no verified game URL or season is present, use the canonical HTO profile. Native HTO pages are outside GitHub release scope.

For HTO native editable articles/homepage widgets, `HTO_PLAYER_LINKS_PASTE.txt` is a one-time HTO page-editor snippet. Adding it to an HTO page is a separate controlled administrative step: it has not been installed by this repository change. Native HTO-provided anchors remain untouched. The script should not be injected into an HTO native area without confirming the HTO editor supports permitted external scripts.

Registry upkeep: record player name, public HTO `playerID`, discovery date/source, and identity uniqueness before adding a player. The 25th mapped player, Stefano Mazzei (`playerID=595514`), was confirmed from the public HTO roster's official click-through attribute. A placeholder like `Unknown, Johnny` must not be treated as a verified person. Do not guess IDs; unresolved or ambiguous names remain plain text. Extend the registry for verified alumni and season-specific appearances. Run `node --test tests/test_player_links.js` and browser DOM QA before releasing.



### Hot Stove contextual linking — 2026-10-19

The Hot Stove runtime uses the existing `player-links.js` resolver. A verified 2026–27 recap now assigns `data-hto-season=Winter_2026/2027` to its story container. Only source-backed scorer/assist passages, independently verified milestone messages, named players marked as actual game participants, and the recorded game goalie receive `data-hto-game-url` from that recap's official HTO boxscore. Names in absences, H2H speculation, and previews remain linked to the season-specific player profile. Archives use each article's own verified source boxscore. The script never guesses a player's attendance or a gameID.

**HTO native authoring constraint:** HTO's help page says scripts belong in the X-Grid **Script Area (Advanced)** module, not a general Text Area. The one-line optional native Home Page snippet is `HTO_PLAYER_LINKS_PASTE.txt`. One Script Area on the Home Page applies only to that parent page. It does **not** automatically load JavaScript on HTO's separate native Roster, Stats, Records, or historical pages; those pages often have their own HTO-native click targets. Installing the snippet is a separate HTO-admin operation requiring review of an existing suitable Script Area module and backup of its contents. No HTO editor write is implied by GitHub merges.

**Browser evidence:** On 2026-10-19, an isolated Chrome/Puppeteer test loaded the approved public Hot Stove with the staged JS substituted only for that request. It passed latest-game source-link checks (October 18; gameID 3375601), current-season absence fallback, goalie and visiting-player records, upcoming-game player-profile links, and the October 4 archived source (gameID 3369564). Existing public page markup, model inputs, HTO website, and statistics feeds were not altered by the QA. Recheck the hosted URL after GitHub Pages completes deployment. QA fixture logs are located under BRUTTECH 1's temporary directory and not part of the public site.
