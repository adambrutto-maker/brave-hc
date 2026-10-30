#!/usr/bin/env python3
"""ENG59 public-source acceptance *preflight*, not independent approval.

Self-contained, read-only, no network. Validates scoped GameInfo league+game IDs,
source-byte hashes, 137 held scoring sheets, 79 historical two-source games,
current 54/19 competitor bridges, and explicit no-stat/video/division promotion.

Never connects to private source-owner material, changes official sources,
merges GitHub PRs or declares a release approved.
"""
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path
from collections import Counter
from urllib.parse import urlparse,parse_qs

class EvidenceGateHold(ValueError):pass
def need(ok, reason):
 if not ok:raise EvidenceGateHold("ENG59_PUBLIC_ACCEPTANCE_HOLD:"+reason)

HEX=re.compile("^[0-9a-f]{64}$")
CHECKED="DEVELOPER_SOURCE_PARITY_VERIFIED_INDEPENDENT_ACCEPTANCE_PENDING"
def git_blob_hash(path):
 return hashlib.sha256(path.read_bytes().replace(b"\r\n",b"\n")).hexdigest()
def read(w,name):
 return json.loads((w/name).read_text(encoding="utf-8"))

def audit(league, historical, holds, current, past, hashes):
 need(league.get("status")=="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED"
   and league.get("leagueId")==570
   and league.get("currentSourceDataConcordant") is True
   and league.get("originalWorkbookWritten") is False,
   "OFFICIAL_CURRENT_LEAGUE_NOT_ACCEPTED")
 need(historical.get("status")=="DUAL_SOURCE_VERIFIED_HISTORICAL_GAMES_SEASON_SCOPED"
   and historical.get("matchedGameCount")==79
   and historical.get("matchedTeamSeasonGroups")==35
   and historical.get("heldGameComparisons")==43
   and historical.get("currentContextNotModified") is True
   and len(historical.get("teamSeasons",[]))==35
   and all(x.get("continuousFranchiseNotVerified") is True
           for x in historical["teamSeasons"]),
   "HISTORICAL_TWO_SOURCE_IDENTITY_OR_EXCLUSIONS_UNQUALIFIED")
 need(holds.get("status")=="SOURCE_HASH_VERIFIED_AUTHOR_AUDIT_NOT_INDEPENDENTLY_ACCEPTED"
   and holds.get("scope")=="SVHL_ONLY_SEPARATE_VAHL_EXCLUDED"
   and holds.get("reviewOnly") is True
   and holds.get("publicStatsOrScoresChanged") is False
   and holds.get("seasonGPOrPIMVerified") is False
   and holds.get("fullScoringGames")==2069
   and holds.get("gamePages")==137
   and holds.get("allCompletedGameSheets")==2206
   and holds.get("gamePageHashesMatched")==137
   and holds.get("categories")=={
      "RAW_GAMEINFO_ROWS_BELOW_PUBLISHED_SCORE":86,
      "RAW_GAMEINFO_ROWS_ABOVE_PUBLISHED_SCORE":12,
      "RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD":39}
   and len(holds.get("games",[]))==137,
   "HELD_SCORER_REVIEW_SOURCE_OR_COUNTS_CHANGED")
 need(current.get("schema")=="brave-hc-svhl-current-official-game-id-bridge/v1"
   and current.get("status")=="OFFICIAL_GAMEINFO_IDENTITY_MATCHED_NO_RATING_OR_STATS_WRITE"
   and current.get("leagueId")==570
   and current.get("officialGames")==54
   and current.get("crossCurrentDivisionGames")==19
   and current.get("fullScoringSheetEvents")==52
   and current.get("heldPlayerScoringGames")==2
   and current.get("allSourceGameKeysOfficiallyMatched") is True
   and current.get("sourceGameIDsStable") is True
   and current.get("leagueRatingsChanged") is False
   and current.get("officialDivisionAssignmentsChanged") is False
   and current.get("videoStrengthCalibrated") is False
   and current.get("independentAcceptedForHistoricalPlayerCorrections") is False
   and len(current.get("games",[]))==54,
   "CURRENT_GAME_IDENTITY_OR_RELEASE_AUTHORITY_CHANGED")
 need(past.get("schema")=="brave-hc-historical-source-matched-gameinfo-ids/v1"
   and past.get("status")==
    "HISTORICAL_EXACT_GAMEINFO_IDS_SOURCE_QUALIFIED_PLAYER_STATS_HELD_SEPARATELY"
   and past.get("matchedHistoricalGames")==79
   and past.get("sourceTeamSeasonOpponentGroups")==35
   and past.get("fullGoalScoringSourceGames")==75
   and past.get("heldScorerEventSourceGames")==4
   and past.get("historicalComparisonsStillHeld")==43
   and past.get("historicalFranchiseContinuityInferred") is False
   and past.get("originalHistoricalH2HModified") is False
   and past.get("officialSourceOrPlayerDataWritten") is False
   and past.get("videoTeamRatingProduced") is False
   and past.get("independentScorerCorrectionsAccepted") is False
   and len(past.get("games",[]))==79,
   "HISTORICAL_GAMEINFO_IDENTITIES_OR_STAT_GATE_CHANGED")
 need(current.get("sourceHashBytePolicy")==past.get("sourceHashBytePolicy")==
      "UTF8_LF_GIT_BLOB","CROSS_PLATFORM_SOURCE_HASH_POLICY_CHANGED")
 expected_current={
  "leagueIntelligenceJSON":hashes["league-intelligence.json"],
  "officialGameInfoSeasonJSON":hashes["svhl-player-game-570.json"]}
 need(current["originalSourceSHA256"]==expected_current,
      "CURRENT_GAMEINFO_INPUT_BYTES_CHANGED_REBUILD_REQUIRED")
 expected_past={
  "historicalMatchedLinks":hashes["brave-historical-verified-games.json"],
  "officialGameInfoSeasons":{
   str(s):hashes[f"svhl-player-game-{s}.json"]
    for s in (494,512,531,547)}}
 need(past["originalSourceSHA256"]==expected_past,
      "HISTORICAL_GAMEINFO_INPUT_BYTES_CHANGED_REBUILD_REQUIRED")
 # Official game-page URI keys, SHA and original published game counts
 keys=set();cross=0
 for row in current["games"]:
  pair=(570,row["officialGameId"])
  need(pair not in keys and
    row["officialGameInfoURL"]==
     f"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid=570&gameid={row['officialGameId']}&page_type=Adult"
    and HEX.fullmatch(row["officialGameInfoPageSHA256"])
    and row["videoPerformanceMeasurements"] is None
    and row["originalOfficialScoreOverwritten"] is False,
    "CURRENT_SOURCE_GAME_URL_SHA_OR_DUPLICATE_INVALID")
  keys.add(pair);cross+=bool(row["crossCurrentDivision"])
 need(len(keys)==54 and cross==19,"CURRENT_CROSS_DIVISION_GAME_SCOPE_DRIFT")
 for row in past["games"]:
  pair=(row["leagueId"],row["gameId"])
  need(pair not in keys and row["leagueId"] in (494,512,531,547)
    and row["sourceGameInfoURL"]==
     f"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid={row['leagueId']}&gameid={row['gameId']}&page_type=Adult"
    and HEX.fullmatch(row["sourceGameInfoSHA256"])
    and row["currentRosterContinuityVerified"] is False
    and row["scoutingIndexModified"] is False
    and row["videoObservationAccepted"] is False
    and row["playerGPVerified"] is False,
    "HISTORICAL_GAME_ID_SOURCE_OR_STAT_ASSUMPTION_INVALID")
  keys.add(pair)
 need(len(keys)==133,"COMBINED_GAME_KEYS_NOT_DISTINCT")
 kinds=Counter()
 held_ids=set()
 for row in holds["games"]:
  pair=(row["leagueId"],row["gameId"])
  need(pair not in held_ids and
    row["officialGameInfoURL"]==
     f"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid={pair[0]}&gameid={pair[1]}&page_type=Adult"
    and HEX.fullmatch(row["officialPageSHA256"])
    and row["acceptedPlayerCorrection"] is False
    and row["status"]=="SOURCE_PROVEN_REVIEW_PENDING",
    "UNACCEPTED_HOLD_SOURCE_OR_ID_CHANGED")
  held_ids.add(pair)
  kinds[row["category"]]+=1
 need(dict(kinds)==holds["categories"],"HELD_SCORER_CATEGORY_DRIFT")
 return {
  "schema":"ENG59_SOURCE_BOUNDARY_CANDIDATE_REVIEW_V1",
  "status":CHECKED,
  "currentVerifiedOfficialIDs":54,
  "currentCrossDivisionGames":19,
  "historicalVerifiedOfficialIDs":79,
  "historicalMatchupsStillHeld":43,
  "originalCompletedGameInfoSheets":2206,
  "originalFullScoringSheets":2069,
  "originalScoringSheetsHeld":137,
  "sourceInputHashes":hashes,
  "historicalFranchiseContinuityApproved":False,
  "videoStrength":"INSUFFICIENT_VIDEO",
  "sourceOwnerCorrectionsApproved":False,
  "independentApproval":False,
  "mergeOrProductionReleaseAuthorized":False
 }

