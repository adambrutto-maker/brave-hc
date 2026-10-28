# RCD-04 — Current native statistical Records to HockeyOS widgets

October 28, 2026. Lead Engineering. Existing HTO **Records** page only, with HTO Awards achievements separately completed and retained.

## Delivered

- Refreshed `widgets/history-records.json` to **460 exact source-valued statistical records** (231 Individual and 229 Team), with original Summer/Winter distinctions, Game/Season/Playoffs scope, shortened approved headings and preserved original row texts. This is the public Records-widget feed, NOT the frozen historical Awards-club archive.
- Refreshed `widgets/player-record-book.json` to **229 individually mapped player statistical entries** from the old 327 player records. The 98 historic Game/Point/Win club milestone rows now live under HTO Awards, not in statistical Records. No loss of matched player records or source values; 38 heading aliases under original ID/period preserving scopes.
- Two statistical goalie rows under the unresolved historic HTO rental-goalie name remain in the complete 460-row Records feed, without fabricating a specific player ID.
- Preserved original unmodified 558-entry/119-group HTO historical source verbatim as `widgets/history-records-legacy-558.json`. Historical Watch / 2023–2024 bulletin / Plan03 archival checks explicitly read that snapshot. Their evidence is **historical-only**, not an assertion that native HTO Records still contains milestones.
- Existing Record source-refresh script should continue to compare the official current 460 rows and preserve values. Novel future records still require supported source+identity and rollback checks. One-time staging script is provenance, not an unattended migration.
- Public historical Awards companion remains at its established 146 honours feed; user approved moving 135 total milestones to the **native HTO Awards page** plus player Achievement Locker. Separate future ticket can decide whether historical Awards companion should include a cross-link, without duplicating awards into Records.

## Acceptance

Independent exact-source port test: original 558 = 460 current records + 98 now-Awards milestones; 229 player statistical rows matched with no changed player IDs/values and exactly two unassigned rental-goalie rows. Original HTO 146 honours and 135 native milestone Awards are protected by separate AW-16/AW-19 live source receipts. Historical Watch and bulletin provenance tests must remain PASS using frozen original HTO source. Browser test confirms responsive 460-record history widget and 146-honour archive companion, no orphaned record/season links or overflow.

Release gate: GitHub CI plus production Pages readback; do not overwrite or infer record holder/award statistics from non-current sources. Any discrepancy on HTO live source should hold rather than silently rewrite.
