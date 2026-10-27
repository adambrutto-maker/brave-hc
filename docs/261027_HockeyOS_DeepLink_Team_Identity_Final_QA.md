# HockeyOS — Opponent identity and deep-link final QA
Date: 2026-10-27
Lead department: Engineering
Area: Opponent Scouting, Essentials/All data, Division Fit links

## Defect
A URL selecting a specific source-verified opponent set the canonical team profile, but the original team select stayed at its first populated option. The Essentials source-bound quick facts card read that stale native selection, so two different teams could appear on the same page. The defect was reproducible on production.

## Correction
At initial source-qualified page load, use the original centralized choose(selected) action rather than separate table()/profile() calls. That function simultaneously updates the authoritative team selector and profile. The existing quick team picker, decision card and copy brief then read a single selected source identity. No change to roster, strength model, actual league schedule, HTO, Master Workbook or official division assignments. Increment league-intelligence.js cache version.

## Validation
- Real browser at desktop 1140px and mobile 358px: explicit '?team=Mid%20Ice%20Crisis' matches profile title, authoritative native team selector, top quick selector and quick-source summary. Copied source brief names the same opponent.
- Invalid team URL falls back to legitimate source-qualified default consistently.
- No team URL continues using the source-verified upcoming opponent when safely matched, and its selectors and summary agree.
- Manually switching from the deep-linked opponent to Brave H.C. updates all synchronized views.
- Independent CI test explicitly protects initial choose(selected) and verifies native source controls and cache-key contract.
- Original source parity/roster and all division model tests must remain green.

## Boundary
Opponent comparisons describe source observations, not win probabilities. The division realignment gate remains provisional. No outbound message, source publisher, official standings, league division or workbook changes.
