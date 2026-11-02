# Brave H.C. — Native HTO Brand Colour Refresh

**Date:** November 2, 2026
**Lead:** Media / HockeyOS, independent QA
**State:** PUBLISHED AND VERIFIED — COLOUR-ONLY CHANGE; EXISTING LAYOUT PRESERVED

## Founder directive

Continue the Brave H.C. site-wide visual refresh using established verified club colours and complementary shades, without changing the current website layout structure. This authority does not cover new templates, navigation rearrangement, game/module reordering, resizing, rebuilding widgets, or editing scores, rosters, media, original workbooks or highlights.

## Before and after — HTO native settings

| Setting | Before | Live release |
| --- | --- | --- |
| Color 1 | #d42c2c | **#d82942** |
| Color 2 | #213a53 | **#142d46** |
| Background Color | #213a53 | **#0d2339** |
| Background image | vertical-black.gif, tiled and fixed | **none — solid deep navy** |
| Banner background | default/black | **Color 2 (preset)** |
| Banner size and position | native HTO layout | **unchanged** |
| Full-page interior frame | #000000 | **#0d2339 / #142d46** |
| Site HEAD code | blank | **unchanged** |
| Site-wide custom CSS | blank | **four background-colour rules only** |

The three release colours are verified against the existing Brave H.C. published premium CSS in widgets/home-premium.css, rather than invented brand codes.

All changes were made using the authorized Chrome HTO administrator UI on BRUTTECH 1. The HTO Design > Banner & Logo editor was used only for the banner background preset; the Design > Colors & Background editor was used only for its three colour values and removal of the striped background image. Layout Templates were not used.

The HTO Site Details > Advanced Website Settings > HEAD > Site-wide CSS customization editor was initially empty. The release installed exactly four native, restricted background-colour overrides:

- #frameOuterWrapper → #0d2339
- Full-page main content frame → #142d46
- Module title background → #142d46
- Desktop/mobile navigation inner surround → #142d46

Exact source: docs/design/261102_BraveHC_HTO_Native_Colour_Only_Frame_Overrides.css
SHA-256: d9a9171fa792539b2dc66faf3022558dcd9728726423cf24a0b8e84602b5eb38

No CSS changed position, display, width, height, font, padding, margin, border, overflow or element order. No scripts, iframes or external assets were added.

## Backups and rollback custody

Before any native colour or custom CSS writes, BRUTTECH 1 retained HTO-admin screenshots, pre-change public schedule HTML and inline CSS, original colour values, original banner dropdown, original HEAD code and CSS-field content (both blank), plus a full six-page two-viewport layout baseline. All protected in the local BruTTech HTOThemeAudit folder for November 2, 2026; no user passwords or browser session tokens were exported.

Rollback sequence via authorized native HTO admin:
1. Site Details > Advanced Website Settings > HEAD > Site-wide CSS customization: clear the four-rule addition (original was blank) and save.
2. Design > Colors & Background: restore old Color 1 #d42c2c, Color 2 #213a53, Background Color #213a53, and original vertical-black.gif with tiled/fixed original-size behaviour.
3. Design > Banner & Logo: restore background dropdown to default.
4. Repeat public checks, HTO navigation checks and official scoring-table parity.

Do not switch page layout templates as a shortcut.

## Production validation

Six live public HTO page types checked at 390px mobile and 1280px desktop (12 views total): home, schedule, scores, roster, Nov 8 Other Way Game Preview (HTO 3375684), and Nov 1 Mid Ice Crisis Box Score/Game Summary (HTO 3375683).

- Initial native colour/banner release: 150 of 150 hosted-page geometry, colour and navigation checks passed.
- The scoped CSS was simulated on these 12 live pages without publishing: **1,266/1,266 synchronous same-document checks passed**. The checks compared DOM descendant count, text and links, navigation labels, element position and size, padding, margin, font, display, overflow and browser errors. This avoids false positives from asynchronously loaded widgets.
- After native Site Details CSS Save: **196/196 public-page checks passed** across all 12 views. Original banner/header dimensions, content x/y/width, module placement, nav labels, and page responsiveness remained unchanged. All pages had HTTP 200, no horizontal overflow and no new browser JS errors.
- Public computed styles confirmed the formerly black frame became deep navy rgb(13,35,57), full-page content/title strips and navigation surrounds became rgb(20,45,70), the body became solid deep navy without the striped image, and the navigation retained the verified crimson rgb(216,41,66).
- Both previously published, high-contrast native articles retained **35/35 exact approved story blocks** (13 preview plus 22 recap); both Hot Stove archive links remain.
- Nov 1 official 2–7 result and six scoring/skater/stat table groups retained canonical source SHA-256 **3a4a5bbfb18eddfa231fb80f24f254232e48ef2b532a893d2d05f648c8f4cd9b**.

A strict Python source guard checks the four CSS selectors, SHA and absence of layout/structure properties. Public screenshots and detailed test manifests remain on the authorized personal host.

## Operational boundary and next steps

The HTO site now has a consistent navy/red visual palette without layout changes. Existing white editorial article cards remain unchanged. Global HTO controls, navigation, game pages and media modules retain their original structure and workflows. Other app/team work and LiveBarn highlights were not touched.

The historical reconstruction remains draft PR #198; the two live article readability improvements previously merged in PR #200 remain. Further native game stories should use the established source-preserving article formatter and editorial approval/public readback gates.
