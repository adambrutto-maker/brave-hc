#!/usr/bin/env python3
"""Read-only Brave H.C. SVHL→HTO checker; never edits either site."""
import argparse
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
import requests
from bs4 import BeautifulSoup

SVHL = 'https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY'
HTO = 'https://www.htosports.com/teams/default.asp?p=schedule&s=hockey&u=BRAVESHOCKEY&format=List'
TZ = ZoneInfo('America/Toronto')
TEAM_ID = '13679'

def text(node):
    return node.get_text(' ', strip=True) if node else ''

def norm(value):
    return re.sub('[^a-z0-9]', '', value.lower())

def rink(value):
    match = re.search(r'\b([A-D])\s*Rink\b', value, re.I)
    return match.group(1).upper() + ' Rink' if match else value.strip()

def date(value):
    for fmt in ('%b %d, %Y', '%a, %m/%d/%y'):
        try:
            return datetime.strptime(value, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    raise ValueError('Unrecognized date ' + repr(value))

def time(value):
    cleaned = re.sub(r'\s+', '', value).upper()
    return datetime.strptime(cleaned, '%I:%M%p').strftime('%H:%M')

def kickoff(game):
    return datetime.fromisoformat(game['date']+'T'+game['time']).replace(tzinfo=TZ)

def parse_svhl(html):
    doc = BeautifulSoup(html, 'html.parser')
    table = doc.select_one('#ctl00_MainContent_ucSchedule_GridViewSchedule')
    if not table or 'Sunday Winter - 2026/27' not in text(doc):
        raise ValueError('SVHL season/schedule structure not verified')
    games=[]
    for row in table.select('tbody tr'):
        cells=row.select('td')
        if len(cells)<4:
            continue
        teams=cells[2].select('a[href*="teamid="]')
        if len(teams)!=2:
            continue
        ids=[re.search(r'teamid=(\d+)', a.get('href',''),re.I) for a in teams]
        ids=[x.group(1) if x else '' for x in ids]
        if TEAM_ID not in ids:
            continue
        home=ids[0]==TEAM_ID
        games.append(dict(date=date(text(cells[0])),time=time(text(cells[1])),
                          opponent=text(teams[1] if home else teams[0]),
                          rink=rink(text(cells[3])),side='home' if home else 'away'))
    if not games:
        raise ValueError('No Braves games found; refusing empty feed')
    return sorted(games,key=kickoff)

def parse_hto(html):
    doc=BeautifulSoup(html,'html.parser')
    rows=doc.select('tr[id^="schedRow"]')
    if not rows:
        raise ValueError('HTO schedule List View not readable')
    games=[]
    for row in rows:
        if 'game' not in row.get('class',[]):
            continue
        vals=[text(row.select_one('.'+x)) for x in ('dateCell','timeCell','opponentCell','locationCell')]
        if not all(vals[:3]):
            continue
        games.append(dict(htoGameId=row.get('id','').replace('schedRow',''),
                          date=date(vals[0]),time=time(vals[1]),
                          opponent=re.sub(r'^\s*@\s*','',vals[2]),
                          rink=rink(vals[3]),side='away' if vals[2].startswith('@') else 'home'))
    if not games:
        raise ValueError('No HTO games found; refusing empty comparison')
    return sorted(games,key=kickoff)

def reconcile(svhl,hto,now=None):
    now=now or datetime.now(TZ)
    future=[g for g in svhl if kickoff(g)+timedelta(hours=3)>=now]
    hto_future=[g for g in hto if kickoff(g)+timedelta(hours=3)>=now-timedelta(days=45)]
    used=set(); output=[]; review=[]
    for g in future:
        candidates=[h for h in hto_future if h['htoGameId'] not in used and norm(h['opponent'])==norm(g['opponent'])]
        exact=[h for h in candidates if h['date']==g['date']]
        nearby=[h for h in candidates if abs((kickoff(h)-kickoff(g)).days)<=45]
        match=exact[0] if len(exact)==1 else (nearby[0] if len(nearby)==1 else None)
        if match:
            used.add(match['htoGameId'])
            changes={k:{'svhl':g[k],'hto':match[k]} for k in ('date','time','opponent','rink','side')
                     if (norm(g[k])!=norm(match[k]) if k=='opponent' else g[k]!=match[k])}
            status=('MATCH' if not changes else ('REVIEW_RESCHEDULE' if g['date']!=match['date'] else 'EDIT_HTO'))
        else:
            changes={}; status='REVIEW_OR_ADD' if candidates else 'ADD_HTO'
        key='hto:'+match['htoGameId'] if match else 'svhl:'+g['date']+':'+norm(g['opponent'])
        output.append({**g,'assignmentKey':key,'htoGameId':match['htoGameId'] if match else None,
                       'htoSyncStatus':status,'requiresGoalieReconfirmation':status in ('EDIT_HTO','REVIEW_RESCHEDULE')})
        review.append({'action':status,'svhl':g,'hto':match,'changes':changes})
    for h in hto_future:
        if h['htoGameId'] not in used and kickoff(h)+timedelta(hours=3)>=now:
            review.append({'action':'REVIEW_HTO_ONLY','svhl':None,'hto':h,'changes':{}})
    return output,review

def retrieve(url):
    r=requests.get(url,headers={'User-Agent':'Mozilla/5.0 BraveHC-ScheduleQA/1.2'},timeout=25)
    r.raise_for_status()
    return r.text

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--svhl-file',type=Path)
    ap.add_argument('--hto-file',type=Path)
    ap.add_argument('--out',type=Path,default=Path('build/svhl-review'))
    args=ap.parse_args()
    svhl_html=args.svhl_file.read_text() if args.svhl_file else retrieve(SVHL)
    hto_html=args.hto_file.read_text() if args.hto_file else retrieve(HTO)
    fixtures,queue=reconcile(parse_svhl(svhl_html),parse_hto(hto_html))
    args.out.mkdir(parents=True,exist_ok=True)
    feed={'schema':'brave-hc-svhl-schedule/v1','source':SVHL,
          'checkedAt':datetime.now(TZ).isoformat(),'games':fixtures}
    (args.out/'svhl-upcoming.json').write_text(json.dumps(feed,indent=2)+'\n')
    (args.out/'reconciliation.json').write_text(json.dumps(queue,indent=2)+'\n')
    counts={}
    for q in queue:
        counts[q['action']]=counts.get(q['action'],0)+1
    print(json.dumps(counts))

if __name__=='__main__':
    main()
