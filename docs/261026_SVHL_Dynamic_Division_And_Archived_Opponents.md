# Brave H.C. / HockeyOS — SVHL Division Membership Changes Without Losing Historical Opponents
Date: October 26, 2026
Lead: Data & AI; supporting Engineering, Media and QA.

## Trigger and diagnosis
The live SVHL Winter 2026/27 Cristillo Division standings changed after the previously verified canonical-source release. The league's eight team keys now include **Maplewolves** and no longer include **Sugo Sundays**. This is a **division-membership change**, not proof of any team rename. It must never relabel one franchise as another or remove a completed Brave H.C. game against a former division member.

This change also revealed that the earlier seven-entry public opponent feed, its frontend, and one publisher source-admission test incorrectly assumed the same seven opponent keys remained in the division indefinitely. The operational publisher correctly failed closed with DIVISION_TEAM_NAME_SCOPE_CHANGED, preventing publication of a wrong history.

## Original source evidence
The canonical read-only Master Workbook has **10 completed Maplewolves games**: eight regular season (Brave H.C. 2–5–1, 28 GF / 44 GA) and two playoff games (1–1–0, 11 GF / 12 GA). Verified all-time is 10 GP, **3–6–1, 39 GF / 56 GA**. This is genuine existing history, not a new name inferred from the league.

The original 49-game Mohawks H.C. historical baseline plus the single 2026 official HTO meeting remains 50 GP, 19–20–11, 193 GF / 176 GA. The official October 4 game against Michelob Morts (league Sugo Sundays) remains a verified current-season event, **0–1–0, 2 GF / 3 GA**, but it is not currently one of the seven Cristillo Division opponent slots. Historical Michelob/Sugo lineage remains limited to that verified game only.

The league still refers to the proper Brave H.C. team by its wrong alias 'Braves HC'. The underlying league data, original workbook game rows and official HTO source names remain unchanged.

## Architectural separation
- Current SVHL standings source determines exactly **eight current division members, including Brave H.C. under the source key Braves HC**. The seven *current* opponent dropdown entries are based on those seven keys; the public display uses accepted HTO/workbook canonical names.
- The opponent ledger retains source-qualified current-season HTO opponent identities even after a league membership change. Departed opponents are stored as **SEASON_OPPONENT_ARCHIVE** and shown in a separate dropdown entry. They are not counted as current division members, and their historical totals are not silently erased.
- The current public feed has **seven source-qualified opponent histories and one NO_EXACT_HISTORY** entry, for eight opponent choices total: seven current division opponents plus one archived completed opponent (Michelob Morts/Sugo Sundays).
- No historic franchise identity can be inferred from league roster swaps. Unmatched new league teams are held with NO_EXACT_HISTORY, rather than an invented 0–0–0.
- Canonical builder keeps separate all-time, regular-season, playoff and last-five records. No duplicate HTO game IDs or workbook historical rows may enter a published result.

## Implemented paths
- scripts/build_dynamic_exact_opponent_feed.py: current division keys derive from the accepted SVHL standings source at each read, retaining original source-level score/parity gates.
- scripts/build_canonical_opponent_feed.py: qualifies the two existing official HTO/workbook canonical name pairs; moves any certified current-season former division member into the separate archive.
- widgets/opponent-intelligence.json: currently verified 5-game release snapshot with eight entries and explicit membershipStatus per entry, never a forced relabel of Maplewolves to Michelob.
- widgets/home-premium.js: preserves the seven current division teams, offers the one completed archived matchup as a distinguishable extra option, and displays correct historic scope and source provenance without altering division standings.
- widgets/home-panels.html: bumps the JavaScript cache version to 20261026-division.
- scripts/check_public_canonical_identities.py: public-only independent source validation now requires seven current opponent entries plus the separately counted archive, Maplewolves' immutable 10-game historical baseline, canonical Brave H.C./Mohawks H.C. names, and a limited Michelob record.
- Tests updated for current division membership and archives, with six extra mutation checks for missing Maplewolves, deleted or falsely-current Michelob history, incorrect Maplewolves game counts and unauthorized source-name switches.

## Safety, deployment and rollback
- The original Master Workbook (SHA256 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154), approved Hot Stove, source HTO boxscores, league source standings and provisional projections remain unchanged.
- Release only the source adapter, public opponent JSON, frontend and regression tests. Run the canonical public GitHub Actions verifier before merge; release with GitHub Pages, then verify the actual HTO homepage iframe and all current/archived opponent choices.
- Version and back up the BRUTTECH 1 operational private and public publisher modules, test on real five-game source without publishing, and only then replay the weekly publisher. A failure must roll back source modules without modifying the protected workbook or public history.
- Future source-verified HTO results automatically extend the established canonical opponent's history under the same official HTO name. A changed official HTO name, game identity or unmatched original date must still fail closed.
