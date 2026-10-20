# HockeyOS Awards: source-input sync preflight

**Status:** Source-record validation implemented and synthetic tests passed. **Not a workbook writer, formula engine, or live HTO connection.**

## Purpose

Protect the source-of-truth Brave H.C. Master Workbook while Engineering develops an HTO-synchronized operational copy. The original workbook governs player eligibility, game-log structure, history, all 11 award scoring formulas, normalization, rank keys and presentation. HTO supplies observed current-game input data; HTO totals alone do **not** produce award OVR.

## What this code tests

`tests/lib/hockeyos_award_sync_preflight.js` is a pure JavaScript function `evaluate(manifest)`. The synthetic test fixture in `tests/test_hockeyos_award_sync_preflight.js` demonstrates the audited **58-source-record classification**: 13 unchanged source matches, one saved-source correction, 44 missing additions and one cached-only name requiring quarantine. These are **synthetic QA examples calibrated to existing verified totals**, not a new readback of HTO or Master Workbook.

Preflight rejects duplicated game IDs, duplicate workbook game numbers, duplicate player-game keys, invalid season/date, forged HTO game-link identities, incorrect original game mapping, goals/assists/points mismatches, incomplete goalie game appearances, unverified player placeholders, disallowed award score fields and malformed source objects.

It **never converts missing goalie POTG to zero**. A null indicates unknown, and any changed existing source input requires explicit correction review. Results separate `PRESERVE`, `CORRECTION_REVIEW`, `ADD_CANDIDATE` and `cached-only identity exception`.

**Hard invariant:** `writeAuthorized=false` regardless of success, reviewer flags or Founder approval claims passed in the input payload. The library has **no network, file, Excel, GitHub or scheduling actions**. It cannot authorize or perform a workbook update or score publication.

## Known-source audited context

- Four HTO IDs 3356177, 3356178, 3369564, 3375601 join the original Master Workbook Game #s 359–362.
- Original saved game-log tables are full. Candidate expansion must preserve ~130 skater and 89 goalie formula cells from final template rows. An unrelated whitespace-only cell occurs at Y4674.
- One saved goalie game 359 record has cached GA=0/POTG=0 while official source shows GA=3/POTG=1. **Do not silently overwrite.**
- Original saved `Unknown, Johnny` entry requires identity review, not automatic deletion.
- HTO currently covers four game dates, saved `AwardScoring` cache one; normalized public award ratings remain held.
- Historical `PlayerInfo` matches 21/23 current HTO participants. Adam Carlyle and Damian Pavaday have unresolved historical records.
- The previous direct workbook formula inspection and raw-tooltip code attempts were safety-blocked. This preflight **does not retry or substitute for either inspection**.

## Before any real writer can exist

1. A separately approved, disposable original-formula workbook test must establish writable source input ranges, safe table expansion and full historical preservation without bypassing blocked inspections.
2. Exact original workbook `PlayerInfo` / `AwardScoring` / `Web Races` parity must pass for all 11 awards, including goalie-specific formulas and historical comparisons.
3. Source records need live HTO readback freshness, immutable fingerprints, correction log and an externally controlled valid reviewer decision.
4. Founder must separately approve actual activation after attributable independent QA/Security review and rollback validation.
5. Only then consider wiring a writer into the existing hourly HTO refresh. This PR contains **none of those activation operations**.

To run locally: `node --test tests/test_hockeyos_award_sync_preflight.js`.

Review alongside [issue #10](https://github.com/adambrutto-maker/brave-hc/issues/10) for live workbook sync and [issue #9](https://github.com/adambrutto-maker/brave-hc/issues/9) for all-award formula parity.
