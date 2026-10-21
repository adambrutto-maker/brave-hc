"""Plan 03 private legacy player-game-log coverage audit; no spreadsheet writes.

Read a pinned immutable Master Workbook ZIP/XML and source-verified HTO JSON.
Never publish records, backfill identities, open Excel, or modify a workbook.
"""
from __future__ import annotations
from collections import Counter
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import argparse
import hashlib
import json
import re

SOURCE_SHA = "0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
MAP = {3356177:359, 3356178:360, 3369564:361, 3375601:362}
NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
SKATER_COLS={"A":"game","B":"season","C":"gameType","Q":"name",
             "S":"gp","T":"g","U":"a","V":"pts","AP":"potg"}
GOALIE_COLS={"FD":"game","FE":"season","FF":"gameType","GH":"name",
             "GI":"gp","GJ":"wins","GK":"losses","GQ":"goalsAgainst","HA":"potg"}

class ReviewHold(ValueError):pass

def count(value, name):
    try:
        if type(value) is bool:raise ValueError("bool")
        n=int(value)
        if str(n)!=str(value).strip() or n<0:raise ValueError("not whole nonnegative")
        return n
    except (TypeError,ValueError,AttributeError) as exc:
        raise ReviewHold("INVALID_NUMBER_"+name) from exc

