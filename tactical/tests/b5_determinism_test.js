const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
global.window={};
['js/core/rng.js','js/core/vec.js','js/model/unitTypes.js','js/model/battleUnit.js','js/model/battleState.js','js/sim/movement.js','js/sim/morale.js','js/sim/combat.js','js/sim/step.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const T=window.Tactical;
function assert(c,m){if(!c)throw new Error(m);}
function run(seed){
 const s=T.createBattleState(seed);
 // Fixed commands that exercise teppo and cavalry charge deterministically.
 s.units.p1.orderType='attack';s.units.p1.targetUnitId='e1';
 s.units.p2.orderType='attack';s.units.p2.targetUnitId='e2';
 s.units.p3.orderType='attack';s.units.p3.targetUnitId='e3';
 s.units.p6.orderType='attack';s.units.p6.targetUnitId='e7';
 s.units.p4.position={x:1070,y:300};s.units.p4.orderType='charge';s.units.p4.targetUnitId='e5';s.units.p4.chargeActive=true;s.units.p4.chargeDistance=90;
 s.units.p5.position={x:130,y:300};s.units.p5.orderType='charge';s.units.p5.targetUnitId='e4';s.units.p5.chargeActive=true;s.units.p5.chargeDistance=90;
 s.units.p7.orderType='attack';s.units.p7.targetUnitId='e7';
 while(s.status==='running'&&s.tick<7000)T.stepSimulation(s);
 return {winner:s.winner,tick:s.tick,units:s.order.map(id=>{const u=s.units[id];return[id,u.troops,Math.round(u.morale*1000)/1000,u.status,u.chargeCooldown,u.reloadRemaining,Math.round(u.position.x*100)/100,Math.round(u.position.y*100)/100];})};
}
const a=run(12345),b=run(12345),c=run(12346);
assert(JSON.stringify(a)===JSON.stringify(b),'same seed + commands not deterministic');assert(JSON.stringify(a)!==JSON.stringify(c),'different seed produced identical result');
console.log('B5 determinism: 2/2 PASS',a.winner,'tick',a.tick);
