"""Read-only compact export of all 44 legacy display component references."""
import hashlib,json,re,sys
from pathlib import Path

def extract(data,schema):
 rows=[r for r in data['awardRows'] if r.get('Name')]
 names=[r['Name'] for r in rows]
 if len(names)!=len(set(names)):raise ValueError('Duplicate native identity')
 if data['awardErrors']:raise ValueError('Native error cells present')
 columns=next(t['columns'] for t in schema['tables'] if t['name']=='AwardScoring');components={}
 for column in columns:
  field=column['name'];formula=column.get('formula') or ''
  if not field.endswith(' Web Display Score'):continue
  refs=re.findall(r'AwardScoring\[\[#This Row\],\[([^]]+)\]\]',formula);raw=next(r for r in refs if r not in ('Name','Award Scoring Type'))
  components[field]={'inputField':raw,'rows':[{'name':r['Name'],'role':r['Award Scoring Type'],'recentSeason':r['Recent Season'],'raw':r[raw],'nativeDisplay':r[field]} for r in rows]}
 if len(components)!=44:raise ValueError('Complete 44-column display coverage required')
 return {'state':'LEGACY_NATIVE_DISPLAY_REFERENCE_NOT_CURRENT_COHORT_ACCEPTANCE','componentCount':44,'namedNativeRows':len(rows),'components':components,'currentScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 native,schema,out=map(Path,sys.argv[1:])
 if hashlib.sha256(schema.read_bytes()).hexdigest()!='2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae':raise ValueError('Captured schema changed')
 r=extract(json.loads(native.read_text()),json.loads(schema.read_text()));r['nativeExportSha256']=hashlib.sha256(native.read_bytes()).hexdigest();r['schemaSha256']=hashlib.sha256(schema.read_bytes()).hexdigest();out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k!='components'}))
