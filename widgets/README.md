# Brave H.C. public widget preview (unapproved HTO embed)

This folder contains an unlinked public HTTPS prototype for the Brave H.C. website. It does not modify the HTO site or the repository's existing homepage.

- URL: https://adambrutto-maker.github.io/brave-hc/widgets/
- Single widget: append ?widget=game, standings, projection, leaders, or media.
- Data: data.json — public-only snapshot contract, last read back 2026-10-16.
- Source authority: HTO for team-maintained players and goalies; Sports Village for league standings.
- Unresolved: player-stat disagreements, potential Sugo Sundays / Michelob Morts identity change.
- Projection and media remain withheld pending verification.
- The HTO embed, private HockeyOS services, DNS cutover and manager approval are NOT authorized by this publication.
- Do not add credentials, unpublished players' personal contact information, private manager notes, LiveBarn source video, or publishing queue data.
- To roll back this static preview, revert the Git commit adding the widgets folder.

## Brave H.C. branded projection widget

Embed URL: https://adambrutto-maker.github.io/brave-hc/widgets/projection.html?embed=1

Projections are exact cached outputs of Brave H.C. Master Workbook > Player Projections > BravesRegularSeasonProjection. Never replace with a PPG extrapolation. Current preview is marked STALE_MODEL_HOLD because the source workbook recorded one game and SVHL recorded three. The source workbook must be recalculated and saved before current outputs can be released.

The published JSON is served from projection.json; HTML polls it every five minutes. A BRUTTECH 1 scheduled publisher checks the master workbook for validated updated cached calculations and updates the public JSON without changing the HTO embed code. Updates are blocked if source GP is behind SVHL or the workbook model is older than seven days.
