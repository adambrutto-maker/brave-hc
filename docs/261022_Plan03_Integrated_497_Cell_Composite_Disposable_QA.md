# HockeyOS Plan 03 — First independently verified 497-cell composite

**Verified:** October 22, 2026, BRUTTECH 1. **Lead:** Data & AI; Engineering/QA support. **Disposition:** `COMPOSITE_497_SOURCE_CELLS_VERIFIED_OWNER_APPROVAL_HELD`. No original workbook, native HTO, existing private QA evidence or public statistical widget has been changed.

## Critical progression beyond Plan 03 PR #55

Prior Plan 03 work proved two separately correct Excel fragments but never combined them. This checkpoint **actually created and verified a third disposable workbook** from the previously reviewed full-calculated **player-only** branch, with an untouched rollback and exactly 32 additional official period inputs.

| Source evidence | SHA-256 | Scope |
|---|---|---|
| Original immutable `261001_Brave_HC_Master_Workbook.xlsx` | `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154` | Preserved source of truth, **not modified** |
| Private player-only input | `de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b` | 43 new player-game records, four original goalie fixes, blank Y4674, verified 17-sheet calculation but **32 period cells missing** |
| **New integrated disposable Excel candidate** | `9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08` | **All 497 source changes combined and saved** |
| Source-joined HTO player-game row evidence | `c83ad5ba1c5fef08ba3af7f5e91e9b39083b9a39f82776455992e89b61378f9b` | Private 40 skater + three goalie rows, withheld unknowns and GTG evidence |
| Direct official HTO periods | `81790e38b0ff2a4563cb4fbf5d94911640e4bdd41a736d8e5c5fc419cee9066c` | Private per-game official scoring/date/boxscore source hashes |

The new candidate and untouched private rollback copy are in `D:\BruTTech\Products\HockeyOS\Plan03\Excel_Disposable_Composite_261021_01\`. No private source-level XLSX or row-level evidence is committed to GitHub.

## New actual Excel implementation

Isolated Excel 16.0 opened **only** the private disposable candidate, confirmed original source checksums, the source manual calculation setting and all 17 worksheets, and wrote the exact 32 integer/numeric (including intentionally recorded zero) period inputs to `Master Schedule!K:N,P:S`, rows 370–373.

Official game source totals and saved Master Schedule formula output:

| Workbook game | Original HTO game | Worksheet row | GF | GA | Result |
|---:|---:|---:|---:|---:|---|
| 359 | 3356177 | 370 | 0 | 3 | L |
| 360 | 3356178 | 371 | 3 | 6 | L |
| 361 | 3369564 | 372 | 2 | 3 | L |
| 362 | 3375601 | 373 | 1 | 7 | L |

**Aggregate: 0–4, 6 GF, 19 GA.** The Master Schedule formula `X` counts each as completed; the upcoming October 25 game 363 / row 374 remains unplayed (`X374=0`).

Excel saved the composite and closed. Its app receipt `02_Excel_Composite_Source_Receipt.json` confirms 32 period cells written; its saved hash matches the independent readback. The original, player-only input, earlier period-only Excel copy and rollback remain unchanged.

## Independent all-497 source QA

The no-network/no-write `scripts/audit_plan03_composite_497_cell_readback.py` reads the original source, player-only private full-calculation copy and new integrated composite, plus both separately verified private HTO manifests and the Excel application receipt. It validates:

- **460/460** exact, typed official player-game input values from three more games (40 skater observations plus three goalie observations), preserving original game 359 entries.
- **32/32** exact official per-period input cells, including numeric zeros, and all four official scores/results/count flags.
- **Four** original game-359 Dev Leong goalie data corrections remain in place.
- `Y4674` is genuinely blank/unknown, not an invented SHG zero; **41/41** explicitly withheld new-source fields are still blank.
- No other manual input was added in the new extended skater/goalie regions, and historic source manual digests remain unchanged for **694,249 skater, 39,239 goalie and 6,836 Master Schedule** original manual values.
- Both structured tables keep their reviewed 158/116-column expanded references.
- The 17 worksheet identities, ZIP package components and **545,506 formula definitions** match the full-calculated player-only source.
- **No new cached Excel errors**, retaining only the two original Skater Profile `I13/J13 #REF!` defects.
- Upcoming October 25 HTO fixture `3375682` remains **not admitted**.

**Real read-only result:** `COMPOSITE_497_SOURCE_CELLS_VERIFIED_OWNER_APPROVAL_HELD` — this first composite is accepted as source-input integrated **in private only**. The private, source-hashed result receipt is `D:\BruTTech\Products\HockeyOS\Plan03\source-archive\261022_Plan03_Integrated_497_Cell_Disposable_Readback_PRIVATE.json`, SHA256 `a14ff85c82c57940a409a03a8f20bc2eea94f1efdd28c2a37b3561ee0ef6b87a`.

The new fail-closed offline `tests/test_plan03_composite_497_cell_readback.py` covers source cell omissions, null-to-zero invention, goalie drift, error and formula integrity, legacy input tampering, table changes and premature future game admission. Hosted CI **never accesses private Excel files**.

## Remaining owner gates

1. Run a **separately reviewed full Excel `CalculateFull` on another disposable copy** of the accepted integrated 497-cell file, preserve input, backup and output SHA evidence, and independently verify the 17 worksheet formula/error state, team GF/GA and the HTO player/goalie seasonal pivots. **The 497-cell source readback alone does not certify this separate full-calc stage.**
2. Validate award/forecast/rate/business-rule outputs, as distinct from formula-cell syntax and per-game input parity. The HTO verified feed still has **42 unknown skater PIM and one unknown goalie POTG** (plus partial GTG and other unsupported legacy manual fields). **Never coerce these unknowns to zero** or claim complete awards/streaks/current Record Watch.
3. Review Pavaday and Carlyle roster/profile eligibility, duplicate Hunt SCR projection rows, original Skater Profile `I13/J13 #REF!` intended formula semantics, and the legacy 28-holder versus official HTO 25-mention source scope. Do not rewrite source eligibility or official historical records without separate evidence.
4. Obtain **explicit original-workbook owner approval** for exact cells and table extensions, independent source backup and rollback plan before altering the canonical original. All current testing remains private, user-facing page and native HTO source untouched.
5. No fifth game 3375682 before official HTO postgame verification; preserve original 32 Bulletin archive and July narrative private recovery pending editorial approval.

Related: [Plan03 issue #30](https://github.com/adambrutto-maker/brave-hc/issues/30), [two-fragment preflight PR #55](https://github.com/adambrutto-maker/brave-hc/pull/55).
