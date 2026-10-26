"""Fail-closed tests for automatic HTO game discovery and private ledger integration."""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime,timezone
from html import escape
from pathlib import Path
import importlib.util,json,os,re,unittest

ROOT=Path(__file__).resolve().parents[1]
def import_file(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/"scripts"/(name+".py"))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
collector=import_file("collect_hto_completed_scores")
ledger=import_file("build_private_online_opponent_ledger")
PRIV=Path(os.environ.get("HOCKEYOS_PRIVATE_INTELLIGENCE",r"D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence"))
EV=Path(os.environ.get("HOCKEYOS_PRIVATE_HTO_EVIDENCE",r"D:\BruTTech\Products\HockeyOS\261016_HTO_Widget_Phase0"))
AVAILABLE=all((p.exists() for p in [
    PRIV/"261026_Master_Complete_Game_History_PRIVATE_STAGE.json",
    PRIV/"261026_HTO_Completed_Scores_PRIVATE_STAGE.json",
    EV/"261016_HTO_SVHL_Latest_Readback.json",
    EV/"261017_HTO_Verified_GameLevel_Skater_Attendance.json"]))
def source():
    return (json.loads((PRIV/"261026_Master_Complete_Game_History_PRIVATE_STAGE.json").read_text()),
            json.loads((PRIV/"261026_HTO_Completed_Scores_PRIVATE_STAGE.json").read_text()),
            json.loads((EV/"261016_HTO_SVHL_Latest_Readback.json").read_text()),
            json.loads((EV/"261017_HTO_Verified_GameLevel_Skater_Attendance.json").read_text()))

def build_fake_html(games):
    cards=[]
    for g in games:
        # Braves scores 2-1 in first period, other periods zero; exact final
        # values accepted even when a synthetic game has only first period goals.
        def row(team,final):
            return "<tr><td>"+escape(team)+"</td><td>"+str(final)+"</td>"+("<td>0</td>"*4)+"<td>"+str(final)+"</td></tr>"
        date=datetime.strptime(g["date"],"%Y-%m-%d").strftime("%b %-d, %Y") if os.name!="nt" else datetime.strptime(g["date"],"%Y-%m-%d").strftime("%b %d, %Y").replace(" 0"," ")
        cards.append('<div class="scoreBoard periodScore">'+date+
          '<table><tr><th>REGULAR SEASON</th><th>1</th><th>2</th><th>3</th><th>OT</th><th>2OT</th><th>F</th></tr>'+
          row(g["opponentExact"],g["ga"])+row("Brave H.C.",g["gf"])+'</table>'+
          '<div class="scoreSummary"><a href="default.asp?u=BRAVESHOCKEY&amp;s=hockey&amp;sportsHQ=BRAVESHOCKEY&amp;gameID='+str(g["htoGameId"])+'&amp;p=boxscore">Box Score and Summary</a></div></div>')
    return "<html><body>BRAVE H.C. WINTER 2026/2027 SCORES"+ "".join(cards)+"</body></html>"

