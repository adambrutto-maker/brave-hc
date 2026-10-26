# HockeyOS — Dynamic Verified Opponent Intelligence Weekly Publisher
**Date:** October 26, 2026
**Lead:** Data & AI, with Engineering/QA. **Scope:** Brave H.C. exact-name historical matchup feed only.

## Purpose
Replace the one-time five-game Opponent Intelligence release with a source-reconciled weekly publisher. Read the canonical protected Brave H.C. historical Master Schedule and official HTO Scores / HTO Stats. Produce only aggregate opponent history for the seven current Cristillo Division choices; never publish private workbook records or imply that aliases are proven.

## Public feed contract
- widgets/opponent-intelligence.json remains brave-hc-opponent-intelligence/v1 and PUBLIC_VERIFIED_EXACT_ONLY, with an official HTO asOf timestamp and publishable=true only after source reconciliation.
- Seven current division team names must exactly match the accepted SVHL division set. If a division name changes, fail closed pending review.
- Mohawks HC and Sugo Sundays always remain ALIAS_REVIEW_REQUIRED pending explicit historical-franchise alias approval. No matches are merged by punctuation or speculative rename.
- Other Way is NO_EXACT_HISTORY until an exact completed HTO game is officially recorded. This is not presented as 0–0–0.
- Remaining names show Braves regular-season W/L/T GF/GA, separate playoffs/all-time and last five exact-name meetings. Exact-name scope is explicit.
- The public feed never includes contact data, raw game player information, private storage paths or workbook row locations.

## Private source contract
- Master SHA256 pinned to 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154; 358 completed historical games, X=0 placeholders excluded.
- Official HTO completed Scores gameID/date/opponent and 1st–3rd/OT periods summed to final; duplicate IDs held. Four original gameIDs and the Oct 25 fifth game 3375682 remain pinned to previously accepted source evidence.
- HTO current official Stats GP/GF/GA must equal sum of completed Scores games, and every current ledger game must carry an exact official game identity.
- Source time freshness limited; source mismatch, changed source hash, unadmitted team alias or dirty Git worktree fails closed.

## Implemented release code
- scripts/build_dynamic_exact_opponent_feed.py: independently invokes the private reconciler each run, then recomputes opponent aggregates from raw historical/current source rows and cross-compares with the private profiles.
- scripts/publish_dynamic_exact_opponent_feed.py: clean main repo requirement; fetch + fast-forward first, whitelisted update to widgets/opponent-intelligence.json only, commit and push without force, release receipt. Any conflict or source failure results in a HOLD.
- tests/test_dynamic_exact_opponent_feed.py: six tests passed on BRUTTECH 1, including real five-game exact-name history and a simulated sixth-game HTO win automatically updating Mid Ice Crisis without adding its gameID to code. Changing game scores/source SHA/league name fails; alias hold remains.
- Publisher isolated test: local private bare Git remote; initial verified source feed publication PASS. Tampered original historical SHA resulted in HOLD, unchanged HEAD, unchanged output and clean worktree. No real remote was affected during these tests.

## Operational sequencing and acceptance
- Historical Master Schedule Monday 08:30 local; official readback hourly including 08:31; online combined ledger Monday 09:05; **opponent public publisher Monday 09:10**; independent current player actuals publisher Monday 09:20.
- Use Windows Task Scheduler wall-clock trigger without explicit UTC offset so DST does not shift the intended Eastern local time.
- The public publisher must retain a local last-run receipt showing publicGameCount, qualifiedOpponents, aliasesHeld, commit SHA and no workbook/model writes.
- Full public website readback required before the operator claims the next refresh worked.
- Do not enable automatic Master Workbook write-back, full model forecast publication, awards changes or native HTO CMS changes.

## Rollback
Disable only the opponent public publisher task. Restore its pre-install task configuration/operation receipt, and revert its whitelisted GitHub commit to restore previous opponent snapshot. The original workbook and private source ledger remain untouched.
