"""Independent public-only checks for archived Brave H.C. game-level joins."""
from pathlib import Path
import argparse,json,sys
from build_brave_historical_verified_links import validate as validate_games,HistoricalReleaseHold
from collect_svhl_historical_standings import validate as validate_archive,HistoricalHold
class ReviewHold(ValueError):pass
def need(ok,why):
 if not ok:raise ReviewHold("PUBLIC_HISTORICAL_REVIEW_HOLD:"+why)
def verify(archive,links):
 validate_archive(archive);validate_games(links)
 index={}
 for league in archive["seasons"]:
  for div in league["divisions"]:
   for team in div["teams"]:
    k=(league["leagueId"],div["name"],team["seasonTeamId"],team["name"])
    need(k not in index,"DUPLICATED_ARCHIVE_SEASON_ID")
    index[k]=team
 for item in links["teamSeasons"]:
  k=(item["officialLeagueId"],item["officialDivision"],
     item["officialTeamSeasonId"],item["officialTeamName"])
  need(k in index and
       item["season"]=="W"+next(x["season"].replace("Sunday Winter ","")
       for x in archive["seasons"] if x["leagueId"]==item["officialLeagueId"]),
       "HISTORICAL_TEAM_NAME_OR_DIVISION_NOT_IN_OFFICIAL_ARCHIVE")
  team=index[k]
  need(item["bravesRecord"]["gp"]<=team["gp"],"MASTER_MATCH_COUNT_EXCEEDS_OFFICIAL_GAMES")
  for game in item["games"]:
   start=int(item["season"][1:5])
   year=int(game["date"][:4])
   need(year in (start,start+1) and
     (game["gf"]!=0 or game["ga"]!=0) and
     game["result"]==("W" if game["gf"]>game["ga"] else
                      "L" if game["gf"]<game["ga"] else "T"),
     "OFFICIAL_SEASON_GAME_DATE_OR_SCORE_INCONSISTENT")
 return {"status":"PUBLIC_BRAVE_HISTORICAL_SOURCE_PARITY_PASS",
         "verifiedGameComparisons":links["matchedGameCount"],
         "sourceMatchedSeasonTeamGroups":links["matchedTeamSeasonGroups"],
         "unresolvedHeldComparisons":links["heldGameComparisons"],
         "continuingFranchiseIdentitiesAsserted":0}
def main():
 r=Path(__file__).resolve().parents[1]
 p=argparse.ArgumentParser()
 p.add_argument("--archive",default=str(r/"widgets"/"historical-svhl-standings.json"))
 p.add_argument("--links",default=str(r/"widgets"/"brave-historical-verified-games.json"))
 a=p.parse_args()
 try:
  read=lambda filename:json.loads(Path(filename).read_text(encoding="utf-8-sig"))
  print(json.dumps(verify(read(a.archive),read(a.links))))
  return 0
 except (HistoricalReleaseHold,HistoricalHold,ReviewHold,TypeError,KeyError,OSError,ValueError,StopIteration) as e:
  print(json.dumps({"status":"HOLD","reason":str(e)}),file=sys.stderr)
  return 2
if __name__=="__main__":sys.exit(main())
