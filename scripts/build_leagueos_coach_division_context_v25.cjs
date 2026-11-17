/* LeagueOS V25: bounded coach-recorded A–D historical context.
 * A private workbook-derived source is read locally OUTSIDE Git; output only
 * historical division labels and team-level aggregated W/L/T, no personal data.
 * Coach labels are not league-certified classifications or cross-night ratings.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,"../widgets");
const PRIVATE=process.env.BRAVE_V25_PRIVATE_CALIBRATION_PATH||
 path.resolve(__dirname,"../../v25_private_coach_calibration_v25.json");
const raw=fs.readFileSync(PRIVATE),data=JSON.parse(raw);
const must=(ok,why)=>{if(!ok)throw Error("V25_COACH_STRENGTH_HOLD: "+why)};
must(data.schema==="bruttech-hockeyos-coach-master-research-calibration/v25"&&
 data.workbookResearchOnly===true&&data.officialLeagueStrengthApproval===false&&
 data.sourceWorkbookSha256?.length===64&&
 data.strength?.historicalDivisionLabels?.length===26&&
 data.strength?.historicalGameCount===168&&
 data.strength?.levelConflictHolds?.length===0,
 "Private historical source has changed or unapproved status");
const observed=data.strength.braveGameHistoryByRecordedLevel;
const groups=["A","B","C","D"].map(level=>{
 const item=observed[level]||null;
 const games=item?.games||0,wins=item?.wins||0,losses=item?.losses||0,ties=item?.ties||0;
 must(wins+losses+ties===games,"Historical W-L-T arithmetic for "+level);
 return{level,sourceObservedGames:games,
   sourceTeamRecord:{wins,losses,ties},
   pointsShare:games?Math.round((wins+.5*ties)/games*1000)/1000:null,
   goalDifferentialUnnormalized:item?item.gf-item.ga:null,
   goalFormatVerified:false,
   leagueOfficialTierApproval:false};
});
must(groups.reduce((sum,g)=>sum+g.sourceObservedGames,0)===168,
 "Coach historical strength level counts do not conserve source");
const labels=data.strength.historicalDivisionLabels.map(x=>{
 must(/^([SW])20\d{2}(?:\/\d{2})?$/.test(x.season)&&
  typeof x.division==="string"&&x.division.length<=150&&
  ["A","B","C","D"].includes(x.coachWorkbookStrength)&&
  x.officialLeagueApproval===false,
  "Historical season/label source unqualified");
 return{seasonCode:x.season,sourceDivisionName:x.division,
  coachRecordedStrengthLevel:x.coachWorkbookStrength,
  leagueOfficialTierApproved:false,
  sourceEntryCount:x.sourceRows};
});
const output={
 schema:"bruttech-leagueos-coach-historical-division-context/v25",
 status:"COACH_RECORDED_BRAVE_HC_HISTORICAL_STRENGTH_NOT_SVHL_APPROVED",
 privateWorkbookSourceDigest:data.sourceWorkbookSha256,
 privateCalibrationSourceSha256:crypto.createHash("sha256").update(raw).digest("hex"),
 sourceAsOf:data.asOfWorkbookModified,
 scope:"BRAVE_HC_HISTORICAL_DIVISION_AND_TEAM_RESULTS_ONLY",
 officialLeagueStrengthApproved:false,officialRecordChanged:false,
 privatePlayerRowsPublished:false,sourceWorkbookCopied:false,
 sourceNotesCopied:false,
 classificationPolicy:"A–D are founder/coach workbook observations; never normalize current or historic player output by these labels without official effective-dated division equivalence and duration certification.",
 seasonGameLengthWarning:"Summer and Winter game lengths differ. Historical GF/GA aggregate is not game-duration-normalized and must not be used as an absolute across-season scoring-rate comparator.",
 counts:{historicalDivisionSeasonLabels:labels.length,historicalBraveGamesWithStrengthLabels:168,
   officialApprovedLabels:0,playerRowsPublished:0},
 levels:groups,historicalDivisionLabels:labels,
 memorialContinuity:{
  id:"cristillo-memorial-identity",
  firstSourceCoachWorkbookSeason:"W2025/26",
  coachRecordedLevelFirstSeason:"D",
  approvedSourceTier:null,
  namingFollowsTeamApprovedByLeague:false,
  nameIndependentOfFutureSkillLevel:true}};
fs.writeFileSync(path.join(ROOT,"leagueos-coach-division-context-v25.json"),
 JSON.stringify(output,null,2)+"\n");
console.log(JSON.stringify({
 status:output.status,labels:labels.length,
 games:groups.map(g=>({grade:g.level,games:g.sourceObservedGames,
  pointsShare:g.pointsShare})),memorial:output.memorialContinuity,
 privacy:{playersPublished:0,sourceNotesCopied:false,officialWrites:0}},null,2));
