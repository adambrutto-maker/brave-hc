'use strict';

/**
 * Adapt VERIFIED SAVED, PRIVATE HockeyOS stage manifests to pure preflight
 * input. No filesystem, network, Excel or writer capabilities.
 *
 * Caller verifies independent evidence hashes. This adapter additionally
 * checks the exact original workbook authority, join and record counts.
 */
const SOURCE_TABLES=new Set(['SkaterStatsByGame','GoalieStatsByGame']);
const FIELDS={
 SkaterStatsByGame:['GP','G','A','Pts','PIM','+/-','POTG'],
 GoalieStatsByGame:['GP','GA','POTG']
};
function fail(reason){throw Error('HockeyOS adapter HOLD: '+reason)}
function numeric(x){if(x===null||x===undefined||x==='')return null;
 if(typeof x==='number')return Number.isFinite(x)?x:null;
 if(typeof x!=='string'||!x.trim())return null;
 const n=Number(x);return Number.isFinite(n)?n:null;
}
function buildManifest({stage,join,records,existing,savedAwardScoringGames=1}){
 if(stage?.schema!=='hockeyos-awards-workbook-game-log-staging/v1'
   ||stage.status!=='INPUT_STAGE_PASS_AWARD_MODEL_HELD')fail('unverified HTO source stage');
 if(join?.schema!=='hockeyos-awards-external-to-alltimeschedule-source-join/v1'
   ||join.status!=='FOUR_GAME_WORKBOOK_SEQUENCE_JOIN_PASS_CURRENT_SCORE_HELD')fail('unverified original Game # join');
 if(records?.schema!=='hockeyos-awards-source-equivalent-player-game-join/v1'
   ||records.status!=='SOURCE_EQUIVALENT_GAME_NUMBER_JOIN_PASS_RATINGS_HELD')fail('unverified player-game stage');
 if(existing?.schema!=='hockeyos-disposable-master-existing-game-row-check/v1'
   ||existing.workbookCopyUnchanged!==true)fail('unverified original workbook cache comparison');
 const hash=stage.workbookAuthority?.sha256;
 if(!hash||hash!==join.sourceWorkbookSHA256||hash!==existing.sourceWorkbookCopySHA256)
  fail('mismatched workbook authority SHA-256');
 if(!Array.isArray(join.mapped)||join.mapped.length!==4
   ||!Array.isArray(records.rows)||records.rows.length!==58
   ||!Array.isArray(existing.sourceCopyRows)||existing.sourceCopyRows.length!==15)
  fail('source row-count mismatch');
 if(stage.counts?.observedPlayerGameRows!==58
    ||stage.counts?.teamGames!==4)fail('HTO manifest counts mismatch');
 if(!Number.isInteger(savedAwardScoringGames)||savedAwardScoringGames<0)
  fail('stale AwardScoring count not verified');

 const byId=new Map();
 const games=join.mapped.map(m=>{
  if(m.sourceSystem!=='HTO_OFFICIAL_BOX_SCORE'
     ||!Number.isInteger(m.externalHTOGameId)||!Number.isInteger(m.workbookGameNumber)
     ||!Number.isInteger(m.sourceScore?.GF)||!Number.isInteger(m.sourceScore?.GA)
     ||m.workbookSeason!==stage.season)fail('incomplete official game mapping');
  if(byId.has(m.externalHTOGameId))fail('repeated HTO game ID');
  byId.set(m.externalHTOGameId,m);
  return {
   htoId:m.externalHTOGameId,
   workbookGameNumber:m.workbookGameNumber,
   date:m.verifiedDate,
   GF:m.sourceScore.GF,GA:m.sourceScore.GA,
   sourceUrl:m.sourceUrl
  };
 });
 const rows=records.rows.map(r=>{
  const m=byId.get(r.sourceHTOGameId);
  if(!m||m.workbookGameNumber!==r.originalWorkbookGameNumber)
   fail('unverified player-game mapping');
  if(!SOURCE_TABLES.has(r.sourceWorkbookTable))
   fail('unrecognized workbook input table');
  const fields=r.sourceEquivalentFieldsWithObservedInputs;
  if(!fields||fields['Game #']!==r.originalWorkbookGameNumber
     ||fields.Season!==stage.season||fields.Date!==m.verifiedDate
     ||fields.Name!==r.player||fields.GP!==1)fail('staged row source metadata mismatch');
  const stats={};
  for(const name of FIELDS[r.sourceWorkbookTable]){
   const value=Object.hasOwn(fields,name)?fields[name]:null;
   // Source evidence can explicitly have no published goalie POTG.
   if(value===null&&!(r.sourceWorkbookTable==='GoalieStatsByGame'&&name==='POTG'))
    fail('required observed input missing: '+name);
   stats[name]=value;
  }
  if(r.scoreOrRankComputed!==false
     ||r.workbookRowAssigned!==false
     ||r.historicalCareerReplayComplete!==false)
   fail('source row incorrectly claims calculated award');
  return {
   htoGameId:r.sourceHTOGameId,
   workbookGameNumber:r.originalWorkbookGameNumber,
   table:r.sourceWorkbookTable,
   name:r.player,stats
  };
 });
 const cachedRows=existing.sourceCopyRows.map(r=>{
  if(!SOURCE_TABLES.has(r.table)||typeof r.values?.Name!=='string'
     ||!r.values.Name.trim()||!Number.isInteger(Number(r.gameNumber)))
   fail('malformed source workbook cached row');
  const stats={};
  for(const name of FIELDS[r.table]){
   stats[name]=numeric(r.values[name]);
  }
  return {
   workbookGameNumber:Number(r.gameNumber),
   table:r.table,
   name:r.values.Name,
   stats
  };
 });
 return {
  season:stage.season,
  sourceWorkbookSha256:hash,
  completedGames:stage.counts.teamGames,
  workbookScoredGames:savedAwardScoringGames,
  games,rows,cachedRows,
  allElevenWorkbookFormulaParityVerified:false,
  independentReviewerAccepted:false,
  founderApproved:false
 };
}
module.exports={buildManifest};
