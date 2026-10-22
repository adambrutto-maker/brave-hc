"""Plan 03 read-only immutable workbook promotion preflight.

Compare an original XLSX with a PRIVATE, source-verified full-calculation copy
and two PRIVATE HTO evidence manifests. Make an auditable cell-level REVIEW
contract without writing Excel, Git publisher, HTO or public website records.
The resulting PASS is NOT an approval to promote a source-of-truth workbook.
"""
from __future__ import annotations
from collections import Counter
from decimal import Decimal, InvalidOperation
import argparse
import hashlib
import json
from pathlib import Path
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

N="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ORIGINAL_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
PRIVATE_CALC_SHA="de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b"
SOURCE_ROWS={359:370,360:371,361:372,362:373}
CORRECTED_GOALIE={"GJ363":(1,0),"GK363":(0,1),"GQ363":(0,3),"HA363":(0,1)}
SHEET_GAME_LOGS=3
SHEET_MASTER_SCHEDULE=12
SKATER_START,SKATER_END=4669,4708
GOALIE_START,GOALIE_END=364,366

class PromotionHold(ValueError):pass

def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def column_number(text):
    result=0
    for ch in text:
        if not ("A"<=ch<="Z"):raise PromotionHold("BAD_EXCEL_COLUMN")
        result=result*26+ord(ch)-64
    return result

def canonical_excel_decimal(value):
    # Historical workbook source inputs include legitimate fractional values
    # (e.g. rates). These are not HTO integer score cells.
    try:
        n=Decimal(str(value))
    except (InvalidOperation,TypeError) as exc:
        raise PromotionHold("MALFORMED_EXCEL_NUMERIC_SOURCE") from exc
    if not n.is_finite():raise PromotionHold("NONFINITE_EXCEL_SOURCE_NUMBER")
    return format(n.normalize(),"f")

def numeric(value):
    if type(value) is bool:raise PromotionHold("BOOLEAN_AS_NUMERIC_STAT")
    try:
        n=Decimal(str(value))
    except (InvalidOperation,TypeError) as exc:
        raise PromotionHold("NONNUMERIC_SOURCE_CELL") from exc
    if not n.is_finite() or n!=n.to_integral_value():
        raise PromotionHold("NONINTEGER_SOURCE_CELL")
    return str(int(n))

