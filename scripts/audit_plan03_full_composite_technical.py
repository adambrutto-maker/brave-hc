"""HockeyOS Plan03: read-only full-calculated COMPOSITE technical acceptance.

Requires a single, source-integrated 497-cell private XLSX, its separate
full-calc private XLSX, original immutable source, official four-game HTO
feed and saved receipt/error QA. No Excel COM, network, modifications or public
stat promotion. Unsupported awards, projections and current live Watch remain
explicitly release-held.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

from audit_plan03_integrated_497_source import (
    accept,read_master_schedule_caches,check_source_receipt,
    COMPOSITE_SHA,ORIGINAL_SHA,PromotionHold,
)
from audit_plan03_exact_promotion_preflight import source_manifest_contract,scan_workbook
from audit_plan03_hto_season_pivot_parity import source_totals,parse_pivots,reconcile

FULL_SHA="de9bc6ed615a7c330809a0b2f8888f42c357d641f2a2266e0fca20914521f979"
REF_ERRORS={("Skater Profile","I13","#REF!"),("Skater Profile","J13","#REF!")}

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def certify(source_accept,hta,pivot,excel_receipt,formula_audit,*,source_sha,calculated_sha):
    if (source_accept.get("status")!="COMBINED_497_SOURCE_INPUTS_PASS_DISPOSABLE_ONLY"
        or source_accept.get("verifiedTotalIntentionalManualDispositions")!=497
        or source_accept.get("preservedSourceUnknownCells")!=41
        or source_accept.get("ownerOriginalWorkbookApproval") is not False):
        raise PromotionHold("FINAL_COMPOSITE_SOURCE_ACCEPTANCE_MISSING")
    if source_sha!=COMPOSITE_SHA or calculated_sha!=FULL_SHA:
        raise PromotionHold("FULL_COMPOSITE_SOURCE_OUTPUT_HASH_DRIFT")
    if (excel_receipt.get("schema")!="brave-hc-private-full-calculation-excel-qa/v1"
        or excel_receipt.get("status")!="FULL_CALC_DISPOSABLE_SAVED_FOR_INDEPENDENT_QA"
        or excel_receipt.get("candidateSaved") is not True
        or excel_receipt.get("worksheetCount")!=17
        or str(excel_receipt.get("sourceSHA256","")).lower()!=COMPOSITE_SHA
        or str(excel_receipt.get("rollbackSHA256","")).lower()!=COMPOSITE_SHA
        or str(excel_receipt.get("candidateSHA256","")).lower()!=FULL_SHA
        or excel_receipt.get("sourceWorkbookModified") is not False
        or excel_receipt.get("externalConnectionsRefreshed") is not False
        or excel_receipt.get("pivotRefreshAllUsed") is not False):
        raise PromotionHold("PRIVATE_EXCEL_FULL_COMPOSITE_CALC_RECEIPT_NOT_VERIFIED")
    if (formula_audit.get("schema")!="brave-hc-plan03-private-full-calc-qa/v1"
        or formula_audit.get("status")!="FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY"
        or formula_audit.get("issues")!=[]
        or formula_audit.get("totalFormulasBefore")!=545506
        or formula_audit.get("totalFormulasAfter")!=545506
        or str(formula_audit.get("beforeSHA256","")).lower()!=COMPOSITE_SHA
        or str(formula_audit.get("afterSHA256","")).lower()!=FULL_SHA
        or len(formula_audit.get("perSheet",[]))!=17
        or any(row.get("formulaDefinitionsPreserved") is not True for row in formula_audit["perSheet"])
        or formula_audit.get("newErrorEvents")!=[]
        or formula_audit.get("originalWorkbookModified") is not False):
        raise PromotionHold("PRIVATE_COMPOSITE_FORMULA_INTEGRITY_NOT_CERTIFIED")
    def errors(name):
        return {(x["sheet"],x["ref"],x["error"]) for x in formula_audit[name]}
    if errors("beforeErrors")!=REF_ERRORS or errors("afterErrors")!=REF_ERRORS:
        raise PromotionHold("ORIGINAL_BROKEN_PROFILE_FORMULAS_NOT_PRESERVED_AS_HELD")
    if (pivot.get("schema")!="brave-hc-plan03-pivot-hto-parity/v1"
        or pivot.get("status")!="DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED"
        or pivot.get("skaterIdentityCount")!=20 or pivot.get("goalieIdentityCount")!=3
        or pivot.get("skaterBasicSourceParity") is not True
        or pivot.get("goalieBasicSourceParity") is not True
        or pivot.get("skaterMismatches") or pivot.get("goalieMismatches")
        or pivot.get("unknownHTOFields")!={"skaterPIM":42,"goaliePOTG":1}
        or pivot.get("publicPlayerStatsReleaseAuthorized") is not False):
        raise PromotionHold("FULL_COMPOSITE_HTO_BASIC_PIVOT_SOURCE_PARITY_UNVERIFIED")
    if hta.get("schema")!="brave-hc-hto-verified-game-feed/v1" or hta.get("teamGP")!=4:
        raise PromotionHold("HTO_FEED_NOT_FOUR_GAME_BASELINE")
    return {
      "schema":"brave-hc-plan03-private-full-composite-technical-acceptance/v1",
      "status":"COMBINED_497_FULL_CALC_AND_HTO_PARITY_PASS_PRIVATE_ONLY",
      "singleCompositeAll497SourceCellsVerified":True,
      "compositeBeforeCalculateFullSHA256":COMPOSITE_SHA,
      "compositeAfterCalculateFullSHA256":FULL_SHA,
      "calculatedSheets":17,
      "formulaDefinitionsPreserved":545506,
      "newExcelErrors":0,
      "originalUnrepairedProfileRefErrors":2,
      "officialSourceSkaterIdentityParity":20,
      "officialSourceGoalieIdentityParity":3,
      "knownUnknownSkaterPIMObservations":42,
      "knownUnknownGoaliePOTGObservations":1,
      "originalWorkbookModified":False,
      "ownerOriginalWorkbookApprovalRecorded":False,
      "modelAwardEligibilityAndCareerStreaksCertified":False,
      "currentWebsiteRecordWatchReleased":False,
      "newOfficialRecordOrAwardPublished":False,
      "futureOct25HTOGameAdmitted":False,
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ("original","composite_before_full_calc","composite_after_full_calc",
                 "private_joined_hto","private_period_evidence","composite_source_receipt",
                 "full_calc_receipt","independent_full_formula_audit","verified_hto_feed"):
        p.add_argument("--"+name.replace("_","-"),type=Path,required=True)
    a=p.parse_args()
    if (sha(a.original)!=ORIGINAL_SHA or sha(a.composite_before_full_calc)!=COMPOSITE_SHA
        or sha(a.composite_after_full_calc)!=FULL_SHA):
        raise PromotionHold("ORIGINAL_OR_COMPOSITE_SOURCE_SHA_CHANGED")
    check_source_receipt(a.composite_source_receipt,ORIGINAL_SHA,COMPOSITE_SHA)
    plan,unknown=source_manifest_contract(
        json.loads(a.private_joined_hto.read_text(encoding="utf8")),
        json.loads(a.private_period_evidence.read_text(encoding="utf8")))
    original=scan_workbook(a.original,plan,unknown,is_original=True)
    before=scan_workbook(a.composite_before_full_calc,plan,unknown,is_original=False)
    after=scan_workbook(a.composite_after_full_calc,plan,unknown,is_original=False)
    # Both accepted composite versions must retain the exact reviewed inputs.
    a1=accept(original,before,plan,unknown,
              observed_games=read_master_schedule_caches(a.composite_before_full_calc))
    a2=accept(original,after,plan,unknown,
              observed_games=read_master_schedule_caches(a.composite_after_full_calc))
    if a1!=a2:raise PromotionHold("SOURCE_INPUTS_CHANGED_DURING_FULL_CALC")
    feed=json.loads(a.verified_hto_feed.read_text(encoding="utf8"))
    skaters,goalies=parse_pivots(a.composite_after_full_calc)
    pivot=reconcile(feed,skaters,goalies)
    output=certify(a2,feed,pivot,
        json.loads(a.full_calc_receipt.read_text(encoding="utf-8-sig")),
        json.loads(a.independent_full_formula_audit.read_text(encoding="utf8")),
        source_sha=sha(a.composite_before_full_calc),
        calculated_sha=sha(a.composite_after_full_calc))
    output["immutableOriginalSHA256"]=ORIGINAL_SHA
    output["HTOFeedSHA256"]=sha(a.verified_hto_feed)
    print(json.dumps(output,indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
