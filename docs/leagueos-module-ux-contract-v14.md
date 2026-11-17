# LeagueOS — Module & UX Contract v14

**Status:** BruTTech product design contract for the independent Sports Village/SVHL demonstration.  
**Lead:** Product Department. **Environment:** public read-only sources and explicitly browser-local demo drafts.  
**Existing shell:** `widgets/leagueos-platform-v2.js` + `widgets/leagueos-module-shell-v14.js/css`.  
**Module registry:** `widgets/leagueos-feature-hub-v12.js` (22 entries, four product workstreams).

## 1. Design principles

1. **Five primary destinations only:** Overview, Games, Fair Scheduler, Playoffs, Teams. Do not return to a 20-item sidebar. All other functions are searchable within All features and accessible contextually through related tools.
2. **One page = one job:** show purpose and the primary useful action first; technical method, provenance, advanced options and evidence quality go in expandable areas. Do not hide actual source limitations.
3. **Shared module shell:** secondary routes have **LeagueOS → All features → Current module**, concise readiness, an optional About module disclosure, and relevant working-tool links. Main routes deliberately omit the secondary shell to prevent double navigation.
4. **One status vocabulary, grounded in authority:** *Working source view* (dated public snapshot), *Interactive draft* (browser-only), *Working scenario* (hypothetical engine), *Research review* (source-constrained analysis), *Proposed integration* (no real provider), *UI concept · not connected* (visual and local fictional controls). These are not interchangeable with *official/production/approved*.
5. **No dead ends:** every route includes an explanation or a link to its next task. Planned features have coherent UI concept pages rather than deceptive active approval buttons.
6. **Responsive by design:** target 1440px desktop and 390px mobile; no body horizontal overflow. Wide ladders, tables and rink grids can scroll within their own labeled regions.
7. **Accessibility:** semantic page headings, explicit labels, keyboard-visible focus, status changes announced via `role=status` when appropriate, descriptive navigation, not color-only meaning.
8. **Preserve established data and modules:** do not change Brave H.C. TeamOS/HTO or overwrite official game/league records when implementing UI improvements.

## 2. Existing and future module structure

| Workstream | Current route group | Data or workflow authority |
|---|---|---|
| Games, teams, registration | calendar, teams, standings, scoring, registration, rules | Dated public SVHL source or browser-local fictional form |
| Season and arena | planner, playoffs, schedule audit, ice evidence and inquiries | Historic source patterns and local scenarios; **not bookable ice** |
| Competitive balance and intelligence | division health, alignment, whole-division fairness, decision desk, history, intelligence | Research evidence; no placement or discipline approval |
| Commercial and future operations | payments proposal, player eligibility UI, discipline/video UI, referee/facility UI | **No connected processor, player verification, live case video, referee assignment or facility authorization** |

New UI concepts in V14:

- `#league-eligibility-preview`: fictional cross-night call-up preflight. Four illustrated checklist steps and an export with `authority: NONE`. Requires authenticated roster source, identity verification, applicable policy and signed review before operational use.
- `#league-discipline-preview`: fictional disputed-penalty case lifecycle. Shows intake, evidence rights, response and appeal structure. No real case/video or sanctions.
- `#league-officials-preview`: illustrates authority separation among league scheduler, facility and referees. The historical rink/start patterns show scheduling conventions **only**, not contractual ice or assignments.

All three record checkbox progress in **sessionStorage in the current tab**, support reset and export a clearly nonofficial concept JSON. Never request actual identifying player/case data in the public demo.

## 3. Contract for adding the next module

To add a module, a developer must:

1. Assign one module `id`, unique route and single clear user goal.
2. Add its product metadata and honest readiness label to the canonical 22+ feature catalog.
3. Implement its page inside the existing LeagueOS workspace. Use `LeagueOSShellV14.decorate(route)` and add focused related routes rather than another navigation system.
4. State exactly which data is sourced, fictional, local-only, unknown or not connected. Use official source references where they exist and do not infer player identity or facility availability.
5. Separate validation from authorization: a checked UI step, generated scenario or exported JSON must never be treated as approved.
6. Provide explicit next action, safe failure/retry, input state and mobile behavior.
7. Test: direct navigation, existing TeamOS separation, 390px no body overflow, zero unexpected HTTP writes, back/next related paths, no false operational authority, and regressions for planner, brackets, game sheets and full catalog.
8. Update the living LeagueOS product record and release QA before merging. Merge under review branch, then separately test GitHub Pages after propagation.

## 4. Acceptance gates

**UI acceptance:** all catalog entries have working routes; status is truthful; primary navigation remains five items; mobile screens are usable; keyboard interactions are labeled; output clearly marked draft or concept.

**Data authority:** source snapshot dates visible; no guessed current official results, league enrollments, bookings or eligibility; public-only use; no cross-domain private roster transfers.

**Security/governance:** official actions remain disabled until authentication/authorization, privacy assessment, audit retention, server-side validation and appropriate league/facility approval exist.

**Commercial demo:** a prospective commissioner can start with Games, use Fair Scheduler and Playoffs, inspect a division review, then navigate all features without explanation or fabricated production integrations.

**Non-goal:** this contract does not authorize production deployment, use of real identities/case video, payment processing or actual league publication.
