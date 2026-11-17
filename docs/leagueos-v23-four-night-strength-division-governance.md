# LeagueOS V23 — Four-night division recommendations and governed strength levels

Date: November 17, 2026 (America/Toronto)
Lead: BruTTech Engineering / LeagueOS
Status: Public research candidate. No official division placements, league-approved strength levels or authoritative game modifications.

## Objective

On a single public LeagueOS Divisions Plan page, show the current and proposed arrangements for Sunday, Tuesday, Wednesday and Thursday, with all 96 source-qualified rated teams assigned exactly once. Source-backed historical team and player evidence is processed behind the scenes. Proposed division sizes may differ from current league practice, subject to strength, provenance, ice/schedule and eligibility restrictions.

## Data provenance

- LeagueOS four-night alignment research v2: 96 source-rated teams, current league/night/program/component/standings labels, result-adjusted Elo and qualified historical roster evidence. Six additional standings teams were outside the rated evidence set and are not silently placed.
- LeagueOS V23 exact player-ID current roster capture: 96 current public team pages inspected; 92 qualified; four source-held. 1,440 qualified current team-player observations; 70 exact source player IDs with GP on multiple nights; one cross-program player ID does not authorize mixing.
- Public Sunday historical roster/season archive: October 27 source-verified exact player IDs and past division/season names on 22 current Sunday teams. There are 236 current team-player history links, not necessarily 236 unique individuals.
- League strength governance v23: 15 currently named source divisions, five ordinal proposed levels. No official assignment yet; each has null level and UNASSIGNED status.
- V4 reciprocal fixture registry: 411 public source records (335 completed, 66 future, 10 historical 0:0 holds). New verified settled games may be added only as a separately derived delta, never by editing the original historical snapshot.
- The generated v23 recommendation JSON includes SHA-256 source fingerprints and dated capture metadata. No HTO page software or proprietary source code is copied.

## Competitive-balance model

- Results-based within-graph Elo is the numeric comparison. An all-pairs same-division expected-mismatch proxy (100 times the absolute model share difference from 0.5) is computed for every proposed group, not just moved teams.
- Search 4–10 teams/group with material gain gates, small/odd/oversized group penalties and up to one more/fewer division per source-connected program pool.
- Proposed groupings cannot mix nights, Masters/Open/Separate programs or unconnected match-graph components. Missing roster facts, invalid standings and sponsor divisions spanning disconnected components produce a visible source hold.
- Current exact-ID roster composition, top-two scoring concentration, historical same-player division experience, cross-night current player performance and source roster continuity all inform evidence and confidence.
- Cross-night numeric transfer currently has zero weight. Official comparable division tiers do not yet exist, and existing validation did not demonstrate a reliable improvement from historical player-prior weighting over results-only ratings. Do not represent provisional group bands as official tiers or estimated future win probabilities.
- Group assignments are complete within the 96-team modeled set; six source-unrated standings entries remain outside the candidate scope.

## Initial source-based comparison

| Night/pool | Current groups | Provisional alternative | Qualification |
|---|---|---|---|
| Sunday Open (22) | 5 / 7 / 10 | 8 / 8 / 6 | Source-connected, needs league review |
| Tuesday Open (16) | 6 / 5 / 5 | 8 / 8 | Different number of divisions; scheduling review needed |
| Wednesday Open (20) | 6 / 8 / 6 | 8 / 6 / 6 | Source-connected, needs league review |
| Thursday Open nine-team pool | 9 | 4 / 5 | Requires rink/time and tournament format feasibility |
| Thursday other Open source components | Fragmented 1/7 and a six-team source component | Held/retained | A & G Cleaners source division crosses disconnected components |
| Thursday Masters | 5 and 6 | Retained/protected | Separate protected programs |
| Sunday separate program | 4 | Held/retained | Four public roster pages below evidence threshold |

The internal fairness comparison is an uncalibrated model proxy, not a guaranteed competitive result.

## Division strength-level governance

The league must formally assign effective-dated strength levels to divisions, ideally through an authorized commissioner workflow. Levels 1–5 are illustrative ordinal categories. Official data needs approval identity/role, source and effective date, documentation of changes, eligibility rules, source-version history, and a dispute path. Historical division levels would be needed before player scoring from earlier divisions can be normalized responsibly across nights.

LeagueOS V23 includes a browser-local draft tier picker and JSON export for all 15 named divisions, clearly marked unapproved. These drafts do not numerically affect team grouping and cannot become official through this public demo.

## Daily post-settlement refresh

A scheduled GitHub Actions workflow checks public source records in the Toronto morning, using two DST-safe UTC triggers and idempotent publishing. It detects completed results only from the bounded known future source fixtures, after the Toronto game date has passed and both teams' independent published schedule entries agree on the non-zero final. Zero-zero placeholders, one-sided records, inconsistent goals, conflicts with already accepted finals and dates not fully settled are held.

When no new completed games qualify, no source or recommendation file changes. When new reciprocal results qualify, the job captures current player data, applies bounded new result changes to the existing rating context, rebuilds recommendations, runs source and regression tests, and commits only derived JSON data to the BruTTech GitHub Pages repository. No official HTO or SVHL write occurs.

Important limitation: Newly announced future games outside the original November 16 bounded source registry are not yet auto-discovered. A separately governed fixture-discovery refresh is required to expand coverage. Daily checks must never imply unlisted games were cancelled or ice time became available.

## Acceptance

- Full four-night coverage within the 96 rated teams and complete conservation of current/proposed membership.
- Exact source player ID bridging, Sunday historical division contexts, 15 unassigned official league tier entries.
- Source-model and security unit tests, negative forged-tier/standings tests, daily settlement source guard tests, desktop/mobile browser acceptance and V18–V22 regression suites.
- Post-merge GitHub Pages publication must be verified by actual hosted readback and browser tests. Workflow schedule/dispatch must also be verified separately.
- Existing sources, source game sheets, standings, player profiles, playoff registrations, financial records and the original HockeyOS awards workbook remain untouched.
