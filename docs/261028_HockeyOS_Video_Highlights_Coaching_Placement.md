# HockeyOS Media Placement — Highlights and Coaching (October 28, 2026)

## Product decision

Use one canonical video asset/event identity with two viewing contexts. No duplicate media files, unrelated clip identities or public/private leaks.

**Highlights (public only when rights and identity are individually approved):** a player's memorable on-ice moments and evidence for recognized achievements. Examples: verified goals, assists, saves, game-winning plays, milestone/award-linked videos and finished broadcast highlights. The player views a clip by choosing Watch inside a verified Highlights or Trophy Room item, or from a small approved Moments collection. Do not add a fourth Bio navigation tab or autoplay media in every profile.

**Coaching (authenticated and permission-controlled where applicable):** the same clip can be referenced from an approved individual teaching note, role-specific assignment, general team-system example, or verified opponent review. It must have a coach-approved explanation. A video alone is not proof of player identity, game participation, lineup selection, or coaching instruction. Private coaching video references and annotations must not appear in public GitHub Pages.

## Future shared clip metadata

- clipId: one stable media/event identity reused by Video Intelligence, Highlights and Coaching
- sourceGameId and sourceAssetSha256: verified official HTO/SVHL game provenance and source identity
- startTimecode and endTimecode: evidenced footage intervals, not inferred
- playerIds and teamId: source-qualified identities; unknown participants remain unknown
- eventTags: goal, assist, save, team system, tactical learning, scoring title etc. Each tag has evidence and verification state
- rightsApprovalId, publicationState, visibility, embargo/expiry and rollback: explicit authorization for public/private use
- highlightAssociations: verified public player profile, milestone, award and event IDs
- coachingAnnotations: stored exclusively in an authenticated, authorized coaching system, separate from public Highlights
- sourceEvidence: original media/observation review and game-event reconciliation receipt

Backend should serve one approved asset with separate authorized views, optionally signed time-limited URLs for private content. A public award tile must not disclose a private coaching clip, position assignment or confidential annotation.

## Existing video workstream and release boundary

BRUTTECH 1 has a VideoUnderstanding_20261027_CANDIDATE workstream. Its Game363_ThreeConsumer_Shadow_Projection.json reports release_mode READ_ONLY_SHADOW_NO_PRODUCTION and public_content_written false. The developer QA receipt status is DEVELOPER_OUTPUT_ONLY_PASS. Its private video/broadcast candidates are not publication-authorized assets. This documentation approves future UI placement only; it does not authorize public uploads, playback, private-media export, or publication of coaching notes.

Coordinate any video integration with the existing HockeyOS Video Intelligence / Broadcast Formula workstreams rather than building a parallel ingest pipeline.

## Recommended experience

1. Highlights: a quiet Watch affordance attached to an existing achievement/detail or an approved compact player Moments collection, not a giant media panel.
2. Coaching: Review clip appears beside a coach-authorized tactical note or opponent preparation point, referencing the same clipId under the correct visibility policy.
3. Bio: exactly Production / Trends / Coaching. Public Coaching can display the verified general team framework. Private clips only surface through a separate authenticated product integration. Do not render empty video placeholders.

## Production release gates

Rights/licensing cleared; video/source game and timecode parity; player identity verified; explicit coach/media approval; separated public/private manifests; no private data in GitHub Pages; source-date traceability; mobile QA; withdrawal/rollback plan. No clip is marked published until those conditions are checked.
