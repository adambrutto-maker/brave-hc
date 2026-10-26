# Canonical Brave H.C. identity — independent public release gate
Date: 2026-10-26
Lead: Data & AI. Supporting: QA & Testing, Engineering and Media.

## Purpose and evidence boundary
Brave H.C.'s historical Master Workbook and official HTO game records are the authority for canonical team identity. SVHL's public league names are source keys used for division rankings and fixtures, **not** authoritative renames of franchise histories. The protected workbook and its game rows are not exported to GitHub.

Existing approved source scope:
- Proper home-team display: **Brave H.C.**; unchanged SVHL standing source key **Braves HC**.
- **Mohawks H.C.**: source workbook 49 completed games labelled Mohawks HC; the same workbook explicitly names the opponent Mohawks H.C. in its Sep 22, 2024 report at Master Schedule!J317. HTO adds one source-confirmed Sep 27, 2026 meeting. Qualified Brave H.C. all-time 50 GP, 19–20–11, 193 GF / 176 GA.
- **Michelob Morts**: SVHL labels its Oct 4, 2026 meeting Sugo Sundays. Independent SVHL/HTO same-game evidence verifies this one meeting. Only 0–1–0, 2 GF / 3 GA is qualified; no unsupported older Michelob/Sugo history.
- **Other Way**: no verified exact-name history, not a zero-game all-time record.
- Four other opponents retain their previously qualified exact-name historical records. Source SVHL standings and their underlying GP/W/L/T/PTS/GF/GA are never renamed or recomputed.

## New public-only integrity gate
- scripts/check_public_canonical_identities.py reads only committed public widget JSON/HTML/JS, never contacts private files or HTO.
- Guards source keys, all eight teams and unique seven opponent records, Brave H.C. canonical display, accepted scope/status, immutable 49-game Mohawks historical baseline, source-added HTO game count, separated playoffs, no inflated Michelob history, absence of fake Other Way 0–0–0, both independent official game identities/URLs, source-limited alias provenance, and the required three-decimal WIN% formatting.
- Guards current HTO homepage JS/CSS release versions so old cached league labels cannot silently return.
- tests/test_public_canonical_identity_contract.py provides 16 source mutation/positive cases. Each wrong display name, duplicate source identity, modified HTO game ID, invented history, malformed game totals or deleted limited-scope notice must fail closed.

## CI/operations
- .github/workflows/brave-identity-integrity.yml is a **read-only** GitHub Actions job on main and pull requests touching published identity, standings, UI and gate source files. It runs the public validator and 16 tests; it does not write scores, workbook formulas, articles, league source data or the website.
- A daily scheduled GitHub action at **14:43 UTC** additionally verifies the published opponent source timestamp is no more than 10 days old. This detects a stalled private Monday publisher without assuming it can operate in the cloud.
- The private authoritative source/parity checks on BRUTTECH 1 remain independent. This public CI layer only checks that verified historical decisions have not regressed after publication; it cannot independently approve new aliases or changed HTO results.
- Any future first real Nov 1 game requires complete operational boxscore/source validation before publication; new Mohawks/Michelob cross-system mappings require a separately reviewed source-proof update.

## Acceptance and rollback
Run:
python scripts/check_public_canonical_identities.py
python -m unittest discover -s tests -p test_public_canonical_identity_contract.py

Both must pass, followed by a green GitHub Actions run for the merged commit. Revert this PR to remove only the supplemental read-only integrity job. The canonical public data and original workbook remain unchanged.
