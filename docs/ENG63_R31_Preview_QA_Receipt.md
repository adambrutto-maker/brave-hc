# ENG CHAT 63 — HockeyOS Game Centre R3.1 Preview QA Receipt
Date: October 30, 2026 · Engineering · BRUTTECH 1

## Release scope
Only the isolated `widgets/game-centre-next.html` preview and its supporting assets are changed. The current native HTO homepage continues to use the existing `widgets/game-centre.html` source.

## Source-backed enhancements
- Black Cristillo award patch from existing authentic `assets/awards/cristillo-dedication.webp` and existing official SVHL crest.
- Complete Cristillo / Fazzari / Remax Sunday division standings; hockey win % shown as .xxx, with source-complete streak logic.
- Relative Sunday strength mapping: raw cohort min → 50, median → 75, max → 100; underlying HockeyOS strengthContext/contextIndex and source rank order untouched. Tied/absent scores handled separately.
- Sortable Rank, Club, Division, Strength, GP, Pts/GP, GF/GP, GA/GP, GD/GP, Streak; numeric-rate sorting and accessible column announcements, mobile sort selector. No raw totals substituted for per-game rates; GP retained as sample size.
- The existing 22 eligible adult Sunday club model remains authoritative; VAHL and placeholder clubs excluded.
- Power Rankings page size: 8 on wide preview, 4 in narrower desktop/HTO iframe, 3 on phone. All 22 remain available with navigation.
- Original Brave H.C. master-workbook-derived PDF from `Lines!G5:J16`, **blank** and labelled PENDING APPROVAL; separate same-PDF PNG preview for mobile. The original workbook and pristine QA template are unchanged.
- Print Lineup opens the actual one-page landscape PDF in a separate browser tab with native PDF print capability; the website does not silently print or send messages.
- Public PDF manifest is SHA256-verified by client. Tampered manifest blocks the iframe, print link and preview.
- No WhatsApp poll reply, named availability, historical test card or unapproved goalie is published.

## PDF source & integrity
- Original workbook SHA256: `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.
- Blank public PDF SHA256: `2ff3edfdc83cd7664fbe9be9779370e05529996db56ccb911e9f39efea0ec597`.
- PDF: 1 landscape letter page (792x612 PDF pt), ~50,493 bytes.
- Blank PDF text extraction and rendered-image inspection: PASS; original crest and layout retained; no historical names.
- Only the original workbook copy was used for rendering. Live master and pristine clone checksums unchanged.

## Independent QA
- `tests/test_game_centre_r31.cjs`: PASS at 1100, 625, 390, 358, 326px. Full selected division rows, .xxx percentages, 50/75/100 calibration cases, zero-GP rates, source-backed ranking and GA/GP sorting, paginated list, six tabs and original PDF/PNG availability.
- `tests/test_r31_sort_integrity.cjs`: PASS all 20 select sort options; desktop column sorting/ARIA state PASS; deliberately corrupted PDF checksum correctly fails closed.
- `tests/test_lineup_pdf_print_r31.cjs`: PASS actual `application/pdf` HTTP response, `%PDF-` content and new-tab Print Lineup link; no physical print was triggered by QA.
- `tests/test_game_centre_r31_hto_shell.cjs`: PASS simulated native HTO Black Ice frame at 1440, 768, 390, 358px; dynamic tab heights within the strict 450–2200px listener gate, zero clipping and preserved Media, Weather, Projections, native navigation and original records.
- Browser CSS: zero detected horizontal overflow, first-party missing assets or JavaScript errors in isolated preview QA.

## Production control
This PR does **not** update or claim to update HomeTeamsONLINE. Native HTO login remains behind the Windows Hello/HTO credential gate. Preserve the existing fixed-height Game Centre r2 until a separately validated strict-origin resize listener and `game-centre-next.html` source have been installed in HTO module `mod157965`, publicly tested and demonstrated reversible.
