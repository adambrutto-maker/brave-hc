#!/usr/bin/env python3
"""ENG59 historical GameInfo raw-scoring-source disposition packet.

Reads previously source-hash-verified *public game evidence*, not private
video/identity receipts. Outputs a private human-review-only worksheet and JSON
outside widgets; never repairs official scores, player points, GP, PIM or league.
"""
import argparse,csv,json,re
from collections import Counter,defaultdict
from pathlib import Path
from urllib.parse import parse_qs,urlsplit

SCHEMA="brave-hc-svhl-raw-gameinfo-source-owner-review/v1"
REVIEW="brave-hc-svhl-gameinfo-raw-source-holds-review/v1"
BELOW="RAW_GAMEINFO_ROWS_BELOW_PUBLISHED_SCORE"
ABOVE="RAW_GAMEINFO_ROWS_ABOVE_PUBLISHED_SCORE"
ROSTER="RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD"
EMPTY="PUBLISHED_GOALS_WITH_NO_OFFICIAL_GAMEINFO_SCORING_ROWS"
PARTIAL="SOME_OFFICIAL_GAMEINFO_GOAL_ROWS_BELOW_FINAL_SCORE"
EXCESS="OFFICIAL_GAMEINFO_GOAL_ROWS_EXCEED_PUBLISHED_FINAL_SCORE"
QA="SOURCE_OWNER_DOCUMENTARY_REVIEW_AND_INDEPENDENT_QA_PENDING"
HEX=re.compile("^[a-f0-9]{64}$")

def need(v,name):
    if not v:raise ValueError("SVHL_RAW_GAMEINFO_REVIEW_HOLD:"+name)

def classify(game):
    published=sum(game["finalScore"])
    count=game["rawScoringRows"]
    if game["category"]==BELOW:
        need(count<published,"BELOW_CLASS_HAS_NO_DEFICIT")
        return EMPTY if count==0 else PARTIAL
    if game["category"]==ABOVE:
        need(count>published,"ABOVE_CLASS_HAS_NO_EXCESS")
        return EXCESS
    need(False,"UNEXPECTED_CATEGORY")

