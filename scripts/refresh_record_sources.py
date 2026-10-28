"""Capture public current-season boxscores and sync published record feeds.

No authentication, HTO writes or automatic adoption of calculated candidates.
All inputs validate before any output is replaced.
"""
import collections
import copy
import datetime as dt
import hashlib
import json
import re
import time
from urllib.parse import parse_qs, urlencode, urljoin, urlparse
from pathlib import Path
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT/'docs/hto-highlights-rollout'
BASE = 'https://www.htosports.com/teams/default.asp'
RECORDS = BASE+'?u=BRAVESHOCKEY&s=hockey&p=records'
LIVE = DIR/'game-audit-evidence/live_boxscores.json'


def clean(value):
    return re.sub(r'\s+', ' ', value).strip()


def game_id(url):
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    if parsed.scheme != 'https' or parsed.hostname != 'www.htosports.com' or parsed.path != '/teams/default.asp' or query.get('u') != ['BRAVESHOCKEY'] or query.get('p') != ['boxscore']:
        raise ValueError('Unexpected boxscore source URL')
    value = query.get('gameID', [''])[0]
    if not value.isdigit():
        raise ValueError('Missing game ID')
    return value


def parse_schedule(html, url, season):
    soup = BeautifulSoup(html, 'html.parser')
    rows = soup.select('tr.schedRow')
    if not rows:
        raise ValueError('Schedule rows missing')
    out = []
    for row in rows:
        score = row.select_one('.scoreCell')
        if not score or not re.match(r'^[WLT]\s+(?:\d|Forfeit)', clean(score.get_text(' ', strip=True))):
            continue
        link = next((a for a in row.select('a[href]') if clean(a.get_text()) == 'Box Score'), None)
        if link is None:
            raise ValueError('Completed result has no boxscore')
        href = urljoin(url, link['href'])
        game_id(href)
        text = '\n\t\n'.join(clean(c.get_text(' ', strip=True)) for c in row.find_all('td', recursive=False))
        if not re.search(r'\b\d{1,2}/\d{1,2}/\d{2}\b', text):
            raise ValueError('Game date missing')
        out.append(dict(href=href, text=text, season=season))
    if len({game_id(r['href']) for r in out}) != len(out):
        raise ValueError('Duplicate schedule game IDs')
    return out


def parse_boxscore(html, schedule):
    soup = BeautifulSoup(html, 'html.parser')
    board = next((t for t in soup.select('table') if t.select_one('td.final') and t.select_one('td.team')), None)
    if board is None:
        raise ValueError('Scoreboard missing')
    header = [clean(c.get_text(' ', strip=True)) for c in board.select('thead tr')[0].find_all(['td','th'], recursive=False)]
    if header[0] not in ('REGULAR SEASON', 'PLAYOFFS') or header[-1] != 'F':
        raise ValueError('Unknown scoreboard phase or final column')
    teams = []
    for row in board.select('tbody > tr'):
        cells = [clean(c.get_text(' ', strip=True)) for c in row.find_all(['td','th'], recursive=False)]
        if len(cells) != len(header) or not all(v.isdigit() for v in cells[1:]):
            raise ValueError('Incomplete final score')
        teams.append(cells)
    if len(teams) != 2 or sum(r[0] == 'Brave H.C.' for r in teams) != 1:
        raise ValueError('Wrong team scoreboard')
    tables = []
    for table in soup.select('table'):
        if not table.select('a[href*="playerID="]'):
            continue
        rows = []
        for row in table.select('tr'):
            cells = row.find_all(['td','th'], recursive=False)
            if not cells:
                continue
            players = []
            for a in row.select('a[href*="playerID="]'):
                href = urljoin(schedule['href'], a['href'])
                if not re.fullmatch(r'\d+', parse_qs(urlparse(href).query).get('playerID',[''])[0]):
                    raise ValueError('Invalid player identity')
                players.append(dict(href=href, name=clean(a.get_text(' ', strip=True))))
            rows.append(dict(cells=[clean(c.get_text(' ', strip=True)) for c in cells], players=players))
        tables.append(dict(rows=rows))
    if not tables and not re.search(r'forfeit|default', schedule['text'], re.I):
        raise ValueError('Played current-season game has no player statistics; retain prior evidence')
    heading = 'SCORE BOARD\n'+header[0]+'\n\t'+'\t'.join(header[1:])+'\n'
    for row in teams:
        heading += '\n'+row[0]+'\n'+'\t'.join(row[1:])+'\n'
    return dict(schedule=schedule, tables=tables, url=schedule['href'], heading=heading)


