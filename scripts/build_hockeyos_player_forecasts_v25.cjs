/* HockeyOS V25: private coach workbook calibration applied to source-qualified public HTO skaters.
 * Never publishes workbook rows, scouting notes, personal information, career rate
 * coefficients or raw workbook. Public output includes only model-derived projections.
 * This founder-controlled demo uses strict same-club name AND jersey matching.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,"../widgets");
const read=n=>{const b=fs.readFileSync(path.join(ROOT,n));return{d:JSON.parse(b),sha256:crypto.createHash("sha256").update(b).digest("hex"),file:n}};
const hto=read("hockeyos-hto-current-v20.json");
const PRIVATE_COACH_PATH=process.env.BRAVE_V25_PRIVATE_CALIBRATION_PATH||
 path.resolve(__dirname,"../../v25_private_coach_calibration_v25.json");
const privateBuffer=fs.readFileSync(PRIVATE_COACH_PATH);
const coach={d:JSON.parse(privateBuffer),sha256:crypto.createHash("sha256").update(privateBuffer).digest("hex"),
 file:"PRIVATE_COACH_WORKBOOK_LOCAL_ONLY_OUTSIDE_GIT_REPOSITORY"};
const requireSource=(v,s)=>{if(!v)throw Error("V25_HTO_COACH_PROJECTION_HOLD: "+s)};
requireSource(hto.d.schema==="bruttech-hockeyos-hto-public-current/v20"&&
 hto.d.sourceReadOnly===true&&hto.d.officialRecordEdited===false&&hto.d.skaters.length>=20&&
 hto.d.counts.skaters===hto.d.skaters.length,"HTO current source missing");
requireSource(coach.d.schema==="bruttech-hockeyos-coach-master-research-calibration/v25"&&
 coach.d.workbookResearchOnly===true&&coach.d.officialLeagueStrengthApproval===false&&
 coach.d.playerPriorsWithUniqueName>=20&&coach.d.sourceWorkbookSha256.length===64,
 "Coach historical prior research missing");
const clean=s=>String(s??"").trim().toLowerCase().replace(/[.\s]+/g," ").replace(/\s*,\s*/g,", ");
const clamp=(n,l,h)=>Math.max(l,Math.min(h,n));
const round=(n,nDec=1)=>Math.round(n*10**nDec)/10**nDec;
const byKey=new Map();
for(const p of coach.d.playerCareerPriors){
 const key=clean(p.name)+"|"+String(p.jersey).trim();
 if(byKey.has(key))throw Error("Duplicate coach prior identity key");
 byKey.set(key,p);
}
const HTO_GP=hto.d.teamTotals?.skaters?.gp;
requireSource(Number.isInteger(HTO_GP)&&HTO_GP>=6&&HTO_GP<=24,"HTO team GP out of source scope");
const LENGTH=24; // configurable model scenario, NOT an official league season guarantee
const meanG=hto.d.skaters.reduce((s,x)=>s+x.goals,0)/
 hto.d.skaters.reduce((s,x)=>s+x.gp,0);
const meanA=hto.d.skaters.reduce((s,x)=>s+x.assists,0)/
 hto.d.skaters.reduce((s,x)=>s+x.gp,0);
