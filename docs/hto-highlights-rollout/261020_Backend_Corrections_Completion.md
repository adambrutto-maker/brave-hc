# HTO record-book backend corrections — completed 20 October 2026

All 14 authorized record-book corrections were saved through the native HTO administrator editor: 11 milestone dates, two Ryan Logue game-point values and Mark Pastore's Summer 2016 SHG total (1 to 2).

The public Records page contains 483 entries and matches the pre-change backup plus exactly the 14 corrections. Comparison normalizes whitespace and the admin/public separator used for blank names; order is ignored because HTO re-sorts entries. Stephen Logue's 1.33 playoff GAA is unchanged. Underlying game statistics, Awards, team records, original player Highlights and unresolved source issues were not changed.

Both shared widget data files on main were synchronized and read back successfully: 289 mapped player-record entries and 483 historical record entries retained. Live widget checks confirmed the corrected entries for Adam Brutto, Mario Provenzano, Ryan Logue, Stephen Logue, Justin Carosi, Mark Pastore and Stefano Ardizzi. Further affected-profile checks are tracked separately if completed.

Evidence:
- `261020_Backend_Corrections_Before.json` — full pre-change native editor backup.
- `261020_Backend_Corrections_Public_Verification.json` — all 14 receipts and complete public readback.
- `261020_Corrected_Record_Book.jpg` — public-page screenshot of Adam Brutto's corrected 300-game milestone.

The reconciliation audit remains available in PR #27. Its original not-edited status describes the pre-implementation audit; this completion receipt records the subsequent authorized application.
