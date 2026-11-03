"""Separate PRIVATE Brave H.C. SVHL player-profile readback.

This is a shadow-only source for discrepancy investigation.
No published HTO player values or public opponent feed are modified.
"""
from __future__ import annotations
from argparse import ArgumentParser
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from urllib.request import Request,urlopen
import json
import sys

from collect_svhl_opponent_profiles import parse, ProfileHold
BRAVE_ID=13679
SCHEMA="brave-hc-svhl-own-player-profiles-shadow/private-v1"

class ShadowProfileHold(ValueError):
    pass

def need(ok,reason):
    if not ok:
        raise ShadowProfileHold("BRAVE_SHADOW_PROFILE_HOLD:"+reason)

def url(pid):
    need(type(pid) is int and pid>0,"UNSUPPORTED_PLAYER")
    return ("https://leagues.sportsvillage.ca/playerinfo.aspx?"
            f"leagueid=570&teamid={BRAVE_ID}&playerid={pid}&page_type=Adult")

def read(urlvalue):
    parsed=urlparse(urlvalue);q=parse_qs(parsed.query)
    need(parsed.scheme=="https" and parsed.hostname=="leagues.sportsvillage.ca" and
         parsed.path.lower()=="/playerinfo.aspx" and
         q.get("leagueid")==["570"] and q.get("teamid")==[str(BRAVE_ID)] and
         q.get("page_type")==["Adult"] and q.get("playerid",[""])[0].isdigit(),
         "UNAPPROVED_SHADOW_URL")
    with urlopen(Request(urlvalue,headers={"User-Agent":
          "Mozilla/5.0 (BraveHC-HockeyOS private source comparison)"}),timeout=18) as r:
        need(r.status==200,"SOURCE_HTTP_FAILED")
        content=r.read(90001)
    need(1000<=len(content)<=90000,"BOUNDED_SOURCE_SIZE_CHANGED")
    return content.decode("utf8",errors="replace"),sha256(content).hexdigest()

def collect(roster,getter=read):
    need(roster.get("schema")=="brave-hc-public-svhl-roster-seasons/v1" and
         roster.get("sourceLeagueId")==570 and roster.get("currentTeams")==22,
         "ROSTER_SOURCE_NOT_QUALIFIED")
    teams=[t for t in roster["teams"] if t["sourceTeamId"]==BRAVE_ID]
    need(len(teams)==1 and teams[0]["name"]=="Braves HC" and
         teams[0]["rosterCount"]==len(teams[0]["players"]),"BRAVES_ROSTER_NOT_BOUND")
    def worker(p):
        page=url(p["playerId"])
        try:
            html,digest=getter(page)
            stats=parse(html,p)
            return {"playerId":p["playerId"],"name":p["name"],"sourceUrl":page,
                    "sourceSHA256":digest,"status":"PRIVATE_PROFILE_VERIFIED",
                    "stats":stats}
        except (OSError,ValueError,ProfileHold,TimeoutError) as exc:
            return {"playerId":p["playerId"],"name":p["name"],"sourceUrl":page,
                    "status":"PRIVATE_PROFILE_HELD","reason":str(exc)[:180],
                    "stats":None}
    with ThreadPoolExecutor(max_workers=3) as pool:
        captured=list(pool.map(worker,teams[0]["players"]))
    captured.sort(key=lambda x:x["playerId"])
    return {"schema":SCHEMA,"asOf":datetime.now(timezone.utc).isoformat(),
            "sourceRosterAsOf":roster["asOf"],
            "officialSVHLTeamId":BRAVE_ID,
            "sourceAuthority":"PRIVATE_SVHL_BRAVE_SHADOW_ONLY",
            "profileRows":captured,"attempted":len(captured),
            "verified":sum(x["status"]=="PRIVATE_PROFILE_VERIFIED" for x in captured),
            "held":sum(x["status"]=="PRIVATE_PROFILE_HELD" for x in captured),
            "htoIsAuthoritative":True,"publicPublicationAllowed":False,
            "publicOpponentFeedWritten":False,
            "note":"SVHL PPG means power-play goals, not points per game. HTO remains authoritative."}

def main():
    p=ArgumentParser()
    p.add_argument("--roster",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    try:
        data=json.loads(args.roster.read_text("utf8"))
        report=collect(data)
        need(args.out.parent.is_dir() and
             "widgets" not in [x.lower() for x in args.out.parts],
             "PRIVATE_DESTINATION_REQUIRED")
        tmp=args.out.with_suffix(args.out.suffix+".tmp")
        tmp.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
        tmp.replace(args.out)
        print(json.dumps({"state":"PRIVATE_BRAVES_PROFILE_CAPTURE",
             "attempted":report["attempted"],"verified":report["verified"],
             "held":report["held"],"htoWritten":False,"publicWritten":False}))
        return 0
    except (OSError,KeyError,ValueError,TypeError,ShadowProfileHold) as exc:
        print(json.dumps({"state":"HOLD","reason":str(exc)[:400]}),file=sys.stderr)
        return 2

if __name__=="__main__":
    sys.exit(main())
