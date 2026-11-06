#!/usr/bin/env python3
"""ENG59 frozen website evidence freshness guard.

No network, publisher action or source write. Enforces source-qualified newer
hourly player totals remain separate from the older independently qualified
enriched player feed. Records source timestamps and canonical content hashes,
and, when supplied, matches a PRIVATE static preview manifest byte-for-byte.

A passing result NEVER certifies that the snapshot is live/current on release.
"""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,json
class SnapshotHold(ValueError):pass
def need(ok,why):
 if not ok:raise SnapshotHold("ENG59_FROZEN_HOURLY_SOURCE_HOLD:"+why)
def parsed(t):
 need(isinstance(t,str) and t,"TIMESTAMP_MISSING")
 try:stamp=datetime.fromisoformat(t.replace("Z","+00:00"))
 except ValueError:raise SnapshotHold("ENG59_FROZEN_HOURLY_SOURCE_HOLD:TIMESTAMP_INVALID")
 need(stamp.tzinfo is not None,"TIMESTAMP_WITHOUT_TIMEZONE")
 return stamp.astimezone(timezone.utc)
def canonical(path):
 buf=Path(path).read_bytes()
 return buf.replace(b"\r\n",b"\n")
def sha(data):return hashlib.sha256(data).hexdigest()
def validate(hourly,baseline,league,shaMap,preview=None):
 need(hourly.get("schema")==baseline.get("schema")=="brave-hc-hto-player-actuals/v1" and
  hourly.get("status")==baseline.get("status")=="VERIFIED_HTO_CURRENT" and
  hourly.get("season")==baseline.get("season")=="W2026/27" and
  hourly.get("source")==baseline.get("source") and
  hourly.get("sourceUrl")=="https://www.htosports.com/teams/default.asp?p=stats&s=hockey&u=BRAVESHOCKEY",
  "CURRENT_HTO_FEED_SCOPE_OR_STATUS_CHANGED")
 newer=parsed(hourly["asOf"])
 earlier=parsed(baseline["asOf"])
 need(newer>=earlier,"HOURLY_HTO_SOURCE_OLDER_THAN_ENRICHED_BASELINE")
 for field in ("teamGP","teamGF","teamGA"):
  need(isinstance(hourly.get(field),int) and hourly[field]>=0
   and isinstance(baseline.get(field),int) and baseline[field]>=0,
   "HTO_GAME_TOTALS_MALFORMED")
 need(hourly["teamGP"]>=baseline["teamGP"] and
   hourly["teamGF"]>=baseline["teamGF"] and
   hourly["teamGA"]>=baseline["teamGA"],
   "SOURCE_TOTALS_LOWER_THAN_PREVIOUS_VERIFIED_BASELINE_HUMAN_DISPOSITION_REQUIRED")
 need(league.get("schema")=="brave-hc-league-intelligence/public-v1" and
  league.get("status")=="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" and
  league.get("leagueId")==570 and
  league.get("originalWorkbookWritten") is False,
  "SVHL_LEAGUE_SOURCE_SCOPE_CHANGED")
 league_date=parsed(league.get("asOf"))
 need(all(len(v)==64 for v in shaMap.values()) and len(shaMap)==3,
  "SOURCE_HASH_SET_INCOMPLETE")
 if preview is not None:
  need(preview.get("schema")=="ENG59_SCOPED_WEB_ASSET_PREVIEW_V1" and
   preview.get("canonicalGitBlobBytes") is True and
   preview.get("publicReleaseApproved") is False and
   preview.get("independentPrivacyApproval") is False,
   "PRIVATE_PREVIEW_NOT_SOURCE_QUALIFIED")
  for f,hashval in shaMap.items():
   need(preview.get("files",{}).get("widgets/"+f,{}).get("sha256")==hashval,
    "PREVIEW_SOURCE_FILE_HASH_DRIFT_REBUILD_REQUIRED:"+f)
 return {
  "schema":"ENG59_FROZEN_SOURCE_FRESHNESS_PREVIEW_GATE_V1",
  "status":"SOURCE_TIMESTAMP_AND_SNAPSHOT_HASH_VERIFIED_RELEASE_TIME_REFRESH_REQUIRED",
  "latestVerifiedHTOScoringAsOfUTC":newer.isoformat(),
  "enrichedHTOBaselineAsOfUTC":earlier.isoformat(),
  "svhlLeagueContextAsOfUTC":league_date.isoformat(),
  "hourlySourceNewerThanEnrichedBaseline":newer>=earlier,
  "teamCurrentHTOStats":{"gp":hourly["teamGP"],"gf":hourly["teamGF"],"ga":hourly["teamGA"]},
  "sourceGitBlobSHA256":shaMap,
  "privatePreviewHashesVerified":preview is not None,
  "liveHttpReadPerformed":False,
  "sourcePublicationDateAgeIndependentlyApproved":False,
  "currentAtReleaseVerified":False,
  "requiresLatestSourceRecheckBeforeHumanPromotion":True,
  "independentPrivacyApproval":False,
  "productionDeploymentAuthorized":False,
  "note":"A dated, source-hashed private snapshot is not a live feed. Refresh from accepted main and independently review newest sources at release; do not auto-admit scores or award entries."
 }

def check(repo,preview=None):
 widgets=Path(repo).resolve()/"widgets"
 names=("player-actuals-hourly.json","player-actuals.json","league-intelligence.json")
 need(all((widgets/n).is_file() for n in names),"SOURCE_FEED_FILE_MISSING")
 data=[json.loads((widgets/n).read_text(encoding="utf-8")) for n in names]
 hashes={n:sha(canonical(widgets/n)) for n in names}
 receipt=None if preview is None else json.loads(Path(preview).read_text(encoding="utf-8-sig"))
 return validate(*data,hashes,receipt)

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
 p.add_argument("--private-preview-manifest",type=Path)
 p.add_argument("--receipt",type=Path)
 args=p.parse_args()
 result=check(args.repo,args.private_preview_manifest)
 if args.receipt:
  need(not args.receipt.resolve().is_relative_to(args.repo.resolve()),
       "PRIVATE_RECEIPT_CANNOT_ENTER_PUBLIC_REPO")
  need(not args.receipt.exists(),"PRIVATE_RECEIPT_ALREADY_EXISTS")
  args.receipt.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({k:result[k] for k in (
  "status","latestVerifiedHTOScoringAsOfUTC",
  "enrichedHTOBaselineAsOfUTC","privatePreviewHashesVerified",
  "currentAtReleaseVerified","productionDeploymentAuthorized")}))
if __name__=="__main__":main()
