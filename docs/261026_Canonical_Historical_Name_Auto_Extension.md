# HockeyOS — Future official HTO games under an accepted canonical opponent name
Date: October 26, 2026
Lead: Data & AI. Supporting Engineering, QA & Testing.

## What changes
After the original Brave H.C. Master Workbook and source-qualified HTO boxscores establish a canonical opponent identity, later **officially verified HTO games under that same exact canonical name** should extend the accepted current-season matchup record automatically. A new Sports Village punctuation or display-name proof is not required for each additional game; the league remains authoritative for fixture IDs and standings, not the opponent's preferred name.

Previously scripts/build_canonical_opponent_feed.py required Mohawks H.C. and Michelob Morts to have *exactly one* current HTO game each. A future sixth or later game against either established opponent would have stopped the Monday 9:10 public opponent publisher, even if the strengthened v3 collector had already verified its game ID, original Master Schedule date, HTO Scores/boxscore opposition and period sums, individual player and goalie parity, and current team GP/GF/GA.

## New source-bound progression
- Retain the original independent 2026 source proof for Mohawks H.C. HTO game 3356178 and Michelob Morts game 3369564. Both must remain present; failure holds publication.
- Allow additional **current Winter 2026/27** games only when the fully accepted upstream HTO collector and private ledger report the same exact canonical name. The source collector must already validate each game ID, date, original workbook calendar mapping, team result and statistical totals.
- Do not use a league name alone to join additional matches. If HTO itself changes the name to SVHL's Mohawks HC or Sugo Sundays or another novel string, stop for source review rather than inferring a new canonical alias.
- No game with a date earlier than the originally admitted 2026 proof, no repeated HTO game ID, no nonregular-season or non-HTO source event may enter the current HTO layer.
- Mohawks H.C. retains its exact immutable 49-game prior Master Workbook baseline (42 regular-season, 7 playoffs). Its all-time record becomes 49 plus the independently accepted number of HTO current-season games, with no duplicates and unchanged playoff history.
- Michelob Morts has no older historical workbook games. Its record remains limited to the number of current verified HTO games under that official name, not a fabricated all-time franchise lineage. With two or more games, the widget notice changes from singular to an accurate multi-game scope.
- Other existing exact-name opponents and Other Way source holds remain unchanged. Canonical Brave H.C. branding and SVHL standings source keys remain separate.

## Evidence and tests
- Private source tests/test_canonical_opponent_feed.py: previous nine tests plus five synthetic later-game, duplicate ID, old-game and alternate-name refusals, 14/14 PASS on BRUTTECH 1.
- Public-safe synthetic tests/test_canonical_future_hto_rollover_public.py: nine synthetic independent checks PASS without access to private HTO or original workbook files.
- The dedicated read-only canonical GitHub Actions workflow will run both public source integrity/brand tests and future-game synthetic rollover tests on relevant PR/main changes.
- All fictional test game IDs and outcomes are clearly marked synthetic and never enter public JSON, live team standings or the original workbook.
- The existing published October 26 five-game HTO history and totals are unchanged by this code-only update.

## Deployment and rollback
After merging and independently verifying GitHub Actions, back up the BRUTTECH 1 PublicPublisher/build_canonical_opponent_feed.py and copy the source-hash-verified new script. Do a no-write five-game current-source replay before claiming automatic future alias extension active.

Revert this PR and restore the backed-up operational script to recover the previous stricter one-game hold. There is no source workbook restoration step because no protected Excel or HTO official data was modified.
