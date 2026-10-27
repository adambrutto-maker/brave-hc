/* HockeyOS supplementary roster-construction evidence for division discussion.
   Never silently weight historical points into current index, standings, or optimizer. */
(function(root,factory){"use strict";const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.BraveRosterDivisionContext=api;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const need=(ok,why)=>{if(!ok)throw Error("ROSTER_DIVISION_HOLD:"+why)};
 function summarize(league,roster,groups){
  const model=typeof module!=="undefined"&&module.exports?
    require("./roster-strength-scouting.js"):window.BraveRosterIntelligence;
  need(model&&model.valid(league,roster),"ROSTER_SOURCE_NOT_QUALIFIED");
  need(Array.isArray(groups)&&groups.length>=2&&groups.length<=6,
    "GROUPS_NOT_QUALIFIED");
  const rosterById=new Map(roster.teams.map(t=>[t.sourceTeamId,t]));
  const sourceIDs=new Set(rosterById.keys()),seen=new Set();
  const results=[];
  for(const group of groups){
   need(group.ids?.length===group.capacity&&[4,5,6,7,8].includes(group.capacity),
      "CAPACITY_INVALID");
   const teams=[];
   for(const id of group.ids){
    need(sourceIDs.has(id)&&!seen.has(id),"GROUP_TEAM_NOT_UNIQUE_SOURCE_ID");
    seen.add(id);
    const t=rosterById.get(id),validPlayers=t.players.filter(p=>
      p.statStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT"&&p.gp>0);
    const prior=validPlayers.map(p=>p.previousOfficialObservations.filter(h=>
      h.statStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT"&&h.gp>0));
    const veterans=prior.filter(history=>history.reduce((n,x)=>n+x.gp,0)>=10).length;
    const returning=prior.filter(history=>history.length>0).length;
    const pts=validPlayers.reduce((n,p)=>n+p.pts,0);
    const ordered=[...validPlayers].sort((a,b)=>b.pts-a.pts||b.g-a.g);
    const share=pts?ordered.slice(0,2).reduce((n,p)=>n+p.pts,0)/pts:null;
    teams.push({id,name:t.name,sourceRosterCount:t.rosterCount,recordedGPPlayers:validPlayers.length,
      priorLinkedPlayerIDs:returning,tenPlusArchivedGPPlayers:veterans,
      topTwoPointsShare:share===null?null:Number(share.toFixed(3))});
   }
   const avg=(field)=>Number((teams.reduce((n,t)=>n+t[field],0)/teams.length).toFixed(1));
   const shares=teams.filter(t=>t.topTwoPointsShare!==null).map(t=>t.topTwoPointsShare);
   results.push({groupKey:group.key,capacity:group.capacity,
     avgRosteredPlayers:avg("sourceRosterCount"),
     avgHistoricallyExperienced:avg("tenPlusArchivedGPPlayers"),
     avgLinkedPriorPlayerIDs:avg("priorLinkedPlayerIDs"),
     meanTopTwoPointShare:shares.length?
       Number((shares.reduce((a,b)=>a+b,0)/shares.length).toFixed(3)):null,
     evidenceTeamCount:teams.length,teams,
     interpretation:"Roster experience and scoring concentration are complementary, not validated group-skill measurements."});
  }
  need(seen.size===sourceIDs.size&&sourceIDs.size===22,
    "NOT_ALL_ADULT_CLUBS_COVERED");
  return {status:"SOURCE_QUALIFIED_ROSTER_EVIDENCE_NOT_OPTIMIZATION_WEIGHT",
    sourceRosterCaptureUTC:roster.asOf,sourceGameAsOf:league.asOf,
    groups:results,teamCount:seen.size,
    sourceHistoricalPlayerSeasons:roster.playerSeasonObservations,
    approvedForecastWeight:0,
    caveat:"Do not assume player availability, official lineup position, equal historical season quality, or precise historical scoring. These roster indicators are not a validated talent-rating system and are deliberately excluded from the division optimizer's numeric objective."};
 }
 return Object.freeze({summarize});
});
