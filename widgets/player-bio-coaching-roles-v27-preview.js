/* Public coaching: published team-system education, never individual/private coaching.
 * Role selection explores a position; never claims a real player's assignment.
 * Private coach notes, opponent-matchups, video and longitudinal skill profiles
 * require authenticated authorization and a separate nonpublic data product.
 */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.HockeyOSBioCoachingRoles=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const records={
  C:{title:'Center',area:'Middle support and recovery',
    withPuck:'Offer a central passing option below the puck, protect the middle lane and support the next short pass.',
    withoutPuck:'Protect the inside lane; angle toward the boards when you are the closest responsible forward.',
    transition:'Recover through the middle, support defenders low and identify the first safe breakout option.',
    cue:'Stay connected through the middle.'},
  RW:{title:'Right Wing',area:'Right-side lanes and support',
    withPuck:'Provide the right-side outlet, support along the wall and look inside before forcing a low-percentage play.',
    withoutPuck:'Close your right-side lane and guide pressure outward when you are the nearest forward.',
    transition:'Recover to the right-side passing lane, then support the breakout and communicate switches.',
    cue:'Own your lane; adjust when players rotate.'},
  LW:{title:'Left Wing',area:'Left-side lanes and support',
    withPuck:'Provide the left-side outlet, protect possession on the wall and support the center inside.',
    withoutPuck:'Close your left-side lane and direct pressure outside without abandoning the middle.',
    transition:'Recover into the left-side passing lane and give defenders a safe outlet under pressure.',
    cue:'Support the wall without losing the middle.'},
  LD:{title:'Left Defense',area:'Left-side gap and breakout',
    withPuck:'Move the puck safely to the first supported lane; use the left-side outlet or a clear controlled reset.',
    withoutPuck:'Protect the inside lane, manage your gap and avoid unsupported pinches on your side.',
    transition:'Identify backside support, communicate switches and protect the middle before chasing wide.',
    cue:'Gap first; communicate before switching.'},
  RD:{title:'Right Defense',area:'Right-side gap and breakout',
    withPuck:'Use the right-side outlet and support the breakout; choose the first controlled play under pressure.',
    withoutPuck:'Hold the inside lane and manage the puck carrier’s gap without abandoning your partner.',
    transition:'Recover inside-out, call coverage changes and support the first safe exit.',
    cue:'Keep the middle secure and provide a clear outlet.'},
  G:{title:'Goaltender',area:'Angle, tracking and communication',
    withPuck:'Use simple, controlled puck movement only when time and support are available.',
    withoutPuck:'Track the puck through traffic; establish your angle and control recoverable rebounds.',
    transition:'Communicate puck location and coverage, then reset your position for the next threat.',
    cue:'Track, communicate, reset.'}
 };
 const positions=Object.freeze(Object.fromEntries(Object.entries(records).map(([k,v])=>[
  k,Object.freeze({code:k,...v})
 ])));
 function explore(role){
   const item=positions[role];
   if(!item)return Object.freeze({status:'NO_VERIFIED_SELECTION',
     message:'Select a position for general team-system guidance.'});
   return Object.freeze({status:'GENERAL_TEAM_STRATEGY_ONLY',...item,
     notice:'This is position education, not a confirmed player assignment or individualized coaching.'});
 }
 function defaultForIdentity(verifiedGoalie,verifiedSkater){
   return verifiedGoalie===true&&verifiedSkater!==true?'G':null;
 }
 return {positions,explore,defaultForIdentity,
   sourceScope:'GENERAL_1_2_2_TEAM_FRAMEWORK_NO_PRIVATE_COACHING',
   publishedIndividualAssignments:false};
});
