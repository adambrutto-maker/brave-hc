# HTO collector activation and rollback runbook
October 20, 2026. Scope: collector/feed only. **Operational writer implemented in review branch; active deployment requires Founder's final approval.**

## Implemented operational entrypoint
`scripts/hockeyos_operational_collector.py` now runs the reviewed live discovery → source collection → adapter chain. Its default/check-only mode fetches and verifies source data without writing. Explicit write mode revalidates the complete adapter evidence, creates a verified exclusive backup, flushes/fsyncs a same-directory temporary file, replaces the bound destination atomically, and verifies byte/JSON readback. The operational entrypoint emits `brave-hc-hto-verified-game-feed/v1` only after live source checks, preserving null POTG, incomplete-field evidence and actual observation-start `sourceReadback`.

Temporary-file/replace failure before commit leaves the old feed intact. A post-replacement verification failure is a HOLD requiring inspection and hash-guarded rollback, not a guarantee that no replacement occurred. No source validation or write confers authority to publish awards.

## Runtime package and exact output binding
Host: BRUTTECH 1 / AdamPCDesktop.

- Interpreter: `C:\Users\adamb\AppData\Local\Programs\Python\Python312\python.exe`
- Task: `BruTTech_HockeyOS_Workbook_Projection_Refresh`
- Launcher: `D:\BruTTech\Products\HockeyOS\Run_Brave_Projection_Refresh.cmd`
- Controller: `D:\BruTTech\Products\HockeyOS\261017_Run_All_HTO_Widget_Refresh.py`
- Old collector: `D:\BruTTech\Products\HockeyOS\261017_Collect_HTO_Boxscore_Attendance_AUTO.py`
- Old collector expected SHA-256: `3a2fa340d57aa64beba027d623c147f0eb983ebab0513fc942a434282cca1ce2`
- Operational root: `D:\BruTTech\Products\HockeyOS`
- Only allowed relative feed target: `261016_HTO_Widget_Phase0/261017_HTO_Verified_GameLevel_Skater_Attendance.json`
- Controller lock: `261016_HTO_Widget_Phase0/auto_refresh_single_instance.lock`
- Dedicated new-writer lock: feed basename plus `.collector-lock.json` in the same directory. It is separate from the controller lock.

Runtime chain:
`hockeyos_operational_collector.py` → `hockeyos_feed_adapter_review.py` → `hockeyos_discovery_review.py` → `hockeyos_collector_candidate.py` → `hockeyos_review_four_game_source_parity.py` → `tests/lib/hockeyos_hto_boxscore_header_review.py`.

Preserve repository-relative `scripts/` and `tests/lib/` layout. Package and hash all six files at the accepted commit. Copying the entrypoint alone breaks imports.

Write and rollback require explicit operational root and exact feed binding. Paths traversing symlinks/junctions are refused. Backups, temporary files and the dedicated lock remain in the feed directory. Existing backup names are never overwritten.

## Concurrency limitation
The dedicated lock coordinates only new writers using that lock. Expected-hash comparison followed by `os.replace` is not an atomic compare-and-swap against a legacy writer ignoring it. Deployment must disable task triggers, establish no running controller/collector, and obtain actual controller-lock-free evidence before manual write/rollback. File existence alone is not proof of lock state.

Do not reacquire the parent controller's byte lock inside its collector child. Future scheduled invocation may use the new dedicated output lock under the existing controller single-instance lock. Until the controller switch is reviewed, standalone production writes require the exclusion procedure above.

## Acceptance and final decision
Founder has explicitly chosen Randy/Erica separate AI QA/Security reviews as the technical acceptance mechanism, retaining the final deployment decision. No separate external GitHub employee credential is required by this runbook.

Before final deployment approval, present:
- Randy and Erica technical dispositions for the exact operational writer/package commit, tests and output contract.
- Exact package paths/file hashes and fresh active-collector hash readback.
- Fresh check-only output plus isolated temporary-root write/backup/rollback receipts under the production interpreter.
- Verified backup refs for current collector/controller/package/feed and their SHA-256 values.
- Current task configuration, disabled-trigger plan and actual no-running-process/lock-free evidence.
- The exact bounded collector-only switch and rollback action.

This document does not record final deployment approval or claim any active task, collector, workbook or website was changed.

## Bounded admission policy
Current validated map is four games (HTO 3356177/3356178/3369564/3375601 → workbook 359/360/361/362). A fifth completed game is a deliberate HOLD until authoritative mapping is admitted and bounded parity coverage updated. Never drop the fifth game, assign `359+index`, or silently publish four-game completeness after five official games.

## Check-only and isolated rehearsal
From an isolated checkout of the accepted package:
```
python scripts/hockeyos_operational_collector.py --check-only
```

For an isolated writable test root, create its `261016_HTO_Widget_Phase0` directory first. Supply its absolute root and exact target:
```
python scripts/hockeyos_operational_collector.py --write-feed --operational-root <ABSOLUTE_TEST_ROOT> --output-path <ABSOLUTE_TEST_ROOT>/261016_HTO_Widget_Phase0/261017_HTO_Verified_GameLevel_Skater_Attendance.json --expected-absent
```

For replacement, use `--expected-current-sha <OBSERVED_SHA256>` rather than `--expected-absent`. Do not substitute the production root during rehearsal.

## Controlled activation after final Founder approval
1. Record current task configuration/enabled state and accepted commit/package hashes. Disable triggers; allow active run to finish or stop it under the approved procedure.
2. Confirm no controller/collector is running and controller lock is actually free. Verify the old collector hash above.
3. Snapshot/hash current collector/controller/package and actual feed to the approved rollback location.
4. Install the accepted package into a separate versioned runtime directory and validate imports using the production interpreter.
5. Repeat check-only live validation. Inspect four-game coverage, mappings, complete-only parity, sourceReadback and unknowns.
6. Switch only the controller's collector entrypoint to the operational entrypoint, supplying `--write-feed`, explicit root/target and a wrapper that observes the prior feed hash immediately before invocation. Do not bake a permanently stale expected hash into the hourly command.
7. Run one controlled collector stage with triggers disabled. Verify returned receipt, actual feed hash/schema/content and unchanged workbook/publisher.
8. Restore prior triggers and observe a subsequent scheduled ingestion stage. Inspect per-stage controller receipt; publisher divergence may still degrade the overall job. Report ingestion and publication separately.

No original workbook writes, awards, Git main publication or website release is included.

## Rollback
Keep triggers disabled and confirm no run owns the destination. `rollback_feed` requires the exact current output SHA, backup path and verified backup SHA under the same explicit root binding. It restores atomically only after those checks; changed current content or changed backup causes HOLD. Restore backed-up controller/package configuration and verify hashes/imports before restoring triggers. Rollback to the old collector may restore its known parsing failure; it is not proof ingestion is repaired.

Status: **OPERATIONAL_WRITER_IMPLEMENTED / TECHNICAL_REVIEW_AND_FINAL_DEPLOYMENT_DECISION_REQUIRED**.
