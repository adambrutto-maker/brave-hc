# HTO collector restoration decision and activation runbook
Date: October 20, 2026. Scope: HTO ingestion only. **NOT DEPLOYMENT READY.**

## Concrete remaining implementation
The reviewed live chain currently ends in JSON on stdout under a candidate schema. The hourly controller calls a collector process and requires that process to replace its actual verified feed. **No operational feed writer exists in this PR.** Copying the adapter over the current collector would not restore ingestion.

Minimal remaining implementation is a small operational entrypoint that:
1. Runs the existing reviewed discovery → collection → contract adapter chain, preserving actual observation start/end timestamps and unknown POTG.
2. Validates source completeness, explicit game/workbook mapping and the consumer contract before any write.
3. Produces the intended `brave-hc-hto-verified-game-feed/v1` payload only under the separately approved activation scope; no candidate payload is silently relabelled by deployment plumbing.
4. Writes a same-directory temporary feed, validates it, then atomically replaces the destination only after every source gate passes. Errors leave the previous feed unchanged and exit nonzero. Preserve null goalie POTG and its completeness evidence.
5. Runs under the existing hourly controller's single-instance lock. Do not attempt to reacquire that same controller lock from its child process. Standalone invocation must refuse while an hourly run owns the lock; its exclusivity protocol must be reviewed and tested.
6. Replaces hardcoded four-game onboarding with an explicit admission policy: the current map is limited to four games. A fifth completed game must HOLD pending authoritative workbook mapping and revised validation coverage. It must never be dropped, assigned `359+index`, or presented as four-game completeness.

This is a material writer/activation change, not another parser presentation adjustment. Engineering must implement and reviewers must accept this exact writer before installation is considered.

## Actual runtime and packaging
Host: BRUTTECH 1 / AdamPCDesktop.

- Interpreter: `C:\Users\adamb\AppData\Local\Programs\Python\Python312\python.exe`
- Current scheduled task: `BruTTech_HockeyOS_Workbook_Projection_Refresh`
- Launcher: `D:\BruTTech\Products\HockeyOS\Run_Brave_Projection_Refresh.cmd`
- Controller: `D:\BruTTech\Products\HockeyOS\261017_Run_All_HTO_Widget_Refresh.py`
- Current collector: `D:\BruTTech\Products\HockeyOS\261017_Collect_HTO_Boxscore_Attendance_AUTO.py`
- Expected current collector SHA-256: `3a2fa340d57aa64beba027d623c147f0eb983ebab0513fc942a434282cca1ce2`
- Feed: `D:\BruTTech\Products\HockeyOS\261016_HTO_Widget_Phase0\261017_HTO_Verified_GameLevel_Skater_Attendance.json`
- Controller lock: `D:\BruTTech\Products\HockeyOS\261016_HTO_Widget_Phase0\auto_refresh_single_instance.lock`
- Controller receipt: `D:\BruTTech\Products\HockeyOS\261016_HTO_Widget_Phase0\auto_refresh_last_run.json`

Candidate executable chain:
`hockeyos_feed_adapter_review.py` → `hockeyos_discovery_review.py` → `hockeyos_collector_candidate.py` → `hockeyos_review_four_game_source_parity.py` → `tests/lib/hockeyos_hto_boxscore_header_review.py`.

Package all four scripts plus the parser helper, preserving repository-relative `scripts/` and `tests/lib/` locations, or deliberately refactor and retest the import layout. Copying only one file breaks imports. Preserve an immutable full commit/package manifest and each file hash. The final operational entrypoint is still to be implemented.

## Required evidence before activation
- Attributable technical QA and Security acceptance of the **exact writer/package commit**, its file hashes and output contract. Existing AI technical reviews cover review tools, not a writer.
- The required authenticated operational acceptance and Founder decision explicitly authorizing **collector/feed activation only**. Do not manufacture identities, signatures or approvals.
- A fresh active-collector hash match. A changed hash stops activation for reconciliation.
- Exact package source path/hash and destination path; interpreter and import smoke check in an isolated directory.
- Restorable immutable backups of the current collector/package and current feed, with full paths, SHA-256 values and rollback receipt. A backup reference without verified content is insufficient.
- Scheduled task disabled/stopped, no running controller/collector, and actual lock-free evidence. An empty lock file alone does not prove that the lock is free.
- Fresh live source validation against the exact package and independently inspected proposed feed.

No new authenticated acceptance, backup, lock-state evidence or activation authority is asserted by this document.

## Exact controlled activation sequence
1. Finish the operational writer and tests for atomic failure preservation, fifth-game HOLD, missing/null POTG, destination collision and import/runtime packaging.
2. Obtain the acceptances and bounded Founder activation decision above.
3. Record the task configuration and enabled state; disable its triggers and stop/wait for the active run to finish. Confirm no controller/collector owns the lock or destination.
4. Verify the current collector hash; snapshot and hash the collector/package and current feed into the approved rollback location.
5. Install the accepted package in a separate versioned runtime directory. Validate imports using the production interpreter. Do not reset or alter publishing Git history.
6. Run the entrypoint with an isolated review output first. Confirm all official games, explicit mappings, per-player totals, sourceReadback and unknown completeness. Independently inspect the emitted contract.
7. Switch only the controller collector entrypoint to the accepted operational writer under the reviewed change. Run one controlled collector stage while automatic triggers remain disabled.
8. Verify the actual feed file hash/content changed as expected and retained schema, sourceReadback, allGamesDiscovered truth, unknown values and full game coverage. The collector must exit 0 only after successful verified replacement.
9. Restore the prior trigger state and observe a subsequent scheduled ingestion stage. Review both the Windows result and per-stage receipt. Existing publisher divergence may still leave the entire task degraded; report ingestion and publication separately.
10. Admit no workbook writes, award rankings, main-branch publication or website changes under this collector-only decision.

## Rollback
Keep automatic triggers disabled while changing files. Restore the exact backed-up collector/controller/package configuration and feed only after confirming no run owns the lock; verify restored hashes and imports. Restore the original trigger state. Record the failed package, reason and rollback readback. Rollback returns to the known old collector state, which may still have the original schema failure; it does not certify source ingestion as repaired.

## Decision requested when package is complete
Approve the exact reviewed operational writer/package for collector/feed activation on BRUTTECH 1, including the bounded admission policy and verified rollback refs. Until that package exists and the listed evidence is present, status is **WRITER_IMPLEMENTATION_REQUIRED / ACTIVATION_NOT_AUTHORIZED**.
