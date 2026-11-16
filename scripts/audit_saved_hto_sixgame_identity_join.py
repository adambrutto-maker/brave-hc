"""Six-game offline HTO scoreboard/boxscore-link replay against prior qualified private proof.

NOT an operational collector, an HTO site read, live boxscore validation, a
current awards calculation, or authorization to publish/update the workbook.
The read-only captured Scores page exposes global boxscore links; associations
are admitted only when every link, matched gameID, opponent, score and
prior independently source-qualified AllTimeSchedule date row agree.
"""
from __future__ import annotations
from datetime import datetime, timezone
import argparse,hashlib,json,re
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from audit_saved_hto_scorecard_widths import (
    SourceHold,need,evaluate as width_evaluate,date as timestamp,
    cards_from_scores,SCHEMA as WIDTH_SCHEMA,
)
SCHEMA="hockeyos-previously-qualified-sixgame-link-join-review/v1"
PINNED_SAVED_READBACK_SHA="b09a40bbca43cc688ab6341f6ee8676755e805a58e9cf7dd89530d117d056ff6"
PINNED_PRIOR_PROOF_SHA="f5752015612956ae36d594e5f72d72090cea574aa44560c7e0084c0b77300dbf"
ORIGINAL_MASTER_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
SOURCE_SCHEMA="brave-hc-real-six-hto-games-original-master-date-admission/private-v2"
SCORE_STAGE_SCHEMA="brave-hc-hto-completed-score-evidence/private-v1"

def boxid(url: object) -> int:
    need(isinstance(url,str) and len(url)<1024,"BOXSCORE_LINK_MALFORMED")
    u=urlparse(url)
    q=parse_qs(u.query)
    need(u.scheme=="https" and u.hostname=="www.htosports.com" and
        u.path=="/teams/default.asp" and
        q.get("u")==["BRAVESHOCKEY"] and q.get("s")==["hockey"] and
        q.get("p")==["boxscore"] and q.get("sportsHQ")==["BRAVESHOCKEY"] and
        len(q.get("gameID",[]))==1,"BOXSCORE_LINK_SOURCE_INVALID")
    raw=q["gameID"][0]
    need(re.fullmatch(r"[1-9][0-9]{5,8}",raw) is not None,"BOXSCORE_GAME_ID_BAD")
    return int(raw)

def sha(value: object) -> bool:
    return type(value) is str and re.fullmatch(r"[0-9a-f]{64}",value) is not None

