"""Read-only acceptance audit for isolated five-game HTO collector extension.

Inputs remain local/private. Verifies that first four previously accepted game
records are preserved byte-for-byte semantically while official game 3375682
is added with complete source/season parity and unknown fields retained.

This is not authorization to install, schedule or publish the new operational
collector, and it never modifies any workbook or public GitHub file.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
import json,sys,os

IDS=(3356177,3356178,3369564,3375601,3375682)
FOUR=set(IDS[:4])
class AuditHold(ValueError):pass
def require(cond,code):
    if not cond:raise AuditHold(code)
def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))

def audit(prior,candidate,sandbox_receipt=None,original_pinned=None):
    require(prior.get("schema")=="brave-hc-hto-verified-game-feed/v1","OLD_ACCEPTED_SCHEMA_WRONG")
    require(prior.get("sourceValidationState")=="PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS","OLD_VERIFICATION_MISSING")
    require(prior.get("workbookWritten") is False,"PRIOR_WORKBOOK_WRITE_NOT_ALLOWED")
    require(candidate.get("schema")=="brave-hc-hto-game-feed-candidate/v1","CANDIDATE_SCHEMA_WRONG")
    require(candidate.get("productionAcceptance") is False and candidate.get("workbookWritten") is False and
            candidate.get("publisherUpdated") is False,"REVIEW_ONLY_STATE_REQUIRED")
    old=prior.get("games",[]);new=candidate.get("games",[])
    oldmap={g.get("htoGameId"):g for g in old}
    newmap={g.get("htoGameId"):g for g in new}
    require(len(oldmap)==4 and set(oldmap)==FOUR and len(old)==4,"PRIOR_FOUR_COVERAGE_DRIFT")
    require(len(newmap)==5 and set(newmap)==set(IDS) and len(new)==5,"FIVE_GAME_EXACT_ID_SET_REQUIRED")
    for gid in FOUR:
        require(oldmap[gid]==newmap[gid],"ORIGINAL_FOUR_GAME_ROWS_CHANGED_"+str(gid))
    fifth=newmap[3375682]
    require(fifth.get("date")=="2026-10-25" and fifth.get("workbookGameNumber")==363 and
            fifth.get("teamGoals")==6 and fifth.get("teamGoalsAgainst")==4,
            "FIFTH_GAME_ID_DATE_SCORE_SOURCE_MISMATCH")
    require(len(fifth.get("skaters",[]))==13 and len(fifth.get("goalies",[]))==1,
            "FIFTH_GAME_ATTENDANCE_NOT_SOURCE_COMPLETE")
    require(fifth.get("sourceUrl")=="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3375682&p=boxscore",
            "FIFTH_GAME_OFFICIAL_URL_MISMATCH")
    require(candidate.get("teamGP")==5 and candidate.get("teamG")==12 and candidate.get("teamA")==19,
            "FIVE_GAME_TOTALS_DIFFER_FROM_CURRENT_HTO")
    require(sum(g["teamGoals"] for g in new)==12 and sum(g["teamGoalsAgainst"] for g in new)==23,
            "OFFICIAL_TEAM_GF_GA_DISAGREEMENT")
    for g in new:
        require(sum(p["g"] for p in g["skaters"])==g["teamGoals"],
                "SCORER_GF_DISAGREEMENT_"+str(g["htoGameId"]))
        require(sum(p["goalsAgainst"] for p in g["goalies"])==g["teamGoalsAgainst"],
                "GOALIE_GA_DISAGREEMENT_"+str(g["htoGameId"]))
        require(all(type(p["g"]) is int and type(p["a"]) is int and p["pts"]==p["g"]+p["a"] for p in g["skaters"]),
                "SKATER_SCORE_ARITHMETIC_DISAGREEMENT_"+str(g["htoGameId"]))
    parity=candidate.get("missingStatFields",{}).get("seasonParity",{})
    sk=parity.get("skaters",{});go=parity.get("goalies",{})
    require(sk.get("completeFieldComparisons")==120 and sk.get("expectedFieldComparisons")==120 and
            sk.get("discrepancies")==[] and sk.get("incompleteFields")==[],
            "CURRENT_120_SKATER_PARITY_NOT_PASSED")
    missing=go.get("incompleteFields",[])
    require(go.get("completeFieldComparisons")==11 and go.get("expectedFieldComparisons")==12 and
            go.get("discrepancies")==[] and len(missing)==1 and
            missing[0].get("name")=="Leong, Dev" and missing[0].get("field")=="POTG" and
            missing[0].get("unknownGames")==1,
            "UNKNOWN_GOALIE_POTG_OR_PARITY_CHANGED")
    require(candidate.get("missingStatFields",{}).get("skaterPIMUnknownRows")==42 and
            candidate.get("inferredPerGamePOTG")==[],"UNKNOWN_STATS_OR_INFERENCE_CHANGED")
    pinned_integrity=None
    if sandbox_receipt is not None and original_pinned is not None:
        hashes=sandbox_receipt.get("originalSourceHashes")
        require(isinstance(hashes,dict) and hashes,"SANDBOX_ORIGINAL_HASH_MANIFEST_MISSING")
        root=Path(original_pinned)
        for name,expected in hashes.items():
            f=root/name
            require(f.is_file() and sha256(f.read_bytes()).hexdigest()==expected,
                    "PRODUCTION_COLLECTOR_SOURCE_CHANGED_"+name)
        pinned_integrity="PASS_PRODUCTION_SCRIPTS_UNCHANGED"
    return {"state":"PRIVATE_FIVE_GAME_SOURCE_ACCEPTANCE_PASS",
            "sourceVerifiedGames":5,
            "historicalFourUnchanged":True,
            "newGameId":3375682,
            "newGameNumber":363,
            "newGameSkaters":13,"newGameGoalies":1,
            "sourceFiveGamesGoals":12,"sourceFiveGamesAssists":19,"sourceFiveGamesGA":23,
            "skaterParity":"120/120","goalieParity":"11/12_WITH_ONE_EXPLICIT_UNKNOWN_POTG",
            "pinnedSourceIntegrity":pinned_integrity,
            "productionAcceptance":False,
            "originalWorkbookWritten":False,"productionFeedWritten":False,
            "publicWebsitePublished":False,
            "nextGate":"INDEPENDENT_5_GAME_COLLECTOR_SCHEMA_AND_REPLAY_ACCEPTANCE"}

def run():
    ap=ArgumentParser()
    for n in ("prior","candidate","receipt","output"):ap.add_argument("--"+n,required=True)
    ap.add_argument("--pinned",required=True)
    args=ap.parse_args()
    try:
        r=audit(load(args.prior),load(args.candidate),load(args.receipt),args.pinned)
        r["reviewedAtUTC"]=datetime.now(timezone.utc).isoformat()
        output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True)
        temp=output.with_suffix(output.suffix+".tmp")
        temp.write_text(json.dumps(r,indent=2)+"\n",encoding="utf8")
        os.replace(temp,output)
        print(json.dumps(r))
        return 0
    except (AuditHold,ValueError,KeyError,TypeError,OSError) as e:
        print(json.dumps({"state":"PRIVATE_FIVE_GAME_SOURCE_HELD","reason":str(e),"sourceWritten":False}),file=sys.stderr)
        return 2
if __name__=="__main__":sys.exit(run())
