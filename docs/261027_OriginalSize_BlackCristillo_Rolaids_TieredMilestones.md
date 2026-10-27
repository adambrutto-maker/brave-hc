# Brave H.C. — Unified Award Image Size and Progressive Milestone Art

Date: October 27, 2026
Workstream: HockeyOS Player Highlights
Status: Controlled release candidate

## Founder corrections applied

**Andrew Cristillo:** Original black `CRISTILLO 32 73` memorial patch remains unchanged as the authoritative source image (`widgets/assets/awards/cristillo-dedication.webp`). A reserved black frame reinforces the memorial's actual appearance. No generated substitute or recolouring.

**Rolaids Relief Man Award:** Original `rolaids-relief.webp` remains unchanged. Verified HTO recipients are Stefano Mazzei (Winter 2024/25, player ID 595514) and Adam Kober (Winter 2025/26, player ID 736317). Both award wins now have explicit regression checks. Matching also supports `Rolaids Relief Award` as a text variation without granting new awards.

**Milestones:** Original-source icon footprint remains **58 x 58 CSS pixels on desktop and 48 x 48 on actual 355px mobile viewports**. This release fixes the CSS cascade issue where the base `ph-symbol` mobile rule overrode newly generated icon widths to 26px. All award, club, championship and heritage images now share matching physical dimensions.

The achievement artwork progressively elevates as players achieve VERIFIED milestone plateaus:
- 50: Bronze (entry club)
- 100: Silver
- 200: Gold
- 300: Platinum
- 400–500: Diamond
- 750–1000: Legend

Existing game / point / win club source records retain exact award dates and tiers. Artwork templates for 400, 500, 750 and 1000 (where applicable) are included ahead of time but marked TEMPLATE ONLY. They cannot generate milestone records, infer player eligibility or alter the underlying native HTO ledger. Original 200px artwork scales uniformly into the widget's physical frame.

## Deterministic source & audit

- Eight source-original award WebP images and their file hashes remain unaltered.
- 22 milestone SVG templates, three special Cup/All-Star images, and six heritage SVGs are generated from a common bright white-shield design rather than the previous dark-circle design.
- Generation and integrity manifests are in `widgets/assets/clubs/`, `widgets/assets/special/`, and `widgets/assets/heritage/`.
- Shared reproducible generator: `scripts/brave_hc_light_icons.py`.
- Original 2016 SVHL cup visual proportions remain present in the revised bright Cup shield; original Rolaids crest and Cristillo black patch are preserved.
- Icon comparison receipt: `docs/261027_Cristillo_Rolaids_Progressive_Milestones_Review.png`.

## Quality assurance

- 109 verified player identities, 306 historical highlights, 327 recorded club book entries: PASS.
- 306 of 306 historical icons rendered; no invented awards.
- Source-specific positive tests for both Rolaids recipients and black memorial patch: PASS.
- True browser viewport emulation at 355 and 810 pixels: PASS 86/86 player-profile sessions, no horizontal overflow or broken images.
- Computed image-container sizes: original and generated artwork all 48px at 355px viewport, 58px at 810px.
- Existing four milestone date corrections and historical Andrew Cristillo award retitles preserved.

No native HTO editor records are altered by this release; source-controlled widget updates only.
