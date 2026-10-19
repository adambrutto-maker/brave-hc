# Brave H.C. | SVHL → HTO Operating Procedure

**Status:** Live monitoring activated 2026-10-19. HTO editing remains MANUAL and under the manager's control.

## Source of truth
- Official league fixtures: [SVHL Sunday Winter 2026/27](https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY), league ID **570**.
- Brave H.C. SVHL team ID: **13679**.
- HTO: [Braves full-season schedule](https://www.htosports.com/teams/default.asp?p=schedule&s=hockey&u=BRAVESHOCKEY&format=List).
- HTO administration: [Schedule & Results](https://www.hometeamsonline.com/admin/default.asp?p=schedule).
- The GitHub workflow reads both websites approximately every four hours, publishes **SVHL** upcoming games, and preserves an audit artifact. GitHub scheduled runs are best-effort, not guaranteed real-time.
- A discrepancy creates or updates ONE GitHub Issue titled **SVHL → HTO: schedule reconciliation required**. The issue closes after reconciliation returns MATCH on all current games.
- The workflow NEVER edits SVHL, HTO, scores, attendance, emails or confirmed goalies.

## HTO reconciliation queue
| Result | Decision |
|---|---|
| MATCH | No action |
| EDIT_HTO | An existing HTO game has different time, rink, or home/away; manager reviews and edits same HTO game ID |
| REVIEW_RESCHEDULE | Date changed; manager confirms SVHL and reschedules existing HTO game without losing game ID or history |
| ADD_HTO | New SVHL game absent from HTO; manager verifies before using HTO New Game |
| REVIEW_HTO_ONLY | HTO game not found in SVHL; manager investigates cancellation, never automatically deletes scored or historic games |
| REVIEW_OR_ADD | Game identity ambiguous; manager reviews, avoiding duplicates |

## Monitoring stale or unexpectedly missing SVHL games

The public HTO goalie widget now identifies the date of the latest successfully verified SVHL feed:

- If the last league verification is more than **18 hours old**, it displays an amber **sync delayed** warning.
- If more than **36 hours old**, or the verification date is invalid, it displays a red **verification overdue** warning rather than silently presenting stale schedule information as current.
- The goalie manager and authenticated save scripts will not accept a new confirmation against a feed more than **24 hours old**; rerun the league check and verify fresh data first.
- If a game previously listed as upcoming is **absent from the latest SVHL fixture list**, it is not silently treated as a completed match or cancellation. It is removed from the current official fixture list but counted in `missingFixtureReviews` on the feed, highlighted in the public status banner, and recorded as `REVIEW_SVHL_REMOVED` in the HTO review queue.
- Do not delete the HTO game or reset its assigned goaltender based solely on an absent SVHL entry. Verify with the league; a partial provider response can resemble a cancellation. The current goalie assignment history remains in GitHub, and actual past games are not raised as missing.
- This release **does not monitor GitHub failures through a separate independent channel**; GitHub Actions run notifications and the visible freshness warning remain the failure-detection methods. Review the GitHub Actions health if a red overdue indicator appears.

## Provider completeness and unresolved game-review controls (October 19 hardening)

The SVHL feed is **not** safe to publish merely because the provider returned HTTP 200 or one Braves fixture. The reconciliation compares each new snapshot against the last verified future-game set.

- **Fail closed on likely partial data:** When at least three upcoming games were previously verified, a new SVHL or HTO response dropping **two or more and at least half** of the expected games/known HTO IDs is quarantined. The GitHub job fails; it neither replaces the public feed nor closes a review issue. Confirm data-source completeness before restarting.
- **Duplicate protection:** Duplicate SVHL fixture signatures or HTO game identifiers block publication.
- **One missing game:** A missing upcoming SVHL game generates `REVIEW_SVHL_REMOVED`. Its complete prior details and original assignment key remain in `missingFixtureReviews` until the fixture returns, is safely matched to a reschedule, or ages past its previously scheduled game time. The review cannot disappear merely because the next snapshot no longer contains that game.
- **Status publication:** A change to either the current fixture list **or** `missingFixtureReviews` updates the published feed, even if the other section did not change. The widget displays a missing-game warning, and GitHub retains the HTO manual-correction issue.
- **No automatic HTO actions:** A missing or altered league fixture must be checked directly before an authorized HTO manager edits an existing game, adds a new game or considers cancellation. Goalie assignments are retained.
- **Refresh and failure limits:** The GitHub scheduled job is best-effort; the public status displays an amber age warning after 18 hours and a stronger age warning after 36 hours. New goalie saves require verification within 24 hours. This is a *safety guard*, not independent incident alerting.
- **QA evidence:** `tests/test_svhl_snapshot_coverage.py` verifies normal snapshots, large SVHL/HTO data losses, duplicate rows/IDs, review persistence and reappearance of a previously missing game with the same assignment key. The GitHub workflow runs these checks on script/test updates before live feed publication.

## Automatic HTO correction packets (read-only)

The reconciliation workflow now generates **two audit files** every successful run: `reconciliation.json` (structured evidence) and `hto-review.md` (human-readable, field-by-field corrections). Both are retained with the workflow's short-lived GitHub artifact. No HTO admin write is performed.

When a mismatch appears, the single GitHub issue titled **SVHL → HTO: schedule reconciliation required** identifies the correction type, HTO game ID/link, complete league fixture, current HTO fixture and each differing field as **HTO → SVHL**. It then gives the manager the appropriate edit/add/investigate action.

- **EDIT_HTO:** Preserve the existing game ID; update only the differing date/time/rink/home-away values after checking SVHL.
- **REVIEW_RESCHEDULE:** Confirm a date move, retain the existing HTO game ID/history and seek goalie reconfirmation.
- **REVIEW_IDENTITY:** A possible opponent substitution or ambiguous game match must be verified manually before any edit.
- **ADD_HTO / REVIEW_OR_ADD:** Search the full season before using New Game, ensuring duplicates are not introduced.
- **REVIEW_HTO_ONLY:** Investigate the league schedule before considering a cancellation. Never automatically delete an HTO record, especially one containing statistics.

The issue body updates only when actual correction details change, and the issue automatically closes after SVHL and HTO again agree. A clean run produces an evidence file stating **No discrepancies**.

GitHub workflow artifacts and issues are not guaranteed to alert the administrator immediately; configure GitHub repository notifications if prompt human action is required.

## Manager action — adding or editing an HTO game
1. Open **HTO Admin → Schedule → Schedule & Results** using an authorized team account.
2. Find the game's current **HTO game ID** in the reconciliation issue, and locate the corresponding game in the schedule list.
3. **Edit** the existing game when date, time, side or rink changes. Preserve its ID. For entirely new games use **New Game**.
4. Enter verified SVHL date, Toronto start time, exact opponent, home/away, rink and correct **Winter 2026/27** season. Check against the league posting.
5. Save in HTO. Re-open **HTO List View** and cross-check against the SVHL source.
6. If the goalie had been confirmed, reconfirm his availability after a material date/time change. Do not silently change the goalie.
7. Run [the GitHub workflow](https://github.com/adambrutto-maker/brave-hc/actions/workflows/brave-svhl-sync.yml) manually when convenient or allow the next scheduled reconciliation. The issue should close once both sites agree.
8. Do not import the entire schedule for incremental changes; it risks creating duplicate HTO records. Never automatically delete historical game records.

## Verified goaltender dropdown reference

The manager dropdown reads [widgets/goalie-roster.json](https://github.com/adambrutto-maker/brave-hc/blob/main/widgets/goalie-roster.json). This is a curated reference, **not an exhaustive list of every goalie in Brave H.C. history**.

- **Current 2026/27 confirmed (first):** Dev Leong (#31), Stephen Logue (#70). Source: HTO 2026/27 Roster and Fees bulletin, both marked CONFIRMED.
- **Pending / historical:** Matt Svec (#0) is listed PENDING for 2026/27 and CONFIRMED in 2025/26. Steve Noyek (#0) was CONFIRMED for 2025/26.
- **Other / utility:** Adam Carlyle (#0) is listed as a goaltender on the 2026/27 HTO player roster and was used as a rental; Anthony Paolucci (#43) has a RW·G position on HTO, but is **not** promoted to a confirmed starting goaltender.
- **TBD** is available for every game. For anyone not on the reference list, use **Other / rental** and enter the actual confirmed name.
- Verify current status using [HTO roster](https://www.htosports.com/teams/default.asp?p=roster&s=hockey&u=BRAVESHOCKEY) and [HTO Roster and Fees](https://www.htosports.com/teams/default.asp?p=bboard&pageNum=1&s=hockey&u=BRAVESHOCKEY). Public HTO rosters are not a substitute for manager confirmation of a game's starter.
- All new dropdown additions must update the backend `GOALIE_OPTIONS` whitelist and pass `tests/test_goalie_roster.py`, or the CI gate blocks publication.

## Goalie management — prefilled GitHub approval

- [Goaltender Manager](https://adambrutto-maker.github.io/brave-hc/widgets/goalie-manager-v1.2.html) shows each upcoming SVHL fixture, current saved goalie, and the controlled selection dropdown.
- Select the goalie and click **Review and confirm**. For **Other / rental**, enter the verified name. The page opens a GitHub issue with the matching game key and selected goalie already filled in.
- **Sign in to GitHub and click Submit new issue** only after checking the game and goalie selection. The dropdown action does **not** save anything itself.
- The [Save Brave H.C. goalie request](https://github.com/adambrutto-maker/brave-hc/actions/workflows/brave-goalie-issue.yml) checks the issue creator's repository **write/maintain/admin** permission, validates strict request JSON, verifies the feed is no older than 24 hours, and updates only `widgets/goalie-assignments.json`.
- GitHub records the requesting user and the previous/new assignment when it changes. Upon success, it comments on and closes the confirmation issue, leaving a public audit receipt.
- The original [manual workflow dispatch](https://github.com/adambrutto-maker/brave-hc/actions/workflows/brave-goalie-confirm.yml) remains as a fallback, requiring manual game key/goalie selection.
- If the game is moved or time changes, the feed indicates that goalie reconfirmation is needed. Manager confirmation is never inferred from the league schedule.
- **No tokens are placed in HTO or GitHub Pages; unauthorized users cannot save.** Github issue requests and their public goalie details are visible in this public repository.
- Public widget and manager read the verified SVHL schedule from `raw.githubusercontent.com/adambrutto-maker/brave-hc/main/widgets/svhl-upcoming.json`. This deliberately avoids reliance on GitHub Pages builds: pushes made with `GITHUB_TOKEN` do not trigger follow-on Pages workflows. Both tools refresh their data on page load, and the public widget repeats every 15 minutes.

**Validation evidence, Oct 19, 2026:** A no-change Stephen Logue confirmation for game `hto:3375682` was submitted as [issue #1](https://github.com/adambrutto-maker/brave-hc/issues/1). The [issue workflow run](https://github.com/adambrutto-maker/brave-hc/actions/runs/39319634402) passed, closed the issue with a receipt, and left the original goalie assignment unchanged.

## Widget deployment / rollback
- The new file [goalie-schedule-v1.2-HTO-embed.html](https://github.com/adambrutto-maker/brave-hc/blob/main/widgets/goalie-schedule-v1.2-HTO-embed.html) is the **full copy/paste source** for the HTO Script Area.
- Only replace the existing HTO code after inspecting the hosted schedule/assignments and confirming the new widget renders properly.
- If the embedded widget fails, restore the earlier source code. A feed failure is reported to visitors, never replaced with made-up games.

## Game identity and goalie confirmation continuity

- Every published SVHL fixture includes an `assignmentKey` and a `fixtureSignature` made from league date, puck-drop time, opponent, rink and home/away designation.
- If a **new SVHL game** receives an HTO game ID after its goalie has been selected, the existing provisional assignment key is **preserved**. Do not change a confirmed goalie just because HTO added the game.
- If SVHL moves a game, the schedule feed retains the unique prior assignment key when the fixture can be identified safely. A recorded goalie remains visible but is flagged for **explicit reconfirmation**.
- The goalie reconfirmation warning persists even after HTO has been corrected. A manager must confirm the goalie for the **new fixture revision**; selecting the same goalie is a valid reconfirmation and records an audit receipt.
- A possible **opponent substitution** at the same date, time and rink is marked `REVIEW_IDENTITY`; it is not treated as a routine HTO edit. Verify with the league and the game manager before updating HTO.
- If the new fixture cannot be identified uniquely, do not attach an older goalie assignment to it. Keep it TBD and refer the discrepancy for human review.
- Completed games disappear from the **upcoming widget** approximately three hours after scheduled puck drop, but history and saved assignments remain in GitHub.
- The public widget offers **Manage goaltenders**, which opens the separate manager page; viewing that page does not grant permission to publish goalie changes.

**Release validation:** GitHub Actions checks continuity, rescheduling, opponent substitution, ambiguous IDs, stale source data, role-controlled changes and the browser-side widget scripts before publishing revised SVHL schedule data. This process only reads SVHL and HTO; changes to HTO remain manual.

## Initial verified baseline — October 19, 2026
| Date | Start | Opponent | Rink | HTO ID | Goalie |
|---|---|---|---|---|---|
| Oct 25 | 6:15 PM | Big Bastones | A | 3375682 | Stephen Logue |
| Nov 01 | 8:15 PM | Mid Ice Crisis | D | 3375683 | TBD |
| Nov 08 | 9:15 PM | Other Way | D | 3375684 | TBD |
| Nov 15 | 8:15 PM | Dateline Predators | A | 3375685 | TBD |
| Nov 22 | 8:15 PM | Mohawks HC | A | 3375686 | TBD |

HTO history and league records are never modified by this integration. Initial five games match. Subsequent changes are tracked through the GitHub reconciliation artifact and issue.
