/* HockeyOS Bio V3.6 — isolated, source-verified trend visualization.
 * No updates to source projection.json, HTO records, or 5Arrows classifications.
 */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.HockeyOSBioTrendVisualV36=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function lerpHex(a,b,t){const f=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const A=f(a),B=f(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*clamp(t,0,1)).toString(16).padStart(2,'0')).join('');}
function interpolate(stops,t){for(let i=1;i<stops.length;i++){if(t<=stops[i][0])return lerpHex(stops[i-1][1],stops[i][1],(t-stops[i-1][0])/(stops[i][0]-stops[i-1][0]));}return stops[stops.length-1][1];}
function angleFromZ(z){
 if(!Number.isFinite(z))return null;
 const margin=10,decay=.6;
 if(z< -2)return 180-margin*Math.exp((z+2)/decay);
 if(z<0)return 90+40*(-z);
 if(z<=1)return 90-80*z;
 return margin*Math.exp(-(z-1)/decay);
}
function compute(z){
 const cold=z<0,hot=z>0;const intensity=cold?clamp(-z/2,0,1):hot?clamp(z/1,0,1):0;
 // The original source is asymmetric: full cold at ΓêÆ2 sigma, full heat at +1 sigma.
 // Distinct source z-scores keep distinct angles even past the outer thresholds.
 const angle=angleFromZ(z);
 const stops=cold?[[0,'#91ddf9'],[.4,'#4fb7f3'],[.73,'#187ac8'],[1,'#084f9b']]:[[0,'#ffe27a'],[.4,'#ffb72d'],[.72,'#ef6723'],[1,'#cc2139']];
 const accent=(!cold&&!hot)?'#edf5fc':interpolate(stops,intensity);
 const rim=(!cold&&!hot)?'#9aafbc':cold?interpolate([[0,'#75d4f7'],[1,'#168de0']],intensity):interpolate([[0,'#efbf68'],[1,'#ee3851']],intensity);
 const upper=(!cold&&!hot)?'#304b5b':cold?interpolate([[0,'#194a69'],[1,'#05274e']],intensity):interpolate([[0,'#4d331f'],[1,'#5c0e20']],intensity);
 const lower=(!cold&&!hot)?'#162935':cold?interpolate([[0,'#09283d'],[1,'#03152d']],intensity):interpolate([[0,'#321e15'],[1,'#270715']],intensity);
 const lit=(!cold&&!hot)?'#7f96a8':cold?interpolate([[0,'#246f98'],[1,'#0b65ac']],intensity):interpolate([[0,'#aa7840'],[1,'#b3202c']],intensity);
 const visualName=Math.abs(z)<.005?'NEUTRAL':cold?(intensity>=.93?'COLDEST':intensity>=.47?'COLDER':'COOL'):(intensity>=.93?'HOTTEST':intensity>=.48?'HOTTER':'WARM');
 const band=z<-2?'Cold':z<-1?'Cool':z<.5?'Neutral':z<1?'Warm':'Hot';
 return {z,cold,hot,intensity,angle,accent,rim,upper,lower,lit,visualName,band};
}
function elementIcon(s,id){if(!s.cold&&!s.hot)return '';
 if(s.cold){
  const n=s.intensity>.70?4:s.intensity>.35?2:1;
  const lengths=[13,20,24,17],starts=n===4?[2.2,7.2,13.2,20]:n===2?[8,16]:[12];
  const parts=starts.map((x,i)=>{let len=lengths[i]||15;len*=.28+.60*s.intensity;return `<path d="M${x} 4 L${x+4.5} 4 L${(x+2.2).toFixed(1)} ${(4+len).toFixed(1)} Z" fill="url(#ice-${id})" stroke="#c9f7ff" stroke-width=".7"/>`;}).join('');
  return `<span class="v36-element ice"><svg viewBox="0 0 28 28" aria-hidden="true"><defs><linearGradient id="ice-${id}" x1="10%" y1="10%" x2="90%" y2="90%"><stop stop-color="#e9fcff"/><stop offset=".48" stop-color="#7cd4fc"/><stop offset="1" stop-color="#0873b8"/></linearGradient></defs><g class="v36-ice-shimmer"><path d="M0 1 Q14 -1 28 1 L28 5 Q14 4 0 5Z" fill="#9de6fc" stroke="#e4ffff" stroke-width=".6"/>${parts}<path d="M1 3 L27 3" stroke="#fff" stroke-width=".7" opacity=".8"/></g></svg></span>`;
 }
 const size=.57+.43*s.intensity; const color=interpolate([[0,'#ffc33b'],[.55,'#ff7d24'],[1,'#ec293f']],s.intensity);
 const sparkOpacity=s.intensity<.40?0:.4+.6*s.intensity;
 return `<span class="v36-element fire"><svg viewBox="0 0 28 28" aria-hidden="true"><defs><linearGradient id="fire-${id}" x1="15%" y1="100%" x2="85%" y2="0%"><stop stop-color="#fff0aa"/><stop offset=".35" stop-color="#ffc23e"/><stop offset=".67" stop-color="#ff6b19"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><g transform="translate(14 23) scale(${size.toFixed(3)}) translate(-14 -23)"><g class="v36-flame-outer"><path d="M13.1 3 C15 9 21 11 21 18 C21 24 18 26 14 26 C9 26 6 22 7.3 17 C8 13 10.2 11 10.5 8 C11.4 11 12.4 12 13 13 C14 9 13.3 6 13.1 3Z" fill="url(#fire-${id})" stroke="#ffd677" stroke-width=".65"/><path d="M14 14 C14.3 17 17.2 18 17.2 21 C17.2 24 15.6 25 13.8 25 C11.2 25 10.2 22.7 11 21 C11.5 19.4 13.2 17.9 14 14Z" fill="#fff6b7" opacity=".96"/></g></g><g class="v36-sparks" opacity="${sparkOpacity.toFixed(2)}" fill="#ffd47d"><circle cx="5" cy="6" r="1"/><circle cx="22" cy="5" r=".85"/><circle cx="25" cy="10" r=".7"/></g></svg></span>`;
}
function badgeMarkup(s,id,size){const cold=s.cold,hot=s.hot;const gradientTop=cold?'#c9fbff':hot?'#ffe7a3':'#ffffff';const gradBottom=s.accent;const glow=cold?lerpHex('#4ec4ff','#087bdf',s.intensity):hot?lerpHex('#ffcd5e','#ea243e',s.intensity):'#d8edf7';
 const styles=[`--badge-size:${size}px`,`--angle:${s.angle.toFixed(8)}deg`,`--rim:${s.rim}`,`--upper:${s.upper}`,`--lower:${s.lower}`,`--lit:${s.lit}`,`--accent:${glow}`,`--glow:${glow}77`,`--strength:${s.intensity.toFixed(3)}`,`--frost-edge:${s.rim}`,`--frost-opacity:${(cold?.13+.5*s.intensity:0).toFixed(3)}`,`--spark-opacity:${(hot?.05+.6*s.intensity:0).toFixed(3)}`].join(';');
 return `<div class="bio-trend-arrow-inset v36-badge ${cold?'v36-frosted':''}" data-deg="${s.angle.toFixed(8)}" style="${styles}"><div class="v36-crystals"></div><div class="v36-heat-haze"></div><svg class="bio-trend-direction-arrow v36-arrow-canvas" viewBox="0 0 100 100" role="img" aria-label="Arrow orientation ${s.angle.toFixed(1)} degrees, ${s.visualName}"><defs><linearGradient id="arr-${id}" x1="8%" y1="3%" x2="90%" y2="96%"><stop offset="0%" stop-color="${gradientTop}"/><stop offset="39%" stop-color="${s.cold?'#55c6fa':s.hot?'#ffad54':'#e9f4fc'}"/><stop offset="100%" stop-color="${gradBottom}"/></linearGradient></defs><g class="v36-arrow-rotor" data-arrow-angle="${s.angle.toFixed(8)}" data-z-score="${s.z}"><path class="v36-arrow-body v36-arrow-shape" fill="url(#arr-${id})" d="M40 69V50H32L50 29L68 50H60V69Z"/><path class="v36-arrow-gleam" d="M42.8 65V47H38L50 33"/></g></svg>${elementIcon(s,id)}<span class="v36-pivot"></span></div>`;
}

