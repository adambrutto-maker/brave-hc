# ENG CHAT 59 — Scoped static website preview: implementation handoff

**Date:** 2026-10-27. **Environment:** BRUTTECH 1 only. **Status:** Developer-tested PRIVATE preview; NOT independently privacy-reviewed, released, deployed or merged.

## Concrete release candidate, distinct from Pages publication

The existing repository's `.github/workflows/pages.yml` deploys the entire repository root on `main`. This includes tracked `docs/`, `scripts/`, `archive/` and other materials not required for visitors to use the Brave H.C. site. Prior ENG59 source-scope review flagged one internal-source-workbook review document and two private-ledger helper scripts already tracked there. Existing source owners retain authority over those documents; ENG59 has **not altered, deleted, redacted or made claims of privacy clearance** for them.

A new **PRIVATE scoped web-asset candidate** was built *outside* the Git checkout at:

`D:\BruTTech\Products\HockeyOS\Implementation Control\ENG59_ScopedSite_PrivatePreview_261027`

Its source-manifest receipt remains outside GitHub at:

`D:\BruTTech\Products\HockeyOS\Implementation Control\261027_ENG59_ScopedStaticPreview_Manifest_PRIVATE.json`

The explicit deterministic builder `scripts/build_eng59_scoped_static_preview.py` includes only source-tracked repository `index.html` and `widgets/` HTML, JS, CSS, JSON and image static assets. It excludes private/internal non-web files (including all `docs/`, `scripts/`, `archive/`, `snapshots/`, `.github/`, `README.md`, all `.txt`, and any private/credential-named web asset). Builder checks no symlinks, target traversal, no overwrite, exact SHA256 copied bytes and HTML-relative asset links. It does not change the accepted main site, CI deployment workflow, source JSON or event/player records. The receipt explicitly records `publicReleaseApproved=false` and `independentPrivacyApproval=false`.

**Observed scoped preview:** 156 source-matched static files, 16,477,085 original bytes, 134 relative HTML asset links verified, and no internal review/processing files included. The current `index.html` redirect to `widgets/analytics.html` works. Preview browser QA at **1140px and 358px** rendered League Intelligence, Division Fit Lab and Player Game Audit from the isolated directory without local 404s, JavaScript errors or horizontal overflow; Division Fit Lab displayed `INSUFFICIENT_VIDEO`. The candidate can be recreated without private upstream data or network access.

## Controlled review and production gates

CI only executes `python -B scripts/build_eng59_scoped_static_preview.py --check-only --output "$RUNNER_TEMP/eng59-private-preview-candidate"` and its offline negative tests. **CI does not stage or publish the candidate**, and the local browser test is developer smoke, not a human independent QA sign-off. None of the original root Pages workflow or its promotion mechanism was changed.

For any future deployment, a separate, explicitly approved change to the site deployment packaging would be needed; the private preview does **not** replace the existing GitHub Pages publication workflow. Before that change, human reviewers must validate all included static web assets' publication rights/privacy and links (not only excluded internal files), assess the proposed scope with other BruTTech workstream owners, and independently confirm parity with existing production navigation and functionality. An authorized founder release decision, controlled rollback and separate postdeployment smoke remain mandatory. Source-owner scoring/roster holds and video calibration `INSUFFICIENT_VIDEO` remain untouched.

**Source-only candidate may be considered separately from historical score corrections or Video Intelligence promotion.** The preview tests cannot authorize team division realignment, player/stat amendments, independent review acceptance or publication.

## Cross-check correction — canonical Git-byte reproducibility

The first local developer preview was valid for that checkout but its static text files retained worktree line endings. Independent BRUTTECH 1 checkout validation exposed different output byte totals for the **same committed source**, because Git's Windows checkout normalization added CRLF to some HTML/JS/JSON/SVG. Therefore the initial preview/receipt is **superseded for byte-exact release comparison** but preserved as a private QA artifact; no source bytes or original site were modified.

The builder now normalizes only CRLF to LF for tracked web-text extensions and **cryptographically verifies the resulting bytes against the original Git index blob object ID for every file**, rejecting uncommitted source drift, changed content and unsupported Git file types. Binary images remain untouched. As a result, stage outputs are checkout-invariant and have the exact committed Git blob contents (rather than checkout-specific worktree bytes).