const modelled=[],held=[],matched=[];
for(const skater of hto.d.skaters){
 requireSource(skater.goals+skater.assists===skater.points&&
  Number.isInteger(skater.gp)&&skater.gp>=0,"HTO source arithmetic mismatch");
 const key=clean(skater.name)+"|"+String(skater.jersey??"").trim();
 const prior=byKey.get(key);
 if(prior)matched.push(skater.htoPlayerId);
 const histG=prior?.careerGPerAppearance??meanG;
 const histA=prior?.careerAPerAppearance??meanA;
 const pGames=prior?clamp(6+4*(prior.careerAttendance??.5),4,11):5;
 const gp=skater.gp,remaining=Math.max(0,LENGTH-HTO_GP);
 const gRate=(skater.goals+pGames*histG)/(gp+pGames);
 const aRate=(skater.assists+pGames*histA)/(gp+pGames);
 const attendance=prior&&Number.isFinite(prior.careerAttendance)?
   clamp(.65*(gp+1.8)/(HTO_GP+3)+.35*prior.careerAttendance,.07,1):
   clamp((gp+1.8)/(HTO_GP+3),.07,1);
 const futureGP=remaining*attendance;
 const G=skater.goals+gRate*futureGP;
 const A=skater.assists+aRate*futureGP;
 const confidence=gp>=5&&prior?"MEDIUM":gp>=3?"LOW_TO_MEDIUM":"LOW";
 const entry={
  htoPlayerId:skater.htoPlayerId,displayName:skater.name,jersey:skater.jersey,
  position:skater.position||null,sourceGP:skater.gp,
  sourceG:skater.goals,sourceA:skater.assists,sourcePts:skater.points,
  projectedSeasonGP:round(skater.gp+futureGP,1),
  projectedSeasonG:round(G,1),projectedSeasonA:round(A,1),
  projectedSeasonPoints:round(G+A,1),
  projectedPointsPerAppearance:round(gRate+aRate,2),
  likelyPointsBand80:[round(Math.max(0,G+A-1.28*Math.sqrt(Math.max(1,G+A))),1),
    round(G+A+1.28*Math.sqrt(Math.max(1,G+A)),1)],
  confidence,
  sourcePriorUsed:prior?"COACH_WORKBOOK_EXACT_NAME_AND_JERSEY":"HTO_PUBLIC_SOURCE_ONLY_NO_COACH_PRIOR",
  identityStatus:prior?"SAME_TEAM_NAME_JERSEY_REVIEWED_MODEL_INPUT_NOT_CROSS_PROVIDER_ID_BINDING":
   "NO_PRIVATE_COACH_PRIOR_MATCH",
  officialStatsChanged:false,
  profileUrl:skater.profileUrl
 };
 modelled.push(entry);
 if(!prior)held.push({htoPlayerId:skater.htoPlayerId,reason:"PRIVATE_COACH_SOURCE_MATCH_NOT_VERIFIED"});
}
const seen=new Set(modelled.map(x=>x.htoPlayerId));
requireSource(seen.size===modelled.length,"Duplicate published HTO source IDs");
const payload={
 schema:"bruttech-hockeyos-source-qualified-player-projections/v25",
 status:"DEMONSTRATION_PRIVATE_COACH_PRIOR_APPLIED_TO_PUBLIC_HTO_SNAPSHOT",
 product:"BruTTech HockeyOS — TeamOS",
 team:"Brave H.C.",season:"Winter 2026/27",
 calculatedAt:new Date().toISOString(),
 sourcePublicCapturedAt:hto.d.sourceCapturedAt,
 sourceOfficialTeamGP:HTO_GP,
 sourceHTOSha256:hto.sha256,
 workbookSourceSha256:coach.d.sourceWorkbookSha256,
 privateWorkbookOrFormulaRowsPublished:false,
 rawCoachCareerRatesPublished:false,
 privacy:"HTO publicly displayed player names and source stats only; no private workbook notes or biographical attributes.",
 officialRecordEdited:false,
 identityBindingAuthorized:false,
 seasonRegularGamesAssumption:LENGTH,
 leagueOfficialSeasonLengthVerified:false,
 methods:{
  goalAndAssistModel:"Separate empirical Bayes goals and assists per appearance, with exact source current GP, historical rate prior and attendance shrinkage",
  smallSample:"Source current GP and coach baseline pseudo-GP; unmatched players use public HTO mean, not invented prior player ability",
  missingCoachPlayer:"No name-only cross-provider merge. Model marks an exact-name-and-jersey prior match for research, not an official player ID binding",
  goalie:"Not modelled; comparable save and game-attendance evidence missing",
  projections:"Illustrative full 24-game season what-if, not official future goals, assists, points or guaranteed game attendance",
  historicalDuration:"Coach career G/A rate source may span 32-minute Winter and 48-minute Summer games; no source-verified normalized duration prior was applied, so resulting projection remains exploratory",
  bounds:"80% Poisson-style descriptive range, not calibrated interval"},
 counts:{sourceHTOSkaters:hto.d.skaters.length,
  playersWithCoachBaseline:matched.length,unmatchedSourcePlayers:held.length,
  publishedPlayers:modelled.length},
 players:modelled,
 identityReviewHolds:held,
 teamProjectedSkaterG:round(modelled.reduce((s,p)=>s+p.projectedSeasonG,0),1),
 teamProjectedSkaterA:round(modelled.reduce((s,p)=>s+p.projectedSeasonA,0),1),
 teamProjectedSkaterPts:round(modelled.reduce((s,p)=>s+p.projectedSeasonPoints,0),1)
};
fs.writeFileSync(path.join(ROOT,"hockeyos-player-projections-v25.json"),JSON.stringify(payload,null,2)+"\n");
console.log(JSON.stringify({status:payload.status,counts:payload.counts,
 sourceActualTeamGP:HTO_GP,fullSeasonAssumption:LENGTH,
 teamProjected:{G:payload.teamProjectedSkaterG,A:payload.teamProjectedSkaterA,
  P:payload.teamProjectedSkaterPts},
 example:payload.players.slice(0,2)},null,2));
