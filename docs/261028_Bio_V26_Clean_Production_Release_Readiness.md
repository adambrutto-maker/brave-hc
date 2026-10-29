# HockeyOS Bio V2.6 — clean production release candidate

**Prepared:** October 28, 2026 (America/Toronto). **Lead:** BruTTech Engineering.
**Status:** REVIEW AND FOUNDER VISUAL APPROVAL REQUIRED; NOT A PRODUCTION DEPLOYMENT.

## Why this clean candidate exists

Bio design PR #158 was started before the already-deployed Highlights historical leadership repair (#159), 109-profile audit (#161), and public review preview (#162). It is no longer safe to merge that older development branch indiscriminately: it could replace newer standings/Highlights/projection source files.

This branch starts from current public main commit a9af7633de63ad6612d262734e08ee51520cb55e and copies ONLY intentionally scoped V2.6 Player Bio app files, analytics, tests, documentation and QA workflow. It does not copy the prior developer branch's outdated standings, homepage projection, Highlights scripts or leadership source. The official HTO Bio remains production V1 until a separate approved merge.

## Accessible interactive source-faithful preview

https://adambrutto-maker.github.io/brave-hc/widgets/player-bio-v25-preview.html?playerID=354060&embed=1

The standalone preview is independently live, tested on all 109 IDs, and uses **current main public data**. It has the same candidate presentation but is **not wired into the official HTO iframe**. Other verified preview IDs: Stephen Logue 354055, Dylan Brennan 525407.

## What would change upon final authorized production publication

- Replace the official public player-bio.html, player-bio-premium.js, and add isolated advanced, rolling-career, trend-arrow, source-title and collection-style files. The HTO player Bio iframe already references the production player-bio.html URL and therefore changes automatically after main deployment.
- Exactly three collections: Production / Trends / Coaching, in the approved premium Milestone-style layout.
- Actual G/A bars remain unnormalized. A separate Pts/GP right axis uses two decimals; past-only GP-weighted rolling career reference and optional full-career retrospective comparison use a consistent Actual / Winter / Summer basis.
- Gold **RR** and gold **AR** markers reflect documented Rocket Richard and Art Ross winner seasons. Selecting a season shows the explicit source title and scope. Only the UI changes; official HTO awards/records never change.
- White horizontal **Neutral · Rookie Year** marker when no established career comparison exists; genuine workbook veterans retain sigma-scaled arrows centered on zero, with original five categories and original homepage model.
- No context-free Peak Season tile. A single source-qualified career scoring pace remains matched to chart basis. Display Pts/GP to two decimals, projected GP to one decimal, full precision in models.
- The same original/current public homepage projection.json feed is used. There are no fabricated game-level Last 3/5/10 Pts/GP rates, numeric goalie starts/wins predictions, privately annotated tactical clips, uncalibrated opponent scoring multipliers, or unauthorized CMS writes.

## Preserved high-value sources

The clean candidate deliberately does not change:
- widgets/player-highlights.html or widgets/player-highlights-v2.js, including live Dylan Brennan Captain/history correction;
- widgets/player-highlights-leadership-parity.js and widgets/player-bio-leadership.json;
- widgets/projection.json — the newer HTO-fed workbook projection that powers the homepage;
- widgets/standings.json, all 109 identity links, saved historical award source, official Records or stats source;
- original private Brave H.C. Master Workbook and HTO CMS editors.

## Acceptance / release gates

1. The complete 109-profile premium and legacy browser regressions, mixed-role/career holds, 320/390/625/1280 layouts, exact Pts/GP axis, RR/AR source badges and Rookie visual state pass.
2. All 56 published model / normalization / role / source parity tests pass. The official source workbook and live 109-profile legacy source remain unchanged.
3. New independent hosted CI runs with the latest GitHub main feed and checks the public source inputs; no unreviewed new award or coaching material is included.
4. The founder reviews the already-live interactive preview for visual acceptance, explicitly authorizes changing the live Bio, and the release PR is merged using standard reviewed GitHub operations (no force push).
5. After official Pages deployment, verify the real HTO iframe on a skater, goalie, historical player and captain/leadership profile. Save deployment SHA, source receipt and the previous live Bio HTML/CSS/JS for a revert commit if necessary.
6. Continue separate held advanced-data work in BIO-V2 #156; currently incomplete game participation evidence must not produce manufactured recent-form windows.

**Current decision:** clean candidate is staged for QA and founder approval; the live HTO Bio is not modified by opening this PR. Rollback on release defects should revert the eventual approved merge commit using a new reviewed commit without resetting unrelated standings or Highlights changes.
