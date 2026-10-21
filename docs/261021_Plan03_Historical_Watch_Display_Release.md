# Plan 03 — Historical HTO milestones in public Record Watch

**2026-10-21.** Scope: source-validating an **existing published historical milestone** on the two existing HockeyOS Watch presentation views. This is a *historical-display verification change*, not current workbook commissioning, a new official record, or a scheduled collector change.

## Root cause / rationale

- The existing `widgets/watch.json` is a historical workbook-status snapshot: `dataStatus=HISTORICAL_WORKBOOK_SNAPSHOT`, `sourceValidated=false`, `recordWatchComplete=false`. It already contains two past milestone lines; its stored `exportedAt` does **not** establish today's live event calculations.
- The original `watch-v2.html` and homepage `home-panels.html?panel=watch` accepted that one JSON without cross-checking a separate authoritative record-book source, and their wording could imply current game/record certification.
- The HTO Records companion `widgets/history-records.json` is backed by HTO public source verification and independent scheduled reconciliation, but it too is a captured snapshot, not a live API query per visitor.

## Implementation

1. New source validator `widgets/watch-evidence.js`, loaded before the Watch inline controllers. It accepts only the reviewed `brave-hc-workbook-watch/v2` **historical** state and an authentic `brave-hc-hto-history-snapshot/v1` **Records** file with exact official HTO source URL and valid entry count. If either input is unavailable or inconsistent, the milestone display is withheld.
2. Each reviewed `reached` event must map to a unique native HTO Career Club entry with the **same player, threshold category and recorded date**. Historical progression numbers remain source text, not inferred career totals or award-rank points. Watch entries are sorted newest-first by milestone date, preserving user preference.
3. Both public presentation views fetch `history-records.json` in addition to the existing `watch.json`. They display the matched two existing milestones:
   - Michael Provenzano — 50 Point Club, September 27, 2026.
   - Justin Carosi — 300 Game Club, September 20, 2026.
4. The pages **explicitly** say these are published **historical HTO record-book matches**. They no longer claim today's active streaks, updated workbook parity, current countdown distance, fresh game-feed verification, or new official record entries. An unavailable Records source means nothing is silently shown as verified.
5. No change to `widgets/watch.json`, native HTO CMS, historical awards, master workbook, source collector, automated game mapping, or Git publisher state.

## Validation

- `node --test tests/test_watch_historical_evidence.js`: **12/12 passed** in an isolated BRUTTECH 1 review checkout.
- Edge Chromium / Puppeteer `node tests/watch_historical_browser_qa.cjs` with `BRAVE_PUPPETEER_MODULE` pointing to an isolated private `puppeteer-core` installation and `BRAVE_CHROME_BIN` pointing to the installed Edge binary. Browser scenarios **4/4 passed**:
  - Full Record Watch desktop 1280px (2 milestones, no JavaScript exceptions or horizontal overflow).
  - Full Record Watch mobile 358px (same).
  - Compact HTO homepage watch-panel 358px (same).
  - Missing HTO Records snapshot HTTP 404 (0 milestone cards, explicit source-withheld message).
- Tests also reject changed record dates, duplicate milestones, unsupported stat/award categories, altered HTO source authority, inaccurate archive totals, stale source timestamps and unjustified upgrade to fully current workbook status. GitHub record-source workflow runs the 12 source tests on relevant changes, without requiring a browser in CI.

## Outstanding gates

- This cross-check proves **agreement with already-published HTO historical record text**, not an independent new real-time reading of each underlying boxscore. Earlier Plan 03 private review separately verified those two actual event crossings using recorded workbook baselines and the live HTO four-game feed.
- Original workbook W2026/27 scores remain cached 0–0/T placeholders; current projections and complete career-distance calculations are **not** certified. SVHL readback and independent Git publisher recovery remain separate tracked work.
- Fifth-game HTO 3375682 on October 25 remains *pre-admission only*. Do not trust the calendar/preview or register a final until official score and unique workbook mapping are separately verified.
- Any new live milestone auto-publishing, permanent Watch publisher changes, HTO native record edits, or restoration of the July 2026 article requires a separate release decision and QA.
