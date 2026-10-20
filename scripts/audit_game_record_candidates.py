"""List highest game performances and unlisted ties, separately by game type."""
import collections
import json
from reconcile_record_book import DIR, ROOT, date_of, observations, load_evidence

evidence=load_evidence()
book=json.loads((ROOT/'widgets/player-record-book.json').read_text())
known=set()
for pid,p in book['players'].items():
    for e in p['entries']:
        if e['scope']=='Game':known.add((pid,e['category'],e['dateLabel'],float(e['value'])))
groups=collections.defaultdict(list)
for game in evidence['games']:
    season_group=game['schedule']['season'].split()[0]
    kind='Playoffs' if 'PLAYOFFS' in game['heading'] else 'Regular Season' if 'REGULAR SEASON' in game['heading'] else 'UNRESOLVED'
    for pid,row in observations(game):
        if 'POS' not in row:continue
        for label,stat in [('Goals','G'),('Assists','A'),('Points','Pts'),('Penalty Minutes','PIM')]:
            if stat not in row:continue
            value=float(row[stat] or 0)
            date=date_of(game)
            category=season_group+' - '+label
            date_label=f'{date.strftime("%B")} {date.day}, {date.year}'
            groups[(category,kind)].append({'playerID':pid,'name':row['Name'],'date':str(date),'value':value,'sourceURL':game['url'],'season':game['schedule']['season'],'alreadyListed':(pid,category,date_label,value) in known})
results=[]
for (category,kind),rows in sorted(groups.items()):
    highest=max(r['value'] for r in rows)
    results.append({'category':category,'gameType':kind,'highestObserved':highest,'performances':[r for r in rows if r['value']==highest]})
overall=[]
for category in sorted({c['category'] for c in results}):
    subsets=[c for c in results if c['category']==category]
    highest=max(c['highestObserved'] for c in subsets)
    performances=[dict(r,gameType=c['gameType']) for c in subsets for r in c['performances'] if r['value']==highest]
    overall.append({'category':category,'highestObserved':highest,'performances':performances,'unlistedHighestPerformances':sum(not r['alreadyListed'] for r in performances)})
result={'status':'REVIEW_CANDIDATES_NOT_ADOPTED','coverage':len(evidence['games']),'note':'Overall Game categories and optional playoff-specific game categories are distinguished. Twelve unlisted playoff-category leaders are taxonomy candidates, not twelve missing overall club records. Existing historical progression is preserved.','overallGameCategories':overall,'categories':results}
(DIR/'261020_Game_Record_Candidates.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'splitCategories':len(results),'overallCategories':len(overall),'unlistedOverallHighestPerformances':sum(c['unlistedHighestPerformances'] for c in overall),'optionalSplitCategoryCandidates':sum(not r['alreadyListed'] for c in results for r in c['performances'])}))
