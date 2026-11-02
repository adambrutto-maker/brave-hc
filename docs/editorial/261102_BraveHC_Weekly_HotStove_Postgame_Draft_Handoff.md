# Brave H.C. Hot Stove — weekly postgame draft automation (implementation handoff)

**Date:** November 2, 2026  
**Lead:** Media Department (HockeyOS); support: Engineering and QA  
**Authorized execution:** BRUTTECH 1 / GitHub Actions  
**Status:** Source-gated draft pipeline tested; production publication is NOT part of this change.

## Scope and existing homepage

The official Brave H.C. HTO homepage already embeds the production Media & Hot Stove widget:
- https://adambrutto-maker.github.io/brave-hc/widgets/media-hot-stove.html?embed=1
- The widget already exposes **Latest Recap / Next Game / Archive** and draws the headline/recap from the approved Hot Stove feed.
- The November 8 Other Way preview is already published in its Next Game view.
- This implementation deliberately does **not** modify media-hot-stove.html, media-hot-stove.js, media-hot-stove.json, player highlights, LiveBarn media, native HTO homepage modules or the original workbook. Another conversation owns highlight integration.

## What was implemented

1. **Repair HTO Scores parsing:** scripts/collect_hto_completed_scores.py now accepts both exact official scoreboard headers:
   - Regulation-only: REGULAR SEASON / 1 / 2 / 3 / F.
   - Overtime-capable: REGULAR SEASON / 1 / 2 / 3 / OT / 2OT / F.
   - Both team rows must exactly match the same declared header width, with all period values summing to final totals. Unknown formats fail closed.
2. **New source-gated draft:** scripts/editorial/prepare_hot_stove_postgame.py:
   - Read official HTO completed Scores, the archived approved recap feed, the schedule feed, and a matched official HTO boxscore.
   - Reconcile every previously approved game by exact game ID, date, opponent and score before admitting a new one.
   - Validate goal-event count, opponent identity, clock/period/strength, skater goal/assist totals and Player of the Game credit against the official scorer and player tables.
   - Require a completed, dated game. If the upcoming countdown has already advanced, use exact official HTO completed-score identity, require the following local Ontario date, reject schedule identity conflicts, and omit unverified rink/home-away detail.
   - Write a readable, **unapproved** source-facts draft Markdown, a JSON evidence pack with stable fingerprint, and a status receipt into an explicitly specified directory outside the repository.
3. **Monday read-only schedule:** .github/workflows/brave-hot-stove-postgame-draft.yml:
   - Monday 17:00 UTC (12:00 EST / 13:00 EDT), plus manual workflow_dispatch.
   - Install parser dependencies, run all independent offline editorial regressions, then check the live public HTO sources.
   - Upload a GitHub Actions review artifact for 14 days. The artifact contains only public official HTO statistics and editorial placeholders; it is **not** a confidential storage system.
   - Job token has contents:read only; no commits, no PR creation, no automatic article publication, and no native HTO/editor/workbook writes.
4. **Synthetic regression:** scripts/editorial/test_hot_stove_postgame.py validates source headers, score sums, approved-article parity, postgame timing, schedule rollover fallback, ambiguous/incorrect identities, skater arithmetic, assists and draft holds.

## Real-world validation on BRUTTECH 1

- Original collector on November 2 initially returned **HELD: GAME_SCORE_TABLE_COLUMNS_CHANGED** because one official October 25 scorecard uses regulation-only columns while other games use OT-capable columns.
- Patched collector successfully read **6/6 official completed 2026–27 games** and identified latest completed ID **3375683**, Mid Ice Crisis, November 1 (Braves 2, opponent 7).
- The true November 8 Other Way game ID **3375684** was correctly classified as **WAITING_OFFICIAL_FINAL** (no game outcome invented).
- Retrospective end-to-end replay against live November 1 HTO Scores and HTO game 3375683, using a fictionalized earlier public editorial/schedule snapshot isolated in temp storage, generated:
  - 20261101_HTO_3375683_HotStove_DRAFT.md
  - 20261101_HTO_3375683_HotStove_EVIDENCE.json
  - status.json with DRAFT_READY_FOR_HUMAN_REVIEW and SHA-256 evidence fingerprint a0b512316dac29d28557deca60e85295002f80c3665310893b3a97cfe166c18a.
- The same replay repeated successfully after intentionally advancing the countdown past game 3375683. The evidence fingerprint remained identical.
- **29/29 Python unit and negative-source tests PASSED**, combining the original official scoring-event parity tests (10) and the new postgame/schedule/fallback tests (19).
- All source work was performed on the connected BRUTTECH 1 in temporary folders, not the large dirty portfolio Git worktree. No changes to HTO, GitHub Pages production feeds or highlights were made.

## Operating procedure and status meaning

At or after the scheduled Monday run, review **GitHub > adambrutto-maker/brave-hc > Actions > Brave H.C. Hot Stove postgame editorial draft**. Select the run and download its review artifact.

- **DRAFT_READY_FOR_HUMAN_REVIEW:** Open the Markdown + evidence JSON; write and fact-check a proper sports news article, add verified contextual information, obtain explicit Founder editorial approval, and publish through a separate controlled PR.
- **WAITING_OFFICIAL_FINAL:** HTO has not published a qualifying new completed game. No article is fabricated; a user can manually run the workflow later if posting is delayed.
- **WAITING_POSTGAME_CONFIRMATION:** The source game may exist but the time/date verification gate has not passed.
- **HELD_SOURCE_OR_GOVERNANCE:** A scoring, source-identity or approval discrepancy exists. The workflow should remain failed/held; investigate the named exact source reason rather than substitute estimates.

The content of any artifact is draft evidence, **not an HTO official article, not a ready-to-publish human editorial decision, and not a source for unverified video commentary**.

## Release and rollback boundaries

The program modifies a Scores reader, adds two editorial scripts and a read-only GitHub Actions workflow. The production Hot Stove article, six season recaps, homepage module, lineup, Media/highlight data and original workbook remain untouched.

If the scheduled workflow fails unexpectedly, disable only the Hot Stove postgame workflow or revert the implementation commit. Existing articles continue to serve normally. Source defects do not authorize changing HTO or published stats.

## Acceptance criteria

- The pipeline runs from source without credentials, writes and publishing rights; fails closed when sources change.
- A completed official game generates an evidence-backed draft; an upcoming game produces only a wait receipt.
- Countdown rollover does not lose a valid completed game, and conflicting identities still block.
- All 29 editorial and HTO parser unit tests pass on the release branch and in the workflow environment.
- The workflow exposes a manual rerun and retains review artifacts but does not create/publicly publish articles.
- Highlights remain fully isolated in their own implementation chat.
