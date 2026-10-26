# Brave H.C. HockeyOS — Official HTO Upcoming Matchup Detection
Date: October 26, 2026

## Scope

Add a **source-linked upcoming games** panel to the existing League Intelligence scouting centre. The canonical fixtures are from the Brave H.C. public HomeTeamsONLINE (HTO) schedule, not the separately collected SVHL league-results feed. Upcoming fixtures are **not** independent SVHL confirmations or completed outcomes.

## Source and identification

- Collector: `scripts/collect_hto_upcoming_fixtures.py`. Standard-library read-only HTTPS access to `https://www.hometeamsonline.com/teams/default.asp?d=YYYYMM01&p=schedule&s=hockey&u=BRAVESHOCKEY`.
- Four calendar months are checked: collection month and next three; filter for the upcoming 75 Toronto-local days.
- Only event links classified as `game type0` with HTO `p=preview` and a genuine numeric `gameID` can enter the future fixture feed. Non-game events, birthdays and completed-game detail links are omitted.
- Each admitted game keeps the original HTO game ID, date, published local time, home/away label, rink, original opponent name and official HTO preview link.
- Team identity is matched solely to uniquely normalized `leagueName`/`displayName` values in the separately qualified current SVHL `league-intelligence.json`. This permits documented punctuation differences (e.g. Mohawks H.C. vs Mohawks HC) without asserting that an arbitrary similar name is the same franchise.
- An unrecognized HTO opponent stays publicly visible as **not matched to a current SVHL team**, without copying an invented strength rating or head-to-head profile.

## Release boundary

- New public-only `widgets/upcoming-matchups.json` has a separate schema, collection timestamp, captured source-page URLs and hashes, future date range, original game IDs, source link and team-identity status. It does not modify any result or player statistics.
- `scripts/check_hto_upcoming_fixtures.py` independently validates the public fixture object against accepted SVHL season-team IDs and the complete source URLs.
- `scripts/publish_hto_upcoming_fixtures.py` is a **separate** daily publisher with its own release receipt and allowlist limited to `widgets/upcoming-matchups.json`. It fetches/fast-forwards clean Git main, captures/validates HTO evidence before writing, and never force pushes.
- Schedule the collector for **10:25 a.m. America/Toronto** daily, after the existing **10:15 a.m.** SVHL league publisher. Do not edit existing League Intelligence or opponent-ledger tasks.
- On missing or ambiguous source evidence, fail closed; leave the accepted prior public schedule untouched. The UI discloses stale-source age and filters games elapsed in Toronto local time, avoiding stale automatic selection.
- The original Master Workbook, HTO backend, SVHL league database, editorial material and existing player widgets are read-only/outside the write scope.

## UI

- Public League Intelligence page has a top-panel list of separately source-verified upcoming fixtures; the earliest remains first.
- Each verified future game has an official HTO game-source link, a date/time/rink and a source-team-matched button into the existing scouting report.
- The next matched source-backed opponent is automatically selected only when no explicit team query is supplied **and the schedule source is fresh**.
- If the schedule feed is unavailable, existing standings, source-verified scouting, movement history and trend dashboard remain available.

## QA

- 13 focused Python parser, identity, provenance and negative tests.
- Browser desktop (1150px) and mobile (358px): fixture count and order, exact team identity navigation, official source links, existing game scouting/clipboard functions, zero JavaScript errors and no viewport overflow.
- Dedicated read-only GitHub CI workflow `.github/workflows/brave-upcoming-fixtures.yml` validates the public release on PR and push; it has no write permissions.

## First accepted fixture observation

The October 26, 2026 public HTO November calendar listed Nov 1 Mid Ice Crisis (8:15 p.m. Away, D Rink), Nov 8 Other Way (9:15 p.m. Home, D Rink), Nov 15 Dateline Predators (8:15 p.m. Home, A Rink), and Nov 22 Mohawks H.C. (8:15 p.m. Home, A Rink). These four official HTO game IDs (3375683–3375686) matched four distinct current SVHL team records, and their source URLs/hashes are preserved in the initial JSON.

## Rollback

Revert this scoped release in the public repository and disable the **new** schedule task. Preserve the existing league-statistics task, its private snapshots and the original workbook without modification.
