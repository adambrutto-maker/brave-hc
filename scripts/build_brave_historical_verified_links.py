"""Publish privacy-minimal, independently date/score-matched historical Brave game summaries.

Source is a PRIVATE accepted per-game dual-source review against public SVHL
archived TeamInfo; outputs only admitted game team/date/score facts.
No player IDs, workbook paths, hypothetical franchise links or failed joins.
"""
from __future__ import annotations
from argparse import ArgumentParser
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from collections import defaultdict
from datetime import datetime
from hashlib import sha256
import json,re,sys
MASTER_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
SCHEMA="brave-hc-source-matched-historical-team-seasons/v1"
class HistoricalReleaseHold(ValueError):pass
def need(ok,why):
 if not ok:raise HistoricalReleaseHold("ARCHIVED_GAME_PUBLIC_HOLD:"+why)
def record(games):
 return {"gp":len(games),"w":sum(g["result"]=="W" for g in games),
         "l":sum(g["result"]=="L" for g in games),
         "t":sum(g["result"]=="T" for g in games),
         "gf":sum(g["bravesGF"] for g in games),
         "ga":sum(g["bravesGA"] for g in games)}
def convert(private,bytehash):
 need(private.get("schema")=="brave-hc-archived-official-games/private-parity-v1" and
      private.get("status")=="PRIVATE_SOURCE_CHECKED_GAME_JOINS_NOT_FRANCHISE_CONTINUITY" and
      private.get("masterSourceSHA256")==MASTER_SHA and
      private.get("publicWritten") is False and
      private.get("originalWorkbookWritten") is False and
      private.get("pagesHeld")==0 and
      private.get("candidatesReviewed")==len(private.get("reviewedSameSeasonTeams",[])),
      "PRIVATE_PARITY_NOT_QUALIFIED")
 groups=[]
 for item in private["reviewedSameSeasonTeams"]:
  games=item["admittedGames"]
  if not games:continue
  need(item["admittedCount"]==len(games) and item["admittedCount"]+
       item["heldCount"]==item["masterSameSeasonGameCount"],"PRIVATE_GAME_COUNTS_DRIFT")
  url=item["officialSource"];u=urlparse(url);q=parse_qs(u.query)
  need(u.scheme=="https" and u.hostname=="leagues.sportsvillage.ca" and
       u.path=="/TeamInfo.aspx" and
       q.get("leagueid")==[str(item["officialLeagueId"])] and
       q.get("teamid")==[str(item["officialLeagueSeasonTeamId"])] and
       re.fullmatch(r"[0-9a-f]{64}",item["officialPageSHA256"]),
       "OFFICIAL_SOURCE_OR_HASH_UNVERIFIED")
  vetted=[]
  for g in games:
   need(g["sourceOfficialScoreStatus"]=="REPORTED_NONZERO" and
        g["officialOpponentName"].lower().replace(".","").replace("/","").replace(" ","") in
          ("bravehc","braveshc") and
        g["result"] in ("W","L","T") and
        g["bravesGF"]>=0 and g["bravesGA"]>=0 and
        (("W" if g["bravesGF"]>g["bravesGA"] else
          "L" if g["bravesGF"]<g["bravesGA"] else "T")==g["result"]),
        "GAME_SCORE_NOT_DUAL_SOURCE_CONCORDANT")
   datetime.fromisoformat(g["date"])
   vetted.append({"date":g["date"],"gf":g["bravesGF"],"ga":g["bravesGA"],
                 "result":g["result"]})
  need(len({x["date"] for x in vetted})==len(vetted),"SAME_DATE_GAME_AMBIGUITY")
  groups.append({
   "season":item["season"],"officialLeagueId":item["officialLeagueId"],
   "officialTeamSeasonId":item["officialLeagueSeasonTeamId"],
   "officialTeamName":item["officialTeamName"],
   "officialDivision":item["officialDivision"],
   "officialTeamPage":url,"officialTeamPageSHA256":item["officialPageSHA256"],
   "bravesRecord":record(games),"games":vetted,
   "qualification":"SAME_SEASON_MASTER_VS_OFFICIAL_TEAMINFO_DATE_OPPONENT_SCORE",
   "continuousFranchiseNotVerified":True})
 result={
  "schema":SCHEMA,"status":"DUAL_SOURCE_VERIFIED_HISTORICAL_GAMES_SEASON_SCOPED",
  "privateAuditSHA256":bytehash,"sourceMasterSHA256":MASTER_SHA,
  "reviewedSameSeasonCandidates":private["candidatesReviewed"],
  "matchedGameCount":sum(g["bravesRecord"]["gp"] for g in groups),
  "heldGameComparisons":private["heldGameComparisons"],
  "matchedTeamSeasonGroups":len(groups),
  "teamSeasons":groups,
  "identityNotice":"Game dates and scores checked against archived official Sports Village TeamInfo and immutable Brave H.C. Master. This verifies games in specific seasons only; it does NOT connect historical team rosters to 2026/27 teams.",
  "sourcePrivacy":"TEAM_SEASON_AND_SCORES_ONLY_NO_PLAYER_DATA",
  "independentCurrentFormSource":"league-intelligence.json",
  "currentContextNotModified":True}
 need(result["matchedGameCount"]==private["admittedGameComparisons"],
      "GAME_COUNT_DIVERGENCE")
 return result
