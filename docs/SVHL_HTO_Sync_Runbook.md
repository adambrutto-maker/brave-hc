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

## Manager action — adding or editing an HTO game
1. Open **HTO Admin → Schedule → Schedule & Results** using an authorized team account.
2. Find the game's current **HTO game ID** in the reconciliation issue, and locate the corresponding game in the schedule list.
3. **Edit** the existing game when date, time, side or rink changes. Preserve its ID. For entirely new games use **New Game**.
4. Enter verified SVHL date, Toronto start time, exact opponent, home/away, rink and correct **Winter 2026/27** season. Check against the league posting.
5. Save in HTO. Re-open **HTO List View** and cross-check against the SVHL source.
6. If the goalie had been confirmed, reconfirm his availability after a material date/time change. Do not silently change the goalie.
7. Run [the GitHub workflow](https://github.com/adambrutto-maker/brave-hc/actions/workflows/brave-svhl-sync.yml) manually when convenient or allow the next scheduled reconciliation. The issue should close once both sites agree.
8. Do not import the entire schedule for incremental changes; it risks creating duplicate HTO records. Never automatically delete historical game records.

## Goalie management — authenticated GitHub workflow

The public goalie schedule is **read-only**. The [Goalie Manager](https://adambrutto-maker.github.io/brave-hc/widgets/goalie-manager-v1.2.html) shows a dropdown for each upcoming SVHL fixture but does **not** save data itself.

1. In the manager, select the intended goalie and click **Prepare assignment** next to the specific game.
2. This copies the stable `hto:GAMEID` or `svhl:DATE:OPPONENT` assignment key and opens [Confirm Brave H.C. Goaltender](https://github.com/adambrutto-maker/brave-hc/actions/workflows/brave-goalie-confirm.yml).
3. Sign into GitHub with a repository-writing account. Select **Run workflow**, paste the game key, and choose the same goalie.
4. For a non-roster rental goalie, choose **Other / rental** and enter the complete name in the custom field.
5. The workflow defaults to **dry_run = true**, validating without saving. To **publish** the confirmed goalie, explicitly set **dry_run = false** and run it.
6. Verify the workflow is successful and that [goalie-assignments.json](https://github.com/adambrutto-maker/brave-hc/blob/main/widgets/goalie-assignments.json) reflects the decision. A subsequent page refresh displays the change.
7. The workflow rejects unknown game keys, invalid dropdown options and unverified league feeds older than 72 hours. A fresh confirmation is recorded with an authenticated GitHub actor and commit.
8. The SVHL schedule remains authoritative; no league or HTO schedule changes are made by a goalie confirmation. Reconfirm goalies if a fixture is rescheduled.

**Safety:** Do not paste GitHub tokens into HTO or the manager. Never auto-confirm a goalie from prior attendance or historical rosters. No player notification is sent by this workflow. The GitHub manager page is publicly viewable; only repository collaborators can run the protected workflow.

**Release evidence (2026-10-19):** The GitHub Actions **dry-run** test for `hto:3375682` / Stephen Logue completed successfully as [run 39318093802](https://github.com/adambrutto-maker/brave-hc/actions/runs/39318093802). The script validation passed and the commit step was skipped, leaving the saved goalie file unchanged.

## Widget deployment / rollback
- The new file [goalie-schedule-v1.2-HTO-embed.html](https://github.com/adambrutto-maker/brave-hc/blob/main/widgets/goalie-schedule-v1.2-HTO-embed.html) is the **full copy/paste source** for the HTO Script Area.
- Only replace the existing HTO code after inspecting the hosted schedule/assignments and confirming the new widget renders properly.
- If the embedded widget fails, restore the earlier source code. A feed failure is reported to visitors, never replaced with made-up games.

## Initial verified baseline — October 19, 2026
| Date | Start | Opponent | Rink | HTO ID | Goalie |
|---|---|---|---|---|---|
| Oct 25 | 6:15 PM | Big Bastones | A | 3375682 | Stephen Logue |
| Nov 01 | 8:15 PM | Mid Ice Crisis | D | 3375683 | TBD |
| Nov 08 | 9:15 PM | Other Way | D | 3375684 | TBD |
| Nov 15 | 8:15 PM | Dateline Predators | A | 3375685 | TBD |
| Nov 22 | 8:15 PM | Mohawks HC | A | 3375686 | TBD |

HTO history and league records are never modified by this integration. Initial five games match. Subsequent changes are tracked through the GitHub reconciliation artifact and issue.