def parse_records(html):
    soup = BeautifulSoup(html, 'html.parser')
    groups = []
    for col in soup.select('.pageModCol'):
        section = category = ''
        for child in col.find_all(recursive=False):
            classes = child.get('class', [])
            if 'modGroupAboveHeadingMain' in classes:
                section = clean(child.get_text(' ', strip=True))
            elif 'modGroupAboveHeading' in classes:
                category = clean(child.get_text(' ', strip=True))
            elif 'modGroupWrapper' in classes:
                period = ''
                for row in child.find_all(recursive=False):
                    if 'modGroupSubHeading' in row.get('class', []):
                        period = clean(row.get_text(' ', strip=True))
                    elif 'modGroupDetailsWrapper' in row.get('class', []):
                        items = [clean(x.get_text(' ', strip=True)) for x in row.select(':scope > .modGroupItem')]
                        if items:
                            if not section or not category or not period:
                                raise ValueError('Record group labels missing')
                            groups.append(dict(section=section, category=category, period=period, items=items))
    count = sum(len(g['items']) for g in groups)
    if not count or count != len(soup.select('.modGroupItem')) or {g['section'] for g in groups} != {'Individual Records','Team Records'}:
        raise ValueError('Incomplete record book')
    return groups


def inventory(groups):
    return collections.Counter((g['section'],g['category'],g['period'],clean(s)) for g in groups for s in g['items'])


def sync_published(history, book, groups, now):
    if inventory(history['groups']) - inventory(groups):
        raise ValueError('Published historical records were removed or revised; manual reconciliation required: '+json.dumps(dict(missing=list((inventory(history['groups'])-inventory(groups)).elements())[:5], added=list((inventory(groups)-inventory(history['groups'])).elements())[:5])))
    result = copy.deepcopy(book)
    for player in result['players'].values():
        player['entries'] = []
    known = {(e['category'],e['scope'],clean(e['sourceText'])):(pid,e) for pid,p in book['players'].items() for e in p['entries']}
    old_unmapped = set()
    for g in history['groups']:
        if g['section'] == 'Individual Records':
            old_unmapped.update((g['category'],g['period'],clean(s)) for s in g['items'] if (g['category'],g['period'],clean(s)) not in known)
    for group in groups:
        if group['section'] != 'Individual Records':
            continue
        for source in group['items']:
            key = (group['category'],group['period'],clean(source))
            if key in known:
                pid, entry = known[key]
                result['players'][pid]['entries'].append(copy.deepcopy(entry))
                continue
            if key in old_unmapped:
                continue
            match = re.fullmatch(r'([\d.]+)\s*-\s*(.*?)\s*\(([^()]*)\)', source)
            matches = [pid for pid,p in book['players'].items() if match and p['name'] == match[2].strip()]
            if len(matches) != 1:
                raise ValueError('New individual record has no unique verified identity: '+source)
            entry = dict(category=group['category'],scope=group['period'],sourceText=source,value=match[1],dateLabel=match[3],kind='milestone' if re.match(r'^\d+ (?:Game|Point|Win) Club$',group['category']) else 'performance')
            result['players'][matches[0]]['entries'].append(entry)
    updated = copy.deepcopy(history)
    if inventory(groups) != inventory(history['groups']):
        updated.update(groups=groups, entryCount=sum(len(g['items']) for g in groups), capturedAt=now)
        result['capturedAt'] = now
    else:
        # Native HTO may reorder existing verified record categories without
        # changing a single record. Reflect their official display order in
        # the Records widget while preserving the player-stat feed verbatim.
        if groups == history['groups']:
            return history, book
        updated.update(groups=groups, entryCount=sum(len(g['items']) for g in groups), capturedAt=now)
        return updated, book
    updated['stalePolicy'] = 'Verified public HTO readback. Scheduled refresh preserves existing entries and requires manual review for removals, revisions or uncertain identities.'
    return updated, result


