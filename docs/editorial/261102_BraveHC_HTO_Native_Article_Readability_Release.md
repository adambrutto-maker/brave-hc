# Brave H.C. — Native HTO Article Readability Release

**Date:** November 2, 2026
**Lead:** Media Department / HockeyOS
**Production:** HTO native game-specific Preview and Game Summary fields
**Release status:** TWO NATIVE ARTICLES RESTYLED, PUBLICLY VERIFIED

## Why the change was necessary

The Founder reported that the native articles were unpleasant to read, with black site background and low-contrast grey writing. A direct Edge/browser inspection confirmed that the inherited HTO template used an external vertical-black background image, while the native editorial blocks rendered 14px #666 grey text and an approximately 17px headline. The long-form Preview also treated two section headings as normal paragraph text.

The solution deliberately changed only the **article content styling** within the existing HTO native fields. It did not alter the global HTO page template or the black site header/shell, which affects the rest of the club website and requires its own controlled design review.

## Production changes, November 2

**HTO game 3375684 — November 8 vs Other Way, Game Preview**

https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3375684&p=preview

**HTO game 3375683 — November 1 vs Mid Ice Crisis, Scores → Recap/Game Summary**

https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3375683&p=boxscore

The previously approved article contents and working archive links were preserved. The existing native HTO editor was used; no new widget was installed. Each field's existing HTML source was backed up before changes. Styling was tested by switching CKEditor from Source to visual mode and back, confirming that its renderer retained the inline styles and the same article text.

## Applied design

- A light white editorial reading surface with a restrained Brave H.C. crimson top border, navy text, mild card border and safe margins
- 25px bold navy headline with red divider
- 16px high-contrast body text at approximately 27.2px line height
- Lead paragraph with subtle red side rule; easier to distinguish without excessive bold text
- 17px navy section headings with pale blue backing and a red accent stripe
- Smaller readable match metadata and a clearly identified Hot Stove archive link
- No external font downloads, inline scripts, iframes, embedded video or unsupported CSS widgets

The design works inside the existing HTO rich-text editor. The per-game header, black outer HTO page background, native navigation, official scoreboard and site template remain outside this release scope.

## Verification

**Public content readback**

- Game 3375684: **13 of 13** approved story blocks remained identical; both previously flattened Preview section headings were restored to styled H3 headings; archive link present
- Game 3375683: **22 of 22** approved story blocks remained identical; all five recap section headings were styled; archive link present
- Official November 1 game scoring: **six of six table groups unchanged** by SHA-256, including the 2–7 result and all published scorer and skater statistics
- Official scoring-table pre/post checksum: 3a4a5bbfb18eddfa231fb80f24f254232e48ef2b532a893d2d05f648c8f4cd9b

**Live Microsoft Edge validation on BRUTTECH 1**

- Tested actual HTO public pages at **320, 390, 625 and 1280px** for both stories
- **68/68 checks passed**: HTTP 200; styled wrapper/title/body; body font >= 16px; section counts; archive link; no overflow; no JavaScript page errors; native score board still present
- Body contrast measured approximately **12.2:1**, exceeding WCAG AAA 7:1 normal-text contrast
- No observed horizontal scrolling at the four tested viewport widths

**Reusable regression tests**

- 16/16 Python source-style tests passed, covering paragraph fidelity, readability colours, headline structure, section restoration, safe link markup, rejection of scripts/iframes, duplicate styling prevention, fingerprint consistency and no scoreboard changes
- Both original Founder-approved current-season article HTML files regenerated through the new command-line formatter exactly matched the previously validated local design candidate

## Permanent editorial workflow

Formatter: scripts/editorial/hto_native_article_readability.py

Use only on an already source-verified and editorially approved HTO native HTML article. Supply the original unstyled HTML and an output path that differs from the source. For pregame articles whose original heading breaks were written as paragraphs, provide the exact approved heading strings as explicit heading parameters.

Example (Game Summary):

python scripts/editorial/hto_native_article_readability.py --input original_summary.html --output styled_summary.html --kind recap

Example (Game Preview):

python scripts/editorial/hto_native_article_readability.py --input original_preview.html --output styled_preview.html --kind preview --heading "Common Opponents Offer a Closer Look" --heading "A Chance to Carry the Offence Forward"

The script writes a separate HTML candidate and JSON SHA-256 receipt, and **does not post to HTO**. A human-supervised authenticated HTO field backup, publication approval, save and public readback are still mandatory.

## Scope, rollback and next steps

- Native Preview/Recap presentation changed; authoritative statistics, original workbook, homepage Media module, Hot Stove standalone publication feed, lineup data and LiveBarn/highlights were **not** changed.
- Original editor sources and before/after public UI screenshots are retained in the authorized BRUTTECH 1 article audit folder, with no credentials or session cookies.
- Draft PR #198's five remaining 2026/27 summaries can receive this exact style *after separate editorial release approval*. Its Winter 2025/26 retrospectives remain unapproved.
- **The large black HTO shell/header is still a site-wide template decision.** Improving it would affect every native HTO page and should be a separately tested Design/Styles change, not hidden inside an individual article update.

**Disposition:** Two articles are live, source-identical, high-contrast and mobile-tested. The shared design formatter is ready for future native previews and summaries.
