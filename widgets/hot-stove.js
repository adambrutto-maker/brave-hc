(function(){
"use strict";
const root=document.querySelector("#hot-stove-root");
const isReview=document.documentElement.dataset.review==="true";
const params=new URLSearchParams(location.search);
if(params.has("embed"))document.body.classList.add("embedded");
const pathname=document.documentElement.dataset.feed;
let publication=null,activeId=null,mode="feature";
const $=(tag,cls,text)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(text!==undefined)n.textContent=String(text);return n;
};
function link(text,url){
 if(!url||!/^https:\/\/(www\.htosports\.com|leagues\.sportsvillage\.ca)\//.test(url))
   throw Error("Article external link not whitelisted");
 const a=$("a",null,text);a.href=url;a.rel="noopener noreferrer";a.target="_blank";return a;
}
function articleFacts(a){
 if(!a||!a.headline||!a.boxScore||!a.sourceUrls?.length||
    !Array.isArray(a.paragraphs)||a.paragraphs.length<3||
    a.verification?.status!=="SOURCE_VERIFIED")throw Error("Article source validation absent");
 if(!Number.isInteger(a.boxScore.ourGoals)||!Number.isInteger(a.boxScore.theirGoals)||
    !a.boxScore.opponent)throw Error("Untrusted score");
 return a;
}
function header(){
 const shell=$("div","shell");
 const panel=$("main","panel");
 shell.append(panel);
 if(isReview)panel.append($("div","review-ribbon","EDITORIAL DRAFT · NOT APPROVED FOR HTO"));
 const brand=$("div","brand");
 const img=$("img");img.src="./brave_hc_logo.png";img.alt="Brave H.C. logo";
 const heading=$("div","heading");
 heading.append($("div","eyebrow","HOCKEYOS · TEAM NEWS"));
 heading.append($("h1",null,"BRAVE H.C. HOT STOVE"));
 heading.append($("p",null,"Game recaps · Pregame outlook · Season archive"));
 brand.append(img,heading);panel.append(brand);
 return {shell,panel};
}
function tabs(panel){
 const bar=$("nav","tabs");
 for(const [id,label] of [["feature","Latest recap"],["preview","Next game"],["archive","Archive"]]){
  const button=$("button","tab",label);
  button.type="button";
  button.dataset.tab=id;
  button.setAttribute("aria-selected",String(mode===id));
  button.addEventListener("click",()=>{mode=id;activeId=null;render();});
  bar.append(button);
 }
 panel.append(bar);
}
function verifiedClubNotes(section){
 const notes=publication.teamNotes;
 if(!notes||!Array.isArray(notes.items)||!notes.items.length||notes.coverage!=="VERIFIED_SUPPORTED_CATEGORIES_ONLY")return;
 const area=$("section","milestone-panel");
 area.append($("h3","section-header","Around the club · Career milestones"));
 const list=$("div","milestone-list");
 for(const event of notes.items.slice(0,4)){
  if(event.kind!=="MILESTONE_REACHED"||event.evidenceStatus!=="HTO_GAME_AND_WORKBOOK_VERIFIED")continue;
  const item=$("div","milestone-item");
  item.append($("p",null,event.message));
  item.append(link("HTO verification ↗",event.sourceBoxScore));
  list.append(item);
 }
 if(list.children.length){area.append(list);section.append(area)}
}
function archivedArticleMilestones(section,a){
 const records=Array.isArray(a.milestones)?a.milestones.filter(m=>m.kind==="MILESTONE_REACHED"&&m.evidenceStatus==="HTO_GAME_AND_WORKBOOK_VERIFIED"):[];
 if(!records.length)return;
 const area=$("section","article-milestones");
 area.append($("h3","section-header","Career milestones · This game"));
 for(const milestone of records){
  const item=$("div","milestone-item");
  item.append($("p",null,milestone.message));
  item.append(link("Verified HTO game record ↗",milestone.sourceBoxScore));
  area.append(item);
 }
 section.append(area);
}
function archivedNextGame(section,p){
 if(!p||!p.sourceUrl||!Array.isArray(p.paragraphs))return;
 const area=$("section","archive-retrospective");
 area.append($("h3","section-header","Next on the schedule · At the time"));
 area.append($("p","historical-note","This is the outlook as it stood after the game above, retained for the historical season archive."));
 const inner=$("div","preview");
 inner.append($("h3",null,p.headline));
 const h=headToHeadStats(p);if(h)inner.append(h);
 for(const paragraph of p.paragraphs)inner.append($("p",null,paragraph));
 inner.append(link("Official HTO game record ↗",p.sourceUrl));
 area.append(inner);
 section.append(area);
}
function playerSpotlight(section,p,compact=false){
 const m=p?.playerOutlook;
 if(!m||m.status!=="VERIFIED_HISTORICAL_SCOUTING_NOT_LINEUP_OR_FORECAST"||!Array.isArray(m.players)||!m.players.length)return;
 const wrapper=$("section","player-outlook");
 wrapper.append($("h3","section-header",compact?"Matchup watch":"Players to watch · Matchup and recent form"));
 const paragraphs=compact?m.paragraphs.slice(0,2):m.paragraphs;
 for(const line of paragraphs){
  if(typeof line!=="string"||line.length>1200)throw Error("Invalid source-bound scouting narrative");
  wrapper.append($("p","scouting-narrative",line));
 }
 const grid=$("div","player-outlook-grid");
 for(const row of m.players.slice(0,compact?2:5)){
  if(!row.displayName||row.availability!=="NOT_CONFIRMED")throw Error("Player scouting availability missing");
  const h=row.historical,t=row.recent;
  if(!h||!t||![h.gp,h.g,h.a,h.pts,t.gp,t.g,t.a,t.pts].every(Number.isFinite))throw Error("Player scouting invalid source stats");
  const card=$("div","player-outlook-card");
  card.append($("strong","scout-name",row.displayName));
  card.append($("span","scout-stat",h.pts+" pts ("+h.g+"G, "+h.a+"A) · "+h.gp+" prior meetings"));
  card.append($("span","scout-form","Last "+row.recentWindowGames+" team games: "+t.pts+" pts in "+t.gp+" appearances"));
  grid.append(card);
 }
 wrapper.append(grid);
 wrapper.append($("p","scouting-caveat",
 "Historical performances and recent scoring do not guarantee future results. No upcoming player participation is confirmed."));
 section.append(wrapper);
}
function verifiedUpcomingWatch(section,p){
 if(!p||!Array.isArray(p.milestoneWatch)||!p.milestoneWatch.length)return;
 const block=$("section","milestone-radar");
 block.append($("h3","section-header","Milestones in reach"));
 const subset=p.milestoneWatch.filter(x=>x.kind==="MILESTONE_APPROACHING"&&[1,2].includes(x.remaining)).slice(0,4);
 for(const r of subset)block.append($("p",null,r.player+": "+r.description));
 if(subset.length)section.append(block);
}
function rosterDepthNotes(section,a){
 const c=a?.rosterContext;
 if(!c||c.completeGameRoster!==true||!Array.isArray(c.visitingPlayers)||!Array.isArray(c.fullTimersNotListed))return;
 const block=$("section","roster-context");
 block.append($("h3","section-header","Game-night roster · Full-timers and depth"));
 const absent=c.fullTimersNotListed.map(x=>x.name);
 if(absent.length){
  block.append($("p","roster-narrative","Full-timers not listed in the official game sheet: "+absent.join(", ")+"."));
 }else{
  block.append($("p","roster-narrative","All skaters classified as full-timers in the current-season reference roster appear in this game's official stat sheet."));
 }
 const named=c.visitingPlayers.filter(p=>p.identified);
 const callups=named.filter(p=>p.status==="CU");
 const dropins=named.filter(p=>p.status==="DI");
 const unknown=c.visitingPlayers.filter(p=>!p.identified);
 let countLine="";
 if(callups.length)countLine+=callups.length+" verified call-up"+(callups.length===1?"":"s")+" dressed";
 if(dropins.length)countLine+=(countLine?" and ":"")+dropins.length+" identified drop-in"+(dropins.length===1?"":"s")+" dressed";
 if(unknown.length)countLine+=(countLine?", along with ":"")+unknown.length+" unidentified HTO drop-in entry";
 if(countLine)block.append($("p","roster-narrative",countLine+". Appearance totals below are through this game, not the eventual season totals."));
 if(c.visitingPlayers.length){
  const grid=$("div","roster-depth-grid");
  for(const p of c.visitingPlayers){
   const card=$("div","roster-depth-card");
   card.append($("strong","scout-name",p.name));
   card.append($("span","roster-type",p.status==="CU"?"CALL-UP":"DROP-IN"));
   card.append($("p",null,"2026–27 appearance #"+p.seasonGPThroughGame+"."));
   if(p.identified){
    const game=p.gameStats,h=p.headToHeadBeforeGame;
    card.append($("p",null,"This game: "+game.g+" G, "+game.a+" A, "+game.pts+" pts."));
    if(h&&h.gp>0){
     card.append($("p",null,"Before puck drop vs. "+c.opponent+": "+h.pts+" pts ("+h.g+" G, "+h.a+" A) in "+h.gp+" recorded regular-season appearance"+(h.gp===1?"":"s")+"."));
    }else{
     card.append($("p",null,"No verified prior regular-season appearance vs. "+c.opponent+" in the historical workbook."));
    }
   }else{
    card.append($("p",null,"The official roster uses a placeholder; the player's identity and personal matchup record are not independently verified."));
   }
   grid.append(card);
  }
  block.append(grid);
 }
 if(Array.isArray(c.gameGoalies)&&c.gameGoalies.length){
  const goalie=c.gameGoalies.map(g=>{
   const h=g.opponentHistoryBeforeGame;
   let line=g.name+" ("+g.role+") — "+g.seasonGPThroughGame+" season appearance"+(g.seasonGPThroughGame===1?"":"s")+" through this game.";
   if(g.opponentHistoryStatus==="MASTER_WORKBOOK_GOALIESTATS_BYGAME_VERIFIED"&&h){
    line+=" Prior regular-season meetings vs. "+c.opponent+": "+h.gp+" GP";
    if(h.gp)line+=", "+h.wins+" W, "+h.losses+" L, "+h.goalsAgainst+" goals against";
    line+=".";
   }
   return line;
  });
  block.append($("h4","goalie-heading","In goal"));
  for(const line of goalie)block.append($("p","goalie-note",line));
 }
 block.append($("p","roster-caveat","Full-time, call-up and drop-in labels reflect the October 19 season roster classification, which may differ from a particular game-day designation. “Not listed” does not establish why someone missed a game. Player statistics come from official HTO sheets; opponent histories are drawn from recorded workbook game logs."));
 section.append(block);
}
function feature(section,a,includePreview){
 articleFacts(a);
 section.append($("span","tag",includePreview?"Latest game recap":"From the season archive"));
 section.append($("h2",null,a.headline));
 section.append($("p","lead",a.dek));
 section.append($("div","meta",a.displayDate+" · Verified HTO box score"));
 const b=a.boxScore,score=$("div","score");
 score.append($("span","team-name","BRAVE H.C."));
 const nums=$("div","numbers");nums.append($("span",null,String(b.ourGoals)));
 nums.append($("b",null," : "));nums.append($("span",null,String(b.theirGoals)));
 score.append(nums,$("span","team-name",b.opponent));section.append(score);
 const h=a.opponentHistory?.beforeGame;
 if(h&&Number.isInteger(h.gp)&&h.gp>0){
  section.append($("h3","section-header","Head-to-head · Before puck drop"));
  const metrics=headToHeadStats({headToHead:{regularSeason:h}});
  if(metrics)section.append(metrics);
 }
 const body=$("div","article-body");
 for(const paragraph of a.paragraphs){if(typeof paragraph!=="string"||paragraph.length>900)throw Error("Invalid article paragraph");body.append($("p",null,paragraph))}
 section.append(body);
 const footer=$("div","links");footer.append(link("Official HTO box score ↗",a.sourceUrls[0]));section.append(footer);
 rosterDepthNotes(section,a);
 archivedArticleMilestones(section,a);
 if(!includePreview&&a.followingGamePreview)archivedNextGame(section,a.followingGamePreview);
 if(includePreview)verifiedClubNotes(section);
 if(includePreview&&publication.gamePreview){
  const p=publication.gamePreview;
  const sub=$("section","preview");
  sub.append($("h3",null,p.headline));
  const statbar=headToHeadStats(p);
  if(statbar)sub.append(statbar);
  for(const text of p.paragraphs)sub.append($("p",null,text));
  sub.append(link("Next game details ↗",p.sourceUrl));
  section.append($("h3","section-header","Coming up"),sub);
  playerSpotlight(section,p,true);
  verifiedUpcomingWatch(section,p);
 }
}
function headToHeadStats(p){
 const h=p?.headToHead?.regularSeason;
 if(!h||!Number.isInteger(h.gp)||h.gp<1)return null;
 const wrap=$("div","h2h-stats");
 for(const item of [
  ["REGULAR-SEASON H2H",h.w+"–"+h.l+"–"+h.t],
  ["MEETINGS",h.gp],
  ["GOALS FOR / AGAINST",h.gf+" / "+h.ga]
 ]){
  const slot=$("div","h2h-metric");
  slot.append($("span","h2h-number",item[1]),$("span","h2h-label",item[0]));
  wrap.append(slot);
 }
 return wrap;
}
function preview(section){
 const p=publication.gamePreview;
 if(!p){section.append($("p","loading","No future game has been posted on HTO."));return}
 section.append($("span","tag","Pregame preview · HTO schedule"));
 section.append($("h2",null,p.headline));
 const summary=$("div","preview");
 const statbar=headToHeadStats(p);
 if(statbar)summary.append(statbar);
 for(const line of p.paragraphs){summary.append($("p",null,line))}
 summary.append(link("View official schedule ↗",p.sourceUrl));section.append(summary);
 playerSpotlight(section,p,false);
 verifiedUpcomingWatch(section,p);
 section.append($("p","note","Based on the latest published HTO schedule; projected lineups and player availability are not verified."));
}
function archive(section){
 const items=[publication.latestArticle,...publication.archive.map(x=>x.article)];
 if(activeId){
  const selected=items.find(x=>x.id===activeId);
  if(selected){
   const back=$("button","tab","← Back to archive");back.type="button";
   back.addEventListener("click",()=>{activeId=null;render()});section.append(back);
   feature(section,selected,false);return;
  }
 }
 section.append($("h2",null,"Season Game Archive"));
 const list=$("div","archive");
 for(const a of items){
  const btn=$("button");
  btn.type="button";
  btn.append($("span",null,a.headline));
  btn.append($("span","date",a.displayDate));
  btn.addEventListener("click",()=>{activeId=a.id;render()});
  list.append(btn);
 }
 section.append(list);
}
function render(){
 root.replaceChildren();
 const {shell,panel}=header();
 tabs(panel);
 const content=$("section","page");
 panel.append(content);
 if(mode==="feature")feature(content,publication.latestArticle,true);
 if(mode==="preview")preview(content);
 if(mode==="archive")archive(content);
 panel.append($("p","note",
 isReview?"Editorial review only. Stats and scheduling facts are validated against official HTO sources. This is NOT published to the HTO Hot Stove page. Founder approval is required. No LiveBarn coverage or quotations have been used.":
 "Approved Brave H.C. Hot Stove article. Game facts sourced from official HTO box scores. Video and player quotations are included only when independently verified."));
 root.append(shell);
}
async function applyArchiveEditorial(data){
 if(!isReview||!Array.isArray(data.archive))return;
 try{
  const response=await fetch("./hot-stove-archive-editorial.json",{cache:"no-store"});
  if(!response.ok)return;
  const overlay=await response.json();
  if(overlay.schema!=="brave-hc-hot-stove-archive-editorial/v1"||
     overlay.editorialState!=="DRAFT_NOT_APPROVED"||!Array.isArray(overlay.articles))return;
  const byId=new Map(overlay.articles.map(a=>[a.id,a]));
  for(const entry of data.archive){
   const a=entry.article,edit=byId.get(a?.id);
   if(!edit||a.verification?.status!=="SOURCE_VERIFIED"||
      a.id!==edit.id||a.date!==edit.date||a.gameId!==edit.gameId||
      a.evidenceFingerprint!==edit.evidenceFingerprint||
      a.boxScore?.opponent!==edit.opponent||
      a.boxScore?.ourGoals!==edit.ourGoals||a.boxScore?.theirGoals!==edit.theirGoals)continue;
   if(typeof edit.headline!=="string"||typeof edit.dek!=="string"||
      !Array.isArray(edit.paragraphs)||edit.paragraphs.length<3||
      edit.paragraphs.some(p=>typeof p!=="string"||p.length>900))continue;
   const outlook=edit.followingGamePreview;
   if(!outlook||!Array.isArray(outlook.paragraphs)||
      !outlook.paragraphs.every(p=>typeof p==="string"&&p.length<=1200)||
      !/^https:\/\/www\.htosports\.com\//.test(outlook.sourceUrl||""))continue;
   a.headline=edit.headline;a.dek=edit.dek;
   a.paragraphs=edit.paragraphs;a.followingGamePreview=outlook;
  }
 }catch(_err){/* Generated source article remains available if the editorial overlay cannot load. */}
}
async function applyVerifiedRosterContext(data){
 try{
  const response=await fetch("./hot-stove-roster-context.json",{cache:"no-store"});
  if(!response.ok)return;
  const overlay=await response.json();
  if(overlay.schema!=="brave-hc-hot-stove-roster-context/v1"||overlay.team!==data.team||
     overlay.season!=="W2026/27"||!Array.isArray(overlay.articles))return;
  const byGame=new Map(overlay.articles.map(x=>[x.gameId,x]));
  const articles=[data.latestArticle,...(data.archive||[]).map(x=>x.article)];
  for(const article of articles){
   const context=byGame.get(article?.gameId);
   if(!context||!context.completeGameRoster||article.verification?.status!=="SOURCE_VERIFIED"||
      article.date!==context.date||article.boxScore?.opponent!==context.opponent||
      article.boxScore?.ourGoals!==context.score?.ours||
      article.boxScore?.theirGoals!==context.score?.theirs||
      article.evidenceFingerprint!==context.evidenceFingerprint||
      !Array.isArray(context.visitingPlayers)||!Array.isArray(context.fullTimersNotListed)||
      !Array.isArray(context.gameGoalies))continue;
   if(context.visitingPlayers.some(p=>!["CU","DI"].includes(p.status)||
      !Number.isInteger(p.seasonGPThroughGame)||p.seasonGPThroughGame<1||
      !p.headToHeadBeforeGame||!Number.isInteger(p.headToHeadBeforeGame.gp)))continue;
   article.rosterContext=context;
  }
 }catch(_err){/* Never block publication because optional attendance analysis could not load. */}
}
async function boot(){
 try{
  const response=await fetch(pathname,{cache:"no-store"});
  if(!response.ok)throw Error("No approved article feed");
  const data=await response.json();
  if(data.team!=="Brave H.C."||data.schema!=="brave-hc-hot-stove-editorial-preview/v1")throw Error("Unexpected Hot Stove data");
  if(isReview&&data.editorialState!=="DRAFT_NOT_APPROVED")throw Error("Not a review draft");
  if(!isReview&&data.editorialState!=="FOUNDER_APPROVED")throw Error("Unapproved article cannot publish");
  articleFacts(data.latestArticle);
  await applyArchiveEditorial(data);
  await applyVerifiedRosterContext(data);
  publication=data;render();
 }catch(e){
  root.replaceChildren();
  const {shell,panel}=header();
  panel.append($("p","loading",isReview?"Review preview temporarily unavailable.":"Hot Stove is awaiting its first approved game article."));
  if(isReview)panel.append($("p","error",String(e.message).slice(0,130)));
  root.append(shell);
 }
}
boot();
})();
