'use strict';
/**
 * Pure no-network, no-write proof check across saved HTO→AllTimeSchedule
 * join and saved 44-row expansion plan.
 *
 * This validates already-audited records. It does NOT inspect Excel,
 * authenticate real-time HTO, write a workbook or approve source revisions.
 */
const ORIGINAL_HASH='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154';
const SOURCE_GAME_IDS=[3356177,3356178,3369564,3375601];
const MAP=new Map([[3356177,359],[3356178,360],[3369564,361],[3375601,362]]);
const DATE=/^20\d{2}-\d{2}-\d{2}$/;
function validDate(s){
 if(typeof s!=='string'||!DATE.test(s))return false;
 const [y,m,d]=s.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
 return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;
}
function inspect({sourceJoin,extension,importPlan}={}){
 const holds=[],warnings=[],fail=s=>{if(!holds.includes(s))holds.push(s)};
 const warn=s=>{if(!warnings.includes(s))warnings.push(s)};
 if(sourceJoin?.schema!=='hockeyos-awards-external-to-alltimeschedule-source-join/v1'
    ||sourceJoin.status!=='FOUR_GAME_WORKBOOK_SEQUENCE_JOIN_PASS_CURRENT_SCORE_HELD'
    ||sourceJoin.sourceWorkbookSHA256!==ORIGINAL_HASH
    ||sourceJoin.recordCount!==4||!Array.isArray(sourceJoin.mapped)
    ||sourceJoin.mapped.length!==4||!Array.isArray(sourceJoin.failures)
    ||sourceJoin.failures.length!==0||sourceJoin.originalWorkbookEdited!==false)
  fail('SOURCE_JOIN_AUDIT_IDENTITY_OR_STATUS_NOT_VERIFIED');
 if(extension?.sourceWorkbookSHA256!==ORIGINAL_HASH||importPlan?.sourceWorkbookSHA256!==ORIGINAL_HASH
    ||extension?.writeAuthorized!==false||importPlan?.writeAuthorization!==false)
  fail('TABLE_EXPANSION_SOURCE_OR_WRITE_BOUNDARY_MISMATCH');
 const byWorkbook=new Map(),byHTO=new Map(),dates=[];
 let cachedOpponentDrift=0,staleResults=0;
 for(const m of sourceJoin?.mapped||[]){
  if(!Number.isInteger(m?.externalHTOGameId)||!Number.isInteger(m.workbookGameNumber)
     ||MAP.get(m.externalHTOGameId)!==m.workbookGameNumber
     ||byWorkbook.has(m.workbookGameNumber)||byHTO.has(m.externalHTOGameId)
     ||m.gameNumberJoinStatus!=='MATCH_SOURCE_SEASON_AND_UNIQUE_SCHEDULE_DATE'
     ||m.workbookSeason!=='W2026/27'||m.workbookTable!=='AllTimeSchedule'
     ||m.workbookGameType!=='Regular Season'||!validDate(m.verifiedDate))
   fail('FOUR_GAME_ORIGINAL_SCHEDULE_BINDING_INVALID');
  try{
   const link=new URL(m.sourceUrl);
   if(link.protocol!=='https:'||link.hostname!=='www.htosports.com'
      ||link.searchParams.get('gameID')!==String(m.externalHTOGameId)
      ||link.searchParams.get('p')!=='boxscore')fail('OFFICIAL_HTO_BOXSCORE_LINK_UNTRUSTED');
  }catch{fail('OFFICIAL_HTO_BOXSCORE_LINK_UNTRUSTED');}
  if(m.savedScoreStatus!=='STALE_UNSCORED_PLACEHOLDER_DO_NOT_REPLAY_AS_RESULT')
   fail('CACHED_WORKBOOK_RESULT_MUST_NOT_OVERRIDE_OFFICIAL_HTO');
  else staleResults++;
  if(m.workbookOpponentCached!==m.currentHTOOpponent)cachedOpponentDrift++;
  byWorkbook.set(m.workbookGameNumber,m.externalHTOGameId);
  byHTO.set(m.externalHTOGameId,m.workbookGameNumber);
  dates.push(m.verifiedDate);
 }
 if(byHTO.size!==4||SOURCE_GAME_IDS.some(id=>!byHTO.has(id))
    ||new Set(dates).size!==4)
  fail('SOURCE_GAME_JOIN_NOT_COMPLETE_OR_NONUNIQUE');
 const planned=extension?.newRowCandidates||[],sourceRows=importPlan?.unmatchedHTORecords||[];
 if(!Array.isArray(planned)||planned.length!==44
    ||!Array.isArray(sourceRows)||sourceRows.length!==44)
  fail('MISSING_44_SOURCE_INPUT_RECORDS');
 const sourceKeys=new Map();
 for(const r of sourceRows){
  const key=r?.key?.join('|');
  if(sourceKeys.has(key)||!Array.isArray(r?.key)
     ||!['SkaterStatsByGame','GoalieStatsByGame'].includes(r.key[1])
     ||byWorkbook.get(r.key[0])!==r.sourceHTOGameId)
   fail('SOURCE_INPUT_TO_SCHEDULE_JOIN_MISMATCH');
  sourceKeys.set(key,r.sourceHTOGameId);
 }
 for(const r of planned){
  const key=r?.key?.join('|');
  if(!sourceKeys.has(key)||r.sourceHTOGameId!==sourceKeys.get(key)
     ||byWorkbook.get(r?.key?.[0])!==r.sourceHTOGameId)
   fail('PLANNED_ROW_TO_OFFICIAL_GAME_JOIN_MISMATCH');
 }
 if(cachedOpponentDrift>0)
  warn('CACHED_OPPONENT_NAMES_DIFFER_FROM_LIVE_HTO_'+cachedOpponentDrift+'_GAMES');
 if(staleResults===4)
  warn('FOUR_SAVED_SCHEDULE_RESULTS_ARE_STALE_PLACEHOLDERS_NOT_OFFICIAL_GAME_RESULTS');
 return {
  schema:'hockeyos-saved-hto-original-game-identity-crosscheck/v1',
  status:holds.length?'HOLD_GAME_IDENTITY_SOURCE_MISMATCH':'SAVED_FOUR_GAME_IDENTITY_CROSSCHECK_PASS_WORKBOOK_MODEL_HELD',
  holds,warnings,completedHTOGames:4,unverifiedReplayedRows:44,
  sourceMappings:[...byHTO.entries()].sort((a,b)=>a[0]-b[0]).map(([hto,original])=>({hto,original})),
  savedOpponentNameDifferences:cachedOpponentDrift,
  originalHistoricalScheduleResultsStale:staleResults,
  freshOfficialHTOReadbackVerified:false,liveExcelOriginalFormulaReplayVerified:false,
  originalWorkbookOpened:false,originalWorkbookModified:false,
  workbookWriteAuthorized:false,currentAwardScoresVerified:false,
  publicationAuthorized:false
 };
}
module.exports={inspect};
