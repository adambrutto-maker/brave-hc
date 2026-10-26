"""Narrow public admission: EXACT-NAME ONLY Brave H.C. historical opponents.

Requires source-qualified private combined ledger and published SVHL division
membership. Runs the existing pure review adapter again, validates explicit
totals/identity holds and outputs only public aggregates. Never exports the
private ledger or writes back to Excel/HTO.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone
from pathlib import Path
import json,os,sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_public_opponent_preview import build,Hold,read_json
EXPECTED={
 "Big Bastones":{"gp":7,"w":4,"l":2,"t":1,"gf":24,"ga":27},
 "Mid Ice Crisis":{"gp":5,"w":1,"l":2,"t":2,"gf":13,"ga":19},
 "Dateline Predators":{"gp":11,"w":8,"l":3,"t":0,"gf":41,"ga":25},
 "Zamboner Crew":{"gp":1,"w":0,"l":1,"t":0,"gf":1,"ga":7}
}
EXPECTED_HOLDS={"Mohawks HC":"ALIAS_REVIEW_REQUIRED",
                "Sugo Sundays":"ALIAS_REVIEW_REQUIRED",
                "Other Way":"NO_EXACT_HISTORY"}
def require(ok,why):
 if not ok:raise Hold(why)
def release_aggregate(ledger,standings):
 require(ledger.get("sourceMasterSHA256")=="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154",
         "CANONICAL_WORKBOOK_HASH_NOT_VERIFIED")
 counts=ledger.get("sourceCounts",{})
 require((counts.get("currentSeasonGP"),counts.get("currentSeasonGF"),
          counts.get("currentSeasonGA"),counts.get("latestCompletedGameId"))==(5,12,23,3375682),
         "CURRENT_FIVE_GAME_HTO_SOURCE_NOT_ACCEPTED")
 require(ledger.get("workbookWritten") is False and ledger.get("released") is False and ledger.get("releaseEligible") is False,
         "PUBLIC_LEDGER_RELEASE_SCOPE_INVALID")
 draft=build(ledger,standings)
 require(draft["schema"]=="brave-hc-opponent-intelligence/v1" and
         draft["status"]=="REVIEW_PREVIEW_ONLY" and draft["publishable"] is False,
         "PREVIEW_SOURCE_NOT_QUALIFIED")
 require(draft["coverage"]=={"historicalGameRecords":358,"currentSeasonGames":5,
                             "sourceQualifiedOpponents":4,"aliasesNeedingReview":2,
                             "noExactHistory":1},"SEVEN_OPPONENT_REVIEW_SCOPE_CHANGED")
 entries={t["name"]:t for t in draft["teams"]}
 require(len(entries)==7 and set(entries)==set(EXPECTED)|set(EXPECTED_HOLDS),
         "DIVISION_OPPONENT_SET_DRIFT")
 for name,expected in EXPECTED.items():
  row=entries[name]
  require(row.get("verification")=="VERIFIED_EXACT_NAME" and
          row.get("identityScope")=="EXACT_NAME_ONLY_NO_UNREVIEWED_ALIASES",
          "EXACT_NAME_VERIFICATION_NOT_ACCEPTED_"+name)
  require(row.get("regularSeason")==expected,"SOURCE_AGGREGATE_SCOPE_DRIFT_"+name)
  alltime=row.get("allTime")
  require(alltime and alltime["gp"]>=expected["gp"] and
          alltime["gf"]>=expected["gf"] and alltime["ga"]>=expected["ga"],
          "ALL_TIME_SCOPE_INVALID_"+name)
  require(len(row.get("lastFive",[]))<=5,"RECENT_GAME_LIMIT_EXCEEDED_"+name)
  if name=="Big Bastones":
   require(any(x=={"date":"2026-10-25","result":"W","gf":6,"ga":4}
               for x in row["lastFive"]),"OCT25_WIN_NOT_IN_VERIFIED_HISTORY")
 for name,flag in EXPECTED_HOLDS.items():
  row=entries[name]
  require(row.get("verification")==flag and
          not any(k in row for k in ("regularSeason","allTime","playoffs","lastFive")),
          "UNVERIFIED_OPPONENT_RECORD_LEAK_"+name)
 # Do not display a guessed source-team alias in the public feed.
 for entry in draft["teams"]:
  if entry["verification"]!="VERIFIED_EXACT_NAME":
   entry.pop("possibleSourceName",None)
 draft.update(status="PUBLIC_VERIFIED_EXACT_ONLY",publishable=True,
              releaseScope="EXACT_OPPONENT_NAME_MATCH_ONLY; 4/7 qualified; aliases and no-history withheld",
              generatedAt=datetime.now(timezone.utc).isoformat())
 text=json.dumps(draft,ensure_ascii=False)
 require(not any(x in text for x in ("sourceRows","workbookGame","private/","D:\\\\BruTTech","sensitive","playerContact")),
         "PRIVATE_LEDGER_FIELD_LEAK")
 require(not any(x.get("verification")=="VERIFIED_EXACT_NAME" and
                 x["regularSeason"]["gp"]==0 for x in draft["teams"]),
         "ZERO_GAME_VERIFIED_OPPONENT")
 return draft
def main():
 p=ArgumentParser()
 for key in ("private","standings","output"):p.add_argument("--"+key,required=True)
 args=p.parse_args()
 try:
  doc=release_aggregate(read_json(args.private),read_json(args.standings))
  out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
  temp=out.with_suffix(out.suffix+".tmp")
  temp.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
  os.replace(temp,out)
  print(json.dumps({"status":doc["status"],"scope":doc["coverage"],
                    "nameReviewHeld":["Mohawks HC","Sugo Sundays"],
                    "noExactHistory":["Other Way"],"file":str(out),
                    "workbookWritten":False,"sourceVerified":True}))
  return 0
 except (Hold,KeyError,TypeError,ValueError,OSError) as e:
  print(json.dumps({"status":"RELEASE_HELD","reason":str(e),"workbookWritten":False}),file=sys.stderr)
  return 2
if __name__=="__main__":sys.exit(main())
