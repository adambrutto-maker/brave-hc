#!/usr/bin/env python3
"""Stage evidence-limited historical Brave H.C. retrospectives. Never publish."""
from __future__ import annotations
from collections import Counter
from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
import json,re,sys

ROOT=Path(__file__).resolve().parents[2]
AUDIT=ROOT/"docs/editorial/native_hto/2025-26/official_boxscore_source_audit.json"
OUTPUT=ROOT/"docs/editorial/native_hto/2025-26/retrospective_drafts"
FULL="FULL_GAME_EVENTS_AND_SKATERS"
OT_PARTIAL="EVENTS_WITH_PARTIAL_PLAYER_STATS"
PERIOD="SCOREBOARD_AND_SKATERS_ONLY"
FORFEIT="FORFEIT_ONLY_NO_ON_ICE_RECAP"

def require(v,msg):
 if not v:raise ValueError(msg)

def tidy(v):
 return re.sub(r"\s+"," ",str(v)).replace("|","/").strip()

def fullname(v):
 if "," in v:
  surname,given=v.split(",",1)
  return tidy(given)+" "+tidy(surname)
 return tidy(v)

def date_text(value):
 d=datetime.strptime(value,"%Y-%m-%d")
 return d.strftime("%B ")+str(d.day)+", "+str(d.year)

def period_name(v):
 return {"1":"first period","2":"second period","3":"third period","OT":"overtime","2OT":"second overtime"}.get(v,tidy(v))

def result_title(g):
 gf,ga=g["gf"],g["ga"];op=tidy(g["opponentRaw"])
 if gf==0 and ga==1 and any(p["period"] in ("OT","2OT") and p["opponent"]==1 for p in g.get("periods",[])):
  return "Braves Fall 1–0 to "+op+" in Overtime"
 is_playoff=g["gameType"]=="PLAYOFFS"
 if gf>ga:
  return "Braves Earn "+str(gf)+"–"+str(ga)+(" Playoff" if is_playoff else "")+" Win Over "+op
 if gf<ga:
  return "Braves Fall "+str(gf)+"–"+str(ga)+" to "+op+(" in Playoff Action" if is_playoff else "")
 return "Braves and "+op+" Finish Tied "+str(gf)+"–"+str(ga)

def lead(a,b):
 if a>b:return "led "+str(a)+"–"+str(b)
 if a<b:return "trailed "+str(b)+"–"+str(a)
 return "were tied "+str(a)+"–"+str(b)

def period_summary(g):
 ps=g.get("periods") or []
 require(len(ps)>=3 and [x["period"] for x in ps[:3]]==["1","2","3"],
         "MISSING_CANONICAL_PERIODS_"+str(g["id"]))
 for p in ps:
  require(type(p["braves"]) is int and type(p["opponent"]) is int and
          p["braves"]>=0 and p["opponent"]>=0,"NONINTEGER_PERIOD_SCORE")
 require((sum(x["braves"] for x in ps),sum(x["opponent"] for x in ps))==(g["gf"],g["ga"]),
         "PERIOD_SCORE_NOT_FINAL")
 a1,b1=ps[0]["braves"],ps[0]["opponent"]
 a2,b2=a1+ps[1]["braves"],b1+ps[1]["opponent"]
 if any(p["braves"] or p["opponent"] for p in ps[3:]):
  a3,b3=sum(p["braves"] for p in ps[:3]),sum(p["opponent"] for p in ps[:3])
  last=next(p for p in reversed(ps[3:]) if p["braves"] or p["opponent"])
  who="the Braves" if last["braves"]>last["opponent"] else tidy(g["opponentRaw"])
  return ("Regulation ended "+str(a3)+"–"+str(b3)+". "+who+
          " scored in "+period_name(last["period"])+
          ", bringing the result to "+str(g["gf"])+"–"+str(g["ga"])+".")
 return (("The teams "+lead(a1,b1) if a1==b1 else "The Braves "+lead(a1,b1))+
         " after the first period, and the Braves "+lead(a2,b2)+
         " after two. In the third, the Braves scored "+
         str(ps[2]["braves"])+" and "+tidy(g["opponentRaw"])+" scored "+
         str(ps[2]["opponent"])+", producing the "+str(g["gf"])+"–"+str(g["ga"])+" final.")

def player_summary(g):
 players=[p for p in g.get("players",[]) if all(k in p for k in ("G","A","Pts"))]
 require(players and sum(p["G"] for p in players)==g["gf"],
         "GOAL_TOTAL_NOT_SUPPORTED")
 ranked=sorted((p for p in players if p["Pts"]>0),
               key=lambda p:(-p["Pts"],-p["G"],p["name"]))[:4]
 if not ranked:return "No Brave H.C. skater registered a point in the official player table."
 names=[]
 for p in ranked:
  names.append(fullname(p["name"])+" ("+str(p["G"])+" G, "+
               str(p["A"])+" A, "+str(p["Pts"])+" points)")
 return "The published individual player statistics list "+", ".join(names)+"."

def event_summary(g):
 rows=[x for x in g["events"] if x["team"]=="Brave H.C."]
 require(len(rows)==g["gf"],"NOT_ALL_BRAVES_GOALS_SOURCE_CONFIRMED")
 if not rows:
  return "Brave H.C. was held scoreless, with no Braves goal in the official scoring log."
 details=[period_name(x["period"])+", official clock "+tidy(x["clock"])+" ("+
          tidy(x["strength"])+"): "+tidy(x["credit"]) for x in rows]
 return "The official scoring log credits the Braves with: "+"; ".join(details)+"."

