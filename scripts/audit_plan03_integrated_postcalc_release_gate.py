"""Read-only owner-gated QA of Plan 03's fully calculated integrated HTO workbook.

Requires independent original, player-only, composite-source and post-CalculateFull
private XLSX receipts. Official HTO game feed validates *supported* skater and
goalie fields only. Never opens Excel COM, writes a workbook, publishes records,
or interprets missing PIM/POTG/GTG as measured zeros.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

from audit_plan03_exact_promotion_preflight import (
    ORIGINAL_SHA, PRIVATE_CALC_SHA, scan_workbook, source_manifest_contract, PromotionHold
)
from audit_plan03_composite_497_cell_readback import (
    verify as verify_cells, workbook_formula_receipt,
    EXPECTED_COMPOSITE_SHA,
)
from audit_plan03_hto_season_pivot_parity import (
    parse_pivots, reconcile as reconcile_hto, ParityHold
)

COMBINED_CALCULATED_SHA="231c1e91cdb833f23b4d49a10f3a3050c941205651ca7e9556c0badd029643e9"
STAGE="FULL_CALC_DISPOSABLE_SAVED_FOR_INDEPENDENT_QA"
ERROR_AUDIT="FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY"
SOURCE_AUDIT="COMPOSITE_497_SOURCE_CELLS_VERIFIED_OWNER_APPROVAL_HELD"
HTO_AUDIT="DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED"

class IntegratedHold(ValueError):
    pass

def validate_evidence(source_result, app_receipt, error_audit, hto_result,
                      *, original_sha=ORIGINAL_SHA, output_sha=COMBINED_CALCULATED_SHA):
    if source_result.get("status")!=SOURCE_AUDIT:
        raise IntegratedHold("COMBINED_SOURCE_497_CELL_PARITY_NOT_ACCEPTED")
    values=source_result.get("reviewedChanges",{})
    if values!={"total":497,"HTOPlayerCells":460,"periodScoreInputs":32,
                "goalieSourceCorrections":4,"whitespaceDisposition":1,
                "sourceUnknownFieldsBlank":41}:
        raise IntegratedHold("HTO_SOURCE_CHANGE_SET_CHANGED")
    if (source_result.get("formulaCount")!=545506
        or source_result.get("formulaDefinitionsPreserved") is not True
        or source_result.get("newExcelErrors")!=0
        or source_result.get("verifiedFourGameGF")!=6
        or source_result.get("verifiedFourGameGA")!=19
        or source_result.get("verifiedFourGameRecord")!="0-4"
        or source_result.get("nextScheduledGameUnplayed") is not True
        or source_result.get("originalWorkbookModified") is not False):
        raise IntegratedHold("COMBINED_CALCULATED_SOURCE_CONTRACT_CHANGED")
    if original_sha!=ORIGINAL_SHA or output_sha!=COMBINED_CALCULATED_SHA:
        raise IntegratedHold("ORIGINAL_OR_COMPOSITE_POSTCALC_HASH_DRIFT")
    if (app_receipt.get("schema")!="brave-hc-private-full-calculation-excel-qa/v1"
        or app_receipt.get("status")!=STAGE
        or app_receipt.get("candidateSaved") is not True
        or app_receipt.get("worksheetCount")!=17
        or app_receipt.get("sourceSHA256","").lower()!=EXPECTED_COMPOSITE_SHA
        or app_receipt.get("rollbackSHA256","").lower()!=EXPECTED_COMPOSITE_SHA
        or app_receipt.get("candidateSHA256","").lower()!=COMBINED_CALCULATED_SHA
        or app_receipt.get("sourceWorkbookModified") is not False
        or app_receipt.get("externalConnectionsRefreshed") is not False
        or app_receipt.get("pivotRefreshAllUsed") is not False):
        raise IntegratedHold("FULL_CALC_EXCEL_APPLICATION_EVIDENCE_NOT_ADMITTED")
    if (error_audit.get("schema")!="brave-hc-plan03-private-full-calc-qa/v1"
        or error_audit.get("status")!=ERROR_AUDIT
        or error_audit.get("issues")!=[]
        or error_audit.get("sourceSHA256")!=ORIGINAL_SHA
        or error_audit.get("beforeSHA256")!=EXPECTED_COMPOSITE_SHA
        or error_audit.get("afterSHA256")!=COMBINED_CALCULATED_SHA
        or error_audit.get("totalFormulasBefore")!=545506
        or error_audit.get("totalFormulasAfter")!=545506
        or error_audit.get("newErrorEvents")!=[]
        or error_audit.get("originalWorkbookModified") is not False):
        raise IntegratedHold("INDEPENDENT_FULL_CALC_ERROR_AUDIT_NOT_ADMITTED")
    # Original Skater Profile source defects remain explicitly unresolved.
    expected_error_refs={("Skater Profile","I13","#REF!"),
                         ("Skater Profile","J13","#REF!")}
    def error_refs(field):
        return {(e.get("sheet"),e.get("ref"),e.get("error")) for e in error_audit.get(field,[])}
    if error_refs("beforeErrors")!=expected_error_refs or error_refs("afterErrors")!=expected_error_refs:
        raise IntegratedHold("HISTORICAL_PROFILE_REF_ERROR_SCOPE_CHANGED")
    if (hto_result.get("schema")!="brave-hc-plan03-pivot-hto-parity/v1"
        or hto_result.get("status")!=HTO_AUDIT
        or hto_result.get("officialGames")!=4
        or hto_result.get("skaterBasicSourceParity") is not True
        or hto_result.get("goalieBasicSourceParity") is not True
        or hto_result.get("skaterIdentityCount")!=20
        or hto_result.get("goalieIdentityCount")!=3
        or hto_result.get("unknownHTOFields")!={"skaterPIM":42,"goaliePOTG":1}
        or hto_result.get("goaliePOTGComplete") is not False
        or hto_result.get("publicPlayerStatsReleaseAuthorized") is not False
        or hto_result.get("fifthHTOGameAdmitted") is not False):
        raise IntegratedHold("HTO_SKATER_GOALIE_PIVOT_EVIDENCE_INCOMPLETE_OR_DRIFT")
    return {
        "schema":"brave-hc-plan03-private-integrated-post-fullcalc-review/v1",
        "status":"COMBINED_497_SOURCE_CALCFULL_BASIC_HTO_PARITY_PASS_RELEASE_HELD",
        "verifiedHTOPlayerInputCells":460,
        "verifiedOfficialPeriodInputCells":32,
        "reviewedOriginalGoalieCorrections":4,
        "reviewedWhitespaceSourceDisposition":1,
        "officialUnknownInputCellsStillBlank":41,
        "official2026Games":4,
        "officialFourGameResults":"0-4",
        "officialGF":6,"officialGA":19,
        "sourceVerifiedSkaterSeasonNames":20,
        "sourceVerifiedGoalieSeasonNames":3,
        "all17SheetFormulaDefinitionsPreserved":True,
        "formulaCount":545506,
        "newExcelErrorCount":0,
        "historicalSkaterProfileREFErrors":2,
        "unknownSkaterPIMObservations":42,
        "unknownGoaliePOTGObservations":1,
        "sourceInputCompositeAccepted":True,
        "compositeCalculateFullCompleted":True,
        "supportedSeasonPivotDataAcceptedForPrivateQA":True,
        "fullCareerStatisticsCertified":False,
        "playerForecastsCertified":False,
        "awardRankingsCertified":False,
        "liveRecordWatchCertified":False,
        "sourceOfTruthOwnerApprovalRecorded":False,
        "originalWorkbookEdited":False,
        "HTOAdminOrPublicSiteChanged":False,
        "fifthGame3375682Admitted":False,
    }

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ("original","player_only","full_calc_composite","private_joined_hto",
                 "private_period_evidence","verified_hto_feed","excel_app_receipt","independent_error_audit"):
        p.add_argument("--"+name.replace("_","-"),type=Path,required=True)
    a=p.parse_args()
    if (sha(a.original)!=ORIGINAL_SHA or sha(a.player_only)!=PRIVATE_CALC_SHA
        or sha(a.full_calc_composite)!=COMBINED_CALCULATED_SHA):
        raise IntegratedHold("FULL_COMPOSITE_SOURCE_FINGERPRINT_DRIFT")
    joined=json.loads(a.private_joined_hto.read_text(encoding="utf-8"))
    periods=json.loads(a.private_period_evidence.read_text(encoding="utf-8"))
    proposals,unknown=source_manifest_contract(joined,periods)
    old=scan_workbook(a.original,proposals,unknown,is_original=True)
    player=scan_workbook(a.player_only,proposals,unknown,is_original=False)
    composite=scan_workbook(a.full_calc_composite,proposals,unknown,is_original=False)
    before=workbook_formula_receipt(a.player_only)
    after=workbook_formula_receipt(a.full_calc_composite)
    source_result=verify_cells(old,player,composite,proposals,unknown,before,after)
    feed=json.loads(a.verified_hto_feed.read_text(encoding="utf-8"))
    sk,go=parse_pivots(a.full_calc_composite)
    hto_result=reconcile_hto(feed,sk,go)
    receipt=json.loads(a.excel_app_receipt.read_text(encoding="utf-8-sig"))
    qa=json.loads(a.independent_error_audit.read_text(encoding="utf-8"))
    result=validate_evidence(source_result,receipt,qa,hto_result,
                             original_sha=sha(a.original),output_sha=sha(a.full_calc_composite))
    result["originalSHA256"]=ORIGINAL_SHA
    result["fullCalculatedCompositeSHA256"]=COMBINED_CALCULATED_SHA
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
