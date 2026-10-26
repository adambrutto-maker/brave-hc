"""Dynamic exact-name-only Brave H.C. opponent release: private inputs, public totals.

Recomputes and crosschecks source game history against the protected Master
Workbook + authoritative HTO Scores/Stats *every run*, including new game IDs.
No guessed opponent aliases, raw private player rows or formula modifications.
"""
from __future__ import annotations
from argparse import ArgumentParser
from collections import defaultdict
from datetime import datetime,timezone
from pathlib import Path
import json,os,sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_private_online_opponent_ledger import reconcile,Hold as SourceHold
from build_public_opponent_preview import Hold
MASTER_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
# The league can reassign division opponents during the season.
# Membership is from current SVHL, identities/history from the Workbook + HTO.
ALIAS_HOLD={"Mohawks HC","Sugo Sundays"}
def require(ok,message):
 if not ok:raise Hold(message)
def load(p):return json.loads(Path(p).read_text(encoding="utf-8-sig"))
def stats(rows):
 return {"gp":len(rows),"w":sum(r["result"]=="W" for r in rows),
         "l":sum(r["result"]=="L" for r in rows),
         "t":sum(r["result"]=="T" for r in rows),
         "gf":sum(r["bravesGF"] for r in rows),
         "ga":sum(r["bravesGA"] for r in rows)}
