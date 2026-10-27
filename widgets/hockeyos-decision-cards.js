/* Read-only, source-qualified decision cards for HockeyOS. No invented ratings. */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else {root.HockeyDecisionCards=api;if(typeof document!=="undefined")api.init(document);}
})(typeof window!=="undefined"?window:globalThis,function(){
 "use strict";
 const ADULT=["Fazzari Partners","The Cristillo Division","Remax Division"];
 const n=(x)=>typeof x==="number"&&Number.isFinite(x)?x:null;
 const fixed=(x,d=1)=>n(x)===null?"Not available":x.toFixed(d);
 const pct=x=>n(x)===null?"Not available":(x*100).toFixed(1)+"%";
 const rate=(v,gp)=>n(v)!==null&&n(gp)!==null&&gp>0?v/gp:null;
 function qualified(source){
  if(!source||source.status!=="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED"||
      !Array.isArray(source.teams))throw Error("Verified league evidence unavailable");
  const teams=source.teams.filter(x=>ADULT.includes(x.divisionNow));
  if(!teams.length||new Set(teams.map(t=>t.sourceTeamId)).size!==teams.length)
   throw Error("Adult team identity integrity not established");
  return teams;
 }
 function snapshot(source,name){
  const teams=qualified(source),t=teams.find(x=>x.leagueName===name);
  if(!t)throw Error("Opponent missing from verified adult league");
  const r=t.record||{};
  if(!["gp","w","l","t","gf","ga"].every(k=>n(r[k])!==null&&r[k]>=0))
    throw Error("Source record incomplete");
  const division=teams.filter(x=>x.divisionNow===t.divisionNow);
  const other=division.filter(x=>x.sourceTeamId!==t.sourceTeamId&&x.record?.gp>0);
  const peers=other.length?other:division.filter(x=>x.record?.gp>0);
  const avg=(key)=>{
   const samples=peers.map(x=>rate(x.record[key],x.record.gp)).filter(x=>n(x)!==null);
   return samples.length?samples.reduce((a,b)=>a+b,0)/samples.length:null;
  };
  const context=t.strengthContext?.status==="SOURCE_SUPPORTED_DESCRIPTIVE_CONTEXT"?
    n(t.strengthContext.contextIndex):null;
  const h=t.bravesMatchHistory?.state==="SOURCE_VERIFIED_H2H"?
    t.bravesMatchHistory.bravesAllTime:null;
  return {
   name:t.displayName||t.leagueName,leagueName:t.leagueName,division:t.divisionNow,
   gp:r.gp,record:`${r.w}–${r.l}–${r.t}`,points:n(r.pts),
   gf:r.gf,ga:r.ga,offense:rate(r.gf,r.gp),against:rate(r.ga,r.gp),
   divisionOffense:avg("gf"),divisionAgainst:avg("ga"),
   context,opponentWinPct:n(t.opponentCurrentWinPctAverage),
   h2h:h&&n(h.gp)!==null&&h.gp>0?`${h.w}–${h.l}–${h.t} in ${h.gp} verified historical games`:null,
   sourceAsOf:source.asOf,limited:r.gp<10,
   sampleTeams:peers.length,sourceTeamId:t.sourceTeamId
  };
 }
 function layoutSnapshot(button){
  if(!button)return null;
  const shape=button.getAttribute("data-shape")||"";
  const sizes=shape.split("-").map(Number);
  if(!sizes.length||sizes.some(v=>!Number.isInteger(v)||v<4||v>8))return null;
  const small=[...button.querySelectorAll("small")].map(n=>n.textContent).join(" ");
  const games=small.match(/(\d+) actual games/i);
  const moves=small.match(/(\d+) possible assignment changes/i);
  const spread=Number(button.querySelector(".number")?.textContent||NaN);
  if(!Number.isFinite(spread)||!games||!moves)return null;
  return {sizes,spread,verifiedGames:Number(games[1]),possibleMoves:Number(moves[1])};
 }
 const mk=(doc,tag,cls,value)=>{
  const e=doc.createElement(tag);if(cls)e.className=cls;
  if(value!==undefined)e.textContent=String(value);
  return e;
 };
 function fact(doc,parent,label,value,context){
  const e=mk(doc,"div","os-fact");
  e.append(mk(doc,"span","os-fact-label",label),mk(doc,"strong","os-fact-value",value));
  if(context)e.append(mk(doc,"small","os-fact-help",context));
  parent.append(e);
 }
 function init(doc){
  const $=id=>doc.getElementById(id);
  const host=doc.querySelector("main");
  if(!host||!doc.querySelector(".os-topnav"))return;
  if($("profile-title"))leaguePage(doc);
  else if($("layout-proposal-groups"))divisionPage(doc);
 }
 function leaguePage(doc){
  const $=id=>doc.getElementById(id),profile=$("profile-title")?.closest("section");
  if(!profile)return;
  const box=mk(doc,"div","os-decision-panel");
  box.id="os-opponent-snapshot";
  box.setAttribute("aria-label","Verified opponent summary");
  box.append(mk(doc,"div","os-section-eyebrow","AT A GLANCE"));
  box.append(mk(doc,"h3","","Opposition snapshot"));
  const facts=mk(doc,"div","os-fact-grid");facts.id="os-opponent-facts";box.append(facts);
  const signal=mk(doc,"p","os-source-note");signal.id="os-opponent-readout";box.append(signal);
  const tactics=mk(doc,"div","os-game-plan");
  tactics.append(mk(doc,"strong","","Brave H.C. game-plan reminders"));
  const reminders=mk(doc,"ol","");
  for(const tip of [
    "Centre pressures the puck carrier toward the outside.",
    "Wingers protect their lanes and deny the middle.",
    "Defenders protect the slot; confirm who is actually dressed before assigning matchups."
  ])reminders.append(mk(doc,"li","",tip));
  tactics.append(reminders, mk(doc,"small","os-source-note",
    "General team tactics—not a claim about this opponent's unverified tendencies."));
  box.append(tactics);
  $("profile-metrics")?.before(box);
  const comparison=doc.createElement("details");
  comparison.className="os-compare-panel";
  comparison.id="os-compare-opponents";
  comparison.append(mk(doc,"summary","","Compare two teams using verified records"));
  const compareControls=mk(doc,"div","os-compare-controls");
  const label=mk(doc,"label","","Compare selected team with");
  label.htmlFor="os-compare-team";
  const compare=mk(doc,"select","");compare.id="os-compare-team";
  compareControls.append(label,compare);
  const table=mk(doc,"div","os-compare-results");table.id="os-compare-results";
  comparison.append(compareControls,table,mk(doc,"p","os-source-note",
    "Raw current-season outcomes and descriptive context—not a head-to-head prediction."));
  box.append(comparison);

  // In All data, lead with a searchable compact index and retain the full source standings below.
  const standings=$("league-rows")?.closest("section");
  const browse=mk(doc,"div","os-team-browser");
  browse.id="os-team-browser";
  browse.append(mk(doc,"h3","","Browse all adult Sunday teams"));
  const filters=mk(doc,"div","os-team-filters");
  const search=mk(doc,"input","");search.id="os-team-search";search.type="search";
  search.placeholder="Search team name";search.setAttribute("aria-label","Search teams");
  const division=mk(doc,"select","");division.id="os-team-division";
  division.setAttribute("aria-label","Filter by division");
  division.add(new Option("All three divisions","all"));
  ADULT.forEach(x=>division.add(new Option(x,x)));
  filters.append(search,division);
  const count=mk(doc,"p","os-source-note");count.id="os-team-count";
  const cards=mk(doc,"div","os-team-card-grid");cards.id="os-team-card-grid";
  browse.append(filters,count,cards);
  standings?.querySelector(".scroll")?.before(browse);

  let source=null,teams=[];
  function selected(){return $("team-filter")?.value;}
  function refresh(){
   if(!source||!selected())return;
   let v;try{v=snapshot(source,selected());}
   catch(error){facts.replaceChildren();signal.textContent=error.message;return;}
   facts.replaceChildren();
   fact(doc,facts,"Current record",v.record,`${v.gp} completed games • ${v.points??"–"} points`);
   fact(doc,facts,"Goals per game",fixed(v.offense),`${v.gf} scored / ${v.gp} games`);
   fact(doc,facts,"Goals allowed / game",fixed(v.against),`${v.ga} conceded / ${v.gp} games`);
   fact(doc,facts,"Schedule-adjusted context",v.context===null?"Not rated":fixed(v.context,1)+"/100",
      "Descriptive index, not win probability");
   const attack=v.offense!==null&&v.divisionOffense!==null?
     (v.offense>=v.divisionOffense?"at or above":"below"):"not yet comparable with";
   const defense=v.against!==null&&v.divisionAgainst!==null?
     (v.against<=v.divisionAgainst?"at or below":"above"):"not yet comparable with";
   signal.textContent=`${v.name}: scoring is ${attack} its division's other teams' current goals-per-game average; goals allowed are ${defense} their average. `+
     (v.limited?"Early sample: fewer than 10 completed games. ":"")+
     (v.h2h?`Brave H.C. historical H2H: ${v.h2h}; past rosters may differ. `:"No verified Brave H.C. historical H2H admitted. ")+
     `Source observed ${new Date(v.sourceAsOf).toLocaleString("en-CA")}.`;
   compare.replaceChildren(...teams.filter(t=>t.leagueName!==v.leagueName)
    .map(t=>new Option(t.displayName||t.leagueName,t.leagueName)));
   compare.value=compare.dataset.choice&&compare.querySelector(`option[value="${CSS.escape(compare.dataset.choice)}"]`)?
    compare.dataset.choice:compare.options[0]?.value||"";
   compare.dataset.choice=compare.value;
   renderCompare();
  }
  function renderCompare(){
   if(!source||!selected()||!compare.value)return;
   let a,b;try{a=snapshot(source,selected());b=snapshot(source,compare.value);}
   catch(_){table.textContent="Verified comparison not available.";return;}
   table.replaceChildren();
   const head=mk(doc,"div","os-compare-row os-compare-head");
   head.append(mk(doc,"span","","Measure"),mk(doc,"strong","",a.name),mk(doc,"strong","",b.name));table.append(head);
   for(const [name,fn] of [
     ["Division",v=>v.division],["Record",v=>v.record],
     ["Played",v=>String(v.gp)],["Scored per game",v=>fixed(v.offense)],
     ["Allowed per game",v=>fixed(v.against)],["Context index",v=>v.context===null?"N/A":fixed(v.context)+"/100"]
   ]){
    const row=mk(doc,"div","os-compare-row");
    row.append(mk(doc,"span","",name),mk(doc,"span","",fn(a)),mk(doc,"span","",fn(b)));
    table.append(row);
   }
  }
  function browseTeams(){
   const val=search.value.trim().toLocaleLowerCase();
   const matches=teams.filter(t=>(division.value==="all"||t.divisionNow===division.value)&&
     [t.displayName,t.leagueName].some(name=>String(name||"").toLocaleLowerCase().includes(val)));
   cards.replaceChildren();count.textContent=`${matches.length} of ${teams.length} verified adult Sunday teams`;
   for(const t of matches){
    const b=mk(doc,"button","os-team-card");
    b.type="button";b.dataset.team=t.leagueName;
    const rec=t.record||{};
    b.append(mk(doc,"strong","",t.displayName||t.leagueName),
      mk(doc,"small","",t.divisionNow),
      mk(doc,"span","",`${rec.w}–${rec.l}–${rec.t} · ${rec.pts} points · ${rec.gf} GF / ${rec.ga} GA`));
    b.addEventListener("click",()=>{
      const original=$("team-filter");
      original.value=t.leagueName;
      original.dispatchEvent(new Event("change",{bubbles:true}));
      profile.scrollIntoView({behavior:"smooth",block:"start"});
    });
    cards.append(b);
   }
  }
  $("team-filter")?.addEventListener("change",refresh);
  // Original selection can be updated by a separate async renderer: follow the actual profile readback.
  new MutationObserver(refresh).observe($("profile-title"),{childList:true,subtree:true,characterData:true});
  compare.addEventListener("change",()=>{compare.dataset.choice=compare.value;renderCompare()});
  search.addEventListener("input",browseTeams);
  division.addEventListener("change",browseTeams);
  fetch("./league-intelligence.json",{cache:"no-store"})
   .then(r=>{if(!r.ok)throw Error("Current verified source unavailable");return r.json()})
   .then(data=>{
     teams=qualified(data);source=data;browseTeams();refresh();
   }).catch(error=>{
     signal.textContent="Quick snapshot unavailable: "+error.message+". Original verified scouting remains accessible.";
     count.textContent="Compact index unavailable; use the original full standings table.";
   });
 }
 function divisionPage(doc){
  const $=id=>doc.getElementById(id);
  const layout=$("layout-proposed-recommendation")?.closest("section");
  if(!layout)return;
  const box=mk(doc,"div","os-decision-panel os-division-summary");
  box.id="os-layout-summary";
  box.append(mk(doc,"div","os-section-eyebrow","COMPARE OPTIONS"));
  box.append(mk(doc,"h3","","What the selected layout means"));
  const facts=mk(doc,"div","os-fact-grid");
  box.append(facts);
  const caveat=mk(doc,"p","os-source-note",
    "A smaller rating spread is not proof of closer future games. Actual historical match coverage is limited.");
  box.append(caveat);
  const action=mk(doc,"button","os-show-teams","See the proposed teams");
  action.type="button";
  action.addEventListener("click",()=>{
   const d=$("os-team-details");if(d){d.open=true;d.scrollIntoView({behavior:"smooth",block:"start"});}
  });
  box.append(action);
  $("layout-design-options")?.before(box);
  function refresh(){
   const btn=$("layout-design-options")?.querySelector("button[aria-pressed=true]");
   const model=layoutSnapshot(btn);
   if(!model)return;
   facts.replaceChildren();
   fact(doc,facts,"Teams per division",model.sizes.join(" + "),"Experimental capacity only");
   fact(doc,facts,"Rating spread",fixed(model.spread,2),"Lower means similar current index values");
   fact(doc,facts,"Observed game links",String(model.verifiedGames),"Real past results, not simulated fixtures");
   fact(doc,facts,"Possible moves",String(model.possibleMoves),"Research-band changes, not approved reassignments");
  }
  const options=$("layout-design-options");
  if(options)new MutationObserver(refresh).observe(options,{childList:true});
  refresh();
 }
 return Object.freeze({qualified,snapshot,layoutSnapshot,init});
});