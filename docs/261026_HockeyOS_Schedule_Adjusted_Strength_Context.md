# HockeyOS — Schedule-adjusted opponent strength context
Date: October 26, 2026
Lead department: Data & AI. Supporting Engineering, Media, QA & Testing.

## Objective
Complement the new all-division League Intelligence network with a reproducible **descriptive** comparison of each current SVHL Sunday team: form from verified games, opponents actually faced, and last winter's record *only* where official player-ID roster continuity is independently qualified. Keep all Brave H.C. historical head-to-head records in a separate evidence panel. Do not invent betting lines, win probabilities, game results, or a predictive power ranking.

## Source and release boundary
- Input is only the existing source-qualified public League Intelligence dataset (27 published teams, 26 competitive-team entries, 49 reciprocal nonzero-score completed games, 19 roster-qualified previous-winter matches, 2 documented Cristillo membership changes).
- The league's 2026/27 Braves HC row still reflects **four games (0–4)**; separately accepted HTO has **five**. The schedule-adjusted comparison is explicitly scoped to the former, source-timestamped SVHL ledger and does **not** silently mix the more recent HTO result.
- Every game in the context index has previously matched official SVHL TeamInfo source IDs/opponent names, dates, home/visitor, final score and the league's W/L/T/GF/GA. Unverified 0–0 placeholders are excluded.
- A new scoring index does not override official standings; users can sort by it or official WIN% separately.

## Transparent formula, published in JSON
*Current form (0–100):* 70% smoothed WIN% plus 30% smoothed goal difference. WIN% uses (W+0.5T+2)/(GP+4), equivalent to four neutral pseudogames; goal difference is 0.5+clip[(GF−GA)/(GP+4), −4,+4]/8. Both are bounded 0–1 and scaled to 0–100.

*Schedule difficulty (0–100):* For each **actual game** against an opponent, remove that direct matchup from the opponent's published W/L/T/GP. Compute the opponent's remaining smoothed points percentage using four neutral pseudogames, then average across all games faced. Removing the direct result prevents rating opponents tougher just because they beat the profiled team, or easier just because they lost to it. This captures observed competition, not an estimated opponent skill constant.

*Previous winter form (0–100):* Same form formula on the **official 2025/26 final season record**, only when official returning player IDs establish a >=3 shared-player, >=25% smaller-roster link. This is supporting context and never added to current games. 7 of 34 previous-winter team game details were incomplete, so their official season aggregates remain the source.

*Composite index:* With qualified previous winter: 55% current form + 30% schedule difficulty + 15% prior winter form. Without qualified prior: 70% current form + 30% schedule difficulty. Four neutral pseudogames mitigate but cannot eliminate small-sample instability. No current GP means no computed index, not a fabricated 50. Competitive teams only are ranked; playoff placeholder division entries are shown without competitive ranks.

This score is a **descriptive schedule-adjusted context index**. These chosen weights are transparent editorial heuristics, NOT statistically calibrated or validated prediction coefficients. Do not label index/100 as a probability of a Brave H.C. win, odds, definitive team strength, or future playoff finish. 1–4 games get EARLY_SAMPLE; 5–9 LIMITED_SAMPLE; 10+ LARGER_SAMPLE. Even the largest label is not a validation claim.

## Initial October 26 2026 source snapshot — early sample only
- Maplewolves: **37.2/100** composite, current form 28.7, schedule context 44.6, qualified 2025/26 form 53.4. All from four SVHL-recorded losses (9 GF /17 GA), against Primary Auto, Butcher Brothers, Mighty Drunks and Young Guns. Previous winter 11–10–3 stays separate. Brave H.C. prior record versus Maplewolves 3–6–1 over 10 games is visible but **excluded from the index**.
- Brave H.C.: **36.5/100**, current form 26.4, schedule context 46.1, prior winter 54.0, based on league's still-four-game 0–4 state. Must not replace the separately verified HTO five-game source.
- Initial 26 competitive teams are ranked descriptively, all current 2–4 GP; one playoff placeholder entry is explicitly not ranked.

## Implementation
- scripts/model_svhl_schedule_strength.py: immutable-in/immutable-out calculations, per-game leave-one-out opponent strength, neutral priors, season gating, scores/weight proof and exclusive competitive ranks. Appends strengthModel and strengthContext fields only.
- scripts/publish_svhl_league_intelligence.py: after source collection and dated movement-history enrichment, compute fresh context for every verified current-season team before final public source validation. Preserve existing clean GitHub main, no-force-push, whitelisted JSON, SHA/versioned private source snapshots and no workbook/HTO/league writes.
- scripts/check_svhl_league_intelligence.py: recomputes the index from actual league result rows, rejects tampered rank, components, weights, composite scores and false predictive labels.
- widgets/league-intelligence.json: public source-compatible context values, model method and uncertainty qualification.
- widgets/league-intelligence.html/js: two sort modes (official standings versus descriptive schedule context), two clearly labelled comparison columns, component breakdown on team profile, confidence/sample caveat and explicit separation from Brave H.C. head-to-head history.
- tests/test_svhl_schedule_adjusted_context.py: 10 positive/corrupt-source tests, including direct-result leave-one-out independence, historical H2H exclusion, absence of unqualified previous winter, clamped goal outliers, zero-game teams, unique source IDs, exact public recomputation and 26 competitive ranks. Existing desktop and phone Chromium tests extended to check player/team context and no clipping.
- .github/workflows/brave-league-intelligence.yml runs immutable source checks and the additional mathematical regression on PR/main.

## Safety and rollback
The Master Workbook SHA256 remains 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154. Do not edit it, source HTO/SVHL, official W/L/T or Hot Stove editorial. When GitHub CI passes, back up the daily BRUTTECH 1 runtime scripts, verify current source no-write recomputation against the accepted published snapshot, run the existing 10:15 task once, check the GitHub Pages and actual HTO widget navigation. Revert the scoped PR and restore backed-up Python runtime if source review fails.
