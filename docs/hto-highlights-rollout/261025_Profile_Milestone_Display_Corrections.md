# Four source-verified profile milestone dates

Date: October 25, 2026

## Purpose and authority

Four preserved original Highlights dates disagree with the corrected public record book. Adam instructed continuation after reviewing the four supported display proposals. This change updates those four dates in the shared player-profile display.

The original `widgets/player-highlights-ledger.json` and current `widgets/player-record-book.json` remain byte-for-byte unchanged. The existing HTO profile iframes continue to load the shared widget; no native HTO editor or statistics write is required.

## Exact changes and recorded-stat evidence

| Player / official playerID | Original Highlights item | Original date | Display date | Threshold evidence | Official game |
|---|---|---|---|---|---|
| Ryan Logue / 354046 | hto-legacy-354046-06 | August 9, 2014 | August 9, 2015 | 99 points before + 2 = 101 | [1249342](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=boxscore&sportsHQ=BRAVESHOCKEY&gameID=1249342&archTog=1) |
| Stephen Logue / 354055 | hto-legacy-354055-09 | July 20, 2014 | July 27, 2014 | 49 games before + 1 = 50 | [1100308](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=boxscore&sportsHQ=BRAVESHOCKEY&gameID=1100308&archTog=1) |
| Justin Carosi / 354060 | hto-legacy-354060-19 | October 23, 2016 | May 15, 2016 | 94 points before + 6 = 100 | [1442287](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=boxscore&sportsHQ=BRAVESHOCKEY&gameID=1442287&archTog=1) |
| Ben Sherritt / 354285 | hto-legacy-354285-17 | November 20, 2016 | November 13, 2016 | 99 points before + 2 = 101 | [1517092](https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=boxscore&sportsHQ=BRAVESHOCKEY&gameID=1517092&archTog=1) |

The October 24 audit rechecked each game header, exact player identity and direct game contribution against the retained [milestone reconciliation](261020_Milestone_Date_Reconciliation.json). The current record book already shows the four supported dates. Stephen's game header is July 27; a later recap publication date is not the game date.

These remain recorded-stat milestones. Four untracked Summer 2013 games remain a permanent historical limitation. No missing participation or personal statistics are inferred.

## Display implementation

`widgets/player-highlights-display-corrections.json` holds only the four reviewed replacements and their source references. The active v2 renderer validates the original ledger before creating a separate display copy.

Each correction requires an exact player ID, player name, item ID, category, original source text and previous display text. Duplicate targets, changed source text, unexpected formatting, invalid dates or unsupported game links are rejected. The original source text, source order, source emphasis and formatting runs remain intact. Separate display runs preserve Ryan's and Ben's existing plain formatting while showing the corrected date. Corrected dates also determine chronological ordering.

Ben's separate **50 Game Club — November 20, 2016** entry is unchanged. No award, championship, player identity, total or record-book value is changed.

If a correction cannot be validated for an affected profile, its career Highlights section is withheld with a brief availability notice; independently valid personal-high and record-book sections continue to render. The renderer restricts corrections to the four approved player IDs. The other 105 identities retain their existing behaviour even if the correction resource is missing or invalid. A source mismatch in one player's correction does not suppress another player's valid Highlights.

The active HTML advances the JavaScript cache version from `v=3` to `v=4`. Rendering remains text-only. No runtime dependency, permission, credential, external service or network destination is added; the extra JSON resource is served from the existing widget origin.

## Verification and persistence

Run from the repository root:

```sh
node scripts/test-player-highlights-v2.cjs
```

The focused suite covers all 109 identities, 306 original Highlights and 327 mapped record-book entries, including exactly four changed date displays. Frozen input objects check source preservation. The suite also covers original formatting, corrected chronology, Ben's unrelated 50-game date, repeated rendering and 11 negative correction cases.

The existing source-refresh workflow regenerates the historical record book, profile record book and candidate evidence. It does not write the original Highlights ledger or this correction manifest. The obsolete two-player `capture_existing_player_highlights.cjs` capture script is not part of this change and must not be used to replace the complete current ledger.

The observed October 24 routine source-refresh run changed no files. This profile display correction does not establish the separate RCD-02 requirement to observe a genuine accepted-stat change through the candidate/feed update path.

## Rollback and public verification

The change is isolated in one commit. Reverting that commit restores the previous active renderer and cache version and removes the four display overrides. Original Highlights and record-book source files need no restoration.

After Pages deployment, verify each of the four public HTO profile iframes and the expanded shared widget at desktop and mobile widths. Confirm the corrected date once in its milestone, preserved counts and formatting, correct chronology, no browser exceptions and no horizontal overflow. Record the exact deployed commit and public readback in the existing HockeyOS implementation receipt.
