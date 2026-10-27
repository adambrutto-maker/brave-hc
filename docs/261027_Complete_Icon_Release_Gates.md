# Brave H.C. — Unified historical icon refresh and approved-art staging

**Date:** October 27, 2026
**Scope:** BRUTTECH 1 / HockeyOS only. No TSTG / employer information.
**Release classification:** Reviewed partial rollout: neutral discipline + genuine round milestone art + verified-source refresh. Approved 17-piece artwork remains gated pending transfer of supplied ChatGPT ZIP to BRUTTECH 1.

## Approved icon collection

- 12 previously approved award emblems: gold fleur-de-lis, navy shield, centered trophy, red lion watermark and original black CRISTILLO 32†73 patch beside dedication trophy.
- All-Star: SILVER nomination star, GOLD selection star.
- Leadership: C captain, A assistant captain.
- **Suspension: neutral grey slate administrative document icon.** No gold, laurels, trophy, celebratory ribbon or jewel. Records are not honours.
- Complete 17-art bundle generated in ChatGPT: `BraveHC_Approved_Set_Neutral_Discipline_ReleaseCandidate_20261027.zip`; source art in `icons/`, source hash manifest `release_manifest.json`.
- **Do not claim the new 17 source images are on BRUTTECH 1 or GitHub until the ZIP is downloaded and imported.** `python scripts/install-approved-artwork.py` is the verified local importer, and `python scripts/verify-approved-artwork.py --require-approved` is the explicit full-release gate.

## Changes actually prepared in this repository

- Historical discipline SVG and SHA manifest changed to an administrative notice, no ceremonial framing.
- 22 original-logo-backed round milestone WebPs sourced exclusively from the **transparent genuine 5000px red-lion Braves logo**, source SHA-256 `e245640bd0c1f3c3c8e3caea89e69a446d465f97724d9c6878992670229730b5`.
- Tier mapping **50 bronze, 100 silver, 200 gold, 300+ platinum, permanent ceiling**. Number continues progressing indefinitely for exact, dated and published milestones.
- Future unique source-verifiable milestone counts produce a client-side numbered lion medallion if no static file exists, without modifying records.
- Player iframe uses source-validated `player-highlights-ledger.json` and checks for new verified source entries every 180 seconds while open. A modified, validated record refreshes only the exact player.
- Optional approved-asset manifest preflight renders all final WebPs after import. Until then, verified preexisting artwork is retained; if a CDN file fails, the previous icon is restored.
- No automatic award or eligibility determination from games played, goals, assists, fantasy outcomes or leaderboard forecasts. A verified new achievement must first be *published to the canonical Highlights ledger*. The public HTO Highlights tab currently embeds our own widget and cannot independently supply new historic Highlights records.

## Local verification

- Existing 109 player identities, 306 historical Highlights, 327 record-book entries: PASS.
- Actual Edge browser 86/86 sessions, 355px/810px responsive sizes, no missing images or horizontal overflow: PASS.
- Synthetic exact new HTO `1250 Game Club - January 1, 2040` entry: client SVG/Canvas medallion with platinum cap, verified 3-minute refresh, without changing source files: PASS.
- 22 round assets: 200×200 WebP, correct hashes, source official lion: PASS.
- Neutral suspension art: no trophy/gold decorations; SVG hash guarded: PASS.
- Full 17 artwork import: **BLOCKED until ZIP downloaded on BRUTTECH 1**. Do not claim user-approved final collection is in production.

## Deployment controls

This branch can ship source-compatible round milestones, neutral discipline and verified-source refresh independently after CI, but full award-family visual replacement stays held until exact images are present and image hashes + browser QA pass. Do not rewrite existing historical HTO award names or player entries. New accomplishments require a supported source publication process.
