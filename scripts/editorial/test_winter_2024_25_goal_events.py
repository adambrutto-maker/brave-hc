"""Source-parity and publication-hold tests for seven 2024–25 historical game narratives."""
import json
import re
import unittest
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse, parse_qs

BASE=Path(__file__).resolve().parents[2]
ROOT=BASE/"docs"/"editorial"/"native_hto"/"2024-25"
AUDIT=ROOT/"261103_Winter2024_25_Public_Source_Preservation_v2.json"
EVIDENCE=ROOT/"261103_Seven_Native_HTO_Game_Event_Parity.json"
EXPECTED={2148137,2148142,2148143,2148146,2148147,2148153,2148159}

class NativeGoalEventEditorialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.audit=json.loads(AUDIT.read_text(encoding="utf-8"))
        cls.ledger=json.loads(EVIDENCE.read_text(encoding="utf-8"))
        cls.audited={g["gameId"]:g for g in cls.audit["games"]}
        cls.games=cls.ledger["games"]

    def test_exact_seven_game_event_review(self):
        self.assertEqual(self.ledger["schema"],"brave-hc-winter-2024-25-seven-native-goal-event-reconciliation/v1")
        self.assertEqual(self.ledger["status"],"READ_ONLY_SOURCES_NO_HTO_WRITES")
        self.assertEqual(len(self.games),7)
        self.assertEqual({g["gameId"] for g in self.games},EXPECTED)
        self.assertEqual(sum(len(g["events"]) for g in self.games),37)

    def test_original_native_source_fingerprints_preserved(self):
        for g in self.games:
            with self.subTest(id=g["gameId"]):
                a=self.audited[g["gameId"]]
                self.assertEqual(a["publicNativeContentCategory"],"ORIGINAL_SCORING_OR_GAME_EVENT_TABLE_ONLY")
                self.assertEqual(g["publicHTOBoxscoreSHA256"],a["publicBoxscoreHTMLSHA256"])
                self.assertEqual(g["nativeOriginalRecapSHA256"],a["sourceRecapHTMLSHA256"])
                self.assertEqual((g["date"],g["opponent"]), (a["date"],a["opponent"]))
                self.assertEqual((g["score"]["braves"],g["score"]["opponent"]),(a["bravesGoals"],a["opponentGoals"]))
                self.assertEqual(g["sourceStatus"],"READ_ONLY_NATIVE_ORIGINAL_EVENT_TABLE")

    def test_scores_match_complete_event_table_count(self):
        for g in self.games:
            with self.subTest(id=g["gameId"]):
                self.assertEqual(len(g["events"]),g["score"]["braves"]+g["score"]["opponent"])
                self.assertEqual(sum(e["team"]=="Brave H.C." for e in g["events"]),g["score"]["braves"])
                self.assertEqual(sum(e["team"]!="Brave H.C." for e in g["events"]),g["score"]["opponent"])
                self.assertTrue(all(g["parity"].values()))

    def test_individual_scorers_and_assists_match_hto_skater_totals(self):
        for g in self.games:
            countsG=Counter(e["scorerNumber"] for e in g["events"] if e["team"]=="Brave H.C.")
            countsA=Counter(n for e in g["events"] for n in e["assistNumbers"])
            credited={p["number"]:p for p in g["skatersCredited"]}
            with self.subTest(id=g["gameId"]):
                self.assertEqual(set(countsG)|set(countsA),set(credited))
                for no,p in credited.items():
                    self.assertEqual(countsG[no],p["goals"])
                    self.assertEqual(countsA[no],p["assists"])
                for e in g["events"]:
                    if e["team"]=="Brave H.C.":
                        self.assertEqual(e["scorerName"],credited[e["scorerNumber"]]["name"])
                        self.assertEqual(e["assistNames"],[credited[n]["name"] for n in e["assistNumbers"]])
                    else:
                        self.assertIsNone(e["scorerName"])
                        self.assertIsNone(e["scorerNumber"])

    def test_timing_and_strength_are_source_bound(self):
        allowed={"ES","PP","SH","EN","PS","UNSPECIFIED"}
        for g in self.games:
            prior=None
            for e in g["events"]:
                with self.subTest(id=g["gameId"],period=e["period"],clock=e["clock"]):
                    self.assertIn(e["period"],(1,2,3))
                    self.assertRegex(e["clock"],r"^\d{1,2}:\d{2}$")
                    mm,ss=map(int,e["clock"].split(":"))
                    self.assertLess(ss,60)
                    self.assertLessEqual(mm,20)
                    self.assertIn(e["strength"],allowed)
                    if prior and e["period"]==prior["period"]:
                        self.assertLessEqual(mm*60+ss, int(prior["clock"].split(":")[0])*60+int(prior["clock"].split(":")[1]))
                    prior=e

    def test_official_season_scoped_boxscore_links(self):
        for g in self.games:
            u=urlparse(g["sourceUrl"])
            q=parse_qs(u.query)
            with self.subTest(id=g["gameId"]):
                self.assertEqual((u.scheme,u.hostname,u.path),("https","www.htosports.com","/teams/default.asp"))
                self.assertEqual(q["viewseas"],["Winter_2024/2025"])
                self.assertEqual(q["p"],["boxscore"])
                self.assertEqual(q["gameID"],[str(g["gameId"])])

    def test_all_seven_articles_are_held_and_originals_untouched(self):
        for g in self.games:
            name=f'{g["date"].replace("-","")}_HTO_{g["gameId"]}_REVIEW_DRAFT.md'
            path=ROOT/"review_drafts"/name
            with self.subTest(id=g["gameId"]):
                self.assertTrue(path.exists())
                txt=path.read_text(encoding="utf-8")
                self.assertIn("HISTORICAL RETROSPECTIVE — UNAPPROVED EDITORIAL REVIEW DRAFT",txt)
                self.assertIn(str(g["gameId"]),txt)
                self.assertIn(g["sourceUrl"],txt)
                self.assertIn("No native HTO administrator field has been modified",txt)
                self.assertIn("without inspection and backup",txt)
                self.assertIn("explicit Founder authorization",txt)
                self.assertIn("November 2026",txt)
                self.assertGreater(len(txt.split()),200)
                self.assertNotIn("full-time players",txt.lower())
                self.assertNotIn("part-time players",txt.lower())

    def test_unresolved_april_scorer_goaltender_conflict_remains_held(self):
        april=(ROOT/"review_drafts"/"20250406_HTO_2148163_Preview_NotForPublication.md").read_text(encoding="utf-8")
        self.assertIn("**3–0** result",april)
        self.assertIn("**two goals against**",april)
        self.assertIn("does not establish an empty-net goal",april)
        self.assertIn("No Founder approval to publish",april)

if __name__=="__main__":
    unittest.main()
