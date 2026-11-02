# Brave H.C. — Winter 2025–26 Hot Stove Historical Backfill

Date: November 2, 2026
Lead: Media Department / HockeyOS
Publication state: DRAFTS STAGED — NO NATIVE HTO WRITES

## Source and scope

This continues draft PR #198. It does not overwrite the six published 2026–27 recaps, November 8 Other Way preview, homepage Media module, official scores, original workbook or Highlights/LiveBarn assets.

The Winter 2025/26 season includes 27 distinct official HTO game IDs on two paginated Scores pages. The read-only auditor checked each of 24 non-forfeit game boxscores against the previous source index: opponent, date, game type, score, periods and skater totals. For the five games with full scoring events, every individual scorer and assist was crosschecked against the same-number skater.

## Coverage

| Evidence grade | Games | Permitted archive material |
| --- | ---: | --- |
| FULL_GAME_EVENTS_AND_SKATERS | 5 | Official score, periods, complete goal log, named goal/assist credits |
| EVENTS_WITH_PARTIAL_PLAYER_STATS | 1 | March 22 overtime shutout loss, verified goal event and result, no invented individual production |
| SCOREBOARD_AND_SKATERS_ONLY | 18 | Official score, period progression and named skater goal/assist/point totals; no individual goal times |
| FORFEIT_ONLY_NO_ON_ICE_RECAP | 3 | Separate administrative outcome only; zero-zero forfeit is not an on-ice tie |
| Total | 27 | 24 retrospective drafts and 3 forfeit exceptions |

An initial audit included the aggregate HTO Team Stats line when summing individual player production and falsely doubled totals. That was corrected. The final 24 played games passed the relevant source consistency checks. All five complete event logs also reconciled goals and assists to the exact player jersey numbers.

Two separate March 22, 2026 Schmelts playoff games are retained independently by their IDs: 2215014 (0–1 in overtime), and 2215015 (6–2 victory). Neither opponent nor date alone establishes game identity.

## Stored evidence and draft files

- scripts/editorial/audit_hto_2025_26_boxscores.py — read-only HTO public boxscore audit and source hashes
- docs/editorial/native_hto/2025-26/official_boxscore_source_audit.json — official sourced audit for 27 IDs
- scripts/editorial/build_hto_2025_26_retro_drafts.py — source-limited retrospective article drafting logic
- docs/editorial/native_hto/2025-26/retrospective_drafts/ — 24 Markdown drafts plus unique-ID manifest and three forfeit notes
- scripts/editorial/test_build_hto_2025_26_retro_drafts.py — quality, source-limit and safety regression tests

Every draft prominently states that it is a historical reconstruction prepared in 2026, not an original contemporaneous article. None asserts tactical causes, attendance status, invented player quotations, clips, milestone claims, or future-game knowledge. Missing HTO scoring event logs remain missing; no goal times or strengths are filled in.

## Native HTO publication gate

All 24 articles remain for human editorial review and separate founder approval. Before a past game's native Summary field is changed:
1. Open the exact game ID in an authorized HTO admin session; read and back up current Summary and Play-by-Play fields, including original historical reporting, if any.
2. Preserve and reconcile historical content rather than silently replacing it with a retrospective draft.
3. Approve the finished article and use the existing HTO Scores > Game Summary editor. No per-game widget is needed.
4. Read back the exact public game page, verify the title/opening/source and save the publication evidence.
5. Only then add the native HTO page to the season-grouped Hot Stove mirror.

The separate current 2026/27 publication pilot is still pending: zero of seven native fields had full public readback at the last check. This archive extension does not claim native HTO publication, successful admin login or original workbook edits.

## Editorial review wave — first five source-complete stories

The five historical games with full HTO goal-by-goal event and individual player parity have now been separately rewritten as fuller sports-reporting drafts under docs/editorial/native_hto/2025-26/editorial_review/.

- February 1, 2026 — Keith Pearsoll's three-goal game against Dateline Predators (HTO 2215008).
- February 22, 2026 — two-goal performances by Stephane Saindon and Michael Provenzano against Royal Flushers (HTO 2215010).
- March 1, 2026 — Dateline Predators scored three unanswered third-period goals after trailing 3–1 (HTO 2215011).
- March 15, 2026 — Krishnan Rajasooriar scored the Braves' goal in the 6–1 playoff loss to Schmelts (HTO 2215013).
- March 22, 2026 — a separately recorded 6–2 playoff win over Schmelts, including two HTO-recorded empty-net goals (HTO 2215015).

The five standalone editorials were validated against their original boxscores, individual scorer/assist coverage, verified key facts, exact official ID and source SHA; 5/5 passed. These are REVIEW DRAFTS, not native HTO posts or recovered original 2025/26 news articles. The other 19 non-forfeit games remain strictly sourced scaffold drafts and should not be upgraded to event-rich journalism without additional evidence.

## Next sequence

Review and approve the five source-complete historical articles for eventual native HTO Game Summary placement. Separately work on the overtime loss and the eighteen evidence-limited reports, preserving source gaps. Keep forfeits distinct. Nine older-season score-parity exceptions still require independent source resolution before retrospective publication.
