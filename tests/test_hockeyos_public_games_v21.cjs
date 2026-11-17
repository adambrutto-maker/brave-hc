/* HockeyOS V21: public schedule/score source authority and negative safety tests. */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),
 path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"../widgets");
const data=JSON.parse(fs.readFileSync(path.join(root,"hockeyos-hto-games-v21.json"),"utf8"));
const scope={window:{},document:{addEventListener:()=>{}},console};
vm.runInNewContext(fs.readFileSync(path.join(root,"hockeyos-native-games-v21.js"),"utf8"),scope,
 {filename:"hockeyos-native-games-v21.js"});
const code=scope.window.HockeyOSGamesV21._test;
const copy=()=>JSON.parse(JSON.stringify(data));
const hasId=id=>data.games.find(g=>g.htoGameId===String(id));
test("independent public HTO game snapshot passes all identity and source controls",()=>{
 const before=JSON.stringify(data);
 assert.equal(code.validate(data),data);
 assert.equal(JSON.stringify(data),before);
 assert.equal(data.sourceReadOnly,true);assert.equal(data.officialRecordEdited,false);
});
test("all eight source completed games and one scheduled preview are distinct HTO IDs",()=>{
 assert.equal(data.counts.completed,8);assert.equal(data.counts.scheduledAtCapture,1);
 assert.equal(data.games.length,9);assert.equal(new Set(data.games.map(g=>g.htoGameId)).size,9);
 assert.equal(data.games.filter(g=>g.status==="COMPLETED_HTO_BOX_SCORE").length,8);
 assert.equal(data.games.filter(g=>g.status==="SCHEDULED_HTO_PREVIEW_AT_CAPTURE").length,1);
});
test("current-season authoritative record 1–7–0 matches the published HTO stats baseline",()=>{
 assert.equal(data.counts.results.wins,1);assert.equal(data.counts.results.losses,7);
 assert.equal(data.counts.results.ties,0);
 const w=data.games.filter(g=>g.result==="W");assert.equal(w.length,1);
 assert.equal(w[0].htoGameId,"3375682");assert.equal(w[0].opponent,"Big Bastones");
 assert.equal(w[0].score.club,6);assert.equal(w[0].score.opponent,4);
});
test("all periods sum to official finals, including overtime labels where present",()=>{
 assert.equal(data.counts.completedWithPeriodSumMismatch,0);
 for(const g of data.games.filter(g=>g.score)){
  assert.equal(g.score.clubPeriods.reduce((a,b)=>a+b,0),g.score.club);
  assert.equal(g.score.opponentPeriods.reduce((a,b)=>a+b,0),g.score.opponent);
  assert.equal(g.score.periods.length,g.score.clubPeriods.length);
  assert.equal(g.score.periods.length,g.score.opponentPeriods.length);
 }
});
test("direct HTO ID #3375686 is a Nov 22 game preview, not a fabricated final",()=>{
 const g=hasId(3375686);
 assert.equal(g.date,"2026-11-22");assert.equal(g.timeLocal,"20:00");
 assert.equal(g.opponent,"Dateline Predators");assert.equal(g.rink,"Vaughan Sports Village - B Rink");
 assert.equal(g.result,null);assert.equal(g.score,null);
 assert.match(g.sourceUrl,/p=preview/);
});
test("HTO calendar covers 8 dated source months with explicit evidence counts",()=>{
 assert.equal(data.coverage.months.length,8);
 assert.deepEqual(data.coverage.months.map(x=>x.gameReferences),[2,3,4,0,0,0,0,0]);
 assert.equal(data.coverage.months.reduce((a,x)=>a+x.gameReferences,0),9);
 assert.equal(data.reconciliation.unrelatedCalendarEventsExcluded,true);
});
test("game detail routes require the exact source ID shape",()=>{
 const mod=scope.window.HockeyOSGamesV21;
 assert.equal(mod.isGameRoute("team-game-3375685"),true);
 assert.equal(mod.isGameRoute("team-game-1"),false);
 assert.equal(mod.isGameRoute("team-game-3375685-evil"),false);
 assert.equal(mod.isGameRoute("team-game-3375685?x"),false);
});
test("public game IDs are matched, never guessed from opponent names",()=>{
 const first=hasId(3356177),future=hasId(3375686);
 assert.equal(first.opponent,"Dateline Predators");assert.equal(first.status,"COMPLETED_HTO_BOX_SCORE");
 assert.equal(future.opponent,"Dateline Predators");
 assert.notEqual(first.htoGameId,future.htoGameId);
 assert.ok(data.reconciliation.futureSvhlOnlyFixturesAreNotMerged);
});
test("tampered source URL or forged game ID triggers validation hold",()=>{
 const a=copy();a.games[0].sourceUrl="https://hostile.example/game";
 assert.throws(()=>code.validate(a),/HTO source URL/);
 const b=copy();b.games[0].htoGameId="3356177<script>";
 assert.throws(()=>code.validate(b),/invalid game ID|Duplicate/);
});
test("a duplicate game ID never enters the calendar or scores",()=>{
 const a=copy();a.games[1].htoGameId=a.games[0].htoGameId;
 assert.throws(()=>code.validate(a),/Duplicate or invalid game ID/);
});
test("completed scoreboard cannot be silently converted into a future game",()=>{
 const a=copy();const old=a.games.find(g=>g.status==="COMPLETED_HTO_BOX_SCORE");
 old.status="SCHEDULED_HTO_PREVIEW_AT_CAPTURE";
 assert.throws(()=>code.validate(a),/HTO source URL|Future fixture/);
});
test("future game must not display even a zero result",()=>{
 const a=copy();a.games.find(g=>g.status==="SCHEDULED_HTO_PREVIEW_AT_CAPTURE").score={club:0,opponent:0};
 assert.throws(()=>code.validate(a),/Future fixture cannot inherit a score/);
});
test("result mismatch with official score remains held",()=>{
 const a=copy();a.games.find(g=>g.status==="COMPLETED_HTO_BOX_SCORE").result="W";
 assert.throws(()=>code.validate(a),/Score\/outcome disagreement/);
});
test("tied or edited period totals must be explicitly source-validated",()=>{
 const a=copy();a.games.find(g=>g.status==="COMPLETED_HTO_BOX_SCORE").score.clubPeriods[0]+=1;
 assert.throws(()=>code.validate(a),/Period parity status false/);
});
test("source counts cannot be padded by birthdays or team aggregates",()=>{
 const a=copy();a.counts.totalVerifiedGames++;
 assert.throws(()=>code.validate(a),/Source counts/);
 const b=copy();b.coverage.months[2].gameReferences+=1;
 assert.throws(()=>code.validate(b),/Source counts/);
});
test("missing period arrays or invalid numerical values are rejected",()=>{
 const a=copy();a.games[0].score.clubPeriods=null;
 assert.throws(()=>code.validate(a),/scoreboard/);
 const b=copy();b.games[0].score.opponent=-3;
 assert.throws(()=>code.validate(b),/Non-integer/);
});
test("team-local game clock is formatted without inventing a timezone",()=>{
 assert.equal(code.niceTime("20:00"),"8:00 PM");
 assert.equal(code.niceTime("19:15"),"7:15 PM");
 assert.equal(code.niceTime("00:00"),"12:00 AM");
 assert.equal(code.validTime("25:90"),false);
});
test("invalid source date and opponent fields fail closed",()=>{
 const a=copy();a.games[0].date="2026-02-31";
 assert.throws(()=>code.validate(a),/Unverified game data/);
 const b=copy();b.games[0].opponent="<img src=x onerror=alert(1)>";
 // Text is escaped in rendering, but source must not gain a new HTO identity.
 assert.equal(b.games[0].opponent.includes("<"),true);
 assert.throws(()=>code.validate(b),/Unverified game data/);
});
test("calendar month filters retain only source-listed entries and statuses",()=>{
 code.setMonth("2026-11");const ui=code.getState();
 assert.equal(ui.month,"2026-11");
 const visible=code.filtersSchedule(data);assert.equal(visible.length,4);
 assert.equal(visible.some(g=>g.htoGameId==="3375686"),true);
 assert.equal(visible.some(g=>g.htoGameId==="3356177"),false);
});
