/* Brave H.C. source-qualified career charts v1: read-only, source-qualified and role-aware.
   Requires published season rows already validated by the Bio Centre.
   No coaching video and no game-by-game data without an accepted production feed.
*/
(function(global){
"use strict";
const NS="http://www.w3.org/2000/svg";
const valid=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
const svg=(tag,attrs={},text)=>{
 const el=document.createElementNS(NS,tag);
 for(const [key,val] of Object.entries(attrs))el.setAttribute(key,String(val));
 if(text!==undefined)el.textContent=String(text);
 return el;
};
const text=(tag,value,klass)=>{
 const n=document.createElement(tag);
 n.textContent=String(value);
 if(klass)n.className=klass;
 return n;
};
const fmt=v=>Number(v).toLocaleString("en-CA",{maximumFractionDigits:2});
const short=s=>{
 const d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
 if(d)return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(d[2])-1]+String(Number(d[3]));
 const m=/^Winter\s+(\d{4})\/(\d{4})$/.exec(s);
 if(m)return "W"+m[1].slice(2)+"/"+m[2].slice(2);
 const sM=/^Summer\s+(\d{4})$/.exec(s);
 return sM?"S"+sM[1].slice(2):String(s).slice(0,10);
};
const yearType=s=>/^Winter /i.test(s)?"winter":/^Summer /i.test(s)?"summer":"other";
const filterRows=(rows,filter)=>rows.filter(x=>filter==="all"||yearType(x.Season)===filter);
const maxY=(values,integer)=>{
 const m=Math.max(0,...values.filter(valid));
 if(m<=0)return integer?1:0.5;
 const step=10**Math.floor(Math.log10(m/4));
 const unit=integer?Math.max(1,Math.round(step)):step;
 return Math.max(unit,Math.ceil(m/unit)*unit);
};
const colors={goals:"#cd5373",assists:"#dfb873",gp:"#83b5d6",rate:"#dab76c",cumulative:"#b2c9e7",wins:"#79b99f",losses:"#d37f83",ties:"#a8acd0",gaa:"#dfb873"};
function buildPanel(parent,title,description){
 const box=text("section","","bio-chart-card");
 box.append(text("h3",title,"bio-chart-title"));
 box.append(text("p",description,"bio-chart-help"));
 const keys=title==="Goals & assists by season"
   ?[["Goals",colors.goals],["Assists",colors.assists]]
   :title==="Goalie results by season"
   ?[["Wins",colors.wins],["Losses",colors.losses],["Ties",colors.ties]]:[];
 if(keys.length){
  const legend=text("div","","bio-chart-legend");
  for(const [label,color] of keys){
   const marker=text("span","● ","");marker.style.color=color;
   const item=text("span",label,"bio-chart-legend-item");
   item.prepend(marker);legend.append(item);
  }
  box.append(legend);
 }
 const svgWrap=text("div","","bio-chart-svg");
 box.append(svgWrap);parent.append(box);
 return svgWrap;
}
function axes(canvas,ymax,{integer=true}={}){
 const pad={l:38,r:11,t:16,b:42};
 const x0=pad.l,x1=580-pad.r,y0=pad.t,y1=225-pad.b;
 for(let i=0;i<=4;i++){
  const frac=i/4;
  const y=y1-frac*(y1-y0);
  const label=frac*ymax;
  canvas.append(svg("line",{x1:x0,y1:y,x2:x1,y2:y,stroke:"#33536e","stroke-width":1}));
  canvas.append(svg("text",{x:x0-7,y:y+4,"text-anchor":"end",fill:"#b7cde0","font-size":11},integer?String(Math.round(label)):fmt(label)));
 }
 return {x0,x1,y0,y1,w:x1-x0,h:y1-y0};
}
function labels(canvas,rows,box){
 const n=rows.length;
 if(!n)return;
 const every=Math.max(1,Math.ceil(n/7));
 for(let i=0;i<n;i++){
  if(i%every!==0&&i!==n-1)continue;
  const x=box.x0+(i+0.5)*box.w/n;
  canvas.append(svg("text",{x,y:box.y1+19,"text-anchor":"middle",fill:"#bdcfdf","font-size":Math.max(9,n>16?9:11)},short(rows[i].Season)));
 }
}
function canvas(label){
 return svg("svg",{viewBox:"0 0 580 225",width:"100%",height:"auto",role:"img",
   "aria-label":label,preserveAspectRatio:"xMidYMid meet",class:"bio-stat-svg"});
}
function titleMark(shape,description,rowIndex){
 shape.append(svg("title",{},description));
 shape.setAttribute("tabindex","0");shape.setAttribute("focusable","true");
 shape.setAttribute("role","button");
 shape.setAttribute("aria-label",description);
 if(Number.isInteger(rowIndex))shape.setAttribute("data-row-index",String(rowIndex));
 return shape;
}
function attachInspector(parent,rows,valueText){
 const card=parent.closest(".bio-chart-card");
 if(!card||!rows.length)return;
 const area=text("div","","bio-chart-inspector");
 const label=text("label","Inspect season or game: ","bio-chart-inspector-label");
 const picker=document.createElement("select");
 picker.className="bio-chart-inspector-select";
 picker.setAttribute("aria-label","Inspect a specific season or game in "+card.querySelector(".bio-chart-title").textContent);
 const value=text("div","","bio-chart-selected");
 value.setAttribute("role","status");
 value.setAttribute("aria-live","polite");
 rows.forEach((row,i)=>{
  const option=document.createElement("option");
  option.value=String(i);
  option.textContent=short(row.Season);
  picker.append(option);
 });
 const update=index=>{
  const selected=Number(index);
  if(!Number.isInteger(selected)||!rows[selected])return;
  picker.value=String(selected);
  value.textContent=valueText(rows[selected],selected);
 };
 picker.addEventListener("change",()=>update(picker.value));
 const svgRoot=parent.querySelector("svg");
 if(svgRoot){
  for(const node of svgRoot.querySelectorAll("[data-row-index]")){
   const choose=()=>update(node.getAttribute("data-row-index"));
   node.addEventListener("click",choose);
   node.addEventListener("focus",choose);
   node.addEventListener("keydown",event=>{
    if(event.key==="Enter"||event.key===" "){event.preventDefault();choose();}
   });
  }
 }
 label.append(picker);area.append(label,value);
 card.append(area);
 const latest=[...rows.keys()].reverse().find(i=>!valueText(rows[i],i).includes("No verified value"));
 update(latest??rows.length-1);
}
function noRows(parent,why){
 parent.replaceChildren(text("p",why,"bio-chart-no-data"));
}
function barChart(parent,rows,metric,options={}){
 const {field,label,color,fields}=metric;
 const relevant=rows.filter(r=>fields?fields.every(f=>valid(r[f])):valid(r[field]));
 if(!relevant.length)return noRows(parent,"No verified season values are available for this chart.");
 const vals=relevant.map(r=>fields?fields.reduce((sum,f)=>sum+r[f],0):r[field]);
 const ymax=maxY(vals,true);
 const graph=canvas(label);
 const a=axes(graph,ymax),n=rows.length,slot=a.w/n,width=Math.max(3,Math.min(33,slot*.70));
 rows.forEach((row,i)=>{
  const parts=fields?fields.map(f=>row[f]):[row[field]];
  if(!parts.every(valid))return;
  if(parts.every(v=>v===0)){
   const marker=titleMark(svg("circle",{cx:a.x0+(i+.5)*slot,cy:a.y1-2,r:3,fill:fields?color[0]:color||colors.gp}),
    row.Season+" · Recorded 0 "+(fields?fields.join("+"):label),i);
   graph.append(marker);
  }
  let taken=0;
  parts.forEach((v,k)=>{
   const scaled=v/ymax*a.h;
   const x=a.x0+(i+.5)*slot-width/2,y=a.y1-(taken+v)/ymax*a.h;
   const bar=titleMark(svg("rect",{x,y,width,height:Math.max(0,scaled),
    rx:1,fill:fields?color[k]:color||colors.gp}),row.Season+" · "+(fields?fields[k]:label)+" "+fmt(v),i);
   graph.append(bar);taken+=v;
  });
 });
 labels(graph,rows,a);parent.replaceChildren(graph);
 attachInspector(parent,rows,row=>{
  const parts=fields?fields.map(f=>row[f]):[row[field]];
  if(!parts.every(valid))return row.Season+" — No verified value for this metric";
  return row.Season+" — "+(fields?fields.map((f,i)=>f+": "+fmt(parts[i])).join(" · "):label+": "+fmt(parts[0]));
 });
}
function lineChart(parent,rows,metric,opts={}){
 const {field,label,color,values,decimal}=metric;
 const computed=rows.map((row,i)=>values?values(row,i,rows):row[field]);
 const relevant=computed.filter(valid);
 if(!relevant.length)return noRows(parent,"No verified season values are available for this chart.");
 const ymax=maxY(relevant,!decimal);
 const graph=canvas(label);const a=axes(graph,ymax,{integer:!decimal});
 const n=rows.length;
 let section=[];
 const pushLine=()=>{
  if(section.length>1)graph.append(svg("polyline",{points:section.map(p=>p.join(",")).join(" "),
   fill:"none",stroke:color||colors.rate,"stroke-width":2.8,"stroke-linecap":"round","stroke-linejoin":"round"}));
  section=[];
 };
 rows.forEach((row,i)=>{
  const v=computed[i];
  if(!valid(v)){pushLine();return;}
  const x=a.x0+(i+.5)*a.w/n,y=a.y1-v/ymax*a.h;
  section.push([x,y]);
  const dot=titleMark(svg("circle",{cx:x,cy:y,r:4,fill:color||colors.rate,stroke:"#102940","stroke-width":1.6}),
    row.Season+" · "+label+" "+fmt(v),i);
  graph.append(dot);
 });
 pushLine();labels(graph,rows,a);parent.replaceChildren(graph);
 attachInspector(parent,rows,(row,i)=>row.Season+" — "+(valid(computed[i])?label+": "+fmt(computed[i]):"No verified value for this metric"));
}
function cumulative(rows,field){
 let sum=0;
 return rows.map(r=>{
   if(!valid(r[field]))return null;
   sum+=r[field];return sum;
 });
}
function draw(container,segment,options={}){
 if(!container)return {status:"NO_CONTAINER"};
 container.replaceChildren();
 const source=(segment&&Array.isArray(segment.seasons))?segment.seasons:[];
 const kind=segment?.kind;
 if(!["skater","goalie"].includes(kind)||!source.length){
  noRows(container,"No source-qualified season history is available to chart.");
  return {status:"NO_CHART_SOURCE",charts:0,kind:kind||null};
 }
 const rows=filterRows(source,options.filter||"all");
 if(!rows.length){
  noRows(container,"There are no recorded "+(options.filter||"selected")+" seasons for this player.");
  return {status:"NO_MATCHING_SEASONS",charts:0,kind};
 }
 const show=(title,detail,render)=>{
  const elem=buildPanel(container,title,detail);
  render(elem);return elem;
 };
 const notes=kind==="skater"
  ?["Stacked goals and assists (only complete scoring rows)","Games played per season","Published points per game","Cumulative points across published season rows"]
  :["Wins, losses and ties (only complete W/L/T rows)","Games played per season","Published goals-against average","Cumulative wins from complete season W rows"];
 if(kind==="skater"){
  show("Goals & assists by season",notes[0],root=>barChart(root,rows,{fields:["G","A"],label:"Goals and assists",color:[colors.goals,colors.assists]}));
  show("Games played",notes[1],root=>barChart(root,rows,{field:"GP",label:"GP",color:colors.gp}));
  show("Points per game",notes[2],root=>lineChart(root,rows,{label:"Pts/GP",values:r=>valid(r.GP)&&r.GP>0&&valid(r.Pts)?r.Pts/r.GP:null,color:colors.rate,decimal:true}));
  const totals=cumulative(rows,"Pts");
  show("Cumulative recorded points",notes[3],root=>lineChart(root,rows,{label:"Published row points cumulative",values:(r,i)=>totals[i],color:colors.cumulative}));
 }else{
  show("Goalie results by season",notes[0],root=>barChart(root,rows,{fields:["W","L","T"],label:"W/L/T",color:[colors.wins,colors.losses,colors.ties]}));
  show("Goalie appearances",notes[1],root=>barChart(root,rows,{field:"GP",label:"GP",color:colors.gp}));
  show("Goals-against average",notes[2],root=>lineChart(root,rows,{field:"GAA",label:"GAA",color:colors.gaa,decimal:true}));
  const wins=cumulative(rows,"W");
  show("Cumulative recorded wins",notes[3],root=>lineChart(root,rows,{label:"Published row wins cumulative",values:(r,i)=>wins[i],color:colors.cumulative}));
 }
 return {status:"SOURCE_ROWS_RENDERED",kind,charts:4,rows:rows.length,
  sourceRows:source.length,filter:options.filter||"all",sourceIsHistoricalArchive:true};
}
function drawGames(container,feed,playerID,role){
 if(!container)return {status:"NO_GAME_CONTAINER",charts:0};
 container.replaceChildren();
 if(feed?.schema!=="brave-hc-player-games-private-five-source/v1"||
    feed.status!=="PRIVATE_ACCEPTED_SOURCE_NOT_PRODUCTION"||
    feed.sourceAcceptance!=="PRIVATE_FIVE_GAME_SOURCE_ACCEPTANCE_PASS"||
    feed.productionAccepted!==false||feed.publication?.allowed!==false||
    !Array.isArray(feed.games)||feed.games.length!==5){
   noRows(container,"A complete accepted player-by-game source is not available. No game trend has been estimated.");
   return {status:"GAME_SOURCE_UNAVAILABLE",charts:0};
 }
 const pid=String(playerID);
 const kind=role==="goalie"?"goalie":"skater";
 const records=feed[kind==="goalie"?"goalies":"skaters"]?.[pid]||[];
 const known=new Map();
 for(const item of records){
  if(known.has(item.gameID))return {status:"DUPLICATE_GAME_HOLD",charts:0};
  known.set(item.gameID,item);
 }
 const rows=feed.games.map(g=>{
  const item=known.get(g.gameID);
  if(!item)return {Season:g.date,gameID:g.gameID,recorded:false};
  if(item.date!==g.date)return {Season:g.date,gameID:g.gameID,recorded:false};
  if(kind==="skater"){
   if(![item.g,item.a,item.pts].every(valid)||item.g+item.a!==item.pts)
    return {Season:g.date,gameID:g.gameID,recorded:false};
   return {Season:g.date,gameID:g.gameID,recorded:true,
           g:item.g,a:item.a,pts:item.pts};
  }
  if(!valid(item.goalsAgainst))return {Season:g.date,gameID:g.gameID,recorded:false};
  const outcome=item.result==="LOSS"?{W:0,L:1}
       :item.result==="WIN_SCOREBOARD_BOUNDED_ACCEPTED"?{W:1,L:0}:{W:null,L:null};
  return {Season:g.date,gameID:g.gameID,recorded:true,goalsAgainst:item.goalsAgainst,...outcome};
 });
 const used=rows.filter(r=>r.recorded).length;
 if(used===0){
   noRows(container,"No HTO player appearance row is recorded in these five verified games. This is not a zero-point or zero-goals claim.");
   return {status:"NO_RECORDED_GAME_APPEARANCES",charts:0,kind,sourceGames:5,recordedAppearances:0,unrecordedGames:5};
 }
 if(kind==="skater"){
   showGame("Points by recorded game","A visible zero means the player appeared but recorded zero points. No row means no documented appearance.",
     parent=>barChart(parent,rows,{field:"pts",label:"Points",color:colors.gp}));
   showGame("Goals and assists per game","Goals (rose), assists (gold). The bars omit games without an HTO player appearance row.",
     parent=>barChart(parent,rows,{fields:["g","a"],label:"Scoring",color:[colors.goals,colors.assists]}));
   let acc=0;
   const series=rows.map(r=>{if(!r.recorded)return null;acc+=r.pts;return acc;});
   showGame("Cumulative points on recorded appearances","Totals include only this accepted five-game source; no contribution is imputed for an unrecorded appearance.",
     parent=>lineChart(parent,rows,{label:"Cumulative points",values:(r,i)=>series[i],color:colors.cumulative}));
 }else{
   showGame("Goals against per recorded game","Goals against as published in each verified goalie game row.",
     parent=>barChart(parent,rows,{field:"goalsAgainst",label:"Goals against",color:colors.gp}));
   showGame("Recorded goaltending results","Green = verified win; red = published loss. An unknown result is omitted.",
     parent=>barChart(parent,rows,{fields:["W","L"],label:"W/L",color:[colors.wins,colors.losses]}));
 }
 function showGame(title,description,render){
   const root=buildPanel(container,title,description);
   render(root);
 }
 return {status:"GAME_ROWS_RENDERED",charts:kind==="skater"?3:2,
         kind,sourceGames:5,recordedAppearances:used,unrecordedGames:5-used,
         sourceOnlyAccepted:true,productionAccepted:false};
}
global.BraveBioCharts=Object.freeze({draw,drawGames,filterRows});
})(window);