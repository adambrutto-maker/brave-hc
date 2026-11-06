#!/usr/bin/env python3
"""Private source-qualified roster-identity exception audit; no automatic admission."""
from __future__ import annotations
import argparse,json,re
from collections import Counter,defaultdict
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from collect_svhl_player_game_events import Tables,fetch_game,official_game,url_game
from build_svhl_gameinfo_hold_review import CATEGORIES

def need(ok,why):
    if not ok: raise ValueError("SCORER_ROSTER_EXCEPTION_HOLD:"+why)

def parse_player_link(href,lid,tid):
    u=urlparse(href.replace("&amp;","&"))
    q=parse_qs(u.query)
    need(u.path.lower().lstrip("/")== "playerinfo.aspx" and q.get("leagueid")==[str(lid)]
         and q.get("teamid")==[str(tid)] and len(q.get("playerid",[]))==1
         and q["playerid"][0].isdigit(),"SCORER_URL_IDENTITY_INVALID")
    return int(q["playerid"][0])

def diagnose_held_game(row,season,html,sha,across):
    lid,gid=row["leagueId"],row["gameId"]
    need(row["category"]=="RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD",
         "NOT_REGISTRATION_HOLD")
    need(sha==row["officialPageSHA256"] and
         row["officialGameInfoURL"]==url_game(lid,gid),
         "OFFICIAL_PAGE_SOURCE_CHANGED")
    game=next((x for x in season["games"] if x["gameId"]==gid),None)
    need(game is not None and game["sourcePageSHA256"]==sha and
         game["status"]=="PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL",
         "WRONG_SAVED_GAME_STATE")
    roster_by_team={
       t["sourceTeamId"]:{p["playerId"]:p for p in t["playerSeasonSummaries"]}
       for t in season["teams"]}
    played={game["homeTeamId"],game["awayTeamId"]}
    need(len(played)==2 and played.issubset(roster_by_team),"HOME_AWAY_SOURCE_TEAM_HOLD")
    rosters={k:[{"playerId":x["playerId"],"name":x["name"]}
               for x in v.values()] for k,v in roster_by_team.items()}
    replay=official_game(lid,{"gameId":gid,"date":game["date"],
            "homeId":game["homeTeamId"],"awayId":game["awayTeamId"],
            "homeGoals":game["homeGoals"],"awayGoals":game["awayGoals"]},html,sha,rosters)
    need(replay["status"]=="PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL"
         and len(replay["events"])==game["partialSheetGoalCount"]
         and sum(x["reason"]=="GOAL_PLAYER_ID_NOT_LISTED_ON_VERIFIED_TEAM_ROSTER"
                 for x in replay["heldEvents"])>0,
         "ROSTER_HOLD_REPLAY_CHANGED")
    parser=Tables();parser.feed(html)
    missing=[];raw=0
    for period in range(1,5):
        table=parser.tables.get("ctl00_MainContent_GridViewScoresPeriod"+str(period))
        need(table and len(table)>=1,"PERIOD_SOURCE_TABLE_MISSING")
        for ordinal,cells in enumerate(table[1:],1):
            raw+=1
            need(len(cells)==3,"MALFORMED_GOAL_ROW")
            scorers=[l for l in cells[1]["links"]
                     if "playerinfo.aspx" in l["href"].lower()]
            teams=[l for l in cells[1]["links"]
                   if "teaminfo.aspx" in l["href"].lower()]
            need(len(scorers)==len(teams)==1,"SCORER_ID_OR_TEAM_LINK_MISSING")
            u=urlparse(teams[0]["href"].replace("&amp;","&"))
            q=parse_qs(u.query)
            need(q.get("leagueid")==[str(lid)] and
                 q.get("teamid") and q["teamid"][0].isdigit(),
                 "TEAM_LINK_UNQUALIFIED")
            tid=int(q["teamid"][0])
            need(tid in played,"SCORER_TEAM_OUTSIDE_GAME")
            pid=parse_player_link(scorers[0]["href"],lid,tid)
            if pid in roster_by_team[tid]:continue
            other_same_season=[
                {"sourceTeamId":teamid,"teamName":next(t["name"] for t in season["teams"]
                                    if t["sourceTeamId"]==teamid)}
                for teamid,players in roster_by_team.items()
                if teamid!=tid and pid in players
            ]
            other_seasons=[x for x in across.get(pid,[]) if x["leagueId"]!=lid]
            missing.append({
                "leagueId":lid,"gameId":gid,"gameDate":game["date"],
                "period":period,"ordinal":ordinal,
                "officialPlayerId":pid,
                "officialScorerLink":scorers[0]["href"].replace("&amp;","&"),
                "scorerDisplayInGoalTable":scorers[0]["text"],
                "officialGoalTeamId":tid,
                "officialGoalTeamName":next(t["name"] for t in season["teams"]
                                           if t["sourceTeamId"]==tid),
                "capturedTeamRosterCount":len(roster_by_team[tid]),
                "sameSeasonOtherListedTeams":other_same_season,
                "otherArchivedSeasonRosterObservations":other_seasons,
                "reason":"OFFICIAL_GOAL_SCORER_ID_ABSENT_SOURCE_SEASON_TEAM_ROSTER",
                "registrationOrGameAttendanceProved":False,
                "rosterAndGoalsOverwritten":False,
                "requiresSourceOwnerDisposition":True
            })
    need(raw==game["homeGoals"]+game["awayGoals"] and
         len(missing)==sum(x["reason"]=="GOAL_PLAYER_ID_NOT_LISTED_ON_VERIFIED_TEAM_ROSTER"
                           for x in replay["heldEvents"]),
         "MISMATCHED_RAW_SCORER_EXCEPTION_COUNT")
    return missing

