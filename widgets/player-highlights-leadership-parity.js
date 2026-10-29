/* HockeyOS Highlights: historical team-service display from already verified public Bio.
 * Never edit native HTO Highlights rows or label service tenure as a new elected award.
 * Missing or inconsistent source means no supplemental captaincy, not an invented record.
 */
(function(root,factory){
  'use strict';
  const api=Object.freeze(factory());
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.BraveHighlightsLeadershipParity=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const held=reason=>Object.freeze({status:'HELD',reason});
 const expectedRoles=new Set(['Team Captain','Assistant Captain','Team Player Coach']);
 const evidence=new Set(['PUBLIC_HTO_BIO','FOUNDER_CONFIRMED']);
 const roleOf=text=>{
   const match=/^(Team Captain|Assistant Captain|Team Player Coach) - (.+)$/.exec(text||'');
   if(!match||!expectedRoles.has(match[1]))return null;
   const dates=match[2];
   if(!/^(20\d{2} to (?:20\d{2}|Present|Winter 20\d{2}\/\d{2})|Winter 20\d{2}\/\d{2} to Present)$/.test(dates))return null;
   const first=Number(dates.slice(0,4))||Number(dates.slice(7,11));
   const end=/20\d{2}$/.exec(dates);
   if(end&&Number(end[0])<first)return null;
   return match[1];
 };
 function validateSource(source,ledger){
   if(source?.schema!=='brave-hc-bio-public-leadership/v1'||
      source.status!=='PUBLIC_BIO_SOURCE_AND_FOUNDER_CONFIRMED'||
      !Array.isArray(source.items)||source.items.length<1||source.items.length>100||
      ledger?.schema!=='brave-hc-player-highlights/v1'||
      !ledger.players)return held('LEADERSHIP_SOURCE_UNVERIFIED');
   const seen=new Set();
   for(const entry of source.items){
      const id=String(entry?.htoPlayerID||'');
      if(!/^[1-9]\d{0,11}$/.test(id)||!entry||
        entry.status!=='SOURCE_DOCUMENTED'||!evidence.has(entry.source)||
        typeof entry.text!=='string'||entry.text.length>180||
        !roleOf(entry.text)||typeof entry.player!=='string'||
        ledger.players[id]?.name!==entry.player||
        !ledger.players[id]?.profileUrl?.endsWith('playerID='+id))
        return held('IDENTITY_OR_ROLE_SOURCE_MISMATCH');
      const key=id+'|'+entry.text;
      if(seen.has(key))return held('DUPLICATE_SOURCE_LEADERSHIP');
      seen.add(key);
   }
   return Object.freeze({status:'VERIFIED',count:seen.size});
 }
 function enrichRecord(record,source,ledger){
   if(!record||!Array.isArray(record.items))return record;
   const check=validateSource(source,ledger);
   if(check.status!=='VERIFIED')return record;
   const id=Object.keys(ledger.players).find(key=>ledger.players[key]===record);
   // Only the exact original ledger object can be joined. Synthetic identities hold.
   if(!id||ledger.players[id].name!==record.name)return record;
   const items=source.items.filter(x=>String(x.htoPlayerID)===id);
   if(!items.length)return record;
   const extensions=items.map((entry,index)=>{
      const role=roleOf(entry.text);
      const published=entry.source==='PUBLIC_HTO_BIO';
      return Object.freeze({
        id:'hto-bio-leadership-'+id+'-'+String(index+1).padStart(2,'0'),
        category:'leadership',
        sourceText:entry.text,displayText:entry.text,
        sourceOrder:record.items.length+index,
        sourceEmphasis:false,
        provenance:published?'VERIFIED_PUBLIC_HTO_BIO_LEADERSHIP':'TEAM_MANAGEMENT_CONFIRMED_LEADERSHIP',
        publication:'PRESENTATION_ONLY_EXISTING_TEAM_SERVICE_HISTORY',
        sourceRole:role,
        sourceNote:published?'Public HTO Bio leadership history':'Team-management-confirmed leadership history',
        officialPlayerId:id,
        presentationOnly:true,
        recordType:'SERVICE_TENURE_NOT_ELECTION'
      });
   });
   return {...record,items:[...record.items,...extensions]};
 }
 return {validateSource,enrichRecord,roleOf};
});
