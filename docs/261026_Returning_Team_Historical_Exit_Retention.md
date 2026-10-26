# HockeyOS — Returning League Teams and Immutable Exit History
Date: October 26, 2026
Lead: QA & Testing. Supporting Data & AI and Engineering.

## Issue discovered after movement-ledger production release
The initial append-only movement implementation correctly preserved a team's last full source-qualified profile when the team disappeared from the active league directory. However, the public validator incorrectly required that same season source team ID to *remain absent* from current standings forever. If the league later re-admitted the same team, the collector would add a legitimate ENTERED_CURRENT_LEAGUE_DIRECTORY event while the verifier held publication, preventing recovery.

## Correction
- A departed-team record is an immutable **historical exit snapshot**, not an assertion that the team is permanently excluded from SVHL.
- The original exit event must exist with event type LEFT_CURRENT_LEAGUE_DIRECTORY, exact original team ID/name, and original last-observed timestamp equal to the archived profile's last-seen timestamp.
- The full archived games must reconcile to the snapshot's recorded GP, and the event must precede or equal the current source timestamp.
- A later re-admission under the same official source team ID produces a new ENTERED_CURRENT_LEAGUE_DIRECTORY observation while retaining the earlier exit event and full historical profile. Source-team-ID name reassignment still fails closed.

## Tests and safety
- Nine division-movement tests PASS, including a synthetic leave-and-return sequence validated by the exact public league source contract using a simulated future clock.
- Twelve daily publisher retention tests and the current five-game league source check still PASS.
- The original two observed October 26 Cristillo changes, Maplewolves arrival report, 27 teams and 49 reciprocal games remain unchanged.
- This is a read-only validator/test patch; it performs no original workbook/HTO/league modifications and needs no Task Scheduler changes.
