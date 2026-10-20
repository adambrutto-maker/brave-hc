"""Reconcile captured public boxscores without changing published records."""
import collections
import datetime as dt
import json
import pathlib
import re
from urllib.parse import parse_qs, urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIR = ROOT / 'docs/hto-highlights-rollout'
ADDITIVE_STATS = ['GP','G','A','Pts','W','GA','PIM','SHG','PPG','GWG','GTG','POTG','HAT','SHO']

def load_evidence():
    evidence = json.loads((DIR / '261020_Game_Level_Readbacks.json').read_text())
    games = {game['url']:game for game in evidence['games']}
    for batch in sorted((DIR / 'game-audit-evidence').glob('261020_Continued_Boxscores_*.json')):
        for game in json.loads(batch.read_text())['games']:
            games[game['url']] = game
    evidence['games'] = list(games.values())
    index_path = DIR / '261020_Historical_Boxscore_Index.json'
    if index_path.exists():
        index = json.loads(index_path.read_text())
        evidence['schedules'] = [{'season':season['season'],'url':season['sourceURL'],'links':[dict(games[url]['schedule'],href=url) if url in games else {'href':url,'text':''} for url in season['boxscoreURLs']]} for season in index['seasons']]
    return evidence

def date_of(game):
    match = re.search(r'\b(\d{1,2}/\d{1,2}/\d{2})\b', game['schedule']['text'])
    return dt.datetime.strptime(match[1], '%m/%d/%y').date() if match else None

def observations(game):
    for table in game['tables']:
        header = table['rows'][0]['cells']
        if 'Name' not in header:
            continue
        for row in table['rows'][1:]:
            if len(row['players']) != 1 or len(row['cells']) != len(header):
                continue
            player = row['players'][0]
            pid = parse_qs(urlparse(player['href']).query)['playerID'][0]
            yield pid, dict(zip(header, row['cells']))

def run():
    evidence = load_evidence()
    book = json.loads((ROOT / 'widgets/player-record-book.json').read_text())
    by_date = collections.defaultdict(list)
    for g in evidence['games']:
        by_date[date_of(g)].append(g)
    checks = []
    for pid, player in book['players'].items():
        for entry in player['entries']:
            if entry['scope'] != 'Game':
                continue
            date = dt.datetime.strptime(entry['dateLabel'], '%B %d, %Y').date()
            stat = {'Goals':'G','Points':'Pts','Assists':'A','Penalty Minutes':'PIM'}[entry['category'].split(' - ')[1]]
            games = by_date[date]
            found = [(g, r) for g in games for p, r in observations(g) if p == pid and stat in r]
            check = dict(entry, playerID=pid, name=player['name'], statKey=stat)
            check['boxscores'] = [{'url':g['url'], 'value':r[stat], 'season':g['schedule']['season'], 'gameType': 'Playoffs' if 'PLAYOFFS' in g['heading'] else 'Regular Season' if 'REGULAR SEASON' in g['heading'] else 'UNRESOLVED'} for g,r in found]
            if not games:
                check['status'] = 'BOXScore_NOT_CAPTURED'
            elif not found:
                check['status'] = 'PLAYER_OR_STAT_MISSING'
            elif len(found) != 1:
                check['status'] = 'MULTIPLE_GAMES_REQUIRE_DISAMBIGUATION'
            else:
                check['status'] = 'MATCH' if float(found[0][1][stat]) == float(entry['value']) else 'DISCREPANCY'
            checks.append(check)
    # Reconcile observed game participation against each published season/type table.
    # A row alone is insufficient to certify GP until season totals agree.
    season_audit = json.loads((DIR / '261020_Historical_Record_Book_Audit.json').read_text())
    sums = collections.defaultdict(lambda: collections.Counter())
    for game in evidence['games']:
        kind = 'Playoffs' if 'PLAYOFFS' in game['heading'] else 'Regular Season' if 'REGULAR SEASON' in game['heading'] else 'UNRESOLVED'
        for pid, row in observations(game):
            role = 'skater' if 'POS' in row else 'goalie'
            key = (game['schedule']['season'],kind,pid,role)
            for stat in ADDITIVE_STATS:
                if stat in row:
                    try:sums[key][stat] += float(row[stat])
                    except ValueError:pass
            if role == 'skater':
                sums[key]['GP'] += 1
    coverage = []
    for source in season_audit['validatedReadbacks']:
        season, kind = source['season']['label'], source['type']['label'].split(':')[0].strip()
        for table in source['tables']:
            headers = table['headers'][-1]
            role = 'goalie' if 'GAA' in headers else 'skater'
            for row in table['rows']:
                if not row.get('profile'):
                    continue
                pid = parse_qs(urlparse(row['profile']).query)['playerID'][0]
                stats = dict(zip(headers,row['cells']))
                actual = sums[(season,kind,pid,role)]
                differences = {}
                for stat in ADDITIVE_STATS:
                    if stat not in stats:continue
                    try:expected=float(stats[stat])
                    except ValueError:continue
                    if actual[stat] != expected: differences[stat]={'published':expected,'capturedGames':actual[stat]}
                coverage.append({'season':season,'gameType':kind,'playerID':pid,'role':role,'status':'MATCH' if not differences else 'INCOMPLETE_OR_DIFFERENT','differences':differences})
    result = {'capturedBoxscores':len(evidence['games']), 'indexedBoxscores':len({l['href'] for s in evidence['schedules'] for l in s['links']}), 'gameEntryCounts':dict(collections.Counter(c['status'] for c in checks)), 'gameEntries':checks, 'seasonLedgerCounts':dict(collections.Counter(c['status'] for c in coverage)), 'seasonLedgerChecks':coverage, 'milestoneStatus':'PENDING_COMPLETE_GAME_LEDGER_AND_SEASON_GP_VALIDATION', 'nativeHTOChanges':0}
    (DIR / '261020_Game_Record_Reconciliation.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k not in ('gameEntries','seasonLedgerChecks')}, indent=2))

if __name__ == '__main__':
    run()
