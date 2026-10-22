"""Fail-closed synthetic Plan03 integrated 497-cell Excel acceptance tests."""
import copy
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_integrated_497_fullcalc import (
    validate_composite,CompositeHold,COMPOSITE_INPUT_SHA,COMPOSITE_CALCULATED_SHA,
    OFFICIAL_HOPEFUL,ERROR_BASELINE,source,pivot
)

def fake():
    proposed={
      3:{f"ZZ{i}":("number","0") for i in range(1,461)},
      12:{f"{col}{row}":("number","0") for col in "KLMNPQRS" for row in range(370,374)}
    }
    withheld={f"XY{i}" for i in range(1,42)}
    start={"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"}
    end={"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"}
    common={"legacyManualHashes":{"skaters":"a","goalies":"b","masterSchedule":"c"},
            "legacyManualCounts":{"skaters":694249,"goalies":39239,"masterSchedule":6836},
            "unexpectedAppendedManualCells":[]}
    original=copy.deepcopy(common)
    original.update(tableRefs=start,targetCellValues={3:{"Y4674":("text"," ")},12:{}})
    candidate=copy.deepcopy(common)
    candidate.update(tableRefs=end,targetCellValues={3:{"Y4674":None},12:dict(proposed[12])})
    candidate["targetCellValues"][3].update(proposed[3])
    for ref,(old,new) in source.CORRECTED_GOALIE.items():
        original["targetCellValues"][3][ref]=("number",str(old))
        candidate["targetCellValues"][3][ref]=("number",str(new))
    games=[]
    for gid,(num,row) in OFFICIAL_HOPEFUL.items():
        gf,ga={3356177:(0,3),3356178:(3,6),3369564:(2,3),3375601:(1,7)}[gid]
        games.append({"htoGameId":gid,"teamGoals":gf,"teamGoalsAgainst":ga})
    feed={"schema":"brave-hc-hto-verified-game-feed/v1",
          "allGamesDiscovered":True,"playerAggregateParity":True,"teamGP":4,"games":games}
    schedule={37:{"AN":{"value":"4","formula":True}}}
    for g in games:
        num,row=OFFICIAL_HOPEFUL[g["htoGameId"]]
        p={k:{"value":"0","formula":False} for k in "KLMNPQRS"}
        p["K"]["value"]=str(g["teamGoals"])
        p["P"]["value"]=str(g["teamGoalsAgainst"])
        p["B"]={"value":str(num),"formula":False}
        p["O"]={"value":str(g["teamGoals"]),"formula":True}
        p["T"]={"value":str(g["teamGoalsAgainst"]),"formula":True}
        p["W"]={"value":str(g["teamGoals"]-g["teamGoalsAgainst"]),"formula":True}
        p["U"]={"value":"L","formula":True}
        p["X"]={"value":"1","formula":True}
        schedule[row]=p
    schedule[374]={"X":{"value":"0","formula":True}}
    for key in "KLMNPQRS":schedule[374][key]={"value":None,"formula":False}
    app={"schema":"brave-hc-private-full-calculation-excel-qa/v1",
         "status":"FULL_CALC_DISPOSABLE_SAVED_FOR_INDEPENDENT_QA",
         "candidateSaved":True,"worksheetCount":17,
         "sourceSHA256":COMPOSITE_INPUT_SHA,
         "rollbackSHA256":COMPOSITE_INPUT_SHA,
         "candidateSHA256":COMPOSITE_CALCULATED_SHA,
         "sourceWorkbookModified":False,"externalConnectionsRefreshed":False}
    audit={"schema":"brave-hc-plan03-private-full-calc-qa/v1",
           "status":"FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY",
           "issues":[],"sourceSHA256":source.ORIGINAL_SHA,
           "beforeSHA256":COMPOSITE_INPUT_SHA,"afterSHA256":COMPOSITE_CALCULATED_SHA,
           "totalFormulasBefore":545506,"totalFormulasAfter":545506,
           "originalWorkbookModified":False,"awardsAndLiveStatsApproved":False,
           "perSheet":[{"formulaDefinitionsPreserved":True} for _ in range(17)],
           "beforeErrors":[{"sheet":s,"ref":r,"error":e} for s,r,e in ERROR_BASELINE],
           "afterErrors":[{"sheet":s,"ref":r,"error":e} for s,r,e in ERROR_BASELINE]}
    return original,candidate,proposed,withheld,feed,schedule,app,audit

