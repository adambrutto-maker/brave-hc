# BruTTech SportsOS — LeagueOS V22 Source Reconciliation Review

Date: November 17, 2026 (America/Toronto)
Lead: Engineering Department / LeagueOS
Status: Public-source, review-only candidate. Not an authenticated administrative approval, score publishing, league integration or live HTO synchronization.

## Objective and continuity

Continue the same public SportsOS demonstration with a first-class **LeagueOS commissioner source-review page**, connected to HockeyOS V21 native game pages. Preserve the V18 practice game scorer and TeamOS result bridge, V19 responsive website shell, V20 native roster and statistics, and V21 schedule/results/scoreboard without changing any authoritative HTO or Sports Village record.

## Source boundaries and independent clean-room development

The original public HTO pages and public SVHL evidence files provide factual observations, not source code or proprietary interface designs. The V22 JavaScript, visual layout, evidence model, local review workflow, tests and comparison scripts are original BruTTech artifacts.

Inputs:
- `widgets/leagueos-source-qualified-current-fixtures-v4.json`, schema `bruttech-svhl-current-fixture-window/v4`, **captured 2026-11-16**, 411 fixtures over four league nights
- `widgets/hockeyos-hto-games-v21.json`, schema `bruttech-hockeyos-hto-games/v21`, **captured 2026-11-17**, nine Brave H.C. HTO current-season source IDs (eight completed and one upcoming)
- `widgets/svhl-upcoming.json`, schema `brave-hc-svhl-schedule/v1`, **checked 2026-11-17**, six supplemental Brave H.C. schedule entries

These are independent dated snapshots. A stale, missing or inconsistent source must not be silently treated as current. SHA-256 hashes for all three input files and source dates are included in the derivative artifact `widgets/leagueos-reconciliation-v22.json` created by `scripts/build_leagueos_reconciliation_v22.cjs`.

## Reconciliation method

- Only the public League 570 `Braves HC` fixtures are compared to the published HTO `Brave H.C.` games; the remaining league-wide fixtures are **not claimed** to have HTO parity.
- Compare **exact date, local start time and literal opponent name**, plus both published final scores for completed games or rink for upcoming previews.
- Reciprocal SVHL home/away is used only to orient the SVHL goals; never infer that HTO page title order indicates home versus away.
- A single source-specific punctuation alias (`Mohawks HC` / `Mohawks H.C.`) is retained as **review required**, not silently accepted. Even identical date, time and final score cannot authorize team identity or bind cross-system IDs.
- A public parity observation may link to its original HTO source and the corresponding **read-only HockeyOS V21 page**. It is not an authenticated cross-ID registration, approval, authorization to edit or automatic update.
- The supplemental schedule and separate 411-row source registry are not interchangeable. A future proposal outside the bounded registry requires source verification before appearing as a certified HockeyOS fixture.
- A past ambiguous league 0:0 result remains `PAST_ZERO_ZERO_HOLD`; zero cannot be promoted to a confirmed draw, awarded points or copied to standings.
- Any unexpected source shape, duplicate HTO ID attached to multiple league fixtures, reversed/changed final, missing upstream fingerprint or category-evidence inconsistency fails closed.

## Verified derived classifications (November 17, 2026)

| Case class | Count | Interpretation |
|---|---:|---|
| Exact completed public source parity | 7 | Date/time/opponent/final match; no official cross-ID binding |
| Future public parity | 1 | Nov 22, HTO #3375686 ↔ SVHL #128129; data sources agree on time/opponent/rink |
| Opponent alias review hold | 1 | Sep 27 Mohawks HC vs Mohawks H.C. spelling difference; no silent identity join |
| Critical reused historical HTO ID | 1 | Dec 6 Mid Ice Crisis future proposal references HTO #3375683 already completed Nov 1 |
| Supplemental future, HTO absent | 4 | Nov 29, Dec 13, Dec 20, Dec 27 not certified in public HTO + bounded canonical fixture registry |
| Unresolved league source 0:0 holds | 10 | Across Sunday, Tuesday and Thursday; not confirmed draws |
| **Total** | **24** | **8 public parity observations / 16 review-required cases** |

