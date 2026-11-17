/* LeagueOS V8 — dated ice inventory intake for safe, LOCAL, non-official demonstration. */
(function(){"use strict";
const STORE="bruttech-leagueos-v8-ice-review-only",REG="./leagueos-source-qualified-current-fixtures-v4.json";
const $=s=>document.querySelector(s),escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nights={Sunday:0,Tuesday:2,Wednesday:3,Thursday:4},headers=["date","night","rink","start","end","authority","source_ref"];
let state={rows:[],errors:[],loadedAt:null,snapshot:"2026-11-16",mode:"empty",note:""},registry=null,loading=null,report=null,raw="";
try{const x=JSON.parse(localStorage.getItem(STORE)||"null");if(x&&Array.isArray(x.rows))state={...state,...x,rows:x.rows.slice(0,900),errors:[]}}catch(_){}
function save(){try{localStorage.setItem(STORE,JSON.stringify({...state,errors:[]}))}catch(e){state.note="Browser storage unavailable; export a redacted copy."}}
function clock(s){const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s||""));return m?Number(m[1])*60+Number(m[2]):null}
function isoDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+"T12:00:00Z");return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s}
function parseCsv(s){const out=[],rows=[];let cell="",row=[],quotes=false;
s=String(s||"").replace(/^\uFEFF/,"");
for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quotes&&s[i+1]==='"'){cell+='"';i++}else if(!quotes&&cell!==""){throw Error("Unexpected quote near character "+i)}else quotes=!quotes}
else if(c===","&&!quotes){row.push(cell);cell=""}
else if((c==="\n"||c==="\r")&&!quotes){if(c==="\r"&&s[i+1]==="\n")i++;row.push(cell);cell="";if(row.some(x=>x.trim()!==""))rows.push(row);row=[]}
else cell+=c;
}if(quotes)throw Error("Unclosed quoted CSV value");row.push(cell);if(row.some(x=>x.trim()!==""))rows.push(row);
if(!rows.length)throw Error("CSV is empty");const hd=rows.shift().map(x=>x.trim().toLowerCase());if(hd.length!==headers.length||hd.some((x,i)=>x!==headers[i]))throw Error("Required header: "+headers.join(","));
if(rows.length>900)throw Error("Limit intake to 900 ice blocks per import");
const errs=[];for(let i=0;i<rows.length;i++){const v=rows[i];let why="";
if(v.length!==7)why="expected seven columns";
const [date,night,rink,start,end,authority,source_ref]=v.map(x=>String(x||"").trim());
if(!why&&!isoDate(date))why="invalid YYYY-MM-DD";
if(!why&&!(night in nights))why="night must be Sunday, Tuesday, Wednesday or Thursday";
if(!why&&!/^[A-Za-z0-9]{1,3}$/.test(rink))why="rink must be 1–3 letters/digits";
const a=clock(start),b=clock(end);
if(!why&&(a===null||b===null||b-a<45||b-a>240))why="need 45–240 minute same-day start/end in HH:MM";
if(!why&&new Date(date+"T12:00:00Z").getUTCDay()!==nights[night])why="date does not match competition night";
if(!why&&!["DEMO_ONLY","LEAGUE_CONTRACT_ATTESTED","FACILITY_LISTING_UNVERIFIED","BLOCKED"].includes(authority))why="unrecognized authority category";
if(!why&&authority==="LEAGUE_CONTRACT_ATTESTED"&&source_ref.length<8)why="attestation needs a redacted source reference (at least 8 characters)";
if(!why&&source_ref.length>120)why="reference over 120 characters";
if(why){errs.push("Row "+(i+2)+": "+why);continue}
out.push({date,night,rink:rink.toUpperCase(),start,end,start_min:a,end_min:b,authority,source_ref,source_line:i+2})
}return{rows:out,errors:errs}
}
function evaluate(rows){const issues=[];const unique=new Set();
const sorted=rows.map((r,i)=>({...r,index:i,holds:[],source_warning:[]})).sort((a,b)=>a.date.localeCompare(b.date)||a.rink.localeCompare(b.rink)||a.start_min-b.start_min);
for(const s of sorted){const k=s.date+"|"+s.rink+"|"+s.start+"|"+s.end;if(unique.has(k)){s.holds.push("DUPLICATE_IMPORTED_BLOCK");issues.push("Duplicate "+k)}unique.add(k);
if(s.authority==="FACILITY_LISTING_UNVERIFIED")s.holds.push("RENTAL_LISTING_NOT_LEAGUE_ICE");
if(s.authority==="BLOCKED")s.holds.push("BLOCKED_BY_SOURCE");
if(s.authority==="LEAGUE_CONTRACT_ATTESTED"&&s.source_ref.length<8)s.holds.push("MISSING_REDACTED_EVIDENCE");
if(s.authority==="DEMO_ONLY")s.source_warning.push("Synthetic scenario — not a booking");
if(s.authority==="LEAGUE_CONTRACT_ATTESTED")s.source_warning.push("Operator attestation only — NOT independently verified");
}
for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length;j++){const a=sorted[i],b=sorted[j];if(a.date!==b.date||a.rink!==b.rink)continue;if(a.start_min<b.end_min&&b.start_min<a.end_min){if(a.start_min===b.start_min&&a.end_min===b.end_min)continue;a.holds.push("OVERLAPPING_IMPORT");b.holds.push("OVERLAPPING_IMPORT");issues.push("Overlap "+a.date+" rink "+a.rink)}}
const sources=registry?.fixtures||[];
for(const s of sorted){for(const game of sources){if(game.date!==s.date||game.status?.startsWith("COMPLETED")||!game.time)continue;const gameStart=clock(game.time);if(gameStart===null)continue;
if(game.rink===null){if(gameStart>=s.start_min&&gameStart<s.end_min)s.source_warning.push("Published game at this time has no verified rink; availability cannot be established");continue}
const rinkName=String(game.rink).toUpperCase().replace(/\s*RINK\s*/i,"");if(rinkName!==s.rink)continue;
if(gameStart>=s.start_min&&gameStart<s.end_min){s.holds.push("OVERLAPS_PUBLISHED_FIXTURE");issues.push("Existing source game "+game.game_id+" at "+game.date+" "+game.time+" rink "+game.rink)}
}
s.holds=[...new Set(s.holds)];s.source_warning=[...new Set(s.source_warning)]}
const eligible=sorted.filter(s=>!s.holds.length),blocked=sorted.filter(s=>s.holds.length);
return{rows:sorted,eligible,blocked,issues:[...new Set(issues)]}
}
async function loadRegistry(){if(loading)return loading;loading=fetch(REG,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{if(!Array.isArray(d.fixtures))throw Error("Unrecognized source fixture registry");registry=d;state.snapshot=d.captured_date||"2026-11-16";render()}).catch(e=>{state.note="Public fixture evidence could not load: "+String(e)+"; no conflict clearance is possible";render()});return loading}
function ingest(text,mode){const result=parseCsv(text);if(result.errors.length){state.errors=result.errors;state.note="Import rejected: "+result.errors.length+" invalid row(s). No previous valid inventory was changed.";return false}
state.rows=result.rows.map(({date,night,rink,start,end,start_min,end_min,authority,source_ref,source_line})=>({date,night,rink,start,end,start_min,end_min,authority,source_ref,source_line}));
state.errors=[];state.mode=mode||"imported";state.note="Imported "+state.rows.length+" rows to this browser only. Authorization claims have NOT been independently verified.";state.loadedAt=new Date().toISOString();save();return true}
function weekDay(date,night,index){const d=new Date(date+"T12:00:00Z");if(isNaN(+d))return "";let i=0;while(d.getUTCDay()!==nights[night]&&i++<7)d.setUTCDate(d.getUTCDate()+1);d.setUTCDate(d.getUTCDate()+7*index);return d.toISOString().slice(0,10)}
function getSlots(night,first,weeks){const result=evaluate(state.rows),slots=[];for(let i=0;i<weeks;i++){const date=weekDay(first,night,i),available=result.eligible.filter(x=>x.date===date&&x.night===night).map(x=>({date:x.date,time:x.start,min:x.start_min,end:x.end,rink:x.rink,authority:x.authority,source_ref:x.source_ref,proof:"UNVERIFIED_BY_BRUTTECH"}));slots.push(available)}return{slots,counts:slots.map(x=>x.length),total:slots.reduce((n,x)=>n+x.length,0),held:result.blocked.length,scope:state.mode,snapshot:state.snapshot,unverified:true,registryLoaded:Boolean(registry)}
}
function csvSample(night="Wednesday",first="2026-12-02",weeks=8){const rows=[headers.join(",")];for(let w=0;w<weeks;w++){const date=weekDay(first,night,w);for(const start of ["19:15","20:30","21:45","22:30"])for(const rink of ["A","B","C","D"]){const n=clock(start)+60,end=String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");rows.push([date,night,rink,start,end,"DEMO_ONLY","FICTIONAL_NO_BOOKING"].join(","))}}return rows.join("\n")}
function template(){return headers.join(",")+"\n2026-12-02,Wednesday,A,19:15,20:15,FACILITY_LISTING_UNVERIFIED,REDACTED_SOURCE_REVIEW"}
function stateStats(){const r=evaluate(state.rows),n={DEMO_ONLY:0,LEAGUE_CONTRACT_ATTESTED:0,FACILITY_LISTING_UNVERIFIED:0,BLOCKED:0};
r.rows.forEach(x=>n[x.authority]++);
return{rows:r.rows.length,eligible:r.eligible.length,blocked:r.blocked.length,counts:n,sourceLoaded:Boolean(registry),warnings:r.issues.length}
}
function render(){const root=$("#league-inventory-mount");if(!root)return;const r=evaluate(state.rows),counts=stateStats();
root.innerHTML='<p class="lc-warning">Ice inventory shown here is <b>browser-local and not connected to Sports Village bookings.</b> A facility rental listing is not a league contract. Even an operator-entered “contract attested” row requires independent facility confirmation before scheduling. Do not paste confidential contract or personal details.</p>'+
'<section class="panel lc-panel"><div class="panelhead"><div><h2>Import dated rink blocks</h2><p>CSV schema: <code>'+headers.join(", ")+'</code>. Include the exact date, competition night, rink, start/end, authorization category and redacted evidence reference.</p></div></div>'+
'<div class="lc-controls"><label class="field">Example night<select id="lci-example-night">'+Object.keys(nights).map(n=>'<option>'+n+'</option>').join("")+'</select></label><div class="field"><span>Example data</span><button class="btn" type="button" id="lci-generate-demo">Load 8-week fictional sample</button></div><div class="field"><span>Template</span><button class="btn" id="lci-template" type="button">Show CSV header/template</button></div></div>'+
'<label class="field" style="margin-top:13px">Paste CSV (up to 900 dated blocks)<textarea id="lci-csv" rows="8" spellcheck="false" placeholder="'+escape(headers.join(",")+"&#10;2026-12-02,Wednesday,A,19:15,20:15,DEMO_ONLY,FICTIONAL_NO_BOOKING")+'"></textarea></label>'+
'<div class="formfooter"><button id="lci-import" type="button" class="btn primary">Validate &amp; keep local draft</button><button id="lci-export" type="button" class="btn">Export sanitized JSON</button><button id="lci-clear" type="button" class="btn warn">Clear imported rows</button></div>'+
'<p id="lci-note" class="lc-caption">'+escape(state.note||"Nothing is submitted to an external booking or league system.")+'</p>'+(state.errors.length?'<p class="lc-error" role="alert">'+state.errors.slice(0,8).map(escape).join(" | ")+'</p>':'')+'</section>'+
'<div class="lc-kpis"><div><small>Stored rink blocks</small><strong>'+counts.rows+'</strong><em>Browser draft only</em></div><div><small>Scenario-eligible</small><strong>'+counts.eligible+'</strong><em>Still not independently authorized</em></div><div><small>Held from assignment</small><strong>'+counts.blocked+'</strong><em>Unverified listing, blocked, duplicate or collision</em></div><div><small>Fixture source</small><strong>'+((registry?.fixtures||[]).length||"—")+'</strong><em>Partial public snapshot '+escape(state.snapshot)+'</em></div></div>'+
'<section class="panel lc-panel"><div class="panelhead"><div><h2>Admission controls &amp; source conflicts</h2><p>Only DEMO_ONLY or operator-attested league-contract entries without detected conflicts can enter a planning scenario. An operator claim is not facility proof.</p></div></div>'+
'<div class="lc-tablewrap"><table class="lc-table"><thead><tr><th>Date/time</th><th>Rink/night</th><th>Classification</th><th>Hold / source quality</th></tr></thead><tbody>'+
(r.rows.slice(0,70).map(x=>'<tr><td><b>'+escape(x.date)+'</b><small>'+escape(x.start)+'–'+escape(x.end)+'</small></td><td>'+escape(x.rink)+' · '+escape(x.night)+'</td><td>'+escape(x.authority.replaceAll("_"," "))+'</td><td>'+escape(x.holds.concat(x.source_warning).join("; ")||"Scenario-eligible, independently unverified")+'</td></tr>').join("")||'<tr><td colspan="4">No imported ice inventory. Use the explicitly fictional demonstration sample or paste a redacted CSV.</td></tr>')+'</tbody></table></div>'+
(r.rows.length>70?'<p class="lc-caption">Displaying first 70 of '+r.rows.length+' rows. Export JSON for complete listing.</p>':'')+
'<div class="formfooter"><button type="button" class="btn primary" data-go="league-planner">Open balanced season planner</button><a class="btn" href="https://www.sportsvillage.ca/ice-rental/" target="_blank" rel="noopener noreferrer">Facility rental listing ↗</a></div>'+
'<p class="lc-caption">Published sources identify some already scheduled games but do not prove other slots are unoccupied. The dated list is not a real-time facility inventory; unknown rink or duration remain held as unresolved external dependencies.</p></section>'
}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||!$("#league-inventory-mount"))return;
if(b.id==="lci-generate-demo"){raw=csvSample($("#lci-example-night").value);$("#lci-csv").value=raw;state.note="Fictional example generated. Review then press Validate & keep local draft.";$("#lci-note").textContent=state.note}
if(b.id==="lci-template"){$("#lci-csv").value=template()}
if(b.id==="lci-import"){try{raw=$("#lci-csv").value;ingest(raw,"imported")}catch(e){state.note=String(e);state.errors=[]}render()}
if(b.id==="lci-clear"){state.rows=[];state.mode="empty";state.errors=[];state.note="Cleared local imported draft.";save();render()}
if(b.id==="lci-export"){const r=evaluate(state.rows);const payload={schema:"bruttech-leagueos-v8-inventory-preview",source_snapshot:state.snapshot,not_facility_verified:true,authorization_required:true,rows:r.rows.map(x=>({date:x.date,night:x.night,rink:x.rink,start:x.start,end:x.end,authority:x.authority,source_ref:"REDACTED",holds:x.holds,source_warning:x.source_warning}))};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="leagueos-ice-review-redacted-v8.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
});
window.LeagueOSIceV8={mount(){render();if(!registry&&!loading)loadRegistry()},getSlots,parseCsv,ingest,evaluate,stateStats,_test:{weekDay,csvSample,template,getRegistry:()=>registry}};
})();