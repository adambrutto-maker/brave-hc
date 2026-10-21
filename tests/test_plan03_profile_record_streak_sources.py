"""No-network tests for Plan 03 record/profile/streak source readiness."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_profile_record_streak_sources import evaluate,read_hto,SourceHold,GAME_TO_BOOK

def case():
    players=[
      {"name":"Brutto, Adam","rosterStatus":"FT","activeEligible":"1",
       "major":"15","minor":"13","total":"28","points":"196"},
      {"name":"Congiusti, Marco","rosterStatus":"FT","activeEligible":"1"},
      {"name":"Mazzei, Stefano","rosterStatus":"CU","activeEligible":"1"},
      {"name":"Svec, Matt","rosterStatus":"CU","activeEligible":"1"},
    ]
    profile={"player":"Brutto, Adam","labelI":"Active Records","labelJ":"Total Records",
             "I13":{"value":"#REF!","type":"e","formula":False},
             "J13":{"value":"#REF!","type":"e","formula":False}}
    ledger=([{"class":"Major","major":"1","minor":"0","points":"10"}]*15
          +[{"class":"Minor","major":"0","minor":"1","points":"3"}]*13
          +[{"class":"Display","major":"0","minor":"0","points":"0"}]*51)
    # 15*10 + 13*3 = 189; one legacy major bonus entry has 17 points
    ledger[0]["points"]="17"
    names=["Brutto, Adam"]+[f"Skater{i}" for i in range(1,17)]+[
      "Leong, Dev","Logue, Stephen","Unknown, Johnny","Rosenberg, Jamie"]
    assert len(names)==21
    latest={n:362 if i%3==0 else 359+i%4 for i,n in enumerate(names)}
    latest["Carlyle, Adam"]=361
    latest["Pavaday, Damian"]=360
    helper=[{"name":n,"latestGame":str(latest[n]),"latestRowFound":"1",
             "sourceType":"Skater","watchDetail":None} for n in names]
    helper +=[{"name":n,"latestGame":"358","latestRowFound":"1",
               "sourceType":"Skater","watchDetail":None}
              for n in ("Congiusti, Marco","Mazzei, Stefano","Svec, Matt")]
    return {"profile":profile,"roster":players,"ledger":ledger},{"helper":helper,"dependencyCounts":{
      "Awards & Records":{"formulas":91284,"directGameLogFormulas":11778,
          "mentionsPIMorOtherPotentiallyIncompleteStat":4919,"legacyRecordModelReferences":54092},
      "Player Projections":{"formulas":2237,"directGameLogFormulas":264},
      "Web Streaks":{"formulas":2401,"directGameLogFormulas":1250,
          "mentionsPIMorOtherPotentiallyIncompleteStat":700},
      "Web Races":{"formulas":255,"mentionsPIMorOtherPotentiallyIncompleteStat":35}
    }},latest

class ProfileStreakReadiness(unittest.TestCase):
 def test_internal_record_holder_count_and_streak_source_pass_not_publication(self):
    original,candidate,latest=case()
    r=evaluate(original,candidate,latest)
    self.assertEqual(r["status"],"RECORD_PROFILE_REF_UNRESOLVED_STREAK_LATEST_BOUNDED_PASS")
    self.assertEqual(r["profile"]["legacyHolderEntries"],28)
    self.assertEqual(r["profile"]["displayOnlyLedgerEntries"],51)
    self.assertFalse(r["profile"]["totalRecordsProfileFormulaRecreated"])
    self.assertFalse(r["profile"]["activeRecordsDefinitionIndependentlyCertified"])
    self.assertEqual(r["streaks"]["matchingHelperRows"],21)
    self.assertEqual(r["streaks"]["latestGameMismatches"],0)
    self.assertFalse(r["publicRecordsOrAwardsPublished"])
 def test_profile_is_not_a_calculable_formula_repair(self):
    src,piv,ht=case()
    src["profile"]["I13"]["formula"]=True
    with self.assertRaisesRegex(SourceHold,"ORIGINAL_PROFILE_REF_CELL_NO_LONGER_MATCHES_BASELINE"):
      evaluate(src,piv,ht)
 def test_unknown_record_holder_count_does_not_get_inferred(self):
    src,piv,ht=case()
    src["roster"][0]["total"]="79"
    with self.assertRaisesRegex(SourceHold,"PLAYERINFO_LEGACY_RECORD_METRICS_CHANGED"):
      evaluate(src,piv,ht)
 def test_display_only_ledger_rows_cannot_count_as_holdings(self):
    src,piv,ht=case()
    src["ledger"][0]["class"]="Display"
    with self.assertRaisesRegex(SourceHold,"RECORD_LEDGER_CLASSIFICATION_CHANGED"):
      evaluate(src,piv,ht)
 def test_streak_latest_game_mismatch_is_hard_source_hold(self):
    src,piv,ht=case()
    piv["helper"][0]["latestGame"]="359"
    with self.assertRaisesRegex(SourceHold,"WEB_STREAKS_BOUND_SOURCE_LATEST_GAME_MISMATCH"):
      evaluate(src,piv,ht)
 def test_carlyle_cannot_be_auto_added_as_profile(self):
    src,piv,ht=case()
    src["roster"].append({"name":"Carlyle, Adam"})
    with self.assertRaisesRegex(SourceHold,"MISSING_HELPER_PLAYER_NOW_EXISTS_IN_LEGACY_ROSTER"):
      evaluate(src,piv,ht)
 def test_duplicate_web_helper_name_holds(self):
    src,piv,ht=case()
    piv["helper"].append(copy.deepcopy(piv["helper"][0]))
    with self.assertRaisesRegex(SourceHold,"DUPLICATE_WEBSTREAKS_HELPER_NAME"):
      evaluate(src,piv,ht)
 def test_fifth_completed_game_unauthorized(self):
    feed={"schema":"brave-hc-hto-verified-game-feed/v1","teamGP":4,
          "allGamesDiscovered":True,"playerAggregateParity":True,
          "games":[{"htoGameId":i,"skaters":[],"goalies":[]} for i in GAME_TO_BOOK]}
    feed["games"].append({"htoGameId":3375682,"skaters":[],"goalies":[]})
    feed["teamGP"]=5
    with self.assertRaisesRegex(SourceHold,"HTO_SOURCE_NOT_VERIFIED"):
      read_hto(feed)

if __name__=="__main__":
 unittest.main()
