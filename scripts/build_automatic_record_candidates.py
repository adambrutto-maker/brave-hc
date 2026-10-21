"""Recompute review-only record candidates from captured HTO boxscores.

Run after refreshing the evidence. Does not publish records or schedule jobs.
"""
import collections
import json
import re
from reconcile_record_book import DIR, date_of, load_evidence, observations


def score(game):
    lines = [x.strip() for x in game['heading'].split('SCORE BOARD\n', 1)[1].splitlines() if x.strip()]
    headers = lines[1].split('\t')
    teams = [(lines[i], dict(zip(headers, map(int, lines[i + 1].split('\t'))))) for i in (2, 4)]
    ours = next(s for name, s in teams if name.startswith('Brave H.C.'))
    opponent, theirs = next((name, s) for name, s in teams if not name.startswith('Brave H.C.'))
    continuation = all(ours.get(p, 0) == theirs.get(p, 0) == 0 for p in ('1', '2', '3')) and any(ours.get(p, 0) or theirs.get(p, 0) for p in ('OT', '2OT', 'SO'))
    return ours['F'], theirs['F'], opponent, continuation


def maximum(rows, key):
    highest = max(r[key] for r in rows)
    return highest, [r for r in rows if r[key] == highest]


def build():
    games = load_evidence()['games']
    index = json.loads((DIR/'261020_Historical_Boxscore_Index.json').read_text())
    indexed_urls = {url for season in index['seasons'] for url in season['boxscoreURLs']}
    actual_urls = {g['url'] for g in games}
    if indexed_urls != actual_urls or len(actual_urls) != len(games):
        raise ValueError('Game evidence must cover the complete index exactly once before recalculating records.')
    team, players, exclusions = [], [], []
    for game in sorted(games, key=lambda g: (date_of(g), g['url'])):
        season = game['schedule']['season']
        if 'PLAYOFFS' not in game['heading'] and 'REGULAR SEASON' not in game['heading']:
            raise ValueError('Unknown game phase: '+game['url'])
        scope = 'Playoffs' if 'PLAYOFFS' in game['heading'] else 'Regular Season'
        result = re.search(r'\b([WLT])\s+(?:Forfeit|\d)', game['schedule']['text'])[1]
        gf, ga, opponent, continuation = score(game)
        base = dict(season=season, seasonType=season.split()[0], scope=scope, date=str(date_of(game)), sourceURL=game['url'])
        if not game['tables']:
            exclusions.append(dict(base, reason='ADMINISTRATIVE_DEFAULT_OR_FORFEIT'))
            team.append(dict(base, excluded=True, result=result))
            continue
        rows = list(observations(game))
        pim = sum(float(r.get('PIM') or 0) for _, r in rows)
        team.append(dict(base, GF=gf, GA=ga, margin=gf-ga, combinedGoals=gf+ga, PIM=pim, opponent=opponent, result=result, excluded=continuation))
        if continuation:
            exclusions.append(dict(base, reason='POSSIBLE_STANDALONE_OT_OR_SHOOTOUT_ENTRY'))
        for pid, row in rows:
            if 'POS' not in row or continuation:
                continue
            players.append(dict(base, playerID=pid, name=row['Name'], **{k: float(row.get(k) or 0) for k in ('G', 'A', 'Pts', 'PIM')}))

    candidates = []
    def add(identifier, label, rows, key, existing=False, rule=''):
        if not rows:
            return
        value, leaders = maximum(rows, key)
        candidates.append(dict(id=identifier, label=label, value=value, holders=leaders,
            existingCategoryComparison=existing, status='REVIEW_ONLY_HIGHEST_OBSERVED', definition=rule,
            qualification='Based on published recorded data; missing historical stats can conceal ties or a higher performance.'))

    achievements = [('two_goal_games', 'Games with at least two goals', 'G', 2),
                    ('hat_trick_games', 'Hat-trick games', 'G', 3),
                    ('three_point_games', 'Games with at least three points', 'Pts', 3),
                    ('three_assist_games', 'Games with at least three assists', 'A', 3)]
    for season_type in ('Summer', 'Winter'):
        for scope in ('Regular Season', 'Playoffs'):
            prefix = season_type.lower() + '_' + scope.lower().replace(' ', '_')
            selected = [g for g in team if g['seasonType'] == season_type and g['scope'] == scope and not g['excluded']]
            skaters = [r for r in players if r['seasonType'] == season_type and r['scope'] == scope]
            for label, stat, eligible, rule in [
                ('Most team goals in a game', 'GF', selected, 'Published final team score; excludes administrative defaults and possible standalone deciding entries.'),
                ('Largest winning margin', 'margin', [g for g in selected if g['result'] == 'W'], 'Final GF minus GA for a played win; no default wins.'),
                ('Largest losing margin', 'lossMargin', [dict(g, lossMargin=g['GA']-g['GF']) for g in selected if g['result'] == 'L'], 'Final GA minus GF for a played loss; analytical record, not a player highlight.'),
                ('Most combined goals in a game', 'combinedGoals', selected, 'Both teams final goals added together.'),
                ('Most team penalty minutes in a game', 'PIM', selected, 'Recorded assessed skater plus goalie PIM; a server does not receive the goalie penalty again.'),
            ]:
                add(prefix + '_team_' + stat, label, eligible, stat, rule=rule)
            for stat, label in [('G', 'Goals'), ('A', 'Assists'), ('Pts', 'Points'), ('PIM', 'Penalty minutes')]:
                add(prefix + '_player_game_' + stat, 'Player ' + label.lower() + ' in a game', skaters, stat, True,
                    'Compare recorded player game totals with the existing archive; splitting regular season/playoffs creates an optional separate category, not a missing overall record.')
            for code, label, stat, threshold in achievements:
                counts = collections.defaultdict(list)
                for row in skaters:
                    if row[stat] >= threshold:
                        counts[(row['season'], row['playerID'], row['name'])].append(row)
                totals = [dict(season=s, playerID=p, name=n, count=len(rs), dates=[r['date'] for r in rs], sourceURLs=[r['sourceURL'] for r in rs]) for (s,p,n),rs in sorted(counts.items())]
                add(prefix + '_season_' + code, label + ' in one season', totals, 'count', existing=(code == 'hat_trick_games'), rule=f'Count recorded games with {stat} >= {threshold} for each player within one season and phase; retain every tie. Hat tricks count qualifying games, not sets of three goals.')

        # Restrict streaks to one regular season. A default breaks the run.
        for kind in ('wins', 'points'):
            runs = []
            for season in sorted({g['season'] for g in team if g['seasonType'] == season_type}):
                current = []
                for game in [g for g in team if g['season'] == season and g['scope'] == 'Regular Season']:
                    qualifies = not game['excluded'] and (game['result'] == 'W' if kind == 'wins' else game['result'] in ('W','T'))
                    if qualifies:
                        current.append(game)
                    elif current:
                        runs.append(dict(season=season, length=len(current), start=current[0]['date'], end=current[-1]['date'], sourceURLs=[g['sourceURL'] for g in current])); current=[]
                if current:
                    runs.append(dict(season=season, length=len(current), start=current[0]['date'], end=current[-1]['date'], sourceURLs=[g['sourceURL'] for g in current]))
            add(season_type.lower()+'_regular_season_streak_'+kind, 'Longest regular-season '+('winning' if kind=='wins' else 'point')+' streak', runs, 'length', rule='Within one published regular season only; ties end winning streaks, losses end point streaks, and defaults break both. No cross-season or playoff stitching. A historical run includes all source games between its endpoints.')

    assert len(games) == len({g['url'] for g in games})
    assert len({r['id'] for r in candidates}) == len(candidates)
    result = dict(schema='brave-hc-record-candidates/v1', status='REVIEW_ONLY_NOT_OFFICIAL',
        coverage=dict(indexedGames=len(games), administrativeExclusions=sum(x['reason']=='ADMINISTRATIVE_DEFAULT_OR_FORFEIT' for x in exclusions), possibleDecidingEntries=sum(x['reason']=='POSSIBLE_STANDALONE_OT_OR_SHOOTOUT_ENTRY' for x in exclusions)),
        candidateCount=len(candidates), newCandidateDefinitions=sum(not c['existingCategoryComparison'] for c in candidates),
        rules=['Retain all tied holders and game source links.', 'Do not infer individual appearances or stats in the four owner-confirmed untracked Summer 2013 games.', 'Goalie save percentages, shots and minutes-based GAA are deferred until source quality and qualifying workloads are established.', 'Player scoring/attendance streaks and call-up/full-time records require complete participation and historical status data.', 'Playoff streaks and game-count records require explicit treatment of standalone overtime/shootout entries.', 'Current-season achievements remain provisional; COVID-shortened seasons retain their context.'],
        candidates=candidates, exclusions=exclusions)
    (DIR/'261020_Automatic_Record_Candidates.json').write_text(json.dumps(result,indent=2)+'\n')
    lines=['# Additional automatic record candidates', '',
           'Review-only recalculation from the captured HTO game ledger. The source refresh workflow recalculates this report after successful schedule reconciliation; candidate changes require review before native HTO publication.', '',
           f"{len(candidates)} calculated comparisons: {result['newCandidateDefinitions']} additional definitions and {len(candidates)-result['newCandidateDefinitions']} player-game and hat-trick baseline comparisons.", '',
           '## Candidate results', '', '| Definition | Value | Holders / seasons |', '|---|---:|---|']
    for c in candidates:
        holders='; '.join((r.get('name',r.get('opponent','Team'))+' — '+r.get('season','')+' '+(r.get('date','') or (r.get('start','')+' to '+r.get('end','') if r.get('start') else ''))) for r in c['holders'])
        lines.append(f"| {c['id']}: {c['label']} | {c['value']:g} | {holders} |")
    lines += ['', '## Publication conditions', '']+[f'- {r}' for r in result['rules']]
    lines += ['', 'Regenerate with `python scripts/build_automatic_record_candidates.py` after refreshing captured source evidence. This command calculates from saved evidence. The record source refresh workflow fetches current-season games separately and synchronizes already-published HTO records; neither step writes native HTO records.', '']
    (DIR/'261020_Automatic_Record_Candidates.md').write_text('\n'.join(lines))
    return result


if __name__ == '__main__':
    result = build()
    print(json.dumps({k:result[k] for k in ('coverage','candidateCount','newCandidateDefinitions')},indent=2))
