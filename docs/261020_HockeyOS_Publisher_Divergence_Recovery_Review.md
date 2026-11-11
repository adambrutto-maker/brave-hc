# HockeyOS hourly HTO publisher — divergence recovery (review only)

Date: 2026-10-20. Engineering lead. Tracking: [#12](https://github.com/adambrutto-maker/brave-hc/issues/12). **No production fix has been deployed.**

## Why the existing hourly task is degraded

The HTO collector and four-game HTO box-score reconciliation succeed. Separate scheduled stages for `countdown` and `projections` attempt Git commits and `git push origin HEAD:main` from a local `main` publishing worktree whose history has diverged from GitHub's current `main`. Both pushes fail as non-fast-forwards, and the dependent Hot Stove stages do not finish. A previously audited comparison counted **7 local-only and 264 remote-only commits**. A temporary nonpublishing `git merge-tree` preview found no text conflicts, but never validated data freshness, the model or deployability.

Original local publisher SHA: `5753979f1547094fbe229f643af5c0b0360bbc6a`.
GitHub `main` SHA observed: `43dcf0f86dcf30ef02952d93998ad92c2c021a5f`.
Common base: `8065e1d906d231c57e8d15da2c17fe77d384d844`.

**Do not force push, reset or rebase the active publisher.** Keep its seven unpublished commits. A merge-tree test has no authority to activate a production merge.

## Three generated-file decisions (read-only source comparison)

| Candidate | Locally staged | Hosted `main` | Review determination |
|---|---|---|---|
| `widgets/countdown.json` | Generated 2026-10-20 04:31:13 UTC, HTO schedule; SHA256 `fb6930ef489c476797da9a06739faa31566b91d75edab466f85dd4c9a7810ba1` | Generated 2026-10-19 04:12:47 UTC | All **five upcoming games and source fields appear identical**; only generation metadata differs. Suppress timestamp-only commits. |
| `widgets/projection.json` | HTO observed 2026-10-20 04:31:00 UTC; SHA256 `7dc06bcb8a800fd8c49d978134b3d394c384c5fdd7c87bd227328daef6147f9d` | HTO observed 2026-10-19 03:55:10 UTC | Four HTO games and four SVHL games align locally, versus published SVHL 3 games. **Do not promote as a final scoring model**: locally still `modelCurrent=false` and `publicationStatus=HTO_MODEL_RECONCILIATION_PENDING`. |
| `widgets/standings.json` | Captured from SVHL 2026-10-20 00:31:20 UTC; SHA256 `26e01977ab946bfdf2764023d816337d13ad0b15a24297c9cbf8aa6606192f5f`; Braves GP 4 | SVHL Braves GP 3 | Potential meaningful league update, but an older independent provider snapshot. Require new attributable league readback and provider parity before publication. |

The current website consumers read `./countdown.json`, `./projection.json` and `./standings.json`, respectively. The current HTML interfaces and player-link regression tests passed on this review branch; this does not independently QA the unpublished JSON updates.

## What the review branch adds

`scripts/hockeyos_publisher_review_preflight.js` is a *pure planner*, with no Git, filesystem, network, HTO, Excel or scheduler action. It:

1. Holds on **diverged ancestry** even where local and remote changed-file paths do not overlap.
2. Holds if a clean local publisher would require a fast-forward or has unreviewed local commits.
3. Normalizes the countdown payload while excluding only `generatedAt`. If the game schedule and source context are unchanged, no timestamp-only commit is needed.
4. Holds model/provider updates with missing independent readback provenance, stale (>90-minute default policy) source evidence, invalid clock values, or incomplete output status.
5. Labels a verified changed file **REVIEW_CANDIDATE_ONLY**. This label never activates a write or Git push.

Unit checks: `node --test tests/test_hockeyos_publisher_review_preflight.js tests/test_hockeyos_publisher_widget_contracts.js tests/test_player_links.js`. **26 local tests passed**. CI is configured to execute on PR.

The review branch intentionally **does not include replacement versions of the three JSON files**. Countdown needs no material update; projection is marked pending by its source; standings needs new independent SVHL readback. This avoids promoting unverified data to a site whose `main` is also advancing.

## What would make the hourly refresh healthy

After attributable independent Engineering/QA review and Founder approval:

- Preserve old local commits in an explicit archival ref or immutable manifest.
- Generate an approved new publishing workspace based on current remote `main` rather than resetting old history.
- Make the publisher write through one serialized, clean, reviewed flow. On remote branch movement or non-fast-forward, stop with `PUBLISH_HOLD_DIVERGED_HISTORY`; do not force/retry a stale branch.
- Publish material JSON changes only when their source timestamp, player/game/league parity, schema and model status meet release requirements. Keep HTO collector success and published-widget success separate in the hourly task receipt.
- Validate website pages and rollback plan. Recheck main SHA before final publication; a dry-run cannot reserve it.
- Keep the Master Workbook and Awards OVR normalization deployment entirely separately blocked under [issue #10](https://github.com/adambrutto-maker/brave-hc/issues/10) and [issue #9](https://github.com/adambrutto-maker/brave-hc/issues/9).

**Current gate:** REVIEW ONLY, NOT MERGED, NOT DEPLOYED, NO EXCEL WRITE, NO AUTOMATED SOURCE/WEBSITE ACTIONS.

## 2026-10-20 01:31 EDT — false green hourly task diagnosed

An additional scheduled run at **2026-10-20T05:31Z** reported all eight stages PASS and Windows Task exit 0. Its controller receipt identifies `COUNTDOWN_SCHEDULE_UNCHANGED ageHours 1.0` and `HTO_MODEL_NO_CHANGE hourAge 1.0`. Both publish stages **skipped any Git push**; the active local Git head was still `5753979f1547094fbe229f643af5c0b0360bbc6a` and GitHub main `43dcf0f86dcf30ef02952d93998ad92c2c021a5f`. A green scheduler return is **not a repaired publisher or evidence of a fresh website release**.

To make this explicit, `scripts/hockeyos_publisher_task_health.js` now evaluates:
- Source read + game reconciliation outcomes independently of website publisher state.
- Real local/remote Git head and previously reviewed ancestry relationship.
- Whether countdown/projection **published** or merely returned **LOCAL NO CHANGE**.
- Task outcome vs remote head alignment, never inferring hosted-publication receipt from an exit-0 status.

Actual private read-only health check: `PUBLISHER_HISTORY_DIVERGED_NOT_REPAIRED`, HTO and four-game reconciliation PASS, countdown and projection local no-change, website publication **unverified**; receipt filename `261020_HockeyOS_Task_Health_Actual_Receipt_v1.json` in the durable recovery review directory.

Seven additional tests guard the false-green case. Current PR suite: **33 Node tests + 5 Python tests PASS**, and [GitHub CI run 39376497576](https://github.com/adambrutto-maker/brave-hc/actions/runs/39376497576) PASS. The actual fresh-main candidate has also passed **54 Python site tests and 11 Node player-link tests** in an isolated environment. No live scheduler/writer modification occurred.

## 2026-10-20 07:31 EDT — reusable read-only publisher monitor

The scheduled Windows refresh still reported eight stages PASS / task exit **0** at **07:31 EDT**, with countdown `COUNTDOWN_SCHEDULE_UNCHANGED ageHours 7` and projection `HTO_MODEL_NO_CHANGE hourAge 7`. Its publisher branch continued unchanged at `5753979f1547094fbe229f643af5c0b0360bbc6a`, while GitHub main remained `43dcf0f86dcf30ef02952d93998ad92c2c021a5f`.

To make repeated green-but-diverged reports inspectable without changing the Windows task, added an **opt-in read-only CLI** `scripts/hockeyos_publisher_shadow_health.js`. It requires the exact reviewed local/remote SHAs, a separately provided task exit code, the saved controller receipt and a private destination outside the old publisher checkout. It uses **only read-only Git commands** and fails closed on mismatched SHAs, unexpected origin, a dirty worktree or an existing receipt. It does not fetch or contact HTO, commit, merge, reset, push, update task settings, or touch the original Master Workbook.

The 07:31 source receipt was actually checked in private with result **`PUBLISHER_HISTORY_DIVERGED_NOT_REPAIRED`**, while confirming successful HTO ingest/game reconciliation and task exit 0. Private receipt: `261020_HockeyOS_0731_Shadow_Publisher_Health_v1.json`, located in the durable `261020_HTO_Publisher_Recovery_Review` directory on BRUTTECH 1.

Expanded regression: **41 Node tests + 5 Python tests PASS** locally, including the source-feed green-but-diverged scenario, SHA drift, and no-write protection. The CLI currently runs **only on explicit review invocation**; it is **not integrated into the hourly scheduled task**, so this is a diagnostic control rather than a permanently active alert. Independent review and Founder activation remain outstanding.

## 2026-10-20 07:40 EDT — full publisher dependency chain audit and migration patch planner

A read-only scan of the BRUTTECH 1 HockeyOS refresh scripts identified **11 runtime-reachable Python files** which refer directly to the original publisher checkout instead of accepting a configurable publish destination. Switching only the Windows task command or the Git checkout is **insufficient**: producers and downstream Hot Stove readers would still consult the OLD divergent checkout.

| Stage | Script | Target role |
|---|---|---|
| Projection | `261016_Publish_HTO_Driven_Workbook_Projection.py` | Git publisher |
| Projection | `261016_Projection_HTO_Model_Bridge.py` | JSON output writer |
| Countdown | `261019_Publish_Countdown_On_Schedule.py` | Git publisher |
| Countdown | `261019_Export_HTO_NextGame_Countdown.py` | JSON output writer |
| Standings / Watch | `261017_Publish_Independent_Widget.py` | Git publisher |
| Standings | `261016_Export_SVHL_Standings_Widget.py` | Direct absolute JSON output path |
| Watch | `261017_Export_Watch_Workbook_Verified.py` | JSON output writer |
| Hot Stove | `261019_Build_Hot_Stove_Drafts.py` | Countdown reader |
| Hot Stove | `261019_HotStove_Roster_Context_Draft_Build.py` | Projection reader |
| Hot Stove | `261019_HotStove_Player_Matchup_Form.py` | Transitive projection reader |
| Hot Stove | `261019_HotStove_Verified_Milestones.py` | Transitive watch reader |

Separate static files also reference the old path, but are **not automatically proven to be part of the currently scheduled eight-stage controller**; their reachability and migration scope require deliberate review rather than global text replacement.

Prepared review-only tool `scripts/hockeyos_publisher_prepare_path_patches.py`. It verifies this exact eleven-file set, checks known path shapes, compiles proposed replacements, and is designed to produce **inert `.review.patch` files with SHA-256 provenance** rather than executing or installing migrated scripts. The proposed output path uses mandatory `HOCKEYOS_PUBLISH_REPO` (no silent fallback to the old publisher). Original Git commit/push actions are NOT removed or independently approved by this path-only proposal; any future authorized script activation needs a separate serialized publisher gate.

**Synthetic regression: 6/6 tests PASS.** Actual patch generation against BRUTTECH 1's files was **blocked by a safety check** and has not been retried or bypassed. Therefore **there is no independently verified eleven-file real-source patch package**, and the migration is NOT ready for execution or deployment. The current Windows scheduler, source files, original workbook, GitHub main and live website remain unchanged.

Next review gates: authorized source-patch generation through permitted access, attributable independent Security/QA validation of the complete dependency closure, and a separate Founder-approved clean-main task cutover with post-release source+website checks.

## 2026-10-20 07:40 EDT — source-shaped migration tests strengthened

The path-migration planner's initial six tests used nearly identical simplified `ROOT` fixtures even though the actual controller chain has four distinct reference types. Its test cases were updated to model all **11 previously audited runtime dependencies**, including `ROOT/`, `root/`, `BASE/`, and the direct absolute `Path(r"...")` standings destination. Additional negative tests reject a second unexpected old checkout reference or other source drift before writing any review artifact.

**9/9 migration tests PASS** against these *synthetic, source-shaped fixtures*; the refreshed [GitHub Actions run 39418364863](https://github.com/adambrutto-maker/brave-hc/actions/runs/39418364863) passed. This closes a weakness in QA specificity, **not the real-source acceptance gate**.

An attempt to generate the eleven inert migration patches from the actual BRUTTECH 1 source scripts was previously safety-blocked. No retry, alternative code path or unapproved write has been used. Therefore real-source patch compatibility is **still unverified**; a reviewer must inspect the approved actual scripts before any candidate migration, task change or live publisher deployment.

**Reviewer action still missing:** request an attributable GitHub review from an independently controlled, suitably authorized reviewer of PR #13. No reviewer decision is currently recorded; CI and our self-authored tests are not independent acceptance.