def fixed_current_source(saved: dict,proof: dict, *, now: datetime) -> dict:
    widths=width_evaluate(saved,now=now,max_age_hours=24)
    need(widths.get("schema")==WIDTH_SCHEMA and widths["scorecardCount"]==6 and
         widths["teamGP"]==6 and widths["goalsFor"]==14 and widths["goalsAgainst"]==30 and
         widths["regulationOnlyFiveColumn"]==1 and widths["extendedSevenColumn"]==5,
         "CURRENT_SAVED_SCORECARD_SOURCE_NOT_SIXGAME_BASELINE")
    need(type(proof) is dict and proof.get("schema")==SOURCE_SCHEMA and
         proof.get("status")=="SIX_COMPLETED_GAME_DATES_RECONCILED_SOURCE_ONLY" and
         proof.get("sixGames")==6 and
         proof.get("authoritativeOriginalWorkbookSHA256")==ORIGINAL_MASTER_SHA and
         proof.get("original24SeasonScheduleSlots")==24 and
         proof.get("modelledCurrentAwardScores") is False and
         proof.get("currentAwardEligibilityApproved") is False and
         proof.get("sourceCorrectionDecisionsApproved") is False and
         proof.get("sourceAcceptanceRequiresIndependentHumanReview") is True,
         "PREVIOUS_PRIVATE_SIXGAME_CALENDAR_PROOF_NOT_QUALIFIED")
    earlier=proof.get("sourceScoreEvidence")
    need(type(earlier) is dict and earlier.get("schema")==SCORE_STAGE_SCHEMA and
         earlier.get("status")=="PRIVATE_SOURCE_ONLY" and
         earlier.get("publicationAuthorized") is False and
         earlier.get("sourceGamesCount")==6 and
         earlier.get("sourceAuthority")=="PUBLIC_HTO_HTTP_READBACK" and
         sha(earlier.get("originalSixBoxscoreReadbackSHA256")) and
         sha(earlier.get("sourceScoreReviewSHA256")),
         "ARCHIVED_HTO_BOXSCORE_SOURCE_PROOF_NOT_VERIFIED")
    earlier_games=earlier.get("games")
    mapping=proof.get("exactDateAndGameNumberMapping")
    need(type(earlier_games) is list and type(mapping) is list and
         len(earlier_games)==len(mapping)==6,
         "SOURCE_GAME_AND_MASTER_MAPPING_LENGTH_CHANGED")
    stageids=[g.get("htoGameId") for g in earlier_games if isinstance(g,dict)]
    mapids=[m.get("htoGameId") for m in mapping if isinstance(m,dict)]
    need(len(stageids)==len(mapids)==len(set(stageids))==len(set(mapids))==6 and
         set(stageids)==set(mapids) and
         all(type(n) is int and n>0 for n in stageids),
         "ARCHIVED_GAME_ID_NOT_UNIQUE_OR_INCOMPLETE")
    first={g["htoGameId"]:g for g in earlier_games}
    second={m["htoGameId"]:m for m in mapping}
    game_numbers=[]
    calendar_days=[]
    for gid,game in first.items():
        m=second[gid]
        need(sha(game.get("officialSourceGamePageSHA256")),
             "ARCHIVED_BOXSCORE_PAGE_FINGERPRINT_UNQUALIFIED")
        need(boxid(game.get("sourceUrl"))==gid,
             "ARCHIVED_BOXSCORE_URL_AND_ID_CONFLICT")
        need(game.get("season")=="W2026/27" and game.get("gameType")=="Regular Season" and
             type(game.get("gf")) is int and type(game.get("ga")) is int and
             0<=game["gf"]<=30 and 0<=game["ga"]<=30 and
             game.get("result")==("W" if game["gf"]>game["ga"]
                 else "L" if game["gf"]<game["ga"] else "T") and
             (game.get("date"),game.get("opponentExact"),game["gf"],game["ga"])==
             (m.get("date"),m.get("opponentExact"),m.get("gf"),m.get("ga")),
             "ARCHIVED_HTO_BOX_AND_MASTER_DATE_PARITY_FAILED")
        try:
            when=datetime.strptime(game["date"],"%Y-%m-%d")
        except (TypeError,ValueError) as exc:
            raise SourceHold("ARCHIVED_GAME_DATE_BAD") from exc
        need(when.weekday()==6,"ORIGINAL_SUNDAY_GAME_DATE_NOT_VERIFIED")
        n=m.get("masterGameNumber")
        need(type(n) is int and 359<=n<=364 and
             type(m.get("sourceWorkbookRow")) is int and
             m["sourceWorkbookRow"]==n+11 and
             m.get("workbookCompletedFlag") is False,
             "CANONICAL_MASTER_DATE_ROW_OR_COMPLETION_FLAG_CHANGED")
        game_numbers.append(n);calendar_days.append(game["date"])
    need(sorted(game_numbers)==list(range(359,365)) and
         len(set(calendar_days))==6,
         "CANONICAL_MASTER_GAME_NUMBER_OR_DATE_COVERAGE_CHANGED")
    sixth=proof.get("sixthGameProved") or {}
    need(sixth.get("htoGameId")==3375683 and
         sixth.get("masterGameNumber")==364 and
         sixth.get("date")=="2026-11-01" and
         sixth.get("opponentExact")=="Mid Ice Crisis" and
         sixth.get("gf")==2 and sixth.get("ga")==7 and
         second.get(3375683)==sixth,
         "SIXTH_ORIGINAL_HTO_GAME_SOURCE_NOT_PROVEN")
    scores=next((x for x in saved["pages"] if x.get("name")=="hto_scores"),None)
    need(type(scores) is dict,"CURRENT_HTO_SCORES_PAGE_MISSING")
    tables=scores.get("tables")
    need(type(tables) is list and
         all(type(t) is dict and t.get("index")==i
             for i,t in enumerate(tables)),
         "CURRENT_HTO_SCORE_TABLE_INDEX_OR_COUNT_INVALID")
    need(type(scores.get("links")) is list,
         "CURRENT_HTO_BOXSCORE_LINKS_MISSING")
    cardlist=cards_from_scores(scores)
    links=[x for x in scores.get("links",[]) if
           type(x) is dict and x.get("title")=="Box Score and Summary"]
    need(len(cardlist)==len(links)==len(first),
         "CURRENT_HTO_SCORES_LINK_CARD_COVERAGE_CHANGED")
    ids=[boxid(link.get("url")) for link in links]
    need(len(set(ids))==len(ids) and set(ids)==set(stageids),
         "CURRENT_HTO_BOXSCORE_LINK_SET_MISMATCH")
    result=[]
    for position, (card,link,gid) in enumerate(zip(cardlist,links,ids)):
        table=next((t for t in scores["tables"] if t.get("index")==card["tableIndex"]),None)
        need(type(table) is dict,"CURRENT_SCORECARD_INDEX_MISSING")
        opponent_rows=[r for r in table["rows"][1:] if r[0]!="Brave H.C."]
        need(len(opponent_rows)==1,"CURRENT_SCORECARD_OPPONENT_NOT_UNIQUE")
        g=first[gid];m=second[gid]
        need((opponent_rows[0][0],card["goalsFor"],card["goalsAgainst"])==
             (g["opponentExact"],g["gf"],g["ga"]),
             "CURRENT_SCORES_LINK_DOES_NOT_MATCH_HISTORICAL_GAME")
        result.append({"gameId":gid,"masterGameNumber":m["masterGameNumber"],
             "date":g["date"],"opponent":g["opponentExact"],
             "goalsFor":g["gf"],"goalsAgainst":g["ga"],
             "scorecardWidth":card["width"],"savedScorecardTableIndex":card["tableIndex"],
             "priorIndependentBoxscoreSHA256":g["officialSourceGamePageSHA256"]})
    need([x["masterGameNumber"] for x in result]==list(range(364,358,-1)),
         "SCORES_PAGE_MOST_RECENT_FIRST_SOURCE_ORDER_CHANGED")
    need(sum(x["goalsFor"] for x in result)==14 and
         sum(x["goalsAgainst"] for x in result)==30,
         "PREVIOUS_DATE_BOUND_SCORES_DISAGREE_WITH_FRESH_SCORECARDS")
    return {
        "schema":SCHEMA,"status":"PRIVATE_PRIOR_GAME_ID_JOIN_REPLAY_PARITY_PASS",
        "currentSavedSourceCapturedAt":saved["date"],
        "priorIndependentBoxscoreCaptureAt":earlier.get("capturedAt"),
        "originalMasterWorkbookSHA256":ORIGINAL_MASTER_SHA,
        "qualifiedSixPriorGameIDs":list(sorted(ids)),
        "savedScorecards":len(cardlist),
        "fiveColumnScorecards":sum(x["scorecardWidth"]==5 for x in result),
        "sevenColumnScorecards":sum(x["scorecardWidth"]==7 for x in result),
        "sourceTotals":{"gp":6,"gf":14,"ga":30},
        "mapping":result,
        "individualPlayerGameRowsRevalidated":False,
        "liveOfficialBoxscorePagesFetched":False,
        "currentModelAndAwardsReleased":False,
        "liveCollectorModified":False,
        "originalMasterWorkbookWritten":False,
        "publicPublisherUpdated":False,
        "releaseAuthorized":False,
    }

