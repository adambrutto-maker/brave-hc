"""Audit private, explicit HTO GTG boxscore evidence (no network or writes).

HTO has a GTG column only on some 2026/27 games. Column absence MUST stay
unknown, not be converted into zero. Any new Excel AA / GTG value requires a
separate structured-table admission and owner-approved release.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

EXPECTED = {
 3356177: ("Sunday, Sep 20, 2026",None),
 3356178: ("Sunday, Sep 27, 2026",1),
 3369564: ("Sunday, Oct 4, 2026",2),
 3375601: ("Sunday, Oct 18, 2026",None),
}
EXACT_CREDITS = {
 (3356178,"Carosi, Justin"):1,
 (3369564,"Carosi, Justin"):1,
 (3369564,"Kong, Henry"):1,
}

class GTGReviewHold(ValueError):pass

def audit(feed, evidence):
 if (feed.get("schema")!="brave-hc-hto-verified-game-feed/v1"
     or feed.get("allGamesDiscovered") is not True
     or feed.get("playerAggregateParity") is not True
     or feed.get("teamGP")!=4):
  raise GTGReviewHold("HTO_GAME_FEED_UNVERIFIED")
 games=feed.get("games")
 if not isinstance(games,list) or len(games)!=4:
  raise GTGReviewHold("UNEXPECTED_VERIFIED_GAME_COUNT")
 f={g.get("htoGameId"):g for g in games if isinstance(g,dict)}
 if len(f)!=4 or set(f)!=set(EXPECTED):
  raise GTGReviewHold("HTO_GAME_SET_UNADMITTED")
 if (evidence.get("schema")!="brave-hc-private-hto-explicit-gtg-observation/v1"
     or evidence.get("status")!="SOURCE_VERIFIED_GTGS_REVIEW_ONLY"
     or evidence.get("sourceWorkbookModified") is not False
     or evidence.get("publicRecordPublished") is not False):
  raise GTGReviewHold("GTG_SOURCE_ENVELOPE_NOT_VERIFIED")
 e=evidence.get("games")
 if not isinstance(e,list) or len(e)!=4:
  raise GTGReviewHold("GTG_SOURCE_COVERAGE_MISSING")
 by_id={x.get("htoGameId"):x for x in e if isinstance(x,dict)}
 if len(by_id)!=4 or set(by_id)!=set(EXPECTED):
  raise GTGReviewHold("GTG_EVIDENCE_DUPLICATE_OR_UNADMITTED_GAME")
 covered=[]
 unobservable=[]
 positives=[]
 for gid,(day,expected_total) in EXPECTED.items():
  source=by_id[gid];game=f[gid]
  url=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
  if (source.get("officialDate")!=day or source.get("sourceUrl")!=url
      or not isinstance(source.get("sourceSHA256"),str)
      or re.fullmatch(r"[0-9a-fA-F]{64}",source["sourceSHA256"]) is None):
   raise GTGReviewHold("OFFICIAL_GTGS_SOURCE_PROVENANCE_CHANGED")
  src_names={p.get("name") for p in game.get("skaters",[]) if isinstance(p,dict)}
  if len(src_names)!=len(game.get("skaters",[])) or None in src_names:
   raise GTGReviewHold("VERIFIED_PLAYER_IDENTITIES_AMBIGUOUS")
  source_rows=source.get("sourceGTGPlayers")
  if not isinstance(source_rows,list):
   raise GTGReviewHold("GTG_PLAYER_ROWS_INVALID")
  if expected_total is None:
   if (source.get("columnStatus")!="NO_GTGS_COLUMN_NO_VALUES"
       or source.get("teamGTG") is not None or source_rows!=[]):
    raise GTGReviewHold("NONEXISTENT_GTGS_COLUMN_MUST_REMAIN_UNKNOWN")
   unobservable.append({"htoGameId":gid,"reason":"GTG_COLUMN_NOT_PRESENT_OFFICIAL_SOURCE",
                       "playerCount":len(src_names),"legacyExcelColumn":"AA"})
   continue
  if source.get("columnStatus")!="EXPLICIT_GTGS_IN_HTO" or source.get("teamGTG")!=expected_total:
   raise GTGReviewHold("GTG_TEAM_SUMMARY_NOT_VERIFIED")
  names=[r.get("name") for r in source_rows if isinstance(r,dict)]
  if len(names)!=len(source_rows) or len(set(names))!=len(names) or set(names)!=src_names:
   raise GTGReviewHold("HTO_GTGS_PLAYER_COVERAGE_MISMATCH")
  official={p["name"]:p for p in game["skaters"]}
  team_total=0
  for row in source_rows:
   val=row.get("gtg")
   if type(val) is not int or val not in (0,1):
    raise GTGReviewHold("HTO_GTGS_VALUE_NOT_EXPLICIT")
   if val and (type(official[row["name"]].get("g")) is not int
               or official[row["name"]]["g"]<val):
    raise GTGReviewHold("GTG_CREDIT_NOT_SUPPORTED_BY_PLAYER_GOALS")
   key=(gid,row["name"])
   if (val>0)!=(key in EXACT_CREDITS):
    raise GTGReviewHold("GTG_CREDIT_CHANGE_REQUIRES_NEW_REVIEW")
   if val>0 and val!=EXACT_CREDITS[key]:
    raise GTGReviewHold("GTG_PLAYER_CREDIT_DIFFERENT_FROM_APPROVED_SOURCE")
   if val>0:positives.append({"htoGameId":gid,"player":row["name"],"gtg":val})
   team_total+=val
  if team_total!=expected_total:
   raise GTGReviewHold("HTO_GTGS_TEAM_PARITY_MISMATCH")
  covered.append({"htoGameId":gid,"rowCount":len(source_rows),"officialGTGCount":team_total,
                  "legacyExcelColumn":"AA","sourceStatus":"EXPLICIT_GTGS_SOURCE_REVIEW"})
 if len(positives)!=3 or len(covered)!=2 or len(unobservable)!=2:
  raise GTGReviewHold("GTG_SOURCE_SCOPE_CHANGED")
 return {
  "schema":"brave-hc-plan03-gtg-source-review/v1",
  "status":"PARTIAL_HTO_GTGS_REVIEW_ONLY_NOT_FOR_WORKBOOK",
  "htogamesReviewed":4,
  "knownGTGGameSources":covered,
  "notObservableGames":unobservable,
  "confirmedPositiveGTGCredits":sorted(positives,key=lambda p:(p["htoGameId"],p["player"])),
  "knownSkaterObservationCount":sum(x["rowCount"] for x in covered),
  "unknownSkaterObservationCount":sum(x["playerCount"] for x in unobservable),
  "allPlayersGTGComplete":False,
  "originalWorkbookModified":False,
  "structuredTableExtensionApproved":False,
  "officialHTORecordWritten":False,
  "publicAwardOrRecordPublicationAuthorized":False,
  "futureHTOGame3375682Admitted":False
 }

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--verified-hto-feed",type=Path,required=True)
 p.add_argument("--private-gtg-evidence",type=Path,required=True)
 a=p.parse_args()
 feed=json.loads(a.verified_hto_feed.read_text(encoding="utf8"))
 evidence=json.loads(a.private_gtg_evidence.read_text(encoding="utf8"))
 if hashlib.sha256(a.verified_hto_feed.read_bytes()).hexdigest()!=evidence.get("verifiedHTOFeedSHA256"):
  raise GTGReviewHold("SUPPLEMENTAL_EVIDENCE_REFERENCES_DIFFERENT_HTO_FEED")
 print(json.dumps(audit(feed,evidence),indent=2,ensure_ascii=False))

if __name__=="__main__":main()
