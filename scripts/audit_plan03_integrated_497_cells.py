"""Plan 03: independently accept only the combined 497-cell private workbook input.

Read-only and offline: original immutable source, previously verified player-
only input branch, and a NEW composite Excel test copy. This verifies Excel
inputs and cached Master Schedule; it does not run full workbook calculation
or authorize owner/source/publication changes.
"""
from __future__ import annotations
import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from audit_plan03_exact_promotion_preflight import (
    CORRECTED_GOALIE, ORIGINAL_SHA, PRIVATE_CALC_SHA,
    PromotionHold, check_legacy_manual_preservation, file_sha, numeric,
    scan_workbook, source_manifest_contract, SHEET_GAME_LOGS,
    SHEET_MASTER_SCHEDULE,
)

NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
COMPOSITE_SHA="9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08"
OLD_TABLES={"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"}
EXPANDED_TABLES={"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"}
GAME_RESULTS={370:(0,3,-3),371:(3,6,-3),372:(2,3,-1),373:(1,7,-6)}
EXPECTED_PERIOD_COLS=("K","L","M","N","P","Q","R","S")

def verify_integrated(original,prior_player,composite,proposed,unknown):
    if (len(proposed[3]),len(proposed[12]),len(unknown),len(CORRECTED_GOALIE))!=(460,32,41,4):
        raise PromotionHold("EXPECTED_497_MANUAL_SOURCE_CONTRACT_CHANGED")
    if original["tableRefs"]!=OLD_TABLES or prior_player["tableRefs"]!=EXPANDED_TABLES or composite["tableRefs"]!=EXPANDED_TABLES:
        raise PromotionHold("SOURCE_TABLE_REFS_CHANGED")
    check_legacy_manual_preservation(original,prior_player)
    check_legacy_manual_preservation(original,composite)
    for ref in proposed[3]:
        expect=proposed[3][ref]
        if original["targetCellValues"][3].get(ref) is not None:
            raise PromotionHold("ORIGINAL_PLAYER_SOURCE_CELL_NOT_EMPTY_"+ref)
        if (prior_player["targetCellValues"][3].get(ref)!=expect
            or composite["targetCellValues"][3].get(ref)!=expect):
            raise PromotionHold("INTEGRATED_HTO_PLAYER_CELL_MISMATCH_"+ref)
    for ref in unknown:
        if (original["targetCellValues"][3].get(ref) is not None
            or prior_player["targetCellValues"][3].get(ref) is not None
            or composite["targetCellValues"][3].get(ref) is not None):
            raise PromotionHold("SOURCE_UNKNOWN_WAS_POPULATED_"+ref)
    for ref,(old,new) in CORRECTED_GOALIE.items():
        oldvalue=("number",numeric(old))
        newvalue=("number",numeric(new))
        if (original["targetCellValues"][3].get(ref)!=oldvalue
            or prior_player["targetCellValues"][3].get(ref)!=newvalue
            or composite["targetCellValues"][3].get(ref)!=newvalue):
            raise PromotionHold("GOALIE_CORRECTION_SOURCE_DRIFT_"+ref)
    if (original["targetCellValues"][3].get("Y4674")!=("text"," ")
        or prior_player["targetCellValues"][3].get("Y4674") is not None
        or composite["targetCellValues"][3].get("Y4674") is not None):
        raise PromotionHold("Y4674_TYPED_WHITESPACE_DISPOSITION_CHANGED")
    for ref,value in proposed[12].items():
        if original["targetCellValues"][12].get(ref) is not None:
            raise PromotionHold("ORIGINAL_PERIOD_SOURCE_ALREADY_PRESENT_"+ref)
        if prior_player["targetCellValues"][12].get(ref) is not None:
            raise PromotionHold("PRIOR_PLAYER_SOURCE_MUST_BE_PERIOD_FREE_"+ref)
        if composite["targetCellValues"][12].get(ref)!=value:
            raise PromotionHold("COMPOSITE_OFFICIAL_PERIOD_INPUT_CONFLICT_"+ref)
    return {
      "schema":"brave-hc-plan03-private-integrated-497-source-review/v1",
      "status":"INTEGRATED_497_INPUT_CELLS_SOURCE_PASS_NOT_PRODUCTION",
      "sourceCorrections":{
          "skaterAndGoalieHTOInputCells":460,
          "periodScoreHTOInputCells":32,
          "fourExistingGoalieSourceCorrections":4,
          "whitespaceToUnknownBlankCell":1,
          "total":497,
          "withheldUnknownCellsStillBlank":41},
      "originalManualSourceValuesPreserved":True,
      "all497CorrectionsVerifiedInSameComposite":True,
      "originalWorkbookModified":False,
      "newCompositeIsPrivate":True,
      "fullCompositeWorkbookRecalculated":False,
      "compositeDependentPivotAndFormulaModelCertified":False,
      "currentAwardsProjectionsStreaksAndLiveWatchCertified":False,
      "sourceOwnerApprovalRecorded":False,
      "sourceOfTruthPromotionAuthorized":False,
      "nativeHTORecordsModified":False,
      "fifthHTOGame3375682Admitted":False,
    }

