"use strict";
/* Produce the explicit league-strength assignment contract.
   This is not a league authorization; every tier starts UNASSIGNED. */
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../widgets");
const inFile=path.join(root,"leagueos_division_alignment_public_v2.json");
const outFile=path.join(root,"leagueos-division-strength-levels-v23.json");
const raw=JSON.parse(fs.readFileSync(inFile,"utf8"));
if(raw.schema!=="bruttech-division-alignment-research/v2"||raw.teams?.length!==96)
 throw Error("Cannot seed tiers from unverified 96-team model");
const unique=new Map();
for(const t of raw.teams){
 const key=[t.league_id,t.program,t.division].join("|");
 if(!unique.has(key))unique.set(key,{key,night:t.night,leagueId:t.league_id,program:t.program,
   sourceComponents:[],division:t.division,currentSourceTeamCount:0,
   level:null,approval:"UNASSIGNED",approvedAt:null,approvedByRole:null,
   authorityRef:null,effectiveFrom:null});
 unique.get(key).currentSourceTeamCount++;
 if(!unique.get(key).sourceComponents.includes(t.component_id))unique.get(key).sourceComponents.push(t.component_id);
}
const doc={schema:"bruttech-leagueos-division-strength-governance/v23",
 source:"Current public division labels; publisher authorizations are NOT connected",
 sourceModelCreatedAt:raw.created_at,createdAt:"2026-11-17",
 status:"LEAGUE_ASSIGNMENT_REQUIRED",
 officialChanges:false,assignmentLevels:[
  {level:1,label:"Top competitive",meaning:"Highest league-verified competition strength in the program"},
  {level:2,label:"Upper competitive",meaning:"Strong adult competitive play"},
  {level:3,label:"Middle competitive",meaning:"Intermediate competitive play"},
  {level:4,label:"Lower competitive",meaning:"Developmental competitive play"},
  {level:5,label:"Entry competitive",meaning:"Foundational competitive play"}],
 bindingRule:"League-approved comparable strength tiers must be assigned per division, season and program; do not infer from sponsor name or recent win/loss.",
 crossNightBridgePolicy:"No cross-night absolute strength calibration without authorized tiers, independently source-matched players, and adequate independent bridge IDs.",
 note:"Draft tier selections in public demo remain browser-local and MUST NOT alter official tier policy or produce official placement.",
 assignments:[...unique.values()].sort((a,b)=>a.night.localeCompare(b.night)||
 a.program.localeCompare(b.program)||a.division.localeCompare(b.division))
};
if(doc.assignments.length!==15)throw Error("Unexpected current division count "+doc.assignments.length);
fs.writeFileSync(outFile,JSON.stringify(doc,null,2)+"\n");console.log(JSON.stringify({status:"LEAGUE_LEVELS_UNASSIGNED",divisions:doc.assignments.length,
 file:outFile,programs:[...new Set(doc.assignments.map(a=>a.program))]}));
