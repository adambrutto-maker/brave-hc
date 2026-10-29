# HockeyOS Bio + Homepage V3.6.4 — Standard Trend Badges and Source-Gated Scoring Form

**Date:** October 29, 2026  
**Scope:** Brave H.C. Player Intelligence Bio, homepage Team Projections and read-only Career Trends analytics.

## User-approved changes

1. Season Outlook order: **Current Season → Projected Current Season → Career Average → Projected Finish vs Established Career**. Career model calculation and comparison values are unchanged.
2. The headline trend word now matches the colour and angle of the existing V3.6 individualized badge rather than exposing the workbook’s five-arrow category as the headline. Example: Stéphane Saindon’s -9.4% source row is workbook **Neutral** but displayed **COOL** with its source-derived icy-blue downward angle. Expand Forecast assumptions to see the original workbook category.
3. Standard HockeyOS visual scale on **both Bio and homepage**: **FROZEN, COLD, COOL, NEUTRAL, WARM, HOT, BLAZING**. Home Team Projections replaces its old fixed inline arrows with the exact shared V3.6 SVG/ice/flame badge renderer. Per-player angles remain continuous, with unique gradient IDs for each SVG; no new projection model.
4. Career Trends gains five P/GP context cards: **Career**, **Current Season**, **Last 3 Games**, **Last 5 Games**, **Last 10 Games**, with shared visual icons when supported.

## Seven-word display mapping

Let `z = published trend ÷ published workbook sample standard deviation`. This is a **display-only strength scale**; the workbook retains all five original thresholds and the original sample standard deviation.

| Label | Presentation-only rule |
| --- | --- |
| FROZEN | z < -2 |
| COLD | -2 ≤ z < -1 |
| COOL | Negative, outside the ±5 percentage-point visual tolerance, not already colder |
| NEUTRAL | Within ±5% of established career average (inclusive) |
| WARM | Positive and outside +5% visual tolerance, z < +0.5 |
| HOT | +0.5 ≤ z < +1 |
| BLAZING | z ≥ +1 |

For exact-zero and small nonzero trends within ±5%, the arrow remains exactly personalized: its numeric angle is not forced horizontal, but the badge and panel become white/slate without ice or flames. Original five-category workbook state is separately exposed in model details. No `projection.json` changes.

## Career Trends sourcing and limits

- Career reference: source-verified published workbook `careerScoringRate` on Winter-equivalent basis.
- Current Season: independently sourced, player-identity-reconciled HTO season-to-date individual PTS/GP. This is **actual**, not the workbook projected finish.
- Last 3 / 5 / 10 are **held** unless a complete, individually verified player-by-game appearance feed exists, including verified zero-point games and exact reconciled GP/G/A/PTS season totals.
- A scorer absent from an event sheet may have dressed without scoring. Incomplete scoring event logs **must not be treated as full appearance logs**. The existing `svhl-player-game-*.json` audit is expressly partial and cannot supply these rates.
- Source contract `player-form-appearances-v364.json` is deliberately held pending a new official appearance reconciliation. A future verified feed with the defined schema and strict source matching may unlock real rolling windows. No importer or automated updater is claimed by this release.
- Recent-window badges, if unlocked, are descriptive P/GP comparisons versus the published Winter-equivalent career pace. They do not claim the workbook’s projection category or certify lineup strength.

## Acceptance evidence

- Pure source/model tests: five-arrow thresholds, exact sigma, seven-word scale mapping, individual angles and ±5% neutrality.
- Real-browser QA at 320, 390, 625 and 1280px: Bio ordering, Career Trends cards, homepage 22-player table, seven legend badges, Stephan(e) COOL vs original workbook Neutral, Alex BLAZING, no horizontal overflow, no missing-source fabrication.
- Source integrity: individual appearances and zero-point records required; game IDs unique; official proof URLs; no season-total mismatch; insufficient N returns held.
- Existing Bio regression, independent awards/regression sources, coaching and goalie holds must remain intact.

## Rollback and separation

Revert the V3.6.4 release only. Retain V3.6.3 tolerance, V3.6.2 panel tones, V3.6.1 order-independent styling, original source data, HTO editor, protected attendance, game-night functions and all other HockeyOS workstreams.
