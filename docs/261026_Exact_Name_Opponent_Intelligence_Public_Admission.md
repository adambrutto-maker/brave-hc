# HockeyOS Opponent Intelligence — Exact-Name Public Admission (26 October 2026)

## Scope
Lead: Data & AI; Supporting Engineering, Media, QA. This release admits four historically supported opponent profiles to the existing Division Centre's Opponent Intelligence tab. The public feed contains only aggregate scores/results for Brave H.C. against each opponent. Original Master Workbook, HTO CMS, source games, individual player data and projection formulas remain unchanged.

## Authoritative evidence
- Canonical read-only Master Workbook SHA256 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154.
- Historical Master Schedule completed games: 358; X=0 unfinished fixtures excluded.
- Official HTO completed 2026–27 games: 5; current 1–4–0, 12 GF, 23 GA, 5 unique HTO game IDs.
- Private combined ledger: 363 completed event records, 84 exact names, marked PRIVATE_PARITY_PASS_EXACT_NAMES_ONLY; released=false, workbookWritten=false, public approval withheld until this separate scope admission.
- Current official SVHL Cristillo Division membership: eight teams. League ranking and historical matchup records remain sourced independently.

## Explicitly qualified exact-name opponents
- Big Bastones: regular season 7 GP, Braves 4–2–1, 24 GF, 27 GA. Includes verified October 25, 2026 6–4 victory (HTO 3375682). All-time 8 GP, 4–3–1, 24 GF, 32 GA.
- Mid Ice Crisis: regular season 5 GP, 1–2–2, 13 GF, 19 GA. All-time including playoffs 7 GP, 1–4–2, 15 GF, 25 GA.
- Dateline Predators: regular season 11 GP, 8–3–0, 41 GF, 25 GA.
- Zamboner Crew: exact-name source 1 GP, 0–1–0, 1 GF, 7 GA.

## Held identities — no invented records
- Mohawks HC: source ambiguity relative to Mohawks H.C. No alias merging.
- Sugo Sundays: identity relative to Michelob Morts not proven. No guessed renaming.
- Other Way: no verified exact-name match. Do not imply true historical record is 0–0–0.
- Exact-name limits may undercount true franchise history when verified names changed. The UI explicitly describes exact-name scope.

## Release artifacts and safeguards
- scripts/admit_exact_opponent_public_feed.py: re-runs pure public preview adapter from qualified private ledger, checks pinned workbook hash, five-game/score count, latest HTO game 3375682, expected four exact aggregates and exact three hold states. Drops potential alias names and private source-row information; emits seven entries and status PUBLIC_VERIFIED_EXACT_ONLY.
- widgets/opponent-intelligence.json: public-only status-qualified aggregate feed. As-of timestamp inherits the official HTO readback.
- Existing widgets/home-premium.js supports the feed already, requiring exact schema, seven unique teams, current source status, explicit publishable flag and source freshness. It preserves holds by opponent.
- tests/test_public_exact_opponent_admission.py: six tests, including required source agreement, wrong source SHA, altered scores, unexpected alias, source age, and game-count drift.
- tests/test_public_exact_opponent_widget.cjs: local Chromium live-file browser QA at 358px, all four W/L/T GF/GA cards, correct three hold states, fixed-height scroll and no JS exceptions.
- Existing release-preview tests six PASS.

## Publication policy
A pass is qualified only for the five-game October 26 snapshot. A sixth game requires a new independently source-qualified scope check before refresh; do not automatically reuse the fixed 5-game public admission token. The weekly private ledger pipeline already stages new HTO games but must not automatically release an unsupported new opponent mapping.

## Rollback
Revert the release PR to remove widgets/opponent-intelligence.json. The site's optional feed loader will then fail closed to the existing hold message. No source workbook or HTO data needs restoration.
