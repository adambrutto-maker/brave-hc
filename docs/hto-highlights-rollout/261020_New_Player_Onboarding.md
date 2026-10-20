# Brave H.C. — Permanent HTO Player Highlights onboarding

Owner: MEDIA; Engineering maintains the universal widget and identity map; QA verifies saved public profiles.

1. Create/confirm the official HTO profile in the authorized personal BRAVESHOCKEY account. Read the actual playerID and exact public name from HTO; cross-check current roster and profile. Exclude placeholders and historical alumni unless separately approved.
2. Register the unique exact name/playerID once in `widgets/player-links.js`. Do not create a player-specific widget or infer ID from jersey number.
3. Open the Highlights Source editor. Back up the COMPLETE source, including empty string, with playerID, capture date, and rollback location. Never include contact info in public evidence.
4. New players start with empty approved career history. For existing history, reconcile every original text, date, season, ordering, emphasis, and non-achievement note against `widgets/player-highlights-ledger.json`. Existing published history may be imported with EXISTING_NATIVE_HTO_HIGHLIGHTS / EXISTING_HTO_MANUAL_RECORD provenance; this does not approve a new award. If the schema cannot faithfully represent it, defer without editing HTO.
5. Verify hosted ledger readback BEFORE replacing native history. Preserve Adam Brutto and Justin Carosi's completed installations.
6. Paste `widgets/HTO_PLAYER_HIGHLIGHTS_IFRAME_PASTE.txt`, replacing only VERIFIED_PLAYER_ID. Use exactly one iframe, HTML height 1350 and CSS height 1350px. Save using the supported HTO editor only.
7. Read the SAVED public HTO profile and select Highlights. Check identity, one iframe, exact playerID and 1350px height; complete career history and emphasis; correct source-backed current-season form; visible source date and stale warning; desktop/mobile layout and Show all/Show fewer; Stats/Bio/navigation intact. An unavailable feed must not be replaced with guessed totals.
8. If QA fails or existing content is damaged, restore that player's exact original Source HTML, save, verify the public restoration, and document the defect before further installation.
9. Append playerID, public URL, backup reference, original state, save and QA outcomes to the rollout register and Issue #21. No player messages, invitations, Records/Awards edits, stats writes, or AwardsScoring restriction changes.

Statistics update when the independently verified HockeyOS public feed refreshes. The widget does not establish direct automatic HTO synchronization; do not claim a live publishing pipeline without separate proof.

Rollback: replace only the matching player's Highlights Source with the exact recorded original HTML; empty original means restore an empty Highlights field. Never restore another player's backup.

## Legacy records beyond achievements

Existing suspension notes use the neutral `discipline` category and NOTE badge; they never count as awards. Combined award/leadership paragraphs use `record`, `preserveLines: true` and their exact line-separated text; `includesAward: true` is permitted only when the backed-up original explicitly contains an award. Keep the original paragraph grouping and line break. Preserve all raw editor HTML before migration. Empty spacer paragraphs remain in the raw backup and are not achievements. Verify all rendered records against the original before and after the HTO save.

## All-player rollout completion — 2026-10-20

The verified registry contains109 named profiles:24 current and85 historical. Historical status is retained; registration does not imply current-roster membership. Johnny Unknown847926 and generic Rènt Goaliê548071 remain excluded. See [all-player register](261020_All_Players_Final_Register.md).

For mixed bold/italic or multi-line source paragraphs, use validated `sourceRuns` with literal `text`, boolean `strong` and boolean `italic`; joined run text must equal `displayText`. Keep original paragraph grouping. `summaryCounts` for championships, awards and milestones must reflect explicit source lines only. Never evaluate raw editor HTML in the widget or infer a new achievement. Validate each rendered text run and style against the full backed-up Source before and after the HTO save. Empty spacer paragraphs stay in raw backups, not the achievements count.
