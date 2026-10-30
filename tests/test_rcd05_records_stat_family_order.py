"""Summer GTG and all-seasons Team streaks, exact native HTO order/source."""
from pathlib import Path
from collections import Counter
import json,re,unittest
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from record_source_date_identity import canonical_record_text
ROOT=Path(__file__).resolve().parents[1]
def load(s):return json.loads((ROOT/s).read_text(encoding="utf-8"))
SPEC=load("docs/261028_RCD05_Records_Stat_Family_Order_Spec.json")
ACTIVE=load("widgets/history-records.json")
OLD=load("widgets/history-records-legacy-558.json")
BOOK=load("widgets/player-record-book.json")
def names(side):
 out=[]
 for x in ACTIVE["groups"]:
  if x["section"]==side and x["category"] not in out:out.append(x["category"])
 return out
def key(g,v):
 category=g["category"]
 season="Summer" if category.startswith("Summer") else "Winter" if category.startswith("Winter") else "Career/Other"
 return g["section"],season,g["period"],canonical_record_text(v)
class FamilyOrder(unittest.TestCase):
 def test_native_order_and_scoring_families(self):
  self.assertEqual(names("Individual Records"),SPEC["individual_order"])
  self.assertEqual(names("Team Records"),SPEC["team_order"])
  self.assertEqual(len(SPEC["individual_order"]),32)
  self.assertEqual(len(SPEC["team_order"]),28)
  for season in ("Summer","Winter"):
   n=SPEC["individual_order"]
   idx=lambda t:n.index(season+" - "+t)
   self.assertEqual(idx("Games with 2+ Goals"),idx("Goals")+1)
   self.assertEqual(idx("Hat Tricks"),idx("Goals")+2)
   self.assertEqual(idx("Games with 3+ Assists"),idx("Assists")+1)
   self.assertEqual(idx("Games with 3+ Points"),idx("Points")+1)
   self.assertEqual(idx("Shutouts"),idx("Wins")+1)
  x=SPEC["individual_order"]
  self.assertEqual(x.index("Summer - Game Tying Goals"),x.index("Summer - Game Winning Goals")+1)
  self.assertEqual(SPEC["team_order"][:2],["All Seasons - Longest Winning Streak","All Seasons - Longest Point Streak"])
  self.assertFalse(any("2+ Assists" in x for x in SPEC["individual_order"]))
 def test_preserve_original_460_plus_3_verified(self):
  self.assertEqual(OLD["entryCount"],558)
  self.assertEqual(ACTIVE["entryCount"],463)
  self.assertEqual(len(ACTIVE["groups"]),112)
  old=Counter(key(g,x) for g in OLD["groups"] if not re.fullmatch(r"\d+ (Game|Point|Win|Goal|Assist|Shutout) Club",g["category"]) for x in g["items"])
  new=Counter(key(g,x) for g in ACTIVE["groups"] for x in g["items"])
  self.assertEqual(list((old-new).elements()),[])
  self.assertEqual(sum((new-old).values()),3)
  self.assertEqual(sum(len(g["items"]) for g in ACTIVE["groups"] if g["section"]=="Individual Records"),232)
  self.assertEqual(sum(len(g["items"]) for g in ACTIVE["groups"] if g["section"]=="Team Records"),231)
  self.assertEqual(sum(len(p["entries"]) for p in BOOK["players"].values()),230)
  self.assertFalse(any(" Club" in g["category"] for g in ACTIVE["groups"]))
 def test_unchanged_historical_club_evidence(self):
  clubs=[g for g in OLD["groups"] if re.fullmatch(r"\d+ (Game|Point|Win) Club",g["category"])]
  self.assertEqual(sum(len(g["items"]) for g in clubs),98)
if __name__=="__main__":unittest.main(verbosity=2)
