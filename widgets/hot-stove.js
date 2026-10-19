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
function verifiedUpcomingWatch(section,p){
 if(!p||!Array.isArray(p.milestoneWatch)||!p.milestoneWatch.length)return;
 const block=$("section","milestone-radar");
 block.append($("h3","section-header","Milestones in reach"));
 const subset=p.milestoneWatch.filter(x=>x.kind==="MILESTONE_APPROACHING"&&[1,2].includes(x.remaining)).slice(0,4);
 for(const r of subset)block.append($("p",null,r.player+": "+r.description));
 if(subset.length)section.append(block);
}
function feature(section,a,includePreview){
 articleFacts(a);
 section.append($("span","tag",a.articleType==="GAME_RECAP"?"Latest game recap":"Game recap"));
 section.append($("h2",null,a.headline));
 section.append($("p","lead",a.dek));
 section.append($("div","meta",a.displayDate+" · Verified HTO box score"));
 const b=a.boxScore,score=$("div","score");
 score.append($("span","team-name","BRAVE H.C."));
 const nums=$("div","numbers");nums.append($("span",null,String(b.ourGoals)));
 nums.append($("b",null," : "));nums.append($("span",null,String(b.theirGoals)));
 score.append(nums,$("span","team-name",b.opponent));section.append(score);
 const body=$("div","article-body");
 for(const paragraph of a.paragraphs){if(typeof paragraph!=="string"||paragraph.length>900)throw Error("Invalid article paragraph");body.append($("p",null,paragraph))}
 section.append(body);
 const footer=$("div","links");footer.append(link("Official HTO box score ↗",a.sourceUrls[0]));section.append(footer);
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
async function boot(){
 try{
  const response=await fetch(pathname,{cache:"no-store"});
  if(!response.ok)throw Error("No approved article feed");
  const data=await response.json();
  if(data.team!=="Brave H.C."||data.schema!=="brave-hc-hot-stove-editorial-preview/v1")throw Error("Unexpected Hot Stove data");
  if(isReview&&data.editorialState!=="DRAFT_NOT_APPROVED")throw Error("Not a review draft");
  if(!isReview&&data.editorialState!=="FOUNDER_APPROVED")throw Error("Unapproved article cannot publish");
  articleFacts(data.latestArticle);
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
