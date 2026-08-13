const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
global.window={};
['js/core/rng.js','js/core/vec.js','js/model/unitTypes.js','js/model/battleUnit.js','js/model/battleState.js','js/sim/movement.js','js/sim/morale.js','js/sim/combat.js','js/sim/step.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const T=window.Tactical;
function assert(c,m){if(!c)throw new Error(m);}
function fresh(seed,typeA='kiba',typeB='ashigaru'){
  const s=T.createBattleState(seed),a=s.units.p4,b=s.units.e1;
  a.unitType=typeA;b.unitType=typeB;a.troops=a.maxTroops=800;b.troops=b.maxTroops=1000;a.morale=b.morale=80;
  b.position={x:500,y:400};b.facing=-Math.PI/2;
  return {s,a,b};
}
// Direction classification relative to defender facing upward.
{
 const x=fresh(1);x.a.position={x:500,y:300};assert(T.Combat.attackDirection(x.a,x.b)==='front','front classification');
 x.a.position={x:600,y:400};assert(T.Combat.attackDirection(x.a,x.b)==='flank','flank classification');
 x.a.position={x:500,y:500};assert(T.Combat.attackDirection(x.a,x.b)==='rear','rear classification');
}
assert(T.Combat.directionModifier('front').damage===1,'front damage modifier');
assert(T.Combat.directionModifier('flank').damage===1.5,'flank damage modifier');
assert(T.Combat.directionModifier('rear').damage===2.2,'rear damage modifier');
assert(T.Combat.directionModifier('front').morale===1,'front morale modifier');
assert(T.Combat.directionModifier('flank').morale===2,'flank morale modifier');
assert(T.Combat.directionModifier('rear').morale===3,'rear morale modifier');
// Matchup table core values.
{
 const x=fresh(2,'kiba','ashigaru');assert(T.Combat.matchupMultiplier(x.a,x.b)===0.8,'kiba vs ashigaru');
 x.a.unitType='ashigaru';x.b.unitType='kiba';assert(T.Combat.matchupMultiplier(x.a,x.b)===1.3,'ashigaru vs kiba');
 x.a.unitType='kiba';x.b.unitType='teppo';assert(T.Combat.matchupMultiplier(x.a,x.b)===1.6,'kiba vs teppo');
}
// Same seed/state: rear > flank > front damage and morale pressure.
function dirLoss(dir){const x=fresh(42);if(dir==='front')x.a.position={x:500,y:300};if(dir==='flank')x.a.position={x:600,y:400};if(dir==='rear')x.a.position={x:500,y:500};return T.Combat.previewLosses(x.s,x.a,x.b);}
const front=dirLoss('front'),flank=dirLoss('flank'),rear=dirLoss('rear');
assert(front.lossB<flank.lossB&&flank.lossB<rear.lossB,'direction damage ordering '+JSON.stringify({front,flank,rear}));
assert(front.moraleToB<flank.moraleToB&&flank.moraleToB<rear.moraleToB,'direction morale ordering');
// Charge only samurai/kiba, needs run-up, boosts damage, then goes on cooldown.
{
 const x=fresh(77,'kiba','samurai');x.a.position={x:500,y:500};x.b.position={x:500,y:400};x.a.orderType='charge';x.a.chargeActive=true;x.a.chargeDistance=100;
 assert(T.Combat.canCharge(x.a),'kiba cannot charge');assert(T.Combat.chargeReadyForImpact(x.a),'charge not ready after run-up');
 const base=fresh(77,'kiba','samurai');base.a.position={x:500,y:500};base.b.position={x:500,y:400};
 const normal=T.Combat.previewLosses(base.s,base.a,base.b,{chargeA:false});
 const charged=T.Combat.previewLosses(x.s,x.a,x.b,{chargeA:true});
 assert(charged.lossB>normal.lossB,'charge did not increase damage');
 T.Combat.fightPairs(x.s,[[x.a,x.b]]);assert(x.a.chargeCooldown===T.Combat.constants.CHARGE_COOLDOWN,'charge cooldown not consumed');assert(!x.a.chargeActive,'charge remained active');
 const teppo=fresh(3,'teppo','ashigaru').a;assert(!T.Combat.canCharge(teppo),'teppo can charge');
}
// Teppo fires at range, reloads, and damages target without contact.
{
 const x=fresh(91,'teppo','ashigaru');x.a.position={x:500,y:500};x.b.position={x:500,y:350};x.a.targetUnitId=x.b.id;x.a.orderType='attack';const before=x.b.troops;T.Combat.rangedFire(x.s);assert(x.b.troops<before,'teppo ranged fire caused no damage');assert(x.a.reloadRemaining===T.UnitTypes.teppo.reloadTicks,'teppo reload not set');
}
// Cavalry frontal matchup into ashigaru is intrinsically weaker than rear attack.
{
 const f=fresh(101,'kiba','ashigaru');f.a.position={x:500,y:300};const fd=T.Combat.previewLosses(f.s,f.a,f.b).lossB;
 const r=fresh(101,'kiba','ashigaru');r.a.position={x:500,y:500};const rd=T.Combat.previewLosses(r.s,r.a,r.b).lossB;
 assert(rd>=fd*1.7,'rear cavalry advantage too small '+JSON.stringify({fd,rd}));
}
console.log('B5 tactical rules: 20/20 PASS', {frontDamage:front.lossB,flankDamage:flank.lossB,rearDamage:rear.lossB});
