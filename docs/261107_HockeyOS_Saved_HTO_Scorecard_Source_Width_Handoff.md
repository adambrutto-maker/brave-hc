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
