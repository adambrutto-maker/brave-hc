"""Reconstruct milestone dates; keep source conflicts and incomplete coverage explicit."""
import collections
import datetime as dt
import json
import re
from reconcile_record_book import DIR, ROOT, date_of, observations, load_evidence

evidence = load_evidence()
book = json.loads((ROOT / 'widgets/player-record-book.json').read_text())
reconciliation = json.loads((DIR / '261020_Game_Record_Reconciliation.json').read_text())
captured = {g['url'] for g in evidence['games']}
missing = {}
season_starts = {}
for season in evidence['schedules']:
    dates = [date_of({'schedule':link}) for link in season['links']]
    if dates:
        season_starts[season['season']] = min(d for d in dates if d)
    for link in season['links']:
        if link['href'] not in captured:
            missing[link['href']] = {'schedule':link}
daily = collections.defaultdict(lambda:collections.Counter())
for game in evidence['games']:
    date = date_of(game)
    appearances = set()
    for pid,row in observations(game):
        if 'POS' in row or float(row.get('GP') or 0) > 0:
            appearances.add(pid)
        for stat in ('Pts','W'):
            if stat in row:
                daily[(pid,date)][stat] += float(row[stat] or 0)
    for pid in appearances:
        daily[(pid,date)]['GP'] += 1
checks = []
for pid,player in book['players'].items():
    for entry in player['entries']:
        if entry['kind'] != 'milestone':continue
        threshold = int(re.match(r'\d+',entry['category'])[0])
        stat = 'GP' if 'Game Club' in entry['category'] else 'Pts' if 'Point Club' in entry['category'] else 'W'
        recorded = dt.datetime.strptime(entry['dateLabel'],'%B %d, %Y').date()
        cumulative, reconstructed = 0,None
        for (p,date),values in sorted(daily.items(),key=lambda pair:pair[0][1]):
            if p != pid:continue
            cumulative += values[stat]
            if cumulative >= threshold:
                reconstructed = date
                break
        cutoff = max(recorded,reconstructed or recorded)
        recorded_total=sum(values[stat] for (p,date),values in daily.items() if p==pid and date<=recorded)
        prior_total=sum(values[stat] for (p,date),values in daily.items() if p==pid and reconstructed and date<reconstructed)
        reached_total=sum(values[stat] for (p,date),values in daily.items() if p==pid and reconstructed and date<=reconstructed)
        missing_before = [g for g in missing.values() if date_of(g) and date_of(g)<=cutoff]
        role_stat_conflicts = [c for c in reconciliation['seasonLedgerChecks'] if c['playerID']==pid and stat in c['differences'] and season_starts.get(c['season'],dt.date.min)<=cutoff]
        milestone_games=[g['url'] for g in evidence['games'] if date_of(g)==reconstructed and any(p==pid for p,row in observations(g))]
        check = dict(entry,playerID=pid,name=player['name'],statKey=stat,threshold=threshold,reconstructedDate=str(reconstructed) if reconstructed else None,totalOnRecordedDate=recorded_total,totalBeforeReconstructedDate=prior_total,totalOnReconstructedDate=reached_total,milestoneGameSources=milestone_games,missingBoxscoresBeforeCutoff=len(missing_before),seasonStatConflicts=role_stat_conflicts)
        if missing_before:
            check['status']='PENDING_MISSING_GAME_COVERAGE'
        elif role_stat_conflicts:
            check['status']='PENDING_SEASON_STAT_RECONCILIATION'
        elif not reconstructed:
            check['status']='THRESHOLD_NOT_REACHED_IN_CAPTURED_LEDGER'
        else:
            check['status']='MATCH' if reconstructed==recorded else 'DATE_DISCREPANCY'
        checks.append(check)
result = {'status':'AUDIT_ONLY_NATIVE_HTO_UNCHANGED','method':'Chronological cumulative points and goalie wins; GP is unique player presence per official boxscore, subject to published season GP validation. Both regular season and playoffs included. Same-day games retained individually, dates reported at daily precision. Empty forfeit boxscores do not fabricate participation.','counts':dict(collections.Counter(c['status'] for c in checks)),'entries':checks}
(DIR / '261020_Milestone_Date_Reconciliation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result['counts']))
