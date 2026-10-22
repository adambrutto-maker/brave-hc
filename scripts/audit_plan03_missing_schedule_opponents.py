"""Plan 03: read-only official opponent-name coverage for four completed games.

This checks HTO-backed names against the ORIGINAL and the fully calculated
PRIVATE 497-cell composite. It emits *review proposals*, not Excel edits.
Do not infer times, rinks, home/away or change a historical team alias.
"""
from __future__ import annotations
from datetime import datetime,timedelta
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
from hashlib import sha256
import argparse
import json
import re

N="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ORIGINAL_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
COMPOSITE_SHA="de9bc6ed615a7c330809a0b2f8888f42c357d641f2a2266e0fca20914521f979"
MAP={
  3356177:(359,370,"2026-09-20","Dateline Predators"),
  3356178:(360,371,"2026-09-27","Mohawks H.C."),
  3369564:(361,372,"2026-10-04","Michelob Morts"),
  3375601:(362,373,"2026-10-18","Zamboner Crew"),
}
COLUMNS={"B","C","D","E","F","G","H","I","O","T","U","X"}

class NameHold(ValueError):pass

def digest(path):
    return sha256(path.read_bytes()).hexdigest()

def schedule_rows(path):
    with ZipFile(path) as z:
        if z.testzip() is not None:raise NameHold("CORRUPTED_SCHEDULE_ZIP")
        strings_root=ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings=["".join(t.text or "" for t in si.iter(N+"t"))
                  for si in strings_root.findall(N+"si")]
        found={}
        with z.open("xl/worksheets/sheet12.xml") as stream:
            for _,row in ET.iterparse(stream,events=("end",)):
                if row.tag!=N+"row":continue
                index=int(row.get("r","0"))
                if index not in (370,371,372,373,374):
                    row.clear();continue
                fields={}
                for cell in row.findall(N+"c"):
                    ref=cell.get("r") or ""
                    match=re.match(r"^([A-Z]+)(\d+)$",ref)
                    if not match:continue
                    col=match.group(1)
                    if col not in COLUMNS:continue
                    v=cell.find(N+"v")
                    if v is None:continue
                    value=v.text
                    if cell.get("t")=="s":
                        try:value=strings[int(value)]
                        except (IndexError,ValueError) as exc:raise NameHold("INVALID_SHARED_OPPONENT_STRING") from exc
                    fields[col]=value
                found[index]=fields
                row.clear()
        if set(found)!={370,371,372,373,374}:raise NameHold("EXPECTED_SCHEDULE_ROWS_MISSING")
        return found

def row_date(row):
    try:return (datetime(1899,12,30)+timedelta(days=float(row["E"]))).strftime("%Y-%m-%d")
    except (KeyError,TypeError,ValueError,OverflowError) as exc:
        raise NameHold("OFFICIAL_SCHEDULE_EXCEL_DATE_INVALID") from exc

