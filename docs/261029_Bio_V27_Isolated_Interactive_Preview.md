# HockeyOS Bio V2.7 — isolated interactive preview release contract

Date: October 29, 2026. Lead: Engineering.

This PR **does not** replace official HTO Bio embeds or public countdown. It adds a separately versioned, review-only interactive Player Bio route that is source-qualified against the already public career, model, award and game feeds.

Review page: `widgets/player-bio-v27-preview.html?playerID=354060&embed=1`

## Why isolated

- The founder requested a clearer, Milestone-like Production chart with number labels and high-contrast actual/Winter/Summer Pts/GP lines, a full iconized season-end projection separated from the current scoring rate, and coaching responsibilities C / RW / LW / LD / RD / G.
- The prior V2.6 preview and current V1 production Bio are preserved unchanged.
- All new UI styles/scripts are copied into **version-suffixed V2.7 assets**, not the production files. The preview only reads established public HockeyOS data.
- `game-night-lineup-public-v27-preview.json` is **AWAITING_MANAGER_APPROVAL**. It contains no names, provider poll identifiers, WhatsApp messages, approved roster, goalie booking or private coach notes. The related public approval validator is loaded for preview safety only.
- Live polled attendance and printed Excel card workflow are not represented as already integrated; the underlying feature remains staged privately under Game Night issue #165.

## Source provenance and behavior

Draft source head: `fe79d56bccbff05bbb89bf4dcbc25b6ba8f2fa0e` from the isolated HockeyOS Bio V2.7 feature branch, as recorded in `docs/261029_Bio_V27_Isolated_Preview_Asset_Receipt.json`. This preview has no independent model or historical source authority beyond the source-qualified public JSON it reads. Forecast remains provisional and numbers are never fed back to original HTO stats.

## QA and publication

Browser test confirms skater Justin Carosi, goaltender Stephen Logue and historical Dylan Brennan profiles render the new collection without JavaScript errors, missing JS/CSS, horizontal overflow, or unapproved game-night role. It also checks the full five-icon season projection and the public general positional education selector.

This is permission to review UI, not to publish player-specific tactical assignments, source Excel sheets, unverified polls, or a manager-approved dressing-room lineup. Full production integration stays gated on source, print parity, review, rollback and approval.

Rollback: revert the isolated preview commit through a reviewed new commit; do not force-push main and do not edit the original HTO Bio.
