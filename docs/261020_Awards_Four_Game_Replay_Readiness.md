# Four-game award replay readiness

A read-only collection from the reviewed pinned HTO collector produced 57 named appearance input candidates:53 skater rows and4 goalie rows, across22 players and game IDs3356177,3356178,3369564,3375601 (workbook games359–362). The season remains W2026/27.

The candidate is separate from the operational feed and original workbook. It has not been imported. It excludes Unknown, Johnny and the confirmed erroneous current-season Marco Congiusti entry. It does not replace their identities or transfer appearances.

All273 comparable per-game fields, appearance dates, unit game appearances and the22-name coverage agree with the corrected widget. Season parity also passed inside the reviewed collector; that is not award-model parity.

## Actual data gaps

-41 of53 named skater appearances have unreported PIM. Those cells remain null.
-Dev Leong's October18 goalie POTG is unreported. It remains null.
-Other target game-log fields absent from the reviewed observation remain absent. The candidate does not infer goalie wins, shutouts, ties, penalty minutes or offense; special-teams and clutch splits require separately verified source evidence.
-The game-log rows alone do not establish current roster classes, position eligibility, roster-season denominators, historical baselines or native calculation semantics.

No missing value has been changed to zero. These are input-readiness gaps; this document does not assert that every missing field contributes to every award, or that absent source data prevents all source-only counting displays.

## Workbook context

Read-only inspection confirms PlayerInfoHelpers[Current Season] references Master Schedule!C1. Its saved value is W2026/27; the selector formula uses SeasonInfo and a V2 toggle. Neither the selector nor its dependencies were recalculated or changed. Original source hash remained0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154.

The partial named-table input trace follows captured formulas through PlayerInfo, roster, season, schedule and game-log tables. It decodes XML header escapes and structured-reference escapes. It deliberately does not claim complete dependency closure: plain cell references, named formulas and dynamic targets require further tracing. Column-level self-references can be range geometry or prior-row streak recurrences; they are not proof of circular calculation. In particular, the trace's leaf lists must not be interpreted as complete import schemas.

## Next calculation boundary

Use the staged candidate only in a separately controlled source-faithful replay after missing-data handling and schedule/roster context are resolved. Preserve original table formulas and stored array metadata. Current model ratings, current eligibility, operational workbook import and publication remain unverified. No production site, feed or workbook changed.
