"""Synthetic source timeline and private preview freshness QA (no HTTP)."""
from pathlib import Path
import copy,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from check_eng59_frozen_source_freshness import check,validate,SnapshotHold
from check_eng59_frozen_source_freshness import sha,canonical
import json
W=ROOT/"widgets"
H=json.loads((W/"player-actuals-hourly.json").read_text(encoding="utf8"))
B=json.loads((W/"player-actuals.json").read_text(encoding="utf8"))
L=json.loads((W/"league-intelligence.json").read_text(encoding="utf8"))
HASH={n:sha(canonical(W/n)) for n in ("player-actuals-hourly.json","player-actuals.json","league-intelligence.json")}
class FreshnessTests(unittest.TestCase):
 def evaluate(self,mutate=None,preview=None):
  h,b,l,hashes=copy.deepcopy((H,B,L,HASH))
  if mutate:mutate(h,b,l,hashes)
  return validate(h,b,l,hashes,preview)
 def test_accepted_current_hourly_source_is_more_recent_than_baseline(self):
  r=check(ROOT)
  self.assertTrue(r["hourlySourceNewerThanEnrichedBaseline"])
  self.assertFalse(r["currentAtReleaseVerified"])
  self.assertTrue(r["requiresLatestSourceRecheckBeforeHumanPromotion"])
  self.assertFalse(r["productionDeploymentAuthorized"])
 def test_verified_flag_does_not_allow_stale_source_reversal(self):
  with self.assertRaisesRegex(SnapshotHold,"HOURLY_HTO_SOURCE_OLDER_THAN_ENRICHED_BASELINE"):
   self.evaluate(lambda h,b,l,s:h.update(asOf="2026-10-01T12:00:00Z"))
 def test_missing_timezone_cannot_form_fresh_source_claim(self):
  with self.assertRaisesRegex(SnapshotHold,"TIMESTAMP_WITHOUT_TIMEZONE"):
   self.evaluate(lambda h,b,l,s:h.update(asOf="2026-10-27T22:00:00"))
 def test_unverified_historical_scope_and_invalid_league_id_fail(self):
  with self.assertRaisesRegex(SnapshotHold,"CURRENT_HTO_FEED_SCOPE_OR_STATUS_CHANGED"):
   self.evaluate(lambda h,b,l,s:h.update(status="PARTIAL_SOURCE"))
  with self.assertRaisesRegex(SnapshotHold,"SVHL_LEAGUE_SOURCE_SCOPE_CHANGED"):
   self.evaluate(lambda h,b,l,s:l.update(leagueId=999))
 def test_hourly_regression_below_published_reference_needs_owner_review(self):
  with self.assertRaisesRegex(SnapshotHold,"SOURCE_TOTALS_LOWER_THAN_PREVIOUS_VERIFIED_BASELINE"):
   self.evaluate(lambda h,b,l,s:h.update(teamGP=b["teamGP"]-1))
 def test_missing_source_hash_refused(self):
  with self.assertRaisesRegex(SnapshotHold,"SOURCE_HASH_SET_INCOMPLETE"):
   self.evaluate(lambda h,b,l,s:s.pop("league-intelligence.json"))
 def test_private_preview_identity_uses_exact_source_bytes(self):
  snapshot={"schema":"ENG59_SCOPED_WEB_ASSET_PREVIEW_V1","canonicalGitBlobBytes":True,
    "publicReleaseApproved":False,"independentPrivacyApproval":False,
    "files":{"widgets/"+k:{"sha256":v} for k,v in HASH.items()}}
  r=self.evaluate(preview=snapshot)
  self.assertTrue(r["privatePreviewHashesVerified"])
  snapshot["files"]["widgets/player-actuals-hourly.json"]["sha256"]="0"*64
  with self.assertRaisesRegex(SnapshotHold,"PREVIEW_SOURCE_FILE_HASH_DRIFT_REBUILD_REQUIRED"):
   self.evaluate(preview=snapshot)
 def test_existing_old_private_preview_not_mistaken_for_current(self):
  old=Path(r"D:\BruTTech\Products\HockeyOS\Implementation Control\261027_ENG59_Main136_StaticPreview_Manifest_PRIVATE.json")
  if old.exists():
   with self.assertRaisesRegex(SnapshotHold,"PREVIEW_SOURCE_FILE_HASH_DRIFT_REBUILD_REQUIRED"):
    check(ROOT,old)
if __name__=="__main__":unittest.main()