Canonical PRIVATE preview:
`D:\BruTTech\Products\HockeyOS\Implementation Control\ENG59_ScopedSite_CanonicalPrivatePreview_261027`

Canonical receipt:
`D:\BruTTech\Products\HockeyOS\Implementation Control\261027_ENG59_ScopedStaticCanonicalPreview_Manifest_PRIVATE.json`

**Source preview:** 156 Git-verified files, **16,403,441** canonical Git-blob bytes, **134** verified relative HTML references. No docs/scripts, no credential/private-named web assets, no media/source-owner private captures. The original staged preview remains separate and is not an approved release target. The builder produces no public deployment and the existing GitHub Pages workflow is unchanged. The handoff document itself was renamed to avoid creating an additional `Private`-named tracked source path in the unrelated strict root-Pages privacy inventory (the three existing flagged paths stay exactly the same).

The independent isolated Git checkout must re-run the canonical builder and compare the SHA256 manifest **file-by-file** before any release recommendation. Human privacy/rights and production approval remain separate.

## 2026-10-27 — Reconciled accepted PR #133 icon source assets

`main` accepted source PR #133 via merge `092116f` (player artwork and approved round-club icon manifests). ENG59 merged that main commit without changing any original source, image, Highlights system or award decision. The existing private Pages preview builder now additionally checks all **five** accepted icon source manifests (awards, clubs, heritage, round-clubs, special) against the **61 source-declared assets**: matching relative names, Git index object identity, canonical bytes, declared sizes and SHA256 digest. Missing or tampered artwork is a release-preview hold rather than a fallback invented award.

New isolated local web-only preview:
`D:\BruTTech\Products\HockeyOS\Implementation Control\ENG59_ScopedSite_CanonicalPreview_Main133_261027`

New PRIVATE manifest:
`D:\BruTTech\Products\HockeyOS\Implementation Control\261027_ENG59_Main133_StaticPreview_Manifest_PRIVATE.json`

**Preview scope:** 179 Git-verified web files, **16,719,711** canonical Git bytes, 134 validated static HTML relative links, 5 source manifests and 61 image assets. Browser private-preview smoke at 1140px desktop and 358px mobile passed homepage navigation, League Intelligence, Division Fit Lab and Player Game Audit; no missing local assets, JavaScript errors or horizontal overflow; optional video strength remains `INSUFFICIENT_VIDEO`. No publication occurs, and neither privacy/legal rights nor independent release QA is implied by a source hash. Prior canonical preview remains preserved and reproducible for its own earlier source HEAD. Do not overwrite historical receipts or replace Pages deployment without human approval.

## October 27 — Accepted PR #134/#135/#136 scope and all-page QA

ENG59 branch incorporated three completed upstream mainline releases: `#134` verified-source hourly refresh, `#135` approved 17-piece visual icon collection, and `#136` current HTO player actuals selection. These are pre-approved upstream changes, not newly inferred scorer stats or award decisions by ENG59. Upstream source processing and UI ownership remain unchanged. No unexpected merge conflict arose.

Expanded scoped package now verifies **six** original artwork/source manifests, including `widgets/assets/approved/source-manifest.json`, with **78 declared assets**. Every approved image must have the exact manifest-relative URL, Git-blob source bytes, declared byte count and SHA256; duplicate, missing or forged artwork fails closed. This updates the previous five-manifest/61-asset validation without granting new artwork or identity rights.

PRIVATE source snapshot on BRUTTECH 1:

`D:\BruTTech\Products\HockeyOS\Implementation Control\ENG59_ScopedSite_CanonicalPreview_Main136_261027`

`D:\BruTTech\Products\HockeyOS\Implementation Control\261027_ENG59_Main136_StaticPreview_Manifest_PRIVATE.json`

**197 static web files; 16,912,128 canonical Git bytes; 134 verified local HTML links; 78 artwork assets across six manifests.** All source SHA256s and 13 local negative/positive scoped packaging tests passed. The previous candidates remain protected for prior-HEAD comparison. No internal scripts, docs, private owner review files or unrelated source artifacts were added to the package.

