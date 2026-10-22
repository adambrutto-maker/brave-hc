"""Plan 03: source-parity QA of one PRIVATE integrated four-game Excel copy.

Reject any attempt to treat two independently validated fragments as equivalent
to a single integrated workbook. Never write XLSX, original workbook, HTO or
public website. Separate source data and workbook-owner approval are required.
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
    ORIGINAL_SHA, PRIVATE_CALC_SHA, SHEET_GAME_LOGS, SHEET_MASTER_SCHEDULE,
    CORRECTED_GOALIE, PromotionHold, file_sha, numeric, compare_fragments,
    scan_workbook, source_manifest_contract
)

NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REVIEWED_PERIOD_ONLY_SHA="6c125066eff2c4c6f211df8cec4c827676881495d76464c3cb0512abe474a034"
EXACT_PERIOD_ROWS={370:(0,3,-3),371:(3,6,-3),372:(2,3,-1),373:(1,7,-6)}

def merge_acceptance(original,period_only,player_only,combined,proposed,withheld):
    fragments=compare_fragments(original,period_only,player_only,proposed,withheld)
    if fragments.get("combined497CellCandidateVerified") is not False:
        raise PromotionHold("INDEPENDENT_FRAGMENT_REVIEW_ALREADY_CLAIMED_COMPOSITE")
    if combined["tableRefs"]!=player_only["tableRefs"]:
        raise PromotionHold("COMPOSITE_TABLE_RANGES_NOT_RETAINED")
    if combined["legacyManualHashes"]!=original["legacyManualHashes"]:
        raise PromotionHold("HISTORICAL_MANUAL_SOURCE_VALUES_CHANGED")
    if combined["legacyManualCounts"]!=original["legacyManualCounts"]:
        raise PromotionHold("HISTORICAL_MANUAL_VALUE_COUNTS_CHANGED")
    if combined["unexpectedAppendedManualCells"]:
        raise PromotionHold("UNPLANNED_SOURCE_VALUES_IN_EXTENDED_TABLE_ROWS")
    for sheet in (SHEET_GAME_LOGS,SHEET_MASTER_SCHEDULE):
        for ref,want in proposed[sheet].items():
            if original["targetCellValues"][sheet].get(ref) is not None:
                raise PromotionHold("ORIGINAL_SOURCE_ALREADY_POPULATED_"+ref)
            if combined["targetCellValues"][sheet].get(ref)!=want:
                raise PromotionHold("COMBINED_SOURCE_CELL_NOT_VERIFIED_"+ref)
    for ref in withheld:
        if combined["targetCellValues"][SHEET_GAME_LOGS].get(ref) is not None:
            raise PromotionHold("HTO_UNKNOWN_FIELD_ENTERED_AS_VALUE_"+ref)
    for ref,(_,new) in CORRECTED_GOALIE.items():
        if combined["targetCellValues"][SHEET_GAME_LOGS].get(ref)!=("number",numeric(new)):
            raise PromotionHold("COMBINED_PREVIOUS_GOALIE_RECONCILIATION_LOST_"+ref)
    if combined["targetCellValues"][SHEET_GAME_LOGS].get("Y4674") is not None:
        raise PromotionHold("Y4674_WHITESPACE_NOT_BLANK_IN_COMPOSITE")
    # Composite must be exactly the audited player-only source plus the HTO
    # period cells. This is stronger than independently validating both copies.
    if combined["targetCellValues"][SHEET_GAME_LOGS]!=player_only["targetCellValues"][SHEET_GAME_LOGS]:
        raise PromotionHold("COMPOSITE_PLAYER_SOURCE_DEPARTS_FROM_REVIEWED_INPUT")
    if set(proposed[12])!=set(period_only["targetCellValues"][12]):
        raise PromotionHold("PERIOD_SOURCE_FRAGMENT_EXTRA_VALUES")
    if len(proposed[3])!=460 or len(proposed[12])!=32 or len(withheld)!=41:
        raise PromotionHold("497_CHANGE_CONTRACT_NO_LONGER_MATCHED")
    return {
        "schema":"brave-hc-plan03-combined-source-acceptance/v1",
        "status":"497_CELL_COMPOSITE_SOURCE_PARITY_PASS_DISPOSABLE_ONLY",
        "exactHTOPlayerInputCells":460,
        "exactHTOPeriodInputCells":32,
        "exactGoalieBaselineCorrections":4,
        "oneLegacyWhitespaceDispositionAccepted":True,
        "totalExplicitSourceChanges":497,
        "sourceNullCellsKeptBlank":41,
        "historicManualCellsPreserved":True,
        "combinedWorkbookSourceParityVerified":True,
        "originalWorkbookModified":False,
        "combinedFullWorkbookCalculatedAndCertified":False,
        "awardProjectionStreakOutputsCertified":False,
        "originalWorkbookOwnerApproved":False,
        "publicHTOOrWebsitePublished":False,
        "fifthHTOGame3375682Admitted":False,
    }

def snapshot_cached_scores(path):
    result={"scores":{},"unplayed":{}}
    with ZipFile(path) as z:
        if z.testzip() is not None:raise PromotionHold("COMPOSITE_XLSX_INVALID")
        with z.open("xl/worksheets/sheet12.xml") as stream:
            for _,row in ET.iterparse(stream,events=("end",)):
                if row.tag!=NS+"row":continue
                n=int(row.get("r","0"))
                if n not in (370,371,372,373,374):
                    row.clear();continue
                vals={}
                for c in row.findall(NS+"c"):
                    ref=c.get("r","")
                    if ref in {f"{col}{n}" for col in ("O","T","U","W","X")}:
                        v=c.find(NS+"v")
                        vals[ref.rstrip("0123456789")]=None if v is None else v.text
                if n in EXACT_PERIOD_ROWS:result["scores"][n]=vals
                else:result["unplayed"]=vals
                row.clear()
    for n,(gf,ga,gd) in EXACT_PERIOD_ROWS.items():
        a=result["scores"].get(n,{})
        if a.get("O")!=str(gf) or a.get("T")!=str(ga) or a.get("W")!=str(gd) or a.get("U")!="L" or a.get("X")!="1":
            raise PromotionHold("COMPOSITE_CALCULATED_GAME_RESULT_INCORRECT_"+str(n))
    if result["unplayed"].get("X") not in ("0",None):
        raise PromotionHold("UNPLAYED_OCT25_GAME_INCORRECTLY_COUNTED")
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ("original","period_only","player_only","integrated","joined_hto","period_evidence","excel_receipt"):
        parser.add_argument("--"+name.replace("_","-"),required=True,type=Path)
    a=parser.parse_args()
    if file_sha(a.original)!=ORIGINAL_SHA or file_sha(a.player_only)!=PRIVATE_CALC_SHA or file_sha(a.period_only)!=REVIEWED_PERIOD_ONLY_SHA:
        raise PromotionHold("PRIOR_SOURCE_TEST_FINGERPRINT_CHANGED")
    receipt=json.loads(a.excel_receipt.read_text(encoding="utf-8-sig"))
    if (receipt.get("schema")!="brave-hc-private-composite-497-excel-app-receipt/v1"
        or receipt.get("stage")!="COMPOSITE_MASTER_SCHEDULE_PASS_PENDING_INDEPENDENT_497_CELL_QA"
        or receipt.get("saved") is not True
        or receipt.get("periodCellsChanged")!=32):
        raise PromotionHold("EXCEL_COMPOSITE_APP_RECEIPT_NOT_ACCEPTED")
    if file_sha(a.integrated)!=receipt.get("savedCandidateSHA","").lower():
        raise PromotionHold("INTEGRATED_PRIVATE_COPY_HASH_DOES_NOT_MATCH_RECEIPT")
    if receipt.get("originalSHA","").lower()!=ORIGINAL_SHA or receipt.get("untouchedRollbackSHA","").lower()!=PRIVATE_CALC_SHA:
        raise PromotionHold("REVIEWED_SOURCE_OR_ROLLBACK_HASH_MISMATCH")
    join=json.loads(a.joined_hto.read_text(encoding="utf8"))
    period=json.loads(a.period_evidence.read_text(encoding="utf8"))
    proposed,withheld=source_manifest_contract(join,period)
    before=scan_workbook(a.original,proposed,withheld,is_original=True)
    part1=scan_workbook(a.period_only,proposed,withheld,is_original=False)
    part2=scan_workbook(a.player_only,proposed,withheld,is_original=False)
    integrated=scan_workbook(a.integrated,proposed,withheld,is_original=False)
    result=merge_acceptance(before,part1,part2,integrated,proposed,withheld)
    result["verifiedMasterScheduleCaches"]=snapshot_cached_scores(a.integrated)
    result["originalSHA256"]=ORIGINAL_SHA
    result["integratedCandidateSHA256"]=file_sha(a.integrated)
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
