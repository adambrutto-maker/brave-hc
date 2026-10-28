# Brave H.C. — Awards Milestones: Existing HTO Page Only

**Workstream:** HOS-IP-03 / HOS-IP-04 / HOS-IP-08, tasks RCD-03 and AW-16.  
**Scope:** Add Milestones **inside the current HTO Awards page**, not Award Races and not a new page.

## Delivered source candidate

- `widgets/awards-milestones.js` — scoped, source-verified Games / Points / Wins milestone gallery.
- `widgets/awards-milestones.css` — navy/red responsive mobile styling, isolated class prefix, existing approved round badges.
- `tests/test_existing_awards_page_milestones.py` — ensures 97 currently sourced badges, approved date correction application, existing HTO awards preservation and badge artwork availability.
- Source data are the current published `player-highlights-ledger.json` and `player-highlights-display-corrections.json`; no duplicate score calculation, automatic award conferral or guessed history.
- A 3-minute read-only poll displays future separately verified ledger records without changing their original source. Existing upstream source-ingestion / award approval cadence is unchanged.

## Observed private QA

- Headless Chrome renders the 97-card full gallery at 355px and 810px browser widths, no horizontal overflow; 4 corrected public dates match official HTO Records. Initial 18-card view and Games / Points / Wins / All filters loaded correctly.
- 97 published milestone entries match native Records when the four existing manager-approved PR #66 display corrections are applied. A separate public Records source-only entry, Daniel Buzzelli (50 Game Club, Sept. 23, 2018), remains withheld from earned-badge display pending source-owner admission.
- Original 146 historical Awards entries and native HTO records were not edited.

## HTO Awards page insertion gate (not yet implemented)

Only if the authenticated HTO Awards editor accepts HTML/script safely without sanitization, CSP conflict or layout breakage, embed **inside the native Awards page's content**, preferably after existing award history:

```html
<div id="brave-hc-awards-milestones"></div>
<script defer src="https://adambrutto-maker.github.io/brave-hc/widgets/awards-milestones.js"></script>
```

The JS returns without effect unless a deliberately placed mount point is present; it additionally rejects any page query whose `p` is present and not `awards`. Do not insert the script into the site template, navigation, Records or Award Races. The component uses the existing approved badge assets; it does not replace any native Awards award list.

**Pre-mutation controls:** Full source backup of the actual native Awards editor HTML/settings, 146-entry readback, source hash, rollback plan. First place in unpublished private preview if HTO supports it. Verify the loaded JSON/assets via actual HTO browser, desktop/mobile size, CSP/CORS behaviour, accessible controls and restored native awards. If the editor strips scripts, stop; do not use unsafe injection or create a new top-level page.

**Rollback:** Remove only the two inserted embed lines and preserve original Awards HTML. This does not change player Highlights or Records.

## Records cleanup gate remains separate

When AW-16 is live and independent 97/97 approved display parity verified, preserve the 98-source-entry original snapshot (including the one held entry) and then remove only milestone *presentation* from native Records; no historical source deletion. 460 unrelated entries must retain their precise stat, person, date, scope and game/season/playoffs identity. Normalize Summer before Winter in both Individual and Team sections, shortening labels while preserving 3+ vs more-than-three threshold semantics. Verify via separate QA audit.

**Deployment status:** Source candidate only. No production GitHub Pages deployment of this module, no native HTO Awards insertion, no Records deletion, and no awarded milestones granted in this workstream.
