"""Synthetic final private composite full-calculation acceptance tests."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_full_composite_technical import (
  certify,PromotionHold,COMPOSITE_SHA,FULL_SHA,
)

def fixture():
    source={"status":"COMBINED_497_SOURCE_INPUTS_PASS_DISPOSABLE_ONLY",
      "verifiedTotalIntentionalManualDispositions":497,
      "preservedSourceUnknownCells":41,
      "ownerOriginalWorkbookApproval":False}
    feed={"schema":"brave-hc-hto-verified-game-feed/v1","teamGP":4}
    pivot={"schema":"brave-hc-plan03-pivot-hto-parity/v1",
      "status":"DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED",
      "skaterIdentityCount":20,"goalieIdentityCount":3,
      "skaterBasicSourceParity":True,"goalieBasicSourceParity":True,
      "skaterMismatches":[],"goalieMismatches":[],
      "unknownHTOFields":{"skaterPIM":42,"goaliePOTG":1},
      "publicPlayerStatsReleaseAuthorized":False}
    receipt={"schema":"brave-hc-private-full-calculation-excel-qa/v1",
      "status":"FULL_CALC_DISPOSABLE_SAVED_FOR_INDEPENDENT_QA",
      "candidateSaved":True,"worksheetCount":17,
      "sourceSHA256":COMPOSITE_SHA,"rollbackSHA256":COMPOSITE_SHA,
      "candidateSHA256":FULL_SHA,
      "sourceWorkbookModified":False,
      "externalConnectionsRefreshed":False,"pivotRefreshAllUsed":False}
    refs=[
      {"sheet":"Skater Profile","ref":"I13","error":"#REF!"},
      {"sheet":"Skater Profile","ref":"J13","error":"#REF!"},
    ]
    full={"schema":"brave-hc-plan03-private-full-calc-qa/v1",
      "status":"FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY",
      "issues":[],"totalFormulasBefore":545506,
      "totalFormulasAfter":545506,
      "beforeSHA256":COMPOSITE_SHA,"afterSHA256":FULL_SHA,
      "perSheet":[{"sheet":f"Sheet-{i}","formulaDefinitionsPreserved":True}
                  for i in range(17)],
      "beforeErrors":refs,"afterErrors":copy.deepcopy(refs),
      "newErrorEvents":[],"originalWorkbookModified":False}
    return source,feed,pivot,receipt,full

def run(e=None,**kw):
    return certify(*(e or fixture()),
       source_sha=kw.get("source_sha",COMPOSITE_SHA),
       calculated_sha=kw.get("calculated_sha",FULL_SHA))

class FullCompositeAcceptance(unittest.TestCase):
 def test_exact_source_formula_and_hto_parity_is_private_only(self):
    r=run()
    self.assertEqual(r["status"],"COMBINED_497_FULL_CALC_AND_HTO_PARITY_PASS_PRIVATE_ONLY")
    self.assertTrue(r["singleCompositeAll497SourceCellsVerified"])
    self.assertEqual(r["calculatedSheets"],17)
    self.assertEqual(r["formulaDefinitionsPreserved"],545506)
    self.assertEqual(r["originalUnrepairedProfileRefErrors"],2)
    self.assertFalse(r["currentWebsiteRecordWatchReleased"])
    self.assertFalse(r["ownerOriginalWorkbookApprovalRecorded"])
 def test_source_integrated_count_missing_is_not_release(self):
    a=list(fixture());a[0]["verifiedTotalIntentionalManualDispositions"]=496
    with self.assertRaisesRegex(PromotionHold,"FINAL_COMPOSITE_SOURCE_ACCEPTANCE"):
     run(a)
 def test_change_in_one_original_formula_fails(self):
    a=list(fixture());a[4]["perSheet"][5]["formulaDefinitionsPreserved"]=False
    with self.assertRaisesRegex(PromotionHold,"PRIVATE_COMPOSITE_FORMULA_INTEGRITY"):
     run(a)
 def test_all_17_sheets_must_be_audited(self):
    a=list(fixture());a[4]["perSheet"].pop()
    with self.assertRaisesRegex(PromotionHold,"PRIVATE_COMPOSITE_FORMULA_INTEGRITY"):
     run(a)
 def test_new_cached_value_error_fails(self):
    a=list(fixture());a[4]["newErrorEvents"]=[["Player Stats","Z649","#VALUE!"]]
    with self.assertRaisesRegex(PromotionHold,"PRIVATE_COMPOSITE_FORMULA_INTEGRITY"):
     run(a)
 def test_original_profile_errors_cannot_be_ignored(self):
    a=list(fixture());a[4]["afterErrors"].pop()
    with self.assertRaisesRegex(PromotionHold,"ORIGINAL_BROKEN_PROFILE_FORMULAS"):
     run(a)
 def test_official_goalie_potg_unknown_cannot_be_converted(self):
    a=list(fixture());a[2]["unknownHTOFields"]["goaliePOTG"]=0
    with self.assertRaisesRegex(PromotionHold,"FULL_COMPOSITE_HTO_BASIC_PIVOT"):
     run(a)
 def test_htosupported_skater_stats_mismatch_fails(self):
    a=list(fixture());a[2]["skaterMismatches"]=[{"player":"Test","field":"gp"}]
    with self.assertRaisesRegex(PromotionHold,"FULL_COMPOSITE_HTO_BASIC_PIVOT"):
     run(a)
 def test_no_unapproved_current_fifth_game(self):
    a=list(fixture());a[1]["teamGP"]=5
    with self.assertRaisesRegex(PromotionHold,"HTO_FEED_NOT_FOUR_GAME_BASELINE"):
     run(a)
 def test_full_calc_source_hash_drift_fails(self):
    with self.assertRaisesRegex(PromotionHold,"FULL_COMPOSITE_SOURCE_OUTPUT_HASH_DRIFT"):
     run(calculated_sha="f"*64)
 def test_external_refreshed_connections_cannot_claim_this_isolated_gate(self):
    a=list(fixture());a[3]["externalConnectionsRefreshed"]=True
    with self.assertRaisesRegex(PromotionHold,"PRIVATE_EXCEL_FULL_COMPOSITE_CALC_RECEIPT"):
     run(a)
 def test_missing_saved_calculation_receipt_holds(self):
    a=list(fixture());a[3]["candidateSaved"]=False
    with self.assertRaisesRegex(PromotionHold,"PRIVATE_EXCEL_FULL_COMPOSITE_CALC_RECEIPT"):
     run(a)
 def test_all_pivot_stats_not_releasable_if_public_flag_changes(self):
    a=list(fixture());a[2]["publicPlayerStatsReleaseAuthorized"]=True
    with self.assertRaisesRegex(PromotionHold,"FULL_COMPOSITE_HTO_BASIC_PIVOT"):
     run(a)

if __name__=="__main__":
 unittest.main()
