# HockeyOS Plan 03 — Original Master Workbook owner decision packet

**Prepared:** October 22, 2026. **Lead:** Data & AI. **Decision state:** `SOURCE_OWNER_REVIEW_REQUIRED_NO_PRODUCTION_WRITE`. This packet is a control document, **not** an instruction to modify the original workbook or release public live statistics.

## Decision 1 — Exact approved Excel correction scope

The canonical original `261001_Brave_HC_Master_Workbook.xlsx` is unchanged, SHA256:

`0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`

[Plan 03's integrated private full-calculation acceptance, PR #57](https://github.com/adambrutto-maker/brave-hc/pull/57), separately verified **497/497 source-cell dispositions in one disposable workbook**, with 17-sheet recalculation and basic HTO player parity, but **did not authorize the original workbook edit**. Its privately retained source-integrated full-calculation test SHA256 is:

`de9bc6ed615a7c330809a0b2f8888f42c357d641f2a2266e0fca20914521f979`

Proposed original source changes **already technically verified together in that private copy**:

| Source area | Exact changes | Required control |
|---|---:|---|
| Four HTO game period score inputs (book games 359–362, rows 370–373) | **32 numeric K:N / P:S inputs** | Source HTO per-game period evidence, numeric zero preserved |
| Missing skater and goalie logs (book games 360–362) | **460 values across 40 skater + 3 goalie rows** | Full 158-/116-column table propagation, exact identity, preserved unknowns |
| Dev Leong original game-359 error | **Four goalie W/L/GA/POTG cells** | Existing source 1W/0L/0GA/0POTG → reviewed 0W/1L/3GA/1POTG (W loss-derived) |
| `Player Game Logs!Y4674` legacy single-space source | **One whitespace → blank** | Must **not** become a numeric zero SHG |
| **Reviewed change set** | **497 manual dispositions** | Validated in the private copy; original untouched |

Four HTO official scores are **L 0–3, L 3–6, L 2–3, L 1–7**: record **0–4**, six GF, 19 GA. The October 25 game 3375682 / row 374 remains **future/unplayed**.

**Additional two source-backed fields not in the 497 acceptance:** [the official opponent review](261022_Plan03_Official_Opponent_Metadata_Review.md) confirms `Master Schedule!H372 = Michelob Morts` and `H373 = Zamboner Crew`, currently blank in both original and integrated private copy. Their acceptance would increase the proposed source-change scope from **497 to 499**, requiring a *new* separately checked disposable copy and source/Excel formula/dependency QA. The existing `H371 = Mohawks HC` versus official `Mohawks H.C.` is an **alias review**, not authority for automatic normalization. Missing time `F`, home/away `G` and rink `I` fields on rows 372/373 remain **unknown, not guessed**.

**Owner decision required:** authorize precisely the already validated 497-cell scope, or include the two additional opponent-name fields **only after their separate private integrated calculation/QA**. Neither decision should be inferred from a generic instruction to continue advancing Plan 03.

## Decision 2 — Partial/unknown statistics and legacy identity constraints

The verified four-game HTO feed does **not** supply **42 skater PIM observations of 54** or one goalie POTG observation of four; GTG is explicit on two games only and further legacy manual fields remain unproven. The combined private file preserved **41 withheld staged source fields blank**, distinct from the all-game 42 PIM unknowns. A blank is **not an HTO-confirmed zero**.

Additional explicit owner/functional review cases:

- **Pavaday, Damian** is in the current HTO game-level skater feed but absent from original `PlayerInfo`, projection table and WebStreaks helper. Determine roster status and eligibility; do not assign FT/CU/DI based only on appearance.
- **Carlyle, Adam**, a documented goalie/DI source identity, is absent from the original `PlayerInfo` and WebStreaks helper; profile and award inclusion must be handled under correct player-status rules.
- Original `Player Projections` contains two `Hunt, Quenton` rows, both `SCR` with jersey numbers 0 and 6; source duplicates should not be silently merged/deleted.
- Original `Skater Profile I13/J13` contain formula-less `#REF!` under **Active Records** and **Total Records**. The original `RecordLedger` has 28 counted Major/Minor holder entries for the selected player while current HTO has 25 exact-name published record mentions. Their scopes differ, and the intended profile field formulas are **not known**.
- Current awards and projections are **not certified** merely because the integrated private workbook recalculated successfully. Individual AwardScoring rankings, current player rates, droughts, milestones and live Record Watch require separate business-rule parity.

**Owner decision required:** define accepted source-unknown handling, player-registry eligibility and historical record-field semantics. Delegate award-specific interpretation to the existing Awards Plan, not a duplicate Plan 03 scoring release.

## Decision 3 — Exact, reversible original workbook promotion (NOT YET AUTHORIZED)

The proposed *future* source promotion must use these gates in order:

1. **Source custody and freeze:** confirm the exact original canonical file and approved SHA above, no conflicting local edits, and a distinct protected byte-identical off-source rollback copy with signed timestamp, path, owner and SHA.
2. **Scope freeze:** adopt the explicitly listed 497 cells only, or produce a **new 499-source change** private QA candidate if the optional two opponent fields are approved for inclusion. Never splice unchecked files or silently replace row-371 alias.
3. **Independent comparison:** source-private manifest must verify every approved manual value and 41 staged unknown blanks; all remaining historical manual source values, formulas, 17 worksheets, structured tables and pivot definitions must be unchanged or separately justified.
4. **Calculation acceptance:** run the exact approved composite in a disposable copy; verify team 0–4/6GF/19GA, all 20 official skaters (54 GP/6G/10A/16Pts/9 skater POTG), all three goalies' supported GP/L/GA, current 2026/27 game count and zero newly introduced Excel errors. Retain the two pre-existing `#REF!` defects openly until separately specified.
5. **Owner-controlled original write:** require a named, explicit source-owner approval for **specific original-file cells and preservation rules**, with no hidden Excel link refresh or external publication. Archive pre/post SHA and binary rollback proof. A source copy technically ready for owner review is **not** itself such approval.
6. **Post-write independent replay:** re-open/inspect the original, re-run source-to-HTO checker, verify exact approved changes, stop on any unknown value converted to zero, formula drift, player identity conflation, cross-source mismatch or unreviewed cache discrepancy. Roll back if acceptance fails.
7. **Separate public-release gate:** a verified workbook update is not permission to overwrite the public HTO Records/Awards, publish an active Watch, change player records or release current award ranks; keep historical-only Watch truthful until each business-rule/output is reviewed.

**No work-PC access or TCDSB data transfer** is involved in this HockeyOS/BruTTech process. The private source workbooks and source-row manifests remain on BRUTTECH 1 rather than public GitHub. No unsolicited email or native HTO admin edit is part of this packet.

## Acceptance / completion statement

**Technical:** the combined **497-cell private** source and 17-sheet full-calculation gates passed under PR #57.

**Further source review:** the **two missing official opponent fields** passed a read-only evidence gate, but are not included in that workbook or owner-approved.

**Blocked:** original source adoption, optional 499-cell integrated validation, unknown-statistic business rules, profile record definitions, roster eligibility, live Watch and current award publications.

**Plan 03 must remain OPEN** pending the precise source-owner decisions and separately audited adoption/rollback. Tracker: [issue #30](https://github.com/adambrutto-maker/brave-hc/issues/30).
