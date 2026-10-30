"""Exact 460 preserved HTO statistics plus three approved verified additions.
Old 558-row history remains a frozen source; two rental goalie rows unassigned."""
from pathlib import Path
from collections import Counter
import json,re,unittest
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from record_source_date_identity import canonical_record_text
ROOT=Path(__file__).resolve().parents[1]
def load(file):return json.loads((ROOT/file).read_text(encoding="utf-8"))
OLD=load("widgets/history-records-legacy-558.json")
NOW=load("widgets/history-records.json")
BOOK=load("widgets/player-record-book.json")
def club(s):return re.fullmatch(r"\d+\s+(?:Game|Point|Win|Goal|Assist|Shutout)\s+Club",s or "") is not None
def season(s):return "Summer" if s.startswith("Summer") else "Winter" if s.startswith("Winter") else "Career/Other"
def row(g,x):return (g["section"],season(g["category"]),g["period"],canonical_record_text(x))
class RecordsSource(unittest.TestCase):
 def test_immutable_original_source(self):
  self.assertEqual(OLD["entryCount"],558)
  self.assertEqual(sum(len(g["items"]) for g in OLD["groups"]),558)
  self.assertEqual(sum(len(g["items"]) for g in OLD["groups"] if club(g["category"])),98)
  self.assertEqual(sum(len(g["items"]) for g in OLD["groups"] if not club(g["category"])),460)
 def test_exact_original_460_values_plus_3_sourced_new_records(self):
  self.assertEqual(NOW["entryCount"],463)
  self.assertEqual(len(NOW["groups"]),112)
  self.assertFalse(any(club(g["category"]) for g in NOW["groups"]))
  before=Counter(row(g,x) for g in OLD["groups"] if not club(g["category"]) for x in g["items"])
  after=Counter(row(g,x) for g in NOW["groups"] for x in g["items"])
  self.assertEqual(list((before-after).elements()),[])
  extra=list((after-before).elements())
  self.assertEqual(len(extra),3)
  newitems={(s,cat,scope):v for s,cat,scope,v in ((g["section"],g["category"],g["period"],x) for g in NOW["groups"] for x in g["items"]) if cat in ("Summer - Game Tying Goals","All Seasons - Longest Winning Streak","All Seasons - Longest Point Streak")}
  self.assertEqual(len(newitems),3)
  self.assertEqual(newitems[("Individual Records","Summer - Game Tying Goals","Season")].replace("\xa0"," "),"2 - Ben Sherritt (2014)")
  self.assertIn("Jul 10 - Sep 25, 2016",newitems[("Team Records","All Seasons - Longest Winning Streak","Career")])
  self.assertIn("Oct 29, 2017 - Feb 11, 2018",newitems[("Team Records","All Seasons - Longest Point Streak","Career")])
 def test_player_records_source_and_no_false_goalie_identity(self):
  rows=[(pid,p["name"],e) for pid,p in BOOK["players"].items() for e in p["entries"]]
  self.assertEqual(len(BOOK["players"]),109)
  self.assertEqual(len(rows),230)
  self.assertFalse(any(club(e["category"]) for _,_,e in rows))
  source=Counter((g["category"],g["period"],v) for g in NOW["groups"] if g["section"]=="Individual Records" for v in g["items"])
  for pid,name,e in rows:
   self.assertIn(name,e["sourceText"])
   k=(e["category"],e["scope"],e["sourceText"])
   self.assertGreater(source[k],0,k)
   source[k]-=1
  left=[k for k,v in source.items() for _ in range(v) if v>0]
  self.assertEqual(len(left),2)
  self.assertTrue(all("Goali" in k[2] for k in left))
  self.assertEqual(len([e for e in BOOK["players"]["354285"]["entries"] if e["category"]=="Summer - Game Tying Goals"]),1)
 def test_frozen_legacy_milestones_retained(self):
  groups={(g["category"],g["period"]):g["items"] for g in OLD["groups"]}
  self.assertTrue(any("Justin Carosi" in x for x in groups[("300 Game Club","Career")]))
  self.assertTrue(any("Michael Provenzano" in x for x in groups[("50 Point Club","Career")]))
if __name__=="__main__":unittest.main(verbosity=2)
