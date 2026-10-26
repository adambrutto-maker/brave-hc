"""HTO current skater actuals feed integrity, source provenance and no-model-write tests."""
from copy import deepcopy
from datetime import datetime,timezone,timedelta
from pathlib import Path
import importlib.util,json,os,unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("actuals",ROOT/"scripts"/"export_hto_verified_player_actuals.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
READBACK=Path(os.environ.get("HOCKEYOS_HTO_LATEST_READBACK",r"D:\BruTTech\Products\HockeyOS\261016_HTO_Widget_Phase0\261016_HTO_SVHL_Latest_Readback.json"))
def fixture():
    return json.loads(READBACK.read_text(encoding="utf8"))
class SkaterActualsQA(unittest.TestCase):
 @unittest.skipUnless(READBACK.exists(),"Live private HTO snapshot not available in CI")
 def test_official_current_total_is_five_games(self):
    feed=mod.parse(fixture())
    self.assertEqual((feed["teamGP"],feed["teamGF"],feed["teamGA"]),(5,12,23))
    self.assertEqual(feed["playerCount"],20)
    self.assertEqual((feed["teamGoals"],feed["teamAssists"],feed["teamPlayerPoints"]),(12,19,31))
    players={p["name"]:p for p in feed["players"]}
    self.assertEqual(players["Carosi, Justin"],{"name":"Carosi, Justin","gp":5,"g":4,"a":1,"pts":5})
    self.assertEqual(players["Provenzano, Michael"]["pts"],5)
 @unittest.skipUnless(READBACK.exists(),"Live private HTO snapshot not available in CI")
 def test_stale_readback_blocked(self):
    data=fixture();data["date"]=(datetime.now(timezone.utc)-timedelta(days=7)).isoformat()
    with self.assertRaisesRegex(mod.Hold,"STALE"):mod.parse(data)
 @unittest.skipUnless(READBACK.exists(),"Live private HTO snapshot not available in CI")
 def test_duplicate_name_blocked(self):
    data=fixture()
    stats=next(p for p in data["pages"] if p["name"]=="hto_stats")
    table=next(t for t in stats["tables"] if t["rows"] and t["rows"][0][:2]==["No","Name"])
    table["rows"][2][1]=table["rows"][1][1]
    with self.assertRaisesRegex(mod.Hold,"DUPLICATE"):mod.parse(data)
 @unittest.skipUnless(READBACK.exists(),"Live private HTO snapshot not available in CI")
 def test_scorecard_conflict_blocked(self):
    data=fixture();page=next(p for p in data["pages"] if p["name"]=="hto_scores")
    board=next(t for t in page["tables"] if t["rows"] and t["rows"][0][0]=="REGULAR SEASON")
    board["rows"][2][-1]="999"
    with self.assertRaisesRegex(mod.Hold,"SCORECARD_VS_STATS"):mod.parse(data)
 @unittest.skipUnless(READBACK.exists(),"Live private HTO snapshot not available in CI")
 def test_points_conflict_blocked(self):
    data=fixture()
    stats=next(p for p in data["pages"] if p["name"]=="hto_stats")
    table=next(t for t in stats["tables"] if t["rows"] and t["rows"][0][:2]==["No","Name"])
    table["rows"][1][7]="99"
    with self.assertRaisesRegex(mod.Hold,"POINTS_MISMATCH"):mod.parse(data)
 def test_bad_schema_blocked_offline(self):
    with self.assertRaises(mod.Hold):mod.parse({"readOnly":True,"date":datetime.now(timezone.utc).isoformat(),"pages":[]})
if __name__=="__main__":unittest.main(verbosity=2)
