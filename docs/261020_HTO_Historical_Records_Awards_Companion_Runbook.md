# Brave H.C. HockeyOS — Records & Awards historical snapshot

Date: 2026-10-20  
Lead department: MEDIA  
Source: public HomeTeamsONLINE Brave H.C. pages  
Release: GitHub Pages companion, not HTO native website editing

## Purpose

Provide immediate, player-linked navigation across the published HTO historical Records and Awards while a supported HTO-native script integration remains unresolved in [Issue #14](https://github.com/adambrutto-maker/brave-hc/issues/14).

The site owner still controls the authoritative content on the HTO pages; this companion does not alter those records, awards, dates, scoring, or historical profiles.

## Published companion pages

- `/widgets/history.html?view=records` — Records & Achievements
- `/widgets/history.html?view=awards` — Awards & Honors
- Linked from HockeyOS Analytics Centre only. This change does not replace the original native HTO navigation.

Each page includes the official source URL, capture date, fixed-snapshot disclosure, browsable sections, search, and HTO `playerID` links using `player-links.js?v=3` (51 verified players). Unknown and ambiguous names remain plain text.

## Source snapshot as captured 2026-10-20

| Source | Groups | Original published line items | Snapshot file |
|---|---:|---:|---|
| HTO Records & Achievements | 83 | 483 | `widgets/history-records.json` |
| HTO Awards & Honors | 20 | 146 | `widgets/history-awards.json` |

Content is extracted from public HTO visitor DOM using `scripts/extract_public_history.cjs`. It stores text-only group labels and entry strings in their source ordering. **No HTO admin access, edit, or private data was used.**

This is a static snapshot. The browser does not scrape HTO live, and no background updater is installed. A new snapshot should be published only after human-reviewed source comparison.

## Five release gates

1. **Authority:** HTO public page returns HTTP 200 and source hostname, URL and page type match the expected `BRAVESHOCKEY` site.
2. **Completeness:** extraction preserves every `.modGroupItem` from each HTO source and all category/period groupings. Current source counts are 483 records and 146 awards, not 483 unique players or awards.
3. **Correctness:** fail closed on missing JSON, unsupported schema, unexpected source URL, or mismatch between claimed entry count and grouped entries. Never calculate substitute scores.
4. **Interaction:** test search, category filtering, both tabs, player links, source links, keyboard operation, content integrity, desktop and narrow mobile.
5. **Publication:** GitHub Pages deployment and hosted browser verification must both pass; native HTO configuration remains unchanged. Roll back companion only if a defect appears.

## Technical QA from BRUTTECH 1

`node tests/history_companion_browser_qa.cjs` on an isolated localhost HTTP server in Puppeteer passed at 1280×900 and 358×760:
- 483 Records item elements, 83 group containers.
- 146 Awards item elements, 20 group containers.
- Alumni (Mark Pastore) links to verified HTO profile `playerID=354061`.
- Search "Mark Pastore" returned a nonzero subset, tabs reset filtering.
- Official HTO links change correctly with tab selection.
- No JavaScript exceptions or horizontal overflow.
- No HTML injection from source strings (textContent only).

The data format is `brave-hc-hto-history-snapshot/v1`.

## Refresh process (not automated)

1. Compare live HTO Records and Awards against the previous snapshots; confirm their public page structures and groupings are unchanged or consciously update the parser and acceptance fixtures.
2. Run the source extractor from a reviewed BRUTTECH 1 working copy, with read-only public pages and no HTO sign-in.
3. Review group/category/entry deltas and confirm new or changed player names against official HTO player IDs before updating the registry.
4. Update test baselines after review, not simply to silence failures.
5. Stage via feature branch and isolated QA; publish only after passing all gates.
6. Record source timestamp and commit and verify hosted Pages rendering.

## Remaining native HTO integration

The official HTO Home, Records, and Awards pages still require a provider-supported way to load external player hyperlink script in their parent document, or equivalent native hyperlink capability. Do not claim completion for the native HTO site. [Issue #14](https://github.com/adambrutto-maker/brave-hc/issues/14) tracks the blocked provider integration and prepared, unsent support request.

## Records refresh boundary update — 2026-10-21

The original fixed-snapshot description above documents the **October 20 initial historical companion release**, not the currently enabled record-source workflow.

- **Records**: `brave-record-source-refresh.yml` now validates public HTO records and current-season games after the approved schedule reconciliation; new already-published native HTO records may synchronize to `widgets/history-records.json` and the player-record feed after fail-closed verification. Unknown identities, removals and revisions require manual review; this does **not** write or approve native HTO records.
- **Awards**: `widgets/history-awards.json` remains a fixed public HTO snapshot and still requires explicit source comparison and review to refresh. This workflow must not be described as automatically updating Awards.
- `capturedAt` indicates the recorded snapshot source capture, not a guarantee of live readback on every page view. The official HTO pages remain authoritative.
- As of the October 21 Plan 03 check, the Records feed held **558 entries in 119 groups** (329 individual, 229 team); 327 entries are mapped to known player IDs and exactly two historical rental-goalie entries remain intentionally unlinked.
- Production HockeyOS collector-feed activation on October 21 is a separate event and does not establish that workbook formulas, awards or the publisher are healthy.
