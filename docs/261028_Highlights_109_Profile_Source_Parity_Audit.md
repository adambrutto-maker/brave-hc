# Brave H.C. — 109-player Highlights source-parity audit

**Audit baseline:** October 28, 2026. **Lead:** BruTTech Engineering. **Current assessment:** source-reconciled across available public HTO snapshots, with open publication holds. This is not proof that every achievement across every season has been recovered.

## Verified source coverage

- **109/109** HTO player identities crossmatch their official player profiles and career source names.
- **43** players have captured native Highlights; **306** native source rows and **37** separately source-qualified supplemental club entries give **343** recorded Highlights items. **66** player profiles have no native Highlights captures; lack of a capture is not evidence that a trophy was earned or missed.
- The public historical Awards & Honors source has **145 explicit award-winner rows** (excluding 2 no-rookie seasons). **143** crossmatch their native Highlight entries, **1** is absent, **1** has inconsistent season wording, and **3** crossmatched entries have discrepant reported point totals.
- The captured historical Individual Records source matches **230/230** player record entries exactly.
- Leadership audit: **13** source-qualified service periods across **9** players, including Dylan Brennan Team Captain 2018–2019, displayed as service history rather than new awards.
- The separate season-membership source covers 51 players and is explicitly incomplete relative to the 109-profile archive. It cannot be used to infer attendance, eligibility or missing milestones.
- Independent live read-only HTO profile HTML readback completed October 29, 2026 at 02:51 UTC: **109/109** pages returned HTTP 200 and each contained the correct playerID in both the official Bio and Highlights embedded widget URLs. Bio embeds use embed=1; Highlights embeds do not. The detailed receipt is preserved locally on BRUTTECH 1 and is not an award-evidence source.

## Review holds: public award rows that must not be silently rewritten

**1. Mark Pastore — Art Ross Summer 2016.** The official public HTO Awards page lists: “2016 - Mark Pastore - 10G, 13A, 23PTS, 0PIM”. The captured native Highlights ledger does not contain an Art Ross entry for Summer 2016. Reconfirmed against the live public Awards webpage. **Hold** for exact source scope and manager authorization before adding a supplementary historical award display. Preserve the native ledger.

**2. Mark Arruda — Lady Byng Winter 2024/25.** The official historical Awards listing says 2024 and identifies Mark Arruda, corresponding to Winter 2024/25. The captured native Highlights text says “Lady Byng Award for Sportsmanship - Winter 2025/25”, an invalid span. **Hold** for approval of a display-only date correction, preserving original sourceText.

## Source-specific Art Ross point disagreements

| Player | Season | Public HTO historical Awards | Native Highlights source |
|:--|:--|--:|--:|
| Mark Pastore | Summer 2015 | 25 points | 34 points |
| Ben Sherritt | Summer 2017 | 32 points | 37 points |
| Ben Sherritt | Summer 2014 | 25 points | 27 points |

These are verified discrepancies between two published source strings, not proof that a particular total is wrong. Regular-season versus playoffs scope, historical transcription and recording differences are plausible but not verified. Do not replace either count until source game evidence reconciles the distinction.

## Source provenance, definitions and repeatable validation

- Official Awards: https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=awards; saved source snapshot 2026-10-20T13:56:05.697Z.
- Official Records: https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=records; captured source from October 28, 2026.
- Original HTO Highlights ledger: captured 2026-10-20T15:17:15.374Z. Original source counts, awards, milestone dates and formatting remain untouched.
- Standing leadership presentation from live PR #159 is separate from awarded trophies and native achievement counts.
- See the accompanying JSON register (261028_Highlights_109_Profile_Parity_Register.json) for all 109 ID/name pairs, source hashes, per-player award match statuses, team-service observations, record parity and explicit holds.
- Reproduce offline: node scripts/audit_highlights_complete_109.cjs --check and node --test tests/test_highlights_109_source_parity.cjs.
- On-demand live public iframe identity readback: node scripts/audit_hto_109_profile_iframes.cjs RECEIPT_PATH. Unlike the deterministic 109 JSON register, this check must not be used to modify the source or automatically grant award status.

## Per-player public source reconciliation

The Award History field is “official winner rows matched to native Highlights / all known official winner rows”. It is NOT a complete awarded trophy count. Native Highlights includes more categories than the historical awards list. “None captured” does not mean no real achievement.

