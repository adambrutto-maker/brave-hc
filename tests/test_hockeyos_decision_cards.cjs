"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const cards=require("../widgets/hockeyos-decision-cards.js");
const root=path.resolve(__dirname,"../widgets");
const source=JSON.parse(fs.readFileSync(path.join(root,"league-intelligence.json"),"utf8"));
const before=JSON.stringify(source);
const adults=cards.qualified(source);
assert.equal(adults.length,22,"only current adult Sunday club records admitted");
assert.equal(new Set(adults.map(x=>x.sourceTeamId)).size,22);
assert.ok(adults.every(x=>!x.divisionNow.includes("VAHL")));
const braves=cards.snapshot(source,"Braves HC");
assert.equal(braves.gp,4);
assert.equal(braves.record,"0–4–0");
assert.equal(braves.offense,1.5);
assert.equal(braves.against,4.75);
assert.equal(braves.context,36.5);
assert.ok(braves.limited);
assert.ok(braves.sampleTeams>0);
assert.equal(braves.division,"The Cristillo Division");
for(const t of adults){
 const s=cards.snapshot(source,t.leagueName);
 assert.equal(s.sourceTeamId,t.sourceTeamId);
 assert.equal(s.gp,t.record.gp);
 assert.equal(s.gf,t.record.gf);
 assert.equal(s.ga,t.record.ga);
 if(s.gp)assert.equal(s.offense,s.gf/s.gp);
}
assert.equal(JSON.stringify(source),before,"source never mutated");
assert.throws(()=>cards.snapshot(source,"VAHL Division"),/not|missing/i);
assert.throws(()=>cards.snapshot(source,"Nonexistent Team"),/missing/i);
assert.throws(()=>cards.qualified({...source,status:"FORGED"}),/Verified/);
assert.throws(()=>cards.qualified({...source,teams:[adults[0],adults[0]]}),/identity/);
const empty={...source,teams:[{...adults[0],record:{...adults[0].record,gp:0,gf:0,ga:0}}]};
const zero=cards.snapshot(empty,adults[0].leagueName);
assert.equal(zero.offense,null);
assert.equal(zero.against,null);
function fake(shape,score,label){
 const sm=label.split("|");
 return {
  getAttribute:k=>k==="data-shape"?shape:null,
  querySelectorAll:()=>sm.map(textContent=>({textContent})),
  querySelector:()=>({textContent:score})
 };
}
const tested=cards.layoutSnapshot(fake("4-4-6-8","2.423",
 "17 actual games link teams within these research divisions|11 possible assignment changes"));
assert.deepEqual(tested,{
 sizes:[4,4,6,8],spread:2.423,verifiedGames:17,possibleMoves:11
});
assert.equal(cards.layoutSnapshot(fake("5-5-6-6","bad","unmatched")) ,null);
for(const name of ["league-intelligence.html","division-fit-lab.html"]){
 const page=fs.readFileSync(path.join(root,name),"utf8");
 assert.match(page,/hockeyos-decision-cards\.js\?v=/);
 assert.match(page,/hockeyos-decision-cards\.css\?v=/);
 const simple=page.indexOf("hockeyos-simple-view.js"),newSrc=page.indexOf("hockeyos-decision-cards.js");
 assert.ok(simple>=0&&newSrc>simple,"decision cards must follow preserved simple UI");
}
console.log("HOCKEYOS_DECISION_CARDS_SOURCE_PASS adult=22 active teams=22 no mutation");
