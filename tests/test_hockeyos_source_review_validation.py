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
    def test_main_never_advertises_acceptance(self):
        source=path.read_text()
        self.assertIn('"productionAcceptance":False',source)
        self.assertIn('HOLD_UNVERIFIED_GAME_DATE_SEASON_CONTENT',source)
if __name__=="__main__":unittest.main()
