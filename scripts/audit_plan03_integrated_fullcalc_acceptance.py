"""Read-only source and calculation acceptance for the private integrated 497-cell copy.

Requires independently saved Excel and ZIP/XML receipts, validated official
four-game HTO feed, and exact source hashes. This never opens Excel for editing,
changes the native HTO site, or authorizes public awards/Watch.
"""
from __future__ import annotations
import argparse
from hashlib import sha256
import json
from pathlib import Path

from audit_plan03_exact_promotion_preflight import (
    ORIGINAL_SHA, PRIVATE_CALC_SHA, PromotionHold, scan_workbook,
    source_manifest_contract,
)
from audit_plan03_integrated_497_cells import (
    COMPOSITE_SHA, verify_integrated, read_master_cached_values,
    verify_master_cache,
)
from audit_plan03_hto_season_pivot_parity import (
    parse_pivots, reconcile as verify_hto_season_pivots,
)

FINAL_SHA="231c1e91cdb833f23b4d49a10f3a3050c941205651ca7e9556c0badd029643e9"
ORIGINAL_ERRORS={("Skater Profile","I13","#REF!"),
                 ("Skater Profile","J13","#REF!")}

def file_sha(path):
    return sha256(path.read_bytes()).hexdigest()

def verify_calculation_evidence(app,independent):
    if (app.get("schema")!="brave-hc-private-full-calculation-excel-qa/v1"
        or app.get("status")!="FULL_CALC_DISPOSABLE_SAVED_FOR_INDEPENDENT_QA"
        or app.get("candidateSaved") is not True
        or app.get("worksheetCount")!=17
        or str(app.get("sourceSHA256","")).lower()!=COMPOSITE_SHA
        or str(app.get("rollbackSHA256","")).lower()!=COMPOSITE_SHA
        or str(app.get("candidateSHA256","")).lower()!=FINAL_SHA
        or app.get("sourceWorkbookModified") is not False):
        raise PromotionHold("FULL_COMPOSITE_EXCEL_APP_RECEIPT_NOT_ACCEPTED")
    if (independent.get("schema")!="brave-hc-plan03-private-full-calc-qa/v1"
        or independent.get("status")!="FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY"
        or independent.get("issues")!=[]
        or independent.get("newErrorEvents")!=[]
        or independent.get("totalFormulasBefore")!=545506
        or independent.get("totalFormulasAfter")!=545506
        or independent.get("beforeSHA256")!=COMPOSITE_SHA
        or independent.get("afterSHA256")!=FINAL_SHA
        or independent.get("originalWorkbookModified") is not False):
        raise PromotionHold("FULL_COMPOSITE_INDEPENDENT_17_SHEET_QA_NOT_ACCEPTED")
    def normalized(errors):
        if not isinstance(errors,list):
            raise PromotionHold("FULL_COMPOSITE_ERROR_EVIDENCE_INCOMPLETE")
        return {(e.get("sheet"),e.get("ref"),e.get("error"))
                for e in errors if isinstance(e,dict)}
    if normalized(independent.get("beforeErrors"))!=ORIGINAL_ERRORS or normalized(independent.get("afterErrors"))!=ORIGINAL_ERRORS:
        raise PromotionHold("FULL_COMPOSITE_ORIGINAL_PROFILE_REF_ERROR_SCOPE_CHANGED")
    sheets=independent.get("perSheet")
    if (not isinstance(sheets,list) or len(sheets)!=17
        or any(entry.get("formulaDefinitionsPreserved") is not True for entry in sheets)
        or sum(entry.get("formulasAfter",0) for entry in sheets)!=545506):
        raise PromotionHold("FULL_COMPOSITE_17_SHEET_FORMULA_INTEGRITY_CHANGED")
    return {"all17SheetFormulaDefinitionsPreserved":True,
            "totalFormulas":545506,
            "newExcelFormulaErrors":0,
            "originalSkaterProfileREFerrorsRemain":2,
            "fullExcelRecalculationExecuted":True,
            "all17SheetBusinessRulesCertified":False}

