(()=>{
"use strict";
const $=(t,c,v)=>{const e=document.createElement(t);if(c)e.className=c;if(v!==undefined)e.textContent=String(v);return e};
const find=id=>document.getElementById(id);
const put=(id,v)=>find(id).textContent=String(v);
const DOM={select:find("award"),region:find("scores"),notice:find("notice"),pilot:find("pilot"),info:find("award-info")};
const state={source:null,reference:null,explain:null,award:"rolaids",mode:"current"};
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
 el(region,"p",null,"Cached workbook display result: "+Number(score).toFixed(1)+" / 100. Award weighting: "+Number(wt).toFixed(0)+"%.");
 el(region,"p","mathline",Number(score).toFixed(1)+" × "+(wt/100).toFixed(2)+" = "+Number(part).toFixed(3)+" points toward the raw composite.");
 if(sub.sourceInternalValue!==null&&sub.sourceInternalValue!==undefined){
  el(region,"p",null,"Saved internal calculation result: "+sub.sourceInternalValue+". The public display score is a separate workbook normalization.");
 }
 el(region,"p",null,"Source: AwardScoring → "+sub.sourceField+". "+(reference?"Historical "+(sub.sourceSnapshotSeason||"source snapshot")+".":""));
 const def=state.explain?.componentFormulas?.[sub.sourceField];
 if(def?.internalFormula||def?.displayFormula){
   const details=el(region,"details","exact");el(details,"summary",null,"Inspect exact original Excel formulas");
   const pre=el(details,"pre",null,"Internal input calculation:\n"+(def.internalFormula||"Not extracted")+"\n\nPublic score conversion:\n"+(def.displayFormula||"Not extracted"));
 }
 el(region,"p","tiny","The verified extraction contains exact cached formula values, but not a revalidated, current-season event-by-event calculation.");
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
function card(row,index,isReference){
 const score=isReference?row.score:row.modelScore;
 const kind=row.scoreKind||"";
 const label=isReference?"Saved rating":row.scoreKind==="AWARD_MODEL_PENDING"?"Rating pending":row.eligible?"Eligible":"Provisional";
 const wrapper=$("article","card"+(index===0?" leader":""));
 const main=el(wrapper,"div","card-main");
 el(main,"div","rank",index+1);
 const center=el(main,"div","identity");
 el(center,"strong","playername",row.name);
 el(center,"p","tagline",isReference?"Saved workbook example · "+(row.playerRecentRecordedSeason||"historical"):(row.gamesPlayed+" GP · "+label));
 if(isReference)el(center,"p","tiny","Not a current-season nominee");
 const scoreButton=el(main,"button","ratingbtn");scoreButton.type="button";
 const valid=typeof score==="number"&&Number.isFinite(score);
 // Final eligible award ratings use public 50–100 conditional colours.
 // Raw composites and scoring-title counts are *not* equivalent ratings.
 const genuineFinal=isReference||kind==="OFFICIAL_WORKBOOK_FINAL";
 const isCount=kind==="WORKBOOK_REGULAR_SEASON_STAT_COUNT";
 const range=valid&&genuineFinal?badge(Number(score)):["neutral",valid?"Source value":"Pending"];
 const orb=el(scoreButton,"span","orb "+range[0]);orb.style.setProperty("--value",String(valid&&genuineFinal?Math.max(0,Math.min(100,Number(score))):0));
 el(orb,"b",null,valid?(genuineFinal&&Number.isInteger(score)?score:Number(score).toFixed(isCount?0:1)):"—");
 el(orb,"span",null,isReference?"OVR":kind==="AWARD_MODEL_PENDING"?"WAIT":isCount?"STAT":genuineFinal?"OVR":"RAW");
 scoreButton.setAttribute("aria-label",valid?"Explain "+row.name+" "+(genuineFinal?"award rating":"source score"):"Explain why "+row.name+"'s award rating is pending");
 const low=el(wrapper,"p","rating-label",isReference?range[1]+" · saved rating":kind==="AWARD_MODEL_PENDING"?"Rating pending":isCount?"Regular-season "+(state.award==="rocket"?"goals":"points"):genuineFinal?"Workbook final rating":"Provisional raw model score");
 const region=el(wrapper,"div","explain hide");region.setAttribute("role","region");region.setAttribute("aria-live","polite");
 const toggle=fn=>{region.classList.remove("hide");fn()};
 const revealOverall=()=>{
  if(isReference){
   explainOverall(region,row,state.explain?.races?.[state.award]?.[row.name]);
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
  if(breakdown?.components?.length){
   const chips=el(wrapper,"div","score-chips");
   breakdown.components.forEach(item=>{
    const btn=el(chips,"button","stat-chip");
    btn.type="button";
    el(btn,"span",null,item.abbreviation);btn.append(document.createTextNode(Number(item.webComponentScore).toFixed(1)));
    btn.setAttribute("aria-label",item.abbreviation+" score "+item.webComponentScore+"; inspect calculation");
    btn.addEventListener("mouseenter",()=>toggle(()=>explainComponent(region,row,item,true)));
    btn.addEventListener("focus",()=>toggle(()=>explainComponent(region,row,item,true)));
    btn.addEventListener("click",()=>toggle(()=>explainComponent(region,row,item,true)));
   });
  }else if(typeof row.scorecard==="string"&&row.scorecard.trim()){
   const chips=el(wrapper,"div","score-chips");
   for(const found of (row.scorecard.match(/(?:PTS|CONS|ATTD|POTG|SPEC|CLUT|HEAT|2WAY|DISC|PIM|PLUS|GREL|WIN%|GAA|WINS|SHO|CAR|PLY|LONG|LEG|AST|GOAL|OFF):\s*\d+(?:\.\d+)?/g)||[]).slice(0,10)){
    const btn=el(chips,"button","stat-chip",found);btn.type="button";
    btn.setAttribute("aria-label","Read original workbook source for "+found);
    btn.addEventListener("mouseenter",()=>toggle(()=>{region.replaceChildren();infoPanel(region,found,"Original workbook scorecard shows this value; its component-level source formula has not yet been verified for interactive public release.",row.scorecard)}));
    btn.addEventListener("focus",()=>toggle(()=>{region.replaceChildren();infoPanel(region,found,"Original workbook scorecard shows this value; its component-level source formula has not yet been verified for interactive public release.",row.scorecard)}));
    btn.addEventListener("click",()=>toggle(()=>{region.replaceChildren();infoPanel(region,found,"Original workbook scorecard shows this value; its component-level source formula has not yet been verified for interactive public release.",row.scorecard)}));
   }
  }
 }
 return wrapper;
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
  const valid=d.seasonRaceMode.currentModelScoresVerified&&race?.status==="VERIFIED_CURRENT_WEEK";
  if(d.currentTeamGP===0){
   notice("The season has not started. Award races open only after the first verified game.",false);
   DOM.region.append($("div","empty","No games played — award board empty."));
  }else if(!valid){
   notice("The team has played "+d.currentTeamGP+" verified games. Current award scores are being recalculated against those games; saved old-season ratings are kept separate.");
   const box=$("div","empty");el(box,"strong",null,"This week's model ratings aren't ready yet");
   el(box,"p",null,"Award rankings stay empty until the workbook's scoring results and games played agree. We don't substitute points, old ratings, or players with zero appearances.");
   DOM.region.append(box);
   const played=(d.htoPerformanceSnapshot||[]).filter(x=>x.gp>=1);
   if(played.length){
    const section=el(DOM.region,"div","panel");el(section,"h3",null,"On the ice so far");
    el(section,"p",null,"A selected HTO performance snapshot—not an award ranking or complete candidate list.");
    const chips=el(section,"div","checklist");
    played.slice(0,8).forEach(x=>el(chips,"span",null,x.name+" · "+x.gp+" GP"));
   }
  }else{
   let rows=(race.entries||[]).filter(x=>Number.isFinite(+x.gamesPlayed)&&+x.gamesPlayed>=1&&+x.gamesPlayed<=d.currentTeamGP&&typeof x.eligible==="boolean"&&(Number.isFinite(x.modelScore)||x.scoreKind==="AWARD_MODEL_PENDING"));
   rows.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||(b.eligible?(Number(b.rankKey)||0)-(Number(a.rankKey)||0):0)||(Number(b.rawComposite)||0)-(Number(a.rawComposite)||0)||a.name.localeCompare(b.name));rows=rows.slice(0,5);
   notice(rows.length?"Qualified players lead; provisional players fill only the remaining places. Each has appeared at least once, and any uncalculated rating is labelled pending.":"No current-season players have a verified appearance in this award category.",false);
   if(!rows.length)DOM.region.append($("div","empty","No verified award participants yet."));
   else rows.forEach((r,i)=>DOM.region.append(card(r,i,false)));
  }
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
 const [source,reference,explain]=await Promise.all(["./awards-races.json","./awards-workbook-reference.json","./awards-component-evidence.json"].map(async url=>{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("source "+url);return r.json()}));
 if(source.schema!=="brave-hc-awards-races-weekly/v1"||reference.schema!=="brave-hc-awards-workbook-reference/v1"||explain.schema!=="brave-hc-awards-component-evidence/v1"||source.awards.length!==11)throw Error("contract");
 state.source=source;state.reference=reference;state.explain=explain;
 put("gp",source.currentTeamGP);
 DOM.select.replaceChildren();for(const a of source.awards){const o=$("option",null,a.name);o.value=a.id;DOM.select.append(o);}
 DOM.select.value=state.award;DOM.select.addEventListener("change",()=>{state.award=DOM.select.value;draw()});
 document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>selectMode(b.dataset.mode)));
 selectMode("current");
 }catch(err){notice("Award data could not be verified. The official HTO award history remains available.");DOM.region.replaceChildren($("div","empty","Award scoreboard temporarily unavailable."));}
}
boot();
})();