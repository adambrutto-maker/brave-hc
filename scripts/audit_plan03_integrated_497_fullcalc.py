"""Plan 03 — independent acceptance of ONE fully calculated 497-cell composite.

Read original XLSX, verified HTO source manifests, Excel's private full-calc
receipt, private ZIP/XML error audit, and calculated composite XLSX. Never
write any workbook or publish team/player stats. This validates *bounded
source and calculation parity*, NOT owner approval or model/award release.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

import audit_plan03_exact_promotion_preflight as source
import audit_plan03_hto_season_pivot_parity as pivot

NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
COMPOSITE_INPUT_SHA="9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08"
COMPOSITE_CALCULATED_SHA="231c1e91cdb833f23b4d49a10f3a3050c941205651ca7e9556c0badd029643e9"
OFFICIAL_HOPEFUL={3356177:(359,370),3356178:(360,371),
                  3369564:(361,372),3375601:(362,373)}
ERROR_BASELINE={("Skater Profile","I13","#REF!"),("Skater Profile","J13","#REF!")}

class CompositeHold(ValueError):
    pass

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def j(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))

def as_int(value,what):
    try:
        number=float(value)
        if not number.is_integer():
            raise ValueError("fraction")
        return int(number)
    except (ValueError,TypeError,OverflowError) as exc:
        raise CompositeHold("INVALID_NUMERIC_CACHED_VALUE_"+what) from exc

def master_schedule(full):
    desired={37:{"AN"},374:set("KLMNPQRS")|{"X","U"}}
    for _,(_,row) in OFFICIAL_HOPEFUL.items():
        desired[row]=set("KLMNOPQRSTUWX")|{"B"}
    fields={}
    with ZipFile(full) as z:
        if z.testzip() is not None:raise CompositeHold("CORRUPT_COMPOSITE_XLSX")
        with z.open("xl/worksheets/sheet12.xml") as stream:
            for _,row in ET.iterparse(stream,events=("end",)):
                if row.tag!=NS+"row":continue
                n=int(row.get("r","0"))
                if n in desired:
                    value={}
                    for cell in row.findall(NS+"c"):
                        ref=cell.get("r") or ""
                        col=ref.removesuffix(str(n))
                        if col not in desired[n]:continue
                        v=cell.find(NS+"v")
                        f=cell.find(NS+"f")
                        value[col]={"value":None if v is None else v.text,
                                    "formula":f is not None,"type":cell.get("t")}
                    fields[n]=value
                row.clear()
    return fields

def validate_composite(original, calculated, proposed, unknown, feed, schedule, application, audit):
    if len(proposed[3])!=460 or len(proposed[12])!=32 or len(unknown)!=41:
        raise CompositeHold("497_SOURCE_CONTRACT_COUNT_DRIFT")
    before=source.scan_workbook(original,proposed,unknown,is_original=True)
    after=source.scan_workbook(calculated,proposed,unknown,is_original=False)
    if before["tableRefs"]!={"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"}:
        raise CompositeHold("CANONICAL_TABLE_REF_CHANGED")
    if after["tableRefs"]!={"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"}:
        raise CompositeHold("COMPOSITE_TABLE_REF_CHANGED")
    if (before["legacyManualHashes"]!=after["legacyManualHashes"]
        or before["legacyManualCounts"]!=after["legacyManualCounts"]
        or before["unexpectedAppendedManualCells"] or after["unexpectedAppendedManualCells"]):
        raise CompositeHold("HISTORICAL_MANUAL_SOURCE_DRIFT")
    for sheet in (3,12):
        for ref,want in proposed[sheet].items():
            if before["targetCellValues"][sheet].get(ref) is not None:
                raise CompositeHold("ORIGINAL_SOURCE_CELL_ALREADY_FILLED_"+ref)
            if after["targetCellValues"][sheet].get(ref)!=want:
                raise CompositeHold("COMPOSITE_HTO_SOURCE_PARITY_MISMATCH_"+ref)
    for ref in unknown:
        if after["targetCellValues"][3].get(ref) is not None:
            raise CompositeHold("UNKNOWN_HTO_STAT_NOT_BLANK_"+ref)
    for ref,(old,new) in source.CORRECTED_GOALIE.items():
        if (before["targetCellValues"][3].get(ref)!=("number",str(old))
            or after["targetCellValues"][3].get(ref)!=("number",str(new))):
            raise CompositeHold("GOALIE_GAME359_CORRECTION_MISMATCH_"+ref)
    if (before["targetCellValues"][3].get("Y4674")!=("text"," ")
        or after["targetCellValues"][3].get("Y4674") is not None):
        raise CompositeHold("Y4674_NOT_PRESERVED_AS_BLANK_UNKNOWN")

    if (feed.get("schema")!="brave-hc-hto-verified-game-feed/v1"
        or feed.get("allGamesDiscovered") is not True
        or feed.get("playerAggregateParity") is not True or feed.get("teamGP")!=4):
        raise CompositeHold("OFFICIAL_HTO_GAME_SOURCE_CHANGED")
    games=feed.get("games",[])
    if (len(games)!=4 or set(g.get("htoGameId") for g in games)!=set(OFFICIAL_HOPEFUL)):
        raise CompositeHold("OFFICIAL_HTO_GAME_IDS_CHANGED")
    source_total={"GF":0,"GA":0}
    games_out=[]
    for game in games:
        gid=game["htoGameId"]
        book,row=OFFICIAL_HOPEFUL[gid]
        saved=schedule.get(row,{})
        def n(col):
            return as_int(saved.get(col,{}).get("value"),col+str(row))
        if n("B")!=book:raise CompositeHold("WRONG_WORKBOOK_GAME_JOIN_"+str(row))
        for stat,periods in (("GF",("K","L","M","N")),("GA",("P","Q","R","S"))):
            if sum(n(c) for c in periods)!=n("O" if stat=="GF" else "T"):
                raise CompositeHold("INTERNAL_PERIOD_SUM_MISMATCH_"+str(row))
        if n("O")!=game["teamGoals"] or n("T")!=game["teamGoalsAgainst"]:
            raise CompositeHold("OFFICIAL_HTO_SCORE_MISMATCH_"+str(row))
        if n("W")!=n("O")-n("T") or n("X")!=1 or saved.get("U",{}).get("value")!="L":
            raise CompositeHold("GAME_RESULT_OR_COUNTED_FLAG_MISMATCH_"+str(row))
        if any(saved.get(col,{}).get("formula") is not True for col in ("O","T","U","W","X")):
            raise CompositeHold("MASTER_SCHEDULE_RESULT_FORMULA_LOST_"+str(row))
        source_total["GF"]+=n("O");source_total["GA"]+=n("T")
        games_out.append({"htogame":gid,"workbookGame":book,"row":row,"GF":n("O"),"GA":n("T"),"result":"L"})
    if source_total!={"GF":6,"GA":19}:raise CompositeHold("HTO_FOUR_GAME_TOTALS_CHANGED")
    if as_int(schedule.get(37,{}).get("AN",{}).get("value"),"AN37")!=4:
        raise CompositeHold("COUNTED_REGULAR_SEASON_GAMES_NOT_FOUR")
    upcoming=schedule.get(374,{})
    if as_int(upcoming.get("X",{}).get("value"),"X374")!=0:
        raise CompositeHold("FUTURE_GAME_374_COUNTED_PREMATURELY")
    if any(upcoming.get(col,{}).get("value") is not None for col in "KLMNPQRS"):
        raise CompositeHold("FUTURE_GAME_374_HAS_PERIOD_VALUES")

    if (application.get("schema")!="brave-hc-private-full-calculation-excel-qa/v1"
        or application.get("status")!="FULL_CALC_DISPOSABLE_SAVED_FOR_INDEPENDENT_QA"
        or application.get("candidateSaved") is not True
        or application.get("worksheetCount")!=17
        or application.get("sourceSHA256","").lower()!=COMPOSITE_INPUT_SHA
        or application.get("rollbackSHA256","").lower()!=COMPOSITE_INPUT_SHA
        or application.get("candidateSHA256","").lower()!=COMPOSITE_CALCULATED_SHA
        or application.get("sourceWorkbookModified") is not False
        or application.get("externalConnectionsRefreshed") is not False):
        raise CompositeHold("EXCEL_PRIVATE_FULL_CALC_RECEIPT_INVALID")
    if (audit.get("schema")!="brave-hc-plan03-private-full-calc-qa/v1"
        or audit.get("status")!="FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY"
        or audit.get("issues")!=[]
        or audit.get("sourceSHA256")!=source.ORIGINAL_SHA
        or audit.get("beforeSHA256")!=COMPOSITE_INPUT_SHA
        or audit.get("afterSHA256")!=COMPOSITE_CALCULATED_SHA
        or audit.get("totalFormulasBefore")!=545506
        or audit.get("totalFormulasAfter")!=545506
        or audit.get("originalWorkbookModified") is not False
        or audit.get("awardsAndLiveStatsApproved") is not False):
        raise CompositeHold("INDEPENDENT_FULL_CALC_AUDIT_NOT_ACCEPTED")
    if not isinstance(audit.get("perSheet"),list) or len(audit["perSheet"])!=17:
        raise CompositeHold("ALL_SEVENTEEN_FORMULA_SHEETS_NOT_CHECKED")
    if any(row.get("formulaDefinitionsPreserved") is not True for row in audit["perSheet"]):
        raise CompositeHold("FORMULA_DEFINITION_DRIFT")
    def errors(field):
        return {(v["sheet"],v["ref"],v["error"]) for v in audit.get(field,[])}
    if errors("beforeErrors")!=ERROR_BASELINE or errors("afterErrors")!=ERROR_BASELINE:
        raise CompositeHold("NEW_OR_MISSING_EXCEL_ERROR_BASELINE")

    if (pivot.source_totals(feed)[1]!={"skaterPIM":42,"goaliePOTG":1}):
        raise CompositeHold("PARTIAL_OFFICIAL_STATS_CHANGED")
    return {
      "schema":"brave-hc-plan03-integrated-497-fullcalc-validation/v1",
      "status":"497_SOURCE_AND_BASIC_SEASON_PARITY_PASS_REVIEW_ONLY",
      "verifiedManualEdits":497,
      "newHTOPlayerCells":460,"teamPeriodCells":32,
      "goalieGame359Corrections":4,"whitespaceSourceDispositions":1,
      "withheldUnknownHTOCells":41,
      "historicalSourceDigestsPreserved":True,
      "existingManualCellsChecked":before["legacyManualCounts"],
      "fourTeamGames":games_out,"teamTotals":source_total,
      "counted2026RegularSeasonGames":4,
      "futureGameRow374Unplayed":True,
      "fullCalculationSheets":17,
      "fullCalculationFormulas":545506,
      "newExcelErrorCount":0,"preexistingSkaterProfileREFErrors":2,
      "externalConnectionsRefreshed":False,
      "originalSourceWorkbookModified":False,
      "compositeOriginalSourceReleaseApproved":False,
      "publicPlayerStatsWatchAwardsApproved":False,
      "unsupportedPIMandGoaliePOTGSourceFullyResolved":False,
      "futureHTOGame3375682Admitted":False
    }

def main():
    cli=argparse.ArgumentParser(description=__doc__)
    for field in ("original","private_calculated","private_joined_hto","private_period_evidence",
                  "verified_hto_feed","private_excel_receipt","private_fullcalc_audit"):
        cli.add_argument("--"+field.replace("_","-"),type=Path,required=True)
    a=cli.parse_args()
    if sha(a.original)!=source.ORIGINAL_SHA or sha(a.private_calculated)!=COMPOSITE_CALCULATED_SHA:
        raise CompositeHold("ORIGINAL_OR_PRIVATE_COMPOSITE_HASH_DRIFT")
    joined=j(a.private_joined_hto);periods=j(a.private_period_evidence)
    proposed,unknown=source.source_manifest_contract(joined,periods)
    feed=j(a.verified_hto_feed)
    schedule=master_schedule(a.private_calculated)
    result=validate_composite(a.original,a.private_calculated,proposed,unknown,feed,schedule,
                              j(a.private_excel_receipt),j(a.private_fullcalc_audit))
    skater,goalie=pivot.parse_pivots(a.private_calculated)
    parity=pivot.reconcile(feed,skater,goalie)
    if parity.get("status")!="DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED":
        raise CompositeHold("PLAYER_SEASON_SOURCE_PARITY_NOT_ACCEPTED")
    if (parity.get("skaterIdentityCount"),parity.get("goalieIdentityCount"))!=(20,3):
        raise CompositeHold("SOURCE_PLAYER_IDENTITY_COVERAGE_CHANGED")
    result["verifiedSkaterSeasonIdentities"]=20
    result["verifiedGoalieSeasonIdentities"]=3
    result["officialBasicHTOPivotStatus"]=parity["status"]
    result["compositeFileSHA256"]=COMPOSITE_CALCULATED_SHA
    result["originalWorkbookSHA256"]=source.ORIGINAL_SHA
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
