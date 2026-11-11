# HockeyOS Readiness Snapshot — Engineering / QA handoff

**Prepared:** November 7, 2026, Eastern time
**Lead:** Engineering / HockeyOS (source evidence and publication gates)
**Status:** Independent read-only review candidate; not a model approval, not a source refresh
**Related work:** PR #214 embedded forecast source gate; PR #215 regression-source corrections; P1 issue #192

## Operational objective

Give the Engineering and QA teams one reproducible read-only result showing where current HockeyOS source dependencies stand. **A passing telemetry test is not a public release authorization.** The tool does not substitute for official HTO identity/boxscore reconciliation, original workbook formula recalculation, or independent QA sign-off.

## Delivered implementation

`scripts/hockeyos_readiness_snapshot.py` reads only existing static public source JSON and the versioned public lineup assets in the checked-out repository. It calls the existing authoritative Python source verifiers for league and public roster rather than weakening their freshness and identity gates. It separately reports workbook/HTO game coverage and projection/dispersion source agreement. It verifies the approved *tentative* lineup PDF/PNG SHA-256 and correct next-game fixture, expiration, goalie unknown and official-approval-null state.

The five result groups are `league`, `roster`, `projection`, `dispersion`, and `lineup`. Each has a machine-readable `PASS`, `HOLD` or `REVIEW` state with an explicit reason and bounded source evidence. Overall state is `HOLD` whenever any required source check fails, otherwise `REVIEW` if the inputs still require independent approval. The program never asserts a complete public forecast release merely because source counts match.

The script also cross-checks the published PDF against the original game-scoped working-card SHA-256. It performs **no network operations, scheduled job runs, HTO writes, workbook edits, Git changes, roster republishing, WhatsApp messages, or output file writes**. It prints JSON to standard output. `--strict` returns exit code 2 when the overall status is not `PASS`. Capturing output to a private file is an explicitly separate operator action.

## November 7 source observation

| Domain | Result | Evidence |
|---|---|---|
| League results | PASS | 27 source-qualified teams, 5 divisions, 74 paired games |
| Public roster | HOLD | Source league capture Oct 26; current league capture Nov 7; about 11.7 days between observations, exceeding the established 8-day limit |
| Projection | HOLD | 1 workbook-recorded game, 6 official HTO boxscore games |
| Dispersion | HOLD | Source reference based on Oct 30 projection export; model currently exported Nov 2 |
| Game 365 | PASS | Original Excel-derived tentative lineup PDF/PNG hashes, Nov 8 fixture, goaltender unconfirmed, final approval absent |

All these observations are readbacks of saved published source fields; they do **not** establish the source publishers' current run health or attest a fresh HTO capture. The different source publishers may have failed independently.

## Reproducible commands

```powershell
cd <your-local-brave-hc-clone>
python -B scripts/hockeyos_readiness_snapshot.py
python -B scripts/hockeyos_readiness_snapshot.py --strict
python -B -m unittest discover -s tests -p test_hockeyos_readiness_snapshot.py -v
```

The non-strict JSON command is designed for operator observation. The strict command should currently exit 2 because real source dependencies remain held; do not convert that expected hold into a release pass.

## QA and security

Sixteen unit tests cover five independent check groups; authentic source verification; stale and future roster/model dates; source-pair mismatch; model equality limited to review; valid public tentative lineup; altered PDF checksum; unsafe path traversal; unauthorized goalie status; expiry; missing-source fail-closed behaviour; source dictionary/file byte immutability; and strict exit semantics.

A dedicated GitHub Action `hockeyos-source-readiness-audit.yml` runs the read-only 16-test suite and prints the current status on relevant PRs. A green audit workflow only confirms that the gate is working; it does not turn existing `HOLD` inputs into authorized publication.

## Existing source refresh ownership and release boundary

A local, read-only scheduled-task inspection showed nonzero results for several independently owned HockeyOS publishers. Machine-local paths and task receipts remain private; publisher diagnosis must follow the existing owner review and evidence controls. **Do not re-run a previously safety-blocked HTO/workbook connection operation through a substitute route.**

Release progression remains: fresh independently verified HTO and SVHL source readback; source identity, player, game and historical workbook parity; independent QA; explicit manager approval for public numerical forecasts; controlled rollback. This PR only improves source visibility.

**Rollback:** reject/close the feature branch. No production system or source data has been changed by this candidate.
