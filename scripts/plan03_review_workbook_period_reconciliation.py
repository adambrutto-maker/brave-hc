"""Plan 03: read-only shadow reconciliation of four HTO game scores and workbook rows.

Consumes a PRIVATE four-game official HTO period snapshot, pinned public HTO
game feed, and a pre-existing workbook extraction. It does not parse, open for
editing, calculate, or write the canonical Excel workbook. No network calls.
"""
import argparse
from datetime import datetime, timezone, timedelta
import hashlib
import json
from pathlib import Path
import re

WORKBOOK_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
EXTRACT_SHA="34e2addedd84e9e8ed49bfebe6438c3d4673a259cada5f3950e770c9e345ef98"
MAP={
  3356177:(359,370,"2026-09-20","Dateline Predators","Sunday, Sep 20, 2026"),
  3356178:(360,371,"2026-09-27","Mohawks H.C.","Sunday, Sep 27, 2026"),
  3369564:(361,372,"2026-10-04","Michelob Morts","Sunday, Oct 4, 2026"),
  3375601:(362,373,"2026-10-18","Zamboner Crew","Sunday, Oct 18, 2026"),
}
EXPECTED_HEAD=["1","2","3","OT","2OT","F"]
COLUMNS_GF=["K","L","M","N"]
COLUMNS_GA=["P","Q","R","S"]

class SourceHold(ValueError):
    pass

def stamp(s):
    try:
        dt=datetime.fromisoformat(s.replace("Z","+00:00"))
        if dt.tzinfo is None or dt.utcoffset() is None:raise ValueError("naive")
        return dt.astimezone(timezone.utc)
    except (AttributeError,ValueError,TypeError) as exc:
        raise SourceHold("INVALID_SOURCE_TIMESTAMP") from exc

def hash_ok(s):
    return isinstance(s,str) and bool(re.fullmatch(r"[0-9a-fA-F]{64}",s))

def score(s):
    if type(s) is not int or s<0:raise SourceHold("NONINTEGER_SOURCE_PERIOD")
    return s

