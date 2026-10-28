"""Stat-family ordering regression for the user-approved HTO Records widget.
Exact original 460 per-category stat entries, source scope and two goalie
identity holds are retained; historical milestone source stays separate."""
import collections,json,pathlib,re,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
def read(name):return json.loads((ROOT/name).read_text(encoding="utf-8"))
SPEC=read("docs/261028_RCD05_Records_Stat_Family_Order_Spec.json")
ACTIVE=read("widgets/history-records.json")
ORIGINAL=read("widgets/history-records-legacy-558.json")
BOOK=read("widgets/player-record-book.json")
def order(groups,side):
 out=[]
 for g in groups:
  if g["section"]==side and g["category"] not in out:out.append(g["category"])
 return out
def key(g,s):
 season=g["category"].split(" - ",1)[0]
 return(g["section"],season,g["period"],s)
class RecordsFamilyOrder(unittest.TestCase):
 def test_grouped_categories_in_explicit_user_sequence(self):
  self.assertEqual(order(ACTIVE["groups"],"Individual Records"),SPEC["individual_order"])
  self.assertEqual(order(ACTIVE["groups"],"Team Records"),SPEC["team_order"])
  self.assertEqual(len(SPEC["individual_order"]),31)
  self.assertEqual(len(SPEC["team_order"]),26)
  for which in ("individual_order","team_order"):
   names=SPEC[which]
   self.assertEqual(len(names),len(set(names)))
   self.assertEqual(names[:sum(x.startswith("Summer -") for x in names)],list(filter(lambda x:x.startswith("Summer -"),names)))
  for season in ("Summer","Winter"):
   names=SPEC["individual_order"]
   def idx(part):return names.index(season+" - "+part)
   self.assertEqual(idx("Games with 2+ Goals"),idx("Goals")+1)
   self.assertEqual(idx("Hat Tricks"),idx("Goals")+2)
   self.assertEqual(idx("Games with 3+ Assists"),idx("Assists")+1)
   self.assertEqual(idx("Games with 3+ Points"),idx("Points")+1)
   self.assertEqual(idx("Shutouts"),idx("Wins")+1)
   self.assertEqual(idx("Goals Against Average"),idx("Wins")+2)
 def test_values_scope_and_legacy_evidence_are_intact(self):
  assert ORIGINAL["entryCount"]==558 and ACTIVE["entryCount"]==460
  assert len(ACTIVE["groups"])==109 and len(ORIGINAL["groups"])==119
  old=collections.Counter(key(g,e) for g in ORIGINAL["groups"] if not re.fullmatch(r"\d+ (Game|Point|Win|Goal|Assist|Shutout) Club",g["category"]) for e in g["items"])
  now=collections.Counter(key(g,e) for g in ACTIVE["groups"] for e in g["items"])
  self.assertEqual(old,now)
  self.assertEqual(sum(len(g["items"]) for g in ACTIVE["groups"] if g["section"]=="Individual Records"),231)
  self.assertEqual(sum(len(g["items"]) for g in ACTIVE["groups"] if g["section"]=="Team Records"),229)
  self.assertEqual(sum(len(p["entries"]) for p in BOOK["players"].values()),229)
  self.assertEqual(len(BOOK["players"]),109)
  self.assertFalse(any(" Club" in g["category"] for g in ACTIVE["groups"]))
 def test_no_unsupported_two_assist_threshold_added(self):
  self.assertFalse(any("2+ Assists" in x for x in SPEC["individual_order"]))
  self.assertIn("Summer - Games with 3+ Assists",SPEC["individual_order"])
  self.assertIn("Winter - Games with 3+ Assists",SPEC["individual_order"])
  self.assertIn("Summer - Games with 2+ Goals",SPEC["individual_order"])
 def test_original_milestone_evidence_preserved(self):
  clubs=[g for g in ORIGINAL["groups"] if re.fullmatch(r"\d+ (Game|Point|Win) Club",g["category"])]
  self.assertEqual(sum(len(g["items"]) for g in clubs),98)
  self.assertEqual(sum(len(g["items"]) for g in ACTIVE["groups"]),460)
if __name__=="__main__":unittest.main(verbosity=2)
