"""Plan 03 — READ-ONLY source-level acceptance of an isolated 497-cell Excel composite.

Inputs: original immutable workbook; verified private full-calculated player-game
copy; newly combined private Excel candidate; original HTO source manifests.
No network, no Excel COM, no edits, no public release or source promotion.
"""
from __future__ import annotations
import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from audit_plan03_exact_promotion_preflight import (
    ORIGINAL_SHA, PRIVATE_CALC_SHA, CORRECTED_GOALIE,
    PromotionHold, source_manifest_contract, scan_workbook, numeric, file_sha,
)

NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
EXPECTED_COMPOSITE_SHA="9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08"
SOURCE_GOALS={370:(0,3),371:(3,6),372:(2,3),373:(1,7)}
ORIGINAL_ERRORS={
    ("Skater Profile","I13","#REF!"),
    ("Skater Profile","J13","#REF!"),
}

def workbook_formula_receipt(path:Path)->dict:
    """Digest all 17 persisted formula definitions and record cached Excel errors."""
    info={"names":[],"digest":{},"formulaCounts":{},"errors":set(),
          "masterCells":{},"packageMembers":set()}
    with ZipFile(path) as z:
        corrupt=z.testzip()
        if corrupt is not None:raise PromotionHold("COMPOSITE_XLSX_CORRUPTED")
        info["packageMembers"]=set(z.namelist())
        workbook=ET.fromstring(z.read("xl/workbook.xml"))
        info["names"]=[s.get("name") for s in workbook.find(NS+"sheets")]
        if len(info["names"])!=17:raise PromotionHold("SOURCE_SEVENTEEN_SHEET_EXPECTATION_CHANGED")
        for i,name in enumerate(info["names"],1):
            digest=sha256()
            count=0
            with z.open(f"xl/worksheets/sheet{i}.xml") as fh:
                for _,row in ET.iterparse(fh,events=("end",)):
                    if row.tag!=NS+"row":continue
                    num=int(row.get("r","0"))
                    for c in row.findall(NS+"c"):
                        ref=c.get("r") or ""
                        f=c.find(NS+"f")
                        v=c.find(NS+"v")
                        if f is not None:
                            digest.update((ref+"\x1f"+(f.text or "")+"\n").encode("utf8"))
                            count+=1
                        if c.get("t")=="e":
                            info["errors"].add((name,ref,v.text if v is not None else None))
                        if name=="Master Schedule":
                            # Only the four official games and an unplayed upcoming row.
                            if (num in (370,371,372,373,374) and
                                ref.rstrip("0123456789") in ("O","T","U","X")):
                                info["masterCells"][ref]=v.text if v is not None else None
                            if ref=="AN37":
                                info["masterCells"][ref]=v.text if v is not None else None
                    row.clear()
            info["digest"][name]=digest.hexdigest()
            info["formulaCounts"][name]=count
    return info

