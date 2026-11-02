#!/usr/bin/env python3
"""Read-only HTO-to-Hot-Stove draft staging. Never publishes or edits source systems."""
from __future__ import annotations
from collections import Counter
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from urllib.parse import urlparse
import argparse, hashlib, json, os, re, sys
import requests
from bs4 import BeautifulSoup

HERE=Path(__file__).resolve()
ROOT=HERE.parents[2]
sys.path.insert(0,str(HERE.parents[1]))
from collect_hto_completed_scores import collect, Hold as ScoresHold
from hot_stove_boxscore_parity import official_scoring_rows, HTO_ENDPOINT

TEAM="Brave H.C."
SEASON="W2026/27"

class EditorialHold(ValueError):
    pass

def require(ok, reason):
    if not ok: raise EditorialHold(reason)

def clean(s):
    return re.sub(r"\s+"," ",str(s).replace("\xa0"," ")).strip()

def md(s):
    return escape(clean(s)).replace(chr(96),"&#96;").replace("|","&#124;")

def approved_ids_and_parity(feed,games):
    require(feed.get("schema")=="brave-hc-hot-stove-editorial-preview/v1" and
            feed.get("team")==TEAM and feed.get("editorialState")=="FOUNDER_APPROVED",
            "APPROVED_FEED_INVALID")
    articles=[feed.get("latestArticle")]+[x.get("article") for x in feed.get("archive",[])]
    require(all(isinstance(a,dict) for a in articles),"APPROVED_ARTICLE_MISSING")
    ids=[a.get("gameId") for a in articles]
    require(all(isinstance(i,int) for i in ids) and len(ids)==len(set(ids)),
            "APPROVED_GAME_IDENTITIES_INVALID")
    source={g["htoGameId"]:g for g in games}
    require(len(source)==len(games),"DUPLICATE_OFFICIAL_GAME_ID")
    for article in articles:
        game=source.get(article["gameId"])
        require(game is not None,"APPROVED_GAME_DISAPPEARED_"+str(article["gameId"]))
        box=article.get("boxScore") or {}
        require((game["date"],game["opponentExact"],game["gf"],game["ga"])==
                (article.get("date"),box.get("opponent"),box.get("ourGoals"),box.get("theirGoals")),
                "APPROVED_RESULT_PARITY_DRIFT_"+str(article["gameId"]))
        require(article.get("verification",{}).get("status")=="SOURCE_VERIFIED",
                "APPROVED_ARTICLE_UNVERIFIED")
    return set(ids)

def qualify_next(games,feed,countdown,now):
    require(countdown.get("schema")=="brave-hc-upcoming-countdown/v1" and
            countdown.get("team")==TEAM and countdown.get("season")==SEASON,
            "SCHEDULE_IDENTITY_INVALID")
    known=approved_ids_and_parity(feed,games)
    pending=sorted((g for g in games if g["htoGameId"] not in known),
                   key=lambda g:(g["date"],g["htoGameId"]))
    if not pending: return "WAITING_OFFICIAL_FINAL",None
    game=pending[0]
    slots=[x for x in countdown.get("games",[]) if x.get("id")==game["htoGameId"]]
    require(len(slots)==1,"NEW_GAME_NOT_IN_VERIFIED_SCHEDULE")
    slot=slots[0]
    require((slot.get("gameDate"),slot.get("opponent"))==
            (game["date"],game["opponentExact"]),"HTO_SCHEDULE_GAME_ID_MISMATCH")
    require(game.get("season")==SEASON and game.get("gameType")=="Regular Season",
            "UNSUPPORTED_GAME_SCOPE")
    try: puck=datetime.fromisoformat(slot["puckDropUTC"].replace("Z","+00:00"))
    except (ValueError,TypeError,KeyError) as exc:
        raise EditorialHold("SCHEDULE_TIME_INVALID") from exc
    require(puck.tzinfo is not None,"SCHEDULE_TIMEZONE_MISSING")
    if now.astimezone(timezone.utc)<puck+timedelta(hours=2):
        return "WAITING_POSTGAME_CONFIRMATION",None
    require(slot.get("homeAway") in ("Home","Away") and slot.get("rink"),
            "SCHEDULE_LOCATION_UNVERIFIED")
    return "READY_FOR_SCORING_PARITY",{**game,"schedule":slot}

