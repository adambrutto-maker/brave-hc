"""HockeyOS Plan 03 — HTO parity for actuals used in legacy skater projections.

Read-only: compares cached actual game statistics (columns S:V) in a PRIVATE,
fully calculated Excel copy against the approved four-game HTO collector feed.
No Excel automation, HTO editing, output publication, or model forecasting.
"""
import argparse
from collections import Counter, defaultdict
from hashlib import sha256
import json
from pathlib import Path
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

EXPECTED_WORKBOOK_SHA="de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b"
GAME_IDS={3356177,3356178,3369564,3375601}
TABLE_RANGE="C5:AC94"
SEASON="W2026/27"
STAT_COLS={"gp":"S","g":"T","a":"U","pts":"V"}
NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

class EvidenceHold(ValueError):pass

def official_skaters(feed):
    if (feed.get("schema")!="brave-hc-hto-verified-game-feed/v1"
        or feed.get("allGamesDiscovered") is not True
        or feed.get("playerAggregateParity") is not True
        or feed.get("teamGP")!=4):
        raise EvidenceHold("HTO_VERIFIED_FEED_CONTRACT_CHANGED")
    games=feed.get("games")
    if not isinstance(games,list) or len(games)!=4 or {g.get("htoGameId") for g in games}!=GAME_IDS:
        raise EvidenceHold("UNADMITTED_OR_DUPLICATE_HTO_GAME")
    totals=defaultdict(lambda:defaultdict(int))
    for game in games:
        people=game.get("skaters")
        if not isinstance(people,list) or len({p.get("name") for p in people if isinstance(p,dict)})!=len(people):
            raise EvidenceHold("HTO_GAME_PLAYER_IDENTITY_DUPLICATED")
        for p in people:
            name=p.get("name")
            if not isinstance(name,str) or not name:
                raise EvidenceHold("HTO_PLAYER_NAME_MISSING")
            for field in STAT_COLS:
                val=p.get(field)
                if type(val) is not int or val<0:
                    raise EvidenceHold("HTO_PLAYER_ACTUAL_NOT_INTEGER")
                totals[name][field]+=val
    if len(totals)!=20 or sum(v["gp"] for v in totals.values())!=54:
        raise EvidenceHold("HTO_CURRENT_SKATER_COVERAGE_CHANGED")
    if {field:sum(v[field] for v in totals.values()) for field in STAT_COLS}!={
        "gp":54,"g":6,"a":10,"pts":16
    }:
        raise EvidenceHold("HTO_FOUR_GAME_SKATER_ACTUAL_TOTALS_CHANGED")
    return {name:dict(scores) for name,scores in totals.items()}

def numeric(value,field):
    if value is None or value=="":return 0
    try:
        v=float(value)
        if not v.is_integer() or v<0:raise ValueError("noninteger")
        return int(v)
    except (ValueError,TypeError,OverflowError) as exc:
        raise EvidenceHold("PROJECTION_ACTUAL_CELL_INVALID_"+field) from exc

def read_private_projection(book:Path):
    if sha256(book.read_bytes()).hexdigest()!=EXPECTED_WORKBOOK_SHA:
        raise EvidenceHold("PRIVATE_FULL_CALC_WORKBOOK_SOURCE_SHA_DRIFT")
    with ZipFile(book) as z:
        if z.testzip() is not None:raise EvidenceHold("PRIVATE_WORKBOOK_CORRUPT_ZIP")
        table=ET.fromstring(z.read("xl/tables/table12.xml"))
        if table.get("displayName")!="BravesRegularSeasonProjection" or table.get("ref")!=TABLE_RANGE:
            raise EvidenceHold("PROJECTION_TABLE_IDENTITY_OR_RANGE_CHANGED")
        strings_root=ET.fromstring(z.read("xl/sharedStrings.xml"))
        texts=["".join(t.text or "" for t in si.iter(NS+"t"))
               for si in strings_root.findall(NS+"si")]
        actual=[]
        selector=None
        with z.open("xl/worksheets/sheet6.xml") as stream:
            for _,row in ET.iterparse(stream,events=("end",)):
                if row.tag!=NS+"row":continue
                n=int(row.get("r","0"))
                if n not in (2,) and not 6<=n<=94:
                    row.clear();continue
                data={}
                for cell in row.findall(NS+"c"):
                    match=re.match(r"^([A-Z]+)([0-9]+)$",cell.get("r") or "")
                    if not match:continue
                    column=match.group(1)
                    if column not in {"E","F","S","T","U","V","X"}:continue
                    cached=cell.find(NS+"v")
                    if cached is None:continue
                    value=cached.text
                    if cell.get("t")=="s":
                        value=texts[int(value)]
                    data[column]=value
                if n==2:selector=data.get("X")
                else:
                    name=data.get("F")
                    if name:actual.append({"player":name,"status":data.get("E"),
                                           "values":{f:numeric(data.get(c),f) for f,c in STAT_COLS.items()}})
                row.clear()
        if selector!=SEASON:raise EvidenceHold("PROJECTION_SEASON_SELECTOR_CHANGED")
        if len(actual)!=89:
            raise EvidenceHold("PROJECTION_PLAYER_ROW_COVERAGE_CHANGED")
        return actual
        return actual

