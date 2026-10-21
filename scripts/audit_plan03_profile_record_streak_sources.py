"""Plan03 read-only gate for broken Skater Profile record cells and live-stat readiness.

Input: immutable legacy original workbook, separately verified private full-calc
candidate, official four-game HTO source. No Excel COM, network, writes, or
record/adoption decisions. An error cell without original formula cannot be
repaired by inventing a COUNTIF or mapping ledger occurrences to profile labels.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ORIGINAL_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
FULL_CALC_SHA="de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b"
GAME_TO_BOOK={3356177:359,3356178:360,3369564:361,3375601:362}
TYPED_STATS=re.compile(r"\b(?:PIM|GTG|SHG|PPG|SOG|POTG|SHO|Saves?|GAA)\b",re.I)
TRACKED_SHEETS={2:"Awards & Records",6:"Player Projections",7:"Web Streaks",14:"Web Races"}

class SourceHold(ValueError):pass

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def get_strings(archive):
    root=ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return ["".join(t.text or "" for t in si.iter(NS+"t"))
            for si in root.findall(NS+"si")]

def row_cells(row,shared):
    result={}
    for cell in row.findall(NS+"c"):
        addr=cell.get("r")
        if not addr:continue
        v=cell.find(NS+"v");f=cell.find(NS+"f")
        if v is None and f is None:continue
        value=v.text if v is not None else None
        if cell.get("t")=="s" and value is not None:
            try:value=shared[int(value)]
            except (IndexError,ValueError) as exc:raise SourceHold("SHARED_STRING_LOOKUP_FAILED") from exc
        result[re.match(r"[A-Z]+",addr).group()]={"value":value,"formula":f is not None,
                                                    "type":cell.get("t")}
    return result

def read_original(book):
    if sha(book)!=ORIGINAL_SHA:raise SourceHold("ORIGINAL_SOURCE_SHA_DRIFT")
    with ZipFile(book) as z:
        if z.testzip() is not None:raise SourceHold("ORIGINAL_WORKBOOK_BAD_ZIP")
        shared=get_strings(z)
        profile={}
        with z.open("xl/worksheets/sheet13.xml") as src:
            for _,row in ET.iterparse(src,events=("end",)):
                if row.tag!=NS+"row":continue
                rn=int(row.get("r","0"))
                if rn in (2,11,13):
                    items=row_cells(row,shared)
                    if rn==2:profile["player"]=items.get("B",{}).get("value")
                    if rn==11:
                        profile["labelI"]=items.get("I",{}).get("value")
                        profile["labelJ"]=items.get("J",{}).get("value")
                    if rn==13:
                        profile["I13"]=items.get("I")
                        profile["J13"]=items.get("J")
                row.clear()
        rows=[]
        with z.open("xl/worksheets/sheet1.xml") as src:
            for _,row in ET.iterparse(src,events=("end",)):
                if row.tag!=NS+"row":continue
                rn=int(row.get("r","0"))
                if 6<=rn<=114:
                    d=row_cells(row,shared)
                    if d.get("A",{}).get("value"):
                        rows.append({"name":d["A"]["value"],
                                     "rosterStatus":d.get("E",{}).get("value"),
                                     "activeStatus":d.get("F",{}).get("value"),
                                     "activeEligible":d.get("G",{}).get("value"),
                                     "major":d.get("LI",{}).get("value"),
                                     "minor":d.get("LH",{}).get("value"),
                                     "total":d.get("LJ",{}).get("value"),
                                     "points":d.get("LG",{}).get("value")})
                row.clear()
        ledger=[]
        with z.open("xl/worksheets/sheet2.xml") as src:
            for _,row in ET.iterparse(src,events=("end",)):
                if row.tag!=NS+"row":continue
                rn=int(row.get("r","0"))
                if 5<=rn<=3840:
                    d=row_cells(row,shared)
                    if d.get("LV",{}).get("value")==profile.get("player"):
                        ledger.append({"class":d.get("LY",{}).get("value"),
                                       "major":d.get("LZ",{}).get("value"),
                                       "minor":d.get("MA",{}).get("value"),
                                       "points":d.get("MB",{}).get("value")})
                row.clear()
        return {"profile":profile,"roster":rows,"ledger":ledger}

def read_hto(feed):
    if (feed.get("schema")!="brave-hc-hto-verified-game-feed/v1"
        or feed.get("allGamesDiscovered") is not True
        or feed.get("playerAggregateParity") is not True
        or feed.get("teamGP")!=4):
        raise SourceHold("HTO_SOURCE_NOT_VERIFIED")
    games=feed.get("games")
    if not isinstance(games,list) or len(games)!=4 or {g.get("htoGameId") for g in games}!=set(GAME_TO_BOOK):
        raise SourceHold("HTO_FOUR_GAME_ID_COVERAGE_DRIFT")
    latest={}
    for game in games:
        book=GAME_TO_BOOK[game["htoGameId"]]
        for group in ("skaters","goalies"):
            names=[p.get("name") for p in game.get(group,[])]
            if len(names)!=len(set(names)) or not all(isinstance(name,str) and name for name in names):
                raise SourceHold("HTO_PLAYER_GAME_IDENTITY_AMBIGUOUS")
            for name in names:latest[name]=book
    if len(latest)!=23:raise SourceHold("HTO_CURRENT_PLAYER_IDENTITY_BASELINE_CHANGED")
    return latest

def read_candidate(book):
    if sha(book)!=FULL_CALC_SHA:raise SourceHold("FULL_CALCULATED_PRIVATE_SHA_DRIFT")
    with ZipFile(book) as z:
        if z.testzip() is not None:raise SourceHold("FULL_CALC_BAD_ZIP")
        shared=get_strings(z)
        helper=[]
        with z.open("xl/worksheets/sheet7.xml") as src:
            for _,row in ET.iterparse(src,events=("end",)):
                if row.tag!=NS+"row":continue
                rn=int(row.get("r","0"))
                if 4<=rn<=53:
                    d=row_cells(row,shared)
                    if d.get("M",{}).get("value"):
                        helper.append({"name":d["M"]["value"],"sourceType":d.get("L",{}).get("value"),
                                       "latestGame":d.get("N",{}).get("value"),
                                       "latestRowFound":d.get("P",{}).get("value"),
                                       "watchDetail":d.get("V",{}).get("value")})
                row.clear()
        dependencies={}
        for sheet,name in TRACKED_SHEETS.items():
            count=Counter()
            with z.open(f"xl/worksheets/sheet{sheet}.xml") as src:
                for _,row in ET.iterparse(src,events=("end",)):
                    if row.tag!=NS+"row":continue
                    for c in row.findall(NS+"c"):
                        f=c.find(NS+"f")
                        if f is None:continue
                        formula=f.text or ""
                        count["formulas"]+=1
                        if "SkaterStatsByGame" in formula or "GoalieStatsByGame" in formula:
                            count["directGameLogFormulas"]+=1
                        if TYPED_STATS.search(formula):
                            count["mentionsPIMorOtherPotentiallyIncompleteStat"]+=1
                        if "RecordLedger" in formula or "RecordSetup" in formula or "RecordWide" in formula:
                            count["legacyRecordModelReferences"]+=1
                    row.clear()
            dependencies[name]=dict(count)
        return {"helper":helper,"dependencyCounts":dependencies}

def evaluate(original,candidate,latest):
    profile=original["profile"]
    if profile.get("player")!="Brutto, Adam" or (profile.get("labelI"),profile.get("labelJ"))!=("Active Records","Total Records"):
        raise SourceHold("ORIGINAL_PROFILE_FIELD_IDENTITY_CHANGED")
    for cell in ("I13","J13"):
        v=profile.get(cell)
        if not isinstance(v,dict) or v["value"]!="#REF!" or v["type"]!="e" or v["formula"] is not False:
            raise SourceHold("ORIGINAL_PROFILE_REF_CELL_NO_LONGER_MATCHES_BASELINE")
    users={r["name"]:r for r in original["roster"]}
    player=users.get(profile["player"])
    if not player:raise SourceHold("PROFILE_NOT_FOUND_IN_PLAYER_INFO")
    if any(str(player[key])!=expected for key,expected in
           (("major","15"),("minor","13"),("total","28"),("points","196"))):
        raise SourceHold("PLAYERINFO_LEGACY_RECORD_METRICS_CHANGED")
    classes=Counter(r["class"] for r in original["ledger"])
    if classes!={"Major":15,"Minor":13,"Display":51}:
        raise SourceHold("RECORD_LEDGER_CLASSIFICATION_CHANGED")
    if (sum(int(float(r["major"] or 0)) for r in original["ledger"])!=15
        or sum(int(float(r["minor"] or 0)) for r in original["ledger"])!=13
        or sum(int(float(r["points"] or 0)) for r in original["ledger"])!=196):
        raise SourceHold("LEGACY_RECORD_LEDGER_FLAGS_DO_NOT_RECONCILE")
    helpers=candidate["helper"]
    names=[r["name"] for r in helpers]
    if len(names)!=len(set(names)):raise SourceHold("DUPLICATE_WEBSTREAKS_HELPER_NAME")
    matching=[row for row in helpers if row["name"] in latest]
    mismatches=[{"name":r["name"],"latestHTO":latest[r["name"]],"workbook":r["latestGame"]}
                for r in matching if str(r["latestGame"])!=str(latest[r["name"]]) or str(r["latestRowFound"])!="1"]
    if mismatches:raise SourceHold("WEB_STREAKS_BOUND_SOURCE_LATEST_GAME_MISMATCH")
    missing=sorted(set(latest)-set(names))
    extra=sorted(set(names)-set(latest))
    if (len(helpers),len(matching),missing,extra)!=(24,21,["Carlyle, Adam","Pavaday, Damian"],
      ["Congiusti, Marco","Mazzei, Stefano","Svec, Matt"]):
        raise SourceHold("WEB_STREAKS_SOURCE_COVERAGE_CHANGED")
    if any(name in users for name in missing):
        raise SourceHold("MISSING_HELPER_PLAYER_NOW_EXISTS_IN_LEGACY_ROSTER")
    return {
      "schema":"brave-hc-plan03-profile-record-streak-source-review/v1",
      "status":"RECORD_PROFILE_REF_UNRESOLVED_STREAK_LATEST_BOUNDED_PASS",
      "profile":{"name":profile["player"],"brokenFields":["I13:Active Records","J13:Total Records"],
                 "originalFormulaTextAvailable":False,
                 "legacyHolderEntries":28,"majorHolderEntries":15,"minorHolderEntries":13,
                 "displayOnlyLedgerEntries":51,"legacyLedgerRows":79,"legacyRecordPoints":196,
                 "activeRecordsDefinitionIndependentlyCertified":False,
                 "totalRecordsProfileFormulaRecreated":False,
                 "currentHTORecordBookReconciledToLegacyModel":False},
      "streaks":{"verifiedHTOPlayerNames":len(latest),"matchingHelperRows":len(matching),
                 "latestGameMismatches":0,"missingFromLegacyRosterAndHelper":missing,
                 "historicalCurrentEligibleHelperPlayersOutsideFourGameFeed":extra,
                 "allCurrentSeasonPlayersEligibleOrRepresented":False,
                 "liveCareerStreaksAndDroughtsCertified":False},
      "downstreamFormulaDependencies":candidate["dependencyCounts"],
      "originalWorkbookModified":False,
      "historicalRecordBookEdited":False,
      "publicRecordsOrAwardsPublished":False,
      "upcomingHTOGame3375682Admitted":False,
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--original-workbook",type=Path,required=True)
    p.add_argument("--private-full-calculation",type=Path,required=True)
    p.add_argument("--verified-hto-feed",type=Path,required=True)
    a=p.parse_args()
    original=read_original(a.original_workbook)
    checked=read_candidate(a.private_full_calculation)
    latest=read_hto(json.loads(a.verified_hto_feed.read_text(encoding="utf-8")))
    print(json.dumps(evaluate(original,checked,latest),indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