def fetch(session, url, *, max_attempts=3, sleep_fn=time.sleep):
    """Accept only HTTP 200 HTML from official HTO; retry transient bad responses.

    Fail with source-safe response metadata, never a raw upstream body or a
    different website's data. Redirects are forbidden even during retries.
    """
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'www.htosports.com' or parsed.path != '/teams/default.asp':
        raise ValueError('Unexpected source host or path')
    if not 1 <= max_attempts <= 3:
        raise ValueError('Invalid bounded source retry count')
    for attempt in range(1, max_attempts + 1):
        try:
            response = session.get(url, timeout=25, allow_redirects=False)
        except requests.RequestException:
            if attempt == max_attempts:
                raise
            sleep_fn(attempt)
            continue
        status = response.status_code
        content_type = response.headers.get('Content-Type', '').lower()
        data = response.content
        if status == 200 and 'text/html' in content_type and data:
            # Let the HTML parser honor the page charset, not Requests' Latin-1 fallback.
            return data
        evidence = dict(status=status, contentType=content_type[:90],
                        responseBytes=len(data), responseSHA256=hashlib.sha256(data).hexdigest(),
                        attempts=attempt)
        # Never follow or retry redirects/denials; retry only transient or
        # incorrectly typed HTTP 200 responses, then reject them explicitly.
        if status in (301, 302, 303, 307, 308, 400, 401, 403, 404):
            raise ValueError('Unexpected HTO response: ' + json.dumps(evidence))
        if attempt == max_attempts or status not in (200, 204, 429, 500, 502, 503, 504):
            raise ValueError('Unexpected HTO response: ' + json.dumps(evidence))
        sleep_fn(attempt)
    raise AssertionError('Unreachable source retry outcome')


def read_json(path):
    # Windows' locale default may decode the UTF-8 HTO history as CP1252,
    # making accented names appear to have been removed from the source.
    return json.loads(path.read_text(encoding='utf-8'))


def run():
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    index_path = DIR/'261020_Historical_Boxscore_Index.json'
    index = read_json(index_path)
    old_index = copy.deepcopy(index)
    session = requests.Session()
    session.headers['User-Agent'] = 'BraveHC-RecordRefresh/1.0 (public source verification)'
    schedule_url = index['seasons'][0]['sourceURL']
    html = fetch(session, schedule_url)
    soup = BeautifulSoup(html, 'html.parser')
    seasons = [(clean(o.get_text(' ', strip=True)),o.get('value','')) for o in soup.select('select option') if re.fullmatch(r'(?:Winter_20\d{2}/20\d{2}|Summer_20\d{2})',o.get('value',''))]
    if not seasons:
        raise ValueError('Published season selector missing')
    label, value = seasons[0]
    if label != index['seasons'][0]['season']:
        schedule_url = BASE+'?'+urlencode(dict(u='BRAVESHOCKEY',s='hockey',p='schedule',format='List',viewseas=value))
        html = fetch(session, schedule_url)
        current = next((s for s in index['seasons'] if s['season']==label),None)
        if current is None:
            current = dict(season=label,sourceURL=schedule_url,boxscoreURLs=[])
            index['seasons'].insert(0,current)
    else:
        current = index['seasons'][0]
    scheduled = parse_schedule(html,schedule_url,label)
    prior_urls = {game_id(u):u for u in current['boxscoreURLs']}
    if set(prior_urls) - {game_id(s['href']) for s in scheduled}:
        raise ValueError('Current schedule lost previously captured results')
    live = read_json(LIVE) if LIVE.exists() else dict(games=[])
    by_id = {game_id(g['url']):g for g in live['games']}
    for row in scheduled:
        row['href'] = prior_urls.get(game_id(row['href']),row['href'])
        by_id[game_id(row['href'])] = parse_boxscore(fetch(session,row['href']),row)
    current['boxscoreURLs'] = [s['href'] for s in scheduled]
    new_games = sorted(by_id.values(), key=lambda g: (g['schedule']['season'],game_id(g['url'])))
    history_path, book_path = ROOT/'widgets/history-records.json', ROOT/'widgets/player-record-book.json'
    history, book = read_json(history_path), read_json(book_path)
    groups = parse_records(fetch(session,RECORDS))
    new_history,new_book = sync_published(history,book,groups,now)
    outputs = []
    if index != old_index:
        outputs.append((index_path,index))
    if not LIVE.exists() or new_games != live['games']:
        outputs.append((LIVE,dict(capturedAt=now,sourceAuthority='PUBLIC_HTO_HTTP_READBACK',games=new_games)))
    if new_history != history:
        outputs.extend([(history_path,new_history),(book_path,new_book)])
    for path,data in outputs:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    report = dict(checkedAt=now,season=label,completedGamesChecked=len(scheduled),publishedRecords=sum(len(g['items']) for g in groups),changedFiles=[str(p.relative_to(ROOT)) for p,_ in outputs],nativeHTOWrites=0)
    target = ROOT/'build/record-refresh/receipt.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    run()
