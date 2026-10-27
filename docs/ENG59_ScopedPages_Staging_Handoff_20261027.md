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
