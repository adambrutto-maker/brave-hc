# HockeyOS Plan 03 — Integrated 497-cell disposable workbook source acceptance

**Implementation date:** October 21, 2026. **Lead department:** Data & AI, with Engineering and independent QA. **Acceptance level:** `COMBINED_497_SOURCE_INPUTS_PASS_DISPOSABLE_ONLY`. **Production promotion and public Record Watch remain HELD.**

**Follow-up (October 22):** The separate private integrated `CalculateFull()` run subsequently completed successfully and passed independent formula/error and HTO season-pivot source parity. See [the full technical acceptance](261022_Plan03_497_Integrated_Composite_Full_Calculation_Acceptance.md). This document remains the source-stage receipt and should not be mistaken for the later full-calculation result. Neither step authorizes original workbook or live website edits.

## What changed

Earlier Plan 03 work verified the Master Schedule period correction and the modern player-game data correction **in separate Excel copies**. This was a genuine integration gap, correctly identified by [PR #55](https://github.com/adambrutto-maker/brave-hc/pull/55). This step assembled a **third, separately named, private** workbook that combines the changes.

Starting from the independently verified, fully calculated **player/goalie branch** (SHA256 `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b`), an isolated Microsoft Excel 16.0 session opened **only a new disposable copy**, verified the original and source evidence SHA-256 checksums, inserted the missing **32 numeric HTO period cells** and recalculated `Master Schedule`. The copy was saved successfully and Excel exited.

**Private combined candidate:** `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_261021_01\01_Integrated_497_Source_Review_COPY.xlsx`, SHA256 **`9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08`**. Its independent byte-identical rollback source is preserved alongside it. Application receipt: `02_Excel_Composite_Source_Receipt.json` with status `COMPOSITE_MASTER_SCHEDULE_PASS_PENDING_INDEPENDENT_497_CELL_QA`.

**The original Master Workbook remains completely unchanged**, SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`. No native HTO records, public website statistics, user roster, historical articles or schedule tasks were modified.

## Independently verified combined source contents

A **separate read-only typed ZIP/XML source comparison**, using the original source and the two private, source-hashed HTO period/player manifests, independently read the **SAVED combined workbook**. All 497 intentional manual source dispositions were present in **the same workbook**:

| Verified manual-source scope | Result |
|---|---:|
| New HTO skater + goalie game-log values | **460/460 exact matches** |
| Four completed-game numeric Master Schedule period inputs | **32/32 exact matches**, including numeric zero periods |
| Four previously wrong original Dev Leong game-359 goalie values | **4/4 exact corrections** in private copy |
| Original stray `Y4674` single-space source marker | Changed to **genuinely blank**, not numeric zero SHG |
| **Total verified cell-level dispositions** | **497/497** |
| Verified HTO-null/unsupported input fields | **41/41 preserved blank** |
| Unexpected appended manual values | **0** |
| Previously existing original historical skater/goalie/schedule manual values | **All preserved in typed source-value comparison** |

Both original structured tables expanded to the already verified bounds: `SkaterStatsByGame A2:FB4708` and `GoalieStatsByGame FD2:JO366`. The independent source check preserved the original source table and history assumptions and found no unexpected manual-input change.

The composite's saved `Master Schedule` formula caches now report, for 2026/27 games 359–362, **four losses (0–3, 3–6, 2–3, 1–7)**. Overall Brave H.C. is **0–4, six GF and 19 GA** across those four completed games. All four workbook game-count flags `X370:X373=1`. The **October 25** preview game in row 374 still has no numeric source period values and `X374=0`; its old cached `U374=T` is an *unplayed placeholder*, not a confirmed tie.

The four original goalie source corrections were validated from the HTO official game 3356177: `GJ363 W1→0` (official loss-derived), `GK363 L0→1`, `GQ363 GA0→3`, `HA363 POTG0→1`. Unknown goalie POTG from a different HTO game is **still unknown**, and original player/goalie identity and rate/award restrictions remain separate.

## Automated acceptance contract and QA

`scripts/audit_plan03_integrated_497_source.py` is read-only. It consumes the original immutable XLSX, private combined XLSX, exact HTO source manifests and application's saved-file receipt. It checks the SHA-256 source fingerprints, exact typed 460+32 cell values, the four recorded goalie corrections, the Y4674 *blank* source semantics, all 41 unknown fields, existing historical manual-cell digests and both Excel structured-table ranges. It also checks **all four independent completed-game result/score/count caches** and that the future fifth game remains unrecorded.

When the result passes, it returns `COMBINED_497_SOURCE_INPUTS_PASS_DISPOSABLE_ONLY` with `originalSourceWorkbookEdited=false`, `ownerOriginalWorkbookApproval=false`, `officialAwardsForecastsAndLiveWatchCertified=false`.

Offline `tests/test_plan03_integrated_497_source.py` protects the contract against missing known zeros, unknowns coerced to zero, missing period cells, accidental new manual entries, original game-score drift, changed goalie source values, wrong table bounds and premature release status. CI tests **do not require or upload the private workbook or the detailed player source manifests**.

## Full calculated composite is a separate gate

The successful `Master Schedule.Calculate()` in this source-accepted composite is **not automatically a 17-sheet full-model recalculation pass**. A further **new disposable source-preserving copy** of the combined source has been prepared for Microsoft Excel `CalculateFull()`; record the resulting saved-file receipt and independently check:
- All **545,506** historical formula definitions and all 17 worksheet structures preserved.
- No introduced `#VALUE!` / `#REF!` errors; the two original `Skater Profile I13/J13 #REF!` are separately held and cannot be hidden.
- Official **20 HTO skaters**, 54 GP / six G / ten A / sixteen Pts / nine POTG; official three goalies' supported GP/L/GA parity and known loss-derived W caveat.
- Current workbook completed-games, season count, records, eligibility, supported per-game source facts and historical baseline.
- No corruption or unknown-as-zero source changes.

**Do not claim the full composite model has passed until the separately saved CalculateFull output and independent source/pivot/formula comparison exist.** On any failed or interrupted calculation, keep this source-accepted composite private and preserve its exact hash; do not retry against the same candidate or original.

## Unreleased business and owner decisions

1. The original workbook must not be edited until an independently approved owner correction package is adopted, with exact current source hash, protected backup, reviewed changes, full QA and rollback.
2. **42** of 54 current HTO skater PIM observations, one of four goalie POTG observations, some GTG/other legacy manual fields remain unknown; incomplete statistics are **not zeros** and do not support full current award rankings, career rates, or live Watch release.
3. Legacy projection table has `Pavaday, Damian` absent and an original `Hunt, Quenton` duplicate SCR row; player/award and CU/DI/rookie eligibility remain independently held.
4. Legacy Skater Profile `I13/J13` retain the two original `#REF!` cells with lost formula meanings. Legacy **28 counted holders** and public HTO **25 player mentions** have distinct scopes, so do not force a replacement count.
5. HTO original Records, historical awards/articles, verified Watch historical milestones, and current public site remain unchanged. The **October 25** HTO `3375682` fixture is not a completed fifth game at this acceptance date.

**Plan 03 remains open**, but the earlier two-fragment integration blocker is resolved at the **manual source-data level**. The next technical acceptance is full calculated-composite and downstream model review, followed by separate workbook-owner adoption—not automatic publication.

Related: [Plan 03 execution tracker #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [two-fragment finding #55](https://github.com/adambrutto-maker/brave-hc/pull/55).
