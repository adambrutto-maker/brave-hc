# HockeyOS — Profile Highlight Award Artwork Integration
Date: 2026-10-27
Lead: Engineering
Status: LOCAL CANDIDATE — NOT DEPLOYED

## Objective
Replace generic AWD text badges in Brave H.C. player-profile Highlights rows with original HockeyOS award artwork when the verified native HTO record identifies an actual award winner.

## Provenance
Original asset root: D:\BruTTech\Products\HockeyOS\App Source\BraveHC-Video-Agent\assets\Award Logos
Eight of nine pre-existing PNG designs were optimized to 200 × 200 WebP files (114,372 bytes combined). The original PNGs remain untouched. Per-file original and optimized SHA-256 digests are in widgets/assets/awards/source-manifest.json. A standalone reproducible image conversion script is at scripts/build-player-award-art.py.

Artwork mappings: Andrew Cristillo / historical Bill Masterton dedication, Hart MVP, Conn Smythe playoff MVP, James Norris top defenceman, Lady Byng sportsmanship, Rookie of the Year, Most Improved Player, and Rolaids Relief Man.

The ninth Hall of Fame artwork prominently says "VOTE", not "inducted". It was intentionally excluded from player induction records. No original images for Art Ross or Maurice "Rocket" Richard were found in the checked HockeyOS Award Logos archive; those award rows retain their existing AWD badge.

## Rendering safeguards
- Use only original native HTO Highlights ledger entries with category "award", or a composite "record" entry explicitly tagged includesAward=true.
- Match known award title at the beginning of sourceText, not unrelated commentary or presentation text. No inferred awards from scoring, leaderboards, nominations, predicted awards or Hall of Fame voting.
- Reuse the 109-player verified identity model and existing immutable 306-item Highlights ledger, preserving original wording, chronology, formatting and four corrected milestone dates.
- Keep all existing non-award badges. Render decorative logos with descriptive alt text, lazy image loading and a text badge fallback if an image fails.
- Scope CSS to award cards and retain readable layouts at 375 px/mobile and desktop.

## Verification
- scripts/test-player-highlights-v2.cjs: PASS across all 109 identities, 306 published Highlights, 327 record-book entries; 104 qualifying artwork displays; four approved date corrections maintained; 11 negative-correction checks.
- Nine known award-name/asset matches verified; no art for Hall of Fame vote, All-Star nomination, Art Ross or Rocket Richard; fabricated non-award category cannot receive an emblem.
- WebP asset sizes and SHA-256 checked by test; renderer JavaScript syntax and git diff whitespace guard pass.
- Actual localhost signed-in-free mobile-width Edge/Selenium render verified on Justin Carosi player ID 354060: both Cristillo and Hart logos loaded with naturalWidth 200 and the 300 Game Club badge was not altered. Read-only screenshots and JSON QA receipt retained under the existing BioCenterStage qa-screenshots.
- The local preview is synthetic/static public content. No native HTO editor, account access or production GitHub Pages publication was changed.

## Release control
Changes are isolated to a source-control feature branch, not main. Pages/HTO rollout requires controlled review, target-branch merge, public-host readback for representative players, and user authorization under existing HockeyOS publishing governance. Deployment remains blocked in this handoff.
