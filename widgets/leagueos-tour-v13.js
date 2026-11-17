/* LeagueOS V13 — optional commissioner guided tour.
 * Browser-session state only. Never modifies official league/facility/HTO data.
 */
(function(){"use strict";
const STORAGE="bruttech-leagueos-guided-demo-v13";
const STEPS=[
 {route:"league-schedule",label:"Published game",title:"Inspect a real published result",description:"Braves HC lost 2–7 at Mid Ice Crisis on November 1, 2026. The official home–away result appears as 7–2 in the game record. This is archival evidence, not a prediction.",hint:"Check the recorded matchup and its official source link. This demonstrates transparent game evidence.",proof:"Game evidence visible"},
 {route:"league-planner",label:"Fair schedule",title:"Build a fair season scenario",description:"Choose Wednesday, eight weeks and historically observed SVHL times, then select Generate schedule preview.",hint:"Compare Games by week with Fairness by team to see whether early and late starts rotate across the season.",proof:"Schedule generated"},
 {route:"league-playoffs",label:"Playoff ladder",title:"Work through a playoff format",description:"Explore the four-team historical format or try wildcard/round-robin examples; enter draft scores to see teams advance.",hint:"A tied two-game series must have an explicit overtime/shootout outcome. Nothing enters an official game record.",proof:"Interactive ladder loaded"},
 {route:"league-division-review",label:"Division health",title:"Review the competitive gap",description:"Examine all ten Cristillo teams and the recorded Braves results against Mid Ice Crisis and Zamboner Crew.",hint:"The repeat-matchup control is illustrative only; it does not invent future dates or approve realignment.",proof:"Source-backed division review loaded"},
 {route:"league-features",label:"Complete suite",title:"Explore the whole LeagueOS suite",description:"The complete catalog includes game sheets, registration, rules, scheduling, playoffs, commissioner reviews, history and more.",hint:"Working previews and research are distinguished from payment proposals and unconnected future controls.",proof:"Full feature library available"}
];
const $=s=>document.querySelector(s),esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let state={active:false,index:0,visited:[],finished:false};
try{const s=JSON.parse(sessionStorage.getItem(STORAGE)||"null");if(s&&typeof s==="object"&&Number.isInteger(s.index)&&s.index>=0&&s.index<STEPS.length)state={...state,...s,visited:Array.isArray(s.visited)?s.visited.filter(x=>Number.isInteger(x)&&x>=0&&x<STEPS.length):[]}}catch(_){}
function persist(){try{sessionStorage.setItem(STORAGE,JSON.stringify(state))}catch(_){}}
function bridge(){return window.LeagueOSDemoBridgeV13}
function enter(index){if(!Number.isInteger(index)||index<0||index>=STEPS.length)return;
 state.index=index;state.active=true;state.finished=false;persist();
 const step=STEPS[index];
 if(index===0)bridge()?.openSourceGame?.(127949);
 else bridge()?.go?.(step.route);
 update()
}
function start(){state.active=true;state.index=0;state.visited=[];state.finished=false;enter(0)}
function exit(){state.active=false;persist();$("#league-v13-tourbar")?.remove()}
function next(){if(state.index>=STEPS.length-1){state.finished=true;exit();bridge()?.go?.("league-features");return}enter(state.index+1)}
function previous(){enter(Math.max(0,state.index-1))}
function readiness(index){const route=bridge()?.currentRoute?.();
 const step=STEPS[index];if(route!==step.route)return false;
 switch(index){
  case 0:return Boolean(document.querySelector('[data-source-game-id="127949"]'));
  case 1:{const plan=window.LeagueOSCompetition?._test?.getPlan?.();return Boolean(plan&&plan.not_official&&plan.bookable===false&&plan.fixtures?.length)}
  case 2:return Boolean($("#lcpf-ladder")&&window.LeagueOSFormatsV8?.status?.().loaded);
  case 3:return Boolean(window.LeagueOSDivisionReviewV12?.status?.().loaded);
  case 4:return Boolean($("#league-feature-hub-mount .v12-feature-entry"));
  default:return false;
 }
}
function update(){
 const root=$("#workspace");if(!root)return;
 const prior=$("#league-v13-tourbar");
 if(!state.active||String(bridge()?.currentRoute?.()||"").startsWith("team-")){prior?.remove();return}
 const route=bridge()?.currentRoute?.(),step=STEPS[state.index];
 if(route===step.route&&!state.visited.includes(state.index)){state.visited.push(state.index);persist()}
 const proof=readiness(state.index);
 const outside=route!==step.route;
 const bar='<section id="league-v13-tourbar" class="v13-tourbar" aria-label="Guided LeagueOS commissioner demonstration">'+
 '<div class="v13-tour-info"><div class="v13-tour-kicker">GUIDED DEMO · '+(state.index+1)+' OF '+STEPS.length+' <span>Public-data preview</span></div>'+
 '<div class="v13-tour-label"><strong>'+esc(step.title)+'</strong><span>'+esc(outside?"You are viewing another tool. Return to this step when ready.":step.description)+'</span></div>'+
 '<div class="v13-tour-status"><span class="'+(proof?"is-ready":"")+'">'+(outside?"Step paused":proof?esc(step.proof):"Try the action below")+'</span>'+
 '<small>'+esc(step.hint)+'</small></div></div>'+
 '<div class="v13-tour-controls"><div class="v13-progress" aria-label="Demo progress">'+STEPS.map((s,i)=>'<button type="button" data-v13-jump="'+i+'" class="'+(i===state.index?"selected":state.visited.includes(i)?"visited":"")+'" aria-label="Go to step '+(i+1)+': '+esc(s.label)+'" title="'+esc(s.label)+'">'+(i+1)+'</button>').join("")+'</div>'+
 '<div class="v13-tour-buttons">'+
 (outside?'<button type="button" class="btn v13-resume" data-v13-resume>Return to step</button>':
 '<button type="button" class="btn" data-v13-prev'+(state.index===0?" disabled":"")+'>Previous</button>')+
 '<button type="button" class="btn primary" data-v13-next>'+(state.index===STEPS.length-1?"Finish tour":"Next step →")+'</button>'+
 '<button type="button" class="v13-tour-exit" data-v13-exit aria-label="Exit guided demo" title="Exit guided demo">×</button></div></div></section>';
 if(prior){prior.outerHTML=bar}else root.insertAdjacentHTML("afterbegin",bar);
}
function status(){return{active:state.active,index:state.index,step:STEPS[state.index].route,visited:state.visited.slice(),finished:state.finished,proof:readiness(state.index)}}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.id==="league-v13-tour-start"||b.dataset.v13Start!==undefined){start();return}
 if(b.dataset.v13Prev!==undefined){previous();return}
 if(b.dataset.v13Next!==undefined){next();return}
 if(b.dataset.v13Jump!==undefined){enter(Number(b.dataset.v13Jump));return}
 if(b.dataset.v13Resume!==undefined){enter(state.index);return}
 if(b.dataset.v13Exit!==undefined){exit();return}
 // When existing score/scheduling controls update the underlying drafts, refresh the tour proof non-invasively.
 if(state.active)setTimeout(update,120)
});
document.addEventListener("change",()=>{if(state.active)setTimeout(update,60)});
window.LeagueOSTourV13={start,enter,exit,next,previous,update,status,_test:{steps:STEPS,readiness}};
})();
