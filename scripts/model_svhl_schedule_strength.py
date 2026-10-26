"""Transparent, descriptive schedule-adjusted team context index.

Not a win probability, betting rating, power ranking projection, or proof
of future performance. Scores summarize ONLY source-qualified current
official reciprocal games and separate roster-supported prior winter.

Method v1 (all numbers 0..100):
 Current form (70% smoothed points percentage + 30% shrunk goal diff)
 Opponent difficulty: leave-one-match-out opponent W/T/GP, smoothed toward
 0.5 by four neutral pseudogames; an opponent's result AGAINST the team
 is subtracted before counting that team as difficult/easy.
 With independent prior-season roster-ID continuity:
   55% current form, 30% competition faced, 15% prior winter form.
 Without qualified prior: 70% current form, 30% competition faced.
 GP=0 -> no strength index, not fabricated 50/100.
 Source GP<5 -> EARLY_SAMPLE: ranking is low-confidence.
 For previous source season with incomplete game detail, official
 season aggregate remains authoritative, explicitly separately labelled.
 Head-to-head Brave H.C. histories do NOT enter score.
"""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime,timezone
from pathlib import Path
from math import isfinite
import argparse,json,sys
VERSION="svhl-schedule-adjusted-context/v1"
PSEUDO=4.0
def need(ok,why):
    if not ok:raise ValueError("CONTEXT_HOLD:"+why)
def clip(x,lo=0.0,hi=1.0):return max(lo,min(hi,x))
def win_fraction(w,t,gp):
    need(all(type(x) is int and x>=0 for x in (w,t,gp)) and w+t<=gp,"INVALID_WLT")
    return (w+0.5*t+0.5*PSEUDO)/(gp+PSEUDO)
def goal_fraction(gf,ga,gp):
    need(all(type(x) is int and x>=0 for x in (gf,ga,gp)),"INVALID_GD")
    # Four pseudo-games with net 0; cap +/-4 smoothed goals/game so a
    # lopsided single game cannot dominate the index.
    gd=max(-4.,min(4.,(gf-ga)/(gp+PSEUDO)))
    return clip(0.5+gd/8.)
def form(rec):
    need(type(rec) is dict,"FORM_RECORD_MISSING")
    for k in ("gp","w","l","t","gf","ga"):
        need(type(rec.get(k)) is int and rec[k]>=0,"FORM_RECORD_"+k)
    need(rec["w"]+rec["l"]+rec["t"]==rec["gp"],"FORM_WLT_PARITY")
    return 100*(0.7*win_fraction(rec["w"],rec["t"],rec["gp"])+
                0.3*goal_fraction(rec["gf"],rec["ga"],rec["gp"]))
def opposition(team,teams_by_name):
    values=[]
    for game in team["completedGames"]:
        name=game["opponent"]
        need(name in teams_by_name and name!=team["leagueName"],"OPPONENT_NOT_IN_VERIFIED_LEAGUE")
        opponent=teams_by_name[name]
        rec=opponent["record"]
        need(rec["gp"]>=1,"OPPONENT_GP_MISSING")
        outcome=game["result"]
        need(outcome in ("W","L","T"),"RESULT_UNSUPPORTED")
        # Opponent result against this TEAM is the inverse of the team result.
        # Remove that result before measuring opposition's other performance.
        opp_w_without=rec["w"]-(1 if outcome=="L" else 0)
        opp_t_without=rec["t"]-(1 if outcome=="T" else 0)
        opp_gp_without=rec["gp"]-1
        need(opp_w_without>=0 and opp_t_without>=0 and
             opp_w_without+opp_t_without<=opp_gp_without,
             "OPPONENT_LEAVE_ONE_OUT_SCORE_CONFLICT")
        values.append(win_fraction(opp_w_without,opp_t_without,opp_gp_without))
    if not values:return None
    return 100*sum(values)/len(values)