| Player | HTO ID | Native Highlights | Award History | Leadership periods | Player records | Open holds |
|:--|--:|--:|:--|--:|--:|:--|
| [Aaron Carosi](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=454292) | 454292 | 0 | 0/0 | 0 | 0 | — |
| [Adam Brutto](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354054) | 354054 | 18 | 4/4 | 4 | 19 | — |
| [Adam Carlyle](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=849369) | 849369 | 0 | 0/0 | 0 | 0 | — |
| [Adam Kober](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=736317) | 736317 | 1 | 1/1 | 0 | 0 | — |
| [Adam Povegliano](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=844036) | 844036 | 0 | 0/0 | 0 | 0 | — |
| [Adrian Nunno](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549662) | 549662 | 0 | 0/0 | 0 | 0 | — |
| [Aj Ing](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=830942) | 830942 | 0 | 0/0 | 0 | 0 | — |
| [Alex Pagnotta](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354058) | 354058 | 17 | 7/7 | 1 | 5 | — |
| [Andre Cristillo](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=642168) | 642168 | 0 | 0/0 | 0 | 0 | — |
| [Andrew Buchanan](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=453662) | 453662 | 4 | 3/3 | 0 | 1 | — |
| [Andrew Cristillo](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=634098) | 634098 | 5 | 4/4 | 0 | 0 | — |
| [Andrew Laramy](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=547671) | 547671 | 0 | 0/0 | 0 | 0 | — |
| [Andrew Pozzebon](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=618956) | 618956 | 0 | 0/0 | 0 | 1 | — |
| [Anthony Ardizzi](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=688131) | 688131 | 0 | 0/0 | 0 | 0 | — |
| [Anthony DiPardo](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=618955) | 618955 | 0 | 0/0 | 0 | 0 | — |
| [Anthony Guerra](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=453661) | 453661 | 4 | 1/1 | 0 | 0 | — |
| [Anthony Paolucci](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354057) | 354057 | 7 | 4/4 | 0 | 0 | — |
| [Anthony Partland](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=594972) | 594972 | 0 | 0/0 | 0 | 0 | — |
| [Ben Sherritt](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354285) | 354285 | 31 | 19/19 | 2 | 35 | — |
| [Brad Brock](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=825217) | 825217 | 0 | 0/0 | 0 | 0 | — |
| [Brandon Nunno](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549660) | 549660 | 0 | 0/0 | 0 | 0 | — |
| [Brandon Quintos](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=696518) | 696518 | 0 | 0/0 | 0 | 0 | — |
| [Cameron Buchanan](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354049) | 354049 | 21 | 8/8 | 1 | 7 | — |
| [Carmine Cerrone](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=376086) | 376086 | 2 | 1/1 | 0 | 1 | — |
| [Chris Nunno](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549661) | 549661 | 0 | 0/0 | 0 | 0 | — |
| [Chris Poleto](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=681441) | 681441 | 0 | 0/0 | 0 | 0 | — |
| [Christopher Granicolo](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354052) | 354052 | 1 | 0/0 | 0 | 0 | — |
| [Dale Payne](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354044) | 354044 | 0 | 0/0 | 0 | 0 | — |
| [Damian Aidemirski](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354051) | 354051 | 9 | 3/3 | 0 | 5 | — |
| [Damian Pavaday](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=849368) | 849368 | 0 | 0/0 | 0 | 0 | — |
| [Daniel Buzzelli](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354062) | 354062 | 3 | 1/1 | 0 | 6 | — |
| [Dante Martella](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=642165) | 642165 | 0 | 0/0 | 0 | 0 | — |
| [David Corasaniti](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=652571) | 652571 | 3 | 5/5 | 0 | 4 | — |
| [Dev Leong](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=776208) | 776208 | 0 | 0/0 | 0 | 0 | — |
| [Dino Brancatella](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=780704) | 780704 | 0 | 0/0 | 0 | 0 | — |
| [Dylan Brennan](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=525407) | 525407 | 8 | 3/3 | 1 | 2 | — |
| [Emilio Paglia](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=645171) | 645171 | 0 | 0/0 | 0 | 0 | — |
| [Enzo Del Zotto](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549462) | 549462 | 0 | 0/0 | 0 | 0 | — |
| [Eric Fregonas](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686384) | 686384 | 0 | 0/0 | 0 | 0 | — |
| [Eric Laliberte](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354048) | 354048 | 1 | 0/0 | 0 | 0 | — |
| [Francesco Triumbari](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=845364) | 845364 | 0 | 0/0 | 0 | 0 | — |
| [Giancarlo De Luca](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686562) | 686562 | 0 | 0/0 | 0 | 0 | — |
| [Henry Kong](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=846200) | 846200 | 0 | 0/0 | 0 | 0 | — |
| [Italo Brutto](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354043) | 354043 | 1 | 0/0 | 0 | 0 | — |
| [Jamie Rosenberg](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=843644) | 843644 | 0 | 0/0 | 0 | 0 | — |
| [Jason Gabor](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=808054) | 808054 | 0 | 0/0 | 0 | 0 | — |
| [Jeff Micheli](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354053) | 354053 | 0 | 0/0 | 0 | 1 | — |
| [Jesse Coote](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=567150) | 567150 | 0 | 0/0 | 0 | 0 | — |
| [Joe Carpino](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=401341) | 401341 | 0 | 0/0 | 0 | 0 | — |
| [Julian Kercz](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=382708) | 382708 | 6 | 0/0 | 0 | 8 | — |
| [Justin Carosi](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354060) | 354060 | 30 | 13/13 | 1 | 17 | — |
| [Justin Sadler](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=833648) | 833648 | 0 | 0/0 | 0 | 0 | — |
| [Justin Wright](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=696519) | 696519 | 0 | 0/0 | 0 | 0 | — |
| [Keith Pearsoll](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354056) | 354056 | 20 | 7/7 | 0 | 10 | — |
| [Kevin Wheeler](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=642442) | 642442 | 0 | 0/0 | 0 | 0 | — |
| [Kourosh Adeli](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=733003) | 733003 | 1 | 1/1 | 0 | 0 | — |
| [Krishnan Rajasooriar](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=700877) | 700877 | 2 | 1/1 | 0 | 0 | — |
| [Lorcan Duffy](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=586425) | 586425 | 4 | 2/2 | 0 | 0 | — |
| [Luc Spagnuolo](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549663) | 549663 | 0 | 0/0 | 0 | 0 | — |
| [Lucas Brutto](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354042) | 354042 | 4 | 1/1 | 0 | 0 | — |
| [Lucas Cristillo](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=642167) | 642167 | 0 | 0/0 | 0 | 0 | — |
| [Luke Leddy](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354063) | 354063 | 1 | 1/1 | 0 | 0 | — |
| [Marco Congiusti](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354041) | 354041 | 10 | 2/2 | 0 | 1 | — |
| [Marco Lamanna](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=401342) | 401342 | 0 | 0/0 | 0 | 0 | — |
| [Marcus Helmer](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=481161) | 481161 | 0 | 0/0 | 0 | 0 | — |
| [Mario Provenzano](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354045) | 354045 | 10 | 2/2 | 0 | 3 | — |
| [Mark Arruda](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=612364) | 612364 | 9 | 5/6 | 0 | 0 | CONFLICT lady_byng Winter 2024/25 |
| [Mark Pastore](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354061) | 354061 | 27 | 15/16 | 1 | 37 | MISSING art_ross Summer 2016 |
| [Matt Babiak](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=458461) | 458461 | 0 | 0/0 | 0 | 0 | — |
| [Matt Cesario](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=488205) | 488205 | 0 | 0/0 | 0 | 0 | — |
| [Matt Svec](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=798413) | 798413 | 0 | 0/0 | 0 | 0 | — |
| [Matthew Arruda](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=743181) | 743181 | 0 | 0/0 | 0 | 0 | — |
| [Matthew Brutto](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=653011) | 653011 | 0 | 0/0 | 0 | 0 | — |
| [Matthew Greenberg](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=829463) | 829463 | 0 | 0/0 | 0 | 0 | — |
| [Mearon Naman](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=733002) | 733002 | 0 | 0/0 | 0 | 0 | — |
| [Medi Brancatella](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=763309) | 763309 | 1 | 1/1 | 0 | 0 | — |
| [Michael Congiusti](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354059) | 354059 | 11 | 6/6 | 0 | 2 | — |
| [Michael Grande](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=388357) | 388357 | 0 | 0/0 | 0 | 0 | — |
| [Michael Logue](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=689718) | 689718 | 0 | 0/0 | 0 | 0 | — |
| [Michael McGolrick](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=434639) | 434639 | 0 | 0/0 | 0 | 0 | — |
| [Michael Nearing](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354047) | 354047 | 1 | 0/0 | 0 | 0 | — |
| [Michael Provenzano](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686216) | 686216 | 3 | 2/2 | 0 | 1 | — |
| [Mike Cianni](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=696569) | 696569 | 0 | 0/0 | 0 | 0 | — |
| [Neil Baghel](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=355501) | 355501 | 2 | 0/0 | 0 | 0 | — |
| [Nick Florio](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=549659) | 549659 | 0 | 0/0 | 0 | 0 | — |
| [Nolan Atkins](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=769343) | 769343 | 0 | 0/0 | 0 | 0 | — |
| [Quenton Hunt](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=388298) | 388298 | 0 | 0/0 | 0 | 1 | — |
| [Robbie Galdenzi](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=831410) | 831410 | 0 | 0/0 | 0 | 0 | — |
| [Robert Ruscitti](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=411613) | 411613 | 0 | 0/0 | 0 | 0 | — |
| [Ronan Duffy](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686383) | 686383 | 0 | 0/0 | 0 | 0 | — |
| [Ryan Campbell](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=465897) | 465897 | 0 | 0/0 | 0 | 0 | — |
| [Ryan Finlay](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=399966) | 399966 | 2 | 0/0 | 0 | 0 | — |
| [Ryan Logue](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354046) | 354046 | 15 | 1/1 | 1 | 18 | — |
| [Sanjay Rajkumar](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=845365) | 845365 | 0 | 0/0 | 0 | 0 | — |
| [Simon Scott](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354050) | 354050 | 1 | 0/0 | 0 | 0 | — |
| [Stefano Ardizzi](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=356089) | 356089 | 14 | 4/4 | 0 | 10 | — |
| [Stefano Mazzei](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=595514) | 595514 | 3 | 1/1 | 0 | 0 | — |
| [Stephane Saindon](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=738846) | 738846 | 14 | 9/9 | 1 | 9 | — |
| [Stephen DeMarco](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686563) | 686563 | 0 | 0/0 | 0 | 0 | — |
| [Stephen Keane](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=533806) | 533806 | 1 | 1/1 | 0 | 1 | — |
| [Stephen Logue](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354055) | 354055 | 13 | 3/3 | 0 | 18 | — |
| [Steve Noyek](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=686564) | 686564 | 0 | 0/0 | 0 | 0 | — |
| [Tom Cole](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=605063) | 605063 | 0 | 0/0 | 0 | 0 | — |
| [Tristan Weatherhead](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=378152) | 378152 | 0 | 0/0 | 0 | 0 | — |
| [Will Cawkell](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=378632) | 378632 | 0 | 0/0 | 0 | 1 | — |
| [Will Dyer](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=843925) | 843925 | 0 | 0/0 | 0 | 0 | — |
| [Will Salnek](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=776712) | 776712 | 0 | 0/0 | 0 | 0 | — |
| [Xav O'Krafka](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=426873) | 426873 | 2 | 1/1 | 0 | 5 | — |
| [Zach Kercz](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=383322) | 383322 | 0 | 0/0 | 0 | 1 | — |

## Release decision and remaining requirements

- [x] 109 official identities and exact profile URL joins reviewed.
- [x] 145 public historical winner rows matched or explicitly flagged; no unstated winner inferred.
- [x] All 230 captured individual Records crossmatch source; all 13 documented service periods included.
- [x] 3 HTO historic-vs-native point-count discrepancies remain visible as separate source values.
- [ ] The missing Mark Pastore Summer 2016 award and malformed Mark Arruda season label require publication approval and a separate source-qualified correction.
- [ ] Evidence from every actual game/snapshot across all seasons is not yet proven complete. Do not claim universal lifetime award completeness from the available source snapshot.

**No native HTO CMS editor changes, unapproved new awards, source-workbook mutations, emails, private video uploads or projections were performed by this audit.**
