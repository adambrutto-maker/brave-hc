# Brave H.C. — Winter 2024–25 original HTO coverage and preservation review

**Date:** November 3, 2026 (Toronto)  
**Lead:** Media Department / HockeyOS  
**Stage:** Research and editorial custody only. No native HTO publication, no retrospective authorization.

## What was verified

Two official archived HTO **Scores** pages yielded 26 distinct exact game IDs (14 + 12). All 26 were fetched again through their exact archived **Scores → Box Score and Summary** pages and reconciled against the official score and period totals.

- **25 played games** (regular season and playoffs); **one administrative forfeit**: February 16, 2025, #2148155, Don's Cherries. Never turn it into a played 0–0 tie or a standard game recap.
- **26/26 exact-game final scores matched** between the Scores pages and native boxscore.
- Exactly **one original authored narrative** was found in a public HTO native Recap area: September 22, 2024, #2148133 (4–2 vs Mohawks H.C.). Preserve it, its original image, and existing formatting.
- **Seven** additional games expose native **scoring-event/game-stat tables**, not authored prose. Retain tables and their media; do not call them completed editorial articles.
- **Sixteen** games expose media-only native recap content (including the administrative forfeit). Original public native content across the season contains **15 video embeds** and **five images** in total, including media attached to other categories.
- **Two played games** have no publicly visible native recap section: March 30, 2025, #2148162 (2–3 playoff loss to Mid Ice Crisis), and April 6, 2025, #2148163 (0–3 playoff loss to Mid Ice Crisis).

Full per-game source references, public HTML checksums, original element counts and correct classifications are in `261103_Winter2024_25_Public_Source_Preservation_v2.json`. The private read-only public page snapshots, source-score inventory and first-pass audit are retained in the authorized BRUTTECH 1 HockeyOS MediaQA evidence workspace; they are not committed to the public repository.

## A material correction to the first automated audit

The first audit used a word-count threshold. It incorrectly counted seven **statistical tables** as original prose reports. A subsequent DOM-content inspection separated authored narrative paragraphs **outside tables** from official event listings and media. The corrected dataset is version **v2**; the first-pass classification must not be used for editorial planning.

## Controlled next editorial stages

1. **Preservation priority:** Keep the one genuine original report, seven event tables, 16 media-only sections, all 15 videos and five images intact. Public visibility is not proof that the private HTO editor field is blank.
2. **Source expansion:** For games without written narrative, compare exact-game official scoring-event/skater logs and original media. Scoreboard/period totals alone support only a limited retrospective; do not invent goal clocks, quotes, video observations or player roles.
3. **Two playoff candidates:** #2148162 and #2148163 have no public recap content, but remain **held** pending native editor inspection/backup, quality review and Founder editorial approval. Separate games, separate IDs, separate articles.
4. **Native publication path:** After authorization, edit only the exact game within HTO's archived Winter 2024/2025 Scores → Recap. Preserve original field HTML and compare original official statistics/media before and after a save. Do not use Season Update or reactivate the archived season.
5. **Future archive linking:** Add the season to Hot Stove only after original/native article status and direct links are individually verified. A verified score is not a published article.

## Scope boundaries and handoff

This research record does **not** modify published HTO Recap fields, the Winter 2025–26 24-story release, current 2026–27 previews/recaps, site layout, team pages, original workbook, LiveBarn/highlights, or GitHub Pages feed. GitHub review is a separate nonproduction evidence gate; approval to merge documentation is not permission to publish new articles.

**Acceptance:** 26 distinct official games; 26/26 independent score parity; source category counts 1 narrative / 7 table / 16 media / 2 no visible; one forfeit; separate held playoff IDs; archive source links and hashes present; all original media safeguarded.

## Two source-bounded retrospective drafts prepared (not public/native releases)

The research branch includes two **unapproved Markdown article candidates** corresponding to the only played 2024/25 games without a publicly visible native recap:

| Game | Candidate | Status |
|---|---|---|
| March 30, 2025 — #2148162 | `review_drafts/20250330_HTO_2148162_Preview_NotForPublication.md` | Editorial draft only, field-inspection gate open |
| April 6, 2025 — #2148163 | `review_drafts/20250406_HTO_2148163_Preview_NotForPublication.md` | Editorial draft only, **source discrepancy** and field-inspection gates open |

