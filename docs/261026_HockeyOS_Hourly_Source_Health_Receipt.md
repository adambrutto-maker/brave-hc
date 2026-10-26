# HockeyOS — Hourly Independent Source-Health Receipt
**Date:** October 26, 2026
**Lead department:** Engineering. Supporting Data & AI and QA & Testing.

## Objective
Provide an independent, read-only confirmation after each hourly Brave H.C. HTO/Workbook workflow run. A controller can fail silently or stale source data can remain visible; a separate health process must read the finished receipt and protected sources rather than trusting process exit code alone.

## Validated current production
- Source collector runtime: dynamic-source-crosscheck-v3-261026.
- Hourly controller: BruTTech_HockeyOS_Workbook_Projection_Refresh, around minute 31 every hour.
- First new health-check task: BruTTech_HockeyOS_Hourly_QA_Health_Receipt, every hour around minute 39.
- Operational checker copy: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\hockeyos_hourly_source_health.py.
- Private status output: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\hourly_source_health_latest.json.
- First task execution October 26 around 11:08 a.m. Eastern: task exit code 0, private receipt PASS, all eight controller stages PASS, five HTO games, 12 G and 19 A. Runtime source hashes and original workbook SHA verified.

## Read-only acceptance
- Controller must contain exactly the eight required stage names with outcome PASS, allStagesSuccessful=true, and a timezone-aware completion timestamp at most 100 minutes old.
- The HTO operational feed must have its verified schema and complete source status, unique valid completed game IDs, the first five audited 2026–27 game IDs, team GP equal to admitted games, and per-game scorer/goalie totals consistent with season data.
- Source timestamps must be current within 100 minutes. A stopped computer, failed scheduled task, unknown source, wrong game count or stale observation produces HOLD.
- The canonical Master Workbook original SHA256 remains pinned to 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154, and every active versioned collector source file must match its source hash manifest.
- The active collector launcher must refer to the source-crosschecked v3 runtime, not a legacy fixed five-game collector.
- Output is written atomically to one private receipt, with status PASS or HOLD and a bounded reason. **No email, chat notification, GitHub commit, original workbook write or native HTO website action is initiated.**

## Implementation and QA
- Source: scripts/hockeyos_hourly_source_health.py.
- Pure offline regression: tests/test_hockeyos_hourly_source_health.py; seven tests pass, including accepted synthetic six-game count, missing stage, failed controller stage, too-old observation, changed HTO game identity and goalie score mismatch.
- Windows scheduled task uses Python 3.12 on BRUTTECH 1 and repeats hourly. Run when available and ignore concurrent copies. The checker has a four-minute execution limit.
- First source validation and first Task Scheduler run both returned PASS with no writes to website. A future HOLD can be found in the private receipt and Task Scheduler exit code 2; it is not an automatic alert to the founder.

## Outstanding work and boundary
- First actual completed November 1, 2026 game (Master game 364) must be independently observed and admitted. Synthetic sixth-game data must never enter the live public model.
- Provisional 181-point five-game scoring forecast remains HTO_MODEL_RECONCILIATION_PENDING due to two original roster entries not in current HTO.
- Historical aliases for Mohawks HC and Sugo Sundays remain under review.
- Public HTO homepage has a duplicate native module to remove; the connected browser tab displays an Admin Log In link and cannot confirm authenticated native-editor access. Existing widget visibility/scrolling improvements do not remove that native HTO module.
- Health task uses an hourly Windows repetition trigger. Check local-time alignment after the November DST change, and adjust only the health trigger if its execution is no longer after the primary minute-31 job.
