/* Brave H.C. homepage projection admission gate.
   This is display-only: never edits the original workbook, HTO actuals, or model.
   The full standalone projection analysis remains separately provisional. */
(function(root,factory) {
  'use strict';
  const api=Object.freeze(factory());
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.HockeyOSEmbeddedProjectionGate=api;
})(typeof window!=='undefined'?window:null,function() {
  'use strict';
  const DAY=86400000;
  const MAX_READBACK_AGE=10*DAY;
  const hold=(reason)=>Object.freeze({ok:false,reason});
  const integer=(n)=>Number.isSafeInteger(n)&&n>=0;
  function assess(model,atMs=Date.now()){
    if(!model||model.schema!=='brave-hc-workbook-projection/v1'||
       !Array.isArray(model.players)||model.players.length===0||
       !Number.isFinite(model.total?.points)||model.total.points<0)
       return hold('INVALID_MODEL_SCHEMA');
    if(model.modelCurrent!==true||model.projectionComplete!==true||
       model.publicationStatus!=='HTO_MODEL_CURRENT')
       return hold('MODEL_NOT_CURRENT');
    if(!integer(model.modelParity?.replayedRows)||model.modelParity.replayedRows===0||
       model.modelParity?.mismatches!==0)
       return hold('MODEL_PARITY_UNVERIFIED');
    const source=model.sourceInputs;
    if(!source||!integer(source.verifiedHTOBoxscoreGP)||
       source.verifiedHTOBoxscoreGP<1||
       !integer(source.htoRecordedTeamGP)||
       !integer(source.workbookRecordedTeamGP)||
       source.htoRecordedTeamGP!==source.verifiedHTOBoxscoreGP||
       source.workbookRecordedTeamGP!==source.verifiedHTOBoxscoreGP)
       return hold('WORKBOOK_HTO_GAME_COVERAGE_MISMATCH');
    const timestamp=Date.parse(model.htoreadback||'');
    if(!Number.isFinite(timestamp)||!Number.isFinite(atMs)||
       timestamp>atMs||atMs-timestamp>MAX_READBACK_AGE)
       return hold('HTO_READBACK_NOT_FRESH');
    return Object.freeze({ok:true,reason:'SOURCE_COVERAGE_RECONCILED'});
  }
  return {assess,MAX_READBACK_AGE};
});
