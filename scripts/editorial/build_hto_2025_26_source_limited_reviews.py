#!/usr/bin/env python3
"""Generate source-constrained historical Brave H.C. editorial review drafts.

This script reads prior audited HTO boxscore evidence plus fresh public source
reverification. It never calls an HTO editing endpoint, GitHub Pages or media.
"""
from __future__ import annotations
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json,re,sys

ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/"docs/editorial/native_hto/2025-26"
AUDIT=DIR/"official_boxscore_source_audit.json"
RECHECK=DIR/"source_limited_review/reverification.json"
ORIGINAL=DIR/"retrospective_drafts/manifest.json"
OUTPUT=DIR/"source_limited_review"
SHORT="SCOREBOARD_AND_SKATERS_ONLY"
OT="EVENTS_WITH_PARTIAL_PLAYER_STATS"

def check(value,message):
    if not value:raise ValueError(message)

def label(s):
    t=re.sub(r"\s+"," ",str(s)).strip()
    check(bool(t) and len(t)<300,"UNEXPECTED_SOURCE_TEXT")
    return t.replace("|","/").replace(chr(96),"'").replace("[","(").replace("]",")")

def display_name(s):
    s=label(s)
    if "," not in s:return s
    family,given=s.split(",",1)
    return label(given)+" "+label(family)

def date_str(v):
    d=datetime.strptime(v,"%Y-%m-%d")
    return d.strftime("%B ")+str(d.day)+", "+str(d.year)

def result(a,b):
    return str(a)+"–"+str(b)

def state(a,b):
    if a>b:return "led "+result(a,b)
    if a<b:return "trailed "+result(a,b)
    return "was level at "+result(a,b)

def grade_and_periods(game):
    check(game["auditStatus"]==SHORT,"NOT_A_REGULATION_GAME")
    check(game["gameType"]=="REGULAR SEASON","WRONG_GAME_TYPE")
    ps=game["periods"]
    check(len(ps)==3 and [p["period"] for p in ps]==["1","2","3"],"EXPECTED_THREE_PERIODS")
    check(all(type(x["braves"])==int and type(x["opponent"])==int and
              x["braves"]>=0 and x["opponent"]>=0 for x in ps),"BAD_PERIOD_VALUES")
    check(sum(x["braves"] for x in ps)==game["gf"] and
          sum(x["opponent"] for x in ps)==game["ga"],"PERIOD_TOTAL_NOT_FINAL")
    return ps

def period_sentence(game):
    p=grade_and_periods(game)
    a,b=p[0]["braves"],p[0]["opponent"]
    c,d=a+p[1]["braves"],b+p[1]["opponent"]
    opp=label(game["opponentRaw"])
    return ("Brave H.C. "+state(a,b)+" after the first period. "+
            "In the second, the Braves scored "+str(p[1]["braves"])+
            " and "+opp+" scored "+str(p[1]["opponent"])+
            ", leaving the teams at "+result(c,d)+
            " after two periods. In the third, Brave H.C. scored "+
            str(p[2]["braves"])+" while "+opp+" recorded "+
            str(p[2]["opponent"])+", producing the "+
            result(game["gf"],game["ga"])+" final.")

def source_turn(game):
    p=grade_and_periods(game)
    a,b=p[0]["braves"]+p[1]["braves"],p[0]["opponent"]+p[1]["opponent"]
    gf,ga=game["gf"],game["ga"]
    opp=label(game["opponentRaw"])
    if a<b and gf>ga:
        return ("The Braves entered the third behind, then outscored "+opp+
                " "+result(p[2]["braves"],p[2]["opponent"])+" in the final period to win.")
    if a>b and gf<ga:
        return ("Brave H.C. held the lead after two, but "+opp+
                " scored more goals in the third and won the game.")
    if a>b and gf==ga:
        return ("The Braves led after two periods before "+opp+
                " brought the teams level in the third.")
    if a<b and gf==ga:
        return ("Brave H.C. trailed entering the third, but the final period brought the teams level.")
    if a==b and gf>ga:
        return ("The teams were level after two; the Braves outscored "+opp+
                " in the third to secure the result.")
    if a==b and gf<ga:
        return ("The teams were level after two before "+opp+
                " finished with more third-period goals.")
    return ""

def production(game):
    players=game["players"]
    check(bool(players),"NO_HTO_SKATER_STATS")
    check(all(all(k in p for k in ("name","G","A","Pts")) and
              p["G"]>=0 and p["A"]>=0 and p["Pts"]==p["G"]+p["A"]
              for p in players),"PLAYER_POINT_PARITY")
    check(sum(p["G"] for p in players)==game["gf"],"PLAYER_GOAL_TOTAL_DIFFERENT")
    leaders=sorted((p for p in players if p["Pts"]>0),
                   key=lambda p:(-p["Pts"],-p["G"],p["name"]))[:4]
    if not leaders:
        return "The official HTO skater table records no Brave H.C. player points in this game."
    values=[
        display_name(p["name"])+" ("+str(p["G"])+" G, "+str(p["A"])+" A, "+
        str(p["Pts"])+" PTS)"
        for p in leaders]
    return "The official individual HTO player statistics credit "+("; ".join(values))+"."

