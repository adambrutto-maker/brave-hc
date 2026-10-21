# PR26 separate AI technical reviews

Reviewed commit: cbdd98436bff8530d1e40d89015f966cba659808.
User directed review to an appropriate BruTTech employee. Separate AI reviewers were assigned the Randy QA and Erica Security roles. These are attributable session-level AI technical reviews, not authenticated BruTTech employee credentials, GitHub approvals or production acceptance.

Disposition: CHANGES REQUIRED. Do not integrate or publish based on current review-tool success output.

## Randy QA

Concrete in-memory reproduction: skater POTG=99 passes skater_rows and check_game_observations and returns a reconciled state. Goalie POTG correctly restricts values to 0/1. Enforce skater per-game POTG integer 0/1 in both parser and game validator with regression cases. Also reject boolean verified_team_goals at parser entry.

## Erica Security

- Missing season columns are skipped by `if col not in head: continue`; incomplete coverage can exit successfully. Require mandatory headers and coverage.
- Duplicate season identities overwrite prior rows. Malformed season rows are skipped. Reject duplicate identities and malformed rows.
- Verify final response URL, content type, season, returned game identity and date before claiming source provenance. Requested URL alone does not establish returned content identity.
- Bound response size and use explicit exceptions rather than asserts for operational checks. Remove unused ast/subprocess/base64 imports.
- No production collector import, Excel operation, subprocess execution, Git mutation, publisher invocation, scheduler update or explicit file-write operation found in review tool/helper. Imports can generate Python bytecode caches.
- CI read-only repository permissions and timeout are appropriate; live collection is not invoked by CI. Pinning action tags is optional future hardening.

## Required correction sequence

1. Correct skater POTG validation and season-table fail-closed validation.
2. Establish returned-content source provenance; hold if not verifiable.
3. Run meaningful malformed-input regression and fresh source parity.
4. Obtain separate technical re-review of exact corrected commit.
5. Resolve authenticated operational acceptance and Founder release requirements independently. No production collector, workbook or website changes authorized by this receipt.
