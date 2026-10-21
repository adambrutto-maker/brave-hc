"""Fictional discovery/mapping fixtures; no network."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import hockeyos_discovery_review as discovery

def link(gid,extra=""):
    return f'<a href="default.asp?u=BRAVESHOCKEY&amp;s=hockey&amp;gameID={gid}&amp;p=boxscore{extra}">Box</a>'
MAP={101:(359,"2026-09-20"),102:(360,"2026-09-27")}

class DiscoveryReviewTests(unittest.TestCase):
    def test_extracts_relative_official_links_and_deduplicates_repeated_anchors(self):
        links=discovery.parse_boxscore_links(link(101)+link(101)+link(102))
        self.assertEqual(set(links),{101,102})
        self.assertIn("gameID=101",links[101])
    def test_missing_links_and_comment_only_links_hold(self):
        for source in ("<a href='?p=home'>Home</a>","<!--"+link(101)+"-->"):
            with self.assertRaisesRegex(discovery.review.ReviewHold,"NO_OFFICIAL_BOXSCORE_LINKS"):
                discovery.parse_boxscore_links(source)
    def test_foreign_links_are_rejected_not_silently_dropped(self):
        for href in (
            "https://foreign.invalid/teams/default.asp?u=BRAVESHOCKEY&s=hockey&gameID=101&p=boxscore",
            "https://www.htosports.com/teams/default.asp?u=OTHER&s=hockey&gameID=101&p=boxscore",
            "https://www.htosports.com/other.asp?u=BRAVESHOCKEY&s=hockey&gameID=101&p=boxscore"):
            with self.assertRaises(discovery.review.ReviewHold):
                discovery.parse_boxscore_links(f'<a href="{href}">Box</a>')
    def test_duplicate_query_identity_or_href_rejected(self):
        for source in (link(101,"&amp;gameID=102"),'<a href="?p=boxscore" href="?p=home">Box</a>'):
            with self.assertRaises(discovery.review.ReviewHold):discovery.parse_boxscore_links(source)
    def test_invalid_game_ids_rejected(self):
        for gid in ("0","-1","unknown",""):
            with self.assertRaises(discovery.review.ReviewHold):discovery.parse_boxscore_links(link(gid))
    def test_unknown_completed_game_is_never_assigned_sequence_number(self):
        with self.assertRaisesRegex(discovery.review.ReviewHold,"UNMAPPED_COMPLETED_GAMES:103"):
            discovery.reconciliation_plan({101:"url",103:"url"},MAP,2)
    def test_pagination_retains_only_audited_ids_and_requires_reverification(self):
        result=discovery.reconciliation_plan({102:"url"},MAP,2)
        self.assertEqual(result["retainedAuditedGameIds"],[101])
        self.assertEqual(result["gameIdsToReverify"],[101,102])
        self.assertFalse(result["allGamesDiscovered"])
        self.assertFalse(result["coverageVerified"])
        self.assertFalse(result["productionAcceptance"])
        self.assertTrue(result["requiresAllBoxscoresReverified"])
    def test_full_visible_set_still_requires_reverification(self):
        result=discovery.reconciliation_plan({101:"a",102:"b"},MAP,2)
        self.assertTrue(result["allGamesDiscovered"])
        self.assertFalse(result["coverageVerified"])
    def test_team_game_count_mismatch_and_boolean_hold(self):
        for count in (1,3,True,0,"2"):
            with self.assertRaises(discovery.review.ReviewHold):
                discovery.reconciliation_plan({101:"url"},MAP,count)
    def test_invalid_audited_mapping_never_uses_list_order(self):
        for mapping in ({101:(359,"bad")},{101:(359,"2026-09-20"),102:(359,"2026-09-27")},{True:(359,"2026-09-20")}):
            with self.assertRaises(discovery.review.ReviewHold):
                discovery.reconciliation_plan({101:"url"},mapping,len(mapping))
    def test_scores_canonical_unique_and_correct(self):
        good=f'<meta property="og:url" content="{discovery.candidate.SCORE_URL}">'
        self.assertIn("canonicalURL",discovery.validate_scores_content(good))
        for source in ("",good+good,'<meta property="og:url" content="https://www.htosports.com/teams/default.asp?p=home">'):
            with self.assertRaises(discovery.review.ReviewHold):discovery.validate_scores_content(source)
    def test_team_gp_requires_unique_total_and_numeric_field(self):
        self.assertEqual(discovery.season_team_games([["Name","GP"],["Team Stats","4"]]),4)
        for table in ([["Name","GP"],["Player","4"]],[["Name","GP"],["Team Stats","4"],["Team Stats","4"]],[["Name","GP"],["Team Stats","unknown"]]):
            with self.assertRaises(discovery.review.ReviewHold):discovery.season_team_games(table)
    def test_opt_in_required_before_any_fetch(self):
        with patch.object(discovery.review,"fetch_html") as fetch:
            with self.assertRaises(discovery.review.ReviewHold):discovery.main([])
            fetch.assert_not_called()

if __name__=="__main__":unittest.main()
