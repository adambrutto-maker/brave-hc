"""Source-gated current HTO individual appearances; no inferred roster participation."""
from __future__ import annotations
import argparse,datetime as dt,json,re
from pathlib import Path
from urllib.parse import urlparse,parse_qs
ROOT=Path(__file__).resolve().parents[1]
SCHEMA="brave-hc-individual-verified-appearances/v1"
STATUS="VERIFIED_COMPLETE_PLAYER_APPEARANCES"
PROOF="OFFICIAL_APPEARANCE_AND_BOX_SCORE_VERIFIED"
def check(ok,reason):
    if not ok:raise ValueError(reason)
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def hto_id(url,kind):
    u=urlparse(url);q=parse_qs(u.query)
    check(u.scheme=="https" and u.hostname in ("www.htosports.com","htosports.com")
          and u.path=="/teams/default.asp" and q.get("u")==["BRAVESHOCKEY"]
          and q.get("p")==[kind],"SOURCE_URL_AUTHORITY_INVALID")
    id_=q.get("gameID" if kind=="boxscore" else "playerID",[""])[0]
    check(bool(re.fullmatch(r"[1-9][0-9]*",id_)),"SOURCE_ID_INVALID")
    return id_
def game_date(text):
    m=re.search(r"\b(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat),\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{2})\b",text or "")
    check(m is not None,"GAME_SCHEDULE_DATE_MISSING")
    return dt.datetime.strptime(m.group(1),"%m/%d/%y").date()
def goal_total(heading):
    check(heading.startswith("SCORE BOARD\nREGULAR SEASON\n"),"GAME_PHASE_UNVERIFIED")
    lines=heading.splitlines()
    matches=[i for i,v in enumerate(lines) if v.strip()=="Brave H.C."]
    check(len(matches)==1 and matches[0]+1<len(lines),"GAME_SCORE_ROW_AMBIGUOUS")
    values=lines[matches[0]+1].split("\t")
    check(len(values)==6 and all(x.isdigit() for x in values),"GAME_FINAL_SCORE_INVALID")
    ints=list(map(int,values))
    check(sum(ints[:5])==ints[5],"GAME_PERIOD_SUM_INVALID")
    return ints[5]