def build_roster_index(seasons):
    observations=defaultdict(list)
    for lid,season in seasons.items():
        for team in season["teams"]:
            for p in team["playerSeasonSummaries"]:
                observations[p["playerId"]].append({
                    "leagueId":lid,"sourceTeamId":team["sourceTeamId"],
                    "teamName":team["name"],"publishedPlayerName":p["name"]
                })
    return dict(observations)

def run(repo,receipt,game_keys):
    widgets=repo/"widgets"
    source=json.loads((widgets/"svhl-gameinfo-hold-review.json").read_text(encoding="utf-8"))
    need(source["schema"]=="brave-hc-svhl-gameinfo-raw-source-holds-review/v1" and
         source["gamePages"]==137 and source["reviewOnly"] is True and
         source["status"]=="SOURCE_HASH_VERIFIED_AUTHOR_AUDIT_NOT_INDEPENDENTLY_ACCEPTED",
         "REVIEW_SOURCE_UNQUALIFIED")
    ids={x["leagueId"] for x in source["games"]}
    seasons={lid:json.loads((widgets/f"svhl-player-game-{lid}.json").read_text(encoding="utf-8"))
             for lid in ids}
    across=build_roster_index(seasons)
    selected=[r for r in source["games"]
              if r["category"]=="RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD"]
    need(len(selected)==39,"ROSTER_HOLD_COUNT_NOT_39")
    selected=[r for r in selected if (r["leagueId"],r["gameId"]) in game_keys]
    need(len(selected)==len(game_keys),"UNRESOLVED_TARGET_GAME_NOT_IN_REVIEW")
    findings=[];holds=[]
    for i,row in enumerate(selected,1):
        lid,gid=row["leagueId"],row["gameId"]
        try:
            html,sha=fetch_game(row["officialGameInfoURL"])
            members=diagnose_held_game(row,seasons[lid],html,sha,across)
            need(members,"NO_MISSING_ROSTER_PLAYER_FOUND")
            findings.extend(members)
            print(json.dumps({"processed":i,"total":len(selected),"league":lid,
                              "game":gid,"rosterExclusions":len(members)}),flush=True)
        except Exception as err:
            holds.append({"leagueId":lid,"gameId":gid,"sourceStatus":"HELD",
                          "reason":str(err)[:240]})
            print(json.dumps({"processed":i,"total":len(selected),"league":lid,
                              "game":gid,"error":str(err)[:140]}),flush=True)
    groups={}
    for finding in findings:
        key=(finding["leagueId"],finding["officialGoalTeamId"],
             finding["officialPlayerId"])
        entry=groups.setdefault(key,{
            "leagueId":key[0],"sourceTeamId":key[1],"officialScorerPlayerId":key[2],
            "teamName":finding["officialGoalTeamName"],
            "sourceDisplayName":finding["scorerDisplayInGoalTable"],
            "sourceGames":[],"otherSameSeasonTeamEvidence":finding["sameSeasonOtherListedTeams"],
            "otherSeasonRosterEvidence":finding["otherArchivedSeasonRosterObservations"],
            "reviewDecision":"PENDING_OFFICIAL_REGISTRATION_AND_ROSTER_IDENTITY",
            "acceptedForScoring":False
        })
        entry["sourceGames"].append({"gameId":finding["gameId"],
              "date":finding["gameDate"],"period":finding["period"],
              "ordinal":finding["ordinal"]})
    by_group=sorted(groups.values(),key=lambda x:(
        -int(x["leagueId"]==570),-len(x["sourceGames"]),
        -x["leagueId"],x["sourceTeamId"],x["officialScorerPlayerId"]))
    result={"schema":"brave-hc-svhl-official-scorer-roster-holds-private-review/v1",
            "capturedUTC":datetime.now(timezone.utc).isoformat(),
            "scope":"SVHL_ONLY_NOT_VAHL",
            "sourceReviewCandidate":"svhl-gameinfo-hold-review.json",
            "targetGames":len(selected),"sourceVerifiedGames":len(selected)-len(holds),
            "pageOrReplayHolds":len(holds),"unadmittedScorerEvents":len(findings),
            "distinctSeasonTeamScorerCases":len(by_group),
            "scorerReviewCases":by_group,
            "perEventEvidence":findings,"sourceHolds":holds,
            "noPlayerAttendanceOrRegistrationInferred":True,
            "canonicalPlayerScoresWritten":False,"officialRosterWritten":False,
            "releaseEligible":False,
            "limitations":[
              "An official scorer hyperlink is not proof that the player was registered on the archived team roster.",
              "Same official player ID on a different season or team is source overlap only; it cannot authorize a roster correction.",
              "No player season totals, accepted goal events, attendance, GP, PIM or award points may be changed from these observations.",
              "Source page SHA mismatch or missing roster source remains held without interpolation."
            ]}
    receipt.parent.mkdir(parents=True,exist_ok=True)
    receipt.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
    p.add_argument("--receipt",type=Path,required=True)
    p.add_argument("--games",default="570:127726,570:127787",
                   help="Comma-separated qualified league:game IDs, 1–4 at a time")
    args=p.parse_args()
    keys=[part.split(":") for part in args.games.split(",")]
    need(1<=len(keys)<=4 and all(len(parts)==2 and
         all(piece.isdigit() for piece in parts) for parts in keys),
         "BOUND_TARGET_GAME_SCOPE")
    selected={(int(a),int(b)) for a,b in keys}
    need(len(selected)==len(keys),"DUPLICATE_TARGET_GAMES")
    need(not args.receipt.resolve().is_relative_to((args.repo/"widgets").resolve()),
         "NO_PRIVATE_IDENTITIES_IN_PUBLIC_ASSETS")
    result=run(args.repo,args.receipt,selected)
    print(json.dumps({k:result[k] for k in
        ("targetGames","sourceVerifiedGames","pageOrReplayHolds",
         "unadmittedScorerEvents","distinctSeasonTeamScorerCases","releaseEligible")}),
         flush=True)

if __name__=="__main__":main()
