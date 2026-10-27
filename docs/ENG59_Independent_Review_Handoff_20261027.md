# ENG CHAT 59 | Independent reviewer gate and release candidate
Date: 2026-10-27 · HockeyOS · HOS-IP-03 / HOS-IP-09 · **Source-scoped and non-production**

**Review target:** Draft [PR #128](https://github.com/adambrutto-maker/brave-hc/pull/128), branch `feat/hockeyos-eng59-game-reconciliation-division-intel-261027`. Do not merge or deploy on this checklist alone. Follow existing BruTTech governance and human independent review and release approvals.

## Reproducible acceptance evidence

Run `python -B scripts/check_eng59_release_evidence.py` in the isolated source checkout, then `python -B -m unittest discover -s tests -p test_eng59_release_evidence.py -v` and the existing all-division league intelligence CI. The source-only preflight verifies the actual checked-in source bytes and exact case counts; intentionally forged source revisions, GameInfo IDs, video ratings, franchise continuity and score/player admission must cause a failure. It returns `DEVELOPER_SOURCE_PARITY_VERIFIED_INDEPENDENT_ACCEPTANCE_PENDING`, **not** permission to publish or an independently accepted review.

**Accepted scope before this PR:** 54 official source-matched adult Sunday 2026/27 league-570 games, 19 observed current-division bridge games. 79 original independently source-matched Brave H.C. older-season games across 35 opponent/season groups. 2,206 completed historical GameInfo game sheets, 2,069 full-score parity sheets; 137 source holds remain (39 roster/scorer identity; 86 raw goal rows below published final; 12 above). 43 separate HTO-vs-official historical H2H matchup claims remain held; they are **not** part of the 137 scoring sheet exceptions.

**New source-only capabilities in the PR:** Per-game official ID/date/score/source SHA bridge for current and accepted historic matchups; mobile accessible official GameInfo links; self-contained roster-era descriptive context and Division Fit Lab research; source-owner review packet generators; optional read-only video readiness showing `INSUFFICIENT_VIDEO`. The underlying accepted context index and original official scoring are unchanged. Other workflows own LiveBarn/Studio/Broadcast V3/V5.1, player-award art and historical profile assets.

## Reviewer sign-off questions (all require independent answers)
1. Does every newly linked GameInfo ID refer to the same official league/date, **both source-side teams and scores**, page hash, and historical era, with no accidental cross-league (VAHL) or current franchise inference?
2. Does the UI preserve the original admitted league/roster/H2H model when the optional historical-ID or video-strength source is unavailable? Are sources and held player events identified clearly on desktop and mobile?
3. Are all original 137 scoring holds and 43 historical H2H holds still visible and **excluded** from corrected player stats, win/loss, official awards and division-strength updates? No held scorer registration is allowed from a name match.
4. Are artifacts that depend on private review packets truly omitted from the Git tree and GitHub Pages publish surface? Only source-qualified public match metadata may be in widgets. Original member/HTO private source, media and credentials must never be copied to the branch.
5. Is the opinionated division layout lab **research only**? Verify no live league realignment, predicted matchup score, unapproved probability or camera-event strength is represented as fact.
6. Is the independent reviewer satisfied with source hashes, portability, test isolation, accessibility, PR diff and rollback? Record reviewer, date, scope, remaining blockers and explicit merge/deploy approval **outside** the developer-run test evidence.

## Mandatory unresolved evidence before any corrections

- **17** season/team/scorer registration decisions covering 39 GameInfo roster hold sheets and 52 unadmitted goal events.
- **14** year/reason review bundles for 98 raw scoring-table vs published-goal discrepancies: 84 source pages with no goal table rows, 2 partial-below cases, 12 excess-row cases.
- **17** historical source-owner matchup identity bundles covering 43 HTO/master-vs-official date/opponent claims. A bounded 14-day investigation found 5 held-date references to 3 distinct source games: 2 IDs are *already admitted* in the 79 matches, and one new source lead (league 547, GameInfo #122910, 2026-03-08, historical Schmelts). The March 15 and both March 22, 2026 original master scores and documentary identity remain unavailable from the previously captured private date-hold receipt. **No automatic correction or game admission permitted.**
- Video strength: await source-rights clearance, verified observed playing minutes and opportunity denominators, independent actual-event acceptance, period/camera mapping, opponent tier and held-out cross-division calibration. Until then display `INSUFFICIENT_VIDEO` and do not alter existing strength scores.

All 48 source-owner **bundles** are case groupings, not a claim of 48 independent score fixes or proportion of engineering tasks completed.

**Candidate release status:** developer-tested and CI guarded, **independent QA PENDING**, source owner corrections PENDING, **PR draft/unmerged**, no production approval. Reviewer should specifically distinguish the source-only scouting UI's potential release from later scoring correction and Video Intelligence calibration gates rather than blocking every feature on unrelated evidence.
