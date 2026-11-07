# HockeyOS — SVHL dual-source schedule and fixture identity safeguards

**Development date:** November 4, 2026. **Release disposition:** review-only PR; not published or merged.

## Why this change is needed
GitHub issue #209 identified a Nov 15 / Nov 22 conflict while SVHL was adjusting division fixtures. On Nov 4 the stored HTO and Family Calendar both had Nov 15 Dateline Predators (8:15 p.m., A Rink) and Nov 22 Mohawks H.C. (8:15 p.m., A Rink); the live league site subsequently published Nov 15 Sugo Sundays (7:15 p.m., A Rink) and Nov 22 Dateline Predators (8:00 p.m., B Rink). These are provisional until the league finishes publishing.

## Implemented
- Require the official league-wide schedule and Braves HC team page to agree on **date, time, opponent team ID, normalized opponent name and home/visitor side** for all upcoming fixtures.
- Read permanent game IDs from the Braves' **TeamInfo** source. Its schedule grid is verified by exact selector; unrelated featured results are ignored.
- Record `opponentTeamId` and `leagueGameId` in the read-only candidate feed. Keep existing `assignmentKey`, `htoGameId` and `fixtureSignature` semantics unchanged.
- For subsequent revisions, a matching official `leagueGameId` is stronger evidence than same opponent/date/slot. An identified fixture cannot inherit the assignment identity of another identified league fixture after a division reshuffle.
- Fail closed before new reconciliation files are produced when the two SVHL pages disagree, duplicate official game IDs appear, or a team source row is malformed.
- Include the new regression suite in the existing SVHL reconciliation workflow. No automated HTO, goalie or calendar write paths are introduced.

## Test evidence (isolated BruTTech 1 clone)
- `python -m unittest discover -s tests -p test_svhl_team_schedule_integrity.py -v`: 12 passing tests.
- `python -m unittest discover -s tests -p test_svhl_snapshot_coverage.py`: 6 passing tests.
- `python tests/test_svhl_hto_parser.py`: passed.
- Live read-only `python scripts/svhl_hto_reconcile.py --out build/svhl-review-qa`: successful Nov 4 at 11:13 ET, corroborating league game IDs 127954 (Other Way, Nov 8), 128098 (Sugo Sundays, Nov 15), and 128129 (Dateline Predators, Nov 22).

## Remaining publication gate
A dual-source match **does not establish that an actively edited league schedule is final**. Keep issue #209 and any HTO/Family Calendar corrections in manual review until the league revision is confirmed stable. An additional temporal-stability gate is recommended before fully automatic feed promotion; this PR does not claim to implement that gate.

No HTO, SVHL, Family Calendar, completed results, player attendance or goalie assignment records were edited.
