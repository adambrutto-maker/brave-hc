"""Read-only native references for six stat-production internal components."""
import hashlib,json,re,sys
from pathlib import Path

def extract(native,schema):
 columns={c['name']:c for t in schema['tables'] if t['name']=='AwardScoring' for c in t['columns']};master={r['Website Name']:r for r in native['playerInfoRows']};rows=[]
 for award in native['awardRows']:
  name=award.get('Name')
  if not name:continue
  if name not in master:raise ValueError('Native player-master join missing')
  player={'name':name,'role':award['Award Scoring Type'],'recentSeason':award['Recent Season'],'components':{}}
  for phase in ('Total','Playoff'):
   for metric in ('G','A','Pts'):
    field=phase+' Final '+metric+' Internal Score';required=set(re.findall(r'PlayerInfo\[([^]]+)\]',columns[field]['formula']))-{'Website Name'}
    if required-set(master[name]):raise ValueError('Native input fields were not exported '+str(required-set(master[name])))
    player['components'][field]={'inputs':{k:master[name][k] for k in sorted(required)},'nativeValue':award[field]}
  rows.append(player)
 return {'state':'SIX_PRODUCTION_INTERNAL_NATIVE_REFERENCES_NOT_CURRENT_MODEL_ACCEPTANCE','players':rows,'playerCount':len(rows),'componentCount':6,'currentScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 native,schema,out=map(Path,sys.argv[1:])
 if hashlib.sha256(schema.read_bytes()).hexdigest()!='2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae':raise ValueError('Schema changed')
 r=extract(json.loads(native.read_text()),json.loads(schema.read_text()));r['nativeExportSha256']=hashlib.sha256(native.read_bytes()).hexdigest();out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k!='players'}))
