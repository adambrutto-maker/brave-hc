#!/usr/bin/env python3
"""Build Winter 2025/26 HTO native archive editorial review register.

No articles or source data are published by creating this index.
"""
from __future__ import annotations
from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
import json,sys

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/"docs/editorial/native_hto/2025-26"
AUDIT=BASE/"official_boxscore_source_audit.json"
FIVE=BASE/"editorial_review/manifest.json"
FIVE_CHECK=BASE/"editorial_review/fresh_full_event_reverification.json"
NINETEEN=BASE/"source_limited_review/review_manifest.json"
NINETEEN_CHECK=BASE/"source_limited_review/reverification.json"
OUT_MD=BASE/"REVIEW_INDEX.md"
OUT_JSON=BASE/"review_index.json"

def require(value,code):
    if not value:raise ValueError(code)

def rel_doc(folder,name):
    return folder+"/"+name

def main():
    source=json.loads(AUDIT.read_text(encoding="utf8"))
    full=json.loads(FIVE.read_text(encoding="utf8"))
    limited=json.loads(NINETEEN.read_text(encoding="utf8"))
    full_check=json.loads(FIVE_CHECK.read_text(encoding="utf8"))
    limited_check=json.loads(NINETEEN_CHECK.read_text(encoding="utf8"))
    require(full_check["verifiedGames"]==full_check["gamesRechecked"]==5,
            "FIVE_FULL_EVENT_GAMES_NOT_RECHECKED")
    require(limited_check["reconfirmed"]==limited_check["attemptedGames"]==19 and
            limited_check["held"]==0,
            "NINETEEN_LIMITED_GAMES_NOT_RECHECKED")
    require(full["entryCount"]==5 and len(limited["games"])==19,
            "REVIEW_FILE_COVERAGE_INCOMPLETE")
    grade={g["id"]:g for g in source["games"]}
    require(len(grade)==27,"HISTORICAL_GAME_ID_COVERAGE_CHANGED")
    by_id={}
    for f in full["entries"]:
        gid=f["gameId"]
        require(gid not in by_id and grade[gid]["auditStatus"]=="FULL_GAME_EVENTS_AND_SKATERS",
                "FULL_EVENT_SOURCE_ID_CONFLICT")
        path=BASE/"editorial_review"/f["file"]
        require(path.exists(),"MISSING_INDIVIDUALLY_REVIEWED_FILE")
        sha=sha256(path.read_bytes().replace(b"\r\n",b"\n")).hexdigest()
        require(sha==f["documentSHA256"],"SOURCE_COMPLETE_REVIEW_FILE_HASH_CHANGED")
        by_id[gid]={"gameId":gid,"date":f["date"],
                   "opponent":grade[gid]["opponentRaw"],
                   "goalsFor":grade[gid]["gf"],"goalsAgainst":grade[gid]["ga"],
                   "gameType":grade[gid]["gameType"],
                   "evidenceGrade":"FULL_GAME_EVENTS_AND_SKATERS",
                   "editorialStatus":"POLISHED_REVIEW_DRAFT_NOT_APPROVED",
                   "file":rel_doc("editorial_review",f["file"]),
                   "fileSHA256":sha,
                   "sourceSHA256":f["sourceFingerprint"],
                   "HTOUrl":grade[gid]["boxscoreURL"],
                   "nativeSummaryPublicationVerified":False}
    for entry in limited["games"]:
        gid=entry["gameId"]
        require(gid not in by_id and grade[gid]["auditStatus"]==entry["sourceGrade"],
                "LIMITED_SOURCE_ID_CONFLICT")
        path=BASE/"source_limited_review"/entry["file"]
        require(path.is_file(),"LIMITED_REVIEW_FILE_MISSING")
        actual=sha256(path.read_bytes().replace(b"\r\n",b"\n")).hexdigest()
        require(actual==entry["fileSHA256"],"SOURCE_LIMITED_REVIEW_HASH_CHANGED")
        by_id[gid]={"gameId":gid,"date":entry["date"],
                   "opponent":entry["opponent"],
                   "goalsFor":entry["score"][0],"goalsAgainst":entry["score"][1],
                   "gameType":entry["gameType"],
                   "evidenceGrade":entry["sourceGrade"],
                   "editorialStatus":"SOURCE_LIMITED_REVIEW_DRAFT_NOT_APPROVED",
                   "file":rel_doc("source_limited_review",entry["file"]),
                   "fileSHA256":actual,
                   "sourceSHA256":entry["sourceFingerprint"],
                   "HTOUrl":grade[gid]["boxscoreURL"],
                   "nativeSummaryPublicationVerified":False}
    require(len(by_id)==24,"TWENTY_FOUR_SOURCE_VERIFIED_PLAYED_GAMES_REQUIRED")
    forfeits=[]
    for g in source["games"]:
        if g["auditStatus"]!="FORFEIT_ONLY_NO_ON_ICE_RECAP":continue
        require(g["id"] not in by_id,"FORFEIT_WRONGFULLY_ADMITTED_AS_GAME_STORY")
        forfeits.append({"gameId":g["id"],"date":g["date"],
            "opponent":g["opponentRaw"],"sourceResult":[g["gf"],g["ga"]],
            "gameType":g["gameType"],"status":"ADMINISTRATIVE_FORFEIT_NO_GAME_STORY",
            "HTOUrl":g["boxscoreURL"]})
    require(len(forfeits)==3,"FORFEIT_COUNT_DRIFT")
    entries=sorted(by_id.values(),key=lambda x:(x["date"],x["gameId"]))
    results={"schema":"brave-hc-historical-season-HTO-native-review-index/v1",
             "generatedAtUTC":datetime.now(timezone.utc).isoformat(),
             "season":"Winter 2025/26",
             "gamesTotal":27,"playedGamesVerified":24,
             "fullEventReviewDrafts":5,"sourceLimitedRegularReviewDrafts":18,
             "overtimeLimitedReviewDrafts":1,"administrativeForfeits":3,
             "newRetrospectiveArticlesPublished":0,
             "originalHistoricalNativeContentStatus":"UNKNOWN_NOT_INSPECTED",
             "reviewDecision":"NOT_APPROVED_FOR_PUBLICATION",
             "currentSeasonSeparate":"2026/27 six summaries and one preview already native-published and verified",
             "historicalNativeSourceFieldBackupStatus":"NOT_YET_INSPECTED",
             "archivedGameEditorAccess":"TEST_GAME_2215008_DIRECT_SCORES_EDIT_ROUTE_REDIRECTED_TO_CURRENT_SCHEDULE",
             "supportDecisionRequired":"VERIFY_SAFE_ARCHIVED_GAME_SUMMARY_EDITING_WITH_HTO_SUPPORT",
             "historicalRetrospectiveStatus":"NOT_ORIGINAL_CONTEMPORANEOUS_REPORTING",
             "sources":{"originalHTOAudit":str(AUDIT.relative_to(ROOT)).replace("\\","/"),
                        "freshFiveGameFullEvent":str(FIVE_CHECK.relative_to(ROOT)).replace("\\","/"),
                        "freshNineteenLimited":str(NINETEEN_CHECK.relative_to(ROOT)).replace("\\","/")},
             "games":entries,"forfeits":sorted(forfeits,key=lambda x:x["date"])}
    OUT_JSON.write_text(json.dumps(results,indent=2,ensure_ascii=False)+"\n",
                        encoding="utf8",newline="\n")
    lines=[
      "# Brave H.C. — Winter 2025–26 Historical Game Archive Review Register","",
      "**State: RESEARCH AND EDITORIAL REVIEW ONLY — NO NEW RETROSPECTIVE GAME SUMMARY PUBLISHED BY THIS PROJECT.**","",
      "The official HTO **Scores → Game Summary** field remains the intended primary home. "
      "The separate Hot Stove archive is a discovery/mirror layer after verified publication. "
      "These pieces were reconstructed in November 2026, not published on their original game dates.","",
      "## Source and editorial coverage","",
      "- 24 played games with fresh official HTO source checks: five full goal-event/skater-log reviews, "
      "18 score/period/skater-total reviews, and one source-limited 0–1 overtime playoff account.",
      "- Three forfeits are administrative records, **not 0–0 ties** or played-game recaps.",
      "- Individual historical editorial approval, original native field inspection/backup, public "
      "HTO article readback and score/stat preservation are still required for every game.",
      "- Current 2026/27 articles are already complete (six native summaries and one preview). "
      "They are independent of this historical review.","",
      "## Review each played game","",
      "| Date | Official game | Outcome (Braves first) | Evidence | Draft for review |",
      "| --- | --- | --- | --- | --- |"
    ]
    labels={"FULL_GAME_EVENTS_AND_SKATERS":"Complete event log",
            "SCOREBOARD_AND_SKATERS_ONLY":"Periods + skater totals",
            "EVENTS_WITH_PARTIAL_PLAYER_STATS":"Overtime event, limited skater data"}
    for g in entries:
        url=g["HTOUrl"].replace("|","%7C")
        draft=g["file"].replace("|","%7C")
        score=str(g["goalsFor"])+"–"+str(g["goalsAgainst"])
        lines.append("| "+g["date"]+" | [#"+str(g["gameId"])+"]("+url+") · "+
                     g["opponent"].replace("|","/")+" | "+score+" · "+g["gameType"]+
                     " | "+labels[g["evidenceGrade"]]+" | [Review draft]("+draft+") |")
    lines.extend(["","## Forfeits — preserve as administrative records","",
                  "| Date | Official game | Source description | Classification |",
                  "| --- | --- | --- | --- |"])
    for g in sorted(forfeits,key=lambda x:x["date"]):
        lines.append("| "+g["date"]+" | [#"+str(g["gameId"])+"]("+g["HTOUrl"]+
                     ") | "+g["opponent"].replace("|","/")+
                     " | Forfeit; **not** a played 0–0 tie |")
    lines.extend(["","## Native HTO publication gate","",
      "Before any publication, an authorized HTO administrator must open the exact "
      "game ID's Game Summary field and preserve any original contemporary report. "
      "A blank public boxscore page does **not** prove an existing private editor field is empty. "
      "In the current authenticated admin, directly opening archived HTO game #2215008's Scores editor "
      "redirected to the current-season Schedule. HTO's Season Update FAQ advises contacting Support "
      "for old-season reactivation; do **not** update or reset the active 2026/27 season as a workaround. "
      "An HTO-supported historical text-edit route remains unverified. "
      "A newly reconstructed story must be clearly labeled retrospective, "
      "approved individually and published without changing official scoring or game data. "
      "Only then should the Hot Stove season archive link to the native story.","",
      "## Source evidence and validation","",
      "- [Complete-event five-game recheck](editorial_review/fresh_full_event_reverification.json)",
      "- [Limited-source nineteen-game recheck](source_limited_review/reverification.json)",
      "- [Twenty-four base review draft manifests](retrospective_drafts/manifest.json)",
      "- [Five detailed editorial review files](editorial_review/manifest.json)",
      "- [Nineteen source-limited reviews](source_limited_review/review_manifest.json)",
      "- [Machine-readable review index](review_index.json)",
      "- [HTO official archived-season editing FAQ](https://www.hometeamsonline.com/sportswebsites/default.asp?p=helpdetails&topic=teaminfo)","",
      "**Release restrictions:** No archive story is automatically approved, no per-game widget is "
      "created, no site layout is changed and LiveBarn/highlights remain a separate workstream.",""])
    OUT_MD.write_text("\n".join(lines),encoding="utf8",newline="\n")
    print(json.dumps({"status":"HISTORICAL_REVIEW_REGISTER_BUILT",
        "sourceVerifiedPlayedGames":len(entries),"forfeits":len(forfeits),
        "detailed":5,"limited":19,"newRetrospectivePublications":0,
        "files":[str(OUT_MD),str(OUT_JSON)]}))
    return results

if __name__=="__main__":
    try:main()
    except Exception as exc:
        print("REVIEW_INDEX_HELD:",exc,file=sys.stderr)
        sys.exit(2)
