# Brave H.C. record-book reconciliation — 20 October 2026

Status: evidence audit completed for the indexed individual game records and milestones; native HTO Records/Awards and published widgets unchanged.

## Verified coverage

- All 370 indexed boxscores across 18 published seasons captured: 362 with player statistics and eight defaults/forfeits without player stats.
- 70 dated game entries: 68 match, two proposed value corrections.
- 98 milestone dates: 87 match, 11 proposed date corrections.
- 731 player/season/type tables compared by named additive statistics: 730 match; Marco Congiusti current-season GP remains a source conflict.
- No unlisted highest performances or ties found across the eight existing Summer/Winter game categories (G, A, Pts, PIM). Twelve leaders/ties could support optional separate playoff-game categories; these are not twelve missing overall records.

## Supported correction proposals

No native entries have been changed. Historical progression is retained.

| Player | Category | Published | Proposed |
|---|---|---|---|
| Ryan Logue | Summer - Points | 4 - Ryan Logue (June 2, 2013) | 3 on June 2, 2013 |
| Ryan Logue | Summer - Points | 3 - Ryan Logue (June 9, 2013) | 4 on June 9, 2013 |
| Mario Provenzano | 200 Game Club | 10 - Mario Provenzano (March 17, 2024) | 2024-03-24 |
| Adam Brutto | 300 Game Club | 1 - Adam Brutto (December 29, 2024) | 2025-01-05 |
| Stephen Logue | 50 Game Club | 1 - Stephen Logue (July 20, 2014) | 2014-07-27 |
| Justin Carosi | 300 Point Club | 1 - Justin Carosi (January 7, 2024) | 2024-01-14 |
| Stefano Ardizzi | 200 Game Club | 9 - Stefano Ardizzi (January 28, 2024) | 2024-02-04 |
| Ryan Finlay | 50 Game Club | 27 - Ryan Finlay (December 8, 2024) | 2024-12-15 |
| Stefano Mazzei | 50 Game Club | 28 - Stefano Mazzei (December 15, 2024) | 2024-12-22 |
| Mark Arruda | 50 Game Club | 25 - Mark Arruda (March 3, 2024) | 2024-03-10 |
| Andrew Cristillo | 50 Game Club | 24 - Andrew Cristillo (December 3, 2023) | 2023-12-10 |
| Krishnan Rajasooriar | 50 Game Club | 29 - Krishnan Rajasooriar (December 21, 2025) | 2026-01-04 |
| Stephane Saindon | 50 Game Club | 26 - Stephane Saindon (October 27, 2024) | 2024-11-03 |
| Mark Pastore | Summer - Shorthanded Goals | 1 (2016) | 2 (2016) |

## Holds before native backend changes

- Stephen Logue playoff GAA: retain the historical 1.33 pending source repair. The apparent discrepancy with 1.50 is explained by an internally inconsistent GA entry in the April 6, 2014 overtime win.
- Goalie GA exceeds opponent goals in three captured games: April 6, 2014; April 15, 2018; February 26, 2023. Other GA/team-score differences may reflect empty-net goals and are not automatically errors.
- Marco Congiusti current-season GP: season total shows one appearance absent from the four published boxscores.
- Minimum workload for GAA holders is undefined. Do not adopt short-stint candidates.
- Team records, historical leadership and the two unnamed rental identities remain outside this completed individual-entry reconciliation.

## Validation and reproduction

Run `python scripts/reconcile_record_book.py`, then `python scripts/audit_record_milestones.py`, `python scripts/audit_game_record_candidates.py`, and `python scripts/audit_goalie_source_consistency.py`.
The loader deduplicates the initial 84-game snapshot and continued evidence batches by official URL. Player IDs control identity; named columns control stats. Scoring-event tables are excluded from participation counts. Goalie shutout rows are identified without requiring a visible GAA column.
All 98 reconstructed milestones passed the threshold check: prior total < threshold <= total on milestone date. Same-day games are retained separately. The audit follows game participation as published in HTO, including separately recorded historical tiebreaker events.

Machine-readable proposals and sources: `261020_Record_Book_Correction_Ledger.json`. Existing Highlights dates and native Records/Awards have not been overwritten.
