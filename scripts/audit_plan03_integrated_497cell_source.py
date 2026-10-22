"""Plan 03: read-only admission of the 497-cell private composite Excel test.

Reconciles original and two private workbook generations to exact HTO evidence.
A PASS is a SOURCE/FORMULA acceptance for a disposable candidate ONLY; it does
not certify current award logic, missing statistics, or authorize promotion.
"""
from __future__ import annotations
import argparse
from hashlib import sha256
import json
from pathlib import Path

from audit_plan03_exact_promotion_preflight import (
    ORIGINAL_SHA, PRIVATE_CALC_SHA, PromotionHold, CORRECTED_GOALIE,
    SHEET_GAME_LOGS, SHEET_MASTER_SCHEDULE, scan_workbook,
    source_manifest_contract, numeric,
)

COMPOSITE_SHA="9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08"
EXPECTED_ORIGINAL_TABLES={"SkaterStatsByGame":"A2:FB4668",
                          "GoalieStatsByGame":"FD2:JO363"}
EXPECTED_EXTENDED_TABLES={"SkaterStatsByGame":"A2:FB4708",
                          "GoalieStatsByGame":"FD2:JO366"}

def sha(path):
    return sha256(path.read_bytes()).hexdigest()

def admit(original,player_only,combined,proposed,unknown):
    if (original.get("tableRefs")!=EXPECTED_ORIGINAL_TABLES or
        player_only.get("tableRefs")!=EXPECTED_EXTENDED_TABLES or
        combined.get("tableRefs")!=EXPECTED_EXTENDED_TABLES):
        raise PromotionHold("UNAPPROVED_TABLE_RANGE")
    if not isinstance(proposed,dict) or len(proposed.get(3,{}))!=460 or len(proposed.get(12,{}))!=32:
        raise PromotionHold("COMPOSITE_SOURCE_PROPOSAL_NOT_492")
    if len(unknown)!=41 or len(CORRECTED_GOALIE)!=4:
        raise PromotionHold("COMPOSITE_GAP_OR_GOALIE_CORRECTION_COUNT_CHANGED")
    for kind in ("skaters","goalies","masterSchedule"):
        original_hash=original["legacyManualHashes"].get(kind)
        original_count=original["legacyManualCounts"].get(kind)
        if (original_hash is None or original_count is None
            or original_hash!=player_only["legacyManualHashes"].get(kind)
            or original_hash!=combined["legacyManualHashes"].get(kind)
            or original_count!=player_only["legacyManualCounts"].get(kind)
            or original_count!=combined["legacyManualCounts"].get(kind)):
            raise PromotionHold("HISTORICAL_MANUAL_SOURCE_DRIFT_"+kind)
    for obj in (original,player_only,combined):
        if obj.get("unexpectedAppendedManualCells"):
            raise PromotionHold("UNREVIEWED_MANUAL_STAT_IN_NEW_SOURCE_ROW")
    for addr,value in proposed[SHEET_GAME_LOGS].items():
        if original["targetCellValues"][3].get(addr) is not None:
            raise PromotionHold("ORIGINAL_GAME_LOG_ALREADY_CONTAINS_SOURCE_"+addr)
        if (player_only["targetCellValues"][3].get(addr)!=value
            or combined["targetCellValues"][3].get(addr)!=value):
            raise PromotionHold("COMPOSITE_HTO_PLAYER_CELL_DIFFERENT_"+addr)
    for addr in unknown:
        if (original["targetCellValues"][3].get(addr) is not None
            or player_only["targetCellValues"][3].get(addr) is not None
            or combined["targetCellValues"][3].get(addr) is not None):
            raise PromotionHold("SOURCE_UNKNOWN_STAT_FALSE_ZERO_"+addr)
    for addr,value in proposed[SHEET_MASTER_SCHEDULE].items():
        if (original["targetCellValues"][12].get(addr) is not None
            or player_only["targetCellValues"][12].get(addr) is not None):
            raise PromotionHold("ORIGINAL_OR_PLAYER_FRAGMENT_SCORE_NOT_BLANK_"+addr)
        if combined["targetCellValues"][12].get(addr)!=value:
            raise PromotionHold("INTEGRATED_COMPOSITE_HTO_PERIOD_DIFFERENT_"+addr)
    for addr,(old,new) in CORRECTED_GOALIE.items():
        if original["targetCellValues"][3].get(addr)!=("number",numeric(old)):
            raise PromotionHold("ORIGINAL_GOALIE_BASELINE_DRIFT_"+addr)
        for source in (player_only,combined):
            if source["targetCellValues"][3].get(addr)!=("number",numeric(new)):
                raise PromotionHold("GOALIE_REVIEWED_SOURCE_MISSING_"+addr)
    if original["targetCellValues"][3].get("Y4674")!=("text"," "):
        raise PromotionHold("ORIGINAL_WHITESPACE_SOURCE_CHANGED")
    if any(x["targetCellValues"][3].get("Y4674") is not None for x in (player_only,combined)):
        raise PromotionHold("UNKNOWN_SHG_FIELD_NOT_BLANK")
    return {
        "schema":"brave-hc-plan03-497cell-composite-admission/v1",
        "status":"497_CELL_SOURCE_COMPOSITE_ACCEPTED_DISPOSABLE_ONLY",
        "verifiedHTOPlayerGameInputs":460,
        "verifiedOfficialHTOPeriodInputs":32,
        "verifiedGame359GoalieCorrections":4,
        "whitespaceMarkerRemovedAsUnknown":1,
        "totalReviewedSourceChanges":497,
        "unsupportedSourceFieldsKeptBlank":41,
        "newSkaterRows":40,"newGoalieRows":3,
        "historicalManualCellValuesPreserved":True,
        "allCorrectionsInOneWorkbook":True,
        "fullCompositeCalculateFullSourceParityCertified":False,
        "awardForecastStreakAndRecordBookReleaseCertified":False,
        "originalWorkbookModified":False,
        "sourceOwnerApprovalRecorded":False,
        "publicHTOOrWebsiteModified":False,
        "futureGame3375682Admitted":False,
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--original",type=Path,required=True)
    p.add_argument("--player-only",type=Path,required=True)
    p.add_argument("--composite",type=Path,required=True)
    p.add_argument("--private-hto-player-plan",type=Path,required=True)
    p.add_argument("--private-hto-periods",type=Path,required=True)
    args=p.parse_args()
    if sha(args.original)!=ORIGINAL_SHA or sha(args.player_only)!=PRIVATE_CALC_SHA or sha(args.composite)!=COMPOSITE_SHA:
        raise PromotionHold("ORIGINAL_OR_TEST_WORKBOOK_SHA_DRIFT")
    plan=json.loads(args.private_hto_player_plan.read_text(encoding="utf-8"))
    period=json.loads(args.private_hto_periods.read_text(encoding="utf-8"))
    targets,unknown=source_manifest_contract(plan,period)
    before=scan_workbook(args.original,targets,unknown,is_original=True)
    player=scan_workbook(args.player_only,targets,unknown,is_original=False)
    combined=scan_workbook(args.composite,targets,unknown,is_original=False)
    result=admit(before,player,combined,targets,unknown)
    result["originalWorkbookSHA256"]=ORIGINAL_SHA
    result["playerOnlySHA256"]=PRIVATE_CALC_SHA
    result["privateCompositeSHA256"]=COMPOSITE_SHA
    print(json.dumps(result,indent=2))

if __name__=="__main__":main()
