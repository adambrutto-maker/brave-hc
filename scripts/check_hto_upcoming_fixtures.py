"""Independent public-only HTO upcoming-fixture source/identity checks."""
from __future__ import annotations
from pathlib import Path
import argparse,json,sys
from collect_hto_upcoming_fixtures import validate,ScheduleHold
from check_svhl_league_intelligence import verify as verify_league
def main():
 a=argparse.ArgumentParser()
 root=Path(__file__).resolve().parents[1]
 a.add_argument("--fixtures",default=str(root/"widgets"/"upcoming-matchups.json"))
 a.add_argument("--league",default=str(root/"widgets"/"league-intelligence.json"))
 args=a.parse_args()
 try:
  fixtures=json.loads(Path(args.fixtures).read_text(encoding="utf-8-sig"))
  league=json.loads(Path(args.league).read_text(encoding="utf-8-sig"))
  verify_league(league)
  validate(fixtures,league)
  print(json.dumps({"state":"PUBLIC_HTO_UPCOMING_FIXTURES_PASS","games":fixtures["gamesCount"],
    "matched":fixtures["matchedCurrentLeagueCount"],"sourcePages":len(fixtures["sourcePages"])}))
  return 0
 except (ScheduleHold,ValueError,TypeError,KeyError,OSError) as err:
  print(json.dumps({"state":"HOLD","reason":str(err)}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
