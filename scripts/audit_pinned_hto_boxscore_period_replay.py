"""Offline six-game period-by-period HTO Scores vs pinned per-game boxscore replay.

The saved per-game source is from the previously independently reviewed
November 3 HTO capture (6 games/80 skater appearances), not a new HTO fetch.
The November 7 Scores readback and November 4 source/date proof are separately
pinned. Live collector, workbook, official record, HTO admin and public publishing
are never touched. Game-specific source text is not committed.
"""
from __future__ import annotations
from datetime import datetime,timezone
from pathlib import Path
import argparse,hashlib,json,re
from audit_saved_hto_sixgame_identity_join import (
    fixed_current_source, boxid, PINNED_SAVED_READBACK_SHA, PINNED_PRIOR_PROOF_SHA, SourceHold,
)
from hockeyos_scorecard_period_contract import normalize,compare_same_game,ScoreboardHold

SCHEMA="hockeyos-pinned-sixgame-scorecard-and-boxscore-period-replay/v1"
PINNED_BOX_READBACK_SHA="f718c438e7b2fc67fc675375daf67daca860be51bf710bbf3f54b43dde633fd0"
PINNED_BOX_REVIEW_SHA="48cb5c19120099dd408e7fb5ceb9dbec642f0fc9a2bb96715654141285225bd1"

def need(value:bool,why:str)->None:
    if not value: raise SourceHold(why)

def heading_to_rows(text:object)->list[list[str]]:
    need(type(text) is str and 0<len(text)<2000,"BOXSCORE_HEADING_NOT_QUALIFIED")
    lines=[x.strip() for x in text.splitlines() if x.strip()]
    need(len(lines)==7 and lines[:2]==["SCORE BOARD","REGULAR SEASON"],
         "BOXSCORE_HEADING_STRUCTURE_CHANGED")
    header=["REGULAR SEASON",*lines[2].split()]
    a=["",*lines[4].split()]
    b=["",*lines[6].split()]
    a[0]=lines[3]
    b[0]=lines[5]
    return [header,a,b]

