"""Plan03 guarded release disposition for independently reviewed private composite.

Purely read-only. Requires an exact private XLSX, Excel/ZIP QA receipts and
the four verified HTO game feed. A green source/calculation test never grants
original workbook update, awards, projections or public Record Watch release.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

from audit_plan03_hto_season_pivot_parity import parse_pivots,reconcile
from audit_plan03_composite_497_parity import COMPOSITE_SHA,PromotionHold

NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
COMPOSITE_CALCULATED_SHA="231c1e91cdb833f23b4d49a10f3a3050c941205651ca7e9556c0badd029643e9"
EXPECTED_PROFILE_ERRORS={
    ("Skater Profile","I13","#REF!"),("Skater Profile","J13","#REF!")
}
KNOWN_GAMES={
    370:(0,3,-3,"L",1),371:(3,6,-3,"L",1),
    372:(2,3,-1,"L",1),373:(1,7,-6,"L",1)
}

def sha(path:Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def scan_schedule(path:Path):
    seen={}
    refs={f"{c}{n}" for n in (370,371,372,373,374) for c in ("O","T","W","U","X")}
    refs.add("AN37")
    with ZipFile(path) as z:
        if z.testzip() is not None:raise PromotionHold("COMPOSITE_CALCULATED_WORKBOOK_ZIP_CORRUPT")
        with z.open("xl/worksheets/sheet12.xml") as stream:
            for _,row in ET.iterparse(stream,events=("end",)):
                if row.tag!=NS+"row":continue
                for cell in row.findall(NS+"c"):
                    addr=cell.get("r")
                    if addr not in refs:continue
                    val=cell.find(NS+"v")
                    if val is not None:seen[addr]=val.text
                row.clear()
    return seen

def judged(qa,app,team,pivots):
    if qa.get("status")!="FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY" or qa.get("issues"):
        raise PromotionHold("INDEPENDENT_COMPOSITE_FORMULA_QA_NOT_ACCEPTED")
    if (qa.get("totalFormulasBefore")!=545506 or qa.get("totalFormulasAfter")!=545506):
        raise PromotionHold("COMPOSITE_FORMULA_COUNT_CHANGED")
    before={(x["sheet"],x["ref"],x["error"]) for x in qa.get("beforeErrors",[])}
    after={(x["sheet"],x["ref"],x["error"]) for x in qa.get("afterErrors",[])}
    if before!=EXPECTED_PROFILE_ERRORS or after!=EXPECTED_PROFILE_ERRORS:
        raise PromotionHold("COMPOSITE_EXCEL_ERROR_SET_NOT_ORIGINAL_REF_PAIR")
    if app.get("status")!="FULL_CALC_DISPOSABLE_SAVED_FOR_INDEPENDENT_QA" or app.get("candidateSaved") is not True:
        raise PromotionHold("PRIVATE_EXCEL_CALCULATION_NOT_SAVED")
    if app.get("sourceSHA256","").lower()!=COMPOSITE_SHA:
        raise PromotionHold("COMPOSITE_EXCEL_SOURCE_SHA_DRIFT")
    if app.get("candidateSHA256","").lower()!=COMPOSITE_CALCULATED_SHA:
        raise PromotionHold("COMPOSITE_CALCULATED_OUTPUT_SHA_DRIFT")
    if app.get("worksheetCount")!=17 or type(app.get("actualCalculationSeconds")) not in (float,int) or app["actualCalculationSeconds"]<=0:
        raise PromotionHold("COMPOSITE_17_SHEET_CALC_NOT_VERIFIED")
    for row,(gf,ga,difference,result,count) in KNOWN_GAMES.items():
        for col,val in (("O",gf),("T",ga),("W",difference),("X",count)):
            if team.get(f"{col}{row}")!=str(val):
                raise PromotionHold("COMPOSITE_SCORE_OR_COUNT_INCORRECT_"+col+str(row))
        if team.get(f"U{row}")!=result:
            raise PromotionHold("COMPOSITE_OFFICIAL_GAME_RESULT_INCORRECT_"+str(row))
    if team.get("AN37")!="4" or team.get("X374")!="0":
        raise PromotionHold("2026_COMPLETED_COUNT_OR_FUTURE_ADMISSION_DRIFT")
    if (pivots.get("status")!="DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED"
        or pivots.get("skaterBasicSourceParity") is not True
        or pivots.get("goalieBasicSourceParity") is not True
        or pivots.get("skaterIdentityCount")!=20
        or pivots.get("goalieIdentityCount")!=3):
        raise PromotionHold("HTO_PLAYER_SEASON_SOURCE_PARITY_NOT_ACCEPTED")
    missing=pivots.get("unknownHTOFields",{})
    if missing!={"skaterPIM":42,"goaliePOTG":1}:
        raise PromotionHold("HTO_UNKNOWN_SOURCE_COVERAGE_CHANGED")
    return {
      "schema":"brave-hc-plan03-composite-full-recalc-source-acceptance/v1",
      "status":"COMPOSITE_CALC_AND_BASIC_HTO_PARITY_PASS_RELEASE_HELD",
      "reviewedSourceChanges":497,
      "verifiedCompletedGameCount":4,"officialTeamGoalsFor":6,"officialTeamGoalsAgainst":19,
      "winter2026CompletedGames":4,
      "htoskatersVerified":20,"htogoaliesVerified":3,
      "formulaDefinitionsPreservedAcross17Sheets":True,
      "formulaCount":545506,
      "onlyTwoOriginalSkaterProfileRefErrorsRemain":True,
      "missingOfficialStats":missing,
      "compositeSourceSHA256":COMPOSITE_SHA,
      "calculatedPrivateCompositeSHA256":COMPOSITE_CALCULATED_SHA,
      "sourceOfTruthWorkbookModified":False,
      "originalWorkbookOwnerApprovalRecorded":False,
      "awardsForecastsAndStreaksCertified":False,
      "currentRecordWatchOrPlayerPublicationAuthorized":False,
      "fifthGame3375682Admitted":False,
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--calculated",type=Path,required=True)
    p.add_argument("--hto-feed",type=Path,required=True)
    p.add_argument("--excel-receipt",type=Path,required=True)
    p.add_argument("--formula-audit",type=Path,required=True)
    a=p.parse_args()
    if sha(a.calculated)!=COMPOSITE_CALCULATED_SHA:
        raise PromotionHold("CALCULATED_COMPOSITE_FILE_SHA_CHANGED")
    qa=json.loads(a.formula_audit.read_text(encoding="utf-8"))
    app=json.loads(a.excel_receipt.read_text(encoding="utf-8-sig"))
    feed=json.loads(a.hto_feed.read_text(encoding="utf-8"))
    skaters,goalies=parse_pivots(a.calculated)
    model=reconcile(feed,skaters,goalies)
    result=judged(qa,app,scan_schedule(a.calculated),model)
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":main()