def verify(original:dict,player:dict,composite:dict,
           plan:dict,withheld:set,
           old_formula:dict,new_formula:dict)->dict:
    if original["tableRefs"]!={"SkaterStatsByGame":"A2:FB4668",
                               "GoalieStatsByGame":"FD2:JO363"}:
        raise PromotionHold("ORIGINAL_TABLE_SOURCE_IDENTITY_CHANGED")
    expected_ref={"SkaterStatsByGame":"A2:FB4708",
                  "GoalieStatsByGame":"FD2:JO366"}
    if player["tableRefs"]!=expected_ref or composite["tableRefs"]!=expected_ref:
        raise PromotionHold("COMPOSITE_EXPANDED_SOURCE_TABLES_CHANGED")
    if (original["legacyManualHashes"]!=composite["legacyManualHashes"] or
        original["legacyManualCounts"]!=composite["legacyManualCounts"]):
        raise PromotionHold("EXISTING_MANUAL_SOURCE_MODIFIED")
    if composite["unexpectedAppendedManualCells"] or player["unexpectedAppendedManualCells"]:
        raise PromotionHold("UNPLANNED_MANUAL_SOURCE_ADDED")
    if player["legacyManualHashes"]!=composite["legacyManualHashes"]:
        raise PromotionHold("PRIVATE_PLAYER_SOURCE_VALUES_CHANGED")
    if len(plan[3])!=460 or len(plan[12])!=32 or len(withheld)!=41:
        raise PromotionHold("EXPECTED_SOURCE_CHANGE_COVERAGE_CHANGED")
    for ref,want in plan[3].items():
        if original["targetCellValues"][3].get(ref) is not None:
            raise PromotionHold("ORIGINAL_GAME_LOG_NOT_EMPTY_"+ref)
        if player["targetCellValues"][3].get(ref)!=want:
            raise PromotionHold("PLAYER_BASELINE_NOT_SOURCED_"+ref)
        if composite["targetCellValues"][3].get(ref)!=want:
            raise PromotionHold("COMPOSITE_HTO_PLAYER_INPUT_MISMATCH_"+ref)
    for ref,want in plan[12].items():
        if original["targetCellValues"][12].get(ref) is not None:
            raise PromotionHold("ORIGINAL_PERIOD_INPUT_NOT_EMPTY_"+ref)
        if player["targetCellValues"][12].get(ref) is not None:
            raise PromotionHold("PLAYER_COPY_WAS_ALREADY_SCORE_INTEGRATED_"+ref)
        if composite["targetCellValues"][12].get(ref)!=want:
            raise PromotionHold("COMPOSITE_PERIOD_SCORE_MISMATCH_"+ref)
    for ref in withheld:
        if (player["targetCellValues"][3].get(ref) is not None or
            composite["targetCellValues"][3].get(ref) is not None):
            raise PromotionHold("UNSUPPORTED_SOURCE_STAT_POPULATED_"+ref)
    for ref,(old,new) in CORRECTED_GOALIE.items():
        if original["targetCellValues"][3].get(ref)!=("number",numeric(old)):
            raise PromotionHold("ORIGINAL_GOALIE_BASELINE_DRIFT_"+ref)
        if player["targetCellValues"][3].get(ref)!=("number",numeric(new)):
            raise PromotionHold("PLAYER_GOALIE_SOURCE_CHANGED_"+ref)
        if composite["targetCellValues"][3].get(ref)!=("number",numeric(new)):
            raise PromotionHold("COMPOSITE_GOALIE_SOURCE_CHANGED_"+ref)
    if original["targetCellValues"][3].get("Y4674")!=("text"," "):
        raise PromotionHold("ORIGINAL_WHITESPACE_SOURCE_CHANGED")
    if (player["targetCellValues"][3].get("Y4674") is not None or
        composite["targetCellValues"][3].get("Y4674") is not None):
        raise PromotionHold("Y4674_MUST_BE_BLANK_NOT_ZERO")
    if old_formula["names"]!=new_formula["names"]:
        raise PromotionHold("COMPOSITE_SHEET_IDENTITY_CHANGED")
    if old_formula["packageMembers"]!=new_formula["packageMembers"]:
        raise PromotionHold("COMPOSITE_EXCEL_PACKAGE_MEMBER_SET_CHANGED")
    if old_formula["formulaCounts"]!=new_formula["formulaCounts"] or old_formula["digest"]!=new_formula["digest"]:
        raise PromotionHold("COMPOSITE_FORMULA_DEFINITIONS_CHANGED")
    if sum(new_formula["formulaCounts"].values())!=545506:
        raise PromotionHold("COMPOSITE_FORMULA_COUNT_CHANGED")
    if old_formula["errors"]!=ORIGINAL_ERRORS:
        raise PromotionHold("PRIOR_PRIVATE_ERROR_BASELINE_CHANGED")
    if new_formula["errors"]!=ORIGINAL_ERRORS:
        raise PromotionHold("NEW_OR_UNRESOLVED_COMPOSITE_EXCEL_ERROR")
    cells=new_formula["masterCells"]
    for row,(gf,ga) in SOURCE_GOALS.items():
        if (cells.get("O"+str(row))!=str(gf) or
            cells.get("T"+str(row))!=str(ga) or
            cells.get("U"+str(row))!="L" or
            cells.get("X"+str(row))!="1"):
            raise PromotionHold("COMPOSITE_COMPLETED_GAME_FORMULA_CACHE_DRIFT_"+str(row))
    if cells.get("X374")!="0":
        raise PromotionHold("FUTURE_OCT25_GAME_COUNTED_IN_COMPOSITE")
    # This is a review-only source gate, NOT a declaration that every
    # downstream award/rate/eligibility formula is supported by the HTO feed.
    return {
        "schema":"brave-hc-plan03-private-497-cell-composite-review/v1",
        "status":"COMPOSITE_497_SOURCE_CELLS_VERIFIED_OWNER_APPROVAL_HELD",
        "reviewedChanges":{"total":497,"HTOPlayerCells":460,"periodScoreInputs":32,
                           "goalieSourceCorrections":4,"whitespaceDisposition":1,
                           "sourceUnknownFieldsBlank":len(withheld)},
        "teamCompletedResults":[{"bookGame":row-11,"row":row,"GF":gf,"GA":ga,"result":"L"}
                                for row,(gf,ga) in SOURCE_GOALS.items()],
        "verifiedFourGameGF":6,"verifiedFourGameGA":19,
        "verifiedFourGameRecord":"0-4",
        "formulaDefinitionsPreserved":True,
        "formulaCount":545506,
        "remainingOriginalSkaterProfileErrors":2,
        "newExcelErrors":0,
        "originalManualSourceDigestsPreserved":True,
        "nextScheduledGameUnplayed":True,
        "combinedSourceInputsAcceptedForDisposableQA":True,
        "compositeFullWorkbookCalculateFullExecuted":False,
        "allPlayerCareerStatsAwardsStreaksCertified":False,
        "originalWorkbookOwnerApprovalRecorded":False,
        "originalWorkbookWritesAuthorized":False,
        "publicHTORecordOrStatsPublicationAuthorized":False,
        "originalWorkbookModified":False,
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--original",required=True,type=Path)
    p.add_argument("--player-only",required=True,type=Path)
    p.add_argument("--composite",required=True,type=Path)
    p.add_argument("--private-joined-hto",required=True,type=Path)
    p.add_argument("--private-period-evidence",required=True,type=Path)
    p.add_argument("--excel-app-receipt",required=True,type=Path)
    a=p.parse_args()
    if (file_sha(a.original)!=ORIGINAL_SHA or
        file_sha(a.player_only)!=PRIVATE_CALC_SHA or
        file_sha(a.composite)!=EXPECTED_COMPOSITE_SHA):
        raise PromotionHold("COMPOSITE_SOURCE_SHA_PRECONDITIONS_FAILED")
    receipt=json.loads(a.excel_app_receipt.read_text(encoding="utf-8-sig"))
    if (receipt.get("schema")!="brave-hc-private-composite-497-excel-app-receipt/v1"
        or receipt.get("stage")!="COMPOSITE_MASTER_SCHEDULE_PASS_PENDING_INDEPENDENT_497_CELL_QA"
        or receipt.get("saved") is not True
        or receipt.get("periodCellsChanged")!=32
        or receipt.get("savedCandidateSHA","").lower()!=EXPECTED_COMPOSITE_SHA
        or receipt.get("originalSHA","").lower()!=ORIGINAL_SHA
        or receipt.get("untouchedRollbackSHA","").lower()!=PRIVATE_CALC_SHA):
        raise PromotionHold("EXCEL_COMPOSITE_APP_RECEIPT_NOT_ACCEPTED")
    joined=json.loads(a.private_joined_hto.read_text(encoding="utf-8"))
    periods=json.loads(a.private_period_evidence.read_text(encoding="utf-8"))
    proposed,unknown=source_manifest_contract(joined,periods)
    original=scan_workbook(a.original,proposed,unknown,is_original=True)
    player=scan_workbook(a.player_only,proposed,unknown,is_original=False)
    composite=scan_workbook(a.composite,proposed,unknown,is_original=False)
    first=workbook_formula_receipt(a.player_only)
    last=workbook_formula_receipt(a.composite)
    result=verify(original,player,composite,proposed,unknown,first,last)
    result.update({"originalSHA256":ORIGINAL_SHA,
                   "playerOnlySHA256":PRIVATE_CALC_SHA,
                   "compositeSHA256":EXPECTED_COMPOSITE_SHA,
                   "privateHTOJoinSHA256":file_sha(a.private_joined_hto),
                   "privatePeriodSHA256":file_sha(a.private_period_evidence),
                   "originalHistoricalManualInputsChecked":original["legacyManualCounts"]})
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
