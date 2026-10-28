"""BruTTech HockeyOS / native HTO Awards: source-verified automatic milestone clubs.
Pure, repeatable planning engine. No HTO writes, no invented award grants.
Native publishing is separate and requires a trusted official game/boxscore event.
"""
from __future__ import annotations
from datetime import date
from collections import defaultdict
from dataclasses import dataclass, asdict
from typing import Any
import hashlib, json, re

FAMILY = {
 "Game":{"source_stat":"GP","base":[50,100,200,300],"increment":100,"max_single":1},
 "Point":{"source_stat":"PTS","base":[50,100,200,300],"increment":100,"max_single":12},
 "Win":{"source_stat":"W","base":[50,100,200,300],"increment":100,"max_single":1},
 "Goal":{"source_stat":"G","base":[50,100,200,300],"increment":100,"max_single":7},
 "Assist":{"source_stat":"A","base":[50,100,200,300],"increment":100,"max_single":10},
 "Shutout":{"source_stat":"SHO","base":[5,10,20,30],"increment":10,"max_single":1}
}
def levels(metric:str,up_to:int)->list[int]:
    if metric not in FAMILY or not isinstance(up_to,int) or up_to<0:raise ValueError("Invalid metric/total")
    spec=FAMILY[metric]
    arr=[x for x in spec['base'] if x<=up_to]
    last=spec['base'][-1]
    return arr + list(range(last+spec['increment'],up_to+1,spec['increment']))

def tier(metric:str,threshold:int)->str:
    if threshold not in levels(metric,threshold):raise ValueError("Not an approved club threshold")
    arr=FAMILY[metric]['base']
    return "Bronze" if threshold==arr[0] else "Silver" if threshold==arr[1] else "Gold" if threshold==arr[2] else "Platinum"

def event_to_awards(event:dict[str,Any])->list[dict[str,Any]]:
    required=("player_id","player_name","game_id","game_date","metric","previous_total","new_total",
              "source_url","official_game_verified","player_identity_verified","source_sha256")
    if any(k not in event for k in required):raise ValueError("Missing event field")
    if event["metric"] not in FAMILY:raise ValueError("Unknown metric")
    if not isinstance(event["player_id"],int) or event["player_id"]<=0:raise ValueError("Unverified numeric official player ID")
    if not isinstance(event["player_name"],str) or not event["player_name"].strip():raise ValueError("Missing player name")
    if not isinstance(event["game_id"],str) or not event["game_id"].strip():raise ValueError("No official game ID")
    dt=date.fromisoformat(event["game_date"])
    a,b=event["previous_total"],event["new_total"]
    if not isinstance(a,int) or not isinstance(b,int) or a<0 or b<0:raise ValueError("Invalid cumulative totals")
    if b-a<0 or b-a>FAMILY[event["metric"]]["max_single"]:raise ValueError("Not a credible single-game verified increment")
    if event["official_game_verified"] is not True or event["player_identity_verified"] is not True:
        raise ValueError("Official game and exact player identity not verified")
    if not isinstance(event["source_url"],str) or not event["source_url"].startswith("https://www.htosports.com/"):
        raise ValueError("Milestone evidence must be official HTO")
    if not isinstance(event["source_sha256"],str) or not re.fullmatch("[a-fA-F0-9]{64}",event["source_sha256"]):
        raise ValueError("Missing official immutable evidence hash")
    if dt>date.today():raise ValueError("Future achievement cannot be awarded")
    result=[]
    for threshold in levels(event["metric"],b):
        if threshold<=a:continue
        club=f"{threshold} {event['metric']} Club"
        # Date is from the exact official played game, not first season reaching the tier.
        season=(f"Winter {dt.year-1}/{dt.year}" if dt.month<=4 else
                f"Summer {dt.year}" if dt.month<=8 else f"Winter {dt.year}/{dt.year+1}")
        label=f"Earned {dt.strftime('%B')} {dt.day}, {dt.year} | {season} | {tier(event['metric'],threshold)} milestone"
        result.append({"award_key":f"{event['player_id']}:{club}",
          "player_id":event["player_id"],"recipient":event["player_name"].strip(),
          "club":club,"metric":event["metric"],"threshold":threshold,
          "date":dt.isoformat(),"award_year":dt.year,
          "notes":label,"game_id":event["game_id"],"source_url":event["source_url"],
          "source_sha256":event["source_sha256"],"status":"OFFICIAL_GAME_VERIFIED_READY_FOR_NATIVE_HOLD_UNTIL_PARITY"})
    return result

def deduplicate(existing_awards:list[dict],events:list[dict])->dict:
    seen={(str(x["player_id"])+":"+x["club"]) for x in existing_awards}
    new=[];held=[]
    for event in sorted(events,key=lambda x:(x.get("game_date",""),str(x.get("game_id","")))):
        try:awards=event_to_awards(event)
        except Exception as e:
            held.append({"event":event,"reason":str(e)})
            continue
        for award in awards:
            if award["award_key"] in seen:continue
            seen.add(award["award_key"]);new.append(award)
    return {"schema":"brave-hc-native-hto-earned-club-proposal/v1",
      "ready_for_native_source_parity_review":new,"held_unverified_events":held,
      "new_native_category_names":sorted(set(a["club"] for a in new)),
      "existing_and_proposed_award_count":len(seen),
      "native_hto_writes":0}


def club_sort_key(category:str)->tuple[int,int]:
    """All verified goalie and skater clubs mixed by ascending numeric threshold.

    Tie-breaker only applies within one numeric level; historical honours stay
    separately ordered. No goalie-only section is created.
    """
    match=re.fullmatch(r"(\d+)\s+(Shutout|Win|Game|Goal|Assist|Point)\s+Club",category)
    if not match:raise ValueError("Not a recognized threshold club: "+category)
    threshold=int(match[1]);kind=match[2]
    if threshold not in levels(kind,threshold):raise ValueError("Unapproved threshold")
    precedence={"Shutout":0,"Win":1,"Game":2,"Goal":3,"Assist":4,"Point":5}
    return (threshold,precedence[kind])

def planned_awards_category_order(categories:list[str])->list[str]:
    """Preserve historical honours order; re-sort individual threshold clubs only."""
    honours=[];clubs=[]
    seen=set()
    for category in categories:
        if category in seen:raise ValueError("Duplicate native Awards category")
        seen.add(category)
        if re.fullmatch(r"\d+\s+(Shutout|Win|Game|Goal|Assist|Point)\s+Club",category):
            clubs.append(category)
        else:
            honours.append(category)
    return honours+sorted(clubs,key=club_sort_key)