def validate(original,combined,source):
    if (source.get("schema")!="brave-hc-private-hto-official-period-source/v1"
        or source.get("state")!="OFFICIAL_PERIODS_VERIFIED_REVIEW_ONLY"
        or source.get("originalWorkbookWrites")!=0):
        raise NameHold("OFFICIAL_HTO_SOURCE_EVIDENCE_NOT_ACCEPTED")
    games=source.get("games")
    if not isinstance(games,list) or len(games)!=4:
        raise NameHold("OFFICIAL_GAME_SET_INCOMPLETE")
    mapping={}
    for g in games:
        gid=g.get("htoGameId")
        if gid in mapping or gid not in MAP:
            raise NameHold("SOURCE_GAME_DUPLICATE_OR_UNADMITTED")
        mapping[gid]=g
    if set(mapping)!=set(MAP):raise NameHold("SOURCE_GAME_ID_COVERAGE_CHANGED")
    proposals=[]
    aliases=[]
    for gid,(book_number,row_number,day,name) in MAP.items():
        g=mapping[gid]
        if (g.get("date")!=day or g.get("opponent")!=name
            or g.get("workbookGameNumber")!=book_number):
            raise NameHold("HTO_SOURCE_GAME_ID_OR_OPPONENT_DRIFT")
        before=original.get(row_number,{})
        after=combined.get(row_number,{})
        for label,rec in (("original",before),("composite",after)):
            if (rec.get("B")!=str(book_number) or rec.get("C")!="W2026/27"
                or rec.get("D")!="Regular Season" or row_date(rec)!=day):
                raise NameHold("ROW_DATE_AND_GAME_JOIN_DRIFT_"+label)
        if before.get("H")!=after.get("H"):
            raise NameHold("PREVIOUS_SOURCE_OPPONENT_EDIT_UNREVIEWED")
        current=before.get("H")
        if gid==3356177:
            if current!="Dateline Predators":raise NameHold("HTO_ORIGINAL_OPPONENT_IDENTITY_DRIFT")
        elif gid==3356178:
            if current!="Mohawks HC":raise NameHold("LEGACY_MOHAWKS_SOURCE_ALIAS_DRIFT")
            aliases.append({"row":row_number,"officialOpponent":name,
                "legacyValue":current,"disposition":"ALIAS_REVIEW_DO_NOT_AUTO_NORMALIZE"})
        else:
            if current not in (None,""):raise NameHold("UNEXPECTED_PREEXISTING_OPPONENT_VALUE")
            proposals.append({"sheet":"Master Schedule","row":row_number,
                "cell":"H"+str(row_number),"HTOGameId":gid,
                "sourceDate":day,"verifiedOpponent":name,
                "originalValue":None,"approvalToWriteOriginal":False})
        if after.get("U")!="L" or after.get("X")!="1":
            raise NameHold("COMBINED_COMPLETED_GAME_STATE_NOT_VERIFIED")
        if int(float(after.get("O","0")))!=int(g.get("braveGF",-1)) or int(float(after.get("T","0")))!=int(g.get("braveGA",-1)):
            raise NameHold("COMBINED_GAME_SCORE_NOT_HTO_PARITY")
    future=combined.get(374,{})
    if future.get("B")!="363" or future.get("H") not in (None,"") or future.get("X")!="0":
        raise NameHold("OCT25_FUTURE_GAME_CHANGED_OR_ADMITTED")
    if [(p["cell"],p["verifiedOpponent"]) for p in proposals]!=[
        ("H372","Michelob Morts"),("H373","Zamboner Crew")]:
        raise NameHold("MISSING_OPPONENT_REVIEW_SET_CHANGED")
    for rownum in (372,373):
        for col in ("F","G","I"):
            if original[rownum].get(col) is not None or combined[rownum].get(col) is not None:
                raise NameHold("ADJACENT_SCHEDULE_METADATA_CHANGED_REQUIRES_REVIEW")
    return {
        "schema":"brave-hc-plan03-schedule-opponent-source-review/v1",
        "status":"TWO_OPPONENT_NAMES_VERIFIED_PRIVATE_REVIEW_ONLY",
        "fourOfficialHTOCompletedGames":4,
        "sourceVerifiedExistingOpponentRows":2,
        "newOpponentNamesProposed":proposals,
        "historicalAliasRequiresReview":aliases,
        "unverifiedScheduledTimeHomeAwayAndRinkStillBlank":True,
        "newOpponentValuesInsertedInComposite":False,
        "source497CellCompositeTechnicallyVerifiedSeparately":True,
        "wouldBecomeAdditionalSourceCells":2,
        "sourceOfTruthOwnerApprovalGranted":False,
        "unknownAdjacentMetadataNotInferred":True,
        "originalWorkbookChanged":False,
        "nativeHTOEdited":False,
        "officialOctober25Game3375682Unplayed":True,
        "publicStatisticsPublished":False,
    }

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original",required=True,type=Path)
    parser.add_argument("--private-full-composite",required=True,type=Path)
    parser.add_argument("--official-periods",required=True,type=Path)
    args=parser.parse_args()
    if digest(args.original)!=ORIGINAL_SHA or digest(args.private_full_composite)!=COMPOSITE_SHA:
        raise NameHold("ORIGINAL_OR_FULL_COMPOSITE_SHA_CHANGED")
    official=json.loads(args.official_periods.read_text(encoding="utf-8"))
    result=validate(schedule_rows(args.original),schedule_rows(args.private_full_composite),official)
    result["originalSHA256"]=ORIGINAL_SHA
    result["privateFullCompositeSHA256"]=COMPOSITE_SHA
    result["HTOPeriodSourceSHA256"]=digest(args.official_periods)
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":main()
