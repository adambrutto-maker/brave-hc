#!/usr/bin/env python3
"""ENG59 read-only HTO game-source vs published player scoring revision gate.

Official scoreboards and HTO player GP/G/A/Pts are kept distinct: a newer game
snapshot cannot silently supersede the published hourly feed. This checker
runs without network and never writes a source, workbook, website or approval.
It is NOT source-owner signoff or release-current verification.
"""
from __future__ import annotations
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse,parse_qs
from hashlib import sha256
import argparse,json,re,sys
class SourceRevisionHold(ValueError):pass
def need(test,reason):
    if not test:raise SourceRevisionHold("ENG59_HTO_REVISION_SOURCE_HOLD:"+reason)
def stamp(value):
    need(isinstance(value,str) and value,"SOURCE_TIMESTAMP_MISSING")
    try: v=datetime.fromisoformat(value.replace("Z","+00:00"))
    except ValueError:raise SourceRevisionHold("SOURCE_TIMESTAMP_INVALID")
    need(v.tzinfo is not None,"SOURCE_TIMESTAMP_NAIVE")
    return v.astimezone(timezone.utc)
def source_id(url,kind):
    parsed=urlparse(url or "")
    query=parse_qs(parsed.query)
    need(parsed.scheme=="https" and parsed.hostname in ("www.htosports.com","htosports.com")
         and parsed.path=="/teams/default.asp" and query.get("u")==["BRAVESHOCKEY"]
         and query.get("p")==[kind],"UNVERIFIED_HTO_GAME_OR_PLAYER_URL")
    token=query.get("gameID" if kind=="boxscore" else "playerID",[""])[0]
    need(bool(re.fullmatch(r"[1-9][0-9]*",token)),"HTO_SOURCE_ID_UNVERIFIED")
    return token
def game_scores(heading):
    parts=(heading or "").splitlines()
    need(len(parts)>=9 and parts[:2]==["SCORE BOARD","REGULAR SEASON"],
         "SCOREBOARD_LEAGUE_OR_PHASE_NOT_VERIFIED")
    header=parts[2].split("\t")
    if header and not header[0]:header=header[1:]
    need(header in (["1","2","3","F"],["1","2","3","OT","2OT","F"]),
         "SCOREBOARD_PERIOD_HEADER_NOT_OFFICIAL")
    found={}
    for idx,line in enumerate(parts[:-1]):
        name=line.strip()
        if not name or "\t" in line or name in ("SCORE BOARD","REGULAR SEASON"):continue
        values=parts[idx+1].split("\t")
        if len(values)!=len(header) or not all(re.fullmatch(r"[0-9]+",v) for v in values):continue
        numbers=list(map(int,values))
        need(sum(numbers[:-1])==numbers[-1],"SCOREBOARD_PERIOD_FINAL_SCORE_MISMATCH")
        need(name not in found,"SCOREBOARD_TEAM_DUPLICATED")
        found[name]=numbers[-1]
    need(len(found)==2 and "Brave H.C." in found and
         all(name.strip() for name in found),"SCOREBOARD_TWO_SIDED_GAME_UNVERIFIED")
    other=next(name for name in found if name!="Brave H.C.")
    return found["Brave H.C."],found[other],len(header),other
