# HockeyOS — Append-only SVHL Division Movement History and Incoming-Team Scouting
Date: October 26, 2026
Lead department: Data & AI. Supporting: Engineering, QA & Testing, Media.

## Objective
Make all-division monitoring actionable when SVHL reshuffles teams. A new Cristillo team needs its pre-arrival results, named opponents and their strength, a separately qualified previous-winter record, and Brave H.C.'s source-approved history. The underlying historical team, game and standings records must not disappear if a team leaves its division or the league directory.

## Source-grounded first movement
The prior publicly published Cristillo standings snapshot is committed at Git short ID 7ece75e, widgets/standings.json, source capture October 26, 2026 at 00:02:03Z. Its eight members include Sugo Sundays and do NOT include Maplewolves. A later all-division capture on October 26 shows the same SVHL season/source team IDs, with Sugo Sundays listed in Remax Division and Maplewolves in Cristillo.

This supports **two membership changes observed between those captures**, not an exact league effective change time:
1. Maplewolves now in Cristillo, absent from the earlier Cristillo-only list. Its exact prior current-season division was **not captured** by that earlier one-division snapshot. Its first four source-verified opponents are Primary Auto, Butcher Brothers, Mighty Drunks and Young Guns, all currently in Remax. Do not infer that their current divisions were necessarily the divisions in which those matches occurred.
2. Sugo Sundays exited Cristillo and appears in Remax in the later full league snapshot. The official HTO name for its Brave H.C. October 4 game is Michelob Morts; this identity remains a separately source-qualified one-game Brave H.C. history.

The seeded original observation in widgets/cristillo-membership-20261026-baseline.json explicitly discloses its **partial Cristillo-only scope** and uses source season team IDs from official TeamInfo pages. It is not a fabricated prior all-league snapshot.

## New append-only movement record
scripts/track_svhl_division_movements.py:
- Seeds the two known observed October 26 membership changes from the pinned historical published standings snapshot.
- On later runs compares TWO complete league-wide SVHL standings snapshots by stable season team ID. Documents source before/after observation times, from/to division and names. No guessed effective date or unsupported franchise rename.
- Records incoming Cristillo scouting snapshots with results against actual named opponents, source-derived opponent WIN%, previous winter only when roster-ID continuity passed, and independently approved Brave H.C. head-to-head totals. Subsequent team results may update separately without overwriting the first-arrival evidence.
- Retains the full last accepted profile when a previously tracked team leaves the current league directory, including game-level results and original canonical history. These archived profiles are not counted as current league teams.
- Rejects duplicate change-event IDs, source-team-ID name reassignment, source timestamps moving backwards, deleted prior events, deleted first-arrival scouting reports and erased departed-team history.
- Keeps an explicit bounded retention ceiling of 250 movement events / 120 incoming Cristillo profiles / 75 departed-league team snapshots; reaching a limit triggers HOLD for review, never silent deletion.

## Publisher and UI
- The daily 10:15 a.m. Eastern BRUTTECH 1 source publisher enriches the previous published league JSON with movement events *after* fresh official all-division source parity and *before* any public write.
- The existing JSON-only whitelist and clean Git main/fetch+fast-forward/no-force-push protections remain; the original Master Workbook, official HTO statistics, source SVHL website and approved articles are not modified.
- The all-division page adds a responsive **Division changes & incoming teams** section: source observation intervals, whether the prior division is known, selected incoming team results/opponent context, roster-qualified previous winter record and Brave H.C. historical matchups, plus source links. It does not claim predictive odds.
- The public validator and CI prevent erased ledger events, missing incoming reports, altered original observations, duplicate IDs and invalid archived-league team snapshots. The prior 49 source-paired completed games and 27 current team records remain unchanged.

## Validation and deployment
- Eight synthetic movement tests PASS: original observed 2-event seed, idempotent next capture, transfer between two known divisions, entering Cristillo from an established division, departing the entire league, source-team-ID name drift refusal, backdated source refusal and fake earlier baseline refusal.
- Twelve independent daily-publisher tests PASS, including deleted movement/arrival/departed records and game-preservation cases.
- First end-to-end live official read-only source rehearsal with the upgraded publisher returned CHECK_ONLY_QUALIFIED_NOT_PUBLISHED, with 27 teams, 49 paired completed games, 19 roster-supported previous winter records, two observed moves and one incoming Cristillo report.
- Browser regression on mobile and desktop confirms two source observations and one Maplewolves scouting card, with four Remax-current opponents, 2025–26 Maple Hyundai 11–10–3, and 10-game Brave H.C. historical head-to-head 3–6–1. No unverified previous current-season division is asserted.
- After independent GitHub CI, install the two new/updated runtime modules with versioned source-hash backups, keep the same scheduled task definition, perform another read-only rehearsal and then run the existing task once. Verify deployed GitHub Pages and actual HTO iframe source link.

## Rollback
Revert the audited GitHub PR for the public dataset/UI, and restore the previous daily Python publisher from protected runtime backup. The append-only history can be reconstructed from the pinned original source observation and the timestamped private daily league snapshots. Never overwrite original source history in an attempt to restore a UI.
