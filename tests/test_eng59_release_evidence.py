"""Source-only, synthetic mutations of public HockeyOS candidate evidence.

Deliberately never mounts or reads private author/league/HTO approval packets.
"""
from pathlib import Path
import copy,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from check_eng59_release_evidence import read,git_blob_hash,audit,run,EvidenceGateHold,CHECKED
W=ROOT/"widgets"
N=["league-intelligence.json","brave-historical-verified-games.json",
  "svhl-gameinfo-hold-review.json","svhl-official-game-id-bridges.json",
  "brave-historical-gameinfo-ids.json"]
INPUTS=N+["svhl-player-game-570.json"]+[f"svhl-player-game-{x}.json" for x in (494,512,531,547)]
BASE=[read(W,n) for n in N]
HASHES={n:git_blob_hash(W/n) for n in INPUTS}

class ReleaseCandidateBoundaryTests(unittest.TestCase):
 def rebuild(self,mutation=None):
  items=copy.deepcopy(BASE)
  h=copy.deepcopy(HASHES)
  if mutation:mutation(items,h)
  return audit(*items,h)
 def fail(self,mutator,code):
  with self.assertRaisesRegex(EvidenceGateHold,code):
   self.rebuild(mutator)
 def test_current_source_and_old_H2H_complete_coverage_without_acceptance(self):
  result=run(W)
  self.assertEqual(result["status"],CHECKED)
  self.assertEqual((result["currentVerifiedOfficialIDs"],
    result["historicalVerifiedOfficialIDs"],result["originalScoringSheetsHeld"]),
    (54,79,137))
  self.assertFalse(result["sourceOwnerCorrectionsApproved"])
  self.assertFalse(result["independentApproval"])
  self.assertFalse(result["mergeOrProductionReleaseAuthorized"])
  self.assertEqual(result["videoStrength"],"INSUFFICIENT_VIDEO")
 def test_all_source_file_git_blob_bytes_are_pinned(self):
  d=self.rebuild()
  self.assertEqual(d["sourceInputHashes"]["league-intelligence.json"],HASHES["league-intelligence.json"])
  self.fail(lambda x,h:h.update({"svhl-player-game-547.json":"0"*64}),
    "HISTORICAL_GAMEINFO_INPUT_BYTES_CHANGED_REBUILD_REQUIRED")
 def test_missing_or_promoted_137_scoring_holds_are_rejected(self):
  self.fail(lambda x,h:x[2].update(gamePages=136),"HELD_SCORER_REVIEW_SOURCE_OR_COUNTS_CHANGED")
  self.fail(lambda x,h:x[2]["games"][0].update(acceptedPlayerCorrection=True),
    "UNACCEPTED_HOLD_SOURCE_OR_ID_CHANGED")
 def test_gameinfo_under_and_over_counts_cannot_be_reclassified(self):
  self.fail(lambda x,h:x[2]["categories"].update({"RAW_GAMEINFO_ROWS_BELOW_PUBLISHED_SCORE":85}),
    "HELD_SCORER_REVIEW_SOURCE_OR_COUNTS_CHANGED")
 def test_zero_strength_or_ratings_cannot_be_generated_from_no_video(self):
  self.fail(lambda x,h:x[3].update(videoStrengthCalibrated=True),
    "CURRENT_GAME_IDENTITY_OR_RELEASE_AUTHORITY_CHANGED")
  self.fail(lambda x,h:x[4].update(videoTeamRatingProduced=True),
    "HISTORICAL_GAMEINFO_IDENTITIES_OR_STAT_GATE_CHANGED")
 def test_player_gp_unsupported_on_historical_game_cannot_be_admitted(self):
  self.fail(lambda x,h:x[4]["games"][0].update(playerGPVerified=True),
    "HISTORICAL_GAME_ID_SOURCE_OR_STAT_ASSUMPTION_INVALID")
 def test_forged_current_official_game_id_or_page_hash_is_rejected(self):
  self.fail(lambda x,h:x[3]["games"][0].update(officialGameId=9999999),
    "CURRENT_SOURCE_GAME_URL_SHA_OR_DUPLICATE_INVALID")
  self.fail(lambda x,h:x[3]["games"][1].update(officialGameInfoPageSHA256="FAKE"),
    "CURRENT_SOURCE_GAME_URL_SHA_OR_DUPLICATE_INVALID")
 def test_historical_duplicate_official_id_is_rejected(self):
  def change(x,h):
   r=x[4]["games"]
   r[1]["gameId"]=r[0]["gameId"]
   r[1]["leagueId"]=r[0]["leagueId"]
   r[1]["sourceGameInfoURL"]=r[0]["sourceGameInfoURL"]
  self.fail(change,"HISTORICAL_GAME_ID_SOURCE_OR_STAT_ASSUMPTION_INVALID|COMBINED_GAME_KEYS_NOT_DISTINCT")
 def test_same_name_historical_continuity_cannot_be_assumed(self):
  self.fail(lambda x,h:x[1]["teamSeasons"][0].update(continuousFranchiseNotVerified=False),
   "HISTORICAL_TWO_SOURCE_IDENTITY_OR_EXCLUSIONS_UNQUALIFIED")
 def test_source_crossover_to_vaHL_fails(self):
  self.fail(lambda x,h:x[3].update(leagueId=999),
    "CURRENT_GAME_IDENTITY_OR_RELEASE_AUTHORITY_CHANGED")
  self.fail(lambda x,h:x[4]["games"][0].update(leagueId=999),
    "HISTORICAL_GAME_ID_SOURCE_OR_STAT_ASSUMPTION_INVALID")
 def test_player_stat_write_and_division_reassignment_are_never_authorized(self):
  self.fail(lambda x,h:x[2].update(publicStatsOrScoresChanged=True),
    "HELD_SCORER_REVIEW_SOURCE_OR_COUNTS_CHANGED")
  self.fail(lambda x,h:x[3].update(officialDivisionAssignmentsChanged=True),
    "CURRENT_GAME_IDENTITY_OR_RELEASE_AUTHORITY_CHANGED")

if __name__=="__main__":unittest.main()
