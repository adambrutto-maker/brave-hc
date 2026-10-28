# Brave H.C. — Compact two-sided Achievement Locker release

Date: October 27, 2026, Toronto (October 28 UTC)
Source environment: BRUTTECH 1 only.
Goal: Show milestones and honours in **one compact widget**, with a clear switch control rather than requiring a long scroll to the separate award section.

## User-facing design

- New **Achievement Locker** has two accessible, 44px-touch-target buttons: `Milestones · N` and `Awards & Legacy · N`. These display alternative faces in the same location. The active side is clearly marked with `aria-pressed`; no motion/flash/three-dimensional flip is required.
- Milestones preserve the source-verified **Career Badges Unlocked** gallery, Bronze 50 / Silver 100 / Gold 200 / Platinum 300+ authentic red lion emblems, date of achievement, filter by Games / Points / Wins.
- Awards & Legacy face is a compact transparent-art grid, defaulting to six newest official historical records, with `View all records` for longer collections. Filter chips wrap on mobile and cover Awards, Cups, Recognition, Leadership, Historical entries, Discipline. Each card uses the corresponding already-approved artwork and date.
- **Discipline is never presented as an award**. Recorded suspensions appear after an explicit separator, with a disciplinary-record label and user-approved whistle/red/yellow cards.
- Awards and leadership cards remain visually distinct from earned quantitative milestones; no inferred winners or fantasy award percentages.
- The underlying chronological `Complete Achievement Timeline` is retained in native accessible `details/summary` disclosure below the locker and **closed by default**, with all 306 published source records still rendered in the DOM and the existing expand button unchanged.
- The locker automatically starts on the relevant side if a source-qualified player has only milestones or only historical honours; source-refresh re-renders preserve the selected side.
- Artwork remains actual transparent WebP on navy without any white-square icon tile. No source file, ledger, award date, identity, scoring feed or refresh cadence modified.

## Verified inputs and scope

- Canonical HTO: `widgets/player-highlights-ledger.json`. 97 milestone entries plus 209 other historical entries across 43 historical profile identities; 3 discipline entries are separately classified.
- Honour categories: official awards, Cup championships, nominations/recognition, captaincy, composite historical entries, discipline.
- No new achievements from calculation, no locked/unearned badges, no guessed milestone dates.
- Existing 3-minute published ledger recheck / hourly published official HTO stats recheck remain intact.

## Testing

- Node source/identity checks updated for both locker sides, history disclosure, source sorting, correction identities and a synthetic future 1,250 Game Club with platinum treatment.
- Real Edge browser: **86 sessions at 355px and 810px** across 43 historical profiles, validating the side buttons, all filters, compact initial 6-card grid, view-more, discipline separator, counts, image loading, default face, dates and no horizontal overflow.
- Existing 86-session historical visual-parity test opens the details disclosure before checking the full original source timeline.
- Existing 86-session earned-milestone visual integrity and the 39 transparent-image SHA tests remain required.
- Source-controlled screenshots:
  - `docs/261028_Achievement_Locker_Awards_354054_355.png`
  - `docs/261028_Achievement_Locker_Awards_354054_810.png`
  - `docs/261028_Achievement_Locker_Awards_354060_810.png`

## Release gates

Merge after full GitHub Actions success, then confirm GitHub Pages successfully publishes the new widget script version `v=17`, and perform public-player live acceptance. No HTO edits or outgoing communications.
