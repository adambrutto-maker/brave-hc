(async function(){
'use strict';
const $=id=>document.getElementById(id);
const contract=window.BraveGameNightContract;
const read=async file=>{try{const r=await fetch('./'+file,{cache:'no-store'});return r.ok?await r.json():null;}catch{return null;}};
async function refresh(){
const status=$('gameNightApprovalState'),img=$('gameNightOriginalCard');
status.hidden=false;img.hidden=true;img.removeAttribute('src');
const [countdown,feed,render]=await Promise.all([read('countdown.json'),read('game-night-lineup-public.json'),read('game-night-approved-render.json')]);
const now=new Date().toISOString();
const game=contract?.currentFixture(countdown,now);
if(!game){status.textContent='Next verified game pending; no lineup published.';return;}
$('gameNightFixture').textContent=game.opponent+' · '+game.gameDate+' · Original Excel dressing-room card';
const checked=contract.confirm(feed,countdown,id=>window.BravePlayerLinks?.identityById(id)||null,now);
if(!checked.approved){status.textContent='Lineup awaiting manager approval. Only the original verified print card can appear here.';return;}
const allowed=render?.schema==='hockeyos-approved-original-lineup-print/v1'&&
render.status==='MANAGER_APPROVED_ORIGINAL_CARD_RENDER'&&render.publication?.managerApproved===true&&
render.publication?.authorizedForPublic===true&&render.approvalId===checked.approvalId&&
render.evidenceFingerprint===checked.evidenceFingerprint&&render.fixture?.id===game.id&&
render.template?.sheet==='Lines'&&render.template?.cardRange==='G5:J16'&&
render.template?.masterWorkbookSHA256===contract.WORKBOOK_SHA&&
render.template?.originalExcelRenderAccepted===true&&
/^[a-f0-9]{64}$/.test(render.imageSha256||'')&&
/^\.\/approved-lineup-cards\/[a-zA-Z0-9_-]+\.png$/.test(render.src||'');
if(!allowed){status.textContent='Approved lineup source is not yet an approved original Excel image.';return;}
img.onload=()=>{if(img.naturalWidth>=400&&img.naturalHeight>=200){status.hidden=true;img.hidden=false;}else status.textContent='Original print did not pass image validation.';};
img.onerror=()=>{status.textContent='Original approved print unavailable.';img.hidden=true;};
img.src=render.src;
}
await refresh();setInterval(refresh,60000);
})();