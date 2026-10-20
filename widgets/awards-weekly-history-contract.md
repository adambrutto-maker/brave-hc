# HockeyOS award cards: weekly rating and movement contract

Status: **presentation implementation on feature branch; no new 2026/27 award rating published.**

## Source of truth

The existing Brave H.C. workbook `AwardScoring` logic remains authoritative. The verified public OVR is the final award-specific, eligibility-aware rating after workbook ranking/normalization. **Never calculate OVR from the average of attribute tiles.** Components display the workbook's weighted, normalized *web component scores*. Individual tiles round for EA-style appearance; tapping shows a one-decimal source value and the weight.

Art Ross and Rocket Richard are goals/points **statistical counts**, not 50–100 OVR ratings. Saved historical examples are not current-season shortlists.

## Display behaviour

- An eligible, verified score displays an OVR tile. Show up to **six highest-weighted component ratings**. Remaining attributes appear behind an accessible disclosure.
- The current-season component panel is visible only when the published player entry carries the following **same-week** evidence object:
  ```json
  {
    "scoreKind": "OFFICIAL_WORKBOOK_FINAL",
    "eligible": true,
    "verifiedComponentEvidence": {
      "status": "VERIFIED_CURRENT_WORKBOOK_COMPONENTS",
      "season": "W2026/27",
      "awardId": "rolaids",
      "playerName": "exact roster key",
      "sourceWorkbookHash": "64-character SHA256 matching awards-races.json",
      "asOf": "date matching verified race.asOf",
      "modelGameCount": 4,
      "components": [
        {
          "abbreviation": "PTS",
          "sourceField": "exact AwardScoring field",
          "webComponentScore": 96.7,
          "weightPct": 18,
          "unroundedWeightedContribution": 17.406
        }
      ]
    }
  }
  ```
  Full arrays must cover all components and total 100% weight; the object shown above is **schema illustration only, not complete evidence**. The UI does not silently substitute historical scores if current evidence is unavailable.

## Movement requires a separately verified, dated snapshot

The optional `awards-weekly-history.json` contains a `snapshots` array; the supplied file is currently empty. No changes to the original workbook or HTO source are made.

When verified snapshots are available, set `status` to `VERIFIED_PUBLISHED_WEEKLY_SNAPSHOTS`. Each immutable snapshot must satisfy:

**Strict formula-authority continuity:** `sourceWorkbookHash` is the
**immutable original formula-authority hash**, not the changing operational
recalculation copy's file hash. It must exactly match the current
`awards-races.json.sourceWorkbookHash`. An arbitrary well-formed SHA-256 is
not evidence of unchanged source rules. Independently verify any operational
workbook snapshot hash and formula-map fingerprint through the separate,
nonpublishing operational provenance gate.

**Unambiguous weekly identity:** two same-season snapshots with the same
`publishedAsOf` date (or a malformed same-season date) suppress weekly OVR
movement for review. The reader does not guess which one is authoritative.
Two dated, independently verified comparable weekly score sets are still
required before displaying a numerical delta.

Each example below is the **data shape**, not independent proof of release
approval:

```json
{
  "status": "VERIFIED_PUBLISHED_WEEKLY_RACE",
  "season": "W2026/27",
  "publishedAsOf": "YYYY-MM-DD",
  "teamGP": 4,
  "sourceWorkbookHash": "64-character SHA256 of the exact source",
  "races": {
    "rolaids": [
      {
        "name": "exact roster key",
        "rank": 1,
        "overallScore": 93,
        "scoreKind": "OFFICIAL_WORKBOOK_FINAL"
      }
    ]
  }
}
```

**Publishing process:** save the previous week's verified results before replacing the current published week. Compare each current player against the **most recent earlier, valid, same-season award snapshot**. Display `this week OVR - previous OVR` as the points gained/lost and `previous rank - current rank` as movement. Positive rank difference means the player climbed. The previous snapshot date must appear alongside the comparison. New names receive **NEW**, while a missing or unverified baseline gets no fabricated numeric movement. The app must never derive movement from HTO game totals, saved workbook examples, or provisional composite values.

## Release acceptance checks

1. All 11 awards render under the same layout with responsive mobile score tiles.
2. Original eligibility rules and published scoring remain unchanged.
3. Full precision, weights, formula source and provenance are retained in explanatory views.
4. 50–100 OVR versus statistical goal/point counts are clearly distinguished.
5. At least two validated published weekly snapshots are needed before a numeric week-over-week delta appears.
6. Source-hash mismatch, game-count mismatch, future-dated snapshot and invalid component weights suppress the affected score or movement.
7. Missing model data fails closed; the current season does not adopt historical ratings.
8. Validate actual browser layout and accessibility before merging into `main`.
