"""Source-qualified public *preview* adapter for Brave H.C. opponent intelligence.

Input is a private combined game ledger; only seven SVHL division matchup
aggregates are copied to a JSON *preview*. No raw Master Workbook,
player attendance, entire game history, identities under review or private
staging path may appear in published output.

This adapter never pushes GitHub. Use --output to create a review artifact.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone,timedelta
from pathlib import Path
import json,os,sys

SCHEMA="brave-hc-opponent-intelligence/v1"
QUALIFIED="PRIVATE_PARITY_PASS_EXACT_NAMES_ONLY"
ALIAS_REVIEW={"Mohawks HC":"Mohawks H.C.","Sugo Sundays":"Michelob Morts"}
class Hold(ValueError):pass
def read_json(p):return json.loads(Path(p).read_text(encoding="utf8"))

def build(ledger,standings,now=None):
    now=now or datetime.now(timezone.utc)
    if ledger.get("schema")!="brave-hc-online-opponent-ledger/private-v1" or ledger.get("status")!=QUALIFIED:
        raise Hold("PRIVATE_LEDGER_NOT_VERIFIED")
    if (ledger.get("released") is not False or ledger.get("workbookWritten") is not False or
        ledger.get("releaseEligible") is not False):
        raise Hold("LEDGER_GATE_INCONSISTENT")
    c=ledger.get("sourceCounts",{})
    if (c.get("masterGames"),c.get("currentOfficialHTOGames"),c.get("totalGames"))!=(358,5,363):
        raise Hold("ADMITTED_GAME_COUNTS_CHANGED_REQUIRES_NEW_QA")
    try: stamp=datetime.fromisoformat(ledger["sourceHTOStatsReadback"].replace("Z","+00:00"))
    except (KeyError,ValueError,TypeError) as e:raise Hold("HTO_SOURCE_STAMP_INVALID") from e
    if stamp.tzinfo is None or not timedelta(0)<=now-stamp<=timedelta(hours=30):
        raise Hold("OPPONENT_FEED_SOURCE_NOT_FRESH")
    if standings.get("schema")!="brave-hc-svhl-standings/v1" or standings.get("division")!="Cristillo":
        raise Hold("STANDINGS_CONTRACT_NOT_QUALIFIED")
    teams=standings.get("teams")
    if not isinstance(teams,list) or len(teams)!=8 or len({x.get("name") for x in teams})!=8:
        raise Hold("DIVISION_EIGHT_TEAM_IDENTITY_NOT_VERIFIED")
    if standings.get("team")!="Braves HC" or sum(x["name"]=="Braves HC" for x in teams)!=1:
        raise Hold("BRAVES_LEAGUE_IDENTITY_NOT_VERIFIED")
    profiles=ledger.get("profiles")
    if not isinstance(profiles,list):raise Hold("PRIVATE_SOURCE_PROFILES_MISSING")
    indexed={}
    for profile in profiles:
        name=profile.get("opponentExact")
        if not name or name in indexed:raise Hold("PRIVATE_EXACT_IDENTITY_DUPLICATE")
        indexed[name]=profile
    out=[]
    for team in teams:
        name=team["name"]
        if name=="Braves HC":continue
        if name in ALIAS_REVIEW:
            out.append({"name":name,"verification":"ALIAS_REVIEW_REQUIRED","possibleSourceName":ALIAS_REVIEW[name],
                        "message":"Historical name association is unverified; no merged matchup record is displayed."})
            continue
        profile=indexed.get(name)
        if profile is None:
            out.append({"name":name,"verification":"NO_EXACT_HISTORY","message":"No exact-name completed matchup appears in the qualified source history."})
            continue
        if profile.get("identityScope")!="EXACT_MATCH_ONLY":
            raise Hold("UNREVIEWED_OPPONENT_IDENTITY_SQUASH")
        seasons={}
        for key in ("regularSeason","allTime","playoffs"):
            r=profile.get(key)
            if not isinstance(r,dict) or any(not isinstance(r.get(k),int) or r[k]<0 for k in ("gp","w","l","t","gf","ga")):
                raise Hold("INVALID_HISTORICAL_AGGREGATE_"+name)
            if r["gp"]!=r["w"]+r["l"]+r["t"]:raise Hold("HISTORICAL_AGGREGATE_WLT_CONFLICT")
            seasons[key]={key2:r[key2] for key2 in ("gp","w","l","t","gf","ga")}
        last=[]
        for game in profile.get("lastFive",[]):
            if game.get("result") not in ("W","L","T") or not game.get("date"):
                raise Hold("RECENT_GAME_SOURCE_INVALID")
            last.append({"date":game["date"],"result":game["result"],
                         "gf":game["gf"],"ga":game["ga"]})
        out.append({"name":name,"verification":"VERIFIED_EXACT_NAME",
                    "identityScope":"EXACT_NAME_ONLY_NO_UNREVIEWED_ALIASES",
                    "sourceHTOGames":profile.get("sourceHTOGames",0),
                    "regularSeason":seasons["regularSeason"],"allTime":seasons["allTime"],
                    "playoffs":seasons["playoffs"],"lastFive":last})
    if len(out)!=7:raise Hold("OPPONENT_COUNT_NOT_SEVEN")
    return {"schema":SCHEMA,"status":"REVIEW_PREVIEW_ONLY","publishable":False,
            "asOf":ledger["sourceHTOStatsReadback"],
            "workbookScope":"Completed historical games through last saved source; not a live Excel workbook",
            "source": "Original Brave H.C. Master Schedule + official HTO completed game scores, exact opponent names",
            "coverage":{"historicalGameRecords":358,"currentSeasonGames":5,"sourceQualifiedOpponents":sum(x["verification"]=="VERIFIED_EXACT_NAME" for x in out),
                        "aliasesNeedingReview":sum(x["verification"]=="ALIAS_REVIEW_REQUIRED" for x in out),
                        "noExactHistory":sum(x["verification"]=="NO_EXACT_HISTORY" for x in out)},
            "teams":out}

def stage(private,standings,output):
    result=build(read_json(private),read_json(standings))
    out=Path(output);out.parent.mkdir(parents=True,exist_ok=True)
    temp=out.with_suffix(out.suffix+".tmp")
    temp.write_text(json.dumps(result,indent=2)+"\n",encoding="utf8")
    os.replace(temp,out)
    return {"state":result["status"],"coverage":result["coverage"],"file":str(out),"publicWebsiteEdited":False}

def main():
    p=ArgumentParser()
    for x in ("private","standings","output"):p.add_argument("--"+x,required=True)
    a=p.parse_args()
    try:print(json.dumps(stage(a.private,a.standings,a.output)));return 0
    except (Hold,ValueError,OSError,KeyError) as e:
        print(json.dumps({"state":"HOLD","reason":str(e),"publicWebsiteEdited":False}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
