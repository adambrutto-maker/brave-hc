/* LeagueOS V24: source-dated historical division names, NOT invented tiers.
 * No player identities or public bios are published into this summary. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"../widgets");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const tierFile="leagueos-division-strength-levels-v23.json",historicalFile="svhl-roster-intelligence.json";
const tiersBuf=fs.readFileSync(path.join(root,tierFile)),archiveBuf=fs.readFileSync(path.join(root,historicalFile));
const tiers=JSON.parse(tiersBuf),archive=JSON.parse(archiveBuf);
const need=(x,why)=>{if(!x)throw Error("V24_TIER_LEDGER_HOLD: "+why)};
need(tiers.schema==="bruttech-leagueos-division-strength-governance/v23"&&
 tiers.assignments?.length===15&&tiers.assignments.every(x=>x.level===null&&x.approval==="UNASSIGNED"),
 "Official current tier manifest is not all unassigned");
need(archive.schema==="brave-hc-public-svhl-roster-seasons/v1"&&
 archive.status==="SOURCE_LINKED_OFFICIAL_ROSTER_SEASON_OBSERVATIONS"&&
 archive.sourceLeagueId===570&&archive.teams?.length===22,
 "Archived Sunday source is not the exact qualified manifest");
const heldStats={missingID:0,notQualified:0,missingDivision:0};
const seasonDivision=new Map();
for(const current of archive.teams){
 for(const player of current.players||[]){
  const id=String(player.playerId||"");
  if(!/^\d{3,9}$/.test(id)){heldStats.missingID++;continue}
  for(const prior of player.previousOfficialObservations||[]){
   if(prior.statStatus!=="PUBLISHED_ARITHMETICALLY_CONSISTENT"||
      !Number.isInteger(prior.gp)||prior.gp<1){
      heldStats.notQualified++;continue;
   }
   if(!Number.isInteger(prior.leagueId)||typeof prior.season!=="string"||
      typeof prior.division!=="string"||!prior.division.trim()){
      heldStats.missingDivision++;continue;
   }
   const key=[prior.leagueId,prior.season,prior.division].join("|");
   if(!seasonDivision.has(key))seasonDivision.set(key,{
     key,leagueId:prior.leagueId,season:prior.season,division:prior.division,
     observedPlayerIds:new Set(),totalObservedGP:0,
     observedTeamPages:new Set()});
   const node=seasonDivision.get(key);
   node.observedPlayerIds.add(id);node.totalObservedGP+=prior.gp;
   node.observedTeamPages.add(current.sourceTeamId);
  }
 }
}
const historical=[...seasonDivision.values()].map(x=>({
  key:x.key,leagueId:x.leagueId,season:x.season,division:x.division,
  exactPlayerIdSourceCoverage:x.observedPlayerIds.size,
  observedGP:x.totalObservedGP,sourceCurrentTeamPages:x.observedTeamPages.size,
  officialAssignedStrengthLevel:null,approvalStatus:"HISTORICAL_LEVEL_NOT_VERIFIED",
  effectiveFrom:null,effectiveTo:null,officialApprovalRef:null,
  seasonFormatVerified:false,
  permittedToCalibrateCrossNight:false
})).sort((a,b)=>b.season.localeCompare(a.season)||a.division.localeCompare(b.division));
const active=tiers.assignments.map(a=>({
 key:a.key,leagueId:a.leagueId,night:a.night,program:a.program,
 division:a.division,sourceTeamCount:a.currentSourceTeamCount,
 officialStrengthLevel:null,approvalStatus:"CURRENT_LEVEL_UNASSIGNED",
 effectiveFrom:null,effectiveTo:null,approvedBy:null,officialApprovalRef:null,
 peerComparabilityScope:"LEAGUE_NIGHT_AND_PROGRAM_ONLY",
 schedulePlacementAuthorized:false
}));
need(active.length===15&&historical.length>=18&&heldStats.missingID===0,
 "Official current/historical division evidence too small");
const result={
 schema:"bruttech-leagueos-strength-level-history/v24",
 status:"PUBLIC_DIVISION_HISTORY_NO_APPROVED_LEVELS",
 sourceAsOf:archive.asOf,sourceScope:"CURRENT_FOUR_NIGHT_DIVISIONS_AND_ARCHIVED_SUNDAY_DIVISION_PLAYER_EVIDENCE",
 sourceReadonly:true,officialChanges:false,
 officialApprovalsConnected:false,
 sourceSha256:{currentTiers:sha(tiersBuf),historicalSundayRoster:sha(archiveBuf)},
 policy:{
  effectiveDating:"Every approved level must have season, program, division, effectiveFrom, effectiveTo or active flag, approver role, approval source and policy version.",
  sourceIdentity:"Current division by leagueId/program/season/name; historical by exact leagueId/season/division name. Never use sponsor name as proof of absolute strength.",
  crossNightCalibration:"Do not convert historical player production or compare absolute team tiers until independent league approval and cohort validation.",
  eligibility:"Masters/Open/Separate program are separate eligibility scopes; cross-night playerID does not imply registration approval.",
  publicDemo:"No authority to approve classifications. Browser-local proposals never update this ledger."},
 strengthLevels:tiers.assignmentLevels,
 counts:{currentDivisions:active.length,officialCurrentAssignments:0,
 historicalDivisionSeasonLabels:historical.length,officialHistoricalAssignments:0,
 historicalSourceHeldObservations:Object.values(heldStats).reduce((a,b)=>a+b,0)},
 currentDivisions:active,historicalEvidence:historical,
 officialAssignmentEvents:[]
};
fs.writeFileSync(path.join(root,"leagueos-strength-level-history-v24.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({status:result.status,counts:result.counts,
 historicalPreview:historical.slice(0,7).map(x=>({season:x.season,division:x.division,players:x.exactPlayerIdSourceCoverage})),
 officialChanges:false},null,2));
