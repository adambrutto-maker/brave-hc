import importlib.util
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
path=Path(__file__).parents[1]/'scripts/svhl_hto_reconcile.py'
spec=importlib.util.spec_from_file_location('reconcile',path)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
svhl='''<h1>Sunday Winter - 2026/27</h1><table id="ctl00_MainContent_ucSchedule_GridViewSchedule"><tbody><tr><td>Oct 25, 2026</td><td>6:15PM</td><td><a href="?teamid=13679">Braves HC</a> vs. <a href="?teamid=13649">Big Bastones</a></td><td>A Rink</td></tr><tr><td>Nov 01, 2026</td><td>8:15PM</td><td><a href="?teamid=13708">Mid Ice Crisis</a> vs. <a href="?teamid=13679">Braves HC</a></td><td>D Rink</td></tr></tbody></table>'''
hto='''<table><tbody><tr id="schedRow3375682" class="game"><td class="dateCell">Sun, 10/25/26</td><td class="timeCell">6:15 pm</td><td class="opponentCell">Big Bastones</td><td class="locationCell">Vaughan Sports Village - A Rink</td></tr><tr id="schedRow3375683" class="game"><td class="dateCell">Sun, 11/1/26</td><td class="timeCell">8:15 pm</td><td class="opponentCell">@ Mid Ice Crisis</td><td class="locationCell">Vaughan Sports Village - D Rink</td></tr><tr id="schedRow3356166" class="event"><td class="dateCell">Sun, 11/22/26</td></tr></tbody></table>'''
s=m.parse_svhl(svhl)
h=m.parse_hto(hto)
assert len(s)==len(h)==2
now=datetime(2026,10,19,14,0,tzinfo=ZoneInfo('America/Toronto'))
f,q=m.reconcile(s,h,now)
assert [x['htoSyncStatus'] for x in f]==['MATCH','MATCH']
assert [x['assignmentKey'] for x in f]==['hto:3375682','hto:3375683']
s[1]['time']='21:15'
f,q=m.reconcile(s,h,now)
assert f[1]['htoSyncStatus']=='EDIT_HTO' and f[1]['requiresGoalieReconfirmation']
s[1]['date']='2026-11-02'
f,q=m.reconcile(s,h,now)
assert f[1]['htoSyncStatus']=='REVIEW_RESCHEDULE' and f[1]['assignmentKey']=='hto:3375683'
s.append(dict(date='2026-12-06',time='18:15',opponent='Test Rival',rink='A Rink',side='home'))
f,q=m.reconcile(s,h,now)
assert f[-1]['htoSyncStatus']=='ADD_HTO'
try: m.parse_svhl('<html>no schedule</html>')
except ValueError: pass
else: raise AssertionError('Expected blocked empty source')
print('PASS: parse, stable goalie keys, change classification, new games, safety')
