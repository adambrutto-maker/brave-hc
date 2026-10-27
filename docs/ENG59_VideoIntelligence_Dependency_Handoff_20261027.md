# ENG CHAT 59 → HockeyOS Video Intelligence | Scoped Engineering Dependency Handoff
**Date:** 2026-10-27 · **Owner:** ENG CHAT 59 / HOS-IP-03 + HOS-IP-09 · **Destination:** HOS-IP-05/06/07 Engineering (read-only contract coordination).
**Controlling master:** `261021_BraveHC_HockeyOS_Work_Implementation_Master_Register.json` v1.0; **192 existing task IDs and 10 plan IDs preserved**. This is not a new implementation plan or production authorization.

## 1. Inspected shared input and current verifiable result

Existing **unmodified** shared contract at `Implementation Control/VideoUnderstanding_20261027_CANDIDATE`: `HOCKEYOS_SHARED_VIDEO_OBSERVATION_V0_1` Game363; 15 events (10 scoreboard changes, four penalty ledger entries without mapped video, one reviewed save candidate). Shadow `HOCKEYOS_VIDEO_CONSUMER_SHADOW_PROJECTION_V0_1` already states **INSUFFICIENT_VIDEO**, zero actual-play features, no video strength, no broadcast reframing eligibility, no official writes. Game363 operator review is **not** independent acceptance. Live actual-play classification, calibrated opponent-aware feature rates and formal video team strengths do not exist as accepted data.

A new **read-only consumer** at `widgets/video-strength-evidence.js` checks the pilot's version, source lineage, SHA256 binding between observation JSON and shadow projection, event identity and source hashes, unique IDs, per-consumer counts and explicit no-promotion gates. Against the real private pilot it returned `INSUFFICIENT_VIDEO`, `videoScore: null`, `acceptedPerformanceMeasurements: 0`. No private video, source media or detector/Studio/Broadcast code was copied or changed.

## 2. Single-contract fields Video Intelligence must supply (not a second detector)

| Evidence contract | Required producer-provided fields | ENG59 consumer handling |
|---|---|---|
| Game scope / source | Canonical game ID **plus** exact source game IDs, league ID, season, division **at the game date**, current team division separately, opponent source team ID, home/away, game date, rink, camera ID, era, roster epoch, original source/page SHA256 | Reject VAHL, invented franchise continuity, unknown opponent/tier, unverified game-to-video join |
| Custody / timebase | Video source SHA256, provider and PANO part, lawful source role/rights and expiry, permitted observation windows, video seconds start/end, period/clock anchor and uncertainty, known replay/stoppage/seam | No hidden video acquisition; reject non-rights-cleared or unanchored strength features |
| Immutable event provenance | Stable EventID, source EventID, revision/supersession chain, detector version, event family/subtype, moving-play state, actor/team candidate IDs and identity uncertainty, observed/inferred/uncertain label | No duplicate goals or player IDs from cues; corrections require replacement lineage |
| Actual-play measurements | Controlled zone entries/exits, pressure/zone time, chances and shots by subtype, rush threat and containment, puck recoveries, blocks, turnovers, saves/rebounds, penalty pressure | Keep counts and observed temporal windows **separate from official HTO goals, shots, GP and PIM** |
| Fair denominators | Covered moving-play seconds, verified possessions/opportunities by family, observed team/opponent minutes, blocked/occluded time, camera coverage fraction, shift/lineup evidence, missed plays and sampling policy | Never use absent evidence as zero or treat a spectacular highlight as game-representative |
| Quality / authority | Event-family precision/recall, false-negative review, timing reliability and error intervals, camera/jersey calibration, independent reviewer decision and receipt, rights classification | A developer pass or operator label does not authorize source-stat ingestion |
| Competitive calibration | Exact opponent source level, competition/tier/era, source-qualified head-to-head and common-opponent bridge IDs, opponent strength estimate provenance, cross-tier backtest, held-out opponents/rinks/years, uncertainty intervals and validated thresholds | Evaluate **only** as a separate provisional layer; do not equate divisions by name or calibrate from the same results used as both target and predictor |

