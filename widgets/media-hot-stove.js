/* Brave H.C. Media + Hot Stove. Homepage article is a readable excerpt.
 * All full-length/archived articles remain on the approved standalone Hot Stove page.
 * Source-verified HTO facts are never edited or reconstructed here.
 */
(function(){
"use strict";
const root=document.getElementById("media-root");
if(!root)return;
const panel=document.getElementById("story-panel");
const controls=Array.from(root.querySelectorAll(".story-tabs button"));
const videoContainer=document.getElementById("media-video-container");
let mode="recap",context=null;
const text=(tag,cls,value)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(value!==undefined)n.textContent=String(value);return n;
};
const empty=()=>panel.replaceChildren();
const fullLink=(tab,article)=>{
 const url=new URL("./hot-stove.html",location.href);
 url.searchParams.set("tab",tab);
 if(article)url.searchParams.set("article",article);
 return url.href;
};
const link=(title,url,cls="full-article")=>{
 const a=text("a",cls,title);a.href=url;a.rel="noopener noreferrer";a.target="_blank";return a;
};
function safePubDate(iso){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||""))return "Source date unavailable";
 const d=new Date(iso+"T12:00:00Z");
 return d.toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric",timeZone:"America/Toronto"});
}
function checkArticle(a){
 return !!(a&&a.verification?.status==="SOURCE_VERIFIED"&&typeof a.headline==="string"&&
 a.headline.length>8&&typeof a.dek==="string"&&a.boxScore&&
 Number.isInteger(a.boxScore.ourGoals)&&Number.isInteger(a.boxScore.theirGoals)&&
 Array.isArray(a.paragraphs)&&a.paragraphs.length>=1&&a.sourceUrls?.length);
}
function card(label,title,summary,excerpt,date,actionLabel,url){
 const card=text("article","article-card");
 card.append(text("div","eyebrow",label));
 card.append(text("h2",null,title));
 if(summary)card.append(text("p","lede",summary));
 if(excerpt)card.append(text("p","excerpt",excerpt));
 const row=text("div","card-actions");
 row.append(text("span","story-meta",date));
 row.append(link(actionLabel,url));
 card.append(row);return card;
}
function renderVideo(config){
 const video=config?.publishedVideo;
 const valid=video&&config.videoPublicationState==="PUBLIC_VERIFIED"&&
 video.status==="PUBLIC_VIDEO_VERIFIED_BY_FOUNDER"&&
 /^\w[\w-]{10}$/.test(video.videoId)&&/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(video.videoUrl);
 videoContainer.replaceChildren();
 if(valid){
   const iframe=document.createElement("iframe");
   iframe.src="https://www.youtube.com/embed/"+video.videoId;
   iframe.title="Brave H.C. official published highlights: "+video.title;
   iframe.loading="lazy";
   iframe.referrerPolicy="strict-origin-when-cross-origin";
   iframe.allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share";
   iframe.allowFullscreen=true;
   videoContainer.append(iframe);
   videoContainer.setAttribute("aria-label",video.title);
 }else{
   const fallback=text("div","fallback");
   const img=document.createElement("img");img.src="./brave_hc_logo.png";img.alt="";
   fallback.append(img,text("p",null,"Latest video pending publication approval"));
   videoContainer.append(fallback);
   videoContainer.setAttribute("aria-label","Brave H.C. game coverage");
 }
}
function showRecap(){
 empty();
 const pub=context?.publication,article=pub?.latestArticle;
 if(pub?.editorialState!=="FOUNDER_APPROVED"||!checkArticle(article)){
   panel.append(text("p","notice","The next approved game recap is not available. Existing HTO results remain authoritative."));
   return;
 }
 const matching=context.config?.publishedVideo?.gameId===article.gameId;
 const label="LATEST APPROVED RECAP"+(matching?" · GAME HIGHLIGHTS ABOVE":"");
 const snippet=article.paragraphs[0];
 const score="Brave H.C. "+article.boxScore.ourGoals+"–"+article.boxScore.theirGoals+" "+article.boxScore.opponent;
 const view=card(label,article.headline,score+" · "+article.dek,snippet,safePubDate(article.date),"Read Full Article",fullLink("feature"));
 panel.append(view);
}
function showNext(){
 empty();
 const p=context?.publication?.gamePreview,feed=context?.upcoming;
 const game=feed?.games?.find(g=>Date.now()<Date.parse(g.rolloverAtUTC));
 const published=p&&game&&typeof p.headline==="string"&&p.headline.toLowerCase().includes(String(game.opponent).toLowerCase())&&Array.isArray(p.paragraphs)&&p.paragraphs.length>0;
 if(!published){
   const box=text("article","article-card");
   box.append(text("div","eyebrow","NEXT GAME · VERIFIED SCHEDULE"));
   box.append(text("h2",null,game?"Brave H.C. vs "+game.opponent:"Next fixture pending verification"));
   box.append(text("p","lede","The approved pregame article does not match the current HTO fixture. Check the official schedule for the latest information."));
   box.append(link("Official HTO Schedule","https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=schedule"));
   panel.append(box);return;
 }
 panel.append(card("NEXT GAME · PREVIEW",p.headline,p.paragraphs[0],p.paragraphs[1]||"",safePubDate(game.gameDate),"Full Matchup Preview",fullLink("preview")));
}
function showArchive(){
 empty();
 const pub=context?.publication,arr=[pub?.latestArticle,...(pub?.archive||[]).map(e=>e.article)].filter(checkArticle);
 const box=text("div","article-card");
 box.append(text("div","eyebrow","SEASON NEWS ARCHIVE"));
 box.append(text("h2",null,"Game Recaps & Features"));
 if(pub?.editorialState!=="FOUNDER_APPROVED"||!arr.length){
   box.append(text("p","notice","No approved archive stories available."));panel.append(box);return;
 }
 const list=text("ol","archive-list");
 for(const item of arr.slice(0,3)){
   const li=text("li");
   const a=link("",fullLink("archive",item.id),"archive-link");
   const name=text("span");
   name.append(text("span",null,item.headline));
   name.append(text("small","archive-date",safePubDate(item.date)));
   a.append(name,text("span",null,"↗"));
   a.setAttribute("aria-label","Read archived story: "+item.headline);
   li.append(a);list.append(li);
 }
 box.append(list);
 const more=text("div","card-actions");
 more.append(text("span","story-meta",String(arr.length)+" verified stories on file"));
 more.append(link("View Full Archive",fullLink("archive")));
 box.append(more);
 panel.append(box);
}
function render(){
 for(const b of controls){
   const selected=b.dataset.tab===mode;
   b.setAttribute("aria-selected",String(selected));
   b.tabIndex=selected?0:-1;
 }
 panel.setAttribute("aria-labelledby","tab-"+mode);
 if(mode==="recap")showRecap();
 else if(mode==="next")showNext();
 else showArchive();
}
function select(which){
 if(!["recap","next","archive"].includes(which))return;
 mode=which;render();
}
for(const [i,button] of controls.entries()){
 button.addEventListener("click",()=>select(button.dataset.tab));
 button.addEventListener("keydown",e=>{
   if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
   e.preventDefault();const index=e.key==="Home"?0:e.key==="End"?controls.length-1:
   (i+(e.key==="ArrowLeft"?controls.length-1:1))%controls.length;
   controls[index].focus();select(controls[index].dataset.tab);
 });
}
async function fetchVerified(source){
 const r=await fetch(source,{cache:"no-store"});
 if(!r.ok)throw Error("Source not available");
 return r.json();
}
async function init(){
 try{
  const [config,pub,upcoming]=await Promise.all([
    fetchVerified("./media-hot-stove.json"),
    fetchVerified("./hot-stove-approved.json"),
    fetchVerified("./countdown.json")
  ]);
  if(config.schema!=="brave-hc-media-home/v1"||config.team!=="Brave H.C."||
     pub.schema!=="brave-hc-hot-stove-editorial-preview/v1"||pub.team!=="Brave H.C."||
     pub.editorialState!=="FOUNDER_APPROVED"||upcoming.schema!=="brave-hc-upcoming-countdown/v1")
       throw Error("Unexpected or unapproved media source");
  context={config,publication:pub,upcoming};
  renderVideo(config);render();
 }catch(error){
  videoContainer.setAttribute("aria-label","Latest team highlights");
  empty();panel.append(text("p","notice","Team news is temporarily unavailable. Please use official HTO scores and schedule; no unverified article will be shown."));
 }
}
init();
})();
