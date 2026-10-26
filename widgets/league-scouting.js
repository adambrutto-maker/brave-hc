/* Brave H.C. source-qualified scouting summaries. No upcoming-game inference. */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module!=="undefined" && module.exports)module.exports=api;
 else root.BraveLeagueScouting=api;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const CRISTILLO="The Cristillo Division";
 const CANONICAL="Braves HC";
 const need=(ok,message)=>{if(!ok)throw new Error("SCOUT_SOURCE_HOLD:"+message)};
 const n=v=>Number.isFinite(v)?v.toFixed(1):"unavailable";
 const fixed=(v,places=2)=>Number.isFinite(v)?v.toFixed(places):"unavailable";
 const record=r=>r.w+"–"+r.l+"–"+r.t;
 const pct=v=>Number.isFinite(v)?(v*100).toFixed(1)+"%":"unavailable";
 function safeDate(text){
  const d=new Date(text);
  need(!Number.isNaN(d.getTime()),"DATE_INVALID");
  return d.toISOString().slice(0,10);
 }
 function build(doc,leagueName){
  need(doc&&doc.schema==="brave-hc-league-intelligence/public-v1" &&
       doc.status==="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" &&
       doc.currentSourceDataConcordant===true &&
       doc.strengthModel?.probabilityOfWinning===false &&
       Array.isArray(doc.teams) &&
       typeof doc.asOf==="string","DOC_NOT_QUALIFIED");
  safeDate(doc.asOf);
  const team=doc.teams.find(t=>t.leagueName===leagueName);
  const brave=doc.teams.find(t=>t.leagueName===CANONICAL);
  need(team&&brave&&team.sourceTeamId!==undefined &&
       typeof team.displayName==="string","TEAM_NOT_QUALIFIED");
  const rec=team.record,score=team.strengthContext;
  need(rec&&score&&Number.isInteger(rec.gp)&&rec.gp>=0 &&
       rec.gp===team.gamesConfirmed && Array.isArray(team.completedGames) &&
       team.completedGames.length===rec.gp &&
       rec.w+rec.l+rec.t===rec.gp &&
       rec.gf>=0&&rec.ga>=0,"RECORD_NOT_RECONCILED");
  const latest=[...team.completedGames].sort((a,b)=>
   b.date.localeCompare(a.date)||a.opponent.localeCompare(b.opponent)).slice(0,5);
  for(const g of latest){
   need(/^\d{4}-\d{2}-\d{2}$/.test(g.date) &&
        ["W","L","T"].includes(g.result) &&
        typeof g.opponent==="string" && Number.isInteger(g.gf) &&
        Number.isInteger(g.ga) && g.gf>=0&&g.ga>=0,
        "RECENT_MATCH_INVALID");
  }
  const isBraves=team.leagueName===CANONICAL;
  const bravesScore=brave.strengthContext?.contextIndex;
  const teamScore=score.contextIndex;
  const compare=!isBraves&&Number.isFinite(teamScore)&&Number.isFinite(bravesScore)?
   {teamIndex:teamScore,bravesIndex:bravesScore,
    difference:Number((teamScore-bravesScore).toFixed(1)),
    teamSchedule:score.scheduleDifficulty,bravesSchedule:brave.strengthContext.scheduleDifficulty}:null;
  const history=team.bravesMatchHistory;
  const h2h=!isBraves&&history?.state==="SOURCE_VERIFIED_H2H"?
    {record:history.bravesAllTime,scope:history.sourceScope}:null;
  return {
   name:team.displayName,leagueName:team.leagueName,sourceTeamId:team.sourceTeamId,
   division:team.divisionNow,asOf:doc.asOf,source:team.source,
   rec:{gp:rec.gp,w:rec.w,l:rec.l,t:rec.t,pts:rec.pts,gf:rec.gf,ga:rec.ga},
   gfRate:rec.gp?rec.gf/rec.gp:null,gaRate:rec.gp?rec.ga/rec.gp:null,
   context:Number.isFinite(teamScore)?teamScore:null,
   currentForm:score.currentForm,schedule:score.scheduleDifficulty,
   confidence:score.confidence,
   prior:team.previousWinter?{
    record:team.previousWinter.record,
    division:team.previousWinter.division,
    sourceUrl:team.previousWinter.sourceUrl
   }:null,
   crossDivisionGames:team.gamesVsTeamsNowInOtherDivisions,
   recent:latest.map(g=>({date:g.date,opponent:g.opponent,
                         divisionNow:g.opponentCurrentDivision,
                         result:g.result,gf:g.gf,ga:g.ga})),
   bravesComparison:compare,bravesH2H:h2h,isBraves,
   noUpcomingFixtureVerified:true,
   leagueHTOTimingSeparate:true
  };
 }
 function format(brief,options={}){
  const fixture=options.fixture||null;
  if(fixture){
   const normalized=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
   const sig=[fixture.date,fixture.time,fixture.opponent,fixture.rink,fixture.side].join("|");
   need(sig===fixture.fixtureSignature && normalized(fixture.opponent)===normalized(brief.leagueName) &&
      /^\d{4}-\d{2}-\d{2}$/.test(fixture.date) &&
      /^\d{2}:\d{2}$/.test(fixture.time) &&
      ["home","away"].includes(fixture.side) && fixture.rink &&
      Number.isFinite(new Date(fixture.checkedAt).getTime()),
      "UNVERIFIED_GAME_DAY_FIXTURE");
   if(fixture.htoUrl!==null){
    const link=new URL(fixture.htoUrl);
    need(fixture.htoSyncStatus==="MATCH" &&
     fixture.assignmentKey==="hto:"+fixture.htoGameId &&
     /^\d+$/.test(String(fixture.htoGameId)) &&
     link.protocol==="https:" && link.hostname==="www.hometeamsonline.com" &&
     link.pathname==="/teams/default.asp" &&
     link.searchParams.get("gameID")===String(fixture.htoGameId) &&
     link.searchParams.get("u")==="BRAVESHOCKEY" &&
     link.searchParams.get("p")==="preview",
     "HTO_GAME_ID_NOT_SOURCE_QUALIFIED");
   }
  }
  const heading=fixture?"BRAVE H.C. | VERIFIED GAME-DAY SCOUTING":"BRAVE H.C. | VERIFIED OPPONENT SCOUTING";
  const parts=[heading,
   "Opponent: "+brief.name+" | "+brief.division,
   ...(fixture?[
     "Upcoming SVHL fixture: "+fixture.date+" at "+fixture.time+" ET | "+
       fixture.side.toUpperCase()+" | Vaughan Sports Village · "+fixture.rink,
     "Fixture schedule checked: "+new Date(fixture.checkedAt).toISOString()+
       ". Subject to changes by the league.",
     fixture.htoUrl?"HTO synchronized game ID: "+fixture.htoGameId+
       " | "+fixture.htoUrl:
       "HTO game ID not synchronized; verify against official Sports Village schedule."
    ]:[]),
   "Source: SVHL Sunday Winter 2026/27, checked "+safeDate(brief.asOf)+" (UTC)",
   "Official league: "+record(brief.rec)+" in "+brief.rec.gp+" GP | "+brief.rec.gf+
    " GF / "+brief.rec.ga+" GA | GF/GP "+fixed(brief.gfRate)+
    " | GA/GP "+fixed(brief.gaRate),
   "Recent verified results ("+brief.recent.length+" of "+brief.rec.gp+"): "+
     (brief.recent.length?brief.recent.map(x=>x.date+" "+x.result+" "+
       x.gf+"-"+x.ga+" vs "+x.opponent).join("; "):"none recorded"),
   "Cross-division opponents faced: "+brief.crossDivisionGames+" of "+brief.rec.gp+
    " games against clubs now in other divisions",
   "Schedule-adjusted context: "+n(brief.context)+"/100 ("+
    brief.confidence.replace(/_/g," ").toLowerCase()+"); "+
    "difficulty "+n(brief.schedule)+"/100"];
  if(brief.bravesComparison)
   parts.push("Brave H.C. current league context: "+n(brief.bravesComparison.bravesIndex)+
    "/100; opponent difference "+(brief.bravesComparison.difference>0?"+":"")+
    n(brief.bravesComparison.difference)+" index points. Descriptive only.");
  if(brief.isBraves)parts.push("This is the Brave H.C. league-source baseline, not opponent scouting.");
  else if(brief.bravesH2H){
   const h=brief.bravesH2H.record;
   parts.push("Brave H.C. verified historical H2H: "+record(h)+
    " in "+h.gp+" GP | "+h.gf+" GF / "+h.ga+" GA.");
  }else parts.push("Brave H.C. historical H2H: no approved verified matchup.");
  if(brief.prior)parts.push("Qualified prior winter (separate season): "+record(brief.prior.record)+
    " | "+brief.prior.division+".");
  parts.push("Caution: early results are descriptive, NOT win probabilities or a game prediction.",
   "HTO Brave H.C. game verification may be ahead of the SVHL league source.");
  if(fixture){
   parts.push(fixture.requiresGoalieReconfirmation?
     "Goalie assignment: reconfirmation required; check the approved goalie-manager record.":
     "Goalie assignment: confirmation is not established by this scouting brief; check the approved goalie-manager record.");
   parts.push("Scheduled fixture source: https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY");
   parts.push("This is published schedule information, not a confirmed game outcome.");
  }else parts.push("No upcoming fixture or game date is asserted by this report.");
  parts.push("Official team source: "+brief.source);
  return parts.join("\n");
 }
 function cristilloOpponents(doc){
  need(doc&&Array.isArray(doc.teams),"TEAMS_MISSING");
  return doc.teams.filter(t=>t.divisionNow===CRISTILLO&&t.leagueName!==CANONICAL)
   .sort((a,b)=>a.displayName.localeCompare(b.displayName))
   .map(t=>build(doc,t.leagueName));
 }
 return Object.freeze({build,format,cristilloOpponents});
});
