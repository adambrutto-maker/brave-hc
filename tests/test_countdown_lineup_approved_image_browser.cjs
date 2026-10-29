'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const crypto=require('node:crypto'),zlib=require('node:zlib');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),career=require('../widgets/player-career-insights.json');
function crc32(buf){let v=0xffffffff;for(const b of buf){v^=b;for(let k=0;k<8;k++)v=(v>>>1)^((v&1)?0xedb88320:0)}return (v^0xffffffff)>>>0;}
function chunk(type,data){const tag=Buffer.from(type),size=Buffer.alloc(4),c=Buffer.alloc(4);size.writeUInt32BE(data.length);c.writeUInt32BE(crc32(Buffer.concat([tag,data])));return Buffer.concat([size,tag,data,c]);}
function syntheticPng(){
 const w=500,h=300,ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 const line=Buffer.alloc(1+w*4);for(let x=0;x<w;x++){const i=1+x*4;line[i]=17;line[i+1]=45;line[i+2]=70;line[i+3]=255;}
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(Buffer.concat(Array.from({length:h},()=>line)))),chunk('IEND',Buffer.alloc(0))]);
}
const png=syntheticPng(),sha=crypto.createHash('sha256').update(png).digest('hex');
const game={id:900001,gameDate:'2099-10-31',puckDropUTC:'2099-11-01T01:15:00Z',rolloverAtUTC:'2099-11-01T02:15:00Z',opponent:'Fictional QA Opponent',rink:'Fictional QA Rink'};
const countdown={schema:'brave-hc-upcoming-countdown/v1',team:'Brave H.C.',games:[game]};
const order=['C7','D7','E7','C8','D8','E8','C9','D9','E9','C12','D12','C13','D13','C14','D14','D16'];
const cells={},ids=Object.keys(career.players).filter(id=>id!=='354060'&&id!=='354055');
let n=0;for(const cell of order){
 if(cell==='D9'){cells[cell]='-';continue;}
 const id=cell==='D8'?'354060':cell==='D16'?'354055':ids[n++];
 cells[cell]={playerId:id,name:career.players[id].name,jersey:'#'+(n+1)};
}
const pub={
 schema:'hockeyos-game-night-lineup-public/v1',status:'MANAGER_APPROVED_PUBLIC_LINEUP',
 fixture:{id:game.id,gameDate:game.gameDate,opponent:game.opponent,puckDropUTC:game.puckDropUTC},
 publication:{managerApproved:true,authorizedForPublic:true,approvedAt:'2026-10-28T18:00:00.000Z',
   approvalId:'SYNTHETIC_APPROVED_PRIVATE_QA_012345',evidenceFingerprint:'SYNTHETIC_EVIDENCE_FINGERPRINT_FOR_QA_012345',
   outboundMessagesSent:0},
 evidence:{sourceVerified:true,identitiesReconciled:true,currentGameVersion:true,goalieBookingVerified:true,
   sourceHeldReason:null,excelOVRParityVerified:false},
 template:{sheet:'Lines',cardRange:'G5:J16',
   masterWorkbookSHA256:'0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154',
   originalExcelRenderAccepted:true,sourcePlayerBindingsVerified:true},
 cells,averages:{}
};
const render={
 schema:'hockeyos-approved-original-lineup-print/v1',status:'MANAGER_APPROVED_ORIGINAL_CARD_RENDER',
 publication:{managerApproved:true,authorizedForPublic:true,approvedAt:pub.publication.approvedAt},
 approvalId:pub.publication.approvalId,evidenceFingerprint:pub.publication.evidenceFingerprint,
 fixture:{id:game.id},template:{sheet:'Lines',cardRange:'G5:J16',
   masterWorkbookSHA256:pub.template.masterWorkbookSHA256,originalExcelRenderAccepted:true},
 imageSha256:sha,src:'./approved-lineup-cards/synthetic-preview.png'
};
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(e,body)=>{if(e)return res.writeHead(404).end();
 res.setHeader('content-type',mime[path.extname(file)]||'text/plain');res.end(body)});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,executablePath:process.env.BRAVE_CHROMIUM_PATH});
 let feed={schema:'hockeyos-game-night-lineup-public/v1',status:'AWAITING_MANAGER_APPROVAL'},imageBytes=png,imageRecord=render,calendar=countdown;
 const errors=[];
 const page=await browser.newPage({viewport:{width:390,height:850}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/countdown.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(calendar)}));
 await page.route('**/game-night-lineup-public.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed)}));
 await page.route('**/game-night-approved-render.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(imageRecord)}));
 await page.route('**/approved-lineup-cards/synthetic-preview.png',r=>r.fulfill({status:200,contentType:'image/png',body:imageBytes}));
 try{
 const url='http://127.0.0.1:'+server.address().port+'/widgets/countdown-lineup-review.html?embed=1';
 await page.goto(url);
 await page.waitForFunction(()=>document.getElementById('gameNightApprovalState').textContent.includes('awaiting manager approval'),null,{timeout:12000});
 assert.equal(await page.locator('#gameNightOriginalCard').isVisible(),false,'unapproved card stays hidden');
 feed=pub;
 await page.reload();
 await page.locator('#gameNightOriginalCard').waitFor({state:'visible',timeout:12000});
 assert.equal(await page.locator('#gameNightOriginalCard').evaluate(e=>e.naturalWidth),500);
 assert.ok(await page.locator('#gameNightOriginalCard').getAttribute('src').then(s=>s.startsWith('blob:')));
 // Replay with incorrect image bytes but valid-looking metadata. No image can pass.
 imageBytes=Buffer.from(png);imageBytes[400]^=17;
 await page.reload();
 await page.waitForFunction(()=>document.getElementById('gameNightApprovalState').textContent.includes('checksum mismatch'),null,{timeout:12000});
 assert.equal(await page.locator('#gameNightOriginalCard').isVisible(),false,'corrupted original cannot render');
 imageBytes=png;
 imageRecord={...render,approvalId:'OTHER_APPROVAL'};
 await page.reload();
 await page.waitForFunction(()=>document.getElementById('gameNightApprovalState').textContent.includes('held until'),null,{timeout:12000});
 assert.equal(await page.locator('#gameNightOriginalCard').isVisible(),false);
 imageRecord=render;
 feed={schema:'hockeyos-game-night-lineup-public/v1',status:'AWAITING_MANAGER_APPROVAL'};
 await page.reload();
 await page.waitForFunction(()=>document.getElementById('gameNightApprovalState').textContent.includes('awaiting manager approval'),null,{timeout:12000});
 assert.equal(await page.locator('#gameNightOriginalCard').isVisible(),false,'revoked approval removes card');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',syntheticOnly:true,actualLineupPublished:false,approvedSyntheticImageVisible:true,
   testedShaMismatch:true,approvalMismatchHeld:true,revocationHeld:true,privateVoterNamesNotExposed:true,pageErrors:errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
