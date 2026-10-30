# HockeyOS HTO Records Refresh — Native Readable-Date Source Reconciliation

Date: October 29, 2026
Lead: Engineering (source integrity) / coordination with RCD-05 historical-records workstream
Scope: Scheduled HTO Records source refresh; no native HTO edits.

## Verified source divergence

Read-only official native HTO Records readback and published widget both contain exactly 463 record entries. Seven historical Team Records differ ONLY by human-readable calendar-date rendering:

- Summer longest winning streak May 28–Jun 25, 2017.
- Summer longest point streak Jun 2–Jul 7, 2013.
- Summer longest point streak May 28–Jun 25, 2017.
- Summer most team goals vs. Village Idiots, May 15, 2016.
- Summer most team goals vs. Lost In the Sauce, Jul 17, 2016.
- Summer most team goals (playoffs) vs. Mohawks Hockey, Jul 26, 2015.
- Summer largest winning margin vs. Young Guns, Jun 18, 2017.

The originally captured widget contains the same numerical results, opponents, scores, section, category, record scope and exact calendar dates in ISO rendering.

The separately open RCD-05 PR #150 documented six native readable-date edits. One additional equivalent display edit is now present in official HTO, requiring the refresh control to validate seven.

## Controlled source guard

scripts/record_source_date_identity.py provides strict calendar-date canonicalization only:
- Readable single dates (May 15, 2016) equal the exact ISO day (2016-05-15).
- Readable same-year streak ranges (May 28 - Jun 25, 2017) equal the same full ISO date range.
- Actual numerical record values, record identity, score, opponent, category and period remain exact.
- Invalid dates or mismatched day/month/year, team score, source identity or missing record rows are rejected.

scripts/refresh_record_sources.py uses semantic source inventory only for strict removal/revision guards, while retaining raw official display text in the refreshed history widget. Individual player book records are updated only if their independently verified individual source text actually changes; seven date-only Team Records changes do not rewrite player book metadata or numbers.

Read-only live acceptance passed:
- Official current HTO records: 463
- Previously published widget records: 463
- Exact semantic parity: 463/463
- Date display changes: seven
- Player record book unchanged: true
- Original statistical snapshot `capturedAt` remains aligned with the immutable player record book; newer public date-format verification is documented separately as `displayVerifiedAt`.
- The read-only 109-player Highlights parity register is regenerated from the approved history hash, preserving 230/230 verified individual record marks (82 SET, 148 TIED) and preventing a stale source-hash audit.
- HTO native writes: zero
- Reconciliation audit source-widget writes: zero

## QA and release controls

Original record refresh suite (20 cases) and new seven-alias/tamper/invalid-date tests (3 cases) pass.

The existing scheduled record-refresh workflow may publish the seven official readable dates only after all source validation gates pass. It must not silently overwrite changed statistical records or guess a missing player identity.

On source mismatch, retain previous history-records.json and player-record-book.json, and fail with a clear reason rather than changing recorded values.

## Coordination

Do not merge RCD-05 PR #150 over the corrected native source without independently rebasing and reconciling its historical six-date proof against the current seven-date native source. That workstream retains ownership of additional Records ordering/editorial enhancements.

This change is narrowly limited to restoring safe scheduled source reconciliation. It does not edit the original master workbook, official HTO page or any private user data.
