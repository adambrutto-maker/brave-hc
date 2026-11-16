"""Read-only evidence of HTO scorecard header widths from a SAVED public readback.

This is NOT the operational HTO collector and is NEVER a bypass of the collector
source/identity gate. Does not fetch the web, rewrite inputs, assign game IDs,
recalculate awards or authorize source publication.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

TEAM="Brave H.C."
SCHEMA="hockeyos-saved-hto-scoreboard-width-observation/v1"
REGULATION=("REGULAR SEASON","1","2","3","F")
EXTENDED=("REGULAR SEASON","1","2","3","OT","2OT","F")
OFFICIAL_STATS=("GP","GF","GA","PPO","PK%")


class SourceHold(ValueError):
    pass


def need(ok: bool, message: str) -> None:
    if not ok: raise SourceHold(message)


def date(v: str) -> datetime:
    try:
        dt=datetime.fromisoformat(v.replace("Z","+00:00"))
        need(dt.tzinfo is not None,"CAPTURE_TIMESTAMP_UNZONED")
        return dt.astimezone(timezone.utc)
    except (ValueError,TypeError,AttributeError) as exc:
        raise SourceHold("CAPTURE_TIMESTAMP_INVALID") from exc


def official(page: dict, kind: str) -> bool:
    try:
        url=urlsplit(page["url"])
        params=parse_qs(url.query)
        return (url.scheme=="https" and url.hostname=="www.htosports.com"
                and url.path=="/teams/default.asp" and params.get("p")==[kind]
                and params.get("u")==["BRAVESHOCKEY"] and params.get("s")==["hockey"])
    except (KeyError,TypeError):
        return False


def integer(raw: str, label: str) -> int:
    need(type(raw) is str and raw.isdecimal(),"INVALID_"+label)
    value=int(raw)
    need(0<=value<=1000,"OUT_OF_RANGE_"+label)
    return value


def cards_from_scores(page: dict) -> list[dict]:
    need(official(page,"scores"),"OFFICIAL_SCORES_SOURCE_NOT_MATCHED")
    tables=page.get("tables")
    need(isinstance(tables,list),"SOURCE_SCORE_TABLES_MISSING")
    result=[]
    for index,t in enumerate(tables):
        need(isinstance(t,dict),"SOURCE_SCORE_TABLE_NOT_OBJECT")
        rows=t.get("rows")
        need(isinstance(rows,list),"SOURCE_SCORE_ROWS_INVALID")
        if not rows or not isinstance(rows[0],list) or not rows[0]:
            continue
        if rows[0][0]!="REGULAR SEASON":
            continue
        header=tuple(rows[0])
        need(header in (REGULATION,EXTENDED),"UNSUPPORTED_SCORECARD_HEADER")
        width=len(header)
        need(len(rows)==3 and all(isinstance(r,list) and len(r)==width for r in rows),
             "SCORECARD_ROW_WIDTH_OR_COUNT_INVALID")
        team_rows=[r for r in rows[1:] if r[0]==TEAM]
        opponents=[r for r in rows[1:] if r[0]!=TEAM]
        need(len(team_rows)==1 and len(opponents)==1
             and type(opponents[0][0]) is str and bool(opponents[0][0].strip()),
             "BRAVES_OPPONENT_IDENTITY_NOT_UNIQUE")
        parsed=[]
        for row in (team_rows[0],opponents[0]):
            seq=[integer(v,"SCORE_VALUE") for v in row[1:]]
            need(sum(seq[:-1])==seq[-1],"PERIOD_SCORE_DOES_NOT_MATCH_FINAL")
            parsed.append(seq)
        result.append({"tableIndex":index,
                       "width":width,
                       "kind":"REGULATION_3_PERIODS" if width==5 else "EXTENDED_3_PERIODS_OT_2OT",
                       "goalsFor":parsed[0][-1],
                       "goalsAgainst":parsed[1][-1]})
    need(result,"NO_VERIFIABLE_REGULAR_SEASON_SCORECARDS")
    return result


def team_totals(page: dict) -> dict:
    need(official(page,"stats"),"OFFICIAL_STATS_SOURCE_NOT_MATCHED")
    tables=page.get("tables")
    need(isinstance(tables,list),"SOURCE_STATS_TABLES_MISSING")
    candidates=[]
    for table in tables:
        rows=table.get("rows") if isinstance(table,dict) else None
        if (isinstance(rows,list) and len(rows)==2 and
                rows[0]==list(OFFICIAL_STATS) and isinstance(rows[1],list) and
                len(rows[1])==len(OFFICIAL_STATS)):
            r=rows[1]
            gp,gf,ga=[integer(x,"OFFICIAL_TEAM_TOTAL") for x in r[:3]]
            need(type(r[4]) is str and r[4].endswith("%"),"OFFICIAL_TEAM_STATS_SCOPE_CHANGED")
            candidates.append({"gp":gp,"gf":gf,"ga":ga})
    need(len(candidates)==1,"OFFICIAL_TEAM_STATS_NOT_UNIQUE")
    return candidates[0]


def evaluate(doc: dict, *, now: datetime, max_age_hours: int=24) -> dict:
    need(type(doc) is dict and doc.get("readOnly") is True,"NOT_SOURCE_ATTESTED_READ_ONLY")
    observed=date(doc.get("date"))
    now=now.astimezone(timezone.utc)
    age=(now-observed).total_seconds()/3600
    need(0<=age<=max_age_hours,"SAVED_READBACK_EXPIRED_OR_FROM_FUTURE")
    pages=doc.get("pages")
    need(isinstance(pages,list),"SOURCE_PAGES_MISSING")
    scores=[x for x in pages if isinstance(x,dict) and x.get("name")=="hto_scores"]
    stats=[x for x in pages if isinstance(x,dict) and x.get("name")=="hto_stats"]
    need(len(scores)==len(stats)==1,"REQUIRED_HTO_PAGES_NOT_UNIQUE")
    cards=cards_from_scores(scores[0])
    totals=team_totals(stats[0])
    need(totals["gp"]==len(cards),"GAME_COUNT_AND_SCORECARDS_MISMATCH")
    need(totals["gf"]==sum(c["goalsFor"] for c in cards) and
         totals["ga"]==sum(c["goalsAgainst"] for c in cards),
         "OFFICIAL_TEAM_SCORE_TOTALS_MISMATCH")
    return {
      "schema":SCHEMA, "state":"SOURCE_SCORECARD_SHAPES_MATCH_OFFICIAL_TEAM_TOTALS",
      "officialHTOSourceCapture":observed.isoformat().replace("+00:00","Z"),
      "ageHours":round(age,2),
      "teamGP":totals["gp"],"goalsFor":totals["gf"],"goalsAgainst":totals["ga"],
      "scorecardCount":len(cards),
      "regulationOnlyFiveColumn":sum(c["width"]==5 for c in cards),
      "extendedSevenColumn":sum(c["width"]==7 for c in cards),
      "scorecards":cards,
      "gameIdentityMapping":"NOT_VERIFIED_BY_SAVED_SCORECARD_TABLES",
      "perPlayerBoxscoreParity":"NOT_EVALUATED",
      "liveCollectorModified":False,"publisherUpdated":False,
      "MasterWorkbookWritten":False,"officialHTOWritten":False,
      "releaseAuthorized":False,
    }


def run(argv: list[str] | None=None) -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--readback",type=Path,required=True)
    parser.add_argument("--as-of",default=None,
                        help="UTC evaluation time; source QA fixtures may supply a fixed date")
    parser.add_argument("--max-age-hours",type=int,default=24)
    parser.add_argument("--strict",action="store_true",
                        help="return 2 on held data, no source writes")
    args=parser.parse_args(argv)
    try:
        need(1<=args.max_age_hours<=72,"READBACK_MAX_AGE_POLICY_INVALID")
        raw=args.readback.read_bytes()
        need(len(raw)<5_000_000,"READBACK_TOO_LARGE")
        doc=json.loads(raw)
        now=date(args.as_of) if args.as_of else datetime.now(timezone.utc)
        value=evaluate(doc,now=now,max_age_hours=args.max_age_hours)
        value["sourceReadbackSHA256"]=hashlib.sha256(raw).hexdigest()
    except (SourceHold,OSError,ValueError,TypeError,KeyError) as exc:
        value={"schema":SCHEMA,"state":"HOLD",
               "holdReason":str(exc) if isinstance(exc,SourceHold) else type(exc).__name__,
               "releaseAuthorized":False,"liveCollectorModified":False}
    print(json.dumps(value,ensure_ascii=False,sort_keys=True))
    return 2 if args.strict and value["state"]=="HOLD" else 0


if __name__=="__main__":
    raise SystemExit(run())