def source_manifest_contract(joined,periods):
    if (joined.get("schema")!="brave-hc-private-game-log-gtg-join-receipt/v1"
        or joined.get("result",{}).get("schema")!="brave-hc-private-source-joined-game-log-staging/v1"
        or joined["result"].get("status")!="HTO_GTGS_JOINED_REVIEW_ONLY"):
        raise PromotionHold("PRIVATE_HTO_PLAYER_JOIN_NOT_ADMITTED")
    source=joined["result"]
    if (source.get("stagedRows")!={"skaters":40,"goalies":3}
        or source.get("knownGTGCells")!=28 or source.get("withheldGTGCells")!=12
        or source.get("originalWorkbookModified") is not False
        or source.get("structuredTableResizeApproved") is not False):
        raise PromotionHold("PRIVATE_HTO_SOURCE_RELEASE_STATE_CHANGED")
    if (periods.get("schema")!="brave-hc-private-hto-official-period-source/v1"
        or periods.get("state")!="OFFICIAL_PERIODS_VERIFIED_REVIEW_ONLY"
        or periods.get("originalWorkbookWrites")!=0 or periods.get("nativeHTOWrites")!=0):
        raise PromotionHold("OFFICIAL_HISTORICAL_PERIOD_SOURCE_NOT_VERIFIED")
    games=periods.get("games")
    if not isinstance(games,list) or len(games)!=4 or {g.get("workbookGameNumber") for g in games}!=set(SOURCE_ROWS):
        raise PromotionHold("COMPLETED_SOURCE_FOUR_GAME_MAP_CHANGED")

    proposed={SHEET_GAME_LOGS:{},SHEET_MASTER_SCHEDULE:{}}
    withheld=set()
    roster_counts=Counter()
    for kind in ("skaters","goalies"):
        rows=source.get("sourceProposedRows",{}).get(kind)
        count=40 if kind=="skaters" else 3
        if not isinstance(rows,list) or len(rows)!=count:
            raise PromotionHold("STAGED_PLAYER_GAME_ROWS_CHANGED")
        for player in rows:
            row=player.get("worksheetRow")
            book=player.get("bookGame")
            if type(row) is not int or type(book) is not int or book not in (360,361,362):
                raise PromotionHold("UNADMITTED_PLAYER_GAME_ROW")
            if kind=="skaters" and not SKATER_START<=row<=SKATER_END:
                raise PromotionHold("SKATER_SOURCE_ROW_OUTSIDE_PROPOSED_EXTENSION")
            if kind=="goalies" and not GOALIE_START<=row<=GOALIE_END:
                raise PromotionHold("GOALIE_SOURCE_ROW_OUTSIDE_PROPOSED_EXTENSION")
            allowed_cols=(set("A P Q R S T U V AJ AP AA AB".split()) if kind=="skaters"
                else set("FD GG GH GI GK GQ HA".split()))
            identity=player.get("name")
            if not isinstance(identity,str) or not identity or player.get("sourceGame") not in {3356178,3369564,3375601}:
                raise PromotionHold("MISSING_OR_UNADMITTED_PLAYER_IDENTITY")
            data=player.get("proposedSourceOnlyCells")
            held=player.get("withheldHTOFields")
            if not isinstance(data,dict) or not isinstance(held,list):
                raise PromotionHold("STAGED_SOURCE_FIELD_LAYOUT_CHANGED")
            if not set(data).issubset(allowed_cols):
                raise PromotionHold("PLAYER_SOURCE_WRITABLE_COLUMNS_CHANGED")
            row_refs=set()
            for col,value in data.items():
                address=f"{col}{row}"
                if address in proposed[SHEET_GAME_LOGS]:
                    raise PromotionHold("DUPLICATED_STAGED_CELL")
                string_col=col in {"Q","R","GH"}
                if string_col:
                    if not isinstance(value,str) or not value:
                        raise PromotionHold("PLAYER_TEXT_SOURCE_VALUE_MISSING")
                    canonical=("text",value)
                elif col in ("P","GG"):
                    if not isinstance(value,str) or not value.isdigit():
                        raise PromotionHold("JERSEY_SOURCE_TYPE_INVALID")
                    canonical=("number",numeric(value))
                else:
                    if type(value) is not int:
                        raise PromotionHold("STAT_SOURCE_NOT_TYPED_INTEGER")
                    canonical=("number",numeric(value))
                proposed[SHEET_GAME_LOGS][address]=canonical
                row_refs.add(address)
            if not any(col+str(row) in row_refs for col in ("Q","GH")):
                raise PromotionHold("STAGED_SOURCE_NAME_CELL_NOT_PRESENT")
            for h in held:
                if not isinstance(h,dict) or h.get("column") not in allowed_cols:
                    raise PromotionHold("HELD_FIELD_NOT_LEGACY_INPUT_COLUMN")
                address=h["column"]+str(row)
                if address in proposed[SHEET_GAME_LOGS] or address in withheld:
                    raise PromotionHold("UNKNOWN_FIELD_OVERLAPS_WRITABLE_SOURCE")
                withheld.add(address)
            roster_counts[(kind,book)]+=1
    if roster_counts!={("skaters",360):15,("skaters",361):13,("skaters",362):12,
                      ("goalies",360):1,("goalies",361):1,("goalies",362):1}:
        raise PromotionHold("HTO_STAGED_GAME_ROSTER_COVERAGE_CHANGED")
    for game in games:
        num=game["workbookGameNumber"]
        row=SOURCE_ROWS[num]
        team=game.get("bravePeriods")
        opp=game.get("opponentPeriods")
        if (not isinstance(team,list) or not isinstance(opp,list)
            or len(team)!=5 or len(opp)!=5):
            raise PromotionHold("HTO_PERIOD_SOURCE_INCOMPLETE")
        if any(type(value) is not int or value<0 for value in team+opp):
            raise PromotionHold("HTO_PERIOD_VALUE_INVALID")
        if team[4]!=0 or opp[4]!=0 or sum(team)!=game.get("braveGF") or sum(opp)!=game.get("braveGA"):
            raise PromotionHold("HTO_SCORE_AND_PERIODS_DISAGREE")
        for col,val in zip(("K","L","M","N","P","Q","R","S"),team[:4]+opp[:4]):
            proposed[SHEET_MASTER_SCHEDULE][f"{col}{row}"]=("number",numeric(val))
    if len(proposed[SHEET_MASTER_SCHEDULE])!=32 or len(proposed[SHEET_GAME_LOGS])!=460 or len(withheld)!=41:
        raise PromotionHold("EXACT_REVIEWED_SOURCE_CELL_COUNTS_CHANGED")
    if len(set(proposed[SHEET_GAME_LOGS])&withheld):
        raise PromotionHold("UNKNOWN_FIELD_OVERLAPS_SOURCE_CELL")
    return proposed,withheld

