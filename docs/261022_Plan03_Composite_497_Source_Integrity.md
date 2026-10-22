# HockeyOS Plan 03 — First integrated 497-cell disposable source acceptance

**Checkpoint:** October 22, 2026. **Lead:** Data & AI. **Scope:** HTO-backed game history and player-game data. **Disposition:** `COMPOSITE_497_SOURCE_PARITY_PASS` (first read-only source check); full 17-sheet recalculation and original workbook promotion remain **HELD**.

## Change from the previous gate

The previous [497-cell two-fragment preflight](261021_Plan03_Exact_Source_Promotion_497_Cell_Two_Fragment_Gate.md) correctly identified that the verified team-period and player-statistics Excel branches were *separate*. A new standalone, third **disposable composite workbook** was subsequently created on **BRUTTECH 1**, using the vetted player-only full-calculation copy as a read-only source. Excel inserted **only the missing 32 numeric first/second/third/OT period scores**, called `Master Schedule.Calculate()` to confirm scores and completion flags, then saved and closed the private copy. It did **not** overwrite either previous branch or the authoritative Master Workbook.

| Private local artifact | SHA256 / status |
|---|---|
| Authoritative original `261001_Brave_HC_Master_Workbook.xlsx` | `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`; unchanged |
| Source player-only fully calculated copy | `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b`; unchanged |
| **New composite** `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_261021_01\01_Integrated_497_Source_Review_COPY.xlsx` | `9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08` |
| Untouched composite input copy | `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_261021_01\00_PlayerOnly_Verbatim_DoNotEdit.xlsx` |
| Excel composite application receipt | `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_261021_01\02_Excel_Composite_Source_Receipt.json` — `COMPOSITE_MASTER_SCHEDULE_PASS_PENDING_INDEPENDENT_497_CELL_QA`, `saved=true`, 32 period cells applied |
| Private player-game source evidence | `Plan03/source-archive/261021_Game_Log_Staging_GTG_Joined_PRIVATE.json`, source SHA256 `c83ad5ba1c5fef08ba3af7f5e91e9b39083b9a39f82776455992e89b61378f9b` |
| Private official period evidence | `Plan03/source-archive/261021_HTO_Official_Four_Game_Periods_PRIVATE.json`, source SHA256 `81790e38b0ff2a4563cb4fbf5d94911640e4bdd41a736d8e5c5fc419cee9066c` |

**No private XLSX, individual player source manifests or raw HTO source pages are committed to GitHub.**

## Actual independently observed read-only combined-source result

After Excel saved/exited, a separate Python ZIP/XML auditor loaded the **original and newly combined workbook** and both private, source-hashed HTO manifests using the previously reviewed `source_manifest_contract` and `scan_workbook` utilities. Its real-file output was:

`PRIVATE_INTEGRATED_SOURCE_PASS`, **zero discrepancies** across:
- **460 of 460** HTO-verified player-game input cells (40 skater rows + three goalie rows).
- **32 of 32** HTO-verified four-game numeric period inputs in Master Schedule rows 370–373, including explicit numeric zeros.
- **Four of four** vetted existing goalie game-359 corrections.
- **One** previously verified Y4674 shared-string whitespace marker cleared to genuinely blank, **not a numeric SHG zero**.
- **41 of 41** unavailable HTO player-stat fields remain blank.
- **Zero** unexpected changes to original manually entered data in **694,249 skater, 39,239 goalie and 6,836 Master Schedule historical manual cells**.
- Expanded skater/goalie table ranges `A2:FB4708` and `FD2:JO366`, respectively.

The new combined workbook and its manual-source inputs now satisfy the **exact 497-cell source-integration gate** that the earlier fragment tests could not.

The first application also checked the four completed official games as `L 0–3`, `L 3–6`, `L 2–3`, `L 1–7`, **0–4 / six GF / nineteen GA**, and verified the future October 25 game remained unscored.

## New reusable QA code and limits

New `scripts/audit_plan03_composite_497_source.py` extends the previous reviewed source checker to independently verify **original + player-only + combined** exact source evidence and:
- insist that all **497 source changes coexist in the one combined private XLSX**;
- compare 17-sheet formula definitions and require the expected 545,506 formulas to remain unchanged from the player-only source;
- independently check Master Schedule score, outcome and completed-game caches for the four official completed matches;
- hold if the upcoming game 3375682 / row 374 gets a score or counted-game flag;
- fail closed on unverified zero substitutions, historical source drift, stale HTO evidence, unapproved goalie changes or wrong table boundaries.

Its **13 synthetic fail-closed tests** are in `tests/test_plan03_composite_497_source.py` and are included in the guarded `brave-record-source-refresh.yml` workflow. The private combined XLSX is **never** required by hosted CI; CI validates the checker contract using synthetic fixtures. The additional *real-file* full-sheet formula-signature check is **not yet reported as run** in this checkpoint because the remote execution controls subsequently rejected its launch. The manual-source 497/497 pass above was observed from the previously vetted source scanner directly.

## Open gates and decision rules

1. **Combined full Excel recalculation:** On another *new disposable copy* of the verified combined workbook (never the authoritative source), perform a controlled 17-sheet `CalculateFull` and independent readback of all formula definitions, error cells, scored games, season counts and HTO player/goalie pivot parity. The successful earlier `CalculateFull` used the **player-only** branch; it is not proof the new composite full calculation completed.
2. **Statistical completeness:** **42 skater PIM observations, one goalie POTG observation, partial GTG coverage and other legacy manual fields remain unavailable**. Treat unknowns as unknown. Existing award/projection/streak models and any derived numeric zeros remain source-restricted.
3. **Profile and registry:** Original Skater Profile `I13/J13` still contain pre-existing `#REF!` with no formula text; record profile Active/Total semantics are not defined by the legacy 28 holder rows or 25 differently scoped current HTO mentions. Pavaday/Carlyle registry omissions, duplicate `Hunt, Quenton` SCR entries, CU/DI/rookie eligibility and verified historical baselines require independent source-owner decisions.
4. **Production release:** Only after full source and business-rule validation, independent QA and **explicit original workbook owner authorization** should there be any proposal to replace the authoritative Excel, refresh public record/player/stat widgets, or mutate native HTO. Maintain a protected original backup and rollback evidence. No source-of-truth update is implicitly approved by a private test.
5. **October 25 future game:** HTO ID 3375682 is **not completed** in this reviewed four-game evidence set and must not be admitted through a preview.

**Result:** Combined 497-cell manual source integrity is independently verified in a private disposable workbook. **Full-calculation, stats/business-rule and source-of-truth promotion gates remain open.** Integrated Plan 03 tracker: [issue #30](https://github.com/adambrutto-maker/brave-hc/issues/30).