def run(widgets):
 names=["league-intelligence.json","brave-historical-verified-games.json",
  "svhl-gameinfo-hold-review.json","svhl-official-game-id-bridges.json",
  "brave-historical-gameinfo-ids.json",
  "svhl-player-game-570.json",
  *[f"svhl-player-game-{s}.json" for s in (494,512,531,547)]]
 need(all((widgets/n).exists() for n in names),"SOURCE_FILE_MISSING")
 sources={n:read(widgets,n) for n in names}
 hashes={n:git_blob_hash(widgets/n) for n in names}
 return audit(*[sources[n] for n in names[:5]],hashes)

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
 p.add_argument("--report",type=Path)
 opts=p.parse_args()
 result=run((opts.repo/"widgets").resolve())
 if opts.report:
  need(not opts.report.resolve().is_relative_to((opts.repo/"widgets").resolve()),
       "REVIEW_ATTESTATION_CANNOT_BE_PUBLIC_WIDGET")
  opts.report.parent.mkdir(parents=True,exist_ok=True)
  opts.report.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({k:result[k] for k in [
  "status","currentVerifiedOfficialIDs","historicalVerifiedOfficialIDs",
  "originalScoringSheetsHeld","videoStrength","mergeOrProductionReleaseAuthorized"]}))
if __name__=="__main__":main()
