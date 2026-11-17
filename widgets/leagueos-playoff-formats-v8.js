/* BruTTech LeagueOS V8 — real-format-informed playoff lab; historical templates NOT currently approved. */
(function(){"use strict";
const STORE="bruttech-leagueos-v8-series-draft",TEAMS="./leagueos_schedule_equity_public_v6.json";
const SOURCES={
 sunday:"https://www.sportsvillage.ca/wp-content/uploads/2026/02/Sunday-Winter-Playoff-Format.pdf",
 thursday:"https://www.sportsvillage.ca/wp-content/uploads/2026/03/Thursday-Winter-Playoff-Format.pdf",
 rules:"https://www.sportsvillage.ca/wp-content/uploads/2024/09/Rule-Book.pdf"
};
const $=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const MODES={
 four:{n:4,label:"4-team: two-game semifinals → best-of-three final",ref:"Historical Sunday/Thursday Winter 2026 4-team divisions"},
 six:{n:6,label:"6-team: wildcard → semifinals / consolation → finals",ref:"Historical Sunday Fazzari / Thursday A & G Winter 2026"},
 three:{n:3,label:"3-team: round robin → two-game championship",ref:"Historical Thursday Masters B Winter 2026"}
};
let st={mode:"four",night:"Sunday",division:"VAHL Division",seedOrders:{},results:{},decisions:{},note:""},teams=null,pending=null,error="",seedOpen=false;
try{const x=JSON.parse(localStorage.getItem(STORE)||"null");if(x&&typeof x==="object")st={...st,...x,seedOrders:x.seedOrders||{},results:x.results||{},decisions:x.decisions||{}}}catch(_){}
const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(st))}catch(_){}};
const key=()=>st.mode+"|"+st.night+"|"+st.division;
const divisions=n=>[...new Set((teams?.teams||[]).filter(t=>t.night===n).map(t=>t.division))].sort((a,b)=>a.localeCompare(b));
const group=()=>((teams?.teams||[]).filter(t=>t.night===st.night&&t.division===st.division)).map(t=>t.team_name).sort((a,b)=>a.localeCompare(b));
const selections=()=>{const available=group(),v=st.seedOrders[key()];return Array.isArray(v)&&v.length===available.length&&new Set(v).size===v.length&&v.every(x=>available.includes(x))?v:available};
const seeds=()=>selections().slice(0,MODES[st.mode].n);
const results=()=>st.results[key()]||(st.results[key()]={});
const decisions=()=>st.decisions[key()]||(st.decisions[key()]={});
const panel=(title,sub,body)=>'<section class="panel lc-panel"><div class="panelhead"><div><h2>'+title+'</h2>'+(sub?'<p>'+sub+'</p>':'')+'</div></div>'+body+'</section>';
const getGame=(id,home,away,g)=>{const x=results()[id+"-"+g];return x&&x.home===home&&x.away===away&&Number.isInteger(x.hg)&&Number.isInteger(x.ag)?x:null};
function settleGame(home,away,g){if(!home||!away||!g)return null; if(g.hg!==g.ag)return{winner:g.hg>g.ag?home:away,method:"REG"};if(g.tieMethod&&["OT_HOME","OT_AWAY","SO_HOME","SO_AWAY"].includes(g.tieMethod))return{winner:g.tieMethod.endsWith("HOME")?home:away,method:g.tieMethod};return null}
function series(id,home,away,kind){const n=kind==="best3"?3:2,items=[];for(let i=0;i<n;i++)items.push(getGame(id,home,away,i+1));
const played=items.filter(Boolean);let complete=false,winner=null,loser=null,pointHome=0,pointAway=0,winHome=0,winAway=0,goalsHome=0,goalsAway=0,hold="";
for(let i=0;i<items.length;i++){const g=items[i];if(!g)continue;
if(kind==="best3"&&i===2&&(winHome>=2||winAway>=2)){hold="Game 3 is unnecessary because the series was clinched";continue}
goalsHome+=g.hg;goalsAway+=g.ag;
if(kind==="points2"){if(g.hg===g.ag){pointHome++;pointAway++}else if(g.hg>g.ag){pointHome+=2;winHome++}else{pointAway+=2;winAway++}}
else{const v=settleGame(home,away,g);if(!v){hold="Each best-of-three game requires an OT/SO decision when tied";break}if(v.winner===home)winHome++;else winAway++}
}
if(kind==="best3"){if(winHome>=2||winAway>=2){winner=winHome>winAway?home:away;complete=true}}
else if(items[0]&&items[1]){if(pointHome!==pointAway){winner=pointHome>pointAway?home:away;complete=true}else{const d=decisions()[id];if(d&&d.home===home&&d.away===away&&["OT_HOME","OT_AWAY","SO_HOME","SO_AWAY"].includes(d.method)){winner=d.method.endsWith("HOME")?home:away;complete=true}else hold="Series points tied after both games; explicit 5-minute OT/shootout winner required"}}
if(winner)loser=winner===home?away:home;
return{id,home,away,kind,items,played:played.length,complete,winner,loser,pointHome,pointAway,winHome,winAway,goalsHome,goalsAway,hold}
}
function classifyFour(a){const s1=series("four-sf1",a[0],a[3],"points2"),s2=series("four-sf2",a[1],a[2],"points2"),final=series("four-final",s1.winner,s2.winner,"best3");
return{stages:[{name:"Semifinals · two-game total point",series:[s1,s2]},{name:"Championship · best two of three",series:[final]}],winner:final.winner}}
function pickCandidate(id,choices,label){const valid=choices.filter(x=>x&&x.name);if(!valid.length)return{picked:null,needsChoice:false,choice:null,candidates:[]};
const max=Math.max(...valid.map(x=>x.metric));
const tied=valid.filter(x=>x.metric===max);
if(tied.length===1)return{picked:tied[0].name,needsChoice:false,candidates:tied};
const d=decisions()[id],selected=d&&tied.find(x=>x.name===d.choice);
return{picked:selected?.name||null,needsChoice:true,candidates:tied,label}
}
function classifySix(a){
const r1=[series("six-w1",a[0],a[5],"points2"),series("six-w2",a[1],a[4],"points2"),series("six-w3",a[2],a[3],"points2")];
const loserOptions=r1.filter(s=>s.complete).map(s=>({name:s.loser,metric:s.loser===s.home?s.pointHome:s.pointAway}));
const wildcard=r1.every(s=>s.complete)?pickCandidate("six-wildcard",loserOptions,"Most series points among Round One losing teams"):null;
const otherLosers=wildcard?.picked?loserOptions.map(x=>x.name).filter(n=>n!==wildcard.picked):[];
const r2=[series("six-sf1",r1[0].winner,wildcard?.picked||null,"points2"),
series("six-sf2",r1[1].winner,r1[2].winner,"points2"),
series("six-cons-semi",otherLosers.length===2?otherLosers[0]:null,otherLosers.length===2?otherLosers[1]:null,"points2")];
const final=series("six-final",r2[0].winner,r2[1].winner,"best3");
const secondLosers=r2.slice(0,2).filter(s=>s.complete).map(s=>({name:s.loser,metric:s.loser===s.home?s.pointHome:s.pointAway}));
const consolationPick=r2.slice(0,2).every(s=>s.complete)?pickCandidate("six-consolation",secondLosers,"Most series points among Round Two championship losers"):null;
const consolation=series("six-consol-final",r2[2].winner,consolationPick?.picked||null,"points2");
return{stages:[{name:"Round One · wildcard two-game series",series:r1},{name:"Round Two · semifinal & consolation two-game series",series:r2},{name:"Finals · championship / consolation",series:[final,consolation]}],
 choices:[{id:"six-wildcard",value:wildcard},{id:"six-consolation",value:consolationPick}].filter(x=>x.value?.needsChoice),winner:final.winner,consolationWinner:consolation.winner}
}
function rrSnapshot(a){const pairs=[[0,1],[0,2],[1,2]],games=pairs.map(([i,j],idx)=>({id:"rr-"+idx,home:a[i],away:a[j],game:getGame("rr",a[i],a[j],idx+1)}));
const stats=a.map(name=>({name,played:0,w:0,l:0,t:0,pts:0,gf:0,ga:0,diff:0,h2h:0}));
for(const g of games){if(!g.game)continue;const x=stats.find(v=>v.name===g.home),y=stats.find(v=>v.name===g.away),h=g.game.hg,v=g.game.ag;
x.played++;y.played++;x.gf+=h;x.ga+=v;y.gf+=v;y.ga+=h;
if(h>v){x.w++;x.pts+=2;y.l++}else if(h<v){y.w++;y.pts+=2;x.l++}else{x.t++;y.t++;x.pts++;y.pts++}}
stats.forEach(s=>{s.diff=s.gf-s.ga});
let ordered=stats.slice().sort((a,b)=>b.pts-a.pts||b.w-a.w||b.gf-a.gf||a.ga-b.ga||b.diff-a.diff||a.name.localeCompare(b.name));
let hold=null;
if(games.some(x=>!x.game))hold="Round robin results are incomplete.";
else{
const ties=ordered.filter((x,i)=>{const neighbor=[ordered[i-1],ordered[i+1]].filter(Boolean);return neighbor.some(y=>x.pts===y.pts&&x.w===y.w)});
for(const t of ties){const groupT=ordered.filter(y=>y.pts===t.pts&&y.w===t.w);
t.h2h=games.reduce((acc,m)=>{if(!m.game||![m.home,m.away].includes(t.name)||![m.home,m.away].every(n=>groupT.some(x=>x.name===n)))return acc;
const self=m.home===t.name,own=self?m.game.hg:m.game.ag,opp=self?m.game.ag:m.game.hg;return acc+(own>opp?2:own===opp?1:0)},0)}
ordered=stats.slice().sort((a,b)=>b.pts-a.pts||b.w-a.w||b.h2h-a.h2h||b.gf-a.gf||a.ga-b.ga||b.diff-a.diff||a.name.localeCompare(b.name));
if(ordered.length>1){const x=ordered[0],y=ordered[1];if(x.pts===y.pts&&x.w===y.w&&x.h2h===y.h2h&&x.gf===y.gf&&x.ga===y.ga&&x.diff===y.diff)hold="Tie-break unresolved: penalty minutes and official adjudication are required."}
if(ordered.length>2){const y=ordered[1],z=ordered[2];if(y.pts===z.pts&&y.w===z.w&&y.h2h===z.h2h&&y.gf===z.gf&&y.ga===z.ga&&y.diff===z.diff)hold="Tie-break unresolved at qualifying cut: penalty minutes and official adjudication are required."}
}
return{games,stats:ordered,hold,qualifiers:hold?[]:ordered.slice(0,2).map(x=>x.name)}
}
function classifyThree(a){const rr=rrSnapshot(a),final=series("rr-final",rr.qualifiers[0],rr.qualifiers[1],"points2");
return{roundRobin:rr,stages:[{name:"Final · two-game total point",series:[final]}],winner:final.winner}}
function calculate(){if(!teams||group().length<MODES[st.mode].n)return null;
const a=seeds();
if(st.mode==="four")return classifyFour(a);
if(st.mode==="six")return classifySix(a);
return classifyThree(a)
}
const methodOpts=(select="",includeNone=true)=>'<option value="">'+(includeNone?"No tiebreak recorded":"Choose overtime/shootout")+'</option>'+["OT_HOME","OT_AWAY","SO_HOME","SO_AWAY"].map(v=>'<option value="'+v+'"'+(select===v?" selected":"")+'>'+(v.startsWith("OT")?"Overtime · ":"Shootout · ")+(v.endsWith("HOME")?"first team":"second team")+'</option>').join("");
function card(s){const valid=Boolean(s.home&&s.away),kind=s.kind==="points2"?"Two-game total point":"Best of three";
let b='<article class="lc-series" data-lcpf-id="'+esc(s.id)+'"><div class="lc-series-top"><strong>'+esc(s.id.replaceAll("-"," ").toUpperCase())+'</strong><span>'+kind+'</span></div>'+
'<div class="lc-series-teams"><b>'+esc(s.home||"Awaiting qualifier")+'</b><span>vs</span><b>'+esc(s.away||"Awaiting qualifier")+'</b></div>';
if(!valid)return b+'<p class="lc-caption">Both clubs must qualify first. No score can be entered yet.</p></article>';
const count=s.kind==="best3"?(s.items[2]?3:((s.winHome>=2||s.winAway>=2)?2:3)):2;
for(let i=0;i<count;i++){const g=s.items[i]||{};b+='<div class="lc-series-game"><span>Game '+(i+1)+'</span><input type="number" min="0" max="99" data-lcpf-home="'+(i+1)+'" aria-label="'+esc(s.home)+' game '+(i+1)+' goals" value="'+(g.hg??"")+'" placeholder="0">'+
'<span>–</span><input type="number" min="0" max="99" data-lcpf-away="'+(i+1)+'" aria-label="'+esc(s.away)+' game '+(i+1)+' goals" value="'+(g.ag??"")+'" placeholder="0">'+
(s.kind==="best3"?'<select data-lcpf-tie="'+(i+1)+'" aria-label="Overtime/shootout winner for game '+(i+1)+'">'+methodOpts(g.tieMethod||"")+'</select>':'')+
'<button class="btn small" data-lcpf-save="'+esc(s.id)+'" data-g="'+(i+1)+'" type="button">Save</button></div>'}
b+='<div class="lc-series-result"><span>'+(s.kind==="points2"?"Series points: "+s.pointHome+"–"+s.pointAway+" (win 2 / tie 1)":"Series wins: "+s.winHome+"–"+s.winAway)+'</span><strong>'+(s.winner?'Advances: '+esc(s.winner):s.hold||"Pending completed results")+'</strong></div>';
if(s.kind==="points2"&&s.items[0]&&s.items[1]&&s.pointHome===s.pointAway){const m=decisions()[s.id]?.method||"";b+='<label class="field lc-tie-break">After two-game series tie, choose 5-minute OT/shootout result<select data-lcpf-series-tie="'+esc(s.id)+'">'+methodOpts(m)+'</select></label><button class="btn small primary" data-lcpf-resolve="'+esc(s.id)+'" type="button">Record draft series decision</button>'}
if(s.kind==="best3"&&s.winner)b+='<p class="lc-caption">A third game is played only if the series is tied 1–1 after two games.</p>';
return b+'<p class="lc-inline-error" role="alert"></p></article>'
}
function roundRobinUI(rr){return panel("Round robin · all three matchups","Every club plays the others once. Qualifiers depend on complete results and approved playoff tiebreaks.",
'<div class="lc-tablewrap"><table class="lc-table"><thead><tr><th>Rank (provisional)</th><th>GP</th><th>W</th><th>T</th><th>L</th><th>PTS</th><th>GF</th><th>GA</th></tr></thead><tbody>'+rr.stats.map((x,i)=>'<tr><td><b>'+(i+1)+'. '+esc(x.name)+'</b></td><td>'+x.played+'</td><td>'+x.w+'</td><td>'+x.t+'</td><td>'+x.l+'</td><td>'+x.pts+'</td><td>'+x.gf+'</td><td>'+x.ga+'</td></tr>').join("")+'</tbody></table></div>'+
'<div class="lc-rr-matches">'+rr.games.map(g=>'<div class="lc-rr-match" data-lcpf-rr="'+g.id+'"><strong>'+esc(g.home)+' vs '+esc(g.away)+'</strong><input aria-label="First team goals" type="number" min="0" max="99" data-lcpf-rr-home value="'+(g.game?.hg??"")+'"><span>–</span><input aria-label="Second team goals" type="number" min="0" max="99" data-lcpf-rr-away value="'+(g.game?.ag??"")+'"><button type="button" class="btn small" data-lcpf-rr-save="'+g.id+'">Save draft</button><small class="lc-inline-error" role="alert"></small></div>').join("")+'</div>'+
'<p class="lc-caption">'+esc(rr.hold||"Top two qualifiers are derived from this completed round-robin draft. Official eligibility and standings verification remain separate.")+'</p>')
}
function choiceUI(c){return panel("Wildcard tiebreaker · explicit review required",esc(c.value.label||"The published template does not specify the tie decision among equally ranked losing clubs."),
'<p class="lc-caption">Do not silently select a wildcard or consolation participant when the available series points are tied. Commissioner decision needed before advancing.</p>'+
'<div class="formgrid"><label class="field">Eligible clubs<select data-lcpf-choice="'+esc(c.id)+'"><option value="">Choose club</option>'+c.value.candidates.map(v=>'<option value="'+esc(v.name)+'">'+esc(v.name)+' · '+v.metric+' points</option>').join("")+'</select></label>'+
'<button class="btn primary" data-lcpf-choice-save="'+esc(c.id)+'" type="button">Save provisional tiebreak choice</button></div>')
}
/* V11: screen-sized source-aware playoff ladder. Draft scores remain in the existing source-qualified series engine. */
function ladderUI(calc){
 if(!calc)return "";
 const cols=[];
 if(calc.roundRobin){
  const rr=calc.roundRobin;
  cols.push('<div class="v11-ladder-round"><div class="v11-round-heading"><strong>Round robin</strong><span>Group stage</span></div>'+
  '<div class="v11-rr-standings">'+rr.stats.map((r,i)=>'<div class="v11-rr-team"><span class="v11-rr-rank">'+(i+1)+'</span><b>'+esc(r.name)+'</b><span>'+r.pts+' pts</span></div>').join('')+'</div>'+
  '<p class="v11-round-foot">'+esc(rr.hold||"Top two teams advance in this draft")+'</p></div>');
 }
 for(let i=0;i<calc.stages.length;i++){
  const stage=calc.stages[i];
  const short=stage.name.replace(/ · .+$/,"");
  const games=stage.series.map(m=>{
   const ready=Boolean(m.home&&m.away);
   const state=m.complete?"Completed":ready?"Awaiting scores":"Awaiting teams";
   const seriesLabel=m.kind==="best3"?"Best of 3":"Two-game points";
   const home=m.home||"Winner / qualifier TBD",away=m.away||"Winner / qualifier TBD";
   const score=m.kind==="best3"?m.winHome+"–"+m.winAway+" wins":m.pointHome+"–"+m.pointAway+" points";
   return '<button type="button" class="v11-ladder-game'+(m.complete?" is-complete":"")+'" data-ladder-game="'+esc(m.id)+'"'+(!ready?' disabled':'')+' aria-label="'+esc((ready?"Review series scores: ":"Awaiting qualifiers: ")+home+" versus "+away)+'">'+
    '<span class="v11-game-kicker">'+esc(m.id.replaceAll("-"," ").toUpperCase())+' <small>'+seriesLabel+'</small></span>'+
    '<span class="v11-ladder-club'+(m.winner===m.home?" is-winner":"")+'"><span>'+esc(home)+'</span><b>'+(!ready?"—":(m.kind==="best3"?m.winHome:m.pointHome))+'</b></span>'+
    '<span class="v11-ladder-club'+(m.winner===m.away?" is-winner":"")+'"><span>'+esc(away)+'</span><b>'+(!ready?"—":(m.kind==="best3"?m.winAway:m.pointAway))+'</b></span>'+
    '<span class="v11-ladder-state"><span>'+esc(m.winner?"Advances: "+m.winner:state)+'</span><small>'+(ready?esc(score):"")+'</small></span></button>'
  }).join('');
  cols.push('<div class="v11-ladder-round"><div class="v11-round-heading"><strong>'+esc(short)+'</strong><span>'+stage.series.length+' series</span></div>'+games+'</div>');
 }
 if(calc.winner)cols.push('<div class="v11-ladder-round v11-champion-column"><div class="v11-round-heading"><strong>Champion</strong><span>Draft outcome</span></div><div class="v11-champion-name">🏆 <b>'+esc(calc.winner)+'</b></div>'+(calc.consolationWinner?'<div class="v11-consolation-name">Consolation: '+esc(calc.consolationWinner)+'</div>':'')+'</div>');
 const hold=(calc.choices||[]).filter(c=>c.value?.needsChoice&&!c.value?.picked);
 return '<section class="v11-playoff-ladder" id="lcpf-ladder" aria-label="Interactive playoff ladder"><div class="v11-ladder-header"><div><h3>Playoff ladder</h3><p>Follow each round from left to right. Select a ready matchup to jump to its score entry below.</p></div><span class="v11-ladder-legend">Draft · not official</span></div>'+
  '<div class="v11-ladder-viewport" role="region" aria-label="Playoff rounds — scroll horizontally for later rounds" tabindex="0"><div class="v11-ladder-columns">'+cols.join('')+'</div></div>'+
  (hold.length?'<p class="v11-ladder-hold" role="status">Qualification decision needed before some teams can advance. Review the wildcard selection below.</p>':'')+
  '<p class="v11-ladder-caption">Two-game series display series points (win 2, tie 1). Best-of-three rounds display game wins. A tied series needs an explicit overtime/shootout decision. Seeds and results remain browser-local drafts.</p></section>'
}

