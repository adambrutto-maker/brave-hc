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

## Full seasonal review inventory — 24 source-graded drafts (November 3)

The 15 remaining *played* Winter 2024–25 games whose native HTO Recap field publicly exposes video rather than written narrative have now been assessed without viewing or copying the source videos. **15/15** official HTO player goal totals equal the game-team score and **15/15** period sums match both team totals. Every one of these games also falls within the independently corroborated **23/23** HTO/SVHL regular-season score set. Public-only evidence is in `261103_Fifteen_MediaOnly_Played_Source_Coverage.json`.

Fifteen additional **source-limited** game-story drafts now reside under `review_drafts/`. Their permitted evidence is score, opponent, period totals, and credited skater **game totals**; they do not reconstruct individual goal chronology, claim shots/goaltender details, interpret video footage, or invent interviews. The **15 original video embeds remain on HTO and must remain intact**. No original HTO field was edited for these drafts.

The total 2024–25 editorial coverage is now:

| Distinct official game status | Count | Draft disposition |
| --- | ---: | --- |
| Original written contemporary recap | 1 | **Preserve original**, no new replacement draft |
| Played games with existing event-table recap | 7 | Seven event-verified retrospective drafts, **unapproved** |
| Played games with original media-only recap | 15 | Fifteen period/skater-total-based retrospective drafts, **unapproved** |
| Played games with no publicly visible native recap | 2 | Two source-limited playoff retrospective drafts, **held and unapproved** |
| Administrative forfeit | 1 | **No played-game retrospective** |
| **Total** | **26** | **24 unapproved drafts** plus one protected original and one forfeit |

The canonical review navigator is [`REVIEW_INDEX.md`](REVIEW_INDEX.md), covering all **26 exact HTO game IDs** and linking to all **24 source-graded research drafts**. It carries each game's source category and exceptional hold.

### Technical acceptance and release separation

- **82/82** targeted HockeyOS editorial/source-integrity tests passed on the isolated BRUTTECH 1 checkout (four review-index, nine media-only, eight cross-source, eight scoring-event, eight original-preservation, and forty-five established article/regression tests).
- 26/26 historical official HTO scores remain unchanged and exact-game identity preserved.
- No site-level changes, video processing, native HTO Recap writes, goalie stat edits, game-score edits, workbook edits, or automatic releases were performed.
- All **24 drafts remain unapproved and unpublished**. If the Founder elects to publish historical articles, first inspect/backup each authenticated HTO Recap field, preserve existing video, photo and event-table HTML, resolve or responsibly retain explicit source limitations, obtain article approval, and independently verify all published text, media and official score/stat tables after saving.
- The April 6, 2025 discrepancy remains an explicit **release hold**: team 0–3 while the listed goalie has 2 GA; no verified event explanation is available. The two SVHL playoff 0–0 schedule placeholders are *not* actual played final scores.

## League-authoritative forfeit final — reconciliation addendum (Nov. 3)

The official Sports Village 2024/25 league record confirms the February 16, 2025 Don's Cherries administrative forfeit as a **1–0 Brave H.C. win** (HTO #2148155, league 531 game #116721). Both teams' league schedule pages display **home team first, visitor second**; Braves were the home team. The original HTO record remains **0–0 with Brave H.C. – WIN and Don's Cherries – Forfeit**. Those original values are preserved as historical source evidence, not promoted into a played 0–0 tie.

Reconstructing all 24 regular-season results with the league's awarded 1–0 forfeit exactly matches the official 2024/25 league standings: **10–12–2, 22 points, 74 GF, 95 GA**. The administrative win and awarded goal count toward official team standings; the unplayed fixture adds **no** player goal, assist, goalie goal against or on-ice appearance.

The cross-season four-forfeit canonical source contract and reciprocal verification are staged separately in [PR #206](https://github.com/adambrutto-maker/brave-hc/pull/206). This 2024/25 research PR remains unapproved for native HTO article publication, and the two playoff draft source holds remain intact.

## April 6 HTO goalie-source reconciliation: numeric accounting only

The original HTO Records page (public, source-checksummed) independently confirms **six team goals against in the Winter 2024–25 playoffs**. The two original playoff boxscores are March 30 (#2148162, 2–3, Stephen Logue goalie **3 GA**) and April 6 (#2148163, 0–3, Stephen Logue goalie **2 GA**). Both HTO game team finals add to six against, while the two listed goalie rows add to five; the difference of exactly **one** is confined to April 6.

This establishes a **source accounting residual**, not a definitive explanation of the goal. The evidence does **not** establish whether the goal occurred with an empty net, after a goalie change, through a correction error, or via another circumstance. Do not modify either authoritative original stat row, add a fictitious credited goalie GA, claim video evidence or assert a causal sequence in the draft. The [held April 6 source exception register](261103_April06_Official_HTO_Goalie_Residual_Exception.json) records verified game IDs, source hashes, both official categories and the unresolved attribution. Original authenticated editor field inspection/backup, a better original scoring-event source (if available), and explicit Founder article approval are still required before any new native Recap publication.
