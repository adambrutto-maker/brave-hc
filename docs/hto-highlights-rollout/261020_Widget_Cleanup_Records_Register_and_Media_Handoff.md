# Brave H.C. player widget cleanup and record-book rollout

Media handoff — 20 October 2026

The shared universal widget now provides a clean player header, source-supported season insights, personal season highs, preserved Career Highlights and an expandable Club Record Book. Empty sections and administrative preservation/approval notices are hidden. No HTO profile field was edited in this enhancement phase: all 109 existing embeds retain their verified playerID, one iframe and 1,350px height.

## Outcome and validation

- 109/109 actual public HTO profiles verified after deployment on desktop: exact identity, one correct iframe, 1,350px, no initial horizontal overflow or internal vertical overflow, correct record-book entry count, and original Stats/Bio/roster controls present where applicable.
- Nine actual HTO mobile profiles tested at a 390px outer viewport (291px iframe content width): Adam Brutto, Justin Carosi, Dev Leong, Stephen Logue, Mark Pastore, Simon Scott, Francesco Triumbari, Dino Brancatella and David Corasaniti. Initial widget heights 297–1,113px; no horizontal overflow. David has the longest first-three legacy text. Expanded scrolling is permitted.
- Justin's actual HTO expansion control rendered all 25 highlights; the record-book drawer opened and closed with all 21 entries. Adam's 16 and every other legacy entry remain preserved.
- Renderer/data checks cover all 109 identities, all 306 legacy entries and all 289 assigned record-book entries. They verify source text-run bold/italic formatting, complete expanded counts, identity mismatch withholding and unregistered-ID withholding. Syntax check passed.
- 103 profiles have public statistical history and pass additive career/season parity; 78 have positive or qualified personal season highs to display. Six expose no published stats. Zero-only highs are omitted rather than presented as achievements.
- 37 players have published record-book entries. Two generic rental-goalie entries are backed up but unassigned. No audited correction or new award has been adopted automatically.
- Current-season insights use the Oct. 18, 2026 HTO snapshot. Career and Records readbacks are dated Oct. 20. Source dates and official links remain visible. No live direct HTO synchronization is claimed.

## Decisions and remaining work

Personal highs use all published game types including playoffs, with ties retained. Club record-book entries retain their published season/game scopes and dates; they are labelled historical listings rather than verified current holders. Current insights are observational statistics, separate from AwardsScoring model calculations. No save percentage is inferred from unreliable historical shots/saves.

