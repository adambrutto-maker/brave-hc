# Brave H.C. — Native HTO Schedule Article Archive

Date: November 2, 2026
Lead department: Media / HockeyOS
Execution host: BRUTTECH 1
State: ARCHIVE INVENTORY + NATIVE EDITOR PAYLOADS PREPARED; HTO NOT MODIFIED

## Editorial architecture

The official HTO Schedule is the **primary** publication venue for every game story.

- BEFORE a game: HTO Schedule & Results > Info > Game Preview, keyed by exact HTO game ID.
- AFTER a game: HTO Schedule & Results > Scores > Game Summary, keyed by exact HTO game ID.
- HISTORY: Keep the existing Hot Stove archive as an indexed mirror with season and game links back to native HTO Preview/Summary content.

HTO provides native game-specific editor fields, so no new widget needs to be inserted when a game is added. The existing homepage Media & Hot Stove module is untouched. Native HTO content is edited only in the authorized team admin environment; there is no source-supported bulk publication API.

## HTO-native editing safety

1. Open exact target game (not an opponent/date-based guess), and read/back up existing native Preview or Summary content.
2. If existing editor content does not match the approved source, hold and review rather than overwrite it.
3. Paste approved article using existing rich-text HTML Source mode if available; otherwise use the plain-text fallback. Use semantic headings/paragraphs and a mirror link only, never iframe/JavaScript/style widgets.
4. Preserve scores, official skater stats, team roster, forfeit designation, play-by-play, and other HTO-managed fields.
5. Confirm notification toggles will not send unsolicited messages before saving.
6. Verify the public exact native game URL and article text in a fresh read-only browser session; record a publication receipt.
7. Add native game link to GitHub archive only after public HTO verification.

HTO help confirms native Game Summary/Play-by-Play edits under Scores and game-specific Preview content. Member permissions may limit native editing.

## First native publication pack

Tool: scripts/editorial/build_hto_native_article_pack.py

This stages seven already approved editor-ready article payloads, each in HTML + plain text, with a manifest. All stages say STAGED_NOT_PUBLISHED and never write HTO or the original workbook.

| HTO ID | Date | Opponent | Native destination |
| --- | --- | --- | --- |
| 3356177 | 2026-09-20 | Dateline Predators | Game Summary |
| 3356178 | 2026-09-27 | Mohawks H.C. | Game Summary |
| 3369564 | 2026-10-04 | Michelob Morts | Game Summary |
| 3375601 | 2026-10-18 | Zamboner Crew | Game Summary |
| 3375682 | 2026-10-25 | Big Bastones | Game Summary |
| 3375683 | 2026-11-01 | Mid Ice Crisis | Game Summary |
| 3375684 | 2026-11-08 | Other Way | Game Preview |

The seven source texts are taken solely from the Founder-approved current Hot Stove articles and official scheduled preview, with official HTO game IDs, dates, opponent and scores independently matched against the source register. The generator escapes source text and restricts output to basic HTML tags; no per-game widget or code injection is required.

## Historical source register and reconstruction

Source file: docs/editorial/261102_BraveHC_HTO_Historical_Game_Source_Index.json

Across all 18 listed official HTO seasons (Summer 2013 through Winter 2026/27), paginated official Scores pages supplied **372 unique game IDs**:
- **358** preliminary scoreboard records passed game identity/date/score and period-sum checks.
- **5** forfeits must be preserved as forfeits, not zero-goal draws.
- **9** historical scoring-parity exceptions remain HELD.
- **312** regular-season games and **60** playoff games are distinct source categories.

These 358 items are **not 358 completed or verified written articles**. Full boxscore, scorer/assist, milestone and editorial checks are required before historical feature construction. The source index is deliberately labeled as source-only with publishableStoryCount=0.

Backfill sequence:
1. Publish and verify seven approved 2026/27 native articles first.
2. Reconstruct Winter 2025/26 (27 games; 24 preliminary verified scoreboard records, 3 forfeits) with exact boxscore/source checks.
3. Reconstruct earlier HTO seasons chronologically, retaining held exceptions and any pre-existing original native summary text.
4. After native readback, link each reconstructed article from a season-based Hot Stove archive to its official HTO game page.

## Weekly operational alignment

The existing Monday Hot Stove draft workflow (PR #197) continues to produce evidence-backed, **non-public** postgame drafts from finalized HTO records. It must eventually output a native Game Summary editor package when the finished article receives separate Founder approval. Approved pregame stories go into Game Preview. Generated drafts never auto-publish or claim historical eyewitness facts.

Highlights/LiveBarn work belongs entirely to the separate implementation chat.

## Release gates

- The seven HTO source excerpts and game IDs must reconcile to their approved editorial references.
- Current official HTO Preview/Summary fields must be read and backed up in an authorized admin session before editing.
- A successful HTO save is not sufficient evidence until public game page readback confirms article text and location.
- No new widgets, HTO score edits, bulk native writes, private data, or highlights modifications.
