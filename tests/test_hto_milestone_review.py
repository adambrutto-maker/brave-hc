"""No-network fail-closed regression for private Plan 03 milestone review."""
import copy
from datetime import datetime, timezone, timedelta
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from reconcile_hto_milestone_review import reconcile

AT=datetime(2026,10,21,15,32,tzinfo=timezone.utc)


def inputs():
    dates=["2026-09-20","2026-09-27","2026-10-04","2026-10-18"]
    ids=[3356177,3356178,3369564,3375601]
    games=[]
    for i,(date,gid) in enumerate(zip(dates,ids)):
        games.append({
            "htoGameId":gid,"date":date,"workbookGameNumber":359+i,
            "sourceUrl":f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=boxscore&gameID={gid}",
            "skaters":[{"name":"Carosi, Justin","gameAppearance":1,"pts":1},
                       {"name":"Provenzano, Michael","gameAppearance":1,"pts":1}],
        })
    feed={"schema":"brave-hc-hto-verified-game-feed/v1",
          "sourceReadback":"2026-10-21T15:31:14+00:00",
          "allGamesDiscovered":True,"playerAggregateParity":True,"teamGP":4,"games":games}
    report={
        "status":"VERIFIED_SUPPORTED_CATEGORIES_ONLY",
        "sourceAsOf":"2026-10-18","gameCount":4,
        "playersWithoutBaseline":["Pavaday, Damian","Rosenberg, Jamie"],
        "eventHistory":[
            {"type":"reached","player":"Carosi, Justin","category":"gp",
             "threshold":300,"careerTotalAtEvent":300,"eventDate":"2026-09-20"},
            {"type":"reached","player":"Provenzano, Michael","category":"pts",
             "threshold":50,"careerTotalAtEvent":50,"eventDate":"2026-09-27"},
        ]}
    records={"schema":"brave-hc-hto-history-snapshot/v1","type":"records",
        "source":{"authority":"OFFICIAL_HTO_PUBLIC_READBACK"},"entryCount":2,"groups":[
            {"section":"Individual Records","category":"300 Game Club","period":"Career",
             "items":["1 - Justin Carosi (September 20, 2026)"]},
            {"section":"Individual Records","category":"50 Point Club","period":"Career",
             "items":["20 - Michael Provenzano (September 27, 2026)"]},
        ]}
    return feed,report,records


class MilestoneReview(unittest.TestCase):
    def test_exact_two_native_match_no_publication(self):
        feed,report,records=inputs()
        result=reconcile(feed,report,records,now=AT)
        self.assertEqual(result["eventCount"],2)
        self.assertFalse(result["publicationAuthorized"])
        self.assertEqual(result["verifiedEvents"][0]["player"],"Michael Provenzano")
        self.assertEqual(result["verifiedEvents"][1]["player"],"Justin Carosi")
        self.assertEqual(len(result["playersWithoutHistoricalBaseline"]),2)
        self.assertTrue(all(e["state"]=="MATCHES_EXISTING_PUBLISHED_HTO_RECORD" for e in result["verifiedEvents"]))

    def test_fifth_game_not_admitted(self):
        a,b,c=inputs()
        a["games"].append(copy.deepcopy(a["games"][0]))
        a["games"][-1]["htoGameId"]=3375682
        a["teamGP"]=5
        with self.assertRaisesRegex(ValueError,"HTO_GAME_COVERAGE_INVALID"):
            reconcile(a,b,c,now=AT)

    def test_duplicate_game_not_admitted(self):
        a,b,c=inputs()
        a["games"][1]["htoGameId"]=3356177
        with self.assertRaisesRegex(ValueError,"HTO_UNADMITTED_OR_DUPLICATE_GAME"):
            reconcile(a,b,c,now=AT)

    def test_stale_readback_rejected(self):
        a,b,c=inputs()
        with self.assertRaisesRegex(ValueError,"HTO_FEED_STALE_OR_FUTURE"):
            reconcile(a,b,c,now=AT+timedelta(hours=3))

    def test_unknown_native_claim_rejected(self):
        a,b,c=inputs()
        c["groups"][1]["items"][0]="20 - Other Player (September 27, 2026)"
        with self.assertRaisesRegex(ValueError,"MILESTONE_NOT_FOUND_IN_PUBLISHED_HTO_RECORDS"):
            reconcile(a,b,c,now=AT)

    def test_crossing_requires_positive_official_game_delta(self):
        a,b,c=inputs()
        a["games"][1]["skaters"][1]["pts"]=0
        with self.assertRaisesRegex(ValueError,"MILESTONE_CROSSING_NOT_VERIFIED"):
            reconcile(a,b,c,now=AT)

    def test_wrong_official_game_url_rejected(self):
        a,b,c=inputs()
        a["games"][0]["sourceUrl"]="https://evil.example.invalid/teams/default.asp?p=boxscore&gameID=3356177"
        with self.assertRaisesRegex(ValueError,"INVALID_HTO_BOXSCORE_URL"):
            reconcile(a,b,c,now=AT)

    def test_missing_profile_identity_rejected(self):
        a,b,c=inputs()
        a["games"][0]["skaters"][0]["name"]="Unverified Person"
        with self.assertRaisesRegex(ValueError,"MILESTONE_PLAYER_GAME_NOT_VERIFIED"):
            reconcile(a,b,c,now=AT)

    def test_missing_workbook_verification_rejected(self):
        a,b,c=inputs()
        b["status"]="DRAFT"
        with self.assertRaisesRegex(ValueError,"MILESTONE_REPORT_NOT_VERIFIED"):
            reconcile(a,b,c,now=AT)

    def test_no_outside_player_milestone_invented(self):
        a,b,c=inputs()
        b["eventHistory"]=[]
        result=reconcile(a,b,c,now=AT)
        self.assertEqual(result["verifiedEvents"],[])
        self.assertEqual(result["playersWithoutHistoricalBaseline"],
                         ["Pavaday, Damian","Rosenberg, Jamie"])

    def test_duplicate_claim_rejected(self):
        a,b,c=inputs()
        b["eventHistory"].append(copy.deepcopy(b["eventHistory"][0]))
        with self.assertRaisesRegex(ValueError,"DUPLICATE_MILESTONE_EVENT"):
            reconcile(a,b,c,now=AT)


if __name__=="__main__":
    unittest.main()
