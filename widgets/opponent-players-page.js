/* Public, source-qualified SVHL opponent roster explorer.
   This page NEVER reads Brave H.C. player statistics from SVHL. */
(()=>{
 "use strict";
 const q=id=>document.getElementById(id);
 const elem=(tag,cls,value)=>{const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined&&value!==null)node.textContent=String(value);
  return node;};
 const add=(parent,tag,cls,value)=>{const el=elem(tag,cls,value);
  parent.append(el);return el;};
 const date=s=>{const d=new Date(s);return Number.isFinite(d.getTime())?
  new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",
   dateStyle:"medium",timeStyle:"short"}).format(d):"source date unavailable";};
 const val=n=>Number.isInteger(n)&&n>=0?String(n):"—";
 let league=null,feed=null;
 function detail(cell,p){
  const history=p.priorSeasonTeamObservations||[];
  if(!history.length){add(cell,"span","minor","No prior source-linked observation");return;}
  const panel=add(cell,"details","","");
  add(panel,"summary","",history.length+" prior season/team observation"+
    (history.length===1?"":"s"));
  const ol=add(panel,"ol","history","");
  for(const h of history){
   const li=add(ol,"li","","");
   const source=add(li,"a","",h.season+" · "+h.teamName+" · "+val(h.gp)+
    " GP, "+val(h.g)+" G, "+val(h.a)+" A, "+val(h.pts)+" points");
   source.href=h.profileUrl;source.target="_blank";source.rel="noopener noreferrer";
   add(li,"span","minor",(h.nameMatch&&
       h.sourceStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT"?
       " · official same-player-ID source observation":
       " · identity/name or source arithmetic needs review")+
      " · historical division: "+h.division);
  }
 }
 function special(cell,p){
  const s=p.specialtyStats;
  if(!s){add(cell,"span","source-hold","Profile details held or not collected");return;}
  add(cell,"span","",s.ppGoals+" PP goals · "+s.ppAssists+" PP assists");
  add(cell,"div","",s.pkGoals+" PK goals · "+s.pkAssists+" PK assists");
  add(cell,"div","",s.gameWinningGoals+" GWG · "+s.gameTyingGoals+" GTG");
 }
 function table(){
  const tbody=q("opponent-rows");
  tbody.replaceChildren();
  if(!feed||!league)return;
  const selected=q("opponent-team").value,term=q("search-players").value
   .toLowerCase().trim();
  const eligible=feed.teams.filter(t=>selected==="all"||String(t.sourceTeamId)===selected);
  const records=eligible.flatMap(team=>team.players.map(player=>({team,player})))
   .filter(({player})=>!term||player.name.toLowerCase().includes(term)||
     String(player.jersey||"").toLowerCase().includes(term))
   .sort((a,b)=>{
    const ag=a.player.sourceStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT";
    const bg=b.player.sourceStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT";
    return Number(bg)-Number(ag) ||
      (bg?b.player.pts-a.player.pts:0) ||
      a.team.name.localeCompare(b.team.name) ||
      a.player.name.localeCompare(b.player.name);
   });
  q("table-title").textContent=records.length+" reported player-season records";
  q("opponent-status").textContent="SVHL player roster source "+date(feed.capturedAt)+
     " · "+feed.teamCount+" opponent teams and "+feed.playerCount+
     " current player records · "+feed.currentSpecialtyProfilesVerified+
     " player specialty profiles verified. Showing "+records.length+
     " entries. No Brave H.C. player statistics imported.";
  for(const {team,player:p} of records){
   const tr=add(tbody,"tr","","");
   const name=add(tr,"td","","");
   const link=add(name,"a","player",p.name);
   link.href=p.profileUrl;link.target="_blank";link.rel="noopener noreferrer";
   add(name,"div","minor",(p.jersey&&p.jersey!=="-"?"#"+p.jersey+" · ":"")+
    (p.positionAsPublished||"Position unverified"));
   if(p.sourceStatus!=="PUBLISHED_ARITHMETICALLY_CONSISTENT")
    add(name,"div","source-hold","Published arithmetic conflicts; review source");
   add(tr,"td","",team.name);
   for(const k of ["gp","g","a","pts","pim"]){
    add(tr,"td","",val(p[k]));
   }
   add(tr,"td","",p.publishedPtsPerGP===null?"—":
     p.publishedPtsPerGP.toFixed(2));
   special(add(tr,"td","",null),p);
   detail(add(tr,"td","",null),p);
  }
  if(!records.length){
   const tr=add(tbody,"tr","","");
   const td=add(tr,"td","muted","No source-qualified players match this filter.");
   td.colSpan=10;
  }
 }
 async function main(){
  try{
   const [lr,pr]=await Promise.all([
    fetch("./league-intelligence.json",{cache:"no-store"}),
    fetch("./opponent-player-intelligence.json",{cache:"no-store"})]);
   if(!lr.ok||!pr.ok)throw Error("official source feed unavailable");
   league=await lr.json();feed=await pr.json();
   if(!window.BraveOpponentPlayers)throw Error("source validation module unavailable");
   window.BraveOpponentPlayers.validate(feed,league);
   const select=q("opponent-team");select.replaceChildren();
   select.add(new Option("All 21 opponent teams","all"));
   for(const t of feed.teams)select.add(new Option(t.name+" · "+t.division,
    String(t.sourceTeamId)));
   const name=new URLSearchParams(location.search).get("team");
   const match=feed.teams.find(t=>t.name===name);
   if(match)select.value=String(match.sourceTeamId);
   select.addEventListener("change",table);
   q("search-players").addEventListener("input",table);
   table();
  }catch(err){
   q("opponent-status").textContent="Player intelligence held: "+err.message+
     ". No statistics have been substituted.";
   q("opponent-rows").replaceChildren();
   q("opponent-team").replaceChildren();
  }
 }
 main();
})();
