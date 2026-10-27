"""Offline fail-closed source-owner roster review QA (fictional pilot IDs)."""
import copy,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from build_svhl_roster_source_owner_packet import compile_packet
from audit_svhl_roster_exceptions import parse_player_link

class RosterOwnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.review=json.loads((ROOT/"widgets"/"svhl-gameinfo-hold-review.json")
                            .read_text(encoding="utf-8"))
        cls.current=next(x for x in cls.review["games"]
                         if x["category"]=="RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD"
                         and x["leagueId"]==570)

    def pilot(self):
        rows=[x for x in self.review["games"] if
              x["category"]=="RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD"
              and x["leagueId"]==570]
        self.assertEqual(len(rows),2)
        # Synthetic IDs deliberately do not claim actual source-owner evidence.
        return {"schema":"brave-hc-svhl-official-scorer-roster-holds-private-review/v1",
                "sourceVerifiedGames":2,"targetGames":2,"pageOrReplayHolds":0,
                "noPlayerAttendanceOrRegistrationInferred":True,
                "canonicalPlayerScoresWritten":False,"officialRosterWritten":False,
                "releaseEligible":False,
                "perEventEvidence":[{
                  "leagueId":x["leagueId"],"gameId":x["gameId"],
                  "officialPlayerId":999998,"officialGoalTeamId":13704,
                  "scorerDisplayInGoalTable":"SYNTHETIC FIXTURE ONLY",
                  "reason":"OFFICIAL_GOAL_SCORER_ID_ABSENT_SOURCE_SEASON_TEAM_ROSTER",
                  "registrationOrGameAttendanceProved":False,
                  "rosterAndGoalsOverwritten":False,
                  "sameSeasonOtherListedTeams":[],
                  "otherArchivedSeasonRosterObservations":[]
                 } for x in rows]}

    def test_full_39_disposition_packet_keeps_unreviewed_identities_unknown(self):
        doc=compile_packet(self.review,self.pilot())
        self.assertEqual(doc["totalRosterHoldGames"],39)
        self.assertEqual(doc["sourceIdentitiesReplayed"],2)
        self.assertEqual(doc["identityInvestigationPending"],37)
        self.assertFalse(doc["officialRosterAdmissionAuthorized"])
        self.assertFalse(doc["canonicalScoringOrWorkbookModified"])
        self.assertTrue(doc["humanApprovalAndIndependentQARequired"])
        self.assertEqual(sum(x["officialScorerId"] is not None for x in doc["cases"]),2)
        self.assertEqual(sum(x["officialScorerId"] is None for x in doc["cases"]),37)
        self.assertTrue(all(not x["scoringAdmission"] for x in doc["cases"]))

    def test_non_existent_source_game_cannot_be_used_as_registration_evidence(self):
        p=self.pilot()
        p["perEventEvidence"][0]["gameId"]=-9
        with self.assertRaisesRegex(ValueError,"UNKNOWN_PILOT_CASE"):
            compile_packet(self.review,p)

    def test_source_case_not_counted_twice(self):
        p=self.pilot()
        p["perEventEvidence"][0]["gameId"]=p["perEventEvidence"][1]["gameId"]
        with self.assertRaisesRegex(ValueError,"PILOT_SCORER_QUALIFICATION_INVALID"):
            compile_packet(self.review,p)

    def test_inferred_attendance_or_roster_write_blocks(self):
        p=self.pilot()
        p["perEventEvidence"][0]["registrationOrGameAttendanceProved"]=True
        with self.assertRaisesRegex(ValueError,"PILOT_SCORER_QUALIFICATION_INVALID"):
            compile_packet(self.review,p)
        p=self.pilot()
        p["officialRosterWritten"]=True
        with self.assertRaisesRegex(ValueError,"PILOT_NOT_QUALIFIED"):
            compile_packet(self.review,p)

    def test_modified_review_source_cannot_pass(self):
        copy_source=copy.deepcopy(self.review)
        copy_source["gamePages"]=136
        with self.assertRaisesRegex(ValueError,"PUBLIC_REVIEW_SOURCE_UNQUALIFIED"):
            compile_packet(copy_source,self.pilot())
        copy_source=copy.deepcopy(self.review)
        copy_source["categories"]["RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD"]=38
        with self.assertRaisesRegex(ValueError,"EXPECTED_39_SCORER_ROSTER_HOLDS"):
            compile_packet(copy_source,self.pilot())

    def test_official_scorer_id_parser_is_team_and_season_scoped(self):
        link="playerinfo.aspx?leagueid=570&teamid=13704&playerid=86365&page_type=Adult"
        self.assertEqual(parse_player_link(link,570,13704),86365)
        with self.assertRaisesRegex(ValueError,"SCORER_URL_IDENTITY_INVALID"):
            parse_player_link(link,547,13704)
        with self.assertRaisesRegex(ValueError,"SCORER_URL_IDENTITY_INVALID"):
            parse_player_link(link,570,13730)
        with self.assertRaisesRegex(ValueError,"SCORER_URL_IDENTITY_INVALID"):
            parse_player_link(link.replace("playerid=86365","playerid=86365&playerid=123"),570,13704)

    def test_unverified_extra_pilot_game_rejected(self):
        p=self.pilot()
        p["perEventEvidence"].append({**p["perEventEvidence"][0],"gameId":121736,
                                      "leagueId":547})
        with self.assertRaisesRegex(ValueError,"TWO_PILOT_GAMES_NOT_ACCOUNTED|UNKNOWN_PILOT_CASE"):
            compile_packet(self.review,p)

if __name__=="__main__":unittest.main()
