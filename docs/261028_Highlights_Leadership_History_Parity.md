# Brave H.C. Highlights — public leadership history parity

**Date:** October 28, 2026. **Lead:** BruTTech Engineering / HockeyOS.

## User-reported defect and independent verification

Dylan Brennan's Highlights lacked Captain history. The original native HTO Highlights ledger contained eight Dylan records and zero leadership records, although the separately verified public Bio leadership file recorded Dylan Brennan (HTO player ID 525407) as Team Captain — 2018 to 2019.

Independent team history bulletin from September 17, 2018 confirms Dylan Brennan was selected as the Braves' third captain:
https://www.hometeamsonline.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=bboard&pageNum=2

Official Dylan profile:
https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=525407

## Source reconciliation and display repair

The separately verified file widgets/player-bio-leadership.json contains thirteen SOURCE_DOCUMENTED leadership tenures across nine distinct officially matched player IDs. The dedicated widgets/player-highlights-leadership-parity.js module validates all thirteen and merges their historical team-service roles into a PRESENTATION-ONLY Highlights rendering view. The native player-highlights-ledger.json source is not edited.

Tenures are displayed in a clearly separated Team Leadership History panel inside Awards & Recognition. They are not inserted into the original Complete Achievement Timeline or counted as additional native awards/achievement rows. Captain and assistant-captain roles receive the corresponding authentic existing leadership emblems; player-coach service does not automatically receive a captain badge.

An existing Elected Captain achievement and a Captain service tenure are not treated as the same source event. Original HTO awards, scores, sourceText, sourceRuns, ordering, and originalCount are preserved. Founder's previously confirmed assistant captain tenures remain distinctly labelled team-management-confirmed; the public HTO Bio tenures remain separately sourced.

## Evidence and safety tests

- Nine officially matched leader profiles each render the correct historical source entries.
- Dylan's Captain card shows exact Team Captain / 2018 to 2019 text with verified HTO Bio provenance and the captain artwork.
- Exact source IDs, role grammar, date forms, verification state, duplication, player name and expected public profile must validate; malformed or missing leadership data cannot create an invented Captain.
- Existing native HTO ledger remains accessible if the supplementary source is unavailable, without changing milestone, award or record book counts.
- No raw HTO editor, public player Stats, source workbook, fantasy roster, external message or private coaching content is changed.

## QA and release procedure

Run node --test tests/test_highlights_leadership_parity.cjs and node tests/test_highlights_leadership_browser.cjs with an isolated Chrome/Playwright browser. Maintain existing Highlights milestone/award/artifact CI checks. The official HTO Bio and Highlights iframes point to the shared public GitHub Pages widget, so approved publication requires normal PR review, Pages build, live HTO iframe readback for Dylan and representative leader profiles, and a documented rollback.

Until that release is verified, this is a read-only source-audited candidate, not a claim that Dylan's live Highlights has been corrected.
