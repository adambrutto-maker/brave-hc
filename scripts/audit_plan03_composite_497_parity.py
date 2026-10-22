"""Read-only Plan03 source-verified composite workbook QA.

Verifies all 497 reviewed manual source dispositions in ONE PRIVATE composite
workbook; guards 41 HTO-unknown fields, 32 numeric periods, 460 player cells,
4 goalie fixes and Y4674 whitespace-to-blank. No Excel/HTO/Git publishing.
"""
from __future__ import annotations
from pathlib import Path
import argparse,hashlib,json
from audit_plan03_exact_promotion_preflight import (
    PromotionHold, ORIGINAL_SHA, PRIVATE_CALC_SHA, CORRECTED_GOALIE,
    source_manifest_contract,scan_workbook,numeric,file_sha,
    SHEET_GAME_LOGS,SHEET_MASTER_SCHEDULE,check_player_fragment
)
COMPOSITE_SHA="9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08"
ORIGINAL_TABLES={"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"}
EXPANDED_TABLES={"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"}

def future_period_inputs(path):
    """Read real Excel row-374 cells, not the target-only source manifest."""
    from zipfile import ZipFile
    from xml.etree import ElementTree as ET
    from audit_plan03_exact_promotion_preflight import N
    period_columns=("K","L","M","N","P","Q","R","S")
    with ZipFile(path) as z:
        if z.testzip() is not None:raise PromotionHold("FUTURE_ROW_WORKBOOK_CORRUPT")
        root=ET.fromstring(z.read("xl/worksheets/sheet12.xml"))
        rows=[r for r in root.iter(N+"row") if r.get("r")=="374"]
        if len(rows)!=1:raise PromotionHold("UPCOMING_ROW_374_MISSING")
        found={}
        for cell in rows[0].findall(N+"c"):
            address=cell.get("r")
            if address not in {f"{c}374" for c in period_columns}:continue
            f=cell.find(N+"f");v=cell.find(N+"v");inline=cell.find(N+"is")
            if f is not None or v is not None or inline is not None:
                raise PromotionHold("UNPLAYED_FIFTH_GAME_HAS_SOURCE_DATA_"+address)
            found[address]=None
        return {"futureRow":374,"unplayedPeriodCellCount":len(period_columns),
                "futureGameAdmitted":False}


