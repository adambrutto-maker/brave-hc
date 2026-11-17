/**
 * BruTTech LeagueOS V22 — original facts-only source comparison and review model.
 * NEVER writes HTO/SVHL, never reuses proprietary HTO source/interface code.
 * Input: three existing dated, public / approved-source snapshots.
 * Output: one auditable generated reconciliation artifact for independent demo.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,"../widgets");
const OUT=path.join(ROOT,"leagueos-reconciliation-v22.json");
const INPUTS={
 league:"leagueos-source-qualified-current-fixtures-v4.json",
 hto:"hockeyos-hto-games-v21.json",
 upcoming:"svhl-upcoming.json"
};
const CLUB="Braves HC",HTO_CLUB="Brave H.C.";
const SCHEMA="bruttech-leagueos-public-reconciliation/v22";
const LEAGUE_URL="https://leagues.sportsvillage.ca/";
const HTO_URL="https://www.htosports.com/teams/default.asp?";
const aliases=Object.freeze({"Mohawks HC":"Mohawks H.C."});
const fail=m=>{throw Error("V22 SOURCE HOLD: "+m)};
const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 !Number.isNaN(Date.parse(v+"T12:00:00Z"))&&new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v;
const validTime=v=>typeof v==="string"&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
function input(name){
 const file=path.join(ROOT,INPUTS[name]);const bytes=fs.readFileSync(file);
 return{data:JSON.parse(bytes.toString("utf8")),
  name:INPUTS[name],sha256:crypto.createHash("sha256").update(bytes).digest("hex")};
}
const inputs=Object.fromEntries(Object.keys(INPUTS).map(k=>[k,input(k)]));
const league=inputs.league.data,hto=inputs.hto.data,upcoming=inputs.upcoming.data;
if(league.schema!=="bruttech-svhl-current-fixture-window/v4"||!Array.isArray(league.fixtures)||
  !league.counts||league.fixtures.length!==league.counts.total)fail("League registry schema/count");
if(hto.schema!=="bruttech-hockeyos-hto-games/v21"||hto.team!==HTO_CLUB||
  hto.sourceReadOnly!==true||hto.officialRecordEdited!==false||
  !Array.isArray(hto.games)||hto.counts?.totalVerifiedGames!==hto.games.length)
 fail("HTO current-season schema/authority");
if(upcoming.schema!=="brave-hc-svhl-schedule/v1"||!Array.isArray(upcoming.games)||
 !upcoming.source?.startsWith(LEAGUE_URL)||!Number.isFinite(Date.parse(upcoming.checkedAt)))
 fail("Supplemental future fixture source missing");
if(league.counts.completed+league.counts.future+league.counts.held!==league.counts.total)
 fail("League status counts do not sum to registry");
if(!validDate(league.captured_date)||!Number.isFinite(Date.parse(hto.sourceCapturedAt)))
 fail("Dated source evidence missing");
const ids=new Set();
for(const f of league.fixtures){
 const key=f.league_id+":"+f.game_id;
 if(ids.has(key)||!Number.isInteger(f.game_id)||!Number.isInteger(f.league_id)||
  !validDate(f.date)||!validTime(f.time)||!["COMPLETED_SOURCE_VERIFIED","FUTURE_RECIPROCAL_FIXTURE","PAST_ZERO_ZERO_HOLD"].includes(f.status)||
  ![f.home,f.away].every(x=>typeof x==="string"&&x.trim()&&x.length<180)||
  typeof f.official_game_url!=="string"||!f.official_game_url.startsWith(LEAGUE_URL))
 fail("Invalid source fixture "+key);
 ids.add(key);
 if(f.status==="PAST_ZERO_ZERO_HOLD"&&f.scores!==null)fail("Held 0:0 must remain unscored");
 if(f.status==="FUTURE_RECIPROCAL_FIXTURE"&&f.scores!==null)fail("Future cannot have final score");
 if(f.status==="COMPLETED_SOURCE_VERIFIED"&&
   (!f.scores||!["home","away"].every(side=>Number.isInteger(f.scores[side])&&f.scores[side]>=0)))
 fail("Completed official-source score shape invalid");
}
const brave=league.fixtures.filter(f=>f.league_id===570&&[f.home,f.away].includes(CLUB));
const allHto=new Map(),usedHtoIds=new Set();
for(const g of hto.games){
 if(!/^\d{6,9}$/.test(g.htoGameId)||allHto.has(g.htoGameId)||
  !validDate(g.date)||!validTime(g.timeLocal)||
  typeof g.opponent!=="string"||!g.opponent.trim()||
  typeof g.sourceUrl!=="string"||!g.sourceUrl.startsWith(HTO_URL))
 fail("Invalid/duplicate HTO game ID");
 allHto.set(g.htoGameId,g);
}
const futureSignatures=new Set();
for(const f of upcoming.games){
 if(!validDate(f.date)||!validTime(f.time)||!f.opponent||typeof f.opponent!=="string"||
  !["MATCH","ADD_HTO","REVIEW_RESCHEDULE"].includes(f.htoSyncStatus)||
  !["home","away"].includes(f.side)||typeof f.assignmentKey!=="string")fail("Supplemental input shape");
 const sig=f.date+"|"+f.time+"|"+f.opponent;
 if(futureSignatures.has(sig))fail("Duplicate supplemental future fixture");
 futureSignatures.add(sig);
}
function leagueOpponent(f){return f.home===CLUB?f.away:f.home}
function scoreForClub(f){
 if(!f.scores)return null;
 return f.home===CLUB?
  {club:f.scores.home,opponent:f.scores.away}:
  {club:f.scores.away,opponent:f.scores.home};
}
function rinkShort(s){return typeof s==="string"?s.replace(/^Vaughan Sports Village - /,""):null}
function links(f,g){
 const list=[];
 if(f)list.push({label:"SVHL game source",href:f.official_game_url});
 if(g)list.push({label:g.status==="COMPLETED_HTO_BOX_SCORE"?"HTO box score":"HTO preview",href:g.sourceUrl});
 return list;
}
const cases=[];
function register(item){
 if(cases.some(c=>c.id===item.id))fail("Duplicate reconciliation case ID "+item.id);
 cases.push({...item,crossSystemIdBinding:"NOT_OFFICIALLY_AUTHORIZED",
  officialWriteAllowed:false});
}
for(const f of brave){
 const other=leagueOpponent(f),exact=hto.games.filter(g=>
  g.date===f.date&&g.timeLocal===f.time&&g.opponent===other);
 const alias=Object.prototype.hasOwnProperty.call(aliases,other)?
  hto.games.filter(g=>g.date===f.date&&g.timeLocal===f.time&&g.opponent===aliases[other]):[];
 if(exact.length>1||alias.length>1)fail("Ambiguous HTO candidates for "+f.game_id);
 if(exact.length&&alias.length)fail("Both exact and alias matches for "+f.game_id);
 const g=exact[0]||alias[0]||null,matchedBy=exact.length?"EXACT_LITERAL_TUPLE":
  alias.length?"CONTROLLED_ALIAS_REVIEW_ONLY":"NO_MATCH";
 const isCompleted=f.status==="COMPLETED_SOURCE_VERIFIED";
 const leagueScore=scoreForClub(f);
 let category="SOURCE_MATCH_MISSING_HOLD",priority="HIGH",explanation="No HTO record matches the public game date, time and opponent.";
 let scoreParity=null,rinkParity=null;
 if(g){
  if(usedHtoIds.has(g.htoGameId))fail("One HTO game ID cannot be paired to two league fixtures");
  usedHtoIds.add(g.htoGameId);
  const htoComplete=g.status==="COMPLETED_HTO_BOX_SCORE";
  if(leagueScore&&g.score)scoreParity=leagueScore.club===g.score.club&&leagueScore.opponent===g.score.opponent;
  if(f.rink&&g.rink)rinkParity=rinkShort(g.rink)===f.rink;
  if(isCompleted!==htoComplete){
   category="STATE_CONFLICT_HOLD";explanation="HTO and league sources disagree whether this game is completed.";
  }else if(isCompleted&&scoreParity!==true){
   category="RESULT_CONFLICT_HOLD";explanation="Completed final scores disagree across public sources.";
  }else if(matchedBy==="CONTROLLED_ALIAS_REVIEW_ONLY"){
   category="NAME_ALIAS_REVIEW_HOLD";priority="MEDIUM";
   explanation="Opponent differs in published punctuation. Date/time and score align, but club identity needs source confirmation.";
  }else if(!isCompleted&&rinkParity===false){
   category="VENUE_CONFLICT_HOLD";explanation="HTO and league source rink assignments differ.";
  }else if(isCompleted){
   category="PUBLIC_COMPLETED_PARITY_OBSERVED";priority="INFO";
   explanation="Date, time, exact opponent and final result agree across independent public sources. IDs are not officially bound.";
  }else{
   category="PUBLIC_FUTURE_PARITY_OBSERVED";priority="INFO";
   explanation="Future HTO preview and reciprocal league fixture agree on date, time, opponent and rink; not an approved administrative linkage.";
  }
 }
 register({
  id:"league:"+f.league_id+":"+f.game_id,caseType:"BRAVE_MATCHUP",
  category,priority,reviewRequired:category.endsWith("_HOLD"),
  leagueId:f.league_id,leagueGameId:f.game_id,htoGameId:g?.htoGameId||null,
  date:f.date,time:f.time,night:f.night,home:f.home,away:f.away,opponent:other,
  rinkLeague:f.rink||null,rinkHto:g?.rink||null,leagueState:f.status,
  htoState:g?.status||null,matchedBy,leagueScore,htoScore:g?.score?
   {club:g.score.club,opponent:g.score.opponent}:null,
  scoreParity,rinkParity,explanation,links:links(f,g),
  sourceOfRecord:"RECIPROCAL_SVHL_FIXTURE_AND_INDEPENDENT_HTO_COMPARISON",
  sourceWarning:"Observed public data comparison, not an authenticated league cross-system binding."
 });
}
for(const g of hto.games){
 if(!usedHtoIds.has(g.htoGameId)){
  register({id:"hto-unmatched:"+g.htoGameId,caseType:"HTO_UNPAIRED",
   category:"HTO_WITHOUT_LEAGUE_FIXTURE_HOLD",priority:"HIGH",reviewRequired:true,
   leagueId:null,leagueGameId:null,htoGameId:g.htoGameId,date:g.date,time:g.timeLocal,night:g.weekday,
   home:HTO_CLUB,away:g.opponent,opponent:g.opponent,rinkLeague:null,rinkHto:g.rink,
   leagueState:null,htoState:g.status,matchedBy:"NO_MATCH",leagueScore:null,
   htoScore:g.score?{club:g.score.club,opponent:g.score.opponent}:null,
   scoreParity:null,rinkParity:null,
   explanation:"HTO game did not match a reciprocal Brave H.C. game in the scoped league registry.",
   links:links(null,g),sourceOfRecord:"HTO_CURRENT_SEASON_UNPAIRED",
   sourceWarning:"HTO source only; never invent a source game ID."
  });
 }
}
const proposalSeen=new Set();
for(const p of upcoming.games){
 const exactRegistry=brave.filter(f=>f.date===p.date&&f.time===p.time&&leagueOpponent(f)===p.opponent);
 if(exactRegistry.length>1)fail("Ambiguous league future proposal "+p.date);
 if(exactRegistry.length===1){
  const found=cases.find(c=>c.leagueId===exactRegistry[0].league_id&&c.leagueGameId===exactRegistry[0].game_id);
  if(!found)fail("Missing matching derived league case");
  if(p.htoGameId&&p.htoGameId!==found.htoGameId)fail("Supplemental HTO ID conflicts exact game source");
  if(p.htoSyncStatus==="MATCH"&&found.category!=="PUBLIC_FUTURE_PARITY_OBSERVED")
    fail("Supplemental match claims HTO parity not found in two primary sources");
  found.supplementalStatus=p.htoSyncStatus;found.supplementalAssignmentKey=p.assignmentKey;
  found.supplementalRink=p.rink;
  if(p.rink!==found.rinkLeague)fail("Supplemental rink disagrees on exact future fixture");
  continue;
 }
 const key="proposal:"+p.date+":"+p.time+":"+p.opponent.toLowerCase().replace(/[^a-z0-9]+/g,"-");
 if(proposalSeen.has(key))fail("Duplicate unpaired proposal");proposalSeen.add(key);
 const reused=p.htoGameId?allHto.get(p.htoGameId):null;
 let category="SUPPLEMENTAL_FUTURE_HTO_MISSING_HOLD",priority="MEDIUM";
 let explanation="Dated supplemental league-team schedule lists a future assignment absent from the public HTO games and the bounded 411-game source registry. Confirm with official HTO before promoting it.";
 if(reused&&reused.status==="COMPLETED_HTO_BOX_SCORE"&&reused.date!==p.date){
  category="HISTORICAL_HTO_ID_REUSED_HOLD";priority="CRITICAL";
  explanation="This future assignment points to an HTO ID already used by a completed historical game on "+reused.date+". Do not relink or reuse that ID.";
 }else if(p.htoGameId){
  category="SUPPLEMENTAL_UNVERIFIED_HTO_REFERENCE_HOLD";priority="HIGH";
  explanation="Future proposal carries an HTO reference without an exact upcoming HTO fixture match.";
 }
 register({id:key,caseType:"SUPPLEMENTAL_FUTURE_PROPOSAL",category,priority,reviewRequired:true,
  leagueId:570,leagueGameId:null,htoGameId:p.htoGameId||null,
  referencedHtoGameDate:reused?.date||null,
  referencedHtoGameStatus:reused?.status||null,
  date:p.date,time:p.time,night:"Sunday",home:p.side==="home"?CLUB:p.opponent,
  away:p.side==="home"?p.opponent:CLUB,opponent:p.opponent,
  rinkLeague:p.rink,rinkHto:reused?.rink||null,
  leagueState:"SUPPLEMENTAL_UNVERIFIED_FUTURE",htoState:reused?.status||null,
  matchedBy:"NOT_IN_SOURCE_REGISTRY",leagueScore:null,htoScore:null,
  scoreParity:null,rinkParity:null,explanation,
  links:[{label:"League public schedule",href:upcoming.source},
   ...(reused?[{label:"Referenced historical HTO game",href:reused.sourceUrl}]:[])],
  supplementalStatus:p.htoSyncStatus,supplementalAssignmentKey:p.assignmentKey,
  sourceOfRecord:"SEPARATE_DATED_TEAM_SCHEDULE_FEED_NOT_CANONICAL_FIXTURE_REGISTRY",
  sourceWarning:"Supplemental evidence only; no HTO future game is confirmed."
 });
}
const zeroHolds=league.fixtures.filter(f=>f.status==="PAST_ZERO_ZERO_HOLD");
for(const f of zeroHolds)register({
 id:"hold:"+f.league_id+":"+f.game_id,caseType:"UNRESOLVED_LEAGUE_RESULT",
 category:"LEAGUE_UNRESOLVED_ZERO_ZERO_HOLD",priority:"MEDIUM",reviewRequired:true,
 leagueId:f.league_id,leagueGameId:f.game_id,htoGameId:null,
 date:f.date,time:f.time,night:f.night,home:f.home,away:f.away,
 opponent:null,rinkLeague:f.rink||null,rinkHto:null,
 leagueState:f.status,htoState:null,matchedBy:"NOT_APPLICABLE",leagueScore:null,
 htoScore:null,scoreParity:null,rinkParity:null,
 explanation:"Past zero-zero source was held by original registry and has no verified game outcome; not a published 0–0 tie.",
 links:links(f,null),sourceOfRecord:"SVHL_HELD_SOURCE_ROW_ONLY",
 sourceWarning:"No verified score; do not award points, goals or standings."
});
const counts={
 leagueRegistry:league.counts.total,completedLeague:league.counts.completed,
 futureLeague:league.counts.future,heldLeague:league.counts.held,
 braveLeagueGames:brave.length,htoBraveGames:hto.games.length,
 supplementalBraveProposals:upcoming.games.length,
 observedPublicParity:cases.filter(c=>["PUBLIC_COMPLETED_PARITY_OBSERVED","PUBLIC_FUTURE_PARITY_OBSERVED"].includes(c.category)).length,
 completedExact:cases.filter(c=>c.category==="PUBLIC_COMPLETED_PARITY_OBSERVED").length,
 futureExact:cases.filter(c=>c.category==="PUBLIC_FUTURE_PARITY_OBSERVED").length,
 reviewQueue:cases.filter(c=>c.reviewRequired).length,
 heldNameAlias:cases.filter(c=>c.category==="NAME_ALIAS_REVIEW_HOLD").length,
 heldFutureNoHto:cases.filter(c=>c.category==="SUPPLEMENTAL_FUTURE_HTO_MISSING_HOLD").length,
 heldReusedHtoId:cases.filter(c=>c.category==="HISTORICAL_HTO_ID_REUSED_HOLD").length,
 heldZeroZero:cases.filter(c=>c.category==="LEAGUE_UNRESOLVED_ZERO_ZERO_HOLD").length,
 totalCases:cases.length
};
if(counts.braveLeagueGames!==9||counts.htoBraveGames!==9||
   counts.supplementalBraveProposals!==6||counts.completedExact!==7||
   counts.futureExact!==1||counts.heldNameAlias!==1||
   counts.heldFutureNoHto!==4||counts.heldReusedHtoId!==1||
   counts.heldZeroZero!==10||counts.reviewQueue!==16||
   counts.totalCases!==24||counts.observedPublicParity!==8)
 fail("Unexpected base source mapping; investigate before publishing: "+JSON.stringify(counts));
const priorityOrder={CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3,INFO:4};
cases.sort((a,b)=>(priorityOrder[a.priority]-priorityOrder[b.priority])||
 b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
const artifact={
 schema:SCHEMA,createdAt:new Date().toISOString(),
 mode:"PUBLIC_DEMO_SOURCE_REVIEW_ONLY",
 scope:"BRAVE_HC_CROSS_SOURCE_PILOT_AND_LEAGUE_ZERO_ZERO_HOLDS",
 officialWriteAllowed:false,authenticatedReviewAvailable:false,
 state:"DATED_PUBLIC_SOURCE_REVIEW_NOT_LIVE_SYNC",
 comparisonPolicy:"Date/time and literal opponent + certified score or rink parity; punctuation alias is always held. Never authorize cross-system IDs from a text match.",
 counts,inputs:{
  league:{file:inputs.league.name,sha256:inputs.league.sha256,capturedAt:league.captured_date,source:league.source},
  hto:{file:inputs.hto.name,sha256:inputs.hto.sha256,capturedAt:hto.sourceCapturedAt,source:hto.sourceAuthority},
  upcoming:{file:inputs.upcoming.name,sha256:inputs.upcoming.sha256,capturedAt:upcoming.checkedAt,source:upcoming.source}
 },
 sourceLinks:{
  officialLeague:"https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY",
  officialHto:"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=schedule"
 },
 classifications:[
  {code:"PUBLIC_COMPLETED_PARITY_OBSERVED",meaning:"Independent completed source date/time/opponent/final parity; no authenticated cross-ID binding"},
  {code:"PUBLIC_FUTURE_PARITY_OBSERVED",meaning:"Independent HTO preview and reciprocal league fixture agree; no official administrative approval"},
  {code:"NAME_ALIAS_REVIEW_HOLD",meaning:"Only explicitly observed club-name punctuation alias; identity cannot be assumed"},
  {code:"HISTORICAL_HTO_ID_REUSED_HOLD",meaning:"Unverified future proposal references a completed historical HTO game"},
  {code:"SUPPLEMENTAL_FUTURE_HTO_MISSING_HOLD",meaning:"Future schedule proposal without HTO source ID or canonical league-registry row"},
  {code:"LEAGUE_UNRESOLVED_ZERO_ZERO_HOLD",meaning:"Past ambiguous score held; not a verified draw"}
 ],
 cases
};
fs.writeFileSync(OUT,JSON.stringify(artifact,null,2)+"\n","utf8");
console.log(JSON.stringify({
 status:"V22_RECONCILIATION_DERIVED_WITHOUT_OFFICIAL_WRITES",
 destination:OUT,counts,critical:cases.filter(c=>c.priority==="CRITICAL")
  .map(c=>({id:c.id,htoGameId:c.htoGameId,referencedHtoGameDate:c.referencedHtoGameDate,date:c.date})),
 alias:cases.filter(c=>c.category==="NAME_ALIAS_REVIEW_HOLD")
  .map(c=>({id:c.id,leagueGameId:c.leagueGameId,htoGameId:c.htoGameId,opponent:c.opponent})),
 sourceHashes:Object.fromEntries(Object.entries(artifact.inputs).map(([k,v])=>[k,v.sha256.slice(0,12)]))
},null,2));
