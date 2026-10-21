# HockeyOS Plan 03 — Legacy Skater Profile record errors, Web Streaks and downstream source dependencies

**Date:** October 21, 2026. **Lead:** Data & AI. Supporting: Engineering and QA. **State:** `RECORD_PROFILE_REF_UNRESOLVED_STREAK_LATEST_BOUNDED_PASS`. Entire audit is read-only; no original Excel, public HTO records, awards or widgets are changed.

## Source of truth and safety boundary

The inputs are (1) the immutable `261001_Brave_HC_Master_Workbook.xlsx`, original SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`; (2) the independently reviewed **private** 17-worksheet `CalculateFull` candidate, SHA256 `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b`; and (3) the verified four-game HTO source feed (games `3356177,3356178,3369564,3375601`, workbook games 359–362). All are read **without Excel COM** using ZIP/XML and verified source labels, with no network or file mutations.

Use `scripts/audit_plan03_profile_record_streak_sources.py` for repeatable fail-closed verification. It specifically **does not reconstruct a lost Excel formula** or promote private projection/award data to official HTO.

## Skater Profile — two original errors are unresolved source semantics

The original `Skater Profile` displays the selected player in `B2` as **Brutto, Adam**. Its row 11 fields are labelled:

| Cell | Label | Original row-13 stored content | Formula XML |
|---|---|---|---|
| `I13` | Active Records | `#REF!` (Excel error cell) | **No formula text exists** |
| `J13` | Total Records | `#REF!` (Excel error cell) | **No formula text exists** |

Both error-valued cells already exist in the untouched source workbook and survive the private `CalculateFull` unchanged. They cannot be repaired merely by recalculating. Replacing them with an assumed `COUNTIFS`, hardcoding a total, or translating one record-count statistic to both fields is not supported without authoritative definitions.

The immutable legacy model **does provide internally consistent evidence**, independently cross-checked through two distinct tables:

- `PlayerInfo` for Brutto, Adam: `HOF Major Records Held=15`, `HOF Minor Records Held=13`, `HOF Total Records Held=28`, `HOF Record Points=196`.
- `RecordLedger` has **79 rows** for that player: **15 major record-holder entries**, **13 minor entries**, **51 display-only entries**. Its major/minor flags and 196 points independently reproduce the 28 holder entries and points in `PlayerInfo`.

**Interpretation:** The legacy workbook's 28 *counted holder entries* are supported. The 79 ledger occurrences are **not** interchangeable with 79 currently held records, and 51 display-only entries must not be promoted into counted records. Neither “Active Records” nor “Total Records” is independently defined by the two broken profile cells, and the official HTO 558-entry all-team historical Record Book uses its own vetted source and scope. **Do not edit the two profile cells** until the appropriate profile-field meaning is approved and checked against current official HTO record holders.

## Web Streaks — current latest-game mapping is correct for a bounded subset

The private fully calculated `WebStreaksHelper` has 24 populated name rows. Twenty-one are in the verified four-game HTO player feed and match **the exact latest official completed workbook game (359–362)**, with `Latest Row Found=1`. There are **no game-number mismatches** among these 21 checked identities.

Two HTO player names **are absent** from the original `PlayerInfo` roster **and** the helper: **Carlyle, Adam** and **Pavaday, Damian**. This is a source-registry/eligibility coverage gap, **not** proof that they should automatically be inserted as active-eligible players or into awards. Their identity, roster status and call-up/DI treatment require owner review before any addition.

Three legacy `PlayerInfo` players remain in the helper despite not appearing in the four current HTO boxscores: **Congiusti, Marco** (FT), **Mazzei, Stefano** (CU), **Svec, Matt** (CU). The original legacy table marks them current/active-eligible. Their prior game history and eligibility must not be overwritten based on the four-game snapshot.

**Scope of PASS:** latest official game numbers for 21 existing helper identities only. Their actual current **career streaks, droughts, milestone baselines, historic PIM/GTG coverage and record-watch release** are not verified. Empty Watch details are not authority to claim no milestones. The October 25 HTO fixture `3375682` remains **unplayed and not admitted**.

## Downstream formula source-dependency inventory (informational, not QA of scores)

The private calculated workbook includes extensive calculations. A formula-text inventory shows:

| Worksheet | Total formulas | Direct references to skater/goalie game-log tables | Formulas mentioning PIM/POTG/GTG/SHG/PPG/SOG/related terms |
|---|---:|---:|---:|
| Awards & Records | 91,284 | 11,778 | 4,919 |
| Player Projections | 2,237 | 264 | — |
| Web Streaks | 2,401 | 1,250 | 700 |
| Web Races | 255 | — | 35 |

Awards & Records also contains **54,092** formula references to `RecordLedger`, `RecordSetup` or `RecordWide`. These counts describe **formula dependency exposure**, **not** the number of incorrect formulas. A reference to PIM could be historical and valid; these totals do not prove any specific award or record claim is wrong.

Since the current four-game verified feed has **42 unknown skater PIM observations**, **one unknown goalie POTG**, partial GTG observation coverage and other unrecorded manual values, AwardsScoring, current projection rates and live Watch remain **release-held**. Successful `CalculateFull` execution and source-aligned basic season pivots do not establish complete stat provenance or eligibility.

## Reproducible QA, next handoff and release conditions

- Run `python -m unittest discover -s tests -p test_plan03_profile_record_streak_sources.py` (8 synthetic checks). It rejects attempts to reconstruct nonexistent formula text, count display-only rows as holders, silently change legacy summaries, mismatch latest HTO game numbers, automatically admit Carlyle to the legacy roster or fifth-game HTO `3375682`.
- Run the source checker with **read-only** input paths on BRUTTECH 1. Real-input output: `RECORD_PROFILE_REF_UNRESOLVED_STREAK_LATEST_BOUNDED_PASS` (28 counted holder entries, 21 current latest-game matches, explicit profile/eligibility release holds).
- Reconcile the intended definitions of **Active Records** and **Total Records** with the original workbook owner and official historical HTO Records before authoring any **new formula** in an entirely new disposable workbook.
- Review HTO's current 2026/27 player identities and legacy roster eligibility before expanding Web Streaks or awards. Never infer CU/DI/rookie eligibility from jersey number alone.
- Review award formula inputs/source semantics and Web Streaks career baseline evidence, **not only formula error counts**. Unknown source fields must remain unknown; do not convert them to zero or export them as confirmed rates.
- Original workbook/HTO admin, current record widgets and all public outputs remain unchanged until separately approved with independent QA and protected rollback.

Related [Plan 03 #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [full workbook formula validation PR #50](https://github.com/adambrutto-maker/brave-hc/pull/50).
