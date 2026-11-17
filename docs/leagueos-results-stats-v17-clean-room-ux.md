# LeagueOS V17 — Independent League Results & Statistics Workflow

**Date:** November 17, 2026 (America/Toronto)  
**Lead:** BruTTech Product Department  
**Product:** LeagueOS, one-website independent Sports Village/SVHL concept demo  
**Existing website:** `widgets/leagueos-team-os-demo.html`  
**UX implementation:** `widgets/leagueos-native-scorer-v15.js` + `widgets/leagueos-results-stats-v17.css`, within existing `#league-scoring` internal screen.

## Source of ideas — strict clean-room separation from HockeyOS TeamOS/HTO

The founder asked to borrow useful **design ideas** from the team-side HTO/HockeyOS experience for league results/statistics entry, **without using or taking HTO code**. We reviewed *rendered and user-visible* TeamOS routes in a Chromium browser, not HTO source code:

- Team Home puts **one game card** at the centre of the team's weekly tasks.
- The visible team workflow moves from fixture context through **availability → manager roster/goalie/lineup review → approved recap/statistics**.
- It distinguishes **available** from **assigned**, and a prepared draft from a **manager-approved** lineup.
- Published league records and the team's manager-only decisions have separate authority and privacy boundaries.
- The team website already shows game statistics as source-qualified outputs.

V17 independently implements a **league-side** flow. The commonality is user-experience philosophy, not copied markup, JS, CSS, licensed media, private players or data. No HTO source files or production components were modified.

## One website, one game-centred workflow

**Main entry:** Open LeagueOS. Select **Find a Game**, then **Enter practice results & stats** (or navigate via the existing All Features catalog). There is no new standalone statistics website or second login.

**Core task:** Select source-listed published fixture → record events if desired → enter final result → attach anonymous jersey stats → review → export practice draft.

The five existing primary LeagueOS navigation choices, three original game-mode cards, 22 feature catalog entries and source-qualified guided tour remain unchanged. Internal route changes never open a separate website.

## V17 functional design

### 1. Events — optional detail
Preserve the existing visual game scorer: goals/shot/penalty event pad, Home/Away practice-goal buttons, optional clock/period/jersey/note and local event log. Add structured first/second assist jersey fields to manual goal entry. Every event is stored against the selected source fixture *only* in the current browser's local draft.

### 2. Final result — quick entry, without requiring event-by-event logging
Two big Home/Away score stepper controls. Choose **Regulation, Overtime, Shootout or Draw**. A drawn outcome requires equal scores; a win requires unequal scores. Save to a **local-only draft result** with capture time; it does NOT change official scores, standings or game status.

A final score can be entered directly. Goal-event totals are independent, and the UI labels whether they match, are not yet recorded, or differ. A different tally is **not silently reconciled** or treated as authoritative evidence.

### 3. Player stats — calculated from actual entered practice events
Attach fictional/unverified jersey numbers to goal/shot/penalty events; attach up to two distinct assists to a goal. Duplicate assist numbers or the scorer as their own assist are rejected. Aggregate by **fixture + team side + jersey**:

- G = recorded goal events associated with that jersey;
- A = recorded distinct assist associations to goals;
- PTS = G + A;
- Shot events = explicitly recorded shot event count (not a claim of official shots-on-goal data);
- PIM = recorded practice penalty minutes.

The view explicitly tracks unassigned goals and does **not** equate jersey numbers to verified player identities or infer games played, eligibility, authenticated rosters, or season totals.

### 4. Summary and Review — evidence and release gate
The prior scorer summary and four explicit, unresolved production-authorization holds remain. The review screen also shows whether a local result is saved and whether it agrees with entered goal events. Real source/league officials are not authenticated; therefore there is no real Publish, Approve or Complete Match button in the demo.

### 5. Export and scope
The existing scorer export schema `bruttech-leagueos-native-scorer-v15` remains backward-compatible for earlier demos; the new optional `v17` field identifies `bruttech-leagueos-result-stats-entry/v17` and exports result, player-stat aggregates, and reconciliation status. Exports always contain `officialScorePublished:false`, `BROWSER_LOCAL_PRACTICE_NOT_OFFICIAL`, and no private player names. Data stays browser-local; HTTP requests remain GET/HEAD only.

## Source authority & future production work

V17 uses the dated Nov 16 source-qualified upcoming fixture list for team names, rink and game identity. It is not an authorized or current match-management service. Before actual league operations, add:

1. Staff authentication and league/season/division permissions.
2. An authorized roster/identity source plus privacy controls (no automatic copying of HTO manager-only data).
3. Versioned signed game-sheet capture with clock, scorer, assists, goalie data and official evidence validation.
4. League-specific score/result/OT rules, source-of-truth reconciliation and referee/commissioner approvals.
5. Authorized publication API, complete immutable audit and error recovery.
6. Explicit integration contract with team-side HockeyOS that sends **only league-approved result/stat fields**, never private attendance, manager notes or roster drafts.

## Regression and acceptance

Local Chromium acceptance on authorized HOME BRUTTECH 1 / AdamPCDesktop:

- V17 result and stats workflow: **15/15 PASS** (source fixture selection, direct score entry, draw/win validation, mismatch detection, home/away anonymous jersey stat tagging, two assists, duplicate rejection, penalty and shot event aggregates, manual detail goal entry, export, 4 production holds, per-game isolation, 390px mobile and TeamOS separation).
- V16 visual gamepad-first UX: 16/16 PASS.
- V15 scorer and Scouting Room: 15/15 PASS.
- V14 common module shell: 14/14 PASS.
- V13 commissioner tour: 14/14 PASS.
- V12 all-feature and division review: 13/13 PASS.
- V11 bracket and schedule/CSV/print: 17/17 PASS.
- V10 simple navigation: 14/14 PASS.
- V8 source ice/series validation: 18/18 PASS.
- Historical scheduling for four league nights: 4/4 PASS.

**Total: 140/140 local browser checks PASS.** No missed asset, browser JS exception, 390px horizontal document overflow or server mutation. Evidence is filed in canonical HOME research folder under `LEAGUEOS_V17_*QA.json` and `v17_*.png`.

**Release gate:** merge V17 into the existing one-site demo only after review, then independently verify published GitHub Pages and rerun hosted regression. User visual approval and official production authority remain separate.
