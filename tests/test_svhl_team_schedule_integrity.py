"""SVHL league/team dual-source and stable fixture identity regression tests.

All providers are simulated. No calendar, HTO, goalie, or league writes.
"""
import importlib.util
import sys
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT=Path(__file__).parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('svhl_hto_reconcile_source_guard',
                                            ROOT/'scripts'/'svhl_hto_reconcile.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
NOW=datetime(2026,11,4,11,0,tzinfo=ZoneInfo('America/Toronto'))


def league_row(day,clock,opponent,opponent_id,rink='A Rink'):
    return (f'<tr><td>{day}</td><td>{clock}</td><td>'
            f'<a href="teaminfo.aspx?leagueid=570&teamid=13679">Braves HC</a> vs. '
            f'<a href="teaminfo.aspx?leagueid=570&teamid={opponent_id}">{opponent}</a>'
            f'</td><td>{rink}</td></tr>')


def team_row(day,clock,opponent,opponent_id,game_id,side='Home'):
    return (f'<tr><td data-label="Date">{day}</td>'
            f'<td data-label="Time">{clock}</td>'
            f'<td data-label="vs. Team">vs. '
            f'<a href="teaminfo.aspx?leagueid=570&teamid={opponent_id}">{opponent}</a></td>'
            f'<td data-label="Home/Visitor">{side}</td>'
            f'<td data-label="Score"><a href="gameinfo.aspx?leagueid=570&gameid={game_id}">'
            f'0 - 0</a></td></tr>')


LEAGUE='<h1>Sunday Winter - 2026/27</h1><table id="ctl00_MainContent_ucSchedule_GridViewSchedule"><tbody>'+''.join([
    league_row('Nov 08, 2026','9:15PM','Other Way','13704','D Rink'),
    league_row('Nov 15, 2026','7:15PM','Sugo Sundays','13709'),
    league_row('Nov 22, 2026','8:00PM','Dateline Predators','13668','B Rink'),
])+'</tbody></table>'
TEAM='<h1>Sunday Winter - 2026/27</h1><table id="ctl00_MainContent_ucTeamSchedules_GridViewTeamSchedule"><tbody>'+''.join([
    team_row('Nov 01, 2026','8:15PM','Mid Ice Crisis','13708','127900','Away'),
    team_row('Nov 08, 2026','9:15PM','Other Way','13704','127954'),
    team_row('Nov 15, 2026','7:15PM','Sugo Sundays','13709','128098'),
    team_row('Nov 22, 2026','8:00PM','Dateline Predators','13668','128129'),
])+'</tbody></table>'

class OfficialSourceIdentityTests(unittest.TestCase):
    def verified(self,league=LEAGUE,team=TEAM):
        return mod.verify_league_team_schedule(
            mod.parse_svhl(league), mod.parse_svhl_team(team), NOW)

    def test_current_division_revision_crosschecks_by_team_id(self):
        verified=self.verified()
        self.assertEqual([r['opponent'] for r in verified],
                         ['Other Way','Sugo Sundays','Dateline Predators'])
        self.assertEqual([r['leagueGameId'] for r in verified],
                         ['127954','128098','128129'])
        self.assertEqual([r['opponentTeamId'] for r in verified],
                         ['13704','13709','13668'])

    def test_team_page_has_history_but_league_schedule_is_upcoming_only(self):
        team=mod.parse_svhl_team(TEAM)
        self.assertEqual(len(team),4)
        self.assertEqual(len(self.verified()),3)
        self.assertEqual(team[0]['opponent'],'Mid Ice Crisis')

    def test_conflicting_opponent_or_division_reassignment_is_held(self):
        team=TEAM.replace('teamid=13709','teamid=13680').replace('Sugo Sundays','Mohawks HC')
        with self.assertRaisesRegex(ValueError,'SVHL league/team schedule conflict'):
            self.verified(team=team)

    def test_changed_time_in_one_page_is_held(self):
        team=TEAM.replace('Nov 15, 2026</td><td data-label="Time">7:15PM',
                          'Nov 15, 2026</td><td data-label="Time">8:15PM')
        with self.assertRaisesRegex(ValueError,'SVHL league/team schedule conflict'):
            self.verified(team=team)

    def test_team_page_removed_fixture_is_held(self):
        team=TEAM.replace(team_row('Nov 22, 2026','8:00PM','Dateline Predators',
                                   '13668','128129'),'')
        with self.assertRaisesRegex(ValueError,'SVHL league/team schedule conflict'):
            self.verified(team=team)

    def test_duplicate_official_game_ids_rejected(self):
        team=TEAM.replace('gameid=128129','gameid=128098')
        with self.assertRaisesRegex(ValueError,'duplicate official game IDs'):
            self.verified(team=team)

    def test_unrelated_featured_result_does_not_duplicate_fixture(self):
        sidebar='<table>'+team_row('Nov 22, 2026','8:00PM','Dateline Predators',
                                    '13668','128129')+'</table>'
        self.assertEqual(len(self.verified(team=sidebar+TEAM)),3)

    def test_visitor_label_maps_to_away_without_false_conflict(self):
        team=mod.parse_svhl_team(TEAM)
        self.assertEqual(team[0]['side'],'away')

    def test_cli_conflict_fails_before_publishing_evidence_files(self):
        import subprocess
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            temp=Path(directory)
            league=temp/'league.html'
            team=temp/'team.html'
            hto=temp/'hto.html'
            out=temp/'output'
            league.write_text(LEAGUE,encoding='utf8')
            team.write_text(TEAM.replace('Sugo Sundays','Mohawks HC'),encoding='utf8')
            hto.write_text('not used',encoding='utf8')
            result=subprocess.run([sys.executable,str(ROOT/'scripts'/'svhl_hto_reconcile.py'),
                '--svhl-file',str(league),'--svhl-team-file',str(team),
                '--hto-file',str(hto),'--out',str(out)],cwd=temp,capture_output=True,
                text=True,timeout=15)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('SVHL league/team schedule conflict',result.stderr)
            self.assertFalse(out.exists())

    def test_changed_id_at_same_slot_never_inherits_old_hto_key(self):
        old={'date':'2026-11-22','time':'20:00','opponent':'Mohawks HC',
             'rink':'B Rink','side':'home','leagueGameId':'199999',
             'assignmentKey':'hto:3375686','htoGameId':'3375686'}
        new={'date':'2026-11-22','time':'20:00','opponent':'Dateline Predators',
             'rink':'B Rink','side':'home','leagueGameId':'128129'}
        prior,changed=mod.prior_for(new,[old],set())
        self.assertIsNone(prior)
        self.assertFalse(changed)

    def test_same_official_id_keeps_key_during_reschedule(self):
        old={'date':'2026-11-15','time':'20:15','opponent':'Dateline Predators',
             'rink':'A Rink','side':'home','leagueGameId':'128129',
             'assignmentKey':'hto:3375685','htoGameId':'3375685'}
        new={'date':'2026-11-22','time':'20:00','opponent':'Dateline Predators',
             'rink':'B Rink','side':'home','leagueGameId':'128129'}
        prior,changed=mod.prior_for(new,[old],set())
        self.assertEqual(prior['assignmentKey'],'hto:3375685')
        self.assertFalse(changed)

    def test_same_league_id_with_opponent_reassignment_requires_identity_review(self):
        old={'date':'2026-11-15','time':'20:15','opponent':'Dateline Predators',
             'rink':'A Rink','side':'home','leagueGameId':'128129',
             'assignmentKey':'hto:3375685','htoGameId':'3375685'}
        new={'date':'2026-11-15','time':'19:15','opponent':'Sugo Sundays',
             'rink':'A Rink','side':'home','leagueGameId':'128129'}
        prior,changed=mod.prior_for(new,[old],set())
        self.assertEqual(prior['assignmentKey'],'hto:3375685')
        self.assertTrue(changed)

if __name__=='__main__':
    unittest.main(verbosity=2)
