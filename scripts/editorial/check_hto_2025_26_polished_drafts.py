#!/usr/bin/env python3
"""Independent source-gate for five manually polished 2025/26 recaps. No publishing."""
from __future__ import annotations
from collections import Counter
from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
import json,sys

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/"docs/editorial/native_hto/2025-26/official_boxscore_source_audit.json"
RAW_MANIFEST=ROOT/"docs/editorial/native_hto/2025-26/retrospective_drafts/manifest.json"
REVIEW_DIR=ROOT/"docs/editorial/native_hto/2025-26/editorial_review"
IDS={2215015,2215013,2215011,2215010,2215008}

def check(ok,reason):
 if not ok:raise ValueError(reason)

def run():
 audit=json.loads(SOURCE.read_text(encoding="utf-8"))
 drafts=json.loads(RAW_MANIFEST.read_text(encoding="utf-8"))
 byid={g["id"]:g for g in audit["games"]}
 previously={g["gameId"]:g for g in drafts["stories"]}
 edited=list(REVIEW_DIR.glob("*_EDITORIAL_REVIEW.md"))
 check(len(edited)==5 and len(IDS)==5,"EXPECTED_FIVE_HAND_EDITED_STORIES")
 entries=[]
 for path in sorted(edited):
  name=path.name
  matching=[i for i in IDS if "_"+str(i)+"_" in name]
  check(len(matching)==1,"EDITORIAL_FILENAME_WITHOUT_UNIQUE_GAME_ID")
  game_id=matching[0]
  g=byid[game_id]
  original=previously[game_id]
  check(g["auditStatus"]=="FULL_GAME_EVENTS_AND_SKATERS","EDITORIAL_GAME_NOT_FULLY_SOURCE_VERIFIED")
  content=path.read_text(encoding="utf-8")
  check(content.startswith("# ") and "## Historical editorial verification" in content,
        "EDITORIAL_WRITING_STRUCTURE_MISSING")
  check("EDITORIAL REVIEW, NOT PUBLISHED" in content and
        "not contemporaneous" in content,"EDITORIAL_PUBLICATION_HOLD_MISSING")
  check(str(game_id) in content and g["boxscoreURL"] in content,
        "OFFICIAL_GAME_LINK_MISSING")
  check(original["sourceFingerprint"] in content,
        "SOURCE_FINGERPRINT_MISMATCH")
  check(("Retrospective article draft" in content) and
        "No video or highlights are integrated" in content,
        "DRAFT_SCOPE_OR_VIDEO_BOUNDARY_MISSING")
  check("<iframe" not in content and "<script" not in content,
        "EDITORIAL_UNSAFE_WEB_CONTENT")
  check(str(g["gf"])+"–"+str(g["ga"]) in content or
        str(g["ga"])+"–"+str(g["gf"]) in content,
        "FINAL_SCORE_UNREFERENCED")
  players={p["name"]:p for p in g["players"]}
  scored=[p for p in players.values() if p.get("G",0)>0]
  check(any((" "+p["name"].split(",")[0]) in content for p in scored),
        "NO_SOURCE_VERIFIED_SCORER_MENTIONED")
  if "empty-net" in content.lower():
   check(any(x["strength"]=="EN" and x["team"]=="Brave H.C." for x in g["events"]),
         "EMPTY_NET_STORY_WITHOUT_SOURCE")
  if "power-play" in content.lower():
   check(any(x["strength"]=="PP" and x["team"]=="Brave H.C." for x in g["events"]),
         "POWER_PLAY_STORY_WITHOUT_SOURCE")
  if game_id==2215008:
   check(players["Pearsoll, Keith"]["G"]==3,"HTO_HAT_TRICK_SOURCE_NOT_CONFIRMED")
  if game_id==2215010:
   check(players["Saindon, Stephane"]["G"]==2 and
         players["Provenzano, Michael"]["G"]==2,"HTO_TWO_TWO_GOAL_GAMES_NOT_CONFIRMED")
  if game_id==2215011:
   period=g["periods"]
   check(sum(x["braves"] for x in period[:2])==3 and
         sum(x["opponent"] for x in period[:2])==1 and
         period[2]["braves"]==0 and period[2]["opponent"]==3,
         "THIRD_PERIOD_TURNAROUND_UNSUPPORTED")
  if game_id==2215013:
   check(players["Rajasooriar, Krishnan"]["G"]==1,"ONE_GOAL_SOURCE_UNVERIFIED")
  if game_id==2215015:
   check(players["Saindon, Stephane"]["Pts"]==4 and
         sum(e["strength"]=="EN" and e["team"]=="Brave H.C." for e in g["events"])==2,
         "SAINDON_OR_EMPTY_NET_EVIDENCE_UNVERIFIED")
  entries.append({"gameId":game_id,"date":g["date"],"file":name,
    "officialBoxscore":g["boxscoreURL"],"headline":content.splitlines()[0][2:],
    "sourceFingerprint":original["sourceFingerprint"],
    "documentSHA256":sha256(path.read_bytes()).hexdigest(),
    "status":"EDITORIAL_REVIEW_NOT_APPROVED",
    "gameSummaryLive":False})
 check({e["gameId"] for e in entries}==IDS,"EDITED_STORY_COVERAGE_DRIFT")
 manifest={"schema":"brave-hc-2025-26-historical-editorial-review/v1",
           "checkedAtUTC":datetime.now(timezone.utc).isoformat(),
           "publishAuthorized":False,
           "nativeHTOChanged":False,
           "entryCount":len(entries),
           "entries":entries}
 out=REVIEW_DIR/"manifest.json"
 out.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",
                encoding="utf-8",newline="\n")
 return manifest

if __name__=="__main__":
 try:
  v=run()
  print(json.dumps({"status":"REVIEW_DRAFTS_SOURCE_CHECKED", "passes":len(v["entries"]),
                    "published":False, "gameIds":[x["gameId"] for x in v["entries"]]}))
 except (ValueError,KeyError,TypeError) as e:
  print("EDITORIAL_REVIEW_HELD:",e,file=sys.stderr)
  sys.exit(2)
