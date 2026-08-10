const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
global.window={};
['js/core/rng.js','js/core/vec.js','js/model/unitTypes.js','js/model/battleUnit.js','js/model/battleState.js','js/sim/movement.js','js/sim/morale.js','js/sim/combat.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const T=window.Tactical;
function assert(c,m){if(!c)throw new Error(m);}
const s=T.createBattleState(20260808),foot=s.units.p1,enemy=s.units.e1,horse=s.units.p4;
// Isolate three units without invoking victory logic.
s.order.forEach(id=>{if(!['p1','e1','p4'].includes(id)){s.units[id].status='destroyed';s.units[id].troops=0;}});
foot.position={x:750,y:535};foot.facing=-Math.PI/2;foot.orderType='attack';foot.targetUnitId='e1';foot.morale=100;
enemy.position={x:750,y:430};enemy.facing=Math.PI/2;enemy.orderType='attack';enemy.targetUnitId='p1';enemy.morale=100;
horse.position={x:1010,y:530};horse.facing=-Math.PI/2;horse.orderType='move';horse.targetPos={x:875,y:430};horse.morale=100;
let pinned=false,atFlankStaging=false,flankSeen=false;
for(let tick=1;tick<=100;tick++){
  s.tick=tick;
  [foot,enemy,horse].forEach(u=>{if(u.status==='active')T.Movement.step(s,u);});
  const pairs=T.Combat.resolveContacts(s);T.Combat.fightPairs(s,pairs);
  if(foot.engagedWith==='e1'&&enemy.engagedWith==='p1')pinned=true;
  if(pinned&&horse.orderType==='wait'&&!atFlankStaging){
    atFlankStaging=true;
    horse.orderType='attack';horse.targetUnitId='e1';horse.targetPos=null;
  }
  if((s.visualEffects||[]).some(v=>v.type==='label'&&v.text==='FLANK!')){flankSeen=true;break;}
}
assert(pinned,'front infantry never pinned defender');
assert(atFlankStaging,'cavalry never reached flank staging position');
assert(flankSeen,'dynamic front-pin -> cavalry-side-attack did not produce FLANK');
assert(enemy.targetUnitId==='p1','defender retargeted away from pinned infantry');
console.log('B5.1 maneuver test: PASS', {tick:s.tick, enemyFacing:enemy.facing, horsePos:horse.position});
