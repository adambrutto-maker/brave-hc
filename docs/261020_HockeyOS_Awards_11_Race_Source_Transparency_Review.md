# HockeyOS Awards Centre — 11-race source transparency (review only)

Date: 2026-10-20
Owner: Engineering / HockeyOS
PR: https://github.com/adambrutto-maker/brave-hc/pull/8
State: REVIEW-BRANCH PRESENTATION ENHANCEMENT, CURRENT OFFICIAL OVR HELD

## Purpose

A one-game cached `AwardScoring` model versus four source-verified HTO games
must prevent publishing official 2026/27 rankings and OVR. The prior UI
showed a generic pending message with a separate unranked attendance watch.
This improvement provides **exact, award-specific explanation** of the
source evidence available and the unresolved formula/release dependencies.

## Provenance

A previously saved BRUTTECH 1 read-only source audit,
`261019_HockeyOS_AllAwards_Source_Readiness_v1.json`, was verified:

- Source audit SHA256 `85f63735bde883b146079463661d71bd963a8b1810a2a57b57485b5083f822ee`.
- Original Master Workbook authority SHA256
  `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.
- Audit as-of `2026-10-19`, HTO verified four games,
  saved `AwardScoring` cache one game.
- Exactly 11 award-specific source field contracts, all state
  `INPUT_PARTIAL_SCORE_HELD`, with no verified current award output.

A **redacted, non-score** presentation contract now exists as
`widgets/awards-source-readiness.json` on PR #8. It contains only the
source-audited award ID, original eligible/rank/score field names, identified
source inputs, remaining formula dependencies, and explicit release holds.
It is not a current award-scoring or signing/approval record.

## Current UI behavior

For each award selected under **This season**, when official results are held:

1. Keep official shortlist empty rather than show stale historical results.
2. Show `Why this award is pending · source evidence and formula gaps`
   as an expandable, clearly dated review.
3. Distinguish available observations from required recalculation, and
   display the exact source `Eligible`, `Rank`, `Score` field names.
4. State HTO game count and saved award-model game count with a note that the
   audit is **not live** and **not a released award result**.
5. Preserve the independent, verified HTO Art Ross / Rocket statistical
   counts and the existing unranked Rookie/other participation watches.
6. Never upgrade a saved historical score, raw HTO count, or date-stale
   source readiness to `OFFICIAL_WORKBOOK_FINAL`.

The details are suppressed when the workbook authority SHA, season, audit
date, team GP, cached model GP, award list, score kind or release-HOLD status
does not match. This source-readiness data cannot unlock final OVR. A future
independently authorized model release uses the separately defined
operational-publication proof and current `AwardScoring` parity.

## Current-source distinctions

- Hart: role-specific weights, history and normalizers still need replay.
- Conn Smythe: latest four verified games are regular season, not current
  playoff data.
- Art Ross / Rocket Richard: current raw HTO points/goals can be shown
  separately as **STAT**, but original eligibility/tie rank keys are held.
- Norris: listed HTO defence option is not verified original eligibility.
- Lady Byng: PIM-free appearances are input, not original discipline
  normalization.
- Rookie: five first-FT-year candidates appear on an unranked watch;
  Jamie Rosenberg's saved current GP and recent-season calculation is stale.
- Most Improved: original career comparator baseline still missing.
- Rolaids: 11 skater/10 goalie source components with incomplete current
  replay; five saved historical raw composites do not prove current OVR.
- Dedication: true attendance denominators and career roster-rate/
  playoff/tenure comparisons are unverified.
- HOF: original HOF logic belongs primarily to `PlayerInfo`, not a
  simple equivalent of weekly `AwardScoring`.

## QA and release boundary

- 48/48 local Node regression tests PASS at PR code head
  `739c2c0ac2bb1daeef2b53baed05fd30794cba5d`.
- Added end-to-end DOM rendering tests for all 11 source explanations,
  source status/date integrity and absence of an explanation when source
  evidence is missing.
- Original Master Workbook, live publisher, live website, original HTO
  settings and pilot Google Form were **not** modified.
- Real operational Excel replay, independently attributable QA acceptance,
  Founder release decision and any public website deployment remain separate,
  unfulfilled gates. Do not merge merely on green tests.

Next release-critical work: source-faithful operational workbook table
expansion and recalculation against all four HTO games on a permitted
separate copy, original 11-award formula and rank parity, then independent
review. Prior safety-blocked original-source inspection or migration
operations must not be circumvented.

**Outcome: all 11 award-source explanations available for review; 0/11
official current-season model scores independently released.**

## Browser and CI verification added later on October 20

A separate, local, disposable review checkout on BRUTTECH 1 was served to
headless Chromium via a loopback-only HTTP server. This was **not the
public website**, and it did not connect to the original Master Workbook.

| Browser check | Mobile 390px | Desktop 1280px |
|---|---:|---:|
| All 11 held-award source explanation panels | 11/11 | 11/11 |
| Art Ross HTO raw points watch | 5 players | 5 players |
| Rocket Richard HTO raw goals watch | 4 players | 4 players |
| Historical Rolaids OVR example accessible | PASS | PASS |
| Horizontal page overflow | 0px | 0px |
| Browser script errors | 0 | 0 |

No official 2026/27 award scores were shown in the held mode. The
source-specific explanation is evidence dated October 19, **not a live HTO
readback**.

The PR's `.github/workflows/awards-cards-qa.yml` now includes
`widgets/awards-source-readiness.json`,
`widgets/awards-operational-publication.json` and
`scripts/hockeyos_awards_*.js` in its review-triggered path list. A
future change to the release-blocking data or its audit code must trigger
the regression suite. This is a CI check, **not authenticated independent
review or Founder publication approval**.
