#!/usr/bin/env python3
"""Maintain ONE GitHub review issue for unresolved SVHL→HTO discrepancies.

Never writes to SVHL or HTO. Never messages players.
"""
import json
import os
import sys
import requests

TITLE='SVHL → HTO: schedule reconciliation required'
repo=os.environ.get('GITHUB_REPOSITORY','')
token=os.environ.get('GITHUB_TOKEN','')
if len(sys.argv)!=2 or not repo or not token:
    sys.exit('Review issue credentials or path not supplied')
queue=json.load(open(sys.argv[1],encoding='utf-8'))
changes=[x for x in queue if x['action']!='MATCH']
base='https://api.github.com/repos/'+repo
headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json',
         'X-GitHub-Api-Version':'2022-11-28'}
def req(method,path,**args):
    r=requests.request(method,base+path,headers=headers,timeout=20,**args)
    r.raise_for_status()
    return r.json() if r.content else {}
all_issues=req('GET','/issues?state=all&per_page=100')
existing=next((i for i in all_issues if i.get('title')==TITLE and 'pull_request' not in i),None)
if not changes:
    if existing and existing['state']=='open':
        req('PATCH','/issues/'+str(existing['number']),json={'state':'closed'})
        print('Review issue closed; SVHL and HTO agree')
    else:
        print('No discrepancies and no open issue')
    sys.exit(0)
lines=['Official SVHL fixtures have differences from HTO; **no HTO changes were made automatically.**','',
       'Review against [SVHL Sunday Winter 2026/27](https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY#Schedule).',
       'Use [HTO Schedule & Results](https://www.hometeamsonline.com/admin/default.asp?p=schedule) to amend the existing game by ID or add the missing game after review.','',
       '| Required action | SVHL game | HTO game ID | Difference |',
       '|---|---|---|---|']
for c in changes:
    g=c.get('svhl') or {}
    h=c.get('hto') or {}
    info=' '.join([g.get('date',''),g.get('time',''),g.get('opponent',''),g.get('rink','')]).strip() or 'Missing from SVHL'
    diff=', '.join(c.get('changes',{})) or 'Missing/unmatched game'
    lines.append('| '+c['action']+' | '+info.replace('|','/')+' | '+h.get('htoGameId','—')+' | '+diff+' |')
lines+=['','**Do not delete scored HTO records automatically.** Preserve the game ID when rescheduling. Reconfirm the goalie after material schedule changes.','',
         'After any manual HTO edit, rerun reconciliation and verify the issue closes only when both sources match.']
body='\n'.join(lines)
if not existing:
    req('POST','/issues',json={'title':TITLE,'body':body})
    print('Opened reconciliation issue')
elif existing['state']=='closed':
    req('PATCH','/issues/'+str(existing['number']),json={'state':'open','body':body})
    print('Reopened reconciliation issue')
elif existing.get('body')!=body:
    req('PATCH','/issues/'+str(existing['number']),json={'body':body})
    print('Updated reconciliation issue')
else:
    print('Existing reconciliation issue unchanged')
