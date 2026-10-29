"""Canonical Brave H.C. public identity invariants — no private workbook input."""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime,timezone,timedelta
from pathlib import Path
import importlib.util,json,unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("identities",ROOT/"scripts"/"check_public_canonical_identities.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
W=ROOT/"widgets"
def data():
    return (m.load(W/"standings.json"),m.load(W/"opponent-intelligence.json"),
            m.load(W/"current-opponent-identity-bridges.json"),
            (W/"home-panels.html").read_text(encoding="utf8"),
            (W/"home-premium.js").read_text(encoding="utf8"))
class IdentityContractQA(unittest.TestCase):
    def test_current_both_canonical_histories_are_qualified(self):
        a,b,c,d,e=data()
        result=m.validate(a,b,c,d,e)
        self.assertEqual(result["status"],"CANONICAL_PUBLIC_IDENTITY_CONTRACT_PASS")
        self.assertEqual(result["teamName"],"Brave H.C.")
        self.assertEqual(result["leagueSourceKey"],"Braves HC")
        self.assertEqual(result["mohawksAllTimeGames"],50)
        self.assertEqual(result["michelobCurrentGames"],1)
    def test_league_source_id_must_not_be_rewritten_to_canonical(self):
        args=list(data());args[0]["team"]="Brave H.C."
        with self.assertRaisesRegex(m.IdentityHold,"SVHL_SOURCE_IDENTIFIER"):m.validate(*args)
    def test_home_canonical_brand_cannot_regress(self):
        args=list(data());args[1]["sourceTeamCanonical"]="Braves HC"
        with self.assertRaisesRegex(m.IdentityHold,"CANONICAL_TEAM_SOURCE_AUTHORITY"):m.validate(*args)
    def test_mohawks_cannot_split_49_workbook_games_from_current_hto(self):
        args=list(data());entry=next(x for x in args[1]["teams"] if x["name"]=="Mohawks HC")
        entry["allTime"]["gp"]-=1
        with self.assertRaises(m.IdentityHold):m.validate(*args)
    def test_mohawks_source_name_cannot_be_assigned_from_league(self):
        args=list(data());entry=next(x for x in args[1]["teams"] if x["name"]=="Mohawks HC")
        entry["sourceNames"]["hto"]="Mohawks HC"
        with self.assertRaisesRegex(m.IdentityHold,"APPROVED_CANONICAL_IDENTITY"):m.validate(*args)
    def test_michelob_old_history_cannot_be_fabricated(self):
        args=list(data());entry=next(x for x in args[1]["teams"] if x["name"]=="Sugo Sundays")
        for key in ("allTime","regularSeason"):
            entry[key]["gp"]=20
            entry[key]["l"]=20
        with self.assertRaisesRegex(m.IdentityHold,"MICHELOB_CURRENT_ONLY_SCOPE"):m.validate(*args)
    def test_michelob_status_must_retain_one_game_scope(self):
        args=list(data());entry=next(x for x in args[1]["teams"] if x["name"]=="Sugo Sundays")
        entry["identityScope"]="ASSUMED_FRANCHISE_HISTORY"
        with self.assertRaisesRegex(m.IdentityHold,"MICHELOB_CURRENT_ONLY_SCOPE"):m.validate(*args)
    def test_other_way_unverified_history_cannot_be_published_as_zero(self):
        args=list(data());entry=next(x for x in args[1]["teams"] if x["name"]=="Other Way")
        entry["allTime"]={"gp":0,"w":0,"l":0,"t":0,"gf":0,"ga":0}
        with self.assertRaisesRegex(m.IdentityHold,"NO_HISTORY_MUST_NOT_BECOME_ZERO"):m.validate(*args)
    def test_duplicate_division_identity_fails(self):
        args=list(data());args[0]["teams"][0]["name"]="Mohawks HC"
        with self.assertRaisesRegex(m.IdentityHold,"DIVISION_TEAM_SOURCE_IDENTITIES_CHANGED"):m.validate(*args)
    def test_release_source_proof_cannot_approve_full_franchise_merge(self):
        args=list(data());args[2]["franchiseHistoryMerged"]=True
        with self.assertRaisesRegex(m.IdentityHold,"OFFICIAL_GAME_IDENTITY_PROOFS"):m.validate(*args)
    def test_mutated_htogame_id_fails_even_if_alias_name_matches(self):
        args=list(data());args[2]["sameGamePairs"][0]["htogameId"]=1
        with self.assertRaisesRegex(m.IdentityHold,"HTO_SVHL_ONE_GAME_PROOF"):m.validate(*args)
    def test_expired_canonical_feed_is_explicit_hold(self):
        args=list(data())
        args[1]["asOf"]=(datetime.now(timezone.utc)-timedelta(days=13)).isoformat()
        with self.assertRaisesRegex(m.IdentityHold,"PUBLIC_CANONICAL_SOURCE_STALE"):
            m.validate(*args,check_fresh=True)
    def test_current_source_freshness_is_allowed(self):
        args=list(data());args[1]["asOf"]=datetime.now(timezone.utc).isoformat()
        self.assertEqual(m.validate(*args,check_fresh=True)["divisionTeams"],8)
    def test_missing_canonical_js_cache_version_fails(self):
        args=list(data());args[3]=args[3].replace("3.6.4","old-cached")
        with self.assertRaisesRegex(m.IdentityHold,"HTML_JS_CSS_RELEASE_VERSION"):m.validate(*args)
    def test_decimal_win_percentage_format_cannot_revert(self):
        args=list(data());args[4]=args[4].replace(".toFixed(3)",".toFixed(0)")
        with self.assertRaisesRegex(m.IdentityHold,"CANONICAL_UI_OR_DECIMAL_WIN_PCT"):m.validate(*args)
    def test_missing_canonical_opponent_row_blocks(self):
        args=list(data());args[1]["teams"]=args[1]["teams"][:-1]
        with self.assertRaisesRegex(m.IdentityHold,"OPPONENT_VS_DIVISION_MEMBERSHIP"):m.validate(*args)
    def test_current_maplewolves_source_history_is_preserved(self):
        a,b,c,d,e=data()
        self.assertIn("Maplewolves",{x["name"] for x in a["teams"]})
        opponents={x["name"]:x for x in b["teams"]}
        self.assertEqual(opponents["Maplewolves"]["allTime"],{"gp":10,"w":3,"l":6,"t":1,"gf":39,"ga":56})
        self.assertEqual(opponents["Maplewolves"]["playoffs"],{"gp":2,"w":1,"l":1,"t":0,"gf":11,"ga":12})
        self.assertEqual(opponents["Maplewolves"]["membershipStatus"],"CURRENT_DIVISION")
        self.assertNotIn("Sugo Sundays",{x["name"] for x in a["teams"]})
    def test_departed_opponent_remains_archived_with_proven_one_game(self):
        a,b,c,d,e=data()
        archived=[x for x in b["teams"] if x["membershipStatus"]=="SEASON_OPPONENT_ARCHIVE"]
        self.assertEqual(len(archived),1)
        self.assertEqual(archived[0]["name"],"Sugo Sundays")
        self.assertEqual(archived[0]["canonicalName"],"Michelob Morts")
        self.assertEqual(archived[0]["identityScope"],"HTO_CURRENT_GAME_ONLY")
        self.assertEqual(archived[0]["allTime"],{"gp":1,"w":0,"l":1,"t":0,"gf":2,"ga":3})
    def test_archived_opponent_cannot_be_presented_as_current(self):
        args=list(data());x=next(e for e in args[1]["teams"] if e["name"]=="Sugo Sundays")
        x["membershipStatus"]="CURRENT_DIVISION"
        with self.assertRaisesRegex(m.IdentityHold,"OPPONENT_VS_DIVISION_MEMBERSHIP"):
            m.validate(*args)
    def test_qualifying_maplewolves_not_removed_from_current_opponents(self):
        args=list(data());args[1]["teams"]=[e for e in args[1]["teams"] if e["name"]!="Maplewolves"]
        with self.assertRaisesRegex(m.IdentityHold,"OPPONENT_VS_DIVISION_MEMBERSHIP"):
            m.validate(*args)
    def test_canonical_franchise_archive_cannot_be_deleted_silently(self):
        args=list(data());args[1]["teams"]=[e for e in args[1]["teams"] if e["name"]!="Sugo Sundays"]
        args[1]["coverage"]["seasonOpponentArchives"]=0
        with self.assertRaisesRegex(m.IdentityHold,"APPROVED_CANONICAL_IDENTITY"):
            m.validate(*args)
    def test_maplewolves_histories_cannot_be_fabricated(self):
        args=list(data());x=next(e for e in args[1]["teams"] if e["name"]=="Maplewolves")
        x["allTime"]["gp"]=11;x["allTime"]["w"]=4
        with self.assertRaisesRegex(m.IdentityHold,"MAPLEWOLVES_TEN_GAME_MASTER_HISTORY"):
            m.validate(*args)
    def test_multiple_verified_HTO_opponents_can_be_archived_in_future_division(self):
        args=list(data())
        original=__import__("copy").deepcopy(args[1])
        for outgoing,incoming in (("Big Bastones","New Current A"),("Dateline Predators","New Current B")):
            for club in args[0]["teams"]:
                if club["name"]==outgoing:club["name"]=incoming
            rec=next(x for x in args[1]["teams"] if x["name"]==outgoing)
            rec["membershipStatus"]="SEASON_OPPONENT_ARCHIVE"
            args[1]["teams"].append({"name":incoming,"membershipStatus":"CURRENT_DIVISION",
                "verification":"NO_EXACT_HISTORY","message":"No HTO or original workbook source match"})
            args[1]["coverage"]["seasonOpponentArchives"]+=1
            args[1]["coverage"]["noExactHistory"]+=1
        self.assertEqual(m.validate(*args)["seasonOpponentArchives"],3)
        import sys
        sys.path.insert(0,str(ROOT/'scripts'))
        from publish_dynamic_exact_opponent_feed import require_retained_hto_opponents,require_public_scope
        self.assertTrue(require_public_scope(args[1],args[0]))
        self.assertTrue(require_retained_hto_opponents(original,args[1]))
if __name__=="__main__":unittest.main(verbosity=2)
