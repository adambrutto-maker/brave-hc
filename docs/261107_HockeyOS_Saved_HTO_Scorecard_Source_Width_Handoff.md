# HockeyOS saved HTO scoreboard width — source-shape evidence and safe publisher Git hygiene

**Prepared:** November 7, 2026 (Eastern)
**Lead:** Engineering / HockeyOS source publisher
**Status:** Independent, review-only candidate. No operational collector change, scoring release or game-sheet update.

## Authoritative saved source evidence

The November 8, 2026 03:31 UTC read-only HTO capture contains six completed regular-season scoreboard cards. Five have the **seven-column** header \`REGULAR SEASON | 1 | 2 | 3 | OT | 2OT | F\`. One has the **five-column** regulation-only header \`REGULAR SEASON | 1 | 2 | 3 | F\`. Both are official HTO display formats.

The six cards' team finals reconcile exactly to the **separate HTO Stats team-total table**: six completed games, **14 goals for and 30 against**. Observed layouts: one five-column card and five seven-column cards. Table indexes in the saved scores page are 2–7. Original saved readback SHA-256: \`b09a40bbca43cc688ab6341f6ee8676755e805a58e9cf7dd89530d117d056ff6\`.

These observations verify *scoreboard card layout and team score arithmetic*, **not** official individual game IDs, scorecard-to-boxscore joins, roster identities, goal/assist authoring, penalty events, goalie appearances, or the Master Workbook's award formulas.

## Running publisher incident and isolation

The operational source collector's latest hourly receipt reports \`GAME_SCORE_TABLE_COLUMNS_CHANGED\`. Read-only source inspection found that the pinned active parser checks \`len(rows[0]) == 7\` and requires every team row to have seven columns. Its collector source SHA-256 at diagnosis is \`fb290ee70cc3b50fd6be1e3f01cd3225a621fa5e4fe342e682c1e5c5952b3070\`.

This PR **does not patch, rerun or replace that collector**. It offers a separate, portable, offline evidence command, \`scripts/audit_saved_hto_scorecard_widths.py\`, and its synthetic negative-test matrix. The owner may review the source-width acceptance contract when independently preparing a formally approved, source-faithful collector change.

Example:

\`\`\`sh
python -B scripts/audit_saved_hto_scorecard_widths.py \
  --readback "/path/to/authorized/saved-hto-readback.json" \
  --strict
\`\`\`

The tool requires a read-only saved source, correct official HTO team URLs, capture timestamps, exact 5- or 7-column permitted headers, one Brave H.C. and one opponent row per game, integer nonnegative period scores, periods summing to final scores, and parity with separate official team GP/GF/GA totals. It emits summary JSON only; no page downloads, workbook writes or publisher updates.

**Important unresolved gate:** the saved scorecards do not independently prove official game-ID mapping. The result explicitly sets \`gameIdentityMapping=NOT_VERIFIED_BY_SAVED_SCORECARD_TABLES\` and \`releaseAuthorized=false\`. Collector change authorization must require an attributable game ID/source URL join and individual boxscore/roster parity before any scheduled ingestion update. Do not infer game identity from table order alone.

## Durable Git hygiene follow-up

Separately, the live hourly controller reports that several public widgets were held because its local Git repository was not clean. HOME BRUTTECH 1 inspection confirmed one untracked generated Python bytecode file under \`scripts/__pycache__/\` and no tracked source changes.

A narrow, reversible, **local-only** \`.git/info/exclude\` entry restored clean working-tree status. A controlled \`git merge --ff-only\` then synchronized the local \`main\` to the existing, already-live Game 365 tentative lineup commit, with the published PDF and PNG SHA-256 verified unchanged. The local fix has private pre/post receipts and rollback anchors. It did **not** push commits, regenerate statistics, call HTO admin or trigger the publisher.

This PR adds the narrow **portable** \`.gitignore\` rule \`/scripts/__pycache__/\` so other clones and future Python imports do not recreate that Git-state fault. A negative test proves that ordinary source files under \`widgets/\` and \`scripts/\` remain visible to Git. The rule is not a blanket ignore of reports, models or unrelated files.

## QA and release boundaries

- Source readback: six scorecards, exactly one five-column and five seven-column layouts, 6 GP / 14 GF / 30 GA.
- 22 synthetic unit tests pass, including unsupported widths, malformed rows, sum mismatch, forged team identity, wrong host, duplicate team statistics, stale/future readback, path-independent CLI, missing source, strict hold and byte immutability.
- Dedicated CI runs the source-only suite and Git ignore guard without contacting HTO.
- The original Master Workbook, public model data, HTO CMS, operational collector and scheduled tasks remain unmodified by this PR.
- The user-approved **tentative Game 365 lineup is preserved**; its unconfirmed goalie is not promoted to a booking.

### Next decisions for the canonical owner

1. Verify source-proven official per-game IDs and boxscore joins for every current HTO game.
2. Independently assess the active parser's five- versus seven-column policy with pinned saved-source fixtures, then review the formal collector patch under its established safety and authorization controls.
3. Revalidate full skater/goalie and source workbook parity before considering award scoring or current numerical forecasts.
4. Confirm the next normal scheduled publisher run after the local Git hygiene repair; the controller may still be held by the collector's independent scoreboard schema gate.

**Disposition:** SOURCE SHAPE VERIFIED / ACTIVE COLLECTOR SCHEMA HOLD / PER-GAME AND AWARDS RELEASE HOLD.

## Follow-up: six-game link/date replay and shared two-format period contract

The original November 4 private Engineering work already had a source-verified six-game HTO-to-Master Workbook date join and **55/55 independent source-admission tests passed**. The exact proof at HOME BRUTTECH 1 is SHA-256 `f5752015612956ae36d594e5f72d72090cea574aa44560c7e0084c0b77300dbf`. This work reuses that existing evidence; it does not claim to have recreated or reapproved the original boxscore audit.

The November 8 03:31 UTC saved Scores page includes **six official boxscore links** and six scorecards. A new offline evidence helper, `scripts/audit_saved_hto_sixgame_identity_join.py`, checks their entire one-to-one set against the previously verified private source proof, original Master Workbook game dates and names, source page fingerprints, final scores, chronology and opponent details. It requires the **exact pinned source SHA values** and fails on altered source files, missing/duplicate/reordered links, mismatched game IDs, forged dates, incorrect source URL or inconsistent source status.

| HTO game ID | Master # | Original game date | Opponent | GF–GA | HTO scorecard format |
|---|---:|---|---|---:|---|
| 3356177 | 359 | 2026-09-20 | Dateline Predators | 0–3 | 7 columns |
| 3356178 | 360 | 2026-09-27 | Mohawks H.C. | 3–6 | 7 columns |
| 3369564 | 361 | 2026-10-04 | Michelob Morts | 2–3 | 7 columns |
| 3375601 | 362 | 2026-10-18 | Zamboner Crew | 1–7 | 7 columns |
| 3375682 | 363 | 2026-10-25 | Big Bastones | 6–4 | **5 columns** |
| 3375683 | 364 | 2026-11-01 | Mid Ice Crisis | 2–7 | 7 columns |

A new `scripts/hockeyos_scorecard_period_contract.py` provides a **pure, source-agnostic normalization candidate** for both the Scores page and the separate boxscore verification code path. The only permitted headers are `REGULAR SEASON / 1 / 2 / 3 / F` and `REGULAR SEASON / 1 / 2 / 3 / OT / 2OT / F`. Regulation periods must match exactly between two source tables, official team/opponent/final totals must match, and mixed compact/extended layouts may agree only if omitted overtime periods are zero. Unknown headers, invalid score units and period conflicts are always held.

### Added QA and execution evidence

- 22/22 original saved-source width and portable Git hygiene tests passed.
- **26/26** six-game source-link/date replay negative and positive tests passed.
- **20/20** shared source-period comparison tests passed.
- **68/68** total source-shape and linked-identity unit tests passed.
- The real pinned November 8 saved readback, compared with the original pinned November 4 proof, passed **6/6 actual HTO game-ID/date/opponent/score associations**.
- A private, unchanged 61 KB frozen copy of the November 8 readback is retained on HOME BRUTTECH 1 under `Implementation Control\261107_SixGame_Link_Replay_Evidence_PRIVATE` for independent repeatability. Neither the raw readback nor the historical private proof is included in this public PR.

The new candidate **does not fetch a fresh live boxscore** or revalidate raw individual player-game/goalie rows. An operational collector patch must replace **both** seven-column assumptions in the pinned runtime: the Scores-page parser and the game-ID-scoped boxscore recheck. It must independently verify the actual source page/header, dates, official HTO ID, per-player game rows and real workbook input coverage. No source publication, original workbook recalculation, scheduled task change or numerical awards release is authorized by this offline replay.

CI runs all three synthetic suites and the narrow Git ignore check. A green CI result certifies the candidate's negative-test behaviour, **not** completion of the operational release gates.

## Further follow-up: archived native GameInfo periods independently replayed

An existing November 3 private capture contains **six original HTO game-specific boxscore heading tables** with individual official `gameID` URLs and a separately qualified review of **80 verified skater appearances** (the original independent review; not recalculated here). Private source digests are:

- Prior six-GameInfo source archive: `f718c438e7b2fc67fc675375daf67daca860be51bf710bbf3f54b43dde633fd0`
- Previous independent boxscore review: `48cb5c19120099dd408e7fb5ceb9dbec642f0fc9a2bb96715654141285225bd1`

A fourth source-only companion, `scripts/audit_pinned_hto_boxscore_period_replay.py`, verifies **four pinned sources simultaneously**: the later HTO Scores page, November 4 Master date/score proof, original November 3 game-specific boxscore capture, and the independently verified prior review. It parses the original GameInfo `SCORE BOARD` heading layouts into scorecard rows and calls the *same shared five-/seven-column period contract* used for the current Scores page.

Real private replay: **6/6 exact same official game IDs, opponents, period-by-period score vectors and final scores matched**. Specifically, Big Bastones HTO 3375682 is regulation-only five columns in both sources; all five other games are extended seven columns in both. The original master date numbers remain 359–364, team totals remain 6 GP / 14 GF / 30 GA, and the previously certified skater appearance count is still 80.

Twenty-one additional synthetic negative/positive tests reject forged source page links, altered period scores with unchanged finals, mismatched teams, changed source review status, missing/duplicate game IDs, an unqualified original source SHA, changed archived capture dates and improper publication claims. **All 89 new-and-prior tests (22 + 26 + 20 + 21) pass.**

These are **archived-source replay results**, not a fresh November 8 GameInfo fetch and not a new current skater or goalie row certification. The source owner still must independently validate the full **operational collector** against current official pages, approved runtime integration, scheduler isolation/rollback, and original Workbook formula/eligibility parity before publication.
