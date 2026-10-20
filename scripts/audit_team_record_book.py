"""Compare published team entries with captured HTO results and player statistics."""
import collections
import json
import re
from reconcile_record_book import DIR, load_evidence, observations, date_of

def scoreboard(game):
    lines=[x.strip() for x in game['heading'].split('SCORE BOARD\n',1)[1].splitlines() if x.strip()]
    headers=lines[1].split('\t')
    teams=[(lines[i],dict(zip(headers,map(int,lines[i+1].split('\t'))))) for i in (2,4)]
    brave=next(s for name,s in teams if name.startswith('Brave H.C.'))
    opponent=next(s for name,s in teams if not name.startswith('Brave H.C.'))
    return brave['F'],opponent['F']

evidence=load_evidence()
history=json.loads(__import__('pathlib').Path('/tmp/team-records-current.json').read_text()) if __import__('pathlib').Path('/tmp/team-records-current.json').exists() else json.loads((DIR/'261020_Team_Record_Book_Baseline.json').read_text())
aggregates=collections.defaultdict(collections.Counter)
game_ledger=[]
for game in evidence['games']:
    season=game['schedule']['season']
    kind='Playoffs' if 'PLAYOFFS' in game['heading'] else 'Season' if 'REGULAR SEASON' in game['heading'] else 'UNRESOLVED'
    match=re.search(r'\b([WLT])\s+(?:Forfeit|\d)',game['schedule']['text'])
    if not match:raise ValueError('Unparsed result '+game['url'])
    result=match[1]
    gf,ga=scoreboard(game)
    stats=collections.Counter()
    skater_goals=0
    skater_rows=0
    for pid,row in observations(game):
        if 'POS' in row:
            skater_rows+=1
            skater_goals+=float(row.get('G') or 0)
        for stat in (('PPG','SHG','PIM') if 'POS' in row else ('PIM',)):
            stats[stat]+=float(row.get(stat) or 0)
    default=not game['tables']
    totals=aggregates[(season,kind)]
    totals[result]+=1;totals['Games']+=1;totals['GF']+=gf;totals['GA']+=ga
    totals['Points2W1T']+=2 if result=='W' else 1 if result=='T' else 0
    totals.update(stats)
    if default:
        totals['Defaults']+=1;totals['DefaultGF']+=gf;totals['DefaultGA']+=ga
    game_ledger.append({'season':season,'scope':kind,'date':str(date_of(game)),'result':result,'GF':gf,'GA':ga,**stats,'skaterRows':skater_rows,'publishedSkaterGoals':skater_goals,'defaultForfeit':default,'sourceURL':game['url']})
checks=[]
for group in history['groups']:
    if group['section']!='Team Records':continue
    for text in group['items']:
        suffix=re.search(r'\((\d{4})(?:/(\d{2}))?\)\s*$',text)
        if not suffix:raise ValueError('Unparsed record year '+text)
        label=group['category'].split(' - ')[0]
        year=suffix[1]+('/'+suffix[1][:2]+suffix[2] if suffix[2] else '')
        season=label+' '+year
        actual=aggregates[(season,group['period'])]
        category=group['category'].split(' - ')[1]
        stat={'Goals For':'GF','Goals Against':'GA','Powerplay Goals':'PPG','Shorthanded Goals':'SHG','Penalty Minutes':'PIM','Total Points/Record':'Points2W1T'}[category]
        value=float(re.match(r'[\d.]+',text)[0]);record=re.search(r'\((\d+)-(\d+)-(\d+)\)',text)
        numeric_match=value==actual[stat]
        record_match=not record or tuple(map(int,record.groups()))==tuple(actual[s] for s in ('W','L','T'))
        status='MATCH' if numeric_match and record_match else 'DIFFERENCE_REQUIRES_REVIEW'
        item={'category':group['category'],'scope':group['period'],'season':season,'sourceText':text,'stat':stat,'publishedValue':value,'calculatedValue':actual[stat],'calculatedRecord':f"{actual['W']}-{actual['L']}-{actual['T']}",'status':status,'aggregate':dict(actual)}
        if stat=='GF' and value==actual['GF']-actual['DefaultGF'] and not numeric_match:item['possibleExplanation']='PUBLISHED_TOTAL_EXCLUDES_ADMINISTRATIVE_DEFAULT_GOALS'
        checks.append(item)
covered={(c['season'],c['scope'],c['stat']) for c in checks}
missing=[{'season':season,'scope':scope,'totals':dict(totals),'status':'CURRENT_SEASON_IN_PROGRESS' if season=='Winter 2026/2027' else 'PUBLISHED_SEASON_NOT_IN_TEAM_RECORD_BOOK'} for (season,scope),totals in aggregates.items() if (season,scope,'GF') not in covered]
coverage_gaps=[g for g in game_ledger if not g['defaultForfeit'] and not g['skaterRows']]
report={'status':'TEAM_RECORD_AUDIT_ONLY_NO_NATIVE_EDITS','method':'Official W/L/T labels and final scoreboard totals, defaults retained and flagged; PPG/SHG summed from skaters and PIM includes skaters plus goalies. Two points per win and one per tie are a comparison convention, not an adopted rule for every historical playoff format. Playoff outcome notes require independent historical evidence.','counts':dict(collections.Counter(c['status'] for c in checks)),'entries':checks,'missingScopes':missing,'gamesMissingSkaterStats':coverage_gaps,'gameLedger':game_ledger,'milestoneCaution':'Previously reconciled milestone dates reproduce published HTO individual statistics. Games with missing skater statistics prevent an independent certification of actual historical appearances or points; do not invent participation from team scores.'}
(DIR/'261020_Team_Record_Book_Baseline.json').write_text(json.dumps(history,indent=2)+'\n')
(DIR/'261020_Team_Record_Book_Audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'counts':report['counts'],'missingScopes':missing,'gamesMissingSkaterStats':len(coverage_gaps)},indent=2))
for c in checks:
    if c['status']!='MATCH':print(c['sourceText'],c['category'],c['scope'],'=>',c['calculatedValue'],c['calculatedRecord'],c.get('possibleExplanation',''))