def verify(original,player_only,composite,proposed,unknown):
    if (len(proposed[SHEET_GAME_LOGS]),len(proposed[SHEET_MASTER_SCHEDULE]),
        len(unknown),len(CORRECTED_GOALIE))!=(460,32,41,4):
        raise PromotionHold("COMPOSITE_EXPECTED_REVIEW_COUNTS_CHANGED")
    if original["tableRefs"]!=ORIGINAL_TABLES:
        raise PromotionHold("ORIGINAL_WORKBOOK_TABLE_BOUNDARY_DRIFT")
    if player_only["tableRefs"]!=EXPANDED_TABLES or composite["tableRefs"]!=EXPANDED_TABLES:
        raise PromotionHold("COMPOSITE_STRUCTURED_TABLE_RANGES_CHANGED")
    for kind in ("skaters","goalies"):
        if not (original["legacyManualHashes"][kind]==player_only["legacyManualHashes"][kind]
                ==composite["legacyManualHashes"][kind]):
            raise PromotionHold("HISTORICAL_PLAYER_MANUAL_DATA_CHANGED_"+kind)
        if not (original["legacyManualCounts"][kind]==player_only["legacyManualCounts"][kind]
                ==composite["legacyManualCounts"][kind]):
            raise PromotionHold("HISTORICAL_PLAYER_MANUAL_COUNT_CHANGED_"+kind)
    if not (original["legacyManualHashes"]["masterSchedule"]
            ==player_only["legacyManualHashes"]["masterSchedule"]
            ==composite["legacyManualHashes"]["masterSchedule"]):
        raise PromotionHold("UNPLANNED_MASTER_SCHEDULE_MANUAL_DATA_CHANGED")
    if any(x["unexpectedAppendedManualCells"] for x in (original,player_only,composite)):
        raise PromotionHold("UNAPPROVED_MANUAL_SOURCE_IN_EXTENSION")
    # The previously accepted player-only workbook remains an independently
    # checkable provenance anchor; the composite must preserve every reviewed
    # source value from that branch.
    check_player_fragment(original,player_only,proposed,unknown)
    for ref,expected in proposed[SHEET_GAME_LOGS].items():
        if composite["targetCellValues"][3].get(ref)!=expected:
            raise PromotionHold("COMPOSITE_PLAYER_SOURCE_CHANGED_"+ref)
    for ref in unknown:
        if composite["targetCellValues"][3].get(ref) is not None:
            raise PromotionHold("UNKNOWN_HTO_FIELD_COERCED_TO_ZERO_"+ref)
    for ref,(before,after) in CORRECTED_GOALIE.items():
        if composite["targetCellValues"][3].get(ref)!=("number",numeric(after)):
            raise PromotionHold("COMPOSITE_GOALIE_SOURCE_CORRECTION_NOT_PRESERVED_"+ref)
    if (original["targetCellValues"][3].get("Y4674")!=("text"," ")
        or player_only["targetCellValues"][3].get("Y4674") is not None
        or composite["targetCellValues"][3].get("Y4674") is not None):
        raise PromotionHold("COMPOSITE_WHITESPACE_TO_BLANK_DISPOSITION_CHANGED")
    for ref,expected in proposed[SHEET_MASTER_SCHEDULE].items():
        if original["targetCellValues"][12].get(ref) is not None:
            raise PromotionHold("ORIGINAL_PERIOD_INPUT_NO_LONGER_BLANK_"+ref)
        if player_only["targetCellValues"][12].get(ref) is not None:
            raise PromotionHold("PLAYER_FRAGMENT_ALREADY_HAS_PERIOD_INPUT_"+ref)
        if composite["targetCellValues"][12].get(ref)!=expected:
            raise PromotionHold("COMPOSITE_OFFICIAL_PERIOD_SCORE_MISMATCH_"+ref)
    # Row 374 source inputs are verified from actual XLSX XML separately:
    # scan_workbook's target-only targetCellValues intentionally omits row 374.
    return {
      "schema":"brave-hc-plan03-private-composite-497-source-parity/v1",
      "status":"COMPOSITE_497_SOURCE_CELLS_PASS_FURTHER_MODEL_QA_HELD",
      "sourceChanges":{"newPlayerGameInputs":460,"fourCompletedGamePeriods":32,
        "existingGoalieCorrections":4,"oneWhitespaceCellBlanked":1,
        "totalReviewedCells":497,"unknownHTOFieldsStillBlank":len(unknown)},
      "retainedLegacyManualValues":original["legacyManualCounts"],
      "sameHistoricalManualValues":True,
      "sameReviewedPlayerInputsAsPlayerOnlySource":True,
      "combinedAll497SourceChangesPresent":True,
      "tableExpansionExistingSourcePreserved":True,
      "unplayedOctober25FixtureUnchanged":True,
      "fullCompositeCalculateFullCertified":False,
      "pivotAndPlayerProjectionRecalculatedForComposite":False,
      "awardsAndLiveRecordWatchCertified":False,
      "originalSourceWorkbookModified":False,
      "sourceOfTruthOwnerApprovalRecorded":False,
      "publicHTOOrWebsitePublicationAuthorized":False,
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for arg in ("original","player_only","composite","private_joined_hto","private_period_evidence"):
        p.add_argument("--"+arg.replace("_","-"),type=Path,required=True)
    a=p.parse_args()
    if (file_sha(a.original)!=ORIGINAL_SHA or file_sha(a.player_only)!=PRIVATE_CALC_SHA
        or file_sha(a.composite)!=COMPOSITE_SHA):
        raise PromotionHold("ORIGINAL_PLAYER_OR_COMPOSITE_INPUT_SHA_CHANGED")
    joined=json.loads(a.private_joined_hto.read_text(encoding="utf-8"))
    periods=json.loads(a.private_period_evidence.read_text(encoding="utf-8"))
    proposed,unknown=source_manifest_contract(joined,periods)
    before=scan_workbook(a.original,proposed,unknown,is_original=True)
    player=scan_workbook(a.player_only,proposed,unknown,is_original=False)
    combined=scan_workbook(a.composite,proposed,unknown,is_original=False)
    result=verify(before,player,combined,proposed,unknown)
    future_original=future_period_inputs(a.original)
    future_player=future_period_inputs(a.player_only)
    future_composite=future_period_inputs(a.composite)
    if any(x.get("futureGameAdmitted") for x in (future_original,future_player,future_composite)):
        raise PromotionHold("UNPLAYED_FIFTH_GAME_SOURCE_ADMISSION")
    result["futureFixtureActualXMLReadbacks"]=3
    result["originalSHA256"]=ORIGINAL_SHA
    result["playerOnlySHA256"]=PRIVATE_CALC_SHA
    result["compositeSHA256"]=COMPOSITE_SHA
    result["privateHTOJoinedSHA256"]=file_sha(a.private_joined_hto)
    result["privatePeriodEvidenceSHA256"]=file_sha(a.private_period_evidence)
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
