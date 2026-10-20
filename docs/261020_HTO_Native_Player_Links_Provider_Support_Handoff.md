# Brave H.C. HTO Native Player Links — Provider Support Handoff

Date: 2026-10-20  
Lead: BruTTech MEDIA / HockeyOS  
GitHub issue: https://github.com/adambrutto-maker/brave-hc/issues/14  
Status: READY FOR OWNER REVIEW — NOT SENT TO HTO; NO NATIVE CMS EDIT MADE.

## Why provider input is needed

The released Brave H.C. widgets use one shared, public, read-only 51-player HTO profile registry. The remaining goal is to make player names clickable **on native HTO Home, Records & Achievements, and Awards & Honors** without replacing native page modules or historic values.

- Native HTO Roster (25 player rows and 225 clickable cells), Stats, and Box Score already link to player profiles; they must remain unchanged.
- Script Area (Advanced) is officially supported on Home Page X-Grid, but its code is scoped to that page, not automatically Records/Awards. Existing embedded widgets load the script only inside their iframes.
- An isolated browser compatibility test of the *existing public HTO Records and Awards* pages using the v3 script (no HTO write) successfully generated **289** and **147** player-name hyperlinks respectively. Original visible text, links and click areas remained unchanged. These are occurrence counts.
- Official HTO assistance documentation states that HTO support can add **custom headers/footers to specified existing pages** on request. We have not verified whether such headers/footers accept an HTTPS JavaScript source; HTO must answer that before implementation. A separately documented option for site-wide side-text is not proof scripts may be placed there.

## Official HTO sources

- HTO "Other" help, *additional text at the top or bottom of a page*: https://www.hometeamsonline.com/sportswebsites/default.asp?p=helpdetails&topic=other
- HTO "Home Edit" help, *adding scripts*: https://www.hometeamsonline.com/sportswebsites/default.asp?p=helpdetails&topic=homeedit
- HTO Navigation Layout help, site-wide side areas (content only; script capability unknown): https://www.hometeamsonline.com/sportswebsites/default.asp?infoID=749&p=helpdetails
- HTO provider Contact Form: https://www.hometeamsonline.com/sportswebsites/default.asp?p=contact

## Support request ready for owner approval (do not send automatically)

**Subject:** Brave H.C. (BRAVESHOCKEY) — supported player hyperlinks on Records and Awards pages

Hello HTO Support,

We're looking to add clickable HTO player-profile links whenever a player is named on our Brave H.C. website, particularly the existing **Records & Achievements** and **Awards & Honors** pages. The Roster, Stats and Box Score pages already link to player profiles correctly, and we want to leave those features unchanged.

We have a small, read-only HTTPS JavaScript file that matches uniquely verified player names to their own HTO `p=profile&playerID=...` URL. We tested it against temporary copies of the public Records and Awards pages with the current historical content preserved. The link behaviour works, but we do not want to alter the native HTO records or enter unsupported scripts into the editors.

Your help documentation mentions that HTO Support can attach custom headers or footers to specific existing pages. **Could you confirm whether that mechanism, or an officially supported site-wide script/header setting, can load our external HTTPS script on the native Home, Records and Awards pages?**

If that is not supported, is there an approved way to make existing Records and Awards player-name fields hyperlinks without rewriting their historical entries?

We are looking for the smallest reversible change, with no impact on the current site layout, scoreboard, native roster links, or published statistics. Please advise which integration you would recommend and whether it would require your team to implement it.

Site: https://www.htosports.com/teams/?u=BRAVESHOCKEY&s=hockey  
Proposed script: https://adambrutto-maker.github.io/brave-hc/widgets/player-links.js?v=3

Thank you,
Brave H.C.

## Release gates after provider confirmation

1. Save HTO's written technical answer and map whether it supports a site-wide include, custom headers for Home/Records/Awards, field-level hyperlinks, or none.
2. Through an authorized interactive HTO admin session or with HTO Support, back up the exact existing affected modules and approve the smallest reversible change.
3. Install at most one loader per parent page. Do not alter the native roster/stats/boxscore profile links or historic record content.
4. Verify from a fresh visitor session that **each native parent page** loads the script (not merely an iframe) and that unambiguous names link; ambiguous initials and placeholders must remain plain text.
5. Confirm records, scores, awards, page layout, navigation, mobile view, native clicks and browser console remain unchanged.
6. Keep Issue #14 OPEN and marked provider-dependent until the native published pages pass readback.

The provider support request above is only a draft. **No support message has been sent.**
