# Brave H.C. HockeyOS public pages and HTO widgets

## Accepted historical source and release state — October 21, 2026

This section supersedes snapshot counts and deployment assumptions in the **dated launch notes below** without rewriting their historical context.

- **Record Book:** 558 published HTO Records entries in 119 category/period groups (329 individual, 229 team). **327** individual entries match verified HTO player profiles; exactly **two** legacy rental-goalie lines remain intentionally unmapped rather than assigned to unverified people. Original HTO is authoritative; scheduled source verification may accept new supported source entries but must hold changes/removals for review.
- **Awards:** 146 historical Awards & Honors entries in 20 groups. Awards source snapshot remains deliberately QA-gated; current live awards scoring is a separate held formula/replay process.
- **Player identity:** 109 distinct verified public HTO player identities. Historical Summer player-season deep-link evidence is narrower (51 source-qualified players) and must never be extrapolated to every profile.
- **Historical Watch:** Two *already published* HTO milestones are cross-checked in the full and compact Record Watch presentation: Justin Carosi 300 Game Club (September 20, 2026) and Michael Provenzano 50 Point Club (September 27, 2026). The display is **historical only**. The saved master workbook still has stale 0–0/T results for its four 2026/27 games, current live career/countdown/streak claims are held, and the public Watch JSON should not be described as current.
- **Automation:** The October 21 BRUTTECH 1 scheduled HockeyOS refresh completed all eight processing stages successfully. That success does **not** release `HTO_MODEL_RECONCILIATION_PENDING`, certify a refreshed `watch.json`, or prove GitHub Pages publication; use the independent Plan 03 semantic health gate.
- **Upcoming game:** HTO preview ID `3375682` (October 25, Big Bastones) is associated with archived workbook game 363 / Master Schedule row 374 only as a **pre-game candidate**. Fifth-game admission requires the completed official HTO boxscore and a separate reviewed collector release.
- **Historical articles:** 32 currently public native Bulletin Board posts were preserved in a private source archive. The separate July 1, 2026 Offseason Update was privately recovered from an October 16 HTO Home rendered-text readback; neither the original editor markup nor authorization to republish is established. Do not upload private source bodies or replace current approved Hot Stove recaps.
- **Superseded native integration:** Owner direction closed site-wide native Records/Awards injection issue #14 as **not planned**. Do not treat it as an outstanding Plan 03 blocker.

