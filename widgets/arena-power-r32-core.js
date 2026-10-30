/* ENG CHAT 63 R3.2 — pure source-qualified Arena Power Rankings model.
 * Display-only transformations. No game predictions, automatic division moves or
 * player/RSVP data. Shared in Node QA and the browser.
 */
(function(root,factory){
 "use strict";
 const api=Object.freeze(factory());
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root)root.HockeyOSArenaR32=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const ADULT=Object.freeze(["Fazzari Partners","The Cristillo Division","Remax Division"]);
 const LABEL=Object.freeze({"Fazzari Partners":"Fazzari","The Cristillo Division":"Cristillo","Remax Division":"Remax"});
 const normal=s=>String(s||"").trim().toLowerCase();
 const number=x=>typeof x==="number"&&Number.isFinite(x);
 const safe=(x,n=2)=>number(x)?x.toFixed(n):"—";
 const need=(test,msg)=>{if(!test)throw Error("ARENA_R32_HELD:"+msg)};
 function verify(doc){
  need(doc?.schema==="brave-hc-league-intelligence/public-v1"&&doc.status==="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED"&&
   doc.currentSourceDataConcordant===true&&doc.leagueId===570&&doc.strengthModel?.type==="DESCRIPTIVE_NOT_PREDICTIVE"&&
   doc.strengthModel?.probabilityOfWinning===false&&typeof doc.sourceSHA256==="string"&&
   /^[0-9a-f]{64}$/.test(doc.sourceSHA256)&&doc.weeklyLedger?.schema==="brave-hc-svhl-weekly-context/v1"&&
   Array.isArray(doc.weeklyLedger.weeks)&&doc.weeklyLedger.weeks.length===doc.weeklyLedger.weeksRecorded,
   "UNVERIFIED_LEAGUE_SOURCE");
  const teams=doc.teams?.filter(t=>ADULT.includes(t.divisionNow))||[];
  need(teams.length===22&&new Set(teams.map(t=>t.sourceTeamId)).size===22, "SUNDAY_COHORT_NOT_22");
  need(teams.every(t=>Number.isInteger(t.sourceTeamId)&&t.sourceTeamId>0&&
   typeof t.leagueName==="string"&&t.leagueName.trim()&&
   t.record&&["gp","w","l","t","pts","gf","ga"].every(k=>Number.isInteger(t.record[k])&&t.record[k]>=0)&&
   t.record.gp===t.record.w+t.record.l+t.record.t&&
   t.record.gp===t.completedGames?.length&&
   t.strengthContext&&number(t.strengthContext.contextIndex)&&t.strengthContext.contextIndex>=0&&
   t.strengthContext.contextIndex<=100),"INCOMPLETE_TEAM_EVIDENCE");
  need(new Set(teams.map(t=>t.leagueName)).size===22,"DUPLICATE_TEAM_NAMES");
  return teams;
 }
 function calibration(teams){
  if(!Array.isArray(teams)||teams.length!==22)return null;
  const v=teams.map(t=>t.strengthContext?.contextIndex);
  if(v.some(x=>!number(x)))return null;
  v.sort((a,b)=>a-b);
  const median=(v[10]+v[11])/2;
  return Object.freeze({count:22,min:v[0],median,max:v[21],allTied:v[0]===v[21]});
 }
 function relative(raw,anchors){
  if(!number(raw)||!anchors||!number(anchors.min)||!number(anchors.median)||!number(anchors.max))return null;
  const {min,median,max}=anchors;
  if(raw<min||raw>max)return null;
  if(min===max)return 75;
  if(raw<=median){return median===min?75:Math.max(50,Math.min(100,50+25*(raw-min)/(median-min)))}
  return max===median?75:Math.max(50,Math.min(100,75+25*(raw-median)/(max-median)));
 }
 const hextorgb=h=>[1,3,5].map(k=>parseInt(h.slice(k,k+2),16));
 function mix(a,b,t){
  const A=hextorgb(a),B=hextorgb(b),v=Math.max(0,Math.min(1,t));
  return "#"+A.map((x,i)=>Math.round(x+(B[i]-x)*v).toString(16).padStart(2,"0")).join("");
 }
 function lightness(hex){
  const rgb=hextorgb(hex).map(v=>{const c=v/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)});
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 }
 function badge(raw,anchors){
  const score=relative(raw,anchors);
  if(!number(score))return Object.freeze({score:null,label:"Unrated",background:"#253949",text:"#f7f9fc",status:"HELD"});
  const background=score<=75?mix("#1768b8","#f4f7fc",(score-50)/25):mix("#f4f7fc","#c91f43",(score-75)/25);
  const l=lightness(background);
  const whiteContrast=1.05/(l+.05),darkContrast=(l+.05)/.05;
  const text=whiteContrast>=darkContrast?"#ffffff":"#000000";
  const tier=score<70?"Below Sunday median":score>80?"Above Sunday median":"Around Sunday median";
  return Object.freeze({score,label:tier,background,text,status:"SOURCE_CALIBRATED",contrast:Math.max(whiteContrast,darkContrast)});
 }
 function ranked(teams,anchors){
  return teams.map(t=>({team:t,score:relative(t.strengthContext.contextIndex,anchors)})).sort((a,b)=>
   b.team.strengthContext.contextIndex-a.team.strengthContext.contextIndex||
   a.team.sourceTeamId-b.team.sourceTeamId).map((row,i)=>({...row,rank:i+1}));
 }
 function gamesVerified(t){
  if(!t||!Array.isArray(t.completedGames)||t.completedGames.length!==t.record.gp)return false;
  const seen=new Set(),c={W:0,L:0,T:0};
  for(const g of t.completedGames){
   if(!g||typeof g.opponent!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(g.date)||
      !number(g.gf)||!number(g.ga)||g.gf<0||g.ga<0||!["W","L","T"].includes(g.result)||
      (g.result==="W"&&g.gf<=g.ga)||(g.result==="L"&&g.gf>=g.ga)||
      (g.result==="T"&&g.gf!==g.ga))return false;
   const id=g.date+"|"+g.opponent;
   if(seen.has(id))return false;seen.add(id);c[g.result]++;
  }
  return c.W===t.record.w&&c.L===t.record.l&&c.T===t.record.t;
 }
 function streak(t){
  if(!gamesVerified(t)||!t.completedGames.length)return null;
  const a=[...t.completedGames].sort((x,y)=>y.date.localeCompare(x.date)),kind=a[0].result;
  let count=0;for(const x of a){if(x.result!==kind)break;count++}
  return {kind,count,label:(kind==="W"?"Won ":kind==="L"?"Lost ":"Tied ")+count};
 }
 function rates(t){
  const r=t.record,den=r.gp;
  const v=(n)=>den>0?n/den:null;
  return {gp:den,ptsPerGame:v(r.pts),gfPerGame:v(r.gf),gaPerGame:v(r.ga),gdPerGame:v(r.gf-r.ga),
   winDecimal:den>0?((r.w+.5*r.t)/den).toFixed(3).replace(/^0(?=\.)/,""):null};
 }
 function splitByOpponentCurrentDivision(t,source,allTeams=source){
  if(!gamesVerified(t))return {status:"HELD",reason:"INCOMPLETE_COMPLETED_GAME_LEDGER",groups:[]};
  const byName=new Map(allTeams.map(x=>[normal(x.leagueName),x]));
  const groups=new Map(ADULT.map(d=>[d,{division:d,gp:0,w:0,l:0,t:0,gf:0,ga:0}]));
  let included=0,excluded=0;
  for(const g of t.completedGames){
   const opp=byName.get(normal(g.opponent)),d=g.opponentCurrentDivision;
   if(!opp||opp.sourceTeamId===t.sourceTeamId||opp.divisionNow!==d)
     return {status:"HELD",reason:"UNVERIFIED_CURRENT_OPPONENT_DIVISION",groups:[]};
   if(!groups.has(d)){excluded++;continue} // official opponents outside the three adult Sunday research divisions
   const row=groups.get(d);row.gp++;row[g.result.toLowerCase()]++;row.gf+=g.gf;row.ga+=g.ga;included++;
  }
  if(included+excluded!==t.record.gp)return {status:"HELD",reason:"DIVISION_SPLIT_PARITY_FAILED",groups:[]};
  const values=[...groups.values()].filter(x=>x.gp>0).map(x=>({
   ...x,ptsPerGame:(2*x.w+x.t)/x.gp,gfPerGame:x.gf/x.gp,gaPerGame:x.ga/x.gp,
   gdPerGame:(x.gf-x.ga)/x.gp}));
  return {status:"VERIFIED_CURRENT_OPPONENT_DIVISIONS",groups:values,games:included,excludedGames:excluded,
   caveat:"Results grouped by OPPONENTS' CURRENT divisions, not the team's division at game time. Opponents outside the three adult Sunday research divisions are explicitly excluded."};
 }
 function membership(t,league){
  const events=league?.movementLedger?.events;
  if(!Array.isArray(events))return {status:"HELD",events:[],impact:"NO_VERIFIED_MEMBERSHIP_LEDGER"};
  const matches=events.filter(x=>x.sourceTeamId===t.sourceTeamId);
  return {status:matches.length?"OBSERVED_MOVEMENT":"NO_RECORDED_MOVEMENT",events:matches,
   impact:"HELD_EFFECTIVE_DATE_AND_PRE_POST_COVERAGE",
   actualBeforeAfterSupported:false};
 }
 function formEvidence(t,league){
  const sourceWeeks=league?.weeklyLedger?.weeksRecorded;
  const last=gamesVerified(t)?[...t.completedGames].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3):[];
  const recent={W:0,L:0,T:0};
  last.forEach(g=>{recent[g.result]++});
  const enough=Number.isInteger(sourceWeeks)&&sourceWeeks>=4&&t.record.gp>=10;
  return {status:"HELD",label:"FORM · WATCH",category:null,sourceWeeks:sourceWeeks??0,
   recentGames:last.length,recentRecord:recent,
   reason:!enough?"NEEDS_4_VERIFIED_WEEKS_AND_10_GP":"TEAM_OPPONENT_ADJUSTED_TREND_MODEL_NOT_YET_ACCEPTED",
   divisionRelativeForm:null,leagueRelativeForm:null,
   note:"Recent verified results are not sufficient to label Hot or Cold in the context of two comparison pools."};
 }
 function divisionSummary(source){
  return ADULT.map(d=>{
   const rows=source.filter(t=>t.divisionNow===d);
   const scores=rows.map(t=>t.strengthContext.contextIndex).sort((a,b)=>a-b);
   if(!rows.length)return null;
   return {division:d,clubCount:rows.length,mean:scores.reduce((x,y)=>x+y,0)/scores.length,
    median:scores.length%2? scores[(scores.length-1)/2]:
      (scores[scores.length/2-1]+scores[scores.length/2])/2,
    min:scores[0],max:scores.at(-1),
    teams:[...rows].sort((a,b)=>b.strengthContext.contextIndex-a.strengthContext.contextIndex)};
  });
 }
 function comparator(t,source,anchors){
  const same=source.filter(x=>x.divisionNow===t.divisionNow)
   .sort((a,b)=>b.strengthContext.contextIndex-a.strengthContext.contextIndex||
    a.sourceTeamId-b.sourceTeamId);
  const full=ranked(source,anchors);
  return {
   divisionRank:same.findIndex(x=>x.sourceTeamId===t.sourceTeamId)+1,
   divisionCount:same.length,
   leagueRank:full.find(x=>x.team.sourceTeamId===t.sourceTeamId)?.rank,
   leagueCount:full.length,
   divisionMedian:divisionSummary(source).find(x=>x.division===t.divisionNow)?.median,
   sundayMedian:anchors.median,
   relativeToDivision:t.strengthContext.contextIndex-
    divisionSummary(source).find(x=>x.division===t.divisionNow).median,
   relativeToLeague:t.strengthContext.contextIndex-anchors.median
  };
 }
 return Object.freeze({ADULT,LABEL,verify,calibration,relative,badge,ranked,
  gamesVerified,streak,rates,splitByOpponentCurrentDivision,membership,formEvidence,
  divisionSummary,comparator,safe});
});
