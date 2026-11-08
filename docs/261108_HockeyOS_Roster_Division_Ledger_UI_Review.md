# HockeyOS — Official Team-ID Roster Division Reconciliation (Review Only)

**Lead department:** Engineering / HockeyOS
**Prepared:** November 8, 2026
**Release classification:** DRAFT PR — source/consumer review only; **not approved for production publication**.

## Defect and source facts

The October 26 roster capture contains **22 current-season adult Sunday teams, 348 player observations, 191 archived team-season manifests, and 3,222 historical player/season observations**. The November 8 official SVHL league snapshot still contains the same 22 source team IDs but three teams have moved divisions:

| Official team ID | League name | Roster division at capture | Current observed division |
|---|---|---|---|
| 13717 | Degenerates | Fazzari Partners | Remax Division |
| 13709 | Sugo Sundays | Remax Division | The Cristillo Division |
| 13716 | Young Guns | Remax Division | The Cristillo Division |

The unmodified `roster-strength-scouting.js` failed closed on **all** scouting reports because it required historical roster division text to equal the newest current division label. The current source contains a full official league movement ledger recording these three source-ID-matched transfers as observations between snapshots; **actual transfer effective dates are unknown**. Official current division sizes are 5 Fazzari, 10 Cristillo and 7 Remax, superseding stale test fixture counts of 6/8/8.

## Changes in this draft

- `widgets/roster-strength-scouting.js`: retain all original official team/player IDs, roster/stats integrity gates, name/source URLs, historical season page hashes, and nonprediction policy. Admit a division change only if the current official movement ledger has exactly one qualifying record with the same numeric team ID, exact name, from/to divisions, full two-snapshot source authority and valid observation chronology. Duplicates, missing or fabricated transfer evidence, future dates, unobserved teams and identity collisions remain `ROSTER_SCOUT_HOLD`.
- The source module now provides the captured division, provenance and observed transfer window, plus an eight-day source-freshness flag. It **does not** claim new roster capture, verified game-day attendance, lineup role, position or individual performance.
- `widgets/league-intelligence.js`: the player scouting screen labels aged evidence **HISTORICAL ROSTER ONLY** and displays the observed transfer with explicit unknown effective date. No HTML injection: source notes are written as text content.
- `tests/test_roster_strength_scouting.cjs`: replace one hard-coded retired 6/8/8 membership expectation with the current official input's own division counts. The remaining original source/negative tests are retained.
- `tests/test_roster_division_movement_ledger.cjs`: 14 portable source, mutation and fail-closed tests covering team IDs, identity, transfer authority, missing/duplicated events, historical data freshness and source immutability.
- `tests/test_svhl_roster_scout_browser.cjs`: check the source-derived current bridge counts and transfer disclosure instead of obsolete hard-coded October records, while preserving player selection, clipboard plan, desktop/mobile and missing-source handling.

## Validation completed on isolated review branch

- 14/14 portable movement-ledger tests PASS.
- 14/14 existing roster-scouter tests PASS with source-derived membership expectation.
- 6/6 existing division-evidence tests PASS.
- Existing historical roster-era model PASS (22 teams, 348 roster entries, 191 historical team-season sources).
- Existing real Chrome roster scouting browser test PASS at **1140 px and 358 px**: current three transfers, source-bound caution, proposed matchups, clipboard workflow and no horizontal overflow; withheld roster on unavailable source.
- Independent private preparatory tests: 22/22 and seven local-browser acceptance scenarios, including zero JavaScript errors and no source writes.
- Current public main repository, source JSON, original HTO provider pages, original Master Workbook, release tasks and scheduled collectors were **not modified or executed** during this candidate.

## Release and review boundaries

**Do not merge or deploy from this draft until source-owner and independent QA acceptance.** It is a source consumer correction, not a newly verified current roster. At this checkpoint the roster's league-source capture is approximately **12.68 days older** than the current league snapshot, beyond the existing eight-day current-qualification window. Historical ID-linked observations may be reviewed as history; do not treat them as game-day confirmed participants, current ratings, award scoring or game-night lineup assignments.

Review coordination is required with other open HockeyOS drafts, particularly opponent-player intelligence and source/CI-drift work, because they can touch the same interface or tests. Rebase onto approved changes before any release. Do not alter fixture, countdown, HTO boxscore ingestion, awards, original weights or numerical forecasts in this scoped change.

**Next gates:** independent code and browser QA, roster-source-owner acceptance, fresh official roster capture and identity audit, related-draft conflict resolution, then separate authorized public release and rollback verification.

## Reproduction

From the draft worktree:

```powershell
node --test tests/test_roster_division_movement_ledger.cjs
node tests/test_roster_strength_scouting.cjs
node tests/test_roster_division_evidence.cjs
node tests/test_roster_era_strength.cjs
node tests/test_svhl_roster_scout_browser.cjs
```

Chrome browser tests require the existing supported Puppeteer environment. A green draft CI or local test suite confirms the source guard works; it is **not** authorization to claim the old roster is current or to publish.
