# Brave H.C. Bio V3.3 — five-iteration content quality audit

**Date:** 2026-10-29. **Owner:** Engineering / HockeyOS. **Status:** Release candidate, no production source modification outside this PR.

## Iteration 1 — Content and data audit

The live Bio V3.2 duplicates personal career goal composition in `bioScoringMix`, legacy `bioSecondaryMetrics`, and expanded `bioExtendedMetrics` (41% of Justin's **own** points from goals). It also repeats POTG/GP, penalty minutes per game and several special-teams categories in both old and new advanced panels. These were requested to become **Braves all-time contribution** data rather than another personal pie chart.

### HTO authority and coverage (source `widgets/player-career-insights.json`)
- Source: `brave-hc-player-career-insights/v1`, `NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK`, captured 2026-10-20T18:54:56.260Z.
- **109 archived profile identities**, 103 `VERIFIED_PROFILE_CAREER_SUM_PARITY`, 6 with no published statistics; 87 skater role histories, 17 goalie role histories, **one dual-role player**.
- Original HTO career totals are immutable for this work. Missing metric fields are **not zeroes**; an all-time percentage may only use the sum of actually published numeric career entries and must state its coverage. Ranking checks all 109 profiles, but shows the number with numeric evidence for that particular statistic.
- For additive **player-appearance** counts, skater plus goalie role appearances are summed; these are **not** unique Brave H.C. team games.
- Contributions are source-derived shares of the **published HTO career-stat entries**; they are not a separately reconciled official team-record total. The current HTO season live feed and the dated historical archive are **not combined**. Missing does not become 0.

### Audited whole-archive source totals, no imputation
| All-time player career field | Published observed total | Players with numeric source |
|---|---:|---:|
| GP (skater and goalie role appearances) | 5,049 | 103 |
| G | 1,405 | 57 |
| A | 2,020 | 65 |
| PTS | 3,425 | 68 |
| POTG (both roles) | 493 | 55 |
| PPG | 102 | 28 |
| SHG | 43 | 18 |
| GWG | 162 | 31 |
| GTG | 41 | 18 |
| Hat tricks | 65 | 16 |
| Goalie W | 162 | 11 |
| Goalie shutouts | 21 | 3 |

The 87 skater + 17 goalie role histories contain one overlapping dual-role profile. Hence all-role published field counts are **unique people** after summing source-observed role entries, never 104 distinct people.

### Benchmark examples
- Justin Carosi: 153/1,405 recorded Braves G = **10.9%**, all-time total rank **#1/57** published contributors; 220/2,020 recorded A = 10.9%, rank #1/65; 373/3,425 points = 10.9%, rank #1/68. His 53/493 recorded POTG entries = **10.8%**, overall HTO rank #2/55. His own-scoring breakdown remains 153/373 = **41.0%** goals, but appears only once as a *personal* split graphic.
- Stephen Logue: 124/162 source-recorded goalie wins = **76.5%**, rank #1/11; 18/21 published goalie shutouts = **85.7%**, rank #1/3; 56/493 POTG entries = **11.4%**, rank #1/55.
- 10-GP skater / 8-GP goalie **rate** qualifications from V3.2 remain unchanged. **Career total and source-published share rankings have no minimum GP.** All 109 identities are considered; rate/outcome metrics cannot be falsely ranked where missing.

## Iteration 2 — No duplicate content
Keep personal 41%/59% goal/assist composition in the graphic only. Replace the advanced card `Goal share of points` / `Assist share of points` with team-source contributions. Keep the unique technical normalized G/GP, A/GP and plus-minus/GP in a small dedicated `Scoring mix & pace` disclosure. Remove duplicate legacy POTG/GP and PIM/GP and special-teams percentages.

## Iteration 3 — Add first-party all-time share engine
Pure `BraveBioAllTimeShares` calculator reads only public verified HTO archive, checks all 109 identities, sums observed numeric role values by player ID, computes source-observed share, competition rank, ties, per-stat source coverage, archive-size context. It must reject malformed source, never impute blanks, never mix role-specific goalie wins/shutouts with skater results, and never infer unique games.

## Iteration 4 — Narrative and mobile clarity
Inside the existing Career Trends advanced disclosure: compact **Braves All-Time Contributions** cards show percentage of the published archive field, numerator/denominator, and **#rank / published-player-count** chip with tooltip explaining all 109 historical identities were screened. The rate cards remain separate, with qualified GP minimums. The historical snapshot date is visible. Source holds for attendance remain unaffected. Optional reveal makes niche categories accessible without a dense first screen.

## Iteration 5 — Source coverage and production acceptance
Test all 109 profiles, skaters/goalies/dual-role, missing-source holds, 320/390/625/1280px and the real HTO iframe after release. CI must ensure no changes to the raw HTO files, workbook, award/record tables, video/privacy gates or source forecast. Obtain/rely on founder's request to complete the five-pass content improvement; no user-specific private attendance publication is authorized.

**Meaning of all-time rank:** `#1/57` for goals means first among the **57 historical players who have an HTO-published numeric goal count**, out of the 109 archived profile identities checked. It is *not* a falsely precise `#1/109` and does not assert missing historical totals were zero.
