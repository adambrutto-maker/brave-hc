# HockeyOS Awards — Historical Rolaids raw composite parity

Date: 2026-10-20  
Lead: Engineering / HockeyOS  
Disposition: **HISTORICAL RAW COMPOSITE PARITY PASS / FINAL OVR + LIVE 2026/27 SCORING HOLD**

## Authority and scope

This is a **read-only** independent arithmetic calculation from already captured,
source-hashed historical workbook formula/evidence JSON. It does not open or
alter the original `261001_Brave_HC_Master_Workbook.xlsx` (verified SHA256
`0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`).

Inputs from the PR's previously published cached records:
- `widgets/awards-component-evidence.json`: saved historical Rolaids 11-skater / 10-goalie weighted component scores, per-component contributions, raw composite and source formula references.
- `widgets/awards-workbook-reference.json`: original historical Web Races display shortlist/rank/final rating values.

Tool: `node scripts/hockeyos_awards_cached_raw_parity.js`. This tool
independently recomputes weighted component contributions and their sum
instead of trusting the stored `formulaWeightedSumFromCachedComponents`.
It requires the 100%-total role weight contract, unique fields, correct
source roles, original component formulas, matching workbook hashes and an
exact historical scorecard identity set.

## Actual five-example replay

| Historical Rolaids player | Position | Independent weighted component sum | Raw composite from saved workbook | Historical published OVR observed only |
|---|---|---:|---:|---:|
| Krishnan Rajasooriar | Skater | 82.187 | 82.2 | 100 |
| Lorcan Duffy | Skater | 82.147 | 82.1 | 99 |
| Matt Svec | Goaltender | 82.132 | 82.1 | 98 |
| Adam Kober | Skater | 74.397 | 74.4 | 92 |
| Stefano Mazzei | Skater | 67.765 | 67.8 | 86 |

**Result:** 5/5 historical raw composites reproduce to the original one-decimal
precision; **54/54 weighted component entries** pass the original source
role/weight/contribution checks. A separate check confirms the saved *final*
published OVR values are unchanged between the original historical
scorecard and component-evidence files.

**This does not recalculate or verify the 100, 99, 98, 92, 86 OVR normalization.**
Those are **observed historical source values**, not derived by this validator.
The normalization uses the original full eligible reference population,
rank keys and internal formulas. Do not interpolate OVR from the five cached
top-list raw composites, and do not substitute direct HTO scoring for weights.

## Current 2026/27 release state

- HTO confirmed four completed games; source `AwardScoring` cached
  calculation includes only one 2026/27 game.
- Original 18 distinct Rolaids component formula pairs reference 111 unique
  historical `PlayerInfo` fields, including career-prior and all-time field
  comparators; this pass did not replay those underlying `PlayerInfo` formulas.
- Art Ross and Rocket Richard are statistical counts, **not normalized OVR**.
- All other current-season official award scores and Rookie source eligibility
  still require full formula-equivalent replay and independent release review.
- Weekly OVR change needs two authenticated full-week snapshot scores, not HTO
  raw stats or historical examples.

## QA

`node --test tests/test_awards_cards.js` — **24/24 PASS** in an isolated
BRUTTECH 1 checkout. This adds four direct historical raw-parity/tamper tests
to the 20 existing Awards tests.

GitHub Actions run `39452678989` passed on commit
`8fc4468acba4e1f9c1291afab07cf59f4ea817a3` before this documentation
commit; confirm the final CI run after the documentation-only update.

The tool sets `finalOVRNormalizationReproduced:false`,
`current2026ModelScoresVerified:false`, `releaseAuthorized:false`.
It cannot update the Master Workbook or public widget feed.

## Next engineering release gate

Build the original historical eligible-population normalization and rank
tie-break *only* from permitted, source-faithful, previously approved evidence
or independently authorized isolated operational workbook inspection. A
previous original-workbook inspection/patch attempt was safety-blocked; do not
retry it via alternative routes. Then replay the four official HTO games into
the source-equivalent Excel calculation environment and demonstrate all 11
awards' eligibility and rank parity. Require independently attributable QA
and a separate Founder release decision before PR merge or public OVR.
