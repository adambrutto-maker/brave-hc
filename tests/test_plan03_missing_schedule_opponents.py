"""No-write synthetic QA for Plan03 official HTO opponent-name proposals."""
from copy import deepcopy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_missing_schedule_opponents import validate,NameHold

def fixtures():
    keys=[
      (3356177,359,370,46285,"Dateline Predators","Dateline Predators",0,3),
      (3356178,360,371,46292,"Mohawks HC","Mohawks H.C.",3,6),
      (3369564,361,372,46299,None,"Michelob Morts",2,3),
      (3375601,362,373,46313,None,"Zamboner Crew",1,7),
    ]
    old={}
    new={}
    games=[]
    for gid,num,row,date,legacy,official,gf,ga in keys:
        original={"B":str(num),"C":"W2026/27","D":"Regular Season",
                  "E":str(date),"H":legacy}
        current=dict(original,U="L",X="1",O=str(gf),T=str(ga))
        old[row]=original
        new[row]=current
        games.append({"htoGameId":gid,"workbookGameNumber":num,
                      "date":{370:"2026-09-20",371:"2026-09-27",372:"2026-10-04",373:"2026-10-18"}[row],
                      "opponent":official,"braveGF":gf,"braveGA":ga})
    old[374]={"B":"363","H":None,"X":"0"}
    new[374]={"B":"363","H":None,"X":"0"}
    source={"schema":"brave-hc-private-hto-official-period-source/v1",
           "state":"OFFICIAL_PERIODS_VERIFIED_REVIEW_ONLY",
           "originalWorkbookWrites":0,"games":games}
    return old,new,source

class MissingOpponentSource(unittest.TestCase):
    def test_only_two_missing_names_proposed_never_written(self):
        r=validate(*fixtures())
        self.assertEqual(r["status"],"TWO_OPPONENT_NAMES_VERIFIED_PRIVATE_REVIEW_ONLY")
        self.assertEqual([(p["cell"],p["verifiedOpponent"]) for p in r["newOpponentNamesProposed"]],
                         [("H372","Michelob Morts"),("H373","Zamboner Crew")])
        self.assertFalse(r["originalWorkbookChanged"])
        self.assertFalse(r["newOpponentValuesInsertedInComposite"])
        self.assertFalse(r["sourceOfTruthOwnerApprovalGranted"])
    def test_unreviewed_existing_opponent_blocks(self):
        a,b,h=fixtures()
        a[372]["H"]="Incorrect Opponent"
        b[372]["H"]="Incorrect Opponent"
        with self.assertRaisesRegex(NameHold,"UNEXPECTED_PREEXISTING_OPPONENT_VALUE"):
            validate(a,b,h)
    def test_original_to_composite_unapproved_edit_blocks(self):
        a,b,h=fixtures()
        b[372]["H"]="Michelob Morts"
        with self.assertRaisesRegex(NameHold,"PREVIOUS_SOURCE_OPPONENT_EDIT_UNREVIEWED"):
            validate(a,b,h)
    def test_alias_is_preserved_for_owner_review(self):
        a,b,h=fixtures()
        a[371]["H"]=b[371]["H"]="Mohawks H.C."
        with self.assertRaisesRegex(NameHold,"LEGACY_MOHAWKS_SOURCE_ALIAS_DRIFT"):
            validate(a,b,h)
    def test_official_game_name_changed_requires_review(self):
        a,b,h=fixtures()
        h["games"][2]["opponent"]="Changed Club"
        with self.assertRaisesRegex(NameHold,"HTO_SOURCE_GAME_ID_OR_OPPONENT_DRIFT"):
            validate(a,b,h)
    def test_wrong_season_date_source_join_blocks(self):
        a,b,h=fixtures()
        a[373]["E"]=b[373]["E"]="46314"
        with self.assertRaisesRegex(NameHold,"ROW_DATE_AND_GAME_JOIN_DRIFT"):
            validate(a,b,h)
    def test_home_away_must_not_be_guessed(self):
        a,b,h=fixtures()
        b[373]["G"]="Home"
        with self.assertRaisesRegex(NameHold,"ADJACENT_SCHEDULE_METADATA_CHANGED_REQUIRES_REVIEW"):
            validate(a,b,h)
    def test_future_preview_cannot_be_counted(self):
        a,b,h=fixtures()
        b[374]["X"]="1"
        with self.assertRaisesRegex(NameHold,"OCT25_FUTURE_GAME_CHANGED_OR_ADMITTED"):
            validate(a,b,h)
    def test_score_must_match_hto_game(self):
        a,b,h=fixtures()
        b[372]["T"]="2"
        with self.assertRaisesRegex(NameHold,"COMBINED_GAME_SCORE_NOT_HTO_PARITY"):
            validate(a,b,h)
    def test_duplicate_htogame_provenance_holds(self):
        a,b,h=fixtures()
        h["games"][1]["htoGameId"]=h["games"][0]["htoGameId"]
        with self.assertRaisesRegex(NameHold,"SOURCE_GAME_DUPLICATE_OR_UNADMITTED"):
            validate(a,b,h)
    def test_date_without_approved_data_does_not_authorize_original_edit(self):
        a,b,h=fixtures()
        r=validate(a,b,h)
        self.assertEqual(r["wouldBecomeAdditionalSourceCells"],2)
        self.assertTrue(r["unverifiedScheduledTimeHomeAwayAndRinkStillBlank"])
        self.assertFalse(r["publicStatisticsPublished"])

if __name__=="__main__":
    unittest.main()
