# HockeyOS — Embedded Homepage Projection Source Gate

**Prepared:** November 7, 2026, America/Toronto
**Workstream:** Engineering candidate / P1 issue #192
**Owner:** ENG CHAT 63 (unchanged)
**Independent acceptance:** QA CHAT 27 (still required)
**Release decision:** REVIEW CANDIDATE — NOT DEPLOYED

## Observed source deficiency

The current published `widgets/projection.json` at the inspected baseline labels itself `HTO_MODEL_CURRENT` and sets `modelCurrent:true` and `projectionComplete:true`, with `modelParity.replayedRows:21` and `mismatches:0`. However, the same model declares only **1 recorded workbook game** against **6 official HTO boxscore games** (`sourceInputs.workbookRecordedTeamGP` versus `verifiedHTOBoxscoreGP` and `htoRecordedTeamGP`). It reports **183 projected roster points**.

Those flags and the zero row mismatch counter do not by themselves justify an *embedded public current-season forecast*. Issue #192 independently documents the earlier 181-PTS variant of this release problem. Do not replace authentic source statistics or invent a reconciliation merely to clear the warning.

## Changes delivered in the isolated review branch

1. Added `widgets/home-embedded-projection-gate.js`: deterministic, read-only decision module. It requires the expected source schema; a nonempty valid player/model record; model current+complete and accepted publication state; positive replay rows and zero mismatches; integer, equal workbook/current HTO game coverage; and HTO source readback at most 10 days old with no future timestamp.
2. `widgets/home-premium.js` calls the gate **only in the embedded homepage Projections view**. A held result sets `FORECAST HELD`, explains the hold, and suppresses projected totals, individual forecast table, legend and dispersion. The existing full-page `?full=1` analysis is deliberately unchanged.
3. `widgets/home-panels.html` loads the gate before the existing projection renderer.
4. `widgets/home-premium.css` adds explicit fail-closed selectors so separately loaded companion display scripts cannot reveal held numbers.
5. Two dedicated tests cover the policy and the real browser presentation. The source workbook, official HTO statistics, HTO CMS, original native Bio, Game Centre and November 8 published tentative lineup are not modified.

## Reproducible validation

**Static and pure policy:** JavaScript syntax checks and `git diff --check` passed. `node --test tests/test_home_embedded_projection_source_gate.cjs tests/test_player_performance_normalization.cjs`: **26 / 26 passed**, including 9 source-gate tests and 17 pre-existing normalization tests.

**Real browser:** `node tests/test_home_embedded_forecast_browser.cjs`: **11 / 11 passed**, including five widths (320, 358, 390, 625, 1280 px); current mismatched feed; stale model; parity failure; missing gate script; successful reconciled-feed control; standalone full-page unaffected; and a projection-source HTTP 503 condition.

**Private evidence location:** `D:\BruTTech\Products\HockeyOS\261107_Embedded_Projection_SourceGate_FINAL_QA.log`.

## Remaining independent release gates

- ENG63 selects and reviews this safeguard or its existing QA27-provided equivalent; do not deploy two competing implementations.
- QA27 independently verifies exact candidate SHA, browser behaviour, source parity, five widths, unavailable source and an HTO-shell preview; developer tests do not replace independent acceptance.
- The authorized model publisher separately resolves 1-versus-6 workbook/HTO game coverage and player-level scoring differences, without editing official HTO or original workbook source.
- The final Box 3 design and any modification of the native HTO homepage module `mod34539` still require the established manager release process and rollback plan. This PR does not perform any such change.
- The 10-day readback-expiry threshold should be confirmed by the Engineering owner and QA before public activation.

## Backout

The work is confined to a new feature branch/worktree. No active production files are changed. To reject this candidate, close the PR and delete only the isolated worktree after preserving this handoff. If later merged, revert the exact merge commit; do not alter historical HTO or original workbook data.

**Result:** Measurable engineering candidate delivered; no claim of a production P1 closure or authorization to publish unsupported statistics.
