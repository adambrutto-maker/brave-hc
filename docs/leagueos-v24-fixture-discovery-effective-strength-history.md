# LeagueOS V24 — Four-night fixture discovery and effective-dated strength history

Date: 2026-11-17 (America/Toronto)
Lead: BruTTech Engineering / LeagueOS
Release surface: Same existing public SportsOS LeagueOS Division Plan page.
Authority: **Read-only research and source verification, not official league administration.**

## Objective

Close the V23 daily recommendation blind spot: its fixed November 16 source registry held 411 reciprocal games but did not discover newly announced future fixtures. Add safe automatic four-night game discovery while retaining the rule that numerical ratings and recommended divisions change **only after exact-ID reciprocal game results have been settled and validated**. Provide an effective-dated strength-level history schema that the league can authorize in a future authenticated administrative service.

## Public source capture and source reconciliation

The new script \`scripts/discover_leagueos_fixtures_v24.py\` independently reads only official public Sports Village league and team pages for League 570 Sunday, 568 Tuesday, 567 Wednesday, 569 Thursday. It uses the existing original BruTTech source parsers, not vendor HTO/SVHL application code or private credentials.

On Nov 17 the script read 102 current team pages and found 472 unique game IDs with reciprocal independent team-page corroboration. The preserved November 16 V4 registry contained 411 such matches. Consequently, **61 new verified source-linked future game IDs** were identified; all were then unscored and on Sunday dates beginning November 29. These are **candidate source fixtures**, not league or arena booking approvals. The public page shows exact official game links and differentiates them from published actual results.

One current Thursday standings entry contains a negative/inconsistent W-L-T value; the four-night fixture discovery does not fabricate that record or suppress its team page. Six teams in published playoff-labelled source divisions are outside the 96-team competitive rating research set. They remain visible as explicit *unrated* source entries and are excluded from numerical division recommendations.

The resulting \`widgets/leagueos-fixture-discovery-v24.json\` contains:
- Immutable SHA-256 of the V4 baseline, official record-change permission false, source-time and material-change markers.
- Current league directory with all four nights, league/team ID/standings division, all six unrated source teams.
- New candidate fixtures with exact league/game ID, date, time, home/away team IDs, two verified source links, source-page SHA-256, and source status.
- Counts and holds for one-sided/inconsistent sources or ambiguous calendar rows. The public model rejects unsupported source identities, wrong URLs, unknown sides, invented finals and forged write permission.
- Monotonic candidate history: disappearance or a new binding to a different team becomes a *source hold*, not a silent deletion. No-op checks do not commit volatile timestamps.

Daily source discovery does not infer facility inventory, ice availability, official scheduling approval, player attendance or referee sign-off.

## Daily postgame recommendation gate

The existing active GitHub workflow \`.github/workflows/leagueos-v23-daily-postgame-recommendations.yml\` is upgraded to V24 while preserving its published schedule of two DST-safe Toronto-morning checks. It first discovers current reciprocal game IDs from all current public team schedules, then checks both source pages for each known due game.

**Only if a source game date is past in Toronto**, with the *same exact game ID* on both teams' public schedules, identical date/time, reciprocal opponent-team IDs, complementary Home/Visitor orientation, and equal, non-placeholder final score does the result qualify. Every due game on the date is evaluated; incomplete dates stay held. A source-disappeared game, changed previously accepted score, non-qualifying 0–0 placeholder, team outside the rated competition pool, invalid source identity or source access failure cannot change numerical strength.

There are two independent publication triggers:
1. **New fixture only:** publish new qualified discovery JSON to the same live site, but preserve the last valid numerical division recommendation.
2. **New settled game:** refresh exact current player roster evidence, update bounded within-source-component result context, rebuild the numerical division proposal, and publish the qualified discovery, settled delta and recommendation data.

If neither evidence state changes, GitHub remains untouched. Before any eligible update, Python/Node source-protection tests and file-diff checks must pass; after rebase, tests repeat. GitHub Actions explicitly triggers the existing Pages workflow after a qualified bot-generated commit because bot commits may not trigger push-based deployments. No backend or official HTO/SVHL write is available.

**Scope limitation:** public source data can change between daily observations; any missing, inconsistent or unpaired source is held. The independently qualified 96-team numerical model is not automatically expanded merely because six playoff-labelled teams are present in the current league directory.

## League strength governance

The independent \`widgets/leagueos-strength-level-history-v24.json\` is seeded from the existing 15 current unapproved division-level requirements plus a verified Sunday historical roster archive. It contains **39 historical division-season labels** with aggregate exact-player-ID source counts and **zero official level assignments**.

Every current and past division classification must eventually have:
- League/season/program/division identity, program-protected eligibility, source evidence;
- An explicitly assigned ordinal strength level 1–5 (policy-defined), effective-from/to dates;
- Authenticated league approver, source policy revision, reason/reference for assignment;
- Immutable amendment history, dispute/appeal support and cross-night comparability policy.

The website displays its history, unresolved classification count, and source limitations. The existing V23 commissioner draft controls have been enhanced with proposed effective dates, persisted and exported **only in that browser**. The export has \`officialWriteAllowed:false\` and \`approvedEffectiveFrom:null\`. It cannot authorize official tiers or alter group recommendations.

LeagueOS must not calibrate individual player scoring across historical or current division levels until official levels, verified longitudinal player IDs, roles and independent prospective outcome testing are available. The existing V23 numerical cross-night player adjustment remains zero.

## Source and privacy boundaries

- No HTO CMS edits, SVHL commissioner actions, official game schedule/results/standings updates, roster changes, player private details, payment, discipline, reference game sheets, Master Workbook or AwardsScoring changes.
- The 61 future new game IDs cannot be displayed as settled scores or available rink slots.
- Source snapshot timestamps are explicit. The public site is **not live authentication, not a production source-of-truth database, and not an approval workflow**.
- Do not infer that a past 0–0 placeholder is a verified tie or that a historical division's sponsor name equates to competitive strength.

## Acceptance targets

- 102 current public team pages, 472 unique reciprocal game IDs, 61 newly sourced future fixtures, six explicit unrated teams and no official writes in initial Nov 17 source snapshot.
- 15 current strength-level requirements and 39 historical division-season labels with zero authorized levels.
- Source parser negative/unit tests for mismatched exact game IDs, one-sided/partial results, negative standings, monotonic discovery and safe idempotence.
- Full V24 and inherited V18–V23 mobile/desktop browser acceptance, source tampering and preserved HockeyOS access.
- Reviewable PR, successful GitHub Pages publishing, and manual no-change daily workflow dispatch recorded after merge.
