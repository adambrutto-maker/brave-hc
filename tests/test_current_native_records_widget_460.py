"""Release protection for native HTO Records-only 460-row widget port.
Historical 558 Records milestone archive remains separate for dated Watch.
Only concise heading aliases may differ; preserve each individual stat, season,
scope, exact player ID and original source entry. Offline deterministic.
"""
from pathlib import Path
from collections import Counter,defaultdict
import json,re,unittest,hashlib
ROOT=Path(__file__).resolve().parents[1]
def load(file):return json.loads((ROOT/file).read_text(encoding='utf-8'))
OLD=load('widgets/history-records-legacy-558.json')
NOW=load('widgets/history-records.json')
BOOK=load('widgets/player-record-book.json')
def club(s):return re.fullmatch(r"\d+\s+(Game|Point|Win|Goal|Assist|Shutout)\s+Club",s or '') is not None
def season(s):
 return "Summer" if s.startswith("Summer") else "Winter" if s.startswith("Winter") else "Career/Other"
def key(g,v):return (g["section"],season(g["category"]),g["period"],v)
class OfficialRecordsPort(unittest.TestCase):
 def test_immutable_original_558_and_98_milestones(self):
  self.assertEqual(OLD['entryCount'],558)
  self.assertEqual(sum(len(x['items']) for x in OLD['groups']),558)
  self.assertEqual(sum(len(x['items']) for x in OLD['groups'] if club(x['category'])),98)
  self.assertEqual(sum(len(x['items']) for x in OLD['groups'] if not club(x['category'])),460)
  self.assertEqual(len(OLD['groups']),119)
 def test_460_live_statistical_entries_exact_original_source(self):
  self.assertEqual(NOW['entryCount'],460)
  self.assertEqual(sum(len(x['items']) for x in NOW['groups']),460)
  self.assertEqual(len(NOW['groups']),109)
  self.assertFalse(any(club(g['category']) for g in NOW['groups']))
  before=Counter(key(g,item) for g in OLD['groups'] if not club(g['category']) for item in g['items'])
  after=Counter(key(g,item) for g in NOW['groups'] for item in g['items'])
  self.assertEqual(after,before)
 def test_player_book_maps_229_statistical_rows_no_duplicates(self):
  rows=[(pid,p['name'],e) for pid,p in BOOK['players'].items() for e in p['entries']]
  self.assertEqual(len(rows),229)
  self.assertEqual(len(BOOK['players']),109)
  self.assertFalse(any(club(e["category"]) for _,_,e in rows))
  source=Counter((g["category"],g["period"],item) for g in NOW["groups"] if g['section']=="Individual Records" for item in g["items"])
  for pid,name,e in rows:
   self.assertEqual(e["sourceText"].split(" - ",1)[-1].find(name)>=0,True)
   key=(e["category"],e["scope"],e["sourceText"])
   self.assertGreater(source[key],0,(pid,name,key))
   source[key]-=1
  remaining=[item for row,n in source.items() for item in [row]*n if n>0]
  self.assertEqual(len(remaining),2)
  self.assertTrue(all("Goali" in x[2] and x[2].endswith("(2016)") for x in remaining))
 def test_source_names_unattributed_no_fabricated_ids(self):
  manifest=load('docs/261028_Records_Widget_460_Release_Manifest.json')
  self.assertEqual(manifest['status'],'READY_FOR_RELEASE')
  self.assertEqual(manifest["ported_player_entries"],229)
  self.assertEqual(manifest["milestone_club_rows_moved_to_awards"],98)
  self.assertEqual(len(manifest["unattributed_public_individual_rows"]),2)
  self.assertEqual(manifest["mapping_holds"],[])
  self.assertFalse(any("Goali" in e["sourceText"] for p in BOOK["players"].values() for e in p["entries"]))
 def test_original_award_source_still_in_immutable_archive(self):
  groups={(g["category"],g["period"]):g["items"] for g in OLD["groups"]}
  self.assertTrue(any("Justin Carosi" in x for x in groups[("300 Game Club","Career")]))
  self.assertTrue(any("Michael Provenzano" in x for x in groups[("50 Point Club","Career")]))
if __name__=='__main__':unittest.main(verbosity=2)
