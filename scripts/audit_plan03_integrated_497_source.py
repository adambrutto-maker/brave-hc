"""Read-only acceptance for a SINGLE PRIVATE integrated 497-cell HockeyOS workbook.

Inputs: immutable original, private source-preserving Excel composite, private
HTO period/player manifests and Excel Save receipt. All source cell comparison
is typed, treats HTO numeric zero as a real input, keeps missing fields blank.
No Excel, HTO, Git publisher or original workbook modifications are performed.
"""
from __future__ import annotations
from pathlib import Path
import argparse
import hashlib
import json
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from audit_plan03_exact_promotion_preflight import (
    source_manifest_contract,scan_workbook,CORRECTED_GOALIE,
    SOURCE_ROWS,ORIGINAL_SHA,PromotionHold,numeric,
)

NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
COMPOSITE_SHA="9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08"
TARGET_TABLES={"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"}
ORIGINAL_TABLES={"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"}
EXPECTED_TOTALS={370:(0,3,-3,"L",1),371:(3,6,-3,"L",1),
                 372:(2,3,-1,"L",1),373:(1,7,-6,"L",1)}

def accept(original,composite,source_cells,unknown,*,observed_games=None):
    if original["tableRefs"]!=ORIGINAL_TABLES or composite["tableRefs"]!=TARGET_TABLES:
        raise PromotionHold("ORIGINAL_AND_COMPOSITE_TABLE_STRUCTURE_INCORRECT")
    if (original["legacyManualHashes"]!=composite["legacyManualHashes"]
        or original["legacyManualCounts"]!=composite["legacyManualCounts"]):
        raise PromotionHold("PREEXISTING_HISTORICAL_MANUAL_INPUT_CHANGED")
    if original["unexpectedAppendedManualCells"] or composite["unexpectedAppendedManualCells"]:
        raise PromotionHold("COMPOSITE_CONTAINS_UNAUTHORIZED_NEW_PLAYER_SOURCE")
    if len(source_cells.get(3,{}))!=460 or len(source_cells.get(12,{}))!=32 or len(unknown)!=41:
        raise PromotionHold("REVIEWED_SOURCE_497_CELL_CONTRACT_CHANGED")
    for sheet,data in source_cells.items():
        for ref,expected in data.items():
            if original["targetCellValues"][sheet].get(ref) is not None:
                raise PromotionHold("ORIGINAL_SOURCE_INPUT_NOT_EMPTY_"+ref)
            if composite["targetCellValues"][sheet].get(ref)!=expected:
                raise PromotionHold("COMPOSITE_HTO_SOURCE_INPUT_MISMATCH_"+ref)
    for ref in unknown:
        if composite["targetCellValues"][3].get(ref) is not None:
            raise PromotionHold("COMPOSITE_UNKNOWN_HTO_FIELD_FILLED_"+ref)
    for ref,(prior,verified) in CORRECTED_GOALIE.items():
        if original["targetCellValues"][3].get(ref)!=("number",numeric(prior)):
            raise PromotionHold("ORIGINAL_GOALIE_BASELINE_DRIFT_"+ref)
        if composite["targetCellValues"][3].get(ref)!=("number",numeric(verified)):
            raise PromotionHold("COMPOSITE_GOALIE_SOURCE_CORRECTION_DRIFT_"+ref)
    if original["targetCellValues"][3].get("Y4674")!=("text"," "):
        raise PromotionHold("SOURCE_Y4674_SHARED_STRING_BASELINE_CHANGED")
    if composite["targetCellValues"][3].get("Y4674") is not None:
        raise PromotionHold("COMPOSITE_Y4674_NOT_BLANK_UNKNOWN")
    if observed_games is None or observed_games!=EXPECTED_TOTALS:
        raise PromotionHold("COMPOSITE_TEAM_GAME_SCORE_OR_COUNT_CONFLICT")
    return {
      "schema":"brave-hc-plan03-combined-497-source-audit/v1",
      "status":"COMBINED_497_SOURCE_INPUTS_PASS_DISPOSABLE_ONLY",
      "verifiedPlayerGameCells":460,
      "verifiedPeriodScoringCells":32,
      "verifiedOriginalGoalieCorrections":4,
      "verifiedWhitespaceToUnknownBlankCells":1,
      "verifiedTotalIntentionalManualDispositions":497,
      "preservedSourceUnknownCells":41,
      "allPreviousLegacyManualInputsPreserved":True,
      "fourOfficialTeamScoresCachedCorrectly":True,
      "combinedWorkbookActuallyTested":True,
      "all17SheetFormulaBusinessRulesCertified":False,
      "officialAwardsForecastsAndLiveWatchCertified":False,
      "originalSourceWorkbookEdited":False,
      "ownerOriginalWorkbookApproval":False,
      "publicPublishingAuthorized":False,
      "futureHTOGame3375682Admitted":False,
    }