League-wide source counts, presented separately: **411 total**, 335 completed, 66 future, 10 held. These counts cover the archived registry snapshot only and do not establish current facility ice availability or future HTO coverage.

## User interface / review features

- Distinct LeagueOS `Source Review` top-level navigation, commissioner homepage tile and League Admin module, all at `#league-reconciliation`.
- Metrics for league source totals, public parity, review holds and critical historical-reference collision.
- Focused evidence notice for **December 6 vs Mid Ice Crisis** reusing the **November 1 game HTO #3375683**.
- Cases categorized and filterable: Needs review, All cases, Public parity, Future proposals, League result holds, Brave H.C. pilot; search, night and priority filters.
- Read-only detail panel with both source IDs, classification, precise date/time, home/away, score/rink comparisons, issue explanation and allowlisted original HTO/SVHL evidence links.
- Public-parity-only `Open HockeyOS source record` shortcut. Critical, missing and alias holds do not create an implied valid HockeyOS match.
- Browser-local review notes with limited working statuses (Unreviewed, Investigating, Source evidence needed, Internal note recorded), an 800-character evidence field, and JSON export **without any server submission**.
- Every local note is bound to the exact **three-source SHA-256 revision tuple**; changing any of the three source snapshots makes the old note inapplicable to the new comparison. Local annotations never clear a source hold.
- Responsive desktop/mobile layout with case list, evidence details, horizontal scrolling confined to tabs, and clear read-only notice.
- Invalid or tampered output shows a source hold, not a dashboard with invented authorized actions.

## Safety and governance

No HTO editor, SVHL commissioner credential, official standings, authoritative game result, referee signature, payment, player roster, TeamOS historical workbook or external communication was modified. The static GitHub Pages demonstration does **not** implement identity verification, actual approval, server-side immutable audit or cross-device synchronization. The “Source Review” workspace is a bounded **product concept + evidence review**, not a league-staff administration service.

Never infer that:
- a public source tuple match represents an officially authorized cross-system game ID binding;
- an existing completed HTO game ID can be reused for a future fixture;
- a supplemental future proposal without exact HTO parity is an officially confirmed game;
- a held source 0:0 has been played or settled;
- a local note constitutes league approval, a referee declaration, or an official correction.

All JavaScript/HTML/CSS in this increment is independently authored; no HTO website markup, scripts, proprietary media or editor components were copied.

## Verification and release requirements

- V22 source model generation: 24 cases, 8 observed public parity, 16 source holds; source fingerprints captured; no external writes.
- 25 new V22 source model/unit tests and 60 existing tests: **85 / 85 passed**, including source parity tampering, alias and historical collision safeguards, local-note revision binding and host-allowlisted source URLs.
- V22 local Edge end-to-end checks: **50 / 50 passed** on desktop and 390px mobile, including source-hold protections, search, filters, notes, export, deliberate hostile text, direct HockeyOS source navigation and negative tampering checks.
- Inherited local regressions, to be reconfirmed after this final patch: V21 43, V20 28, V19 29, V18 14.
- QA screenshots, local notes and review exports stay in external review-only directories, not the public repository.

Release path: verify clean branch + `git diff --check`, GitHub PR, squash merge following test evidence, GitHub Pages deployment status, public script/source readback, rerun V22 and inherited regressions against the actual HTTPS demo.

## Next increment

Future production integration would need authenticated commissioner/referee roles, authoritative league write access explicitly granted, independent source reconciliation signoff, tamper-evident audit, revision conflict resolution and source ownership agreements. Until those gates are approved, build only read-only, source-qualified administrator aids such as case triage, evidence annotations and reporting.
