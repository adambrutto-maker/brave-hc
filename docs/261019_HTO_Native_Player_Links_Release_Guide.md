# Brave H.C. — HTO native player-link integration and rollback
**Date:** 2026-10-19
**Scope:** Native HTO Home Page in addition to the published GitHub Pages widgets
**Owner:** Brave H.C. site administrator
**Status:** PREPARED — NOT INSTALLED IN HTO ADMIN

## Source-of-truth behaviour
- Player names in HockeyOS custom pages use the verified public HTO playerID registry (`widgets/player-links.js`).
- The public HTO Roster module already has native player-profile navigation. Leave this native navigation in place; do **not** override it with injected anchors. HTO's Roster Module settings include a `Disable Link to Player Profile` toggle. Keep that option **disabled** for clickable profile links, subject to verification in the actual editor.
- The public HTO homepage contains existing player statistics links. The shared linker ignores existing anchors and onclick-based native player cells.
- Native custom Home Page text can be linked via one supported X-Grid Script Area (Advanced), but this does not reach cross-origin iframes or automatically propagate to separate HTO page templates.

## HTO official authoring instructions
HTO help: https://www.hometeamsonline.com/sportswebsites/default.asp?p=helpdetails&topic=homeedit
HTO help: https://www.hometeamsonline.com/sportswebsites/default.asp?p=helpdetails&topic=other
HTO explicitly states scripts should be entered only into a Script Area (Advanced) module in the Home Page X-Grid. General Text Area and ordinary HTML editor placement are not the supported path.

## Installation — separate controlled administrative operation
1. In the authorized HTO admin session, open `Website > Home Page > X-Grid`. Do not delete, drag or overwrite the current homepage modules.
2. Inventory the existing Script Area modules. If one is currently in use, capture its complete configuration and source before making any change. Do not replace third-party widgets or their scripts.
3. If no safe, dedicated player-links module exists, add a distinct Script Area (Advanced) module. Ensure module is not hidden on desktop or mobile, and does not change homepage structure. The standalone snippet is `widgets/HTO_PLAYER_LINKS_PASTE.txt`.
4. Save through HTO only once. Confirm the new source is present exactly once on the visitor homepage, without a duplicate loader.
5. Verify public HTO desktop/mobile: existing links still function, scoreboard, stat leaders, countdown, projections, and home modules still render, player names in standalone HTO text become clickable where unique, and no console errors arise.
6. Verify that native Roster and Stats click navigation remains unchanged. Do not add the snippet to native Roster, Stats, Records, individual profiles or box score unless a separate HTO template expressly permits it and page-specific QA has passed.
7. Record the admin change, before/after page module manifest, QA results, approver and rollback location. Do not claim installation complete until the visitor homepage shows `window.BravePlayerLinks` and the actual changed module can be read back.

## Rollback
Remove only the dedicated player-links Script Area or restore its exact backed-up source; preserve all other modules. Verify HTO homepage and native navigation after rollback. Github Pages player links are independent and should remain available.

## Completed non-destructive QA
Using an isolated Chromium session against the public HTO `p=roster` page:
- All 25 native `tr.playerRow` rows persisted.
- All 225 `td[onclick]` native clickable cells persisted.
- Zero nested `.brave-player-link` anchors were created inside HTO-native clickable cells.
- Existing anchors were not overwritten; ordinary external player-name text linked, while `M. Provenzano` stayed unlinked due to ambiguity.
- HTO public homepage permitted loading `https://adambrutto-maker.github.io/brave-hc/widgets/player-links.js?v=1` as an external script in ephemeral browser testing, without observed JavaScript errors.
- GitHub Pages deploy and source change are **not** proof of HTO administrative installation.

## Outstanding gate
The authenticated HTO X-Grid administrative edit cannot be executed through the present read-only Chat browser connection. Use ChatGPT Work's interactive browser or perform the bounded one-module edit directly in HTO admin. No HTO admin write has occurred in this implementation chat.
