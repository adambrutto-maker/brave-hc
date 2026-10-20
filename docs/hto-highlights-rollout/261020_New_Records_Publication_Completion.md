# Approved additional records — publication complete

Adam approved the new record categories and their connection to player profile widgets, then requested newest-first ordering.

- Published all 36 approved native HTO categories and all 69 holder entries, retaining every tie.
- Public HTO book verified at 558 entries: original 489 plus exactly 69 additions. All original entries remain unchanged in this pass.
- Updated shared history archive to the same 558 entries (329 individual and 229 team).
- Added 38 individual records to their 16 verified player IDs in the shared player record book: 327 mapped entries total. The two pre-existing rental identities remain outside this mapping.
- New entries carry the supporting game URLs and the date of the latest contributing game for chronological display.
- Career highlights and record lists render newest first. Exact dates take precedence; year/season-only entries use their recorded year or season ending year, with original order preserved for equal dates and undated entries placed last. This is display sorting; original source text and formatting are preserved.
- Supporting game links are restricted to HTTPS HTO boxscores with numeric game IDs.

## Verification

The entire public record book was compared against the original backup plus the approved payload, and every new category and tied holder was checked. The 109-profile rendering check passed, preserving all 306 original highlight items, all 327 mapped record entries and identity-withholding behaviour. Date-order and unsafe-link rejection cases passed.

All 16 affected standalone player widgets passed live browser checks for identity, entry counts, new record text and supporting game links. Justin Carosi's native HTO profile iframe was separately checked: its 300 Game milestone of September 20, 2026 appears first, above the new 2023/24 playoff entry and January 2024 point milestone.

Shared player feed commit: c299c4133bdbe1a7755f2de5818d0580c91443ba. Shared history feed commit: 1391e86eef07a326077c2648422933bef8104d51. Full before/after/public evidence and 16 live checks are in 261020_New_Records_Publication_Receipt.json.

## Remaining automation scope

This publication does not enable fresh boxscore capture or automatic native HTO record updates. The draft recalculation workflow and source-capture integration remain a separate implementation step. Historical missing-stat, COVID and standalone-deciding-entry qualifications remain in effect.
