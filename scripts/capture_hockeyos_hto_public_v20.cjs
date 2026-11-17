/**
 * Read-only public-source snapshot for HockeyOS V20.
 * Independently extracts only public statistical facts and verified HTO playerID links.
 * No authenticated session, proprietary HTO code, markup, CSS, photos or private data reused.
 * Run manually; NEVER send changes to HTO.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const out=process.env.HOCKEYOS_SOURCE_OUTPUT||path.resolve(__dirname,"../widgets/hockeyos-hto-current-v20.json");
const BROWSER=process.env.HOCKEYOS_BROWSER_PATH||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const ROOT="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=";
const GAME_SEASON="Winter 2026/2027";
const TARGET_SCHEMA="bruttech-hockeyos-hto-public-current/v20";
const COLS={
 roster:["No","Name","Pos","Ht","Wt","Shoots","Catches","Hometown","Rookie Year"],
 skaters:["No","Name","POS","","GP","G","A","Pts","Pts/G","PPG","GTG","GWG","PIM","+/-","HAT","POTG"],
 goalies:["No","Name","","GP","W","L","GA","GAA","POTG","+/-","Win %"]
};
function fail(s){throw Error("HTO V20 SOURCE HOLD: "+s)}
function whole(v,context){if(!/^\d+$/.test(v))fail(context+" invalid nonnegative whole number "+JSON.stringify(v));return Number(v)}
function signed(v,context){if(!/^-?\d+$/.test(v))fail(context+" invalid signed integer "+JSON.stringify(v));return Number(v)}
function decimal(v,context){if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(v))fail(context+" invalid decimal "+JSON.stringify(v));return Number(v)}
function text(v){return String(v||"").replace(/\s+/g," ").trim()}
function identity(row,context){
 const id=row.playerId;
 if(id!==null&&!/^\d{4,10}$/.test(id))fail(context+" invalid official playerID");
 if(!row.name||row.name.length>110)fail(context+" missing player name");
 return{id:id||null,name:row.name,number:row.cells[0],profile:id?
   ROOT+"profile&playerID="+id:null};
}
function rosterRow(row,i){
 const q=identity(row,"roster row "+i),number=row.cells[0]===""?null:whole(row.cells[0],"roster number");
 const pos=text(row.cells[2]);
 if(pos.length>20)fail("Unexpected roster position");
 return{htoPlayerId:q.id,name:q.name,jersey:number,position:pos||null,profileUrl:q.profile};
}
function skaterRow(row,i){
 const q=identity(row,"skater row "+i),c=row.cells,n=k=>whole(c[k],"skater row "+i+" column "+k);
 const r={htoPlayerId:q.id,name:q.name,jersey:c[0]===""?null:n(0),position:text(c[2])||null,
  gp:n(4),goals:n(5),assists:n(6),points:n(7),pointsPerGame:decimal(c[8],"source points per game"),
  ppg:n(9),gtg:n(10),gwg:n(11),pim:n(12),plusMinus:signed(c[13],"plus minus"),
  hatTricks:n(14),playerOfGame:n(15),profileUrl:q.profile};
 if(r.goals+r.assists!==r.points)fail("G+A != Pts in official stats "+q.name);
 if(r.ppg>r.goals||r.gtg>r.goals||r.gwg>r.goals)fail("Scoring event subset exceeds official G "+q.name);
 if(r.gp===0&&(r.points>0||r.goals>0||r.assists>0))fail("Production with zero GP "+q.name);
 return r;
}
function goalieRow(row,i){
 const q=identity(row,"goalie row "+i),c=row.cells,n=k=>whole(c[k],"goalie row "+i+" column "+k);
 const r={htoPlayerId:q.id,name:q.name,jersey:c[0]===""?null:n(0),gp:n(3),
  wins:n(4),losses:n(5),goalsAgainst:n(6),gaa:decimal(c[7],"goalie source GAA"),
  playerOfGame:n(8),plusMinus:signed(c[9],"goalie plus minus"),
  winPercentage:decimal(c[10],"goalie source win pct"),profileUrl:q.profile};
 if(r.wins+r.losses>r.gp)fail("W+L > GP for "+q.name);
 return r;
}
function sourceTable(rows,expected,label){
 if(!Array.isArray(rows)||rows.length<2)fail(label+" table missing");
 const actual=rows[0].cells;
 if(actual.length!==expected.length||actual.some((v,i)=>v!==expected[i]))
  fail(label+" header schema changed: "+JSON.stringify(actual));
 const data=rows.slice(1).filter(x=>x.cells.some(Boolean));
 if(!data.length||data.length>90)fail(label+" unsafe row count");
 data.forEach((r,i)=>{if(r.cells.length!==expected.length)fail(label+" row "+i+" has "+r.cells.length+" cells")});
 return data;
}
function uniqueById(rows,label){
 const ids=rows.map(x=>x.htoPlayerId).filter(Boolean);
 if(new Set(ids).size!==ids.length)fail(label+" contains duplicate official player IDs");
}
async function inspect(page,url,kind){
 const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});
 if(!response||response.status()!==200)fail(kind+" HTTP unavailable");
 const r=await page.evaluate(()=>{
   const normalize=x=>String(x||"").replace(/\s+/g," ").trim();
   return{title:document.title,
    tables:[...document.querySelectorAll("table")].map(t=>
      [...t.querySelectorAll("tr")].map(tr=>{
        const cells=[...tr.querySelectorAll("th,td")];
        const link=cells[1]?.querySelector("a[href*='playerID']")||null;
        const match=link?.getAttribute("href")?.match(/[?&]playerID=(\d+)/i);
        return{cells:cells.map(c=>normalize(c.innerText||c.textContent)),playerId:match?match[1]:null,
          name:normalize(cells[1]?.innerText||cells[1]?.textContent)};
      })).filter(r=>r.length>1)
   };
 });
 if(!r.title.includes(GAME_SEASON))fail(kind+" changed to another season: "+r.title);
 return r;
}
(async()=>{
 const browser=await puppeteer.launch({executablePath:BROWSER,headless:true,args:["--no-sandbox","--disable-gpu"]});
 try{
  const page=await browser.newPage();await page.setViewport({width:1440,height:850});
  const rosterDoc=await inspect(page,ROOT+"roster","roster");
  const statsDoc=await inspect(page,ROOT+"stats","stats");
  function pick(doc,cols,label){
   const t=doc.tables.find(rows=>rows[0].cells.length===cols.length&&
     rows[0].cells.every((c,i)=>c===cols[i]));
   return sourceTable(t,cols,label);
  }
  const roster=pick(rosterDoc,COLS.roster,"roster").map(rosterRow);
  const allSkaterRows=pick(statsDoc,COLS.skaters,"skaters");
  const allGoalieRows=pick(statsDoc,COLS.goalies,"goalies");
  const summaryRows=rows=>rows.filter(x=>x.name==="Team Stats");
  if(summaryRows(allSkaterRows).length!==1||summaryRows(allGoalieRows).length!==1)
    fail("Official team aggregate row missing or repeated");
  const teamSkaters=skaterRow(summaryRows(allSkaterRows)[0],"team total");
  const teamGoalies=goalieRow(summaryRows(allGoalieRows)[0],"team total");
  const skaters=allSkaterRows.filter(x=>x.name!=="Team Stats").map(skaterRow);
  const goalies=allGoalieRows.filter(x=>x.name!=="Team Stats").map(goalieRow);
  uniqueById(roster,"roster");uniqueById(skaters,"skaters");uniqueById(goalies,"goalies");
  const totalSkater=skaters.reduce((a,r)=>a+r.points,0);
  if(teamSkaters.points!==totalSkater||teamSkaters.goals!==skaters.reduce((a,r)=>a+r.goals,0)||
     teamSkaters.assists!==skaters.reduce((a,r)=>a+r.assists,0))fail("Named skater totals disagree with official aggregate");
  if(teamGoalies.goalsAgainst!==goalies.reduce((a,r)=>a+r.goalsAgainst,0))
    fail("Named goalie goals against disagree with official aggregate");
  const captureTime=new Date().toISOString();
  const saved={
   schema:TARGET_SCHEMA,product:"BruTTech HockeyOS",team:"Brave H.C.",
   season:GAME_SEASON,seasonKey:"Winter_2026/2027",scope:"PUBLIC_HTO_CURRENT_SEASON",
   sourceAuthority:"HomeTeamsONLINE public Brave H.C. team site",sourceReadOnly:true,
   sourceCapturedAt:captureTime,officialRecordEdited:false,publishedAs:"DATED_PUBLIC_SNAPSHOT_NOT_LIVE",
   sources:{roster:ROOT+"roster",stats:ROOT+"stats"},
   counts:{roster:roster.length,skaters:skaters.length,goalies:goalies.length,skaterPoints:totalSkater,
    rosterWithoutPlayerId:roster.filter(x=>!x.htoPlayerId).length,
    skatersWithoutPlayerId:skaters.filter(x=>!x.htoPlayerId).length,
    goaliesWithoutPlayerId:goalies.filter(x=>!x.htoPlayerId).length,
    sourceSkaterRowsIncludingTeamTotal:allSkaterRows.length,
    sourceGoalieRowsIncludingTeamTotal:allGoalieRows.length},
   fieldNotes:{teamTotals:"Each HTO statistics table includes one Team Stats aggregate row; it is NOT a player and must never appear in player leaderboards.",
    ppg:"Official source PPG = power-play goals, not points per game.",
    ptsPerGame:"Points-per-game value is read directly from HTO display; no replacement or inference.",
    playerId:"Only public HTO profile playerID links are allowed. Missing IDs remain null.",
    zeroAndAbsent:"A recorded 0 is an actual published zero. An absent field must not be replaced by zero.",
    crossRole:"The same person may appear as skater and goalie. Do not combine official totals."},
   teamTotals:{skaters:teamSkaters,goalies:teamGoalies},
   roster,skaters,goalies
  };
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(saved,null,2)+"\n","utf8");
  console.log(JSON.stringify({status:"CAPTURED_READ_ONLY",file:out,asOf:captureTime,
    counts:saved.counts,previewSkater:skaters.slice(0,2).map(x=>({name:x.name,id:x.htoPlayerId,points:x.points})),
    previewGoalie:goalies.slice(0,2).map(x=>({name:x.name,id:x.htoPlayerId,gp:x.gp})),
    verifiedSources:saved.sources},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
