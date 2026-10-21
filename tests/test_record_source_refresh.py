import copy
from html import escape
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
import refresh_record_sources as refresh

FIXTURES = Path(__file__).parent/'fixtures'

class SourceRefreshTests(unittest.TestCase):
    def setUp(self):
        self.history = json.loads((refresh.ROOT/'widgets/history-records.json').read_text())
        self.book = json.loads((refresh.ROOT/'widgets/player-record-book.json').read_text())

    def test_completed_schedule_only(self):
        rows = refresh.parse_schedule((FIXTURES/'record-refresh-schedule.html').read_text(), refresh.BASE, 'Winter 2026/2027')
        self.assertEqual([refresh.game_id(r['href']) for r in rows], ['3356177','3356178','3369564','3375601'])

    def test_public_boxscore_capture(self):
        row = dict(href=refresh.BASE+'?u=BRAVESHOCKEY&p=boxscore&gameID=3356177', text='9/20/26 L 3 - 0', season='Winter 2026/2027')
        game = refresh.parse_boxscore((FIXTURES/'record-refresh-boxscore.html').read_text(), row)
        self.assertIn('REGULAR SEASON',game['heading'])
        self.assertTrue(any(r['players'] for t in game['tables'] for r in t['rows']))

    def test_incomplete_pages_rejected(self):
        with self.assertRaises(ValueError): refresh.parse_schedule('<html>Unavailable</html>',refresh.BASE,'Winter 2026/2027')
        with self.assertRaises(ValueError): refresh.parse_boxscore('<html>Unavailable</html>',dict(href=refresh.BASE,text='9/20/26'))
        with self.assertRaises(ValueError): refresh.parse_records('<html>Unavailable</html>')

    def test_complete_record_page_round_trip(self):
        html = '<div class="pageModCol">'
        for group in self.history['groups']:
            html += '<div class="modGroupAboveHeadingMain">'+escape(group['section'])+'</div>'
            html += '<div class="modGroupAboveHeading">'+escape(group['category'])+'</div>'
            html += '<div class="modGroupWrapper"><div class="modGroupSubHeading">'+escape(group['period'])+'</div><div class="modGroupDetailsWrapper">'
            html += ''.join('<div class="modGroupItem">'+escape(item)+'</div>' for item in group['items'])
            html += '</div></div>'
        groups = refresh.parse_records(html+'</div>')
        self.assertEqual(refresh.inventory(groups),refresh.inventory(self.history['groups']))

    def test_unmodified_book_retains_metadata(self):
        history,book = refresh.sync_published(self.history,self.book,copy.deepcopy(self.history['groups']),'later')
        self.assertEqual(history,self.history)
        self.assertEqual(book,self.book)

    def test_historical_removal_rejected(self):
        groups=copy.deepcopy(self.history['groups']); groups[0]['items'].pop()
        with self.assertRaises(ValueError): refresh.sync_published(self.history,self.book,groups,'later')

    def test_verified_identity_addition_preserves_existing_entries(self):
        pid,p=next(iter(self.book['players'].items()))
        groups=copy.deepcopy(self.history['groups'])
        groups.append(dict(section='Individual Records',category='Future Test',period='Game',items=[f"9 - {p['name']} (October 20, 2026)"]))
        history,book=refresh.sync_published(self.history,self.book,groups,'later')
        self.assertEqual(history['entryCount'],self.history['entryCount']+1)
        self.assertEqual(book['players'][pid]['entries'][:-1],p['entries'])
        self.assertEqual(book['players'][pid]['entries'][-1]['value'],'9')

    def test_unknown_identity_rejected(self):
        groups=copy.deepcopy(self.history['groups'])
        groups.append(dict(section='Individual Records',category='Future Test',period='Game',items=['9 - Unverified Person (October 20, 2026)']))
        with self.assertRaises(ValueError): refresh.sync_published(self.history,self.book,groups,'later')

    def test_utf8_html_preserves_accented_record_names(self):
        html = '<meta charset="utf-8"><div class="pageModCol">'
        for section in ('Individual Records','Team Records'):
            html += '<div class="modGroupAboveHeadingMain">'+section+'</div><div class="modGroupAboveHeading">Goals</div><div class="modGroupWrapper"><div class="modGroupSubHeading">Game</div><div class="modGroupDetailsWrapper"><div class="modGroupItem">2 - Rènt Goaliê (2016)</div></div></div>'
        groups = refresh.parse_records((html+'</div>').encode('utf-8'))
        self.assertEqual(groups[0]['items'][0],'2 - Rènt Goaliê (2016)')

    def test_history_source_refresh_disclosure(self):
        self.assertIn('Scheduled refresh', self.history['stalePolicy'])
        self.assertIn('manual review', self.history['stalePolicy'])
        self.assertIn('HTO', self.history['stalePolicy'])

    def test_transient_non_html_source_retries_and_preserves_bytes(self):
        from types import SimpleNamespace
        class Session:
            def __init__(self):
                self.calls = []
                self.responses = [
                    SimpleNamespace(status_code=200, headers={'Content-Type':'text/plain'}, content=b'Service temporarily unavailable'),
                    SimpleNamespace(status_code=200, headers={'Content-Type':'text/html; charset=utf-8'}, content=b'<html>R\\xc3\\xa8nt Goali\\xc3\\xaa</html>'),
                ]
            def get(self, url, **kwargs):
                self.calls.append(kwargs)
                return self.responses.pop(0)
        session=Session()
        delays=[]
        data=refresh.fetch(session,refresh.RECORDS,sleep_fn=delays.append)
        self.assertEqual(data,b'<html>R\\xc3\\xa8nt Goali\\xc3\\xaa</html>')
        self.assertEqual(len(session.calls),2)
        self.assertEqual(delays,[1])
        self.assertTrue(all(x['allow_redirects'] is False for x in session.calls))

    def test_persistent_wrong_content_type_stays_failed(self):
        from types import SimpleNamespace
        class Session:
            def __init__(self): self.attempts=0
            def get(self, url, **kwargs):
                self.attempts+=1
                return SimpleNamespace(status_code=200,headers={'Content-Type':'text/plain'},content=b'not HTO HTML')
        s=Session()
        with self.assertRaisesRegex(ValueError,'Unexpected HTO response: .*responseSHA256.*attempts'):
            refresh.fetch(s,refresh.RECORDS,sleep_fn=lambda _:None)
        self.assertEqual(s.attempts,3)

    def test_redirect_never_retried_or_followed(self):
        from types import SimpleNamespace
        class Session:
            def __init__(self):self.attempts=0
            def get(self, url, **kwargs):
                self.assert_false=kwargs['allow_redirects'] is False
                self.attempts+=1
                return SimpleNamespace(status_code=302,headers={'Content-Type':'text/html'},content=b'')
        s=Session()
        with self.assertRaisesRegex(ValueError,'Unexpected HTO response'):
            refresh.fetch(s,refresh.RECORDS,sleep_fn=lambda _:None)
        self.assertTrue(s.assert_false)
        self.assertEqual(s.attempts,1)

    def test_403_denial_never_downgraded_to_success(self):
        from types import SimpleNamespace
        class Session:
            def __init__(self):self.attempts=0
            def get(self, url, **kwargs):
                self.attempts+=1
                return SimpleNamespace(status_code=403,headers={'Content-Type':'text/html'},content=b'<html>denied</html>')
        s=Session()
        with self.assertRaisesRegex(ValueError,'Unexpected HTO response'):
            refresh.fetch(s,refresh.RECORDS,sleep_fn=lambda _:None)
        self.assertEqual(s.attempts,1)

    def test_retry_bound_cannot_be_bypassed(self):
        with self.assertRaisesRegex(ValueError,'Invalid bounded'):
            refresh.fetch(None,refresh.RECORDS,max_attempts=30)

    def test_non_htos_scheme_is_rejected_before_get(self):
        with self.assertRaisesRegex(ValueError,'Unexpected source host or path'):
            refresh.fetch(None,'http://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&p=records')

    def test_source_host_restricted(self):
        with self.assertRaises(ValueError): refresh.game_id('https://example.com/teams/default.asp?u=BRAVESHOCKEY&p=boxscore&gameID=1')

if __name__=='__main__': unittest.main()
