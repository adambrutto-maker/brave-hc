"""Adapter protocol regression with fictional players and no network."""
import copy
import sys
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import hockeyos_feed_adapter_review as adapter
NOW=datetime(2026,10,20,21,0,tzinfo=timezone.utc)

def fixture():
    games=[]; evidence={}
    for index,(gid,(number,day)) in enumerate(adapter.candidate.GAME_MAP.items()):
        url=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
        goalie="Fictional Goalie "+str(index if index<3 else 0)
        games.append({"htoGameId":gid,"workbookGameNumber":number,"date":day,"sourceUrl":url,
                      "goalies":[{"name":goalie,"gp":1,"losses":1,"goalsAgainst":1,"potg":None if index==3 else 0}]})
        evidence[str(gid)]={"canonicalURL":url,"gameDate":adapter.review.GAME_DATES[gid],
                           "seasonBasis":"AUDITED_2026_27_GAME_DATE_MAP_AND_VERIFIED_SEASON_STATS"}
    unknown={"name":"Fictional Goalie 0","field":"POTG","knownSubtotal":0,"unknownGames":1,"seasonPublished":0}
    payload={"schema":"brave-hc-hto-game-feed-candidate/v1","season":"W2026/27","teamGP":4,
             "auditedGameMapComplete":True,"playerAggregateParity":True,"parityScope":"COMPLETE_FIELDS_ONLY",
             "productionAcceptance":False,"consumerCompatibilityVerified":False,"games":games,
             "inferredPerGamePOTG":[],"missingStatFields":{"skaterPIMUnknownRows":42,"seasonParity":{
                 "skaters":{"completeFieldComparisons":120,"expectedFieldComparisons":120,"incompleteFields":[],"discrepancies":[]},
                 "goalies":{"completeFieldComparisons":11,"expectedFieldComparisons":12,"incompleteFields":[unknown],"discrepancies":[]}}},
             "goalieGameTotals":{"Fictional Goalie 0":{"gp":2,"losses":2,"goalsAgainst":2,"potg":None},"Fictional Goalie 1":{"gp":1,"losses":1,"goalsAgainst":1,"potg":0},"Fictional Goalie 2":{"gp":1,"losses":1,"goalsAgainst":1,"potg":0}},
             "goalieAggregateCompleteness":{name:{"potg":{"knownSubtotal":0,"unknownCount":1 if name.endswith("0") else 0,"complete":not name.endswith("0")}} for name in ("Fictional Goalie 0","Fictional Goalie 1","Fictional Goalie 2")}}
    ids=sorted(adapter.candidate.GAME_MAP)
    return {"state":"DISCOVERY_REVIEW_SOURCE_COVERAGE_PASS","productionAcceptance":False,
            "releaseState":"REVIEW_ONLY_NOT_PRODUCTION_ACCEPTANCE","sourceContentIdentityVerified":True,
            "observationStartedAt":(NOW-timedelta(seconds=30)).isoformat(),
            "observationCompletedAt":(NOW-timedelta(seconds=10)).isoformat(),
            "scoresProvenance":{"canonicalURL":adapter.candidate.SCORE_URL},
            "seasonProvenance":{"canonicalURL":adapter.candidate.STATS_URL,"seasonTitle":adapter.review.SEASON_TITLE},
            "gameProvenance":evidence,"candidate":payload,
            "discovery":{"coverageVerified":True,"allGamesDiscovered":True,"requiresAllBoxscoresReverified":True,
                         "mappingPolicy":"EXPLICIT_AUDITED_MAP_ONLY","retainedAuditedGameIds":[],
                         "discoveredGameIds":ids,"gameIdsToReverify":ids,"seasonTeamGP":4,"productionAcceptance":False}}

