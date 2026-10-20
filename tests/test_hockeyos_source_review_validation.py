"""Synthetic security/data-integrity checks for the opt-in review command."""
import importlib.util
from pathlib import Path
from email.message import Message
import unittest

path=Path(__file__).resolve().parents[1]/"scripts"/"hockeyos_review_four_game_source_parity.py"
spec=importlib.util.spec_from_file_location("source_review",path)
review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)

class Response:
    status=200
    def __init__(self,url,body=b"<html></html>",content_type="text/html"):
        self.url=url;self.body=body;self.headers=Message();self.headers["Content-Type"]=content_type
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def geturl(self):return self.url
    def read(self,size):return self.body[:size]

class SourceReviewValidation(unittest.TestCase):
    def setUp(self):
        self.fields={"GP":"gp","GA":"ga"}
        self.table=[["No","Name","GP","GA"],["1","Fictional Alpha","2","3"]]
        self.observations=[{"name":"Fictional Alpha","gp":1,"ga":1},{"name":"Fictional Alpha","gp":1,"ga":2}]
        self.url="https://www.htosports.com/teams/default.asp?p=stats&s=hockey&u=BRAVESHOCKEY"
    def test_import_does_not_start_live_collection(self):
        self.assertTrue(callable(review.main))
    def test_complete_fields_match(self):
        result=review.compare_season(self.table,self.observations,self.fields)
        self.assertEqual(result["completeFieldComparisons"],2)
        self.assertEqual(result["expectedFieldComparisons"],2)
        self.assertEqual(result["discrepancies"],[])
    def test_missing_required_column_cannot_reduce_coverage(self):
        table=[["Name","GP"],["Fictional Alpha","2"]]
        with self.assertRaisesRegex(review.ReviewHold,"MISSING_SEASON_COLUMNS"):
            review.compare_season(table,self.observations,self.fields)
    def test_duplicate_identity_and_malformed_row_are_rejected(self):
        for extra in (["1","Fictional Alpha","2","3"],["2","fictional alpha","2","3"],["2","Other","1"]):
            with self.assertRaises(review.ReviewHold):
                review.compare_season(self.table+[extra],self.observations,self.fields)
    def test_duplicate_header_rejected(self):
        with self.assertRaisesRegex(review.ReviewHold,"DUPLICATE_SEASON_HEADER"):
            review.compare_season([["Name","GP","GA","GA"],["Fictional Alpha","2","3","3"]],self.observations,self.fields)
    def test_missing_or_extra_season_player_rejected(self):
        for table in ([self.table[0],["1","Different","2","3"]],self.table+[["2","Other","0","0"]]):
            with self.assertRaisesRegex(review.ReviewHold,"IDENTITY_COVERAGE"):
                review.compare_season(table,self.observations,self.fields)
    def test_unknown_remains_incomplete_not_zero(self):
        self.observations[1]["ga"]=None
        result=review.compare_season(self.table,self.observations,self.fields)
        self.assertEqual(result["completeFieldComparisons"],1)
        self.assertEqual(result["incompleteFields"][0]["knownSubtotal"],1)
        self.assertEqual(result["incompleteFields"][0]["unknownGames"],1)
    def test_unknown_cannot_hide_excessive_known_subtotal(self):
        self.observations[0]["ga"]=4;self.observations[1]["ga"]=None
        self.assertTrue(review.compare_season(self.table,self.observations,self.fields)["discrepancies"])
    def test_bad_numeric_season_value_rejected(self):
        for bad in ("","unknown","-1","1.5"):
            table=[self.table[0],["1","Fictional Alpha",bad,"3"]]
            with self.assertRaises(review.ReviewHold):
                review.compare_season(table,self.observations,self.fields)
    def test_response_url_identity_and_html_content_type(self):
        self.assertEqual(review.fetch_html(self.url,lambda *a,**k:Response(self.url)),"<html></html>")
        for url,kind in (("http://www.htosports.com/teams/default.asp","text/html"),("https://evil.example/","text/html"),(self.url+"&gameID=999","text/html"),(self.url,"application/json")):
            with self.assertRaises(review.ReviewHold):
                review.fetch_html(self.url,lambda *a,**k:Response(url,content_type=kind))
    def test_response_body_bounded(self):
        with self.assertRaisesRegex(review.ReviewHold,"RESPONSE_TOO_LARGE"):
            review.fetch_html(self.url,lambda *a,**k:Response(self.url,b"x"*(review.MAX_BODY_BYTES+1)))
    def test_explicit_live_flag_required(self):
        with self.assertRaisesRegex(review.ReviewHold,"EXPLICIT_LIVE"):
            review.main([])
    def test_matched_source_review_never_authorizes_production(self):
        from unittest.mock import patch
        from contextlib import redirect_stdout
        from io import StringIO
        import json
        box=[
            [["REGULAR SEASON"],["Brave H.C.","1"],["Fictional Opponent","2"]],
            [["No","Name","POS","","G","A","Pts","+/-","POTG"],["1","Fictional Alpha","F","","1","0","1","0","0"]],
            [["No","Name","","GP","L","GA","GAA","POTG","+/-"],["2","Fictional Goalie","","1","1","2","2.00","0","0"]]]
        season=[
            [["No","Name","POS","GP","G","A","Pts","+/-","POTG"],["1","Fictional Alpha","F","4","4","0","4","0","0"]],
            [["No","Name","GP","L","GA","POTG"],["2","Fictional Goalie","4","4","8","0"]]]
        output=StringIO()
        def fixture(url):
            if "gameID=" in url:
                gid=int(dict(review.parse_qsl(review.urlsplit(url).query))["gameID"])
                return self.metadata(url,review.GAME_DATES[gid])
            return self.metadata(url,title=review.SEASON_TITLE)
        with patch.object(review,"fetch_html",side_effect=fixture), patch.object(review,"parse_tables",side_effect=[box]*4+[season]), redirect_stdout(output):
            result=review.main(["--live-read-only"])
        receipt=json.loads(output.getvalue())
        self.assertEqual(result,0)
        self.assertFalse(receipt["productionAcceptance"])
        self.assertTrue(receipt["sourceContentIdentityVerified"])
        self.assertEqual(receipt["skaters"]["discrepancies"],[])
        self.assertEqual(receipt["goalies"]["discrepancies"],[])

    def metadata(self,url,date=None,title=None):
        from html import escape
        result='<meta property="og:url" content="'+escape(url,quote=True)+'">'
        if date is not None:result+='<div class="gameHeaderDateLocation"><span>'+escape(date)+'</span><span>Ignored rink</span></div>'
        if title is not None:result+='<title>'+escape(title)+'</title>'
        return result
    def game_url(self,gid=3356177):
        return f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
    def test_parsed_canonical_and_first_date_span_match_audited_game(self):
        url=self.game_url()
        result=review.verify_content(self.metadata(url,review.GAME_DATES[3356177]),url,3356177)
        self.assertEqual(result["gameDate"],review.GAME_DATES[3356177])
        self.assertIn("AUDITED",result["seasonBasis"])
    def test_wrong_game_id_in_returned_canonical_is_rejected(self):
        with self.assertRaisesRegex(review.ReviewHold,"CANONICAL_URL_MISMATCH"):
            review.verify_content(self.metadata(self.game_url(3356178),review.GAME_DATES[3356177]),self.game_url(),3356177)
    def test_wrong_date_or_duplicate_date_container_is_rejected(self):
        url=self.game_url();valid=self.metadata(url,review.GAME_DATES[3356177])
        for source in (self.metadata(url,review.GAME_DATES[3356178]),valid+'<div class="gameHeaderDateLocation"><span>'+review.GAME_DATES[3356177]+'</span></div>',self.metadata(url)):
            with self.assertRaisesRegex(review.ReviewHold,"GAME_HEADER_DATE_MISMATCH"):
                review.verify_content(source,url,3356177)
    def test_missing_duplicate_or_comment_canonical_is_rejected(self):
        url=self.game_url();valid=self.metadata(url,review.GAME_DATES[3356177])
        for source in ('<!--'+valid+'-->',valid+valid,'<div class="gameHeaderDateLocation"><span>'+review.GAME_DATES[3356177]+'</span></div>'):
            with self.assertRaisesRegex(review.ReviewHold,"MISSING_OR_DUPLICATE_CANONICAL"):
                review.verify_content(source,url,3356177)
    def test_stats_title_must_be_unique_current_season(self):
        review.verify_content(self.metadata(self.url,title=review.SEASON_TITLE),self.url)
        for source in (self.metadata(self.url,title="Brave H.C. Stats - Winter 2025/2026"),self.metadata(self.url),self.metadata(self.url,title=review.SEASON_TITLE)+"<title>"+review.SEASON_TITLE+"</title>"):
            with self.assertRaisesRegex(review.ReviewHold,"SEASON_TITLE_MISMATCH"):
                review.verify_content(source,self.url)
    def test_misleading_comment_date_cannot_satisfy_game_metadata(self):
        url=self.game_url()
        source=self.metadata(url)+'<!--<div class="gameHeaderDateLocation"><span>'+review.GAME_DATES[3356177]+'</span></div>-->'
        with self.assertRaisesRegex(review.ReviewHold,"GAME_HEADER_DATE_MISMATCH"):
            review.verify_content(source,url,3356177)
    def test_game_outside_audited_map_is_rejected(self):
        url=self.game_url(123)
        with self.assertRaisesRegex(review.ReviewHold,"AUDITED_DATE_MAP"):
            review.verify_content(self.metadata(url,"Sunday, Sep 20, 2026"),url,123)

if __name__=="__main__":unittest.main()
