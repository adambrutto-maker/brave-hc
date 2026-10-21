"""Compare goalie GA with regulation/OT scoreboard goals, excluding shootouts."""
import json
from reconcile_record_book import DIR, load_evidence, observations, date_of

anomalies=[]
for game in load_evidence()['games']:
    if not game['tables'] or 'SCORE BOARD\n' not in game['heading']:continue
    lines=[line.strip() for line in game['heading'].split('SCORE BOARD\n',1)[1].splitlines() if line.strip()]
    headers=lines[1].split('\t')
    teams=[]
    for i in (2,4):
        try:values=[int(v) for v in lines[i+1].split('\t')]
        except (IndexError,ValueError):break
        if len(values)!=len(headers):break
        teams.append((lines[i],dict(zip(headers,values))))
    if len(teams)!=2:continue
    opponents=[stats for name,stats in teams if name!='Brave H.C.']
    if len(opponents)!=1:continue
    expected=opponents[0]['F']
    brave_scores=[stats for name,stats in teams if name=='Brave H.C.'][0]
    if 'SO' in headers and opponents[0]['F']>brave_scores['F']:
        expected-=1  # the shootout winner's deciding goal is not goalie GA
    goalies=[(pid,row) for pid,row in observations(game) if 'POS' not in row]
    if not goalies:continue
    actual=sum(float(row.get('GA') or 0) for _,row in goalies)
    if actual!=expected:
        empty_net=0
        for table in game['tables']:
            header=table['rows'][0]['cells']
            if 'STRENGTH' not in header or 'TEAM' not in header:continue
            for row in table['rows'][1:]:
                event=dict(zip(header,row['cells']))
                if event.get('STRENGTH')=='EN' and event.get('TEAM')!='Brave H.C.':empty_net+=1
        status='GOALIE_GA_EXCEEDS_OPPONENT_GOALS' if actual>expected else 'EXPLAINED_EMPTY_NET' if expected-actual==empty_net else 'REVIEW_POSSIBLE_EMPTY_NET_OR_SOURCE_DIFFERENCE'
        anomalies.append({'date':str(date_of(game)),'sourceURL':game['url'],'season':game['schedule']['season'],'opponentPeriodScores':opponents[0],'scoreboardRegulationAndOTGA':expected,'publishedGoalieGA':actual,'documentedOpponentEmptyNetGoals':empty_net,'goalies':[dict(playerID=pid,stats=row) for pid,row in goalies],'status':status})
result={'status':'AUDIT_ONLY','count':len(anomalies),'entries':anomalies}
(DIR/'261020_Goalie_Source_Consistency.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'comparisonsWithDifferences':len(anomalies),'definiteGAExceedsScoreConflicts':[a['date'] for a in anomalies if a['status']=='GOALIE_GA_EXCEEDS_OPPONENT_GOALS']}))
