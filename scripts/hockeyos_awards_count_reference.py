"""Extract per-player current count reference without accepting legacy cohorts."""
import hashlib,json,sys
from pathlib import Path
from hockeyos_awards_downstream_postcheck import output_review

def extract(data,candidate):
 review=output_review(data,candidate)
 if data['controls']['C1']!=candidate['season'] or data['controls']['J2']!=1:raise ValueError('Wrong season or phase')
 if review['playerInfoAndCountTitleMismatches'] or review['awardCellErrors']:raise ValueError('Count reference mismatch or award error')
 names={r['inputs']['Name'] for r in candidate['rows'] if r['targetTable']=='SkaterStatsByGame'}
 pi={r['Website Name']:r for r in data['playerInfoRows']};rows=[]
 for index,row in enumerate(data['awardRows']):
  name=row.get('Name')
  if name not in names:continue
  if pi[name]['Recent Season']!=candidate['season'] or row['Art Ross Eligible']!=1 or row['Rocket Richard Eligible']!=1:raise ValueError('Current skater not eligible for native count titles')
  rows.append({'name':name,'sourceWorksheetRow':index+6,'gp':pi[name]['Current Skater GP'],'goals':pi[name]['Current Total Raw G'],'assists':pi[name]['Current Total Raw A'],'points':pi[name]['Current Total Raw Pts'],'nativeArtRossScore':row['Art Ross Award Score'],'nativeArtRossRankKey':row['Art Ross Rank Key'],'nativeRocketScore':row['Rocket Richard Award Score'],'nativeRocketRankKey':row['Rocket Richard Rank Key']})
 if len(rows)!=len(names):raise ValueError('Incomplete current skater count coverage')
 return {'state':'CURRENT_INDIVIDUAL_NATIVE_COUNT_PARITY_LEGACY_GLOBAL_COHORT_NOT_ACCEPTED','season':candidate['season'],'cutoff':max(r['date'] for r in candidate['rows']),'rows':rows,'legacyCohortExceptions':{k:v for k,v in review['eligiblePopulationByCategory'].items() if v['otherSeasonNames'] or v['unknownIdentityNames'] or v['currentNamesOutsideAcceptedParticipants']},'missingCurrentParticipants':review['currentParticipantsMissingFromAwardTable'],'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 native,candidate,out=map(Path,sys.argv[1:]);result=extract(json.loads(native.read_text(encoding='utf-8-sig')),json.loads(candidate.read_text()))
 result['nativeExportSha256']=hashlib.sha256(native.read_bytes()).hexdigest();result['inputCandidateSha256']=hashlib.sha256(candidate.read_bytes()).hexdigest()
 out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'state':result['state'],'rows':len(result['rows'])}))
