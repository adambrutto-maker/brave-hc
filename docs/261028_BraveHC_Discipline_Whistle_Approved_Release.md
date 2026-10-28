# Brave H.C. — Approved whistle-and-card disciplinary badge release

**Design approval:** October 27, 2026, user explicitly selected the new whistle, red/yellow referee-card graphic, replacing the earlier administrative-notice-only icon.

## Scope and appearance

- Only the `discipline_record` visual asset changes; it is **not** a player award, nomination, trophy, or automatic disciplinary determination.
- This version uses the circular dark gunmetal / navy frame, metal referee whistle, visible red and yellow cards, a subdued red lion silhouette, and DISCIPLINE / SUSPENSION captions. It has no winner's laurels, trophy or gold crown.
- Corners and exterior are transparent, to blend into the existing dark navy player Highlights cards at 58px desktop and 48px narrow-mobile.
- All prior 16 approved awards, 22 round milestones, and verified historical labels/recipient identities remain unchanged.

## Exact approved source custody

- Approved ZIP: `BraveHC_Discipline_Whistle_RedCard_Approved_20261027.zip`, transferred over **personal** Google Drive only, never TCDSB.
- Original-package SHA256: `d42d8938eb2164ea9086bd29efa5d4e8bdccbbcc29b6c97c09fd3aea935f3522`.
- Approved 1171px transparent original retained: `widgets/assets/approved-sources/discipline_record_whistle_redcard_master.png`.
- Exact 200px lossless WebP master: `widgets/assets/approved-sources/discipline_record_whistle_redcard_200.webp`.
- Live icon target: `widgets/assets/approved/discipline_record.webp`, SHA256 `505420c0403ea6645d579747a33beddcdb68e29cd92fdf901f53faf815c4d9c4`.
- Previous neutral notice artwork retained for rollback: `widgets/assets/approved-history/discipline_record_neutral_20261027.webp`.
- Both the PNG source and exact WebP master are hash-guarded in `widgets/assets/approved/source-manifest.json`.
- The general 39-icon transparent generator now recognizes the separately approved source and cannot accidentally restore the old notice art; the original full-collection importer refuses to overwrite locked transparent assets.

## Actual widget display

- Existing source-only mapping `discipline` → `discipline_record.webp` remains the authoritative rule.
- All three historical records (Stefano Ardizzi, Julian Kercz and Stefano Mazzei) display the new icon, with their original suspension details untouched.
- Discipline URL version `?v=whistle-cards-20261028` ensures browsers load the new file; widget script version `v=15` is also bumped.
- Existing verified-History refresh every 180 seconds, current verified HTO statistics refresh every hour, and date/award governance unchanged.

## Quality gates

- `tests/test_discipline_whistle_replacement.py` verifies exact user-approved source hashes, old icon rollback copy, transparency, actual red/yellow art, three legacy suspension records, and prevention of old import overwrite.
- `tests/test_transparent_badge_background.py` protects all 39 transparent backgrounds and original-source SHA manifests.
- `tests/test_player_icon_dimensions_portable.py` verifies 43 player profiles / 86 mobile & desktop browser sessions, plus exactly three new discipline icon URLs and zero square tiles.
- GitHub CI and Pages must pass, then the actual public release must be checked on the three historical suspension profiles.

**Deployment action:** source-authorized visual replacement only. No historical HTO records, awards or player statistics may be modified.
