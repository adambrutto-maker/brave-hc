"""Synthetic fail-closed workbook shadow tests; never opens original Excel."""
import copy
from datetime import datetime, timezone
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from plan03_review_workbook_period_reconciliation import verify,SourceHold,WORKBOOK_SHA,EXTRACT_SHA,MAP

NOW=datetime(2026,10,21,16,5,tzinfo=timezone.utc)
ROWS={
 3356177:("Dateline Predators",[0,0,0,0,0],[0,2,1,0,0]),
 3356178:("Mohawks H.C.",[0,1,2,0,0],[1,2,3,0,0]),
 3369564:("Michelob Morts",[2,0,0,0,0],[2,0,1,0,0]),
 3375601:("Zamboner Crew",[1,0,0,0,0],[2,3,2,0,0])
}
SERIAL={"2026-09-20":46285,"2026-09-27":46292,"2026-10-04":46299,"2026-10-18":46313}

def fixtures():
    period={"schema":"brave-hc-private-hto-official-period-source/v1",
        "state":"OFFICIAL_PERIODS_VERIFIED_REVIEW_ONLY",
        "originalWorkbookWrites":0,"nativeHTOWrites":0,
        "capturedAt":"2026-10-21T16:00:00+00:00","games":[]}
    feed={"schema":"brave-hc-hto-verified-game-feed/v1",
        "teamGP":4,"playerAggregateParity":True,"allGamesDiscovered":True,
        "sourceReadback":"2026-10-21T15:31:12+00:00","games":[]}
    extract=[]
    for gid,(number,row,day,name,label) in MAP.items():
        opponent,gf,ga=ROWS[gid]
        url=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
        period["games"].append(dict(htoGameId=gid,date=day,workbookGameNumber=number,
            sourceUrl=url,canonicalUrl=url,officialDateLabel=label,
            periodHeadings=["1","2","3","OT","2OT","F"],
            opponent=opponent,bravePeriods=list(gf),opponentPeriods=list(ga),braveGF=sum(gf),braveGA=sum(ga),
            sourceResponseSHA256="a"*64))
        feed["games"].append({"htoGameId":gid,"date":day,"workbookGameNumber":number,
             "sourceUrl":url,"teamGoals":sum(gf),"teamGoalsAgainst":sum(ga)})
        extract.append({"row":row,"B":str(number),"C":"W2026/27","D":"Regular Season",
            "E":str(SERIAL[day]),"H":("Mohawks HC" if gid==3356178 else name if gid==3356177 else None),
            "O":"0","T":"0","U":"T","W":"0",
            "Uformula":'IF(AllTimeSchedule[[#This Row],[+/-]]<0,"L",IF(...))'})
    return period,extract,feed

def run(three=None, *, now=NOW, workbook_sha=WORKBOOK_SHA, extract_sha=EXTRACT_SHA):
    p,w,f=fixtures() if three is None else three
    return verify(p,w,f,now=now,workbook_sha=workbook_sha,extract_sha=extract_sha)