def validate(doc):
 need(doc.get("schema")==SCHEMA and
      doc.get("status")=="DUAL_SOURCE_VERIFIED_HISTORICAL_GAMES_SEASON_SCOPED" and
      doc.get("sourceMasterSHA256")==MASTER_SHA and
      doc.get("currentContextNotModified") is True and
      doc.get("sourcePrivacy")=="TEAM_SEASON_AND_SCORES_ONLY_NO_PLAYER_DATA" and
      re.fullmatch(r"[0-9a-f]{64}",doc.get("privateAuditSHA256","")) is not None,
      "PUBLIC_HISTORICAL_SOURCE_SCOPE_INVALID")
 groups=doc.get("teamSeasons")
 need(isinstance(groups,list) and len(groups)==doc.get("matchedTeamSeasonGroups") and
      len(groups)<=120,"HISTORICAL_GROUP_COUNT_INVALID")
 keys=set();count=0
 for g in groups:
  name=(g["season"],g["officialLeagueId"],g["officialTeamSeasonId"])
  need(name not in keys,"DUPLICATE_HISTORICAL_TEAM_SEASON")
  keys.add(name)
  url=urlparse(g["officialTeamPage"]);p=parse_qs(url.query)
  need(url.scheme=="https" and url.hostname=="leagues.sportsvillage.ca" and
       url.path=="/TeamInfo.aspx" and
       p.get("leagueid")==[str(g["officialLeagueId"])] and
       p.get("teamid")==[str(g["officialTeamSeasonId"])] and
       re.fullmatch(r"[0-9a-f]{64}",g["officialTeamPageSHA256"]) is not None and
       g["continuousFranchiseNotVerified"] is True and
       g["qualification"]=="SAME_SEASON_MASTER_VS_OFFICIAL_TEAMINFO_DATE_OPPONENT_SCORE",
       "HISTORICAL_GAME_IDENTITY_PROOF_INVALID")
  games=g["games"];r=g["bravesRecord"]
  need(len(games)==r["gp"] and r["gp"]>=1 and
       r["gp"]==r["w"]+r["l"]+r["t"] and
       r["gf"]==sum(x["gf"] for x in games) and
       r["ga"]==sum(x["ga"] for x in games) and
       r["w"]==sum(x["result"]=="W" for x in games) and
       r["l"]==sum(x["result"]=="L" for x in games) and
       r["t"]==sum(x["result"]=="T" for x in games),
       "HISTORICAL_GAME_AGGREGATE_MISMATCH")
  count+=r["gp"]
 need(count==doc.get("matchedGameCount") and count<=358 and
      doc.get("heldGameComparisons",0)>=0,
      "HISTORICAL_PUBLIC_GAME_COUNT_BAD")
 return True
def main():
 p=ArgumentParser()
 p.add_argument("--private",required=True);p.add_argument("--out",required=True)
 a=p.parse_args()
 try:
  payload=Path(a.private).read_bytes()
  doc=convert(json.loads(payload.decode("utf-8-sig")),sha256(payload).hexdigest())
  validate(doc)
  path=Path(a.out);path.parent.mkdir(parents=True,exist_ok=True)
  path.write_text(json.dumps(doc,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
  print(json.dumps({"status":"DUAL_SOURCE_HISTORICAL_GAME_PUBLIC_CANDIDATE",
                    "games":doc["matchedGameCount"],"groups":len(doc["teamSeasons"]),
                    "held":doc["heldGameComparisons"]}))
  return 0
 except (HistoricalReleaseHold,OSError,ValueError,TypeError,KeyError) as e:
  print(json.dumps({"status":"HOLD","reason":str(e),"candidateNotPublished":True}),file=sys.stderr)
  return 2
if __name__=="__main__":sys.exit(main())
