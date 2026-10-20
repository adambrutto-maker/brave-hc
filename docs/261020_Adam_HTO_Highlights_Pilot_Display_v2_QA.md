# Brave H.C. Player Highlights — October 20 Pilot Display Fix

Lead: MEDIA / HockeyOS
Pilot player: Adam Brutto, official HTO playerID 354054
Scope: universal widget presentation and reusable iframe guidance; no HTO-native editor write

## Screenshot and actual public site findings

The founder-provided screenshot shows the HTO Highlights iframe rendering in a narrow content column, but text separators and award icons are mojibake and the embedded 840px window has an inner scroll.

A fresh read-only public HTO profile readback found **one saved iframe** to the Adam Highlights widget with height 840 and **zero** separate original highlight paragraphs. Thus HTO has accepted the iframe, and the original 16 achievements are now displayed through the separate, source-backed HockeyOS legacy ledger. The public original was previously backed up as rendered HTML and JSON. The complete historical HTO editor source was not independently captured before the prior replacement; do not claim it was.

## Controlled fixes

1. Replace corrupt UTF-8 double-encoding strings in `player-highlights.js` with ASCII-only JavaScript escape literals for middle dot, em dash and link arrow. Avoid raw emoji characters in source.
2. Display accessible categorical text badges rather than fragile emoji glyphs: CUP, CLUB, CAP, AWD, STAR. Championship events preserve source bold/gold emphasis.
3. Exclude player name heading from automatic HTO name-linking via an explicit `data-brave-no-link` opt-out. Leave global verified player navigation unchanged elsewhere.
4. Place the source-verified current-season form above the career timeline so important verified stats are not hidden beneath seven historical achievements.
5. Preserve reverse-chronological text, source legacy records, dates, approved 51-player identities, threshold policy and existing source snapshots. No record rewriting.
6. Increase the **recommended reusable iframe code** from 840 to 1350px; this provides a no-script fallback for the collapsed display at the tested 355px width. It does **not** modify Adam's saved HTO iframe, which must be separately adjusted in the HTO Highlights editor. Expanding all 16/25 achievements may still create an inner scroll: do not claim automatic iframe resizing.

## QA gates

- Existing 14 player-link and ledger identity tests passed.
- Six isolated headless Chrome display checks for Adam 354054, Justin 354060 and Dev 776208 at 355px and 580px widths passed.
- Correct HTO player names, clean separators, no unrecognized characters, safe static heading, source-verified stats above timeline, and zero horizontal overflow or browser JS exceptions.
- Initial collapsed widget heights at 355px: Adam about 1250px; Justin about 1213px; Dev about 834px, all below the revised 1350px embed height.
- Expanding legacy: exactly Adam 16 / 3 championship badges, Justin 25 / 2 championship badges. Dev has no inherited achievements.
- `?playerID=...` remains the sole profile-specific configuration. No HTO native source changes or notifications.

## Installation action remaining

In the HTO editor for Adam only, edit the existing iframe's `height="840"` to `height="1350"` **and** `height:840px` to `height:1350px`. Preserve the playerID and all other fields. Confirm the actual saved HTML and public profile after the change. If the editor rejects changes, roll back to the current working 840px iframe. No further additions to native Records/Awards or other players are authorized by this display fix.
