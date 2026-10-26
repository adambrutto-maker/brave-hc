"""Canonical Brave H.C./HTO opponent naming parity, negative mutation QA."""
from __future__ import annotations
from copy import deepcopy
from pathlib import Path
import importlib.util,json,unittest,os

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("canonical",ROOT/"scripts"/"build_canonical_opponent_feed.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
PRIVATE=Path(os.environ.get("HOCKEYOS_PRIVATE_INTELLIGENCE",r"D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence"))
EVIDENCE=Path(os.environ.get("HOCKEYOS_PRIVATE_HTO_EVIDENCE",r"D:\BruTTech\Products\HockeyOS\261016_HTO_Widget_Phase0"))
BOOK=Path(os.environ.get("HOCKEYOS_CANONICAL_MASTER",r"D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx"))
INPUTS=[PRIVATE/"261026_Master_Complete_Game_History_PRIVATE_STAGE.json",
        PRIVATE/"HTO_Completed_Scores_PRIVATE_LATEST.json",
        EVIDENCE/"261016_HTO_SVHL_Latest_Readback.json",
        EVIDENCE/"261017_HTO_Verified_GameLevel_Skater_Attendance.json",
        ROOT/"widgets"/"standings.json",ROOT/"widgets"/"current-opponent-identity-bridges.json"]
AVAILABLE=BOOK.exists() and all(x.exists() for x in INPUTS)
def data():return [json.loads(p.read_text(encoding="utf-8-sig")) for p in INPUTS]
class CanonicalQA(unittest.TestCase):
 @unittest.skipUnless(AVAILABLE,"private workbook and current HTO admission inputs unavailable in CI")
 def test_original_editorial_supports_mohawks_name(self):
  ref=m.workbook_editorial_verified(BOOK)
  self.assertEqual(ref["cell"],"J317")
  self.assertEqual(ref["historicalHTOStyleName"],"Mohawks H.C.")
 @unittest.skipUnless(AVAILABLE,"private authoritative source unavailable")
 def test_merged_mohawks_and_only_current_sugo(self):
  out=m.build(*data(),BOOK)
  self.assertEqual(out["status"],"PUBLIC_VERIFIED_SOURCE_IDENTITY")
  self.assertEqual(out["sourceTeamCanonical"],"Brave H.C.")
  self.assertEqual(out["sourceLeagueTeamAlias"],"Braves HC")
  d={x["name"]:x for x in out["teams"]}
  moh=d["Mohawks HC"];sugo=d["Sugo Sundays"]
  self.assertEqual(moh["canonicalName"],"Mohawks H.C.")
  self.assertEqual(moh["verification"],"VERIFIED_HISTORICAL_NAME_VARIANT")
  self.assertEqual(moh["regularSeason"],{"gp":43,"w":16,"l":19,"t":8,"gf":164,"ga":161})
  self.assertEqual(moh["allTime"],{"gp":50,"w":19,"l":20,"t":11,"gf":193,"ga":176})
  self.assertEqual(moh["playoffs"],{"gp":7,"w":3,"l":1,"t":3,"gf":29,"ga":15})
  self.assertEqual(sugo["canonicalName"],"Michelob Morts")
  self.assertEqual(sugo["verification"],"VERIFIED_CURRENT_NAME_ALIAS_ONLY")
  self.assertEqual(sugo["regularSeason"],{"gp":1,"w":0,"l":1,"t":0,"gf":2,"ga":3})
  self.assertTrue(sugo["historicalRecordsAreLimited"])
  self.assertEqual(d["Other Way"]["verification"],"NO_EXACT_HISTORY")
  self.assertEqual(out["coverage"]["canonicalHistoricalLinks"],1)
  self.assertEqual(out["coverage"]["verifiedCurrentGameAliases"],1)
  self.assertEqual(out["coverage"]["currentSeasonGames"],5)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_wrong_official_game_score_holds(self):
  inputs=data();inputs[1]["games"][1]["gf"]+=1
  with self.assertRaises((m.Hold,m.SourceHold)):m.build(*inputs,BOOK)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_source_proof_can_not_force_franchise_history_merge(self):
  inp=data();inp[5]["franchiseHistoryMerged"]=True
  with self.assertRaisesRegex(m.Hold,"PROOF_NOT_CERTIFIED"):m.build(*inp,BOOK)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_mohawks_source_name_mismatch_holds(self):
  inp=data();proof=next(g for g in inp[5]["sameGamePairs"] if g["divisionName"]=="Mohawks HC")
  proof["htoRecordedOpponent"]="Another Franchise"
  with self.assertRaisesRegex(m.Hold,"HTO_SVHL_SAME_GAME_EVIDENCE_CHANGED"):m.build(*inp,BOOK)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_old_workbook_history_cannot_be_double_counted(self):
  inp=data();g=deepcopy(next(x for x in inp[0]["games"] if x["opponentExact"]=="Mohawks HC"))
  g["workbookGame"]+=9999
  inp[0]["games"].append(g);inp[0]["counts"]["completedHistorical"]+=1
  with self.assertRaisesRegex(m.SourceHold,"MASTER_HISTORICAL_BASELINE_CHANGED"):m.build(*inp,BOOK)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_new_unproved_htogame_under_alias_stops_public_merge(self):
  inp=data()
  fake=deepcopy(next(g for g in inp[1]["games"] if g["htoGameId"]==3356178))
  fake.update(htoGameId=9900010,date="2026-10-26",gf=1,ga=1,result="T")
  inp[1]["games"].insert(0,fake)
  inp[1]["sourceGamesCount"]+=1
  with self.assertRaises((m.Hold,m.SourceHold)):m.build(*inp,BOOK)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_published_json_matches_independent_source_calculation(self):
  out=m.build(*data(),BOOK)
  published=json.loads((ROOT/"widgets"/"opponent-intelligence.json").read_text(encoding="utf8"))
  self.assertEqual(published["status"],out["status"])
  self.assertEqual(published["teams"],out["teams"])
  self.assertEqual(published["coverage"],out["coverage"])
 def test_new_source_without_private_workbook_is_not_auto_approved(self):
  with self.assertRaises(m.Hold):m.workbook_editorial_verified(ROOT/"README.md")
 @unittest.skipUnless(AVAILABLE,"private accepted workbook source unavailable")
 def test_synthetic_later_hto_mohawks_name_extends_historical_record_once(self):
  inputs=data();past,current=m.source_records(inputs[0],inputs[1])
  proof=next(x for x in inputs[5]["sameGamePairs"] if x["divisionName"]=="Mohawks HC")
  future={"key":"HTO:9900011","date":"2026-11-08","type":"Regular Season",
          "result":"W","bravesGF":2,"bravesGA":1,"name":"Mohawks H.C.","source":"HTO"}
  merged=m.merge_opponent(m.AUDITED["Mohawks HC"],past,current+[future],proof)
  self.assertEqual(merged["sourceHTOGames"],2)
  self.assertEqual(merged["allTime"],{"gp":51,"w":20,"l":20,"t":11,"gf":195,"ga":177})
  self.assertEqual(merged["playoffs"],{"gp":7,"w":3,"l":1,"t":3,"gf":29,"ga":15})
 @unittest.skipUnless(AVAILABLE,"private accepted workbook source unavailable")
 def test_synthetic_additional_michelob_hto_game_stays_current_only(self):
  inputs=data();past,current=m.source_records(inputs[0],inputs[1])
  proof=next(x for x in inputs[5]["sameGamePairs"] if x["divisionName"]=="Sugo Sundays")
  future={"key":"HTO:9900012","date":"2026-11-15","type":"Regular Season",
          "result":"W","bravesGF":5,"bravesGA":2,"name":"Michelob Morts","source":"HTO"}
  merged=m.merge_opponent(m.AUDITED["Sugo Sundays"],past,current+[future],proof)
  self.assertEqual(merged["sourceHTOGames"],2)
  self.assertEqual(merged["allTime"],{"gp":2,"w":1,"l":1,"t":0,"gf":7,"ga":5})
  self.assertTrue(merged["historicalRecordsAreLimited"])
  self.assertIn("2 source-verified current-season HTO games",merged["notice"])
 @unittest.skipUnless(AVAILABLE,"private accepted workbook source unavailable")
 def test_unverified_new_hto_alias_spelling_must_hold(self):
  inputs=data();past,current=m.source_records(inputs[0],inputs[1])
  proof=next(x for x in inputs[5]["sameGamePairs"] if x["divisionName"]=="Sugo Sundays")
  divergent={"key":"HTO:9900013","date":"2026-11-15","type":"Regular Season",
             "result":"W","bravesGF":3,"bravesGA":1,"name":"Sugo Sundays","source":"HTO"}
  with self.assertRaisesRegex(m.Hold,"NEW_HTO_OPPONENT_NAME_CHANGE_NEEDS_SOURCE_REVIEW"):
   m.merge_opponent(m.AUDITED["Sugo Sundays"],past,current+[divergent],proof)
 @unittest.skipUnless(AVAILABLE,"private accepted workbook source unavailable")
 def test_duplicate_official_hto_game_id_never_double_counts(self):
  inputs=data();past,current=m.source_records(inputs[0],inputs[1])
  proof=next(x for x in inputs[5]["sameGamePairs"] if x["divisionName"]=="Mohawks HC")
  original=next(x for x in current if x["name"]=="Mohawks H.C.")
  with self.assertRaisesRegex(m.Hold,"HTO_CANONICAL_NAME_SOURCE_SCOPE_CHANGED"):
   m.merge_opponent(m.AUDITED["Mohawks HC"],past,current+[deepcopy(original)],proof)
 @unittest.skipUnless(AVAILABLE,"private accepted workbook source unavailable")
 def test_older_hto_game_not_in_original_2026_provenance_is_held(self):
  inputs=data();past,current=m.source_records(inputs[0],inputs[1])
  proof=next(x for x in inputs[5]["sameGamePairs"] if x["divisionName"]=="Mohawks HC")
  prior={"key":"HTO:9900014","date":"2024-05-01","type":"Regular Season",
         "result":"W","bravesGF":2,"bravesGA":1,"name":"Mohawks H.C.","source":"HTO"}
  with self.assertRaisesRegex(m.Hold,"HTO_CANONICAL_NAME_SOURCE_SCOPE_CHANGED"):
   m.merge_opponent(m.AUDITED["Mohawks HC"],past,current+[prior],proof)
if __name__=="__main__":unittest.main(verbosity=2)
