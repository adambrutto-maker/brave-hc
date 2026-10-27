# Brave H.C. — Hourly verified-source refresh and current-season widget update

Date: October 27, 2026
Scope: BruTTech personal HockeyOS only, not TSTG.

## Implemented in this release

- `.github/workflows/brave-record-source-refresh.yml` now has hourly scheduled UTC trigger `23 * * * *`, in addition to its existing event-based dispatches. This reads HTO published game results and validated records, refreshes published record feeds only when validated output changes, and publishes GitHub Pages when necessary.
- Existing player Highlights refresh of `player-highlights-ledger.json` remains **every 180 seconds while the iframe is open**, contingent on a verified canonical ledger update.
- Current-season section now refreshes `awards-participants.json` every **3,600 seconds while the iframe is visible**. It rejects wrong schema/status, older source timestamps and regressing team-game counts. Current data remains clearly labelled a source-date snapshot; no leaderboard implies an award winner.
- Repeated current-season refreshes replace the previous source-context paragraph rather than duplicating it.
- Browser CI check exercises both timers, rejects an unverified participant feed, displays a later verified synthetic HTO snapshot, preserves historical awards and checks for duplicate context.

## Verified boundaries and remaining integration

- **This hourly source refresh does not create Hart/Conn Smythe/etc. awards from HTO goals or points.** Only separately published, validated source achievements are allowed in `player-highlights-ledger.json`.
- The 17-user-approved high-resolution shield, All-Star, leadership and neutral-suspension images have not been imported into GitHub. PR #133 staged a guarded importer `scripts/install-approved-artwork.py` and reserved the path `widgets/assets/approved/` but explicitly held full publication until the approved ZIP exists on BRUTTECH 1.
- Approved source artwork ZIP now also preserved in ChatGPT Library at `/BruTTech/HockeyOS/BraveHC_Approved_Set_Neutral_Discipline_ReleaseCandidate_20261027.zip`. Once copied to `D:\Downloads\BraveHC_Approved_Set_Neutral_Discipline_ReleaseCandidate_20261027.zip` on BRUTTECH 1, run `python scripts/install-approved-artwork.py`, then `python scripts/verify-approved-artwork.py --require-approved`, then validate browsers and release in a separate controlled PR.
- Verified `awards-participants.json` is currently dated October 19, 2026. This release reloads newly published versions but does not claim that current-season participant feed itself is newly rebuilt hourly; that requires a verified feed-producing source workflow, not extrapolated stats.
- GitHub Actions scheduled workflows are nominally hourly and may run later due to GitHub service load.

## Acceptance

- `node --check widgets/player-highlights-v2.js`
- `node scripts/test-player-highlights-v2.cjs`: 109 player identities and 306 historical records PASS
- `python -m unittest discover -s tests -p test_record_source_refresh.py`: 19 tests PASS
- `python tests/test_hourly_verified_current_feed_edge.py`: PASS (simulated latest verified source, rejects unverified/stale feed, no duplicate paragraph)
- Source original artwork and native HTO records unchanged.
