# HockeyOS Awards Centre — independent Excel/source QA handoff

**Date:** 2026-10-20  
**Lead:** Engineering / HockeyOS  
**Required independent review:** Randy (QA & Testing) and Erica (Security & Privacy), **only if each has a separately attributable review identity and access**. No AI self-assessment or founder GitHub account counts as independence.  
**Target PR:** [#8](https://github.com/adambrutto-maker/brave-hc/pull/8)  
**Score release disposition:** **HOLD.** This is a review packet, not authorization to recalculate, merge, install or publish.

## Decision needed

Demonstrate that adding all four official 2026/27 HTO games to an independently authorized **separate operational copy of the original Master Workbook** preserves **all** pre-existing historical rows, original formulas, 11 award eligibility rules, role-aware components, 50–100 normalization where applicable, and top-five rank keys.

Do **not** modify the original Master Workbook. Source SHA256: `0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154`.

## Previously saved private source facts

Based on the 2026-10-19 `HockeyOS Source Formula Release Gates QA v4` reviewed evidence workbook, `11 Award Parity`, `Master Formula Gates` and `Formula Expansion Gate`:

| Intake or gate | Observed result | State |
|---|---:|---|
| Verified HTO completed team games | 4 | Input PASS |
| Saved original `AwardScoring` current games | 1 | Formula HOLD |
| HTO player-game observations | 58 | Input PASS |
| Skater / goalie observations | 54 / 4 | Input PASS |
| Existing saved rows to preserve | 13 | Identified |
| Existing row needing correction review | 1 | HOLD |
| Additional skater rows needed | 41 | HOLD |
| Additional goalie rows needed | 3 | HOLD |
| Cached-only placeholder identity | 1 | Quarantine |
| Goalie-game POTG without confirmed source attribution | 1 | Preserve as unknown |
| Historical player cache matches | 21 of 23 | Two unresolved |
| Original source formula tables | 158 skater columns, 116 goalie columns | Expansion unverified |
| Current independently validated award models | 0 of 11 | RELEASE HOLD |

Four HTO IDs map to original workbook Games #359–362, respectively:
`3356177→359`, `3356178→360`, `3369564→361`, `3375601→362`.

**Existing record correction:** Dev Leong Game #359, cached GA `0` versus official source `3`, and cached POTG `0` versus official source `1`. Both require independent correction validation and authorized candidate-write decision. This is different from **October 18 Dev Leong per-game POTG**, which is **unknown**, not zero.

**Historical placeholder:** `Unknown, Johnny` must remain quarantined without destructive deletion or reassignment. **Historical identities not matched:** Adam Carlyle and Damian Pavaday—do not invent career records.

**Table capacity:** `SkaterStatsByGame` is populated through worksheet row 4668 (approximately 130 formula cells in final row); `GoalieStatsByGame` through row 363 (approximately 89 formula cells in final row). Candidate new rows were scoped to skater 4669–4709 and goalie 364–366, **not approved write positions**. Whitespace-only cell `Y4674` requires disposition. The 158/116 original source column dimensions must be preserved with all formulas, references and structured tables.

## Controlled reviewer sequence

1. **Authority:** Confirm the immutable original SHA, approved separate operational copy, file locking, rollback and independently authorized access. An earlier source-formula inspection/patch-generation attempt was safety-blocked. **Do not retry by another tool or route.** If authorized compatible spreadsheet inspection is unavailable, mark BLOCKED and stop.
2. **Record accounting:** Verify original game number × player identity × role uniqueness. Reconcile 13 unchanged + 1 correction + 44 new = 58. Reject unknown, duplicated, overlapping or stale source rows; do not zero-fill missing HTO fields.
3. **Formula-preserving expansion:** Only in a permitted disposable operational workbook. Prove exact original 158-/116-column formula propagation, structured-table bounds, historical row and style preservation, the `Y4674` collision decision, and cell-by-cell before/after formula-map fingerprints. No blind append. No writes to original or active hourly publisher.
4. **Calculation source parity:** Verify `PlayerInfo` first/recent seasons, Rookie Year, current and career GP, roster history, goalie/skater rates and original field/population comparison formulas. Assess Jamie Rosenberg's Rookie eligibility *from recomputed original formulas*; do not manually toggle the saved Rookie Eligible flag.
5. **All 11 award contracts:** Reproduce each original eligible flag, `Rank Key`, weighted raw composite, normalization and `Web Races` ranked top-five. Include zero eligible, 1–4, 5, >5, tie, zero-GP, goalie/skater and playoff-only negative tests.
6. **Distinct score types:** Hart, Conn Smythe, Norris, Lady Byng, Rookie, Most Improved, Rolaids, Dedication and HOF require their own source-faithful OVR model. **Art Ross and Rocket Richard are official STAT counts** (PTS/G), never counterfeit 50–100 OVR.
7. **Provenance and signoff:** The original formula authority SHA remains fixed; the separate operational workbook has a distinct own SHA and verifiably matching formula-map fingerprint. Confirm source timestamp, game-ID map, 11 distinct QA receipts, independently controlled reviewer identity and later explicit Founder production activation.

## Review output contract

Return a signed report containing: original workbook SHA; operational candidate SHA; verified formula-map fingerprint comparison; pre/post original historical state; reconciled 58-record accounting; 11 award-level eligibility/rank/score parity outcomes; unresolved goalie POTG; unverified player IDs; saved test transcripts; rollback result; signer's actual identity and independent control; explicit **PASS / FAIL / BLOCKED / NOT TESTED** per gate.

**Refuse final scores if any required gate is not PASS**. Self-reported JSON claims, synthetic fixtures, CI green checks, preserved historical Rolaids five-player weighted composites and stale cached `AwardScoring` cannot constitute independent approval.

## Engineering evidence and present limitations

- PR #8: 34/34 recent synthetic/UI tests passed on its earlier reviewed head, including EA component completeness (11 skater/10 goalie), zero invented Art Ross/Rocket OVR, and safe pending-score display.
- Historical Rolaids: 5/5 saved example raw composites reproduced, 54/54 weighted components crosschecked, **historical final OVR normalization not recomputed**.
- Pure `hockeyos_awards_operational_provenance_gate.js` properly reports `HOLD_OPERATIONAL_MODEL_EVIDENCE` on actual one-vs-four game source. It **does not inspect a workbook or cryptographically verify claimed attestations**.
- The existing hourly HTO widget publisher has a separate unmerged history-recovery issue [#12](https://github.com/adambrutto-maker/brave-hc/issues/12). Green source ingestion does **not** prove website publication.

**Acceptance gate right now: BLOCKED — compatible authorized operational workbook writer + full source formula QA; no independently attributable reviewer/Founder release decision.**