def official_boxscore_html(session,game):
    params={"u":"BRAVESHOCKEY","s":"hockey","sportsHQ":"BRAVESHOCKEY",
            "gameID":str(game["htoGameId"]),"p":"boxscore"}
    r=session.get(HTO_ENDPOINT,params=params,timeout=25)
    r.raise_for_status()
    u=urlparse(r.url)
    require(u.scheme=="https" and u.hostname in ("www.htosports.com","htosports.com"),
            "HTO_SOURCE_HOST_INVALID")
    require(len(r.content)<500000,"HTO_SOURCE_TOO_LARGE")
    return r.text,r.url

def parse_skater_stats(html):
    soup=BeautifulSoup(html,"html.parser")
    for table in soup.find_all("table"):
        trs=table.find_all("tr")
        if not trs: continue
        header=[clean(c.get_text(" ",strip=True))
                for c in trs[0].find_all(["th","td"],recursive=False)]
        keys=("No","Name","GP","G","A","Pts","POTG")
        if not set(keys).issubset(set(header)):continue
        require(all(header.count(k)==1 for k in keys),"SKATER_TABLE_COLUMNS_AMBIGUOUS")
        pos={k:header.index(k) for k in keys}
        players=[]
        for tr in trs[1:]:
            row=[clean(c.get_text(" ",strip=True))
                 for c in tr.find_all(["th","td"],recursive=False)]
            require(len(row)==len(header),"SKATER_TABLE_ROW_SHAPE_CHANGED")
            name=row[pos["Name"]]
            if name in ("","Team Stats"):continue
            try:
                gp,g,a,pts,potg=(int(row[pos[k]]) for k in ("GP","G","A","Pts","POTG"))
            except (ValueError,TypeError) as exc:raise EditorialHold("SKATER_STAT_NOT_INTEGER") from exc
            require(gp>=0 and g>=0 and a>=0 and pts==g+a and potg in (0,1),
                    "SKATER_STAT_TOTAL_INVALID")
            players.append({"name":name,"number":row[pos["No"]],
                            "gp":gp,"g":g,"a":a,"pts":pts,"potg":potg})
        require(players and len(set(p["name"] for p in players))==len(players),
                "SKATER_NAMES_MISSING_OR_DUPLICATED")
        return players
    raise EditorialHold("SKATER_TABLE_NOT_FOUND")

def assists(text):
    if "(" not in text:return 0
    m=re.search(r"\(([^)]*)\)",text)
    require(m is not None,"OFFICIAL_ASSISTS_MALFORMED")
    items=[clean(s) for s in m.group(1).split(",") if clean(s)]
    require(len(items)<=2 and all(re.match(r"^\d+\s+\S",s) for s in items),
            "OFFICIAL_ASSIST_IDENTITY_UNVERIFIED")
    return len(items)