def article(g):
 require(g["auditStatus"] in (FULL,OT_PARTIAL,PERIOD),"GAME_NOT_ELIGIBLE")
 require(not g.get("checks"),"SOURCE_HOLD_PRESENT")
 gf,ga=g["gf"],g["ga"]
 outcome="defeated" if gf>ga else "lost to" if gf<ga else "tied"
 scope="playoff game" if g["gameType"]=="PLAYOFFS" else "regular-season game"
 intro=("Brave H.C. "+outcome+" "+tidy(g["opponentRaw"])+" "+
        str(gf)+"–"+str(ga)+" on "+date_text(g["date"])+
        " in a Winter 2025–26 "+scope+", according to the official HTO box score.")
 paragraphs=[intro,period_summary(g)]
 if g["auditStatus"]!=OT_PARTIAL:paragraphs.append(player_summary(g))
 if g["auditStatus"] in (FULL,OT_PARTIAL):paragraphs.append(event_summary(g))
 notes={
  FULL:"The complete goal-by-goal log matches the published individual player totals and official HTO jersey identities.",
  OT_PARTIAL:"HTO confirms the overtime scoring event and score, but the shutout-loss skater table lacks full goal/assist columns.",
  PERIOD:"HTO confirms the final score, periods and named player totals. No complete goal-by-goal event log is available; no goal times or individual goal-strength details are asserted."
 }
 return paragraphs,notes[g["auditStatus"]]

def build():
 audit=json.loads(AUDIT.read_text(encoding="utf-8"))
 require(audit.get("schema")=="brave-hc-hto-2025-26-boxscore-audit/read-only-v1" and
         audit.get("season")=="Winter_2025/2026","AUDIT_SOURCE_UNEXPECTED")
 games=audit.get("games",[])
 require(len(games)==27 and len({g["id"] for g in games})==27,"GAME_ID_COVERAGE_INCOMPLETE")
 require(all(g["auditStatus"] in (FULL,OT_PARTIAL,PERIOD,FORFEIT) for g in games),
         "UNRESOLVED_SOURCE_HOLDS")
 OUTPUT.mkdir(parents=True,exist_ok=True)
 man={"schema":"brave-hc-hto-historical-retrospective-drafts/v1",
      "season":"Winter_2025/2026",
      "generatedAtUTC":datetime.now(timezone.utc).isoformat(),
      "publicationState":"DRAFT_ONLY_NO_NATIVE_HTO_WRITES",
      "sourceAudit":"docs/editorial/native_hto/2025-26/official_boxscore_source_audit.json",
      "sourceAuditSHA256":sha256(AUDIT.read_bytes()).hexdigest(),
      "stories":[],"forfeits":[]}
 for g in games:
  source={k:g.get(k) for k in
          ("id","date","gameType","gf","ga","opponentRaw","periods",
           "events","players","htmlSHA256","auditStatus")}
  fingerprint=sha256(json.dumps(source,sort_keys=True,ensure_ascii=False).encode("utf-8")).hexdigest()
  if g["auditStatus"]==FORFEIT:
   man["forfeits"].append({"gameId":g["id"],"date":g["date"],
      "opponentLabel":g["opponentRaw"],
      "reason":"FORFEIT_NOT_ON_ICE_RESULT","zeroScoreIsNotTie":True,
      "officialPage":g["boxscoreURL"],"sourceFingerprint":fingerprint})
   continue
  paragraphs,note=article(g)
  headline=result_title(g)
  filename=g["date"].replace("-","")+"_HTO_"+str(g["id"])+"_RETROSPECTIVE_DRAFT.md"
  content=["# "+headline,"",
    "**Historical reconstruction prepared November 2026. This was not an original contemporaneous article.**",
    "**EDITORIAL DRAFT — NOT PUBLISHED OR APPROVED FOR NATIVE HTO.**","",
    "**Official game:** "+date_text(g["date"])+" | "+g["gameType"]+
      " | Game ID "+str(g["id"]),"",
    "## Draft article",""]
  for p in paragraphs:content.extend([p,""])
  content.extend(["## Evidence and publication controls","",
      "**Verified source scope:** "+note,"",
      "**Official HTO boxscore:** "+g["boxscoreURL"],"",
      "**Audit coverage:** "+g["auditStatus"],"",
      "**Fingerprint:** "+fingerprint,"",
      "A source score or player stat does not prove tactical causes, video play "
      "descriptions, milestone status, attendance or contemporaneous quotes. "
      "Back up the exact HTO game Summary field and obtain independent editorial "
      "approval and a public readback before native publication.",""])
  (OUTPUT/filename).write_text("\n".join(content),encoding="utf-8",newline="\n")
  man["stories"].append({"gameId":g["id"],"date":g["date"],
       "headline":headline,"opponent":g["opponentRaw"],
       "score":[g["gf"],g["ga"]],"gameType":g["gameType"],
       "coverage":g["auditStatus"],"paragraphs":len(paragraphs),
       "file":filename,"sourceFingerprint":fingerprint,
       "nativeField":"Game Summary","editorialState":"DRAFT_NOT_APPROVED",
       "officialPage":g["boxscoreURL"]})
 require(len(man["stories"])==24 and len(man["forfeits"])==3,
         "EXPECTED_24_STORIES_3_FORFEITS")
 (OUTPUT/"manifest.json").write_text(json.dumps(man,indent=2,ensure_ascii=False)+"\n",
                                     encoding="utf-8",newline="\n")
 return man

if __name__=="__main__":
 try:
  m=build()
  print(json.dumps({"status":m["publicationState"],"stories":len(m["stories"]),
                    "forfeits":len(m["forfeits"]),
                    "coverage":dict(Counter(x["coverage"] for x in m["stories"]))}))
 except (KeyError,ValueError,TypeError) as e:
  print("ARCHIVE_DRAFT_HELD:",str(e),file=sys.stderr)
  sys.exit(2)