class CurrentHTOCollectorQA(unittest.TestCase):
    @unittest.skipUnless(AVAILABLE,"Private HTO and workbook receipts not accessible on this host")
    def test_real_private_five_game_parity(self):
        m,s,r,v=source()
        report=ledger.reconcile(m,s,r,v)
        self.assertEqual(report["sourceCounts"]["totalGames"],363)
        self.assertEqual(report["sourceCounts"]["currentOfficialHTOGames"],5)
        self.assertFalse(report["released"])
        self.assertFalse(report["workbookWritten"])
        names={p["opponentExact"]:p for p in report["profiles"]}
        self.assertEqual(names["Mid Ice Crisis"]["regularSeason"],{"gp":5,"w":1,"l":2,"t":2,"gf":13,"ga":19})
        self.assertEqual(names["Big Bastones"]["regularSeason"],{"gp":7,"w":4,"l":2,"t":1,"gf":24,"ga":27})
    @unittest.skipUnless(AVAILABLE,"Private HTO and workbook receipts not accessible on this host")
    def test_source_mutations_fail_closed(self):
        m,s,r,v=source()
        broken=deepcopy(s);broken["games"][0]["gf"]+=1
        with self.assertRaisesRegex(ledger.Hold,"HTO_BOX_SCORE_AND_SCORES_LIST_SOURCE_CONFLICT"):ledger.reconcile(m,broken,r,v)
        broken=deepcopy(s);broken["games"][1]["opponentExact"]="Made-up Name"
        with self.assertRaisesRegex(ledger.Hold,"AUDITED_FOUR"):ledger.reconcile(m,broken,r,v)
        broken=deepcopy(m);broken["source"]["sha256"]="wrong"
        with self.assertRaisesRegex(ledger.Hold,"HASH"):ledger.reconcile(broken,s,r,v)
        broken=deepcopy(s);broken["games"].append(deepcopy(s["games"][0]));broken["sourceGamesCount"]+=1
        with self.assertRaisesRegex(ledger.Hold,"IDS_INVALID"):ledger.reconcile(m,broken,r,v)
    @unittest.skipUnless(AVAILABLE,"Private HTO and workbook receipts not accessible on this host")
    def test_future_sixth_game_admitted_without_id_whitelist(self):
        m,s,r,v=source()
        nxt=deepcopy(s)
        nxt["games"].insert(0,{"htoGameId":3399999,"date":"2026-10-26",
                               "season":"W2026/27","gameType":"Regular Season",
                               "opponentExact":"Mid Ice Crisis","gf":2,"ga":1,"result":"W",
                               "sourceUrl":"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3399999&p=boxscore"})
        nxt["sourceGamesCount"]=6
        v=deepcopy(v)
        official=deepcopy(v["games"][-1])
        official.update(htoGameId=3399999,date="2026-10-26",
                        workbookGameNumber=364,teamGoals=2,teamGoalsAgainst=1)
        v["games"].append(official)
        v["teamGP"]=6
        v["teamG"]=14
        fresh=deepcopy(r)
        for p in fresh["pages"]:
            if p["name"]=="hto_stats":
                p["text"],hits=re.subn(r"(TEAM STATS\s+GP\s+GF\s+GA\s+PPO\s+PK%\s+)5\s+12\s+23\b",r"\g<1>6 14 24",p["text"]);self.assertEqual(hits,1)
        # Synthetic check is allowed only within the current testing date:
        # use the day of the synthetic game as the test clock.
        report=ledger.reconcile(m,nxt,fresh,v,now=datetime(2026,10,26,18,0,tzinfo=timezone.utc))
        self.assertEqual(report["sourceCounts"]["currentOfficialHTOGames"],6)
        self.assertEqual(report["sourceCounts"]["latestCompletedGameId"],3399999)
        self.assertFalse(report["released"])
    @unittest.skipUnless(AVAILABLE,"Private HTO and workbook receipts not accessible on this host")
    def test_html_parser_accepts_only_official_identity(self):
        _,s,_,_=source()
        h=build_fake_html(s["games"])
        games=collector.parse_native_html(h)
        self.assertEqual(len(games),5)
        self.assertEqual(games[0]["htoGameId"],3375682)
        self.assertEqual(games[-1]["date"],"2026-09-20")
        with self.assertRaises(collector.Hold):
            collector.parse_native_html(h.replace("3375682","3375601"))
        self.assertEqual(collector.parse_native_html(h.replace("Big Bastones","Other Way"))[0]["opponentExact"],"Other Way")
        # A new name is valid source syntax; release admission checks the known October 25 identity.
    def test_synthetic_completed_game_ids_offline(self):
        fixture=[
            {"htoGameId":3375682,"date":"2026-10-25","opponentExact":"Big Bastones","gf":6,"ga":4},
            {"htoGameId":3375601,"date":"2026-10-18","opponentExact":"Zamboner Crew","gf":1,"ga":7},
            {"htoGameId":3369564,"date":"2026-10-04","opponentExact":"Michelob Morts","gf":2,"ga":3},
            {"htoGameId":3356178,"date":"2026-09-27","opponentExact":"Mohawks H.C.","gf":3,"ga":6},
            {"htoGameId":3356177,"date":"2026-09-20","opponentExact":"Dateline Predators","gf":0,"ga":3}]
        doc=build_fake_html(fixture)
        self.assertEqual(len(collector.parse_native_html(doc)),5)
        with self.assertRaisesRegex(collector.Hold,"DUPLICATE_HTO_GAME_ID"):
            collector.parse_native_html(doc.replace("3375682","3375601"))
        with self.assertRaisesRegex(collector.Hold,"AUDITED_FOUR_GAME_PARITY_DRIFT"):
            collector.parse_native_html(doc.replace("Dateline Predators","Other Way"))
    def test_no_scorecards_rejected(self):
        with self.assertRaises(collector.Hold):
            collector.parse_native_html("<html>BRAVE H.C. WINTER 2026/2027 SCORES</html>")
if __name__=="__main__":unittest.main(verbosity=2)