class ShadowReview(unittest.TestCase):
    def test_four_source_results_produce_only_reviewer_manifest(self):
        r=run()
        self.assertEqual(r["officialGames"],4)
        self.assertEqual((r["teamGF"],r["teamGA"]),(6,19))
        self.assertEqual([x["gameNumber"] for x in r["proposed"]],[359,360,361,362])
        self.assertEqual([x["worksheetRow"] for x in r["proposed"]],[370,371,372,373])
        self.assertTrue(all(x["expectedAfterFormulaRecalculation"]["result"]=="L" for x in r["proposed"]))
        self.assertFalse(r["originalWorkbookModified"])
        self.assertFalse(r["futureFifthGameAdmitted"])
        self.assertGreaterEqual(len(r["reviewRequiredBeforeUse"]),4)
    def test_second_game_period_columns_and_scores(self):
        r=run()["proposed"][1]
        self.assertEqual(r["reviewOnlyPeriodCells"],{"K":0,"L":1,"M":2,"N":0,"P":1,"Q":2,"R":3,"S":0})
        self.assertEqual(r["expectedAfterFormulaRecalculation"]["goalDifference"],-3)
    def test_workbook_hash_drift_holds(self):
        with self.assertRaisesRegex(SourceHold,"IMMUTABLE_WORKBOOK_OR_EXTRACT_HASH_DRIFT"):
            run(workbook_sha="b"*64)
    def test_extract_hash_drift_holds(self):
        with self.assertRaisesRegex(SourceHold,"IMMUTABLE_WORKBOOK_OR_EXTRACT_HASH_DRIFT"):
            run(extract_sha="c"*64)
    def test_period_final_conflict_holds(self):
        p,w,f=fixtures();p["games"][0]["braveGF"]=1
        with self.assertRaisesRegex(SourceHold,"HTO_PERIODS_DO_NOT_MATCH_VERIFIED_FINAL"):
            run((p,w,f))
    def test_2ot_nonzero_refused_by_four_period_workbook(self):
        p,w,f=fixtures();p["games"][0]["bravePeriods"][4]=1
        with self.assertRaisesRegex(SourceHold,"FIFTH_2OT_PERIOD_UNSUPPORTED_BY_WORKBOOK"):
            run((p,w,f))
    def test_duplicate_htogame_holds(self):
        p,w,f=fixtures();p["games"][0]["htoGameId"]=3356178
        with self.assertRaisesRegex(SourceHold,"GAME_ID_MISSING_DUPLICATED_OR_UNADMITTED"):
            run((p,w,f))
    def test_extra_fifth_game_holds(self):
        p,w,f=fixtures();p["games"].append(copy.deepcopy(p["games"][0]))
        with self.assertRaisesRegex(SourceHold,"SOURCE_GAME_COVERAGE_CHANGED"):
            run((p,w,f))
    def test_current_workbook_results_cannot_be_overwritten(self):
        p,w,f=fixtures();w[1]["T"]="6"
        with self.assertRaisesRegex(SourceHold,"WORKBOOK_STALE_BASELINE_CHANGED"):
            run((p,w,f))
    def test_workbook_period_already_present_refuses_double_write(self):
        p,w,f=fixtures();w[0]["P"]="0"
        with self.assertRaisesRegex(SourceHold,"WORKBOOK_PERIOD_INPUT_ALREADY_PRESENT"):
            run((p,w,f))
    def test_ambiguous_duplicate_schedule_row_holds(self):
        p,w,f=fixtures();w.append(copy.deepcopy(w[0]))
        with self.assertRaisesRegex(SourceHold,"SOURCE_WORKBOOK_ROW_JOIN_NOT_UNIQUE"):
            run((p,w,f))
    def test_workbook_opponent_conflict_holds(self):
        p,w,f=fixtures();w[1]["H"]="Different Club"
        with self.assertRaisesRegex(SourceHold,"WORKBOOK_OPPONENT_NAME_CONFLICT"):
            run((p,w,f))
    def test_public_source_date_changed_holds(self):
        p,w,f=fixtures();p["games"][2]["date"]="2026-10-05"
        with self.assertRaisesRegex(SourceHold,"OFFICIAL_PERIOD_PROVENANCE_OR_IDENTITY_CHANGED"):
            run((p,w,f))
    def test_stale_period_evidence_holds(self):
        with self.assertRaisesRegex(SourceHold,"HTO_PERIOD_EVIDENCE_STALE"):
            run(now=datetime(2026,10,21,22,0,tzinfo=timezone.utc))
    def test_no_unverified_cached_formula_accepted(self):
        p,w,f=fixtures();w[0].pop("Uformula")
        with self.assertRaisesRegex(SourceHold,"WORKBOOK_RESULT_FORMULA_NOT_PRESERVED"):
            run((p,w,f))

if __name__=="__main__":unittest.main()
