'use strict';

/**
 * No-write evidence CONTRACT for a future recalculated Awards operational copy.
 * It can reject incomplete/self-inconsistent evidence; it cannot authenticate
 * signers, inspect Excel, or authorize publishing, merges or workbook writes.
 *
 * A SOURCE AUTHORITY HASH pins the immutable original formula specification.
 * An OPERATIONAL HASH identifies the separately recalculated candidate output.
 * Never use a changed operational file hash as a new formula authority.
 */
const AUTHORITY='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154';
const SHA=/^[a-f0-9]{64}$/i;
const AWARDS=Object.freeze([
 'hart','conn-smythe','art-ross','rocket','norris','lady-byng',
 'rookie','improved','rolaids','dedication','hof'
]);
const SEASON='W2026/27';
function dateValid(v){
 if(typeof v!=='string'||!/^20\d\d-\d\d-\d\d$/.test(v))return false;
 const [y,m,d]=v.split('-').map(Number),at=new Date(Date.UTC(y,m-1,d));
 return at.getUTCFullYear()===y&&at.getUTCMonth()===m-1&&at.getUTCDate()===d;
}
function timestamp(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v))return null;
 if(!dateValid(v.slice(0,10)))return null;
 const n=Date.parse(v);return Number.isFinite(n)?n:null;
}
function assess(data, attestation, checkedAt){
 const holds=[];
 const add=code=>{if(!holds.includes(code))holds.push(code)};
 if(!data||data.schema!=='brave-hc-awards-races-weekly/v1'
    ||data.season!==SEASON||data.sourceWorkbookHash!==AUTHORITY)
  add('SOURCE_AUTHORITY_OR_SEASON_MISMATCH');
 if(!data||!Number.isInteger(data.currentTeamGP)||data.currentTeamGP<1
    ||data.sourceWorkbookRecordedGP!==data.currentTeamGP)
  add('CACHED_AWARDS_GAME_COUNT_BEHIND_HTO');
 if(!data||data.sourceModelParity?.mismatches!==0
    ||data.seasonRaceMode?.currentModelScoresVerified!==true)
  add('ORIGINAL_MODEL_PARITY_NOT_ATTESTED');
 if(!attestation||attestation.schema!=='brave-hc-awards-operational-workbook-recalculation/v1'
    ||attestation.status!=='COMPLETE_SOURCE_FORMULA_REPLAY_REVIEW_CANDIDATE')
  add('OPERATIONAL_RECALCULATION_EVIDENCE_MISSING');
 if(attestation){
  if(attestation.season!==SEASON||attestation.immutableFormulaAuthoritySha256!==AUTHORITY)
   add('FORMULA_AUTHORITY_NOT_PINNED');
  if(!SHA.test(attestation.operationalWorkbookSha256||'')
     ||attestation.operationalWorkbookSha256===AUTHORITY)
   add('OPERATIONAL_WORKBOOK_SNAPSHOT_NOT_DISTINCT');
  if(!SHA.test(attestation.originalFormulaMapFingerprintSha256||'')
     ||!SHA.test(attestation.operationalFormulaMapFingerprintSha256||'')
     ||attestation.originalFormulaMapFingerprintSha256!==attestation.operationalFormulaMapFingerprintSha256)
   add('ORIGINAL_FORMULA_FINGERPRINT_PARITY_NOT_ATTESTED');
  if(attestation.originalHistoricalModelParity!=='COMPLETE_UNCHANGED_HISTORY')
   add('HISTORICAL_MODEL_PARITY_INCOMPLETE');
  if(!data||attestation.recalculatedTeamGP!==data.currentTeamGP
     ||attestation.officialHTOTeamGP!==data.currentTeamGP)
   add('OPERATIONAL_TO_HTO_GP_MISMATCH');
  const games=attestation.sourceGameMappings;
  const hto=new Set(),original=new Set();
  if(!Array.isArray(games)||games.length!==data?.currentTeamGP) add('OFFICIAL_GAME_MAPPING_INCOMPLETE');
  else for(const x of games){
   if(!Number.isInteger(x?.htoGameId)||x.htoGameId<1
      ||!Number.isInteger(x?.originalWorkbookGameNumber)||x.originalWorkbookGameNumber<1
      ||!dateValid(x?.gameDate)||hto.has(x.htoGameId)
      ||original.has(x.originalWorkbookGameNumber))
    add('OFFICIAL_GAME_MAPPING_DUPLICATE_OR_INVALID');
   hto.add(x.htoGameId);original.add(x.originalWorkbookGameNumber);
  }
  const results=attestation.awardFormulaParities;
  if(!Array.isArray(results)||results.length!==AWARDS.length
     ||new Set(results.map(x=>x?.awardId)).size!==AWARDS.length
     ||AWARDS.some(id=>!results.some(x=>x?.awardId===id&&
       x.state==='EXACT_ORIGINAL_FORMULA_ELIGIBILITY_RANK_SCORE_PARITY')))
   add('ELEVEN_AWARD_FORMULA_PARITY_MISSING');
  // A hash in JSON is a claimed identity, not independent cryptographic proof.
  // Even every check passing must only advance to independent reviewer queue.
 }
 const now=timestamp(checkedAt),observed=timestamp(attestation?.officialHTOReadbackAt);
 const sourceObserved=timestamp(data?.sourceHTOReadback);
 if(sourceObserved===null||observed===null||sourceObserved!==observed)
  add('OFFICIAL_HTO_READBACK_NOT_BOUND_TO_AWARDS_DATA');
 if(now===null||observed===null||now<observed-120000||now-observed>90*60000)
  add('INDEPENDENT_OFFICIAL_HTO_FRESHNESS_UNVERIFIED');
 return {
  schema:'brave-hc-awards-operational-provenance-gate/v1',
  status:holds.length?'HOLD_OPERATIONAL_MODEL_EVIDENCE':'SOURCE_EVIDENCE_REVIEW_CANDIDATE_ONLY',
  holds,sourceAuthorityHash:AUTHORITY,
  declaredOperationalHash:SHA.test(attestation?.operationalWorkbookSha256||'')
    ?attestation.operationalWorkbookSha256:null,
  checkedAt,awaitingAuthenticIndependentReviewer:true,
  cryptographicSignerValidated:false,
  sourceWorkbookOpened:false,originalWorkbookModified:false,
  operationalWorkbookWritten:false,publicationAuthorized:false,
  scoresAuthorized:false,
  note:'Structural claims only. Independent source, signatures and Excel parity are NOT verified by this browser/Node validator.'
 };
}
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../widgets/awards-races.json'),'utf8'));
 process.stdout.write(JSON.stringify(assess(data,null,new Date().toISOString()),null,2)+'\n');
}
module.exports={assess,AWARDS,AUTHORITY,dateValid};
