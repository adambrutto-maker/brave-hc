# HockeyOS Awards — Immutable formula authority vs live operational workbook

Date: 2026-10-20  
Lead: Engineering / HockeyOS  
**Status: REVIEW-ONLY PROVENANCE CONTRACT; NO EXCEL WRITER, NO AWARD SCORE RELEASE**

## The critical distinction

An original, approved Master Workbook is **formula authority**. When a
separate operational copy receives official HTO game results, the
**operational copy's file hash must change**. A changed workbook snapshot
is not permission to alter eligibility, weighting, rank keys, normalization
or any original formula.

| Identity | Purpose | Rule |
|---|---|---|
| Immutable formula authority | `261001_Brave_HC_Master_Workbook.xlsx` source specification | Pin SHA-256 `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154` |
| Operational snapshot | Separately recalculated workbook with the verified HTO game logs | Record its own SHA-256, *distinct* from the source hash |
| Formula fingerprint | Formula-equivalence of source versus operational workbook | Compare full formula-map fingerprints; a match **claimed in JSON** is not independent proof |
| HTO input evidence | Official game IDs, workbook numbers, source readback and team GP | Validate date, 1-to-1 game identity and exactly the same readback timestamp as the Award Centre data |
| Original award outputs | `PlayerInfo`, `AwardScoring`, `Web Races`, relevant history | Provide an independently inspected 11-award eligibility/rank/score parity record |

The original saved `AwardScoring` still has **one 2026/27 game**
while HTO records **four**. It is invalid to mark current-score
verification true solely because the previously saved row checks had zero
mismatches.

## Implementation

New pure Node reviewer `scripts/hockeyos_awards_operational_provenance_gate.js`.

- Requires the exact formula-authority workbook hash rather than allowing an
  operational workbook to silently become the new specification.
- Requires a *distinct*, valid operational workbook hash and matching
  historical/operational formula fingerprints.
- Rejects missing complete-history parity, incorrect HTO vs Excel game
  counts, duplicate official game IDs, reused workbook game numbers,
  nonexistent calendar dates and missing 11-award formula-parity claims.
- **Allows same-day games** with different official HTO and original workbook
  game numbers. Date equality does not establish duplicate identity.
- Requires a fresh independently grounded HTO readback and **binds the
  attestation timestamp to the exact `sourceHTOReadback` in the public
  Awards data**. A new timestamp fabricated in the attestation cannot
  revive a stale published source.
- Returns `HOLD_OPERATIONAL_MODEL_EVIDENCE` for incomplete data or
  `SOURCE_EVIDENCE_REVIEW_CANDIDATE_ONLY` for a structurally
  complete *assertion*. **Neither status authorizes release.**

**Important trust boundary:** The helper does *not* open or inspect Excel,
compute original scoring formulas, cryptographically authenticate a reviewer,
verify signatures, approve model score/OVR, write source data or publish a
website. Every returned object explicitly declares
`publicationAuthorized:false`, `scoresAuthorized:false` and
`cryptographicSignerValidated:false`. A structurally correct source
attestation is a **review candidate**, not independent acceptance.

## Actual read-only result (2026-10-20)

`node scripts/hockeyos_awards_operational_provenance_gate.js`

Current source `widgets/awards-races.json` returns:

- `HOLD_OPERATIONAL_MODEL_EVIDENCE`
- `CACHED_AWARDS_GAME_COUNT_BEHIND_HTO` (saved 1 vs HTO 4)
- `ORIGINAL_MODEL_PARITY_NOT_ATTESTED`
- `OPERATIONAL_RECALCULATION_EVIDENCE_MISSING`
- `OFFICIAL_HTO_READBACK_NOT_BOUND_TO_AWARDS_DATA`
- `INDEPENDENT_OFFICIAL_HTO_FRESHNESS_UNVERIFIED`

This is the correct state. No separate operational award score was
recalculated and no live award scores are approved.

## QA

`node --test tests/test_awards_cards.js`:

**34/34 PASS** on isolated BRUTTECH 1 branch checkout, including five new
provenance tests plus a readback-binding and same-day-game scenario.

The five historical Rolaids raw-composite replay tests remain intact.
The official Art Ross/Rocket **STAT, not OVR** distinction remains enforced.

## Remaining steps before public official 11-award scoring

1. Obtain explicitly permitted and independently reviewed isolated operational
   workbook calculation access. Previous original workbook inspection and
   script-patch generation safety blocks must not be bypassed.
2. Replay authoritative HTO player-game inputs into the original
   `SkaterStatsByGame` / `GoalieStatsByGame` formulas without altering
   historical data; reconcile 13 preserved, one correction hold, 44 missing
   rows and the quarantined `Unknown, Johnny` identity.
3. Independently compare full operational source formula map and all
   `PlayerInfo` / `AwardScoring` / `Web Races` outputs across **all 11
   awards**, and the extra goalie missing-field/POTG unknown cases.
4. Attest an exact HTO readback and fresh game-to-workbook mapping at each
   calculation run. Preserve both original and operational hash identities.
5. Commission an **independently authenticated** QA/Security review and
   separate Founder release decision. Only after these gates should the
   public Awards UI consume an approved operational snapshot. The present
   pure script is **not wired into the live publisher**.

PR: https://github.com/adambrutto-maker/brave-hc/pull/8  
Tracking: https://github.com/adambrutto-maker/brave-hc/issues/9 and
https://github.com/adambrutto-maker/brave-hc/issues/10

**Disposition: retain 11 award scoring holds, preserve historical examples and
unranked HTO participants; no approved current OVR, no website write.**
