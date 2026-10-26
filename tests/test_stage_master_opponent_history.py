"""Synthetic and optional private-source QA for the read-only opponent importer."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("opponent_stage",root/"scripts"/"stage_master_opponent_history.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
SOURCE=Path(os.environ.get("HOCKEYOS_CANONICAL_MASTER",r"D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx"))
class HistoricalLedgerQA(unittest.TestCase):
 def test_numeric_and_dates(self):
  self.assertEqual(mod.number("5"),5)
  self.assertEqual(mod.serial_date("41399"),"2013-05-05")
  for val in ("-1","n/a","54"):
   with self.assertRaises(mod.SourceHold):mod.number(val)
  with self.assertRaises(mod.SourceHold):mod.serial_date("0")
 def test_invalid_source_held(self):
  with tempfile.TemporaryDirectory() as d:
   inp=Path(d)/"notebook.xlsx";out=Path(d)/"unpublished.json"
   inp.write_bytes(b"not a workbook")
   with self.assertRaises(mod.SourceHold):mod.stage(inp,out)
   self.assertFalse(out.exists())
 @unittest.skipUnless(SOURCE.is_file(),"private authoritative workbook not available on CI")
 def test_real_master_is_read_only_and_bounded(self):
  from hashlib import sha256
  h=sha256(SOURCE.read_bytes()).hexdigest()
  self.assertEqual(h,mod.ORIGINAL_SHA)
  with tempfile.TemporaryDirectory() as d:
   output=Path(d)/"private.json"
   receipt=mod.stage(SOURCE,output)
   payload=json.loads(output.read_text(encoding="utf8"))
   self.assertEqual(receipt["status"],"PRIVATE_HISTORICAL_REVIEW_ONLY")
   self.assertFalse(payload["published"])
   self.assertEqual(payload["counts"]["completedHistorical"],358)
   self.assertEqual(payload["counts"]["unusedFuturePlaceholders"],24)
   self.assertEqual(payload["counts"]["completedCurrentSeasonWorkbook"],0)
   self.assertEqual(payload["counts"]["scoreResultDisagreementRows"],[])
   h2h={x["exactName"]:x for x in payload["opponents"]}
   self.assertEqual(h2h["Mid Ice Crisis"]["regularSeason"],{"gp":5,"w":1,"l":2,"t":2,"gf":13,"ga":19})
   self.assertEqual(h2h["Mid Ice Crisis"]["allTime"],{"gp":7,"w":1,"l":4,"t":2,"gf":15,"ga":25})
   self.assertEqual(h2h["Big Bastones"]["regularSeason"],{"gp":6,"w":3,"l":2,"t":1,"gf":18,"ga":23})
   self.assertEqual(sha256(SOURCE.read_bytes()).hexdigest(),h)
if __name__=="__main__":unittest.main()