A new local-only `tests/test_eng59_all_static_pages_browser.cjs` audits **all 26 widget HTML documents at both 1140px and 358px**, using a private localhost HTTP server and recording page errors, local HTTP 4xx/5xx and horizontal overflow. This is broader than the original three-scoped-page test; it is **developer browser smoke only**, not a replacement for per-feature gameplay, authentication, mobile device usability, user acceptance or independent privacy QA. Browser test uses the existing authorized BRUTTECH 1 Edge/Puppeteer tooling and does not access production or publish the preview. The detailed private receipt, if generated, lives outside the Git tree at `261027_ENG59_Main136_All26Pages_Browser_PRIVATE.json`.

**Important:** This source-only package remains a proposal. The installed Pages workflow currently publishes the repository root; no deployment workflow change, PR merge, independent reviewer approval, official score correction, roster admission, or Video Intelligence strength calibration is authorized here. Frozen preview JSON represents the source at its recorded Git HEAD and may be superseded by later approved hourly current feeds.

## Complete 26-page offline browser smoke — source-only preview QA

The local developer-only runner `tests/test_eng59_all_static_pages_browser.cjs` now serves the private snapshot exclusively on loopback and **blocks external HTTP requests**. It checks all 26 `widgets/*.html` pages at 1140px and 358px (52 page loads), records relative local HTTP failures, uncaught JavaScript exceptions, and horizontal overflow, and fails if an issue is detected. This is a startup/static render smoke at 400ms after DOM-ready, not an exhaustive functional interaction or live API/authentication/rights review. The homepage redirect and three high-impact scouting views also have separate deeper browser tests.

The bounded private artifact `D:\BruTTech\Products\HockeyOS\Implementation Control\261027_ENG59_Main136_All26Pages_OfflineBrowser_PRIVATE.json` records the verified result: **52/52 page loads, zero detected local HTTP failures, zero uncaught JavaScript exceptions, zero horizontal overflow cases**, no external requests permitted, no publication or remote site action. It does not include screenshots, protected source ledger content or private authenticated pages.

Accepted source #134/#135/#136 remains unchanged in Git. The private package snapshot remains frozen at its captured SHA and is **not** an alternative source of fresh HTO statistics; actual publishing/preview parity with continuing accepted live upstream content will need a later controlled build and independent review. Human privacy/content approval, owner corrections, draft PR review and Pages packaging/deployment authorization all remain pending.

## October 27 — Reconcile accepted hourly HTO publisher and frozen-preview freshness

The ENG59 branch ingested accepted upstream PR #137 (`8cd70e3`, merged into `main` at `3a09dac`) plus the accepted subsequent source refresh commits `0cec055` and `30cd14f`. These changes add an **independent** hourly HTO skater source `widgets/player-actuals-hourly.json` and refresh verified current feeds. ENG59 does not own that source publisher, affect its schedule, overwrite the enriched `player-actuals.json` or automatically award player achievements.

Source readback shows `VERIFIED_HTO_CURRENT` W2026/27 hourly skater data at `2026-10-27T22:53:27.502Z` with HTO 5 GP / 12 GF / 23 GA; original enriched source is older at `2026-10-26T12:31:01.197Z`. The values are independent public-source evidence, not an ENG59 scoring correction. The League Intelligence source is dated separately and is not a substitute for current HTO actuals. An approval to release can never be inferred from the word `VERIFIED`.

New `scripts/check_eng59_frozen_source_freshness.py` and `tests/test_eng59_frozen_source_freshness.py` implement a **read-only** release-snapshot boundary: exact HTO identity, season, status, UTC-aware as-of, monotonic against prior enriched baseline, existing league scope and canonical Git source hashes; when passed a separately stored private-preview manifest, all three source JSON bytes must match the source snapshotted for review. Eight synthetic tests reject older/malformed timestamps, source drift, out-of-scope evidence and accidental reuse of an earlier preview. There is **no invented elapsed-time approval threshold**, remote fetch, source rewrite or production deploy. The check always returns `currentAtReleaseVerified=false` and `requiresLatestSourceRecheckBeforeHumanPromotion=true`.

Updated PRIVATE candidate:
`D:\BruTTech\Products\HockeyOS\Implementation Control\ENG59_ScopedSite_CanonicalPreview_Main137_261027`

