# Brave H.C. — Complete Historical Highlight Icon Catalog

Date: October 27, 2026
Environment: BRUTTECH 1 (AdamPCDesktop)
Source: Brave H.C. existing native HTO Highlights ledger (109 verified players / 306 historical highlights / 327 record book entries)

## Scope and rules

This candidate completes the last 46 generic historical badges without inventing any awards, nominations, memberships or suspensions. Only previously published HTO source entries qualify. Original item `sourceText`, `displayText`, `sourceRuns`, season, identity and date are unchanged.

| Historical achievement | New artwork | Entries |
|---|---|---:|
| Art Ross point-scoring award | `art-ross.svg` | 15 |
| Maurice "Rocket" Richard goals award | `rocket-richard.svg` | 17 |
| Hall of Fame **Inductee** | `hall-of-fame-inductee.svg` | 5 |
| Elected captain and elected assistant captain | `captain.svg`, `assistant-captain.svg` | 6 |
| Explicit recorded suspension | `discipline-record.svg` | 3 |
| **Total** | **Six new emblems** | **46** |

All six are original Braves-branded, reproducible SVGs at `widgets/assets/heritage`. Source and SHA-256 manifest: `widgets/assets/heritage/source-manifest.json`; generator: `scripts/build-player-heritage-art.py`. These are original design interpretations, not copied NHL intellectual property.

### Important distinctions

- **Hall of Fame inducted** receives an induction emblem. The previously found `Hall of Fame VOTE` image is not used; voters/nominees cannot appear as inductees.
- **Rocket Richard and Art Ross** map only to native HTO recorded award wins explicitly naming Goals or Points and season, not statistics-based inferred winners.
- **Captain** and **assistant captain** use distinct C/A insignia; both require the source ledger's elected-leadership record.
- **Disciplinary entries** use a muted blue-grey document/warning icon. They are records, not trophies, celebrations or honors.
- All formerly completed material remains unchanged: 105 existing award images including 16 James Norris placements, 97 club icons, and 58 championship/All-Star emblems including the previously approved miniature Stanley Cup silhouette.
- Historical Andrew Cristillo Award display policy and four approved milestone date corrections remain unchanged.

## Acceptance targets

- 109 identity records and 327 record-book entries preserved.
- 306 highlights total, **306/306 custom icon coverage** with exact channel counts `105 + 97 + 58 + 46`.
- 43 historical profiles tested at 355px and 810px; all image loads and layouts intact.
- SHA-256 manifest verification and deterministic generation in GitHub Actions.
- Run a controlled pull request. Do not change original HTO editor data or add synthetic recipients.

State: release candidate; production publication requires successful QA/CI and release authority.
