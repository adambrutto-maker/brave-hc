# LeagueOS / Franchise Mode — V15 UI Design System

**Status:** Product design baseline for the independent BruTTech LeagueOS demonstration  
**Date:** 2026-11-17 (Toronto)  
**Lead department:** Product  
**Design inspiration:** modern hockey video-game franchise/commissioner experiences. **This is an original interface**, not NHL-licensed or affiliated with a commercial game studio, and no third-party hockey-game artwork or logos are reproduced.

## Vision

Make LeagueOS *feel like operating a hockey franchise/league from a game console*, not filling out a spreadsheet or generic admin dashboard. The interface must retain the approved V10 simplified information architecture while all V14 product capabilities remain findable.

### Top-level information architecture (unchanged)

Five persistent choices: **Overview, Games, Schedule, Playoffs, Teams**.

The Overview presents only **three primary game modes**: Find a game, Build a fair schedule, Run the playoffs. Secondary modules remain discoverable under **More tools / All features**. The working V13 commissioner guided tour and V14 contextual module shell remain intact.

### Original visual language

- **Arena imagery:** original `widgets/leagueos-arena-v15.svg` illustration depicting a stylized hockey surface. No NHL, EA or Sports Village logo.
- **Palette:** night/navy surfaces `#050d18` / `#10243a`, broadcast ice-blue accents `#6deaff`, status red `#f04f65`, score white `#eaf4ff`, caution amber `#f9cf6d`.
- **Typography:** original uppercase, condensed high-contrast hierarchy using installed system families such as Bahnschrift/Segoe UI. No imported or redistributed font file.
- **Game UI:** mode-select cards, score digits, broadcast-style labels, clear local-only badges, highlight on focus, arrow-key navigation in the home mode selector.
- **Responsive:** 1440px desktop console shell; 390px mobile with **app header above compact five-item navigation**, controls in one or two columns, and no page-wide horizontal scrolling. Internal rink/ladder/table panels may scroll inside a labeled region.
- **Motion:** subtle hover/focus transitions with full `prefers-reduced-motion` support.

### Module families

| Module | Game-like UX | Authority |
|---|---|---|
| **League Central** | Cinematic arena cover, game-mode menu, broadcast source ticker, all-feature access | Public November 16 snapshots only |
| **Game Center** | Historical source games, visible result status, source links | No claimed real-time bookability |
| **Season Manager** | Fair scheduling, rink boards, weekly rotation, CSV export | Hypothetical repeated historical ice-time patterns, never bookings |
| **Playoff Center** | Bracket ladder, scored series, wildcard/consolation, print/export | Browser-local historic-format example only |
| **Scorer Console** | New native score display, 5-event touch palette, log, summary, authority-review holds, local JSON export | Published source teams + fictional local events; no official result |
| **Scouting Room** | New native four-night League Pulse, source-qualified Division Fit and qualified Sunday scoring-event audit | Existing `leagueos_division_alignment_public_v2.json`, `svhl-public-four-nights-v2.json`, `svhl-player-game-index.json` and `svhl-player-game-570.json`; descriptive research only |
| **Division Health & Commissioner Review** | Existing V12 source case, V14 shared context, dark game skin | All-team consideration and human approval, never automatic realignment |
| **Registration, rulebook, financial/future** | Retained working previews, V14 contextual shell and consistent game skin | Browser local / proposed / fictional UI; no connected payment, identity, discipline, referee or facility provider |

### New native modules in V15

`widgets/leagueos-native-scorer-v15.js` replaces the older *external-link-first* Game Sheets page as the default. The old `svhl-leagueos-score-sheet-demo.html` is retained only behind a collapsed historical reference link, not embedded. Source fixture selection comes from the **66 published future fixture rows** in the November 16 source window. Scoreboard is derived solely from new local practice events; event log supports add/remove; summary and four authority-review holds remain visible; JSON exports are marked `BROWSER_LOCAL_PRACTICE_NOT_OFFICIAL` and `officialScorePublished: false`.

`widgets/leagueos-native-intelligence-v15.js` replaces external-link-first League Intelligence. Uses current accepted four-night public operations, source-qualified 96 team-season alignment research, and existing `BravePlayerParticipationEvidence.analyze` on Oct 27 historical Sunday event sheets to establish *minimum scoring participation only*. It does not claim full GP, PIM, identity continuity, league authorization or predicted wins. Prior standalone pages remain archived for research provenance, rather than used as the main application UI.

### Validation contract

- All 22 established feature routes must remain navigable.
- All 3 top-level game-mode cards and 5 primary routes must remain.
- Source data is read only; no mutating network call or false booking.
- Game scoring practice must never publish an SVHL result or modify HTO.
- Night-specific model ratings cannot be pooled as if they belonged to one unified competition.
- Player audit must use exact official player IDs and source-qualified GameInfo scoring evidence; no automatic player attendance or eligibility conclusion.
- Mobile 390px body width never exceeds viewport; dark UI text remains legible; TeamOS remains **unchanged/light** when switching views.
- Regression suites V14, V13, V12, V11, V10, V8 and four historical scheduling nights must pass before release.
- Release only after public GitHub Pages propagation and hosted browser checks.

## Iterative final-design pathway

V15 establishes the **new design direction and two native replacements**, not a claim that every legacy operation has been rewritten to production parity. Subsequent working passes should progressively modernize remaining modules within the same visual system, guided by actual commissioner task testing and separate approval gates. Existing source models and data authority remain untouched. Avoid reintroducing multiple disconnected websites or a sprawling menu.
