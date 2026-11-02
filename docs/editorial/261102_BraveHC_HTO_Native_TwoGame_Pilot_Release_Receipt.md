# Brave H.C. — Native HTO Game-Article Pilot: Publication and Readback Receipt

**Date:** November 2, 2026  
**Lead:** Media Department / HockeyOS  
**Authority:** Founder approved the explicitly proposed two-game pilot with “yes approved” in the article-work conversation.  
**State:** **TWO OF TWO NATIVE GAME ARTICLES PUBLISHED AND VERIFIED**.

## Architecture confirmed

The existing HTO Schedule & Results editor supports **Game Preview** before a game and **Recap / Game Summary** after it. Brave H.C. articles can therefore live on each native HTO game page **without inserting a new widget for each game**. The GitHub Hot Stove site continues as the season archive and mirror; each new native article includes its archive link.

The publication was completed through the already authenticated HTO administrator interface in the existing Chrome profile on authorized BRUTTECH 1. No credentials were requested or extracted, and no native schedules, game dates, player statistics, records, awards, original workbook, or LiveBarn/highlight assets were edited.

## Verified game-specific publications

| HTO game ID | Native field | Story | Exact public readback |
| --- | --- | --- | --- |
| **3375684** | **Game Preview** | **High-Scoring Other Way Next as Braves Look to Rebound** | [Nov. 8 game preview](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3375684&p=preview) |
| **3375683** | **Recap / Game Summary** | **Braves Fall 7–2 to Mid Ice Crisis in November Opener** | [Nov. 1 official game summary](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3375683&p=boxscore) |

### Preview — 3375684

The original game-specific HTML source editor was verified as empty and backed up before publication. The approved 2,779-character HTML article exactly matched the staged source manifest SHA-256 (`6f20af651c76276fbba042be0ff5785f8c030a18decfc6022604b95cc45fa6e3`). The article rendered in the native HTO editor and was saved through the existing **Game Preview** control.

**Independent public HTO verification at 2026-11-02 21:16:33 UTC:** HTTP 200; expected headline present; **13 of 13 prepared text blocks matched**; official mirror/archive link visible. No per-game embed or widget was added.

### Summary — 3375683

The native **Scores → Recap** tab displayed no existing content. The HTML source field was independently confirmed empty and backed up before modification. The approved 4,098-character story exactly matched its staged SHA-256 (`5459e9f38eead1513a9d4b806e8763ceaad2b88783364c6285726b5ac6682d9b`). It rendered with the approved headline, opening and closing paragraphs before save.

To protect authoritative match data, all six original official HTO scoreboard, goal, player and team-stat table groups were backed up **before** saving. Their canonical SHA-256 was:

`3a4a5bbfb18eddfa231fb80f24f254232e48ef2b532a893d2d05f648c8f4cd9b`.

**Independent public HTO verification at 2026-11-02 21:27:03 UTC:** HTTP 200; headline and **21 of 21 prepared story text blocks matched**; archive link present; **all six official game-score/statistics table groups retained the identical pre-edit checksum**. The Brave H.C. 2, Mid Ice Crisis 7 final and individual scoring statistics were preserved.

### Independent aggregate readback

The seven-current-season HTO editor-pack verification suite was rerun after publication. It returned **2 of 7 PUBLIC_READBACK_TEXT_VERIFIED**, matching exactly game IDs **3375683** and **3375684**. The other five previously staged current-season summaries remain not visible/not verified in native HTO; no further publication is implied.

## Evidence custody and follow-up

Original-field backups, pre- and postpublication public snapshots, approved HTML content hashes and the signed-off local pilot receipt remain on authorized BRUTTECH 1 under its BruTTech HTO editorial audit folder. **No login credentials, passwords, session cookies, or authentication tokens are included in this repository receipt.**

A machine-readable public-metadata receipt is stored beside this document as `261102_BraveHC_HTO_Native_TwoGame_Publication_Evidence.json`.

**Next release:** After separately confirming editorial scope, continue the remaining five current-season Game Summary entries one at a time, preserving preexisting original text and checking public readback. Draft PR #198 continues to contain 24 **unapproved** Winter 2025–26 historical reconstructions; these cannot be treated as published or merged into public article content merely because the two-game pilot succeeded. LiveBarn/highlights work continues in its separate implementation chat.

## Rollback and acceptance

The original native fields were empty. Recovery copies of each original empty source state and the full pre-edit public pages are retained on BRUTTECH 1. If an exact native game article is later changed in error, recover only that article's editor field, not the scoreboard, and verify HTO's public page and official scoring parity again.

**Final disposition:** **PUBLISHED / PUBLIC READBACK VERIFIED — 2/2 approved native article fields; official HTO game statistics unchanged.**
