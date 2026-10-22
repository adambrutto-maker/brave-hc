"""HockeyOS Plan03 read-only AwardScoring source-completeness release gate.

Checks known HTO four-game missing fields against the *private* calculated
legacy Excel AwardScoring input/output table. Cached scores from formulas
are NOT proof of current, complete or eligible awards.
"""
from __future__ import annotations
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile
import argparse
import hashlib
import json
import re

NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
EXPECTED_SHA="de93af5c963dd752a596295b7ad78c5112abc18368e818cd6fd335376a78276b"
GAME_IDS={3356177,3356178,3369564,3375601}
TABLE_NAME="AwardScoring"
TABLE_RANGE="FJ5:KY55"
REQUIRED_FIELDS={
    "FJ":"Name","FP":"Award Scoring Type","FQ":"Current Roster Status",
    "GG":"Playoff Final PIM Web Display Score",
    "GH":"Total Final PIM Web Display Score",
    "GK":"Playoff Award POTG Web Display Score",
    "GL":"Total Award POTG Web Display Score",
    "HY":"Playoff Final PIM Internal Score",
    "HZ":"Total Final PIM Internal Score",
    "IC":"Playoff Award POTG Internal Score",
    "ID":"Total Award POTG Internal Score",
    "JD":"Hart Eligible","JI":"Conn Smythe Eligible",
    "JN":"Norris Eligible","JS":"Art Ross Eligible",
    "JW":"Rocket Richard Eligible","KA":"Rookie Eligible",
    "KF":"Lady Byng Eligible","KK":"Most Improved Eligible",
    "KP":"Rolaids Eligible","KU":"Dedication Eligible",
}
TRACKED_SCORE_COLS=("GG","GH","GK","GL","HY","HZ","IC","ID")
SCORING_ELIGIBILITY_COLS=("JD","JI","JN","JS","JW","KA","KF","KK","KP","KU")

class AwardSourceHold(ValueError):pass

def col_number(value):
    n=0
    for char in value:n=n*26+ord(char)-64
    return n

def source_coverage(feed):
    if (feed.get("schema")!="brave-hc-hto-verified-game-feed/v1"
        or feed.get("teamGP")!=4
        or feed.get("allGamesDiscovered") is not True
        or feed.get("playerAggregateParity") is not True):
        raise AwardSourceHold("HTO_GAME_FEED_NOT_VERIFIED")
    games=feed.get("games")
    if not isinstance(games,list) or len(games)!=4:
        raise AwardSourceHold("HTO_GAME_COUNT_CHANGED")
    ids=[g.get("htoGameId") for g in games if isinstance(g,dict)]
    if len(ids)!=4 or len(set(ids))!=4 or set(ids)!=GAME_IDS:
        raise AwardSourceHold("HTO_GAME_IDENTITIES_CHANGED")
    skater_total=goalie_total=skater_missing=goalie_missing=0
    for g in games:
        for section in ("skaters","goalies"):
            players=g.get(section)
            if not isinstance(players,list):
                raise AwardSourceHold("HTO_PLAYER_STATS_NOT_LIST")
            names=[p.get("name") for p in players if isinstance(p,dict)]
            if len(names)!=len(players) or len(set(names))!=len(names) or any(not isinstance(n,str) or not n for n in names):
                raise AwardSourceHold("HTO_PLAYER_IDENTITY_INVALID")
            for p in players:
                if section=="skaters":
                    skater_total+=1
                    if p.get("pim") is None:skater_missing+=1
                else:
                    goalie_total+=1
                    if p.get("potg") is None:goalie_missing+=1
    if (skater_total,goalie_total,skater_missing,goalie_missing)!=(54,4,42,1):
        raise AwardSourceHold("HTO_SCORING_FIELD_COVERAGE_CHANGED")
    return {"officialSkaterObservations":skater_total,
            "officialGoalieObservations":goalie_total,
            "unknownSkaterPIM":skater_missing,
            "unknownGoaliePOTG":goalie_missing}

def read_awardscoring(path):
    if hashlib.sha256(path.read_bytes()).hexdigest()!=EXPECTED_SHA:
        raise AwardSourceHold("IMMUTABLE_PRIVATE_CALC_SHA_CHANGED")
    with ZipFile(path) as z:
        if z.testzip() is not None:raise AwardSourceHold("AWARD_WORKBOOK_ZIP_CORRUPT")
        table=ET.fromstring(z.read("xl/tables/table5.xml"))
        if table.get("displayName")!=TABLE_NAME or table.get("ref")!=TABLE_RANGE:
            raise AwardSourceHold("AWARDS_TABLE_BOUNDARY_CHANGED")
        start=col_number("FJ")
        columns=table.find(NS+"tableColumns")
        fields=[f.get("name") for f in columns.findall(NS+"tableColumn")]
        if len(fields)!=146:
            raise AwardSourceHold("AWARDS_FIELD_COUNT_CHANGED")
        for col,expected in REQUIRED_FIELDS.items():
            if fields[col_number(col)-start]!=expected:
                raise AwardSourceHold("AWARDS_CRITICAL_FIELD_HEADER_CHANGED_"+col)
        ss=ET.fromstring(z.read("xl/sharedStrings.xml"))
        texts=["".join(t.text or "" for t in si.iter(NS+"t")) for si in ss.findall(NS+"si")]
        byrow=[]
        all_required=set(REQUIRED_FIELDS)
        with z.open("xl/worksheets/sheet2.xml") as fh:
            for _,row in ET.iterparse(fh,events=("end",)):
                if row.tag!=NS+"row":continue
                number=int(row.get("r","0"))
                if not 6<=number<=55:
                    row.clear();continue
                data={}
                formula_fields=set()
                for cell in row.findall(NS+"c"):
                    match=re.match(r"^([A-Z]+)(\d+)$",cell.get("r",""))
                    if not match:continue
                    col=match.group(1)
                    if col not in all_required:continue
                    formula=cell.find(NS+"f")
                    value=cell.find(NS+"v")
                    if formula is not None:formula_fields.add(col)
                    if value is None:continue
                    raw=value.text
                    if cell.get("t")=="s":raw=texts[int(raw)]
                    data[col]=raw
                if formula_fields!=all_required:
                    raise AwardSourceHold("AWARDS_ROW_FORMULA_COVERAGE_CHANGED")
                byrow.append({"row":number,"data":data})
                row.clear()
        if len(byrow)!=50:
            raise AwardSourceHold("AWARDS_TABLE_DATA_ROWS_CHANGED")
        return byrow

