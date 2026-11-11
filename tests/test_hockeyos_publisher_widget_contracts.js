'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const widgets=path.resolve(__dirname,'../widgets');
const file=n=>fs.readFileSync(path.join(widgets,n),'utf8');
const json=n=>JSON.parse(file(n));
test('countdown page consumes the exact published JSON path and compatible schema',()=>{
 const html=file('countdown.html'), data=json('countdown.json');
 assert.match(html,/fetch\("\.\/countdown\.json"/);
 assert.equal(data.schema,'brave-hc-upcoming-countdown/v1');
 assert.equal(data.timezone,'America/Toronto');
 assert.ok(Array.isArray(data.games)&&data.games.length>0);
 assert.ok(data.games.every(g=>Number.isInteger(g.id)&&g.puckDropUTC&&g.eventURL));
});
test('projection page consumes canonical model and preserves incomplete model status',()=>{
 const html=file('projection-v2.html'),data=json('projection.json');
 assert.match(html,/fetch\("\.\/projection\.json"/);
 assert.equal(data.schema,'brave-hc-workbook-projection/v1');
 assert.equal(data.sourceInputs.htoRecordedTeamGP,data.sourceInputs.verifiedHTOBoxscoreGP);
 assert.equal(data.workbookSourceHash.length,64);
 assert.equal(data.modelCurrent,false,'Production model is still governed as nonfinal');
 assert.equal(data.publicationStatus,'HTO_MODEL_RECONCILIATION_PENDING');
});
test('standings and projection references agree on JSON file names',()=>{
 const html=file('standings-v2.html'),data=json('standings.json');
 assert.match(html,/fetch\("\.\/standings\.json"/);
 assert.match(html,/fetch\("\.\/projection\.json"/);
 assert.equal(data.schema,'brave-hc-svhl-standings/v1');
 assert.equal(data.sourceType,'SVHL_PUBLIC_LEAGUE_READBACK');
 assert.equal(data.teams.length,8);
});