def run(items):
    original,candidate,proposed,withheld,feed,schedule,app,audit=items
    with patch.object(source,"scan_workbook",side_effect=[original,candidate]),patch.object(
      pivot,"source_totals",return_value=({},{"skaterPIM":42,"goaliePOTG":1})
    ):
      return validate_composite(Path("synthetic_original"),Path("synthetic_calculated"),
                               proposed,withheld,feed,schedule,app,audit)

class IntegratedAcceptance(unittest.TestCase):
    def test_exact_composite_passes_source_but_never_approves_publication(self):
        result=run(fake())
        self.assertEqual(result["status"],"497_SOURCE_AND_BASIC_SEASON_PARITY_PASS_REVIEW_ONLY")
        self.assertEqual(result["verifiedManualEdits"],497)
        self.assertEqual(result["withheldUnknownHTOCells"],41)
        self.assertEqual(result["teamTotals"],{"GF":6,"GA":19})
        self.assertFalse(result["compositeOriginalSourceReleaseApproved"])
        self.assertFalse(result["publicPlayerStatsWatchAwardsApproved"])
    def test_one_wrong_htoplayer_input_holds(self):
        a=list(fake())
        a[1]["targetCellValues"][3]["ZZ10"]=("number","8")
        with self.assertRaisesRegex(CompositeHold,"COMPOSITE_HTO_SOURCE_PARITY_MISMATCH"):
            run(tuple(a))
    def test_unknown_pim_populated_with_zero_is_forbidden(self):
        a=list(fake())
        a[1]["targetCellValues"][3]["XY1"]=("number","0")
        with self.assertRaisesRegex(CompositeHold,"UNKNOWN_HTO_STAT_NOT_BLANK"):
            run(tuple(a))
    def test_preexisting_historical_input_changed_holds(self):
        a=list(fake());a[1]["legacyManualHashes"]["skaters"]="corrupt"
        with self.assertRaisesRegex(CompositeHold,"HISTORICAL_MANUAL_SOURCE_DRIFT"):
            run(tuple(a))
    def test_goalie_loss_correction_cannot_be_reverted(self):
        a=list(fake());a[1]["targetCellValues"][3]["GK363"]=("number","0")
        with self.assertRaisesRegex(CompositeHold,"GOALIE_GAME359_CORRECTION_MISMATCH"):
            run(tuple(a))
    def test_whitespace_cannot_become_zero_shg(self):
        a=list(fake());a[1]["targetCellValues"][3]["Y4674"]=("number","0")
        with self.assertRaisesRegex(CompositeHold,"Y4674_NOT_PRESERVED_AS_BLANK_UNKNOWN"):
            run(tuple(a))
    def test_schedule_result_or_counted_game_cannot_drift(self):
        a=list(fake());a[5][370]["X"]["value"]="0"
        with self.assertRaisesRegex(CompositeHold,"GAME_RESULT_OR_COUNTED_FLAG_MISMATCH"):
            run(tuple(a))
    def test_october_25_game_remains_unplayed(self):
        a=list(fake());a[5][374]["K"]["value"]="1"
        with self.assertRaisesRegex(CompositeHold,"FUTURE_GAME_374_HAS_PERIOD_VALUES"):
            run(tuple(a))
    def test_full_calculation_source_hash_can_never_be_substituted(self):
        a=list(fake());a[6]["sourceSHA256"]="0"*64
        with self.assertRaisesRegex(CompositeHold,"EXCEL_PRIVATE_FULL_CALC_RECEIPT_INVALID"):
            run(tuple(a))
    def test_old_profile_ref_errors_do_not_authorize_new_errors(self):
        a=list(fake())
        a[7]["afterErrors"].append({"sheet":"Awards & Records","ref":"A1","error":"#VALUE!"})
        with self.assertRaisesRegex(CompositeHold,"NEW_OR_MISSING_EXCEL_ERROR_BASELINE"):
            run(tuple(a))
    def test_any_changed_formula_holds(self):
        a=list(fake());a[7]["perSheet"][0]["formulaDefinitionsPreserved"]=False
        with self.assertRaisesRegex(CompositeHold,"FORMULA_DEFINITION_DRIFT"):
            run(tuple(a))
    def test_awards_publication_claim_in_audit_fails(self):
        a=list(fake());a[7]["awardsAndLiveStatsApproved"]=True
        with self.assertRaisesRegex(CompositeHold,"INDEPENDENT_FULL_CALC_AUDIT_NOT_ACCEPTED"):
            run(tuple(a))
    def test_unreviewed_fifth_game_id_holds(self):
        a=list(fake())
        a[4]["games"][0]["htoGameId"]=3375682
        with self.assertRaisesRegex(CompositeHold,"OFFICIAL_HTO_GAME_IDS_CHANGED"):
            run(tuple(a))

if __name__=="__main__":
    unittest.main()
