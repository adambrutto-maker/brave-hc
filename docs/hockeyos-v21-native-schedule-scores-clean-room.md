# HockeyOS V21 — Native team schedule, results, and game summary

Date: November 17, 2026 (America/Toronto)
Lead: BruTTech Engineering / HockeyOS within SportsOS
Scope: Public independent team website, read-only official HTO game facts
Release status: Reviewable website candidate; publishing requires normal source and browser gates.

## Objective

Continue the established online BruTTech SportsOS incremental release model. The founder requested a familiar HTO-style HockeyOS site and a separately tailored LeagueOS commissioner experience. V21 replaces the HockeyOS Schedule and Scores link-only shells with native, source-qualified team game views while keeping V20 player information, V19 website layout, V18 browser-local game-scoring review, and established LeagueOS commissioner tools intact.

## Evidence and clean-room provenance

The original public Brave H.C. HTO site is the authority for game results and HTO game IDs. The implementation uses independent BruTTech source code and a **facts-only public capture**, not HTO proprietary code, HTML markup, CSS, photographs, editor interfaces, JavaScript, or private records.

Read-only source pages:
- `https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=scores`
- `https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=schedule`
- Each direct `gameID` link that these public pages actually expose, to the original `boxscore` or `preview` page only.

Captured artifact: `widgets/hockeyos-hto-games-v21.json`, schema `bruttech-hockeyos-hto-games/v21`. Manual reproducible script: `scripts/capture_hockeyos_public_games_v21.cjs`.

The script scans **eight HTO calendar months (September 2026 through April 2027)** using HTO's explicit month query parameters, and crosschecks every completed calendar `gameID` against the independent current-season Scores list. Birthday and other HTO calendar events are deliberately excluded. It follows only public source URLs with valid HTO game IDs.

For each completed game, it independently reads the visible public scoreboard, final goals, period labels and period goals, date, local scheduled game time and rink. For scheduled previews, it retains the public date, time, opponent, rink and exact original `gameID`, with **no invented result**. Home/away orientation is not inferred from HTO title order because the source uses distinct presentation conventions.

## Current source reconciliation — November 17, 2026

- Eight completed HTO scores: eight identical game IDs in the publicly browsable September–November calendar.
- One future HTO `gameID` preview for November 22, 2026, vs Dateline Predators at 8:00 p.m. in Vaughan Sports Village B Rink.
- All nine source-linked current-season game entries have unique HTO IDs.
- Every completed box score's published period values sum to the displayed final score.
- The completed **1–7–0** result record reconciles with the independent V20 source-verified 8-game team-statistics baseline. No result is added to the season record twice.
- The captured HTO calendar did not publish other team game IDs for the surveyed December–April months. **This is not proof those months are game-free** or that facility ice is available. Other dates in the separate league feed remain subject to HTO reconciliation and are not promoted to certified fixtures.
- Exact direct source game URLs are preserved for every game. No fuzzy joins by team/opponent name, jersey, date or prior HTO ID are used.

## Shipped HockeyOS interface

1. **Schedule:** responsive month calendar and list toggle, opponent search, completed/scheduled filters, official HTO direct IDs and links, source-coverage and capture-date disclosures, explicit no-evidence messages for empty months.
2. **Scores:** all eight completed source finals in reverse chronological order, 1–7–0 record, result filter (wins/losses/ties), opponent search and an isolated V18 local practice-scoring review inbox. Practice results cannot enter official records.
3. **Game summary:** original native per-game page, directly addressable by `#team-game-<verifiedHTOGameID>`, final scoreboard with period rows where published, dates/times/venue and full official HTO box score or preview link. Unknown IDs fail closed. Future previews are never scored.
4. **Team home:** source-verified latest completed result summary (Nov 15 loss to Sugo Sundays) beside existing V20 stat leaders, approved Hot Stove and roster/manager tools.
5. **Site navigation:** the Scores tab stays active on individual game pages; mobile period tables must display the F final-score column without horizontal scrolling.
6. **LeagueOS:** the commissioner schedule, playoff centre, early/late fair scheduler, game sheets, HTO-ineligible source review and existing administrative workflows remain unchanged.

This release shows the **published period scoreboard**, not a complete native player-by-player game sheet. The latter must be built from separately verified event/roster data with identity and eligibility controls; it cannot be inferred from period totals.

## Integrity, identity and safety boundaries

- V21 source verification checks schema, season, authority, exact HTO URLs, unique IDs, per-game status, dates, time, score integrality, period parity, outcome, complete-team IDs, exclusion of unrelated calendar events, monthly coverage, and 8-game W–L–T consistency with V20 data.
- Unexpected source changes, forged IDs, duplicate records, malicious text and incomplete result data produce visible source holds. No fake zeros, guesses or stale page substitution.
- Public source facts are re-captured only through the reviewed script; a dated snapshot is **not live synchronization**.
- No HTO CMS, Sports Village league administration, player registration, Master Workbook, AwardsScoring or official statistics have been edited.
- TeamOS browser-local V18 practice scores and published HTO completed scores are separate datasets, with different statuses and authority.
- No real authenticated league approval, referee sign-off, league-owned ice inventory or payment implementation is implied.

## Local acceptance

- **60 / 60 unit tests**: 19 new V21 source/negative contract tests plus 41 existing HockeyOS and LeagueOS tests.
- **43 / 43 V21 Edge browser checks**, desktop 1440px + mobile 390px: calendar, list, source IDs, future preview, results, period boxscore, direct-hash reload, safe unknown-ID handling, filters, mobile F-column visibility, roster and LeagueOS regression, zero JS exceptions and zero server writes.
- Existing browser suites passed unchanged in functionality: **28 / 28 V20**, **29 / 29 V19** (updated to wait for V21 asynchronous pages), and **14 / 14 V18**. **114 total browser checks passed in local staging**.
- Local QA screenshots and receipts stay outside the public GitHub Pages repository.
- The normal release path is a reviewable PR, controlled merge, hosted URL readback, and equivalent browser acceptance on the actual HTTPS site.

## Next incremental roadmap

- Source-qualified current-season HockeyOS lineup and postgame event breakdown, with verified game/player identity and role/eligibility gates.
- Extend the LeagueOS administrative dashboard for verified vs held league fixture synchronization, source discrepancies and commissioner acceptance.
- Add multi-season HockeyOS history and playoff archives only as per-season source evidence is separately checked.
- Later production changes must implement independently authorized authentication, immutable revision/audit trails and official publication approval; not part of this public demo.
