/* LeagueOS V14 — uniform contextual shell for working, research and concept modules.
 * The shared module metadata is the 22-entry complete feature catalog.
 * The five main destinations and independent Brave H.C. TeamOS navigation are unchanged.
 */
(function(){"use strict";
const $=s=>document.querySelector(s),safe=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const CORE=new Set(["league-home","league-features","league-schedule","league-planner","league-playoffs","league-teams"]);
const RELATED={
 "league-schedule":["league-scoring","league-planner"],
 "league-planner":["league-schedule-equity","league-inventory"],
 "league-playoffs":["league-rules","league-scoring"],
 "league-teams":["league-registration","league-eligibility-preview"],
 "league-scoring":["league-discipline-preview","league-schedule"],
 "league-registration":["league-eligibility-preview","league-payments"],
 "league-rules":["league-discipline-preview","league-decisions"],
 "league-ice":["league-officials-preview","league-inventory"],
 "league-inventory":["league-officials-preview","league-planner"],
 "league-alignment":["league-division-review","league-fairness"],
 "league-fairness":["league-division-review","league-decisions"],
 "league-decisions":["league-alignment","league-discipline-preview"],
 "league-division-review":["league-alignment","league-fairness"],
 "league-history":["league-analysis","league-teams"],
 "league-analysis":["league-history","league-alignment"],
 "league-schedule-equity":["league-planner","league-division-review"],
 "league-divisions":["league-division-review","league-alignment"],
 "league-eligibility-preview":["league-registration","league-rules"],
 "league-discipline-preview":["league-scoring","league-rules"],
 "league-officials-preview":["league-ice","league-planner"],
 "league-payments":["league-registration","league-features"],
 "league-bracket-sandbox":["league-playoffs","league-rules"]
};
function catalog(){return window.LeagueOSFeatureHubV12?._test?.catalog||[]}
function metadata(route){for(const group of catalog()){for(const item of group.items){if(item[2]===route)return{route,label:item[0],summary:item[1],status:item[3],category:group.name}}}return null}
function routeLink(route){const m=metadata(route);return m?.label||({["league-features"]:"All LeagueOS features",["league-home"]:"Overview"}[route]||route)}
function decorate(route){
 const root=$("#workspace");if(!root||!route||!route.startsWith("league-"))return;
 root.querySelector("#league-module-context-v14")?.remove();root.querySelector("#league-related-modules-v14")?.remove();
 const m=metadata(route);
 if(!CORE.has(route)){
  const category=m?.category||"League operations",name=m?.label||routeLink(route),status=m?.status||"Source-based demonstration";
  const shell='<section class="v14-module-context" id="league-module-context-v14" aria-label="Current LeagueOS module">'+
   '<nav class="v14-crumbs" aria-label="Breadcrumb"><button type="button" data-go="league-home">LeagueOS</button><span aria-hidden="true">/</span><button type="button" data-go="league-features">All features</button><span aria-hidden="true">/</span><strong>'+safe(name)+'</strong></nav>'+
   '<div class="v14-context-side"><span>'+safe(status)+'</span><details class="v14-context-about"><summary>About this module</summary><div><strong>'+safe(category)+'</strong><p>'+safe(m?.summary||"Source-based demonstration module")+'</p><small>'+(route.includes("-preview")?"This screen is a UI prototype only: no live authorizations, player data or bookings.":"The connected official records, approvals and payments are not available in this public demo.")+'</small></div></details></div></section>';
  root.insertAdjacentHTML("afterbegin",shell)
 }
 const related=(RELATED[route]||[]).filter(r=>r!==route);
 if(related.length){
  root.insertAdjacentHTML("beforeend",'<nav class="v14-related" id="league-related-modules-v14" aria-label="Related LeagueOS tools"><div><strong>Related tools</strong><small>Continue without returning to the dashboard.</small></div><div class="v14-related-actions">'+
   related.map(r=>'<button type="button" class="btn" data-go="'+safe(r)+'">'+safe(routeLink(r))+'</button>').join('')+
   '<button type="button" class="btn v14-related-library" data-go="league-features">All features</button></div></nav>')
 }
}
function status(){const items=catalog().flatMap(g=>g.items);return{registered:items.length,linked:items.filter(x=>x[2]).length,futureConceptRoutes:items.filter(x=>/^UI concept/i.test(x[3])&&x[2]).length,coreRoutes:CORE.size,officialWrites:0}}
window.LeagueOSShellV14={decorate,metadata,status,_test:{related:RELATED,core:[...CORE],catalog}};
})();
