/* Public Game Centre mobile lineup: exact SHA-bound, captain-approved source only.
 * The print/PDF artwork is retained unchanged. No WhatsApp, RSVP, or private data.
 */
(function(global){
 "use strict";
 const SH=/^[a-f0-9]{64}$/;
 const SAFE=/^\.\/assets\/lineups\/game-\d+-\d{4}-\d{2}-\d{2}-working(?:-r[2-9][0-9]*)?\.pdf$/;
 function playerName(p){
  if(!p||typeof p.name!=="string"||typeof p.jerseyNumber!=="string"||
     !/^\d{1,3}$/.test(p.jerseyNumber)||typeof p.displayText!=="string"||
     p.displayText!=="#"+p.jerseyNumber+" - "+p.name)return null;
  const parts=p.name.split(",").map(s=>s.trim());
  if(parts.length!==2||parts.some(x=>!x)||p.name.length>85)return null;
  return {name:parts[1]+" "+parts[0],number:p.jerseyNumber,identity:p.name};
 }
 function validate(c,e,fix){
  if(!c||!e||!fix||c.schema!=="brave-hc-published-captain-lineup/v1"||
     c.status!=="FINAL_TEAM_LINEUP"||c.userManagerApproved!==true||
     c.season!=="W2026/27"||c.gameDate!==fix.gameDate||
     c.opponent!==fix.opponent||c.officialHTOGameId!==String(fix.id)||
     c.namedPollVotesIncluded!==false||c.privateWhatsAppGroupContentIncluded!==false||
     e.managerLineupStatus!=="FINAL_TEAM_LINEUP"||
     e.managerFinalReplacementAuthorized!==true||e.goalieConfirmed!==true||
     !e.managerConfirmedGoalie||!SAFE.test(e.url)||
     c.pdf?.path!==e.url.slice(2)||c.pdf?.sha256!==e.sha256||
     c.png?.path!==e.previewImage.slice(2)||c.png?.sha256!==e.previewSHA256||
     !Array.isArray(c.forwards)||c.forwards.length!==3||
     !Array.isArray(c.defence)||c.defence.length!==3||
     !Array.isArray(c.centreRotation)||c.centreRotation.length!==2)return null;
  if(c.gameId==="367"){
   if(fix.id!==3375686||c.gameTime!=="20:00"||c.rink!=="B Rink")return null;
  }
  const names=new Set(),add=p=>{
    const x=playerName(p);
    if(!x||names.has(x.identity))return null;
    names.add(x.identity);
    return x;
  };
  const wingPairs=[],defencePairs=[],centres=[];
  for(let i=0;i<3;i++){
   const f=c.forwards[i],lw=add(f?.LW),rw=add(f?.RW);
   if(!lw||!rw||f.line!==i+1)return null;
   wingPairs.push([lw,rw]);
   if(i<2){const centre=add(f.C);if(!centre)return null;centres.push(centre)}
   else if(f.C!==null)return null;
  }
  if(centres.length!==2||c.centreRotation.join("|")!==centres.map(p=>p.identity).join("|"))return null;
  for(let i=0;i<3;i++){
   const row=c.defence[i],left=add(row?.LD);
   if(!left||row.pair!==i+1)return null;
   const right=row.RD===null?null:add(row.RD);
   if(i<2&&!right)return null;
   if(i===2&&row.RD!==null)return null;
   defencePairs.push([left,right]);
  }
  const goalie=playerName(c.goalie);
  if(!goalie||names.has(goalie.identity)||e.managerConfirmedGoalie.name!==goalie.name||
     e.managerConfirmedGoalie.number!==goalie.number||names.size!==e.skaterCount||
     e.skaterCount!==13||c.hardBuddyPairs?.length!==3)return null;
  for(let i=0;i<3;i++){
   if(c.hardBuddyPairs[i]?.[0]!==wingPairs[i][0].identity||
      c.hardBuddyPairs[i]?.[1]!==wingPairs[i][1].identity)return null;
  }
  if(c.gameId==="367"){
   const w=wingPairs.map(pair=>pair.map(p=>p.identity));
   if(JSON.stringify(w)!==JSON.stringify([
     ["Provenzano, Mario","Provenzano, Michael"],
     ["Povegliano, Adam","Rosenberg, Jamie"],
     ["Pearsoll, Keith","Pavaday, Damien"]]))return null;
   if(centres.map(p=>p.identity).join("|")!=="Saindon, Stephane|Carosi, Justin")return null;
   if(JSON.stringify(defencePairs.map(pair=>pair.map(p=>p?.identity||null)))!==JSON.stringify([
     ["Rajkumar, Sanjay","Triumbari, Francesco"],
     ["Brutto, Adam","Pagnotta, Alex"],["Kober, Adam",null]]))return null;
  }
  return {wingPairs,defencePairs,centres,goalie,skaters:names.size};
 }
 function node(tag,cls,value){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(value!==undefined)el.textContent=value;
  return el;
 }
 function person(p){
  const el=node("div","mobile-person");
  el.append(node("span","mobile-jersey","#"+p.number),node("strong","mobile-name",p.name));
  return el;
 }
 function unit(label,players,extraClass){
  const el=node("article","mobile-unit"+(extraClass?" "+extraClass:""));
  el.append(node("div","mobile-unit-label",label));
  const row=node("div","mobile-unit-players");
  for(const p of players)row.append(person(p));
  el.append(row);return el;
 }
 function heading(label){return node("h4","mobile-section-title",label)}
 function renderDOM(model,fix,release){
  const frag=document.createDocumentFragment();
  const title=node("div","mobile-title");
  title.append(node("span","mobile-game-tag","BRAVE H.C. · GAME "+fix.id),
    node("strong",null,"FINAL LINEUP"));
  frag.append(title);
  frag.append(heading("Forward pairs"));
  const wing=node("div","mobile-units");
  model.wingPairs.forEach((p,i)=>wing.append(unit("PAIR "+(i+1),p,"mobile-forward")));
  frag.append(wing);
  const rotation=node("section","mobile-rotation");
  rotation.append(node("div","mobile-unit-label","TWO ROTATING CENTRES"));
  const cs=node("div","mobile-centres");
  model.centres.forEach(p=>cs.append(person(p)));
  rotation.append(cs,node("p",null,"Both centres rotate through all three winger pairs. Keep each wing pair together."));
  frag.append(rotation,heading("Defence"));
  const df=node("div","mobile-units");
  model.defencePairs.slice(0,2).forEach((p,i)=>df.append(unit("PAIR "+(i+1),p,"mobile-defence")));
  frag.append(df,unit("FIFTH DEFENCEMAN · ROTATES THROUGH BOTH PAIRS",[model.defencePairs[2][0]],"mobile-fifth"));
  frag.append(heading("Goaltender"),unit("CONFIRMED FOR THIS GAME",[model.goalie],"mobile-goalie"));
  frag.append(node("p","mobile-footer","Captain-approved team lineup. Open the original PDF below to print the full-size card."));
  return frag;
 }
 let generation=0;
 function reset(){
  generation++;
  const surface=document.getElementById("lineup-mobile"),container=document.getElementById("lineup-card");
  if(surface){surface.replaceChildren();surface.hidden=true}
  if(container)container.classList.remove("lineup-mobile-ready");
 }
 async function publish(release,fix,isCurrent){
  if(!release||!fix||!SH.test(release.lineupJsonSHA256||"")||!SAFE.test(release.url))return false;
  const version=++generation;
  const path=release.url.replace(/\.pdf$/,".lineup.json");
  const result=await fetch(path,{cache:"no-store"}).then(async r=>{
   if(!r.ok||Number(r.headers.get("content-length"))>120000)return null;
   const raw=await r.arrayBuffer();
   if(raw.byteLength<500||raw.byteLength>120000||!global.crypto?.subtle)return null;
   const hash=Array.from(new Uint8Array(await global.crypto.subtle.digest("SHA-256",raw))).map(b=>b.toString(16).padStart(2,"0")).join("");
   if(hash!==release.lineupJsonSHA256)return null;
   let c;
   try{c=JSON.parse(new TextDecoder().decode(raw))}catch{return null}
   return validate(c,release,fix);
  }).catch(()=>null);
  if(!result||version!==generation||typeof isCurrent==="function"&&!isCurrent())return false;
  const surface=document.getElementById("lineup-mobile"),container=document.getElementById("lineup-card");
  if(!surface||!container)return false;
  surface.replaceChildren(renderDOM(result,fix,release));
  surface.hidden=false;
  container.classList.add("lineup-mobile-ready");
  return true;
 }
 global.BraveMobileLineup={reset,publish,validate};
 if(typeof module!=="undefined"&&module.exports)module.exports={validate};
})(typeof window!=="undefined"?window:globalThis);