def verify_full_integration(original,player_only,composite,fullcalculated,
                            proposed,unknown,app,independent,feed):
    first=verify_integrated(original,player_only,composite,proposed,unknown)
    second=verify_integrated(original,player_only,fullcalculated,proposed,unknown)
    if first["sourceCorrections"]!=second["sourceCorrections"]:
        raise PromotionHold("COMPOSITE_SOURCE_CHANGE_SET_NOT_PRESERVED_AFTER_CALCULATEFULL")
    calc=verify_calculation_evidence(app,independent)
    return {"schema":"brave-hc-plan03-private-497-composite-fullcalc-acceptance/v1",
            "status":"COMBINED_497_HTO_BASIC_STATS_AND_FORMULAS_PASS_OWNER_RELEASE_HELD",
            "source":second["sourceCorrections"],
            "beforeCalcSourceAccepted":first["all497CorrectionsVerifiedInSameComposite"],
            "afterCalcSourceAccepted":second["all497CorrectionsVerifiedInSameComposite"],
            "calculation":calc,
            "originalManualSourceValuesPreserved":True,
            "sourceOfTruthWorkbookModified":False,
            "sourceOwnerApprovalRecorded":False,
            "allPIMAndGoaliePOTGSourceComplete":False,
            "profileRecordFormulaDefinitionsResolved":False,
            "currentAwardsProjectionsAndLiveRecordWatchApproved":False,
            "fifthHTOGame3375682Admitted":False}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for item in ("original","player_only","integrated_before","integrated_full",
                 "private_joined_hto","private_period_evidence","verified_hto_feed",
                 "excel_fullcalc_receipt","independent_fullcalc_audit"):
        p.add_argument("--"+item.replace("_","-"),type=Path,required=True)
    a=p.parse_args()
    fingerprints={key:file_sha(getattr(a,key)) for key in
        ("original","player_only","integrated_before","integrated_full")}
    if fingerprints!={"original":ORIGINAL_SHA,"player_only":PRIVATE_CALC_SHA,
                      "integrated_before":COMPOSITE_SHA,"integrated_full":FINAL_SHA}:
        raise PromotionHold("INTEGRATED_COMPOSITE_FULL_SOURCE_SHA_DRIFT")
    joined=json.loads(a.private_joined_hto.read_text(encoding="utf-8"))
    periods=json.loads(a.private_period_evidence.read_text(encoding="utf-8"))
    feed=json.loads(a.verified_hto_feed.read_text(encoding="utf-8"))
    app=json.loads(a.excel_fullcalc_receipt.read_text(encoding="utf-8-sig"))
    report=json.loads(a.independent_fullcalc_audit.read_text(encoding="utf-8-sig"))
    proposed,unknown=source_manifest_contract(joined,periods)
    original=scan_workbook(a.original,proposed,unknown,is_original=True)
    prior=scan_workbook(a.player_only,proposed,unknown,is_original=False)
    before=scan_workbook(a.integrated_before,proposed,unknown,is_original=False)
    after=scan_workbook(a.integrated_full,proposed,unknown,is_original=False)
    result=verify_full_integration(original,prior,before,after,proposed,unknown,app,report,feed)
    first=verify_master_cache(read_master_cached_values(a.integrated_before))
    second=verify_master_cache(read_master_cached_values(a.integrated_full))
    if first!=second:
        raise PromotionHold("FULLCALC_CHANGED_VALIDATED_MASTER_GAME_RESULTS")
    basic=verify_hto_season_pivots(feed,*parse_pivots(a.integrated_full))
    if (basic.get("status")!="DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED"
        or basic.get("skaterIdentityCount")!=20 or basic.get("goalieIdentityCount")!=3
        or basic.get("unknownHTOFields")!={"skaterPIM":42,"goaliePOTG":1}):
        raise PromotionHold("FULL_COMPOSITE_HTO_PIVOT_NOT_VERIFIED")
    result["verifiedTeamResults"]=second
    result["skaterSourceParity"]=basic["skaterBasicSourceParity"]
    result["goalieSourceParity"]=basic["goalieBasicSourceParity"]
    result["currentSourceGaps"]=basic["unknownHTOFields"]
    result["originalWorkbookSHA256"]=ORIGINAL_SHA
    result["fullyCalculatedPrivateCandidateSHA256"]=FINAL_SHA
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
