# LeagueOS + HockeyOS — Approved Direction for the Demo
Date: 2026-11-17 (America/Toronto)
Lead: BruTTech Product Department | Supporting: Engineering, Data & AI, Security & Privacy, QA
Decision status: User-approved PRODUCT AND DEMO DIRECTION. Not a deployed feature, official league authority, contract, launch approval, or authorized payment workflow.
Canonical background: 2026-11-17 five-iteration LeagueOS + HockeyOS proposal and player-voice research; LeagueOS V14 UX, V18 TeamOS bridge, V23–V25 division and roster intelligence, and private playoff/fair-ice scheduler research.

## Demo thesis
**One league subscription; a connected league, captain, team and player hockey experience.**
LeagueOS is the league administrator / public league site. HockeyOS is the player-facing account and personalized hockey home. TeamOS is the captain/team workspace. The league's purchase includes essential team/player functionality; advanced analytics and media features are OPTIONAL upgrades. Players must not need an upgrade to register, pay dues, see official schedules, respond to attendance, receive league notices, correct records, or participate safely.

## Approved product capabilities to show (honestly labeled)
1. **LeagueOS commissioner / public league website:** tenant, season, games, divisions, official standings/statistics, registration and waiver policy, fees/payments, communication, logo moderation, governance case management, playoff brackets, fair ice scheduling, verified source and human approval trail.
2. **TeamOS captain workspace:** roster/invitations, player RSVPs and no-show reminders, spare-player and goalie call-up polls, lineup planning, questions to league with tracked resolution, team-level notifications, logo/colour upload for league review, basic team/player statistics.
3. **HockeyOS player home:** one cross-device login, upcoming games and rinks, RSVP, registration/waiver/payment receipt and current standing, official basic statistics, league/team messages, optional personal history and advanced projections. Responsive installable PWA first; app store distribution is a later business decision.
4. **QR game check-in:** short-lived *game-scoped* QR with authenticated attendance confirmation, eligibility and roster crosscheck, auditable timestamp, replay prevention, manual/offline exceptions; distinct captain/scorekeeper reconciliation and authorized game-sheet signoff. **QR attendance is not automatically a legally/league-valid game-sheet signature.**
5. **Team brand to public league site:** captain submits logo and colours, rights check and moderation, approved assets appear on official team page, scoreboard and standings. Upload does not publish directly.
6. **Flexible divisions:** separation of *StrengthAssessment* (A–D or configurable labels/bands) from *DivisionInstance* (real season/pool membership, name and standings). Support multiple same-strength divisions, mixed-strength divisions, missing grades, any feasible number of divisions. Registrations, true comparable strengths, source-connected games, night/program/age rules, rink inventory, capacity and commissioner approval govern grouping.
7. **Competitive fairness:** verified game results / goal margins / opponent quality / movement history are primary evidence. Individual player history and future projections add a separately flagged, prospectively validated sensitivity layer, never an automatic roster certification or division move. Explain alternative groupings, whole-division impact, confidence, appeals, schedule disruption and human approval.

## Demonstration story: one connected journey
A. **League commissioner** opens the league home, reviews a season, registration/standings and a proposed *configurable* division grouping. Strength label is visually separate from division name. Data source and approval status appear alongside each operation.
B. **Captain** signs into TeamOS, sees next game and attendance, creates a spare-goalie poll, submits a team logo and asks the league for a decision. Show status and moderation states.
C. **Player** enters HockeyOS on mobile, checks registration/payment and next game, responds to RSVP, sees authentic official stats, league notice and eligibility status. Optional advanced analytics distinguished from baseline.
D. **At rink** player scans a fictional game QR; UI records a *simulated attendance attestation* and shows pending scorekeeper/official confirmation, including fallback and duplicate handling. No false 'signed official score sheet' claim.
E. **Back at commissioner view**, authorized game records and approved team logo/status flow to the public website and appropriate team/player read views. Show a clear audit/correction trail.
F. **Fairness demonstration:** use an illustrative 24-team season with 17 teams near A-strength and 7 near D-strength: candidate 'A North' 8, 'A South' 9, 'D Recreational' 7, and no artificial B or C division. These are hypothetical—not actual SVHL realignments. Show schedule/roster evidence holds and human final decision.