function render(){
 const root=$("#league-series-mount");if(!root)return;
 if(!teams){root.innerHTML=panel("Loading playoff teams","Public team records; no official playoff seeding","<p>"+esc(error||"Reading team records…")+"</p>");if(!pending)load();return}
 const d=divisions(st.night);if(!d.includes(st.division))st.division=d[0]||"";
 const req=MODES[st.mode].n,all=selections(),used=all.slice(0,req),calc=calculate(),omitted=all.slice(req);
 let h='<div class="v10-pf"><div class="v10-pf-note"><strong>Illustrative playoff competition</strong><span>Format examples follow published historical SVHL documents. Seedings, scores and advancing teams are drafts; nothing changes in the league.</span></div>'+
 '<section class="panel v10-pf-setup"><div class="v10-step-title"><span>1</span><div><h2>Choose the playoff format</h2><p>Select the league night and division, then choose how the games are played.</p></div></div>'+
 '<div class="lc-controls"><label class="field">Playoff format<select id="lcpf-mode">'+Object.entries(MODES).map(([k,v])=>'<option value="'+k+'"'+(k===st.mode?" selected":"")+'>'+esc(v.label)+'</option>').join("")+'</select></label>'+
 '<label class="field">League night<select id="lcpf-night">'+["Sunday","Tuesday","Wednesday","Thursday"].map(x=>'<option'+(x===st.night?" selected":"")+'>'+x+'</option>').join("")+'</select></label>'+
 '<label class="field">Division<select id="lcpf-division">'+d.map(x=>'<option'+(x===st.division?" selected":"")+'>'+esc(x)+'</option>').join("")+'</select></label></div>'+
 '<div class="v10-pf-summary"><strong>'+req+'-team format</strong><span>'+all.length+' public team records in selected division</span><span>Historical example · not this season’s approved bracket</span></div>'+
 (all.length<req?'<p class="lc-error">This division has fewer than '+req+' public teams. Choose another division or format.</p>':'')+
 (omitted.length?'<p class="v10-pf-muted">This format uses the first '+req+' draft seeds. Other published teams are not officially eliminated.</p>':'')+
 '</section>';
 h+='<section class="panel v10-pf-seeds"><details id="lcpf-seeds"'+(seedOpen?" open":"")+'><summary><span class="v10-step-icon">2</span><span class="v10-seed-text"><strong>Check the teams and draft seed order</strong><small>'+used.map(esc).join(' · ')+'</small></span><span class="v10-seed-toggle">Edit seeds ⌄</span></summary>'+
 '<p class="v10-pf-muted">These are demonstration seed positions, not verified official playoff rankings. Use the arrows to reorder before entering results.</p>'+
 '<div class="lc-seeds">'+all.map((n,i)=>'<div><b>'+(i<req?"#"+(i+1):"Outside")+'</b><span>'+esc(n)+'</span><button class="btn small" type="button" data-lcpf-up="'+i+'"'+(!i?" disabled":"")+' aria-label="Move '+esc(n)+' up">↑</button><button class="btn small" type="button" data-lcpf-down="'+i+'"'+(i===all.length-1?" disabled":"")+' aria-label="Move '+esc(n)+' down">↓</button></div>').join("")+'</div></details></section>';
 if(!calc){root.innerHTML=h+'</div>';return}
 h+='<div class="v10-pf-play-head"><div class="v10-step-title"><span>3</span><div><h2>Follow the ladder and enter results</h2><p>The ladder updates whenever you save a result. Unresolved ties stay on hold.</p></div></div><span class="v10-not-booked">Draft results only</span></div>';h+=ladderUI(calc);
 if(calc.roundRobin)h+=roundRobinUI(calc.roundRobin);
 for(let i=0;i<calc.stages.length;i++){
  const stage=calc.stages[i];
  h+=panel(stage.name,i===0?"Enter first-round results to populate the next round.":"Participants appear automatically after qualifying series are resolved.",
  '<div class="lc-series-grid">'+stage.series.map(card).join("")+'</div>')
 }
 if(calc.choices)for(const c of calc.choices)h+=choiceUI(c);
 h+='<section class="v10-pf-finish"><div><span class="v10-kicker">PLAYOFF PREVIEW</span><h2>'+(calc.winner?"Champion: "+esc(calc.winner):"Champion not yet decided")+'</h2><p>Only completed draft game results can advance clubs. League eligibility and official scoring remain separate.</p></div>'+
 '<div class="v10-pf-actions"><button id="lcpf-export" class="btn primary" type="button">Export playoff draft</button><button class="btn" id="lcpf-clear" type="button">Clear draft scores</button></div></section>'+
 '<details class="v10-method-note"><summary>About historical rules and other bracket options <span aria-hidden="true">⌄</span></summary><div>'+
 '<p>'+esc(MODES[st.mode].ref)+'. The real division may use different rules. Review the <a target="_blank" rel="noopener noreferrer" href="'+(st.mode==="three"?SOURCES.thursday:SOURCES.sunday)+'">historical format PDF</a> and <a target="_blank" rel="noopener noreferrer" href="'+SOURCES.rules+'">SVHL rulebook</a>.</p>'+
 '<p>Ties in individual best-of-three games require an overtime/shootout winner. Two-game series are decided by series points; when tied, the additional result must be entered explicitly.</p>'+
 '<button type="button" class="btn" data-go="league-bracket-sandbox">Open the basic knockout sandbox</button></div></details></div>';
 root.innerHTML=h
}
function load(){if(pending)return pending;pending=fetch(TEAMS,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Source HTTP "+r.status);return r.json()}).then(j=>{if(j.coverage?.league_team_seasons!==96)throw Error("Unexpected published team snapshot");teams=j;render()}).catch(e=>{error=String(e);render()});return pending}
function currentSeries(id){const c=calculate();return c?.stages.flatMap(x=>x.series).find(x=>x.id===id)||null}
function errorOn(el,msg){const par=el.closest(".lc-series,.lc-rr-match,.panel")||el.parentElement;const n=par?.querySelector(".lc-inline-error");if(n)n.textContent=msg;else st.note=msg}
function numberScore(s){return s!==""&&/^\d{1,2}$/.test(s)?Number(s):null}
document.addEventListener("toggle",e=>{if(e.target?.id==="lcpf-seeds")seedOpen=e.target.open},true);
document.addEventListener("change",e=>{const x=e.target;if(!$("#league-series-mount"))return;
if(x.id==="lcpf-mode"){st.mode=x.value;st.note="";persist();render()}
if(x.id==="lcpf-night"){st.night=x.value;st.division=divisions(st.night)[0]||"";persist();render()}
if(x.id==="lcpf-division"){st.division=x.value;persist();render()}
});
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||!$("#league-series-mount"))return;
if(b.dataset.ladderGame){const id=b.dataset.ladderGame;const card=[...document.querySelectorAll(".lc-series")].find(x=>x.dataset.lcpfId===id);if(card){card.scrollIntoView({behavior:"auto",block:"center"});card.classList.add("v11-jump-highlight");setTimeout(()=>card.classList.remove("v11-jump-highlight"),1600)}return}

if(b.dataset.lcpfUp!==undefined||b.dataset.lcpfDown!==undefined){const list=selections().slice(),i=Number(b.dataset.lcpfUp??b.dataset.lcpfDown),j=b.dataset.lcpfUp!==undefined?i-1:i+1;if(j>=0&&j<list.length){[list[i],list[j]]=[list[j],list[i]];st.seedOrders[key()]=list;st.results[key()]={};st.decisions[key()]={};persist();render()}return}
if(b.dataset.lcpfSave!==undefined){const s=currentSeries(b.dataset.lcpfSave),g=Number(b.dataset.g),box=b.closest(".lc-series");if(!s||!s.home||!s.away)return;
const home=numberScore(box.querySelector('[data-lcpf-home="'+g+'"]').value),away=numberScore(box.querySelector('[data-lcpf-away="'+g+'"]').value);if(home===null||away===null){errorOn(b,"Enter a valid score (0–99) for both clubs.");return}
const tieMethod=box.querySelector('[data-lcpf-tie="'+g+'"]')?.value||"";
if(s.kind==="best3"&&home===away&&!tieMethod){errorOn(b,"Tied best-of-three game needs an OT/SO winner.");return}
if(s.kind==="best3"&&g===3&&(s.winHome>=2||s.winAway>=2)){errorOn(b,"Series already clinched; Game 3 cannot be entered.");return}
results()[s.id+"-"+g]={home:s.home,away:s.away,hg:home,ag:away,tieMethod,official:false,created:new Date().toISOString()};persist();render();return}
if(b.dataset.lcpfResolve!==undefined){const s=currentSeries(b.dataset.lcpfResolve),box=b.closest(".lc-series"),method=box?.querySelector('[data-lcpf-series-tie]')?.value;if(!s||s.items.some(x=>!x)||s.pointHome!==s.pointAway||!method){errorOn(b,"Only a tied, completed series may receive a recorded OT/shootout decision.");return}decisions()[s.id]={home:s.home,away:s.away,method,source:"BROWSER_DRAFT_ONLY"};persist();render();return}
if(b.dataset.lcpfRrSave!==undefined){const rr=calculate()?.roundRobin,g=rr?.games.find(x=>x.id===b.dataset.lcpfRrSave);if(!g)return;const box=b.closest(".lc-rr-match"),home=numberScore(box.querySelector("[data-lcpf-rr-home]").value),away=numberScore(box.querySelector("[data-lcpf-rr-away]").value);if(home===null||away===null){errorOn(b,"Enter both goal totals.");return}const nr=Number(g.id.split("-")[1])+1;results()["rr-"+nr]={home:g.home,away:g.away,hg:home,ag:away,official:false};persist();render();return}
if(b.dataset.lcpfChoiceSave!==undefined){const id=b.dataset.lcpfChoiceSave,choice=$("#league-series-mount [data-lcpf-choice='"+id+"']")?.value;const possible=calculate()?.choices?.find(x=>x.id===id)?.value.candidates||[];if(!possible.some(x=>x.name===choice))return;decisions()[id]={choice,source:"COMMISSIONER_DEMO_SELECTION_NOT_OFFICIAL"};persist();render();return}
if(b.id==="lcpf-clear"){st.results[key()]={};st.decisions[key()]={};persist();render();return}
if(b.id==="lcpf-export"){const d=calculate();const payload={schema:"bruttech-leagueos-playoff-formats-v8",not_official:true,season:"historical-format-example-2026-only",division:st.division,night:st.night,format:st.mode,source_rule_document:st.mode==="three"?SOURCES.thursday:SOURCES.sunday,source_snapshot:"2026-11-16",draft_seeds:seeds(),results:results(),decisions:decisions(),computed:d};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="leagueos-playoff-format-draft-v8.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1400)}
});
window.LeagueOSFormatsV8={mount(){render();if(!teams&&!pending)load()},status(){return{loaded:!!teams,mode:st.mode,division:st.division,teams:teams?.teams.length||0,officialWrites:0}},_test:{classifyFour,classifySix,rrSnapshot,classifyThree,series,calculate,select:(mode,night,division)=>{st.mode=mode;st.night=night;st.division=division;persist();render()},getState:()=>st,getSeeds:seeds,source:()=>teams}};
})();