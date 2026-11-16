# Brave H.C. Hot Stove — Editorial Formula v5.1 (locked)
Status: Founder-approved locked editorial policy (November 16, 2026). This document governs human-reviewed drafts; it does not authorize automatic publication.

## Editorial mission
Each game is a standalone, engaging, accurate sports article and a chapter in the season-long story. The November 8, 2026 Other Way article is the quality reference, not a fixed template. Write for readers, not the production process.

## Required principles
1. Identify the genuine central story before writing. Lead with the outcome and defining development; use a compelling, accurate headline and dek.
2. Set relevant pregame context concisely: opponent form, previous meetings, team trajectory, and game-night roster.
3. Reconstruct the game accurately and coherently from official box score and verified notes. Organize by periods or turning points according to what best serves the story.
4. Integrate power-play/shorthanded goals, penalties, milestones and unusual statistics at their actual moments in the narrative. Revisit significance only when it adds insight. Never create an automatic 'Special Teams' section just because a PPG occurred.
5. Cover verified goals, assists, goaltending, Players of the Game and other meaningful contributions fairly; do not manufacture quotes, observations, motivations, or on-ice actions.
6. Explain meaningful trends, historical comparisons, and player milestones naturally. Avoid repeating the same numbers in several sections.
7. Assess wins and losses fairly, without artificial positivity or criticism.
8. Close with what changed for the team and a grounded next-opponent preview; avoid generic motivational endings.
9. No internal instructions, verification notes, placeholders, missing-data commentary, workflow references, or source reconciliation prose inside the article. Keep unresolved facts in a separate, private editorial review note. Omit unsupported claims rather than filling gaps.
10. Sections and length are flexible. Use game-specific headings and prioritize journalistic readability.

## Mandatory roster and call-up coverage
- Compare the verified game-night lineup with the authoritative full-time (FT) roster.
- Name **every verified FT player who did not dress**, as appropriate in a natural pregame or lineup paragraph; do not label a player absent without evidence.
- Refer to **every dressed non-FT player as a call-up** in published editorial copy, regardless of internal part-time, drop-in or substitute classification. Never call them 'drop-ins' or 'part-timers' in articles.
- Identify participating call-ups by name and, when useful, state FT/call-up counts and changes from the previous game.
- Integrate notable call-up scoring and contributions into the game story, rather than isolating them in a roster report.
- Do not assert that a named call-up replaced a specific absent FT player unless verified.
- Do not infer FT classification from number of appearances; use the controlled roster authority.
- If roster verification is incomplete, hold the article from final approval and put the discrepancy in editorial review notes, not published prose.

## Season-story continuity
- Review the prior article, recent verified games, historical records and an internal season-story ledger before drafting.
- Maintain evolving arcs for team performance, player contributions, goaltending, lineup continuity, rivalries and milestones.
- Include callbacks only where they change the reader's understanding of this week's game. Do not rehash earlier recaps.
- Distinguish emerging trends from established trends; revise interpretations when later games contradict them.
- After each approved article, update an internal ledger with verified developments, evolving hypotheses, and open editorial questions. Do not publish this ledger as boilerplate.
- Use the accumulated archive for occasional midseason and season-end features. Never preselect a triumphant or disappointing narrative.

## Verification and publication gates
- Official HTO game sheet is the primary current-game source. Reconcile scorer/assist credits, game score, period chronology, goal strength, goalie GA vs empty-net goals, and verified team totals.
- A PPG is a power-play goal, distinct from points per game. Don't infer shots, saves, or unreported opposition scorers.
- Check season aggregates against prior approved baseline; flag conflicting game-sheet details separately.
- Check opponent/date/time against authoritative current fixture data before previewing.
- Draft in chat or review artifact first. Founder explicitly approves final copy before any HTO or production publishing. No automatic publication, native HTO edits, or workbook changes.

## Editorial quality gate
Score 100-point editorial quality across lead/story (20), accurate narrative (20), player coverage (15), insight (15), readability (15), balanced conclusion (10), headline/polish (5). Add continuity (15) and normalize achieved / 115 to percentage; target >=90%. Accuracy, roster classification, and Founder approval are non-compensable gates regardless of score.

