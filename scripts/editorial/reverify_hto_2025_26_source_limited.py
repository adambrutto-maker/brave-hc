#!/usr/bin/env python3
"""Source-recheck 19 historical HTO games with incomplete event detail.

Read-only. The first five complete-scoring games are in a separately reviewed
wave. Three forfeits must never be interpreted as zero-goal played games.
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
DEST=ROOT/"docs/editorial/native_hto/2025-26/source_limited_review/reverification.json"
IN_SCOPE={"SCOREBOARD_AND_SKATERS_ONLY","EVENTS_WITH_PARTIAL_PLAYER_STATS"}

def clean(s):
    return re.sub(r"\s+"," ",str(s).replace("\xa0"," ")).strip()

def rows(table):
    return [[clean(x.get_text(" ",strip=True)) for x in tr.find_all(["th","td"],recursive=False)]
            for tr in table.find_all("tr")]

def check_game(expected):
    eid=expected["id"]
    result={"gameId":eid,"date":expected["date"],"opponent":expected["opponentRaw"],
            "priorGrade":expected["auditStatus"],"url":expected["boxscoreURL"],
            "status":"HELD_SOURCE_CHANGE","checks":[]}
    try:
        r=requests.get(expected["boxscoreURL"]+"&archTog=1",timeout=28,
                       headers={"User-Agent":"BraveHC-history-readonly-verification/1.0"})
        r.raise_for_status()
        soup=BeautifulSoup(r.content,"html.parser")
        all_tables=[rows(t) for t in soup.find_all("table")]
        board=next((table for table in all_tables if len(table)==3 and
                    table[0] and clean(table[0][0]).upper() in ("REGULAR SEASON","PLAYOFFS")
                    and len(table[0])>=5),None)
        if not board:
            result["checks"].append("SCOREBOARD_MISSING")
            return result
        header=board[0]
        if header[0].upper()!=expected["gameType"]:
            result["checks"].append("GAME_TYPE_CHANGED")
        our=next((x for x in board[1:3] if x[0]=="Brave H.C."),None)
        their=next((x for x in board[1:3] if x[0]==expected["opponentRaw"]),None)
        if our is None or their is None or not (len(our)==len(their)==len(header)):
            result["checks"].append("SCOREBOARD_TEAM_OR_WIDTH_MISMATCH")
            return result
        try:
            gf,ga=int(our[-1]),int(their[-1])
            ours=[int(x) for x in our[1:-1]]
            theirs=[int(x) for x in their[1:-1]]
        except ValueError:
            result["checks"].append("SOURCE_SCORE_NOT_NUMERIC")
            return result
        if (gf,ga)!=(expected["gf"],expected["ga"]):
            result["checks"].append("OFFICIAL_FINAL_SCORE_CHANGED")
        if sum(ours)!=gf or sum(theirs)!=ga:
            result["checks"].append("OFFICIAL_PERIOD_TOTAL_INVALID")
        ps=[{"period":header[i+1],"braves":p,"opponent":theirs[i]}
            for i,p in enumerate(ours)]
        if ps!=expected["periods"]:
            result["checks"].append("OFFICIAL_PERIODS_DIFFER_FROM_AUDIT")
        skaters=next((table for table in all_tables if table and
                      all(h in table[0] for h in ("No","Name","GP","POS"))),None)
        if not skaters:
            result["checks"].append("GAME_SKATER_TABLE_MISSING")
            return result
        sh=skaters[0]
        current=[]
        for line in skaters[1:]:
            if not line or len(line)!=len(sh):
                result["checks"].append("GAME_SKATER_ROW_WIDTH_CHANGED")
                continue
            name=line[sh.index("Name")]
            if not name or name=="Team Stats":continue
            d={"name":name,"number":line[sh.index("No")]}
            for col in ("GP","G","A","Pts"):
                if col in sh:
                    try:d[col]=int(line[sh.index(col)])
                    except ValueError:result["checks"].append("GAME_SKATER_NON_INTEGER_"+col)
            current.append(d)
        baseline=[{"name":p["name"],"number":p["number"],
                  **{col:p[col] for col in ("GP","G","A","Pts") if col in p}}
                  for p in expected.get("players",[])]
        if sorted(current,key=lambda x:(x["number"],x["name"]))!=sorted(
            baseline,key=lambda x:(x["number"],x["name"])):
            result["checks"].append("INDIVIDUAL_OFFICIAL_SKATER_CREDITS_CHANGED")
        if expected["auditStatus"]=="SCOREBOARD_AND_SKATERS_ONLY":
            if not all(all(k in x for k in ("G","A","Pts")) for x in current):
                result["checks"].append("COMPLETE_SKATER_CREDITS_MISSING")
            elif sum(x["G"] for x in current)!=gf:
                result["checks"].append("SKATER_GOALS_NOT_EQUAL_FINAL")
        # Do NOT require goal timestamps or identify scorer-event players for
        # missing event logs. This preserves the original official evidence limit.
        result.update(http=r.status_code,sourceHtmlSHA256=sha256(r.content).hexdigest(),
                      verifiedPeriodCount=len(ps),verifiedSkaters=len(current),
                      parsedScore=[gf,ga],
                      structuredFingerprint=sha256(json.dumps({
                        "gameId":eid,"date":expected["date"],"opponent":expected["opponentRaw"],
                        "gameType":header[0],"score":[gf,ga],"periods":ps,
                        "players":current},sort_keys=True,ensure_ascii=False).encode("utf8")).hexdigest())
        result["checks"]=sorted(set(result["checks"]))
        if not result["checks"]:result["status"]="PUBLIC_SOURCE_RECONFIRMED"
        return result
    except Exception as exc:
        result["checks"].append(type(exc).__name__+": "+str(exc)[:160])
        return result

def main():
    a=json.loads(AUDIT.read_text(encoding="utf8"))
    if a["schema"]!="brave-hc-hto-2025-26-boxscore-audit/read-only-v1":
        raise ValueError("Source audit schema drift")
    games=[g for g in a["games"] if g["auditStatus"] in IN_SCOPE]
    if len(games)!=19 or len({g["id"] for g in games})!=19:
        raise ValueError("Unexpected historical source-limited coverage")
    with ThreadPoolExecutor(max_workers=4) as pool:
        checked=list(pool.map(check_game,games))
    for x in checked:
        print("RECHECK",x["gameId"],x["status"],
              ",".join(x["checks"]) if x["checks"] else "source stable",flush=True)
    receipt={"schema":"brave-hc-2025-26-historical-source-reverification/v1",
             "checkedAtUTC":datetime.now(timezone.utc).isoformat(),
             "authority":"HTO public original individual game boxscore",
             "sourceGradeScope":sorted(IN_SCOPE),
             "attemptedGames":len(checked),
             "reconfirmed":sum(x["status"]=="PUBLIC_SOURCE_RECONFIRMED" for x in checked),
             "held":sum(x["status"]!="PUBLIC_SOURCE_RECONFIRMED" for x in checked),
             "htowrites":0,"nativePublicationAuthorized":False,
             "games":checked}
    DEST.parent.mkdir(parents=True,exist_ok=True)
    DEST.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",
                    encoding="utf8",newline="\n")
    print("FINAL",json.dumps({"reconfirmed":receipt["reconfirmed"],"held":receipt["held"],
                              "file":str(DEST)}),flush=True)
    return 2 if receipt["held"] else 0

if __name__=="__main__":sys.exit(main())