def decoded(value,cell_type,shared):
    if value is None:return None
    if cell_type=="s":
        try:
            idx=int(value)
            if str(idx)!=value or idx<0:raise ValueError("bad shared-string index")
            return ("text",shared[idx])
        except (IndexError,ValueError) as exc:
            raise PromotionHold("EXCEL_SHARED_STRING_INDEX_INVALID") from exc
    if cell_type in ("str","inlineStr"):
        return ("text",value)
    if cell_type=="b":
        return ("bool",value)
    if cell_type=="e":
        return ("error",value)
    return ("number",canonical_excel_decimal(value))

def row_in_region(kind,row,col):
    if kind=="skaters":return 1<=col<=158 and SKATER_START<=row<=SKATER_END
    return 160<=col<=275 and GOALIE_START<=row<=GOALIE_END

def existing_region(kind,row,col):
    if kind=="skaters":return 1<=col<=158 and 3<=row<=4668
    return 160<=col<=275 and 3<=row<=363

def scan_workbook(path, targets, withheld, *, is_original):
    records={3:{},12:{}}
    digests={"skaters":hashlib.sha256(),"goalies":hashlib.sha256(),"masterSchedule":hashlib.sha256()}
    digest_counts=Counter()
    unexpected=[]
    expected_refs={3:set(targets[3])|set(CORRECTED_GOALIE)|{"Y4674"}|set(withheld),
                   12:set(targets[12])}
    table_refs={}
    with ZipFile(path) as z:
        if z.testzip() is not None:raise PromotionHold("EXCEL_PACKAGE_CORRUPTED")
        for table,canonical in ((9,"SkaterStatsByGame"),(10,"GoalieStatsByGame")):
            t=ET.fromstring(z.read(f"xl/tables/table{table}.xml"))
            if t.get("displayName")!=canonical:raise PromotionHold("SOURCE_TABLE_IDENTITY_CHANGED")
            table_refs[canonical]=t.get("ref")
        ss=ET.fromstring(z.read("xl/sharedStrings.xml"))
        shared=["".join(t.text or "" for t in q.iter(N+"t")) for q in ss.findall(N+"si")]
        for sheet_id in (3,12):
            with z.open(f"xl/worksheets/sheet{sheet_id}.xml") as fh:
                for _,row in ET.iterparse(fh,events=("end",)):
                    if row.tag!=N+"row":continue
                    num=int(row.get("r","0"))
                    for cell in row.findall(N+"c"):
                        ref=cell.get("r")
                        match=re.match(r"^([A-Z]+)(\d+)$",ref or "")
                        if not match:continue
                        col=column_number(match.group(1))
                        form=cell.find(N+"f")
                        val=cell.find(N+"v")
                        inline=cell.find(N+"is")
                        raw=val.text if val is not None else None
                        if inline is not None:
                            raw="".join(t.text or "" for t in inline.iter(N+"t"))
                            ctype="inlineStr"
                        else:ctype=cell.get("t")
                        relevant=ref in expected_refs[sheet_id]
                        if relevant and form is not None and ref in targets[sheet_id]:
                            raise PromotionHold("SOURCE_INPUT_CELL_IS_FORMULA_"+ref)
                        if form is not None:continue
                        value=decoded(raw,ctype,shared)
                        if relevant:
                            records[sheet_id][ref]=value
                            continue
                        if value is None:continue
                        if sheet_id==12:
                            digest=digests["masterSchedule"]
                            digest.update((ref+"\x1f"+str(value)+"\n").encode("utf8"))
                            digest_counts["masterSchedule"]+=1
                        else:
                            for kind in ("skaters","goalies"):
                                if existing_region(kind,num,col):
                                    digests[kind].update((ref+"\x1f"+str(value)+"\n").encode("utf8"))
                                    digest_counts[kind]+=1
                                elif row_in_region(kind,num,col) and len(unexpected)<30:
                                    unexpected.append({"ref":ref,"type":value[0]})
                    row.clear()
    return {
        "targetCellValues":records,
        "legacyManualHashes":{k:v.hexdigest() for k,v in digests.items()},
        "legacyManualCounts":dict(digest_counts),
        "unexpectedAppendedManualCells":unexpected,
        "tableRefs":table_refs,
    }

