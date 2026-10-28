# Brave H.C. — Earned career milestone badge wall

Date: October 27, 2026 (Toronto), release developed on BRUTTECH 1
Scope: player Highlights widget layout only. User asked for a video-game-style earned badge collection for milestones.

## Implementation

- A dedicated **Career Badges Unlocked** achievement collection precedes the existing complete chronological history. Historic awards, All-Star recognition, championships, captaincy and discipline continue to use their previously approved artwork and original timeline.
- Every source-certified `milestone` item in `widgets/player-highlights-ledger.json` becomes one collectible tile: authentic lion emblem, "UNLOCKED", source-accurate Game/Point/Win Club threshold, documented achievement date and metallic tier. No tiles are generated from projections, unofficial game totals or guesses.
- Bronze 50, Silver 100, Gold 200, Platinum 300 and all higher verified thresholds, with no extra tiers. Tier surfaces have discreet matching metallic top-rim and plaque treatments, not generic white icon squares.
- Gallery sorts higher tier / threshold first, then recorded achievement date. Games, Points and Wins filters display verified counts and preserve keyboard focus as the gallery changes. The All filter restores the complete badge collection. Category filters with no earned badges do not display.
- Supports 2 columns at phone size, 3 in normal embedded widget widths, 4 on wide desktop; artwork retains its native transparency. The gallery is hidden for players with zero officially published milestones.
- The complete chronological achievement timeline remains accessible below, preserving audit detail and original history (including multiline composite achievements).
- New entries are recognized by existing verified-source refresh every three minutes while the widget is open; a newly published exact, dated future milestone such as a verified 1,250 Game Club gets the already-supported platinum emblem.
- No generated "locked" awards, no progress percentages inferred from scoring feeds, no source ledger mutation. Future official milestones require the existing source-admission policy.

## Acceptance

- 109 player identity / historical Highlights and record book Node source tests preserved. 97 of 97 verified milestone entries appear exactly once in the **new** earned gallery; source chronology still contains all 306 historical records.
- Edge browser acceptance across 43 milestone-bearing or historical-Highlights profiles, 86 mobile (355px) and desktop (810px) sessions: gallery visible only for earned achievements, filters correctly show category subsets, all icons present, no horizontal overflow.
- The prior transparent artwork, Andrew Cristillo black patch, Rolaids Relief, neutral whistle suspension, original record labels and hour-based source refresh remain unchanged.
- Browser CI added under `.github/workflows/player-highlights-integrity.yml`.
- Visual proofs in `docs/261028_Milestone_Wall_354054_355.png`, `docs/261028_Milestone_Wall_354054_810.png`, and `docs/261028_Milestone_Wall_354060_810.png`.

Release gates: CI must pass, PR reviewed and merged, GitHub Pages deploy success, production widget checked at 355/810 with original HTO embeds intact.
