# Brave H.C. — Universal Player Highlights v1

Date: 2026-10-20  
Lead: MEDIA · HockeyOS (Engineering implementation; QA source checks)  
Status: Feature branch until hosted validation; **no native HTO admin changes**.

## Design decision

**One widget implementation for every player.** The exact same iframe source can be placed in every HTO profile's Highlights source-code field. The *only* profile-specific part of the HTML snippet is the verified numeric `playerID` in its URL. Examples:

- Adam Brutto: `https://adambrutto-maker.github.io/brave-hc/widgets/player-highlights.html?playerID=354054`
- Justin Carosi: `https://adambrutto-maker.github.io/brave-hc/widgets/player-highlights.html?playerID=354060`
- Dev Leong: `https://adambrutto-maker.github.io/brave-hc/widgets/player-highlights.html?playerID=776208`

Installation template: `widgets/HTO_PLAYER_HIGHLIGHTS_IFRAME_PASTE.txt`.

A cross-origin iframe cannot reliably read the enclosing HTO page's `playerID`; the query parameter must be specified for each player. A future HTO page editor option may support inline JavaScript, but that is not verified and must not be assumed. No injection or HTO editor write is part of this release.

## Original highlight preservation

A public, read-only DOM extraction from the current native HTO `#profileHighlights` tab produced:

| Player | ID | Existing entries | Originally bold cup entries |
| --- | ---: | ---: | ---: |
| Adam Brutto | 354054 | 16 | 3 |
| Justin Carosi | 354060 | 25 | 2 |

The ledger is `widgets/player-highlights-ledger.json`. Every item contains `sourceText`, `displayText`, its original order, a source-emphasis flag, category, and **`EXISTING_NATIVE_HTO_HIGHLIGHTS`** provenance. Every original date, season, title and cup emphasis is preserved. The two inherited Adam `Decidation` spellings remain in `sourceText`, while the widget's `displayText` consistently shows `Dedication`. This is only a spelling presentation change, not historical award validation.

The ledger imports **already published HTO content**; it does not independently substantiate each championship, award or milestone.

## Automatic vs human-controlled

The widget fetches the **published** `widgets/awards-participants.json` feed whenever a visitor opens the profile and renders only the source-verified **current 2026/27 skater or goalie raw statistics**. It validates schema, source status, numeric fields, exact player name, source kind, season, and scoring parity, and displays the actual HTO readback date. Feed staleness over 36 hours is flagged. No ranking, eligibility, award model score or unverified prediction appears.

**Automatic means:** existing widgets pick up new statistics as soon as the independently governed verified HockeyOS public feed is refreshed. The widget itself does not contact HTO directly from the user's browser or guarantee that the publisher updates every game. An old feed remains explicitly dated. Do not bypass known AwardsScoring workbook / publisher qualification holds to force an update.

**Manager-controlled:** championships, awards, leadership, nominations and career milestone dates. No award or milestone is automatically declared, backdated, or written into HTO. Verified numeric threshold crossings can later create **proposed** milestones after a qualified full career-statistics feed is integrated, but any official club highlight entry still needs manager confirmation of the event date and applicable policy. Do not derive historical dates solely from career totals.

## New player setup

1. Create a new official HTO player profile through the normal HTO admin workflow, with the correct legal/public roster name and position.
2. Record the exact verified public HTO `playerID`; do not guess a URL/ID from jersey number or initials.
3. Add the verified `playerID`/full-name pair to **the single canonical** `widgets/player-links.js` roster identity map and verify it is unique. The central widget then recognizes the new player automatically; no separate widget file is needed.
4. Paste the universal iframe snippet with that player's `playerID` into the permitted HTO profile Highlights source-code field. First copy the original field content to a private backup; do not erase an existing highlight ledger without a controlled migration.
5. Initially no approved historical achievements are displayed. Source-verified current-season stats appear only when the current published feed includes that player's exact roster name and official HTO stats. For goalies, the widget uses goalie-specific published fields.
6. Verify the actual HTO visitor Highlights tab exists, loads the iframe, uses the correct name and links, and renders on mobile. Do not claim profile installation until the HTO public page is read back.

For an unknown `playerID`, the widget shows a safe onboarding message rather than attributing another player's achievements.

## Release QA

- Test `node --test tests/test_player_links.js` and `node tests/player_highlights_browser_qa.cjs` with a source-backed Puppeteer installation (environment variable `BRAVE_PUPPETEER_MODULE` can set the path).
- Source-ledger counts 16 and 25, five existing bold championship lines, initial order and typo provenance preserved.
- Adam and Justin show seven entries collapsed, all 16/25 expanded; Dev goalie shows no inherited awards.
- Player IDs 354054 / 354060 / 776208 verified; unknown ID fail-closed.
- Current skater and goalie data taken from valid HTO reconciled feed; unavailable source does not hide historical awards or invent data.
- Mobile at 355px passes without horizontal overflow and JavaScript exceptions.
- After merge, confirm hosted URLs load both JSON feeds and `player-links.js` and have no console errors.
- Native HTO editor admission, embedded iframe compatibility and actual installation are **separate gates**.

## Rollback

Revert the feature PR from HockeyOS to withdraw these standalone pages and sources. If HTO embeddings are later installed, restore backed-up Highlights tab content one profile at a time. Do not modify HTO Roster, Stats or Box Score native presentation.

## Outstanding integration

The profile-source code field is reported by the founder to permit source code, but its accepted tags and iframe sandbox policy have not been independently tested in the authenticated editor. Test with a synthetic/new-player profile or backed-up pilot before replacing Adam/Justin legacy Highlights text. Provider-native Records/Awards links remain separately held in GitHub Issue #14.
