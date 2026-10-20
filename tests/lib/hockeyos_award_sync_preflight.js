'use strict';

/**
 * HockeyOS Award Workbook source-input preflight — PURE, QA ONLY.
 *
 * No filesystem access, no network, no original workbook reader, no Excel
 * writer, no HTO request, and no deployment hook. Call with an already-reviewed
 * input manifest. Returning PASS never authorizes a workbook mutation.
 *
 * The Master Workbook remains authoritative for formulas, eligibility,
 * rankings and normalization. This code checks only source-record integrity.
 */
const ALLOWED_SKATER = new Set(['GP','G','A','Pts','PIM','+/-','POTG']);
const ALLOWED_GOALIE = new Set(['GP','GA','POTG']);
const SHA256 = /^[a-f0-9]{64}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ROLE = new Set(['SkaterStatsByGame','GoalieStatsByGame']);
const INVALID_NAME = /unknown|unidentified|placeholder/i;
function validDay(text){
 if(typeof text!=='string'||!DAY.test(text))return false;
 const dt=new Date(text+'T00:00:00Z');
 return Number.isFinite(dt.valueOf())&&dt.toISOString().slice(0,10)===text;
}
function key(r){
 return [r.workbookGameNumber,r.table,r.name].join('|');
}
function validStats(row,errors){
 const st=row.stats;
 const loc=key(row);
 const allowed=row.table==='SkaterStatsByGame'?ALLOWED_SKATER:ALLOWED_GOALIE;
 if(!st||typeof st!=='object'||Array.isArray(st)){
  errors.push(loc+': invalid stats object');return;
 }
 for(const name of Object.keys(st)){
  if(!allowed.has(name))errors.push(loc+': unsupported field '+name);
 }
 if(st.GP!==1)errors.push(loc+': GP must be one per observed appearance');
 if(row.table==='SkaterStatsByGame'){
  if(!['G','A','Pts','PIM','+/-','POTG'].every(f=>Number.isInteger(st[f])))
   errors.push(loc+': missing or noninteger skater statistic');
  else if(st.G<0||st.A<0||st.Pts<0||st.PIM<0||st.POTG<0||st.G+st.A!==st.Pts)
   errors.push(loc+': invalid skater scoring or discipline');
 }else{
  if(!Number.isInteger(st.GA)||st.GA<0)errors.push(loc+': goalie GA missing or invalid');
  if(st.POTG!==null&&(typeof st.POTG!=='number'||!Number.isInteger(st.POTG)||st.POTG<0))
   errors.push(loc+': goalie POTG must be confirmed integer or explicit null');
  if(!Object.hasOwn(st,'POTG'))errors.push(loc+': goalie POTG missing, use explicit null');
 }
}
function classify(pre,baseline){
 const prev=baseline.get(key(pre));
 if(!prev)return 'ADD_CANDIDATE';
 for(const [field,value] of Object.entries(pre.stats)){
  if(value===null)continue; // unknown input is never overwritten as zero
  if(!Object.hasOwn(prev.stats||{},field)||prev.stats[field]!==value)
   return 'CORRECTION_REVIEW';
 }
 return 'PRESERVE';
}
function evaluate(manifest){
 const errors=[],holds=[];
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))
  return {status:'FAIL_CLOSED',errors:['Missing input manifest'],holds:[],writeAuthorized:false};
 const {season,sourceWorkbookSha256,completedGames,workbookScoredGames,games,rows,cachedRows}=manifest;
 if(!SHA256.test(sourceWorkbookSha256||''))errors.push('Workbook baseline SHA256 missing');
 if(typeof season!=='string'||!/^W\d{4}\/\d{2}$/.test(season))errors.push('Invalid season identity');
 if(!Number.isInteger(completedGames)||completedGames<1)errors.push('Invalid official HTO completed GP');
 if(!Number.isInteger(workbookScoredGames)||workbookScoredGames<0)errors.push('Invalid saved workbook GP');
 if(!Array.isArray(games)||!games.length)errors.push('Missing game source manifest');
 if(!Array.isArray(rows)||!rows.length)errors.push('Missing source player-game rows');
 if(!Array.isArray(cachedRows))errors.push('Missing saved workbook row comparison');
 if(errors.length)return {status:'FAIL_CLOSED',errors,holds:[],writeAuthorized:false};
 const gameById=new Map(),gameNumbers=new Set();
 for(const g of games){
  if(!g||typeof g!=='object') {errors.push('Invalid HTO game entry');continue;}
  if(!Number.isInteger(g.htoId)||g.htoId<=0||gameById.has(g.htoId))
   errors.push('Invalid/duplicate official HTO game ID');
  if(!Number.isInteger(g.workbookGameNumber)||g.workbookGameNumber<=0||gameNumbers.has(g.workbookGameNumber))
   errors.push('Invalid/duplicate original workbook Game #');
  if(!validDay(g.date))errors.push('Invalid game date');
  if(!Number.isInteger(g.GF)||g.GF<0||!Number.isInteger(g.GA)||g.GA<0)
   errors.push('Missing valid HTO game score');
  let url;
  try{url=new URL(g.sourceUrl)}catch{errors.push('Invalid HTO game source URL');}
  if(url&&(url.protocol!=='https:'||url.hostname!=='www.htosports.com'||url.searchParams.get('gameID')!==String(g.htoId)))
   errors.push('HTO game source and game ID do not match');
  gameById.set(g.htoId,g);gameNumbers.add(g.workbookGameNumber);
 }
 if(games.length!==completedGames)errors.push('Game source count does not match completed HTO GP');
 const current=new Map(),perGameGoalies=new Map(),statsTotal={G:0,A:0,Pts:0,PIM:0,goalieGA:0,skaters:0,goalies:0,goaliePOTGUnknown:0};
 for(const r of rows){
  if(!r||typeof r!=='object'||!ROLE.has(r.table)||!Number.isInteger(r.workbookGameNumber)
      ||!Number.isInteger(r.htoGameId)||typeof r.name!=='string'||!r.name.trim()||INVALID_NAME.test(r.name)){
   errors.push('Invalid or unidentified player-game row');continue;
  }
  const g=gameById.get(r.htoGameId);
  if(!g||r.workbookGameNumber!==g.workbookGameNumber)
   errors.push(key(r)+': external-to-workbook game ID mismatch');
  if(current.has(key(r)))errors.push('Repeated player-game source identity '+key(r));
  current.set(key(r),r);
  validStats(r,errors);
  if(r.table==='SkaterStatsByGame'){
   statsTotal.skaters++;
   for(const f of ['G','A','Pts','PIM'])if(Number.isInteger(r.stats?.[f]))statsTotal[f]+=r.stats[f];
  }else{
   statsTotal.goalies++;perGameGoalies.set(r.htoGameId,(perGameGoalies.get(r.htoGameId)||0)+1);
   if(Number.isInteger(r.stats?.GA))statsTotal.goalieGA+=r.stats.GA;
   if(r.stats?.POTG===null)statsTotal.goaliePOTGUnknown++;
  }
 }
 for(const g of games){
  if(!g||typeof g!=='object')continue;
  if(perGameGoalies.get(g.htoId)!==1)errors.push('Expected one observed goaltender for HTO game '+g.htoId);
 }
 if(statsTotal.G!==games.reduce((s,g)=>s+g.GF,0))
  errors.push('Skater goals disagree with verified HTO game GF');
 if(statsTotal.goalieGA!==games.reduce((s,g)=>s+g.GA,0))
  errors.push('Goalie GA disagree with verified HTO game GA');
 const baseline=new Map();
 for(const r of cachedRows){
  if(!r||typeof r!=='object'||!ROLE.has(r.table)||!Number.isInteger(r.workbookGameNumber)||typeof r.name!=='string'||!r.name.trim()){
   errors.push('Invalid original cached game-row identity');continue;
  }
  if(baseline.has(key(r)))errors.push('Duplicate saved source workbook key '+key(r));
  baseline.set(key(r),r);
 }
 // Malformed or missing source facts are a hard hold, not a script exception.
 if(errors.length)return {status:'FAIL_CLOSED',errors,holds:['Source-integrity validation failed'],
  writeAuthorized:false,workbookModified:false,liveHTOContacted:false};
 const recordDecisions=[];
 for(const r of rows){
  if(!current.has(key(r)))continue;
  const decision=classify(r,baseline);
  recordDecisions.push({sourceKey:key(r),htoGameId:r.htoGameId,decision});
 }
 const decisions=Object.fromEntries(['PRESERVE','CORRECTION_REVIEW','ADD_CANDIDATE'].map(k=>[
  k,recordDecisions.filter(r=>r.decision===k).length
 ]));
 const quarantined=Array.from(baseline.values()).filter(r=>!current.has(key(r))).map(r=>key(r));
 if(workbookScoredGames!==completedGames)
  holds.push('Original AwardScoring GP does not match verified current HTO games');
 if(statsTotal.goaliePOTGUnknown)holds.push('One or more goalie-game POTG values remain explicitly unknown');
 if(decisions.CORRECTION_REVIEW)holds.push('Existing cached workbook inputs require independent correction review');
 if(decisions.ADD_CANDIDATE)holds.push('Missing player-game records require formula-preserving table expansion');
 if(quarantined.length)holds.push('Original cached-only identities require separate review, not deletion');
 if(!manifest.allElevenWorkbookFormulaParityVerified)holds.push('All 11 original workbook models lack independent formula parity');
 if(!manifest.independentReviewerAccepted)holds.push('Attributable independent QA acceptance not recorded');
 if(!manifest.founderApproved)holds.push('Founder activation decision not recorded');
 if(errors.length)holds.push('Source-integrity validation failed');
 return {
  status:errors.length?'FAIL_CLOSED':'RAW_INPUT_PREFLIGHT_PASS_RELEASE_HOLD',
  errors,holds,completedGames,
  statsTotal,decisions,sourceRecordCount:rows.length,
  quarantinedCachedOnly:quarantined,
  // This pure function is deliberately incapable of authorizing a workbook write.
  writeAuthorized:false,
  workbookModified:false,
  liveHTOContacted:false
 };
}
module.exports={evaluate};