The historical audit checked 34 regular/playoff tables across 18 seasons: 119 of 121 named-player season/playoff entries match, and two differ. Mark Pastore's Summer 2016 SHG is 1 in the book versus 2 in current HTO stats; Stephen Logue's Winter 2013/14 playoff GAA is 1.33 versus 1.50. Both require source-event reconciliation. GAA qualification is unspecified. Seventy game entries and 98 milestone dates need full dated event reconstruction; unlisted higher game performances and ties also need a schedule-wide scan. Native Records and Awards pages remain unchanged. See [audit report](261020_Historical_Record_Book_Audit.md) and [Issue #25](https://github.com/adambrutto-maker/brave-hc/issues/25).

The original [installation register](261020_All_Players_Final_Register.md), complete original source archives and prior per-profile mobile evidence remain intact. [Onboarding](261020_New_Player_Onboarding.md) now includes statistical parity, empty histories, identity matching and record-book audit rules. [Shared v1 rollback backup](261020_Widget_V1_Pre_Cleanup_Backup.json) preserves the prior HTML and renderer. Restore its HTML content with a fresh GitHub blob SHA to reverse the shared presentation; individual HTO fields need no change.

Chat history and department hubs were not renamed. MEDIA CHAT 12 remains provisional until the latest live allocation is independently verified.

## Per-player register

“D” means this phase's actual HTO desktop browser check. “D + M” includes this phase's mobile sample check. All 109 additionally passed renderer/data invariants; this does not imply all 109 are active roster players. Original per-player install/backup details remain in the linked installation register.

| Player | playerID | Legacy entries preserved | Book entries | Prior state / backup | Installation | Public HTO | V2 browser QA |
|---|---:|---:|---:|---|---|---|---|
| Marco Congiusti | 354041 | 9 | 5 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354041) | D PASS |
| Lucas Brutto | 354042 | 4 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354042) | D PASS |
| Italo Brutto | 354043 | 1 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354043) | D PASS |
| Dale Payne | 354044 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354044) | D PASS |
| Mario Provenzano | 354045 | 9 | 6 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354045) | D PASS |
| Ryan Logue | 354046 | 11 | 21 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354046) | D PASS |
| Michael Nearing | 354047 | 1 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354047) | D PASS |
| Eric Laliberte | 354048 | 1 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354048) | D PASS |
| Cameron Buchanan | 354049 | 17 | 12 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354049) | D PASS |
| Simon Scott | 354050 | 1 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354050) | D + M PASS |
| Damian Aidemirski | 354051 | 9 | 6 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354051) | D PASS |
| Christopher Granicolo | 354052 | 1 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354052) | D PASS |
| Jeff Micheli | 354053 | 0 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354053) | D PASS |
| Adam Brutto | 354054 | 16 | 23 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354054) | D + M PASS |
| Stephen Logue | 354055 | 11 | 23 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354055) | D + M PASS |
| Keith Pearsoll | 354056 | 16 | 13 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354056) | D PASS |
| Anthony Paolucci | 354057 | 7 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354057) | D PASS |
| Alex Pagnotta | 354058 | 15 | 11 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354058) | D PASS |
| Michael Congiusti | 354059 | 11 | 4 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354059) | D PASS |
| Justin Carosi | 354060 | 25 | 21 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354060) | D + M PASS |
| Mark Pastore | 354061 | 24 | 37 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354061) | D + M PASS |
| Daniel Buzzelli | 354062 | 3 | 8 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354062) | D PASS |
| Luke Leddy | 354063 | 1 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354063) | D PASS |
| Ben Sherritt | 354285 | 28 | 32 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354285) | D PASS |
| Neil Baghel | 355501 | 2 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=355501) | D PASS |
| Stefano Ardizzi | 356089 | 12 | 14 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=356089) | D PASS |
| Carmine Cerrone | 376086 | 2 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=376086) | D PASS |
| Tristan Weatherhead | 378152 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=378152) | D PASS |
| Will Cawkell | 378632 | 0 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=378632) | D PASS |
| Julian Kercz | 382708 | 5 | 10 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=382708) | D PASS |
| Zach Kercz | 383322 | 0 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=383322) | D PASS |
| Quenton Hunt | 388298 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=388298) | D PASS |
| Michael Grande | 388357 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=388357) | D PASS |
| Ryan Finlay | 399966 | 2 | 2 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=399966) | D PASS |
| Joe Carpino | 401341 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=401341) | D PASS |
| Marco Lamanna | 401342 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=401342) | D PASS |
| Robert Ruscitti | 411613 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=411613) | D PASS |
| Xav O'Krafka | 426873 | 2 | 5 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=426873) | D PASS |
| Michael McGolrick | 434639 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=434639) | D PASS |
| Anthony Guerra | 453661 | 4 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=453661) | D PASS |
| Andrew Buchanan | 453662 | 4 | 2 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=453662) | D PASS |
| Aaron Carosi | 454292 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=454292) | D PASS |
| Matt Babiak | 458461 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=458461) | D PASS |
| Ryan Campbell | 465897 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=465897) | D PASS |
| Marcus Helmer | 481161 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=481161) | D PASS |
| Matt Cesario | 488205 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=488205) | D PASS |
| Dylan Brennan | 525407 | 7 | 5 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=525407) | D PASS |
| Stephen Keane | 533806 | 1 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=533806) | D PASS |
| Andrew Laramy | 547671 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=547671) | D PASS |
| Enzo Del Zotto | 549462 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549462) | D PASS |
| Nick Florio | 549659 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549659) | D PASS |
| Brandon Nunno | 549660 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549660) | D PASS |
| Chris Nunno | 549661 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549661) | D PASS |
| Adrian Nunno | 549662 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549662) | D PASS |
| Luc Spagnuolo | 549663 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549663) | D PASS |
| Jesse Coote | 567150 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=567150) | D PASS |
| Lorcan Duffy | 586425 | 4 | 2 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=586425) | D PASS |
| Anthony Partland | 594972 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=594972) | D PASS |
| Stefano Mazzei | 595514 | 3 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=595514) | D PASS |
| Tom Cole | 605063 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=605063) | D PASS |
| Mark Arruda | 612364 | 9 | 3 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=612364) | D PASS |
| Anthony DiPardo | 618955 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=618955) | D PASS |
| Andrew Pozzebon | 618956 | 0 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=618956) | D PASS |
| Andrew Cristillo | 634098 | 5 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=634098) | D PASS |
| Dante Martella | 642165 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=642165) | D PASS |
| Lucas Cristillo | 642167 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=642167) | D PASS |
| Andre Cristillo | 642168 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=642168) | D PASS |
| Kevin Wheeler | 642442 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=642442) | D PASS |
| Emilio Paglia | 645171 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=645171) | D PASS |
| David Corasaniti | 652571 | 3 | 2 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=652571) | D + M PASS |
| Matthew Brutto | 653011 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=653011) | D PASS |
| Chris Poleto | 681441 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=681441) | D PASS |
| Michael Provenzano | 686216 | 3 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686216) | D PASS |
| Ronan Duffy | 686383 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686383) | D PASS |
| Eric Fregonas | 686384 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686384) | D PASS |
| Giancarlo De Luca | 686562 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686562) | D PASS |
| Stephen DeMarco | 686563 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686563) | D PASS |
| Steve Noyek | 686564 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686564) | D PASS |
| Anthony Ardizzi | 688131 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=688131) | D PASS |
| Michael Logue | 689718 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=689718) | D PASS |
| Brandon Quintos | 696518 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=696518) | D PASS |
| Justin Wright | 696519 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=696519) | D PASS |
| Mike Cianni | 696569 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=696569) | D PASS |
| Krishnan Rajasooriar | 700877 | 2 | 1 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=700877) | D PASS |
| Mearon Naman | 733002 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=733002) | D PASS |
| Kourosh Adeli | 733003 | 1 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=733003) | D PASS |
| Adam Kober | 736317 | 1 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=736317) | D PASS |
| Stephane Saindon | 738846 | 12 | 9 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=738846) | D PASS |
| Matthew Arruda | 743181 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=743181) | D PASS |
| Medi Brancatella | 763309 | 1 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=763309) | D PASS |
| Nolan Atkins | 769343 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=769343) | D PASS |
| Dev Leong | 776208 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=776208) | D + M PASS |
| Will Salnek | 776712 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=776712) | D PASS |
| Dino Brancatella | 780704 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=780704) | D + M PASS |
| Matt Svec | 798413 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=798413) | D PASS |
| Jason Gabor | 808054 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=808054) | D PASS |
| Brad Brock | 825217 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=825217) | D PASS |
| Matthew Greenberg | 829463 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=829463) | D PASS |
| Aj Ing | 830942 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=830942) | D PASS |
| Robbie Galdenzi | 831410 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=831410) | D PASS |
| Justin Sadler | 833648 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=833648) | D PASS |
| Jamie Rosenberg | 843644 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=843644) | D PASS |
| Will Dyer | 843925 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=843925) | D PASS |
| Adam Povegliano | 844036 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=844036) | D PASS |
| Francesco Triumbari | 845364 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=845364) | D + M PASS |
| Sanjay Rajkumar | 845365 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=845365) | D PASS |
| Henry Kong | 846200 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=846200) | D PASS |
| Damian Pavaday | 849368 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=849368) | D PASS |
| Adam Carlyle | 849369 | 0 | 0 | Universal v1 / shared + original archives | Shared v2 live | [Profile](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=849369) | D PASS |

[Full browser evidence and source dates](261020_Widget_Cleanup_Public_QA.json). Published widget commit: `1601bc46c891e6b4757d92bcf7f834b7401f7e67`.
