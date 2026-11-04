"""Fail-closed checks for the published native HTO historical-link index."""
import json
import unittest
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "widgets" / "hot-stove-native-history.json"
EVIDENCE = ROOT / "docs" / "editorial" / "native_hto" / "2025-26" / "261103_Historical_Native_HTO_24_Recap_Publication_Verification.json"

class NativeHistoryDiscoveryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = json.loads(INDEX.read_text(encoding="utf-8"))
        cls.receipt = json.loads(EVIDENCE.read_text(encoding="utf-8"))

    def test_verified_24_game_release_only(self):
        self.assertEqual(self.index["schema"], "brave-hc-hot-stove-native-history/v1")
        self.assertEqual(self.index["team"], "Brave H.C.")
        self.assertEqual(self.index["season"], "Winter_2025/2026")
        self.assertEqual(self.index["editorialState"], "PUBLIC_HTO_RETROSPECTIVE_LINKS_ONLY")
        self.assertEqual(self.index["verificationStatus"], "ALL_24_PUBLISHED_AND_INDEPENDENTLY_VERIFIED")
        self.assertEqual(self.receipt["totals"]["publishedAndVerified"], 24)
        self.assertEqual(len(self.index["games"]), 24)
        self.assertEqual(self.index["verifiedAtUTC"], self.receipt["verifiedAtUTC"])

    def test_exact_receipt_parity(self):
        approved={g["gameId"]:g for g in self.receipt["games"]}
        self.assertEqual({g["gameId"] for g in self.index["games"]},set(approved))
        for item in self.index["games"]:
            with self.subTest(id=item["gameId"]):
                original=approved[item["gameId"]]
                self.assertEqual((item["date"],item["title"],item["url"]),
                                 (original["date"],original["title"],original["liveHTOURL"]))
                self.assertEqual(original["http"],200)
                self.assertGreater(original["storyBlocks"],0)

    def test_no_forfeit_or_duplicate_ids(self):
        ids=[g["gameId"] for g in self.index["games"]]
        self.assertEqual(len(ids),len(set(ids)))
        self.assertFalse(set(ids)&{2215007,2215009,2215012})

    def test_official_exact_game_urls(self):
        for game in self.index["games"]:
            with self.subTest(id=game["gameId"]):
                parsed=urlparse(game["url"])
                p=parse_qs(parsed.query)
                self.assertEqual((parsed.scheme,parsed.netloc,parsed.path),
                                 ("https","www.htosports.com","/teams/default.asp"))
                for key,expected in [("u","BRAVESHOCKEY"),("sportsHQ","BRAVESHOCKEY"),
                    ("gameID",str(game["gameId"])),("p","boxscore"),("archTog","1"),
                    ("viewseas","Winter_2025/2026")]:
                    self.assertEqual(p.get(key),[expected])

    def test_reverse_chronological_season_discovery(self):
        items=self.index["games"]
        self.assertEqual(items,sorted(items,key=lambda g:(g["date"],g["gameId"]),reverse=True))
        self.assertTrue(all(g["date"][:4] in ("2025","2026") for g in items))

    def test_browser_gate_remains_source_limited(self):
        js=(ROOT/"widgets"/"hot-stove.js").read_text(encoding="utf-8")
        self.assertIn('await loadNativeHistory();',js)
        self.assertIn('source.games.length!==24',js)
        self.assertIn('target.searchParams.get("gameID")!==String(g.gameId)',js)
        self.assertIn('target.searchParams.get("viewseas")!=="Winter_2025/2026"',js)
        self.assertIn('nativeHistory.games',js)
        self.assertIn('function archive(section){',js)
        self.assertIn('Latest recap',js)
        self.assertIn('Next game',js)
        self.assertIn('Back to archive',js)

    def test_link_only_does_not_serialize_unapproved_articles(self):
        for g in self.index["games"]:
            self.assertEqual(set(g),{"gameId","date","title","url"})
        source=(ROOT/"widgets"/"hot-stove.html").read_text(encoding="utf-8")
        self.assertIn('data-feed="./hot-stove-approved.json"',source)
        css=(ROOT/"widgets"/"hot-stove.css").read_text(encoding="utf-8")
        self.assertIn("Season-grouped native HTO discovery",css)
        self.assertIn(".native-season-archive",css)

    def test_three_official_forfeit_wins_are_separate_from_recap_stories(self):
        fs=self.index["officialAdministrativeResults"]
        self.assertEqual(len(fs),3)
        self.assertEqual({g["htoGameId"] for g in fs},{2215007,2215009,2215012})
        self.assertFalse({g["htoGameId"] for g in fs}&{g["gameId"] for g in self.index["games"]})
        self.assertEqual(self.index["officialAdministrativeResultsSource"]["authority"],
                         "SVHL_LEAGUE_FINAL_HOME_FIRST_VISITOR_SECOND")
        self.assertIn("/pull/206",self.index["officialAdministrativeResultsSource"]["sourcePR"])
        for f in fs:
            with self.subTest(game=f["htoGameId"]):
                self.assertEqual(f["classification"],"OFFICIAL_LEAGUE_1_0_FORFEIT_WIN_UNPLAYED")
                self.assertEqual(f["officialLeagueFinalBravesFirst"],{"braves":1,"opponent":0,"result":"W"})
                self.assertIn(f["bravesHomeAway"],("HOME","VISITOR"))
                shown=f["leagueDisplayedHomeVisitor"]
                self.assertEqual((shown["home"],shown["visitor"]),
                                 (1,0) if f["bravesHomeAway"]=="HOME" else (0,1))
                self.assertNotIn("article",f)
                self.assertNotIn("recapText",f)

    def test_forfeit_links_preserve_official_league_and_original_hto(self):
        for f in self.index["officialAdministrativeResults"]:
            with self.subTest(game=f["htoGameId"]):
                league=urlparse(f["officialLeagueURL"])
                params=parse_qs(league.query)
                self.assertEqual((league.scheme,league.hostname,league.path),
                                 ("https","leagues.sportsvillage.ca","/gameinfo.aspx"))
                self.assertEqual(params["leagueid"],["547"])
                self.assertEqual(params["gameid"],[str(f["svhlGameId"])])
                hto=urlparse(f["originalHTOURL"])
                orig=parse_qs(hto.query)
                self.assertEqual((hto.scheme,hto.hostname,hto.path),
                                 ("https","www.htosports.com","/teams/default.asp"))
                self.assertEqual(orig["gameID"],[str(f["htoGameId"])])
                self.assertEqual(orig["viewseas"],["Winter_2025/2026"])
                self.assertEqual(orig["p"],["boxscore"])

    def test_archive_browser_guard_is_explicitly_administrative_not_played(self):
        js=(ROOT/"widgets"/"hot-stove.js").read_text(encoding="utf-8")
        css=(ROOT/"widgets"/"hot-stove.css").read_text(encoding="utf-8")
        self.assertIn('source.officialAdministrativeResults.length!==3',js)
        self.assertIn('seenForfeits.size!==3',js)
        self.assertIn('source.officialAdministrativeResultsSource?.authority',js)
        self.assertIn('official?.braves!==1||official?.opponent!==0',js)
        self.assertIn('nativeHistory.officialAdministrativeResults',js)
        self.assertIn('Official administrative results · 3 forfeit wins',js)
        self.assertIn('forfeited, not played',js)
        self.assertIn(".native-forfeit-results",css)
        self.assertIn(".native-forfeit-row",css)

if __name__=="__main__":
    unittest.main()
