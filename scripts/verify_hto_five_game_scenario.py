"""Independent source/parity gate for publishing an HTO-fed HockeyOS SCENARIO.

This does not claim Master Workbook recalc or authorize full-current forecast.
Exact workbook trend limits are derived from the original workbook-based sigma
with no invented new numerical thresholds. Source current actuals must reconcile.
"""
from __future__ import annotations
import json,math,hashlib
from datetime import datetime,timezone,timedelta
from pathlib import Path
from collections import Counter
import argparse,sys
ORIGINAL_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
class ModelHold(ValueError):pass
def require(test,message):
 if not test:raise ModelHold(message)
def load(f):return json.loads(Path(f).read_text(encoding="utf-8-sig"))
def validate(model,actual,verified,book,now=None):
 now=now or datetime.now(timezone.utc)
 require(hashlib.sha256(Path(book).read_bytes()).hexdigest()==ORIGINAL_SHA,"ORIGINAL_WORKBOOK_HASH_DRIFT")
 require(model.get("schema")=="brave-hc-workbook-projection/v1" and model.get("modelDriver")=="HTO_PUBLISHED_TEAM_STATISTICS","UNSUPPORTED_FORECAST_MODEL")
 require(model.get("workbookSourceHash")==ORIGINAL_SHA,"PROJECTED_SOURCE_HASH_DRIFT")
 require(model.get("modelParity",{}).get("replayedRows")==21 and model["modelParity"].get("mismatches")==0,"WORKBOOK_FORMULA_21_ROW_PARITY_FAILED")
 require(model.get("modelCurrent") is False and model.get("publicationStatus")=="HTO_MODEL_RECONCILIATION_PENDING" and model.get("projectionComplete") is False,"SCENARIO_MUST_NOT_CLAIM_FULL_RECONCILIATION")
 require(verified.get("schema")=="brave-hc-hto-verified-game-feed/v1" and verified.get("teamGP")==5 and verified.get("allGamesDiscovered") is True,"VERIFIED_5_GAME_FEED_NOT_READY")
 require(verified.get("sourceValidationState")=="PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS" and verified.get("playerAggregateParity") is True,"FEED_SOURCE_PARITY_NOT_ACCEPTED")
 require({g["htoGameId"] for g in verified["games"]}=={3356177,3356178,3369564,3375601,3375682},"COMPLETED_GAME_SET_MISMATCH")
 require((verified["teamG"],verified["teamA"])==(12,19),"HTO_FIVE_GAME_GOAL_ASSIST_PARITY")
 stats=model.get("sourceInputs",{})
 require((stats.get("htoRecordedTeamGP"),stats.get("verifiedHTOBoxscoreGP"),stats.get("htoTeamGoals"),stats.get("htoTeamAssists"))==(5,5,12,19),"MODEL_HTO_SOURCE_INPUTS_NOT_FIVE_GAME_CURRENT")
 require(actual.get("schema")=="brave-hc-hto-player-actuals/v1" and actual.get("status")=="VERIFIED_HTO_CURRENT","LIVE_HTO_ACTUALS_NOT_VERIFIED")
 require((actual.get("teamGP"),actual.get("teamGF"),actual.get("teamGA"),actual.get("teamGoals"),actual.get("teamAssists"),actual.get("teamPlayerPoints"))==(5,12,23,12,19,31),"SOURCE_ACTUALS_NOT_MATCHING")
 try:
  ts=datetime.fromisoformat(model["htoreadback"].replace("Z","+00:00"))
  ats=datetime.fromisoformat(actual["asOf"].replace("Z","+00:00"))
 except (KeyError,ValueError,TypeError) as exc:raise ModelHold("MODEL_TIMESTAMP_MISSING") from exc
 require(ts.tzinfo is not None and ats.tzinfo is not None and timedelta(0)<=now-ts<=timedelta(hours=12) and timedelta(0)<=now-ats<=timedelta(hours=12),"SOURCE_DATA_TOO_STALE")
 actualPlayers={r["name"]:r for r in actual["players"]}
 rows=model.get("players",[])
 require(len(rows)==22 and len({r["name"] for r in rows})==22,"MODEL_22_PLAYER_IDENTITY_DRIFT")
 require(not model.get("unclassifiedHTOPlayers"),"UNCLASSIFIED_CURRENT_HTO_PLAYER")
 require(set(model.get("workbookPlayersAbsentFromHTO",[]))=={"Mazzei, Stefano","Congiusti, Marco"},"UNRESOLVED_PLAYER_ROSTER_SCOPE_CHANGED")
 require(len(model.get("unmodelledHTOPlayers",[]))==1 and model["unmodelledHTOPlayers"][0].get("name")=="Pavaday, Damian" and model["unmodelledHTOPlayers"][0].get("classification")=="DI","DROPIN_CLASSIFICATION_OR_SOURCE_SCOPE_CHANGED")
 observed={p["name"] for p in rows if p["name"] in actualPlayers}
 require(observed==set(actualPlayers),"HTO_ACTUAL_PLAYER_NOT_IN_FORECAST_ROSTER")
 for row in rows:
  require(row.get("rosterStatus") in ("FT","CU","DI"),"UNKNOWN_ROSTER_STATUS")
  for k in ("gp","g","a","pts","ptsPerGame","trend"):
   require(type(row.get(k)) in (float,int) and math.isfinite(row[k]),"NON_NUMERIC_FORECAST_"+k)
  require(row["g"]>=0 and row["a"]>=0 and row["pts"]==row["g"]+row["a"],"PROJECTED_POINTS_MISMATCH")
  if row["name"] in actualPlayers:
   src=actualPlayers[row["name"]]
   require((row.get("currentGP"),row.get("currentG"),row.get("currentA"))==(src["gp"],src["g"],src["a"]),"HTO_ACTUALS_IN_FORECAST_NOT_EQUAL_SOURCE_"+row["name"])
 total=model.get("total",{})
 require((sum(p["g"] for p in rows),sum(p["a"] for p in rows),sum(p["pts"] for p in rows))==(total.get("goals"),total.get("assists"),total.get("points")),"TOTAL_MODEL_SCORING_ARITHMETIC")
 fmt=model.get("conditionalFormatting",{})
 arrows=fmt.get("arrowIconSet",{})
 th=arrows.get("thresholds",{})
 sigma=fmt.get("sampleStandardDeviation")
 require(fmt.get("schema")=="brave-hc-workbook-cf/v1" and arrows.get("type")=="5Arrows" and type(sigma) in (float,int) and sigma>0,"WORKBOOK_CF_OR_SIGMA_INVALID")
 require(fmt.get("samples")==len(rows),"WORKBOOK_TREND_SAMPLE_COUNT_CHANGED")
 for key,val in (("AB100",-2*sigma),("AB99",-sigma),("AB97",0.5*sigma),("AB96",sigma)):
  require(type(th.get(key)) in (int,float) and math.isclose(th[key],val,rel_tol=1e-9,abs_tol=1e-12),"WORKBOOK_CAREER_TREND_THRESHOLD_DRIFT_"+key)
 require(arrows.get("thresholdSources")=={"AB100":"-2 * STDEV(X6:X93)","AB99":"-1 * STDEV(X6:X93)","AB97":"0.5 * STDEV(X6:X93)","AB96":"1 * STDEV(X6:X93)"},"FORMULA_THRESHOLD_SOURCE_CHANGED")
 require(model.get("diProjectionPolicy",{}).get("rule")=="HTO_CONFIRMED_APPEARANCES_ONLY" and model["diProjectionPolicy"].get("futureGamesAssumed")==0,"DROPIN_UNVERIFIED_FUTURE_OPPORTUNITIES")
 return {"state":"HTO_FIVE_GAME_PROVISIONAL_FORECAST_SOURCE_ACCEPTED",
         "sourceGP":5,"players":len(rows),"currentHTOPlayers":len(actualPlayers),
         "workbookParity":{"replayedRows":21,"mismatches":0},
         "totalProjectedPoints":total["points"],
         "publishedAsCurrent":False,"scenarioStatus":model["publicationStatus"],
         "sourceWorkbookUnchanged":True,"trendRules":"EXACT_WORKBOOK_STDEV_FIVE_ARROWS",
         "unclassified":model["unclassifiedHTOPlayers"],
         "unmatchedWorkbookPlayers":model["workbookPlayersAbsentFromHTO"]}
def main():
 ap=argparse.ArgumentParser()
 for x in ("model","actuals","verified","workbook"):ap.add_argument("--"+x,required=True)
 args=ap.parse_args()
 try:print(json.dumps(validate(load(args.model),load(args.actuals),load(args.verified),args.workbook)));return 0
 except (ModelHold,ValueError,KeyError,TypeError,OSError) as e:
  print(json.dumps({"state":"FORECAST_SCENARIO_HELD","reason":str(e),"published":False}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
