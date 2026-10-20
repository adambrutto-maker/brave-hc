(()=>{
"use strict";
const $=(t,c,v)=>{const e=document.createElement(t);if(c)e.className=c;if(v!==undefined)e.textContent=String(v);return e};
const find=id=>document.getElementById(id);
const put=(id,v)=>find(id).textContent=String(v);
const DOM={select:find("award"),region:find("scores"),notice:find("notice"),pilot:find("pilot"),info:find("award-info")};
const state={source:null,reference:null,explain:null,participation:null,weeklyHistory:null,award:"rolaids",mode:"current"};
if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embed");
function badge(v){if(v>=95)return["elite","Elite"];if(v>=85)return["contender","Contender"];if(v>=75)return["strong","Strong"];if(v>=65)return["developing","Building"];return["neutral","Rating"]}
function el(p,t,c,v){const n=$(t,c,v);p.append(n);return n}
function notice(txt,isWarn=true){DOM.notice.className="note"+(isWarn?"":" blue");DOM.notice.textContent=txt}
function form(){
 const survey=state.source.survey;
 DOM.pilot.replaceChildren();
 const details=$("details","exact"),title=$("summary",null,"Pilot voting and shortlist rules"),body=$("div");
 el(body,"p",null,"The published pilot ballot uses two equal votes for each award question, with the workbook ranking as tiebreaker. Hall of Fame selects two inductees. These fixed candidates are not automatically the current weekly leaders.");
 const question=survey?.awardQuestions?.find(x=>x.awardId===state.award);
 if(question){
  el(body,"p","section-title","Candidates on the existing pilot form");
  const chips=el(body,"div","checklist");question.nominees.forEach(n=>el(chips,"span",null,n));
 }
 const a=el(body,"a","action","Open the published pilot ballot ↗");
 a.href=survey.responderUrl;a.target="_blank";a.rel="noopener noreferrer";
 details.append(title,body);DOM.pilot.append(details);
}
function selectMode(mode){state.mode=mode;for(const b of document.querySelectorAll("[data-mode]"))b.setAttribute("aria-pressed",String(b.dataset.mode===mode));draw();}
function labelData(){const d=state.source,a=d.awards.find(x=>x.id===state.award);put("award-title",a.name);put("award-sub",a.subtitle);
 find("award-info").replaceChildren();
 const details=$("details","exact");details.append($("summary",null,"What this award measures and who qualifies"));
 const p=$("div");el(p,"p",null,a.eligibility);el(p,"p",null,a.weight);
 details.append(p);find("award-info").append(details);
 form();
}
function infoPanel(parent,headline,detail,raw){
 const region=$("div","explain");el(region,"h4",null,headline);el(region,"p",null,detail);
 if(raw)el(region,"p","mathline",raw);
 parent.append(region);return region;
}
function explainComponent(region,row,sub,reference){
 region.replaceChildren();
 const code=sub.abbreviation;
 el(region,"h4",null,code+" · Component score");
 const score=sub.webComponentScore,wt=sub.weightPct,part=sub.unroundedWeightedContribution;
 el(region,"p",null,(reference?"Saved workbook":"Verified current workbook")+" attribute: "+Number(score).toFixed(1)+" / 100. Award weighting: "+Number(wt).toFixed(1)+"%.");
 el(region,"p","mathline",Number(score).toFixed(1)+" × "+(wt/100).toFixed(2)+" = "+Number(part).toFixed(3)+" points toward the raw composite.");
 if(reference&&sub.sourceInternalValue!==null&&sub.sourceInternalValue!==undefined){
  el(region,"p",null,"Saved internal calculation result: "+sub.sourceInternalValue+". The public display score is a separate workbook normalization.");
 }
 el(region,"p",null,"Source: AwardScoring → "+sub.sourceField+". "+(reference?"Historical "+(sub.sourceSnapshotSeason||"source snapshot")+".":""));
 const def=reference?state.explain?.componentFormulas?.[sub.sourceField]:null;
 if(def?.internalFormula||def?.displayFormula){
   const details=el(region,"details","exact");el(details,"summary",null,"Inspect exact original Excel formulas");
   const pre=el(details,"pre",null,"Internal input calculation:\n"+(def.internalFormula||"Not extracted")+"\n\nPublic score conversion:\n"+(def.displayFormula||"Not extracted"));
 }
 el(region,"p","tiny",reference?"Historical cached workbook component, not a current-season calculation.":"Verified same-week component. Final OVR includes the workbook eligibility, weighting and final ranking normalization; it is not a simple attribute average.");
}
function explainOverall(region,row,details){
 region.replaceChildren();el(region,"h4",null,"How the overall rating is built");
 if(details?.cachedRawComposite!==null&&Number.isFinite(details?.cachedRawComposite)){
  el(region,"p",null,"Exact saved workbook raw composite: "+details.cachedRawComposite.toFixed(1)+". Final public score: "+details.cachedFinalPublicScore.toFixed(0)+".");
  el(region,"p","mathline","Σ (web component score × award weight) = "+details.formulaWeightedSumFromCachedComponents.toFixed(3)+" → raw composite "+details.cachedRawComposite.toFixed(1)+".");
  el(region,"p",null,"The workbook then ranks eligible competitors to assign the final public award rating. The final rating is NOT simply the weighted component total.");
 }else el(region,"p",null,"This saved workbook includes the final published rating and the individual scorecard, but the verified raw-composite calculation has not yet been extracted for this award.");
 el(region,"p","tiny","This is a source-dated historical calculation, not a current-week 2026–27 award result.");
}

/* A final OVR is the workbook's published award rating, not the weighted
   component average. Current attribute chips require same-week evidence. */
function currentComponents(row,race){
 const evidence=row?.verifiedComponentEvidence;
 if(!evidence||row.scoreKind!=="OFFICIAL_WORKBOOK_FINAL"||row.eligible!==true
    ||evidence.status!=="VERIFIED_CURRENT_WORKBOOK_COMPONENTS"
    ||evidence.season!==state.source.season||evidence.awardId!==state.award
    ||evidence.playerName!==row.name||evidence.sourceWorkbookHash!==state.source.sourceWorkbookHash
    ||evidence.asOf!==race?.asOf||evidence.modelGameCount!==state.source.currentTeamGP
    ||!Array.isArray(evidence.components)||evidence.components.length<1)return null;
 const seen=new Set(),components=evidence.components;
 if(!components.every(c=>typeof c.abbreviation==="string"&&/^[A-Z0-9%+-]{2,8}$/.test(c.abbreviation)
    &&!seen.has(c.abbreviation)&&seen.add(c.abbreviation)
    &&typeof c.sourceField==="string"&&c.sourceField.length>2
    &&Number.isFinite(c.webComponentScore)&&c.webComponentScore>=0&&c.webComponentScore<=100
    &&Number.isFinite(c.weightPct)&&c.weightPct>0&&c.weightPct<=100
    &&Number.isFinite(c.unroundedWeightedContribution)
    &&Math.abs(c.unroundedWeightedContribution-c.webComponentScore*c.weightPct/100)<0.03)
    ||Math.abs(components.reduce((sum,c)=>sum+c.weightPct,0)-100)>0.01)return null;
 return components;
}
/* Snapshots are a separate verified publication trail. A missing or invalid
   baseline never becomes a fabricated movement number. */
function previousSnapshot(race){
 const history=state.weeklyHistory,d=state.source;
 if(history?.schema!=="brave-hc-awards-weekly-history/v1"
    ||history.status!=="VERIFIED_PUBLISHED_WEEKLY_SNAPSHOTS"
    ||!Array.isArray(history.snapshots)||!race?.asOf)return null;
 const dates=new Set();
 const valid=history.snapshots.filter(s=>{
  if(s?.status!=="VERIFIED_PUBLISHED_WEEKLY_RACE"||s.season!==d.season
     ||!/^\d{4}-\d{2}-\d{2}$/.test(s.publishedAsOf||"")
     ||s.publishedAsOf>=race.asOf||dates.has(s.publishedAsOf)
     ||!Number.isInteger(s.teamGP)||s.teamGP<1||s.teamGP>d.currentTeamGP
     ||!(/^[a-f0-9]{64}$/i).test(s.sourceWorkbookHash||"")
     ||!Array.isArray(s.races?.[state.award]))return false;
  const entries=s.races[state.award],names=new Set(),ranks=new Set();
  const validEntries=entries.length<=5&&entries.every(p=>{
   if(typeof p?.name!=="string"||!p.name.trim()||names.has(p.name)
      ||!Number.isInteger(p.rank)||p.rank<1||p.rank>5||ranks.has(p.rank)
      ||p.scoreKind!=="OFFICIAL_WORKBOOK_FINAL"
      ||!Number.isFinite(p.overallScore)||p.overallScore<50||p.overallScore>100)return false;
   names.add(p.name);ranks.add(p.rank);return true;
  });
  if(validEntries)dates.add(s.publishedAsOf);
  return validEntries;
 });
 return valid.sort((a,b)=>b.publishedAsOf.localeCompare(a.publishedAsOf))[0]||null;
}
function movement(wrapper,row,index,race){
 if(row.scoreKind!=="OFFICIAL_WORKBOOK_FINAL"||!row.eligible||!Number.isFinite(row.modelScore))return;
 const prior=previousSnapshot(race),band=el(wrapper,"div","weekly-movement");
 if(!prior){
  el(band,"span","move-muted","Weekly movement available after two verified published snapshots");
  return;
 }
 const previous=prior.races[state.award].find(p=>p.name===row.name);
 el(band,"span","move-date","vs "+prior.publishedAsOf);
 if(!previous){el(band,"strong","move-new","NEW · first appearance on ranked shortlist");return;}
 const diff=Number((row.modelScore-previous.overallScore).toFixed(1));
 const diffRank=previous.rank-(index+1);
 const scoreClass=diff>0?"move-up":diff<0?"move-down":"move-flat";
 const rankClass=diffRank>0?"move-up":diffRank<0?"move-down":"move-flat";
 const scoreText=(diff>0?"+":"")+diff.toFixed(1)+" OVR";
 const rankText=diffRank>0?"▲ "+diffRank+" rank"+(diffRank===1?"":"s"):
  diffRank<0?"▼ "+Math.abs(diffRank)+" rank"+(diffRank===-1?"":"s"):"— rank unchanged";
 el(band,"strong",scoreClass,scoreText);
 el(band,"strong",rankClass,rankText);
}
function addAttributeChips(wrapper,components,row,reference){
 const valid=components.filter(c=>Number.isFinite(c.webComponentScore)&&typeof c.abbreviation==="string")
  .slice().sort((a,b)=>(Number(b.weightPct)||0)-(Number(a.weightPct)||0));
 if(!valid.length)return;
 const addChip=(container,item)=>{
  const btn=el(container,"button","stat-chip ea-stat");btn.type="button";
  el(btn,"span","ea-stat-name",item.abbreviation);
  el(btn,"strong","ea-stat-value",Math.round(Number(item.webComponentScore)));
  btn.setAttribute("aria-label",item.abbreviation+" "+Number(item.webComponentScore).toFixed(1)+" out of 100, weight "+Number(item.weightPct).toFixed(1)+" percent; explain");
  const show=()=>{const region=wrapper.querySelector(".explain");region.classList.remove("hide");explainComponent(region,row,item,reference);};
  btn.addEventListener("click",show);btn.addEventListener("focus",show);
  btn.addEventListener("mouseenter",show);
 };
 const first=el(wrapper,"div","score-chips ea-attributes");
 first.setAttribute("aria-label","Award-specific weighted player attributes");
 valid.slice(0,6).forEach(c=>addChip(first,c));
 if(valid.length>6){
  const more=el(wrapper,"details","more-attributes");
  el(more,"summary",null,"Show "+(valid.length-6)+" more weighted attributes");
  const grid=el(more,"div","score-chips ea-attributes");
  valid.slice(6).forEach(c=>addChip(grid,c));
 }
}

function card(row,index,isReference){
 const score=isReference?row.score:row.modelScore;
 const kind=row.scoreKind||"";
 const label=isReference?"Saved rating":row.scoreKind==="AWARD_MODEL_PENDING"?"Played · rating and ranking pending":row.eligible?"Eligible":"Provisional";
 const wrapper=$("article","card"+(index===0?" leader":""));
 const main=el(wrapper,"div","card-main");
 el(main,"div","rank",!isReference&&row.scoreKind==="AWARD_MODEL_PENDING"?"—":index+1);
 const center=el(main,"div","identity");
 el(center,"strong","playername",row.name);
 el(center,"p","tagline",isReference?"Saved workbook example · "+(row.playerRecentRecordedSeason||"historical"):(row.gamesPlayed+" GP · "+label));
 if(isReference)el(center,"p","tiny","Not a current-season nominee");
 const scoreButton=el(main,"button","ratingbtn");scoreButton.type="button";
 const valid=typeof score==="number"&&Number.isFinite(score);
 // Final eligible award ratings use public 50–100 conditional colours.
 // Raw composites and scoring-title counts are *not* equivalent ratings.
 const isCount=(isReference&&["rocket","art-ross"].includes(state.award))||kind==="WORKBOOK_REGULAR_SEASON_STAT_COUNT";
 const genuineFinal=(isReference&&!isCount)||kind==="OFFICIAL_WORKBOOK_FINAL";
 const range=valid&&genuineFinal?badge(Number(score)):["neutral",valid?"Source value":"Pending"];
 const orb=el(scoreButton,"span","orb "+range[0]);orb.style.setProperty("--value",String(valid&&genuineFinal?Math.max(0,Math.min(100,Number(score))):0));
 el(orb,"b",null,valid?(genuineFinal&&Number.isInteger(score)?score:Number(score).toFixed(isCount?0:1)):"—");
 el(orb,"span",null,isCount?"STAT":isReference?"OVR":kind==="AWARD_MODEL_PENDING"?"WAIT":genuineFinal?"OVR":"RAW");
 scoreButton.setAttribute("aria-label",valid?"Explain "+row.name+" "+(genuineFinal?"award rating":"source score"):"Explain why "+row.name+"'s award rating is pending");
 const low=el(wrapper,"p","rating-label",isReference?(isCount?"Saved "+(state.award==="rocket"?"goal":"point")+" count":range[1]+" · saved rating"):kind==="AWARD_MODEL_PENDING"?"Rating pending":isCount?"Regular-season "+(state.award==="rocket"?"goals":"points"):genuineFinal?"Workbook final rating":"Provisional raw model score");
 if(!isReference)movement(wrapper,row,index,state.source.races[state.award]);
 const region=el(wrapper,"div","explain hide");region.setAttribute("role","region");region.setAttribute("aria-live","polite");
 const toggle=fn=>{region.classList.remove("hide");fn()};
 const revealOverall=()=>{
  if(isReference){
   if(isCount){region.replaceChildren();infoPanel(region,"Verified workbook statistic","This historical result is an actual goals or points count, not a normalized 50–100 overall award score.",row.scorecard);}
   else explainOverall(region,row,state.explain?.races?.[state.award]?.[row.name]);
  }else{
   region.replaceChildren();
   el(region,"h4",null,valid?"This season's verified model output":"Rating pending");
   el(region,"p",null,valid?
    (isCount?"This is a regular-season statistical count, not a 50–100 award rating.":genuineFinal?"Final eligible award rating from the current model.":"Provisional raw composite from the current model; not comparable to final award ratings."):
    "This player has appeared this season, but the award-model calculation is not yet verified. No score has been assigned.");
   el(region,"p","tiny","Current-season explanations must come from their own recalculated AwardScoring evidence; historical player formulas are never attached to this season's ratings.");
  }
 };
 scoreButton.addEventListener("click",()=>toggle(revealOverall));
 scoreButton.addEventListener("mouseenter",()=>toggle(revealOverall));
 scoreButton.addEventListener("focus",()=>toggle(revealOverall));
 if(isReference){
  const breakdown=state.explain?.races?.[state.award]?.[row.name];
  if(!isCount&&breakdown?.components?.length){
   addAttributeChips(wrapper,breakdown.components,row,true);
  }else if(!isCount&&typeof row.scorecard==="string"&&row.scorecard.trim()){
   const found=(row.scorecard.match(/(?:PTS|CONS|ATTD|POTG|SPEC|CLUT|HEAT|2WAY|DISC|PIM|PLUS|GREL|WIN%|GAA|WINS|SHO|CAR|PLY|LONG|LEG|AST|GOAL|OFF):\s*\d+(?:\.\d+)?/g)||[]);
   if(found.length){
    const main=el(wrapper,"div","score-chips ea-attributes");
    const addOriginal=(target,raw)=>{
     const btn=el(target,"button","stat-chip ea-stat");btn.type="button";
     const parts=raw.split(":");el(btn,"span","ea-stat-name",parts[0]);el(btn,"strong","ea-stat-value",parts[1].trim());
     btn.setAttribute("aria-label","Inspect saved original workbook scorecard for "+raw);
     const show=()=>{region.classList.remove("hide");region.replaceChildren();infoPanel(region,raw,"Original saved scorecard value. Component weight and formula are not verified in this example.",row.scorecard);};
     btn.addEventListener("click",show);btn.addEventListener("focus",show);btn.addEventListener("mouseenter",show);
    };
    found.slice(0,6).forEach(v=>addOriginal(main,v));
    if(found.length>6){const more=el(wrapper,"details","more-attributes");el(more,"summary",null,"Show "+(found.length-6)+" more saved attributes");const group=el(more,"div","score-chips ea-attributes");found.slice(6).forEach(v=>addOriginal(group,v));}
   }
  }
 }else if(genuineFinal){
  const components=currentComponents(row,state.source.races[state.award]);
  if(components)addAttributeChips(wrapper,components,row,false);
  else el(wrapper,"p","attributes-pending","Attribute breakdown pending same-week verified workbook evidence");
 }
 return wrapper;
}
function isVerifiedWeeklyRace(data,race,participants){
 if(data.season!=="W2026/27"||!data.seasonRaceMode?.currentModelScoresVerified
    ||race?.status!=="VERIFIED_CURRENT_WEEK"||!Array.isArray(race.entries)
    ||!Number.isInteger(data.currentTeamGP)||data.currentTeamGP<1
    ||data.sourceWorkbookRecordedGP!==data.currentTeamGP
    ||race.modelGameCount!==data.currentTeamGP
    ||data.sourceModelParity?.mismatches!==0
    ||!(/^[a-f0-9]{64}$/i).test(data.sourceWorkbookHash||"")
    ||!/^\\d{4}-\\d{2}-\\d{2}$/.test(race.asOf||"")
    ||race.asOf<data.latestGameDate
    ||!participants||participants.season!==data.season
    ||participants.officialTeamGames!==data.currentTeamGP
    ||participants.status!=="UNRANKED_VERIFIED_SEASON_APPEARANCES_NOT_AWARD_SCORES"
    ||!Array.isArray(participants.players))return false;
 const named=new Map(participants.players.map(x=>[x.name,x]));
 if(named.size!==participants.players.length||race.entries.length>5)return false;
 const seen=new Set();
 for(const player of race.entries){
  const official=named.get(player.name);
  if(!official||seen.has(player.name)||!Number.isInteger(player.gamesPlayed)||player.gamesPlayed<1
      ||player.gamesPlayed>data.currentTeamGP||player.gamesPlayed!==official.gp
      ||typeof player.eligible!=="boolean")return false;
  seen.add(player.name);
  const kind=player.scoreKind;
  if(kind==="AWARD_MODEL_PENDING"){
   if(player.modelScore!==null&&player.modelScore!==undefined)return false;
  }else if(kind==="WORKBOOK_REGULAR_SEASON_STAT_COUNT"){
   if(!Number.isInteger(player.modelScore)||player.modelScore<0)return false;
  }else if(kind==="OFFICIAL_WORKBOOK_FINAL"){
   if(!player.eligible||!Number.isFinite(player.modelScore)||player.modelScore<50||player.modelScore>100)return false;
  }else if(kind==="WORKBOOK_RAW_COMPOSITE_PROVISIONAL"){
   if(player.eligible||!Number.isFinite(player.modelScore)||!Number.isFinite(player.rawComposite))return false;
  }else return false;
 }
 return true;
}
function renderPlayerEvidence(card,player,participants){
 const raw=player.currentHTORaw,events=player.currentHTOEventEvidence,scoring=player.verifiedHTOScoringByStrength;
 if(!raw||raw.season!==participants.season||raw.gamesPlayed!==player.gp||!events)return;
 const box=el(card,"details","player-evidence");
 el(box,"summary",null,"Game details & stat source");
 const inside=el(box,"div","player-evidence-body");
 const label=el(inside,"div","player-evidence-line");
 if(player.position==="Skater"){
  if(![raw.goals,raw.assists,raw.points,raw.penaltyMinutes,raw.playerOfTheGameCount].every(Number.isFinite)
     ||raw.points!==raw.goals+raw.assists)return box.remove();
  el(label,"span",null,raw.goals+" "+(raw.goals===1?"goal":"goals")+" + "+raw.assists+" "+(raw.assists===1?"assist":"assists")+" = "+raw.points+" "+(raw.points===1?"point":"points"));
  el(inside,"p",null,"HTO season: "+raw.playerOfTheGameCount+" Player of the Game · "+raw.penaltyMinutes+" penalty minutes · "+raw.plusMinus+" plus/minus.");
  if(scoring?.sourceStatus==="EXACT_HTO_GOAL_SCORER_AND_ASSISTANT_EVENTS_RECONCILED_NOT_AWARD_SCORE"){
   el(inside,"p",null,"Scoring credits: "+scoring.evenStrengthGoals+" ES goals, "+scoring.evenStrengthAssists+" ES assists; "+scoring.powerPlayGoals+" PP goals, "+scoring.powerPlayAssists+" PP assists; "+scoring.shorthandedGoals+" SH goals, "+scoring.shorthandedAssists+" SH assists.");
  }
  if(events.sourceKind==="HTO_SCORES_AND_BOX_SCORE_EVENTS_RECONCILED"&&Number.isInteger(events.reportedPIMFreeGameAppearances)){
   el(inside,"p",null,"HTO-reported penalty-free games: "+events.reportedPIMFreeGameAppearances+" of "+player.gp+" appearances.");
  }
 }else if(player.position==="Goalie"){
  if(![raw.losses,raw.goalsAgainst,raw.goalsAgainstAverage,raw.playerOfTheGameCount].every(Number.isFinite))return box.remove();
  el(label,"span",null,player.gp+" games · "+raw.goalsAgainst+" goals allowed · "+raw.goalsAgainstAverage.toFixed(2)+" GAA");
  el(inside,"p",null,raw.playerOfTheGameCount+" Player of the Game selections · "+raw.losses+" losses.");
  if(events.sourceKind==="FOUR_HTO_BOXSCORES_GOALIE_APPEARANCE_AND_ALL_PUBLISHED_PENALTY_GOAL_EVENTS_VERIFIED")
   el(inside,"p",null,"No goalie penalty or goalie goal/assist recorded in the published HTO game summaries.");
 }else return box.remove();
 const pattern=player.sourceHTOGamePattern;
 if(pattern?.season===participants.season
    &&Array.isArray(pattern.games)&&pattern.games.length===player.gp
    &&["HTO_PER_GAME_OBSERVATIONS_CROSSCHECKED_TO_CURRENT_SEASON","HTO_GOALIE_PER_GAME_OBSERVATIONS_CROSSCHECKED_TO_CURRENT_SEASON"].includes(pattern.status)){
  const uniqueIds=new Set(pattern.games.map(g=>g.gameId));
  const rawScoringOkay=player.position!=="Skater" ||
   (pattern.games.every(g=>[g.g,g.a,g.points,g.plusMinus,g.playerOfTheGame].every(Number.isInteger)&&g.g+g.a===g.points)
     &&pattern.games.reduce((n,g)=>n+g.g,0)===raw.goals
     &&pattern.games.reduce((n,g)=>n+g.a,0)===raw.assists
     &&pattern.games.reduce((n,g)=>n+g.points,0)===raw.points);
  const goalieOkay=player.position!=="Goalie" ||
   (pattern.games.every(g=>Number.isInteger(g.goalsAgainst)&&g.goalsAgainst>=0)
    &&pattern.games.reduce((n,g)=>n+g.goalsAgainst,0)===raw.goalsAgainst);
  if(uniqueIds.size===player.gp&&rawScoringOkay&&goalieOkay){
   el(inside,"h4","game-form-heading","Game-by-game form");
   const list=el(inside,"div","player-form-games");
   for(const game of pattern.games){
    if(typeof game.date!=="string"||!/^2026-[0-9]{2}-[0-9]{2}$/.test(game.date))continue;
    const tile=el(list,"div","player-form-game");
    el(tile,"span","player-form-date",game.date.slice(5));
    const score=player.position==="Goalie"
     ?game.goalsAgainst+" GA"
     :game.g+" G · "+game.a+" A · "+game.points+" PTS";
    el(tile,"strong",null,score);
    if(game.playerOfTheGame===1)el(tile,"span","player-form-potg","POTG");
   }
   if(player.position==="Skater"&&pattern.observedCounts){
    const info=pattern.observedCounts;
    if(Number.isInteger(info.pointScoringGames)&&Number.isInteger(info.multiPointGames)){
     el(inside,"p","player-form-summary",info.pointScoringGames+"/"+player.gp+" games with a point · "+info.multiPointGames+" multi-point games.");
    }
   }
  }
 }
 const sources=participants.verifiedSourceReadback?.currentHTOGameEventAudit?.currentOfficialGameSources;
 const played=events.playedOfficialHTOGameIds||scoring?.sourceGameIds||player.verifiedGameIds;
 if(Array.isArray(sources)&&Array.isArray(played)&&played.length===player.gp){
  const byId=new Map(sources.filter(x=>Number.isInteger(x.gameId)&&typeof x.url==="string"
    &&x.url.startsWith("https://www.htosports.com/teams/default.asp?")
    &&Number.isInteger(Number(x.gameId))).map(x=>[x.gameId,x]));
  const links=el(inside,"div","player-game-links");
  for(const gid of played){
   const record=byId.get(gid);
   if(!record)continue;
   const a=el(links,"a",null,(record.date||"Game")+" ↗");
   a.href=record.url;a.target="_blank";a.rel="noopener noreferrer";
  }
 }
 el(inside,"p","player-evidence-disclaimer","Official game statistics only. These are not workbook award subscores, ratings, rankings or proof of award eligibility.");
}
function renderRaceActivity(){
 const src=state.participation,d=state.source,id=state.award;
 if(!src||src.season!==d.season||src.officialTeamGames!==d.currentTeamGP
    ||src.status!=="UNRANKED_VERIFIED_SEASON_APPEARANCES_NOT_AWARD_SCORES"
    ||src.verifiedSourceReadback?.status!=="HTO_NAMED_SKATER_AND_GOALIE_GP_PARITY_PASS"
    ||src.verifiedSourceReadback?.htoPositionVerification?.status!=="HTO_POSITION_AND_GP_PARITY_PASS"
    ||!Array.isArray(src.players))return;
 let rows=src.players.filter(p=>typeof p.name==="string"&&Number.isInteger(p.gp)&&p.gp>=1&&p.gp<=d.currentTeamGP);
 const hints={
  rolaids:"Call-ups and drop-ins who appeared this season. The bar tracks progress toward the five-game minimum only—not award ranking or eligibility. Relief-goalie classification remains unverified.",
  norris:"Players listed by HTO with a defence position. A dual position does not establish Norris eligibility.",
  "art-ross":"Skaters with a verified regular-season appearance. Points shown are actual, not award ratings.",
  rocket:"Skaters with a verified regular-season appearance. Goals shown are actual, not award ratings.",
  hart:"Players who have appeared, not the MVP shortlist.",
  "lady-byng":"Players who have appeared; sportsmanship and award eligibility are not scored here.",
  dedication:"Players who have appeared; the dedication model considers additional career and attendance history.",
  improved:"Players who have appeared; rookie and career-comparison eligibility remain unverified.",
  rookie:"First-season full-time players marked by the saved roster workbook who have played in HTO this season. This is not a Rookie of the Year nomination or model ranking."
 };
 if(!Object.hasOwn(hints,id))return;
 if(id==="rolaids")rows=rows.filter(p=>p.position==="Skater"&&["CU","DI"].includes(p.role));
 else if(id==="norris")rows=rows.filter(p=>p.position==="Skater"&&p.htoPositionHasDefenceOption===true);
 else if(id==="art-ross"||id==="rocket")rows=rows.filter(p=>p.position==="Skater");
 else if(id==="rookie"){
  const source=src.workbookRookieRosterWatch;
  if(source?.status!=="SAVED_WORKBOOK_FT_ROOKIE_FLAG_CROSSCHECKED_WITH_HTO_CURRENT_SEASON_APPEARANCE"
    ||source.year!==d.season||source.sourceWorkbookSha256!==d.sourceWorkbookHash)return;
  rows=rows.filter(p=>p.position==="Skater"&&p.role==="FT"&&p.rookieRosterWatch?.sourceFlag==="Rookie Status = 1"
    &&p.rookieRosterWatch?.firstRecordedSeason===d.season&&source.watchedPlayers.includes(p.name));
 }
 if(!rows.length)return;
 if(new Set(rows.map(x=>x.name.toLowerCase())).size!==rows.length)return;
 rows.sort((a,b)=>a.name.localeCompare(b.name));
 const section=el(DOM.region,"details","race-activity");
 if(id==="rolaids"||id==="norris"||id==="rookie")section.open=true;
 el(section,"summary",null,rows.length+(id==="rookie"?" first-year full-timers":" players")+" on the ice · unranked "+(id==="rolaids"?"relief":id==="rookie"?"rookie":"season")+" watch");
 const content=el(section,"div","race-activity-body");
 el(content,"p",null,hints[id]);
 const grid=el(content,"div","race-activity-grid");
 for(const p of rows){
  const entry=el(grid,"article","race-activity-player");
  el(entry,"strong",null,p.name);
  const stat=el(entry,"div","race-activity-stat");
  el(stat,"span",null,p.gp+" GP");
  if(p.position==="Skater"){
   if(Number.isFinite(p.goals)&&Number.isFinite(p.assists)){
    el(stat,"span",null,p.goals+" G");
    el(stat,"span",null,p.assists+" A");
   }
   el(entry,"div","race-activity-sub",p.role+" · "+(p.htoListedPosition||"Position unverified"));
   if(id==="rolaids"){
    const threshold=5,progress=el(entry,"div","rolaids-gp-track");
    const label=el(progress,"div","rolaids-gp-label");
    el(label,"span",null,"Games-played minimum");
    el(label,"strong",null,Math.min(p.gp,threshold)+" / "+threshold+" GP");
    const bar=el(progress,"div","rolaids-gp-bar");
    bar.setAttribute("role","progressbar");
    bar.setAttribute("aria-label",p.name+" games toward the five-game Rolaids minimum");
    bar.setAttribute("aria-valuemin","0");
    bar.setAttribute("aria-valuemax",String(threshold));
    bar.setAttribute("aria-valuenow",String(Math.min(p.gp,threshold)));
    const fill=el(bar,"span","rolaids-gp-fill"+(p.gp>=threshold?" complete":""));
    fill.style.width=Math.min(100,100*p.gp/threshold)+"%";
    el(progress,"div","rolaids-gp-foot",p.gp>=threshold
       ?"GP minimum reached · other eligibility and scores still require verification"
       :(threshold-p.gp)+" more "+(threshold-p.gp===1?"game":"games")+" to reach the GP minimum");
   }
  }else{
   const h=p.officialHTOStats||{};
   if(Number.isInteger(h.goalsAgainst))el(stat,"span",null,h.goalsAgainst+" GA");
   el(entry,"div","race-activity-sub","Goalie · award roster role unverified");
  }
  renderPlayerEvidence(entry,p,src);
 }
 el(content,"p","source-note","Appearance stats: official HTO this season, read back "+(src.verifiedSourceReadback.verifiedOn||"date pending")+". "+(id==="rookie"?"First-year FT flag: saved Sep 2026 workbook roster (not current model or finalized award eligibility). ":"Roster classifications are from HockeyOS, not an award approval. ")+"Alphabetical, not ranked by performance.");
}
function renderSeasonParticipants(){
 const d=state.source,source=state.participation;
 if(!source||d.currentTeamGP<1||source.season!==d.season||source.officialTeamGames!==d.currentTeamGP
    ||source.status!=="UNRANKED_VERIFIED_SEASON_APPEARANCES_NOT_AWARD_SCORES"
    ||!Array.isArray(source.players))return;
 const good=source.players.filter(x=>typeof x.name==="string"&&Number.isInteger(x.gp)&&x.gp>=1&&x.gp<=d.currentTeamGP);
 const uniques=new Set(good.map(x=>x.name.toLowerCase()));
 if(uniques.size!==good.length||good.some(x=>/unknown|unidentified|placeholder/i.test(x.name)))return;
 const details=el(DOM.region,"details","exact participation");
 const skaters=good.filter(x=>x.position==="Skater").length,goalies=good.filter(x=>x.position==="Goalie").length;
 el(details,"summary",null,good.length+" verified named players appeared · "+skaters+" skaters, "+goalies+" goalies");
 const p=el(details,"div","participant-inner");
 el(p,"p",null,"Official game participation through "+source.latestCompletedGameDate+". This is an unranked team-wide list—not a ranking, official award shortlist, or indication that a player qualifies for every award.");
 const chips=el(p,"div","participant-grid");
 for(const player of good){
  const item=el(chips,"div","participant-item");
  el(item,"strong",null,player.name);
  el(item,"span",null,player.gp+" GP · "+(player.position==="Goalie"?"Goalie":player.role));
 }
 el(p,"p","source-note","Source: HTO game records and HockeyOS HTO-fed skater/goalie appearance readback. Unidentified game-sheet entries are not counted as named nominees. Actual award ratings remain separately gated.");
}
function draw(){
 if(!state.source)return;
 const d=state.source,award=d.awards.find(a=>a.id===state.award);
 labelData();DOM.region.replaceChildren();
 const isCurrent=state.mode==="current";
 put("source-label",isCurrent?"This season · "+d.currentTeamGP+" games":"Saved workbook examples · historical");
 if(isCurrent){
  const race=d.races[state.award];
  // Hard UI fail-closed check: player must actually play during this season,
  // even if a stale upstream file incorrectly flags him as eligible.
  const valid=isVerifiedWeeklyRace(d,race,state.participation);
  if(d.currentTeamGP===0){
   notice("The season has not started. Award races open only after the first verified game.",false);
   DOM.region.append($("div","empty","No games played — award board empty."));
  }else if(!valid){
   notice("The team has played "+d.currentTeamGP+" verified games. Current award scores are being recalculated against those games; saved old-season ratings are kept separate.");
   const box=$("div","empty");el(box,"strong",null,"This week's model ratings aren't ready yet");
   el(box,"p",null,"Award rankings remain empty until the workbook scores, game dates and participants match the verified season. We don't substitute old ratings, other stats or players with zero appearances.");
   DOM.region.append(box);
   // Publish an explicitly unranked, award-specific appearance watch independent of the held formula ratings.
   renderRaceActivity();
  }else{
   let rows=(race.entries||[]).filter(x=>Number.isFinite(+x.gamesPlayed)&&+x.gamesPlayed>=1&&+x.gamesPlayed<=d.currentTeamGP&&typeof x.eligible==="boolean"&&(Number.isFinite(x.modelScore)||x.scoreKind==="AWARD_MODEL_PENDING"));
   rows.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||(b.eligible?(Number(b.rankKey)||0)-(Number(a.rankKey)||0):0)||(Number(b.rawComposite)||0)-(Number(a.rawComposite)||0)||a.name.localeCompare(b.name));rows=rows.slice(0,5);
   notice(rows.length?"Qualified players lead; provisional players fill only the remaining places. Each has appeared at least once, and any uncalculated rating is labelled pending.":"No current-season players have a verified appearance in this award category.",false);
   if(!rows.length)DOM.region.append($("div","empty","No verified award participants yet."));
   else rows.forEach((r,i)=>DOM.region.append(card(r,i,false)));
  }
  if(d.currentTeamGP>=1)renderSeasonParticipants();
 }else{
  notice("Historical examples from the saved workbook. These ratings and scorecards are NOT the current 2026–27 race. Use them to explore how award calculations work.");
  const saved=state.reference?.races?.[state.award]||[];
  if(!saved.length){
   const div=el(DOM.region,"div","empty");el(div,"strong",null,"No scored historical candidates");
   el(div,"p",null,"The saved workbook has no ranked players for this award. That does not mean no one has played in the current season.");
  }else saved.forEach((r,i)=>DOM.region.append(card(r,i,true)));
 }
}
async function boot(){
 try{
 const [source,reference,explain,participation]=await Promise.all(["./awards-races.json","./awards-workbook-reference.json","./awards-component-evidence.json","./awards-participants.json"].map(async url=>{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("source "+url);return r.json()}));
 if(source.schema!=="brave-hc-awards-races-weekly/v1"||reference.schema!=="brave-hc-awards-workbook-reference/v1"||explain.schema!=="brave-hc-awards-component-evidence/v1"||source.awards.length!==11||participation.schema!=="brave-hc-awards-participants/v1"||participation.season!==source.season||participation.officialTeamGames!==source.currentTeamGP)throw Error("contract");
 state.source=source;state.reference=reference;state.explain=explain;state.participation=participation;
 try{const res=await fetch("./awards-weekly-history.json",{cache:"no-store"});if(res.ok){const weekly=await res.json();if(weekly?.schema==="brave-hc-awards-weekly-history/v1")state.weeklyHistory=weekly;}}catch(_err){/* History is optional, never guess a baseline. */}
 put("gp",source.currentTeamGP);
 DOM.select.replaceChildren();for(const a of source.awards){const o=$("option",null,a.name);o.value=a.id;DOM.select.append(o);}
 DOM.select.value=state.award;DOM.select.addEventListener("change",()=>{state.award=DOM.select.value;draw()});
 document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>selectMode(b.dataset.mode)));
 selectMode("current");
 }catch(err){notice("Award data could not be verified. The official HTO award history remains available.");DOM.region.replaceChildren($("div","empty","Award scoreboard temporarily unavailable."));}
}
boot();
})();