The March 30 official periods are Brave H.C. 1–0–1 and Mid Ice Crisis 0–1–2 (2–3 final). The official HTO player totals identify Justin Carosi and Alex Pagnotta as Braves scorers, with Stefano Ardizzi and Keith Pearsoll each credited one assist; Stephen Logue is the listed goalie with three goals against. Goal-by-goal clocks were not provided in the verified public game page.

The April 6 official periods are Mid Ice Crisis 2–0–1 and Brave H.C. 0–0–0 (3–0 final). **Exception: the official HTO goalie table lists Stephen Logue with just two goals against despite the 3–0 team result.** Do not infer an empty-net goal, goaltender substitution or other explanation without an independent game-event source. The retrospective article is drafted conservatively from the scoreboard while that distinction is held for source reconciliation.

No original native Recap field has been changed by these drafts. Neither draft is to be merged as approved publication content or posted to HTO without explicit Founder approval, authentic native field backups, source reconciliation and independent QA.

## November 3 continuation — seven source-rich game stories and SVHL corroboration

Seven additional **held**, prose-style historical retrospect­ives were drafted from the original HTO native game-event tables and verified individual player game totals. Their exact game IDs are:

| Original date | Exact HTO ID | Editorial focus | Source strength |
| --- | ---: | --- | --- |
| October 6, 2024 | 2148137 | Ryan Finlay's two goals in the 6–0 win over Dateline Predators | Six named goals, skater G/A parity and Stephen Logue shutout |
| November 10, 2024 | 2148142 | Three-goal second-period comeback against Schmelts, 5–3 | Eight original goal events; official jersey-number, G/A parity |
| November 17, 2024 | 2148143 | Justin Carosi's two goals against Dateline Predators, 3–1 | Four original events and individual G/A parity |
| December 8, 2024 | 2148146 | Adam Kober's goal and assist against Mohawks HC, 3–2 | Five original events and individual G/A parity |
| December 15, 2024 | 2148147 | Bears' third-period comeback, 3–2 | Five original events and individual G/A parity |
| January 26, 2025 | 2148153 | Stefano Mazzei's late goal in 4–1 loss to Mighty Drunks | Five original events and individual G/A parity |
| March 16, 2025 | 2148159 | Justin Carosi's third-period equalizer against Mid Ice Crisis, 2–2 | Four original events and individual G/A parity |

All **37 HTO-native goal events across these seven games** reconcile: individual scorer goals, assists and team finals all pass. Evidence stored in `261103_Seven_Native_HTO_Game_Event_Parity.json`. The original HTO source-table HTML stays intact; these are separate **unapproved** Markdown drafts under `review_drafts/`. Combined 2024–25 draft inventory is **nine** (seven event-rich and two limited-source playoff drafts).

### Second-source result checks

An independent exact-date score audit uses published Sports Village **Winter 2024/25, league 531, team 12572 (Braves H/C)** game-info records, cross-matched to the 26 HTO games.

- **23 of 23 played regular-season games** with completed reciprocal SVHL events matched the HTO result *and both teams' goals*.
- The February 16, 2025 Don's Cherries administrative forfeit is **HTO 0–0 / SVHL 1–0** due to differing public recording conventions. It remains an administrative forfeit, not a played game or tie.
- March 30 and April 6, 2025 appear in the SVHL team schedule with **unscored 0–0 placeholders**, and have no completed game event records in the curated league dataset. These placeholders are not evidence that either playoff game ended in a 0–0 tie; HTO separately records 2–3 and 0–3 final scores.
- The **April 6 HTO goalie two-GA versus team three-goal score discrepancy** is still unresolved; do not label an empty-net goal or assign missing-goal circumstances.

The full 26-row cross-source register and original SVHL game-info URLs are saved in `261103_Winter2024_25_HTO_SVHL_Source_Corroboration.json`. Use HTO as the source of record for the two playoff scores until independent game-event details are obtained. The review branch has **no HTO administrative writes**, no new publication authority and no changed original media.

### Final release gates remain unchanged

All nine historical stories require editorial approval. The two playoff candidates additionally require authenticated exact-game HTO Recap field inspection/backup, while April 6 requires documented handling of the goalie discrepancy. For the seven event-rich games, preserve every original native scoring/event table and all prior photos/videos when a native posting is eventually considered. No automatic bulk overwrite of existing HTO recap fields is permitted.
