"""Recompute three total-season stat internals and displays for current players.

Current counts/leaders/equal-player rate means come from accepted appearances.
Recorded career/team baselines retain native provenance and require independent
historical-chain and corrected-native acceptance before any release.
"""
import hashlib,json,sys
from pathlib import Path
from hockeyos_awards_production_internals import bindings as raw_bindings,calculate
from hockeyos_awards_current_normalization import bindings as display_bindings,normalize

def replay(capture_path,candidate,population,reference):
 if candidate['season']!=population['season'] or max(r['date'] for r in candidate['rows'])!=population['cutoff']:raise ValueError('Accepted fixture scope differs')
 raw=raw_bindings(capture_path);display,_=display_bindings(capture_path);masters={p['name']:p for p in reference['players']}
 if len(masters)!=len(reference['players']):raise ValueError('Duplicate native reference identity')
 players={p['name']:p for p in population['players']};skaters={n:{'GP':0,'G':0,'A':0,'Pts':0} for n,p in players.items() if p['role']=='Skater'};seen=set()
 for appearance in candidate['rows']:
  name=appearance['inputs']['Name'];key=(name,appearance['targetTable'],appearance['sourceGameId'])
  if key in seen:raise ValueError('Duplicate accepted appearance')
  seen.add(key)
  if name not in players:raise ValueError('Unjoined accepted identity')
  if appearance['targetTable']!='SkaterStatsByGame':continue
  if name not in skaters:raise ValueError('Appearance/master role conflict')
  for field in ('GP','G','A','Pts'):
   value=appearance['inputs'].get(field)
   if isinstance(value,bool) or not isinstance(value,(int,float)) or value<0 or int(value)!=value:raise ValueError('Complete integer count required')
   skaters[name][field]+=value
 for name,totals in skaters.items():
  if totals['GP']!=players[name]['gp'] or totals['GP']<=0 or totals['Pts']!=totals['G']+totals['A']:raise ValueError('Appearance or point totals differ')
  if name not in masters or masters[name]['recentSeason']!=population['season'] or masters[name]['role']!='Skater':raise ValueError('Current native baseline join missing '+name)
 results={};changed=0
 for metric in ('G','A','Pts'):
  key='Total Final '+metric+' Internal Score';binding=raw[key];fields=binding['fields'];leader=max(t[metric] for t in skaters.values());average=sum(t[metric]/t['GP'] for t in skaters.values())/len(skaters);inputs={};rows=[]
  for name,player in players.items():
   if player['role']!='Skater':inputs[name]={'state':'NOT_APPLICABLE','reason':'Captured production formula excludes non-skaters'};continue
   source=masters[name]['components'][key];v=dict(source['inputs']);t=skaters[name]
   if v.get(fields['played'])!=t['GP'] or v.get(fields['count'])!=t[metric] or v.get(fields['rate'])!=t[metric]/t['GP']:raise ValueError('Accepted source/native current totals differ '+name)
   v.update({fields['played']:t['GP'],fields['count']:t[metric],fields['rate']:t[metric]/t['GP'],fields['leader']:leader,fields['fieldRate']:average})
   result=calculate(binding,'Skater',v)
   if result['state']=='INTERNAL_VALUE_CANDIDATE':inputs[name]={'state':'VALUE','value':result['value']}
   else:inputs[name]={'state':'UNAVAILABLE','reason':'Historical or required raw input unresolved: '+str(result.get('missingFields'))}
   changed+=result['state']=='INTERNAL_VALUE_CANDIDATE' and result['value']!=source['nativeValue'];rows.append({'name':name,'currentInputs':v,'nativeInternalObserved':source['nativeValue'],'calculated':result})
  display_name='Total Final '+metric+' Web Display Score';normalized=normalize(display[display_name],population,{'season':population['season'],'cutoff':population['cutoff'],'inputField':key,'upstreamParityVerified':False,'values':inputs})
  results[metric]={'currentFieldMean':average,'currentCountLeader':leader,'internalRows':rows,'normalized':normalized}
 return {'state':'THREE_CURRENT_STAT_COMPONENT_PIPELINES_IMPLEMENTED_NATIVE_CORRECTION_NOT_ACCEPTED','season':population['season'],'cutoff':population['cutoff'],'playerCoverage':len(players),'skaterCoverage':len(skaters),'internalComparisons':len(skaters)*3,'changedInternalValuesFromLegacy':changed,'components':results,'currentCompositeScoresVerified':False,'publicationAuthorized':False,'limitation':'Accepted current observations and original arithmetic are used. Historical baseline provenance is retained from native values; full historical dependency validation and corrected native/current-cohort parity remain open.'}
if __name__=='__main__':
 capture,candidate,population,reference,out=map(Path,sys.argv[1:]);r=replay(capture,json.loads(candidate.read_text()),json.loads(population.read_text()),json.loads(reference.read_text()));r['sourceFileHashes']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (capture,candidate,population,reference)};out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k!='components'}))
