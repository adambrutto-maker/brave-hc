"""No-network Plan 03 October 25 admission preflight tests."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_next_game_hto_admission import check


def fixtures():
    countdown={"schema":"brave-hc-upcoming-countdown/v1",
      "sourceAuthority":"HTO official schedule, preview game links",
      "games":[{"id":3375682,"gameDate":"2026-10-25",
        "opponent":"Big Bastones","homeAway":"Home","puckDrop":"2026-10-25T18:15:00-04:00",
        "eventURL":"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=preview&sportsHQ=BRAVESHOCKEY&gameID=3375682"}]}
    svhl={"schema":"brave-hc-svhl-schedule/v1","games":[{
        "htoGameId":"3375682","assignmentKey":"hto:3375682",
        "htoSyncStatus":"MATCH","date":"2026-10-25",
        "time":"18:15","opponent":"Big Bastones","side":"home"}]}
    rows=[{"season":"W2026/27","date":"2026-10-25",
           "scope":"Regular Season","sheetRow":374,"gameNumber":363,"opponent":None}]
    feed={"schema":"brave-hc-hto-verified-game-feed/v1","allGamesDiscovered":True,
          "playerAggregateParity":True,"teamGP":4,
          "games":[{"htoGameId":x} for x in [3356177,3356178,3369564,3375601]]}
    return countdown,svhl,rows,feed


class NextGameAdmission(unittest.TestCase):
    def test_pre_game_sources_join_without_admitting(self):
        c,s,w,f=fixtures()
        r=check(c,s,w,f)
        self.assertEqual(r["workbookSheetRow"],374)
        self.assertEqual(r["workbookGameNumber"],363)
        self.assertEqual(r["status"],"PRE_GAME_SCHEDULE_ASSOCIATION_VERIFIED_NOT_ADMITTED")
        self.assertTrue(r["workbookOpponentAbsent"])
        self.assertFalse(r["completedOfficialBoxscoreVerified"])
        self.assertFalse(r["collectorAdmissionApproved"])

    def test_fifth_game_in_feed_is_deliberate_hold(self):
        c,s,w,f=fixtures()
        f["games"].append({"htoGameId":3375682});f["teamGP"]=5
        with self.assertRaisesRegex(ValueError,"FIFTH_GAME_ALREADY_PRESENT"):
            check(c,s,w,f)

    def test_hto_preview_not_real_score(self):
        c,s,w,f=fixtures()
        c["games"][0]["eventURL"]=c["games"][0]["eventURL"].replace("p=preview","p=boxscore")
        with self.assertRaisesRegex(ValueError,"HTO_PREVIEW_URL_INVALID"):
            check(c,s,w,f)

    def test_official_opponent_changed_requires_new_review(self):
        c,s,w,f=fixtures()
        c["games"][0]["opponent"]="Unknown Opponent"
        with self.assertRaisesRegex(ValueError,"HTO_FIXTURE_CHANGED"):
            check(c,s,w,f)

    def test_svhl_opponent_mismatch_holds(self):
        c,s,w,f=fixtures()
        s["games"][0]["opponent"]="Other Way"
        with self.assertRaisesRegex(ValueError,"SVHL_SCHEDULE_DISAGREES"):
            check(c,s,w,f)

    def test_old_workbook_date_mismatch_holds(self):
        c,s,w,f=fixtures()
        w[0]["date"]="2026-11-01"
        with self.assertRaisesRegex(ValueError,"WORKBOOK_SEASON_DATE_JOIN_AMBIGUOUS"):
            check(c,s,w,f)

    def test_duplicate_workbook_row_holds(self):
        c,s,w,f=fixtures()
        w.append(copy.deepcopy(w[0]))
        with self.assertRaisesRegex(ValueError,"WORKBOOK_SEASON_DATE_JOIN_AMBIGUOUS"):
            check(c,s,w,f)

    def test_workbook_number_conflict_holds(self):
        c,s,w,f=fixtures()
        w[0]["gameNumber"]=364
        with self.assertRaisesRegex(ValueError,"WORKBOOK_IDENTITY_CHANGED"):
            check(c,s,w,f)

    def test_unverified_current_feed_holds(self):
        c,s,w,f=fixtures()
        f["playerAggregateParity"]=False
        with self.assertRaisesRegex(ValueError,"CURRENT_COMPLETED_GAMES_UNVERIFIED"):
            check(c,s,w,f)

    def test_future_game_time_change_holds(self):
        c,s,w,f=fixtures()
        c["games"][0]["puckDrop"]="2026-10-25T19:15:00-04:00"
        with self.assertRaisesRegex(ValueError,"HTO_PUCKDROP_CHANGED"):
            check(c,s,w,f)


if __name__=="__main__":
    unittest.main()
