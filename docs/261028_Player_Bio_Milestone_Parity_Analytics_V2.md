# HockeyOS Player Bio V2 — Milestone Highlights parity and advanced analytics

**Date:** October 28, 2026
**Lead:** BruTTech Engineering
**Candidate:** `feat/hockeyos-bio-milestone-ux-analytics-v2-261028`
**Reference:** Live `widgets/player-highlights.html` Trophy Room and current production `widgets/player-bio.html` (release #155).

## What was observed

The Milestone Highlights widget uses one bordered collection room, a compact branded header, four collection tiles, a category view with optional filters and achievements as small structured cards. The Bio V1 used a similar color palette but independent full-width sections, a prominent multi-button navigation row, a horizontally long history chart, repeated raw Stats information and several lengthy caveats.

The replacement **Performance Lab** follows the Milestone pattern instead of merely copying its navy and gold colors. It uses one gold-outlined collection, icon/category tiles, a single default view and a separate All option. Distinct skater and goalie navigation is preserved, including a verified dual-role profile.

## Released baseline versus V2 candidate

V1 remains live under GitHub merge `248be3d001c104b28842451696bbe4385b0b104e`. This V2 is **review-only until separately approved**; no native HTO editor, Master Workbook, Awards/Records, homepage UI or public Pages deployment is changed by building it.

| User-facing area | V2 behavior | Statistical authority |
|---|---|---|
| Overview / Goalie | Four Milestone-style category tiles and one active panel by default | Official identity / dated HTO career archive |
| Season chart | Actual stacked G and A, Winter/Summer/Actual points-per-game line, Recent 8 seasons default, Career/Winter/Summer filters | Source-verified 18-season game-length assignments |
| Scoring composition | Actual goal-versus-assist share as a two-color bar | Complete HTO career G/A/Pts parity |
| Advanced indicators | Goal and assist rates adjusted to common game length; qualifying peak season; situational PP goals, GW goals, SH goals, PIM/GP, +/−/GP, POTG per 100 GP | Available published career totals only; missing attributes excluded |
| Development | Last 3 vs previous 3 qualifying seasons; 5+ GP threshold; peak season, middle-half range and last-8 adjusted trend visualization | Source-mapped game lengths and GP-weighted rates; insufficient sample held |
| Goalie | Winter-equivalent GA per recorded appearance, actual win-point %, shutouts per 100 GP, peak GA season, actual historical W/GAA trend | Verified HTO goalie stats; W/L/T must reconcile; no simulated save % |
| Outlook | Existing player model, not recalculated; provisional flag remains, sources behind disclosure | Same `widgets/projection.json` feed as homepage |
| Game Plan | Only next two matched SVHL fixtures initially, optional expansion and general public 1-2-2 guidance in disclosure | Verified fixture/team identity; no opponent predictive coefficient |
| All | Explicit opt-in to longer combined view | Same underlying data and privacy rules |

## Source coverage audit — actual October 28 published JSON

The HTO player career archive contains **109 source-validated player identities**: 87 have skater segments, 17 have goalie segments, one has both. Segment counts are not a count of distinct statistically active people because some identities have no published statistical segment.

- **400** skater season rows exist; **360** have source-qualified GP/G/A/Pts parity and **40** are incomplete (e.g., GP and plus/minus only). Incomplete rows are **not** treated as zero scoring.
- **47** goalie season rows have GP and GA data; **21** lack a complete W/L/T breakdown. Win-point estimates from missing outcome fields are **not** calculated.
- Historical game-duration mappings cover all **18** distinct readable season labels. Summer 48-minute to Winter 32-minute uses 2/3; Winter to Summer uses 3/2.
- Situational columns have unequal coverage. In the skater season rows, 280 contain power-play goal observations, 274 game-winning goal observations, 352 PIM, and 340 Player of the Game; metrics use published career totals only when present and valid. Do not infer omitted values.
- Source archive captured October 20, 2026, is not the same dated snapshot as the HTO current-season source or the provisional skater forecast.
- The workbook column `PPG` is **power-play goals**, not points per game. Derived rates must be calculated independently.

## Nonnegotiable analytical rules

1. Keep official records, awards, career totals and goals/assists bars **actual**; adjusted rates and forecasts are separate derived analytics only. Original Excel remains untouched.
2. Adjust only source-qualified game-duration metrics, preserve actual GP and playoff/regular scope, do not multiply a scoring total by an assumed season length.
3. A complete **career** normalized rate is shown only when all published scoring seasons are complete and mapped. Otherwise use an explicit **verified-seasons** label. Insufficient sample metrics are unavailable, not zero.
4. Peak/recent development comparisons use seasons with **5 or more** recorded appearances. Comparisons of recent three versus prior three require six qualified seasons.
5. Goalie win-point percentage uses `(W+0.5*T)/GP` only when recorded W/L/T totals sum to GP. Goals allowed per appearance are regulation-duration equivalents, not official GAA.
6. No player-specific game-night coaching, video, attendance or lineup instructions in public GitHub Pages. Approved general team tactics may remain public.
7. No opponent-specific forecast adjustments until the underlying player-game team ID, opponent identity, source coverage and predictive model are independently verified.

## What is *still* missing from advanced analytics

- **Player-specific game-level streaks and situational form:** requires source-complete game sheets across HTO regular season and playoffs; do not infer a no-point game from missing game participation.
- **Head-to-head player-versus-opponent performance:** verify individual appearance and goal/assist events against each source-identified opponent, then evaluate sample reliability and division-strength transfer.
- **Player impact and exposure:** true on-ice minutes, shifts, actual shots/save percentage, and special-team ice time are not in the verified HTO profile sources; do not invent them from season GP or partial league goal-event feeds.
- **Calibrated goalie forecast:** historical team-game denominators plus verified actual goalie W/L/T/GA, expected attendance and confirmed future starts; release gate remains held.
- **Private role-based coaching insight:** authenticated user, coach-approved lineup assignment, role status and reviewed game-specific notes required.
- **League commercialization:** rules editor for period count/durations, game length, season mappings and historical snapshots; the core engine exists but the manager UI is not yet a shipped feature.

Continue these through BIO-V2 tracker [#156](https://github.com/adambrutto-maker/brave-hc/issues/156). Do not replace missing inputs with broad guesses.

## Acceptance gates

- 109 player identities and leadership associations unchanged; no native Stats table duplicated in the public Bio.
- Mobile widths 320, 390, 625 and desktop 1280 verified; no document-wide horizontal overflow, chart axes and season labels readable.
- Four visible Milestone-style collection tiles for single-role profiles; dual-role retains both source roles. Toggling actual/winter/summer changes rate line only.
- Goalie and source-poor profiles display supported analytics, never fabricated missing outcomes or numerical goalie forecasts.
- Recorded G/A and official Records/Awards data sources unchanged; no source workbook or homepage model edits.
- Production deployment, if subsequently authorized, requires new source/CI acceptance, HTO iframe readback and rollback evidence.

**Current decision:** V2 code and previews are ready for controlled review. The V1 Bio remains the production baseline.

## Review screenshots — actual local Edge rendering

- [Skater Overview, mobile](previews/261028_Bio_V2_Skater_Overview_Mobile.png)
- [Skater Overview, desktop](previews/261028_Bio_V2_Skater_Overview_Desktop.png)
- [Goaltender Overview, mobile](previews/261028_Bio_V2_Goalie_Overview_Mobile.png)
- [Development collection, mobile](previews/261028_Bio_V2_Development_Mobile.png)
- [Game Plan collection, mobile](previews/261028_Bio_V2_GamePlan_Mobile.png)

These are source-backed *candidate* visuals, not screenshots of the current public HTO page. The approved Milestone Highlights design remains the benchmark. All screenshots were generated from the isolated candidate browser test, not the live website.
