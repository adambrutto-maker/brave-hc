/**
 * HockeyOS V21 — read-only public game results and schedule capture.
 * Facts-only, independently authored extractor; not HTO source code.
 * Never authenticates, posts, mutates HTO, or stores HTO HTML, CSS or images.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const OUT=process.env.HOCKEYOS_V21_OUTPUT||path.resolve(__dirname,"../widgets/hockeyos-hto-games-v21.json");
const BROWSER=process.env.HOCKEYOS_BROWSER_PATH||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=";
const TEAM="Brave H.C.",SEASON="Winter 2026/2027",SCHEMA="bruttech-hockeyos-hto-games/v21";
const MONTHS=["2026-09","2026-10","2026-11","2026-12","2027-01","2027-02","2027-03","2027-04"];
const mm={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
const fail=m=>{throw Error("V21 SOURCE HOLD: "+m)};
const gameIdFromHref=href=>{
 if(!href)return null;
 const raw=String(href);
 const match=raw.match(/[?&]gameID=(\d{6,9})/i);
 return match?match[1]:null;
};
const gameUrl=(id,kind)=>BASE+kind+"&sportsHQ=BRAVESHOCKEY&gameID="+id;
const integer=(value,where)=>{
 if(!/^\d+$/.test(String(value)))fail(where+" invalid integer value "+JSON.stringify(value));
 return Number(value);
};
function asTime(t){
 const m=String(t).trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
 if(!m)fail("Unknown time format: "+t);
 const h=Number(m[1]),minutes=Number(m[2]);if(h<1||h>12||minutes>59)fail("Invalid clock");
 return String((h%12)+(m[3].toUpperCase()==="PM"?12:0)).padStart(2,"0")+":"+m[2];
}
function metadata(details,id){
 const lines=details.lines;
 const pos=lines.findIndex(s=>/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+20\d{2}/.test(s)&&s.includes("•"));
 if(pos<1)fail("No dated official game header "+id);
 const head=lines[pos-1],raw=lines[pos];
 if(!head||!head.includes(" vs. ")||!head.includes(TEAM))fail("No verified teams in HTO header "+id);
 const hr=head.match(/^(.*?)\s+vs\.\s+(.*?)$/),club=hr&&[hr[1],hr[2]].filter(x=>x.trim()===TEAM);
 if(!hr||club.length!==1)fail("Unexpected header teams "+id);
 const opponent=hr[1].trim()===TEAM?hr[2].trim():hr[1].trim();
 if(!opponent||opponent.length>130)fail("Invalid opponent name "+id);
 const m=raw.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s*(20\d{2})\s*•\s*(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)\s*•\s*(.+)$/);
 if(!m)fail("Unexpected HTO date and venue format "+id+": "+raw);
 const iso=m[4]+"-"+String(mm[m[2]]).padStart(2,"0")+"-"+m[3].padStart(2,"0");
 const date=new Date(iso+"T12:00:00Z");
 if(Number.isNaN(date.valueOf())||date.toISOString().slice(0,10)!==iso)fail("Invalid source date");
 const actualWeekday=date.toLocaleDateString("en-US",{timeZone:"UTC",weekday:"long"});
 if(actualWeekday!==m[1])fail("Date/weekday disagree for game "+id);
 const location=m[7].trim();if(!location||location.length>160)fail("Invalid rink name");
 return{date:iso,weekday:m[1],timeLocal:asTime(m[5]),endTimeLocal:asTime(m[6]),
  rink:location,opponent,sourceHeader:head};
}
async function load(page,url,context){
 const r=await page.goto(url,{waitUntil:"domcontentloaded",timeout:28000});
 if(!r||r.status()!==200)fail(context+" page HTTP unavailable");
 return page.evaluate(()=>{
  const clean=v=>String(v??"").replace(/\s+/g," ").trim();
  const lines=document.body.innerText.split(/\r?\n/).map(clean).filter(Boolean);
  const tables=[...document.querySelectorAll("table")].map(t=>
   [...t.querySelectorAll("tr")].map(tr=>[...tr.querySelectorAll("td,th")].map(el=>clean(el.innerText||el.textContent))))
   .filter(x=>x.length>1);
  return{title:document.title,lines,tables,
   gameAnchors:[...document.querySelectorAll("a[href*='gameID']")].map(a=>({
    text:clean(a.innerText||a.textContent),href:a.getAttribute("href"),cls:String(a.className||"")}))
  };
 });
}
function scoreboard(details,id){
 const candidates=details.tables.filter(rows=>rows.length===3&&rows[0].length>=4&&
   rows[0][0].toUpperCase()==="REGULAR SEASON"&&rows[0][rows[0].length-1]==="F");
 if(candidates.length!==1)fail("Expected one official final scoreboard "+id+" got "+candidates.length);
 const rows=candidates[0];
 if(rows[0].length!==rows[1].length||rows[0].length!==rows[2].length)fail("Scoreboard shape mismatch "+id);
 const teamRow=rows.slice(1).find(x=>x[0]===TEAM),other=rows.slice(1).find(x=>x[0]!==TEAM);
 if(!teamRow||!other||other[0].length<1)fail("Club/opponent scoreboard mismatch "+id);
 const periods=rows[0].slice(1,-1),seen=new Set(periods);
 if(seen.size!==periods.length||periods.length<3||periods.length>6)fail("Invalid period headings "+id);
 const parseRow=(row,kind)=>{
  const values=row.slice(1).map((v,i)=>integer(v,id+" "+kind+" "+i));
  return{final:values[values.length-1],byPeriod:values.slice(0,-1)};
 };
 const club=parseRow(teamRow,"club"),opponent=parseRow(other,"opponent");
 const parity=club.byPeriod.reduce((a,b)=>a+b,0)===club.final&&
  opponent.byPeriod.reduce((a,b)=>a+b,0)===opponent.final;
 return{opponentName:other[0],club,opponent,periods,periodSumMatchesFinal:parity,
  sourceGameType:"REGULAR SEASON"};
}
(async()=>{
 const browser=await puppeteer.launch({executablePath:BROWSER,headless:true,args:["--no-sandbox","--disable-gpu"]});
 try{
  const page=await browser.newPage(),schedule=new Map(),scoreIds=new Set(),observedMonths=[];
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  const officialScores=await load(page,BASE+"scores","current-season Scores");
  if(!officialScores.title.includes(SEASON))fail("Scores season changed");
  for(const a of officialScores.gameAnchors){
   if(!/[?&]p=boxscore(?:&|$)/i.test(a.href||""))continue;
   const id=gameIdFromHref(a.href);if(!id)fail("Score sheet missing HTO gameID");
   if(scoreIds.has(id))fail("Duplicate official score ID");
   scoreIds.add(id);
  }
  if(scoreIds.size<1||scoreIds.size>60)fail("Unsafe completed game inventory: "+scoreIds.size);
  for(const month of MONTHS){
   const u=BASE+"schedule&d="+month.replace("-","")+"01";
   const doc=await load(page,u,"calendar "+month);
   if(!doc.title.includes(SEASON))fail("Calendar switched season "+month);
   let count=0;
   for(const a of doc.gameAnchors){
    const cls=a.cls.split(/\s+/);
    if(!cls.includes("game")||!cls.includes("type0"))continue; // Explicitly exclude birthday/event records
    const id=gameIdFromHref(a.href),kind=/[?&]p=boxscore(?:&|$)/i.test(a.href)?"boxscore":
      /[?&]p=preview(?:&|$)/i.test(a.href)?"preview":null;
    if(!id||!kind)fail("Unexpected calendar game link "+month);
    if(schedule.has(id))fail("Calendar repeats same game ID across months");
    schedule.set(id,{id,kind,month,calendarSummary:a.text});
    count++;
   }
   observedMonths.push({month,gameReferences:count,sourceUrl:u});
  }
  const scoreSorted=[...scoreIds].sort(),calendarScore=[...schedule.values()].filter(x=>x.kind==="boxscore").map(x=>x.id).sort();
  if(JSON.stringify(scoreSorted)!==JSON.stringify(calendarScore))
   fail("HTO Scores and calendar gameID coverage disagree; no name/date guesses");
  const confirmed=[],scheduled=[];
  for(const event of schedule.values()){
   if(event.kind==="boxscore"&&!scoreIds.has(event.id))fail("Calendar completed game absent from scores");
   if(event.kind==="preview"&&scoreIds.has(event.id))fail("Scheduled game present in completed source");
   const details=await load(page,gameUrl(event.id,event.kind),"game "+event.id);
   if(details.title!==(event.kind==="boxscore"?"Box Score":"Game Preview"))
    fail("HTO detail type mismatch "+event.id);
   const meta=metadata(details,event.id);
   if(meta.date.slice(0,7)!==event.month)fail("HTO game ID linked to wrong month "+event.id);
   const common={htoGameId:event.id,season:SEASON,date:meta.date,weekday:meta.weekday,
     timeLocal:meta.timeLocal,endTimeLocal:meta.endTimeLocal,rink:meta.rink,
     club:TEAM,opponent:meta.opponent,sourceUrl:gameUrl(event.id,event.kind),
     sourceCalendarMonth:event.month,sourceDetails:meta.sourceHeader};
   if(event.kind==="boxscore"){
    const s=scoreboard(details,event.id);
    if(s.opponentName!==meta.opponent)fail("Scoreboard opponent disagrees with header "+event.id);
    const result=s.club.final>s.opponent.final?"W":s.club.final<s.opponent.final?"L":"T";
    confirmed.push({...common,status:"COMPLETED_HTO_BOX_SCORE",result,
      score:{club:s.club.final,opponent:s.opponent.final,periods:s.periods,
        clubPeriods:s.club.byPeriod,opponentPeriods:s.opponent.byPeriod,
        periodSumMatchesFinal:s.periodSumMatchesFinal},
      gameType:s.sourceGameType});
   }else{
    scheduled.push({...common,status:"SCHEDULED_HTO_PREVIEW_AT_CAPTURE",
      result:null,score:null,gameType:"REGULAR SEASON"});
   }
  }
  confirmed.sort((a,b)=>a.date.localeCompare(b.date)||a.timeLocal.localeCompare(b.timeLocal));
  scheduled.sort((a,b)=>a.date.localeCompare(b.date)||a.timeLocal.localeCompare(b.timeLocal));
  const results={wins:confirmed.filter(x=>x.result==="W").length,
    losses:confirmed.filter(x=>x.result==="L").length,
    ties:confirmed.filter(x=>x.result==="T").length};
  const prev=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../widgets/hockeyos-hto-current-v20.json"),"utf8"));
  if(prev.schema!=="bruttech-hockeyos-hto-public-current/v20")fail("No verified V20 aggregate baseline");
  if(prev.teamTotals.skaters.gp!==confirmed.length||prev.teamTotals.goalies.gp!==confirmed.length||
     prev.teamTotals.goalies.wins!==results.wins||prev.teamTotals.goalies.losses!==results.losses)
    fail("HTO season stat GP/record does not reconcile with current completed games");
  const asOf=new Date().toISOString();
  const output={
   schema:SCHEMA,team:TEAM,season:SEASON,seasonKey:"Winter_2026/2027",
   sourceAuthority:"HomeTeamsONLINE public Brave H.C. game pages",
   scope:"HTO_CURRENT_SEASON_SOURCE_VERIFIED",sourceReadOnly:true,
   sourceCapturedAt:asOf,officialRecordEdited:false,
   status:"DATED_PUBLIC_SNAPSHOT_NOT_LIVE",
   sources:{schedule:BASE+"schedule",scores:BASE+"scores"},
   coverage:{months:observedMonths,spanFirstMonth:MONTHS[0],spanLastMonth:MONTHS[MONTHS.length-1],
     lastSourceVerifiedAt:asOf,
     coverageNote:"Only source-linked HTO regular-season fixtures are included; unlisted future league assignments are not confirmed."},
   counts:{completed:confirmed.length,scheduledAtCapture:scheduled.length,
     totalVerifiedGames:confirmed.length+scheduled.length,results,
     completedWithPeriodSumMismatch:confirmed.filter(x=>!x.score.periodSumMatchesFinal).length},
   games:[...confirmed,...scheduled].sort((a,b)=>a.date.localeCompare(b.date)||a.timeLocal.localeCompare(b.timeLocal)),
   reconciliation:{htoScoresIdsExactlyMatchCompletedCalendar:true,
     teamRecordMatchesHTOStatsSnapshot:true,
     unrelatedCalendarEventsExcluded:true,
     sourceGameIdsOnly:true,
     inferredHomeAway:false,
     futureSvhlOnlyFixturesAreNotMerged:true}
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(output,null,2)+"\n");
  console.log(JSON.stringify({status:"CAPTURED_READ_ONLY",path:OUT,
    counts:output.counts,coverage:observedMonths.map(x=>({month:x.month,count:x.gameReferences})),
    games:output.games.map(x=>({id:x.htoGameId,date:x.date,opponent:x.opponent,status:x.status,score:x.score&&x.score.club+"-"+x.score.opponent,rink:x.rink})),sourceReadOnly:true},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(String(e.stack||e));process.exitCode=1});
