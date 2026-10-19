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

def fixture_signature(game):
    """Canonical league revision to bind manager goalie reconfirmation to."""
    return "|".join([game[k] for k in ("date", "time", "opponent", "rink", "side")])


def prior_for(game, prior_games, used):
    """A unique prior fixture only. Never silently link an ambiguous matchup."""
    options=[p for p in prior_games if p.get("assignmentKey") not in used and
             all(k in p for k in ("date","time","opponent","rink","side","assignmentKey"))]
    exact=[p for p in options if p["date"]==game["date"] and norm(p["opponent"])==norm(game["opponent"])]
    if len(exact)==1:
        return exact[0], False
    if len(exact)>1:
        return None, False
    same_opponent=[p for p in options if norm(p["opponent"])==norm(game["opponent"]) and
                   abs((kickoff(p)-kickoff(game)).total_seconds())<=45*86400]
    if len(same_opponent)==1:
        return same_opponent[0], False
    if len(same_opponent)>1:
        return None, False
    # A team substitution at the exact same puck-drop slot requires human identity review.
    slot=[p for p in options if p["date"]==game["date"] and
          p["time"]==game["time"] and p["rink"]==game["rink"] and p["side"]==game["side"]]
    return (slot[0], True) if len(slot)==1 else (None, False)


def reconcile(svhl, hto, now=None, previous=None, goalie_data=None):
    """Read-only reconciliation, stable goalie assignment keys, bounded identity linking."""
    now=now or datetime.now(TZ)
    previous=previous or {}
    goalie_data=goalie_data or {}
    prior_games=previous.get("games",[]) if isinstance(previous,dict) else []
    confirmed=(goalie_data.get("scheduleConfirmations") or {}) if isinstance(goalie_data,dict) else {}
    if not isinstance(prior_games,list) or not isinstance(confirmed,dict):
        raise ValueError("Malformed prior fixture/goalie state")
    future=[g for g in svhl if kickoff(g)+timedelta(hours=3)>=now]
    hto_future=[g for g in hto if kickoff(g)+timedelta(hours=3)>=now-timedelta(days=45)]
    used_hto=set(); used_prior=set(); output=[]; review=[]
    for g in future:
        prior, identity_changed=prior_for(g,prior_games,used_prior)
        if prior:
            used_prior.add(prior["assignmentKey"])
        candidates=[h for h in hto_future if h["htoGameId"] not in used_hto]
        exact=[h for h in candidates if norm(h["opponent"])==norm(g["opponent"]) and h["date"]==g["date"]]
        nearby=[h for h in candidates if norm(h["opponent"])==norm(g["opponent"]) and
                abs((kickoff(h)-kickoff(g)).total_seconds())<=45*86400]
        match=exact[0] if len(exact)==1 else (nearby[0] if len(nearby)==1 and len(exact)==0 else None)
        if not match and prior and prior.get("htoGameId"):
            # Reuse a *known* HTO game only when it remains an unclaimed HTO record.
            # An opponent substitution is review-only, not an auto-authorized HTO edit.
            stable=[h for h in candidates if h["htoGameId"]==prior["htoGameId"]]
            if len(stable)==1:
                match=stable[0]
                identity_changed=identity_changed or norm(match["opponent"])!=norm(g["opponent"])
        if match:
            used_hto.add(match["htoGameId"])
            changes={k:{"svhl":g[k],"hto":match[k]} for k in ("date","time","opponent","rink","side")
                     if (norm(g[k])!=norm(match[k]) if k=="opponent" else g[k]!=match[k])}
            status=("REVIEW_IDENTITY" if identity_changed or "opponent" in changes
                    else "REVIEW_RESCHEDULE" if g["date"]!=match["date"] else
                    "EDIT_HTO" if changes else "MATCH")
        else:
            changes={}
            status="REVIEW_OR_ADD" if prior and prior.get("htoGameId") else "ADD_HTO"

        # Preserve the provisional SVHL key when its matching HTO game is subsequently added.
        # Preserve a matched HTO key across date/time/rink changes.
        key=prior["assignmentKey"] if prior else (
            "hto:"+match["htoGameId"] if match else "svhl:"+g["date"]+":"+norm(g["opponent"]))
        revision=fixture_signature(g)
        changed_from_prior=bool(prior and
                                (revision!=prior.get("fixtureSignature",fixture_signature(prior))))
        sticky=bool(prior and prior.get("requiresGoalieReconfirmation"))
        needs_reconfirm=(changed_from_prior or sticky or status in ("REVIEW_RESCHEDULE","REVIEW_IDENTITY","EDIT_HTO"))
        # Explicit manager confirmation for *this league revision* clears the goalie hold.
        needs_reconfirm=bool(needs_reconfirm and confirmed.get(key)!=revision)
        item={**g,"fixtureSignature":revision,"assignmentKey":key,
              "htoGameId":match["htoGameId"] if match else None,
              "htoSyncStatus":status,"requiresGoalieReconfirmation":needs_reconfirm}
        output.append(item)
        review.append({"action":status,"svhl":g,"hto":match,"changes":changes})
    for h in hto_future:
        if h["htoGameId"] not in used_hto and kickoff(h)+timedelta(hours=3)>=now:
            review.append({"action":"REVIEW_HTO_ONLY","svhl":None,"hto":h,"changes":{}})
    keys=[g["assignmentKey"] for g in output]
    if len(keys)!=len(set(keys)):
        raise ValueError("Ambiguous duplicate goalie assignment keys; refuse feed publication")
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
    previous_path=Path("widgets/svhl-upcoming.json")
    assignment_path=Path("widgets/goalie-assignments.json")
    previous=json.loads(previous_path.read_text(encoding="utf-8")) if previous_path.exists() else {}
    goalies=json.loads(assignment_path.read_text(encoding="utf-8")) if assignment_path.exists() else {}
    fixtures,queue=reconcile(parse_svhl(svhl_html),parse_hto(hto_html),
                             previous=previous,goalie_data=goalies)
    args.out.mkdir(parents=True,exist_ok=True)
    feed={'schema':'brave-hc-svhl-schedule/v1','source':SVHL,
          'checkedAt':datetime.now(TZ).isoformat(),'games':fixtures}
    (args.out/'svhl-upcoming.json').write_text(json.dumps(feed,indent=2)+'\n')
    (args.out/'reconciliation.json').write_text(json.dumps(queue,indent=2)+'\n')
    from hto_review_packet import render_review
    report=render_review(queue)
    (args.out/'hto-review.md').write_text(report or '# Brave H.C. SVHL / HTO — No discrepancies\n\nAll upcoming fixtures currently match. No HTO changes required.\n', encoding='utf-8')
    counts={}
    for q in queue:
        counts[q['action']]=counts.get(q['action'],0)+1
    print(json.dumps(counts))

if __name__=='__main__':
    main()
