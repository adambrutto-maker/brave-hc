/* HockeyOS adult Sunday competition boundary. Source files remain immutable. */
(function(root,factory){
 "use strict";
 const scope=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=scope;
 else root.BraveAdultLeagueScope=scope;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const DIVISIONS=Object.freeze(["Fazzari Partners","The Cristillo Division","Remax Division"]);
 const isAdult=x=>DIVISIONS.includes(typeof x==="string"?x:x?.divisionNow);
 const teams=source=>(source?.teams||[]).filter(isAdult);
 const divisions=source=>(source?.divisions||[]).filter(x=>DIVISIONS.includes(x.name));
 const archiveDivisions=season=>(season?.divisions||[]).filter(x=>x.name!=="VAHL Division");
 const archiveCompetitiveCount=archive=>(archive?.seasons||[]).reduce((n,season)=>
    n+archiveDivisions(season).reduce((sum,d)=>sum+
       (d.category==="COMPETITIVE_SUNDAY_DIVISION"?d.teams.length:0),0),0);
 const adultRanks=source=>{
  const arr=teams(source).filter(t=>Number.isFinite(t.strengthContext?.contextIndex))
   .sort((a,b)=>b.strengthContext.contextIndex-a.strengthContext.contextIndex||
     a.leagueName.localeCompare(b.leagueName));
  return new Map(arr.map((t,i)=>[t.sourceTeamId,i+1]));
 };
 return Object.freeze({divisionsList:DIVISIONS,isAdult,teams,divisions,
    archiveDivisions,archiveCompetitiveCount,adultRanks});
});
