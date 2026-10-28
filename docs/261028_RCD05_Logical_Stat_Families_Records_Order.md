# HockeyOS RCD-05 — Logical statistical Records category order

Date: October 28, 2026. Lead Engineering. Authorized computer BRUTTECH 1 (AdamPCDesktop). User-approved current HTO **Records** page; separate Awards page stays intact.

## Completed native editor change

The authenticated native HTO Records editor now keeps the **Summer** section ahead of **Winter**, with individual categories grouped by actual statistic. Goals are followed immediately by Games with 2+ Goals and Hat Tricks, then Game-Winning/Tying and special-team goals; Assists are followed by Games with 3+ Assists; Points are followed by Games with 3+ Points and Player of the Game; goalie Wins/Shutouts/GAA stay together, then PIM. Team Records group points and win/point streaks, offensive metrics, defensive metrics and penalty metrics in that order.

Only HTO category ordering changed. No renamed category, threshold, season label, playoff scope, record holder, date, value, or record count was changed. The user gave an example of "2+a", but the native source is **Games with 3+ Assists**, so no unverified 2+ Assist category or mislabeled result was created.

Native HTO acceptance receipt: `D:\BruTTech\Products\HockeyOS\Implementation Control\PlayerCoaching\261028_Records_Family_Order_CANDIDATE\261028_Records_FamilyReorder_Independent_Live_Acceptance.json` — PASS; 57 categories, 460 individual/team statistics (231+229), all values and Summer/Winter and Game/Season/Playoffs scopes preserved. Native HTO Awards still 281.

## Website/widget synchronization

Existing `widgets/history-records.json` now follows exactly those category families; no new page, tab, or duplicate Records data. `widgets/player-record-book.json` remains the same 229 source-mapped player statistical entries, and `widgets/history-records-legacy-558.json` remains an immutable historical archive for Watch and prior milestones. `scripts/refresh_record_sources.py` now updates the history feed on order-only native changes even when its source multiset is identical; it preserves the player book unchanged in that case.

Acceptance: all 57 categories match the order spec, all 460 original statistical rows retain exact public source values/scope, all 98 legacy milestone source rows remain solely in the separate immutable archive and in current Awards, browser history companion desktop/mobile category heading order matches spec, CI passes, production Pages readback follows the order, and current 281 Awards / 134 player achievement badges remain intact.

Never fabricate unverified statistical thresholds, reinsert old club entries into statistical Records, or assign the two ambiguous historic rental-goalie rows to an unverified player.
