"""Offline fail-closed review of 11 bounded scorer ID receipts (fictional IDs)."""
import copy
import json
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from merge_svhl_roster_exception_receipts import merge,url_identifiers

class MergeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.review=json.loads((ROOT/"widgets"/"svhl-gameinfo-hold-review.json")
                            .read_text(encoding="utf-8"))

    def fixture(self):
        records=[g for g in self.review["games"] if
                 g["category"]=="RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD"]
        self.assertEqual(len(records),39)
        batches=[];start=0
        for size in [2]+[4]*9+[1]:
            selected=records[start:start+size]
            start+=size
            events=[];groups=[]
            for i,source in enumerate(selected):
                league,gid=source["leagueId"],source["gameId"]
                player=900000+len(batches)*10+i
                team=500000+len(batches)*10+i
                name=source["homeTeam"]
                source_games=[]
                count=source["heldReasons"]["GOAL_PLAYER_ID_NOT_LISTED_ON_VERIFIED_TEAM_ROSTER"]
                for j in range(count):
                    period=(j%3)+1
                    ordinal=j+1
                    source_games.append({"gameId":gid,"period":period,"ordinal":ordinal})
                    events.append({
                        "leagueId":league,"gameId":gid,"gameDate":source["date"],
                        "period":period,"ordinal":ordinal,
                        "officialPlayerId":player,
                        "officialGoalTeamId":team,
                        "officialGoalTeamName":name,
                        "scorerDisplayInGoalTable":"FICTIONAL TEST SCORER",
                        "officialScorerLink":(
                          f"playerinfo.aspx?leagueid={league}&teamid={team}&playerid={player}"),
                        "reason":"OFFICIAL_GOAL_SCORER_ID_ABSENT_SOURCE_SEASON_TEAM_ROSTER",
                        "registrationOrGameAttendanceProved":False,
                        "rosterAndGoalsOverwritten":False
                    })
                groups.append({
                    "leagueId":league,"sourceTeamId":team,
                    "officialScorerPlayerId":player,
                    "teamName":name,"sourceDisplayName":"FICTIONAL TEST SCORER",
                    "sourceGames":source_games,
                    "otherSameSeasonTeamEvidence":[],
                    "otherSeasonRosterEvidence":[],
                })
            batches.append({
                "schema":"brave-hc-svhl-official-scorer-roster-holds-private-review/v1",
                "scope":"SVHL_ONLY_NOT_VAHL",
                "sourceVerifiedGames":size,"targetGames":size,
                "pageOrReplayHolds":0,"sourceHolds":[],
                "unadmittedScorerEvents":len(events),
                "distinctSeasonTeamScorerCases":len(groups),
                "scorerReviewCases":groups,"perEventEvidence":events,
                "noPlayerAttendanceOrRegistrationInferred":True,
                "canonicalPlayerScoresWritten":False,"officialRosterWritten":False,
                "releaseEligible":False
            })
        self.assertEqual(start,39)
        return batches

    def test_exact_39_game_composition_and_52_held_events(self):
        result=merge(self.review,self.fixture())
        self.assertEqual(result["targetGames"],39)
        self.assertEqual(result["unadmittedScorerEvents"],52)
        self.assertEqual(result["distinctSeasonTeamScorerCases"],39)
        self.assertFalse(result["releaseEligible"])
        self.assertEqual(result["independentAcceptance"],"PENDING_SOURCE_OWNER_AND_INDEPENDENT_QA")

    def test_missing_batch_refuses_complete_claim(self):
        with self.assertRaisesRegex(ValueError,"NOT_ALL_39_SOURCE_GAMES_ACCOUNTED"):
            merge(self.review,self.fixture()[:-1])

    def test_duplicate_source_game_refused(self):
        receipts=self.fixture()
        receipts[1]["perEventEvidence"][0]["gameId"]=receipts[0]["perEventEvidence"][0]["gameId"]
        with self.assertRaisesRegex(ValueError,"SOURCE_SCORER|SCORER|DUPLICATED|COUNT|GROUP"):
            merge(self.review,receipts)

    def test_wrong_official_player_link_refused(self):
        receipts=self.fixture()
        e=receipts[0]["perEventEvidence"][0]
        e["officialScorerLink"]=e["officialScorerLink"].replace(
             "playerid="+str(e["officialPlayerId"]),"playerid=123")
        with self.assertRaisesRegex(ValueError,"SCORER_PROFILE_IDENTITY_MISMATCH"):
            merge(self.review,receipts)

    def test_source_capture_game_date_must_match(self):
        receipts=self.fixture()
        receipts[0]["perEventEvidence"][0]["gameDate"]="2000-01-01"
        with self.assertRaisesRegex(ValueError,"SCORER_GAME_DATE_NOT_PINNED"):
            merge(self.review,receipts)

    def test_fake_second_goal_event_cannot_override_original_held_count(self):
        receipts=self.fixture()
        e=copy.deepcopy(receipts[0]["perEventEvidence"][0])
        e["ordinal"]+=10
        receipts[0]["perEventEvidence"].append(e)
        receipts[0]["unadmittedScorerEvents"]+=1
        with self.assertRaisesRegex(ValueError,"SOURCE_GAME_ROSTER_HOLD_EVENT_COUNTS_NOT_EQUAL"):
            merge(self.review,receipts)

    def test_qualified_events_are_never_accepted_player_attendance(self):
        receipts=self.fixture()
        receipts[0]["canonicalPlayerScoresWritten"]=True
        with self.assertRaisesRegex(ValueError,"PRIVATE_RECEIPT_UNQUALIFIED"):
            merge(self.review,receipts)

    def test_official_profile_url_requires_strict_id_scope(self):
        self.assertEqual(url_identifiers(
          "playerinfo.aspx?leagueid=570&teamid=13704&playerid=86365"),
          (570,13704,86365))
        with self.assertRaisesRegex(ValueError,"UNQUALIFIED_OFFICIAL_SCORER_LINK"):
            url_identifiers("playerinfo.aspx?leagueid=570&teamid=13704&playerid=86365&playerid=999")

if __name__=="__main__":unittest.main()
