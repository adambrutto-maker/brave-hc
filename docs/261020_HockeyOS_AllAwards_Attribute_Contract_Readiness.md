# HockeyOS Awards Centre — 11-award attribute contract registry

Date: 2026-10-20  
Lead: Engineering / HockeyOS  
State: REVIEW ONLY — 1 HISTORICAL FIELD/WEIGHT CONTRACT MAPPED, 10 HELD, NO CURRENT 2026/27 RATING RELEASE

## Defect addressed

The original EA-style card renderer was coded exclusively for the Rolaids
award's historical `AwardScoring` component fields and weight sets.
Even if another award later passed source-faithful recalculation, its cards
could not display source-specific attributes without another code rewrite.
Borrowing Rolaids fields for other awards would be incorrect.

## New contract registry

`widgets/awards-attribute-contracts.json` registers each of the 11 original
award IDs and a distinct `sourceTable`, mapping status and role weights.

- **Rolaids**: historical original field and weight set available from the
  previously verified `awards-component-evidence.json`:
  **11 weighted skater fields, 10 weighted goalie fields**, each summing to 100%.
  This is NOT an approved current-season score or final normalized OVR.
- **Other 10 awards**: `HOLD_ORIGINAL_ATTRIBUTE_FORMULAS_NOT_MAPPED`,
  `roleWeights: {}`. No fictional component scores or substituted
  weights are supplied. HOF points to the original `PlayerInfo` scoring
  context rather than being treated as an ordinary weekly award.
- Registry authority: fixed original workbook SHA-256
  `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.
  The existing separate operational publication receipt still controls
  whether any current award score can be shown.

## Renderer

`widgets/awards-races-v3.js` loads the registry as another optional
`no-store` source. Its absence means **no current EA attribute scores**,
but the read-only Art Ross/Rocket HTO stat watch, all 11 award-source gap
explanations and historical reference cards still work.

A current attribute panel must match its **own award ID** and role-specific
contract, which is crosschecked against the corresponding previously
captured original formula field and weight map:
- Rolaids: `awards-component-evidence.json.roleWeights[role]`.
- Future other awards: independently attested
  `awards-component-evidence.json.awardRoleWeights[awardId][role]`
  plus corresponding original formula pairs, when those data are actually
  extracted. None are asserted today.

The actual player must have a matching current named HTO appearance and
role. All source-defined fields, exact weights, unique abbreviations,
source formula pairs and mathematically correct contributions must be
present. Display still requires the separate operational publishing
receipt and verified `AwardScoring` final score; this registry is **not
an approval or score calculation engine**.

## Verification

- `node --test tests/test_awards_cards.js`: **52/52 PASS**
  after the JS variable-shadowing bug identified by the initial
  regression run was corrected.
- Negative tests: altered Rolaids registry weights cannot override the
  original captured source, other awards cannot borrow Rolaids fields,
  unmapped awards and missing registries remain held.
- Synthetic future Hart contract uses deliberately fictional
  `QA_HART_FAKE_...` source fields to demonstrate generality. Those
  fixtures exist only in test memory and **are not present in published
  JSON or production score feeds**.
- Headless Chromium at **390px and 1280px** from an isolated private
  BRUTTECH 1 review checkout: 11/11 source-explanation panels shown,
  0 current OVR scores, 54 historical attribute chips on saved Rolaids
  examples, 0 horizontal overflow, 0 browser script errors.
- GitHub Awards QA workflow includes
  `widgets/awards-attribute-contracts.json` in PR file triggers.

## Release holds

- **0/11 current 2026/27 award model scores published or signed**.
- Source saved `AwardScoring` covers one 2026/27 team game; HTO
  independently records four.
- The final original eligible-population normalization and `Web Races`
  rank keys remain unverified for current games.
- Historical attributes are preserved as original source examples, not
  promoted to current ratings. Art Ross/Rocket remain raw statistical
  counts and must not appear as 50–100 OVR.
- This JS is a presentation guard only. Claimed JSON booleans, source
  fingerprints and formula pairs need independently attributable release
  review; a browser cannot cryptographically validate them.
- Original workbook, active hourly widget publisher, production website
  and original Google Form are unchanged.

## Next genuine milestone

Independently authorized formula-preserving HTO-to-operational-workbook
replay, including all historical `PlayerInfo` helpers, `AwardScoring`
normalizers, rank keys and `Web Races` output. Capture separate
exact original source component maps for the other award-specific roles
instead of inventing attributes. Obtain independently authenticated QA
and Founder approval before production merge/deployment.

Earlier original-source inspection/migration security blocks remain in
force; this work did not retry or work around them.

**Disposition:** 11-award UI contract schema prepared, Rolaids historical
field map verified, all current ratings held.
