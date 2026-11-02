# Brave H.C. Hot Stove — scoring parity and November 8 editorial release review

**Date:** November 2, 2026  
**Lead:** Media Department / HockeyOS  
**Execution:** BRUTTECH 1 (ADAMPCDESKTOP), public read-only HTO and Sports Village sources  
**Disposition:** TECHNICAL QA PASS; NEW ARTICLE REMAINS EDITORIAL DRAFT / PUBLICATION HOLD

## 1. Completed source controls

A new reusable script, `scripts/editorial/hot_stove_boxscore_parity.py`, fetched the live Founder-approved Hot Stove feed and six individual official HTO game sheets without modifying source data. It compared each game's authoritative scoring events with the stored structured `goalEvents` records (period, clock, full scorer/assist text, strength label and source game/date), goals for/against and period totals. No original workbook or HTO editor was opened for writing.

| Game date | Opponent | HTO final (Braves–opponent) | Scoring, assists, period parity |
| --- | --- | --- | --- |
| 2026-09-20 | Dateline Predators | 0–3 | PASS |
| 2026-09-27 | Mohawks H.C. | 3–6 | PASS |
| 2026-10-04 | Michelob Morts | 2–3 | PASS |
| 2026-10-18 | Zamboner Crew | 1–7 | PASS |
| 2026-10-25 | Big Bastones | 6–4 | PASS |
| 2026-11-01 | Mid Ice Crisis | 2–7 | PASS |

**Result:** Six out of six HTO game sheets matched all structured scoring entries. Aggregate 14 GF / 30 GA matches the public approved season record; zero scoring-event amendments required.

**Synthetic regression tests:** 10/10 PASS on BRUTTECH 1 (correct event, whitespace normalization, incorrect assist/time/period, overtime coverage, missing event table, upstream HTTP failure, missing verified status and empty-net/strength distinction). A failed or missing source cannot be interpreted as zero goals or a success. Code and regression tests are committed in this draft PR only.

**Boundaries:** This audit validates the structured scoring content; it does not independently prove the historical head-to-head workbook, future attendance, private videos, every roster assertion or unstated shot/goalie data.

## 2. October 25 goal classification — source distinction

Official HTO game 3375682 records Jamie Rosenberg's 0:10 third-period goal, assisted by Francesco Triumbari, as **ES**. ES is the recorded manpower-strength category; it is **not an assertion that the other goalie remained in the net**.

The Founder-approved October 25 narrative refers to an empty-net goal. HTO scoring rows alone do not verify the net was empty, nor do they refute that description. Treat net status as **not independently verified by HTO**. Preserve the approved wording pending separate source-qualified video/eyewitness proof; do not rewrite the official HTO row as EN or remove the existing narrative on inference alone.

## 3. November 8 opponent/source cross-check

The live official Sports Village Sunday Winter 2026/27 standings list Other Way **third** in the eight-team Cristillo Division, **five games played, 2–1–2, 25 goals for, 23 against**. The live Other Way team schedule provides these five completed scores:

| Date | Opponent | Result from Other Way's perspective |
| --- | --- | --- |
| Sep. 20 | Mid Ice Crisis | W 4–3 |
| Sep. 27 | Zamboner Crew | T 6–6 |
| Oct. 4 | Big Bastones | L 0–2 |
| Oct. 18 | Dateline Predators | W 8–5 |
| Oct. 25 | Sugo Sundays | T 7–7 |

These results total exactly 25 GF / 23 GA. The website shows Other Way as a visitor in these rows and places the opposing team's score first; team perspective was normalized from the home/visitor column rather than assuming left-to-right order. The Other Way schedule also displays a **0–0 November 1 placeholder against Mohawks HC**, which is **not a verified completed game or tie** and must not be added to the standings.

The official Sports Village league schedule and HTO Brave H.C. schedule both show **Braves HC vs. Other Way, Sunday November 8 at 9:15 p.m., D Rink, Vaughan Sports Village**. Brave H.C.'s separate HTO completed-game record already includes November 1 and stands at **1–5, 14 GF / 30 GA**. The five-game league standings snapshot and the six-game HTO record are distinct source cutoffs and must not be silently treated as synchronized.

**Historical meeting gate:** The exact-name source ledger marks Other Way vs. Brave H.C. historical head-to-head as `NO_VERIFIED_BRAVES_MATCH_HISTORY`. The preview intentionally makes no historical series claim or first-meeting assertion.

## 4. Editorial readiness and controls

**Reviewed draft:** `docs/editorial/261102_BraveHC_OtherWay_Nov08_HotStove_Preview_DRAFT.md`.

- News article describes only verified current records, four common opponents, confirmed previous Braves results and the scheduled November 8 game.
- Uses **full-timers** and **part-timers** for any player-status descriptions; no unsupported future lineup or player commitment claims are added.
- Uses the approved Big Bastones and Mid Ice Crisis stories for prior Braves scoring context. No newly invented goal mechanics or video narration.
- The six completed-game articles and live website remain untouched by this draft branch.
- No new live widget version is released; no HTO CMS modifications, video acquisitions, or original workbook updates.

### Go / no-go

| Control | State |
| --- | --- |
| Six-story structured goal/scorer/assist parity | PASS |
| Synthetic negative and overtime regression | PASS (10/10) |
| Other Way results/standings from live official league | PASS at November 2 source snapshot |
| Nov. 8 schedule and venue | PASS at November 2 check |
| Draft article source attribution and editorial voice | READY FOR FOUNDER REVIEW |
| Fresh independent historical Brave H.C.–Other Way H2H | NOT VERIFIED — EXCLUDED |
| Live goalie-pulled/empty-net confirmation (Oct. 25) | NOT VERIFIED — NO DATA ALTERATION |
| Approval to publish November 8 preview | **HOLD — requires explicit Founder editorial decision** |

**Proposed release route once approved:** Recheck the schedule/standings and source page immediately before release; implement the approved preview in the existing Hot Stove widget without rewriting six completed-game articles or overwriting source data; run article/feed consistency, mobile and desktop browser smoke checks; inspect the public published feed and rollback if it differs from the approved candidate. The change must be a separate, traceable release commit.

## Evidence URLs

- [Official Brave H.C. schedule](https://www.hometeamsonline.com/teams/default.asp?p=schedule&s=hockey&u=BRAVESHOCKEY)
- [October 25 HTO game 3375682 boxscore](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3375682&p=boxscore)
- [Other Way official current schedule](https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=570&teamid=13704&page_type=Adult)
- [Official Sunday Winter 2026/27 standings and schedule](https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY)
- [Brave H.C. approved Hot Stove source feed](https://adambrutto-maker.github.io/brave-hc/widgets/hot-stove-approved.json)

**Status:** Article prepared and source-audited; no production publication or founder approval asserted.
