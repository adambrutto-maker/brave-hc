"""Review replay: corrected population with recorded native internal inputs.

Cached internals are not claimed to have complete upstream current-cohort parity.
Missing current references remain unavailable, including the new Carlyle row.
"""
import hashlib,json,sys
from pathlib import Path
from hockeyos_awards_current_normalization import bindings,normalize

def replay(capture_path,population,reference):
 supported,unsupported=bindings(capture_path);columns={c['name']:c for c in json.loads(Path(capture_path).read_text())['columns']};known=reference['components'] if isinstance(reference['components'],dict) else {c['component']:c for c in reference['components']};components={}
 for field,binding in supported.items():
  source=columns[binding['inputField']]['formula'];skater_only='IF(AwardScoring[[#This Row],[Award Scoring Type]]<>"Skater","",' in source
  observed={r['name']:r['rawInternal'] if 'rawInternal' in r else r['raw'] for r in known.get(field,{}).get('rows',[])};values={}
  for player in population['players']:
   name=player['name']
   if skater_only and player['role']=='Goaltender':values[name]={'state':'NOT_APPLICABLE','reason':'Captured internal formula explicitly returns blank for non-skaters'}
   elif name in observed and observed[name] not in (None,''):values[name]={'state':'VALUE','value':observed[name]}
   elif name in observed:values[name]={'state':'UNAVAILABLE','reason':'Native internal is blank; phase/applicability or upstream cause requires confirmation'}
   else:values[name]={'state':'UNAVAILABLE','reason':'No recalculated current native internal reference for this player/component'}
  components[field]=normalize(binding,population,{'season':population['season'],'cutoff':population['cutoff'],'inputField':binding['inputField'],'upstreamParityVerified':False,'values':values})
 return {'state':'CURRENT_NORMALIZATION_IMPLEMENTED_PARTIAL_REFERENCE_REPLAY_NOT_FINAL_SCORE_ACCEPTANCE','season':population['season'],'cutoff':population['cutoff'],'playerCoverage':population['playerCount'],'supportedFormulaCount':len(supported),'candidateComponentCount':sum(c['state']=='CURRENT_COMPONENT_NORMALIZATION_CANDIDATE' for c in components.values()),'heldComponentCount':sum(c['state']=='COMPONENT_INPUT_HOLD' for c in components.values()),'unsupportedDisplayFormulas':unsupported,'components':components,'currentCompositeScoresVerified':False,'publicationAuthorized':False,'limitation':'Corrected normalization population only. Recorded internal values still require upstream current-cohort and complete native recalculation parity.'}
if __name__=='__main__':
 capture,population,reference,out=map(Path,sys.argv[1:]);r=replay(capture,json.loads(population.read_text()),json.loads(reference.read_text()));r['sourceFileHashes']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [capture,population,reference]};out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in ('components','unsupportedDisplayFormulas')}))