def read_master_cached_values(path):
    result={}
    with ZipFile(path) as z:
        if z.testzip() is not None:raise PromotionHold("COMPOSITE_EXCEL_ARCHIVE_INTEGRITY_FAILED")
        with z.open("xl/worksheets/sheet12.xml") as fh:
            for _,row in ET.iterparse(fh,events=("end",)):
                if row.tag!=NS+"row":continue
                number=int(row.get("r","0"))
                if number in (37,370,371,372,373,374):
                    found={}
                    for c in row.findall(NS+"c"):
                        ref=c.get("r") or ""
                        col=ref.rstrip("0123456789")
                        if (number==37 and ref!="AN37") or (number!=37 and col not in ("O","T","U","W","X")):
                            continue
                        f=c.find(NS+"f")
                        v=c.find(NS+"v")
                        found[ref]={"hasFormula":f is not None,
                                    "value":None if v is None else v.text,
                                    "cellType":c.get("t")}
                    result[number]=found
                row.clear()
    return result

def verify_master_cache(values):
    for row,(gf,ga,gd) in GAME_RESULTS.items():
        v=values.get(row,{})
        expect={"O":gf,"T":ga,"W":gd,"X":1}
        for col,val in expect.items():
            cell=v.get(f"{col}{row}")
            if not cell or not cell["hasFormula"] or cell["value"]!=str(val):
                raise PromotionHold("COMPOSITE_MASTER_SCHEDULE_FORMULA_CACHE_MISMATCH_"+col+str(row))
        result=v.get(f"U{row}")
        if not result or not result["hasFormula"] or result["value"]!="L":
            raise PromotionHold("COMPOSITE_GAME_RESULT_NOT_LOSS_"+str(row))
    future=values.get(374,{})
    if (not future.get("X374",{}).get("hasFormula")
        or future.get("X374",{}).get("value")!="0"
        or future.get("U374",{}).get("value")!="T"):
        raise PromotionHold("FUTURE_GAME_MISCLASSIFIED_AS_COMPLETED")
    # SeasonInfo AN37 is a derived legacy formula cache. It may depend on
    # broader workbook recalculation; do not certify unless separately tested.
    return {"fourOfficialGamesMasterScheduleVerified":4,
            "verifiedGF":6,"verifiedGA":19,"losses":4,
            "futureGameRow374Unplayed":True,
            "seasonInfoRecalculationCertified":False}

def main():
    a=argparse.ArgumentParser(description=__doc__)
    for field in ("original","player_only","integrated","private_joined_hto","private_period_evidence","excel_receipt"):
        a.add_argument("--"+field.replace("_","-"),required=True,type=Path)
    args=a.parse_args()
    if (file_sha(args.original)!=ORIGINAL_SHA
        or file_sha(args.player_only)!=PRIVATE_CALC_SHA
        or file_sha(args.integrated)!=COMPOSITE_SHA):
        raise PromotionHold("INTEGRATED_SOURCE_FILE_HASH_DRIFT")
    receipt=json.loads(args.excel_receipt.read_text(encoding="utf-8-sig"))
    if (receipt.get("schema")!="brave-hc-private-composite-497-excel-app-receipt/v1"
        or receipt.get("saved") is not True
        or receipt.get("periodCellsChanged")!=32
        or receipt.get("savedCandidateSHA","").lower()!=COMPOSITE_SHA
        or receipt.get("originalWorkbookModified") is not False):
        raise PromotionHold("INTEGRATED_EXCEL_APP_RECEIPT_NOT_ACCEPTED")
    joined=json.loads(args.private_joined_hto.read_text(encoding="utf-8"))
    periods=json.loads(args.private_period_evidence.read_text(encoding="utf-8"))
    proposed,unknown=source_manifest_contract(joined,periods)
    original=scan_workbook(args.original,proposed,unknown,is_original=True)
    prior=scan_workbook(args.player_only,proposed,unknown,is_original=False)
    composite=scan_workbook(args.integrated,proposed,unknown,is_original=False)
    result=verify_integrated(original,prior,composite,proposed,unknown)
    result["masterSchedule"]=verify_master_cache(read_master_cached_values(args.integrated))
    result["originalSHA256"]=ORIGINAL_SHA
    result["playerOnlySHA256"]=PRIVATE_CALC_SHA
    result["integratedCandidateSHA256"]=COMPOSITE_SHA
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
