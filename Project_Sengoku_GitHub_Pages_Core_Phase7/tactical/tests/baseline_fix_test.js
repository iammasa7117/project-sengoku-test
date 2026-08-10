const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
global.window={};
['js/core/rng.js','js/core/vec.js','js/model/unitTypes.js','js/model/battleUnit.js','js/model/battleState.js','js/sim/movement.js','js/sim/morale.js','js/sim/combat.js','js/sim/step.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const T=window.Tactical;
function assert(c,m){if(!c)throw new Error(m);}
const s=T.createBattleState(123);
const pt=T.getUnits(s,'player').map(u=>u.unitType+':'+u.troops);
const et=T.getUnits(s,'enemy').map(u=>u.unitType+':'+u.troops);
assert(JSON.stringify(pt)===JSON.stringify(et),'lineups are not symmetric');
// Propagation boundary: 139 should propagate, 141 should not.
const near=T.createBattleState(1), n1=near.units.p1,n2=near.units.p2;
n1.position={x:100,y:100};n2.position={x:239,y:100};n1.morale=0;const beforeNear=n2.morale;T.Morale.rout(near,n1,null);assert(n2.morale<beforeNear,'139px propagation missing');
const far=T.createBattleState(1), f1=far.units.p1,f2=far.units.p2;
f1.position={x:100,y:100};f2.position={x:241,y:100};f1.morale=0;const beforeFar=f2.morale;T.Morale.rout(far,f1,null);assert(f2.morale===beforeFar,'141px should not propagate');
// Symmetric victory: either side having five broken units must lose.
function breakFive(state,side){T.getUnits(state,side).slice(0,5).forEach(u=>{u.status='routed';u.morale=0;});}
const pLose=T.createBattleState(2);breakFive(pLose,'player');T.stepSimulation(pLose);assert(pLose.winner==='enemy','player five-broken loss missing');
const eLose=T.createBattleState(2);breakFive(eLose,'enemy');T.stepSimulation(eLose);assert(eLose.winner==='player','enemy five-broken loss missing');
console.log('Baseline hotfix tests: 5/5 PASS');
