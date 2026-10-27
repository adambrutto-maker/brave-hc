# Bio profile polish — build and validation

Related: HockeyOS issue #79. Base: `de9a850`. Build branch: `codex/bio-profile-polish`.

## Result

Implementation complete; release held under the user's draft-only authorization. The Bio browser suite and all 12 player-link tests pass. The earlier redirect-related test failure is resolved with explicit redirect and destination coverage. No production deployment or HTO editor writes were performed for this build.

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
- Spoofed identity, unknown career status, malformed career segments, and malformed leadership are rejected; zero GP does not create invalid rates.
- Retry after a current-season outage restores all four statistics cards and preserves the selected player identity.
- A cumulative series with a missing middle value does not resume after the gap.
- No browser page errors. Mobile and desktop screenshots visually reviewed.

## Redirect validation resolved; deployment remains held

The original player-link suite had 10 pass / 1 fail because it required an inline linker script in `projection-v2.html`, now a redirect. The same failure reproduced at base `de9a850`.

The revised contract keeps direct linker checks on active pages and separately verifies both legacy redirect pages (`projection-v2.html` and `standings-v2.html`). It executes their JavaScript redirect, checks the HTML refresh and fallback anchor, requires the exact panel and full-view parameters, and confirms the canonical destination loads the shared linker. No production redirect code was changed and no route is excluded from coverage. `node tests/test_player_links.js`: 12 pass, 0 fail.

The expanded Bio browser suite also passes after the career-shape validation change. Draft PR #110 remains unmerged; deployment remains blocked as explicitly requested by the user. A future authorized release must verify public HTO Bio and Highlights on representative skater, goalie, mixed-role, leadership, and missing-history profiles. Local browser verification is not a claim of public HTO verification.