Related private receipts:
`261027_ENG59_Main137_StaticPreview_Manifest_PRIVATE.json`;
`261027_ENG59_Main137_SourceFreshness_PRIVATE.json`;
`261027_ENG59_Main137_All26Pages_OfflineBrowser_PRIVATE.json`.

**Scoped snapshot:** 198 tracked web files, 16,914,859 canonical Git bytes, 134 relative links, source-only 6 artwork manifests / 78 source-verified icons; all 26 widget HTML pages passed offline 1140px/358px smoke with external network explicitly blocked, no missing local HTTP resources, JS exceptions or horizontal overflow. This still does not verify nonlocal production integrations, source rights, active hourly freshness or end-user feature acceptance. Every promotion requires an explicit latest-source recheck against current accepted `main`, owner privacy/content assessment, independent PR acceptance and founder deployment approval.

## October 27 — Exact GameInfo score sides and accepted transparent artwork backup exclusion

The ENG59 source-admission UI previously compared a current official GameInfo result only by **absolute goal margin** in the Division Fit consumer. Developer adversarial negative tests demonstrated a same-margin 6–1→5–0 replacement and score-side reversal could bypass that consumer check. The `division-fit-model.js` original season-team reciprocal game graph now stores the exact final goals in ascending source team-ID order, and `video-strength-evidence.js` requires the GameInfo result to equal **both original team-side values** after reorienting to official home/away. The official league ID must also match. These are *read-only defensive source checks*: none of the 54 accepted official game records, 79 archived H2H games, original player stats, held historical scoring or league/division research rankings are modified. Source builder admission remained exact before this improvement; the UI is now independently equally strict.

Accepted upstream `main` PR #138 added original opaque artwork **provenance backups** alongside transparent approved artwork. They are referenced as `opaqueSourcePath` and `opaqueSourceSha256` **only in the source manifest**, not runtime HTML or JS. The private web-only preview builder now verifies the hashes of these 39 retained source backup files against source manifests *while excluding the backups from the proposed website package*. It includes the approved transparent artwork at its current source hashes and retains the original files in the original repository untouched. New negative tests reject backup tampering, retained backup inclusion, wrong current-score side/total and incorrect league identity. Source-file content/privacy and publisher production approval continue to be separately held.

The existing deployment workflow still publishes the **whole repository root**, so this bounded private-preview exclusion does not assert production has been fixed. A future authorized release would need an approved change to Pages packaging and independent QA/privacy review of the actual web-asset contents.

## October 27 / PR #139 — discipline artwork provenance retained, website source surface reduced

The latest accepted `main` merged PR #139 (approved whistle and red/yellow referee-card discipline icon) and added three original upstream source/provenance files: `assets/approved-sources/discipline_record_whistle_redcard_master.png`, `assets/approved-sources/discipline_record_whistle_redcard_200.webp` and `assets/approved-history/discipline_record_neutral_20261027.webp`. Their paths and exact SHA256s are declared in the public source manifest; no HTML or JavaScript runtime source requests those files.

The ENG59 **private** scoped-package builder now validates each provenance source file's declared SHA256, exact location and no duplicate paths, while explicitly excluding these three non-runtime files and the 39 existing opaque artwork backups from the proposed public site. The approved `widgets/assets/approved/discipline_record.webp` remains published as the runtime asset with its newly accepted official SHA256. The original source files remain retained in Git and owned by the art workstream; ENG59 has not deleted them or changed awards, player data, nor the existing root-publication workflow.

**Source-only private candidate**: `D:\BruTTech\Products\HockeyOS\Implementation Control\ENG59_ScopedSite_CanonicalPreview_Main139_261027`, receipt `261027_ENG59_Main139_StaticPreview_Manifest_PRIVATE.json`. Contains **198 canonical Git website files, 18,058,847 bytes, 134 static HTML links**, six approved artwork source manifests, 78 approved runtime icon assets; SHA256 checks protect 39 opaque plus three additional source/history files retained outside the package. The local isolated viewport browser check runs all 26 pages × 1140px/358px (52 loads) without production access or remote HTTP.

The proposal still needs independent privacy/content approval and explicit authorization to replace the existing Pages root-publishing mechanism. These staging checks do not remove previously published sensitive content retroactively or establish any authorization to deploy.