def build(evidence,index,actual,career):
    check(evidence.get("sourceAuthority")=="PUBLIC_HTO_HTTP_READBACK"
          and isinstance(evidence.get("games"),list),"BOX_SCORE_EVIDENCE_UNVERIFIED")
    check(index.get("status")=="PUBLIC_SCHEDULE_INDEX_18_SEASONS"
          and isinstance(index.get("seasons"),list),"INDEX_UNVERIFIED")
    check(actual.get("schema")=="brave-hc-hto-player-actuals/v1"
          and actual.get("status")=="VERIFIED_HTO_CURRENT"
          and isinstance(actual.get("players"),list)
          and type(actual.get("teamGP"))==int and actual["teamGP"]>0,"SEASON_ACTUALS_UNVERIFIED")
    check(career.get("schema")=="brave-hc-player-career-insights/v1"
          and career.get("sourceAuthority")=="NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK"
          and isinstance(career.get("players"),dict),"PLAYER_IDENTITIES_UNVERIFIED")
    m=re.fullmatch(r"W(20[0-9]{2})/([0-9]{2})",actual.get("season",""))
    check(m is not None,"SEASON_CODE_INVALID")
    label=f"Winter {m[1]}/20{m[2]}"
    indexed=[s for s in index["seasons"] if s.get("season")==label]
    check(len(indexed)==1 and isinstance(indexed[0].get("boxscoreURLs"),list),"SEASON_INDEX_AMBIGUOUS")
    indexed_ids=[hto_id(x,"boxscore") for x in indexed[0]["boxscoreURLs"]]
    check(len(indexed_ids)==len(set(indexed_ids))==actual["teamGP"],"INCOMPLETE_GAME_INDEX")
    games={}
    check(len(evidence["games"])==actual["teamGP"],"INCOMPLETE_BOX_SCORE_READBACK")
    for g in evidence["games"]:
        gid=hto_id(g.get("url",""),"boxscore")
        check(gid not in games and g.get("schedule",{}).get("season")==label
              and hto_id(g["schedule"].get("href",""),"boxscore")==gid,
              "GAME_ID_OR_SEASON_PARITY_FAILED")
        games[gid]=g
    check(set(games)==set(indexed_ids),"GAME_ID_COVERAGE_MISSING")
    actual_names={}
    for row in actual["players"]:
        name=row.get("name")
        check(isinstance(name,str) and name not in actual_names,"OFFICIAL_PLAYER_NAME_DUPLICATE")
        check(all(type(row.get(k))==int and row[k]>=0 for k in ("gp","g","a","pts"))
              and row["g"]+row["a"]==row["pts"] and row["gp"]<=actual["teamGP"],
              "OFFICIAL_PLAYER_STAT_TOTAL_INVALID")
        actual_names[name]=row
    source_at=dt.datetime.fromisoformat(evidence["capturedAt"].replace("Z","+00:00"))
    actual_at=dt.datetime.fromisoformat(actual["asOf"].replace("Z","+00:00"))
    check(source_at.tzinfo is not None and actual_at.tzinfo is not None
          and source_at<=actual_at,"HTO_READBACK_CHRONOLOGY_INVALID")
    persons={};game_checks=[];scoreless_without_columns=0
    for gid in indexed_ids:
        g=games[gid];date=game_date(g["schedule"].get("text",""))
        check(source_at.date()>=date,"SOURCE_CAPTURE_PREDATES_GAME")
        gf=goal_total(g.get("heading",""))
        matching=[]
        for table in g.get("tables",[]):
            rows=table.get("rows")
            if rows and all(k in rows[0].get("cells",[]) for k in ("Name","POS","GP")):
                matching.append(table)
        check(len(matching)==1,"SKATER_GAME_TABLE_AMBIGUOUS")
        hdr=matching[0]["rows"][0]["cells"]
        check(len([h for h in hdr if h])==len(set(h for h in hdr if h)),"DUPLICATE_GAME_STAT_HEADER")
        cols=[k in hdr for k in ("G","A","Pts")]
        check(all(cols) or (gf==0 and not any(cols)),"MISSING_NONZERO_GAME_SCORING_COLS")
        scoring=all(cols)
        if not scoring:scoreless_without_columns+=1
        gsum=asum=player_count=0
        for row in matching[0]["rows"][1:]:
            check(len(row.get("cells",[]))==len(hdr),"PLAYER_ROW_COLUMN_PARITY")
            cells=dict(zip(hdr,row["cells"]))
            if cells["Name"]=="Team Stats":
                check(not row.get("players"),"TEAM_STATS_NOT_INDIVIDUAL")
                continue
            links=row.get("players",[])
            check(len(links)==1,"GAME_SKATER_SOURCE_LINK_AMBIGUOUS")
            pid=hto_id(links[0].get("href",""),"profile")
            profile=career["players"].get(pid)
            check(cells["Name"] in actual_names,
                  "HTO_PLAYER_NOT_IN_OFFICIAL_SEASON_TOTALS_"+pid)
            # A currently registered player may have no certified historical-career
            # profile. The official per-game profile link and official current
            # season totals still prove this appearance; never invent career data.
            if profile is not None:
                check(profile.get("status")=="VERIFIED_PROFILE_CAREER_SUM_PARITY"
                      and profile.get("name")==" ".join(reversed([part.strip() for part in cells["Name"].split(", ",1)])),
                      "KNOWN_HTO_CAREER_IDENTITY_MISMATCH_"+pid)
            check(cells["POS"].strip() and cells["GP"]=="1","EXPLICIT_GAME_APPEARANCE_MISSING")
            if scoring:
                check(all(re.fullmatch(r"[0-9]+",cells.get(k,"")) for k in ("G","A","Pts")),
                      "PLAYER_GAME_SCORING_FIELDS_INVALID")
                goals,assists,pts=(int(cells[k]) for k in ("G","A","Pts"))
                check(goals+assists==pts,"PLAYER_GAME_POINTS_PARITY_FAILED")
            else:
                # This player has an explicit GP=1; team scored zero goals.
                goals=assists=pts=0
            player_count+=1;gsum+=goals;asum+=assists
            if pid not in persons:
                persons[pid]={"playerId":pid,"name":cells["Name"],
                              "gp":0,"g":0,"a":0,"pts":0,"games":[]}
            p=persons[pid]
            check(p["name"]==cells["Name"] and not any(x["gameId"]==int(gid) for x in p["games"]),
                  "DUPLICATED_OR_CHANGED_PLAYER_GAME")
            for k,val in (("gp",1),("g",goals),("a",assists),("pts",pts)):p[k]+=val
            p["games"].append({"gameId":int(gid),"date":date.isoformat(),"appeared":True,
                               "verification":PROOF,"sourceUrl":g["url"],"g":goals,"a":assists,"pts":pts})
        check(player_count>=8 and gsum==gf,"GAME_GOALS_OR_ROSTER_COVERAGE_INCONSISTENT")
        game_checks.append({"gameId":int(gid),"date":date.isoformat(),"teamGoals":gf,
                            "playerGoals":gsum,"playerAssists":asum,
                            "verifiedSkaterAppearances":player_count,
                            "scorelessTableWithoutScoringColumns":not scoring})
    check({p["name"] for p in persons.values()}==set(actual_names)
          and len(persons)==len(actual_names),"COMPLETE_SEASON_PLAYER_SET_MISMATCH")
    for pid,p in persons.items():
        official=actual_names[p["name"]]
        check(all(p[k]==official[k] for k in ("gp","g","a","pts"))
              and len(p["games"])==p["gp"],"SEASON_GP_G_A_PTS_MISMATCH_"+pid)
        p["games"].sort(key=lambda x:(x["date"],x["gameId"]),reverse=True)
    total={k:sum(p[k] for p in persons.values()) for k in ("gp","g","a","pts")}
    check(total["gp"]==sum(x["verifiedSkaterAppearances"] for x in game_checks)
          and total["g"]==sum(x["teamGoals"] for x in game_checks)
          and total["g"]+total["a"]==total["pts"],"TEAM_SOURCE_TOTAL_MISMATCH")
    result={"schema":SCHEMA,"status":STATUS,"season":actual["season"],
            "asOf":actual["asOf"],"players":dict(sorted(persons.items())),
            "sourceAuthority":"COMPLETE_CURRENT_NATIVE_HTO_SKATER_GAME_APPEARANCES_AND_OFFICIAL_SEASON_TOTALS",
            "coverage":{"officialTeamGames":actual["teamGP"],
                        "verifiedGameIds":[int(x) for x in indexed_ids],
                        "reconciledSkaters":len(persons),
                        "verifiedSkaterAppearances":total["gp"],
                        "seasonTotals":total,
                        "eligiblePlayerWindows":{str(n):sum(p["gp"]>=n for p in persons.values()) for n in (3,5,10)},
                        "zeroGoalGamesWithoutScoringColumns":scoreless_without_columns,
                        "sourceReadback":{"boxscores":evidence["capturedAt"],
                                          "seasonTotals":actual["asOf"]},
                        "gameChecks":game_checks},
            "governance":{"noInferredAppearances":True,"allGameIdsFromOfficialSeasonIndex":True,
                          "seasonGP_G_A_PTSReconciledForEverySkater":True,
                          "zeroPointAppearanceRequiresExplicitGP1":True,
                          "zeroGoalMissingScoringColumnsAcceptedOnlyWithGF0":True,
                          "originalHTOAndWorkbookRecordsUnchanged":True,
                          "last10UnqualifiedUntilTenConfirmedAppearances":True}}
    return result