def validate_boxscore(game,events,skaters):
    ours=[x for x in events if x["team"]==TEAM]
    theirs=[x for x in events if x["team"]!=TEAM]
    require(len(ours)==game["gf"] and len(theirs)==game["ga"],
            "EVENT_TOTAL_MISMATCH")
    require(all(x["team"]==game["opponentExact"] for x in theirs),
            "OPPONENT_IDENTITY_MISMATCH")
    require(all(x["officialText"]!="-" and re.match(r"^\d+\s+\S",x["officialText"])
                for x in ours),"BRAVES_GOAL_SCORER_NOT_VERIFIED")
    for x in events:
        require(type(x["period"])==int and 1<=x["period"]<=5 and
                re.fullmatch(r"\d{1,2}:\d{2}",x["clock"]) and
                x["strength"] in ("ES","PP","SH","PS","EN"),
                "EVENT_PERIOD_TIME_OR_STRENGTH_INVALID")
    require(sum(x["g"] for x in skaters)==game["gf"],"PLAYER_GOALS_DONT_RECONCILE")
    require(sum(x["a"] for x in skaters)==sum(assists(x["officialText"]) for x in ours),
            "PLAYER_ASSISTS_DONT_RECONCILE")
    periods=[{"period":p,"braves":sum(x["period"]==p for x in ours),
              "opponent":sum(x["period"]==p for x in theirs)}
             for p in range(1,6)
             if p<=3 or any(x["period"]==p for x in events)]
    return {"goalsFor":len(ours),"goalsAgainst":len(theirs),
            "periods":periods,"ourGoalEvents":ours,"opponentGoalEvents":theirs,
            "skaterStats":skaters,
            "playersOfTheGame":[p["name"] for p in skaters if p["potg"]==1]}

def draft_markdown(game,facts):
    gf,ga=game["gf"],game["ga"]
    outcome="Defeat" if gf>ga else "Fall to" if gf<ga else "Tie with"
    headline="Braves "+outcome+" "+game["opponentExact"]+" "+str(gf)+"–"+str(ga)
    d=datetime.strptime(game["date"],"%Y-%m-%d")
    day=d.strftime("%B ")+str(d.day)+d.strftime(", %Y")
    verb="defeated" if gf>ga else "lost to" if gf<ga else "tied"
    lines=["# "+md(headline),"",
           "**EDITORIAL DRAFT — NOT APPROVED FOR PUBLICATION**","",
           "**Game:** "+md(day)+" · "+md(game["schedule"]["rink"]),"",
           "## Verified opening facts","",
           "Brave H.C. "+verb+" "+md(game["opponentExact"])+" "+str(gf)+"–"+str(ga)+
           " on "+md(day)+", according to the finalized HTO game sheet.","",
           "## Period-by-period",""]
    for p in facts["periods"]:
        lines.append("- Period "+str(p["period"])+": Braves "+str(p["braves"])+
                     ", "+md(game["opponentExact"])+" "+str(p["opponent"]))
    lines+=["","## Brave H.C. scoring events",""]
    if not facts["ourGoalEvents"]:lines.append("No Brave H.C. goals were recorded.")
    for g in facts["ourGoalEvents"]:
        lines.append("- P"+str(g["period"])+" · HTO clock "+md(g["clock"])+
                     " · "+md(g["strength"])+" — "+md(g["officialText"]))
    lines+=["","## Official points leaders",""]
    leaders=sorted((p for p in facts["skaterStats"] if p["pts"]>0),
                   key=lambda p:(-p["pts"],-p["g"],p["name"]))
    if not leaders:lines.append("No Braves player points recorded.")
    for p in leaders:
        lines.append("- "+md(p["name"])+": "+str(p["g"])+" G, "+str(p["a"])+
                     " A, "+str(p["pts"])+" PTS")
    lines+=["","## Player of the Game credits",""]
    if facts["playersOfTheGame"]:
        lines.extend("- "+md(name) for name in facts["playersOfTheGame"])
    else:lines.append("No POTG credits verified from the official skater table.")
    lines+=["","## Editorial verification required","",
        "- Develop a readable game narrative from verified evidence; scoring events alone do not prove tactics.",
        "- Check goalie performance, team milestones and head-to-head against independently verified sources.",
        "- Do not assume attendance or future lineup availability.",
        "- LiveBarn clips and highlight commentary are excluded; a separate chat owns that work.",
        "- Obtain explicit editorial approval before updating the public Hot Stove or HTO.",
        "","## Official references","",
        "- Box score: "+game["sourceUrl"],
        "- HTO Scores: https://www.htosports.com/teams/default.asp?p=scores&s=hockey&u=BRAVESHOCKEY",""]
    return "\n".join(lines),headline

