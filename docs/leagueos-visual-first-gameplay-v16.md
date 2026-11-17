# LeagueOS V16 — Visual-First Franchise Mode UX Contract

**Lead:** BruTTech Product | **Date:** November 17, 2026 | **Product:** independent Sports Village/SVHL LeagueOS demonstration

## Why this pass exists

V15 was more visually appealing, but still led users through web-form controls. The user wants a simpler hockey video game franchise-mode experience: choose an action by recognizing the screen, not reading a paragraph or completing multiple form fields. V16 changes **the interaction order**, not merely colours.

## Visual-first design rules

1. **Show the objective first.** League Central shows three illustrated game-mode tiles in the first mobile screen. Captured-data details and source/legal footnotes follow the primary choices instead of interrupting them.
2. **Use visual selection before forms.** Season Manager uses a four-night tile board and five week-count buttons; Playoff Center uses tournament-format cards and actual bracket preview; Scouting Room uses league/division/club tiles.
3. **Make the content itself interactive.** Game-Day Scorer has practice-goal actions directly under each team's score. The practice event pad lets a user select Goal/Shot/Penalty, choose Home or Away and record an event without navigating a form.
4. **Keep precision tools close, but behind a disclosure.** Original selectors for date, rink inputs, historical weighting, playoff seeds and details, scorer clock/period/jersey, and source notes remain available under one clearly labeled settings control. Preserve source-data and QA access.
5. **Show results visually.** Scoreboard totals, playoff ladder, weekly fixture list/rink board, early-middle-late rotation matrix and source-qualified scouting ratings remain true calculations, not generated decorative numbers.
6. **Never confuse a simulation with an official decision.** Scheduling patterns are historically inferred, NOT bookable ice. Game events are `BROWSER_LOCAL_PRACTICE_NOT_OFFICIAL`. Playoff format/seeding and winner progress are historical practice examples. Player audit evidence is qualified and does not establish complete GP or eligibility.
7. **One game-like interface for all existing LeagueOS screens.** Retain the five primary navigation choices and complete 22-feature catalog; additional functions and development concepts live in secondary routes, not a new sprawling menu.
8. **Original design, not copied branded artwork.** Retain the in-house stylized rink SVG and game-console CSS. No NHL/EA logos or protected screenshots.

## Implemented V16 interaction changes

### League Central (Overview)

- Arena image reduced in height to keep the three game-mode tiles visible on the first 390px mobile screen.
- The three mode cards now contain a mini game preview (two sides and VS), a weekly early/late pattern preview, and a semifinal/final bracket preview.
- Source/legal footnote pushed below the actions; still present and accessible.
- The full catalog, existing guided commissioner tour, source-qualified division health and other modules remain available.

### Season Manager

- Primary inputs: Sunday/Tuesday/Wednesday/Thursday buttons, using actual source team counts and source-observed clock-pair counts, then large 4/6/8/10/12 week buttons.
- Primary action: **Generate Season**.
- Advanced inputs (still functional): `#lc-night`, `#lc-weeks`, `#lc-start`, `#lc-inventory-mode`, optional rink/time customization and historic averaging.
- Existing round robin, byes, source qualification, duplicate team/ice collision prevention, the weekly fixture view, the rink view, fairness matrix, JSON and CSV export are unchanged.

### Playoff Center

- Source-aware historical 4-team, 6-team and 3-team formats become large selection cards.
- League-night buttons and division buttons replace exposed dropdowns.
- The interactive ladder renders before hidden technical tournament settings and seeds. Selecting a ready series still jumps to the unchanged score-entry cards.
- Two-game series use series points (win 2, tie 1) rather than goal totals; explicit OT/SO ties, best-of-three finals, wildcards, consolation and round robin still work.

### Game-Day Scorer

- Source listed future fixture is presented as a compact card with previous/next navigation and an optional full fixture chooser.
- A real two-team scoreboard **of practice events only** includes independent Home/Away `+ PRACTICE GOAL` actions, with reset and log edits.
- Goal, shot and penalty quick events can be recorded from gamepad-like action and team buttons using the current practice period and clock.
- Note and clock changes require explicit detailed entry; manual advanced entry retains all 5 event types, jersey, penalty minutes and additional notes.
- Events never update source fixture scores. Export stays `officialScorePublished:false` and HTTP writes remain zero.

### Scouting Room

- The Division Fit workspace now uses night buttons, division tiles and club cards. Technical selectors remain in one optional settings disclosure.
- Descriptive opponent-adjusted model, night scoping, all-ten-team Cristillo review links and the historical Sunday source-qualified Player Audit remain unchanged.

## Code and QA

Updated: `widgets/leagueos-competition-v7.js`, `widgets/leagueos-playoff-formats-v8.js`, `widgets/leagueos-native-scorer-v15.js`, `widgets/leagueos-native-intelligence-v15.js`, `widgets/leagueos-platform-v2.js`, `widgets/leagueos-team-os-demo.html`.
New: `widgets/leagueos-visual-console-v16.css`.

### Acceptance requirements

- Visual controls respond to keyboard/click/touch and update the same state as the technical form controls; hidden advanced fields remain usable when opened.
- The first primary game tile is above the fold at 390px (target top below 710px).
- All 4 night choices work; 8-week Wednesday scenario retains 80 unbooked games and the previously verified team average-start spread.
- The 4/6/3 playoff examples render the correct ladder using the original score/advancement engine.
- One-tap practice actions update the scoreboard and player log; detailed clock, jersey and notes are still optional.
- Scouting models and Player Audit never assert real eligibility or unsupported participation.
- Zero JS exceptions, HTTP 400+ source failures, non-GET/HEAD requests or mobile body-level overflow; Brave H.C. HockeyOS/HTO stays visually separate.
- All legacy V15/V14/V13/V12/V11/V10/V8 and four-night scheduling tests pass with only intentional UX-selector test changes.
- Verify hosted GitHub Pages separately after merging.

This specification is a **working design baseline**, pending the user's visual review. It is not an official live SVHL management deployment.