def reconcile(official,projection_rows):
    if len(official)!=20:
        raise EvidenceHold("OFFICIAL_SKATER_IDENTITY_COVERAGE_INVALID")
    roster=[r.get("player") for r in projection_rows]
    if len(roster)!=89 or any(not isinstance(name,str) or not name for name in roster):
        raise EvidenceHold("PROJECTION_ROSTER_INVALID")
    duplicates={name:n for name,n in Counter(roster).items() if n>1}
    if any(name in official for name in duplicates):
        raise EvidenceHold("PROJECTION_HTO_PLAYER_DUPLICATE_AMBIGUOUS")
    if duplicates and duplicates!={"Hunt, Quenton":2}:
        raise EvidenceHold("UNREVIEWED_LEGACY_PROJECTION_DUPLICATE")
    known=[r for r in projection_rows if r["player"] in official]
    missing=sorted(set(official)-set(roster))
    if len(known)!=19 or missing!=["Pavaday, Damian"]:
        raise EvidenceHold("PROJECTION_HTO_PLAYER_COVERAGE_CHANGED_REVIEW_REQUIRED")
    discrepancies=[]
    for row in known:
        actual=row.get("values")
        if not isinstance(actual,dict) or set(actual)!=set(STAT_COLS):
            raise EvidenceHold("PROJECTION_ACTUAL_FIELDS_INCOMPLETE")
        for field in STAT_COLS:
            val=actual[field]
            if type(val) is not int or val<0:
                raise EvidenceHold("PROJECTION_ACTUAL_VALUE_NOT_INTEGER")
            if val!=official[row["player"]][field]:
                discrepancies.append({"player":row["player"],"field":field,
                                      "expected":official[row["player"]][field],"actual":val})
    return {
      "schema":"brave-hc-plan03-hto-projection-actual-source-parity/v1",
      "status":("PROJECTION_ACTUAL_SOURCE_PARITY_HOLD" if discrepancies else
                "PROJECTION_REPRESENTED_ACTUALS_MATCH_HTO_DUPLICATE_LEGACY_ROW_HOLD"
                if duplicates else "PROJECTION_REPRESENTED_ACTUALS_MATCH_HTO_PARTIAL"),
      "officialHTOSkaters":len(official),
      "projectionTableRows":len(projection_rows),
      "distinctProjectionPlayerNames":len(set(roster)),
      "duplicateLegacyProjectionNames":[{"name":name,"rows":n} for name,n in sorted(duplicates.items())],
      "representedCurrentHTOSkaters":len(known),
      "matchedActuals":len(known)-len({m["player"] for m in discrepancies}),
      "discrepancies":discrepancies,
      "notRepresentedOfficialHTOSkaters":missing,
      "officialCurrentSeasonTotals":{field:sum(v[field] for v in official.values()) for field in STAT_COLS},
      "representedPlayerTotals":{field:sum(row["values"][field] for row in known) for field in STAT_COLS},
      "actualColumns":"S:V only — GP, G, A, Pts",
      "unrepresentedPlayerEligibilityApproved":False,
      "fullProjectionRosterIntegrityCertified":not bool(duplicates),
      "forecastColumnsAndRatesCertified":False,
      "unknownSourceStatsCertified":False,
      "goalieProjectionsCertified":False,
      "awardsOrWebWatchPublicationAuthorized":False,
      "sourceWorkbookModified":False,
      "futureHTOGame3375682Admitted":False
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--verified-hto-feed",type=Path,required=True)
    p.add_argument("--private-calculated-workbook",type=Path,required=True)
    a=p.parse_args()
    feed=json.loads(a.verified_hto_feed.read_text(encoding="utf-8"))
    result=reconcile(official_skaters(feed),read_private_projection(a.private_calculated_workbook))
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":main()
