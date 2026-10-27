# Bio profile polish — build and validation

Related: HockeyOS issue #79. Base: `de9a850`. Build branch: `codex/bio-profile-polish`.

## Result

Implementation complete; release held. The new Bio browser suite passes. The existing broader player-link suite fails on `projection-v2.html`, including on an isolated unchanged checkout of the base commit. No production deployment or HTO editor writes were performed for this build.

## Changes

- Show player identity inside embeds, section navigation, compact closed chart/table disclosures, and larger touch targets.
- Preserve sourced leadership text inside the Bio widget while removing repetitive per-row source labels.
- Add archive-based highest season points, including ties, and general public 1-2-2 system cues.
- Keep current-season and career snapshots separate and expose their dates in a source disclosure.
- Reject invalid player links before rendering; show loading/retry states; retain career history when the current-season source fails.
- Correct goalie wording that previously implied unpublished observations appeared on the page.
- Stop cumulative chart series at the first missing value to avoid understated running totals.

No statistical or leadership source JSON, Highlights widget, player installation, private coaching feed, or game-by-game publication was changed. Existing Bio embeds will consume this shared widget after a future deployment; reinstalling 109 snippets is not needed for these changes.

## Verification

`node --check widgets/player-bio.js`, `node --check widgets/player-bio-charts.js`, and `node --check tests/test_player_bio_browser.cjs`: pass.

`git diff --check`: pass.

With Playwright available and Chromium installed:

```sh
BRAVE_CHROMIUM_PATH=/path/to/chromium node tests/test_player_bio_browser.cjs
```

The executable override is optional with a standard Playwright browser installation. The test uses a local HTTP server, isolated headless pages, and blocks external requests. It never uses an authenticated HTO browser session.

Observed with Chromium 153:

- 109/109 exact identities and official profile links; all 13 leadership entries match the source.
- No horizontal overflow at the per-player mobile viewport; responsive chart navigation and filters pass at widths 320, 390, 625, and 1280.
- Mixed skater/goalie roles, player switching, chooser reset, and missing/noncanonical/unknown IDs pass.
- Career, current-season, and leadership source outage fixtures produce the expected visible states.
- Spoofed identity and malformed leadership are rejected; zero GP does not create invalid rates.
- A cumulative series with a missing middle value does not resume after the gap.
- No browser page errors. Mobile and desktop screenshots visually reviewed.

## Release blocker and next steps

`node tests/test_player_links.js`: 10 pass, 1 fail. The test at line 41 requires an inline shared linker script in `projection-v2.html`; that file is now a redirect to `home-panels.html`. The identical failure reproduces at base `de9a850`. It is not caused by this Bio change.

Per the user's stop-on-validation-failure instruction, release work stopped. Resolve the redirect/link validation contract before releasing. Then rerun both suites, deploy the shared widget, and verify public HTO Bio and Highlights on representative skater, goalie, mixed-role, leadership, and missing-history profiles. Local browser verification is not a claim of public HTO verification.