def atomic_json(path,value):
    tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(tmp,path)

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--output-dir",required=True)
    p.add_argument("--target-game-id",type=int)
    args=p.parse_args(argv)
    out=Path(args.output_dir).expanduser().resolve()
    if out==ROOT or ROOT in out.parents:
        print("HELD_OUTPUT_INSIDE_PUBLIC_REPOSITORY",file=sys.stderr)
        return 2
    out.mkdir(parents=True,exist_ok=True)
    stamp=datetime.now(timezone.utc)
    receipt={"schema":"brave-hc-hot-stove-draft-receipt/v1",
             "checkedAtUTC":stamp.isoformat(),"published":False,
             "productionChanged":False,"videoIntegration":"OUT_OF_SCOPE"}
    try:
        feed=json.loads((ROOT/"widgets"/"hot-stove-approved.json").read_text(encoding="utf-8"))
        countdown=json.loads((ROOT/"widgets"/"countdown.json").read_text(encoding="utf-8"))
        source=collect()
        require(source.get("status")=="PRIVATE_SOURCE_ONLY" and
                source.get("sourceGamesCount")==len(source.get("games",[])),
                "HTO_SCORES_EVIDENCE_INVALID")
        status,game=qualify_next(source["games"],feed,countdown,stamp)
        if game is None:
            receipt.update(status=status,nextExpected=countdown.get("games",[{}])[0].get("id"))
        else:
            if args.target_game_id is not None:
                require(args.target_game_id==game["htoGameId"],
                        "TARGET_IS_NOT_FIRST_UNPUBLISHED_GAME")
            with requests.Session() as session:
                session.headers.update({"User-Agent":"BraveHC-HotStove-readonly/1.0"})
                events,scoring_url=official_scoring_rows(session,game["htoGameId"])
                html,official_url=official_boxscore_html(session,game)
            skaters=parse_skater_stats(html)
            facts=validate_boxscore(game,events,skaters)
            story,headline=draft_markdown(game,facts)
            proof=hashlib.sha256(json.dumps(
                {"id":game["htoGameId"],"score":[game["gf"],game["ga"]],
                 "events":facts["ourGoalEvents"],"skaters":skaters},
                sort_keys=True,ensure_ascii=False).encode("utf-8")).hexdigest()
            stem=game["date"].replace("-","")+"_HTO_"+str(game["htoGameId"])
            filename=stem+"_HotStove_DRAFT.md"
            evidence_file=stem+"_HotStove_EVIDENCE.json"
            (out/filename).write_text(story,encoding="utf-8")
            atomic_json(out/evidence_file,
                {"schema":"brave-hc-hot-stove-source-evidence/private-v1",
                 "editorialState":"DRAFT_NOT_APPROVED","publicationAuthorized":False,
                 "evidenceFingerprint":proof,"headline":headline,
                 "game":game,"facts":facts,"scoringURL":scoring_url,
                 "officialBoxscoreURL":official_url,"checkedAtUTC":stamp.isoformat()})
            receipt.update(status="DRAFT_READY_FOR_HUMAN_REVIEW",
                           officialGameId=game["htoGameId"],opponent=game["opponentExact"],
                           gameDate=game["date"],fingerprint=proof,
                           files=[filename,evidence_file])
    except (ScoresHold,EditorialHold,requests.RequestException,OSError,ValueError,KeyError,TypeError) as e:
        receipt.update(status="HELD_SOURCE_OR_GOVERNANCE",holdReason=str(e))
        atomic_json(out/"status.json",receipt)
        print(json.dumps(receipt,ensure_ascii=False),file=sys.stderr)
        return 2
    atomic_json(out/"status.json",receipt)
    print(json.dumps(receipt,ensure_ascii=False))
    return 0

if __name__=="__main__":
    sys.exit(main())
