# LeagueOS + HockeyOS V26 — Connected demo implementation and release record

Date: November 17, 2026 (Toronto local)
Lead: Product Department (approved scope) / Engineering Department (implementation)
Status: Controlled fictional-data candidate; no official league rights, payment processor, cross-device identities or backend write paths.

## Controlling document and scope

Source of truth: `docs/LEAGUEOS_HOCKEYOS_DEMO_DIRECTION_APPROVED_261117.md`, copied from the separately saved Product-approved direction on BRUTTECH 1. This brief controls the user-approved product/demonstration journey. Preserve the distinction between that approved **direction** and any actual official league approval.

The product thesis: **one league subscription, connected commissioner, TeamOS captain, HockeyOS player, game-day, and public league experience**. Core attendance/registration/schedule/notices/statistics must never be gated behind a premium analytics upgrade. Optional intelligence/media can be upsold only after core participation works.

## Scope implemented from the saved brief

1. Commissioner: current fictional 12/12 divisions, strength assessments A–D independently stored from division IDs/names, proposed A North (8), A South (9), D Recreational (7). Missing B and C remain absent. Target size can change the number of A-strength divisions. One orphan B-team scenario is held instead of forming an unplayable division.
2. Week-5 and midseason review: simulated review and separately simulated publication; no direct official standings/schedule change. After week 12 the fictional division lock prevents further movement. The SVHL rulebook specifies the week-five realignment and points carried; the midseason final lock is a **proposed additional operator policy**, not presently attributed to SVHL.
3. TeamOS captain: local no-show reminder count, goalie spare-callup poll, player RSVP visibility, fictional crest/colour submission requiring separate simulated commissioner moderation, two-way league question/reply case.
4. HockeyOS player: fictional registration, subsequent sample waiver, $0 nontransaction receipt, attendance RSVP, next fictional fixture, baseline participation features and optional analytics distinctly labelled.
5. Rink: short-lived fake QR graphic that is **not an actual scannable or authenticated token**. Player registration, waiver and IN status gate simulated check-in. Duplicate/replay and expiry controls work only inside the browser-local story. Scorekeeper review remains **not** an official game-sheet signature; manual exception stays pending.
6. Public page: displays only fictional published divisions, moderated fictional crest and acknowledged status while clearly separating real-source Cristillo memorial identity and prior V25 source-qualified research. Avoid importing the actual Brave H.C. roster into the fictional tenant.
7. Cross-role audit: browser-local event sequence, scoped roles, deliberate no-official-action flags, inspectable JSON receipt and reset.

Implementation artifacts:
- `widgets/leagueos-connected-fictional-v26.json`, generated from `scripts/build_leagueos_connected_fictional_v26.cjs`.
- `widgets/leagueos-connected-demo-v26.js` and CSS; route `#league-connected-demo` for commissioner and `#team-connected-demo` for HockeyOS/TeamOS entry.
- Dedicated QA unit and browser tests in `tests/test_leagueos_connected_v26.cjs` and `tests/qa_leagueos_connected_v26.cjs`.
- Existing V18–V25 source-gated modules preserved; connected demo reachable through secondary navigation to avoid crowding the established site.

## Security, privacy and regulatory boundaries

All teams and player identities in the connected demo are fictional. Browser localStorage is not an identity system or shared tenant backend and cannot enforce real tenant-role access. Artwork is a selection from three original fictional presets; no file upload, rights verification or league website publishing occurs. A sample receipt is a no-charge illustrative document: no processing, account, invoice, real payment or actual waiver acceptance. The QR is a visual interaction with a bounded local attestation state, not a cryptographically verifiable QR credential, roster eligibility certificate, referee signature or official game-sheet approval. No external messages, stored personal data, operator roles, verified live subscription, registration, roster, game, standings, rink time or league-level update is claimed.

A future controlled pilot requires identity and role access, tenant isolation, consent, session and token design, payment-service security, brand rights moderation, immutable audit and authorized scorekeeper/referee approvals. Those future components are **proposed integration**, not existing execution in V26.

## Acceptance and measurement

- The controlling Product-approved brief is present in the branch and retained unchanged.
- The default proposal is exactly three divisions with team memberships 8/9/7, graded A/A/D, and no phantom B/C.
- The commissioner can change target size (e.g. 6 creates A North/A Central/A South plus D), with conservation of all 24 teams. Fake review and publication are separate and stop after the final lock.
- Captain and player workflows share the same **browser-local** fictional state, not real cross-device synchronization.
- QR local-flow rejects a missing waiver, missing IN RSVP, expiry and duplicate scans; scorekeeper review remains unsigned.
- The original source-qualified HockeyOS and LeagueOS V18–V25 screens remain functional on desktop and 390px mobile with no JS page exceptions or HTTP writes.
- No league, HTO, payment, player account, team media, source game sheet, official placement or schedule changes.

Local test evidence:
- V26 unit source and state tests: 27/27 passed.
- Historical and existing source unit suite V18–V25 together with V26: 185/185 passed.
- Python public source guards: 15/15 passed.
- V26 Edge desktop/mobile browser: 57/57 passed, HTTP writes 0, official changes 0.
- The inherited V18–V25 browser suite must be repeated against staged and hosted versions before final release and documented from actual receipts.
- Publishing requires PR review/merge, two Pages deployment confirmations and live browser acceptance.

## Commercial demonstration and next operations

Buyer-facing opening: **Competitive divisions based on evidence, backed by a connected player and team experience.** Present this as a product workflow rather than a claim that already signed-up arenas have installed it. Competitive-balance historical validation remains observational; roster-aware incremental predictive gains and causal reduction in blowouts are not yet demonstrated.

Suggested tour: Commissioner → captain reminders/logo/question → HockeyOS registration/waiver/no-charge receipt/RSVP → fictional rink QR and pending scorekeeper check → league moderation → fictional public league page → V25 source-qualified division and player-projection evidence.

After V26: split this fictional in-browser story into permissioned backend services only with written authorized pilot scope; develop tenant/account login, payment/waiver processing, QR replay security, brand moderation, and official commissioner/schedule approval in separate gated releases. Keep the default LeagueOS, HockeyOS and TeamOS core participation features bundled.