def build(master,scores,official_stats,prior_four,league):
 source=reconcile(master,scores,official_stats,prior_four)
 counts=source["sourceCounts"]
 require(source["schema"]=="brave-hc-online-opponent-ledger/private-v1" and
         source["status"]=="PRIVATE_PARITY_PASS_EXACT_NAMES_ONLY" and
         source["released"] is False and source["releaseEligible"] is False and
         source["workbookWritten"] is False,
         "UNRELEASED_OR_TAMPERED_PRIVATE_LEDGER")
 require(source["sourceMasterSHA256"]==MASTER_SHA and len(master["games"])==358,
         "HISTORICAL_CANONICAL_SOURCE_CHANGED")
 require(counts["currentOfficialHTOGames"]>=5 and counts["totalGames"]==358+counts["currentOfficialHTOGames"],
         "HTO_GAME_COUNT_NOT_ADMITTED")
 require(counts["currentSeasonGP"]==counts["currentOfficialHTOGames"] and
         counts["currentSeasonGF"]==sum(g["bravesGF"] for g in source["currentGames"]) and
         counts["currentSeasonGA"]==sum(g["bravesGA"] for g in source["currentGames"]),
         "HTO_TEAM_STATS_VS_SOURCE_SCORE_MISMATCH")
 if league.get("schema")!="brave-hc-svhl-standings/v1" or league.get("division")!="Cristillo" or league.get("team")!="Braves HC":
  raise Hold("SVHL_DIVISION_SOURCE_NOT_QUALIFIED")
 teams=league.get("teams",[])
 require(isinstance(teams,list) and len(teams)==8 and
         len({t.get("name") for t in teams})==8 and
         all(isinstance(t.get("name"),str) and t["name"].strip() for t in teams) and
         sum(t["name"]=="Braves HC" for t in teams)==1,
         "DIVISION_TEAM_NAME_SCOPE_CHANGED")
 division=tuple(t["name"] for t in teams if t["name"]!="Braves HC")
 events=[{"date":g["date"],"result":g["result"],
          "opponentExact":g["opponentExact"],"type":g["type"],
          "bravesGF":g["bravesGF"],"bravesGA":g["bravesGA"],"source":"MASTER"}
          for g in master["games"]]
 events += [{"date":g["date"],"result":g["result"],
             "opponentExact":g["opponentExact"],"type":g["type"],
             "bravesGF":g["bravesGF"],"bravesGA":g["bravesGA"],"source":"HTO"}
             for g in source["currentGames"]]
 require(len(events)==counts["totalGames"],"LEDGER_EVENT_COUNT_CHANGED")
 allnames=defaultdict(list)
 for g in events:
  require(g["result"] in ("W","L","T") and g["type"] in ("Regular Season","Playoffs"),
          "INVALID_GAME_SCOPE")
  allnames[g["opponentExact"]].append(g)
 privateProfile={x["opponentExact"]:x for x in source["profiles"]}
 require(len(privateProfile)==counts["exactOpponentIdentities"],"SOURCE_PROFILE_NAME_DUPLICATE")
 output=[]
 for name in division:
  if name in ALIAS_HOLD:
   output.append({"name":name,"verification":"ALIAS_REVIEW_REQUIRED",
                  "message":"Historical team identity requires reviewed name/alias evidence. No inferred franchise matchup record is displayed."})
   continue
  games=sorted(allnames.get(name,[]),key=lambda x:x["date"])
  if not games:
   output.append({"name":name,"verification":"NO_EXACT_HISTORY",
                  "message":"No completed Brave H.C. meeting under this exact opponent name has been admitted to the verified source ledger."})
   continue
  rs=stats([g for g in games if g["type"]=="Regular Season"])
  alltime=stats(games)
  playoffs=stats([g for g in games if g["type"]=="Playoffs"])
  hist=privateProfile.get(name)
  require(hist and hist.get("identityScope")=="EXACT_MATCH_ONLY" and
          hist.get("regularSeason")==rs and hist.get("allTime")==alltime and hist.get("playoffs")==playoffs,
          "PRIVATE_PROFILE_AND_INDEPENDENT_RAW_EVENTS_DISAGREE_"+name)
  last=[{"date":g["date"],"result":g["result"],
         "gf":g["bravesGF"],"ga":g["bravesGA"]} for g in games[-5:]]
  output.append({"name":name,"verification":"VERIFIED_EXACT_NAME",
                 "identityScope":"EXACT_NAME_ONLY_NO_UNREVIEWED_ALIASES",
                 "sourceHTOGames":sum(g["source"]=="HTO" for g in games),
                 "regularSeason":rs,"allTime":alltime,"playoffs":playoffs,"lastFive":last})
 require(len(output)==7,"EXPECTED_SEVEN_DIVISION_OPPONENTS")
 meta={"historicalGameRecords":358,"currentSeasonGames":counts["currentOfficialHTOGames"],
       "sourceQualifiedOpponents":sum(x["verification"]=="VERIFIED_EXACT_NAME" for x in output),
       "aliasesNeedingReview":sum(x["verification"]=="ALIAS_REVIEW_REQUIRED" for x in output),
       "noExactHistory":sum(x["verification"]=="NO_EXACT_HISTORY" for x in output)}
 meta["currentDivisionOpponents"]=len(division)
 require(meta["aliasesNeedingReview"]==len(set(division)&ALIAS_HOLD),
         "UNREVIEWED_ALIAS_SCOPE_NOT_HELD")
 return {"schema":"brave-hc-opponent-intelligence/v1",
         "status":"PUBLIC_VERIFIED_EXACT_ONLY","publishable":True,
         "asOf":source["sourceHTOStatsReadback"],
         "source":"Canonical Brave H.C. Master Schedule plus completed official HTO game scores. Historical exact-name matches only.",
         "releaseScope":"VERIFIED_EXACT_NAMES_ONLY; no inferred aliases",
         "workbookScope":"Private Master Workbook preserved. Not an online editable workbook.",
         "generatedAt":datetime.now(timezone.utc).isoformat(),
         "coverage":meta,"teams":output}
def stage(master,scores,stats_source,verified,standings,output):
 result=build(*(load(p) for p in (master,scores,stats_source,verified,standings)))
 out=Path(output);out.parent.mkdir(parents=True,exist_ok=True)
 temp=out.with_suffix(out.suffix+".tmp")
 temp.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
 os.replace(temp,out)
 return {"status":result["status"],"scope":result["coverage"],
         "output":str(out),"originalWorkbookWritten":False}
def main():
 p=ArgumentParser()
 for name in ("master","scores","stats","verified","standings","output"):p.add_argument("--"+name,required=True)
 a=p.parse_args()
 try:print(json.dumps(stage(a.master,a.scores,a.stats,a.verified,a.standings,a.output)));return 0
 except (SourceHold,Hold,KeyError,TypeError,ValueError,OSError) as exc:
  print(json.dumps({"status":"SOURCE_HOLD","reason":str(exc),"publicFeedUpdated":False}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
