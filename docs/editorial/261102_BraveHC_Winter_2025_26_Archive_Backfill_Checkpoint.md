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

As of the later November 2 checkpoint, **all seven 2026/27 native HTO stories are live** (six Game Summaries plus one Game Preview), with publication evidence in merged PR #202. That completed current-season release is separate from this **unpublished 2025/26 historical archive**, and no original workbook data was modified.

## Editorial review wave — first five source-complete stories

The five historical games with full HTO goal-by-goal event and individual player parity have now been separately rewritten as fuller sports-reporting drafts under docs/editorial/native_hto/2025-26/editorial_review/.

- February 1, 2026 — Keith Pearsoll's three-goal game against Dateline Predators (HTO 2215008).
- February 22, 2026 — two-goal performances by Stephane Saindon and Michael Provenzano against Royal Flushers (HTO 2215010).
- March 1, 2026 — Dateline Predators scored three unanswered third-period goals after trailing 3–1 (HTO 2215011).
- March 15, 2026 — Krishnan Rajasooriar scored the Braves' goal in the 6–1 playoff loss to Schmelts (HTO 2215013).
- March 22, 2026 — a separately recorded 6–2 playoff win over Schmelts, including two HTO-recorded empty-net goals (HTO 2215015).

The five detailed articles passed scorer/assist/event parity checks and remain REVIEW DRAFTS rather than original contemporary reporting. The other nineteen played games now also have source-limited editorial review drafts. These preserve official period and player statistics without fabricating missing goal events. None of the 24 historical stories has been approved or published in native HTO.

## November 2 continuation — full season review register and archived HTO edit gate

The public HTO sources for **all 24 played Winter 2025/26 games were independently rechecked**. The five complete-event games retained exact goal-event, skater and period parity, and the other nineteen retained their source-specific period/final/player statistical parity; no new source holds were found.

Added work products:
- docs/editorial/native_hto/2025-26/REVIEW_INDEX.md — one review queue with all 24 played games and three distinct forfeits
- docs/editorial/native_hto/2025-26/review_index.json — machine-readable per-game HTO source, evidence grade, draft file and unpublished status
- docs/editorial/native_hto/2025-26/source_limited_review/ — nineteen expanded retrospective review stories, all labeled retrospective and NOT APPROVED
- docs/editorial/native_hto/2025-26/editorial_review/fresh_full_event_reverification.json — five detailed official source rechecks
- scripts/editorial/reverify_hto_2025_26_source_limited.py and reverify_hto_2025_26_full_event_games.py — read-only historical source verification
- scripts/editorial/build_hto_2025_26_source_limited_reviews.py and build_hto_2025_26_archive_review_index.py — reproducible review and index generators
- independent source/identity/forfeit regression tests

**Archived-season native editing is not yet accessible through the tested route:** in the authenticated HTO administrator, a direct historical ScoresEdit request for game ID 2215008 redirected to the current-season Schedule page. HTO's official Season Update FAQ says an archived season cannot normally be reactivated; special circumstances should be referred to Support. No season update was made, and the existing 2026/27 schedule must not be disturbed. This does not establish that every historical editor field is empty or that HTO has no support-assisted way to insert historical summaries.

Official HTO guidance: https://www.hometeamsonline.com/sportswebsites/default.asp?p=helpdetails&topic=teaminfo

**Next controlled step:** Request HTO Support guidance for safely inserting retrospective Game Summary text into archived 2025/26 game IDs **without reactivating or changing the current season**. Verify a supported editor route and back up pre-existing historical text before any publication. Only Founder-approved historical stories may be posted; the three forfeits are administrative records. Older seasons contain nine held source-parity exceptions requiring separate investigation.
