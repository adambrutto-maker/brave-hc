# HTO Historical Archive — Verified Summer-Season Player Links (v2)

Date: 2026-10-20  
Lead department: MEDIA / HockeyOS  
Scope: HockeyOS `history.html` companion only; **no native HTO admin edit**

## Objective

Open official HTO player profiles to a contextually relevant Summer season when the historical record or award gives a year **and** public HTO season statistics confirm that the named player participated in that exact Summer season.

## Verification sources

- HTO public Stats pages for 18 available Brave H.C. seasons (public HTTP readback only).
- Existing, publicly verified 51-player `player-links.js?v=3` identity registry; all 51 IDs had at least one season in the HTO public statistics snapshot.
- Verified public HTO summer player-profile parameter:
  `p=profile&playerID=354061&pageLoad=ProfileTabStats&viewseas=Summer_2015` shows Mark Pastore's Summer 2015 game table, including links to individual official box scores.
- A new `history-player-seasons.json` file stores season availability associated with those verified public player IDs. Its snapshot includes source, capture date, record count and schema. It does not contain nonpublic person details or attendance intentions.

## Decision logic

A historical item receives `data-hto-season=Summer_YYYY` **only** when:
1. Its HTO source category explicitly says `Summer`.
2. It contains exactly one distinct four-digit year (e.g. 2015).
3. One or more people from the 51-person registry are unambiguously named in the line item.
4. **Every** recognized player in that item has the exact `Summer_YYYY` value in official HTO public player statistics.

The shared HTO player-linking script automatically uses the inherited season context for the player name. If any condition fails, the player's link safely opens the HTO career profile rather than an unsupported season.

Winter entries deliberately **do not** receive season context. A bare award year, such as `2015`, does not prove whether the intended Winter HTO season is `2014/2015` or `2015/2016`.

Individual game records with a date are not assigned an unverified box-score ID. A game-specific link would require an independently verified player-game pairing and actual HTO box-score URL, not a date guess.

## Fail-closed behaviour

The archive can render the verified 483 Records and 146 Awards snapshot items even when `history-player-seasons.json` is missing or invalid. In that case, no season context is inserted, and verified names retain their correct career-profile link.

## Regression and release checks

- JavaScript syntax: PASS.
- Puppeteer local HTTP server, 1280×900 and 358×760: PASS.
- Records preserved: **483 items, 83 groups**.
- Awards preserved: **146 items, 20 groups**.
- Mark Pastore's verified 2015 Summer records and awards link to `viewseas=Summer_2015`.
- No inferred Winter deep links.
- Existing search, category filtering, tab switching, native source URLs and player linking preserved.
- Forced evidence-file HTTP 404: archive remains visible with zero inferred season attributes.
- Direct live HTO verification of Mark Pastore's `Summer_2015` filtered profile: HTTP 200 and 11 game box-score links.
- No source values edited; no HTO website edits, GitHub scheduled tasks or automatic publisher changes.

## Rollback

Revert this feature's changes to `history.js`, `history.html` and the evidence JSON. The original October 20 history snapshots and native HTO pages remain unchanged. Native HTO commissioning remains tracked at [Issue #14](https://github.com/adambrutto-maker/brave-hc/issues/14).
