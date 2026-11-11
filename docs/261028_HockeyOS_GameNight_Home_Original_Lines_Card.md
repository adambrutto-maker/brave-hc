# HockeyOS Home — Original Brave H.C. Game-Night Lines card

Date: October 28, 2026. Lead: Engineering. Status: REVIEW-ONLY CANDIDATE — not live on HTO Home.

## Objective

Place the familiar dressing-room lineup card below Home's next-game countdown. Make manager-approved game-night assignments use the same source, game version and player IDs as individual Bio Coaching. Reuse the existing attendance/lineup scripts rather than building a second staffing authority.

## Exact original workbook reference

Master: D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx

SHA-256: 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154

Visible card: Lines!G5:J16. The 16 allowed input cells are C7:E9, C12:D14, and D16. The original card has LW/C/RW across three forward rows, LD/RD across three defense pairs, line OVR ratings, a GOALTENDER row, large authentic Braves horse crest, navy/white colors and literal dashes in unused positions. Exactly two rotating centres occupy D7/D8. D9 is always a dash.

The official printed artifact is still the original Excel renderer: landscape Letter, one-page, 300 DPI (3300x2550) source output. This new browser preview follows the original card's structure and appearance, not a fresh infographic. Final print and formula authority stay in Excel; visual screen similarity does not establish pixel-identical print/export parity.

## HTO Home embed and fixed-height problem

The existing official HTO Home countdown module has an iframe linking to widgets/countdown.html?embed=1 with height 245 px. Appending the lineup inside that frame would CLIP it. Current standalone preview widgets/game-night-home-preview.html shows countdown followed by the card. The separate view widgets/game-night-home-preview.html?lineupOnly=1&embed=1 hides the duplicate countdown so a second iframe can eventually sit just BELOW the original module.

Proposed *future* HTO content-module embed, NOT YET INSTALLED:

    <iframe title="Brave H.C. Game-Night Lines"
      src="https://adambrutto-maker.github.io/brave-hc/widgets/game-night-home-preview.html?lineupOnly=1&amp;embed=1"
      width="100%" height="950"
      style="display:block;width:100%;border:0;background:#07192b"
      loading="lazy" scrolling="auto"></iframe>

Phones can scroll horizontally inside the card so the four original columns and jersey text remain legible. Do not shrink the entire landscape card to unreadable microtext.

## Source contract and public-vs-private boundary

Current public countdown source: widgets/countdown.json, HTO official game identity. Current public game-night source: widgets/game-night-lineup-public.json, status AWAITING_MANAGER_APPROVAL, **no names/votes**.

widgets/game-night-lineup-contract.js is the pure common validator for both Home and Bio:
- currentFixture(countdown,now): exact HTO game ID, date and cutoff.
- confirm(publicFeed,countdown,identityResolver,now): requires matching official fixture, exact Excel template source hash, all 16 allowed cells, verified roster and goalie booking, current revision fingerprint, formal manager approval and public-release authorization. If ANY check fails, all slots display literal dashes.
- assignmentForPlayer(result,htoPlayerId): returns one manager-approved public role/unit for Bio Coaching, never a private poll vote or private skill instruction.

Ratings (OVR) appear only when true Excel parity is source-verified. Duplicate, unknown, scratched or malformed player bindings must be rejected by the upstream approved roster and this gate; third-centre fabrication, wrong game, stale/revoked approval, missing goalie or missing evidence make the card blank. Public source data never contains individual WhatsApp poll ballots.

## Real source workflow

Private local pipeline: D:\BruTTech\Products\HockeyOS\attendance_automation_v0_1.

Use its existing whatsapp_poll_snapshot_adapter.py, whatsapp_lineup_readonly_bridge.py, roster/call-up/goalie reconciliation, lineup_optimizer.py, private_card_draft.py, lineup_card_original_workbook_bindings.py and render_private_card.py. Do not duplicate manager decisions or workbook formatting.

The November 1 Alumni and Call-Ups native WhatsApp polls were manually posted October 28, but complete named-vote history, automatic collection, booked goalie proof and final approved lineup have NOT been certified. A WhatsApp Yes means available, not invited, accepted or assigned. The local manager can work on a private source-bound proposal; the public browser must NOT expose it.

A commissioned and authenticated publisher must eventually make a sanitized public game-lineup JSON after founder approval of a SPECIFIC game/version. The browser reads it with no-store on a 60-second cycle and on focus/visibility, withdrawing names on a changed/missing approval. This is NOT a direct WhatsApp live-vote connector; the missing poll/source collector and manager release gate are separate work to finish.

## Profile link

Bio Coaching uses the same source contract. If the published manager-approved card assigns player X as C on Line 2, their public Bio can show this verified assignment. General C/RW/LW/LD/RD/G strategy remains educational. Private opponent-player matchup notes, individual coaching history, role development and reviewed video require authenticated coach authorization and a separate nonpublic datastore.

## Files and QA

- widgets/game-night-home-preview.html
- widgets/game-night-lineup.css
- widgets/game-night-lineup.js
- widgets/game-night-lineup-contract.js
- widgets/game-night-lineup-public.json — held, no named votes
- tests/test_game_night_lineup_contract.cjs
- tests/test_game_night_lineup_browser.cjs

Seven pure tests plus 390/800/1180 browser tests pass. A synthetic QA-approved card fills all 15 legal player positions with original D9 dash, and approval withdrawal clears those names. Synthetic screenshots are explicitly watermarked NOT A REAL LINEUP. Original private Excel, HTO pages, current countdown and WhatsApp polls were not modified or sent.

## Remaining release acceptance

1. Commission authorized read-only, full named FT/CU/G vote collection with revisions/identities bound to the exact next HTO game.
2. Reconcile FT/paid goalie bookings, reservations, call-up acceptance, scratches, role flexibility and legal formations under one active version.
3. Verify original Excel OVR calculations, visual print parity and one-page original card.
4. Commission source versioned private manager screen; approval revocation and conflicting poll views must invalidate lineup candidates.
5. Founder approves both the particular lineup version and any authorized public disclosure.
6. Verify Home HTO iframe and real HTO Bio player roles use the identical approved game/revision after a 60-second refresh.
7. Separate QA/security and explicit HTO Home CMS publication approval. Maintain rollback receipts.

Release decision: visual and read-only public preview contract staged; source polling, manager publisher, and Home CMS insertion are NOT live.
