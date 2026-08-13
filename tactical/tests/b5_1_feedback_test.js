const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
global.window={};
['js/core/rng.js','js/core/vec.js','js/model/unitTypes.js','js/model/battleUnit.js','js/model/battleState.js','js/sim/movement.js','js/sim/morale.js','js/sim/combat.js','js/sim/step.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const T=window.Tactical;
function assert(c,m){if(!c)throw new Error(m);}
let passed=0;function check(c,m){assert(c,m);passed++;}
check(T.FIELD.width===1600&&T.FIELD.height===760,'landscape battlefield dimensions');
check(T.UnitTypes.kiba.speed/T.UnitTypes.ashigaru.speed>=2.2,'cavalry speed ratio below 2.2');
check(T.UnitTypes.teppo.speed<T.UnitTypes.ashigaru.speed,'teppo should be slower than ashigaru');
{
  const s=T.createBattleState(1);const gap=s.units.p1.position.y-s.units.e1.position.y;
  check(gap>=500,'front line gap too small: '+gap);
  const contactSeconds=(gap-(s.units.p1.radius+s.units.e1.radius+5))/((T.UnitTypes.ashigaru.speed*2));
  check(contactSeconds>=20,'estimated ashigaru contact too fast: '+contactSeconds.toFixed(1)+'s');
}
// Sticky target: an enemy already targeting p1 must not snap to a closer cavalry unit.
{
  const s=T.createBattleState(2);const e=s.units.e1;
  e.targetUnitId='p1';e.orderType='attack';
  s.units.p4.position={x:e.position.x+30,y:e.position.y+250};
  s.tick=11;T.stepSimulation(s);
  check(e.targetUnitId==='p1','enemy target snapped away from pinned front target');
}
// Nearest contact should be primary engagement, not whichever pair happens to be iterated last.
{
  const s=T.createBattleState(3),e=s.units.e1,p1=s.units.p1,p4=s.units.p4;
  e.position={x:700,y:500};p1.position={x:700,y:565};p4.position={x:780,y:500};
  T.Combat.resolveContacts(s);
  check(e.engagedWith==='p1','nearest contact is not primary engagement: '+e.engagedWith);
}
// Flank event must be both mechanically classified and locally visible.
{
  const s=T.createBattleState(4),a=s.units.p4,b=s.units.e1;
  b.position={x:700,y:500};b.facing=Math.PI/2;a.position={x:780,y:500};
  a.troops=a.maxTroops=800;b.troops=b.maxTroops=1000;a.morale=b.morale=80;
  check(T.Combat.attackDirection(a,b)==='flank','side position did not classify as flank');
  T.Combat.fightPairs(s,[[a,b]]);
  check((s.visualEffects||[]).some(v=>v.type==='label'&&v.text==='FLANK!'),'FLANK local visual label missing');
}
// Teppo must expose a clearly visible FIRE cue and tracer on ranged fire.
{
  const s=T.createBattleState(5),a=s.units.p6,b=s.units.e1;
  a.position={x:700,y:600};b.position={x:700,y:430};a.targetUnitId=b.id;a.orderType='attack';
  T.Combat.rangedFire(s);
  check(s.visualEffects.some(v=>v.type==='shot'),'teppo shot tracer missing');
  check(s.visualEffects.some(v=>v.type==='label'&&v.text==='FIRE!'),'teppo FIRE visual cue missing');
}
console.log('B5.1 feedback tests: '+passed+'/'+passed+' PASS');