def run(argv:list[str]|None=None)->int:
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--current-saved",type=Path,required=True)
    p.add_argument("--prior-private-proof",type=Path,required=True)
    p.add_argument("--strict",action="store_true")
    a=p.parse_args(argv)
    try:
        raw=a.current_saved.read_bytes()
        prior=a.prior_private_proof.read_bytes()
        need(hashlib.sha256(raw).hexdigest()==PINNED_SAVED_READBACK_SHA and
             hashlib.sha256(prior).hexdigest()==PINNED_PRIOR_PROOF_SHA,
             "PINNED_PRIVATE_SOURCE_HASHES_NOT_MATCHED")
        doc=json.loads(raw)
        proof=json.loads(prior)
        result=fixed_current_source(doc,proof,now=datetime.now(timezone.utc))
        result["currentSavedReadbackSHA256"]=PINNED_SAVED_READBACK_SHA
        result["priorVerifiedSixGameProofSHA256"]=PINNED_PRIOR_PROOF_SHA
    except (OSError,ValueError,SourceHold,KeyError,TypeError) as exc:
        result={"schema":SCHEMA,"status":"HOLD",
                "reason":str(exc) if isinstance(exc,SourceHold) else type(exc).__name__,
                "releaseAuthorized":False,"liveCollectorModified":False}
    print(json.dumps(result,sort_keys=True,ensure_ascii=False))
    return 2 if a.strict and result["status"]=="HOLD" else 0

if __name__=="__main__":
    raise SystemExit(run())