Read the [Plan 03 execution tracker](https://github.com/adambrutto-maker/brave-hc/issues/30) and the dated source/QA runbooks before changing the source or publication contract.

## Public deployment baseline — October 19, 2026 (current source status updated October 21)

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
- Data: data.json â€” public-only snapshot contract, last read back 2026-10-16.
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

All linked custom pages load `player-links.js`, a single shared player-identity resolver. The October 19 rollout contained 51 verified public HTO identities (25 current/established plus 26 historical alumni); the verified registry expanded to **109 distinct player names and 109 unique HTO IDs** by October 20. It supports first-last and last-comma-first spellings. This uses HTO's native `playerID` in `p=profile` and links all verified name mentions in static and asynchronously rendered content. Existing hyperlinks, form controls and unrecognized names are never rewritten.

HTO itself retains control of native roster, box-score, profile and historical-season views. The official profile season selector uses `pageLoad=ProfileTabStats&viewseas=Winter_YYYY/YYYY` or `Summer_YYYY`; that URL and the resulting per-game season table were verified in a live public browser test on 2026-10-19. Pages with `data-hto-season` and their player-name mentions link to that specific season. `data-hto-game-url` may link the mention to a supplied, validated, actual HTO game boxscore URL. A distinct player-specific game page or game-row anchor has NOT been verified; never fabricate `gameID` from a date or roster link. If no verified game URL or season is present, use the canonical HTO profile. Native HTO pages are outside GitHub release scope.

For HTO native editable articles/homepage widgets, `HTO_PLAYER_LINKS_PASTE.txt` is a one-time HTO page-editor snippet. Adding it to an HTO page is a separate controlled administrative step: it has not been installed by this repository change. Native HTO-provided anchors remain untouched. The script should not be injected into an HTO native area without confirming the HTO editor supports permitted external scripts.

Registry upkeep: record player name, public HTO `playerID`, discovery date/source, and identity uniqueness before adding a player. The 25th current-era mapped player, Stefano Mazzei (`playerID=595514`), was confirmed from the public HTO roster's official click-through attribute. A placeholder like `Unknown, Johnny` must not be treated as a verified person. Do not guess IDs; unresolved or ambiguous names remain plain text. Extend the registry for verified alumni and season-specific appearances. Run `node --test tests/test_player_links.js` and browser DOM QA before releasing.



### Hot Stove contextual linking â€” 2026-10-19

The Hot Stove runtime uses the existing `player-links.js` resolver. A verified 2026â€“27 recap now assigns `data-hto-season=Winter_2026/2027` to its story container. Only source-backed scorer/assist passages, independently verified milestone messages, named players marked as actual game participants, and the recorded game goalie receive `data-hto-game-url` from that recap's official HTO boxscore. Names in absences, H2H speculation, and previews remain linked to the season-specific player profile. Archives use each article's own verified source boxscore. The script never guesses a player's attendance or a gameID.

**HTO native authoring constraint:** HTO's help page says scripts belong in the X-Grid **Script Area (Advanced)** module, not a general Text Area. The one-line optional native Home Page snippet is `HTO_PLAYER_LINKS_PASTE.txt`. One Script Area on the Home Page applies only to that parent page. It does **not** automatically load JavaScript on HTO's separate native Roster, Stats, Records, or historical pages; those pages often have their own HTO-native click targets. Installing the snippet is a separate HTO-admin operation requiring review of an existing suitable Script Area module and backup of its contents. No HTO editor write is implied by GitHub merges.

**Browser evidence:** On 2026-10-19, an isolated Chrome/Puppeteer test loaded the approved public Hot Stove with the staged JS substituted only for that request. It passed latest-game source-link checks (October 18; gameID 3375601), current-season absence fallback, goalie and visiting-player records, upcoming-game player-profile links, and the October 4 archived source (gameID 3369564). Existing public page markup, model inputs, HTO website, and statistics feeds were not altered by the QA. Recheck the hosted URL after GitHub Pages completes deployment. QA fixture logs are located under BRUTTECH 1's temporary directory and not part of the public site.


### Initials and scorer headlines

The shared registry now also matches abbreviated first-initial/surname labels **only when the identifier is unique** across the currently verified 109-player registry. For example, `J. Carosi` and `A. Pagnotta` resolve to their official profiles; `M. Provenzano` is intentionally not linked because both Mario and Michael are plausible. The Hot Stove recap headline can link a surname alone only when that surname is identified by the article's verified HTO goal-event record. This prevents incidental surname references, such as division names, from being interpreted as player links. Tested with the live-published article and a substituted staged runtime; no editorial content changed.

## Historical Records & Awards companion — 2026-10-20

- Records: https://adambrutto-maker.github.io/brave-hc/widgets/history.html?view=records
- Past Awards: https://adambrutto-maker.github.io/brave-hc/widgets/history.html?view=awards
- Initial October 20 source snapshots comprised **483 Records entries in 83 groups** and **146 Awards entries in 20 groups**. Following verified native HTO corrections, current accepted snapshots include **558 Records entries in 119 groups** (329 individual / 229 team) while Awards remains 146 / 20. HTO remains authoritative. Records are refreshed through a guarded public-source workflow; revisions, removals and uncertain identities require manual review. Awards remains a fixed snapshot requiring deliberate QA to update.
- Public profile linking now recognizes 109 verified identities. The separate **season-specific evidence** file still covers 51 source-qualified players; exact Summer season deep links are limited to independently verified player-season pairs. Unsupported identity or season combinations fall back safely to career profiles or plain text.
- Source and QA gates: docs/261020_HTO_Historical_Records_Awards_Companion_Runbook.md
- The former native HTO site-wide player-link injection proposal in GitHub issue #14 was **closed as not planned** following owner direction. Preserve the existing native HTO Records and Awards pages; the companion pages provide optional read-only links and do not assert that the native editor was modified.

### Historical companion: verified Summer season deep-links (2026-10-20)

HTO historical Records and Awards now link to the specific `Summer_YYYY` player-season statistics when both the source category/year and an exact HTO public player-season match are available. Generic Winter calendar years, unavailable evidence, ambiguous names, and specific game IDs without source proof still fall back to the safe career profile. This is read-only; source records are not altered. New optional evidence: `history-player-seasons.json` for 51 verified player IDs. Rules and tests: `docs/261020_HTO_Historical_Summer_Season_Links_v2_QA.md`.

## Universal Player Highlights (v1) â€” 2026-10-20

- Universal widget: `player-highlights.html?playerID=354054` for Adam, `?playerID=354060` for Justin, or any newly verified HTO `playerID`. One shared widget file; no per-player source copies.
- Existing manual highlights: `player-highlights-ledger.json` preserves 16 Adam entries and 25 Justin entries, including dates/seasons, original text, order, and five bold championship lines. The display-only typo correction preserves its original text separately.
- Verified current 2026/27 skater/goalie performance is loaded from the existing dated, qualified public `awards-participants.json` feed; it updates as that separately controlled source refreshes, not by unrestricted browser scraping.
- No automatic award, captaincy, championship or milestone award date is published. Missing/unverified player IDs and feeds fail safely.
- HTO profile snippet: `HTO_PLAYER_HIGHLIGHTS_IFRAME_PASTE.txt`. Replace its sole `playerID=000000` identifier. HTO editor support for iframe embed and actual profile installation remain untested and must be confirmed by a controlled backed-up pilot.
- Detailed contract and onboarding: `docs/261020_Brave_HC_Universal_Player_Highlights_v1_Release_Runbook.md`.
- QA: `node --test tests/test_player_highlights_identity.cjs tests/test_player_links.js`, then `node tests/player_highlights_browser_qa.cjs` on a machine with Puppeteer configured; do not alter the known AwardsScoring formula hold to refresh stats.
