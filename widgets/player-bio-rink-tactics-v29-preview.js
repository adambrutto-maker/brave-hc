/* HockeyOS V2.9 first-party illustrative rink animation.
 * No footage, private players, game assignments, or external video embed. */
(function(){
'use strict';
const area=document.getElementById('bioTacticBoard');if(!area)return;
const ns='http://www.w3.org/2000/svg',canvas=area.querySelector('svg');
const put=(tag,a={})=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(a))el.setAttribute(k,String(v));return el;};
const markers=put('g');canvas.append(markers);
const names=['F1','F2','F3','D1','D2','O1','O2','P'],elements={};
for(const name of names){
 const puck=name==='P',opp=name[0]==='O';
 const group=put('g',{'data-marker':name});
 group.append(put('circle',{r:puck?5:11,fill:puck?'#15293c':opp?'#ba3146':'#115b89',stroke:puck?'#e0ad59':'white','stroke-width':1.6}));
 if(!puck){const text=put('text',{x:0,y:4,'text-anchor':'middle','font-size':9,'font-weight':900,fill:'#fff'});text.textContent=name;group.append(text);}
 markers.append(group);elements[name]=group;
}
const plays={
 forecheck:[
  {caption:'Hold 1–2–2 shape',tip:'F1 approaches the carrier; F2, F3 and the defence protect support lanes.',p:[[229,118],[214,56],[212,150],[153,66],[154,151],[295,139],[280,72],[294,139]]},
  {caption:'Angle the carrier outside',tip:'F1 steers toward the boards, F2 supports pressure and F3 protects the middle.',p:[[262,123],[239,77],[224,145],[175,69],[176,148],[303,144],[278,82],[303,144]]},
  {caption:'Close passing options',tip:'The back layer keeps its gap and avoids over-committing to the puck.',p:[[293,138],[268,99],[241,123],[198,75],[197,143],[306,147],[276,97],[306,147]]},
  {caption:'Recover together',tip:'Support the loose puck without abandoning the middle lane.',p:[[300,149],[289,120],[254,115],[213,78],[215,148],[311,160],[286,104],[297,146]]}],
 breakout:[
  {caption:'Defence retrieves',tip:'A defender wins the puck; teammates form outlets.',p:[[145,64],[143,144],[168,106],[74,141],[65,80],[115,147],[117,74],[73,139]]},
  {caption:'Winger opens the lane',tip:'An outlet along the boards and centre support are available.',p:[[131,55],[123,160],[140,104],[84,131],[70,93],[113,139],[124,73],[83,130]]},
  {caption:'First pass',tip:'Pass to the open winger; avoid a blind pass through coverage.',p:[[160,49],[155,163],[170,101],[99,125],[92,97],[123,130],[137,75],[157,161]]},
  {caption:'Transition together',tip:'Advance in lanes with a supporting pass option.',p:[[208,49],[206,150],[208,99],[144,125],[140,83],[157,117],[163,64],[206,150]]}],
 coverage:[
  {caption:'Protect the middle',tip:'Recognize the puck side and stay inside the attacking threats.',p:[[90,101],[88,73],[78,136],[63,91],[60,126],[101,63],[108,139],[101,63]]},
  {caption:'Angle outside',tip:'Puck-side pressure while the weak side protects the dangerous area.',p:[[103,80],[84,76],[80,132],[65,94],[64,120],[100,52],[112,139],[100,52]]},
  {caption:'Contain and communicate',tip:'Stay responsible for the slot and passing lanes.',p:[[106,64],[92,93],[76,124],[72,105],[60,119],[97,44],[113,135],[100,44]]},
  {caption:'Reset coverage',tip:'Recover shape and prepare an outlet for the next transition.',p:[[99,88],[98,112],[82,144],[65,98],[64,130],[90,45],[115,143],[114,143]]}]
};
let play='forecheck',step=0,running=false,frame=0,loopStart=0;
const prompt=area.querySelector('#bioTacticCaption'),hint=area.querySelector('#bioTacticHint'),progress=area.querySelector('#bioTacticStep'),playBtn=area.querySelector('#bioTacticPlay');
function apply(coords){coords.forEach((xy,i)=>{elements[names[i]].setAttribute('transform','translate('+xy.join(' ')+')');});}
function draw(index,animate){
 step=Math.max(0,Math.min(3,index));
 const scene=plays[play][step];
 progress.textContent='STEP '+(step+1)+'/4';prompt.textContent=scene.caption;hint.textContent=scene.tip;
 cancelAnimationFrame(frame);
 if(!animate||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){apply(scene.p);return;}
 const from=names.map(name=>{const t=elements[name].getAttribute('transform')||'';const m=/translate\(([-\d.]+)[, ]+([-\d.]+)\)/.exec(t);return m?[Number(m[1]),Number(m[2])]:scene.p[names.indexOf(name)];});
 const start=performance.now();
 function tick(now){const a=Math.min(1,(now-start)/720),e=a*a*(3-2*a);
  apply(scene.p.map((point,i)=>point.map((v,j)=>+(from[i][j]+(v-from[i][j])*e).toFixed(2))));
  if(a<1)frame=requestAnimationFrame(tick);
 }
 frame=requestAnimationFrame(tick);
}
function pause(){running=false;playBtn.textContent='▶ Play';}
for(const button of area.querySelectorAll('[data-tactic]'))button.addEventListener('click',()=>{
 play=button.dataset.tactic;pause();
 area.querySelectorAll('[data-tactic]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 draw(0,false);
});
area.querySelector('#bioTacticNext').addEventListener('click',()=>{pause();draw((step+1)%4,true);});
area.querySelector('#bioTacticReset').addEventListener('click',()=>{pause();draw(0,false);});
playBtn.addEventListener('click',()=>{running=!running;playBtn.textContent=running?'Ⅱ Pause':'▶ Play';loopStart=performance.now();});
function loop(now){if(running&&now-loopStart>1350){loopStart=now;draw((step+1)%4,true);}requestAnimationFrame(loop);}
draw(0,false);requestAnimationFrame(loop);
})();