The optional future package prototype is `HOCKEYOS_SCOUT_VIDEO_FEATURE_EVIDENCE_V0_1`, with an independent, versioned coverage policy `HOCKEYOS_VIDEO_STRENGTH_ACCEPTED_COVERAGE_POLICY_V0_1`. These are **ENG59 intake boundaries**, not a request for Video Intelligence to change its upstream producer schema or an assertion the schema is independently approved. Mapping to upstream data needs joint CTRL-02/EVT-01 single-contract review before live integration.

## 3. Qualification rules and required gates

- **P0:** Exact source/league/season/team IDs and source SHA256 must reconcile to the approved shared observation and official SVHL evidence. Treat timeline source clock, score-change clock and actual goal-line timestamp as different measurements. Preserve observed/inferred/uncertain states.
- **P0:** Accepted on-ice team identities, detector/event-class QA and non-overlapping source windows are required. A player ID from an uncertain jersey or omitted current roster is held, never inferred from a name.
- **P0:** Rights-permitted video, segment coverage, observation minutes and **family-specific opportunity denominators** must be independently verified. Source qualification and safe access take precedence over larger sample counts.
- **P1:** Representative sample size, opponent diversity, minimum moving-play seconds, camera coverage, held-out rinks/seasons and opponent-tier/cross-division bridge coverage must be set in a **reviewed, independently approved policy**. ENG59 has **not** invented numeric approval thresholds.
- **P1:** Independent event-family precision/recall and reliability evidence; unbiased held-out opponents and games; quality-of-competition, season/era and lineup continuity; uncertainty/selection-bias sensitivities. A manual Game363 clip, scoreboard change or single cross-division win is not sufficient.
- **P2:** Only when upstream evidence and policy are accepted should this layer become eligible for **separate independent calibration evaluation**. This is still **not** permission to alter accepted `contextIndex`, league strength, official divisions, records, Awards or player profiles. A further explicit model/release approval would be required.

**Failure/absence rule:** return `INSUFFICIENT_VIDEO` with null score and explicit reasons. Never assign 0 strength because footage is missing. Read-only test `tests/test_video_strength_evidence.cjs` verifies source/hashes, no-score leakage, false-promotion and source-only opponent bridges.

## 4. Reuse of current strength evidence and calibration constraints

Existing `division-fit-model.js` + `league-intelligence.json` are already source-stamped and separate from historical roster-era context in `roster-era-strength.js`. The current accepted graph includes adult Sunday Fazzari / Cristillo / Remax, historic result links, and within/current-division head-to-head observations. `opponentBridgeInventory()` now **reuses the very same game graph** rather than constructing a rival match database. It exposes per-team distinct source-verified opponents, cross-current-division opponents, per-division bridge game counts and teams without bridge coverage; it never labels current divisions equally strong or infers official game IDs where the feed lacks them.

The historical GameInfo ledger remains **2,069 complete / 137 held** over **2,206** scoped game pages. The 137 source holds, of which 39 are roster-identity qualifications, remain separate from video. ENG59's 17-case private source-owner worksheet is pending actual team registration decisions; no video cue may resolve or bypass that hold. No VAHL mixing.

## 5. Department ownership, handoff and acceptance

**Video Intelligence Engineering (HOS-IP-05/06/07)** supplies source-permitted observations, moving-play features, validated identity/timebase, QA decisions, per-event opportunity denominators and event-lineage signatures. Studio/Broadcast V3/Virtual Camera V5.1 remain exclusively their source ownership.

