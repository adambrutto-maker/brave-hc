# Brave H.C. — Transparent icon artwork and native navy widget integration

**Date:** October 27, 2026
**Environment:** BRUTTECH 1 / HockeyOS only
**Release:** White-background correction for the complete approved player Highlights icon collection

## Problem and corrective design

The published 17 approved shield/recognition WebPs and 22 round-club milestone WebPs were imported as 200×200 opaque RGB artwork, with pure white canvas pixels in all four corners. The widget HTML also applied `background:#fff` and a visible border to the icon holder. On the dark navy player Highlights cards, these produced white square tiles.

## Changes

- All 39 WEBP images are now **200×200 RGBA with transparent exterior pixels**, preserving white text, metallic trophies, the black Andrew Cristillo 32–73 memorial, red lion artwork, and the core dark navy crest.
- The old 39 opaque WEBPs are preserved byte-for-byte under `widgets/assets/opaque-originals/{approved,round-clubs}/`. Each manifest entry records both the original opaque source SHA-256 and the corrected transparent WebP SHA-256/bytes. The original user-approved ZIP identity remains unchanged.
- Exterior canvas pixels are removed only if white and connected to the image perimeter; enclosed white details remain intact.
- The thin detached horizontal white line in both All-Star source pictures is removed as an extraction artifact. Original award lettering is unchanged.
- Both public `player-highlights.html` and the preview HTML now use borderless transparent icon holders for approved award and round-club badges, preserving 58×58 desktop and 48×48 narrow-mobile sizing.
- Cristillo artwork retains its original black memorial badge inside the transparent image; no external white tile is drawn around it.
- New reproducible conversion generator: `scripts/build-transparent-badge-art.py`. It reads only preserved approved opaque sources and regenerates transparent outputs.
- New tests: `tests/test_transparent_badge_background.py` verifies every original and corrected image SHA, 39 RGBA WebPs, transparent corners, meaningful visible design, and the transparent CSS. Existing full responsive browser QA also rejects any painted icon frame.
- Review image composited on exact dark-navy backgrounds: `docs/261027_Transparent_Badge_Navy_Preview.png`.

## Local verification

- `python -m unittest discover -s tests -p test_transparent_badge_background.py`: PASS.
- `python scripts/verify-approved-artwork.py --require-approved`: 17 approved + 22 round assets PASS.
- `node scripts/test-player-highlights-v2.cjs`: 109 source identities / 306 history items PASS.
- `python tests/test_player_icon_dimensions_portable.py`: 86/86 responsive Edge sessions across all 43 historical profiles PASS.
- 209 approved icons and 97 round clubs remain linked to 306/306 historical rows.
- 11 Andrew Cristillo memorial award entries, both Rolaids winners and all other previously sourced award placements unchanged.
- No historical HTO data, actuals feeds, player identities, award eligibility or hourly source-refresh rules changed.

**Release gates:** Merge only after GitHub Actions source/image/browser regression passes, GitHub Pages deploy success, and production live public image transparency and 43-profile browser acceptance.
