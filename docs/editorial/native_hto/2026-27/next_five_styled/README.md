# Brave H.C. — Remaining 2026–27 Native HTO Game Summaries

**Date:** November 2, 2026
**Lead:** Media Department / HockeyOS
**Status:** REVIEW PACK STAGED — NO NEW NATIVE HTO PUBLICATIONS
**HTO destination:** Schedule & Results → Scores → Recap / Game Summary

## Scope

This is the release-preparation package for five already Founder-approved and source-verified current-season Hot Stove recaps. It is independent of the earlier approved two-game native HTO pilot and draft PR #198's unapproved historical 2025–26 articles. It contains no HTO score/roster changes, new per-game widgets, site-wide CSS/layout changes, or LiveBarn/highlight work.

| HTO game ID | Date | Official opponent and Brave H.C. result | Approved recap |
| --- | --- | --- | --- |
| 3356177 | 2026-09-20 | Dateline Predators, 0–3 | Braves Open Season with 3–0 Loss to Dateline Predators |
| 3356178 | 2026-09-27 | Mohawks H.C., 3–6 | Braves Fall 6–3 to Mohawks as Provenzano Reaches 50 Career Points |
| 3369564 | 2026-10-04 | Michelob Morts, 2–3 | Braves Edged 3–2 by Michelob Morts |
| 3375601 | 2026-10-18 | Zamboner Crew, 1–7 | Braves Fall 7–1 to Zamboner Crew After Early Lead |
| 3375682 | 2026-10-25 | Big Bastones, 6–4 | Braves Break Through with 6–4 Win Over Big Bastones |

## Evidence and release readiness

- All five exact HTO public game pages returned HTTP 200; their official score/player tables were captured before native publishing. None shows the prepared recap headline yet.
- All five exact native HTO Recap editor source fields were read in the authenticated Chrome admin session and were **empty**. Each original field has an individual backup under BRUTTECH 1's local HTOEditorAudit folder; no HTO writes occurred.
- The source remains FOUNDER_APPROVED and SOURCE_VERIFIED in the latest Brave H.C. Hot Stove editorial feed.
- The five high-contrast native HTML files were generated with the main-branch source-preserving formatter from merged PR #200. The verified colours from PR #201 and existing article layout are used, without additional widgets.
- Every file is tied to its exact game ID, original approved content SHA-256, new styled SHA-256, title and date in manifest.json.
- **88/88** source text blocks preserved; **280/280** staged browser checks PASSED across 20 viewport/game combinations (320px, 390px, 625px, 1280px for all five). No content or layout shifts, horizontal overflow or JavaScript page errors.

## Publication gate

The previous explicit Founder instruction authorized only game 3375684 Preview and game 3375683 Summary. It **does not by itself authorize inserting these five additional native recaps**.

For each game, once separately authorized:
1. Re-read the exact native HTO Recap source; if it differs from the saved empty state, back up and reconcile.
2. Select the exact game ID in the HTO Score editor, open its Recap field, paste the corresponding staged HTML through the existing Source editor, and verify a Source/visual roundtrip preserves approved text and styling.
3. Save only the Recap field, with no optional message/announcement notifications.
4. Verify the complete headline/article text and archive link at the original official HTO public game URL.
5. Compare the official score/statistics tables to the pre-edit backup; if any differs, hold and investigate immediately.
6. Record per-game publication proof before continuing to the next.
7. Keep the separate historical backfill and highlights development isolated.

**Disposition:** Five current-season native editor packages ready for controlled release; native HTO publication state remains NOT PUBLISHED for all five.