**ENG CHAT 59 (HOS-IP-03/09; HIS-03/HIS-06, INTEL-01, OPP-01/02)** owns opponent/opportunity linkage, schedule/era adjustment, division bridge inventory, a read-only consumer and an empirically validated tier-relative research evaluation once valid data arrives. ENG59 will not merge experimental play values into current released index/scenarios without an independent acceptance gate.

**Actual acceptance as of this handoff:** real Game363 pilot validated as `INSUFFICIENT_VIDEO` in read-only mode; synthetic adapter and existing graph tests pass. **Not independently accepted, not calibrated, not deployed**. Public scouting PRs #120–125 and ENG59 draft PR #128 remain under their separate source/release approvals. No message, schedule, footage copy, automatic division move or production publish is authorized.

## 6. ENG59 implementation continuation (division-facing shadow interface)

- In addition to the pure adapter, `widgets/division-fit-lab.html/js` now exposes a **source-only** video research readiness panel. It calls `opponentBridgeInventory()` on the **already source-admitted** `BraveDivisionFit.analyze` result; it does not fetch private shared-video candidate files. The panel shows source-verified cross-current-division games, teams with/without direct bridges and clear `INSUFFICIENT_VIDEO` status, without changing `contextIndex`, team ranking, division scenarios or any published record.
- Desktop and 358px browser smoke checks passed after merging current `origin/main` (independent player Awards/Bio artwork and countdown changes preserved). The Video Intelligence team can iterate on its own input contract while the ENG59 consumer remains separate and strictly read-only.

## 7. Official GameInfo identity crosswalk — subsequent ENG59 implementation

**New verified developer finding:** All **54/54** current adult Sunday source-qualified SVHL team/date matchups now join **one-to-one** to distinct official `gameinfo.aspx` game IDs, exact reciprocal home/away goals and their archived official page SHA256. These include **19/19** cross-current-division opponent matches. This is a read-only *game identity and score parity* crosswalk, not a player-scoring reconciliation or cross-division talent calibration. Two GameInfo pages retain separate held player/roster scoring events.

- Deterministic asset: `widgets/svhl-official-game-id-bridges.json`; rebuilt using `scripts/build_svhl_official_game_id_bridges.cjs` and checked byte-for-byte with `--check`. This reuses `division-fit-model.js`'s original 54-date/team graph and the separately captured 54 official GameInfo pages; no new collector or official source write.
- Each joined row carries `officialGameId`, `officialLeagueId`, source team IDs, game date, home/away published score, `officialGameInfoURL`, page SHA256, current division-pair context, cross-current-division marker and separate **player goal-sheet hold** classification.
- `widgets/video-strength-evidence.js` exposes `officialGameIdentityCoverage(existingAnalysis, officialCrosswalk)`. It rejects duplicated/changed IDs, incorrect score margins, team-pair mismatches, source URL/hash omissions, source-scoring promotion and altered divisions. Output remains `OFFICIAL_SOURCE_GAME_IDS_VERIFIED_VIDEO_INSUFFICIENT` with a **null** video rating. It does not feed video to a league or division rank.
- The **existing** Division Fit Lab now optionally displays `54/54` exact official IDs, the 19 official cross-current-division games as expandable source links, and the 2 held player scoring sheets. If the optional crosswalk is missing, the existing league and division scenario results remain available and the video panel visibly holds identity integration.
- A verified official game ID makes future source-to-video joins testable but **does not** prove that a LiveBarn clip belongs to a particular player/game without independent camera/date/clock provenance. The parallel Video Intelligence team should send `GameID` plus official `leagueid=570&gameid=...`, original video hash, game-date team mapping and temporal coverage/clock error instead of relying on current team names or source-time heuristics.

**Accepted technical scope:** Current season 570, adult 22-team scope, exact reciprocal games only; earlier seasons require separate season-specific official GameInfo and roster/era joins. Zero video features accepted for calibration, no published team strength rating, no official division assignment, no score/workbook change. Existing source-qualified scouting and subsequent author-accepted media work remain untouched.
