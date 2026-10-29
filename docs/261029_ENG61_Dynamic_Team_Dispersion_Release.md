# ENG CHAT 61 — HockeyOS Dynamic Team Dispersion and Adaptive Trend

Date: October 29, 2026
Lead: Engineering (Data & AI and independent QA support)
System: Brave H.C. HockeyOS / Bio / Team Projections / Career Trends
Release candidate: V3.6.5; isolated ENG61 feature branch
Machine: BRUTTECH 1 — AdamPCDesktop
Starting published baseline: V3.6.4 / PR #178 / commit 4e7de123ac0bbe3a02b9fa6acd30f3953e4deac3.

## Iteration 1 — source audit

The authoritative percentage for an established-career player is the published projection row trend, reconciled against the published projected scoring-rate component divided by established career scoring rate minus one. Tolerance 0.000005 permits source rounding. The separately displayed full-season projected P/GP is not substituted.

The source workbook and its original five-category 5Arrows classification remain unchanged and separately auditable. The existing Advanced Analytics Season Scoring Variation measures an individual player's GP-weighted standard deviation in Winter-equivalent P/GP, NOT a team-wide percentage measure.

The current W2026/27 workbook projection is marked provisional (modelCurrent=false; projectionComplete=false). Current adaptation weight therefore remains zero, even where some official HTO current-season actuals are verified.

## Iteration 2 — historical team statistic

Source: verified native HTO historical player profiles and published season-specific duration bindings. Build module: scripts/hockeyos-dispersion-v365.cjs.

Only complete prior seasons with Brave H.C. skater GP/G/A/PTS parity and verified Winter 32-minute equivalence qualify. For a historical season to contribute: at least 5 GP, 2 previous valid seasons, 20 previous career GP, and prior career rate at least 0.20 P/GP. Previous-career averages use ONLY earlier seasons. No team playoff/regular type equivalence is inferred beyond the source's all-published-HTO-game-types scope.

Qualified 183 player-season observations from 30 independent players. Each player contributes one median absolute historical relative change to the headline Team Career-Relative Dispersion, preventing veterans from dominating.

| Source-derived statistic | Value |
| --- | ---: |
| Historical typical career-relative deviation | 31.4309587% |
| Historical median qualified season GP | 18 |
| Dynamic Neutral half-width, historical-only | 12.8205128% |
| COLD decline boundary magnitude | 28.8617886% |
| HOT rise boundary magnitude | 35.5820106% |
| Historical lower/upper dispersion safeguards | 12.9383% / 65.3194% |

The reference uses median of per-player median absolute career-relative change. Equal-player-weighted historical quantiles determine Neutral (absolute 25th percentile), Cold (negative absolute median) and Hot (positive absolute median). These are DESCRIPTIVE HISTORICAL CALIBRATIONS, not experimentally validated forecast-error thresholds.

See docs/261029_ENG61_Historical_Dispersion_Backtest_v1.json for time-ordered held-out folds (pre-2020, pre-2023, pre-2024, pre-2025), comparative fixed/historical/hybrid candidates, sample counts and source limitations.

## Iteration 3 — adaptive five-level engine

Shared UMD module widgets/hockeyos-adaptive-trend-v365.js computes:

    theta = 90 - (180 / Math.PI) * atan(exactSignedPercentage / effectiveTeamDispersion)

Physical orientation: 0 UP, 90 RIGHT, 180 DOWN. Positive is upward, negative is downward, zero horizontal, distinct percentages maintain distinct angles within a snapshot. No source workbook standard deviation affects the displayed angles, categories or colour intensity.

Dynamic five-level categories COLD / COOL / NEUTRAL / WARM / HOT use a source-qualified effective scale and historical quantile-derived multiples. Their threshold inclusivity is explicit. The source workbook category remains separately visible in expanded audit detail.

Historical baseline, current typical career deviation, player-to-player MAD, signed team median, confidence/coverage and effective dispersion are separately reported. New team panels appear in Career Trends and under an expandable homepage summary. The V3.6.4 ice/flame/slate artwork and unique gradient IDs are reused for the new dynamic badges.

Current team weighting can only activate after the original workbook projection becomes reconciled and complete, current HTO GP/season/source are consistent and fresh, and player coverage gates pass. Effective scale is bounded by historical source-derived quantiles. If the source is held, the released artifact is strictly HISTORICAL_REFERENCE_ONLY. The signed team median is NEVER subtracted from player trend percentages (no hiding of a team-wide slump).

Original source projections, HTO records, workbook formulas, protected attendance data, standings and private Game Night assignments remain untouched. Last-3/5/10 individual P/GP windows remain source-held pending a complete verified appearance log.

## Iteration 4 — independent validation

Run the historical backtest, original source calculation tests, new pure adaptive source tests, negative/duplicate/incomplete source holds, current-reconciled synthetic simulations, team-wide-slump and single-outlier tests, all-player source integrity, and real-browser geometry checks across 320, 390, 625 and 1280px.

The original sigma-aware V3.6 source implementation remains available solely as a SOURCE AUDIT contract, not as the published visual model. Existing Bio/source/records/coaching/goalie/identity and historical negative-source tests must pass before release.

Current source (provisional) visual examples under the historical reference:
- Justin Carosi: -2.5228%, NEUTRAL, 94.59 degrees.
- Stephane Saindon: -9.4348%, NEUTRAL, 106.71 degrees.
- Mario Provenzano: -20.8333%, COOL, 123.54 degrees.
- Alex Pagnotta: +16.9314%, WARM, 61.69 degrees.

These new labels intentionally differ from the old sigma-driven categories. Do not force preselected players into earlier labels. Workbook percentages are preserved exactly.

## Iteration 5 — production controls

Source-qualified artifact: widgets/hockeyos-team-dispersion-v365.json.
Calibration generator: scripts/hockeyos-dispersion-v365.cjs (--check verifies reproducibility, --write creates only derived output).
Refresh workflow: .github/workflows/hockeyos-dispersion-refresh-v365.yml.

After production release, the refresh workflow is configured to consider approved source changes and a daily verification. It commits ONLY the derived dispersion JSON on a qualified changed snapshot. It rejects stale/invalid source inputs and retains a previous qualified live artifact when subsequent input is unqualified. It cannot fabricate current-season dispersion or force the source workbook to be current.

Independent GitHub CI/source-parity/identity gates, live Pages deployment and real HTO player-profile browser checks must pass before declaring the release complete.

Rollback: revert only the V3.6.5 ENG61 merge. Preserve all immutable source/projection data.

## Known limitations

The current historical archive consists of completed-season HTO records containing all source-published game types; it is NOT a validated in-season forecast backtest. Confidence weighting has a provisional historically anchored prior equivalent and requires better historical forecast snapshots for future tuning. No qualified live team-dispersion update exists while the released projection is provisional. Last-3/5/10 appearances are incomplete and must not be manufactured. Display status must clearly say historical reference rather than live data until all gates qualify.