// V3.6.3 presentation tolerance: NOT a change to the workbook 5Arrows bands.
 // +/-5% of verified career scoring pace reads visually neutral (slate, white,
 // no frost/flame) even when the exact trend is nonzero. Angle remains continuous.
const NEAR_CAREER_TOLERANCE=0.05;
let badgeCounter=0;
const VALID_SOURCE_CATEGORIES=new Set(['Cold','Cool','Neutral','Warm','Hot']);
function visualLevelFromRelativeChange(relativeChange,sigma){
 if(typeof relativeChange!=='number'||!Number.isFinite(relativeChange)||
    typeof sigma!=='number'||!Number.isFinite(sigma)||sigma<=0)return null;
 if(Math.abs(relativeChange)<=NEAR_CAREER_TOLERANCE)return 'NEUTRAL';
 const z=relativeChange/sigma;
 if(z< -2)return 'FROZEN';
 if(z< -1)return 'COLD';
 if(relativeChange<0)return 'COOL';
 if(z<.5)return 'WARM';
 if(z<1)return 'HOT';
 return 'BLAZING';
}
function visualLevel(direction,category){
 if(!VALID_SOURCE_CATEGORIES.has(category)||typeof direction?.sourceValue!=='number'||
    !Number.isFinite(direction?.zScore)||!Number.isFinite(direction?.sigma))return null;
 return visualLevelFromRelativeChange(direction.sourceValue,direction.sigma);
}
function nearCareerAverage(relativeChange,category){
 return category==='Neutral' && typeof relativeChange==='number' &&
  Number.isFinite(relativeChange) && Math.abs(relativeChange)<=NEAR_CAREER_TOLERANCE;
}
function nearAverageAppearance(s){
 return {...s,cold:false,hot:false,intensity:0,accent:'#edf5fc',
   rim:'#9aafbc',upper:'#304b5b',lower:'#162935',lit:'#7f96a8',
   visualName:'NEAR CAREER AVERAGE'};
}
function createBadge(doc,direction,category,rookie=false){
 if(!doc||!Number.isFinite(direction?.zScore))return null;
 const near=(!rookie)&&nearCareerAverage(direction.sourceValue,category);
 const base=compute(direction.zScore);
 const s=near?nearAverageAppearance(base):base;
 const level=rookie?'ROOKIE':visualLevel(direction,category);
 if(!level)return null;
 const mount=doc.createElement('div');
 mount.innerHTML=badgeMarkup(s,'bioV36Main'+(++badgeCounter),78);
 const badge=mount.firstElementChild;
 badge.dataset.arrowCategory=category;
 badge.dataset.workbookCategory=category;
 badge.dataset.visualState=s.visualName;
 badge.dataset.visualLevel=level;
 badge.dataset.nearCareerAverage=String(near);
 badge.dataset.sourceZScore=rookie?'':String(direction.zScore);
 badge.dataset.angleConvention='0-up-90-right-180-down';
 badge.dataset.animationScope='corner-only';
 const arrow=badge.querySelector('svg.bio-trend-direction-arrow');
 if(rookie){
  badge.dataset.rookie='true';
  badge.removeAttribute('data-deg');
  const rotor=badge.querySelector('.v36-arrow-rotor');
  rotor?.removeAttribute('data-arrow-angle');
  rotor?.removeAttribute('data-z-score');
  const shape=badge.querySelector('.v36-arrow-shape');
  shape?.setAttribute('data-rookie-neutral','true');
  shape?.setAttribute('fill','#f7fbff');
  arrow?.setAttribute('aria-label','Neutral rookie display marker; no established career comparison');
 }else{
  arrow?.setAttribute('aria-label',
    level+' visual trend · '+category+' workbook category'+
    (near?' · within 5 percent of career average; ':'; ')+
    direction.zScore.toFixed(2)+' workbook standard deviations; '+
    s.angle.toFixed(2)+' degrees, 0 up, 90 right, 180 down');
 }
 return badge;
}
// Descriptive recent-form badge uses the exact same rendering and 7-word scale,
 // but is never classified or represented as an official workbook forecast.
 function createFormBadge(doc,relativeChange,sigma){
  const level=visualLevelFromRelativeChange(relativeChange,sigma);
  if(!doc||!level)return null;
  const z=relativeChange/sigma,base=compute(z);
  const s=level==='NEUTRAL'?nearAverageAppearance(base):base;
  const mount=doc.createElement('div');
  mount.innerHTML=badgeMarkup(s,'bioV36Form'+(++badgeCounter),78);
  const badge=mount.firstElementChild;
  badge.dataset.visualLevel=level;
  badge.dataset.formOnly='DESCRIPTIVE_NOT_WORKBOOK';
  badge.dataset.relativeChange=String(relativeChange);
  badge.dataset.nearCareerAverage=String(level==='NEUTRAL');
  badge.querySelector('svg.bio-trend-direction-arrow')?.setAttribute('aria-label',
    level+' recent scoring pace relative to winter-equivalent career rate; '+
    (relativeChange*100).toFixed(1)+' percent; descriptive comparison only');
  return badge;
 }
 return {compute,angleFromZ,createBadge,createFormBadge,badgeMarkup,visualLevel,visualLevelFromRelativeChange,nearCareerAverage,NEAR_CAREER_TOLERANCE};
});
