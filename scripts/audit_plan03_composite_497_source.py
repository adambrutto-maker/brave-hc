"""Plan 03: verify a PRIVATE composite contains all 497 source changes together.

Reads immutable original, previous player-only QA copy, combined QA copy and
private, source-verified HTO evidence. No Excel COM, publishing, HTO network,
or XLSX writes. Successful source parity does NOT approve full recalculation
or original source-of-truth promotion.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile
from audit_plan03_exact_promotion_preflight import (
    N,ORIGINAL_SHA,PRIVATE_CALC_SHA,CORRECTED_GOALIE,
    PromotionHold,file_sha,source_manifest_contract,scan_workbook,numeric
)

COMPOSITE_SHA="9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08"
ORIGINAL_TABLES={"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"}
EXPANDED_TABLES={"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"}
PERIOD_ROWS={370:(0,3),371:(3,6),372:(2,3),373:(1,7)}

def source_parity(original,player_only,composite,proposed,unknown):
    """Exact cross-sheet source evidence: no model or business-rule endorsement."""
    if original["tableRefs"]!=ORIGINAL_TABLES:
        raise PromotionHold("IMMUTABLE_ORIGINAL_TABLE_SCHEMA_DRIFT")
    for label,book in (("PLAYER_ONLY",player_only),("COMPOSITE",composite)):
        if book["tableRefs"]!=EXPANDED_TABLES:
            raise PromotionHold(label+"_EXPANDED_TABLE_SCHEMA_DRIFT")
        if original["legacyManualHashes"]!=book["legacyManualHashes"] or original["legacyManualCounts"]!=book["legacyManualCounts"]:
            raise PromotionHold(label+"_PREEXISTING_MANUAL_SOURCE_CHANGED")
        if book["unexpectedAppendedManualCells"]:
            raise PromotionHold(label+"_UNPLANNED_MANUAL_DATA")
    if len(proposed[3])!=460 or len(proposed[12])!=32 or len(unknown)!=41 or len(CORRECTED_GOALIE)!=4:
        raise PromotionHold("EXPECTED_SOURCE_CHANGE_COUNTS_DRIFT")
    for ref,value in proposed[3].items():
        if original["targetCellValues"][3].get(ref) is not None:
            raise PromotionHold("ORIGINAL_PLAYER_INPUT_ALREADY_WRITTEN_"+ref)
        if player_only["targetCellValues"][3].get(ref)!=value:
            raise PromotionHold("PRIOR_PLAYER_SOURCE_EVIDENCE_DRIFT_"+ref)
        if composite["targetCellValues"][3].get(ref)!=value:
            raise PromotionHold("COMPOSITE_PLAYER_SOURCE_EVIDENCE_CONFLICT_"+ref)
    for ref,value in proposed[12].items():
        if original["targetCellValues"][12].get(ref) is not None:
            raise PromotionHold("ORIGINAL_PERIOD_SOURCE_NOT_EMPTY_"+ref)
        if player_only["targetCellValues"][12].get(ref) is not None:
            raise PromotionHold("PREVIOUS_PLAYER_COPY_ALREADY_HAS_PERIOD_"+ref)
        if composite["targetCellValues"][12].get(ref)!=value:
            raise PromotionHold("COMPOSITE_OFFICIAL_PERIOD_MISMATCH_"+ref)
    for ref in unknown:
        if player_only["targetCellValues"][3].get(ref) is not None or composite["targetCellValues"][3].get(ref) is not None:
            raise PromotionHold("SOURCE_UNKNOWN_CONVERTED_TO_ZERO_OR_VALUE_"+ref)
    for ref,(old,new) in CORRECTED_GOALIE.items():
        if original["targetCellValues"][3].get(ref)!=("number",numeric(old)):
            raise PromotionHold("IMMUTABLE_GOALIE_SOURCE_CHANGED_"+ref)
        expected=("number",numeric(new))
        if player_only["targetCellValues"][3].get(ref)!=expected or composite["targetCellValues"][3].get(ref)!=expected:
            raise PromotionHold("COMPOSITE_GOALIE_CORRECTION_MISSING_"+ref)
    if original["targetCellValues"][3].get("Y4674")!=("text"," "):
        raise PromotionHold("ORIGINAL_WHITESPACE_SOURCE_CHANGED")
    if player_only["targetCellValues"][3].get("Y4674") is not None or composite["targetCellValues"][3].get("Y4674") is not None:
        raise PromotionHold("Y4674_MUST_STAY_BLANK_UNKNOWN")
    return {
      "schema":"brave-hc-plan03-combined-497-private-source-parity/v1",
      "status":"COMPOSITE_497_SOURCE_PARITY_PASS_FULL_CALC_PENDING",
      "sourceChanges":497,
      "officialGamePeriodInputCells":32,
      "HTOPlayerGameInputCells":460,
      "reviewedGoalieCorrectionCells":4,
      "whitespaceDispositionCells":1,
      "unknownHTOFieldsStillBlank":len(unknown),
      "historicalManualSourceValuesPreserved":True,
      "combinedCandidateVerified":True,
      "compositeFullWorkbookRecalculated":False,
      "originalWorkbookEdited":False,
      "originalWorkbookPromotionApproved":False,
      "publicStatisticsAwardsRecordsPublished":False,
      "upcomingHTOGame3375682Admitted":False,
    }

def formula_signatures(path):
    """Compare all 17 sheets without trusting caches as certified values."""
    output={}
    with ZipFile(path) as z:
        if z.testzip() is not None:raise PromotionHold("XLSX_ZIP_INTEGRITY_FAILED")
        workbook=ET.fromstring(z.read("xl/workbook.xml"))
        names=[s.get("name") for s in workbook.find(N+"sheets")]
        if len(names)!=17:raise PromotionHold("NOT_SEVENTEEN_SHEETS")
        for index,name in enumerate(names,1):
            fingerprint=hashlib.sha256()
            count=0
            with z.open(f"xl/worksheets/sheet{index}.xml") as stream:
                for _,row in ET.iterparse(stream,events=("end",)):
                    if row.tag!=N+"row":continue
                    for c in row.findall(N+"c"):
                        f=c.find(N+"f")
                        if f is not None:
                            count+=1
                            fingerprint.update(((c.get("r") or "")+"\x1f"+(f.text or "")+"\n").encode("utf-8"))
                    row.clear()
            output[name]={"count":count,"sha256":fingerprint.hexdigest()}
    return output

def score_readback(path):
    row_data={}
    with ZipFile(path) as z:
        with z.open("xl/worksheets/sheet12.xml") as f:
            for _,row in ET.iterparse(f,events=("end",)):
                if row.tag!=N+"row":continue
                rn=int(row.get("r","0"))
                if rn in (*PERIOD_ROWS,374):
                    values={}
                    for c in row.findall(N+"c"):
                        ref=c.get("r") or ""
                        col=re.match("[A-Z]+",ref)
                        if not col or col.group() not in {"B","O","T","U","W","X","K","L","M","N","P","Q","R","S"}:continue
                        v=c.find(N+"v")
                        values[col.group()]=None if v is None else v.text
                    row_data[rn]=values
                row.clear()
    for rn,(goals_for,goals_against) in PERIOD_ROWS.items():
        d=row_data.get(rn,{})
        if (d.get("O")!=str(goals_for) or d.get("T")!=str(goals_against)
            or d.get("U")!="L" or d.get("X")!="1"
            or d.get("W")!=str(goals_for-goals_against)):
            raise PromotionHold("COMPOSITE_MASTER_SCHEDULE_CALC_PARITY_FAILED_"+str(rn))
    d=row_data.get(374,{})
    if d.get("X")!="0" or any(d.get(c) is not None for c in ("K","L","M","N","P","Q","R","S")):
        raise PromotionHold("UNPLAYED_OCT25_SCHEDULE_ROW_ADMITTED")
    return {"completedGames":4,"teamGF":6,"teamGA":19,"record":"0-4",
            "fifthGameAdmitted":False}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--original",required=True,type=Path)
    p.add_argument("--player-only",required=True,type=Path)
    p.add_argument("--composite",required=True,type=Path)
    p.add_argument("--private-joined-hto",required=True,type=Path)
    p.add_argument("--private-period-evidence",required=True,type=Path)
    a=p.parse_args()
    if (file_sha(a.original),file_sha(a.player_only),file_sha(a.composite)) != (ORIGINAL_SHA,PRIVATE_CALC_SHA,COMPOSITE_SHA):
        raise PromotionHold("ORIGINAL_OR_DISPOSABLE_XLSX_SHA_DRIFT")
    joined=json.loads(a.private_joined_hto.read_text(encoding="utf-8"))
    periods=json.loads(a.private_period_evidence.read_text(encoding="utf-8"))
    proposed,unknown=source_manifest_contract(joined,periods)
    before=scan_workbook(a.original,proposed,unknown,is_original=True)
    previous=scan_workbook(a.player_only,proposed,unknown,is_original=False)
    combined=scan_workbook(a.composite,proposed,unknown,is_original=False)
    report=source_parity(before,previous,combined,proposed,unknown)
    sig_before=formula_signatures(a.player_only)
    sig_after=formula_signatures(a.composite)
    if sig_before!=sig_after or sum(x["count"] for x in sig_after.values())!=545506:
        raise PromotionHold("COMPOSITE_FORMULA_DEFINITION_DRIFT")
    report["formulaDefinitionsPreservedAcross17Sheets"]=True
    report["formulaCount"]=545506
    report["teamScoreReadback"]=score_readback(a.composite)
    report["sourceHashes"]={
        "immutableOriginal":ORIGINAL_SHA,
        "priorPlayerOnly":PRIVATE_CALC_SHA,
        "verifiedComposite":COMPOSITE_SHA,
        "HTOPlayerEvidenceSHA256":file_sha(a.private_joined_hto),
        "HTOPeriodEvidenceSHA256":file_sha(a.private_period_evidence),
    }
    print(json.dumps(report,indent=2))

if __name__=="__main__":
    main()
