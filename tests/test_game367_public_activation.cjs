'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../widgets');
const page=fs.readFileSync(path.join(root,'game-centre-next.html'),'utf8');
const js=fs.readFileSync(path.join(root,'game-centre-next.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'game-centre-lineup-public.json')));
const schedule=JSON.parse(fs.readFileSync(path.join(root,'countdown.json')));
const allowedPdfPath=p=>/^\.\/assets\/lineups\/[\w-]+\.pdf$/.test(p);
const f=vm.runInNewContext('('+js.slice(js.indexOf('function publicWorkingEntry('),js.indexOf('let lineupLoadVersion=')).trim()+')',{allowedPdfPath});
const e=manifest.publishedWorkingCard;
const next=schedule.games.find(g=>g.gameDate==='2026-11-22');

test('real public Game Centre explicitly enables only the gated lineup card display',()=>{
 assert.match(page,/<main[^>]+id="game-centre"[^>]+data-public-working-lineup="1"/);
 assert.match(js,/root\.dataset\.publicWorkingLineup==="1"\?publicWorkingEntry/);
 assert.ok(next,'source countdown fixture absent');
 assert.equal(next.id,3375686);
 assert.equal(e.fixtureId,next.id);
 assert.equal(e.puckDropUTC,next.puckDropUTC);
 assert.equal(e.expiresAt,next.rolloverAtUTC);
 assert.equal(f(manifest,next,Date.parse(e.publishedAt)+1000).fixtureId,3375686);
 assert.equal(f(manifest,{...next,id:3375685},Date.parse(e.publishedAt)+1000),null);
});
test('manager approval is not league authority and historical card remains retained',()=>{
 assert.equal(manifest.approved,null);
 assert.equal(manifest.status,'BLANK_PENDING_APPROVAL');
 assert.equal(e.managerLineupStatus,'FINAL_TEAM_LINEUP');
 assert.ok(fs.existsSync(path.join(root,'assets/lineups/game-366-2026-11-15-working-r5.lineup.json')));
});
