/* Source-gated review of the ORIGINAL Excel Lines!G5:J16 printed card.
 * Not the production countdown. No private named polls or manager drafts.
 * A public approved card must have exact game/approval lineage and matching
 * SHA-256 bytes before display. Any revocation hides it immediately.
 */
(async function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const contract=window.BraveGameNightContract;
 const status=$('gameNightApprovalState'),image=$('gameNightOriginalCard');
 const safeImage=src=>typeof src==='string'&&
   /^\.\/approved-lineup-cards\/[a-zA-Z0-9_-]+\.png$/.test(src);
 let version=0,objectURL=null;
 function hold(message){
   if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
   image.hidden=true;image.removeAttribute('src');
   status.hidden=false;status.textContent=message;
 }
 async function read(file){
   try{
     const r=await fetch('./'+file,{cache:'no-store'});
     return r.ok?await r.json():null;
   }catch{return null;}
 }
 function bytesToHex(buffer){
   return [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');
 }
 async function printImageApproved(render,token){
   if(!safeImage(render.src)||!globalThis.crypto?.subtle)
     return hold('Original Excel image proof is unavailable.');
   let response,bytes;
   try{
     response=await fetch(render.src,{cache:'no-store'});
     if(!response.ok)return hold('Approved original print image unavailable.');
     bytes=await response.arrayBuffer();
   }catch{return hold('Original print image could not be verified.');}
   if(token!==version)return;
   if(bytes.byteLength<200||bytes.byteLength>8000000)return hold('Original print image size invalid.');
   const header=new Uint8Array(bytes.slice(0,8));
   if(header.toString()!=='137,80,78,71,13,10,26,10')return hold('Original print image is not PNG.');
   const digest=bytesToHex(await crypto.subtle.digest('SHA-256',bytes));
   if(token!==version)return;
   if(digest!==render.imageSha256)return hold('Original print image checksum mismatch; display held.');
   const candidate=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
   const preview=new Image();
   preview.onload=()=>{
     if(token!==version){URL.revokeObjectURL(candidate);return;}
     if(preview.naturalWidth<400||preview.naturalHeight<200){
       URL.revokeObjectURL(candidate);hold('Original print image dimensions unverified.');return;
     }
     if(objectURL)URL.revokeObjectURL(objectURL);
     objectURL=candidate;
     image.src=candidate;image.hidden=false;
     status.hidden=true;
     $('gameNightUpdated').textContent='Manager-approved original Excel card · '+
       render.publication.approvedAt+' · Check with the coach for changes.';
   };
   preview.onerror=()=>{URL.revokeObjectURL(candidate);if(token===version)hold('Original print image is unreadable.');};
   preview.src=candidate;
 }
 async function refresh(){
   const token=++version;
   hold('Checking the approved original Excel lineup card.');
   const [countdown,feed,render]=await Promise.all([
     read('countdown.json'),read('game-night-lineup-public.json'),read('game-night-approved-render.json')
   ]);
   if(token!==version)return;
   const now=new Date().toISOString();
   const game=contract?.currentFixture(countdown,now);
   if(!game){
     $('gameNightFixture').textContent='Next official fixture pending.';
     return hold('Lineup pending a verified fixture.');
   }
   $('gameNightFixture').textContent=game.opponent+' · '+game.gameDate+
     ' · Original Excel dressing-room card';
   const checked=contract.confirm(feed,countdown,
     id=>window.BravePlayerLinks?.identityById(id)||null,now);
   if(!checked.approved){
     $('gameNightUpdated').textContent='No named poll votes or private provisional player assignments are published.';
     return hold('Lineup awaiting manager approval.');
   }
   const allowed=render?.schema==='hockeyos-approved-original-lineup-print/v1'&&
     render.status==='MANAGER_APPROVED_ORIGINAL_CARD_RENDER'&&
     render.publication?.managerApproved===true&&
     render.publication?.authorizedForPublic===true&&
     render.approvalId===checked.approvalId&&
     render.evidenceFingerprint===checked.evidenceFingerprint&&
     render.fixture?.id===game.id&&
     render.template?.sheet==='Lines'&&render.template?.cardRange==='G5:J16'&&
     render.template?.masterWorkbookSHA256===contract.WORKBOOK_SHA&&
     render.template?.originalExcelRenderAccepted===true&&
     /^[a-f0-9]{64}$/.test(render.imageSha256||'')&&safeImage(render.src);
   if(!allowed)return hold('Approved roster is held until the original Excel print is verified.');
   await printImageApproved(render,token);
 }
 await refresh();
 setInterval(refresh,60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('focus',refresh);
 window.BraveLineupReviewStatus=Object.freeze({
   originalExcelOnly:true,privateNamedPollsPublished:false,
   managerApprovalRequired:true,sourceHashVerificationRequired:true,
   refreshMinutes:1
 });
})();
