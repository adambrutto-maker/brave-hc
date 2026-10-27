# Brave H.C. Historical Highlight Icon Completion — Release Candidate

Date: October 27, 2026
Status: Local feature branch, not deployed. Does not edit native HTO source records.

## Source evidence and cup identity

The actual SVHL championship trophy is a **tall silver cylindrical cup with a wide shallow bowl at the top and stacked silver bands**, visible in:

- [Summer 2016 championship HTO album](https://www.htosports.com/teams/default.asp?s=hockey&u=BRAVESHOCKEY&p=gallery&albumID=17381), team photo `Braves.jpg`.
- [Winter 2015/16 championship HTO album](https://www.htosports.com/teams/default.asp?s=hockey&u=BRAVESHOCKEY&p=gallery&albumID=15938), team photo `6127aa1f-033e-445c-ab8f-35baf4a0537f1.jpg`.

**Updated design — October 27:** The SVG deliberately uses a **miniature Stanley Cup-style silhouette**, consistent with the team's clarification about the physical SVHL Cup. The flared bowl, narrow connecting neck, tiered engraved silver base, and bright metallic bands are now more distinct, including at the 58-pixel widget size. This is an original SVHL championship emblem, not an NHL logo or a claim of NHL affiliation. The HTO championship photographs remain the reference; source links and asset hashes are in `widgets/assets/special/source-manifest.json`. Both All-Star logos remain byte-for-byte unchanged.

## Updated mappings

- **James Norris:** original `james-norris.webp` remains authoritative. Matcher accepts both `James Norris Award` and `James Norris Trophy`. Original source had 15 direct award entries plus Alex Pagnotta's combined Norris/captain line. All **16** display original artwork under new browser check. Bumped widget script cache version from 7 to 8.
- **SVHL Cup Champion:** 51 championship highlights, including three explicitly marked `(Call-Up)`, display `svhl-cup-champion.svg`. One additional multiline HTO record with an explicitly recorded Cup title and verified championship count displays the same trophy; historical text is unchanged.
- **All-Star Nomination:** five records use `all-star-nomination.svg` (silver).
- **All-Star selected:** one record uses `all-star-selected.svg` (gold). Nomination and selection are not conflated.
- **Compound awards:** David Corasaniti's combined three-award HTO record displays the already-existing Conn Smythe artwork. It still records all three awards as before.

## Full catalog coverage

306 published historical highlight rows across 43 verified players:
- 105 illustrated award rows, including James Norris in the combined record
- 97 branded club milestone rows
- 58 new Cup / All-Star specialist rows
- 46 still use generic, historically accurate symbols

**Remaining 46:** 15 Art Ross, 17 Rocket Richard, 5 Hall of Fame inductions, 6 leadership roles, 3 discipline entries. Hall of Fame **VOTE** source artwork must never be used as an induction icon. Disciplinary records should retain a neutral notation, not be celebrated.

## Quality gates

- Node regression test: PASS, 109 verified identities, 306 historical highlights, 327 record-book entries.
- All 43 historical-profile browser tests at 355px and 810px: PASS 86/86.
- 16 Norris images, 105 award images, 97 club badges, 58 specialist images all load; 0 broken images and 0 horizontal layout failures.
- Native HTO published achievement source text, dates, record counts, source runs and four historic date corrections remain unchanged.
- No production GitHub Pages or HTO editor changes in this branch.

## Release controls

Recheck current `main`, GitHub checks and pull-request review before publication. After authorized merge, verify GitHub Pages and live embedded HTO profiles. This is a distinct release from completed PR #121.
