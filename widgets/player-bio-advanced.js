/* HockeyOS advanced Bio analysis: verified HTO historical rows + explicit season format map.
   Derived analytics only. No official records, achievements, projections or coaching writes. */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.HockeyOSBioAdvanced=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const safe=n=>typeof n==='number'&&Number.isFinite(n);
 const count=n=>Number.isSafeInteger(n)&&n>=0;
 const hold=reason=>Object.freeze({status:'HELD',reason});
 function factor(season,config,view){
   if(view==='actual')return 1;
   if(!['winter','summer'].includes(view))return null;
   if(config?.schema!=='hockeyos-league-game-formats/v1'||!config.formats||!config.seasonBindings)return null;
   const binding=config.seasonBindings[season+'::ALL_HTO_GAME_TYPES'];
   if(!binding||binding.verificationStatus!=='VERIFIED'||binding.scope!=='GAME_LENGTH_ONLY_ALL_HTO_PUBLISHED_GAME_TYPES'||!binding.evidenceRef)return null;
   const source=config.formats[binding.formatId];
   const target=config.formats[view==='winter'?'brave-winter-32':'brave-summer-48'];
   const valid=f=>f&&f.verificationStatus==='VERIFIED'&&safe(f.regulationGameMinutes)&&f.regulationGameMinutes>0;
   return valid(source)&&valid(target)?target.regulationGameMinutes/source.regulationGameMinutes:null;
 }
 function rate(rows,key,view,config){
   let numerator=0,denominator=0;
   for(const row of rows){
     const k=factor(row.Season,config,view);
     if(!safe(k)||!count(row.GP)||row.GP<1||!count(row[key]))return null;
     numerator+=row[key]*k;denominator+=row.GP;
   }
   return denominator?numerator/denominator:null;
 }
 function quartile(sorted,p){
   if(!sorted.length)return null;
   const pos=(sorted.length-1)*p,low=Math.floor(pos),high=Math.ceil(pos);
   return sorted[low]+(sorted[high]-sorted[low])*(pos-low);
 }
 function verifiedSeasons(seg,kind){
   if(!Array.isArray(seg?.seasons))return {all:[],valid:[],excluded:0};
   const all=seg.seasons;
   const valid=all.filter(r=>r&&typeof r.Season==='string'&&count(r.GP)&&r.GP>0&&(
      kind==='skater'
       ?count(r.G)&&count(r.A)&&count(r.Pts)&&r.G+r.A===r.Pts
       :count(r.GA)
   ));
   return {all,valid,excluded:all.length-valid.length};
 }
 function recentVsPrevious(qualified,key,config,view,lowerBetter=false){
   if(qualified.length<6)return null;
   const newest=qualified.slice(-3),older=qualified.slice(-6,-3);
   const a=rate(newest,key,view,config),b=rate(older,key,view,config);
   if(!safe(a)||!safe(b))return null;
   return Object.freeze({recent:a,previous:b,difference:a-b,pctDifference:b>0?(a-b)/b:null,
     recentSeasons:newest.map(r=>r.Season),previousSeasons:older.map(r=>r.Season),
     lowerBetter,minimumQualifyingGP:5});
 }
 function htoTotal(seg){
   const t=seg?.total||{};
   const gp=count(t.GP)?t.GP:null;
   return {t,gp};
 }
 function skater(seg,config){
   if(seg?.kind!=='skater')return hold('NOT_SKATER_ROLE');
   const {all,valid,excluded}=verifiedSeasons(seg,'skater');
   if(!valid.length)return hold('NO_COMPLETE_SCORING_SEASONS');
   const qualifying=valid.filter(r=>r.GP>=5&&safe(factor(r.Season,config,'winter')));
   const mapped=valid.filter(r=>safe(factor(r.Season,config,'winter')));
   const actual=rate(valid,'Pts','actual',config);
   const normalized=rate(mapped,'Pts','winter',config);
   const goals=rate(mapped,'G','winter',config),assists=rate(mapped,'A','winter',config);
   const peak=qualifying.map(r=>({season:r.Season,gp:r.GP,rate:rate([r],'Pts','winter',config)}))
     .sort((a,b)=>b.rate-a.rate||a.season.localeCompare(b.season))[0]||null;
   const rates=qualifying.map(r=>rate([r],'Pts','winter',config)).filter(safe).sort((a,b)=>a-b);
   const {t,gp}=htoTotal(seg);
   const completeTotals=gp!==null&&count(t.G)&&count(t.A)&&count(t.Pts)&&t.G+t.A===t.Pts;
   const goalsShare=completeTotals&&t.Pts>0?t.G/t.Pts:null;
   const qualifiedCount=qualifying.length,coverage={complete:valid.length,total:all.length,mapped:mapped.length,excluded,
      qualifying:qualifiedCount,source:'Official HTO published career-season breakdown (all published game types)'};
   const situational={
     powerPlayShare:completeTotals&&t.G>0&&count(t.PPG)&&t.PPG<=t.G?t.PPG/t.G:null,
     gameWinnersShare:completeTotals&&t.G>0&&count(t.GWG)&&t.GWG<=t.G?t.GWG/t.G:null,
     penaltyMinutesPerGP:gp>0&&count(t.PIM)?t.PIM/gp:null,
     playerOfGameRateGP:gp>0&&count(t.POTG)&&t.POTG<=gp?t.POTG/gp:null,
     plusMinusPerGP:gp>0&&safe(t['+/-'])?t['+/-']/gp:null,
     scoringGoalShare:goalsShare,
     shortHandedShare:completeTotals&&t.G>0&&count(t.SHG)&&t.SHG<=t.G?t.SHG/t.G:null
   };
   return Object.freeze({
    status:'VERIFIED_DERIVED',kind:'skater',coverage,
    overview:{rawPtsPerGP:completeTotals&&gp>0?t.Pts/gp:actual,
     winterPtsPerGP:mapped.length===valid.length&&excluded===0?normalized:null,
     verifiedSeasonWinterPtsPerGP:normalized,
     verifiedSeasonWinterGoalsPerGP:goals,verifiedSeasonWinterAssistsPerGP:assists,
     goalsShare,careerTotalBasis:completeTotals?'PUBLISHED_CAREER_TOTAL':'VERIFIED_SEASON_ROWS',
     peak:peak||null,median:quartile(rates,.5),
     middleHalf:rates.length>=4?[quartile(rates,.25),quartile(rates,.75)]:null},
    development:recentVsPrevious(qualifying,'Pts',config,'winter',false),
    situational
   });
 }
 function goalie(seg,config){
   if(seg?.kind!=='goalie')return hold('NOT_GOALIE_ROLE');
   const {all,valid,excluded}=verifiedSeasons(seg,'goalie');
   if(!valid.length)return hold('NO_COMPLETE_GOALIE_GA_SEASONS');
   const mapped=valid.filter(r=>safe(factor(r.Season,config,'winter')));
   const qualified=mapped.filter(r=>r.GP>=5);
   const peak=qualified.map(r=>({season:r.Season,gp:r.GP,rate:rate([r],'GA','winter',config)}))
    .sort((a,b)=>a.rate-b.rate||a.season.localeCompare(b.season))[0]||null;
   const {t,gp}=htoTotal(seg);
   const outcomeComplete=gp>0&&[t.W,t.L,t.T].every(count)&&t.W+t.L+t.T===gp;
   const winPct=outcomeComplete?(t.W+.5*t.T)/gp:null;
   return Object.freeze({status:'VERIFIED_DERIVED',kind:'goalie',
    coverage:{complete:valid.length,total:all.length,mapped:mapped.length,excluded,qualifying:qualified.length,
      source:'Official HTO published goalie season observations (all game types)'},
    overview:{
     verifiedWinterGAperAppearance:rate(mapped,'GA','winter',config),
     careerWinterGAperAppearance:mapped.length===valid.length&&excluded===0?rate(mapped,'GA','winter',config):null,
     publishedActualGAA:gp>0&&count(t.GA)?t.GA/gp:null,
     winPointsPct:winPct,
     shutoutRateGP:gp>0&&count(t.SHO)&&t.SHO<=gp?t.SHO/gp:null,
     playerOfGameRateGP:gp>0&&count(t.POTG)&&t.POTG<=gp?t.POTG/gp:null,
     peak:peak||null,
     outcomeComplete,
     winPctRule:'(Recorded W + 0.5 * recorded T) / recorded goalie appearances'
    },
    development:recentVsPrevious(qualified,'GA',config,'winter',true)
   });
 }
 return {factor,rate,verifiedSeasons,skater,goalie};
});