def load_xlsx_rows(path: Path):
    """Only inspect source Player Game Logs table input rows, not pivot output."""
    if hashlib.sha256(path.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise ReviewHold("ORIGINAL_MASTER_WORKBOOK_HASH_DRIFT")
    with ZipFile(path) as z:
        if z.testzip() is not None:raise ReviewHold("CORRUPT_WORKBOOK_ARCHIVE")
        tables={}
        for table_path in ("xl/tables/table9.xml","xl/tables/table10.xml"):
            root=ET.fromstring(z.read(table_path))
            tables[root.get("displayName")]=root.get("ref")
        if tables.get("SkaterStatsByGame")!="A2:FB4668" or tables.get("GoalieStatsByGame")!="FD2:JO363":
            raise ReviewHold("SOURCE_GAME_LOG_TABLE_IDENTITY_CHANGED")
        ss=ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings=["".join(t.text or "" for t in node.iter(NS+"t"))
                 for node in ss.findall(NS+"si")]
        result={"skaters":[],"goalies":[]}
        with z.open("xl/worksheets/sheet3.xml") as stream:
            for _,row in ET.iterparse(stream,events=("end",)):
                if row.tag!=NS+"row":continue
                found={}
                for cell in row.findall(NS+"c"):
                    match=re.match(r"([A-Z]+)",cell.get("r",""))
                    if not match:continue
                    col=match.group(1)
                    if col not in SKATER_COLS and col not in GOALIE_COLS:continue
                    val=cell.find(NS+"v")
                    if val is None:continue
                    word=val.text
                    if cell.get("t")=="s" and word is not None:
                        word=strings[int(word)]
                    found[col]=word
                if found.get("B")=="W2026/27":
                    result["skaters"].append({name:found.get(col)
                        for col,name in SKATER_COLS.items()})
                if found.get("FE")=="W2026/27":
                    result["goalies"].append({name:found.get(col)
                        for col,name in GOALIE_COLS.items()})
                row.clear()
        return result

def audit(feed: dict, workbook: dict) -> dict:
    if (feed.get("schema")!="brave-hc-hto-verified-game-feed/v1"
        or feed.get("allGamesDiscovered") is not True
        or feed.get("playerAggregateParity") is not True
        or feed.get("teamGP")!=4):
        raise ReviewHold("OFFICIAL_HTO_SOURCE_NOT_VERIFIED")
    games=feed.get("games")
    if not isinstance(games,list) or len(games)!=4:
        raise ReviewHold("OFFICIAL_FOUR_GAME_COVERAGE_MISSING")
    ids=[g.get("htoGameId") for g in games if isinstance(g,dict)]
    if len(ids)!=4 or len(set(ids))!=4 or set(ids)!=set(MAP):
        raise ReviewHold("UNADMITTED_OR_DUPLICATE_HTO_GAME")
    if not isinstance(workbook,dict) or not isinstance(workbook.get("skaters"),list) or not isinstance(workbook.get("goalies"),list):
        raise ReviewHold("LEGACY_WORKBOOK_EXTRACT_INVALID")

    logby={type_:{} for type_ in ("skaters","goalies")}
    for type_ in logby:
        for row in workbook[type_]:
            num=count(row.get("game"),"GAME_NUMBER")
            if num not in set(MAP.values()) or row.get("season")!="W2026/27" or row.get("gameType")!="Regular Season":
                raise ReviewHold("UNEXPECTED_LEGACY_SEASON_GAME_LOG_ROW")
            name=row.get("name")
            if not isinstance(name,str) or not name.strip():
                raise ReviewHold("LEGACY_GAME_LOG_NAME_UNKNOWN")
            key=(num,name)
            if key in logby[type_]:
                raise ReviewHold("DUPLICATED_LEGACY_PLAYER_GAME")
            logby[type_][key]=row
    counts={}
    gap=[]
    conflicts=[]
    for g in sorted(games,key=lambda a:MAP[a["htoGameId"]]):
        gid=g["htoGameId"];number=MAP[gid]
        if not isinstance(g.get("skaters"),list) or not isinstance(g.get("goalies"),list):
            raise ReviewHold("OFFICIAL_PLAYER_GAME_LIST_MISSING")
        if not all(type(g.get(k)) is int and g[k]>=0 for k in ("teamGoals","teamGoalsAgainst")):
            raise ReviewHold("OFFICIAL_TEAM_SCORE_INVALID")
        for type_,data in (("skaters",g["skaters"]),("goalies",g["goalies"])):
            source_names=[p.get("name") for p in data]
            if any(not isinstance(n,str) or not n for n in source_names) or len(set(source_names))!=len(source_names):
                raise ReviewHold("OFFICIAL_PLAYER_IDENTITY_AMBIGUOUS")
            matched=[(p,logby[type_].get((number,p["name"]))) for p in data]
            existing=[row for _,row in matched if row is not None]
            missing=[p["name"] for p,row in matched if row is None]
            other=[row["name"] for (num,_),row in logby[type_].items()
                   if num==number and row["name"] not in set(source_names)]
            if other:conflicts.append({"game":number,"scope":type_,"reason":"UNRECONCILED_EXTRA_LEGACY_NAME","names":other})
            if missing:gap.append({"game":number,"officialHTOGame":gid,"scope":type_,"missingCount":len(missing)})
            if type_=="skaters":
                for person,row in matched:
                    if row is None:continue
                    for field in ("gp","g","a","pts"):
                        if count(row.get(field),field)!=count(person.get(field),field):
                            conflicts.append({"game":number,"scope":"skaters","name":person["name"],"field":field,
                                              "legacy":count(row.get(field),field),"official":count(person.get(field),field)})
            else:
                for person,row in matched:
                    if row is None:continue
                    for field,sourcefield in (("gp","gp"),("losses","losses"),("goalsAgainst","goalsAgainst")):
                        if count(row.get(field),field)!=count(person.get(sourcefield),sourcefield):
                            conflicts.append({"game":number,"scope":"goalies","name":person["name"],"field":field,
                                              "legacy":count(row.get(field),field),"official":count(person.get(sourcefield),field)})
                    # A known source goalie loss is incompatible with a saved goalie win.
                    if count(person.get("losses"),"OFFICIAL_LOSSES")>0 and count(row.get("wins"),"WINS")>0:
                        conflicts.append({"game":number,"scope":"goalies","name":person["name"],
                                          "field":"winsConflictsWithOfficialLoss","legacy":count(row.get("wins"),"WINS"),
                                          "officialLosses":count(person.get("losses"),"OFFICIAL_LOSSES")})
                    if person.get("potg") is not None and row.get("potg") is not None and count(person["potg"],"HTO_POTG")!=count(row["potg"],"SOURCE_POTG"):
                        conflicts.append({"game":number,"scope":"goalies","name":person["name"],"field":"potg",
                                          "legacy":count(row["potg"],"SOURCE_POTG"),"official":count(person["potg"],"HTO_POTG")})
            counts[f"{number}-{type_}"]={"official":len(data),"legacy":len(existing),
                                           "officialHTOGameId":gid}
    official_sk=sum(x["official"] for k,x in counts.items() if k.endswith("-skaters"))
    official_go=sum(x["official"] for k,x in counts.items() if k.endswith("-goalies"))
    actual_sk=len(workbook["skaters"]);actual_go=len(workbook["goalies"])
    if sum(g["teamGoals"] for g in games)!=6 or sum(g["teamGoalsAgainst"] for g in games)!=19:
        raise ReviewHold("HTO_TEAM_SCORE_SOURCE_BASELINE_CHANGED")
    current_complete=(actual_sk==official_sk and actual_go==official_go and not gap and not conflicts)
    return {"schema":"brave-hc-plan03-legacy-game-log-source-gap/v1",
            "status":"GAME_LOG_INCOMPLETE_HOLD" if not current_complete else "GAME_LOG_PARITY_PASS_REVIEW_ONLY",
            "officialGames":4,
            "officialSkaterGameObservations":official_sk,
            "legacySkaterGameRows":actual_sk,
            "officialGoalieGameObservations":official_go,
            "legacyGoalieGameRows":actual_go,
            "perGame":counts,
            "missingSourceMatches":gap,
            "conflicts":conflicts,
            "skaterRecordedGames":sorted({count(x["game"],"GAME") for x in workbook["skaters"]}),
            "goalieRecordedGames":sorted({count(x["game"],"GAME") for x in workbook["goalies"]}),
            "officialGF":6,"officialGA":19,
            "fullPlayerSeasonProjectionAuthorized":False,
            "fullCareerStreakWatchAuthorized":False,
            "newOfficialRecordPublicationAuthorized":False,
            "originalWorkbookModified":False,
            "futureGame3375682Admitted":False}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--original-workbook",type=Path,required=True)
    p.add_argument("--verified-hto-feed",type=Path,required=True)
    args=p.parse_args()
    feed=json.loads(args.verified_hto_feed.read_text(encoding="utf-8"))
    result=audit(feed,load_xlsx_rows(args.original_workbook))
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
