"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const dir=path.resolve(__dirname,"../widgets");
const script=fs.readFileSync(path.join(dir,"hockeyos-simple-view.js"),"utf8");
const style=fs.readFileSync(path.join(dir,"hockeyos-simple-view.css"),"utf8");
const league=fs.readFileSync(path.join(dir,"league-intelligence.html"),"utf8");
const division=fs.readFileSync(path.join(dir,"division-fit-lab.html"),"utf8");
for(const id of ["copy-scout-brief","scout-copy-status","copy-roster-plan","roster-copy-status"]){
 assert.equal((league.match(new RegExp('id="'+id+'"',"g"))||[]).length,1,
  id+" must have exactly one authoritative element");
 assert.match(script,new RegExp('"'+id+'"'),id+" must be referenced by progressive actions");
}
assert.match(script,/quickActions\.id = "os-scout-actions"/);
assert.match(script,/whatsapp\.textContent = "Copy scouting brief for WhatsApp"/);
assert.match(script,/whatsapp\.classList\.add\("os-primary-action"\)/);
assert.match(script,/matchup\.classList\.add\("os-secondary-action"\)/);
assert.match(script,/\$\("roster-player-priorities"\)\?\.after\(quickActions\)/);
assert.match(script,/Copy only—nothing is sent/);
assert.match(style,/\.os-action-buttons/);
assert.match(style,/@media\(max-width:500px\)/);
assert.match(league,/hockeyos-simple-view\.js\?v=20261027-a2/);
assert.match(division,/hockeyos-simple-view\.js\?v=20261027-a2/);
assert.doesNotMatch(script,/\.click\(\)/,"UI reparent must not auto-trigger outbound/copy actions");
console.log("HOCKEYOS_GAMEDAY_ACTIONS_CONTRACT_PASS existing authoritative handlers and mobile layout");