def calculate(doc):
    need(doc.get("schema")=="brave-hc-league-intelligence/public-v1" and
         doc.get("status")=="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" and
         doc.get("currentSourceDataConcordant") is True,"OFFICIAL_LEAGUE_SOURCE_NOT_QUALIFIED")
    teams=doc.get("teams",[])
    need(20<=len(teams)<=45 and
         len({t["sourceTeamId"] for t in teams})==len(teams) and
         len({t["leagueName"] for t in teams})==len(teams),"DUPLICATE_TEAM_IDENTITY")
    known={t["leagueName"]:t for t in teams}
    computed={}
    for t in teams:
        rec=t["record"];gp=rec["gp"]
        need(type(gp) is int and gp>=0 and
             gp==len(t["completedGames"])==t["gamesConfirmed"],
             "SOURCE_GAME_COUNT_MISMATCH_"+t["leagueName"])
        if gp==0:
            computed[t["sourceTeamId"]]={
                "status":"INSUFFICIENT_COMPLETED_GAMES",
                "contextIndex":None,"rank":None,"confidence":"NO_CURRENT_GAMES",
                "currentForm":None,"scheduleDifficulty":None,
                "priorWinterForm":None,"weights":None,
                "completedGames":0}
            continue
        current=form(rec);difficulty=opposition(t,known)
        need(difficulty is not None,"COMPLETED_GAMES_WITHOUT_OPPONENTS")
        old=t.get("previousWinter")
        prior_form=None
        if old is not None:
            need(old.get("association")=="ROSTER_ID_CONTINUITY_CONFIRMED" and
                 type(old.get("officialRosterSharedIDs")) is int and old["officialRosterSharedIDs"]>=3 and
                 isinstance(old.get("rosterContinuityShare"),(int,float)) and
                 old["rosterContinuityShare"]>=0.25,
                 "UNSUPPORTED_PREVIOUS_SEASON_IDENTITY")
            prior_form=form(old["record"])
            weights={"currentForm":0.55,"scheduleDifficulty":0.30,"previousWinterForm":0.15}
        else:weights={"currentForm":0.70,"scheduleDifficulty":0.30,"previousWinterForm":0.0}
        index=current*weights["currentForm"]+difficulty*weights["scheduleDifficulty"]
        if prior_form is not None:index+=prior_form*weights["previousWinterForm"]
        need(isfinite(index) and 0<=index<=100,"CONTEXT_INDEX_OUT_OF_BOUNDS")
        computed[t["sourceTeamId"]]={
            "status":"SOURCE_SUPPORTED_DESCRIPTIVE_CONTEXT",
            "contextIndex":round(index,1),"rank":None,
            "confidence":"EARLY_SAMPLE" if gp<5 else "LIMITED_SAMPLE" if gp<10 else "LARGER_SAMPLE",
            "currentForm":round(current,1),
            "scheduleDifficulty":round(difficulty,1),
            "priorWinterForm":round(prior_form,1) if prior_form is not None else None,
            "weights":weights,"completedGames":gp}
    competitive={d["name"] for d in doc["divisions"] if d["competitive"]}
    ranked=[x for x in teams if x["divisionNow"] in competitive and
            computed[x["sourceTeamId"]]["contextIndex"] is not None]
    ranked.sort(key=lambda t:(-computed[t["sourceTeamId"]]["contextIndex"],
                               -t["record"]["gp"],t["leagueName"]))
    for pos,t in enumerate(ranked,1):computed[t["sourceTeamId"]]["rank"]=pos
    for t in teams:
        if t["divisionNow"] not in competitive:
            computed[t["sourceTeamId"]]["status"]="NONCOMPETITIVE_DIVISION_REFERENCE"
            computed[t["sourceTeamId"]]["rank"]=None
    result=deepcopy(doc)
    for t in result["teams"]:
        t["strengthContext"]=computed[t["sourceTeamId"]]
    result["strengthModel"]={
        "schema":VERSION,"type":"DESCRIPTIVE_NOT_PREDICTIVE",
        "source":"Current official SVHL reciprocal games; independent roster-supported previous winter; no Brave H.C. H2H scoring input",
        "eligibleTeams":len(ranked),"unratedTeams":sum(computed[t["sourceTeamId"]]["contextIndex"] is None for t in teams),
        "noncompetitiveUnrankedTeams":sum(t["divisionNow"] not in competitive for t in teams),
        "currentPseudoGames":4,"previousPseudoGames":4,
        "formDefinition":"70% smoothed (W+0.5T)/GP; 30% shrunk goal-difference per game, capped +/-4",
        "oppositionDefinition":"Average opponent (W+0.5T)/GP with THIS matchup removed, smoothed by 4 neutral pseudogames",
        "weightsWithRosterQualifiedPrior":{"currentForm":0.55,"scheduleDifficulty":0.30,"previousWinterForm":0.15},
        "weightsWithoutQualifiedPrior":{"currentForm":0.70,"scheduleDifficulty":0.30,"previousWinterForm":0.0},
        "previousWinterOnlyWhenRosterContinuityQualified":True,
        "bravesHistoricalHeadToHeadExcluded":True,
        "probabilityOfWinning":False,
        "smallSamples":all(t["record"]["gp"]<5 for t in teams),
        "scoreIsNotOpponentRatingOnItsOwn":True,
        "notice":"Descriptive 0–100 context index. Not calibrated to outcomes, not a win probability or forecast. Teams with 1–4 games are early-sample."
    }
    return result
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",required=True)
    p.add_argument("--output",required=True)
    a=p.parse_args()
    try:
        source=json.loads(Path(a.input).read_text(encoding="utf8"))
        result=calculate(source)
        out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
        tmp=out.with_suffix(out.suffix+".tmp")
        tmp.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
        tmp.replace(out)
        print(json.dumps({"state":"DESCRIPTIVE_STRENGTH_CONTEXT_QUALIFIED",
            "teams":len(result["teams"]),"ranked":result["strengthModel"]["eligibleTeams"],
            "noCurrentResults":result["strengthModel"]["unratedTeams"],
            "originalWorkbookWritten":False,"sourceResultsUnchanged":True}))
        return 0
    except (KeyError,TypeError,ValueError,OSError,ZeroDivisionError) as err:
        print(json.dumps({"state":"HOLD","reason":str(err),"publicNotWritten":True}),file=sys.stderr)
        return 2
if __name__=="__main__":sys.exit(main())
