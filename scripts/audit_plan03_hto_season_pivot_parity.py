"""Read-only hockey season pivot QA against verified HTO game-level source.

For a PRIVATE disposable legacy Master Workbook ONLY. No Excel automation,
source editing, remote fetching, publishing, or inference of unknown POTG/PIM.
"""
from __future__ import annotations
import argparse
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json
import re

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
GAMES = (3356177, 3356178, 3369564, 3375601)
PIVOTS = {"PlayerStatsBySeason", "GoalieStatsBySeason"}

class ParityHold(ValueError):
    pass

def integer(value, description):
    if type(value) is not int or value < 0:
        raise ParityHold("INVALID_OFFICIAL_INTEGER_" + description)
    return value

def source_totals(feed):
    if (feed.get("schema") != "brave-hc-hto-verified-game-feed/v1"
        or feed.get("allGamesDiscovered") is not True
        or feed.get("playerAggregateParity") is not True
        or feed.get("teamGP") != 4):
        raise ParityHold("HTO_FEED_INCOMPLETE")
    games=feed.get("games")
    if not isinstance(games,list) or len(games)!=4:
        raise ParityHold("HTO_GAME_COVERAGE_INVALID")
    ids=[g.get("htoGameId") for g in games if isinstance(g,dict)]
    if len(ids)!=4 or len(set(ids))!=4 or set(ids)!=set(GAMES):
        raise ParityHold("UNADMITTED_OR_DUPLICATE_HTO_GAME")
    result={"skaters":defaultdict(lambda:defaultdict(int)),
            "goalies":defaultdict(lambda:defaultdict(int))}
    unknown={"skaterPIM":0,"goaliePOTG":0}
    for g in games:
        for section,keys in (("skaters",("gp","g","a","pts","potg")),
                             ("goalies",("gp","losses","goalsAgainst"))):
            people=g.get(section)
            if not isinstance(people,list):
                raise ParityHold("OFFICIAL_PLAYER_LIST_MISSING")
            names=[p.get("name") for p in people if isinstance(p,dict)]
            if len(names)!=len(people) or len(set(names))!=len(names) or any(not n for n in names):
                raise ParityHold("OFFICIAL_PLAYER_NAME_AMBIGUOUS")
            for p in people:
                for key in keys:
                    result[section][p["name"]][key]+=integer(p.get(key),key)
                if section=="skaters":
                    if p.get("pim") is None:unknown["skaterPIM"]+=1
                elif p.get("potg") is None:
                    unknown["goaliePOTG"]+=1
    if (len(result["skaters"]),len(result["goalies"]))!=(20,3):
        raise ParityHold("EXPECTED_2026_SEASON_PLAYER_COVERAGE_CHANGED")
    if {k:sum(p[k] for p in result["skaters"].values())
        for k in ("gp","g","a","pts","potg")}!={"gp":54,"g":6,"a":10,"pts":16,"potg":9}:
        raise ParityHold("OFFICIAL_2026_SOURCE_TOTALS_CHANGED")
    if {k:sum(p[k] for p in result["goalies"].values())
        for k in ("gp","losses","goalsAgainst")}!={"gp":4,"losses":4,"goalsAgainst":19}:
        raise ParityHold("OFFICIAL_2026_GOALIE_TOTALS_CHANGED")
    return result,unknown

def num(value, field):
    if value in (None,""):return 0
    try:
        n=float(value)
        if not n.is_integer() or n<0:raise ValueError("bad integer")
        return int(n)
    except (TypeError,ValueError,OverflowError) as exc:
        raise ParityHold("NONINTEGER_PIVOT_VALUE_"+field) from exc

