# HockeyOS Current Player Actuals — Separate Live Source From Held Forecast
**October 26, 2026 — Data & AI lead; Engineering / QA support.**

## Objective
The public Projections widget must not misrepresent a saved four-game workbook projection snapshot as current five-game player performance. Retain all projected G/A/PTS, projected P/G and original career-relative five-band arrows from the workbook model, while replacing only the parenthetical actual GP/G/A/PTS values with source-verified current official HTO totals.

## Source and current acceptance
- Current public HTO skater table: 20 named players, official five-game season totals.
- Current HTO team record: 5 GP, 12 GF, 23 GA. Player goals 12, assists 19, player points 31.
- Official completed-score cards independently match the 5 GP / 12 GF / 23 GA totals.
- Justin Carosi current official 5 GP, 4 G, 1 A, 5 PTS. Michael Provenzano currently 2 G, 3 A, 5 PTS.
- Saved workbook projection.json remains a scenario based on four games' HTO inputs, backed by an older unreconciled workbook snapshot. It has not been recalculated or replaced.

## Implemented files
- scripts/export_hto_verified_player_actuals.py accepts only fresh, exact HTO stats source, unique player names, G+A=PTS, sum-of-players = team rows, plus HTO Scores aggregate parity. Emits widgets/player-actuals.json with status VERIFIED_HTO_CURRENT.
- widgets/player-actuals.json contains only published player GP/G/A/PTS and public source context. It contains no passwords, private workbook data or player contact details.
- widgets/home-premium.js checks the schema, current season, freshness, player identity uniqueness, team GP and arithmetic validity before using this current feed. It overlays latest values in the existing parenthetical (actual) cells; projected rows/ranks/rates/arrows remain untouched.
- When a roster name does not occur in the current HTO table, the widget shows (—), not stale estimated 0. If the current HTO feed is unavailable/stale, it explicitly warns users rather than calling old actuals live.
- The current HTO team GP is displayed separately from the model input coverage. The model reconciliation hold remains visible.
- scripts/publish_hto_player_actuals.py independently publishes only the whitelisted player-actuals JSON from a clean fetched/fast-forwarded GitHub staging main branch; no other file is permitted to change.
- tests/test_hto_player_actuals.py: six source tests including deliberate score/identity corruption, stale readback, and duplicate players. All six passed on BRUTTECH 1.
- Existing homepage/browser QA passes: all 22 projection model rows, correct first player actual parentheticals, full iframe scrolling, thick original-threshold arrows.

## Scheduled publication rule
Once the approved GitHub source is deployed, schedule the independent public actuals publisher for Monday 09:20 Toronto local, after 08:31 hourly readback, 08:30 protected historical refresh and 09:05 private online ledger reconciliation. Use a timezone-free wall-clock StartBoundary in Task Scheduler to avoid DST drift. Run a manual verified publication check and record task result before claiming weekly publication is active.

## Controls
- The public feed must not alter the private Master Workbook, original trend threshold limits, award scoring or hockey editorial.
- The current-source readback may be newer than published SVHL division standings; do not use it to overwrite league rankings.
- Do not use HTO stat names to infer undocumented player IDs or roster attendance where no official row exists.
- The publisher must fail closed rather than force push if source data changes unexpectedly or GitHub has divergent commits.
- Rollback via the associated GitHub commit; operational script backups retained on BRUTTECH 1.
