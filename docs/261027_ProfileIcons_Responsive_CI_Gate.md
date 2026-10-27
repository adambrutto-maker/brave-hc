# Brave H.C. Icon System — Responsive Browser Regression Gate

Date: October 27, 2026
Scope: quality assurance only; no production artwork, native HTO records or historical results change.

## Reason for this release

The October 27 historical-highlight artwork rollout (#121, #129, #130, #131) completed 306/306 icon coverage, including the original black Andrew Cristillo 32–73 patch, both Rolaids Relief Man winners, new tiered milestone badges, and correct 48px/58px rendering. Existing GitHub Action guards verify hash manifests and record identity, but cannot independently detect a future CSS-size cascade regression.

## New regression guard

- `tests/test_player_icon_dimensions_portable.py`: read-only Selenium browser acceptance.
- Runs against all 43 public legacy-highlight profiles at browser-emulated 355px and 810px widths (86 sessions).
- Expands all historical rows and checks 306 full-size icon placements: 105 award, 97 milestone, 58 championship/All-Star, 46 heritage.
- Enforces actual parent image frame **48 × 48px** at mobile 355px and **58 × 58px** at desktop 810px.
- Protects the 11 original Cristillo award placements, both Rolaids winners and 16 James Norris entries; disallows generic highlight badges, broken images and horizontal overflow.
- Checks original award, tier, special and heritage SHA-256 assets against source manifests before opening browser.
- Checks actual source-controlled HTML, JavaScript and image assets served from a read-only temporary local HTTP server; no HTO editor modifications.
- Run with `python tests/test_player_icon_dimensions_portable.py` on BRUTTECH 1 (Edge). Use `BRAVE_QA_BROWSER=chrome` on the GitHub Ubuntu runner.
- `.github/workflows/player-highlights-integrity.yml`: now runs the Chrome browser acceptance on PRs after existing 109-player ledger and deterministic artwork checks.

## Local acceptance

- PASS: Microsoft Edge on BRUTTECH 1, 43 verified identities, 86 responsive sessions, 306 matching rows, zero missing images, incorrect sizes or overflow.
- PASS: Original award hashes and no alteration to the production historical Highlights ledger.
- CI workflow acceptance must pass independently before merge.

Release constraint: no visual or editorial changes in this QA-only workstream.
