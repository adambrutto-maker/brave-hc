# Brave H.C. HockeyOS Plan 03 — Historical Bulletin/Awards reconciliation

**Review date:** 2026-10-21. **Authority:** public native HTO Bulletin Board and public native HTO Awards & Honors, via archived `widgets/history-awards.json`. **Status:** `SOURCE_CLAIMS_CROSSCHECKED / EDITORIAL_REVIEW_PENDING`.

## Preserved source
- Fetched all 4 current Bulletin Board pages (10 + 10 + 10 + 2 = **32 public dated posts**, August 2013–October 2026).
- Original post body markup/text, source page, visible date/title, page hash and post-body hash are preserved in a **private** home-PC-only snapshot: `D:\BruTTech\Products\HockeyOS\Plan03\source-archive\261021_Brave_HTO_Bulletin_Original_Private.json`. Archive byte SHA-256: `dff170000ac8450cc66e792d054050978f5133c33f7820c9fbed75b7c3f0f1b9`.
- This private snapshot may contain publicly displayed roster/fee information and **must not be uploaded to GitHub or inserted into public HockeyOS widgets** without a separate privacy/editorial review. The public repo contains only selected safe historical award-recipient *claims* and metadata, not original full post bodies.
- Native HTO posts were **not edited or republished**. Bulletin pagination is not a permanent permalink, so recheck an original before formal citation or future publication.

## Reconciliation findings
Reviewed four distinct original award-announcement posts and transcribed their year/category/recipient claims. For each, independently compared to the native HTO Awards archive's named group and historical award-year line:

| Original Bulletin post | Season represented | Native Awards archive year | Claims matched | Discrepancies |
|---|---|---:|---:|---:|
| Winter Season 2013/14 Awards (April 27, 2014) | Winter 2013/14 | **2013** | 7/7 | 0 |
| Summer Season 2014 Awards (August 26, 2014) | Summer 2014 | 2014 | 7/7 | 0 |
| Winter Season 2014/15 Awards (May 6, 2015) | Winter 2014/15 | **2014** | 7/7 | 0 |
| Winter 2023/24 Season Awards & Milestones (April 14, 2024) | Winter 2023/24 | **2023** | 11/11 | 0 |
| **Total** | | | **32/32** | **0** |

**Critical season convention:** The native HTO *winter* Awards archive uses the **starting calendar year of each winter season**, not the calendar year of the announcement. Thus the 2023/24 announcement published in April 2024 is correctly represented by the Awards archive's `2023 - ...` entries. Matching instead against `2024 - ...` would create multiple false conflict reports. This convention is grounded in all three dated winter announcements sampled.

The automated, no-network regression `tests/test_historical_bulletin_awards.py` preserves these 32 source-derived claims and asserts their presence in exact categories and year labels in `widgets/history-awards.json`. It does not separately establish original election/vote tallies, eligibility, statistical accuracy, award points, all other seasons, or future award winners.

## Further historical work
- Cross-check the April 2024 Bulletin's **milestone dates** against the corrected official Records archive without silently changing recorded-stat caveats.
- Review original 2013, 2017 and 2018 captaincy posts as distinct leadership history, not record-book statistical awards.
- Review COVID Bulletins for contemporaneous evidence of interruptions, recognizing that planned resumption dates were not proof of games taking place.
- The earlier July 1, 2026 Hot Stove feature is absent from current native Home markup and **not recovered in this private Bulletin capture**; check authorized admin history/backups before any proposed restoration.
- Keep existing four Founder-approved 2026/27 Hot Stove recaps published as currently authorized; the three separate archival overlay drafts remain `DRAFT_NOT_APPROVED`. No automatic changes to HTO native Awards, Records or article content.

**Release gate:** new historical article or Hall-of-Fame presentation requires separate owner/editorial approval, verified source references and rollback/QA receipts.
