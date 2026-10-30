# ENG CHAT 61 — HockeyOS V3.6.8 Narrow Neutral & Evidence Strength

Date: October 30, 2026 UTC
Lead: Engineering; supporting Data & AI and independent QA
Previous live baseline: V3.6.7 (PR #182).
Scope: Historical/reference-based visual calibration and official GP evidence only. No workbook/HTO data changes.

## Approved policy

Team Career-Relative Dispersion D remains calculated from 30 verified historical players and 183 qualifying historical player-seasons. It is a descriptive calibration reference, NOT independently established predictive reliability. The current workbook projection remains provisional, so live forecast-derived adjustment weight stays zero.

Individual p = exact signed source projected-scoring-component / historical career scoring-rate change. Keep that authoritative workbook p untouched.

- Theta = 90 - (180 / Math.PI) * atan(p / D). 0 degrees UP, 90 RIGHT, 180 DOWN; distinct source percentages retain continuous angles.
- NEUTRAL = inclusive +/- min(D * tan(5 degrees), 0.035): at most 5 degrees away from horizontal and no wider than 3.5 percentage points.
- HOT at or above +min(0.5*D,0.20). COLD at or below the negative equivalent. No HOT/COLD boundary is farther from zero than 20 percentage points.
- COOL/WARM are the corresponding nonneutral intervals before HOT/COLD.
- Scale remains anchored at zero, never recentred to the team median. Everyone can independently qualify as HOT or COLD.
- Badge color strength follows the new band and percentage distance: strong icy blue for COLD, vivid flame-red for HOT, graduated cool/warm otherwise. Arrow angle never snaps.

At D=31.4309587%: Neutral +/-2.74985%; outer HOT/COLD +/-15.71548%.

Representative source rows:
Justin Carosi -2.5228%, NEUTRAL, 94.59 degrees.
Stephane Saindon -9.4348%, COOL, 106.71 degrees.
Mario Provenzano -20.8333%, COLD, 123.54 degrees.
Alex Pagnotta +16.9314%, HOT, 61.69 degrees.
Adam Kober +15.3509%, WARM, 63.97 degrees.

Source cohort has 15 established career rows: COLD 8, COOL 3, NEUTRAL 2, WARM 1, HOT 1. No quotas are imposed.

## Independent verified-game evidence dimension

Source: official HTO player-actuals-hourly.json, matched to the same current season, qualified team game count, unique player names, individual GP/G/A/PTS and workbook row current GP.

- 5+ verified current-season GP: MORE_OBSERVED_GAMES.
- 3–4 verified GP: DEVELOPING_SAMPLE.
- 1–2 verified GP: LIMITED_SAMPLE.
- Missing independent player GP: NO_VERIFIED_CURRENT_APPEARANCES (not inferred zero).

These are sample-size descriptions, not a probability that the projection is accurate. All published workbook forecasts remain marked provisional.

Exactly eight players share the identical -20.8333% workbook trend derived with a zero season-scoring rate. They do NOT count as eight independently corroborated model estimates. For example, Mario Provenzano has five verified GP, while Lorcan Duffy has one verified GP; their equal COLD temperature is shown with different GP evidence and shared-model explanation.

The live-qualified team dispersion procedure treats correlated shared zero-scoring outputs as one independent model signal for its dispersion median, but retains all qualified players when reporting the signed team direction. Team-wide slumps or booms are never normalized away.

## Historical review and continuous monitoring

A reproducible four-fold time-ordered historical sensitivity report is included in docs/261030_ENG61_Narrow_Neutral_Confidence_Calibration_v368.json. The fold analysis uses qualified completed seasons, not independently captured old forecast snapshots; it is not proof of forecasting success.

The source-qualified existing daily refresh rebuilds the derived model artifact when eligible source data changes, preserving original source projections, awards, records, game identities, verified Last 3/5/10 GP and player stats.

Current 5-game forecast is still provisional and not promoted to fully current by this visual release.

## Release controls and rollback

Source calibration, boundary/angle monotonicity, negative-source holds, whole-team HOT/COLD simulations, GP evidence cohorts, shared fallback checks, cross-season Last 10 regression, official source parity, canonical identities, responsive browser previews and GitHub CI are required.

Only after successful production deployment and public HTO/homepage browser readback can release be called live.

Rollback is limited to this V3.6.8 release. Previous V3.6.7 verified across-season scoring form and original workbook remain intact.