## Important existing work: integrate, do not rebuild
- Existing LeagueOS web demonstration with separate LeagueOS and TeamOS research surfaces.
- V18 score/stats review bridge is **browser-local only**, not cross-device federation, registration or official publication.
- V23–V25 source-qualified roster history, division alignment, projected player/team performance; strength projections remain research-grade and player-weighting not prospectively verified.
- Private playoff-rule engine and fair-start-time scheduler have local QA evidence but are **not public operator services**. A real scheduler must receive actual rink inventory and policies.
- Existing 'LeagueOS module UX contract' calls for five main destinations: Overview, Games, Fair Scheduler, Playoffs, Teams. Keep the demo navigable rather than adding a crowded navigation list.

## Scope/status legend for demonstrators
- **Working source view**: dated public official-source read, no editing authority.
- **Interactive draft**: fictional or local browser-stored; no cross-device synchronization.
- **Working scenario**: calculations in a simulation, not official scheduling or roster placement.
- **Research preview**: statistical finding with model uncertainty and no automatic decision.
- **Proposed integration**: signed-in accounts, processor, QR check-in, logo moderation, push notices, shared real-time backend are TARGET FEATURES, not live.
Never imply current SVHL/HTO operator rights, live registration, bank payments, game-sheet signatures, real roster eligibility, facility booking or official league consent.

## Architecture and delivery decisions
- Core entities: LeagueTenant, Season, CompetitionPool, Team, PlayerIdentity, LeagueMembership/Eligibility, StrengthAssessment, DivisionInstance, Registration/Waiver, PaymentLedger, Fixture, AttendanceAttestation, OfficialGameSheet, ScoringEvent, TeamMediaSubmission, Communication, PlacementReview, AuditEvent.
- Access: league > authorized commissioner functions, captain > bounded team functions, player > own profile, scorer/referee > game-specific functions; strong tenant isolation and audit trail. Signed sources, privacy, consent, payments and abuse protection must be designed before real enrollment.
- Backend owns official state and revisions; public website reads approved public projections only.
- Suggested phased order: (1) fictional/pilot tenant and account/RBAC basics, (2) player + captain mobile usability, notices, RSVP and logos, (3) sanctioned registration/payment, (4) secure QR and referee/game-sheet workflow, (5) explainable league fairness, rink scheduling and playoffs with verified inputs.
- Business positioning: competitor apps already handle registration and attendance; differentiate through **connected source-authoritative league operations + verified player identity + fairness/governance intelligence**.

## Acceptance for the DEMO
1. A prospect sees the commissioner -> captain -> player -> game-day -> public league site connection without fabricated production integrations.
2. Both A-strength divisions and missing grades are possible; division IDs/names are independent from descriptive strength grades. Official standings belong to a real season division.
3. Core participation features are included, advanced features clearly optional.
4. Captain no-show RSVP/call-up workflows, team-logo approval and two-way league communication are illustrated.
5. QR is labelled attendance pending official game-sheet approval; manual exception shown.
6. Actual sourced evidence, fictional demo records and research projections are distinctly labelled; no private player contact data or experimental model output is presented as official.
7. Existing LeagueOS/TeamOS/projection/playoff/fair-scheduling implementations remain preserved. No official league/HTO payment, signing, roster, standings, schedule or division writes.
8. Usable desktop and 390px mobile views, accessible role-specific screens and explicit next action for each proposed feature.

## Next execution handoff
Product lead owns this approved direction and demo scope. Engineering should use this record to prepare a staged, reversible, fictional-data interactive demo extension; QA verifies truthful scope labels, all workflows, existing modules and no outbound writes. Security & Privacy reviews identity, consent, player records, uploads and payment/QR assumptions before any real-person pilot. Do not equate saving this brief with deployment approval.