## Automation implementation boundary
The existing Monday GitHub Actions workflow produces source-gated evidence/draft artifacts, not finished publishable journalism. Engineering must separately implement FT roster parity, call-up naming, season ledger continuity, and v4.1 editorial QA in the review process, with regression tests. This document alone does not mean those controls are automated.

## v5.1 final newsroom and complete-scoring requirements (supersede conflicting earlier guidance)
- This is a dedicated local-team beat report with professional sports-writing standards, not a box-score dump or fabricated independent eyewitness reporting.
- Lead with result, key performer and defining moment promptly (normally within 75–100 words); vary headings and article length with the game.
- Cover **every goal by both teams in chronological order** and **every credited Brave H.C. goal and assist** in the article's narrative. Give time/period, scorer, assists, strength, score progression where verified; do not invent unidentified opponent scorers.
- For each major turning point, explain score before, what happened, and what changed. Give decisive events more space than routine goals without omitting any scoring event.
- Integrate penalty and special-teams context in sequence; power-play goals belong at their scoring moments, not a mandatory separate section.
- Recognize goaltenders, all verified Players of the Game, notable call-up contributions, and supported individual milestones; do not force unsupported praise for non-scoring players.
- Report verified FT absences and dressed non-FT call-ups using the authoritative roster; where classification is unresolved, keep an editorial hold outside the article until checked.
- Maintain a weekly question and a season-story ledger: emerging, developing, established, resolved/reversed. Each report advances or challenges earlier interpretations without repeating past recaps.
- Optional authentic eyewitness or player comments require explicit attribution and provenance. Never imply on-site reporting from a remote box-score review.
- **Gate A (mandatory factual completeness):** reconcile all goals, scorer/assist mentions, penalty and special-teams facts, goaltending/empty-net, Players of the Game, FT absences/call-ups, team totals and next fixture. Any discrepancy holds approval.
- **Gate B (100-point editorial rubric):** headline/lead 15, narrative and play-by-play 25, player and lineup storytelling 15, statistical/historical insight 15, season continuity 15, readability/tone/conclusion 15. Minimum 90/100, after Gate A passes.
- Draft and founder approval are separate from publication. No automatic publishing or changes to HTO or original workbook.

## Golden draft, captain interviews and disputed event protocol (2026-11-16)
- On founder request, archive a complete dated **GOLDEN DRAFT** in version control, separately from HTO production publication. Golden means founder-selected editorial baseline, **not** factually final or permission to publish.
- Record authentic direct quotes from the founder/captain, preserving meaning and voice. Light punctuation cleanup is allowed; do not invent quotes or claim an interview with anyone else. Attribute quotes to Adam Brutto.
- A captain's eyewitness correction can supersede a conflicting *draft interpretation* but does not silently overwrite the official HTO record. Keep an explicit reconciliation note outside the public-facing article and label the source disagreement pending LiveBarn review.
- For November 15 Sugo: founder recalls 4–4 equalizer, Sugo fifth goal at 3:50 to go ahead 5–4, then captain pulled Stephen Logue, then Sugo empty-net sixth at 3:15. HTO currently labels Sugo fifth goal as empty-net. **Do not claim HTO is corrected or publish as reconciled until LiveBarn verification and HTO update.** Logue five goals charged is consistent with the founder's recollection, but must be reconciled against final corrected source.
- Future reporting must distinguish an aggressive extra-attacker decision while **trailing** from pulling the goalie in a tied game. Verify score, goalie-pull timing, communication, and empty-net attribution before sign-off.
- A golden draft can contain a **separate editorial hold note** for unverified timing, tournament championship details or roster status. Do not bury caveats in the article body or fabricate facts.
- Record material human-interest detail (verified historical return dates, family connections, tournament coaching, rink) with source or founder testimony, not invented scene-setting.
- Editorial handoff: gold draft → evidence review (video, HTO, roster) → corrected final draft → explicit founder approval → publish. Preserve all earlier draft history.
