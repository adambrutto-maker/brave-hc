# HockeyOS Player Bio V3.1 — standalone, Bio-only release candidate

**Date:** October 29, 2026 · Engineering Department / Brave H.C.
**State:** DRAFT / NOT LIVE / NO AUTOMATIC RELEASE
**Baseline:** latest `main` on branch creation, retaining the previously authorized production Bio #155.
**Source references:** clean integrated source PR #169 (itself descended from #163); UX prototype PR #168. This is a narrower Bio-only candidate, NOT an approval or deployment.

## Release separation
The combined integration PR #169 inherits separately pending *Game Night* lineup/poll/Excel print files from #163, with independent data and approval requirements. This standalone branch **does not include**:
- `widgets/game-night-lineup-contract.js`, `widgets/game-night-lineup-public.json`, `widgets/game-night-approved-render.json`;
- `widgets/countdown-lineup-review.html` and JS, poll bindings, or new game-specific assignment assets;
- private media, named private attendance workbook records, original Master Workbook or any modified awards and record ledgers.

The public Bio view preserves the original source-gated coaching context. The manager-approved Game Night assignment card remains hidden, with its source adapter absent and no Game Night fetching. This branch does not change `widgets/countdown.json`, `widgets/projection.json`, HTO raw player source feeds or official records.

## Presentation
1. **Season Outlook:** HTO current skater GP/G/A/PTS/P/GP from dated feed; historical career scoring reference with *Summer + Winter → current-season-equivalent* note; existing workbook-sourced full regular-season forecast (only display GP rounded); original continuous-angle standard-deviation comparison arrow.
2. **Career Trends:** source-earned historical G/A bars, Winter- and Summer-equivalent comparison lines, rolling past-only career benchmark, awarded goal/points season medals, expanded advanced rates and qualified skater/goalie rank badges.
3. **Coaching:** public general 1–2–2 and role guidance, original animated rink board with puck and player markers, six publisher-owned tactical/skills pages as outbound links only. No video auto-playing, broken YouTube iframes or verified private game clips.

## Model/privacy constraints
- Exactly 109 HTO player identities; absent current statistics/goalie models source-held, not presented as zero.
- Current source `widgets/player-actuals-hourly.json` remains separate from historical `player-career-insights.json`. The model `widgets/projection.json` is unchanged and currently provisional.
- Only verified 18 season-duration historical mappings for normalized comparisons; raw HTO seasons stay raw.
- FT attendance opportunity is actual team contested games; CU and DI opportunity equals that player's GP. Career attendance = sum GP / sum eligible games; independently tested against the original private workbook. **No named derived attendance scores** published: `widgets/player-bio-attendance-verified-v31.json` is an empty HELD stub. Display source-held until separate source authorization.
- Rank only verified HTO career skaters with >=25 GP and goalies with >=8 GP, per-metric numerator requirements, separately sourced and labeled. No official record or award ranking changed.
- Keep projection model and all private Game Night roles/lineups/assignments separate.

## Independent release acceptance
- Retain the original source QA suites and add V3.1-specific 109-player and mobile/desktop/negative-case tests.
- Run GitHub-hosted CI on exact branch head and source-only local tests before visual go/no-go.
- Founder must approve *live production release separately*; no inference of approval from an instruction to continue.
- After approval and normal merge, verify GitHub Pages deployment and the actual native HTO Bio iframe on skater, goalie, historical non-model, and captain/dual-role profiles.
- Roll back to last independently accepted release #155 / `248be3d001c104b28842451696bbe4385b0b104e` if production or HTO acceptance fails.

**No public HTO edit, third-party correspondence, or production merge is authorized by this draft.**