def read_master_schedule_caches(private:Path):
    with ZipFile(private) as z:
        if z.testzip() is not None:raise PromotionHold("COMPOSITE_WORKBOOK_ZIP_CORRUPT")
        expected_rows={370,371,372,373,374}
        fields={"O","T","W","U","X"}
        found={}
        with z.open("xl/worksheets/sheet12.xml") as fh:
            for _,row in ET.iterparse(fh,events=("end",)):
                if row.tag!=NS+"row":continue
                n=int(row.get("r","0"))
                if n not in expected_rows:row.clear();continue
                d={}
                for c in row.findall(NS+"c"):
                    ref=c.get("r") or ""
                    col=ref.rstrip("0123456789")
                    v=c.find(NS+"v")
                    if col in fields and v is not None:
                        value=v.text
                        if col!="U":
                            value=int(numeric(value))
                        d[col]=value
                    if n==374 and col in {"K","L","M","N","P","Q","R","S"} and v is not None:
                        raise PromotionHold("FUTURE_GAME_PERIOD_VALUE_ALREADY_PRESENT")
                if n in (370,371,372,373):
                    if set(d)!=fields:raise PromotionHold("COMPOSITE_OFFICIAL_GAME_CACHE_INCOMPLETE")
                    found[n]=(d["O"],d["T"],d["W"],d["U"],d["X"])
                else:
                    if d.get("X")!=0 or d.get("O")!=0 or d.get("T")!=0:
                        raise PromotionHold("PREVIEW_FIFTH_GAME_SHOULD_BE_UNCOUNTED")
                row.clear()
        if set(found)!={370,371,372,373}:
            raise PromotionHold("COMPOSITE_GAME_CACHE_ROW_COUNT_WRONG")
        return found

def check_source_receipt(path:Path,expected_source_sha,expected_composite_sha):
    payload=json.loads(path.read_text(encoding="utf-8-sig"))
    if (payload.get("schema")!="brave-hc-private-composite-497-excel-app-receipt/v1"
        or payload.get("stage")!="COMPOSITE_MASTER_SCHEDULE_PASS_PENDING_INDEPENDENT_497_CELL_QA"
        or payload.get("saved") is not True
        or payload.get("periodCellsChanged")!=32
        or str(payload.get("originalSHA","")).lower()!=expected_source_sha
        or str(payload.get("savedCandidateSHA","")).lower()!=expected_composite_sha
        or str(payload.get("untouchedRollbackSHA","")).lower()!="de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b"
        or payload.get("originalWorkbookModified") is not False
        or payload.get("candidateFullWorkbookRecalculationCertified") is not False):
        raise PromotionHold("EXCEL_COMPOSITE_APP_RECEIPT_MISSING_OR_CHANGED")

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ("original","private_composite","private_joined_hto",
                 "private_period_evidence","excel_receipt"):
        p.add_argument("--"+name.replace("_","-"),required=True,type=Path)
    args=p.parse_args()
    original_sha=hashlib.sha256(args.original.read_bytes()).hexdigest()
    composite_sha=hashlib.sha256(args.private_composite.read_bytes()).hexdigest()
    if original_sha!=ORIGINAL_SHA or composite_sha!=COMPOSITE_SHA:
        raise PromotionHold("ORIGINAL_OR_INTEGRATED_COMPOSITE_SHA_DRIFT")
    check_source_receipt(args.excel_receipt,original_sha,composite_sha)
    player_source=json.loads(args.private_joined_hto.read_text(encoding="utf8"))
    period_source=json.loads(args.private_period_evidence.read_text(encoding="utf8"))
    plan,unknown=source_manifest_contract(player_source,period_source)
    before=scan_workbook(args.original,plan,unknown,is_original=True)
    after=scan_workbook(args.private_composite,plan,unknown,is_original=False)
    game_results=read_master_schedule_caches(args.private_composite)
    result=accept(before,after,plan,unknown,observed_games=game_results)
    result["originalWorkbookSHA256"]=original_sha
    result["integratedPrivateSHA256"]=composite_sha
    result["privateJoinedSourceSHA256"]=hashlib.sha256(args.private_joined_hto.read_bytes()).hexdigest()
    result["privatePeriodSourceSHA256"]=hashlib.sha256(args.private_period_evidence.read_bytes()).hexdigest()
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
