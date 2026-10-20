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