def replay(saved:dict,prior:dict,private_boxes:dict,private_review:dict,
           *,now:datetime)->dict:
    join=fixed_current_source(saved,prior,now=now)
    need(type(private_boxes) is dict and
         private_boxes.get("sourceAuthority")=="PUBLIC_HTO_HTTP_READBACK" and
         private_boxes.get("capturedAt")==prior["sourceScoreEvidence"]["capturedAt"] and
         type(private_boxes.get("games")) is list and
         len(private_boxes["games"])==6,
         "PREVIOUS_BOX_READBACK_SCOPE_CHANGED")
    need(type(private_review) is dict and
         private_review.get("state")=="VERIFIED_COMPLETE_PLAYER_APPEARANCES" and
         private_review.get("pinnedBaselineMatchesLiveOfficial") is True and
         private_review.get("sixGameSourceTotals")=={"GP":6,"GF":14,"GA":30,"players":22} and
         private_review.get("appearanceCertification",{}).get("status")==
         "VERIFIED_COMPLETE_PLAYER_APPEARANCES" and
         private_review["appearanceCertification"].get("verifiedSkaterAppearances")==80,
         "PREVIOUS_INDEPENDENT_BOXSCORE_REVIEW_NOT_QUALIFIED")
    review_sources=private_review.get("gameHtmlSources")
    need(type(review_sources) is list and len(review_sources)==6,
         "PREVIOUS_BOXSCORE_REVIEW_SOURCE_COUNT_CHANGED")
    reviewed={x.get("htoGameId"):x for x in review_sources if type(x) is dict}
    ids=set(join["qualifiedSixPriorGameIDs"])
    need(len(reviewed)==6 and set(reviewed)==ids,
         "PREVIOUS_BOXSCORE_REVIEW_ID_SET_CHANGED")
    boxes={}
    for box in private_boxes["games"]:
        need(type(box) is dict and type(box.get("heading")) is str,
             "PRIOR_BOX_SOURCE_SHAPE_CHANGED")
        gid=boxid(box.get("url"))
        need(gid in ids and gid not in boxes,"DUPLICATE_OR_UNKNOWN_PRIVATE_BOX_ID")
        proof=reviewed[gid]
        need(proof.get("sourceUrl")==box.get("url") and
             proof.get("sourceHtmlSHA256") in
                 [x["priorIndependentBoxscoreSHA256"]
                  for x in join["mapping"] if x["gameId"]==gid],
             "PREVIOUS_BOX_SOURCE_HASH_OR_URL_NOT_SAME_GAME")
        boxes[gid]=box
    need(len(boxes)==len(ids),"SIX_PRIOR_BOX_SOURCE_ROWS_MISSING")
    scores=next((page for page in saved["pages"]
         if page.get("name")=="hto_scores"),None)
    need(type(scores) is dict,"CURRENT_SCORES_PAGE_MISSING")
    results=[]
    for entry in join["mapping"]:
        gid=entry["gameId"]
        source_rows=scores["tables"][entry["savedScorecardTableIndex"]]["rows"]
        box_rows=heading_to_rows(boxes[gid]["heading"])
        try:
            match=compare_same_game(source_rows,box_rows,
                   official_opponent=entry["opponent"],
                   official_gf=entry["goalsFor"],official_ga=entry["goalsAgainst"])
        except ScoreboardHold as exc:
            raise SourceHold("PINNED_BOX_VS_SCORES_PERIOD_MISMATCH:"+str(gid)+":"+str(exc)) from exc
        need(match["scorePageWidth"]==entry["scorecardWidth"],
             "SCORECARD_WIDTH_CHANGED_SINCE_LINK_REPLAY")
        results.append({"htoGameId":gid,
                        "originalMasterGameNumber":entry["masterGameNumber"],
                        "opponent":entry["opponent"],
                        "scorePageColumns":match["scorePageWidth"],
                        "boxscoreColumns":match["boxscorePageWidth"],
                        "gf":match["gf"],"ga":match["ga"],
                        "regulationAndOTPeriodsExactlyCompared":True})
    need(len(results)==6 and
         sum(x["gf"] for x in results)==14 and
         sum(x["ga"] for x in results)==30,
         "SIX_GAME_BOXSCORE_PERIOD_SOURCE_TOTALS_NOT_MATCHED")
    return {
      "schema":SCHEMA,
      "status":"PRIVATE_PINNED_SIX_GAME_TWO_SOURCE_PERIOD_REPLAY_PASS",
      "sixGameHTOIds":[x["htoGameId"] for x in results],
      "teamTotals":{"gp":6,"gf":14,"ga":30},
      "scorePageFiveColumnGames":sum(x["scorePageColumns"]==5 for x in results),
      "boxscoreFiveColumnGames":sum(x["boxscoreColumns"]==5 for x in results),
      "priorReviewedSkaterAppearances":80,
      "periodMatches":results,
      "newLiveBoxscoreFetchPerformed":False,
      "individualPlayerRowsRevalidatedNow":False,
      "publishedAwardsRecalculated":False,
      "operationalCollectorModified":False,
      "originalWorkbookWritten":False,
      "officialHTODataWritten":False,
      "releaseAuthorized":False,
    }

def run(argv:list[str]|None=None)->int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--saved-scores",type=Path,required=True)
    parser.add_argument("--previously-verified-date-proof",type=Path,required=True)
    parser.add_argument("--previously-verified-boxes",type=Path,required=True)
    parser.add_argument("--previously-verified-review",type=Path,required=True)
    parser.add_argument("--strict",action="store_true")
    args=parser.parse_args(argv)
    try:
        files=((args.saved_scores,PINNED_SAVED_READBACK_SHA),
               (args.previously_verified_date_proof,PINNED_PRIOR_PROOF_SHA),
               (args.previously_verified_boxes,PINNED_BOX_READBACK_SHA),
               (args.previously_verified_review,PINNED_BOX_REVIEW_SHA))
        values=[]
        for file,wanted in files:
            raw=file.read_bytes()
            need(hashlib.sha256(raw).hexdigest()==wanted,
                 "PINNED_PREVIOUS_SOURCE_DIGEST_NOT_MATCHED")
            values.append(json.loads(raw))
        result=replay(*values,now=datetime.now(timezone.utc))
        result["sourceSHA256"]={label:sha for label,sha in zip(
              ("savedScores","originalDateProof","priorBoxReadback","priorReview"),
              (PINNED_SAVED_READBACK_SHA,PINNED_PRIOR_PROOF_SHA,
               PINNED_BOX_READBACK_SHA,PINNED_BOX_REVIEW_SHA))}
    except (OSError,ValueError,SourceHold,KeyError,TypeError) as exc:
        result={"schema":SCHEMA,"status":"HOLD",
                "reason":str(exc) if isinstance(exc,SourceHold) else type(exc).__name__,
                "releaseAuthorized":False,"operationalCollectorModified":False}
    print(json.dumps(result,sort_keys=True,ensure_ascii=False))
    return 2 if args.strict and result["status"]=="HOLD" else 0

if __name__=="__main__":
    raise SystemExit(run())