def run(argv=None):
    p=argparse.ArgumentParser();p.add_argument("--write",action="store_true")
    p.add_argument("--check",action="store_true")
    p.add_argument("--output",type=Path,default=ROOT/"widgets/player-form-appearances-v364.json")
    args=p.parse_args(argv)
    data=build(load(ROOT/"docs/hto-highlights-rollout/game-audit-evidence/live_boxscores.json"),
               load(ROOT/"docs/hto-highlights-rollout/261020_Historical_Boxscore_Index.json"),
               load(ROOT/"widgets/player-actuals-hourly.json"),
               load(ROOT/"widgets/player-career-insights.json"))
    if args.check:check(args.output.exists() and load(args.output)==data,
                        "PUBLISHED_APPEARANCE_FEED_NOT_REPRODUCIBLE")
    if args.write:args.output.write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"status":data["status"],"season":data["season"],
                      "players":data["coverage"]["reconciledSkaters"],
                      "verifiedGP":data["coverage"]["verifiedSkaterAppearances"],
                      "eligible":data["coverage"]["eligiblePlayerWindows"],
                      "write":args.write}))
if __name__=="__main__":
    try:run()
    except (ValueError,KeyError,TypeError,AttributeError,OverflowError) as exc:
        print(json.dumps({"status":"HELD_PENDING_PLAYER_APPEARANCE_AUDIT","reason":str(exc),
                          "originalSourcesModified":False}))
        raise SystemExit(2)