def classify(coverage,rows):
    if (coverage.get("officialSkaterObservations")!=54
        or coverage.get("officialGoalieObservations")!=4
        or coverage.get("unknownSkaterPIM")!=42
        or coverage.get("unknownGoaliePOTG")!=1):
        raise AwardSourceHold("OFFICIAL_SCORING_COMPLETENESS_CHANGED")
    if not isinstance(rows,list) or len(rows)!=50:
        raise AwardSourceHold("AWARDS_SCORING_TABLE_CHANGED")
    names=[]
    statuses=Counter()
    nonzero=Counter()
    eligible_rows=Counter()
    for row in rows:
        d=row.get("data")
        if not isinstance(d,dict):raise AwardSourceHold("AWARDS_SCORING_ROW_MALFORMED")
        if d.get("FJ"):
            name=d["FJ"]
            if not isinstance(name,str) or not name.strip():
                raise AwardSourceHold("AWARDS_PLAYER_NAME_NOT_VERIFIED")
            names.append(name)
            statuses[d.get("FQ","")]+=1
            for col in TRACKED_SCORE_COLS:
                value=d.get(col)
                if value not in (None,"", "0"):
                    try:numeric=float(value)
                    except (ValueError,TypeError) as exc:raise AwardSourceHold("AWARDS_SCORING_CACHE_NONNUMERIC") from exc
                    if numeric!=0:nonzero[col]+=1
            for col in SCORING_ELIGIBILITY_COLS:
                val=d.get(col)
                if val not in (None,"","0"):
                    try:n=float(val)
                    except (ValueError,TypeError) as exc:raise AwardSourceHold("AWARDS_ELIGIBILITY_NOT_NUMERIC") from exc
                    if n!=0:eligible_rows[col]+=1
    if len(names)!=24 or len(set(names))!=24 or statuses!={"DI":2,"CU":8,"FT":14}:
        raise AwardSourceHold("LEGACY_AWARD_ELIGIBILITY_ROSTER_CHANGED")
    if any(nonzero[x]!=24 for x in ("GH","GL","HZ","ID")):
        raise AwardSourceHold("AWARDS_CACHED_SOURCE_COMPONENT_BASELINE_CHANGED")
    if eligible_rows["JS"]!=21 or eligible_rows["JW"]!=21:
        raise AwardSourceHold("AWARDS_ELIGIBILITY_SOURCE_BASELINE_CHANGED")
    return {
      "schema":"brave-hc-plan03-awards-source-completeness/v1",
      "status":"AWARDS_CACHED_COMPONENTS_PRESENT_OFFICIAL_SOURCE_INCOMPLETE_HOLD",
      "currentHTOObservationCoverage":coverage,
      "legacyAwardScoring":{"definedTableRange":TABLE_RANGE,"columnCount":146,
        "tableRows":50,"namedEntries":len(names),"distinctNames":len(set(names)),
        "rosterStatusCounts":dict(statuses),
        "nonzeroCachedComponentRows":dict(nonzero),
        "nonzeroEligibilityFlags":dict(eligible_rows)},
      "sourceWarning":"Nonzero cached scores and eligibility flags may include historical seasons or missing-field zero handling; they do not prove accurate 2026/27 awards.",
      "PIMWebAndInternalComponentsPresent":True,
      "POTGWebAndInternalComponentsPresent":True,
      "legacyRookieAndAwardEligibilityRulesPresent":True,
      "currentSeasonManualFieldCompletenessCertified":False,
      "currentSeasonAwardScoringCertified":False,
      "recordBookAndCareerMilestonesCertifiedByAwardScoring":False,
      "nomineesOrWinnersApproved":False,
      "originalMasterWorkbookModified":False,
      "publicAwardsOrLiveWatchChanged":False,
      "fifthFutureHTOGame3375682Admitted":False
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--verified-hto-feed",required=True,type=Path)
    p.add_argument("--private-calculated-workbook",required=True,type=Path)
    args=p.parse_args()
    feed=json.loads(args.verified_hto_feed.read_text(encoding="utf-8"))
    result=classify(source_coverage(feed),read_awardscoring(args.private_calculated_workbook))
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":main()
