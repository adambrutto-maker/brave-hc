# Brave H.C. — Approved 17-icon player highlights release

Date: October 27, 2026
Environment: BRUTTECH 1 AdamPCDesktop
Classification: full production visual replacement, source-preserving.

## Source chain and verification

- User-approved artwork ZIP: `BraveHC_Approved_Set_Neutral_Discipline_ReleaseCandidate_20261027.zip`.
- Transferred through personal Google Drive `G:\My Drive` (adam.brutto@gmail.com), **not** the TCDSB work Drive (`H:`).
- ZIP SHA-256: `78fa843abf9c53450cc25d0438007624f31f4c94ae446201d4c0b54b7d59e8d7`, identical at origin and on BRUTTECH 1.
- Existing guarded source importer `scripts/install-approved-artwork.py`: **17/17 imported**.
- `scripts/verify-approved-artwork.py --require-approved`: **PASS** for 17 approved WEBP images and 22 authentic 5,000px-logo round milestone assets.
- Original art and preexisting source-ledger records retained as backups; artwork maps only to already published exact HTO achievements. The source `player-highlights-ledger.json` remains unchanged.

## Live iframe presentation

- 12 awards: Hart, Conn Smythe, Norris, Lady Byng, Rookie, Most Improved, Rolaids Relief, Andrew Cristillo, Art Ross, Rocket Richard, SVHL Cup and Hall of Fame.
- All-Star: silver nomination and gold selection with distinct status.
- Leadership: distinct metallic C/A insignia.
- Discipline: neutral muted administrative document with no trophy or ceremonial presentation.
- Round milestones use `round-clubs`, bronze 50, silver 100, gold 200, platinum 300+.
- Existing 3-minute source refresh and hourly verified season refresh unchanged.
- Approved 58px desktop / 48px narrow-mobile icon framing CSS added, including dedicated source-preserving black Cristillo patch border.

## Preproduction acceptance

- Edge browser checked all **43** historic Highlight profiles at **355px** (plus 86-session responsive test at 355px and 810px).
- **306/306 historical records** show icons: **209 approved** and **97 round milestone** placements.
- Both Rolaids-winning entries use approved artwork and 11 Andrew Cristillo award entries retain black-patch framing.
- **0 broken images, 0 generic rows, 0 inconsistent icon dimensions, 0 horizontal overflow**.
- No new awards inferred from statistics, no native HTO profile editor changes and no additional milestone records created.

## CI and deployment controls

- Update icon-integrity CI to require the exact approved-art source manifest and all 17 source files. Missing or incomplete transfer is a hard failure rather than silent fallback.
- Test with existing 109-identity source and the actual 86-session responsive browser acceptance.
- After merge, verify GitHub Pages and actual live HTO embeds, not just GitHub CI success.
