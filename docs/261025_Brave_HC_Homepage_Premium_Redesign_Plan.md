# 261025 Brave H.C. Premium Homepage Redesign: implementation and handoff

## Ownership
Lead department: Media. Supporting: Engineering, Data & AI, QA & Testing.
Decision authority: Founder. Current approval: full execution of the agreed homepage design.
Implementation workspace: Brave H.C. GitHub Pages repository, with a temporary branch built on BRUTTECH 1.
Scope excludes modifications to the authoritative Master Workbook, HTO native statistics and SVHL standings.

## Objective and approved requirements
Rebuild the cramped homepage statistics widgets as a branded broadcast-style Season Centre. The news article is already satisfactory, and milestones belong within Hot Stove news. A redundant homepage Record Watch widget must be removed at the native HTO editor, while archive pages remain available.

Division Centre:
- Show all eight Cristillo Division rows and GP, W, L, T, PTS, GF, GA, WIN%.
- WIN% is W / GP, not a tie-weighted points percentage; preserve the original league rank/order.
- Make opponent intelligence a second tab, with a selector for all seven opposing teams.
- Display sourced record, league offensive and defensive rates, comparison with the Braves, verified upcoming fixture and exact-match HTO head-to-head data where available.
- Do not invent recent-form series, team aliases or tactical observations.

Team Projections:
- Show every available published model player by default, with filters for FT, CU and DI.
- Columns: Player / GP / G / A / PTS / P/G / Trend.
- Projected values are prominent; actual HTO statistics from that model snapshot appear in muted parentheses.
- P/G is the published workbook-derived ptsPerGame, never a newly substituted extrapolation.
- Trend assignments use the stored model trend and the original five workbook thresholds AB100 / AB99 / AB97 / AB96 without alteration. Keep the original conditional-formatting classification order.
- Thick SVG arrows with strong rise #f0344d, moderate rise #dc7383, middle #ffffff, moderate decline #79bdec, strong decline #217fd4. White NEW means insufficient comparable history.
- Tappable trend disclosure shows career regular-season rate, model trend-rate component and stored percentage. Workbook trend and displayed P/G are different stored values and must not be silently conflated.

Design:
- Brave H.C. navy/crimson with restrained gold accents and silver current actuals.
- Compact full-division table; narrow mobile uses two-line cards, not compressed illegible headers.
- Scrolling within fixed HTO iframes is a fallback only, not a reason to hide roster entries.
- Existing Hot Stove narrative and history are preserved unchanged.

## Source authority and reconciliation
- SVHL official public league rows determine league standings and opponent statistics.
- HTO is authoritative for player current results and schedules.
- projection.json is a dated workbook-derived model snapshot with an active parity hold, currently based on four team HTO games and a one-game workbook baseline.
- The founder-approved October 25 Hot Stove edition states that the Braves improved to 1-4 through five games. It may be used to display a source-lag warning, NOT to override official SVHL rows or insert unsaved current actuals into an older projection feed.
- Approved Mid Ice Crisis game preview includes historically verified regular season 1-2-2, all-time 1-4-2, playoffs 0-2-0; show only for the matching named opponent and preserve the evidence boundary.
- Any other opponent without a verified source shows league context only.

## Implemented files
- widgets/home-panels.html: premium shared markup and panels.
- widgets/home-premium.css: responsive theme, compact tables and premium layout.
- widgets/home-premium.js: data provenance, division/opponent rendering, trend classifications, SVG arrows and tap disclosures.
- widgets/standings-v2.html and widgets/projection-v2.html: stable public URLs routing to premium full-page views.
- Existing legacy standings.html and projection.html HTO iframe redirects remain intact.
- tests/test_home_premium_browser.cjs: local browser QA.
- Watch-v2.html and historical data are preserved separately. Compatibility panel=watch routes people to Hot Stove; it does not delete the HTO widget itself.

## Validation and acceptance
- JavaScript syntax check passes.
- Browser smoke must assert eight league rows, seven selectable opponents, mobile cards, complete 22-player projection roster, parenthetical current production, all five SVG legend colours, accessible trend details and no script errors.
- Verify verified opponent head-to-head when Mid Ice Crisis is selected.
- Monitor production GitHub Pages URLs after release. Publication cannot be assumed from a local commit.
- Do not change HTO native homepage until a backup is taken and an authorized editable HTO session is available.

## Native HTO editorial step
GitHub Pages controls iframe content, not the HTO homepage's HTML Source module placement and dimensions. To actually remove the redundant milestone widget:
1. In the HTO Home Page editor, save a rollback copy of the current module layout and source.
2. Delete or disable only the standalone Streaks / Record Watch / Milestones iframe module. Keep Hot Stove and its article milestone section.
3. Keep standings embed URL: https://adambrutto-maker.github.io/brave-hc/widgets/standings.html?embed=1
4. Keep projection embed URL: https://adambrutto-maker.github.io/brave-hc/widgets/projection.html?embed=1
5. Increase projected iframe height from the existing approximate 700px to 850-950px where the HTO editor allows. Consider 540px for standings when rendering mobile eight-row cards. If constraints prevent this, ensure internal scroll still exposes all rows and full-view links remain operational.
6. Read back the HTO homepage in desktop and mobile widths. Confirm the removed module is absent and that every projection player can be reached.
7. Do not report this step as complete without an HTO editor receipt and public readback.

## Rollback
The commit can be reverted using GitHub history to restore the previous widget routes and styling; no underlying statistics feeds or workbook formulas need to be recovered. Restore the HTO homepage from its saved pre-edit module layout if the native step fails.

## Boundaries
No unpublished individual scouting information, no credentials, no LiveBarn source material, no fabricated figures, no HTO native page changes without an attributable editor action.