const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
global.window={};
['js/core/rng.js','js/core/vec.js','js/model/unitTypes.js','js/model/battleUnit.js','js/model/battleState.js','js/sim/movement.js','js/sim/morale.js','js/sim/combat.js','js/sim/step.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const T=window.Tactical;
function assert(c,m){if(!c)throw new Error(m);}
function autoSide(s,side,enemySide){
  if((s.tick+1)%12!==0)return;
  const enemies=T.getUnits(s,enemySide).filter(u=>u.status==='active');
  T.getUnits(s,side).forEach(u=>{
    if(u.status!=='active'||u.engagedWith)return;
    const current=u.targetUnitId?s.units[u.targetUnitId]:null;
    if(current&&current.status==='active'){u.orderType='attack';u.targetPos=null;u.chargeActive=false;return;}
    let best=null,bestD=Infinity;
    enemies.forEach(e=>{const d=T.Vec.dist(u.position,e.position);if(d<bestD){best=e;bestD=d;}});
    if(best){u.orderType='attack';u.targetUnitId=best.id;u.targetPos=null;u.chargeActive=false;}
  });
}
function run(seed){
  const s=T.createBattleState(seed);
  while(s.status==='running'&&s.tick<8000){autoSide(s,'player','enemy');T.stepSimulation(s);}
  assert(s.status==='finished','battle did not finish');
  s.order.forEach(id=>{const u=s.units[id];assert(Number.isFinite(u.troops)&&Number.isFinite(u.morale),'NaN/Infinity '+id);assert(u.troops>=0,'negative troops '+id);assert(u.morale>=0&&u.morale<=100,'morale range '+id);});
  return {winner:s.winner,tick:s.tick,p:T.getUnits(s,'player').reduce((a,u)=>a+u.troops,0),e:T.getUnits(s,'enemy').reduce((a,u)=>a+u.troops,0)};
}
let result={player:0,enemy:0,draw:0};for(let seed=1;seed<=60;seed++){const x=run(seed);result[x.winner]++;}
const decisive=result.player+result.enemy;const rate=decisive?result.player/decisive:.5;
console.log('neutral mirrored AI',result,'playerWinRate=',(rate*100).toFixed(1)+'%');
assert(rate>=0.35&&rate<=0.65,'neutral mirrored win rate outside 35-65%');
const a=run(7),b=run(7);assert(JSON.stringify(a)===JSON.stringify(b),'same seed not deterministic');
console.log('B5.3 neutral balance: 60/60 completed; symmetry band PASS; determinism PASS');
