#!/usr/bin/env python3
"""Verify five detailed Brave H.C. 2025/26 historical source game sheets again.

Read-only official HTO boxscores, identity, skater parity and full goal events.
"""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
import json,re,requests,sys
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[2]
AUDIT=ROOT/"docs/editorial/native_hto/2025-26/official_boxscore_source_audit.json"
DEST=ROOT/"docs/editorial/native_hto/2025-26/editorial_review/fresh_full_event_reverification.json"
FULL="FULL_GAME_EVENTS_AND_SKATERS"

def clean(s):
    return re.sub(r"\s+"," ",str(s).replace("\xa0"," ")).strip()

def rows(t):
    return [[clean(x.get_text(" ",strip=True)) for x in tr.find_all(["th","td"],recursive=False)]
            for tr in t.find_all("tr")]

def verify(g):
    item={"id":g["id"],"url":g["boxscoreURL"],"checks":[],"status":"HELD"}
    try:
        r=requests.get(g["boxscoreURL"]+"&archTog=1",timeout=28,
            headers={"User-Agent":"BraveHC-HTO-history-full-event-readonly/1.0"})
        r.raise_for_status()
        soup=BeautifulSoup(r.text,"html.parser")
        tables=[rows(t) for t in soup.find_all("table")]
        board=next((t for t in tables if len(t)==3 and t[0] and
            t[0][0].upper() in ("REGULAR SEASON","PLAYOFFS") and len(t[0])>=5),None)
        if not board:
            item["checks"].append("SCOREBOARD_MISSING")
            return item
        head=board[0]
        ours=next((x for x in board[1:] if x[0]=="Brave H.C."),None)
        opp=next((x for x in board[1:] if x[0]==g["opponentRaw"]),None)
        if ours is None or opp is None or not (len(ours)==len(opp)==len(head)):
            item["checks"].append("SOURCE_TEAM_IDENTITY_MISMATCH")
            return item
        try:
            scores=[int(ours[-1]),int(opp[-1])]
            periods=[{"period":head[i+1],"braves":int(ours[i+1]),
                      "opponent":int(opp[i+1])} for i in range(len(head)-2)]
        except ValueError:
            item["checks"].append("PERIOD_NOT_NUMERIC")
            return item
        if (tuple(scores)!=(g["gf"],g["ga"]) or periods!=g["periods"] or
            head[0].upper()!=g["gameType"]):
            item["checks"].append("OFFICIAL_FINAL_OR_PERIOD_DRIFT")
        events=next((t for t in tables if t and t[0] and
                     "Per Period" in t[0] and any("Scorer" in x for x in t[0])),None)
        if not events:
            item["checks"].append("ORIGINAL_GOAL_EVENT_LOG_MISSING")
            return item
        parsed=[]
        for line in events[1:]:
            if len(line)<6:
                item["checks"].append("SCORING_ROW_SHAPE_MISMATCH")
                continue
            period,clock,strength,team,credit,scores_text=line[:6]
            parsed.append({"period":period,"clock":clock,"strength":strength,
                           "team":team,"credit":credit,"scoreText":scores_text})
        if parsed!=g["events"]:
            item["checks"].append("FULL_GOAL_EVENT_LOG_CHANGED")
        if len(parsed)!=sum(scores):
            item["checks"].append("FINAL_SCORE_AND_EVENTS_DIVERGED")
        skater=next((t for t in tables if t and all(x in t[0] for x in ("No","Name","GP","POS"))),None)
        if not skater:
            item["checks"].append("SKATER_TABLE_MISSING")
            return item
        hdr=skater[0];player=[]
        for line in skater[1:]:
            if len(line)!=len(hdr):
                item["checks"].append("SKATER_ROW_LENGTH_CHANGED")
                continue
            if line[hdr.index("Name")] in ("","Team Stats"):continue
            row={"name":line[hdr.index("Name")],"number":line[hdr.index("No")]}
            for k in ("G","A","Pts"):
                if k in hdr:
                    try:row[k]=int(line[hdr.index(k)])
                    except ValueError:item["checks"].append("SKATER_NUMBER_INVALID")
            player.append(row)
        expected=[{"name":p["name"],"number":p["number"],
                   "G":p["G"],"A":p["A"],"Pts":p["Pts"]} for p in g["players"]]
        if sorted(player,key=lambda x:(x["name"],x["number"]))!=sorted(expected,key=lambda x:(x["name"],x["number"])):
            item["checks"].append("OFFICIAL_SKATER_STATS_DRIFT")
        if sum(x["G"] for x in player)!=g["gf"]:
            item["checks"].append("SCORING_CREDITS_NOT_FINAL")
        item["checks"]=sorted(set(item["checks"]))
        item.update(http=r.status_code,
                    sourceSHA256=sha256(r.content).hexdigest(),
                    scoringEvents=len(parsed),skaterRows=len(player),
                    periodCount=len(periods),
                    structuredSourceFingerprint=sha256(json.dumps({
                        "id":g["id"],"date":g["date"],"opponent":g["opponentRaw"],
                        "periods":periods,"events":parsed,"players":player,
                    },sort_keys=True,ensure_ascii=False).encode("utf8")).hexdigest())
        if not item["checks"]:item["status"]="FULL_EVENT_AND_SKATER_SOURCE_RECONFIRMED"
        return item
    except Exception as exc:
        item["checks"].append(type(exc).__name__+": "+str(exc)[:150])
        return item

def main():
    a=json.loads(AUDIT.read_text(encoding="utf8"))
    games=[g for g in a["games"] if g["auditStatus"]==FULL]
    if len(games)!=5:raise RuntimeError("Expected five detailed HTO games")
    with ThreadPoolExecutor(max_workers=3) as pool:
        verified=list(pool.map(verify,games))
    for x in verified:
        print("FULL_EVENT_RECHECK",x["id"],x["status"],x["checks"],flush=True)
    count=sum(x["status"]=="FULL_EVENT_AND_SKATER_SOURCE_RECONFIRMED" for x in verified)
    record={"schema":"brave-hc-hto-2025-26-five-full-event-source-recheck/v1",
            "checkedAtUTC":datetime.now(timezone.utc).isoformat(),
            "publicSource":"HTO official exact game boxscore",
            "gamesRechecked":5,"verifiedGames":count,
            "nativeHTOWrites":0,"publicationAuthorized":False,
            "games":verified}
    DEST.parent.mkdir(parents=True,exist_ok=True)
    DEST.write_text(json.dumps(record,ensure_ascii=False,indent=2)+"\n",
                    encoding="utf8",newline="\n")
    print("FULL_EVENT_RECHECK_FINAL",count,"/5",flush=True)
    return 0 if count==5 else 2

if __name__=="__main__":sys.exit(main())
