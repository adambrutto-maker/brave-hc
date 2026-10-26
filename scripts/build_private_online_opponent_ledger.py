"""Build a private online-ready Brave H.C. game ledger from official HTO source cards.

Historical workbook stays read-only; newly completed games are supplied by an
independent native HTO Scores source with verified game IDs and score/periods.
All publication and unreviewed alias changes remain explicitly blocked.
"""
from __future__ import annotations
from argparse import ArgumentParser
from collections import defaultdict
from datetime import datetime,timezone,timedelta
from pathlib import Path
import json,os,re,sys

MASTER_HASH="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
AUDITED_FOUR={3356177:("2026-09-20","Dateline Predators",0,3),
              3356178:("2026-09-27","Mohawks H.C.",3,6),
              3369564:("2026-10-04","Michelob Morts",2,3),
              3375601:("2026-10-18","Zamboner Crew",1,7)}
class Hold(ValueError):pass
def load(p):return json.loads(Path(p).read_text(encoding="utf-8-sig"))

def reconcile(master,hto,readback,verified,now=None):
    now=now or datetime.now(timezone.utc)
    if master.get("schema")!="brave-hc-opponent-master-history-stage/v1" or master.get("status")!="PRIVATE_HISTORICAL_REVIEW_ONLY" or master.get("published") is not False:
        raise Hold("HISTORICAL_MASTER_STAGE_NOT_QUALIFIED")
    if master.get("source",{}).get("sha256")!=MASTER_HASH or master.get("originalWorkbookWritten") is not False:
        raise Hold("HISTORICAL_MASTER_SOURCE_HASH_CHANGED")
    historical=master.get("games")
    if not isinstance(historical,list) or len(historical)!=358 or master.get("counts",{}).get("completedHistorical")!=len(historical):
        raise Hold("MASTER_HISTORICAL_BASELINE_CHANGED")
    if hto.get("schema")!="brave-hc-hto-completed-score-evidence/private-v1" or hto.get("status")!="PRIVATE_SOURCE_ONLY" or hto.get("publicationAuthorized") is not False:
        raise Hold("HTO_COMPLETED_SCORE_SOURCE_NOT_QUALIFIED")
    completed=hto.get("games",[])
    if len(completed)<5 or len(completed)!=hto.get("sourceGamesCount"):
        raise Hold("HTO_COMPLETED_GAME_COVERAGE_INCOMPLETE")
    ids=[g.get("htoGameId") for g in completed]
    if any(not isinstance(x,int) or x<=0 for x in ids) or len(set(ids))!=len(ids):
        raise Hold("HTO_COMPLETED_GAME_IDS_INVALID")
    if verified.get("schema")!="brave-hc-hto-verified-game-feed/v1" or verified.get("sourceValidationState")!="PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS" or verified.get("workbookWritten") is not False:
        raise Hold("AUDITED_FOUR_PRIOR_SOURCE_NOT_QUALIFIED")
    verified_games=verified.get("games",[])
    audited={g.get("htoGameId") for g in verified_games}
    if (verified.get("allGamesDiscovered") is not True or
        verified.get("playerAggregateParity") is not True or
        not isinstance(verified_games,list) or
        len(verified_games)!=len(completed) or len(audited)!=len(completed) or
        verified.get("teamGP")!=len(completed) or
        not set(AUDITED_FOUR).issubset(audited)):
        raise Hold("CURRENT_OPERATIONAL_GAME_FEED_NOT_ADMITTED")
    by_id={g["htoGameId"]:g for g in verified_games}
    if audited!=set(ids):
        raise Hold("OPERATIONAL_BOX_FEED_AND_HTO_SCORE_IDS_DIFFER")
    for game in completed:
        official=by_id[game["htoGameId"]]
        if (official.get("date"),official.get("teamGoals"),official.get("teamGoalsAgainst")) != (
            game["date"],game["gf"],game["ga"]):
            raise Hold("HTO_BOX_SCORE_AND_SCORES_LIST_SOURCE_CONFLICT_"+str(game["htoGameId"]))
    if verified.get("teamG")!=sum(g["gf"] for g in completed):
        raise Hold("HTO_OPERATIONAL_SCORE_TOTAL_CONFLICT")
    for gid,(day,name,gf,ga) in AUDITED_FOUR.items():
        x=next((g for g in completed if g["htoGameId"]==gid),None)
        if not x or (x.get("date"),x.get("opponentExact"),x.get("gf"),x.get("ga"))!=(day,name,gf,ga):
            raise Hold("HTO_SOURCE_AUDITED_FOUR_DRIFT_"+str(gid))
    candidate=next((g for g in completed if g["htoGameId"]==3375682),None)
    if candidate is None or (candidate["date"],candidate["opponentExact"],candidate["gf"],candidate["ga"])!=("2026-10-25","Big Bastones",6,4):
        raise Hold("HTO_OCT25_FOUNDER_VERIFIED_SCORE_DRIFT")
    # Independently check the periodically collected HTO Stats totals, not just
    # another copy of the same Scores table.
    if readback.get("readOnly") is not True:raise Hold("HTO_STATS_SOURCE_READONLY_NOT_ESTABLISHED")
    try:stamp=datetime.fromisoformat(readback["date"].replace("Z","+00:00"))
    except Exception as exc:raise Hold("HTO_STATS_TIMESTAMP_INVALID") from exc
    if stamp.tzinfo is None or not timedelta(0)<=now-stamp<=timedelta(hours=30):
        raise Hold("HTO_STATS_READBACK_TOO_OLD")
    pages=[p for p in readback.get("pages",[]) if p.get("name")=="hto_stats"]
    if len(pages)!=1 or pages[0].get("error") or "www.htosports.com" not in pages[0].get("url",""):
        raise Hold("HTO_STATS_SOURCE_MISSING")
    txt=pages[0].get("text","")
    if "STATS - WINTER 2026/2027" not in txt:raise Hold("HTO_STAT_SEASON_WRONG")
    match=re.search(r"TEAM STATS\s+GP\s+GF\s+GA\s+PPO\s+PK%\s+(\d+)\s+(\d+)\s+(\d+)\b",txt)
    if not match:raise Hold("HTO_STATS_TEAM_TOTALS_UNAVAILABLE")
    expectedGP,expectedGF,expectedGA=map(int,match.groups())
    if (len(completed),sum(g["gf"] for g in completed),sum(g["ga"] for g in completed))!=(expectedGP,expectedGF,expectedGA):
        raise Hold("HTO_SCORE_VS_STATS_GAMES_GOALS_MISMATCH")
    if completed[0]["date"]>now.date().isoformat():raise Hold("FUTURE_COMPLETED_GAME")
    if any(g["season"]!="W2026/27" or g["gameType"]!="Regular Season" or g["result"] not in ("W","L","T") for g in completed):
        raise Hold("HTO_GAME_TYPE_OR_RESULT_INVALID")
    histGames=[{"key":"WB:"+str(x["workbookGame"]),"date":x["date"],"season":x["season"],"type":x["type"],
                 "opponentExact":x["opponentExact"],"bravesGF":x["bravesGF"],"bravesGA":x["bravesGA"],"result":x["result"],
                 "source":"MASTER_HISTORICAL","sourceRow":x["sourceRow"]} for x in historical]
    htoGames=[{"key":"HTO:"+str(g["htoGameId"]),"date":g["date"],"season":g["season"],"type":g["gameType"],
               "opponentExact":g["opponentExact"],"bravesGF":g["gf"],"bravesGA":g["ga"],"result":g["result"],
               "source":"HTO_OFFICIAL_GAME_ID","htoGameId":g["htoGameId"],"sourceUrl":g["sourceUrl"]} for g in completed]
    if len(set(g["key"] for g in histGames+htoGames))!=len(histGames)+len(htoGames):
        raise Hold("LEDGER_DUPLICATE_KEYS")
    grouped=defaultdict(list)
    for g in histGames+htoGames:grouped[g["opponentExact"]].append(g)
    def totals(data):
        return {"gp":len(data),"w":sum(g["result"]=="W" for g in data),"l":sum(g["result"]=="L" for g in data),
                "t":sum(g["result"]=="T" for g in data),"gf":sum(g["bravesGF"] for g in data),
                "ga":sum(g["bravesGA"] for g in data)}
    profiles=[]
    for name,games in sorted(grouped.items()):
        games=sorted(games,key=lambda g:(g["date"],g["key"]))
        profiles.append({"opponentExact":name,"identityScope":"EXACT_MATCH_ONLY",
                         "regularSeason":totals([g for g in games if g["type"]=="Regular Season"]),
                         "allTime":totals(games),
                         "playoffs":totals([g for g in games if g["type"]=="Playoffs"]),
                         "lastFive":[{"date":g["date"],"result":g["result"],"gf":g["bravesGF"],"ga":g["bravesGA"],"source":g["source"]} for g in games[-5:]],
                         "sourceHTOGames":sum(g["source"]=="HTO_OFFICIAL_GAME_ID" for g in games)})
    status="PRIVATE_PARITY_PASS_EXACT_NAMES_ONLY"
    return {"schema":"brave-hc-online-opponent-ledger/private-v1","status":status,"released":False,
            "workbookWritten":False,"releaseEligible":False,"sourceMasterSHA256":MASTER_HASH,
            "sourceHTOStatsReadback":readback["date"],"sourceHTOScoresCollected":hto["collectedAtUTC"],
            "sourceCounts":{"masterGames":len(histGames),"currentOfficialHTOGames":len(htoGames),
                            "totalGames":len(histGames)+len(htoGames),"exactOpponentIdentities":len(profiles),
                            "currentSeasonGP":expectedGP,"currentSeasonGF":expectedGF,"currentSeasonGA":expectedGA,
                            "latestCompletedGameId":htoGames[0]["htoGameId"]},
            "releaseHolds":["PUBLISHING_SOURCE_SCOPE_APPROVAL","OPPONENT_ALIAS_REVIEW",
                            "LIVE_REFRESH_CONTROLLER_REPAIR","INDEPENDENT_PUBLIC_FEED_QA"],
            "aliasesPending":["Mohawks HC <> Mohawks H.C.","Michelob Morts <> Sugo Sundays"],
            "profiles":profiles,"currentGames":htoGames}

def stage(master,scores,stats,verified,output):
    merged=reconcile(load(master),load(scores),load(stats),load(verified))
    out=Path(output);out.parent.mkdir(parents=True,exist_ok=True)
    tmp=out.with_suffix(out.suffix+".tmp")
    tmp.write_text(json.dumps(merged,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    os.replace(tmp,out)
    return {"status":merged["status"],"counts":merged["sourceCounts"],"file":str(out),
            "releaseEligible":False,"masterWorkbookWritten":False}
def main():
    p=ArgumentParser()
    for name in ("master","scores","stats","verified","output"):p.add_argument("--"+name,required=True)
    a=p.parse_args()
    try:print(json.dumps(stage(a.master,a.scores,a.stats,a.verified,a.output)));return 0
    except (Hold,OSError,ValueError,TypeError,KeyError) as e:
        print(json.dumps({"state":"HOLD","reason":str(e),"released":False}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
