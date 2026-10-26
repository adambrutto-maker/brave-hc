"""Public CI: future HTO games can extend proven canonical names, not invent new identities.

Fixtures are entirely synthetic; these tests cannot attest any future actual
Brave H.C. game. Historical source reconciliation happens separately on BRUTTECH 1.
"""
from datetime import date,timedelta
from copy import deepcopy
from pathlib import Path
import importlib.util,unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("model",ROOT/"scripts"/"build_canonical_opponent_feed.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def game(name,key,day,kind="Regular Season",result="L",gf=2,ga=3,source="HTO"):
    return {"name":name,"key":key,"date":day,"type":kind,"result":result,
            "bravesGF":gf,"bravesGA":ga,"source":source}
def fixtures(which):
    cfg=m.AUDITED[which]
    h=[]
    if which=="Mohawks HC":
        for n in range(49):
            day=(date(2018,1,1)+timedelta(days=n)).isoformat()
            h.append(game("Mohawks HC","WB:"+str(n+1),day,
                          "Regular Season" if n<42 else "Playoffs",
                          "L",0,1,source="MASTER"))
    old=game(cfg["htoExact"],"HTO:"+str(cfg["proofGameId"]),cfg["date"],
             "Regular Season","L",cfg["gf"],cfg["ga"])
    proof={"svhlSource":"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=570&teamid=13680",
           "htoSource":"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&gameID="+str(cfg["proofGameId"])}
    return cfg,h,[old],proof
class FutureCanonicalIdentityQA(unittest.TestCase):
    def test_mohawks_base_workbook_and_one_hto(self):
        cfg,h,now,p=fixtures("Mohawks HC")
        out=m.merge_opponent(cfg,h,now,p)
        self.assertEqual(out["allTime"]["gp"],50)
        self.assertEqual(out["playoffs"]["gp"],7)
        self.assertEqual(out["sourceHTOGames"],1)
    def test_add_verified_new_hto_mohawks_name_once(self):
        cfg,h,now,p=fixtures("Mohawks HC")
        now.append(game("Mohawks H.C.","HTO:9900001","2026-11-08",
                        result="W",gf=2,ga=1))
        out=m.merge_opponent(cfg,h,now,p)
        self.assertEqual(out["allTime"]["gp"],51)
        self.assertEqual(out["regularSeason"]["gp"],44)
        self.assertEqual(out["sourceHTOGames"],2)
        self.assertEqual(out["lastFive"][-1]["date"],"2026-11-08")
    def test_add_verified_new_hto_michelob_without_fabricating_past(self):
        cfg,h,now,p=fixtures("Sugo Sundays")
        now.append(game("Michelob Morts","HTO:9900002","2026-11-15",
                        result="W",gf=5,ga=2))
        out=m.merge_opponent(cfg,h,now,p)
        self.assertEqual(out["allTime"],{"gp":2,"w":1,"l":1,"t":0,"gf":7,"ga":5})
        self.assertTrue(out["historicalRecordsAreLimited"])
        self.assertIn("2 source-verified current-season HTO games",out["notice"])
    def test_unapproved_spelling_switch_cannot_join_mohawks(self):
        cfg,h,now,p=fixtures("Mohawks HC")
        now.append(game("Mohawks HC","HTO:9900003","2026-11-08"))
        with self.assertRaisesRegex(m.Hold,"NEW_HTO_OPPONENT_NAME_CHANGE_NEEDS_SOURCE_REVIEW"):
            m.merge_opponent(cfg,h,now,p)
    def test_unapproved_sugo_hto_spelling_switch_must_hold(self):
        cfg,h,now,p=fixtures("Sugo Sundays")
        now.append(game("Sugo Sundays","HTO:9900004","2026-11-15"))
        with self.assertRaisesRegex(m.Hold,"NEW_HTO_OPPONENT_NAME_CHANGE_NEEDS_SOURCE_REVIEW"):
            m.merge_opponent(cfg,h,now,p)
    def test_duplicate_hto_game_id_must_not_double_count(self):
        cfg,h,now,p=fixtures("Mohawks HC")
        now.append(deepcopy(now[0]))
        with self.assertRaisesRegex(m.Hold,"HTO_CANONICAL_NAME_SOURCE_SCOPE_CHANGED"):
            m.merge_opponent(cfg,h,now,p)
    def test_forged_old_game_cannot_enter_current_hto_layer(self):
        cfg,h,now,p=fixtures("Mohawks HC")
        now.append(game("Mohawks H.C.","HTO:9900005","2020-03-01"))
        with self.assertRaisesRegex(m.Hold,"HTO_CANONICAL_NAME_SOURCE_SCOPE_CHANGED"):
            m.merge_opponent(cfg,h,now,p)
    def test_unverified_source_game_not_htodata_layer(self):
        cfg,h,now,p=fixtures("Sugo Sundays")
        now.append(game("Michelob Morts","HTO:9900006","2026-11-15",source="MASTER"))
        with self.assertRaisesRegex(m.Hold,"HTO_CANONICAL_NAME_SOURCE_SCOPE_CHANGED"):
            m.merge_opponent(cfg,h,now,p)
    def test_original_cross_site_proof_game_must_remain(self):
        cfg,h,now,p=fixtures("Sugo Sundays")
        now[0]["key"]="HTO:9900007"
        with self.assertRaisesRegex(m.Hold,"ORIGINAL_CROSS_SYSTEM_GAME_PROOF_MISSING"):
            m.merge_opponent(cfg,h,now,p)
if __name__=="__main__":unittest.main(verbosity=2)