def distinctive_fact(game):
    p=grade_and_periods(game)
    opp=label(game["opponentRaw"])
    if p[0]["braves"]>=5:
        return ("The "+str(p[0]["braves"])+" opening-period Braves goals accounted for "+
                str(p[0]["braves"])+" of the team's "+str(game["gf"])+
                " total goals in the "+opp+" game.")
    goals=sorted((s for s in game["players"] if s.get("G",0)>=3),
                 key=lambda s:(-s["G"],s["name"]))
    if goals:
        s=goals[0]
        return ("The HTO skater table credits "+display_name(s["name"])+" with "+
                str(s["G"])+" goals. Exact goal times and strengths are not available from the historical event log.")
    if game["gf"]==0 or game["ga"]==0:
        return ("The official final score was "+result(game["gf"],game["ga"])+
                ". The team score alone does not verify an individual goalie shutout credit.")
    return ("This retrospective uses the final and period scores plus published player totals. "+
            "The archived HTO record does not display a complete goal-by-goal scoring log.")

def overtime_story(game):
    check(game["id"]==2215014 and game["auditStatus"]==OT and
          game["gameType"]=="PLAYOFFS" and (game["gf"],game["ga"])==(0,1),
          "OVERTIME_GAME_IDENTITY_CONFLICT")
    p=game["periods"]
    check(len(p)>=4 and all(x["braves"]==x["opponent"]==0 for x in p[:3])
          and p[3]["period"]=="OT" and p[3]["opponent"]==1,
          "OVERTIME_GOAL_PERIOD_CONFLICT")
    events=game.get("events",[])
    check(len(events)==1 and events[0]["team"]=="Schmelts" and
          events[0]["clock"]=="1:05" and events[0]["period"]=="OT" and
          events[0]["credit"]=="-","OVERTIME_EVENT_SOURCE_CONFLICT")
    goalies=game.get("goalies",[])
    check(len([g for g in goalies if g.get("name")=="Svec, Matt" and
               g.get("GA")=="1" and g.get("L")=="1"])==1,
          "HTO_GOALIE_RESULT_CONFLICT")
    return [
      "Brave H.C. fell 1–0 in overtime to Schmelts on March 22, 2026, in a Winter 2025–26 playoff game, according to the official HTO box score.",
      "The two teams were scoreless through all three regulation periods. One Schmelts goal in overtime decided the 1–0 final.",
      "HTO records the overtime goal at 1:05 on its game clock with an ES strength label. The published scoring line does not identify the scorer, so no individual is credited with the goal in this retrospective.",
      "The official HTO goalie table credits Matt Svec with the loss and one goal against. It does not establish a save total, a tactical cause or the circumstances of the overtime play."
    ]

def paragraphs(game):
    if game["auditStatus"]==OT:return overtime_story(game)
    check(game["auditStatus"]==SHORT,"UNKNOWN_SOURCE_GRADE")
    gf,ga=game["gf"],game["ga"]
    verb="defeated" if gf>ga else "lost to" if gf<ga else "tied"
    pp=[
      "Brave H.C. "+verb+" "+label(game["opponentRaw"])+" "+result(gf,ga)+
      " on "+date_str(game["date"])+
      ", in a Winter 2025–26 regular-season game, according to the official HTO box score.",
      period_sentence(game)
    ]
    turn=source_turn(game)
    if turn:pp.append(turn)
    pp.extend([production(game),distinctive_fact(game)])
    check(4<=len(pp)<=5,"BAD_PARAGRAPH_COVERAGE")
    return pp