def evaluate(evidence,index,hourly):
    need(evidence.get("sourceAuthority")=="PUBLIC_HTO_HTTP_READBACK" and
         isinstance(evidence.get("games"),list),"BOX_SCORE_SNAPSHOT_UNQUALIFIED")
    need(index.get("status")=="PUBLIC_SCHEDULE_INDEX_18_SEASONS" and
         isinstance(index.get("seasons"),list),"OFFICIAL_SEASON_INDEX_UNQUALIFIED")
    need(hourly.get("schema")=="brave-hc-hto-player-actuals/v1" and
         hourly.get("status")=="VERIFIED_HTO_CURRENT" and
         hourly.get("season")=="W2026/27" and
         hourly.get("sourceUrl")==
         "https://www.htosports.com/teams/default.asp?p=stats&s=hockey&u=BRAVESHOCKEY",
         "ORIGINAL_PUBLISHED_HTO_FEED_UNQUALIFIED")
    captured=stamp(evidence.get("capturedAt"))
    previous=stamp(hourly.get("asOf"))
    old={p.get("name"):p for p in hourly.get("players",[])}
    gp=hourly.get("teamGP")
    need(type(gp) is int and 1<=gp<=24 and len(old)==hourly.get("playerCount") and
         len(old)==len(hourly.get("players",[])) and
         all(isinstance(name,str) and bool(name) for name in old),
         "PUBLISHED_TEAM_PLAYER_COUNTS_INVALID")
    season=next((s for s in index["seasons"] if s.get("season")=="Winter 2026/2027"),None)
    need(season is not None and isinstance(season.get("boxscoreURLs"),list),
         "OFFICIAL_WINTER_SEASON_INDEX_MISSING")
    scheduled=[source_id(url,"boxscore") for url in season["boxscoreURLs"]]
    need(len(scheduled)==len(set(scheduled))==gp,"OFFICIAL_SEASON_GAME_INDEX_INCOMPLETE")
    games=evidence["games"]
    need(len(games)==gp,"OFFICIAL_GAME_SOURCE_SNAPSHOT_INCOMPLETE")
    seen=set();players={};goals=against=assists=0
    coverage=[];missing_score_cols=0
    for game in games:
        gid=source_id(game.get("url"),"boxscore")
        need(gid not in seen and gid in scheduled and
             game.get("schedule",{}).get("season")=="Winter 2026/2027" and
             source_id(game.get("schedule",{}).get("href"),"boxscore")==gid,
             "GAME_SOURCE_ID_OR_SEASON_UNVERIFIED")
        seen.add(gid)
        gf,ga,period_count,opponent=game_scores(game.get("heading"))
        tables=[t for t in game.get("tables",[]) if t.get("rows") and
                all(k in t["rows"][0].get("cells",[]) for k in ("Name","POS","GP"))]
        need(len(tables)==1,"OFFICIAL_SKATER_TABLE_MISSING_OR_DUPLICATE")
        rows=tables[0]["rows"]
        hdr=rows[0]["cells"]
        need(len([x for x in hdr if x])==len(set(x for x in hdr if x)),
             "SKATER_TABLE_DUPLICATE_COLUMN")
        scoring=[key in hdr for key in ("G","A","Pts")]
        need(all(scoring) or (not any(scoring) and gf==0),
             "INCOMPLETE_NONZERO_GOAL_PLAYER_SCORING_COLUMNS")
        complete=all(scoring)
        if not complete:missing_score_cols+=1
        goal_sum=assist_sum=0;skaters=0
        for row in rows[1:]:
            cells=row.get("cells",[])
            need(len(cells)==len(hdr),"PLAYER_SOURCE_ROW_WIDTH_INVALID")
            data=dict(zip(hdr,cells))
            name=data.get("Name")
            if name=="Team Stats":
                need(not row.get("players"),"TEAM_TOTAL_NOT_A_PLAYER")
                continue
            links=row.get("players",[])
            need(isinstance(name,str) and name in old and data.get("POS") and
                 data.get("GP")=="1" and len(links)==1,
                 "OFFICIAL_PLAYER_NAME_GP_OR_ID_MISSING")
            pid=source_id(links[0].get("href"),"profile")
            if complete:
                need(all(re.fullmatch(r"[0-9]+",data.get(k,"")) for k in ("G","A","Pts")),
                     "INDIVIDUAL_GAME_SCORING_NONINTEGER")
                g,a,pts=(int(data[k]) for k in ("G","A","Pts"))
                need(g+a==pts,"INDIVIDUAL_GAME_GOAL_ASSIST_POINTS_MISMATCH")
            else:g=a=pts=0  # Only a verified zero-goal official game.
            key=(pid,name)
            person=players.setdefault(key,{"playerId":pid,"name":name,
                        "gp":0,"g":0,"a":0,"pts":0,"games":[]})
            need(not any(x["gameId"]==int(gid) for x in person["games"]),
                 "PLAYER_REPEATED_IN_SAME_GAME")
            for field,value in (("gp",1),("g",g),("a",a),("pts",pts)):
                person[field]+=value
            person["games"].append({"gameId":int(gid),"g":g,"a":a,"pts":pts})
            skaters+=1;goal_sum+=g;assist_sum+=a
        need(skaters>=8 and goal_sum==gf,"GAME_GOALS_OR_ROSTER_COVERAGE_FAILED")
        goals+=gf;against+=ga;assists+=assist_sum
        coverage.append({"gameId":int(gid),"periodColumns":period_count,
                         "teamGF":gf,"teamGA":ga,"skaterGoals":goal_sum,
                         "skaterAssists":assist_sum,"skaterAppearances":skaters,
                         "opponentSourceName":opponent})
    need(seen==set(scheduled),"OFFICIAL_GAME_SOURCE_SCHEDULE_COVERAGE_MISSING")
    byname={p["name"]:p for p in players.values()}
    need(len(byname)==len(players)==len(old) and set(byname)==set(old),
         "PUBLISHED_AND_SOURCE_PLAYER_IDENTITY_NOT_RECONCILED")
    need(goals==hourly.get("teamGF") and against==hourly.get("teamGA") and
         sum(p["g"] for p in players.values())==goals and
         sum(p["a"] for p in players.values())==assists,
         "VERIFIED_GAME_GOAL_TOTALS_OR_PLAYER_ASSISTS_DRIFT")
    differences=[]
    for name in sorted(old):
        past=old[name];now=byname[name]
        need(all(type(past.get(k)) is int and past[k]>=0 for k in ("gp","g","a","pts")) and
             past["g"]+past["a"]==past["pts"],"PUBLISHED_PLAYER_STATS_INVALID")
        change={k:now[k]-past[k] for k in ("gp","g","a","pts")}
        if any(change.values()):
            differences.append({"name":name,"verifiedPlayerId":now["playerId"],
                                "published":{k:past[k] for k in change},
                                "sourceObserved":{k:now[k] for k in change},
                                "deltas":change,
                                "nonMonotonic":any(v<0 for v in change.values()),
                                "sourceGameIDs":[x["gameId"] for x in now["games"]]})
    held=bool(differences)
    return {"schema":"ENG59_HTO_GAME_SOURCE_SCORER_REVISION_V1",
      "status":("OFFICIAL_GAME_SNAPSHOT_PLAYER_CORRECTIONS_HELD_SOURCE_OWNER_REVIEW"
                if held else "PUBLISHED_PLAYER_TOTALS_MATCH_SNAPSHOT_RELEASE_REFRESH_STILL_REQUIRED"),
      "officialSeason":"W2026/27",
      "publishedHourlyAsOfUTC":previous.isoformat(),
      "boxscoreSnapshotAsOfUTC":captured.isoformat(),
      "boxscoreSnapshotNewerThanPublishedFeed":captured>previous,
      "sourceGames":len(games),"sourceGameIDs":sorted(int(v) for v in seen),
      "sourcePlayers":len(players),"verifiedAppearances":sum(p["gp"] for p in players.values()),
      "observedTeamGF":goals,"observedTeamGA":against,
      "observedSkaterAssists":assists,"observedSkaterPoints":goals+assists,
      "publishedSkaterAssists":sum(p["a"] for p in old.values()),
      "sourceGamePeriodLayouts":sorted(set(x["periodColumns"] for x in coverage)),
      "zeroGoalGamesMissingScoreColumns":missing_score_cols,
      "gameCoverage":coverage,"changedPlayers":len(differences),
      "nonMonotonicPlayers":sum(x["nonMonotonic"] for x in differences),
      "playerDifferences":differences,
      "sourceOwnerApproved":False,"historicalCorrectionsAdmitted":False,
      "publicHourlySourceModified":False,"independentPrivacyApproval":False,
      "currentAtProductionReleaseVerified":False,"productionAuthorized":False,
      "sourceOnly":True,
      "note":"A later official boxscore snapshot does not rewrite an older published hourly feed. Exact player corrections need source-owner disposition and subsequent source-current release checks."}
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument("--report",type=Path)
    parser.add_argument("--require-no-differences",action="store_true")
    args=parser.parse_args()
    repo=args.repo.resolve()
    try:
        ev=repo/"docs/hto-highlights-rollout/game-audit-evidence/live_boxscores.json"
        ix=repo/"docs/hto-highlights-rollout/261020_Historical_Boxscore_Index.json"
        ph=repo/"widgets/player-actuals-hourly.json"
        result=evaluate(*[json.loads(p.read_text(encoding="utf-8")) for p in (ev,ix,ph)])
        result["sourceSHA256"]={str(p.relative_to(repo)).replace("\\","/"):sha256(p.read_bytes()).hexdigest()
                                for p in (ev,ix,ph)}
        if args.report:
            path=args.report.resolve()
            need(not path.is_relative_to(repo) and not path.exists(),
                 "PRIVATE_REVIEW_RECEIPT_MUST_BE_NEW_AND_OUTSIDE_REPO")
            path.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        print(json.dumps({k:result[k] for k in
            ("status","sourceGames","sourcePlayers","verifiedAppearances",
            "observedTeamGF","observedTeamGA","observedSkaterAssists",
            "publishedSkaterAssists","changedPlayers","nonMonotonicPlayers",
            "currentAtProductionReleaseVerified","productionAuthorized")}))
        if args.require_no_differences and result["changedPlayers"]>0:return 2
        return 0
    except (SourceRevisionHold,OSError,ValueError,KeyError,TypeError) as error:
        print(json.dumps({"status":"SOURCE_HOLD","reason":str(error),
                          "publicHourlySourceModified":False}),file=sys.stderr)
        return 2
if __name__=="__main__":sys.exit(main())
