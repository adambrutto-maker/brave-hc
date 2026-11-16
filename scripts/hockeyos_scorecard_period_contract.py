"""Pure HTO scoreboard five-/seven-column shared format contract candidate.

Safe only as a proposed parser/verification unit. It does not fetch HTML, assign
HTO game IDs, certify missing player/goalie rows, calculate awards or write feeds.
Score and boxscore rows must remain independently attributable to the same
source HTO game ID via separately validated official page links.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any
import json

TEAM="Brave H.C."
REGULAR=("REGULAR SEASON","1","2","3","F")
EXTENDED=("REGULAR SEASON","1","2","3","OT","2OT","F")

class ScoreboardHold(ValueError):
    pass

def require(ok:bool,reason:str) -> None:
    if not ok: raise ScoreboardHold("SCORECARD_CONTRACT_HOLD:"+reason)

def number(v:Any) -> int:
    require(type(v) is str and len(v)>0 and v.isdecimal(),"SCORE_NONINTEGER")
    n=int(v)
    require(0<=n<=100,"SCORE_OUTSIDE_BOUNDED_RANGE")
    return n

def normalize(rows:Any) -> dict:
    require(type(rows) is list and len(rows)==3 and
            all(type(row) is list for row in rows),"SCORE_ROWS_NOT_3")
    raw=rows[0]
    require(tuple(raw) in (REGULAR,EXTENDED),"SCORE_HEADER_NOT_5_OR_7_VERIFIED")
    width=len(raw)
    require(all(len(row)==width for row in rows[1:]),"SCORE_TEAM_ROW_WIDTH_MISMATCH")
    ours=[row for row in rows[1:] if row[0]==TEAM]
    others=[row for row in rows[1:] if row[0]!=TEAM]
    require(len(ours)==1 and len(others)==1 and
            type(others[0][0]) is str and bool(others[0][0].strip()) and
            others[0][0]!="REGULAR SEASON","BRAVES_AND_OPPONENT_ROWS_NOT_UNIQUE")
    periods=list(raw[1:-1])
    def capture(row):
        nums=[number(x) for x in row[1:]]
        require(sum(nums[:-1])==nums[-1],"PERIOD_GOALS_NOT_FINAL_SCORE")
        return {"name":row[0],"periods":dict(zip(periods,nums[:-1])),"final":nums[-1]}
    braves=capture(ours[0]);opp=capture(others[0])
    return {
        "state":"SCORECARD_ROWS_SOURCE_SHAPE_VALIDATED",
        "width":width,
        "periods":periods,
        "layout":"REGULATION_3_PERIODS" if width==5 else "EXTENDED_3_PERIODS_OT_2OT",
        "braves":braves,"opponent":opp,
        "gameIdVerified":False,"playerBoxscoreRowsVerified":False,
        "originalMasterWorkbookWritten":False,
        "publicationAuthorized":False,
    }

def compare_same_game(scores_rows:Any,box_rows:Any, *,
                      official_opponent:str,official_gf:int,official_ga:int) -> dict:
    """Compare period detail; both rows must already be independently tied to
    the SAME official gameID by the approved caller's source URL validator.
    """
    a=normalize(scores_rows)
    b=normalize(box_rows)
    require(type(official_opponent) is str and official_opponent.strip() and
            type(official_gf) is int and type(official_ga) is int and
            0<=official_gf<=100 and 0<=official_ga<=100,
            "OFFICIAL_GAME_SCORE_PROOF_INVALID")
    for section in ("braves","opponent"):
        left,right=a[section],b[section]
        require(left["name"]==right["name"] and left["final"]==right["final"],
                "SAME_GAME_TEAM_OR_FINAL_CONFLICT")
        for period in ("1","2","3"):
            require(left["periods"][period]==right["periods"][period],
                    "SAME_GAME_REGULATION_PERIOD_CONFLICT")
        for period in ("OT","2OT"):
            x=left["periods"].get(period,0)
            y=right["periods"].get(period,0)
            require(x==y,"SAME_GAME_OVERTIME_PERIOD_MISMATCH")
    require(a["opponent"]["name"]==official_opponent and
            a["braves"]["final"]==official_gf and
            a["opponent"]["final"]==official_ga,
            "OFFICIAL_SOURCE_GAME_SCORE_PROOF_CONFLICT")
    return {
        "state":"DUAL_SHAPE_SCORE_PERIOD_PARITY_CANDIDATE",
        "scorePageWidth":a["width"],"boxscorePageWidth":b["width"],
        "opponent":official_opponent,"gf":official_gf,"ga":official_ga,
        "sameGameIDExternallyQualified":False,
        "liveBoxscoreFetched":False,"playerBoxscoreRowsVerified":False,
        "publicationAuthorized":False
    }
