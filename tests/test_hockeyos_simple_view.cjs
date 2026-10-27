"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../widgets");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
const league=read("league-intelligence.html"),divisions=read("division-fit-lab.html");
const shell=read("hockeyos-simple-view.js"),css=read("hockeyos-simple-view.css");
const oldLeague=read("league-intelligence.js");
const oldDivision=read("division-layout-lab.js");
for(const [page,html] of [["league",league],["division",divisions]]){
  assert.match(html,/hockeyos-simple-view\.css\?v=/,page+" links simplified styles");
  assert.match(html,/hockeyos-simple-view\.js\?v=/,page+" links simplified behavior");
  assert.ok(html.indexOf("hockeyos-simple-view.js")>html.indexOf("league-"),"progressive layer loads after data modules");
}
const dataIDs=[
 "team-filter","profile-title","roster-player-priorities","copy-roster-plan","league-rows",
 "roster-construction-metrics","roster-competition-bridge","scout-profile-summary",
 "history-bridge-cards","archive-divisions","movement-rows","fixture-rows"
];
for(const id of dataIDs)assert.ok(league.includes('id="'+id+'"'),"original league data still exists: "+id);
for(const id of [
 "source-metrics","cross-division-links","layout-design-options","layout-proposal-groups",
 "layout-total-preview","layout-refinement-swaps","scenario-options","weekly-team-history",
 "gate-summary","historical-metrics","copy-research"]){
 assert.ok(divisions.includes('id="'+id+'"'),"original division data still exists: "+id);
}
assert.match(shell,/new MutationObserver\(syncTeam\)/);
assert.match(shell,/original\.dispatchEvent\(new Event\("change", \{bubbles:true\}\)\)/);
assert.match(shell,/new MutationObserver\(enhanceThreatCards\)/);
assert.match(shell,/document\.body\.classList\.toggle\("os-all-data", full\)/);
assert.match(shell,/for \(const d of expandable\) d\.open=full/);
assert.match(shell,/profile\.after\(vault\)/);
assert.match(shell,/gate\?\.after\(vault\)/);
assert.match(css,/max-width:760px/);
assert.match(css,/:focus-visible/);
assert.match(oldLeague,/q\("copy-roster-plan"\)\.addEventListener/);
assert.match(oldLeague,/q\("team-filter"\)\.addEventListener/);
assert.match(oldDivision,/q\("layout-copy"\)\.addEventListener/);
console.log("HOCKEYOS_SIMPLE_FULL_UX_SOURCE_CONTRACT_PASS",dataIDs.length+10,"source ID checks");
