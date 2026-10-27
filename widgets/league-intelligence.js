/* Brave H.C. League Intelligence: only source-admitted public data. */
"use strict";
(()=>{
 const q=id=>document.getElementById(id);
 const el=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined&&value!==null)x.textContent=String(value);return x};
 const text=(parent,tag,cls,value)=>{const x=el(tag,cls,value);parent.append(x);return x};
 const pct=v=>Number.isFinite(v)?(v*100).toFixed(1)+"%":"—";
 const dec=v=>Number.isFinite(v)?(v>0?"+":"")+v.toFixed(2):"—";
 const record=x=>x?(x.w+"–"+x.l+"–"+x.t):"—";
 const date=s=>{try{return new Date(s+"T12:00:00").toLocaleDateString("en-CA",{year:"numeric",month:"short",day:"numeric"})}catch(_){return s}};
 let data=null,selected=null,currentScoutingBrief=null,upcomingFixtures=[],historicalArchive=null,historicalLinks=null,balanceSummary=null;
 function trusted(doc){
  return doc?.schema==="brave-hc-league-intelligence/public-v1" &&
   doc.status==="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" &&
   doc.currentSourceDataConcordant===true &&
   doc.strengthModel?.schema==="svhl-schedule-adjusted-context/v1" &&
   doc.strengthModel.type==="DESCRIPTIVE_NOT_PREDICTIVE" &&
   doc.strengthModel.probabilityOfWinning===false &&
   doc.trendLedger?.schema==="brave-hc-svhl-context-trend-ledger/v1" &&
   doc.trendLedger.sourceScope==="ACCEPTED_PUBLIC_SNAPSHOT_CHANGES_NOT_PREDICTED_FORM" &&
   Array.isArray(doc.trendLedger.teams) &&
   doc.trendLedger.trackedTeams===doc.trendLedger.teams.length &&
   doc.trendLedger.observationsRecorded===doc.trendLedger.teams.reduce((n,g)=>n+g.observations.length,0) &&
   doc.currentDivisionCount>=4 &&
   Array.isArray(doc.divisions)&&Array.isArray(doc.teams)&&
   doc.currentLeagueTeamCount===doc.teams.length &&
   doc.movementLedger?.schema==="brave-hc-svhl-division-movement-ledger/v1" &&
   Array.isArray(doc.movementLedger.events) &&
   Array.isArray(doc.movementLedger.incomingCristilloReports) &&
   doc.movementLedger.eventsRecorded===doc.movementLedger.events.length &&
   doc.verifiedReciprocalCompletedGames>=40 &&
   new Set(doc.teams.map(x=>x.sourceTeamId)).size===doc.teams.length &&
   doc.teams.every(x=>x.leagueName&&x.displayName&&x.divisionNow&&
        x.record?.gp===x.gamesConfirmed &&
        x.record.gp===x.completedGames?.length &&
        x.strengthContext?.status &&
        (x.record.gp===0 ? x.strengthContext.contextIndex===null :
         Number.isFinite(x.strengthContext.contextIndex)));
 }
 function tile(parent,value,caption){
  const card=el("div","metric");text(card,"span","",value);text(card,"small","",caption);parent.append(card);
 }
 function context(parent,title,description){
  const card=el("div","outline");text(card,"h3","",title);text(card,"p","small",description);parent.append(card);
 }
 function setup(){
  const timestamp=new Date(data.asOf);
  q("source-status").textContent="SVHL official sources checked "+
   (Number.isNaN(timestamp.getTime())?data.asOf:timestamp.toLocaleString("en-CA",{dateStyle:"medium",timeStyle:"short"}))+
   " · every reported nonzero result confirmed from both teams";
  const info=q("overview");info.replaceChildren();
  tile(info,window.BraveAdultLeagueScope.divisions(data).length,"Adult Sunday divisions");
  tile(info,window.BraveAdultLeagueScope.teams(data).length,"Adult Sunday teams");
  tile(info,data.verifiedReciprocalCompletedGames,"Verified completed matchups");
  tile(info,data.priorSeasonRosterContinuityQualifiedCount,"Prior-winter roster-supported team links");
  const divisions=q("division-filter");divisions.replaceChildren();divisions.add(new Option("All competitive divisions","all"));
  for(const x of window.BraveAdultLeagueScope.divisions(data))divisions.add(new Option(x.name,x.name));
  const teams=q("team-filter");teams.replaceChildren();
  for(const x of window.BraveAdultLeagueScope.teams(data).sort((a,b)=>a.displayName.localeCompare(b.displayName)))
   teams.add(new Option(x.displayName+" · "+x.divisionNow,x.leagueName));
 }
 function movement(){
  const history=data.movementLedger;
  const moves=q("movement-rows"),arrivals=q("incoming-rows");
  moves.replaceChildren();arrivals.replaceChildren();
  q("movement-summary").textContent=history.eventsRecorded+" observed changes · "+
   history.incomingCristilloEventsRecorded+" incoming Cristillo";
  const ordered=[...history.events].sort((a,b)=>b.firstObservedAt.localeCompare(a.firstObservedAt));
  for(const x of ordered.slice(0,12)){
   const card=el("article","move-card");
   text(card,"strong","",x.leagueName==="Braves HC"?"Brave H.C.":x.leagueName);
   const from=x.fromDivision||"Prior division not established";
   const to=x.toDivision||"Left current league directory";
   text(card,"p","flow",from+" → "+to);
   text(card,"p","minor","Observed between "+new Date(x.lastObservedAt).toLocaleDateString("en-CA")+
    " and "+new Date(x.firstObservedAt).toLocaleDateString("en-CA")+
    " · effective date unknown");
   const present=data.teams.some(t=>t.sourceTeamId===x.sourceTeamId);
   if(present){
    const button=text(card,"button","","View team profile");
    button.type="button";
    button.addEventListener("click",()=>{
     q("division-filter").value="all";
     const team=data.teams.find(t=>t.sourceTeamId===x.sourceTeamId);
     choose(team.leagueName);
     q("profile-title").scrollIntoView({block:"start",behavior:"smooth"});
    });
   }
   moves.append(card);
  }
  if(!ordered.length)text(moves,"p","tiny","No change between verified league membership snapshots yet.");
  const incoming=[...history.incomingCristilloReports].reverse();
  for(const x of incoming.slice(0,8)){
   const card=el("article","move-card");
   const now=data.teams.find(t=>t.sourceTeamId===x.sourceTeamId);
   text(card,"strong","",x.displayName);
   text(card,"p","flow",x.fromDivision||"Previous division not established by earlier snapshot");
   const prior=x.previousWinter;
   const had=x.currentRecordAtFirstDetection;
   text(card,"p","small","At first observation: "+record(had)+
    " · "+had.gf+" GF / "+had.ga+" GA · opponents' current mean WIN% "+
    pct(x.opponentDifficultyAtFirstDetection)+".");
   const against=x.opponentsFacedAtFirstDetection.map(g=>g.opponent+
    " ("+g.result+" "+g.gf+"-"+g.ga+")");
   text(card,"p","small","Competition faced: "+(against.join("; ")||"No verified previous fixtures"));
   if(prior)text(card,"p","small","Prior winter: "+prior.division+" · "+record(prior.record)+
         " · "+prior.officialRosterSharedIDs+" shared official roster IDs.");
   const h=x.bravesHistoryAtFirstDetection;
   text(card,"p","small",h?.state==="SOURCE_VERIFIED_H2H"?
     "Brave H.C. history: "+record(h.bravesAllTime)+" over "+h.bravesAllTime.gp+" verified games.":
     "Brave H.C.: no approved historical meeting.");
   // Compare source-qualified team contexts, not projected game outcomes.
   const brave=data.teams.find(t=>t.leagueName==="Braves HC");
   const incomingScore=now?.strengthContext;
   const braveScore=brave?.strengthContext;
   if(Number.isFinite(incomingScore?.contextIndex)&&Number.isFinite(braveScore?.contextIndex)){
    const difference=incomingScore.contextIndex-braveScore.contextIndex;
    text(card,"p","small strength-explain","Current SVHL context: "+
      now.displayName+" "+incomingScore.contextIndex.toFixed(1)+"/100 vs Brave H.C. "+
      braveScore.contextIndex.toFixed(1)+"/100 ("+
      (difference>0?"+":"")+difference.toFixed(1)+" index points).");
    text(card,"p","small","Form "+incomingScore.currentForm.toFixed(1)+" vs "+
      braveScore.currentForm.toFixed(1)+"; schedule difficulty "+
      incomingScore.scheduleDifficulty.toFixed(1)+" vs "+
      braveScore.scheduleDifficulty.toFixed(1)+". "+
      now.gamesConfirmed+" vs "+brave.gamesConfirmed+
      " league-verified games. Descriptive only, not a win probability.");
   }else{
    text(card,"p","small","Current Brave H.C. comparison unavailable without verified games for both clubs.");
   }
   if(now){
    const button=text(card,"button","","View updated team profile");
    button.type="button";button.addEventListener("click",()=>{
     q("division-filter").value="all";choose(now.leagueName);
     q("profile-title").scrollIntoView({block:"start",behavior:"smooth"});
    });
   }
   arrivals.append(card);
  }
  if(!incoming.length)text(arrivals,"p","tiny","No incoming Cristillo team detected in retained source snapshots.");
  q("movement-source").textContent=history.eventsRecorded+
   " dated source observations retained. "+history.departedTeamProfilesRetained+
   " complete departed-league profiles archived. Old results are never replaced by division-name assumptions.";
 }
 function normalName(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"")}
 function torontoToday(){
  const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",
   year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const get=type=>p.find(x=>x.type===type)?.value;
  return get("year")+"-"+get("month")+"-"+get("day");
 }
 function renderPlainLanguage(team){
  const cards=q("plain-opponent-summary"),caveat=q("plain-history-caveat");
  cards.replaceChildren();
  if(!historicalArchive){
   text(cards,"p","tiny","Older Sports Village source archive not available. Current verified season scouting remains operational.");
   q("weekly-team-summary").textContent="Weekly archive not verified in this view.";
   return;
  }
  const info=window.BraveLeagueInsights.plain(data,historicalArchive,team.leagueName,historicalLinks);
  const add=(heading,value)=>{
   const c=el("div","insights-card");text(c,"strong","",heading);
   text(c,"p","small",value);cards.append(c);
  };
  add("This season",info.form+" "+info.evidence);
  add("Goals scored / allowed",info.scored+" "+info.conceded);
  add("Who they have faced",info.crosses+" Schedule context "+
      (Number.isFinite(info.schedule)?info.schedule.toFixed(1)+"/100":"unrated")+
      ". These are observed results, not opponent predictions.");
  const h=info.historicalH2H;
  if(h)add("Brave H.C. historical matchups","Brave H.C.: "+h.w+" wins, "+h.l+
     " losses, "+h.t+" ties against this approved opponent identity ("+h.gp+
     " verified meetings). Older results do not automatically reflect today's roster.");
  else add("Brave H.C. history","No approved exact or independently matched historical Brave H.C. record for this current opponent.");
  if(info.officialPreviousWinter)
   add("Qualified previous winter",info.officialPreviousWinter.record.w+"–"+
     info.officialPreviousWinter.record.l+"–"+info.officialPreviousWinter.record.t+
     " in "+info.officialPreviousWinter.division+
     "; official returning player-ID overlap qualifies this comparison.");
  else add("Previous winter","No qualified returning-roster evidence was admitted; last season is excluded from this team's index.");
  const matches=info.exactHistoricalNameObservations;
  add("Older league archive",matches.length?
      "The same published team name occurs in "+matches.length+" older team-season record(s): "+
      matches.slice(-3).map(x=>x.season.replace("Sunday Winter ","")+
      " / "+x.division).join("; ")+
      ". Roster/franchise continuity has NOT been verified. These are not blended into today's rating.":
      "No exact-name source observation found in the six archived winter seasons. This does not mean the team never existed.");
  const proof=q("plain-verified-past");proof.replaceChildren();
  if(info.sourceMatchedOldGameSeasons.length){
   text(proof,"strong","","Independently matched Brave H.C. games in earlier Sports Village seasons:");
   for(const history of info.sourceMatchedOldGameSeasons){
    const row=el("p","small",history.season+" / "+history.division+
      " — Brave H.C. "+history.bravesRecord.w+"–"+history.bravesRecord.l+"–"+
      history.bravesRecord.t+" in "+history.count+" verified game(s). "+
      "This is NOT evidence of the same current roster.");
    const link=text(row,"a","sourcelink"," Official season-team source");
    link.href=history.officialSource;link.target="_blank";link.rel="noopener noreferrer";
    proof.append(row);
   }
  }else text(proof,"p","tiny","No separately source-matched historical game for this exact published team name in the admitted archive. Other Brave H.C. historical totals above remain distinct.");
  const w=info.weekly;
  q("weekly-team-summary").textContent=w.count<2?
   "Weekly monitoring: "+w.count+" verified week on record. No defensible week-over-week change is available yet.":
   "Weekly monitoring: "+w.count+" verified weeks. Most recent descriptive index change "+
    (w.delta===null?"unavailable":(w.delta>0?"+":"")+w.delta.toFixed(1))+
    " index points versus previous recorded week; roster strength changes have not been independently confirmed.";
  caveat.textContent="League source checked "+new Date(info.date).toLocaleString("en-CA")+
   ". Historical name matches are leads for source review, not automatic team identities. "+
   info.caution;
 }
 function renderArchive(){
  const box=q("archive-divisions");box.replaceChildren();
  if(!historicalArchive)return;
  const season=historicalArchive.seasons.find(x=>x.season===q("archive-season").value);
  if(!season)return;
  const eligible=window.BraveAdultLeagueScope.archiveDivisions(season);
  const count=eligible.filter(d=>d.category==="COMPETITIVE_SUNDAY_DIVISION")
    .reduce((n,d)=>n+d.teams.length,0);
  const top=text(box,"p","small",count+" adult-scope competitive team-season entries · "+
    eligible.length+" historical division tables.");
  const source=text(box,"a","sourcelink","View original Sports Village "+season.season+" source");
  source.href=season.source;source.target="_blank";source.rel="noopener noreferrer";
  for(const division of window.BraveAdultLeagueScope.archiveDivisions(season)){
   const details=el("details","archive-division");
   const meta=division.category==="COMPETITIVE_SUNDAY_DIVISION"?"competitive":
      "separate/placeholder category";
   const year="W"+season.season.replace("Sunday Winter ","");
   const matches=historicalLinks?.teamSeasons.filter(x=>x.season===year&&x.officialDivision===division.name)||[];
   const games=matches.reduce((n,x)=>n+x.bravesRecord.gp,0);
   text(details,"summary","",division.name+" · "+division.teams.length+" teams · "+meta+
       (games?" · Brave H.C. "+games+" verified match(es)":""));
   const table=el("table","archive-teams");
   const head=el("thead"),hrow=el("tr");
   for(const label of ["TEAM","GP","W","L","T","GF","GA"])text(hrow,"th","",label);
   head.append(hrow);table.append(head);
   const tbody=el("tbody");
   for(const team of [...division.teams].sort((a,b)=>b.pts-a.pts||a.name.localeCompare(b.name))){
    const row=el("tr");text(row,"td","",team.name);
    for(const key of ["gp","w","l","t","gf","ga"])text(row,"td","score",team[key]);
    tbody.append(row);
   }
   table.append(tbody);
   const scroll=el("div","scroll");scroll.append(table);details.append(scroll);
   box.append(details);
  }
 }
 function renderBalance(){
  const cards=q("balance-cards");cards.replaceChildren();
  if(!historicalArchive)return;
  balanceSummary=window.BraveLeagueInsights.divisionReview(data,historicalArchive);
  q("balance-status").textContent=balanceSummary.weeksObserved+
   " accepted weekly observation(s) · "+balanceSummary.atLeastTenGames+
   "/"+balanceSummary.eligibleTeams+" competitive teams with at least 10 games · "+
   balanceSummary.historicalSeasons+" historical winter archives.";
  q("balance-readiness").textContent=balanceSummary.rationale;
  const bridge=q("history-bridge-cards");bridge.replaceChildren();
  if(historicalLinks){
   const group=window.BraveLeagueInsights.divisionHistoricalBridges(historicalLinks);
   for(const history of group.slice(0,12)){
    const card=el("article","insights-card");
    text(card,"strong","",history.season+" · "+history.division);
    text(card,"p","small","Brave H.C. in "+history.games+
      " source-matched games: "+history.w+" wins, "+history.l+
      " losses, "+history.t+" ties. "+history.gf+" GF / "+history.ga+" GA.");
    text(card,"small","","Opponents recorded that winter: "+[...new Set(history.opponents)].join(", "));
    const a=text(card,"a","sourcelink","Official historical team schedule");
    a.href=history.source;a.target="_blank";a.rel="noopener noreferrer";
    bridge.append(card);
   }
  }else text(bridge,"p","tiny","Game-level historical parity report not yet admitted; official standing archives remain viewable.");
  for(const d of balanceSummary.groups){
   const card=el("article","insights-card");
   text(card,"strong","",d.division);
   text(card,"p","small",d.teams+" teams · average "+d.avgGames+
    " GP/team · "+d.ranked+" source-rated teams.");
   text(card,"p","small",d.meanIndex===null?"No rated comparison yet":
    "Descriptive context: average "+d.meanIndex.toFixed(1)+
    "/100, range "+d.lowest.toFixed(1)+"–"+d.highest.toFixed(1)+
    " (spread "+d.spread.toFixed(1)+" points).");
   text(card,"small","",d.crossDivisionGameRows+" team-game observations against clubs now in other divisions.");
   text(card,"p","small",d.interpretation);
   cards.append(card);
  }
 }
 async function copyDivisionReview(){
  const status=q("division-copy-status");
  if(!balanceSummary||!historicalArchive){status.textContent="Verified division review not available.";return;}
  const lines=["HOCKEYOS | SVHL SUNDAY WINTER DIVISION RESEARCH",
   "SOURCE: "+data.source+" | checked "+data.asOf,
   "STATUS: "+balanceSummary.status,
   balanceSummary.rationale,
   ...(historicalLinks?["Cross-source historical Brave H.C. evidence: "+
     historicalLinks.matchedGameCount+" verified 2-source game matches from "+
     historicalLinks.matchedTeamSeasonGroups+" historical team-seasons; "+
     historicalLinks.heldGameComparisons+" reviews remain held. These do not establish current franchise continuity."]:[]),
   ...balanceSummary.groups.map(d=>d.division+": "+d.teams+" teams, "+
     d.avgGames+" avg GP, context range "+
     (d.lowest===null?"unavailable":d.lowest+"–"+d.highest)+
     "; "+d.crossDivisionGameRows+" cross-division team-game observations"),
   "Historical coverage: "+balanceSummary.historicalSeasons+
     " sourced seasons; published names are not verified continuous franchises.",
   "Context index is descriptive, not a win probability or league-endorsed tier.",
   "No realignment recommendation is made at this early sample size."];
  if(!navigator.clipboard?.writeText){status.textContent="Clipboard unavailable in browser.";return;}
  try{await navigator.clipboard.writeText(lines.join("\n"));
      status.textContent="Research notes copied. Not a formal league proposal.";}
  catch(_){status.textContent="Could not copy the reviewed notes.";}
 }
 async function loadHistoricalArchive(){
  try{
   if(!window.BraveLeagueInsights)throw Error("Historical comparison module not installed");
   const response=await fetch("./historical-svhl-standings.json",{cache:"no-store"});
   if(!response.ok)throw Error("Historical source file unavailable");
   const doc=await response.json();
   window.BraveLeagueInsights.verify(data,doc);
   historicalArchive=doc;
   try{
    const linked=await fetch("./brave-historical-verified-games.json",{cache:"no-store"});
    if(linked.ok){
     const x=await linked.json();
     if(x?.schema!=="brave-hc-source-matched-historical-team-seasons/v1" ||
        x.status!=="DUAL_SOURCE_VERIFIED_HISTORICAL_GAMES_SEASON_SCOPED" ||
        x.currentContextNotModified!==true ||
        !Array.isArray(x.teamSeasons) ||
        x.teamSeasons.length!==x.matchedTeamSeasonGroups ||
        x.matchedGameCount!==x.teamSeasons.reduce((n,g)=>n+g.bravesRecord.gp,0) ||
        x.teamSeasons.some(g=>g.continuousFranchiseNotVerified!==true))
       throw Error("Historical game-level proof or count invalid");
     historicalLinks=x;
    }
   }catch(error){
    q("plain-history-caveat").textContent="Historical Brave game links held: "+error.message;
   }
   const selector=q("archive-season");selector.replaceChildren();
   for(const season of [...doc.seasons].reverse())
    selector.add(new Option(season.season,season.season));
   selector.addEventListener("change",renderArchive);
   q("archive-status").textContent=doc.seasons.length+
    " official winter archives, "+window.BraveAdultLeagueScope.archiveCompetitiveCount(doc)+
    " adult-scope competitive team-season entries. "+
    (historicalLinks?historicalLinks.matchedGameCount+" Brave H.C. game/date/score matches across "+
      historicalLinks.matchedTeamSeasonGroups+" historical team-seasons; "+
      historicalLinks.heldGameComparisons+" held. ":"Historical game joins remain held. ")+
    doc.missingSeasonsNotInferred.join(", ")+" official archive gaps remain unverified.";
   renderArchive();renderBalance();
  }catch(err){
   q("archive-status").textContent="Archived season data held: "+err.message;
   q("balance-status").textContent="Historical comparison unavailable; live scouting still operational.";
  }
 }
 function renderUpcoming(doc){
  const source="https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY";
  const status=q("fixture-status"),grid=q("upcoming-fixtures");grid.replaceChildren();
  upcomingFixtures=[];
  if(doc?.schema!=="brave-hc-svhl-schedule/v1" ||
     doc.source!==source || !Array.isArray(doc.games) ||
     !Array.isArray(doc.missingFixtureReviews))
   throw Error("SVHL schedule source not qualified");
  const stamp=new Date(doc.checkedAt),age=Date.now()-stamp.getTime();
  if(!Number.isFinite(stamp.getTime())||age< -900000)throw Error("SVHL schedule source time invalid");
  const currentIds=new Map(data.teams.map(t=>[normalName(t.leagueName),t]));
  const today=torontoToday();
  const seen=new Set();
  for(const game of doc.games){
   const signature=[game.date,game.time,game.opponent,game.rink,game.side].join("|");
   if(signature!==game.fixtureSignature ||
      !/^\d{4}-\d{2}-\d{2}$/.test(game.date) ||
      !/^\d{2}:\d{2}$/.test(game.time) ||
      !["home","away"].includes(game.side) ||
      typeof game.opponent!=="string" || !game.opponent ||
      typeof game.rink!=="string" || !game.rink ||
      seen.has(game.fixtureSignature))
     throw Error("Fixture signature or schedule fields inconsistent");
   seen.add(game.fixtureSignature);
   const matched=currentIds.get(normalName(game.opponent));
   const htoMatched=game.htoSyncStatus==="MATCH" &&
    /^\d+$/.test(String(game.htoGameId||"")) &&
    game.assignmentKey==="hto:"+game.htoGameId;
   // If HTO synchronization has not admitted a game, never construct a preview link.
   if(game.date>=today)upcomingFixtures.push({...game,checkedAt:doc.checkedAt,
    matched:matched?.leagueName||null,
    htoUrl:htoMatched?"https://www.hometeamsonline.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=preview&sportsHQ=BRAVESHOCKEY&gameID="+game.htoGameId:null});
  }
  upcomingFixtures.sort((a,b)=>(a.date+"T"+a.time).localeCompare(b.date+"T"+b.time));
  const stale=age>8*60*60*1000;
  status.textContent="SVHL calendar checked "+stamp.toLocaleString("en-CA",{dateStyle:"medium",timeStyle:"short"})+
   " · "+upcomingFixtures.length+" upcoming fixtures · "+
   doc.missingFixtureReviews.length+" unresolved source-review items"+
   (stale?" · STALE — verify schedule before using":"")+
   ". Only MATCH status provides an HTO game-ID link.";
  const first=upcomingFixtures[0];
  q("next-fixture-tag").textContent=first?
   "Next: "+first.date+" · "+first.time+" ET":"No future listed games";
  for(const [index,game] of upcomingFixtures.entries()){
   const card=el("article","fixture-card"+(index===0?" next":""));
   text(card,"strong","",game.date+" · "+game.time+" ET");
   text(card,"span","",game.opponent);
   text(card,"small","",game.side.toUpperCase()+" · Vaughan Sports Village · "+game.rink);
   text(card,"small","",game.htoUrl?"HTO game ID verified: "+game.htoGameId:
    "HTO game ID not synchronized — check source");
   if(game.requiresGoalieReconfirmation===true)
    text(card,"small early-warning","","Goalie assignment reconfirmation required");
   if(index===0)text(card,"small","","Next source-listed fixture");
   if(game.matched){
    const button=text(card,"button","","Open opponent scouting");
    button.type="button";button.addEventListener("click",()=>{
     q("division-filter").value="all";choose(game.matched);
     q("profile-title").scrollIntoView({block:"start",behavior:"smooth"});
    });
   }else text(card,"small","","No verified match to current SVHL League Intelligence team ID");
   if(game.matched&&!stale){
    const copyButton=text(card,"button","","Copy game-day WhatsApp brief");
    copyButton.type="button";
    const feedback=text(card,"small","","");
    feedback.setAttribute("aria-live","polite");
    copyButton.addEventListener("click",async()=>{
     if(!navigator.clipboard?.writeText){
      feedback.textContent="Clipboard unavailable; verify browser permissions.";
      return;
     }
     try{
      const brief=window.BraveLeagueScouting.build(data,game.matched);
      await navigator.clipboard.writeText(window.BraveLeagueScouting.format(brief,{fixture:game}));
      feedback.textContent="Game-day source brief copied. Review before sending.";
     }catch(error){
      feedback.textContent="Source brief could not be copied; check verified schedule.";
     }
    });
   }else if(stale){
    text(card,"small","","Game-day copying disabled until fresh schedule verification.");
   }
   const link=text(card,"a","sourcelink",game.htoUrl?"Verified HTO game preview":"Official SVHL schedule");
   link.href=game.htoUrl||source;link.target="_blank";link.rel="noopener noreferrer";
   grid.append(card);
  }
  if(!first)text(grid,"p","tiny","No upcoming source-listed fixtures in this feed.");
  renderScoutingBoard();
  return !stale;
 }
 async function loadUpcoming(){
  try{
   const response=await fetch("./svhl-upcoming.json",{cache:"no-store"});
   if(!response.ok)throw Error("SVHL fixture feed unavailable");
   const fresh=renderUpcoming(await response.json());
   const query=new URLSearchParams(location.search).get("team");
   if(fresh&&!query&&upcomingFixtures[0]?.matched)choose(upcomingFixtures[0].matched);
  }catch(error){
   q("fixture-status").textContent="Upcoming schedule held: "+error.message+
    ". Existing source-verified standings and scouting remain available.";
   q("next-fixture-tag").textContent="Schedule unavailable";
  }
 }
 function renderScoutingBoard(){
  const board=q("scout-board");board.replaceChildren();
  const reports=window.BraveLeagueScouting.cristilloOpponents(data);
  q("scout-count").textContent=reports.length+" current opponents";
  for(const brief of reports){
   const card=el("article","scout-card");
   text(card,"strong","",brief.name);
   if(upcomingFixtures[0]?.matched===brief.leagueName){
    card.classList.add("next-fixture");text(card,"small","","NEXT VERIFIED LEAGUE FIXTURE");
   }
   text(card,"small","",brief.rec.gp+" GP · "+record(brief.rec)+
    " · "+brief.rec.gf+" GF / "+brief.rec.ga+" GA");
   text(card,"small","",Number.isFinite(brief.context)?
    "Context "+brief.context.toFixed(1)+"/100 · "+brief.confidence.replace(/_/g," ").toLowerCase():
    "Context not rated");
   if(brief.bravesH2H)
    text(card,"small","","Brave H.C. verified H2H: "+
     record(brief.bravesH2H.record)+" ("+brief.bravesH2H.record.gp+" games)");
   else text(card,"small","","No verified Brave H.C. historical matchup");
   const button=text(card,"button","","View scouting report");
   button.type="button";
   button.addEventListener("click",()=>{
    q("division-filter").value="all";
    choose(brief.leagueName);
    q("profile-title").scrollIntoView({block:"start",behavior:"smooth"});
   });
   board.append(card);
  }
  if(!reports.length)text(board,"p","tiny","No source-verified current Cristillo opponents.");
 }
 function renderScoutingProfile(team){
  const brief=window.BraveLeagueScouting.build(data,team.leagueName);
  currentScoutingBrief=brief;
  const cards=q("scout-profile-summary");cards.replaceChildren();
  context(cards,"SVHL source record",record(brief.rec)+" in "+brief.rec.gp+
   " verified games · "+brief.rec.gf+" GF / "+brief.rec.ga+" GA");
  context(cards,"Scoring and defending",brief.rec.gp?
   (brief.gfRate.toFixed(2)+" GF/GP · "+brief.gaRate.toFixed(2)+
    " GA/GP"):"No verified completed games");
  if(brief.isBraves){
   context(cards,"Club baseline","This is Brave H.C. itself; no self head-to-head matchup.");
  }else if(brief.bravesH2H){
   const h=brief.bravesH2H.record;
   context(cards,"Verified Brave H.C. history",record(h)+" over "+h.gp+
     " games · "+h.gf+" GF / "+h.ga+" GA");
  }else context(cards,"Brave H.C. history","No source-verified matchup with this exact or approved team identity.");
  q("scout-profile-context").textContent=brief.bravesComparison?
   "Current SVHL context: "+brief.name+" "+brief.context.toFixed(1)+
   "/100 versus Brave H.C. "+brief.bravesComparison.bravesIndex.toFixed(1)+
   "/100. Difference "+(brief.bravesComparison.difference>0?"+":"")+
   brief.bravesComparison.difference.toFixed(1)+
   " descriptive index points. "+brief.crossDivisionGames+" of "+brief.rec.gp+
   " opponents were from teams now in other divisions. No future fixture or win probability is inferred.":
   "Source-qualified scouting only. The comparison is unavailable or this is Brave H.C. itself. "+
   "No future fixture or win probability is inferred.";
  const recent=q("scout-recent");recent.replaceChildren();
  for(const game of brief.recent){
   const li=el("li","",game.date+" · "+game.result+" "+game.gf+"–"+game.ga+
     " vs "+game.opponent+" ("+game.divisionNow+" now)");
   recent.append(li);
  }
  if(!brief.recent.length)text(recent,"li","","No source-verified completed games");
  q("scout-copy-status").textContent="";
 }
 async function copyScoutingBrief(){
  const status=q("scout-copy-status");
  if(!currentScoutingBrief){status.textContent="Scouting data not available.";return}
  if(!navigator.clipboard?.writeText){
   status.textContent="Clipboard unavailable in this browser; copy from the on-screen report.";
   return;
  }
  try{
   const content=window.BraveLeagueScouting.format(currentScoutingBrief);
   await navigator.clipboard.writeText(content);
   status.textContent="Source-qualified scouting brief copied for WhatsApp.";
  }catch(_){
   status.textContent="Could not copy automatically. Browser clipboard permission may be required.";
  }
 }
 function table(){
  const choice=q("division-filter").value;
  const cards=window.BraveAdultLeagueScope.teams(data).filter(t=>choice==="all"||t.divisionNow===choice);
  const byContext=q("sort-field").value==="context";
  cards.sort((a,b)=>byContext?
    ((b.strengthContext?.contextIndex??-1)-(a.strengthContext?.contextIndex??-1) ||
     b.record.gp-a.record.gp || a.displayName.localeCompare(b.displayName)):
    ((b.winPct??-1)-(a.winPct??-1) || b.record.pts-a.record.pts ||
     (b.goalDiffPerGame??-99)-(a.goalDiffPerGame??-99)||a.displayName.localeCompare(b.displayName)));
  const body=q("league-rows");body.replaceChildren();
  for(const x of cards){
   const row=el("tr");row.tabIndex=0;row.dataset.team=x.leagueName;
   if(selected===x.leagueName)row.classList.add("active");
   const name=el("td");text(name,"span","team",x.displayName);text(name,"span","minor",x.divisionNow);row.append(name);
   for(const k of ["gp","w","l","t","pts","gf","ga"])text(row,"td","score",x.record[k]);
   text(row,"td","score",pct(x.winPct));
   text(row,"td","score",dec(x.goalDiffPerGame));
   text(row,"td","score",pct(x.opponentCurrentWinPctAverage));
   text(row,"td","context-score",x.strengthContext.contextIndex===null?"—":x.strengthContext.contextIndex.toFixed(1));
   const adultRank=window.BraveAdultLeagueScope.adultRanks(data).get(x.sourceTeamId);
   text(row,"td","score",adultRank?"#"+adultRank:"—");
   row.addEventListener("click",()=>choose(x.leagueName));
   row.addEventListener("keydown",event=>{
    if(event.key==="Enter"||event.key===" "){event.preventDefault();choose(x.leagueName)}
   });
   body.append(row);
  }
  if(!cards.length){
   const row=el("tr"),cell=el("td","","No qualified teams in this division");
   cell.colSpan=13;row.append(cell);body.append(row);
  }
 }
 function renderTrend(team){
  const summary=q("trend-summary"),grid=q("trend-rows");grid.replaceChildren();
  const group=data.trendLedger.teams.find(x=>x.sourceTeamId===team.sourceTeamId);
  const observations=group?.observations||[];
  if(!observations.length){
   summary.textContent="No verified historical context observations are available.";
   return;
  }
  const last=observations[observations.length-1];
  if(observations.length===1){
   summary.textContent="Baseline only: first accepted observation "+
    new Date(last.observedAtUTC).toLocaleDateString("en-CA")+
    ". No measured trend yet; unchanged daily refreshes are not counted as improvement or decline.";
  }else{
   const prior=observations[observations.length-2];
   const a=last.contextIndex,b=prior.contextIndex;
   const change=Number.isFinite(a)&&Number.isFinite(b)?
     "Index "+(a-b>0?"+":"")+(a-b).toFixed(1)+" since prior material observation":
     "Comparison unavailable for an unrated team";
   summary.textContent=observations.length+" accepted material observations. "+
    change+". Recorded snapshots show changes in verified standings or context, not future outcomes.";
  }
  for(const p of observations.slice(-6).reverse()){
   const item=el("div","trend-point");
   text(item,"strong","",p.contextIndex===null?"Unrated":p.contextIndex.toFixed(1)+"/100");
   text(item,"span","","GP "+p.record.gp+" · "+record(p.record)+" · "+p.divisionNow);
   text(item,"small","","Observed "+new Date(p.observedAtUTC).toLocaleString("en-CA",
    {dateStyle:"medium",timeStyle:"short"})+
    " · "+p.confidence.replace(/_/g," ").toLowerCase());
   grid.append(item);
  }
 }
 function profile(){
  const x=data.teams.find(item=>item.leagueName===selected);
  if(!x)return;
  q("profile-title").textContent=x.displayName;
  renderScoutingProfile(x);
  renderPlainLanguage(x);
  q("profile-division").textContent=x.divisionNow+" · "+x.gamesConfirmed+" reciprocal completed fixtures";
  q("team-official-link").href=x.source;
  const panel=q("profile-metrics");panel.replaceChildren();
  context(panel,"Current 2026/27",record(x.record)+" · "+x.record.gf+
          " GF / "+x.record.ga+" GA · "+pct(x.winPct)+" win percentage");
  context(panel,"Competition faced",
          "Opponents' current mean WIN%: "+pct(x.opponentCurrentWinPctAverage)+
          ". "+x.gamesVsTeamsNowInOtherDivisions+" of "+x.gamesConfirmed+
          " games were against teams now in other divisions.");
  context(panel,"Goal difference",
          (x.record.gf-x.record.ga>0?"+":"")+(x.record.gf-x.record.ga)+
          " this season · "+dec(x.goalDiffPerGame)+" per game");
  const strength=q("strength-metrics");strength.replaceChildren();
  const score=x.strengthContext;
  if(score?.status==="SOURCE_SUPPORTED_DESCRIPTIVE_CONTEXT"){
   context(strength,"Current form",score.currentForm.toFixed(1)+"/100 · official results with neutral smoothing");
   context(strength,"Schedule difficulty",score.scheduleDifficulty.toFixed(1)+"/100 · opponent record with each direct result removed");
   context(strength,"Qualified previous winter",score.priorWinterForm===null?
     "Not roster-verified · prior results excluded from index":
     score.priorWinterForm.toFixed(1)+"/100 · previous season weighted 15%");
   const weights=score.weights;
   q("strength-method").textContent="Context index "+score.contextIndex.toFixed(1)+
    "/100 · "+(window.BraveAdultLeagueScope.adultRanks(data).has(x.sourceTeamId)? "#"+window.BraveAdultLeagueScope.adultRanks(data).get(x.sourceTeamId)+" among adult Sunday teams":"not ranked in adult Sunday league")+
    " · "+score.confidence.replace(/_/g," ").toLowerCase()+
    " · "+(weights.currentForm*100).toFixed(0)+"% current form, "+
    (weights.scheduleDifficulty*100).toFixed(0)+"% schedule difficulty, "+
    (weights.previousWinterForm*100).toFixed(0)+"% qualified prior winter. "+
    "Neutral four-game smoothing; descriptive only, NOT win probability. "+
    "Brave H.C. historical matchups do not contribute to the index.";
  }else{
   context(strength,"Not rated","No completed games available or not a competitive division.");
   q("strength-method").textContent="Index unavailable: insufficient verified competitive game evidence.";
  }
  renderTrend(x);
  const prior=q("prior-summary");prior.replaceChildren();
  if(x.previousWinter){
   const p=x.previousWinter;
   context(prior,"Previous Winter 2025/26 · "+p.division,
     record(p.record)+" · "+p.record.gf+" GF / "+p.record.ga+" GA · "+
     pct(p.winPct)+". Linked by "+p.officialRosterSharedIDs+" matching official player IDs ("+
     pct(p.rosterContinuityShare)+" of smaller roster). Results stay separate from this winter.");
   const link=text(prior,"a","sourcelink","Official previous-winter team record");
   link.href=p.sourceUrl;link.target="_blank";link.rel="noopener noreferrer";
  }else text(prior,"p","tiny","Previous-winter franchise identity has not been roster-verified. No cross-season record has been merged.");
  const his=q("braves-history");his.replaceChildren();
  const history=x.bravesMatchHistory;
  if(history?.state==="SOURCE_VERIFIED_H2H"){
   const h=history.bravesAllTime;
   context(his,"Brave H.C. head-to-head history",record(h)+" across "+h.gp+
      " all-time verified games · "+h.gf+" GF / "+h.ga+" GA. Scope: "+
      history.sourceScope.replace(/_/g," ").toLowerCase()+".");
  }else if(history?.state==="SELF_TEAM_NOT_APPLICABLE"){
   context(his,"Brave H.C.","Own club — a self-matchup record does not apply.");
  }else context(his,"Brave H.C. head-to-head history","No verified Master Workbook/HTO matchup was admitted for this exact or approved identity.");
  const body=q("fixture-rows");body.replaceChildren();
  const games=[...x.completedGames].sort((a,b)=>b.date.localeCompare(a.date));
  for(const g of games){
   const tr=el("tr");
   text(tr,"td","",date(g.date)+" · "+g.opponent);
   text(tr,"td","small",g.opponentCurrentDivision);
   const status=text(tr,"td",g.result==="W"?"positive":g.result==="L"?"negative":"",g.result);
   status.style.fontWeight="900";
   text(tr,"td","",g.gf);text(tr,"td","",g.ga);body.append(tr);
  }
  if(!games.length){
   const tr=el("tr"),td=el("td","","No source-verified completed matchup recorded");
   td.colSpan=5;tr.append(td);body.append(tr);
  }
  q("profile-source").textContent="Official source: "+x.source+
   ". Opponent division names are current at capture, not necessarily their division when each game was played.";
 }
 function choose(name){if(!window.BraveAdultLeagueScope.teams(data).some(t=>t.leagueName===name))return;selected=name;q("team-filter").value=name;table();profile()}
 async function init(){
  try{
   const response=await fetch("./league-intelligence.json",{cache:"no-store"});
   if(!response.ok)throw Error("Source not yet published");
   const result=await response.json();
   if(!trusted(result))throw Error("Published league-source agreement not validated");
   if(!window.BraveLeagueScouting||!window.BraveAdultLeagueScope)throw Error("Verified scouting/adult scope modules unavailable");
   data=result;setup();movement();renderScoutingBoard();
   await loadHistoricalArchive();
   const name=new URLSearchParams(location.search).get("team");
   selected=window.BraveAdultLeagueScope.teams(data).some(x=>x.leagueName===name)?name:
    window.BraveAdultLeagueScope.teams(data).some(x=>x.leagueName==="Maplewolves")?"Maplewolves":"Braves HC";
   q("division-filter").addEventListener("change",table);
   q("sort-field").addEventListener("change",table);
   q("team-filter").addEventListener("change",event=>choose(event.target.value));
   q("copy-scout-brief").addEventListener("click",copyScoutingBrief);
   q("copy-division-review").addEventListener("click",copyDivisionReview);
   table();profile();loadUpcoming();
  }catch(e){
   q("source-status").textContent="SOURCE HELD: "+e.message+". Historical identities or strength figures were not guessed.";
   q("source-status").style.color="#ffa6af";
   q("profile-title").textContent="Verified league source unavailable";
  }
 }
 init();
})();