class FeedAdapterTests(unittest.TestCase):
    def test_proposed_contract_keeps_review_schema_and_real_start_timestamp(self):
        source=fixture(); result=adapter.adapt_review(source,NOW)
        self.assertEqual(result["schema"],"brave-hc-hto-operational-contract-candidate/v1")
        self.assertEqual(result["proposedConsumerSchema"],"brave-hc-hto-verified-game-feed/v1")
        self.assertEqual(result["sourceReadback"],source["observationStartedAt"])
        self.assertNotEqual(result["sourceReadback"],source["observationCompletedAt"])
        self.assertFalse(result["productionAcceptance"]);self.assertFalse(result["consumerCompatibilityVerified"])
        self.assertTrue(result["allGamesDiscovered"])
        self.assertIsNone(result["goalieGameTotals"]["Fictional Goalie 0"]["potg"])
        self.assertEqual(source["candidate"]["schema"],"brave-hc-hto-game-feed-candidate/v1")
    def test_missing_naive_stale_future_and_reversed_observation_times_hold(self):
        cases=[(None,None),("2026-10-20T20:59:00",None),
               ((NOW-timedelta(hours=3)).isoformat(),None),
               (None,(NOW+timedelta(seconds=1)).isoformat()),
               ((NOW-timedelta(seconds=5)).isoformat(),None)]
        for start,end in cases:
            data=fixture()
            if start is None and end is None:data.pop("observationStartedAt")
            if start is not None:data["observationStartedAt"]=start
            if end is not None:data["observationCompletedAt"]=end
            with self.assertRaises(adapter.review.ReviewHold):adapter.adapt_review(data,NOW)
    def test_falsified_discovery_state_or_coverage_holds(self):
        for field,value in (("state","PASS"),("sourceContentIdentityVerified",False),("productionAcceptance",True)):
            data=fixture();data[field]=value
            with self.assertRaises(adapter.review.ReviewHold):adapter.adapt_review(data,NOW)
        for field,value in (("coverageVerified",False),("allGamesDiscovered",False),("seasonTeamGP",5),("retainedAuditedGameIds",[3356177])):
            data=fixture();data["discovery"][field]=value
            with self.assertRaises(adapter.review.ReviewHold):adapter.adapt_review(data,NOW)
    def test_mismatched_mapping_and_duplicate_ids_hold(self):
        for change in ("number","date","duplicate","discovered"):
            data=fixture()
            if change=="number":data["candidate"]["games"][0]["workbookGameNumber"]=999
            elif change=="date":data["candidate"]["games"][0]["date"]="2026-10-01"
            elif change=="duplicate":data["candidate"]["games"][-1]=copy.deepcopy(data["candidate"]["games"][0])
            else:data["discovery"]["discoveredGameIds"][-1]=999
            with self.assertRaises(adapter.review.ReviewHold):adapter.adapt_review(data,NOW)
    def test_parity_counts_discrepancies_and_unknown_erasure_hold(self):
        for change in ("count","difference","unknown","null","completeness","inference"):
            data=fixture();p=data["candidate"];checks=p["missingStatFields"]["seasonParity"]
            if change=="count":checks["skaters"]["completeFieldComparisons"]=119
            elif change=="difference":checks["skaters"]["discrepancies"]=[{"field":"G"}]
            elif change=="unknown":checks["goalies"]["incompleteFields"]=[]
            elif change=="null":p["goalieGameTotals"]["Fictional Goalie 0"]["potg"]=0
            elif change=="completeness":p["goalieAggregateCompleteness"]["Fictional Goalie 0"]["potg"]["unknownCount"]=0
            else:p["inferredPerGamePOTG"]=[{"potg":0}]
            with self.assertRaises(adapter.review.ReviewHold):adapter.adapt_review(data,NOW)
    def test_wrong_season_and_source_evidence_hold(self):
        for change in ("season","date","url","missing"):
            data=fixture();gid=str(next(iter(adapter.candidate.GAME_MAP)))
            if change=="season":data["seasonProvenance"]["seasonTitle"]="Wrong"
            elif change=="date":data["gameProvenance"][gid]["gameDate"]="Wrong"
            elif change=="url":data["gameProvenance"][gid]["canonicalURL"]=adapter.candidate.STATS_URL
            else:del data["gameProvenance"][gid]
            with self.assertRaises(adapter.review.ReviewHold):adapter.adapt_review(data,NOW)
    def test_opt_in_required_before_source_collection(self):
        with patch.object(adapter,"observe_discovery") as observe:
            with self.assertRaises(adapter.review.ReviewHold):adapter.main([])
            observe.assert_not_called()


    def test_missing_or_extra_goalie_summary_identity_holds(self):
        for change in ("delete_total","delete_completeness","extra_total","extra_completeness"):
            data=fixture();p=data["candidate"]
            key="goalieGameTotals" if change.endswith("total") else "goalieAggregateCompleteness"
            if change.startswith("delete"):del p[key]["Fictional Goalie 0"]
            else:p[key]["Unobserved Goalie"]=copy.deepcopy(p[key]["Fictional Goalie 1"])
            with self.assertRaises(adapter.review.ReviewHold):adapter.adapt_review(data,NOW)

    def test_replacing_unknown_raw_potg_and_summary_does_not_hide_stale_evidence(self):
        data=fixture();p=data["candidate"]
        p["games"][-1]["goalies"][0]["potg"]=0
        p["goalieGameTotals"]["Fictional Goalie 0"]["potg"]=0
        p["goalieAggregateCompleteness"]["Fictional Goalie 0"]["potg"]={"knownSubtotal":0,"unknownCount":0,"complete":True}
        with self.assertRaisesRegex(adapter.review.ReviewHold,"GOALIE_INCOMPLETE_EVIDENCE"):
            adapter.adapt_review(data,NOW)

    def test_incomplete_evidence_name_count_subtotal_and_shape_are_correlated(self):
        for field,value in (("name","Unobserved Goalie"),("unknownGames",2),("knownSubtotal",1),("seasonPublished",None),("unknownGames",True)):
            data=fixture()
            data["candidate"]["missingStatFields"]["seasonParity"]["goalies"]["incompleteFields"][0][field]=value
            with self.assertRaises(adapter.review.ReviewHold):adapter.adapt_review(data,NOW)

    def test_complete_goalie_numbers_are_recomputed_not_trusted(self):
        for field in ("gp","losses","goalsAgainst"):
            data=fixture();data["candidate"]["goalieGameTotals"]["Fictional Goalie 1"][field]=99
            with self.assertRaisesRegex(adapter.review.ReviewHold,"GOALIE_UNKNOWN_TOTAL_CHANGED"):
                adapter.adapt_review(data,NOW)

if __name__=="__main__":unittest.main()
