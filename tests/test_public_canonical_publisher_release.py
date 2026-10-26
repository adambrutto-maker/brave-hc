"""Publisher release-scope integrity after SVHL division membership changes."""
from copy import deepcopy
from pathlib import Path
import importlib.util,json,unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("publisher",ROOT/"scripts"/"publish_dynamic_exact_opponent_feed.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def payload():
 return [json.loads((ROOT/"widgets"/name).read_text(encoding="utf8")) for name in ("opponent-intelligence.json","standings.json")]
class PublisherReleaseContract(unittest.TestCase):
 def test_current_source_archive_contract(self):
  p,s=payload()
  self.assertTrue(m.require_public_scope(p,s))
  self.assertEqual(p["coverage"]["currentDivisionOpponents"],7)
  self.assertEqual(p["coverage"]["seasonOpponentArchives"],1)
 def test_do_not_reject_new_release_scope_wording(self):
  p,s=payload()
  self.assertNotIn("EXACT",p["releaseScope"])
  self.assertTrue(m.require_public_scope(p,s))
 def test_wrong_canonical_brand_is_held(self):
  p,s=payload();p["sourceTeamCanonical"]="Braves HC"
  with self.assertRaisesRegex(m.ReleaseHold,"RELEASE_PROVENANCE"):m.require_public_scope(p,s)
 def test_archived_michelob_cannot_be_omitted(self):
  p,s=payload();p["teams"]=[e for e in p["teams"] if e["name"]!="Sugo Sundays"]
  p["coverage"]["seasonOpponentArchives"]=0
  with self.assertRaisesRegex(m.ReleaseHold,"CANONICAL_OPPONENT_PROOF"):m.require_public_scope(p,s)
 def test_archived_michelob_cannot_be_falsely_current(self):
  p,s=payload();next(e for e in p["teams"] if e["name"]=="Sugo Sundays")["membershipStatus"]="CURRENT_DIVISION"
  with self.assertRaisesRegex(m.ReleaseHold,"SOURCE_QUALIFIED_DIVISION"):m.require_public_scope(p,s)
 def test_new_current_maplewolves_cannot_be_omitted(self):
  p,s=payload();p["teams"]=[e for e in p["teams"] if e["name"]!="Maplewolves"]
  with self.assertRaisesRegex(m.ReleaseHold,"SOURCE_QUALIFIED_DIVISION"):m.require_public_scope(p,s)
 def test_tampered_standings_membership_is_held(self):
  p,s=payload();next(e for e in s["teams"] if e["name"]=="Maplewolves")["name"]="New Unknown Team"
  with self.assertRaisesRegex(m.ReleaseHold,"SOURCE_QUALIFIED_DIVISION"):m.require_public_scope(p,s)
 def test_archive_no_record_is_not_publishable_as_historical_result(self):
  p,s=payload();e=next(x for x in p["teams"] if x["name"]=="Sugo Sundays")
  e["sourceHTOGames"]=0
  with self.assertRaisesRegex(m.ReleaseHold,"SOURCE_QUALIFIED_DIVISION"):m.require_public_scope(p,s)
 def test_original_mohawks_history_cannot_be_dropped(self):
  p,s=payload();p["teams"]=[x for x in p["teams"] if x["name"]!="Mohawks HC"]
  with self.assertRaisesRegex(m.ReleaseHold,"SOURCE_QUALIFIED_DIVISION"):m.require_public_scope(p,s)
 def test_verified_current_hto_opponent_retained_after_division_exit(self):
  prior,standings=payload()
  later=deepcopy(prior)
  for t in standings["teams"]:
   if t["name"]=="Big Bastones":t["name"]="New League Member"
  target=next(e for e in later["teams"] if e["name"]=="Big Bastones")
  target["membershipStatus"]="SEASON_OPPONENT_ARCHIVE"
  later["teams"].append({"name":"New League Member","verification":"NO_EXACT_HISTORY",
     "membershipStatus":"CURRENT_DIVISION","message":"No verified original matchup"})
  later["coverage"]["seasonOpponentArchives"]+=1
  later["coverage"]["noExactHistory"]+=1
  self.assertTrue(m.require_public_scope(later,standings))
  self.assertTrue(m.require_retained_hto_opponents(prior,later))
 def test_previously_admitted_source_HTO_opponent_cannot_disappear(self):
  prior,standings=payload()
  later=deepcopy(prior)
  later["teams"]=[x for x in later["teams"] if x["name"]!="Big Bastones"]
  with self.assertRaisesRegex(m.ReleaseHold,"PREVIOUSLY_VERIFIED_HTO_OPPONENT_DISAPPEARED"):
   m.require_retained_hto_opponents(prior,later)
 def test_accepted_opponent_cannot_lose_recorded_HTO_game(self):
  prior,standings=payload()
  later=deepcopy(prior)
  next(x for x in later["teams"] if x["name"]=="Mohawks HC")["sourceHTOGames"]=0
  with self.assertRaisesRegex(m.ReleaseHold,"HTO_OPPONENT_GAME_COVERAGE_REGRESSED"):
   m.require_retained_hto_opponents(prior,later)
 def test_archived_canonical_source_identity_cannot_be_reassigned(self):
  prior,standings=payload()
  later=deepcopy(prior)
  next(x for x in later["teams"] if x["name"]=="Sugo Sundays")["canonicalName"]="Maplewolves"
  with self.assertRaisesRegex(m.ReleaseHold,"VERIFIED_OPPONENT_IDENTITY_SCOPE_REGRESSED"):
   m.require_retained_hto_opponents(prior,later)
if __name__=="__main__":unittest.main(verbosity=2)
