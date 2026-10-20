# Collector-only deployment decision packet

Accepted runtime code/test commit:ae64a29212198fe8d474a3276827b67509575007. Founder accepted separate Randy/Erica AI QA/Security review policy; final deployment decision remains pending.

## Completed verification

-93/93 unit tests PASS on BRUTTECH1 isolated package.
-CI PASS https://github.com/adambrutto-maker/brave-hc/actions/runs/39492181518 (includes exact code plus workflow change).
-Randy independently reran12writer+6entrypoint tests and accepted corrected bounded collector implementation.
-Erica accepted corrected collector/feed scope under legacy-writer exclusion.
-Live HTO source observation2026-10-20T20:28:31.363424Z;four games,six goals,ten assists. Existing checks include131 complete field parity and retained unknown goalie POTG.
-Actual operational v1 JSON written in disposable sandbox,old bytes backed up/hash-verified,then rollback restored old bytes exactly.
-Live temporary output SHA620c4107743ab35eab5a58d3c59ffeafd473d47c405988cd27bffdcf0079b56f;rollback expected/restored85b0329b972b2c0ec89fbfc6f17e28d7cb44f3722560317820b00c8c151a2708.
-No active feed/collector/task/workbook/site changes made.

## Exact proposed activation

1.Pause BruTTech_HockeyOS_Workbook_Projection_Refresh and verify no old controller/collector remains; inspect actual controller lock,do not bypass it.
2.Recheck original collector SHA3a2fa340d57aa64beba027d623c147f0eb983ebab0513fc942a434282cca1ce2;hold on drift. Backup exact collector bytes,feed bytes and task configuration with verified hashes.
3.Install pinned accepted runtime package under a new versioned HockeyOS runtime folder,preserving scripts plus tests/lib parser dependency layout. Verify fetched files against pinned GitHub contents.
4.Replace only261017_Collect_HTO_Boxscore_Attendance_AUTO.py with minimal package launcher for hockeyos_hourly_collector_entrypoint --operational-root D:\BruTTech\Products\HockeyOS. Existing hourly controller invocation remains unchanged. Package wrapper derives fresh expected feed SHA each cycle.
5.Run collector alone,not the full publisher controller;validate atomic feed receipt,current source freshness,four game mapping,player/team parity,unknowns and rollback references.
6.Restore original task enabled state after successful verification;observe next scheduled collector stage separately from publisher/award success.
7.On failure inspect actual installed feed state;after replacement a nonzero exit does not guarantee old feed. Conditional rollback requires exact current and backup hashes;restore original collector/config if needed. Never overwrite newer data silently.

## Scope/limitations

Activation repairs collector/feed only. No workbook recalculation,award release,Git merge,website deployment,publisher history repair,prior blocked operation retry or force push. New completed game IDs without an authoritative workbook mapping HOLD rather than being dropped or assigned by list index. This is bounded current-season source recovery,not unrestricted future-game onboarding. Full downstream end-to-end workbook/model/publication readiness is not established by collector acceptance.

Decision:AWAITING_FOUNDER_COLLECTOR_DEPLOYMENT_APPROVAL.
