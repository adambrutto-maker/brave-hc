# HockeyOS Plan 03 — First integrated 497-cell historical game correction

**Evidence captured:** October 21, 2026, BRUTTECH 1. **Lead:** Data & AI. **Status:** `497_CELL_COMPOSITE_SOURCE_PARITY_PASS_DISPOSABLE_ONLY`; **original-workbook promotion and public publication HELD**.

## The integration gap is closed at source-input level

Earlier Plan 03 tests separately validated a four-game **Master Schedule period-only** copy and a **43-player-game-row, goalie-corrected** copy. They had never been integrated. The new, **third independent disposable workbook** combines their precise manual-source inputs for the first time.

| Component | HTO/source-backed dispositions | Verified in a single private workbook? |
|---|---:|---|
| Missing Winter 2026/27 skater and goalie game-log observations | **460** source cells across **40 skater + three goalie rows** | Yes |
| Official team period scores for four completed games | **32** numeric inputs in `Master Schedule K:N,P:S`, rows 370–373 | Yes |
| Existing Dev Leong game-359 goalie contradiction | **Four** reviewed source values, including loss-derived W=0 | Yes |
| Existing `Player Game Logs!Y4674` whitespace-only shared string | **One** source value cleared to genuinely blank/unknown, not SHG=0 | Yes |
| **Total independently reviewed source changes** | **497** | **497 / 497 PASS** |
| Incomplete verified HTO fields | **41** source fields excluded/kept blank | **41 / 41 protected** |

**Official four-game result after bounded Excel `Master Schedule.Calculate()`:**

| Source HTO game | Workbook game | Excel row | Brave GF–GA | Calculated W/L/T | Game contested |
|---|---:|---:|---|---|---:|
| 3356177 (Sep 20) | 359 | 370 | 0–3 | L | 1 |
| 3356178 (Sep 27) | 360 | 371 | 3–6 | L | 1 |
| 3369564 (Oct 4) | 361 | 372 | 2–3 | L | 1 |
| 3375601 (Oct 18) | 362 | 373 | 1–7 | L | 1 |
| **Combined** | | | **6 GF / 19 GA, 0–4** | | **Four games** |

Next scheduled October 25 HTO game 3375682 / book game 363 / worksheet row 374 **remains unplayed**, with no period inputs and `X374=0`. The cached `U374=T` is a legacy placeholder, **not** an actual 0–0 tie.

## Private source custody and rollback

The **authoritative original** `261001_Brave_HC_Master_Workbook.xlsx` remains SHA256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`, unchanged.

The two accepted source fragments remain untouched:
- Period-only QA workbook: SHA256 `6c125066eff2c4c6f211df8cec4c827676881495d76464c3cb0512abe474a034`.
- Player-only/goalie source QA after full Excel calculation: SHA256 `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b`.

New private integrated workbook on BRUTTECH 1 only:

`D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_261021_01\01_Integrated_497_Source_Review_COPY.xlsx`

SHA256 **`9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08`**.

The private folder also contains `00_PlayerOnly_Verbatim_DoNotEdit.xlsx`, a byte-identical rollback of the input; `02_Excel_Composite_Source_Receipt.json`, the isolated Excel Save/test receipt; and `00_Stage_Progress.json` from the integration operation. None are published on GitHub.

HTO provenance source SHA256 references:
- Period-by-period official HTO readback: `81790e38b0ff2a4563cb4fbf5d94911640e4bdd41a736d8e5c5fc419cee9066c`.
- Source-joined skater/goalie/GTG admission plan: `c83ad5ba1c5fef08ba3af7f5e91e9b39083b9a39f82776455992e89b61378f9b`.

The first source-only import had unknown goalie POTG and skater PIM/GTG values; they remain source-unknown, not automatically coerced to numerical zero. Previous game-359 Dev Leong correction and Y4674 blank were preserved exactly.

## Independent source-acceptance gate

New `scripts/audit_plan03_integrated_497_cell_source.py` uses **four separately hash-checked XLSX inputs** (original, period-only, player-only, integrated) and two separately verified private HTO source envelopes to prove that all **497 intentional dispositions appear in a *single* new private workbook**.

It requires:
- The exact 460 source-admitted player-game cells, 32 numeric HTO period values (including deliberate true zeros), four original goalie corrections and one blank Y4674 disposition.
- Source-unknown PIM/POTG/GTG/manual inputs remain blank in all **41** held cells.
- Existing source manual values match original history; no unrelated historical manual values are rewritten, no unexpected manual data inside the new player-table extension.
- Identical source-table extensions `SkaterStatsByGame A2:FB4708`, `GoalieStatsByGame FD2:JO366`.
- The original/period-only/player-only baseline roles remain distinct; the integration may not retroactively label the earlier player-only copy as already score-complete.
- Exact four scoreboard cached outputs (6GF/19GA, 0–4, `X=1`) and unplayed next-game row 374.
- An explicit source-hash-based Excel receipt and no source-of-truth workbook write.

Actual BRUTTECH 1 independent result:

`497_CELL_COMPOSITE_SOURCE_PARITY_PASS_DISPOSABLE_ONLY`

This **does not** imply that the new composite's full workbook formula/dependency layer has already been recalculated. The separate private full-calculation acceptance, if run, must be documented and pass independent checks before upgrading the *calculation* status.

## Remaining governance and release

- **Original workbook**: owner has **not** approved source-of-truth promotion. A separate exact-cell approval, immutable binary backup, rollback verification and post-write QA are still required.
- **Current statistical completeness**: 42 source-missing skater PIM observations, one missing goalie POTG, partial GTG, other historic/manual metrics, identity/jersey flags, absent Pavaday registry, duplicate Hunt SCR projection row, and original Skater Profile `I13/J13 #REF!` definitions are *not* resolved by this source-only integration.
- **Downstream current awards and projections**: not authorized. Basic season-pivot source parity does not prove every ranking, rate or award eligibility is correct.
- **Public HTO/native Records and Watch**: no edit. Current `widgets/watch.json` remains historically scoped; two previously published milestone events are not a fully current auto-watch.
- **Future game**: Oct 25 HTO game 3375682 is still scheduled/pre-admission, not a fifth completed game.
- **Articles**: original HTO bulletin text and July 1 2026 offseason article remain privately preserved and not automatically republished.

## Next acceptance

Obtain an independently checked **full 17-sheet Excel `CalculateFull` on a new, separate copy of the integrated workbook**, with no new formula errors, correct team season game totals and unplayed game preservation, and exact 20-skater / three-goalie HTO basic season-pivot parity. Then audit Awards/Projections/Web Streaks for complete and source-backed business semantics; these remain held pending owner decision. **Do not overwrite the immutable original workbook** without explicit source-owner approval and rollback.

Plan 03 tracker: [issue #30](https://github.com/adambrutto-maker/brave-hc/issues/30). Related two-fragment gate: [PR #55](https://github.com/adambrutto-maker/brave-hc/pull/55).