def verify(snapshot, extracted, feed, *, workbook_sha, extract_sha, now=None, max_age_hours=2):
    now=now or datetime.now(timezone.utc)
    if (now.tzinfo is None or now.utcoffset() is None or not 0<max_age_hours<=24):
        raise SourceHold("INVALID_REVIEW_CLOCK")
    if workbook_sha.lower()!=WORKBOOK_SHA or extract_sha.lower()!=EXTRACT_SHA:
        raise SourceHold("IMMUTABLE_WORKBOOK_OR_EXTRACT_HASH_DRIFT")
    if (snapshot.get("schema")!="brave-hc-private-hto-official-period-source/v1"
        or snapshot.get("state")!="OFFICIAL_PERIODS_VERIFIED_REVIEW_ONLY"
        or snapshot.get("originalWorkbookWrites")!=0
        or snapshot.get("nativeHTOWrites")!=0):
        raise SourceHold("HTO_PERIOD_SOURCE_AUTHORITY_UNVERIFIED")
    captured=stamp(snapshot.get("capturedAt"))
    age=(now-captured).total_seconds()
    if age<-300 or age>max_age_hours*3600:raise SourceHold("HTO_PERIOD_EVIDENCE_STALE")
    if (feed.get("schema")!="brave-hc-hto-verified-game-feed/v1"
        or feed.get("playerAggregateParity") is not True
        or feed.get("allGamesDiscovered") is not True
        or feed.get("teamGP")!=4):
        raise SourceHold("HTO_GAME_FEED_INCOMPLETE")
    if stamp(feed.get("sourceReadback"))>captured:
        raise SourceHold("HTO_FEED_NEWER_THAN_PERIOD_SNAPSHOT")
    if not isinstance(extracted,list):
        raise SourceHold("WORKBOOK_SOURCE_EXTRACTION_MISSING")
    games=feed.get("games");periods=snapshot.get("games")
    if (not isinstance(games,list) or not isinstance(periods,list)
        or len(games)!=4 or len(periods)!=4):
        raise SourceHold("SOURCE_GAME_COVERAGE_CHANGED")
    def indexed(rows):
        ids=[r.get("htoGameId") for r in rows if isinstance(r,dict)]
        if len(ids)!=4 or len(set(ids))!=4 or set(ids)!=set(MAP):
            raise SourceHold("GAME_ID_MISSING_DUPLICATED_OR_UNADMITTED")
        return {r["htoGameId"]:r for r in rows}
    feed_by=indexed(games);period_by=indexed(periods)
    plan=[]
    for gid,(num,rownum,day,opponent,day_label) in MAP.items():
        g=feed_by[gid];p=period_by[gid]
        url=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
        if (g.get("sourceUrl")!=url or p.get("sourceUrl")!=url
            or p.get("canonicalUrl")!=url
            or p.get("date")!=day or g.get("date")!=day
            or p.get("workbookGameNumber")!=num or g.get("workbookGameNumber")!=num
            or p.get("officialDateLabel")!=day_label
            or p.get("opponent")!=opponent
            or not hash_ok(p.get("sourceResponseSHA256"))
            or p.get("periodHeadings")!=EXPECTED_HEAD):
            raise SourceHold("OFFICIAL_PERIOD_PROVENANCE_OR_IDENTITY_CHANGED")
        gf=p.get("bravePeriods");ga=p.get("opponentPeriods")
        if (not isinstance(gf,list) or not isinstance(ga,list)
            or len(gf)!=5 or len(ga)!=5):
            raise SourceHold("INCOMPLETE_PERIOD_EVIDENCE")
        gf=[score(x) for x in gf];ga=[score(x) for x in ga]
        if gf[4]!=0 or ga[4]!=0:raise SourceHold("FIFTH_2OT_PERIOD_UNSUPPORTED_BY_WORKBOOK")
        if (sum(gf)!=p.get("braveGF") or sum(ga)!=p.get("braveGA")
            or p.get("braveGF")!=g.get("teamGoals")
            or p.get("braveGA")!=g.get("teamGoalsAgainst")):
            raise SourceHold("HTO_PERIODS_DO_NOT_MATCH_VERIFIED_FINAL")
        matches=[]
        for row in extracted:
            if not isinstance(row,dict):continue
            if str(row.get("B"))!=str(num) or row.get("C")!="W2026/27" or row.get("D")!="Regular Season":
                continue
            try:
                row_day=(datetime(1899,12,30)+timedelta(days=float(row.get("E")))).date().isoformat()
            except (ValueError,TypeError):
                raise SourceHold("WORKBOOK_ROW_DATE_INVALID")
            if row_day==day:matches.append(row)
        if len(matches)!=1 or matches[0].get("row")!=rownum:
            raise SourceHold("SOURCE_WORKBOOK_ROW_JOIN_NOT_UNIQUE")
        r=matches[0]
        if (str(r.get("O"))!="0" or str(r.get("T"))!="0"
            or str(r.get("U"))!="T" or str(r.get("W"))!="0"):
            raise SourceHold("WORKBOOK_STALE_BASELINE_CHANGED")
        if any(r.get(col) not in (None,"") for col in COLUMNS_GF+COLUMNS_GA):
            raise SourceHold("WORKBOOK_PERIOD_INPUT_ALREADY_PRESENT")
        if "IF(AllTimeSchedule" not in r.get("Uformula",""):
            raise SourceHold("WORKBOOK_RESULT_FORMULA_NOT_PRESERVED")
        # A single historical opponent spelling was explicitly reconciled
        # before this tool existed; no fuzzy or speculative alias mapping.
        old=r.get("H")
        known=(opponent, "Mohawks HC" if gid==3356178 else opponent)
        if old not in (None,"",*known):
            raise SourceHold("WORKBOOK_OPPONENT_NAME_CONFLICT")
        proposed={**dict(zip(COLUMNS_GF,gf[:4])),**dict(zip(COLUMNS_GA,ga[:4]))}
        outcome="W" if sum(gf)>sum(ga) else "L" if sum(gf)<sum(ga) else "T"
        plan.append({
            "htoGameId":gid,"date":day,"sourceURL":url,
            "sourceResponseSHA256":p["sourceResponseSHA256"],
            "sheet":"Master Schedule","worksheetRow":rownum,"gameNumber":num,
            "originalOpponent":old,"originalTotals":{"GF":0,"GA":0,"result":"T"},
            "reviewOnlyPeriodCells":proposed,
            "expectedAfterFormulaRecalculation":{"GF":sum(gf),"GA":sum(ga),
                "goalDifference":sum(gf)-sum(ga),"result":outcome},
            "periodBeyondWorkbook":None if gf[4]==0 and ga[4]==0 else "UNSUPPORTED",
            "formulaReviewRequired":True,"currentOriginalWorkbookEdited":False})
    return {
        "schema":"brave-hc-plan03-workbook-period-shadow-review/v1",
        "status":"FOUR_VERIFIED_RESULTS_READY_FOR_WORKBOOK_OWNER_REVIEW_NOT_APPLIED",
        "sourceWorkbookSHA256":WORKBOOK_SHA,"savedExtractSHA256":EXTRACT_SHA,
        "officialGames":len(plan),"teamGF":sum(x["expectedAfterFormulaRecalculation"]["GF"] for x in plan),
        "teamGA":sum(x["expectedAfterFormulaRecalculation"]["GA"] for x in plan),
        "proposed":plan,"unsupported":["No automatic spreadsheet edits",
            "Workbook Result/goal-difference and GP formula recalculation not certified",
            "No current player projections or Record Watch release",
            "No fifth future game admission"],
        "originalWorkbookModified":False,"publisherModified":False,"nativeHTOModified":False,
        "reviewRequiredBeforeUse":[
            "Confirm K:N and P:S are actual independent period input cells in authoritative workbook",
            "Confirm O/T GF/GA, W +/- and U Result formula behaviour under real Excel recalculation",
            "Create private original-workbook backup, verify source SHA, test disposable copy",
            "Reconcile roster and all dependent formulas independently before any source-of-truth edit",
            "Obtain separate workbook-owner approval for specific cells and verified rollback"],
        "futureFifthGameAdmitted":False
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--period-evidence",type=Path,required=True)
    p.add_argument("--schedule-extract",type=Path,required=True)
    p.add_argument("--official-feed",type=Path,required=True)
    p.add_argument("--original-workbook",type=Path,required=True)
    args=p.parse_args()
    def j(path):return json.loads(path.read_text(encoding="utf-8"))
    sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
    result=verify(j(args.period_evidence),j(args.schedule_extract),j(args.official_feed),
                  workbook_sha=sha(args.original_workbook),extract_sha=sha(args.schedule_extract))
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":main()
