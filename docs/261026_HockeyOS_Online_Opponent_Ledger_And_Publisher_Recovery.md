# HockeyOS current-season game ledger — engineering handoff (2026-10-26)

## Ownership and authority
Lead: Data & AI (game identities, historical/source reconciliation). Supporting: Engineering (Windows scheduling and GitHub publication reliability), QA (independent tests), Media (public presentation).
This change does not alter or republish player statistics, projections, awards, official game sheets or any original Excel source.

## Verified inputs
1. Immutable, original Master Workbook located at D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx, protected SHA256 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154.
2. Protected private history stage: 358 completed Master Schedule games and 81 exact opponent strings. Excludes 24 X=0 future placeholder rows.
3. Official current HTO Scores page: date, final goals, five period values, and official gameID from each Box Score and Summary anchor. Source collector uses Python standard-library HTMLParser and urllib; no browser automation dependency.
4. Independently captured official HTO Stats readback: 5 GP, 12 GF, 23 GA, confirming the five completed-game scores.
5. Prior four-game audited HTO feed: verified game IDs 3356177, 3356178, 3369564, 3375601. The October 25 fifth source-verified game 3375682 is Braves 6, Big Bastones 4.

## Actual implementation
- scripts/collect_hto_completed_scores.py dynamically reads public HTO Scores with no hardcoded future game IDs. Enforces period-final arithmetic, official link shape, exact opponent identity, unique IDs, reverse dates and the previously audited four results.
- scripts/build_private_online_opponent_ledger.py joins the Master history to current official source game IDs. It requires HTO Stats aggregate parity and explicit preservation of original workbook source hash, and never merges names by speculation.
- scripts/refresh_private_opponent_ledger.py is the private schedule entrypoint, running the collector then composite builder, recording a fail-closed success/HOLD receipt.
- tests/test_online_opponent_pipeline.py contains six tests, including deliberate source corruption, synthetic six-game coverage without a manually entered new gameID, and native HTML syntax checks. All six PASS on BRUTTECH 1.
- Combined read-only stage result: PRIVATE_PARITY_PASS_EXACT_NAMES_ONLY with 358 Master historical games + 5 HTO current-season completed games = 363 total; 84 exact names; 5 GP, 1-4-0, 12GF / 23GA. All original workbook bytes remain unchanged.
- The private files and source manifests stay off GitHub. The public Opponent Intelligence tab remains held until independent source-admission and exact-name alias review.

## BRUTTECH 1 tasks
- BruTTech_HockeyOS_Weekly_Opponent_History_Stage: Monday at 08:30, staged read-only Master Schedule; original scheduled task first result 0.
- BruTTech_HockeyOS_Weekly_Online_Opponent_Ledger: Monday at 09:05, HTO scores / Stats parity + private ledger; first scheduled-task result 0; live HTO gameID 3375682.
- Windows private operational directory: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence.
- Private status receipt: weekly_opponent_reconciliation_last_run.json (PRIVATE_SOURCE_PARITY_PASS, published=false, workbookWritten=false).
- HTO season rollover will HOLD until a reviewed new-season source contract is accepted.

## Separate legacy publisher recovery
Publisher staging repo: D:\BruTTech\Products\HockeyOS\HTO_Widget_Public_GitHub_Staging_20261016.
- Confirmed local branch diverged 44 local commits / 608 remote commits. The 44 original local commits modified only three widget JSON paths. Before recovery, all were preserved as an immutable archive branch and verified recovery Git bundle, with separate copies of these JSON files.
- Staging repo main safely restored to the exact latest origin/main SHA without any forced push or loss of the local commit archive.
- Backed up and surgically amended three existing publishing scripts to fetch and fast-forward to origin/main before generating or committing their whitelisted JSON:
  261019_Publish_Countdown_On_Schedule.py
  261016_Publish_HTO_Driven_Workbook_Projection.py
  261017_Publish_Independent_Widget.py
- Python AST parse passed for all updated scripts. Backup copies and the recovery receipt remain under D:\BruTTech\Products\HockeyOS\Implementation Control\Publisher Recovery\261026_Publication_Branch_Reconciliation.
- No automated projection success is asserted. The main collector still holds on the newly completed 3375682 game because its older pinned operational schema covers the first four games. Do not bypass that safety condition or publish stale model results until a versioned operational HTO collector update passes its full game/player parity tests.

## Remaining release gates
1. Integrate the new native HTO gameID discovery into the pinned operational player-stat collector WITHOUT discarding its separate player/goalie input completeness holds.
2. Review opponent aliases (Mohawks HC vs Mohawks H.C.; Sugo Sundays vs Michelob Morts) and historic renames with attributable source evidence.
3. Implement an independent public-only aggregate publisher based on the private ledger, with a source timestamp, eligibility gates and rollback. No private full-game history should be committed to GitHub.
4. Validate historical matches and opponent intelligence at desktop and fixed-height mobile HTO embeds.
5. Reconcile current HTO actuals with the Master Workbook projection formulas and original five trend thresholds. Until parity is independently accepted, mark projections as stale scenarios, not live calculations.
6. Verify the next hourly publisher run after the Git fast-forward preflight was applied. That preflight was a repair to repository synchronization, not proof that downstream source holds have cleared.
