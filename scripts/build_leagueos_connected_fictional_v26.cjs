/* BruTTech SportsOS V26: independently authored FICTIONAL connected-workflow seed.
   No real team registration, identities, payment receipts, payment processing,
   HTO/SVHL roster, backend writes, league authorization or signed QR data.
*/
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const out=path.resolve(__dirname,"../widgets/leagueos-connected-fictional-v26.json");
const A=["Harbour Wolves","Summit Foxes","Northline Jets","Rivercrest Storm","Eastport Falcons",
 "Metro Lynx","Glacier Knights","Bayside Mariners","Northern Falcons","Iron Valley",
 "Crescent Rovers","Pinecrest Rangers","Bluewater Bears","Lakeshore Rockets",
 "Stonebridge Eagles","Redwood Legends","Westport Thunder"];
const D=["Harbour Rec","Southshore Skaters","Westlake Social","Pond Rangers",
 "Late Night Owls","Northpoint Rec","Sunday Benders"];
const teams=[
 ...A.map((name,i)=>({id:"FIC-A-"+String(i+1).padStart(2,"0"),name,
  strengthAssessment:{level:"A",score:1750-14*i,provenance:"FICTIONAL_SEED_NOT_REAL_ANALYTICS",
   approved:false},night:"Sunday",program:"Open",fictional:true})),
 ...D.map((name,i)=>({id:"FIC-D-"+String(i+1).padStart(2,"0"),name,
  strengthAssessment:{level:"D",score:1190-14*i,provenance:"FICTIONAL_SEED_NOT_REAL_ANALYTICS",
   approved:false},night:"Sunday",program:"Open",fictional:true}))
];
const need=(v,s)=>{if(!v)throw Error("V26_FICTIONAL_SOURCE_HOLD: "+s)};
need(teams.length===24&&new Set(teams.map(t=>t.id)).size===24,"Expected 24 fictional teams");
const current=[
 {id:"FIC-DIV-CURRENT-NORTH",name:"Current North Division",
  teamIds:teams.filter((_,i)=>i%2===0).map(t=>t.id)},
 {id:"FIC-DIV-CURRENT-SOUTH",name:"Current South Division",
  teamIds:teams.filter((_,i)=>i%2===1).map(t=>t.id)}];
need(current.every(x=>x.teamIds.length===12),"Initial mixed 12/12 setup");
const source={
 schema:"bruttech-sportsos-connected-fictional-tenant/v26",
 createdDate:"2026-11-17",
 mode:"FICTIONAL_BROWSER_LOCAL_PRODUCT_WALKTHROUGH_ONLY",
 authorization:{authenticatedUsers:false,leagueOperatorAccess:false,
  officialScheduleWrite:false,paymentProcessing:false,sourceRegistration:false,
  actualWaiverConsent:false,realTimeCrossDeviceSync:false,scoreSheetSignature:false,
  verifiableQRToken:false,realLogoUpload:false,liveLeagueMessaging:false},
 tenant:{id:"FIC-TENANT-001",name:"Northstar Adult Hockey League — Fictional",
  status:"FICTIONAL_TENANT_NO_CUSTOMER_RELATIONSHIP"},
 season:{id:"FIC-SEASON-2026W",name:"Fictional Winter 2026/27",
  cycle:"Winter",regularWeeks:24,reviewWeek:5,finalReviewWeek:12,
  finalLockAfterWeek:12},
 fictitiousGame:{id:"FIC-GAME-001",week:6,date:"2026-11-22",localTime:"20:15",
  rink:"Fictional Rink A",homeTeamId:"FIC-A-01",awayTeamId:"FIC-A-02",
  officialGameId:null,officialSource:"NONE_FICTIONAL"},
 teams,divisionInstancesCurrent:current,
 strengthAssessmentPolicy:{levels:["A","B","C","D"],
  labelMeaning:"Fictional competitive strength, independent of sponsor/name/standings",
  source:"FICTIONAL_CURRENT_COMPETITION_DATA_NOT_SVHL_CLASSIFICATION"},
 sampleRecommendation:{targetTeamsPerDivision:9,minimumGroupSize:4,maximumGroupSize:10,
  expectedGroups:[
   {name:"A North",grade:"A",teamCount:8},
   {name:"A South",grade:"A",teamCount:9},
   {name:"D Recreational",grade:"D",teamCount:7}],
  note:"17 near A and seven near D, no invented B/C divisions"},
 captainTeamId:"FIC-A-01",
 fictionalRoster:[
  {id:"FIC-PLAYER-01",name:"Alex Example",teamId:"FIC-A-01",
   fictional:true,position:"F",registeredWithDemoLeague:true},
  {id:"FIC-PLAYER-02",name:"Jordan Example",teamId:"FIC-A-01",
   fictional:true,position:"D",registeredWithDemoLeague:true},
  {id:"FIC-PLAYER-03",name:"Taylor Example",teamId:"FIC-A-01",
   fictional:true,position:"G",registeredWithDemoLeague:true}
 ],
 fictionalLeaguePolicy:{
  sectionSource:"https://www.sportsvillage.ca/wp-content/uploads/2024/09/Rule-Book.pdf",
  section:"SVHL 2.7.2",
  sourceWeekFiveRealignment:true,
  sourcePointsCarry:true,
  additionalProposalMidseasonFinalLock:true,
  actualSVHLMidseasonDivisionLock:false,
  clubPointsNeverWritten:true,
  minWeeksBetweenFinalLockAndPlayoffs:6
 },
 permanentNameReference:{
  label:"The Cristillo Division",scope:"REAL_SOURCE_RESEARCH_REFERENCE_SEPARATE_FROM_FICTIONAL_TENANT",
  anchorLeagueId:570,anchorTeamId:13679,
  brandIndependentOfStrength:true,
  leagueApprovalToTransferName:"REQUIRED",
  userAttestedFirstSeason:"Winter 2025/26",
  integration:"SEE_V25_LEAGUEOS_DIVISION_PLAN_NO_FICTIONAL_TEAM_BRAND_LINK"},
 bundledCore:["Player schedule and team information","Registration/waiver status",
  "No-charge demonstration payment status","Basic published statistics",
  "Attendance RSVP","Team/captain notices","Captain team management"],
 optionalResearchUpgrades:["Advanced goals/assists/points projections","Video intelligence",
  "Longitudinal scouting and player-strength research"],
 plannedServices:{realAccountLogin:"NOT_CONNECTED",paymentProcessor:"NOT_CONNECTED",
  qrAttestationBackend:"NOT_CONNECTED",logoRightsModeration:"NOT_CONNECTED",
  officialScoreSignoff:"NOT_CONNECTED",livePush:"NOT_CONNECTED"},
 acceptance:{fictionalTeamCount:24,aTeams:17,dTeams:7,bTeams:0,cTeams:0,
  noOfficialWrites:true,noLiveBackend:true,allUIInteractionLocal:true}
};
const raw=JSON.stringify(source,null,2)+"\n";
fs.writeFileSync(out,raw,"utf8");
console.log(JSON.stringify({source:out,sha256:crypto.createHash("sha256").update(raw).digest("hex"),
 teams:24,currentSizes:current.map(x=>x.teamIds.length),
 strengths:{A:17,B:0,C:0,D:7},fictional:true,officialWrites:0},null,2));
