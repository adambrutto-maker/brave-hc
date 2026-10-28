"""Offline fail-closed contract for HTO public hourly actuals, no network required."""
import copy
import datetime as dt
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("publisher",ROOT/"scripts/refresh_verified_hto_player_actuals_hourly.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def fixture():
    names=[f"Player{i:02d}, Test" for i in range(16)]
    header=["No","Name","POS","","GP","G","A","Pts","Pts/G"]
    fields=[header]
    for i,name in enumerate(names):
        g,a=(2,1) if i==0 else ((1,0) if i==1 else (0,0))
        fields.append([str(i+1),name,"C","","2",str(g),str(a),str(g+a),"0"])
    fields.append(["","Team Stats","","","2","3","1","4","0"])
    def table(rows):
        return "<table>"+"".join("<tr>"+"".join("<td>"+str(x)+"</td>" for x in row)+"</tr>" for row in rows)+"</table>"
    stat="<html><head><title>Brave H.C. Stats - Winter 2026/2027</title></head><body>"+table(fields)+table([
       ["GP","GF","GA","PPO","PK%"],["2","3","2","1","75%"]])+"</body></html>"
    board=["REGULAR SEASON","1","2","3","OT","2OT","F"]
    def result(opp,ours,against):
        return table([board,[opp,"1","0","0","0","0",str(against)],
                      ["Brave H.C.","1","0","0","0","0",str(ours)]])
    score="<html><head><title>Brave H.C. Winter 2026/2027 Scores</title></head><body>"+result("A",2,1)+result("B",1,1)+"</body></html>"
    return stat,score

class PublisherContract(unittest.TestCase):
    def test_valid_parity(self):
        stats,scores=fixture()
        d=mod.parse(stats,scores,dt.datetime(2026,10,27,tzinfo=dt.timezone.utc))
        self.assertEqual((d["teamGP"],d["teamGF"],d["teamGA"],d["playerCount"]),(2,3,2,16))
        self.assertEqual(d["teamPlayerPoints"],4)
        self.assertEqual(d["season"],"W2026/27")
        self.assertEqual(mod.decide(d,None),"NEW_VERIFIED")
        self.assertEqual(mod.decide(d,dict(d,rosterCoverage={"source":"separately-qualified"})),"UNCHANGED_VERIFIED")
    def test_changed_then_unchanged(self):
        a,b=fixture();d=mod.parse(a,b)
        prev=copy.deepcopy(d);prev["teamGP"]=1;prev["teamGF"]=1;prev["teamGA"]=1
        for p in prev["players"]:p["gp"]=1;p["g"]=p["a"]=p["pts"]=0
        self.assertEqual(mod.decide(d,prev),"UPDATED_VERIFIED")
        self.assertEqual(mod.decide(d,d),"UNCHANGED_VERIFIED")
    def test_scoreboard_identity_or_parity_rejected(self):
        a,b=fixture()
        with self.assertRaises(mod.SourceHold):mod.parse(a,b.replace("Brave H.C.","Other H.C."))
        with self.assertRaises(mod.SourceHold):mod.parse(a,b.replace("<td>2</td></tr>","<td>8</td></tr>",1))
    def test_bad_skater_and_duplicate_rejected(self):
        a,b=fixture()
        with self.assertRaises(mod.SourceHold):mod.parse(a.replace("Player01, Test","Player00, Test"),b)
        with self.assertRaises(mod.SourceHold):mod.parse(a.replace("<td>3</td><td>0</td>","<td>5</td><td>0</td>",1),b)
    def test_identity_and_season_changes_rejected(self):
        a,b=fixture()
        with self.assertRaises(mod.SourceHold):mod.parse(a.replace("Brave H.C. Stats","Other H.C. Stats"),b)
        with self.assertRaises(mod.SourceHold):mod.parse(a,b.replace("Winter 2026/2027","Winter 2025/2026"))
    def test_published_total_decrease_held(self):
        a,b=fixture();d=mod.parse(a,b)
        invalid=copy.deepcopy(d);invalid["teamGP"]-=1
        with self.assertRaises(mod.SourceHold):mod.decide(invalid,d)
    def test_denies_overwriting_richer_authoritative_file(self):
        a,b=fixture()
        with patch.object(mod,"read_html",side_effect=[a,b]):
            with self.assertRaises(mod.SourceHold):mod.run(mod.BASELINE,None,check_only=True)

if __name__=="__main__":unittest.main()