def parse_pivots(path:Path):
    with ZipFile(path) as z:
        if z.testzip() is not None:
            raise ParityHold("PIVOT_XLSX_ZIP_CORRUPTED")
        pivot_names=set()
        for p in z.namelist():
            if p.startswith("xl/pivotTables/pivotTable") and p.endswith(".xml"):
                root=ET.fromstring(z.read(p))
                pivot_names.add(root.get("name"))
        if not PIVOTS.issubset(pivot_names):
            raise ParityHold("REQUIRED_OFFICIAL_SEASON_PIVOT_NOT_PRESENT")
        ss=ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings=["".join(t.text or "" for t in el.iter(NS+"t")) for el in ss.findall(NS+"si")]
        skater_rows={};goalie_rows={}
        with z.open("xl/worksheets/sheet10.xml") as stream:
            for _,row in ET.iterparse(stream,events=("end",)):
                if row.tag!=NS+"row":continue
                record={}
                for cell in row.findall(NS+"c"):
                    address=cell.get("r") or ""
                    match=re.match(r"([A-Z]+)",address)
                    if not match or match.group(1) not in {
                        "A","B","C","D","E","F","G","O","CN","CO","CP","CQ","CR","CS","CV","DB"}:continue
                    v=cell.find(NS+"v")
                    if v is None:continue
                    value=v.text
                    if cell.get("t")=="s":
                        value=strings[int(value)]
                    record[match.group(1)]=value
                if record.get("A")=="W2026/27" and record.get("B")=="Regular Season":
                    name=record.get("C")
                    if not name or name in skater_rows:
                        raise ParityHold("DUPLICATE_OR_EMPTY_SKATER_PIVOT_ID")
                    skater_rows[name]={k:num(record.get(col),k) for k,col in
                        (("gp","D"),("g","E"),("a","F"),("pts","G"),("potg","O"))}
                if record.get("CN")=="W2026/27" and record.get("CO")=="Regular Season":
                    name=record.get("CP")
                    if not name or name in goalie_rows:
                        raise ParityHold("DUPLICATE_OR_EMPTY_GOALIE_PIVOT_ID")
                    goalie_rows[name]={k:num(record.get(col),k) for k,col in
                        (("gp","CQ"),("wins","CR"),("losses","CS"),
                         ("goalsAgainst","CV"),("potg","DB"))}
                row.clear()
        return skater_rows,goalie_rows

def reconcile(feed,skater_rows,goalie_rows):
    source,unknown=source_totals(feed)
    diff={"skaters":[],"goalies":[]}
    for section,actual in (("skaters",skater_rows),("goalies",goalie_rows)):
        expected=source[section]
        if set(actual)!=set(expected):
            diff[section].append({"type":"IDENTITY_SET_CONFLICT",
                                  "missing":sorted(set(expected)-set(actual)),
                                  "unverified":sorted(set(actual)-set(expected))})
        for name,values in expected.items():
            if name not in actual:continue
            for field,official in values.items():
                if actual[name].get(field)!=official:
                    diff[section].append({"player":name,"field":field,
                                          "expected":official,"pivot":actual[name].get(field)})
    win_conflicts=[{"player":n,"wins":v["wins"]} for n,v in goalie_rows.items()
                   if v["wins"]!=0]
    basic_skater=not diff["skaters"]
    basic_goalie=not diff["goalies"] and not win_conflicts
    return {"schema":"brave-hc-plan03-pivot-hto-parity/v1",
            "status":("DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED"
                      if basic_skater and basic_goalie else "DISPOSABLE_HTO_PIVOT_PARITY_HELD"),
            "officialGames":4,
            "skaterIdentityCount":len(skater_rows),"goalieIdentityCount":len(goalie_rows),
            "skaterBasicSourceParity":basic_skater,
            "goalieBasicSourceParity":basic_goalie,
            "skaterMismatches":diff["skaters"],
            "goalieMismatches":diff["goalies"],"unverifiedGoalieWinClaims":win_conflicts,
            "unknownHTOFields":unknown,
            "goaliePOTGComplete":unknown["goaliePOTG"]==0,
            "currentPIMRatesCertified":False,
            "awardsAndDroughtsCertified":False,
            "fullWorkbookRecalculationCertified":False,
            "originalWorkbookModified":False,
            "publicPlayerStatsReleaseAuthorized":False,
            "fifthHTOGameAdmitted":False}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--hto-feed",required=True,type=Path)
    p.add_argument("--private-xlsx",required=True,type=Path)
    a=p.parse_args()
    source=json.loads(a.hto_feed.read_text(encoding="utf-8"))
    skaters,goalies=parse_pivots(a.private_xlsx)
    print(json.dumps(reconcile(source,skaters,goalies),ensure_ascii=False,indent=2))

if __name__=="__main__":main()
