"""Synthetic read-only QA for Plan03's Excel-copy recalculation evidence."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_excel_disposable_recalc import audit,EvidenceHold,GAMES,PERIOD_COLUMNS,FORMULA_COLUMNS

def fixture():
    src={"members":{"xl/worksheets/sheet12.xml","xl/workbook.xml"},
         "sheetCount":17,"tableCount":35,"pivotDefinitions":3,"cells":{}}
    new=copy.deepcopy(src)
    periods={
        370:{"K":0,"L":0,"M":0,"N":0,"P":0,"Q":2,"R":1,"S":0},
        371:{"K":0,"L":1,"M":2,"N":0,"P":1,"Q":2,"R":3,"S":0},
        372:{"K":2,"L":0,"M":0,"N":0,"P":2,"Q":0,"R":1,"S":0},
        373:{"K":1,"L":0,"M":0,"N":0,"P":2,"Q":3,"R":2,"S":0}
    }
    rows=[]
    for r in [370,371,372,373,374]:
        for c in PERIOD_COLUMNS:
            key=c+str(r)
            src["cells"][key]={"formula":None,"value":None,"type":None}
            new["cells"][key]=copy.deepcopy(src["cells"][key])
            if r<374:new["cells"][key]["value"]=str(periods[r][c])
        for c in FORMULA_COLUMNS:
            key=c+str(r)
            value="T" if c=="U" else ("0.5" if c=="X" and False else "0")
            if c=="X":value="0"
            src["cells"][key]={"formula":"="+c+"(" +str(r)+")","value":value,"type":None}
            new["cells"][key]=copy.deepcopy(src["cells"][key])
        if r<374:
            gameNumber,gf,ga,gd=GAMES[r]
            new["cells"]["O"+str(r)]["value"]=str(gf)
            new["cells"]["T"+str(r)]["value"]=str(ga)
            new["cells"]["W"+str(r)]["value"]=str(gd)
            new["cells"]["X"+str(r)]["value"]="1"
            new["cells"]["U"+str(r)]["value"]="L"
            rows.append({"worksheetRow":r,"gameNumber":gameNumber,
                 "expectedAfterFormulaRecalculation":{"GF":gf,"GA":ga,"goalDifference":gd},
                 "reviewOnlyPeriodCells":periods[r]})
    src["cells"]["AN37"]={"formula":"COUNTIFS(...)", "value":"1","type":None}
    new["cells"]["AN37"]={"formula":"COUNTIFS(...)", "value":"4","type":None}
    manifest={"schema":"brave-hc-private-workbook-reconciliation-receipt/v1","review":{
        "status":"FOUR_VERIFIED_RESULTS_READY_FOR_WORKBOOK_OWNER_REVIEW_NOT_APPLIED","proposed":rows}}
    receipt={"schema":"brave-hc-private-excel-disposable-recalculation/v1",
        "masterScheduleRecalculated":True,"preservedSourceCopyHashMatches":True,
        "originalWorkbookHashMatches":True,"workbookFullRecalculationVerified":False}
    return src,new,manifest,receipt

class ExcelRecalcEvidenceTests(unittest.TestCase):
    def test_exact_32_inputs_and_four_complete_games(self):
        result=audit(*fixture())
        self.assertEqual(result["status"],"DISPOSABLE_MASTER_SCHEDULE_SOURCE_FORMULAS_PASS")
        self.assertEqual(result["periodInputsConfirmed"],32)
        self.assertEqual(result["winter2026RecordedGamesAfter"],4)
        self.assertEqual(len(result["games"]),4)
        self.assertFalse(result["fullWorkbookAndPivotRecalculationCertified"])
    def test_unexpected_manual_source_value_hold(self):
        a,b,m,r=fixture()
        a["cells"]["H370"]={"formula":None,"value":"opponent","type":"s"}
        b["cells"]["H370"]={"formula":None,"value":"wrong","type":"s"}
        with self.assertRaisesRegex(EvidenceHold,"UNREVIEWED_SOURCE_VALUE_CHANGED"):
            audit(a,b,m,r)
    def test_formula_definition_change_hold(self):
        a,b,m,r=fixture();b["cells"]["O371"]["formula"]="=WRONG(371)"
        with self.assertRaisesRegex(EvidenceHold,"ORIGINAL_EXCEL_FORMULA_CHANGED"):
            audit(a,b,m,r)
    def test_invalid_result_hold(self):
        a,b,m,r=fixture();b["cells"]["U373"]["value"]="T"
        with self.assertRaisesRegex(EvidenceHold,"LOSS_RESULT_NOT_RECALCULATED"):
            audit(a,b,m,r)
    def test_fifth_game_input_hold(self):
        a,b,m,r=fixture();b["cells"]["K374"]["value"]="1"
        with self.assertRaisesRegex(EvidenceHold,"UNPLAYED_FIFTH_GAME_PERIOD_CHANGED"):
            audit(a,b,m,r)
    def test_disposable_copy_structure_missing_pivot_hold(self):
        a,b,m,r=fixture();b["pivotDefinitions"]=2
        with self.assertRaisesRegex(EvidenceHold,"EXCEL_SHEET_TABLE_PIVOT_COUNTS_CHANGED"):
            audit(a,b,m,r)
    def test_source_snapshot_not_approved_hold(self):
        a,b,m,r=fixture();m["review"]["status"]="DRAFT"
        with self.assertRaisesRegex(EvidenceHold,"HTO_WORKBOOK_MANIFEST_NOT_ACCEPTED"):
            audit(a,b,m,r)
    def test_false_full_recalc_claim_hold(self):
        a,b,m,r=fixture();r["workbookFullRecalculationVerified"]=True
        with self.assertRaisesRegex(EvidenceHold,"EXCEL_DISPOSABLE_QA_RECEIPT_NOT_ACCEPTED"):
            audit(a,b,m,r)
    def test_incomplete_numeric_zero_period_hold(self):
        a,b,m,r=fixture();b["cells"]["N370"]["value"]=None
        with self.assertRaisesRegex(EvidenceHold,"CELL_NOT_NUMERIC"):
            audit(a,b,m,r)
    def test_season_game_count_not_four_hold(self):
        a,b,m,r=fixture();b["cells"]["AN37"]["value"]="3"
        with self.assertRaisesRegex(EvidenceHold,"W2026_27_SEASON_GAME_COUNT_NOT_RECALCULATED"):
            audit(a,b,m,r)
    def test_changed_worksheet_member_set_hold(self):
        a,b,m,r=fixture();b["members"].add("xl/worksheets/sheet18.xml")
        with self.assertRaisesRegex(EvidenceHold,"EXCEL_ZIP_COMPONENT_MEMBERS_CHANGED"):
            audit(a,b,m,r)
    def test_existing_period_cell_not_blank_hold(self):
        a,b,m,r=fixture();a["cells"]["K370"]["value"]="0"
        with self.assertRaisesRegex(EvidenceHold,"ORIGINAL_PERIOD_INPUT_NOT_EMPTY"):
            audit(a,b,m,r)

if __name__=="__main__":unittest.main()