def packet(source):
    need(source.get("schema")==REVIEW and
         source.get("status")=="SOURCE_HASH_VERIFIED_AUTHOR_AUDIT_NOT_INDEPENDENTLY_ACCEPTED" and
         source.get("reviewOnly") is True and
         source.get("publicStatsOrScoresChanged") is False and
         source.get("seasonGPOrPIMVerified") is False and
         source.get("gamePages")==137 and source.get("gamePageHashesMatched")==137 and
         source.get("categories")=={
             BELOW:86,ABOVE:12,ROSTER:39
         } and len(source.get("games",[]))==137,
         "PUBLIC_SOURCE_COVERAGE_OR_ACCEPTANCE_UNVERIFIED")
    seen=set();items=[];groups=defaultdict(list)
    all_sources=set()
    for game in source["games"]:
        lid,gid=game.get("leagueId"),game.get("gameId")
        need(type(lid) is int and type(gid) is int and lid>0 and gid>0 and
             (lid,gid) not in seen and
             type(game.get("date")) is str and
             re.fullmatch(r"20\d{2}-\d{2}-\d{2}",game["date"]) and
             type(game.get("rawScoringRows")) is int and
             type(game.get("rosterQualifiedEvents")) is int and
             0<=game["rosterQualifiedEvents"]<=game["rawScoringRows"] and
             type(game.get("finalScore")) is list and len(game["finalScore"])==2 and
             all(type(x) is int and x>=0 for x in game["finalScore"]) and
             game.get("acceptedPlayerCorrection") is False and
             game.get("status")=="SOURCE_PROVEN_REVIEW_PENDING" and
             bool(HEX.fullmatch(game.get("officialPageSHA256",""))) and
             game.get("officialGameInfoURL") not in all_sources,
             "DUPLICATE_OR_MALFORMED_SOURCE_GAME")
        seen.add((lid,gid))
        url=game["officialGameInfoURL"]
        all_sources.add(url)
        u=urlsplit(url);query=parse_qs(u.query)
        need(u.scheme=="https" and u.hostname=="leagues.sportsvillage.ca" and
             u.path.lower()=="/gameinfo.aspx" and
             query.get("leagueid")==[str(lid)] and
             query.get("gameid")==[str(gid)] and
             query.get("page_type")==["Adult"],
             "SOURCE_PAGE_GAME_SCOPE_OR_ID_MISMATCH")
        if game["category"]==ROSTER:
            need(game["rawScoringRows"]==sum(game["finalScore"]),
                 "SOURCE_ROSTER_PARITY_INVALID")
            continue
        need(game["category"] in (BELOW,ABOVE),"UNKNOWN_RAW_CATEGORY")
        category=classify(game)
        score=sum(game["finalScore"])
        missing=max(0,score-game["rawScoringRows"])
        extra=max(0,game["rawScoringRows"]-score)
        row={
           "leagueId":lid,"gameId":gid,"date":game["date"],
           "homeTeam":game["homeTeam"],"awayTeam":game["awayTeam"],
           "publishedHomeGoals":game["finalScore"][0],
           "publishedAwayGoals":game["finalScore"][1],
           "publishedTotalGoals":score,
           "rawOfficialScoringRows":game["rawScoringRows"],
           "rosterQualifiedCandidateRows":game["rosterQualifiedEvents"],
           "rawRowsBelowPublishedGoals":missing,
           "rawRowsAbovePublishedGoals":extra,
           "reviewFamily":category,"reviewBundleId":str(lid)+"|"+category,
           "officialGameInfoURL":url,
           "officialGameInfoPageSHA256":game["officialPageSHA256"],
           "candidateRootCause":"NOT_DETERMINED_OFFICIAL_SOURCE_REVIEW_REQUIRED",
           "sourceOwnerEvidenceRequest":(
             "Confirm why the official GameInfo period scoring table is entirely empty despite a published nonzero game result, and locate authoritative score/event sheet or original record."
             if category==EMPTY else
             "Reconcile the partial official GameInfo scoring rows with the final score; identify missing/omitted periods or corrections using original dated source records."
             if category==PARTIAL else
             "Reconcile excess official GameInfo goal rows against the published final result; investigate score revisions, duplication, scoring attribution and game identity using dated source evidence."
           ),
           "sourceOwnerDecision":"UNREVIEWED",
           "documentaryEvidenceReference":None,
           "independentReviewer":None,
           "acceptedScoreOrPlayerCorrection":False,
           "gameInfoPageWasHashVerified":True
        }
        groups[row["reviewBundleId"]].append(gid)
        items.append(row)
    need(len(seen)==137 and len(items)==98 and
         sum(x["reviewFamily"]==EMPTY for x in items)==84 and
         sum(x["reviewFamily"]==PARTIAL for x in items)==2 and
         sum(x["reviewFamily"]==EXCESS for x in items)==12,
         "98_SOURCE_DISPOSITION_PARITY_FAILED")
    # Source-verified grouping compresses provider questions without claiming a
    # single historical data-export defect caused different seasons' records.
    bundles=[]
    for key,ids in sorted(groups.items(),key=lambda t:(
        -len(t[1]),t[0])):
        lid,category=key.split("|",1)
        bundles.append({
          "bundleId":key,"leagueId":int(lid),"family":category,
          "gameCount":len(ids),"officialGameIds":sorted(ids),
          "reviewStatus":"GROUPED_FOR_SOURCE_OWNER_INVESTIGATION_NOT_ACCEPTED",
          "sameUnderlyingDefectProved":False,
          "sourceOwnerName":None,"documentaryEvidenceReference":None,
          "independentReviewer":None
        })
    items.sort(key=lambda x:(
       0 if x["reviewFamily"]==PARTIAL else 1 if x["reviewFamily"]==EXCESS else 2,
       -x["leagueId"],x["date"],x["gameId"]))
    return {
      "schema":SCHEMA,"status":"SOURCE_HASH_VERIFIED_REVIEW_QUEUE_NOT_CORRECTED",
      "officialCompetition":"SVHL","vaHLIncluded":False,
      "sourceGameReviewCapturedUTC":source["capturedUTC"],
      "sourceGameReviewScope":"137_HELD_EIGHT_SEASON_GAMEINFO_RECORDS",
      "rawDiscrepancyGames":len(items),
      "sourceVerifiedPageHashes":len(items),
      "emptyOfficialGoalTablesWithNonzeroFinalGoals":84,
      "partialOfficialGoalTablesBelowFinal":2,
      "scoringTablesAbovePublishedTotal":12,
      "separateRosterIdentityHolds":39,
      "sourceOwnerBundleCount":len(bundles),
      "reviewBundles":bundles,"games":items,
      "correctionsAccepted":0,"correctedPlayerPoints":0,
      "sourceStatsOrScoresWritten":False,
      "independentAcceptance":QA,
      "limitations":[
        "A missing official scoring-table row does not prove the published final result was wrong.",
        "An empty source period table is not proof no goals occurred.",
        "Excess rows are not proof of illegal or duplicate goals.",
        "Grouping by historical season and discrepancy type does not establish one root cause.",
        "All original scoring/roster holds, GP, PIM and game results remain unchanged.",
        "The source owner must provide dated documentary records and independent acceptance before corrections."
      ]
    }

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument("--json-out",required=True,type=Path)
    parser.add_argument("--csv-out",required=True,type=Path)
    parser.add_argument("--bundle-csv-out",required=True,type=Path)
    opts=parser.parse_args()
    repo=opts.repo.resolve();widgets=(repo/"widgets").resolve()
    for dest in (opts.json_out,opts.csv_out,opts.bundle_csv_out):
        need(not dest.resolve().is_relative_to(widgets),
             "HUMAN_DISPOSITION_PACKET_MUST_NOT_ENTER_PUBLIC_WIDGET_DIRECTORY")
    source=json.loads((widgets/"svhl-gameinfo-hold-review.json").read_text(encoding="utf-8"))
    report=packet(source)
    opts.json_out.parent.mkdir(parents=True,exist_ok=True)
    opts.json_out.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    cases=report["games"]
    cols=[key for key in cases[0] if key not in ("gameInfoPageWasHashVerified",)]
    with opts.csv_out.open("w",newline="",encoding="utf-8-sig") as fp:
        writer=csv.DictWriter(fp,fieldnames=cols)
        writer.writeheader()
        for row in cases:writer.writerow({key:row[key] for key in cols})
    cols=list(report["reviewBundles"][0])
    with opts.bundle_csv_out.open("w",newline="",encoding="utf-8-sig") as fp:
        writer=csv.DictWriter(fp,fieldnames=cols)
        writer.writeheader()
        for bundle in report["reviewBundles"]:
            writer.writerow({**bundle,"officialGameIds":",".join(
                map(str,bundle["officialGameIds"]))})
    print(json.dumps({key:report[key] for key in (
      "status","rawDiscrepancyGames","emptyOfficialGoalTablesWithNonzeroFinalGoals",
      "partialOfficialGoalTablesBelowFinal","scoringTablesAbovePublishedTotal",
      "sourceOwnerBundleCount","correctionsAccepted")}))
if __name__=="__main__":main()