def compare(before,after,proposed,withheld):
    expected_before={"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"}
    expected_after={"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"}
    if before["tableRefs"]!=expected_before or after["tableRefs"]!=expected_after:
        raise PromotionHold("SOURCE_TABLE_EXTENSION_NOT_EXACT")
    if before["legacyManualHashes"]!=after["legacyManualHashes"] or before["legacyManualCounts"]!=after["legacyManualCounts"]:
        raise PromotionHold("PREEXISTING_MANUAL_SOURCE_VALUES_CHANGED")
    if before["unexpectedAppendedManualCells"] or after["unexpectedAppendedManualCells"]:
        raise PromotionHold("UNPLANNED_INPUT_IN_NEW_TABLE_ROWS")
    for sheet,cells in proposed.items():
        for ref,want in cells.items():
            if before["targetCellValues"][sheet].get(ref) is not None:
                raise PromotionHold("ORIGINAL_SOURCE_INPUT_ALREADY_PRESENT_"+ref)
            if after["targetCellValues"][sheet].get(ref)!=want:
                raise PromotionHold("SAVED_HTO_SOURCE_VALUE_NOT_MATCHED_"+ref)
    for ref in withheld:
        if after["targetCellValues"][SHEET_GAME_LOGS].get(ref) is not None:
            raise PromotionHold("HELD_UNOBSERVED_STAT_WAS_ENTERED_"+ref)
    original_old={k:("number",numeric(v[0])) for k,v in CORRECTED_GOALIE.items()}
    original_new={k:("number",numeric(v[1])) for k,v in CORRECTED_GOALIE.items()}
    for ref in CORRECTED_GOALIE:
        if before["targetCellValues"][3].get(ref)!=original_old[ref] or after["targetCellValues"][3].get(ref)!=original_new[ref]:
            raise PromotionHold("GOALIE_RECORDED_BASELINE_NOT_RECONCILED_"+ref)
    if before["targetCellValues"][3].get("Y4674")!=("text"," "):
        raise PromotionHold("Y4674_WHITESPACE_SOURCE_CHANGED")
    if after["targetCellValues"][3].get("Y4674") is not None:
        raise PromotionHold("Y4674_MUST_STAY_BLANK_UNKNOWN")
    if len(proposed[3])!=460 or len(proposed[12])!=32 or len(withheld)!=41:
        raise PromotionHold("EXPECTED_FOUR_GAME_SOURCE_CHANGE_SIZE_CHANGED")
    return {
        "schema":"brave-hc-plan03-private-owner-promotion-preflight/v1",
        "status":"497_REVIEWED_CELLS_MATCH_PRIVATE_QA_OWNER_APPROVAL_REQUIRED",
        "counts":{"newPlayerGameRows":43,"verifiedPlayerGameInputCells":460,
                  "periodScoreInputCells":32,"preexistingGoalieCorrections":4,
                  "whitespaceOnlySourceDispositionCells":1,
                  "reviewedSourceChanges":497,"sourceUnknownHeldBlankCells":len(withheld)},
        "sourceTableOriginalRanges":expected_before,
        "sourceTablePrivateReviewRanges":expected_after,
        "previousManualCellDigestsPreserved":True,
        "originalWorkbookChanged":False,
        "sourceModelMissingFieldsStillUnverified":True,
        "completeAwardProjectionStreakModelCertified":False,
        "originalWorkbookOwnerApprovalRecorded":False,
        "originalWorkbookWritesAuthorized":False,
        "publicHTOOrWebsiteChangesAuthorized":False,
        "fifthHTOGame3375682Admitted":False,
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--original",required=True,type=Path)
    p.add_argument("--private-calculated",required=True,type=Path)
    p.add_argument("--private-joined-hto",required=True,type=Path)
    p.add_argument("--private-period-evidence",required=True,type=Path)
    a=p.parse_args()
    if file_sha(a.original)!=ORIGINAL_SHA or file_sha(a.private_calculated)!=PRIVATE_CALC_SHA:
        raise PromotionHold("ORIGINAL_OR_PRIVATE_QA_WORKBOOK_SHA_DRIFT")
    joined=json.loads(a.private_joined_hto.read_text(encoding="utf8"))
    periods=json.loads(a.private_period_evidence.read_text(encoding="utf8"))
    proposed,unknown=source_manifest_contract(joined,periods)
    before=scan_workbook(a.original,proposed,unknown,is_original=True)
    after=scan_workbook(a.private_calculated,proposed,unknown,is_original=False)
    result=compare(before,after,proposed,unknown)
    result["originalSHA256"]=ORIGINAL_SHA
    result["privateCalculatedSHA256"]=PRIVATE_CALC_SHA
    result["privateJoinedHTOSHA256"]=file_sha(a.private_joined_hto)
    result["privatePeriodEvidenceSHA256"]=file_sha(a.private_period_evidence)
    result["existingSourceManualValuesChecked"]=before["legacyManualCounts"]
    print(json.dumps(result,indent=2))

if __name__=="__main__":main()