def build():
    audit=json.loads(AUDIT.read_text(encoding="utf8"))
    check(audit.get("schema")=="brave-hc-hto-2025-26-boxscore-audit/read-only-v1",
          "ORIGINAL_AUDIT_SCHEMA_MISMATCH")
    recheck=json.loads(RECHECK.read_text(encoding="utf8"))
    check(recheck.get("schema")=="brave-hc-2025-26-historical-source-reverification/v1" and
          recheck["attemptedGames"]==recheck["reconfirmed"]==19 and
          recheck["held"]==0,"FRESH_OFFICIAL_SOURCE_RECHECK_REQUIRED")
    old=json.loads(ORIGINAL.read_text(encoding="utf8"))
    check(len(old["stories"])==24 and len(old["forfeits"])==3,
          "SOURCE_STORY_AND_FORFEIT_COUNTS_CHANGED")
    byid={x["gameId"]:x for x in old["stories"]}
    statuses={x["gameId"]:x for x in recheck["games"]}
    candidates=sorted((x for x in audit["games"] if x["auditStatus"] in (SHORT,OT)),
                      key=lambda x:(x["date"],x["id"]))
    check(len(candidates)==19 and len(set(x["id"] for x in candidates))==19,
          "NINETEEN_SOURCE_LIMITED_GAMES_REQUIRED")
    OUTPUT.mkdir(parents=True,exist_ok=True)
    entries=[]
    for game in candidates:
        eid=game["id"]
        prior=byid[eid]
        now=statuses[eid]
        check(now["status"]=="PUBLIC_SOURCE_RECONFIRMED" and not now["checks"],
              "OFFICIAL_SOURCE_DRIFT_"+str(eid))
        check((prior["date"],prior["opponent"],*prior["score"])==
              (game["date"],game["opponentRaw"],game["gf"],game["ga"]),
              "SOURCE_AND_PRIOR_DRAFT_CONFLICT_"+str(eid))
        body=paragraphs(game)
        headline=label(prior["headline"])
        filename=game["date"].replace("-","")+"_HTO_"+str(eid)+"_SOURCE_LIMITED_REVIEW.md"
        lines=[
          "# "+headline,"",
          "**Historical retrospective prepared in November 2026; not an original contemporaneous article.**",
          "**Status: SOURCE-LIMITED EDITORIAL DRAFT. NOT APPROVED OR PUBLISHED TO HTO.**","",
          "Game: "+date_str(game["date"])+" | HTO #"+str(eid)+" | "+
            game["gameType"]+" | Brave H.C. "+result(game["gf"],game["ga"])+
            " "+label(game["opponentRaw"]),"",
          "## Historical game account",""
        ]
        for para in body:lines.extend([para,""])
        lines+=["## Source and editorial limitations","",
          "Official HTO game sheet: "+game["boxscoreURL"],"",
          "Evidence grade: "+game["auditStatus"],"",
          "Original evidence fingerprint: "+prior["sourceFingerprint"],"",
          "New source-recheck fingerprint: "+now["structuredFingerprint"],"",
          ("The HTO source confirms the overtime outcome but does not identify the credited Schmelts scorer "
           "or supply complete player point columns. No inferred player identity, save count or video interpretation."
           if game["auditStatus"]==OT else
           "The HTO source confirms final scores, period progression and game-level skater totals, "
           "but lacks a complete goal-by-goal event log. Do not infer goal clock times, strength, tactical "
           "causes, shift combinations, goalie save counts or career milestones."),"",
          "Native Game Summary publication requires a separate Founder editorial approval and original "
          "field backup; this file is not a publication instruction.",""]
        dest=OUTPUT/filename
        dest.write_text("\n".join(lines),encoding="utf8",newline="\n")
        entries.append({"gameId":eid,"date":game["date"],"opponent":game["opponentRaw"],
                        "score":[game["gf"],game["ga"]],"gameType":game["gameType"],
                        "headline":headline,"sourceGrade":game["auditStatus"],
                        "file":filename,"paragraphs":len(body),
                        "sourceFingerprint":prior["sourceFingerprint"],
                        "recheckFingerprint":now["structuredFingerprint"],
                        "fileSHA256":sha256(dest.read_bytes()).hexdigest(),
                        "status":"SOURCE_LIMITED_REVIEW_NOT_APPROVED",
                        "nativePublicationAuthorized":False,"published":False})
        print("REVIEW_READY",eid,game["date"],game["opponentRaw"],len(body),flush=True)
    check(sum(x["sourceGrade"]==SHORT for x in entries)==18 and
          sum(x["sourceGrade"]==OT for x in entries)==1,
          "SOURCE_GRADE_BREAKDOWN_CHANGED")
    receipt={
      "schema":"brave-hc-2025-26-source-limited-review-package/v1",
      "generatedAtUTC":datetime.now(timezone.utc).isoformat(),
      "publicationStatus":"DRAFTS_ONLY_NO_NATIVE_HTO_WRITES",
      "sourceAuditSHA256":sha256(AUDIT.read_bytes().replace(b"\r\n",b"\n")).hexdigest(),
      "reverificationSHA256":sha256(RECHECK.read_bytes().replace(b"\r\n",b"\n")).hexdigest(),
      "reviewedPriorFullEventGameCount":5,
      "sourceLimitedGameCount":19,"forfeitGameCount":3,
      "totalHistoricalReviewDrafts":24,
      "games":entries}
    (OUTPUT/"review_manifest.json").write_text(
        json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",
        encoding="utf8",newline="\n")
    print("REVIEW_PACK_COMPLETE",json.dumps({"newReviews":len(entries),
          "totalReviewArticles":24,"forfeitsExcluded":3,"HTOWrites":0}))
    return receipt

if __name__=="__main__":
    try:build()
    except Exception as exc:
        print("HISTORICAL_SOURCE_REVIEW_HELD",str(exc),file=sys.stderr)
        sys.exit(2)
